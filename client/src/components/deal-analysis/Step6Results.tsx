import { useState, useRef, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { WizardFormData } from "./DealAnalysisWizard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
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
import { ArrowLeft, Loader2, TrendingUp, ChevronDown, ChevronRight, Download, Home, Building2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Mail, Send, FileSpreadsheet, FileText, Sparkles, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { usePDF } from "react-to-pdf";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QRCodeCanvas } from "qrcode.react";
import type { LoanCriteria } from "@shared/schema";
import { useWizardData } from "@/contexts/WizardDataContext";
import { calculateDSCR } from "@shared/utils/dscr-calculator";
import { getInsuranceCostPerSqFt } from "@shared/data/insurance-costs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import logoImg from "@assets/Transparent Logo_1762969260481.png";
import { useDemoAccess } from "@/hooks/use-demo-access";
import PdfQuotaExhaustedModal from "./PdfQuotaExhaustedModal";

const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.0040, AK: 0.0099, AZ: 0.0063, AR: 0.0061, CA: 0.0075, CO: 0.0049,
  CT: 0.0187, DE: 0.0057, FL: 0.0083, GA: 0.0092, HI: 0.0028, ID: 0.0069,
  IL: 0.0205, IN: 0.0085, IA: 0.0151, KS: 0.0131, KY: 0.0086, LA: 0.0055,
  ME: 0.0109, MD: 0.0099, MA: 0.0114, MI: 0.0144, MN: 0.0108, MS: 0.0065,
  MO: 0.0097, MT: 0.0084, NE: 0.0157, NV: 0.0053, NH: 0.0186, NJ: 0.0213,
  NM: 0.0077, NY: 0.0172, NC: 0.0080, ND: 0.0098, OH: 0.0153, OK: 0.0090,
  OR: 0.0091, PA: 0.0153, RI: 0.0153, SC: 0.0057, SD: 0.0115, TN: 0.0056,
  TX: 0.0160, UT: 0.0058, VT: 0.0188, VA: 0.0082, WA: 0.0093, WV: 0.0059,
  WI: 0.0157, WY: 0.0055, DC: 0.0085,
};

function getStateTaxRate(state: string): number {
  const abbr = state?.trim().toUpperCase();
  return STATE_TAX_RATES[abbr] ?? 0.0120;
}

// Demo lender names for Demo Mode - used when shooting marketing content
const DEMO_LENDER_NAMES = [
  { lenderName: "Capital Bridge Funding", productName: "Bridge Express" },
  { lenderName: "Investor Lending Group", productName: "Fix & Flip Pro" },
  { lenderName: "Premier Hard Money", productName: "Quick Close Bridge" },
  { lenderName: "Freedom Capital Partners", productName: "Investor Bridge Loan" },
  { lenderName: "National Rehab Lenders", productName: "Rehab Advantage" },
  { lenderName: "Apex Funding Solutions", productName: "Fast Track Bridge" },
  { lenderName: "Summit Private Lending", productName: "Bridge Plus" },
  { lenderName: "Keystone Capital Group", productName: "Investor Choice" },
  { lenderName: "Alliance Hard Money", productName: "Bridge Builder" },
  { lenderName: "Metro Investment Lending", productName: "Urban Flip Loan" },
];

const DEMO_DSCR_LENDER_NAMES = [
  { lenderName: "Investor DSCR Capital", productName: "DSCR Premier", contactName: "Investment Team", email: "info@example.com", phone: "(800) 555-0100" },
  { lenderName: "Rental Property Funding", productName: "Cash Flow Loan", contactName: "Lending Dept", email: "loans@example.com", phone: "(800) 555-0200" },
  { lenderName: "Portfolio Lending Group", productName: "DSCR Advantage", contactName: "DSCR Team", email: "dscr@example.com", phone: "(800) 555-0300" },
  { lenderName: "Income Property Capital", productName: "Rental Express", contactName: "Capital Team", email: "rentals@example.com", phone: "(800) 555-0400" },
  { lenderName: "Landlord Lending Corp", productName: "DSCR Plus", contactName: "Support Team", email: "support@example.com", phone: "(800) 555-0500" },
];

interface Step5ResultsProps {
  form: UseFormReturn<WizardFormData>;
  onBack: () => void;
  isSubscriber?: boolean;
  viewingDealId?: string;
  onEditDeal?: () => void;
  suppressAutoSave?: boolean;
  originalResultsSnapshot?: ResultsResponse | null;
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
  // Granular Closing Costs (Buy) components — flat dollar amounts
  attorneyFees?: number;
  titleExam?: number;
  titleInsurance?: number;
  transferFee?: number;
  // Granular Carrying Costs components — project-period totals
  insurance?: number;
  utilities?: number;
  hoaMonthly?: number;
  taxes?: number;
  other?: number;
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
  maxLendRehab?: number;
  points?: number;
  interestDeferred?: boolean;
  pointsDeferred?: boolean;
  drawnFundsOnly?: boolean;
  isLtcWeighted?: boolean;
  maxLtcPercent?: number;
  isLtcAdjusted?: boolean;
  effectiveBuyPercent?: number;
  totalLoanAmount?: number;
  purchaseLoanAmount?: number;
  rehabLoanAmount?: number;
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

export interface ResultsResponse {
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
  code?: string;
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

export default function Step5Results({ form, onBack, isSubscriber = false, viewingDealId, onEditDeal, suppressAutoSave = false, originalResultsSnapshot }: Step5ResultsProps) {
  const { toast } = useToast();
  const isViewingDeal = !!viewingDealId;
  const [, setLocation] = useLocation();
  const { updatePropertyData, wizardData } = useWizardData();
  const { isAuthenticated, user } = useAuth();
  const loanPreference = form.watch("loanPreference") || "one-of-each";
  const [hasCalculated, setHasCalculated] = useState(false);
  const [visibleLenderCount, setVisibleLenderCount] = useState(2);
  const [showCashSale, setShowCashSale] = useState(false);
  const [showAllLoansMobile, setShowAllLoansMobile] = useState(false);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  
  // Auto-save state — suppressed on the initial mount of a saved deal view so no
  // duplicate entry is created. Cleared by the wizard when the user navigates back,
  // enabling auto-save on subsequent re-runs with changed inputs.
  const [dealSaved, setDealSaved] = useState(() => suppressAutoSave);
  const [savedDealId, setSavedDealId] = useState<string | null>(() => suppressAutoSave ? (viewingDealId ?? null) : null);
  const saveAttemptedRef = useRef(suppressAutoSave); // Prevent duplicate saves
  
  // Analysis mode toggle state
  const [analysisMode, setAnalysisMode] = useState<'fix-and-flip' | 'rental-dscr'>('fix-and-flip');
  const [monthlyRent, setMonthlyRent] = useState<number>(wizardData.property?.estimatedRent || 0);

  // DSCR quota gate for free users
  const [dscrQuotaExceeded, setDscrQuotaExceeded] = useState(false);
  const [dscrQuotaChecked, setDscrQuotaChecked] = useState(false);
  const [dscrTabActivated, setDscrTabActivated] = useState(false);
  
  // Editable fields for on-the-fly scenario changes
  const [editBuyPrice, setEditBuyPrice] = useState<number>(0);
  const [editRehab, setEditRehab] = useState<number>(0);
  const [editProjectLength, setEditProjectLength] = useState<number>(6);
  const [editArv, setEditArv] = useState<number>(0);
  
  // Collapsible section states for main table rows
  const [showProjectCosts, setShowProjectCosts] = useState(false);
  const [showClosingCostsBuy, setShowClosingCostsBuy] = useState(false);
  const [showLenderFees, setShowLenderFees] = useState(false);
  const [showCarryingCosts, setShowCarryingCosts] = useState(false);
  const [showSellingCosts, setShowSellingCosts] = useState(false);
  // Summary box expandable states
  const [showOutOfPocketBreakdown, setShowOutOfPocketBreakdown] = useState(false);
  const [showOopTableBreakdown, setShowOopTableBreakdown] = useState(false);
  const [showCashOnCashBreakdown, setShowCashOnCashBreakdown] = useState(false);
  const [showAnnualizedBreakdown, setShowAnnualizedBreakdown] = useState(false);
  const [showLoanAmountBreakdown, setShowLoanAmountBreakdown] = useState(false);
  const [showLoanTerms, setShowLoanTerms] = useState(false);

  // PDF generation state - controls visibility of elements during PDF capture
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPdfQuotaModal, setShowPdfQuotaModal] = useState(false);
  // PDF column selection dialog state
  const [pdfColumnDialogOpen, setPdfColumnDialogOpen] = useState(false);
  const [selectedPdfColumnIds, setSelectedPdfColumnIds] = useState<string[]>([]);
  // Single-column export state
  const [singleColumnExportData, setSingleColumnExportData] = useState<{ column: LoanComparisonColumn; name: string } | null>(null);

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
  // Two-page comparison PDF: separate refs for page 1 (header + summary) and page 2 (comparison table)
  const pdfPage1Ref = useRef<HTMLDivElement>(null);
  const pdfPage2Ref = useRef<HTMLDivElement>(null);

