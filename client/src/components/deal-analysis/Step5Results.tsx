import { useState, useRef, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { WizardFormData } from "./DealAnalysisWizard";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, TrendingUp, ChevronDown, ChevronRight, Download, Home, Building2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { usePDF } from "react-to-pdf";
import { QRCodeSVG } from "qrcode.react";
import type { LoanCriteria } from "@shared/schema";
import { useWizardData } from "@/contexts/WizardDataContext";
import { calculateDSCR } from "@shared/utils/dscr-calculator";
import { getInsuranceCostPerSqFt } from "@shared/data/insurance-costs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Step5ResultsProps {
  form: UseFormReturn<WizardFormData>;
  onBack: () => void;
}

interface OutOfPocketBreakdown {
  downPayment: number;
  baseClosingCosts: number;
  pointsCost: number;
  totalPointsCost?: number;
  pointsDeferred?: boolean;
  appraisalCost: number;
  docPrepFee: number;
  lenderFees: number;
  totalClosingCostsBuy: number;
  carryingCosts: number;
  total: number;
}

interface LoanComparisonColumn {
  type: 'cash' | 'user-loan' | 'lender';
  lenderId?: string;
  lenderName?: string;
  productId?: string;
  productName?: string;
  timeToClose?: number;
  maxLoanArv?: number;
  referralLink?: string;
  interestRate?: number;
  maxLtvBuy?: number;
  points?: number;
  isLtcWeighted?: boolean;
  maxLtcPercent?: number;
  isLtcAdjusted?: boolean;
  effectiveBuyPercent?: number;
  purchasePrice: number;
  rehabBudget: number;
  totalProjectCost: number;
  closingCostsBuy: number;
  carryingCosts: number;
  interestCost?: number;
  totalInvestment: number;
  sellPrice: number;
  closingCostsSell: number;
  commission: number;
  rolledCosts: number;
  lenderDrawFees: number;
  profit: number;
  outOfPocketCost: number;
  outOfPocketBreakdown?: OutOfPocketBreakdown;
  cashOnCashRoi: number;
  annualizedRoi: number;
  roi: number;
  percentageArv: number;
  percentageArvLender?: number;
  isPreferred?: boolean;
}

interface ResultsResponse {
  cashSaleColumn: LoanComparisonColumn;
  userLoanColumn: LoanComparisonColumn | null;
  lenderColumns: LoanComparisonColumn[];
  criteriaUsed: {
    useDefaultCriteria: boolean;
    primary?: LoanCriteria;
    secondary?: LoanCriteria;
  };
  numberOfDraws: number;
  allRankedProducts: number;
}

interface DSCRLender {
  productId: string;
  lenderId: string;
  lenderName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  productName: string;
  loanType: string;
  interestRate: number;
  points: number;
  minCreditScore: number;
  maxLtvBuy: number;
  maxLoanArv: number;
  timeToClose: number;
  referralLink: string;
  fees: number;
  isPreferred: boolean;
  loanTermYears: number | null;
  minDscrRequired: number | null;
  estimatedAppraisalCost: number | null;
  appraisalRequired: boolean;
  cashOutOk: boolean;
  cashOutMaxLtv: number | null;
}

interface DSCRProductWithCalculation {
  lender: DSCRLender;
  dscrCalculation: {
    loanAmount: number;
    monthlyPrincipalInterest: number;
    monthlyPropertyTax: number;
    monthlyInsurance: number;
    monthlyHoa: number;
    totalMonthlyPITIA: number;
    dscr: number;
    dscrStatus: 'poor' | 'caution' | 'good';
    meetsMinDscr: boolean;
    loanTermYears: number;
    minDscrRequired: number;
    interestRate: number;
    points: number;
    maxLtvBuy: number;
  };
}

