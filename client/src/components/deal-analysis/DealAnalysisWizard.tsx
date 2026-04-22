import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useWizardData } from "@/contexts/WizardDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePropertyTypeToEnum } from "./propertyTypeUtils";
import WizardLayout from "./WizardLayout";
import Step1PropertyAddress from "./Step1PropertyAddress";
import Step2PropertyDetails from "./Step2PropertyDetails";
import Step3PurchaseRenovation from "./Step3PurchaseRenovation";
import Step4InvestorInfo from "./Step4InvestorInfo";
import Step5HoldingPeriodExit from "./Step5HoldingPeriodExit";
import Step6Results, { ResultsResponse } from "./Step6Results";
import MembershipPaywall from "@/components/MembershipPaywall";
import type { SavedDeal } from "@shared/schema";

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
  propertyLatitude: z.number().optional(),
  propertyLongitude: z.number().optional(),
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
  const { wizardData, updatePropertyData, updateInvestorData, clearWizardData, setCurrentStep: setContextStep } = useWizardData();
  const [currentStep, setCurrentStep] = useState(1);
  const [propertySnapshot, setPropertySnapshot] = useState<any>(null);
  const [step1ResetKey, setStep1ResetKey] = useState(0);
  const { isSubscriber, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // State for viewing saved deals
  const [viewingDealId, setViewingDealId] = useState<string | null>(null);
  const [isEditingDeal, setIsEditingDeal] = useState(false);

  // Track if we've already handled the initial navigation
  const hasHandledInitialNav = useRef(false);
  // Set to true by handleBack() when going from Step 2 → 1 so the mount
  // rehydration effect knows not to clear data in that case.
  const isReturningToStep1 = useRef(false);
  // Set to true when a saved deal is first loaded so Step6Results skips
  // auto-save on that initial mount. Cleared when the user navigates back
  // from Step 6, so re-runs of changed inputs are still auto-saved.
  const suppressStep6AutoSave = useRef(false);
  
  // Fetch saved deal data when viewing a deal
  const { data: savedDeal, isLoading: isDealLoading, error: dealError } = useQuery<SavedDeal>({
    queryKey: ["/api/member/deals", viewingDealId],
    queryFn: async () => {
      const res = await fetch(`/api/member/deals/${viewingDealId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deal");
      return res.json();
    },
    enabled: !!viewingDealId,
    retry: false,
  });
  
  // Handle deal fetch error - redirect to dashboard
  useEffect(() => {
    if (dealError && viewingDealId) {
      console.error("Failed to load deal:", dealError);
      // Redirect back to dashboard on error
      window.location.href = "/portal/dashboard";
    }
  }, [dealError, viewingDealId]);
  
  // Check for dealId or returnToStep URL parameter
  useEffect(() => {
    // Only handle navigation once to prevent React StrictMode double-run issues
    if (hasHandledInitialNav.current) {
      return;
    }
    hasHandledInitialNav.current = true;
    
    const params = new URLSearchParams(window.location.search);
    const dealId = params.get('dealId');
    const returnToStep = params.get('returnToStep');
    
    // Check for dealId first (viewing a saved deal)
    if (dealId) {
      setViewingDealId(dealId);
      // Will jump to Step 6 once deal data loads
      return;
    }
    
    if (returnToStep) {
      const step = parseInt(returnToStep, 10);
      if (step >= 1 && step <= 6) {
        setCurrentStep(step);
        setContextStep(step);
        // Clean up URL parameter
        window.history.replaceState({}, '', '/deal-analysis');
        return;
      }
    }
  }, []);

  // Sync step changes to context so it persists when navigating away
  const updateStep = (step: number) => {
    setCurrentStep(step);
    setContextStep(step);
  };

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
      addingSquareFootage: false,
      closingTimeline: "22-30-days",
      loanPreference: "one-of-each",
      hasExistingLoan: false,
    },
  });

  // Restore saved wizard data from session storage on mount.
  // wizardData.currentStep is the persisted step from sessionStorage — it tells us
  // where the user actually was. If they were past Step 1, or if the Back button
  // from Step 2 was used (isReturningToStep1), rehydrate the form. Otherwise this
  // is a fresh navigation to Step 1, so clear everything instead.
  useEffect(() => {
    const persistedStep = wizardData.currentStep ?? 1;
    if (persistedStep > 1 || isReturningToStep1.current) {
      // Mid-wizard return or deliberate Back to Step 1: restore saved data
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
    } else {
      // Fresh navigation to Step 1: clear session data and reset to empty defaults
      clearWizardData();
      form.reset({
        address: "",
        city: "",
        state: "",
        zipCode: "",
        addingSquareFootage: false,
        closingTimeline: "22-30-days",
        loanPreference: "one-of-each",
        hasExistingLoan: false,
      });
    }
    isReturningToStep1.current = false;
  }, []);
  
  // Load saved deal data into form when viewing a saved deal
  useEffect(() => {
    if (savedDeal?.dealSnapshot && !isEditingDeal) {
      const snapshot = savedDeal.dealSnapshot as any;
      
      // Populate form with saved deal data
      form.reset({
        address: snapshot.address || "",
        city: snapshot.city || "",
        state: snapshot.state || "",
        zipCode: snapshot.zipCode || snapshot.zip || "",
        propertyType: normalizePropertyTypeToEnum(snapshot.propertyType),
        bedrooms: snapshot.bedrooms,
        bathrooms: snapshot.bathrooms,
        sqft: snapshot.sqft || snapshot.squareFootage,
        lotSize: snapshot.lotSize,
        yearBuilt: snapshot.yearBuilt,
        taxAssessedValue: snapshot.taxAssessedValue,
        annualTax: snapshot.annualTax,
        estimatedValue: snapshot.estimatedValue,
        propertyDataSource: snapshot.propertyDataSource || "manual",
        addingSquareFootage: snapshot.addingSquareFootage || false,
        newSquareFootage: snapshot.newSquareFootage,
        purchasePrice: snapshot.purchasePrice,
        rehabBudget: snapshot.rehabBudget,
        arv: snapshot.arv,
        projectLength: snapshot.projectLength,
        attorneyFees: snapshot.attorneyFees,
        docPrepFees: snapshot.docPrepFees,
        titleExam: snapshot.titleExam,
        titleInsurance: snapshot.titleInsurance,
        transferFee: snapshot.transferFee,
        attorneyFees2: snapshot.attorneyFees2,
        docPrepFees2: snapshot.docPrepFees2,
        titleExam2: snapshot.titleExam2,
        titleInsurance2: snapshot.titleInsurance2,
        hoaFees: snapshot.hoaFees,
        hoaTransferFee: snapshot.hoaTransferFee,
        monthlyUtilities: snapshot.monthlyUtilities,
        annualInsurance: snapshot.annualInsurance,
        otherCarryingCosts: snapshot.otherCarryingCosts,
        sellPrice: snapshot.sellPrice,
        closingCostsSellPercent: snapshot.closingCostsSellPercent,
        realEstateCommissionPercent: snapshot.realEstateCommissionPercent,
        isNewInvestor: snapshot.isNewInvestor,
        projectsLast12Months: snapshot.projectsLast12Months,
        projectsLast36Months: snapshot.projectsLast36Months,
        creditScore: snapshot.creditScore,
        isDoubleClose: snapshot.isDoubleClose,
        payingForBothSides: snapshot.payingForBothSides,
        hasExistingLoan: snapshot.hasExistingLoan || false,
        maxLendBuy: snapshot.maxLendBuy,
        maxLendRehab: snapshot.maxLendRehab,
        loanInterestRate: snapshot.loanInterestRate,
        interestDeferred: snapshot.interestDeferred,
        drawnFundsOnly: snapshot.drawnFundsOnly,
        loanPoints: snapshot.loanPoints,
        pointsDeferred: snapshot.pointsDeferred,
        maxLoanToArv: snapshot.maxLoanToArv,
        appraisalRequired: snapshot.appraisalRequired,
        appraisalFee: snapshot.appraisalFee,
        drawFees: snapshot.drawFees,
        loanDocPrepFees: snapshot.loanDocPrepFees,
        closingTimeline: snapshot.closingTimeline || "22-30-days",
        loanPreference: snapshot.loanPreference || "one-of-each",
      });
      
      // Seed the WizardDataContext so back-navigation through steps 5→4→3→2→1 shows pre-filled data
      updatePropertyData({
        address: snapshot.address || "",
        city: snapshot.city || "",
        state: snapshot.state || "",
        zip: snapshot.zipCode || snapshot.zip || "",
        bedrooms: snapshot.bedrooms,
        bathrooms: snapshot.bathrooms,
        squareFootage: snapshot.sqft || snapshot.squareFootage,
        purchasePrice: snapshot.purchasePrice,
        arv: snapshot.arv,
        rehabBudget: snapshot.rehabBudget,
        taxAssessedValue: snapshot.taxAssessedValue,
        annualInsurance: snapshot.annualInsurance,
        monthlyUtilities: snapshot.monthlyUtilities,
        hoaFees: snapshot.hoaFees,
        hoaTransferFee: snapshot.hoaTransferFee,
        projectLength: snapshot.projectLength,
        sellPrice: snapshot.sellPrice,
        closingCostsSellPercent: snapshot.closingCostsSellPercent,
        realEstateCommissionPercent: snapshot.realEstateCommissionPercent,
        attorneyFees: snapshot.attorneyFees,
        docPrepFees: snapshot.docPrepFees,
        titleExam: snapshot.titleExam,
        titleInsurance: snapshot.titleInsurance,
      });

      if (snapshot.creditScore) {
        updateInvestorData({
          creditScore: snapshot.creditScore,
          experienceLevel: snapshot.isNewInvestor ? "new" : "experienced",
        });
      }

      // Suppress auto-save on this initial Step 6 mount so no duplicate
      // deal entry is created when opening a saved deal without changes.
      suppressStep6AutoSave.current = true;

      // Jump directly to Step 6 (Results)
      setCurrentStep(6);
      setContextStep(6);
    }
  }, [savedDeal, isEditingDeal]);
  
  // Handler to enter edit mode for a saved deal
  const handleEditDeal = () => {
    setIsEditingDeal(true);
    setCurrentStep(1);
    setContextStep(1);
    // Clean up URL so user can navigate normally
    window.history.replaceState({}, '', '/deal-analysis');
  };

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
    if (currentStep < 6) {
      updateStep(currentStep + 1);
    }
  };

  // Scroll to top when navigating to Step 6 (Results) so summary is visible (works for both subscribers and paywall)
  useEffect(() => {
    if (currentStep === 6) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 2) {
        // Flag that we're intentionally returning to Step 1 via Back so the
        // rehydration logic doesn't treat it as a fresh navigation and clear data.
        isReturningToStep1.current = true;
      }
      if (currentStep === 6) {
        // User navigated back from Step 6 — allow auto-save on next Step 6 visit
        // so re-runs with changed inputs create a new saved entry.
        suppressStep6AutoSave.current = false;
      }
      updateStep(currentStep - 1);
    }
  };

  const handleStartNew = () => {
    clearWizardData();
    setPropertySnapshot(null);
    // Reset ALL form fields to ensure no sticky data
    form.reset({
      address: "",
      city: "",
      state: "",
      zipCode: "",
      addingSquareFootage: false,
      closingTimeline: "22-30-days",
      loanPreference: "one-of-each",
      hasExistingLoan: false,
      // Clear all financial/analysis fields
      purchasePrice: undefined,
      rehabBudget: undefined,
      arv: undefined,
      projectLength: undefined,
      sellPrice: undefined,
      estimatedValue: undefined,
      taxAssessedValue: undefined,
      annualTax: undefined,
      // Clear investor fields
      isNewInvestor: undefined,
      creditScore: undefined,
      // Clear closing cost fields
      attorneyFees: undefined,
      docPrepFees: undefined,
      titleExam: undefined,
      titleInsurance: undefined,
      transferFee: undefined,
      attorneyFees2: undefined,
      docPrepFees2: undefined,
      titleExam2: undefined,
      titleInsurance2: undefined,
      // Clear carrying cost fields
      monthlyUtilities: undefined,
      annualInsurance: undefined,
      hoaFees: undefined,
      hoaTransferFee: undefined,
      otherCarryingCosts: undefined,
      // Clear exit cost fields
      closingCostsSellPercent: undefined,
      realEstateCommissionPercent: undefined,
      // Clear double close fields
      isDoubleClose: undefined,
      payingForBothSides: undefined,
      // Clear property details
      bedrooms: undefined,
      bathrooms: undefined,
      sqft: undefined,
      lotSize: undefined,
      yearBuilt: undefined,
      propertyType: undefined,
      propertyDataSource: undefined,
    });
    updateStep(1);
    setStep1ResetKey(prev => prev + 1);
  };

  const handlePropertyDataLoaded = (propertyData: any) => {
    setPropertySnapshot(propertyData);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1PropertyAddress
            key={step1ResetKey}
            form={form}
            onNext={handleNext}
            onPropertyDataLoaded={handlePropertyDataLoaded}
            isSubscriber={isSubscriber}
            isAuthenticated={isAuthenticated}
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
          <Step4InvestorInfo
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <Step5HoldingPeriodExit
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        if (authLoading || (viewingDealId && isDealLoading)) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">
                {viewingDealId ? "Loading deal..." : "Loading..."}
              </span>
            </div>
          );
        }
        return (
          <Step6Results 
            form={form} 
            onBack={handleBack} 
            isSubscriber={isSubscriber}
            viewingDealId={viewingDealId || undefined}
            onEditDeal={viewingDealId ? handleEditDeal : undefined}
            suppressAutoSave={suppressStep6AutoSave.current}
            originalResultsSnapshot={savedDeal?.resultsSnapshot as ResultsResponse | null | undefined}
          />
        );
      default:
        return null;
    }
  };

  const formValues = form.getValues();
  const propertyAddress = formValues.address && formValues.city && formValues.state
    ? `${formValues.address}, ${formValues.city}, ${formValues.state} ${formValues.zipCode || ""}`.trim()
    : undefined;
  
  const propertyDetails = {
    bedrooms: formValues.bedrooms,
    bathrooms: formValues.bathrooms,
    sqft: formValues.sqft,
    yearBuilt: formValues.yearBuilt,
    lotSize: formValues.lotSize,
  };

  return (
    <WizardLayout
      currentStep={currentStep}
      totalSteps={6}
      onBack={handleBack}
      onStartNew={handleStartNew}
      canGoBack={currentStep > 1}
      propertyAddress={propertyAddress}
      propertyDetails={propertyDetails}
    >
      {renderStep()}
    </WizardLayout>
  );
}
