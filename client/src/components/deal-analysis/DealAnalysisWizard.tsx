import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import WizardLayout from "./WizardLayout";
import Step1PropertyAddress from "./Step1PropertyAddress";
import Step2PropertyDetails from "./Step2PropertyDetails";
import Step3PurchaseRenovation from "./Step3PurchaseRenovation";
import Step4HoldingPeriodExit from "./Step4HoldingPeriodExit";
import Step5LoanCriteria from "./Step5LoanCriteria";
import Step6Results from "./Step6Results";

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
  
  hoaFees: z.number().optional(),
  hoaTransferFee: z.number().optional(),
  monthlyUtilities: z.number().optional(),
  annualInsurance: z.number().optional(),
  
  sellPrice: z.number().optional(),
  closingCostsSellPercent: z.number().optional(),
  realEstateCommissionPercent: z.number().optional(),
  
  isNewInvestor: z.boolean().optional(),
  projectsLast12Months: z.string().optional(),
  projectsLast36Months: z.string().optional(),
  creditScore: z.string().optional(),
  isDoubleClose: z.boolean().optional(),
  payingForBothSides: z.boolean().optional(),
  hasExistingLoan: z.boolean().optional(),
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

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
      addingSquareFootage: false,
      closingTimeline: "not-selected",
    },
  });

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
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
        return (
          <Step5LoanCriteria
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return <Step6Results form={form} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      currentStep={currentStep}
      totalSteps={6}
      onBack={handleBack}
      canGoBack={currentStep > 1}
    >
      {renderStep()}
    </WizardLayout>
  );
}