  // Inject ~10% condensed sizing only while generating the PDF; live UI is untouched.
  useEffect(() => {
    if (!isGeneratingPdf) return;
    const el = document.createElement('style');
    el.id = 'pdf-condensed-style';
    el.textContent = `
      .pdf-page1, .pdf-page2 { font-size: 0.9em; }
      .pdf-page1 table, .pdf-page2 table { border-collapse: collapse; }
      .pdf-page1 td, .pdf-page1 th,
      .pdf-page2 td, .pdf-page2 th {
        padding-top: 0.4rem !important;
        padding-bottom: 0.4rem !important;
        padding-left: 0.55rem !important;
        padding-right: 0.55rem !important;
        font-size: 0.78rem !important;
        line-height: 1.2 !important;
      }
      .pdf-page1 .text-xs, .pdf-page2 .text-xs { font-size: 0.65rem !important; }
      .pdf-page1 .text-sm, .pdf-page2 .text-sm { font-size: 0.72rem !important; }
      .pdf-page1 h1, .pdf-page2 h1, .pdf-page1 h2, .pdf-page2 h2,
      .pdf-page1 h3, .pdf-page2 h3 { font-size: 0.95em !important; }
    `;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [isGeneratingPdf]);
  // Second PDF hook for single-column export
  const { toPDF: toSingleColumnPDF, targetRef: singleColumnPdfRef } = usePDF({
    filename: 'loan-analysis.pdf',
    method: 'save',
    resolution: 2,
    page: { margin: 12, format: 'letter', orientation: 'portrait' },
    canvas: { mimeType: 'image/png', qualityRatio: 0.95 },
    overrides: { pdf: { compress: true }, canvas: { useCORS: true } },
  });

  // Reference for scrolling to new loans
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Track previous values to detect real user changes (not initial state set)
  const prevValuesRef = useRef<{price: number, rehab: number, length: number, arv: number, preference: string} | null>(null);
  
  // Track the latest request ID to prevent stale responses from overwriting newer results
  const requestIdRef = useRef(0);

  // Demo Mode - check admin setting OR demo access token cookie
  const { isDemoMode, hasDemoToken } = useDemoAccess();
  
  // Demo token users get full subscriber access (with anonymized lenders)
  const effectiveIsSubscriber = isSubscriber || hasDemoToken;

  // Fetch usage data for free authenticated users (loan analysis quota counter)
  const { data: usageData } = useQuery<{ loanAnalysisCount: number; remainingLoanAnalyses: number; isSubscriber: boolean }>({
    queryKey: ['/api/user/usage'],
    enabled: isAuthenticated && !effectiveIsSubscriber,
  });

  // showFullResults controls whether lender columns and full analysis is visible:
  //   - Paid subscribers always see full results
  //   - Automated property lookups always show full results
  //   - Free users within quota: backend returns lenderColumns, so show them
  //   - Free users quota-exceeded: backend returns lenderColumns: [], falls through to upgrade banner
  const propertyDataSource = form.watch('propertyDataSource');
  const showFullResults = effectiveIsSubscriber || propertyDataSource === 'automated' || (results?.lenderColumns?.length ?? 0) > 0;

  // Function to anonymize lender columns when demo mode is active
  const getDisplayLenders = (lenderColumns: LoanComparisonColumn[]): LoanComparisonColumn[] => {
    if (!isDemoMode) return lenderColumns;
    
    return lenderColumns.map((lender, index) => ({
      ...lender,
      lenderId: `demo-lender-${index + 1}`,
      lenderName: DEMO_LENDER_NAMES[index % DEMO_LENDER_NAMES.length].lenderName,
      productName: DEMO_LENDER_NAMES[index % DEMO_LENDER_NAMES.length].productName,
      referralLink: "#",
    }));
  };

  // Function to anonymize DSCR lenders when demo mode is active
  const getDisplayDscrLenders = (dscrProducts: DSCRProductWithCalculation[]): DSCRProductWithCalculation[] => {
    if (!isDemoMode) return dscrProducts;
    
    return dscrProducts.map((product, index) => ({
      ...product,
      lender: {
        ...product.lender,
        lenderId: `demo-dscr-${index + 1}`,
        lenderName: DEMO_DSCR_LENDER_NAMES[index % DEMO_DSCR_LENDER_NAMES.length].lenderName,
        productName: DEMO_DSCR_LENDER_NAMES[index % DEMO_DSCR_LENDER_NAMES.length].productName,
        contactName: DEMO_DSCR_LENDER_NAMES[index % DEMO_DSCR_LENDER_NAMES.length].contactName,
        email: DEMO_DSCR_LENDER_NAMES[index % DEMO_DSCR_LENDER_NAMES.length].email,
        phone: DEMO_DSCR_LENDER_NAMES[index % DEMO_DSCR_LENDER_NAMES.length].phone,
        website: "https://example.com",
        referralLink: "#",
      },
    }));
  };

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
    const initialArv = formData.arv || 0;
    
    setEditBuyPrice(initialPrice);
    setEditRehab(initialRehab);
    setEditProjectLength(initialLength);
    setEditArv(initialArv);
    
    // Store initial values to detect real user changes (including preference)
    prevValuesRef.current = { 
      price: initialPrice, 
      rehab: initialRehab, 
      length: initialLength,
      arv: initialArv,
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
      editArv !== prevValuesRef.current.arv ||
      loanPreference !== prevValuesRef.current.preference;
    
    // Skip if values haven't changed (prevents initial trigger)
    if (!valuesChanged) return;
    
    const debounceTimer = setTimeout(() => {
      // Update previous values
      prevValuesRef.current = { 
        price: editBuyPrice, 
        rehab: editRehab, 
        length: editProjectLength,
        arv: editArv,
        preference: loanPreference 
      };
      
      const payload = buildPayload(
        loanPreference,
        editBuyPrice,
        editRehab,
        editProjectLength,
        editArv
      );
      
      // Increment request ID and include in mutation context
      requestIdRef.current += 1;
      calculateResultsMutation.mutate({ ...payload, _requestId: requestIdRef.current });
    }, 800); // 800ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [editBuyPrice, editRehab, editProjectLength, editArv, loanPreference]);

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

  // Auto-save deal mutation
  const saveDealMutation = useMutation({
    mutationFn: async (dealData: {
      dealSnapshot: any;
      resultsSnapshot: any;
      propertyAddress: string;
      arv?: number;
      roi?: number;
      profit?: number;
      status?: string;
      lendersPresented?: any;
    }) => {
      const response = await apiRequest("POST", "/api/member/deals", dealData);
      return response.json();
    },
    onSuccess: (data) => {
      setDealSaved(true);
      setSavedDealId(data.id);
      toast({
        title: "Analysis saved",
        description: "Your deal analysis has been saved to your dashboard.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/member/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/deals'] });
    },
    onError: (error: any) => {
      console.error("Failed to auto-save deal:", error);
      toast({
        title: "Failed to save analysis",
        description: error.message || "Your deal could not be saved. Please try again.",
        variant: "destructive",
      });
      saveAttemptedRef.current = false;
    },
  });

  // Mark deal as final mutation
  const markFinalMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const response = await apiRequest("PATCH", `/api/member/deals/${dealId}`, { status: 'final' });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Saved",
        description: "This analysis has been marked as final and saved to your dashboard.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/member/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/deals'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save deal. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-save effect - triggers once when results are first loaded for subscribers only
  useEffect(() => {
    // Skip if already saved or save already attempted
    if (!results || !isAuthenticated || dealSaved || saveAttemptedRef.current) return;

    // When re-running from a saved deal (viewingDealId set but suppressAutoSave already cleared),
    // compare computed results against the original snapshot. Skip saving if the profit/OOP are
    // essentially the same so we don't create a duplicate for unchanged re-runs.
    if (viewingDealId && originalResultsSnapshot) {
      const bestCurrent = results.userLoanColumn || results.cashSaleColumn;
      const bestOriginal = originalResultsSnapshot.userLoanColumn || originalResultsSnapshot.cashSaleColumn;
      const profitDiff = Math.abs((bestCurrent?.profit ?? 0) - (bestOriginal?.profit ?? 0));
      const oopDiff = Math.abs((bestCurrent?.outOfPocketCost ?? 0) - (bestOriginal?.outOfPocketCost ?? 0));
      if (profitDiff < 1 && oopDiff < 1) {
        // Results are essentially unchanged — skip to avoid duplicate entry
        saveAttemptedRef.current = true;
        setDealSaved(true);
        return;
      }
    }

    // Mark as attempted immediately to prevent duplicate saves
    saveAttemptedRef.current = true;
    
    const formData = form.getValues();
    
    // Build and normalize the property address
    const addressParts = [
      formData.address || '',
      formData.city || '',
      formData.state || '',
      formData.zipCode || ''
    ].filter(part => part.trim() !== '');
    const propertyAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Manual Entry';
    
    // Get summary metrics from best available column
    const bestColumn = results.userLoanColumn || results.cashSaleColumn;
    
    // Merge wholesale-specific data from wizard context into dealSnapshot
    const enrichedDealSnapshot = {
      ...formData,
      // Include wholesale tracking fields if available
      appliedForStraightline: wizardData.property?.appliedForStraightline,
      wholesaleTransactionType: wizardData.property?.wholesaleTransactionType,
      wholesaleFee: wizardData.property?.wholesaleFee,
      resalePrice: wizardData.property?.resalePrice,
    };
    
    saveDealMutation.mutate({
      dealSnapshot: enrichedDealSnapshot,
      resultsSnapshot: results,
      propertyAddress,
      arv: formData.arv || editArv,
      roi: bestColumn?.cashOnCashRoi,
      profit: bestColumn?.profit,
      status: 'draft',
      lendersPresented: results.lenderColumns?.map(l => ({
        lenderId: l.lenderId,
        lenderName: l.lenderName,
        productId: l.productId,
        productName: l.productName,
      })),
    });
  }, [results, isAuthenticated, dealSaved]);

  const handleMarkAsFinal = () => {
    if (savedDealId) {
      markFinalMutation.mutate(savedDealId);
    }
  };

  const handleContactLender = async (lenderData: {
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
    referralLink?: string;
  }) => {
    const formData = form.getValues();
    const propertyAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
    
    const trackingPayload = {
      lenderId: lenderData.lenderId,
      loanProductId: lenderData.productId,
      propertyAddress,
      arv: editArv || formData.arv || 0,
      buyPrice: editBuyPrice,
      rehabCost: editRehab,
      estProfit: lenderData.profit,
      loanTerms: {
        interestRate: lenderData.interestRate ? `${lenderData.interestRate}%` : undefined,
        maxLtvBuy: lenderData.maxLtvBuy ? `${lenderData.maxLtvBuy}%` : undefined,
        points: lenderData.points ? `${lenderData.points}` : undefined,
        timeToClose: lenderData.timeToClose ? `${lenderData.timeToClose} days` : undefined,
      },
      productName: lenderData.productName,
      loanType: lenderData.loanType,
      referralLink: lenderData.referralLink || null,
      source: (lenderData.referralLink && lenderData.referralLink !== '#' && lenderData.referralLink.startsWith('http')) ? 'referral_link' : 'direct',
    };
    
    // Track the click (fire and forget - don't block the user experience)
    try {
      await apiRequest("POST", "/api/track-apply-click", trackingPayload);
    } catch (error) {
      console.error('Failed to track apply click:', error);
    }
    
    // If referral link exists and is a valid URL (not "#"), open it
    if (lenderData.referralLink && lenderData.referralLink !== '#' && lenderData.referralLink.startsWith('http')) {
      window.open(lenderData.referralLink, '_blank', 'noopener,noreferrer');
      return;
    }
    // Otherwise, open the email contact modal
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
        arv: editArv || formData.arv || 0,
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
    overrideProjectLength?: number,
    overrideArv?: number
  ) => {
    const formData = form.getValues();
    
    const purchasePrice = overridePurchasePrice ?? formData.purchasePrice ?? 0;
    const rehabBudget = overrideRehabBudget ?? formData.rehabBudget ?? 0;
    const projectLength = overrideProjectLength ?? formData.projectLength ?? 6;
    const arv = overrideArv ?? formData.arv ?? 0;
    
    const monthlyInsurance = (formData.annualInsurance || 0) / 12;
    const monthlyUtilities = formData.monthlyUtilities || 0;
    const monthlyPropertyTax = formData.annualTax
      ? (formData.annualTax || 0) / 12
      : ((formData.taxAssessedValue || purchasePrice) * getStateTaxRate(formData.state || '')) / 12;
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
        arv: arv,
        projectLength: projectLength,
        closingCostsBuy: (formData.attorneyFees || 0) + (formData.docPrepFees || 0) + 
                         (formData.titleExam || 0) + (formData.titleInsurance || 0) +
                         (formData.transferFee || 0),
        carryingCosts: totalCarryingCosts,
        sellPrice: formData.sellPrice || arv || 0,
        closingCostsSell: (formData.sellPrice || arv || 0) * 
                          ((formData.closingCostsSellPercent || 2) / 100),
        commission: (formData.sellPrice || arv || 0) * 
                    ((formData.realEstateCommissionPercent || 6) / 100),
        monthlyInsurance: monthlyInsurance,
        monthlyUtilities: monthlyUtilities,
        monthlyPropertyTax: monthlyPropertyTax,
        monthlyHoa: monthlyHoa,
        // Granular Closing Costs (Buy) components — flat dollar amounts
        attorneyFees: formData.attorneyFees || 0,
        titleExam: formData.titleExam || 0,
        titleInsurance: formData.titleInsurance || 0,
        transferFee: formData.transferFee || 0,
        // Granular Carrying Costs components — project-period totals
        insurance: monthlyInsurance * projectLength,
        utilities: monthlyUtilities * projectLength,
        hoaMonthly: monthlyHoa * projectLength,
        taxes: monthlyPropertyTax * projectLength,
        other: hoaTransferFee + otherCarryingCosts,
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
          drawnFundsOnly: formData.drawnFundsOnly || false,
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
      investorProfile: {
        creditScoreRange: formData.creditScore as 'below-600' | '600-649' | '650-699' | '700-749' | '750+' | undefined || undefined,
        isNewInvestor: formData.isNewInvestor,
      },
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

  // CSV Export function
  const generateCSV = () => {
    if (!results) return;
    
    const formData = form.getValues();
    // Apply demo mode transformation to lender columns for CSV export
    const visibleLendersForCSV = getDisplayLenders(results.lenderColumns);
    
    // Build CSV rows
    const rows: string[][] = [];
    
    // Header row
    const headerRow = ['Metric', 'Cash Sale'];
    if (results.userLoanColumn) headerRow.push('Entered Loan');
    visibleLendersForCSV.forEach(lender => {
      headerRow.push(`${lender.lenderName} - ${lender.productName}`);
    });
    rows.push(headerRow);
    
    // Property Info section
    rows.push(['--- PROPERTY INFO ---']);
    rows.push(['Address', formData.address || '']);
    rows.push(['City', formData.city || '']);
    rows.push(['State', formData.state || '']);
    rows.push(['Zip', formData.zipCode || '']);
    rows.push(['']);
    
    // Deal Inputs
    rows.push(['--- DEAL INPUTS ---']);
    rows.push(['Purchase Price', editBuyPrice.toString()]);
    rows.push(['Rehab Budget', editRehab.toString()]);
    rows.push(['Project Length (months)', editProjectLength.toString()]);
    rows.push(['ARV (Est. Sale Price)', editArv.toString()]);
    rows.push(['']);
    
    // Helper to build data row
    const buildRow = (label: string, cashValue: any, userLoanValue: any, lenderValues: any[]) => {
      const row = [label, String(cashValue)];
      if (results.userLoanColumn) row.push(String(userLoanValue));
      lenderValues.forEach(v => row.push(String(v)));
      return row;
    };
    
    // Summary metrics
    rows.push(['--- SUMMARY ---']);
    rows.push(buildRow('Net Profit', 
      results.cashSaleColumn.profit,
      results.userLoanColumn?.profit || '',
      visibleLendersForCSV.map(l => l.profit)
    ));
    rows.push(buildRow('Out-of-Pocket', 
      results.cashSaleColumn.outOfPocketCost,
      results.userLoanColumn?.outOfPocketCost || '',
      visibleLendersForCSV.map(l => l.outOfPocketCost)
    ));
    rows.push(buildRow('Cash-on-Cash ROI %', 
      results.cashSaleColumn.cashOnCashRoi.toFixed(2) + '%',
      results.userLoanColumn ? results.userLoanColumn.cashOnCashRoi.toFixed(2) + '%' : '',
      visibleLendersForCSV.map(l => l.cashOnCashRoi.toFixed(2) + '%')
    ));
    rows.push(buildRow('Annualized ROI %', 
      results.cashSaleColumn.annualizedRoi.toFixed(2) + '%',
      results.userLoanColumn ? results.userLoanColumn.annualizedRoi.toFixed(2) + '%' : '',
      visibleLendersForCSV.map(l => l.annualizedRoi.toFixed(2) + '%')
    ));
    rows.push(['']);
    
    // Loan Terms
    rows.push(['--- LOAN TERMS ---']);
    rows.push(buildRow('Interest Rate %', 
      'N/A',
      results.userLoanColumn?.interestRate ? results.userLoanColumn.interestRate + '%' : '',
      visibleLendersForCSV.map(l => l.interestRate ? l.interestRate + '%' : '')
    ));
    rows.push(buildRow('Points %', 
      'N/A',
      results.userLoanColumn?.points !== undefined ? results.userLoanColumn.points + '%' : '',
      visibleLendersForCSV.map(l => l.points !== undefined ? l.points + '%' : '')
    ));
    rows.push(buildRow('Total Loan Amount', 
      'N/A',
      results.userLoanColumn?.totalLoanAmount || '',
      visibleLendersForCSV.map(l => l.totalLoanAmount || 0)
    ));
    rows.push(buildRow('Max LTV (Buy) %', 
      'N/A',
      results.userLoanColumn?.maxLtvBuy ? results.userLoanColumn.maxLtvBuy + '%' : '',
      visibleLendersForCSV.map(l => l.maxLtvBuy ? l.maxLtvBuy + '%' : '')
    ));
    rows.push(buildRow('Max Loan % (Rehab)', 
      'N/A',
      results.userLoanColumn?.maxLendRehab ? results.userLoanColumn.maxLendRehab + '%' : '',
      visibleLendersForCSV.map(l => l.maxLendRehab ? l.maxLendRehab + '%' : '')
    ));
    rows.push(buildRow('Max ARV %', 
      'N/A',
      results.userLoanColumn?.maxLoanArv ? results.userLoanColumn.maxLoanArv + '%' : '',
      visibleLendersForCSV.map(l => l.maxLoanArv ? l.maxLoanArv + '%' : '')
    ));
    rows.push(buildRow('Max LTC %', 
      'N/A',
      'N/A',
      visibleLendersForCSV.map(l => l.isLtcWeighted && l.maxLtcPercent ? l.maxLtcPercent + '%' : 'N/A')
    ));
    rows.push(['']);
    
    // Out of Pocket Breakdown
    rows.push(['--- OUT-OF-POCKET BREAKDOWN ---']);
    rows.push(buildRow('Down Payment', 
      results.cashSaleColumn.outOfPocketBreakdown?.downPayment || 0,
      results.userLoanColumn?.outOfPocketBreakdown?.downPayment || '',
      visibleLendersForCSV.map(l => l.outOfPocketBreakdown?.downPayment || 0)
    ));
    rows.push(buildRow('Closing Costs (Buy)', 
      results.cashSaleColumn.outOfPocketBreakdown?.totalClosingCostsBuy || 0,
      results.userLoanColumn?.outOfPocketBreakdown?.totalClosingCostsBuy || '',
      visibleLendersForCSV.map(l => l.outOfPocketBreakdown?.totalClosingCostsBuy || 0)
    ));
    rows.push(buildRow('Carrying Costs', 
      results.cashSaleColumn.outOfPocketBreakdown?.carryingCosts || 0,
      results.userLoanColumn?.outOfPocketBreakdown?.carryingCosts || '',
      visibleLendersForCSV.map(l => l.outOfPocketBreakdown?.carryingCosts || 0)
    ));
    rows.push(['']);
    
    // Project Costs
    rows.push(['--- PROJECT COSTS ---']);
    rows.push(buildRow('Purchase Price', 
      results.cashSaleColumn.purchasePrice,
      results.userLoanColumn?.purchasePrice || '',
      visibleLendersForCSV.map(l => l.purchasePrice)
    ));
    rows.push(buildRow('Rehab Budget', 
      results.cashSaleColumn.rehabBudget,
      results.userLoanColumn?.rehabBudget || '',
      visibleLendersForCSV.map(l => l.rehabBudget)
    ));
    rows.push(buildRow('Total Project Cost', 
      results.cashSaleColumn.totalProjectCost,
      results.userLoanColumn?.totalProjectCost || '',
      visibleLendersForCSV.map(l => l.totalProjectCost)
    ));
    rows.push(['']);
    
    // Closing Costs (Buy)
    rows.push(['--- CLOSING COSTS (BUY) ---']);
    rows.push(buildRow('Attorney Fees', formData.attorneyFees || 0, formData.attorneyFees || 0, visibleLendersForCSV.map(() => formData.attorneyFees || 0)));
    rows.push(buildRow('Title Exam', formData.titleExam || 0, formData.titleExam || 0, visibleLendersForCSV.map(() => formData.titleExam || 0)));
    rows.push(buildRow('Title Insurance', formData.titleInsurance || 0, formData.titleInsurance || 0, visibleLendersForCSV.map(() => formData.titleInsurance || 0)));
    rows.push(buildRow('Transfer Fee', formData.transferFee || 0, formData.transferFee || 0, visibleLendersForCSV.map(() => formData.transferFee || 0)));
    rows.push(['']);
    
    // Lender Fees
    rows.push(['--- LENDER FEES ---']);
    rows.push(buildRow('Points Cost', 
      0,
      results.userLoanColumn?.outOfPocketBreakdown?.pointsCost || '',
      visibleLendersForCSV.map(l => l.outOfPocketBreakdown?.pointsCost || 0)
    ));
    rows.push(buildRow('Doc Prep Fee', 
      0,
      results.userLoanColumn?.outOfPocketBreakdown?.docPrepFee || '',
      visibleLendersForCSV.map(l => l.outOfPocketBreakdown?.docPrepFee || 0)
    ));
    rows.push(buildRow('Appraisal Fee', 
      0,
      results.userLoanColumn?.outOfPocketBreakdown?.appraisalCost || '',
      visibleLendersForCSV.map(l => l.outOfPocketBreakdown?.appraisalCost || 0)
    ));
    rows.push(buildRow('Draw Fees', 
      0,
      results.userLoanColumn?.lenderDrawFees || '',
      visibleLendersForCSV.map(l => l.lenderDrawFees || 0)
    ));
    rows.push(['']);
    
    // Carrying Costs
    rows.push(['--- CARRYING COSTS ---']);
    rows.push(buildRow('Interest Payments', 
      0,
      results.userLoanColumn?.interestCost || '',
      visibleLendersForCSV.map(l => l.interestCost || 0)
    ));
    rows.push(buildRow('Carrying Costs Total', 
      results.cashSaleColumn.carryingCosts,
      results.userLoanColumn?.carryingCosts || '',
      visibleLendersForCSV.map(l => l.carryingCosts)
    ));
    rows.push(['']);
    
    // Est Out-of-Pocket & Exit
    rows.push(['--- EST OUT-OF-POCKET & EXIT ---']);
    rows.push(buildRow('Est Out-of-Pocket', 
      results.cashSaleColumn.totalInvestment,
      results.userLoanColumn?.totalInvestment || '',
      visibleLendersForCSV.map(l => l.totalInvestment)
    ));
    rows.push(buildRow('Estimated Sale Price (ARV)', 
      results.cashSaleColumn.sellPrice,
      results.userLoanColumn?.sellPrice || '',
      visibleLendersForCSV.map(l => l.sellPrice)
    ));
    rows.push(buildRow('Rolled Costs (Loan Payoff)', 
      0,
      results.userLoanColumn?.rolledCosts || '',
      visibleLendersForCSV.map(l => l.rolledCosts)
    ));
    rows.push(['']);
    
    // Selling Costs
    rows.push(['--- SELLING COSTS ---']);
    rows.push(buildRow('Real Estate Commission', 
      results.cashSaleColumn.commission,
      results.userLoanColumn?.commission || '',
      visibleLendersForCSV.map(l => l.commission)
    ));
    rows.push(buildRow('Closing Costs (Sell)', 
      results.cashSaleColumn.closingCostsSell,
      results.userLoanColumn?.closingCostsSell || '',
      visibleLendersForCSV.map(l => l.closingCostsSell)
    ));
    
    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `deal-analysis-${formData.address || 'results'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({
      title: "CSV Downloaded",
      description: "Your analysis data has been exported to CSV.",
    });
  };

  // Open PDF column selection dialog before generating PDF
  const openPdfDialog = () => {
    if (!results) return;
    const cols: string[] = ['cash-sale'];
    if (results.userLoanColumn) cols.push('user-loan');
    visibleLenders.forEach((_, i) => cols.push(`lender-${i}`));
    setSelectedPdfColumnIds(cols.slice(0, 4));
    setPdfColumnDialogOpen(true);
  };

  // PDF generation with detailed mode
  const handleDownloadPDF = async (detailed: boolean) => {
    // For authenticated free users (not paid subscribers), check PDF download limits
    if (isAuthenticated && !effectiveIsSubscriber) {
      try {
        await apiRequest('POST', '/api/user/pdf-download');
      } catch (error: any) {
        // Check if the error message contains the PDF limit reached code
        const errorMessage = error?.message || '';
        if (errorMessage.includes('PDF_DOWNLOAD_LIMIT_REACHED')) {
          setShowPdfQuotaModal(true);
          return;
        }
        console.error('PDF limit check error:', error);
        // Continue with download on other errors - don't block the user
      }
    }
    
    // Always expand Loan Terms so it's captured in BOTH Overview and Detailed PDFs
    setShowLoanTerms(true);

    if (detailed) {
      // Expand all sections for detailed PDF
      setShowProjectCosts(true);
      setShowClosingCostsBuy(true);
      setShowLenderFees(true);
      setShowCarryingCosts(true);
      setShowSellingCosts(true);
      setShowOutOfPocketBreakdown(true);
      setShowCashOnCashBreakdown(true);
      setShowAnnualizedBreakdown(true);
      setShowLoanAmountBreakdown(true);
      setShowOopTableBreakdown(true);
    }

    // Wait for React to re-render the expanded sections before capture
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsGeneratingPdf(true);
    // Wait for the condensed-style useEffect + section expansions to apply
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 400)));
    try {
      const opts: any = { useCORS: true, scale: 2, backgroundColor: '#ffffff', logging: false };
      const c1 = await html2canvas(pdfPage1Ref.current!, opts);
      const c2 = await html2canvas(pdfPage2Ref.current!, opts);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;
      // Shared scale across both pages so row heights look identical.
      // Pick the smallest of all four width/height constraints to guarantee both fit.
      const c1w = c1.width / 2, c1h = c1.height / 2;
      const c2w = c2.width / 2, c2h = c2.height / 2;
      const sharedRatio = Math.min(
        availW / c1w, availH / c1h,
        availW / c2w, availH / c2h,
      );
      const place = (cv: HTMLCanvasElement, addPage: boolean) => {
        if (addPage) pdf.addPage();
        const cw = cv.width / 2;
        const ch = cv.height / 2;
        const w = cw * sharedRatio;
        const h = ch * sharedRatio;
        const x = margin + (availW - w) / 2;
        pdf.addImage(cv.toDataURL('image/png', 0.95), 'PNG', x, margin, w, h, undefined, 'FAST');
      };
      place(c1, false);
      place(c2, true);
      pdf.save('loan-comparison-results.pdf');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast({ title: 'PDF generation failed', description: String((err as any)?.message || err), variant: 'destructive' });
    }
    setIsGeneratingPdf(false);
    setSelectedPdfColumnIds([]);
    
    // Always collapse Loan Terms back after PDF generation (it was always expanded above)
    setShowLoanTerms(false);

    if (detailed) {
      // Collapse sections back after PDF generation
      setShowProjectCosts(false);
      setShowClosingCostsBuy(false);
      setShowLenderFees(false);
      setShowCarryingCosts(false);
      setShowSellingCosts(false);
      setShowOutOfPocketBreakdown(false);
      setShowCashOnCashBreakdown(false);
      setShowAnnualizedBreakdown(false);
      setShowLoanAmountBreakdown(false);
      setShowOopTableBreakdown(false);
    }
  };

  // Single-column CSV export
  const generateSingleColumnCSV = (column: LoanComparisonColumn, columnName: string) => {
    if (!results) return;
    const formData = form.getValues();
    const rows: string[][] = [];

    rows.push(['Metric', columnName]);
    rows.push(['--- PROPERTY INFO ---']);
    rows.push(['Address', formData.address || '']);
    rows.push(['City', formData.city || '']);
    rows.push(['State', formData.state || '']);
    rows.push(['Zip', formData.zipCode || '']);
    rows.push(['']);

    rows.push(['--- DEAL INPUTS ---']);
    rows.push(['Purchase Price', String(editBuyPrice)]);
    rows.push(['Rehab Budget', String(editRehab)]);
    rows.push(['Project Length (months)', String(editProjectLength)]);
    rows.push(['ARV (Est. Sale Price)', String(editArv)]);
    rows.push(['']);

    rows.push(['--- SUMMARY ---']);
    rows.push(['Net Profit', String(column.profit)]);
    rows.push(['Out-of-Pocket', String(column.outOfPocketCost)]);
    rows.push(['Cash-on-Cash ROI', column.cashOnCashRoi.toFixed(2) + '%']);
    rows.push(['Annualized ROI', column.annualizedRoi.toFixed(2) + '%']);
    rows.push(['']);

    if (column.interestRate && column.interestRate > 0) {
      rows.push(['--- LOAN TERMS ---']);
      rows.push(['Interest Rate', column.interestRate + '%']);
      rows.push(['Points', column.points !== undefined ? column.points + '%' : '']);
      rows.push(['Total Loan Amount', String(column.totalLoanAmount || '')]);
      if (column.maxLtvBuy) rows.push(['Max LTV (Buy)', column.maxLtvBuy + '%']);
      if (column.maxLendRehab) rows.push(['Max Loan % (Rehab)', column.maxLendRehab + '%']);
      if (column.maxLoanArv) rows.push(['Max ARV %', column.maxLoanArv + '%']);
      rows.push(['']);
    }

    rows.push(['--- COST BREAKDOWN ---']);
    rows.push(['Total Project Cost', String(column.totalProjectCost)]);
    rows.push(['  Purchase Price', String(column.purchasePrice)]);
    rows.push(['  Rehab Budget', String(column.rehabBudget)]);
    rows.push(['Closing Costs (Buy)', String(column.closingCostsBuy)]);
    if (column.outOfPocketBreakdown?.lenderFees) rows.push(['Lender Fees', String(column.outOfPocketBreakdown.lenderFees)]);
    if (column.interestCost) rows.push(['Interest Cost', String(column.interestCost)]);
    rows.push(['Carrying Costs', String(column.carryingCosts)]);
    rows.push(['Selling Costs', String(column.closingCostsSell + column.commission)]);
    rows.push(['']);

    rows.push(['--- OUT-OF-POCKET BREAKDOWN ---']);
    rows.push(['Total Out-of-Pocket', String(column.outOfPocketCost)]);
    if (column.outOfPocketBreakdown) {
      rows.push(['  Down Payment', String(column.outOfPocketBreakdown.downPayment || 0)]);
      rows.push(['  Closing Costs (Buy)', String(column.outOfPocketBreakdown.totalClosingCostsBuy || 0)]);
      rows.push(['  Carrying Costs', String(column.outOfPocketBreakdown.carryingCosts || 0)]);
      if (column.outOfPocketBreakdown.pointsCost) rows.push(['  Points Cost', String(column.outOfPocketBreakdown.pointsCost)]);
    }

    const csvContent = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeName = columnName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    link.setAttribute('download', `deal-analysis-${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CSV Exported', description: `${columnName} data exported to CSV.` });
  };

  // Single-column PDF export
  const handleSingleColumnPDF = async (column: LoanComparisonColumn, columnName: string) => {
    if (isAuthenticated && !effectiveIsSubscriber) {
      try {
        await apiRequest('POST', '/api/user/pdf-download');
      } catch (error: any) {
        const errorMessage = error?.message || '';
        if (errorMessage.includes('PDF_DOWNLOAD_LIMIT_REACHED')) {
          setShowPdfQuotaModal(true);
          return;
        }
        console.error('PDF limit check error:', error);
      }
    }
    setSingleColumnExportData({ column, name: columnName });
    await new Promise(resolve => setTimeout(resolve, 150));
    await toSingleColumnPDF();
    setSingleColumnExportData(null);
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
  
  const monthlyPropertyTax = ((formData.taxAssessedValue || propertyPurchasePrice) * getStateTaxRate(propertyState)) / 12;
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

  // DSCR quota check for free authenticated users — only fires after user actively
  // clicks the Rental/DSCR tab or types a rent value (dscrTabActivated = true)
  useEffect(() => {
    console.log('[DSCR quota check] state snapshot:', { dscrTabActivated, isAuthenticated, isSubscriber, dscrQuotaChecked, dscrQuotaExceeded });
    if (dscrTabActivated && isAuthenticated && !isSubscriber && !dscrQuotaChecked) {
      setDscrQuotaChecked(true);
      const formValues = form.getValues();
      apiRequest("POST", "/api/user/dscr-calc", {
        address: formValues.address || '',
        city: formValues.city || '',
        state: formValues.state || '',
        zip: formValues.zipCode || '',
      })
        .then(r => r.json())
        .then(data => {
          console.log('[DSCR calc API response]', data);
          if (!data.canUse) {
            setDscrQuotaExceeded(true);
          }
        })
        .catch(() => {});
    }
  }, [dscrTabActivated, isAuthenticated, isSubscriber, dscrQuotaChecked]);

  // Fetch DSCR lenders when in rental-dscr mode
  const dscrCreditScore = form.watch('creditScore');
  const dscrIsNewInvestor = form.watch('isNewInvestor');
  const { data: dscrLenders, isLoading: isLoadingDscrLenders } = useQuery<DSCRLender[]>({
    queryKey: ['/api/dscr-lenders', propertyState, dscrCreditScore, dscrIsNewInvestor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (propertyState) params.set('state', propertyState);
      if (dscrCreditScore) params.set('creditScoreRange', dscrCreditScore);
      if (dscrIsNewInvestor !== undefined) params.set('isNewInvestor', String(dscrIsNewInvestor));
      const query = params.toString();
      const url = query ? `/api/dscr-lenders?${query}` : '/api/dscr-lenders';
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

  // Apply demo mode transformation to DSCR products for display
  const displayDscrProducts = getDisplayDscrLenders(dscrProductsWithCalculations);

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

  // For manual-entry free users, hide lender columns (automated-lookup free users get full results)
  // Apply demo mode transformation to lender columns before slicing for visibility
  const displayLenderColumns = getDisplayLenders(results.lenderColumns);
  const visibleLenders = showFullResults ? displayLenderColumns.slice(0, visibleLenderCount) : [];
  const hasMoreLenders = showFullResults && visibleLenderCount < results.lenderColumns.length;

  // PDF column filtering - only active during PDF generation when user has made a selection
  const pdfHideCash = isGeneratingPdf && selectedPdfColumnIds.length > 0 && !selectedPdfColumnIds.includes('cash-sale');
  const pdfHideUserLoan = isGeneratingPdf && !!results.userLoanColumn && selectedPdfColumnIds.length > 0 && !selectedPdfColumnIds.includes('user-loan');
  const pdfLenders = isGeneratingPdf && selectedPdfColumnIds.length > 0
    ? visibleLenders.filter((_, i) => selectedPdfColumnIds.includes(`lender-${i}`))
    : visibleLenders;

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
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between sm:flex-wrap gap-2">
        <div className="flex gap-2 w-full sm:w-auto">
          {isViewingDeal ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="flex-1 sm:flex-initial min-h-11 sm:min-h-9"
                data-testid="button-back-to-deals"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {onEditDeal && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEditDeal}
                  className="flex-1 sm:flex-initial min-h-11 sm:min-h-9"
                  data-testid="button-edit-deal"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Deal
                </Button>
              )}
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="flex-1 sm:flex-initial min-h-11 sm:min-h-9"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={generateCSV}
            className="flex-1 sm:flex-initial min-h-11 sm:min-h-8"
            data-testid="button-download-csv"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          
          {isAuthenticated || effectiveIsSubscriber ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingPdf}
                  className="flex-1 sm:flex-initial min-h-11 sm:min-h-8"
                  data-testid="button-download-pdf"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openPdfDialog()} data-testid="pdf-overview">
                  <FileText className="h-4 w-4 mr-2" />
                  Overview (Summary)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openPdfDialog()} data-testid="pdf-detailed">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Detailed (All Expanded)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/pricing" className="flex-1 sm:flex-initial">
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground w-full sm:w-auto min-h-11 sm:min-h-8"
                data-testid="button-upgrade-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                Upgrade for PDF
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Auto-save status banner */}
      {isAuthenticated && dealSaved && !isGeneratingPdf && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-green-700 dark:text-green-400">
              Analysis Automatically Saved
            </span>
            <Link href="/portal/deals">
              <Button
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                data-testid="button-view-saved-deals"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                View Saved Deals
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Demo access banner */}
      {hasDemoToken && !isGeneratingPdf && (
        <Alert className="border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20 dark:border-cyan-900">
          <AlertDescription className="text-cyan-700 dark:text-cyan-400">
            You're viewing this with demo access. Lender information is anonymized.{" "}
            <Link href="/pricing" className="font-medium underline" data-testid="link-demo-signup">
              Create an account
            </Link>{" "}
            to get started with real lender data.
          </AlertDescription>
        </Alert>
      )}

      {/* Prompt for non-authenticated users */}
      {!isAuthenticated && !hasDemoToken && !isGeneratingPdf && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            <Link href="/pricing" className="font-medium underline" data-testid="link-signup-to-save">
              Create an account
            </Link>{" "}
            to save your analyses and access them from your dashboard.
          </AlertDescription>
        </Alert>
      )}

      {/* Analysis Type Toggle */}
      <Tabs value={analysisMode} onValueChange={(value) => { setAnalysisMode(value as 'fix-and-flip' | 'rental-dscr'); if (value === 'rental-dscr') setDscrTabActivated(true); }} className="w-full">
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
              <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-5 gap-3 items-end">
                <div className="space-y-1">
                  <Label htmlFor="edit-buy-price" className="text-xs sm:text-sm">Buy Price</Label>
                  <Input
                    id="edit-buy-price"
                    type="number"
                    step="any"
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
                  <Label htmlFor="edit-rehab" className="text-xs sm:text-sm">Rehab</Label>
                  <Input
                    id="edit-rehab"
                    type="number"
                    step="any"
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
                  <Label htmlFor="edit-project-length" className="text-xs sm:text-sm whitespace-nowrap">Project (mo.)</Label>
                  <Input
                    id="edit-project-length"
                    type="number"
                    step="any"
                    value={editProjectLength || ''}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed)) setEditProjectLength(parsed);
                      else if (e.target.value === '') setEditProjectLength(6);
                    }}
                    data-testid="input-edit-project-length"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-arv" className="text-xs sm:text-sm whitespace-nowrap">ARV (Sale)</Label>
                  <Input
                    id="edit-arv"
                    type="number"
                    step="any"
                    value={editArv || ''}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed)) setEditArv(parsed);
                      else if (e.target.value === '') setEditArv(0);
                    }}
                    data-testid="input-edit-arv"
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

          {/* Outer wrapper kept for layout; PDF capture now uses pdfPage1Ref + pdfPage2Ref */}
          <div>

          {/* Usage counter for free authenticated users — shows near lender results */}
          {isAuthenticated && !effectiveIsSubscriber && results && !isGeneratingPdf && (
            <p className="text-sm text-muted-foreground text-right" data-testid="text-loan-analysis-counter">
              {usageData?.loanAnalysisCount ?? (results.code === 'LOAN_ANALYSIS_QUOTA_EXCEEDED' ? 2 : 0)} of 2 analyses used this month
            </p>
          )}

          {/* Upgrade CTA — for non-subscribers without lender columns */}
          {!showFullResults && !isGeneratingPdf && (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <Sparkles className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                      {isAuthenticated && !effectiveIsSubscriber ? (
                        <>
                          <h3 className="font-semibold text-lg">You've used your 2 analyses for the month.</h3>
                          <p className="text-sm text-muted-foreground">
                            Upgrade for unlimited loan comparisons and lender referrals.
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold text-lg">Upgrade for Loan Referrals</h3>
                          <p className="text-sm text-muted-foreground">
                            Compare multiple lender options and get connected with lenders who can fund your deals.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <Link href="/pricing">
                    <Button data-testid="button-upgrade-loan-referrals">
                      Upgrade Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <div ref={pdfPage1Ref} className="pdf-page1">
            {/* Company Header for PDF */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
              {/* Left side: user branding if set, otherwise RE Data Metrix */}
              {user?.reportLogoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={user.reportLogoUrl} alt={user.reportCompanyName || "Company logo"} className="h-12 w-auto object-contain max-w-[120px]" />
                  {user.reportCompanyName && (
                    <div className="font-bold text-lg">{user.reportCompanyName}</div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  <img src={logoImg} alt="RE Data Metrix" className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-lg text-primary whitespace-nowrap">RE Data Metrix</div>
                    <div className="text-xs text-muted-foreground italic whitespace-nowrap">Turning Terms into Returns</div>
                  </div>
                </div>
              )}
              {/* Right side: RE Data Metrix branding */}
              <div className="flex items-center gap-2 text-right text-sm text-muted-foreground">
                {user?.reportLogoUrl && (
                  <img src={logoImg} alt="RE Data Metrix" className="h-8 w-8 opacity-70" />
                )}
                <div>
                  <div className={`font-medium ${user?.reportLogoUrl ? 'text-xs text-primary/70' : ''}`}>
                    {user?.reportLogoUrl ? 'RE Data Metrix' : 'www.redatametrix.com'}
                  </div>
                  {user?.reportLogoUrl && (
                    <div className="text-xs italic">Turning Terms into Returns</div>
                  )}
                  {user?.reportLogoUrl && (
                    <div className="text-xs">www.redatametrix.com</div>
                  )}
                  <div className="text-xs">Deal Analysis Report</div>
                </div>
              </div>
            </div>
            <CardHeader>
              <CardTitle>Loan Comparison Results</CardTitle>
            </CardHeader>
            <CardContent className="pb-0">
              {/* Summary Metrics - styled to match detailed table */}
              {results && (
                <div className="overflow-x-auto mb-6">
                  <Table className={`min-w-full${pdfHideCash ? ' pdf-hide-col2' : ''}${pdfHideUserLoan ? ' pdf-hide-col3' : ''}`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">Summary</TableHead>
                        <TableHead className="text-center min-w-[100px]">Cash Sale</TableHead>
                        {results.userLoanColumn && (
                          <TableHead className="text-center min-w-[100px]">Entered Loan</TableHead>
                        )}
                        {pdfLenders.map((lender, index) => (
                          <TableHead key={index} className="text-center min-w-[140px] text-xs">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-semibold">{lender.lenderName || `Lender ${index + 1}`}</span>
                              {lender.productName && (
                                <span className="text-muted-foreground font-normal">{lender.productName}</span>
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
                        {pdfLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center font-bold text-green-600">
                            {formatCurrency(lender.profit)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {/* Out-of-Pocket - Expandable */}
                      <TableRow
                        className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => setShowOutOfPocketBreakdown(!showOutOfPocketBreakdown)}
                        data-testid="summary-row-oop"
                      >
                        <TableCell className="font-semibold flex items-center gap-2">
                          {showOutOfPocketBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Out-of-Pocket
                        </TableCell>
                        <TableCell className="text-center text-sm" data-testid="summary-oop-cash">
                          {formatCurrency((results.cashSaleColumn.outOfPocketBreakdown?.downPayment || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.titleExam || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.transferFee || 0) +
                        (!results.cashSaleColumn.outOfPocketBreakdown?.pointsDeferred ? (results.cashSaleColumn.outOfPocketBreakdown?.totalPointsCost || results.cashSaleColumn.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.appraisalCost || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.docPrepFee || 0) +
                        (results.cashSaleColumn.lenderDrawFees || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.insurance || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.utilities || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.other || 0))}
                        </TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center text-sm" data-testid="summary-oop-loan">
                            {formatCurrency((results.userLoanColumn.outOfPocketBreakdown?.downPayment || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleExam || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.transferFee || 0) +
                        (!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred ? (results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost || results.userLoanColumn.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.appraisalCost || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.docPrepFee || 0) +
                        (results.userLoanColumn.lenderDrawFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.insurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.utilities || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.other || 0))}
                          </TableCell>
                        )}
                        {pdfLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center text-sm">
                            {formatCurrency((lender.outOfPocketBreakdown?.downPayment || 0) +
                        (lender.outOfPocketBreakdown?.attorneyFees || 0) +
                        (lender.outOfPocketBreakdown?.titleExam || 0) +
                        (lender.outOfPocketBreakdown?.titleInsurance || 0) +
                        (lender.outOfPocketBreakdown?.transferFee || 0) +
                        (!lender.outOfPocketBreakdown?.pointsDeferred ? (lender.outOfPocketBreakdown?.totalPointsCost || lender.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (lender.outOfPocketBreakdown?.appraisalCost || 0) +
                        (lender.outOfPocketBreakdown?.docPrepFee || 0) +
                        (lender.lenderDrawFees || 0) +
                        (lender.outOfPocketBreakdown?.insurance || 0) +
                        (lender.outOfPocketBreakdown?.utilities || 0) +
                        (lender.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (lender.outOfPocketBreakdown?.other || 0))}
                          </TableCell>
                        ))}
                      </TableRow>
                      {showOutOfPocketBreakdown && (
                        <>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Down Payment</TableCell>
                            <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.outOfPocketBreakdown?.downPayment || results.cashSaleColumn.totalProjectCost)}</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.downPayment || 0)}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{formatCurrency(lender.outOfPocketBreakdown?.downPayment || 0)}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Closing Costs (Buy)</TableCell>
                            <TableCell className="text-center">{formatCurrency(
                            (results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                            (results.cashSaleColumn.outOfPocketBreakdown?.titleExam || 0) +
                            (results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                            (results.cashSaleColumn.outOfPocketBreakdown?.transferFee || 0)
                          )}</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{formatCurrency(
                            (results.userLoanColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.titleExam || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.transferFee || 0)
                          )}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{formatCurrency(
                            (lender.outOfPocketBreakdown?.attorneyFees || 0) +
                            (lender.outOfPocketBreakdown?.titleExam || 0) +
                            (lender.outOfPocketBreakdown?.titleInsurance || 0) +
                            (lender.outOfPocketBreakdown?.transferFee || 0)
                          )}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Carrying Costs</TableCell>
                            <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.outOfPocketBreakdown?.carryingCosts || results.cashSaleColumn.carryingCosts)}</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.carryingCosts || results.userLoanColumn.carryingCosts)}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{formatCurrency(lender.outOfPocketBreakdown?.carryingCosts || lender.carryingCosts)}</TableCell>
                            ))}
                          </TableRow>
                        </>
                      )}
                      {/* Cash-on-Cash - Expandable */}
                      <TableRow
                        className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => setShowCashOnCashBreakdown(!showCashOnCashBreakdown)}
                        data-testid="summary-row-coc"
                      >
                        <TableCell className="font-semibold flex items-center gap-2">
                          {showCashOnCashBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Cash-on-Cash
                        </TableCell>
                        <TableCell className="text-center text-sm font-bold text-primary" data-testid="summary-coc-cash">
                          {formatPercent(results.cashSaleColumn.profit/((results.cashSaleColumn.outOfPocketBreakdown?.downPayment||0)+(results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleExam||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.transferFee||0)+(results.cashSaleColumn.outOfPocketBreakdown?.insurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.utilities||0)+(results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.cashSaleColumn.outOfPocketBreakdown?.other||0))*100)}
                        </TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center text-sm font-bold text-primary" data-testid="summary-coc-loan">
                            {formatPercent(results.userLoanColumn.profit/((results.userLoanColumn.outOfPocketBreakdown?.downPayment||0)+(results.userLoanColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleExam||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.transferFee||0)+(!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred?(results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost||results.userLoanColumn.outOfPocketBreakdown?.pointsCost||0):0)+(results.userLoanColumn.outOfPocketBreakdown?.appraisalCost||0)+(results.userLoanColumn.outOfPocketBreakdown?.docPrepFee||0)+(results.userLoanColumn.lenderDrawFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.insurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.utilities||0)+(results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.userLoanColumn.outOfPocketBreakdown?.other||0))*100)}
                          </TableCell>
                        )}
                        {pdfLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center text-sm font-bold text-primary">
                            {formatPercent(lender.profit/((lender.outOfPocketBreakdown?.downPayment||0)+(lender.outOfPocketBreakdown?.attorneyFees||0)+(lender.outOfPocketBreakdown?.titleExam||0)+(lender.outOfPocketBreakdown?.titleInsurance||0)+(lender.outOfPocketBreakdown?.transferFee||0)+(!lender.outOfPocketBreakdown?.pointsDeferred?(lender.outOfPocketBreakdown?.totalPointsCost||lender.outOfPocketBreakdown?.pointsCost||0):0)+(lender.outOfPocketBreakdown?.appraisalCost||0)+(lender.outOfPocketBreakdown?.docPrepFee||0)+(lender.lenderDrawFees||0)+(lender.outOfPocketBreakdown?.insurance||0)+(lender.outOfPocketBreakdown?.utilities||0)+(lender.outOfPocketBreakdown?.hoaMonthly||0)+(lender.outOfPocketBreakdown?.other||0))*100)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {showCashOnCashBreakdown && (
                        <TableRow>
                          <TableCell className="font-medium pl-8 italic text-muted-foreground">
                            Formula: Net Profit ÷ Out-of-Pocket × 100
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {formatCurrency(results.cashSaleColumn.profit)} ÷ {formatCurrency((results.cashSaleColumn.outOfPocketBreakdown?.downPayment || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.titleExam || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.transferFee || 0) +
                        (!results.cashSaleColumn.outOfPocketBreakdown?.pointsDeferred ? (results.cashSaleColumn.outOfPocketBreakdown?.totalPointsCost || results.cashSaleColumn.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.appraisalCost || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.docPrepFee || 0) +
                        (results.cashSaleColumn.lenderDrawFees || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.insurance || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.utilities || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (results.cashSaleColumn.outOfPocketBreakdown?.other || 0))}
                          </TableCell>
                          {results.userLoanColumn && (
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {formatCurrency(results.userLoanColumn.profit)} ÷ {formatCurrency((results.userLoanColumn.outOfPocketBreakdown?.downPayment || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleExam || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.transferFee || 0) +
                        (!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred ? (results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost || results.userLoanColumn.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.appraisalCost || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.docPrepFee || 0) +
                        (results.userLoanColumn.lenderDrawFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.insurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.utilities || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.other || 0))}
                            </TableCell>
                          )}
                          {pdfLenders.map((lender, index) => (
                            <TableCell key={index} className="text-center text-xs text-muted-foreground">
                              {formatCurrency(lender.profit)} ÷ {formatCurrency((lender.outOfPocketBreakdown?.downPayment || 0) +
                        (lender.outOfPocketBreakdown?.attorneyFees || 0) +
                        (lender.outOfPocketBreakdown?.titleExam || 0) +
                        (lender.outOfPocketBreakdown?.titleInsurance || 0) +
                        (lender.outOfPocketBreakdown?.transferFee || 0) +
                        (!lender.outOfPocketBreakdown?.pointsDeferred ? (lender.outOfPocketBreakdown?.totalPointsCost || lender.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (lender.outOfPocketBreakdown?.appraisalCost || 0) +
                        (lender.outOfPocketBreakdown?.docPrepFee || 0) +
                        (lender.lenderDrawFees || 0) +
                        (lender.outOfPocketBreakdown?.insurance || 0) +
                        (lender.outOfPocketBreakdown?.utilities || 0) +
                        (lender.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (lender.outOfPocketBreakdown?.other || 0))}
                            </TableCell>
                          ))}
                        </TableRow>
                      )}
                      {/* Annualized - Expandable */}
                      <TableRow
                        className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => setShowAnnualizedBreakdown(!showAnnualizedBreakdown)}
                        data-testid="summary-row-annualized"
                      >
                        <TableCell className="font-semibold flex items-center gap-2">
                          {showAnnualizedBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Annualized
                        </TableCell>
                        <TableCell className="text-center text-sm font-bold text-primary" data-testid="summary-annual-cash">
                          {formatPercent(results.cashSaleColumn.profit/((results.cashSaleColumn.outOfPocketBreakdown?.downPayment||0)+(results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleExam||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.transferFee||0)+(results.cashSaleColumn.outOfPocketBreakdown?.insurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.utilities||0)+(results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.cashSaleColumn.outOfPocketBreakdown?.other||0))*(12/(results.cashSaleColumn.totalHoldMonths||formData.projectLength||6))*100)}
                        </TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center text-sm font-bold text-primary" data-testid="summary-annual-loan">
                            {formatPercent(results.userLoanColumn.profit/((results.userLoanColumn.outOfPocketBreakdown?.downPayment||0)+(results.userLoanColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleExam||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.transferFee||0)+(!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred?(results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost||results.userLoanColumn.outOfPocketBreakdown?.pointsCost||0):0)+(results.userLoanColumn.outOfPocketBreakdown?.appraisalCost||0)+(results.userLoanColumn.outOfPocketBreakdown?.docPrepFee||0)+(results.userLoanColumn.lenderDrawFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.insurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.utilities||0)+(results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.userLoanColumn.outOfPocketBreakdown?.other||0))*(12/(results.userLoanColumn.totalHoldMonths||formData.projectLength||6))*100)}
                          </TableCell>
                        )}
                        {pdfLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center text-sm font-bold text-primary">
                            {formatPercent(lender.profit/((lender.outOfPocketBreakdown?.downPayment||0)+(lender.outOfPocketBreakdown?.attorneyFees||0)+(lender.outOfPocketBreakdown?.titleExam||0)+(lender.outOfPocketBreakdown?.titleInsurance||0)+(lender.outOfPocketBreakdown?.transferFee||0)+(!lender.outOfPocketBreakdown?.pointsDeferred?(lender.outOfPocketBreakdown?.totalPointsCost||lender.outOfPocketBreakdown?.pointsCost||0):0)+(lender.outOfPocketBreakdown?.appraisalCost||0)+(lender.outOfPocketBreakdown?.docPrepFee||0)+(lender.lenderDrawFees||0)+(lender.outOfPocketBreakdown?.insurance||0)+(lender.outOfPocketBreakdown?.utilities||0)+(lender.outOfPocketBreakdown?.hoaMonthly||0)+(lender.outOfPocketBreakdown?.other||0))*(12/(lender.totalHoldMonths||formData.projectLength||6))*100)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {showAnnualizedBreakdown && (
                        <TableRow>
                          <TableCell className="font-medium pl-8 italic text-muted-foreground">
                            Formula: Cash-on-Cash × (12 ÷ Hold Months)
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {formatPercent(results.cashSaleColumn.profit/((results.cashSaleColumn.outOfPocketBreakdown?.downPayment||0)+(results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleExam||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.transferFee||0)+(results.cashSaleColumn.outOfPocketBreakdown?.insurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.utilities||0)+(results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.cashSaleColumn.outOfPocketBreakdown?.other||0))*100)} × (12 ÷ {results.cashSaleColumn.totalHoldMonths || formData.projectLength || 6})
                          </TableCell>
                          {results.userLoanColumn && (
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {formatPercent(results.userLoanColumn.profit/((results.userLoanColumn.outOfPocketBreakdown?.downPayment||0)+(results.userLoanColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleExam||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.transferFee||0)+(!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred?(results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost||results.userLoanColumn.outOfPocketBreakdown?.pointsCost||0):0)+(results.userLoanColumn.outOfPocketBreakdown?.appraisalCost||0)+(results.userLoanColumn.outOfPocketBreakdown?.docPrepFee||0)+(results.userLoanColumn.lenderDrawFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.insurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.utilities||0)+(results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.userLoanColumn.outOfPocketBreakdown?.other||0))*100)} × (12 ÷ {results.userLoanColumn.totalHoldMonths || formData.projectLength || 6})
                            </TableCell>
                          )}
                          {pdfLenders.map((lender, index) => (
                            <TableCell key={index} className="text-center text-xs text-muted-foreground">
                              {formatPercent(lender.profit/((lender.outOfPocketBreakdown?.downPayment||0)+(lender.outOfPocketBreakdown?.attorneyFees||0)+(lender.outOfPocketBreakdown?.titleExam||0)+(lender.outOfPocketBreakdown?.titleInsurance||0)+(lender.outOfPocketBreakdown?.transferFee||0)+(!lender.outOfPocketBreakdown?.pointsDeferred?(lender.outOfPocketBreakdown?.totalPointsCost||lender.outOfPocketBreakdown?.pointsCost||0):0)+(lender.outOfPocketBreakdown?.appraisalCost||0)+(lender.outOfPocketBreakdown?.docPrepFee||0)+(lender.lenderDrawFees||0)+(lender.outOfPocketBreakdown?.insurance||0)+(lender.outOfPocketBreakdown?.utilities||0)+(lender.outOfPocketBreakdown?.hoaMonthly||0)+(lender.outOfPocketBreakdown?.other||0))*100)} × (12 ÷ {lender.totalHoldMonths || formData.projectLength || 6})
                            </TableCell>
                          ))}
                        </TableRow>
                      )}
                      {/* Total Loan Amount - Expandable */}
                      <TableRow
                        className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => setShowLoanAmountBreakdown(!showLoanAmountBreakdown)}
                        data-testid="summary-row-loan-amount"
                      >
                        <TableCell className="font-semibold flex items-center gap-2">
                          {showLoanAmountBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Total Loan Amount
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">—</TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center text-sm">{results.userLoanColumn.totalLoanAmount ? formatCurrency(results.userLoanColumn.totalLoanAmount) : '—'}</TableCell>
                        )}
                        {pdfLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center text-sm">{lender.totalLoanAmount ? formatCurrency(lender.totalLoanAmount) : '—'}</TableCell>
                        ))}
                      </TableRow>
                      {showLoanAmountBreakdown && (
                        <>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Purchase Loan</TableCell>
                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{formatCurrency(results.userLoanColumn.purchaseLoanAmount ?? 0)}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{formatCurrency(lender.purchaseLoanAmount ?? 0)}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Rehab Loan</TableCell>
                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{formatCurrency(results.userLoanColumn.rehabLoanAmount ?? 0)}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{formatCurrency(lender.rehabLoanAmount ?? 0)}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Down Payment</TableCell>
                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.downPayment ?? 0)}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{formatCurrency(lender.outOfPocketBreakdown?.downPayment ?? 0)}</TableCell>
                            ))}
                          </TableRow>
                        </>
                      )}
                      {/* Loan Terms - Expandable */}
                      <TableRow
                        className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                        onClick={() => setShowLoanTerms(!showLoanTerms)}
                        data-testid="summary-row-loan-terms"
                      >
                        <TableCell className="font-semibold flex items-center gap-2">
                          {showLoanTerms ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Loan Terms
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">—</TableCell>
                        {results.userLoanColumn && (
                          <TableCell className="text-center text-sm">
                            {results.userLoanColumn.interestRate ? `${results.userLoanColumn.interestRate}%` : '—'}
                          </TableCell>
                        )}
                        {pdfLenders.map((lender, index) => (
                          <TableCell key={index} className="text-center text-sm">
                            {lender.interestRate ? `${lender.interestRate}%` : '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                      {showLoanTerms && (
                        <>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Interest Rate</TableCell>
                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{results.userLoanColumn.interestRate ? `${results.userLoanColumn.interestRate}%` : '—'}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{lender.interestRate ? `${lender.interestRate}%` : '—'}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Points</TableCell>
                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{results.userLoanColumn.points !== undefined ? `${results.userLoanColumn.points}%` : '—'}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{lender.points !== undefined ? `${lender.points}%` : '—'}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Max LTV (Buy)</TableCell>
                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{results.userLoanColumn.maxLtvBuy ? `${results.userLoanColumn.maxLtvBuy}%` : '—'}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{lender.maxLtvBuy ? `${lender.maxLtvBuy}%` : '—'}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Max Loan % (Rehab)</TableCell>
                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{results.userLoanColumn.maxLendRehab ? `${results.userLoanColumn.maxLendRehab}%` : '—'}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{lender.maxLendRehab ? `${lender.maxLendRehab}%` : '—'}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium pl-8">Max ARV %</TableCell>
                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                            {results.userLoanColumn && (
                              <TableCell className="text-center">{results.userLoanColumn.maxLoanArv ? `${results.userLoanColumn.maxLoanArv}%` : '—'}</TableCell>
                            )}
                            {pdfLenders.map((lender, index) => (
                              <TableCell key={index} className="text-center">{lender.maxLoanArv ? `${lender.maxLoanArv}%` : '—'}</TableCell>
                            ))}
                          </TableRow>
                          {pdfLenders.some(l => l.isLtcWeighted && l.maxLtcPercent) && (
                            <TableRow>
                              <TableCell className="font-medium pl-8">Max LTC %</TableCell>
                              <TableCell className="text-center text-muted-foreground">—</TableCell>
                              {results.userLoanColumn && (
                                <TableCell className="text-center">—</TableCell>
                              )}
                              {pdfLenders.map((lender, index) => (
                                <TableCell key={index} className="text-center">
                                  {lender.isLtcWeighted && lender.maxLtcPercent ? `${lender.maxLtcPercent}%` : '—'}
                                </TableCell>
                              ))}
                            </TableRow>
                          )}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            </div>
            <CardContent className="pt-0">
              {/* Mobile Card View - visible only on small screens */}
              <div className="lg:hidden space-y-4">
                {/* Mobile-only: Show/Hide Cash Sale toggle (Cash Sale always visible on sm+) */}
                {!pdfHideCash && !isGeneratingPdf && (
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:hidden w-full min-h-11"
                    onClick={() => setShowCashSale(!showCashSale)}
                    data-testid="button-toggle-cash-sale-mobile"
                  >
                    {showCashSale ? 'Hide Cash Sale' : 'Show Cash Sale'}
                  </Button>
                )}
                {/* Cash Sale Card — hidden by default on mobile, always shown on sm+ */}
                {!pdfHideCash && <div className={`${showCashSale || isGeneratingPdf ? '' : 'hidden sm:block'} border rounded-lg p-4 bg-card`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Cash Sale</h3>
                    {!isGeneratingPdf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid="button-export-mobile-cashsale">
                            <Download className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => generateSingleColumnCSV(results.cashSaleColumn, 'Cash Sale')}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSingleColumnPDF(results.cashSaleColumn, 'Cash Sale')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Export PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Net Profit</span>
                      <span className={`font-bold ${results.cashSaleColumn.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(results.cashSaleColumn.profit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Out-of-Pocket</span>
                      <span className="font-semibold">{formatCurrency(
                      (results.cashSaleColumn.outOfPocketBreakdown?.downPayment || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.titleExam || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.transferFee || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.insurance || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.utilities || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.other || 0)
                    )}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Cash-on-Cash ROI</span>
                      <span className="font-semibold">{(results.cashSaleColumn.profit/((results.cashSaleColumn.outOfPocketBreakdown?.downPayment||0)+(results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleExam||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.transferFee||0)+(results.cashSaleColumn.outOfPocketBreakdown?.insurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.utilities||0)+(results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.cashSaleColumn.outOfPocketBreakdown?.other||0))*100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Annualized ROI</span>
                      <span className="font-semibold">{(results.cashSaleColumn.profit/((results.cashSaleColumn.outOfPocketBreakdown?.downPayment||0)+(results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleExam||0)+(results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.transferFee||0)+(results.cashSaleColumn.outOfPocketBreakdown?.insurance||0)+(results.cashSaleColumn.outOfPocketBreakdown?.utilities||0)+(results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.cashSaleColumn.outOfPocketBreakdown?.other||0))*(12/(results.cashSaleColumn.totalHoldMonths||formData.projectLength||6))*100).toFixed(1)}%</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Project Cost</span>
                        <span>{formatCurrency(results.cashSaleColumn.totalProjectCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Closing Costs</span>
                        <span>{formatCurrency(
                      (results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.titleExam || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.transferFee || 0)
                    )}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Carrying Costs</span>
                        <span>{formatCurrency(results.cashSaleColumn.carryingCosts)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Selling Costs</span>
                        <span>{formatCurrency(results.cashSaleColumn.closingCostsSell + results.cashSaleColumn.commission)}</span>
                      </div>
                    </div>
                  </div>
                </div>}

                {/* Entered Loan Card */}
                {results.userLoanColumn && !pdfHideUserLoan && (
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">Entered Loan</h3>
                      {!isGeneratingPdf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid="button-export-mobile-enteredloan">
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => generateSingleColumnCSV(results.userLoanColumn!, 'Entered Loan')}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSingleColumnPDF(results.userLoanColumn!, 'Entered Loan')}>
                              <FileText className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Net Profit</span>
                        <span className={`font-bold ${results.userLoanColumn.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(results.userLoanColumn.profit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Out-of-Pocket</span>
                        <span className="font-semibold">{formatCurrency(
                        (results.userLoanColumn.outOfPocketBreakdown?.downPayment || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleExam || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.transferFee || 0) +
                        (!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred ? (results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost || results.userLoanColumn.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.appraisalCost || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.docPrepFee || 0) +
                        (results.userLoanColumn.lenderDrawFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.insurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.utilities || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.other || 0)
                      )}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Cash-on-Cash ROI</span>
                        <span className="font-semibold">{(results.userLoanColumn.profit/((results.userLoanColumn.outOfPocketBreakdown?.downPayment||0)+(results.userLoanColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleExam||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.transferFee||0)+(!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred?(results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost||results.userLoanColumn.outOfPocketBreakdown?.pointsCost||0):0)+(results.userLoanColumn.outOfPocketBreakdown?.appraisalCost||0)+(results.userLoanColumn.outOfPocketBreakdown?.docPrepFee||0)+(results.userLoanColumn.lenderDrawFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.insurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.utilities||0)+(results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.userLoanColumn.outOfPocketBreakdown?.other||0))*100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Annualized ROI</span>
                        <span className="font-semibold">{(results.userLoanColumn.profit/((results.userLoanColumn.outOfPocketBreakdown?.downPayment||0)+(results.userLoanColumn.outOfPocketBreakdown?.attorneyFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleExam||0)+(results.userLoanColumn.outOfPocketBreakdown?.titleInsurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.transferFee||0)+(!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred?(results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost||results.userLoanColumn.outOfPocketBreakdown?.pointsCost||0):0)+(results.userLoanColumn.outOfPocketBreakdown?.appraisalCost||0)+(results.userLoanColumn.outOfPocketBreakdown?.docPrepFee||0)+(results.userLoanColumn.lenderDrawFees||0)+(results.userLoanColumn.outOfPocketBreakdown?.insurance||0)+(results.userLoanColumn.outOfPocketBreakdown?.utilities||0)+(results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly||0)+(results.userLoanColumn.outOfPocketBreakdown?.other||0))*(12/(results.userLoanColumn.totalHoldMonths||formData.projectLength||6))*100).toFixed(1)}%</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Project Cost</span>
                          <span>{formatCurrency(results.userLoanColumn.totalProjectCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Closing + Lender Fees</span>
                          <span>{formatCurrency(
                          (results.userLoanColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                          (results.userLoanColumn.outOfPocketBreakdown?.titleExam || 0) +
                          (results.userLoanColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                          (results.userLoanColumn.outOfPocketBreakdown?.transferFee || 0)
                        )}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Carrying Costs</span>
                          <span>{formatCurrency(results.userLoanColumn.carryingCosts)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lender Cards — first 2 always shown on mobile; rest hidden until "Show more loans" */}
                {pdfLenders.map((lender, index) => (
                  <div
                    key={index}
                    className={`${index < 2 || showAllLoansMobile || isGeneratingPdf ? '' : 'hidden sm:block'} border rounded-lg p-4 bg-card`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{lender.lenderName}</h3>
                        {lender.productName && (
                          <p className="text-sm text-muted-foreground">{lender.productName}</p>
                        )}
                      </div>
                      {!isGeneratingPdf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-export-mobile-lender-${index}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => generateSingleColumnCSV(lender, lender.lenderName || `Lender ${index + 1}`)}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSingleColumnPDF(lender, lender.lenderName || `Lender ${index + 1}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Net Profit</span>
                        <span className={`font-bold ${lender.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(lender.profit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Out-of-Pocket</span>
                        <span className="font-semibold">{formatCurrency(
                        (lender.outOfPocketBreakdown?.downPayment || 0) +
                        (lender.outOfPocketBreakdown?.attorneyFees || 0) +
                        (lender.outOfPocketBreakdown?.titleExam || 0) +
                        (lender.outOfPocketBreakdown?.titleInsurance || 0) +
                        (lender.outOfPocketBreakdown?.transferFee || 0) +
                        (!lender.outOfPocketBreakdown?.pointsDeferred ? (lender.outOfPocketBreakdown?.totalPointsCost || lender.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (lender.outOfPocketBreakdown?.appraisalCost || 0) +
                        (lender.outOfPocketBreakdown?.docPrepFee || 0) +
                        (lender.lenderDrawFees || 0) +
                        (lender.outOfPocketBreakdown?.insurance || 0) +
                        (lender.outOfPocketBreakdown?.utilities || 0) +
                        (lender.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (lender.outOfPocketBreakdown?.other || 0)
                      )}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Cash-on-Cash ROI</span>
                        <span className="font-semibold">{(lender.profit/((lender.outOfPocketBreakdown?.downPayment||0)+(lender.outOfPocketBreakdown?.attorneyFees||0)+(lender.outOfPocketBreakdown?.titleExam||0)+(lender.outOfPocketBreakdown?.titleInsurance||0)+(lender.outOfPocketBreakdown?.transferFee||0)+(!lender.outOfPocketBreakdown?.pointsDeferred?(lender.outOfPocketBreakdown?.totalPointsCost||lender.outOfPocketBreakdown?.pointsCost||0):0)+(lender.outOfPocketBreakdown?.appraisalCost||0)+(lender.outOfPocketBreakdown?.docPrepFee||0)+(lender.lenderDrawFees||0)+(lender.outOfPocketBreakdown?.insurance||0)+(lender.outOfPocketBreakdown?.utilities||0)+(lender.outOfPocketBreakdown?.hoaMonthly||0)+(lender.outOfPocketBreakdown?.other||0))*100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Annualized ROI</span>
                        <span className="font-semibold">{(lender.profit/((lender.outOfPocketBreakdown?.downPayment||0)+(lender.outOfPocketBreakdown?.attorneyFees||0)+(lender.outOfPocketBreakdown?.titleExam||0)+(lender.outOfPocketBreakdown?.titleInsurance||0)+(lender.outOfPocketBreakdown?.transferFee||0)+(!lender.outOfPocketBreakdown?.pointsDeferred?(lender.outOfPocketBreakdown?.totalPointsCost||lender.outOfPocketBreakdown?.pointsCost||0):0)+(lender.outOfPocketBreakdown?.appraisalCost||0)+(lender.outOfPocketBreakdown?.docPrepFee||0)+(lender.lenderDrawFees||0)+(lender.outOfPocketBreakdown?.insurance||0)+(lender.outOfPocketBreakdown?.utilities||0)+(lender.outOfPocketBreakdown?.hoaMonthly||0)+(lender.outOfPocketBreakdown?.other||0))*(12/(lender.totalHoldMonths||formData.projectLength||6))*100).toFixed(1)}%</span>
                      </div>
                      
                      {/* Loan Terms */}
                      <div className="border-t pt-2 mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Interest Rate</span>
                          <p className="font-medium">{lender.interestRate}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Points</span>
                          <p className="font-medium">{lender.points}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Loan Amount</span>
                          <p className="font-medium">{lender.totalLoanAmount ? formatCurrency(lender.totalLoanAmount) : "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Purchase Loan</span>
                          <p className="font-medium">{formatCurrency(lender.purchaseLoanAmount ?? 0)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rehab Loan</span>
                          <p className="font-medium">{formatCurrency(lender.rehabLoanAmount ?? 0)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Down Payment</span>
                          <p className="font-medium">{formatCurrency(lender.outOfPocketBreakdown?.downPayment ?? 0)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max LTV</span>
                          <p className="font-medium">{lender.maxLtvBuy}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max Rehab %</span>
                          <p className="font-medium">{lender.maxLendRehab ? `${lender.maxLendRehab}%` : '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time to Close</span>
                          <p className="font-medium">{lender.timeToClose} days</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Total Loan Amount</span>
                          <p className="font-medium">{lender.totalLoanAmount ? formatCurrency(lender.totalLoanAmount) : '—'}</p>
                        </div>
                      </div>
                      
                      {/* Cost Breakdown */}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Project Cost</span>
                          <span>{formatCurrency(lender.totalProjectCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Closing Costs</span>
                          <span>{formatCurrency(
                          (lender.outOfPocketBreakdown?.attorneyFees || 0) +
                          (lender.outOfPocketBreakdown?.titleExam || 0) +
                          (lender.outOfPocketBreakdown?.titleInsurance || 0) +
                          (lender.outOfPocketBreakdown?.transferFee || 0)
                        )}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Lender Fees</span>
                          <span>{formatCurrency(lender.outOfPocketBreakdown?.lenderFees || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Carrying Costs</span>
                          <span>{formatCurrency(lender.carryingCosts)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t pt-1 mt-1">
                          <span>Est Out-of-Pocket</span>
                          <span>{formatCurrency(lender.totalInvestment)}</span>
                        </div>
                      </div>
                      
                      {/* Contact Button */}
                      {!isGeneratingPdf && lender.lenderId && (
                        <Button
                          className="w-full mt-3"
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
                            referralLink: lender.referralLink,
                          })}
                          data-testid={`button-contact-lender-mobile-${index + 1}`}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Contact Lender
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Mobile-only: Show more / fewer loans toggle (visible only when there are >2 loan cards) */}
                {!isGeneratingPdf && pdfLenders.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:hidden w-full min-h-11"
                    onClick={() => setShowAllLoansMobile(!showAllLoansMobile)}
                    data-testid="button-show-more-loans-mobile"
                  >
                    {showAllLoansMobile
                      ? 'Show fewer loans'
                      : `Show more loans (+${pdfLenders.length - 2} more)`}
                  </Button>
                )}
                {/* Desktop "Show More" — pagination across all screens for the visibleLenderCount cap */}
                {hasMoreLenders && !isGeneratingPdf && (
                  <Button
                    variant="outline"
                    className="hidden sm:flex w-full"
                    onClick={handleViewMoreLoans}
                    data-testid="button-load-more-loans"
                  >
                    Show More Loans ({results.lenderColumns.length - visibleLenderCount} remaining)
                  </Button>
                )}
                
                {/* Upgrade prompt — only for manual-entry free users - Mobile */}
                {!showFullResults && !isGeneratingPdf && (
                  <div className="mt-4 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-4 text-center">
                    <h3 className="font-semibold text-base mb-2">Upgrade to Get Lender Referrals and More</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Compare multiple lender options and get connected with lenders who can fund your deals.
                    </p>
                    <Link href="/upgrade">
                      <Button size="sm" data-testid="button-upgrade-step5-mobile">
                        Upgrade Now
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Desktop Table View - hidden on mobile */}
              <div ref={pdfPage2Ref} className="pdf-page2">
              <div className="hidden lg:block overflow-x-auto relative" ref={scrollContainerRef}>
                <Table className={`min-w-full${pdfHideCash ? ' pdf-hide-col2' : ''}${pdfHideUserLoan ? ' pdf-hide-col3' : ''}`}>
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
                    <div className="flex flex-col items-center gap-1">
                      <span>Cash Sale</span>
                      {!isGeneratingPdf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-export-col-cashsale">
                              <Download className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center">
                            <DropdownMenuItem onClick={() => generateSingleColumnCSV(results.cashSaleColumn, 'Cash Sale')}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSingleColumnPDF(results.cashSaleColumn, 'Cash Sale')}>
                              <FileText className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableHead>
                  {results.userLoanColumn && (
                    <TableHead 
                      className="text-center min-w-[100px] sticky z-10 bg-background"
                      style={{ left: `${metricColWidth + cashSaleColWidth}px`, minWidth: `${yourLoanColWidth}px` }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>Entered Loan</span>
                        {!isGeneratingPdf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-export-col-enteredloan">
                                <Download className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                              <DropdownMenuItem onClick={() => generateSingleColumnCSV(results.userLoanColumn!, 'Entered Loan')}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export CSV
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSingleColumnPDF(results.userLoanColumn!, 'Entered Loan')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Export PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableHead>
                  )}
                  {pdfLenders.map((lender, index) => (
                    <TableHead key={index} className="text-center min-w-[140px] text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">{lender.lenderName || `Lender ${index + 1}`}</span>
                        {lender.productName && (
                          <span className="text-muted-foreground font-normal">{lender.productName}</span>
                        )}
                        {!isGeneratingPdf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-export-col-lender-${index}`}>
                                <Download className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                              <DropdownMenuItem onClick={() => generateSingleColumnCSV(lender, lender.lenderName || `Lender ${index + 1}`)}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export CSV
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSingleColumnPDF(lender, lender.lenderName || `Lender ${index + 1}`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Export PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                  {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                    {formatCurrency(
                    (results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                    (results.cashSaleColumn.outOfPocketBreakdown?.titleExam || 0) +
                    (results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                    (results.cashSaleColumn.outOfPocketBreakdown?.transferFee || 0)
                  )}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center text-sm sticky z-10 bg-accent/30" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(
                        (results.userLoanColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleExam || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.transferFee || 0)
                      )}
                    </TableCell>
                  )}
                  {pdfLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center text-sm">{formatCurrency(
                      (lender.outOfPocketBreakdown?.attorneyFees || 0) +
                      (lender.outOfPocketBreakdown?.titleExam || 0) +
                      (lender.outOfPocketBreakdown?.titleInsurance || 0) +
                      (lender.outOfPocketBreakdown?.transferFee || 0)
                    )}</TableCell>
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
                      {pdfLenders.map((_, index) => (
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
                      {pdfLenders.map((_, index) => (
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
                      {pdfLenders.map((_, index) => (
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
                      {pdfLenders.map((_, index) => (
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
                  {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                  {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((_, index) => (
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
                      {pdfLenders.map((_, index) => (
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
                      {pdfLenders.map((_, index) => (
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
                      {pdfLenders.map((_, index) => (
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
                      {pdfLenders.map((_, index) => (
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
                      {pdfLenders.map((_, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(formData.otherCarryingCosts || 0)}</TableCell>
                      ))}
                    </TableRow>
                  </>
                )}

                {/* 5. EST OUT-OF-POCKET Row */}
                <TableRow
                  className="bg-accent/30 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setShowOopTableBreakdown(!showOopTableBreakdown)}
                  data-testid="section-header-oop"
                >
                  <TableCell className={`font-semibold ${stickyFirstColAccent} flex items-center gap-2`}>
                    {showOopTableBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Est Out-of-Pocket
                  </TableCell>
                  <TableCell className="text-center font-semibold sticky z-10 bg-accent/30" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(
                      (results.cashSaleColumn.outOfPocketBreakdown?.downPayment || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.titleExam || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                      (results.cashSaleColumn.outOfPocketBreakdown?.transferFee || 0) +
                      ((results.cashSaleColumn.outOfPocketBreakdown?.insurance || 0)) +
                      ((results.cashSaleColumn.outOfPocketBreakdown?.utilities || 0)) +
                      ((results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly || 0)) +
                      ((results.cashSaleColumn.outOfPocketBreakdown?.other || 0))
                    )}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-semibold sticky z-10 bg-accent/30" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(
                        (results.userLoanColumn.outOfPocketBreakdown?.downPayment || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleExam || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.transferFee || 0) +
                        (!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred ? (results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost || results.userLoanColumn.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.appraisalCost || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.docPrepFee || 0) +
                        (results.userLoanColumn.lenderDrawFees || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.insurance || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.utilities || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (results.userLoanColumn.outOfPocketBreakdown?.other || 0)
                      )}
                    </TableCell>
                  )}
                  {pdfLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">
                      {formatCurrency(
                        (lender.outOfPocketBreakdown?.downPayment || 0) +
                        (lender.outOfPocketBreakdown?.attorneyFees || 0) +
                        (lender.outOfPocketBreakdown?.titleExam || 0) +
                        (lender.outOfPocketBreakdown?.titleInsurance || 0) +
                        (lender.outOfPocketBreakdown?.transferFee || 0) +
                        (!lender.outOfPocketBreakdown?.pointsDeferred ? (lender.outOfPocketBreakdown?.totalPointsCost || lender.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                        (lender.outOfPocketBreakdown?.appraisalCost || 0) +
                        (lender.outOfPocketBreakdown?.docPrepFee || 0) +
                        (lender.lenderDrawFees || 0) +
                        (lender.outOfPocketBreakdown?.insurance || 0) +
                        (lender.outOfPocketBreakdown?.utilities || 0) +
                        (lender.outOfPocketBreakdown?.hoaMonthly || 0) +
                        (lender.outOfPocketBreakdown?.other || 0)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {showOopTableBreakdown && (
                  <>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>Down Payment</TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(results.cashSaleColumn.outOfPocketBreakdown?.downPayment || 0)}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(results.userLoanColumn.outOfPocketBreakdown?.downPayment || 0)}
                        </TableCell>
                      )}
                      {pdfLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">{formatCurrency(lender.outOfPocketBreakdown?.downPayment || 0)}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>
                        <span className="flex items-center gap-1">
                          Closing Costs (Buy)
                          <span title="Also shown in Closing Costs (Buy) above. Included here as part of your total cash required at closing." className="text-muted-foreground cursor-help text-xs">ⓘ</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(
                          (results.cashSaleColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                          (results.cashSaleColumn.outOfPocketBreakdown?.titleExam || 0) +
                          (results.cashSaleColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                          (results.cashSaleColumn.outOfPocketBreakdown?.transferFee || 0)
                        )}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(
                            (results.userLoanColumn.outOfPocketBreakdown?.attorneyFees || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.titleExam || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.titleInsurance || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.transferFee || 0)
                          )}
                        </TableCell>
                      )}
                      {pdfLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">
                          {formatCurrency(
                            (lender.outOfPocketBreakdown?.attorneyFees || 0) +
                            (lender.outOfPocketBreakdown?.titleExam || 0) +
                            (lender.outOfPocketBreakdown?.titleInsurance || 0) +
                            (lender.outOfPocketBreakdown?.transferFee || 0)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>
                        <span className="flex items-center gap-1">
                          Lender Fees
                          <span title="Also shown in Lender Fees above. Only non-deferred fees are included here as cash required at or before closing." className="text-muted-foreground cursor-help text-xs">ⓘ</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>$0</TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(
                            (!results.userLoanColumn.outOfPocketBreakdown?.pointsDeferred ? (results.userLoanColumn.outOfPocketBreakdown?.totalPointsCost || results.userLoanColumn.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.appraisalCost || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.docPrepFee || 0) +
                            (results.userLoanColumn.lenderDrawFees || 0)
                          )}
                        </TableCell>
                      )}
                      {pdfLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">
                          {formatCurrency(
                            (!lender.outOfPocketBreakdown?.pointsDeferred ? (lender.outOfPocketBreakdown?.totalPointsCost || lender.outOfPocketBreakdown?.pointsCost || 0) : 0) +
                            (lender.outOfPocketBreakdown?.appraisalCost || 0) +
                            (lender.outOfPocketBreakdown?.docPrepFee || 0) +
                            (lender.lenderDrawFees || 0)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className={`font-medium ${stickyFirstColBase} pl-8`}>
                        <span className="flex items-center gap-1">
                          Carrying Costs
                          <span title="Also shown in Carrying Costs above. Only cash expenses paid during the hold period are included here — excludes deferred interest and taxes." className="text-muted-foreground cursor-help text-xs">ⓘ</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth}px` }}>
                        {formatCurrency(
                          (results.cashSaleColumn.outOfPocketBreakdown?.insurance || 0) +
                          (results.cashSaleColumn.outOfPocketBreakdown?.utilities || 0) +
                          (results.cashSaleColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                          (results.cashSaleColumn.outOfPocketBreakdown?.other || 0)
                        )}
                      </TableCell>
                      {results.userLoanColumn && (
                        <TableCell className="text-center sticky z-10 bg-background" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                          {formatCurrency(
                            (results.userLoanColumn.outOfPocketBreakdown?.insurance || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.utilities || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.hoaMonthly || 0) +
                            (results.userLoanColumn.outOfPocketBreakdown?.other || 0)
                          )}
                        </TableCell>
                      )}
                      {pdfLenders.map((lender, index) => (
                        <TableCell key={index} className="text-center">
                          {formatCurrency(
                            (lender.outOfPocketBreakdown?.insurance || 0) +
                            (lender.outOfPocketBreakdown?.utilities || 0) +
                            (lender.outOfPocketBreakdown?.hoaMonthly || 0) +
                            (lender.outOfPocketBreakdown?.other || 0)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </>
                )}

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
                  {pdfLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.sellPrice)}</TableCell>
                  ))}
                </TableRow>

                {/* 7. GROSS PROFIT Row */}
                {/* Gross Profit = Sale Price - Project Cost - Closing Costs (Buy) - Lender Fees - Carrying Costs */}
                <TableRow className="bg-muted">
                  <TableCell className={`font-bold ${stickyFirstColMuted}`}>Gross Profit</TableCell>
                  <TableCell className="text-center font-bold sticky z-10 bg-muted" style={{ left: `${metricColWidth}px` }}>
                    {formatCurrency(results.cashSaleColumn.sellPrice - results.cashSaleColumn.totalProjectCost - results.cashSaleColumn.closingCostsBuy - (results.cashSaleColumn.outOfPocketBreakdown?.lenderFees || 0) - results.cashSaleColumn.carryingCosts)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-bold sticky z-10 bg-muted" style={{ left: `${metricColWidth + cashSaleColWidth}px` }}>
                      {formatCurrency(results.userLoanColumn.sellPrice - results.userLoanColumn.totalProjectCost - results.userLoanColumn.closingCostsBuy - (results.userLoanColumn.outOfPocketBreakdown?.lenderFees || 0) - results.userLoanColumn.carryingCosts)}
                    </TableCell>
                  )}
                  {pdfLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatCurrency(lender.sellPrice - lender.totalProjectCost - lender.closingCostsBuy - (lender.outOfPocketBreakdown?.lenderFees || 0) - lender.carryingCosts)}</TableCell>
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
                  {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                      {pdfLenders.map((lender, index) => (
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
                  {pdfLenders.map((lender, index) => (
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
                  {pdfLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">
                      <div className="flex flex-col items-center" data-testid={`qrcode-lender${index + 1}`}>
                        {lender.referralLink ? (
                          <QRCodeCanvas 
                            value={lender.referralLink} 
                            size={64}
                            level="M"
                            bgColor="white"
                            fgColor="black"
                            style={{ margin: '0 auto' }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
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
                  {pdfLenders.map((lender, index) => (
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
                            referralLink: lender.referralLink,
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
              </div>

          {/* Show More Loans Button - Desktop table pagination only (hidden on mobile; mobile uses sm:hidden toggle inside the lg:hidden card view) */}
          {hasMoreLenders && !isGeneratingPdf && (
            <div className="hidden lg:flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={handleViewMoreLoans}
                data-testid="button-show-more-loans"
              >
                Show More Loans ({results.lenderColumns.length - visibleLenderCount} remaining)
              </Button>
            </div>
          )}

          {/* Upgrade prompt — only for manual-entry free users */}
          {!showFullResults && !isGeneratingPdf && (
            <div className="mt-6 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">Upgrade to Get Lender Referrals and More</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Compare multiple lender options, see detailed financing comparisons, and get connected directly with lenders who can fund your deals.
              </p>
              <Link href="/upgrade">
                <Button data-testid="button-upgrade-step5">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          )}

        </CardContent>
      </Card>
          </div>
        </TabsContent>

        {/* Rental / DSCR Analysis Tab */}
        <TabsContent value="rental-dscr" className="mt-6 space-y-6">
          {/* Property Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Property Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                    step="any"
                    value={monthlyRent || ""}
                    onChange={(e) => { setMonthlyRent(parseFloat(e.target.value) || 0); setDscrTabActivated(true); }}
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
          ) : dscrQuotaExceeded ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium mb-1">DSCR Calculation Limit Reached</h3>
                    <p className="text-muted-foreground text-sm">
                      You've used your 2 free DSCR calculations this month. Upgrade for unlimited access.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Link href="/pricing">
                      <Button variant="default" data-testid="button-upgrade-dscr">Upgrade Now</Button>
                    </Link>
                    <Button variant="outline" onClick={onBack} data-testid="button-go-back-dscr">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </Button>
                  </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
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
                    <div className="flex justify-between sm:col-span-2 border-t pt-2">
                      <span className="font-semibold">Total PITIA</span>
                      <span className="font-bold text-primary">${dscrResults.totalMonthlyPITIA.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="flex justify-between sm:col-span-2">
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
                {!showFullResults ? (
                  <div className="rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-6 text-center">
                    <h3 className="font-semibold text-lg mb-2">Upgrade to Get Lender Referrals and More</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Compare DSCR lender options, see detailed financing comparisons, and get connected directly with lenders who can fund your deals.
                    </p>
                    <Link href="/upgrade">
                      <Button data-testid="button-upgrade-dscr">
                        Upgrade Now
                      </Button>
                    </Link>
                  </div>
                ) : isLoadingDscrLenders ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">Calculating DSCR for each lender...</span>
                  </div>
                ) : displayDscrProducts.length > 0 ? (
                  <div className="space-y-6">
                    {displayDscrProducts.slice(0, 5).map((item, index) => {
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
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
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

                          <div className="border-t pt-4 flex flex-col sm:flex-row justify-end gap-2">
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

      {/* PDF Column Selection Dialog */}
      <Dialog open={pdfColumnDialogOpen} onOpenChange={setPdfColumnDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Columns for PDF</DialogTitle>
            <DialogDescription>
              Choose up to 4 columns to include. Fewer columns produce a cleaner, more readable PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { id: 'cash-sale', label: 'Cash Sale' },
              ...(results?.userLoanColumn ? [{ id: 'user-loan', label: 'Entered Loan' }] : []),
              ...pdfLenders.map((l, i) => ({
                id: `lender-${i}`,
                label: `${l.lenderName || `Lender ${i + 1}`}${l.productName ? ` — ${l.productName}` : ''}`,
              })),
            ].map(col => {
              const isSelected = selectedPdfColumnIds.includes(col.id);
              const wouldExceedMax = !isSelected && selectedPdfColumnIds.length >= 4;
              return (
                <div key={col.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`pdf-col-${col.id}`}
                    checked={isSelected}
                    disabled={wouldExceedMax}
                    onCheckedChange={(checked) => {
                      if (checked && selectedPdfColumnIds.length < 4) {
                        setSelectedPdfColumnIds(prev => [...prev, col.id]);
                      } else if (!checked) {
                        setSelectedPdfColumnIds(prev => prev.filter(id => id !== col.id));
                      }
                    }}
                    data-testid={`checkbox-pdf-col-${col.id}`}
                  />
                  <label
                    htmlFor={`pdf-col-${col.id}`}
                    className={`text-sm cursor-pointer select-none${wouldExceedMax ? ' text-muted-foreground' : ''}`}
                  >
                    {col.label}
                  </label>
                </div>
              );
            })}
            {selectedPdfColumnIds.length >= 4 && (
              <p className="text-xs text-muted-foreground pt-1">Maximum of 4 columns reached.</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end flex-wrap">
            <Button variant="outline" onClick={() => setPdfColumnDialogOpen(false)} data-testid="button-pdf-col-cancel">
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={selectedPdfColumnIds.length === 0}
              onClick={async () => {
                setPdfColumnDialogOpen(false);
                await handleDownloadPDF(false);
              }}
              data-testid="button-pdf-col-overview"
            >
              <FileText className="h-4 w-4 mr-2" />
              Overview PDF
            </Button>
            <Button
              disabled={selectedPdfColumnIds.length === 0}
              onClick={async () => {
                setPdfColumnDialogOpen(false);
                await handleDownloadPDF(true);
              }}
              data-testid="button-pdf-col-detailed"
            >
              <FileText className="h-4 w-4 mr-2" />
              Detailed PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfQuotaExhaustedModal
        open={showPdfQuotaModal}
        onOpenChange={setShowPdfQuotaModal}
        isAuthenticated={isAuthenticated}
      />

      {/* Hidden single-column PDF capture target */}
      <div
        ref={singleColumnPdfRef as React.RefObject<HTMLDivElement>}
        style={{ position: 'absolute', left: '-9999px', top: 0, width: '750px', backgroundColor: 'white', color: '#111' }}
        aria-hidden="true"
      >
        {singleColumnExportData && (() => {
          const { column, name } = singleColumnExportData;
          const formData = form.getValues();
          const isLoanType = column.interestRate && column.interestRate > 0;
          const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
          const breakdown = column.outOfPocketBreakdown;
          const insuranceTotal = breakdown?.insurance || 0;
          const utilitiesTotal = breakdown?.utilities || 0;
          const hoaMonthlyTotal = breakdown?.hoaMonthly || 0;
          const otherCarryingTotal = breakdown?.other || 0;
          const taxesTotal = breakdown?.taxes || 0;
          const cashOnlyCarrying = insuranceTotal + utilitiesTotal + hoaMonthlyTotal + otherCarryingTotal;
          const totalPointsValue = breakdown?.totalPointsCost || breakdown?.pointsCost || 0;
          const interestCostValue = column.interestCost || 0;
          const isPointsDeferred = !!column.outOfPocketBreakdown?.pointsDeferred;
          const isInterestDeferred = !!column.interestDeferred;
          const deferredPoints = isPointsDeferred ? totalPointsValue : 0;
          const deferredInterest = isInterestDeferred ? interestCostValue : 0;
          const totalDeferred = deferredPoints + deferredInterest + taxesTotal;
          const showDeferredSection = isPointsDeferred || isInterestDeferred || taxesTotal > 0;
          /**
           * VERIFIED OOP DEFINITION (May 1, 2026) — DO NOT SIMPLIFY
           * Out-of-Pocket = cash investor must have before/during hold.
           * Excludes deferred items (paid from sale proceeds, not out of pocket).
           *
           * baseClosingCosts = Attorney + Title Exam + Title Insurance + Transfer Fee (base four only)
           * lenderFeesOOP = non-deferred Points + Appraisal + Doc Prep + Draw Fees
           * cashOnlyCarrying = Insurance + Utilities + HOA + Other (NO taxes, NO interest)
           * displayedOOP = downPayment + baseClosingCosts + lenderFeesOOP + cashOnlyCarrying
           *
           * GOLDEN TEST CASE (3127 Snapfinger Ct, Decatur GA):
           * Purchase $325K | Rehab $75K | 9mo | 12% | 2pts | 90% LTV | 100% rehab
           * Drawn Funds Only: Yes | Interest Deferred: Yes | Points Deferred: Yes
           * Expected: OOP $43,322 | CoC 142.11% | Annualized 189.47% | Net Profit $61,562
           * OOP Breakdown: Down $32,500 + Closing $5,225 + Lender $2,445 + Carrying $3,152
           */
          const baseClosingCosts = (breakdown?.attorneyFees || 0) + (breakdown?.titleExam || 0) + (breakdown?.titleInsurance || 0) + (breakdown?.transferFee || 0);
          const lenderFeesOOP = (!isPointsDeferred ? totalPointsValue : 0) + (breakdown?.appraisalCost || 0) + (breakdown?.docPrepFee || 0) + (column.lenderDrawFees || 0);
          const displayedOOP = (breakdown?.downPayment || 0) + baseClosingCosts + lenderFeesOOP + cashOnlyCarrying;
          return (
            <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
                {/* Left: user logo + company name, or RE Data Metrix */}
                {user?.reportLogoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={user.reportLogoUrl} alt={user.reportCompanyName || 'Company logo'} style={{ height: '40px', width: 'auto', objectFit: 'contain', maxWidth: '120px' }} />
                    {user.reportCompanyName && (
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111' }}>{user.reportCompanyName}</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d4ed8' }}>RE Data Metrix</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>Turning Terms into Returns</div>
                  </div>
                )}
                {/* Right: RE Data Metrix branding */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'right' }}>
                  {user?.reportLogoUrl && (
                    <img src={logoImg} alt="RE Data Metrix" style={{ height: '28px', width: '28px', opacity: 0.65 }} />
                  )}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1d4ed8' }}>
                      {user?.reportLogoUrl ? 'RE Data Metrix' : 'www.redatametrix.com'}
                    </div>
                    {user?.reportLogoUrl && (
                      <div style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>Turning Terms into Returns</div>
                    )}
                    {user?.reportLogoUrl && (
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>www.redatametrix.com</div>
                    )}
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Deal Analysis Report</div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Loan Analysis: {name}</h2>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                {formData.address}{formData.city ? `, ${formData.city}` : ''}{formData.state ? `, ${formData.state}` : ''}
              </p>

              {/* Deal Inputs */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#f3f4f6', padding: '6px 10px', marginBottom: '8px', borderRadius: '4px' }}>Deal Inputs</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '12px', padding: '0 10px' }}>
                  <div style={{ color: '#6b7280' }}>Purchase Price</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(editBuyPrice)}</div>
                  <div style={{ color: '#6b7280' }}>Rehab Budget</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(editRehab)}</div>
                  <div style={{ color: '#6b7280' }}>Project Length</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{editProjectLength} months</div>
                  <div style={{ color: '#6b7280' }}>ARV (Est. Sale Price)</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(editArv)}</div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#f3f4f6', padding: '6px 10px', marginBottom: '8px', borderRadius: '4px' }}>Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '12px', padding: '0 10px' }}>
                  <div style={{ color: '#6b7280' }}>Net Profit</div>
                  <div style={{ textAlign: 'right', fontWeight: '700', color: column.profit >= 0 ? '#059669' : '#dc2626' }}>{fmt(column.profit)}</div>
                  <div style={{ color: '#6b7280' }}>Out-of-Pocket Cost</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(displayedOOP)}</div>
                  <div style={{ color: '#6b7280' }}>Cash-on-Cash ROI</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{displayedOOP > 0 ? ((column.profit / displayedOOP) * 100).toFixed(2) : '0.00'}%</div>
                  <div style={{ color: '#6b7280' }}>Annualized ROI</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{displayedOOP > 0 ? ((column.profit / displayedOOP) * (12 / (formData.projectLength || 12)) * 100).toFixed(2) : '0.00'}%</div>
                </div>
              </div>

              {/* Loan Terms (only for loan types) */}
              {isLoanType && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#f3f4f6', padding: '6px 10px', marginBottom: '8px', borderRadius: '4px' }}>Loan Terms</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '12px', padding: '0 10px' }}>
                    <div style={{ color: '#6b7280' }}>Interest Rate</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.interestRate}%</div>
                    {column.points !== undefined && <><div style={{ color: '#6b7280' }}>Points</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.points}%</div></>}
                    {column.totalLoanAmount ? <><div style={{ color: '#6b7280' }}>Total Loan Amount</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(column.totalLoanAmount)}</div></> : null}
                    <div style={{ color: '#6b7280' }}>Purchase Loan</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(column.purchaseLoanAmount ?? 0)}</div>
                    <div style={{ color: '#6b7280' }}>Rehab Loan</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(column.rehabLoanAmount ?? 0)}</div>
                    <div style={{ color: '#6b7280' }}>Down Payment</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(column.outOfPocketBreakdown?.downPayment ?? 0)}</div>
                    {column.maxLtvBuy ? <><div style={{ color: '#6b7280' }}>Max LTV (Buy)</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.maxLtvBuy}%</div></> : null}
                    {column.maxLendRehab ? <><div style={{ color: '#6b7280' }}>Max Loan % (Rehab)</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.maxLendRehab}%</div></> : null}
                    {column.maxLoanArv ? <><div style={{ color: '#6b7280' }}>Max ARV %</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.maxLoanArv}%</div></> : null}
                    <div style={{ color: '#6b7280' }}>Drawn Funds Only</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.drawnFundsOnly ? 'Yes' : 'No'}</div>
                    <div style={{ color: '#6b7280' }}>Interest Deferred</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.interestDeferred ? 'Yes' : 'No'}</div>
                    <div style={{ color: '#6b7280' }}>Points Deferred</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.outOfPocketBreakdown?.pointsDeferred ? 'Yes' : 'No'}</div>
                    {column.timeToClose ? <><div style={{ color: '#6b7280' }}>Time to Close</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{column.timeToClose} days</div></> : null}
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#f3f4f6', padding: '6px 10px', marginBottom: '8px', borderRadius: '4px' }}>Cost Breakdown</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '12px', padding: '0 10px' }}>
                  <div style={{ color: '#6b7280' }}>Total Project Cost</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(column.totalProjectCost)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Purchase Price</div><div style={{ textAlign: 'right' }}>{fmt(column.purchasePrice)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Rehab Budget</div><div style={{ textAlign: 'right' }}>{fmt(column.rehabBudget)}</div>
                  <div style={{ color: '#6b7280' }}>Closing Costs (Buy)</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(baseClosingCosts)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Attorney Fees</div><div style={{ textAlign: 'right' }}>{fmt(column.outOfPocketBreakdown?.attorneyFees || 0)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Title Exam</div><div style={{ textAlign: 'right' }}>{fmt(column.outOfPocketBreakdown?.titleExam || 0)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Title Insurance</div><div style={{ textAlign: 'right' }}>{fmt(column.outOfPocketBreakdown?.titleInsurance || 0)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Transfer Fee</div><div style={{ textAlign: 'right' }}>{fmt(column.outOfPocketBreakdown?.transferFee || 0)}</div>

                  <div style={{ color: '#6b7280' }}>Carrying Costs</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(cashOnlyCarrying)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Insurance</div><div style={{ textAlign: 'right' }}>{fmt(insuranceTotal)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Utilities</div><div style={{ textAlign: 'right' }}>{fmt(utilitiesTotal)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>HOA Monthly</div><div style={{ textAlign: 'right' }}>{fmt(hoaMonthlyTotal)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Other</div><div style={{ textAlign: 'right' }}>{fmt(otherCarryingTotal)}</div>
                  {showDeferredSection && (<>
                    <div style={{ color: '#6b7280' }}>Deferred to Closing</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(totalDeferred)}</div>
                    {isPointsDeferred && (<><div style={{ color: '#6b7280', paddingLeft: '12px' }}>Points Cost (deferred)</div><div style={{ textAlign: 'right' }}>{fmt(deferredPoints)}</div></>)}
                    {isInterestDeferred && (<><div style={{ color: '#6b7280', paddingLeft: '12px' }}>Interest Payments (deferred)</div><div style={{ textAlign: 'right' }}>{fmt(deferredInterest)}</div></>)}
                    {taxesTotal > 0 && (<><div style={{ color: '#6b7280', paddingLeft: '12px' }}>Taxes (est. — reconciled at closing)</div><div style={{ textAlign: 'right' }}>{fmt(taxesTotal)}</div></>)}
                  </>)}
                  <div style={{ color: '#6b7280' }}>Selling Costs</div><div style={{ textAlign: 'right', fontWeight: '600' }}>{fmt(column.closingCostsSell + column.commission)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Real Estate Commission</div><div style={{ textAlign: 'right' }}>{fmt(column.commission || 0)}</div>
                  <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Closing Costs (Sell)</div><div style={{ textAlign: 'right' }}>{fmt(column.closingCostsSell || 0)}</div>
                </div>
              </div>

              {/* Out-of-Pocket Breakdown */}
              {column.outOfPocketBreakdown && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', backgroundColor: '#f3f4f6', padding: '6px 10px', marginBottom: '8px', borderRadius: '4px' }}>Out-of-Pocket Breakdown</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '12px', padding: '0 10px' }}>
                    <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Down Payment</div><div style={{ textAlign: 'right' }}>{fmt(column.outOfPocketBreakdown.downPayment || 0)}</div>
                    <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Closing Costs (Buy)</div><div style={{ textAlign: 'right' }}>{fmt(baseClosingCosts)}</div>
                    {lenderFeesOOP > 0 && (<><div style={{ color: '#6b7280', paddingLeft: '12px' }}>Lender Fees</div><div style={{ textAlign: 'right' }}>{fmt(lenderFeesOOP)}</div></>)}
                    <div style={{ color: '#6b7280', paddingLeft: '12px' }}>Carrying Costs</div><div style={{ textAlign: 'right' }}>{fmt(cashOnlyCarrying)}</div>
                    <div style={{ color: '#111', fontWeight: '700', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>Total Out-of-Pocket</div>
                    <div style={{ textAlign: 'right', fontWeight: '700', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>{fmt(displayedOOP)}</div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '16px', fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                Generated by RE Data Metrix &bull; www.redatametrix.com
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
