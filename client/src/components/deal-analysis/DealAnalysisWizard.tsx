import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import WizardLayout from "./WizardLayout";
import Step1PropertyAddress from "./Step1PropertyAddress";
import Step2PropertyDetails from "./Step2PropertyDetails";
import Step3PurchaseRenovation from "./Step3PurchaseRenovation";
import Step4HoldingPeriodExit from "./Step4HoldingPeriodExit";

const wizardSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "ZIP code is required"),
  propertyType: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sqft: z.number().optional(),
  lotSize: z.number().optional(),
  yearBuilt: z.number().optional(),
  taxAssessedValue: z.number().optional(),
  estimatedValue: z.number().optional(),
  lastSalePrice: z.number().optional(),
  lastSaleDate: z.string().optional(),
  
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
  
  needsLoan: z.boolean().default(false),
  desiredLoanAmount: z.number().optional(),
  maxInterestRate: z.number().optional(),
  maxPoints: z.number().optional(),
  preferredLoanTerm: z.number().optional(),
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
      needsLoan: false,
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
        return <div>Step 5: Loan Criteria (Coming Soon)</div>;
      case 6:
        return <div>Step 6: Results (Coming Soon)</div>;
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
