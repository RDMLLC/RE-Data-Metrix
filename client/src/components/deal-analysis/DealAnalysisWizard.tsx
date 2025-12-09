import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useWizardData } from "@/contexts/WizardDataContext";
import { useAuth } from "@/contexts/AuthContext";
import WizardLayout from "./WizardLayout";
import Step1PropertyAddress from "./Step1PropertyAddress";
import Step2PropertyDetails from "./Step2PropertyDetails";
import Step3PurchaseRenovation from "./Step3PurchaseRenovation";
import Step4HoldingPeriodExit from "./Step4HoldingPeriodExit";
import Step5Results from "./Step5Results";
import MembershipPaywall from "@/components/MembershipPaywall";

const wizardSchema = z.object({
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  propertyType: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sqft: z.number().optional(),
  lotSize: z.number().optional(),
  yearBuilt: z.number().optional(),
  taxAssessedValue: z.number().optional(),
  annualTax: z.number().optional(),
  estimatedValue: z.number().optional(),
  propertyDataSource: z.string().optional(),
  addingSquareFootage: z.boolean().optional(),
  newSquareFootage: z.number().optional(),
  
  purchasePrice: z.number().optional(),
  rehabBudget: z.number().optional(),
  arv: z.number().optional(),
  projectLength: z.number().optional(),
  
  attorneyFees: z.number().optional(),
  docPrepFees: z.number().optional(),
  titleExam: z.number().optional(),
  titleInsurance: z.number().optional(),
  transferFee: z.number().optional(),
  
  // Double Close - Buy2 closing costs
  attorneyFees2: z.number().optional(),
  docPrepFees2: z.number().optional(),
  titleExam2: z.number().optional(),
  titleInsurance2: z.number().optional(),
  
  hoaFees: z.number().optional(),
  hoaTransferFee: z.number().optional(),
  monthlyUtilities: z.number().optional(),
  annualInsurance: z.number().optional(),
  otherCarryingCosts: z.number().optional(),
  
  sellPrice: z.number().optional(),
  closingCostsSellPercent: z.number().optional(),
  realEstateCommissionPercent: z.number().optional(),
  
  isNewInvestor: z.boolean().optional(),
  projectsLast12Months: z.string().optional(),
  projectsLast36Months: z.string().optional(),
  creditScore: z.string().optional(),
  isDoubleClose: z.boolean().optional(),
  payingForBothSides: z.boolean().optional(),
  hasExistingLoan: z.boolean(),
  maxLendBuy: z.number().optional(),
  maxLendRehab: z.number().optional(),
  loanInterestRate: z.number().optional(),
  interestDeferred: z.boolean().optional(),
  drawnFundsOnly: z.boolean().optional(),
  loanPoints: z.number().optional(),
  pointsDeferred: z.boolean().optional(),
  maxLoanToArv: z.number().optional(),
  appraisalRequired: z.boolean().optional(),
  appraisalFee: z.number().optional(),
  drawFees: z.number().optional(),
  loanDocPrepFees: z.number().optional(),
  closingTimeline: z.string().optional(),
  loanPreference: z.enum(["lowest-oop", "highest-profit", "one-of-each"]).optional(),
}).superRefine((data, ctx) => {
  if (data.propertyDataSource === "manual") {
    if (!data.address || data.address.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Address is required for manual entry",
        path: ["address"],
      });
    }
    
    if (!data.city || data.city.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required for manual entry",
        path: ["city"],
      });
    }
    
    if (!data.state || data.state.trim().length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "State must be a 2-letter code (e.g., FL)",
        path: ["state"],
      });
    }
    
    if (!data.zipCode || !/^\d{5}$/.test(data.zipCode.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ZIP code must be 5 digits",
        path: ["zipCode"],
      });
    }
  }
});

export type WizardFormData = z.infer<typeof wizardSchema>;

