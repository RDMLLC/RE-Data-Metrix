import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface WizardPropertyData {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  purchasePrice?: number;
  arv?: number;
  rehabBudget?: number;
  taxAssessedValue?: number;
  annualInsurance?: number;
  monthlyUtilities?: number;
  hoaFees?: number;
  hoaTransferFee?: number;
  projectLength?: number;
  sellPrice?: number;
  closingCostsSellPercent?: number;
  realEstateCommissionPercent?: number;
  attorneyFees?: number;
  docPrepFees?: number;
  titleExam?: number;
  titleInsurance?: number;
  estimatedRent?: number;
  // Wholesale-specific tracking
  appliedForStraightline?: boolean;
  wholesaleTransactionType?: "assignment" | "double-close";
  wholesaleFee?: number;
  resalePrice?: number;
}

export interface WizardInvestorData {
  creditScore?: string;
  experienceLevel?: string;
}

export interface WizardData {
  property?: WizardPropertyData;
  investor?: WizardInvestorData;
  currentStep?: number;
  timestamp?: number;
}

interface WizardDataContextType {
  wizardData: WizardData;
  setWizardData: (data: WizardData) => void;
  updatePropertyData: (data: Partial<WizardPropertyData>) => void;
  updateInvestorData: (data: Partial<WizardInvestorData>) => void;
  setCurrentStep: (step: number) => void;
  clearWizardData: () => void;
  hasPropertyData: () => boolean;
}

const WizardDataContext = createContext<WizardDataContextType | undefined>(undefined);

const STORAGE_KEY = 'redatametrix_wizard_data';

export function WizardDataProvider({ children }: { children: ReactNode }) {
  const [wizardData, setWizardDataState] = useState<WizardData>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load wizard data from sessionStorage:', error);
    }
    return {};
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wizardData));
    } catch (error) {
      console.error('Failed to save wizard data to sessionStorage:', error);
    }
  }, [wizardData]);

  const setWizardData = (data: WizardData) => {
    setWizardDataState({
      ...data,
      timestamp: Date.now(),
    });
  };

  const updatePropertyData = (data: Partial<WizardPropertyData>) => {
    setWizardDataState((prev) => ({
      ...prev,
      property: {
        ...prev.property,
        ...data,
      },
      timestamp: Date.now(),
    }));
  };

  const updateInvestorData = (data: Partial<WizardInvestorData>) => {
    setWizardDataState((prev) => ({
      ...prev,
      investor: {
        ...prev.investor,
        ...data,
      },
      timestamp: Date.now(),
    }));
  };

  const setCurrentStep = (step: number) => {
    setWizardDataState((prev) => ({
      ...prev,
      currentStep: step,
      timestamp: Date.now(),
    }));
  };

  const clearWizardData = () => {
    setWizardDataState({});
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear wizard data from sessionStorage:', error);
      }
    }
  };

  const hasPropertyData = () => {
    return !!(wizardData.property?.purchasePrice && wizardData.property?.arv);
  };

  return (
    <WizardDataContext.Provider
      value={{
        wizardData,
        setWizardData,
        updatePropertyData,
        updateInvestorData,
        setCurrentStep,
        clearWizardData,
        hasPropertyData,
      }}
    >
      {children}
    </WizardDataContext.Provider>
  );
}

export function useWizardData() {
  const context = useContext(WizardDataContext);
  if (context === undefined) {
    throw new Error('useWizardData must be used within a WizardDataProvider');
  }
  return context;
}
