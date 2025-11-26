import { useState, useRef, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { WizardFormData } from "./DealAnalysisWizard";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, TrendingUp, ChevronDown, ChevronRight, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { usePDF } from "react-to-pdf";
import { QRCodeSVG } from "qrcode.react";
import type { LoanCriteria } from "@shared/schema";
import { useWizardData } from "@/contexts/WizardDataContext";

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

export default function Step5Results({ form, onBack }: Step5ResultsProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { updatePropertyData, wizardData } = useWizardData();
  const loanPreference = form.watch("loanPreference") || "one-of-each";
  const [hasCalculated, setHasCalculated] = useState(false);
  const [visibleLenderCount, setVisibleLenderCount] = useState(2);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  
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
    resolution: 3,
    page: {
      margin: 10,
      format: 'letter',
      orientation: 'landscape',
    },
    canvas: {
      mimeType: 'image/png',
      qualityRatio: 1,
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
                
                {/* Quick Apply Row - Combined QR codes and Apply buttons */}
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
                        <div className="flex flex-col items-center gap-2">
                          <Button 
                            size="sm" 
                            data-testid={`button-apply-lender${index + 1}`}
                            onClick={() => {
                              window.open(lender.referralLink, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            Apply Now
                          </Button>
                          <QRCodeSVG 
                            value={lender.referralLink} 
                            size={56}
                            level="M"
                            bgColor="transparent"
                            fgColor="currentColor"
                            className="mx-auto"
                          />
                          <span className="text-[10px] text-muted-foreground">or scan</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Contact lender directly</span>
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

      <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                Considering the BRRRR Strategy?
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                Analyze this property as a rental! Calculate your DSCR (Debt Service Coverage Ratio), evaluate long-term cash flow, and find specialized DSCR lenders who offer financing based on rental income.
              </p>
              <Button
                type="button"
                variant="default"
                onClick={handleNavigateToRentalAnalysis}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="button-rental-analysis-step6"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Analyze as Rental Property
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