export default function DealAnalysisWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [propertySnapshot, setPropertySnapshot] = useState<any>(null);
  const { wizardData, updatePropertyData, updateInvestorData, clearWizardData } = useWizardData();
  const { isSubscriber, isLoading: authLoading } = useAuth();

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
      addingSquareFootage: false,
      closingTimeline: "not-selected",
      loanPreference: "one-of-each",
      hasExistingLoan: false,
    },
  });

  // Restore saved wizard data from session storage on mount
  useEffect(() => {
    if (wizardData.property) {
      const property = wizardData.property;
      form.reset({
        ...form.getValues(),
        address: property.address || "",
        city: property.city || "",
        state: property.state || "",
        zipCode: property.zip || "",
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.squareFootage,
        purchasePrice: property.purchasePrice,
        arv: property.arv,
        rehabBudget: property.rehabBudget,
        taxAssessedValue: property.taxAssessedValue,
        annualInsurance: property.annualInsurance,
        monthlyUtilities: property.monthlyUtilities,
        hoaFees: property.hoaFees,
        hoaTransferFee: property.hoaTransferFee,
        projectLength: property.projectLength,
        sellPrice: property.sellPrice,
        closingCostsSellPercent: property.closingCostsSellPercent,
        realEstateCommissionPercent: property.realEstateCommissionPercent,
        attorneyFees: property.attorneyFees,
        docPrepFees: property.docPrepFees,
        titleExam: property.titleExam,
        titleInsurance: property.titleInsurance,
      });
    }
    if (wizardData.investor) {
      const investor = wizardData.investor;
      form.setValue("creditScore", investor.creditScore);
      form.setValue("isNewInvestor", investor.experienceLevel === "new");
    }
  }, []);

  const saveCurrentStepData = () => {
    const formData = form.getValues();
    
    updatePropertyData({
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zipCode,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      squareFootage: formData.sqft,
      purchasePrice: formData.purchasePrice,
      arv: formData.arv,
      rehabBudget: formData.rehabBudget,
      taxAssessedValue: formData.taxAssessedValue,
      annualInsurance: formData.annualInsurance,
      monthlyUtilities: formData.monthlyUtilities,
      hoaFees: formData.hoaFees,
      hoaTransferFee: formData.hoaTransferFee,
      projectLength: formData.projectLength,
      sellPrice: formData.sellPrice,
      closingCostsSellPercent: formData.closingCostsSellPercent,
      realEstateCommissionPercent: formData.realEstateCommissionPercent,
      attorneyFees: formData.attorneyFees,
      docPrepFees: formData.docPrepFees,
      titleExam: formData.titleExam,
      titleInsurance: formData.titleInsurance,
    });

    if (formData.creditScore) {
      updateInvestorData({
        creditScore: formData.creditScore,
        experienceLevel: formData.isNewInvestor ? "new" : "experienced",
      });
    }
  };

  const handleNext = () => {
    saveCurrentStepData();
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartNew = () => {
    clearWizardData();
    setPropertySnapshot(null);
    form.reset({
      address: "",
      city: "",
      state: "",
      zipCode: "",
      addingSquareFootage: false,
      closingTimeline: "not-selected",
      loanPreference: "one-of-each",
    });
    setCurrentStep(1);
  };

  const handlePropertyDataLoaded = (propertyData: any) => {
    setPropertySnapshot(propertyData);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1PropertyAddress
            form={form}
            onNext={handleNext}
            onPropertyDataLoaded={handlePropertyDataLoaded}
            isSubscriber={isSubscriber}
          />
        );
      case 2:
        return (
          <Step2PropertyDetails
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step3PurchaseRenovation
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <Step4HoldingPeriodExit
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        if (authLoading) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          );
        }
        if (!isSubscriber) {
          return (
            <MembershipPaywall 
              title="Full Deal Analysis Results" 
              description="Access detailed profitability analysis and lender recommendations by becoming a member."
            />
          );
        }
        return <Step5Results form={form} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      currentStep={currentStep}
      totalSteps={5}
      onBack={handleBack}
      onStartNew={handleStartNew}
      canGoBack={currentStep > 1}
    >
      {renderStep()}
    </WizardLayout>
  );
}
