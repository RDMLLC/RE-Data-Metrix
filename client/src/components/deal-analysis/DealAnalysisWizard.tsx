import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import WizardLayout from "./WizardLayout";
import Step1PropertyAddress from "./Step1PropertyAddress";
import Step2PropertyDetails from "./Step2PropertyDetails";

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
  closingCosts: z.number().optional(),
  rehabBudget: z.number().optional(),
  contingencyPercent: z.number().optional(),
  
  holdingMonths: z.number().optional(),
  sellingPrice: z.number().optional(),
  sellingCosts: z.number().optional(),
  monthlyRent: z.number().optional(),
  exitStrategy: z.string().optional(),
  
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
        return <div>Step 3: Purchase & Renovation (Coming Soon)</div>;
      case 4:
        return <div>Step 4: Holding Period & Exit (Coming Soon)</div>;
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