export default function Step5Results({ form, onBack }: Step5ResultsProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { updatePropertyData, wizardData } = useWizardData();
  const loanPreference = form.watch("loanPreference") || "one-of-each";
  const [hasCalculated, setHasCalculated] = useState(false);
  const [visibleLenderCount, setVisibleLenderCount] = useState(2);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  
  // Analysis mode toggle state
  const [analysisMode, setAnalysisMode] = useState<'fix-and-flip' | 'rental-dscr'>('fix-and-flip');
  const [monthlyRent, setMonthlyRent] = useState<number>(wizardData.property?.estimatedRent || 0);
  
  // Editable fields for on-the-fly scenario changes
  const [editBuyPrice, setEditBuyPrice] = useState<number>(0);
  const [editRehab, setEditRehab] = useState<number>(0);
  const [editProjectLength, setEditProjectLength] = useState<number>(6);
  
  // Collapsible section states for main table rows
  const [showProjectCosts, setShowProjectCosts] = useState(false);
  const [showClosingCostsBuy, setShowClosingCostsBuy] = useState(false);
  const [showLenderFees, setShowLenderFees] = useState(false);
  const [showCarryingCosts, setShowCarryingCosts] = useState(false);
  const [showSellingCosts, setShowSellingCosts] = useState(false);
  // Summary box expandable states
  const [showOutOfPocketBreakdown, setShowOutOfPocketBreakdown] = useState(false);
  const [showCashOnCashBreakdown, setShowCashOnCashBreakdown] = useState(false);

  // PDF generation state - controls visibility of elements during PDF capture
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Contact lender state
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [selectedLenderForContact, setSelectedLenderForContact] = useState<{
    lenderId: string;
    lenderName: string;
    productId: string;
    productName: string;
    loanType: string;
    interestRate?: number;
    maxLtvBuy?: number;
    points?: number;
    timeToClose?: number;
    profit?: number;
    cashOnCashRoi?: number;
    annualizedRoi?: number;
    outOfPocketCost?: number;
    projectCosts?: number;
    costsAndCarrying?: number;
    exitSale?: number;
  } | null>(null);

  // PDF generation
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { toPDF, targetRef } = usePDF({
    filename: 'loan-comparison-results.pdf',
    method: 'save',
    resolution: 2,
    page: {
      margin: 8,
      format: 'letter',
      orientation: 'portrait',
    },
    canvas: {
      mimeType: 'image/png',
      qualityRatio: 0.95,
    },
    overrides: {
      pdf: { compress: true },
      canvas: { useCORS: true },
    }
  });

  // Reference for scrolling to new loans
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Track previous values to detect real user changes (not initial state set)
  const prevValuesRef = useRef<{price: number, rehab: number, length: number, preference: string} | null>(null);
  
  // Track the latest request ID to prevent stale responses from overwriting newer results
  const requestIdRef = useRef(0);

  // Scroll to top when Step 5 mounts so summary box is visible
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Initialize editable fields from form data and auto-calculate on mount
  useEffect(() => {
    const formData = form.getValues();
    const initialPrice = formData.purchasePrice || 0;
    const initialRehab = formData.rehabBudget || 0;
    const initialLength = formData.projectLength || 6;
    
    setEditBuyPrice(initialPrice);
    setEditRehab(initialRehab);
    setEditProjectLength(initialLength);
    
    // Store initial values to detect real user changes (including preference)
    prevValuesRef.current = { 
      price: initialPrice, 
      rehab: initialRehab, 
      length: initialLength,
      preference: loanPreference 
    };
    
    // Auto-trigger calculation on mount if not already calculated
    if (!hasCalculated) {
      const payload = buildPayload(loanPreference);
      requestIdRef.current += 1;
      calculateResultsMutation.mutate({ ...payload, _requestId: requestIdRef.current });
      setHasCalculated(true);
    }
  }, [form, hasCalculated, loanPreference]);

  // Debounced auto-recalculation when editable fields or loan preference change (after initialization)
  useEffect(() => {
    // Skip if initial values haven't been stored yet
    if (!prevValuesRef.current) return;
    
    // Check if any values have actually changed from previous values (including preference)
    const valuesChanged = 
      editBuyPrice !== prevValuesRef.current.price ||
      editRehab !== prevValuesRef.current.rehab ||
      editProjectLength !== prevValuesRef.current.length ||
      loanPreference !== prevValuesRef.current.preference;
    
    // Skip if values haven't changed (prevents initial trigger)
    if (!valuesChanged) return;
    
    const debounceTimer = setTimeout(() => {
      // Update previous values
      prevValuesRef.current = { 
        price: editBuyPrice, 
        rehab: editRehab, 
        length: editProjectLength,
        preference: loanPreference 
      };
      
      const payload = buildPayload(
        loanPreference,
        editBuyPrice,
        editRehab,
        editProjectLength
      );
      
      // Increment request ID and include in mutation context
      requestIdRef.current += 1;
      calculateResultsMutation.mutate({ ...payload, _requestId: requestIdRef.current });
    }, 800); // 800ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [editBuyPrice, editRehab, editProjectLength, loanPreference]);

  const calculateResultsMutation = useMutation<ResultsResponse, Error, any>({
    mutationFn: async (payload: any) => {
      const { _requestId, ...apiPayload } = payload;
      const response = await apiRequest("POST", "/api/deal-analysis/results", apiPayload);
      const data = await response.json();
      // Attach request ID to the result for checking in onSuccess
      return { ...data, _requestId };
    },
    onSuccess: (dataWithId: any) => {
      const { _requestId, ...data } = dataWithId;
      // Only update results if this response matches the latest request
      // (prevents stale responses from overwriting newer results)
      if (_requestId === requestIdRef.current) {
        setResults(data);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Calculation Error",
        description: error.message || "Failed to calculate loan results",
        variant: "destructive",
      });
    },
  });

  const contactLenderMutation = useMutation({
    mutationFn: async (data: {
      lenderId: string;
      loanProductId: string;
      message: string;
      dealData: any;
    }) => {
      const response = await apiRequest("POST", "/api/member/contact-lender", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: `Your inquiry has been sent to ${selectedLenderForContact?.lenderName}. They will contact you soon.`,
      });
      setContactDialogOpen(false);
      setContactMessage("");
      setSelectedLenderForContact(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send inquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleContactLender = (lenderData: {
    lenderId: string;
    lenderName: string;
    productId: string;
    productName: string;
    loanType: string;
    interestRate?: number;
    maxLtvBuy?: number;
    points?: number;
    timeToClose?: number;
    profit?: number;
    cashOnCashRoi?: number;
    annualizedRoi?: number;
    outOfPocketCost?: number;
    projectCosts?: number;
    costsAndCarrying?: number;
    exitSale?: number;
  }) => {
    setSelectedLenderForContact(lenderData);
    setContactDialogOpen(true);
  };

  const submitContactLender = () => {
    if (!selectedLenderForContact) return;
    
    const formData = form.getValues();
    const propertyAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
    
    contactLenderMutation.mutate({
      lenderId: selectedLenderForContact.lenderId,
      loanProductId: selectedLenderForContact.productId,
      message: contactMessage,
      dealData: {
        propertyAddress,
        arv: formData.arv || 0,
        buyPrice: editBuyPrice,
        rehabCost: editRehab,
        projectLength: editProjectLength,
        estProfit: selectedLenderForContact.profit || 0,
        cashOnCashRoi: selectedLenderForContact.cashOnCashRoi || 0,
        annualizedRoi: selectedLenderForContact.annualizedRoi || 0,
        estOutOfPocket: selectedLenderForContact.outOfPocketCost || 0,
        projectCosts: selectedLenderForContact.projectCosts || 0,
        costsAndCarrying: selectedLenderForContact.costsAndCarrying || 0,
        exitSale: selectedLenderForContact.exitSale || 0,
        loanTerms: {
          interestRate: selectedLenderForContact.interestRate ? `${selectedLenderForContact.interestRate}%` : undefined,
          maxLtvBuy: selectedLenderForContact.maxLtvBuy ? `${selectedLenderForContact.maxLtvBuy}%` : undefined,
          points: selectedLenderForContact.points ? `${selectedLenderForContact.points}` : undefined,
          timeToClose: selectedLenderForContact.timeToClose ? `${selectedLenderForContact.timeToClose} days` : undefined,
        },
        productName: selectedLenderForContact.productName,
        loanType: selectedLenderForContact.loanType,
      },
    });
  };

  const buildPayload = (
    preference: string,
    overridePurchasePrice?: number,
    overrideRehabBudget?: number,
    overrideProjectLength?: number
  ) => {
    const formData = form.getValues();
    
    const purchasePrice = overridePurchasePrice ?? formData.purchasePrice ?? 0;
    const rehabBudget = overrideRehabBudget ?? formData.rehabBudget ?? 0;
    const projectLength = overrideProjectLength ?? formData.projectLength ?? 6;
    
    const monthlyInsurance = (formData.annualInsurance || 0) / 12;
    const monthlyUtilities = formData.monthlyUtilities || 0;
    const monthlyPropertyTax = ((formData.taxAssessedValue || purchasePrice) * 0.012) / 12;
    const monthlyHoa = formData.hoaFees || 0;
    const hoaTransferFee = formData.hoaTransferFee || 0;
    const otherCarryingCosts = formData.otherCarryingCosts || 0;
    const totalCarryingCosts = (monthlyInsurance + monthlyUtilities + monthlyPropertyTax + monthlyHoa) * projectLength + hoaTransferFee + otherCarryingCosts;
    
    // Map preference to criteria - using schema values: 'profit', 'out-of-pocket', 'fastest'
    let primary: LoanCriteria | undefined;
    let secondary: LoanCriteria | undefined;
    
    if (preference === "lowest-oop") {
      primary = "out-of-pocket";
      secondary = "out-of-pocket";
    } else if (preference === "highest-profit") {
      primary = "profit";
      secondary = "profit";
    } else {
      // one-of-each
      primary = "out-of-pocket";
      secondary = "profit";
    }
    
    return {
      dealInputs: {
        purchasePrice: purchasePrice,
        rehabBudget: rehabBudget,
        arv: formData.arv || 0,
        projectLength: projectLength,
        closingCostsBuy: (formData.attorneyFees || 0) + (formData.docPrepFees || 0) + 
                         (formData.titleExam || 0) + (formData.titleInsurance || 0),
        carryingCosts: totalCarryingCosts,
        sellPrice: formData.sellPrice || formData.arv || 0,
        closingCostsSell: (formData.sellPrice || formData.arv || 0) * 
                          ((formData.closingCostsSellPercent || 2) / 100),
        commission: (formData.sellPrice || formData.arv || 0) * 
                    ((formData.realEstateCommissionPercent || 6) / 100),
        monthlyInsurance: monthlyInsurance,
        monthlyUtilities: monthlyUtilities,
        monthlyPropertyTax: monthlyPropertyTax,
        monthlyHoa: monthlyHoa,
      },
      criteriaSelection: {
        useDefaultCriteria: false,
        primary: primary,
        secondary: secondary,
      },
      loanPreference: preference,
      userLoan: formData.maxLendBuy ? (() => {
        const userLoanPayload = {
          desiredLoanAmount: undefined,
          interestRate: formData.loanInterestRate || 12,
          interestDeferred: formData.interestDeferred || false,
          points: formData.loanPoints || 0,
          pointsDeferred: formData.pointsDeferred || false,
          maxLendBuy: formData.maxLendBuy,
          maxLendRehab: formData.maxLendRehab || 100,
          maxLoanToArv: formData.maxLoanToArv || 70,
          appraisalRequired: formData.appraisalRequired || false,
          appraisalFee: formData.appraisalFee || 500,
          drawFees: formData.drawFees || 0,
          loanDocPrepFees: formData.loanDocPrepFees || 0,
        };
        console.log('[USER LOAN FRONTEND DEBUG] Sending userLoan payload:', userLoanPayload);
        return userLoanPayload;
      })() : undefined,
      numberOfDraws: 3,
      excludeProductIds: [],
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const handleViewMoreLoans = () => {
    if (results && visibleLenderCount < results.lenderColumns.length) {
      const previousCount = visibleLenderCount;
      setVisibleLenderCount(prev => Math.min(prev + 2, results.lenderColumns.length));
      
      // Use requestAnimationFrame for more reliable timing after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            // Scroll to the far right to show newly added columns
            scrollContainerRef.current.scrollTo({
              left: scrollContainerRef.current.scrollWidth,
              behavior: 'smooth'
            });
          }
        });
      });
    }
  };

  const handleNavigateToRentalAnalysis = () => {
    const formData = form.getValues();
    
    const updatedWizardData = {
      ...wizardData,
      property: {
        ...wizardData.property,
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
        estimatedRent: wizardData.property?.estimatedRent,
      },
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem('redatametrix_wizard_data', JSON.stringify(updatedWizardData));
    } catch (error) {
      console.error('Failed to save wizard data to localStorage:', error);
    }
    
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
      estimatedRent: wizardData.property?.estimatedRent,
    });
    
    setLocation("/rental-analysis");
  };

  // DSCR Analysis calculations
  const formData = form.getValues();
  const propertyState = formData.state || wizardData.property?.state || '';
  const propertyArv = formData.arv || wizardData.property?.arv || 0;
  const propertyPurchasePrice = formData.purchasePrice || wizardData.property?.purchasePrice || 0;
  const propertySqft = formData.sqft || wizardData.property?.squareFootage || 0;
  
  const annualInsurance = formData.annualInsurance || 
    (propertyState && propertySqft 
      ? Math.round(propertySqft * getInsuranceCostPerSqFt(propertyState))
      : 0);
  
  const monthlyPropertyTax = ((formData.taxAssessedValue || propertyPurchasePrice) * 0.012) / 12;
  const monthlyInsurance = annualInsurance / 12;
  const monthlyHoa = formData.hoaFees || 0;
  
  const dscrResults = monthlyRent > 0 && propertyArv
    ? calculateDSCR({
        arv: propertyArv,
        monthlyRent,
        monthlyPropertyTax,
        monthlyInsurance,
        monthlyHoa,
        interestRate: 7.5,
      })
    : null;

  // Fetch DSCR lenders when in rental-dscr mode
  const { data: dscrLenders, isLoading: isLoadingDscrLenders } = useQuery<DSCRLender[]>({
    queryKey: ['/api/dscr-lenders', propertyState],
    queryFn: async () => {
      const url = propertyState 
        ? `/api/dscr-lenders?state=${encodeURIComponent(propertyState)}`
        : '/api/dscr-lenders';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch DSCR lenders');
      return res.json();
    },
    enabled: analysisMode === 'rental-dscr',
  });

  const getLoanTypeLabel = (loanType: string) => {
    switch (loanType) {
      case 'dscr-purchase': return 'DSCR Purchase';
      case 'dscr-refi': return 'DSCR Refinance';
      default: return loanType;
    }
  };

  // Calculate DSCR for each lender product
  const dscrProductsWithCalculations: DSCRProductWithCalculation[] = (dscrLenders || []).map(lender => {
    const ltv = Number(lender.maxLtvBuy) || 75;
    const termYears = Number(lender.loanTermYears) || 30;
    const minRequired = Number(lender.minDscrRequired) || 1.0;
    const interestRate = Number(lender.interestRate) || 7.5;
    const points = Number(lender.points) || 0;
    
    const loanBasis = lender.loanType === 'dscr-purchase' 
      ? (propertyPurchasePrice || propertyArv)
      : propertyArv;
    
    const dscrCalc = calculateDSCR({
      arv: loanBasis,
      monthlyRent,
      monthlyPropertyTax,
      monthlyInsurance,
      monthlyHoa,
      interestRate,
      loanToValuePercent: ltv,
      loanTermYears: termYears,
    });
    
    const meetsMinDscr = dscrCalc.dscr >= minRequired;
    
    return {
      lender,
      dscrCalculation: {
        loanAmount: dscrCalc.loanAmount,
        monthlyPrincipalInterest: dscrCalc.monthlyPrincipalInterest,
        monthlyPropertyTax: dscrCalc.monthlyPropertyTax,
        monthlyInsurance: dscrCalc.monthlyInsurance,
        monthlyHoa: dscrCalc.monthlyHoa,
        totalMonthlyPITIA: dscrCalc.totalMonthlyPITIA,
        dscr: dscrCalc.dscr,
        dscrStatus: dscrCalc.dscrStatus,
        meetsMinDscr,
        loanTermYears: termYears,
        minDscrRequired: minRequired,
        interestRate,
        points,
        maxLtvBuy: ltv,
      },
    };
  }).sort((a, b) => b.dscrCalculation.dscr - a.dscrCalculation.dscr);

  // Only show full-page spinner for initial load (no results yet)
  if (calculateResultsMutation.isPending && !results) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Calculating loan comparisons...</p>
      </div>
    );
  }

  if (!results && !calculateResultsMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-lg text-destructive">No results available</p>
        <Button onClick={onBack} data-testid="button-try-again">
          Go Back
        </Button>
      </div>
    );
  }

  if (!results) {
    return null; // Shouldn't reach here, but safety check
  }

  const visibleLenders = results.lenderColumns.slice(0, visibleLenderCount);
  const hasMoreLenders = visibleLenderCount < results.lenderColumns.length;

  // Solid background color classes for sticky columns (z-index 20 for first column, 15 for Cash Sale & Your Loan)
  const stickyFirstColBase = "sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  const stickyFirstColMuted = "sticky left-0 z-20 bg-muted shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  const stickyFirstColAccent = "sticky left-0 z-20 bg-accent shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  
  // Calculate left positions for sticky columns
  // First column (Metric): ~160px, Cash Sale: ~90px, Your Loan: ~90px
  const metricColWidth = 160;
  const cashSaleColWidth = 100;
  const yourLoanColWidth = 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsGeneratingPdf(true);
              // Wait for state to update and re-render
              await new Promise(resolve => setTimeout(resolve, 100));
              await toPDF();
              setIsGeneratingPdf(false);
            }}
            disabled={isGeneratingPdf}
            data-testid="button-download-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Analysis Type Toggle */}
      <Tabs value={analysisMode} onValueChange={(value) => setAnalysisMode(value as 'fix-and-flip' | 'rental-dscr')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="fix-and-flip" className="flex items-center gap-2" data-testid="tab-fix-and-flip">
            <Home className="h-4 w-4" />
            Fix & Flip
          </TabsTrigger>
          <TabsTrigger value="rental-dscr" className="flex items-center gap-2" data-testid="tab-rental-dscr">
            <Building2 className="h-4 w-4" />
            Rental / DSCR
          </TabsTrigger>
        </TabsList>

        {/* Fix & Flip Analysis Tab */}
        <TabsContent value="fix-and-flip" className="mt-6 space-y-6">
          {/* Editable Variables Section - MOVED TO TOP */}
          <Card className="border-primary/20">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Do you want to change any of the variables?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <Label htmlFor="edit-buy-price" className="text-sm">Buy Price</Label>
                  <Input
                    id="edit-buy-price"
                    type="number"
                    value={editBuyPrice || ''}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed)) setEditBuyPrice(parsed);
                      else if (e.target.value === '') setEditBuyPrice(0);
                    }}
                    data-testid="input-edit-buy-price"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-rehab" className="text-sm">Rehab</Label>
                  <Input
                    id="edit-rehab"
                    type="number"
                    value={editRehab || ''}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed)) setEditRehab(parsed);
                      else if (e.target.value === '') setEditRehab(0);
                    }}
                    data-testid="input-edit-rehab"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-project-length" className="text-sm">Project Length (months)</Label>
                  <Input
                    id="edit-project-length"
                    type="number"
                    value={editProjectLength || ''}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed)) setEditProjectLength(parsed);
                      else if (e.target.value === '') setEditProjectLength(6);
                    }}
                    data-testid="input-edit-project-length"
                  />
                </div>
                {calculateResultsMutation.isPending && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Recalculating...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Metrics Box - Columns aligned with loan comparison table */}
          {results && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Summary</TableHead>
                        <TableHead className="text-center min-w-[100px]">Cash Sale</TableHead>
                        {results.userLoanColumn && (
                          <TableHead className="text-center min-w-[100px]">Entered Loan</TableHead>
                        )}
                        {visibleLenders.map((lender, index) => (
                          <TableHead key={index} className="text-center min-w-[140px] text-xs">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-semibold">{lender.lenderName || `Lender ${index + 1}`}</span>
                              {lender.productName && (
                                <span className="text-muted-foreground font-normal">{lender.productName}</span>
                              )}
                              {lender.isPreferred && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-accent text-accent-foreground">Preferred</Badge>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Net Profit</TableCell>
                        <TableCell className="text-center font-bold text-green-600" data-testid="summary-net-profit-cash">
                          {formatCurrency(results.cashSaleColumn.profit)}
                        </TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center font-bold text-green-600" data-testid="summary-net-profit-loan">
                            {formatCurrency(results.userLoanColumn.profit)}
                          </TableCell>
                        )}
                        {visibleLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center font-bold text-green-600">
                            {formatCurrency(lender.profit)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {/* Out-of-Pocket - Expandable */}
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setShowOutOfPocketBreakdown(!showOutOfPocketBreakdown)}
                        data-testid="summary-row-oop"
                      >
                        <TableCell className="font-medium flex items-center gap-2">
                          {showOutOfPocketBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Out-of-Pocket
                        </TableCell>
                        <TableCell className="text-center font-bold" data-testid="summary-oop-cash">
                          {formatCurrency(results.cashSaleColumn.outOfPocketCost)}
                        </TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center font-bold" data-testid="summary-oop-loan">
                            {formatCurrency(results.userLoanColumn.outOfPocketCost)}
                          </TableCell>
                        )}
                        {visibleLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center font-bold">
                            {formatCurrency(lender.outOfPocketCost)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {showOutOfPocketBreakdown && (
                        <>
                          <TableRow className="bg-muted/20">
                            <TableCell className="pl-8 text-sm text-muted-foreground">Down Payment</TableCell>
                            <TableCell className="text-center text-sm">{formatCurrency(results.cashSaleColumn.outOfPocketBreakdown?.downPayment || results.cashSaleColumn.totalProjectCost)}</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center text-sm">{formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.downPayment || 0)}</TableCell>
                            )}
                            {visibleLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center text-sm">{formatCurrency(lender.outOfPocketBreakdown?.downPayment || 0)}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow className="bg-muted/20">
                            <TableCell className="pl-8 text-sm text-muted-foreground">Closing Costs (Buy)</TableCell>
                            <TableCell className="text-center text-sm">{formatCurrency(results.cashSaleColumn.outOfPocketBreakdown?.totalClosingCostsBuy || results.cashSaleColumn.closingCostsBuy)}</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center text-sm">{formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.totalClosingCostsBuy || results.userLoanColumn.closingCostsBuy)}</TableCell>
                            )}
                            {visibleLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center text-sm">{formatCurrency(lender.outOfPocketBreakdown?.totalClosingCostsBuy || lender.closingCostsBuy)}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow className="bg-muted/20">
                            <TableCell className="pl-8 text-sm text-muted-foreground">Carrying Costs</TableCell>
                            <TableCell className="text-center text-sm">{formatCurrency(results.cashSaleColumn.outOfPocketBreakdown?.carryingCosts || results.cashSaleColumn.carryingCosts)}</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center text-sm">{formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.carryingCosts || results.userLoanColumn.carryingCosts)}</TableCell>
                            )}
                            {visibleLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center text-sm">{formatCurrency(lender.outOfPocketBreakdown?.carryingCosts || lender.carryingCosts)}</TableCell>
                            ))}
                          </TableRow>
                        </>
                      )}
                      {/* Cash-on-Cash - Expandable */}
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setShowCashOnCashBreakdown(!showCashOnCashBreakdown)}
                        data-testid="summary-row-coc"
                      >
                        <TableCell className="font-medium flex items-center gap-2">
                          {showCashOnCashBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Cash-on-Cash
                        </TableCell>
                        <TableCell className="text-center font-bold text-primary" data-testid="summary-coc-cash">
                          {formatPercent(results.cashSaleColumn.cashOnCashRoi)}
                        </TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center font-bold text-primary" data-testid="summary-coc-loan">
                            {formatPercent(results.userLoanColumn.cashOnCashRoi)}
                          </TableCell>
                        )}
                        {visibleLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center font-bold text-primary">
                            {formatPercent(lender.cashOnCashRoi)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {showCashOnCashBreakdown && (
                        <TableRow className="bg-muted/20">
                          <TableCell className="pl-8 text-sm text-muted-foreground italic">
                            Formula: Net Profit ÷ Out-of-Pocket × 100
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {formatCurrency(results.cashSaleColumn.profit)} ÷ {formatCurrency(results.cashSaleColumn.outOfPocketCost)}
                          </TableCell>
                          {results.userLoanColumn && (
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {formatCurrency(results.userLoanColumn.profit)} ÷ {formatCurrency(results.userLoanColumn.outOfPocketCost)}
                            </TableCell>
                          )}
                          {visibleLenders.map((lender, index) => (
                            <TableCell key={index} className="text-center text-xs text-muted-foreground">
                              {formatCurrency(lender.profit)} ÷ {formatCurrency(lender.outOfPocketCost)}
                            </TableCell>
                          ))}
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell className="font-medium">Annualized</TableCell>
                        <TableCell className="text-center font-bold text-primary" data-testid="summary-annual-cash">
                          {formatPercent(results.cashSaleColumn.annualizedRoi)}
                        </TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center font-bold text-primary" data-testid="summary-annual-loan">
                            {formatPercent(results.userLoanColumn.annualizedRoi)}
                          </TableCell>
                        )}
                        {visibleLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center font-bold text-primary">
                            {formatPercent(lender.annualizedRoi)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card ref={targetRef}>
            <CardHeader>
              <CardTitle>Loan Comparison Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto relative" ref={scrollContainerRef}>
                <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className={`${stickyFirstColBase} min-w-[160px]`}
                    style={{ minWidth: `${metricColWidth}px` }}
                  >
                    Metric
                  </TableHead>
                  <TableHead 
                    className="text-center min-w-[100px] sticky z-10 bg-background"
                    style={{ left: `${metricColWidth}px`, minWidth: `${cashSaleColWidth}px` }}
                  >
                    Cash Sale
                  </TableHead>
                  {results.userLoanColumn && (
                    <TableHead 
                      className="text-center min-w-[100px] sticky z-10 bg-background"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px`, minWidth: `${yourLoanColWidth}px` }}
                    >
                      Entered Loan
                    </TableHead>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableHead key={index} className="text-center min-w-[140px] text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">{lender.lenderName || `Lender ${index + 1}`}</span>
                        {lender.productName && (
                          <span className="text-muted-foreground font-normal">{lender.productName}</span>
                        )}
                        {lender.isPreferred && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-accent text-accent-foreground">Preferred</Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 1. PROJECT COST Section */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowProjectCosts(!showProjectCosts)}
                  data-testid="section-header-project-costs"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showProjectCosts ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Project Cost
                  </TableCell>
                  <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.totalProjectCost)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.totalProjectCost)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-sm">{formatCurrency(lender.totalProjectCost)}</TableCell>
                  ))}
                </TableRow>
                {showProjectCosts && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Purchase Price</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(results.cashSaleColumn.purchasePrice)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.purchasePrice)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.purchasePrice)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Rehab Budget</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(results.cashSaleColumn.rehabBudget)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.rehabBudget)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.rehabBudget)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}

                {/* 2. CLOSING COSTS (BUY) Section */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowClosingCostsBuy(!showClosingCostsBuy)}
                  data-testid="section-header-closing-costs-buy"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showClosingCostsBuy ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Closing Costs (Buy)
                  </TableCell>
                  <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.closingCostsBuy)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.closingCostsBuy)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-sm">{formatCurrency(lender.closingCostsBuy)}</TableCell>
                  ))}
                </TableRow>
                {showClosingCostsBuy && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Attorney Fees</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(formData.attorneyFees || 0)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(formData.attorneyFees || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(formData.attorneyFees || 0)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Title Exam</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(formData.titleExam || 0)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(formData.titleExam || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(formData.titleExam || 0)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Title Insurance</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(formData.titleInsurance || 0)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(formData.titleInsurance || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(formData.titleInsurance || 0)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Transfer Fee</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(formData.transferFee || 0)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(formData.transferFee || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(formData.transferFee || 0)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}

                {/* 3. LENDER FEES Section */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowLenderFees(!showLenderFees)}
                  data-testid="section-header-lender-fees"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showLenderFees ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Lender Fees
                  </TableCell>
                  <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth}px` }}>
                    $0
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(
                        (results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost || results.userLoanColumn.outOfPocketBreakdown?.pointsCost || 0) + 
                        (results.userLoanColumn.outOfPocketBreakdown?.docPrepFee || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.appraisalCost || 0) +
                        (results.userLoanColumn.lenderDrawFees || 0)
                      )}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-sm">
                      {formatCurrency(
                        (lender.outOfPocketBreakdown?.totalPointsCost || lender.outOfPocketBreakdown?.pointsCost || 0) + 
                        (lender.outOfPocketBreakdown?.docPrepFee || 0) +
                        (lender.outOfPocketBreakdown?.appraisalCost || 0) +
                        (lender.lenderDrawFees || 0)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {showLenderFees && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Points</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        $0
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost || results.userLoanColumn.outOfPocketBreakdown?.pointsCost || 0)}
                          {results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred && <span className="text-xs text-muted-foreground ml-1">(deferred)</span>}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">
                          {formatCurrency(lender.outOfPocketBreakdown?.totalPointsCost || lender.outOfPocketBreakdown?.pointsCost || 0)}
                          {lender.outOfPocketBreakdown?.pointsDeferred && <span className="text-xs text-muted-foreground ml-1">(deferred)</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Doc Prep Fees</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        $0
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.docPrepFee || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.outOfPocketBreakdown?.docPrepFee || 0)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Appraisal Fee</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        $0
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.appraisalCost || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.outOfPocketBreakdown?.appraisalCost || 0)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Draw Fees</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        $0
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.lenderDrawFees || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.lenderDrawFees || 0)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}

                {/* 4. CARRYING COSTS Section */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowCarryingCosts(!showCarryingCosts)}
                  data-testid="section-header-carrying-costs"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showCarryingCosts ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Carrying Costs
                  </TableCell>
                  <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.carryingCosts)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.carryingCosts)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-sm">{formatCurrency(lender.carryingCosts)}</TableCell>
                  ))}
                </TableRow>
                {showCarryingCosts && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Interest Payments</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        $0
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.interestCost || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.interestCost || 0)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Insurance</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(((formData.annualInsurance || 0) / 12) * (formData.projectLength || 6))}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(((formData.annualInsurance || 0) / 12) * (formData.projectLength || 6))}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(((formData.annualInsurance || 0) / 12) * (formData.projectLength || 6))}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Utilities</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency((formData.monthlyUtilities || 0) * (formData.projectLength || 6))}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency((formData.monthlyUtilities || 0) * (formData.projectLength || 6))}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency((formData.monthlyUtilities || 0) * (formData.projectLength || 6))}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>HOA Monthly</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency((formData.hoaFees || 0) * (formData.projectLength || 6))}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency((formData.hoaFees || 0) * (formData.projectLength || 6))}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency((formData.hoaFees || 0) * (formData.projectLength || 6))}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>HOA Transfer Fee</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(formData.hoaTransferFee || 0)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(formData.hoaTransferFee || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(formData.hoaTransferFee || 0)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Taxes</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(((formData.annualTax || 0) / 12) * (formData.projectLength || 6))}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(((formData.annualTax || 0) / 12) * (formData.projectLength || 6))}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(((formData.annualTax || 0) / 12) * (formData.projectLength || 6))}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Other</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(formData.otherCarryingCosts || 0)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(formData.otherCarryingCosts || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(formData.otherCarryingCosts || 0)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}

                {/* 5. TOTAL INVESTMENT Row */}
                <TableRow className="bg-muted">
                  <TableCell className={`font-bold ${stickyFirstColMuted}`}>Total Investment</TableCell>
                  <TableCell className="text-center font-bold sticky z-10 bg-muted" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.totalInvestment)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-bold sticky z-10 bg-muted" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.totalInvestment)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatCurrency(lender.totalInvestment)}</TableCell>
                  ))}
                </TableRow>

                {/* 6. ESTIMATED SALE PRICE Row */}
                <TableRow>
                  <TableCell className={`font-medium ${stickyFirstColBase}`}>Estimated Sale Price</TableCell>
                  <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.sellPrice)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.sellPrice)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.sellPrice)}</TableCell>
                  ))}
                </TableRow>

                {/* 7. GROSS PROFIT Row */}
                <TableRow className="bg-muted">
                  <TableCell className={`font-bold ${stickyFirstColMuted}`}>Gross Profit</TableCell>
                  <TableCell className="text-center font-bold sticky z-10 bg-muted" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.sellPrice - results.cashSaleColumn.totalInvestment)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-bold sticky z-10 bg-muted" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.sellPrice - results.userLoanColumn.totalInvestment)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatCurrency(lender.sellPrice - lender.totalInvestment)}</TableCell>
                  ))}
                </TableRow>

                {/* 8. SELLING COSTS Section */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowSellingCosts(!showSellingCosts)}
                  data-testid="section-header-selling-costs"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showSellingCosts ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Selling Costs
                  </TableCell>
                  <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.closingCostsSell + results.cashSaleColumn.commission)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.closingCostsSell + results.userLoanColumn.commission)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-sm">
                      {formatCurrency(lender.closingCostsSell + lender.commission)}
                    </TableCell>
                  ))}
                </TableRow>
                {showSellingCosts && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Real Estate Commission</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(results.cashSaleColumn.commission)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.commission)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.commission)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Closing Costs (Sell)</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(results.cashSaleColumn.closingCostsSell)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.closingCostsSell)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.closingCostsSell)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}

                {/* 9. NET PROFIT Row */}
                <TableRow className="bg-primary/10">
                  <TableCell className={`font-bold ${stickyFirstColBase} bg-primary/10`}>Net Profit</TableCell>
                  <TableCell className="text-center font-bold sticky z-10 bg-primary/10" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.profit)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-bold sticky z-10 bg-primary/10" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.profit)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatCurrency(lender.profit)}</TableCell>
                  ))}
                </TableRow>
                
                {/* QR Codes Row - Shown in PDF only */}
                {isGeneratingPdf && (
                <TableRow>
                  <TableCell className={`font-medium ${stickyFirstColBase}`}>Scan to Apply</TableCell>
                  <TableCell 
                    className="text-center sticky z-10 bg-background"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    -
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center sticky z-10 bg-background"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      -
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">
                      <div className="flex flex-col items-center" data-testid={`qrcode-lender${index + 1}`}>
                        {lender.referralLink ? (
                          <QRCodeSVG 
                            value={lender.referralLink} 
                            size={64}
                            level="M"
                            bgColor="white"
                            fgColor="black"
                            className="mx-auto"
                          />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded bg-muted/20">
                            <span className="text-xs text-muted-foreground text-center px-1">Visit Lenders Page</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
                )}
                
                {/* Contact Lender Row - Hidden in PDF */}
                {!isGeneratingPdf && (
                <TableRow>
                  <TableCell className={`font-medium ${stickyFirstColBase}`}>Contact Lender</TableCell>
                  <TableCell 
                    className="text-center sticky z-10 bg-background"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    -
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center sticky z-10 bg-background"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      -
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">
                      {lender.lenderId && lender.productId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleContactLender({
                            lenderId: lender.lenderId!,
                            lenderName: lender.lenderName || 'Lender',
                            productId: lender.productId!,
                            productName: lender.productName || 'Loan Product',
                            loanType: 'fix-and-flip',
                            interestRate: lender.interestRate,
                            maxLtvBuy: lender.maxLtvBuy,
                            points: lender.points,
                            timeToClose: lender.timeToClose,
                            profit: lender.profit,
                            cashOnCashRoi: lender.cashOnCashRoi,
                            annualizedRoi: lender.annualizedRoi,
                            outOfPocketCost: lender.outOfPocketCost,
                            projectCosts: lender.totalProjectCost,
                            costsAndCarrying: lender.carryingCosts + lender.closingCostsBuy,
                            exitSale: lender.sellPrice - lender.closingCostsSell - lender.commission,
                          })}
                          data-testid={`button-contact-lender-${index + 1}`}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Contact Lender
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Show More Loans Button - Hidden in PDF */}
          {hasMoreLenders && !isGeneratingPdf && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={handleViewMoreLoans}
                data-testid="button-show-more-loans"
              >
                Show More Loans ({results.lenderColumns.length - visibleLenderCount} remaining)
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
        </TabsContent>

        {/* Rental / DSCR Analysis Tab */}
        <TabsContent value="rental-dscr" className="mt-6 space-y-6">
          {/* Property Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Property Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{formData.address}, {formData.city}, {formData.state} {formData.zipCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ARV</p>
                  <p className="font-medium">${propertyArv.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="font-medium">{formData.bedrooms || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="font-medium">{formData.bathrooms || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Rent Input */}
          <Card>
            <CardHeader>
              <CardTitle>Expected Monthly Rent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wizardData.property?.estimatedRent && wizardData.property.estimatedRent > 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Zillow RentZestimate: ${wizardData.property.estimatedRent.toLocaleString()} (editable)
                  </p>
                )}
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    value={monthlyRent || ""}
                    onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="pl-6"
                    placeholder="2500"
                    data-testid="input-monthly-rent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DSCR Results - Show prompt if no rent entered */}
          {!monthlyRent || monthlyRent === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Enter Monthly Rent to Calculate DSCR</h3>
                  <p className="text-muted-foreground mb-4">
                    Enter your expected monthly rent above to calculate the Debt Service Coverage Ratio and see qualifying lenders.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : dscrResults && (
            <Card>
              <CardHeader>
                <CardTitle>DSCR Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={`p-6 rounded-lg ${
                  dscrResults.dscrStatus === 'good' ? 'bg-emerald-500/10 border-2 border-emerald-500' :
                  dscrResults.dscrStatus === 'caution' ? 'bg-yellow-500/10 border-2 border-yellow-500' :
                  'bg-red-500/10 border-2 border-red-500'
                }`}>
                  <p className="text-sm text-muted-foreground mb-1">Debt Service Coverage Ratio</p>
                  <p className="text-4xl font-bold" data-testid="text-dscr-value">{dscrResults.dscr.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {dscrResults.dscrStatus === 'good' && (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-700">
                          Excellent! Most lenders will approve this property.
                        </p>
                      </>
                    )}
                    {dscrResults.dscrStatus === 'caution' && (
                      <>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <p className="text-sm font-medium text-yellow-700">
                          Acceptable, but some lenders may require a higher DSCR.
                        </p>
                      </>
                    )}
                    {dscrResults.dscrStatus === 'poor' && (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <p className="text-sm font-medium text-red-700">
                          Below minimum requirements. Consider a higher rent or lower purchase price.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* PITIA Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Monthly Payment Breakdown (PITIA)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Principal & Interest</span>
                      <span className="font-medium">${dscrResults.monthlyPrincipalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Property Tax</span>
                      <span className="font-medium">${dscrResults.monthlyPropertyTax.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Insurance</span>
                      <span className="font-medium">${dscrResults.monthlyInsurance.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HOA</span>
                      <span className="font-medium">${dscrResults.monthlyHoa.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="flex justify-between col-span-2 border-t pt-2">
                      <span className="font-semibold">Total PITIA</span>
                      <span className="font-bold text-primary">${dscrResults.totalMonthlyPITIA.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Monthly Rent</span>
                      <span className="font-semibold text-emerald-600">${monthlyRent.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* DSCR Lender Comparison */}
          {monthlyRent > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>DSCR Lender Comparison</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Comparing DSCR loan products for {propertyState || 'your area'} based on ${monthlyRent.toLocaleString()}/mo rent.
                </p>
              </CardHeader>
              <CardContent>
                {isLoadingDscrLenders ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">Calculating DSCR for each lender...</span>
                  </div>
                ) : dscrProductsWithCalculations.length > 0 ? (
                  <div className="space-y-6">
                    {dscrProductsWithCalculations.slice(0, 5).map((item, index) => {
                      const { lender, dscrCalculation } = item;
                      return (
                        <Card 
                          key={lender.productId} 
                          className={`p-6 ${
                            !dscrCalculation.meetsMinDscr 
                              ? 'border-2 border-red-300 bg-red-50/30' 
                              : dscrCalculation.dscrStatus === 'good' 
                                ? 'border-2 border-emerald-500' 
                                : dscrCalculation.dscrStatus === 'caution'
                                  ? 'border-2 border-yellow-500'
                                  : 'border'
                          }`} 
                          data-testid={`card-dscr-product-${lender.productId}`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="outline" className="text-lg px-3 py-1">#{index + 1}</Badge>
                              <div>
                                <h3 className="text-xl font-semibold text-primary">{lender.lenderName}</h3>
                                <p className="text-muted-foreground">{lender.productName}</p>
                              </div>
                              {lender.isPreferred && (
                                <Badge variant="default" className="bg-accent text-accent-foreground">Preferred</Badge>
                              )}
                              <Badge variant="secondary">{getLoanTypeLabel(lender.loanType)}</Badge>
                            </div>
                            
                            <div className={`text-center px-4 py-2 rounded-lg ${
                              dscrCalculation.dscrStatus === 'good' ? 'bg-emerald-500/10' :
                              dscrCalculation.dscrStatus === 'caution' ? 'bg-yellow-500/10' :
                              'bg-red-500/10'
                            }`}>
                              <p className="text-xs text-muted-foreground">DSCR</p>
                              <p className={`text-3xl font-bold ${
                                dscrCalculation.dscrStatus === 'good' ? 'text-emerald-600' :
                                dscrCalculation.dscrStatus === 'caution' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>{dscrCalculation.dscr.toFixed(2)}</p>
                            </div>
                          </div>

                          {!dscrCalculation.meetsMinDscr && (
                            <Alert className="mb-4 border-red-300 bg-red-50">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-700">
                                DSCR ({dscrCalculation.dscr.toFixed(2)}) is below minimum requirement of {dscrCalculation.minDscrRequired.toFixed(1)}.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                            <div>
                              <p className="text-muted-foreground">Interest Rate</p>
                              <p className="font-semibold">{dscrCalculation.interestRate}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Term</p>
                              <p className="font-semibold">{dscrCalculation.loanTermYears} years</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Max LTV</p>
                              <p className="font-semibold">{dscrCalculation.maxLtvBuy}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Loan Amount</p>
                              <p className="font-semibold">${dscrCalculation.loanAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                            </div>
                          </div>

                          <div className="border-t pt-4 flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleContactLender({
                                lenderId: lender.lenderId,
                                lenderName: lender.lenderName,
                                productId: lender.productId,
                                productName: lender.productName,
                                loanType: lender.loanType,
                                interestRate: dscrCalculation.interestRate,
                                maxLtvBuy: dscrCalculation.maxLtvBuy,
                                points: dscrCalculation.points,
                                timeToClose: lender.timeToClose,
                              })}
                              data-testid={`button-contact-dscr-${lender.productId}`}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Contact Lender
                            </Button>
                            {lender.referralLink && (
                              <Button asChild data-testid={`button-apply-dscr-${lender.productId}`}>
                                <a href={lender.referralLink} target="_blank" rel="noopener noreferrer" className="gap-2">
                                  Apply Now <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No DSCR Lenders Found</h3>
                    <p className="text-muted-foreground">
                      No DSCR lenders available for {propertyState || 'your area'} yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Contact Lender Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact {selectedLenderForContact?.lenderName}
            </DialogTitle>
            <DialogDescription>
              Send an inquiry about the {selectedLenderForContact?.productName} loan product.
              Your contact information and deal details will be included automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Include any questions or additional information for the lender..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-contact-message"
              />
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-2">What will be shared:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>Your name, email, and phone number</li>
                <li>Property address and details</li>
                <li>Deal metrics (ARV, estimated profit, ROI)</li>
                <li>Selected loan product information</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setContactDialogOpen(false);
                setContactMessage("");
                setSelectedLenderForContact(null);
              }}
              data-testid="button-cancel-contact"
            >
              Cancel
            </Button>
            <Button 
              onClick={submitContactLender}
              disabled={contactLenderMutation.isPending}
              data-testid="button-send-contact"
            >
              {contactLenderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Inquiry
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
