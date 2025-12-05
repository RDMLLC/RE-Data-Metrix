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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, TrendingUp, ChevronDown, ChevronRight, Download, Home, Building2, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
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
  purchasePrice: number;
  rehabBudget: number;
  totalProjectCost: number;
  closingCostsBuy: number;
  carryingCosts: number;
  totalInvestment: number;
  sellPrice: number;
  closingCostsSell: number;
  commission: number;
  rolledCosts: number;
  lenderDrawFees: number;
  profit: number;
  outOfPocketCost: number;
  cashOnCashRoi: number;
  annualizedRoi: number;
  roi: number;
  percentageArv: number;
  percentageArvLender?: number;
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
  
  // Collapsible section states
  const [showLoanTerms, setShowLoanTerms] = useState(true);
  const [showProjectCosts, setShowProjectCosts] = useState(false);
  const [showCostsCarrying, setShowCostsCarrying] = useState(false);
  const [showExitMetrics, setShowExitMetrics] = useState(false);

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
    const totalCarryingCosts = (monthlyInsurance + monthlyUtilities + monthlyPropertyTax + monthlyHoa) * projectLength;
    
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
      userLoan: formData.maxLendBuy ? {
        desiredLoanAmount: undefined,
        interestRate: formData.loanInterestRate || 12,
        interestDeferred: formData.interestDeferred || false,
        points: formData.loanPoints || 0,
        pointsDeferred: formData.pointsDeferred || false,
        maxLoanToArv: formData.maxLoanToArv || 70,
        appraisalRequired: formData.appraisalRequired || false,
        appraisalFee: formData.appraisalFee || 500,
        drawFees: formData.drawFees || 0,
        loanDocPrepFees: formData.loanDocPrepFees || 0,
      } : undefined,
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
            onClick={() => toPDF()}
            data-testid="button-download-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
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
          {/* Editable Variables Section */}
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
                      Your Loan
                    </TableHead>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableHead key={index} className="text-center min-w-[120px] text-xs">
                      {lender.lenderName || `Lender ${index + 1}`}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* KEY METRICS - Always Visible */}
                <TableRow className="bg-muted">
                  <TableCell className={`font-bold ${stickyFirstColMuted}`}>Est. Profit</TableCell>
                  <TableCell 
                    className="text-center font-bold sticky z-10 bg-muted"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    {formatCurrency(results.cashSaleColumn.profit)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center font-bold sticky z-10 bg-muted"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      {formatCurrency(results.userLoanColumn.profit)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatCurrency(lender.profit)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow className="bg-muted">
                  <TableCell className={`font-bold ${stickyFirstColMuted}`}>Cash-on-Cash ROI</TableCell>
                  <TableCell 
                    className="text-center font-bold sticky z-10 bg-muted"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    {formatPercent(results.cashSaleColumn.cashOnCashRoi)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center font-bold sticky z-10 bg-muted"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      {formatPercent(results.userLoanColumn.cashOnCashRoi)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatPercent(lender.cashOnCashRoi)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow className="bg-muted">
                  <TableCell className={`font-bold ${stickyFirstColMuted}`}>Annualized ROI</TableCell>
                  <TableCell 
                    className="text-center font-bold sticky z-10 bg-muted"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    {formatPercent(results.cashSaleColumn.annualizedRoi)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center font-bold sticky z-10 bg-muted"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      {formatPercent(results.userLoanColumn.annualizedRoi)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatPercent(lender.annualizedRoi)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow className="bg-muted">
                  <TableCell className={`font-bold ${stickyFirstColMuted}`}>Est. Out of Pocket</TableCell>
                  <TableCell 
                    className="text-center font-bold sticky z-10 bg-muted"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    {formatCurrency(results.cashSaleColumn.outOfPocketCost)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center font-bold sticky z-10 bg-muted"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      {formatCurrency(results.userLoanColumn.outOfPocketCost)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatCurrency(lender.outOfPocketCost)}</TableCell>
                  ))}
                </TableRow>

                {/* LOAN TERMS Section Header */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowLoanTerms(!showLoanTerms)}
                  data-testid="section-header-loan-terms"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showLoanTerms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Loan Terms
                  </TableCell>
                  <TableCell 
                    className="text-center text-muted-foreground text-sm sticky z-10 bg-accent/30"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    -
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center text-sm sticky z-10 bg-accent/30"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      Custom
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-xs">{lender.productName || 'N/A'}</TableCell>
                  ))}
                </TableRow>
                
                {showLoanTerms && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Interest Rate</TableCell>
                      <TableCell 
                        className="text-center text-muted-foreground sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        -
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {results.userLoanColumn.interestRate !== undefined && results.userLoanColumn.interestRate !== null
                            ? `${results.userLoanColumn.interestRate.toFixed(2)}%`
                            : 'N/A'}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center" data-testid={`lender${index + 1}-interest-rate`}>
                          {lender.interestRate !== undefined && lender.interestRate !== null
                            ? `${lender.interestRate.toFixed(2)}%`
                            : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Max LTV (Buy)</TableCell>
                      <TableCell 
                        className="text-center text-muted-foreground sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        -
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {results.userLoanColumn.maxLtvBuy !== undefined && results.userLoanColumn.maxLtvBuy !== null
                            ? `${results.userLoanColumn.maxLtvBuy.toFixed(0)}%`
                            : 'N/A'}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center" data-testid={`lender${index + 1}-ltv`}>
                          {lender.maxLtvBuy !== undefined && lender.maxLtvBuy !== null
                            ? `${lender.maxLtvBuy.toFixed(0)}%`
                            : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Points</TableCell>
                      <TableCell 
                        className="text-center text-muted-foreground sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        -
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {results.userLoanColumn.points !== undefined && results.userLoanColumn.points !== null
                            ? `${results.userLoanColumn.points.toFixed(2)}%`
                            : 'N/A'}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center" data-testid={`lender${index + 1}-points`}>
                          {lender.points !== undefined && lender.points !== null
                            ? `${lender.points.toFixed(2)}%`
                            : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Time to Close</TableCell>
                      <TableCell 
                        className="text-center text-muted-foreground sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        -
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {results.userLoanColumn.timeToClose !== undefined && results.userLoanColumn.timeToClose !== null
                            ? `${results.userLoanColumn.timeToClose} days`
                            : 'N/A'}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center" data-testid={`lender${index + 1}-time-to-close`}>
                          {lender.timeToClose !== undefined && lender.timeToClose !== null
                            ? `${lender.timeToClose} days`
                            : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                  </>
                )}
                
                {/* PROJECT COSTS Section Header */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowProjectCosts(!showProjectCosts)}
                  data-testid="section-header-project-costs"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showProjectCosts ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Project Costs
                  </TableCell>
                  <TableCell 
                    className="text-center text-sm sticky z-10 bg-accent/30"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    {formatCurrency(results.cashSaleColumn.totalProjectCost)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center text-sm sticky z-10 bg-accent/30"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
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
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                        data-testid="cash-purchase-price"
                      >
                        {formatCurrency(results.cashSaleColumn.purchasePrice)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                          data-testid="user-purchase-price"
                        >
                          {formatCurrency(results.userLoanColumn.purchasePrice)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center" data-testid={`lender${index + 1}-purchase-price`}>
                          {formatCurrency(lender.purchasePrice)}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Rehab Budget</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatCurrency(results.cashSaleColumn.rehabBudget)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatCurrency(results.userLoanColumn.rehabBudget)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.rehabBudget)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}
                
                {/* COSTS & CARRYING Section Header */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowCostsCarrying(!showCostsCarrying)}
                  data-testid="section-header-costs-carrying"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showCostsCarrying ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Costs & Carrying
                  </TableCell>
                  <TableCell 
                    className="text-center text-sm sticky z-10 bg-accent/30"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    {formatCurrency(results.cashSaleColumn.totalInvestment)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center text-sm sticky z-10 bg-accent/30"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      {formatCurrency(results.userLoanColumn.totalInvestment)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-sm">{formatCurrency(lender.totalInvestment)}</TableCell>
                  ))}
                </TableRow>
                
                {showCostsCarrying && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Closing Costs (Buy)</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatCurrency(results.cashSaleColumn.closingCostsBuy)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatCurrency(results.userLoanColumn.closingCostsBuy)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.closingCostsBuy)}</TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Carrying Costs</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatCurrency(results.cashSaleColumn.carryingCosts)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatCurrency(results.userLoanColumn.carryingCosts)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.carryingCosts)}</TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Rolled Costs</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatCurrency(results.cashSaleColumn.rolledCosts)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatCurrency(results.userLoanColumn.rolledCosts)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.rolledCosts)}</TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Lender Draw Fees</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatCurrency(results.cashSaleColumn.lenderDrawFees)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatCurrency(results.userLoanColumn.lenderDrawFees)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.lenderDrawFees)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}
                
                {/* EXIT & SALE Section Header */}
                <TableRow 
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowExitMetrics(!showExitMetrics)}
                  data-testid="section-header-exit-metrics"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showExitMetrics ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Exit & Sale
                  </TableCell>
                  <TableCell 
                    className="text-center text-sm sticky z-10 bg-accent/30"
                    style={{ left: `${metricColWidth}px` }}
                  >
                    {formatCurrency(results.cashSaleColumn.sellPrice)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell 
                      className="text-center text-sm sticky z-10 bg-accent/30"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                    >
                      {formatCurrency(results.userLoanColumn.sellPrice)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-sm">{formatCurrency(lender.sellPrice)}</TableCell>
                  ))}
                </TableRow>
                
                {showExitMetrics && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Closing Costs (Sell)</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatCurrency(results.cashSaleColumn.closingCostsSell)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatCurrency(results.userLoanColumn.closingCostsSell)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.closingCostsSell)}</TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>RE Commission</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatCurrency(results.cashSaleColumn.commission)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatCurrency(results.userLoanColumn.commission)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.commission)}</TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>ROI %</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatPercent(results.cashSaleColumn.roi)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatPercent(results.userLoanColumn.roi)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatPercent(lender.roi)}</TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Percentage ARV</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        {formatPercent(results.cashSaleColumn.percentageArv)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatPercent(results.userLoanColumn.percentageArv)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatPercent(lender.percentageArv)}</TableCell>
                      ))}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>% ARV (Lender)</TableCell>
                      <TableCell 
                        className="text-center sticky z-10 bg-background"
                        style={{ left: `${metricColWidth}px` }}
                      >
                        N/A
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell 
                          className="text-center sticky z-10 bg-background"
                          style={{ left: `${metricColWidth + cashSaleColWidth}px` }}
                        >
                          {formatPercent(results.userLoanColumn.percentageArvLender || 0)}
                        </TableCell>
                      )}
                      {visibleLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatPercent(lender.percentageArvLender || 0)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}
                
                {/* Quick Apply Row - Buttons only */}
                <TableRow>
                  <TableCell className={`font-medium ${stickyFirstColBase}`}>Quick Apply</TableCell>
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
                      {lender.referralLink ? (
                        <Button 
                          size="sm" 
                          data-testid={`button-apply-lender${index + 1}`}
                          onClick={() => {
                            window.open(lender.referralLink, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          Apply Now
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-contact-lender${index + 1}`}
                          onClick={() => {
                            setLocation(`/lenders?search=${encodeURIComponent(lender.lenderName || '')}`);
                          }}
                        >
                          Contact Lender
                        </Button>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* QR Codes Row - Separate row at bottom for PDF */}
                <TableRow>
                  <TableCell className={`font-medium ${stickyFirstColBase} text-xs`}>Scan to Apply</TableCell>
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
                      {lender.referralLink ? (
                        <div className="flex flex-col items-center">
                          <QRCodeSVG 
                            value={lender.referralLink} 
                            size={64}
                            level="M"
                            bgColor="white"
                            fgColor="black"
                            className="mx-auto"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {hasMoreLenders && (
            <div className="mt-6 flex justify-center">
              <Button 
                variant="outline" 
                onClick={handleViewMoreLoans}
                data-testid="button-view-more-loans"
              >
                View More Loans
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

                          {lender.referralLink && (
                            <div className="border-t pt-4 flex justify-end">
                              <Button asChild data-testid={`button-apply-dscr-${lender.productId}`}>
                                <a href={lender.referralLink} target="_blank" rel="noopener noreferrer" className="gap-2">
                                  Apply Now <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          )}
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
    </div>
  );
}
