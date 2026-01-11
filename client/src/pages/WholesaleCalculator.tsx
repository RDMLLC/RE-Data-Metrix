import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Calculator, FileText, DollarSign, Building2, Percent, Download, HelpCircle, Mail, Send, Loader2, Pencil, TrendingUp, TrendingDown, RotateCcw, Save, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useWizardData } from "@/contexts/WizardDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import WholesaleQuotaModal from "@/components/deal-analysis/WholesaleQuotaModal";
import {
  calculateAssignmentMaxOffer,
  calculateDoubleCloseMaxOffer,
  calculateTransactionalLenderResult,
  calculateDynamicClosingCosts,
  calculateWholesaleFeeFromBuyPrice,
  calculateDoubleCloseWholesaleFeeFromBuyPrice,
  REFERRAL_POINTS_PERCENT,
  type WholesaleInputs,
  type DoubleCloseClosingCosts,
  type TransactionalLenderResult,
} from "@shared/calculations/wholesale-calculations";
import { getTransferTaxRate } from "@shared/data/transferTaxRates";
import { QRCodeSVG } from "qrcode.react";
import { usePDF } from "react-to-pdf";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function PrintableInput({ 
  value, 
  isPdfMode, 
  prefix,
  className = ""
}: { 
  value: string; 
  isPdfMode: boolean;
  prefix?: React.ReactNode;
  className?: string;
}) {
  if (isPdfMode) {
    return (
      <div className={`flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm ${className}`}>
        {prefix}
        <span className="ml-1">{value || "-"}</span>
      </div>
    );
  }
  return null;
}

function parseNumericInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

interface TransactionalLender {
  id: string;
  productId: string;
  companyName: string;
  flatFee: number;
  points: number;
  referralLink?: string;
}

export default function WholesaleCalculator() {
  const [, setLocation] = useLocation();
  const { wizardData, updatePropertyData } = useWizardData();
  const [isPdfMode, setIsPdfMode] = useState(false);
  
  const { toPDF, targetRef } = usePDF({ 
    filename: "wholesale-deal-analysis.pdf",
    page: {
      format: "letter",
      margin: 20,
    },
    canvas: {
      qualityRatio: 1,
    },
  });

  const handleDownloadPdf = async () => {
    setIsPdfMode(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    await toPDF();
    setIsPdfMode(false);
  };
  const { isAuthenticated, isSubscriber } = useAuth();
  const queryClient = useQueryClient();

  const [transactionType, setTransactionType] = useState<"assignment" | "double-close">("assignment");
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [calculationUnlocked, setCalculationUnlocked] = useState(false);
  
  const [arv, setArv] = useState<string>("");
  const [rehabBudget, setRehabBudget] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [propertyState, setPropertyState] = useState<string>("");
  const [buyersMaxArvPercent, setBuyersMaxArvPercent] = useState<string>("75");
  const [wholesaleFee, setWholesaleFee] = useState<string>("15000");
  const [wholesaleFeeManuallyEdited, setWholesaleFeeManuallyEdited] = useState(false);
  const [hasSavedWholesaleFee, setHasSavedWholesaleFee] = useState(false);
  
  // Buy Price field - auto-populated from Max Offer Price but editable
  const [buyPrice, setBuyPrice] = useState<string>("");
  const [buyPriceManuallySet, setBuyPriceManuallySet] = useState(false);
  
  const [closingCosts, setClosingCosts] = useState<DoubleCloseClosingCosts>(() => 
    calculateDynamicClosingCosts(0, "")
  );
  const [userEditedClosingCosts, setUserEditedClosingCosts] = useState(false);
  
  const [showTransactionalLenders, setShowTransactionalLenders] = useState(false);
  
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [selectedLenderForContact, setSelectedLenderForContact] = useState<{
    lenderId: string;
    lenderName: string;
    productId: string;
    flatFee: number;
    points: number;
  } | null>(null);
  
  const { toast } = useToast();

  const { data: transactionalLendersData, isLoading: loadingLenders } = useQuery<TransactionalLender[]>({
    queryKey: ["/api/loan-products/transactional-funding"],
    enabled: transactionType === "double-close" && showTransactionalLenders,
  });

  // Check current quota status (without consuming)
  const { data: usageData } = useQuery<{
    isSubscriber: boolean;
    wholesaleCalcCount: number;
    remainingWholesaleCalcs: number;
  }>({
    queryKey: ["/api/user/usage"],
    enabled: isAuthenticated && !isSubscriber,
  });

  // Fetch saved wholesale fee preference
  const { data: wholesaleFeeData } = useQuery<{
    hasSavedFee: boolean;
    defaultWholesaleFee: number | null;
  }>({
    queryKey: ["/api/profile/wholesale-fee"],
    enabled: isAuthenticated,
  });

  // Auto-fill wholesale fee from saved profile data
  useEffect(() => {
    if (wholesaleFeeData?.hasSavedFee && wholesaleFeeData.defaultWholesaleFee != null && !wholesaleFeeManuallyEdited) {
      setWholesaleFee(wholesaleFeeData.defaultWholesaleFee.toString());
      setHasSavedWholesaleFee(true);
    }
  }, [wholesaleFeeData, wholesaleFeeManuallyEdited]);

  // Save wholesale fee mutation
  const saveWholesaleFeeMutation = useMutation({
    mutationFn: async (fee: number) => {
      const response = await apiRequest("PUT", "/api/profile/wholesale-fee", { defaultWholesaleFee: fee });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/wholesale-fee"] });
      setHasSavedWholesaleFee(true);
      setWholesaleFeeManuallyEdited(false);
      toast({
        title: "Saved to Profile",
        description: "Your wholesale fee preference will auto-fill in future deals.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save wholesale fee to your profile.",
        variant: "destructive",
      });
    },
  });

  // Quota consumption mutation for free users
  const wholesaleCalcMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/wholesale-calc");
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.canCalculate) {
        setCalculationUnlocked(true);
        queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
      } else {
        setShowQuotaModal(true);
      }
    },
    onError: () => {
      setShowQuotaModal(true);
    }
  });

  // Contact lender mutation
  const contactLenderMutation = useMutation({
    mutationFn: async (data: {
      lenderId: string;
      loanProductId: string;
      message: string;
      dealDetails: {
        propertyAddress?: string;
        arv: number;
        rehabBudget: number;
        maxOfferPrice: number;
        wholesaleFee: number;
        transactionType: string;
        flatFee: number;
        points: number;
      };
    }) => {
      const response = await apiRequest("POST", "/api/investor-inquiries", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inquiry Sent",
        description: `Your inquiry has been sent to ${selectedLenderForContact?.lenderName}. They will contact you soon.`,
      });
      setContactDialogOpen(false);
      setContactMessage("");
      setSelectedLenderForContact(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send inquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleContactLender = (lender: TransactionalLender) => {
    setSelectedLenderForContact({
      lenderId: lender.id,
      lenderName: lender.companyName,
      productId: lender.productId,
      flatFee: lender.flatFee,
      points: lender.points,
    });
    setContactDialogOpen(true);
  };

  const submitContactLender = () => {
    if (!selectedLenderForContact || !result) return;

    contactLenderMutation.mutate({
      lenderId: selectedLenderForContact.lenderId,
      loanProductId: selectedLenderForContact.productId,
      message: contactMessage,
      dealDetails: {
        arv: parseNumericInput(arv),
        rehabBudget: parseNumericInput(rehabBudget),
        maxOfferPrice: result.maxOfferPrice,
        wholesaleFee: parseNumericInput(wholesaleFee),
        transactionType: transactionType,
        flatFee: selectedLenderForContact.flatFee,
        points: selectedLenderForContact.points,
      },
    });
  };

  // Subscribers and non-authenticated users have immediate access to results
  // (non-authenticated see results to encourage signup)
  const hasResultsAccess = isSubscriber || !isAuthenticated || calculationUnlocked;
  
  // Check if free user has remaining quota
  const hasRemainingQuota = !usageData || (usageData.remainingWholesaleCalcs ?? 2) > 0;

  const handleRunCalculation = () => {
    if (!isAuthenticated) {
      setCalculationUnlocked(true);
      return;
    }
    
    if (isSubscriber) {
      setCalculationUnlocked(true);
      return;
    }
    
    // Free user - consume quota
    wholesaleCalcMutation.mutate();
  };

  const handleGoBackFromModal = () => {
    setLocation("/deal-analysis?returnToStep=3");
  };

  // Track if we've already initialized from wizard data
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only hydrate from wizard context on initial mount, not on every render
    if (initialized) return;
    
    let didHydrate = false;
    
    // Check for arv - use !== undefined to handle 0 values
    if (wizardData.property?.arv !== undefined && wizardData.property?.arv !== null) {
      setArv(wizardData.property.arv.toString());
      didHydrate = true;
    }
    // Check for rehabBudget - use !== undefined to handle 0 values
    if (wizardData.property?.rehabBudget !== undefined && wizardData.property?.rehabBudget !== null) {
      setRehabBudget(wizardData.property.rehabBudget.toString());
      didHydrate = true;
    }
    // Check for purchasePrice - also use it to initialize buyPrice if available
    if (wizardData.property?.purchasePrice !== undefined && wizardData.property?.purchasePrice !== null) {
      const priceStr = wizardData.property.purchasePrice.toString();
      setPurchasePrice(priceStr);
      // If there's a purchasePrice from the wizard, use it as the initial buyPrice
      // and mark it as manually set so it doesn't get overwritten by Max Offer Price
      setBuyPrice(priceStr);
      setBuyPriceManuallySet(true);
      didHydrate = true;
    }
    // Check for state
    if (wizardData.property?.state) {
      setPropertyState(wizardData.property.state);
      didHydrate = true;
    }
    
    // Mark as initialized after first hydration attempt
    if (didHydrate || wizardData.property) {
      setInitialized(true);
    }
  }, [wizardData, initialized]);

  // Calculate dynamic closing costs when buy price or state changes
  // Only auto-recalculate if user hasn't manually edited closing costs
  useEffect(() => {
    const price = parseNumericInput(buyPrice);
    if (price > 0 && !userEditedClosingCosts) {
      const dynamicCosts = calculateDynamicClosingCosts(price, propertyState);
      setClosingCosts(dynamicCosts);
    }
  }, [buyPrice, propertyState, userEditedClosingCosts]);

  const wholesaleInputs: WholesaleInputs = useMemo(() => ({
    arv: parseNumericInput(arv),
    rehabBudget: parseNumericInput(rehabBudget),
    buyersMaxArvPercent: parseNumericInput(buyersMaxArvPercent),
    wholesaleFee: parseNumericInput(wholesaleFee),
  }), [arv, rehabBudget, buyersMaxArvPercent, wholesaleFee]);

  const assignmentResult = useMemo(() => 
    calculateAssignmentMaxOffer(wholesaleInputs), 
    [wholesaleInputs]
  );

  const doubleCloseResult = useMemo(() => 
    calculateDoubleCloseMaxOffer(wholesaleInputs, closingCosts),
    [wholesaleInputs, closingCosts]
  );

  // Get the current result based on transaction type
  const currentMaxOfferPrice = transactionType === "assignment" 
    ? assignmentResult.maxOfferPrice 
    : doubleCloseResult.maxOfferPrice;

  // Auto-populate buyPrice from Max Offer Price when it changes (unless user manually set it)
  // This only applies when no purchase price was brought from the wizard
  useEffect(() => {
    if (!buyPriceManuallySet && currentMaxOfferPrice > 0) {
      setBuyPrice(Math.round(currentMaxOfferPrice).toString());
    }
  }, [currentMaxOfferPrice, buyPriceManuallySet]);

  const transactionalLenderResults: TransactionalLenderResult[] = useMemo(() => {
    if (!transactionalLendersData || transactionalLendersData.length === 0) return [];
    
    const baseMaxOffer = doubleCloseResult.maxOfferPrice;
    
    return transactionalLendersData.slice(0, 2).map(lender => 
      calculateTransactionalLenderResult(
        lender.id,
        lender.companyName,
        baseMaxOffer,
        lender.flatFee,
        lender.points,
        wholesaleInputs.wholesaleFee
      )
    );
  }, [transactionalLendersData, doubleCloseResult.maxOfferPrice, wholesaleInputs.wholesaleFee]);

  // Calculate profitability comparison when Buy Price is manually edited
  const profitabilityComparison = useMemo(() => {
    const currentBuyPrice = parseNumericInput(buyPrice);
    const originalMaxOffer = transactionType === "assignment" 
      ? assignmentResult.maxOfferPrice 
      : doubleCloseResult.maxOfferPrice;
    
    // Only show comparison if user manually edited buy price and it differs from calculated max offer
    const hasDifference = buyPriceManuallySet && Math.abs(currentBuyPrice - originalMaxOffer) > 0.01;
    
    if (!hasDifference) return null;
    
    // Calculate adjusted wholesale fee based on the user's buy price
    const reverseInputs = {
      arv: parseNumericInput(arv),
      rehabBudget: parseNumericInput(rehabBudget),
      buyersMaxArvPercent: parseNumericInput(buyersMaxArvPercent),
      buyPrice: currentBuyPrice,
    };
    
    let adjustedWholesaleFee: number;
    let adjustedClosingCosts: number | undefined;
    
    if (transactionType === "assignment") {
      const reverseResult = calculateWholesaleFeeFromBuyPrice(reverseInputs);
      adjustedWholesaleFee = reverseResult.calculatedWholesaleFee;
    } else {
      // For double close, use the current closing costs state (which may be user-edited)
      // Only recalculate dynamic portions (title insurance, transfer tax) based on new buy price
      // if user hasn't manually edited closing costs
      let adjustedCosts: DoubleCloseClosingCosts;
      if (userEditedClosingCosts) {
        // User has manually edited closing costs - use their values as-is
        adjustedCosts = closingCosts;
      } else {
        // Recalculate closing costs based on the new buy price
        adjustedCosts = calculateDynamicClosingCosts(currentBuyPrice, propertyState);
      }
      const reverseResult = calculateDoubleCloseWholesaleFeeFromBuyPrice(reverseInputs, adjustedCosts);
      adjustedWholesaleFee = reverseResult.calculatedWholesaleFee;
      adjustedClosingCosts = reverseResult.totalClosingCosts;
    }
    
    const originalWholesaleFee = parseNumericInput(wholesaleFee);
    const originalClosingCosts = transactionType === "double-close" ? doubleCloseResult.totalClosingCosts : undefined;
    
    return {
      original: {
        buyPrice: originalMaxOffer,
        wholesaleFee: originalWholesaleFee,
        closingCosts: originalClosingCosts,
      },
      adjusted: {
        buyPrice: currentBuyPrice,
        wholesaleFee: adjustedWholesaleFee,
        closingCosts: adjustedClosingCosts,
      },
      delta: {
        buyPriceDiff: currentBuyPrice - originalMaxOffer,
        wholesaleFeeDiff: adjustedWholesaleFee - originalWholesaleFee,
        closingCostsDiff: adjustedClosingCosts !== undefined && originalClosingCosts !== undefined 
          ? adjustedClosingCosts - originalClosingCosts 
          : undefined,
      },
    };
  }, [buyPrice, buyPriceManuallySet, arv, rehabBudget, buyersMaxArvPercent, wholesaleFee, transactionType, assignmentResult, doubleCloseResult, propertyState, closingCosts, userEditedClosingCosts]);

  // Reset buy price to calculated max offer
  const handleResetBuyPrice = () => {
    const maxOffer = transactionType === "assignment" 
      ? assignmentResult.maxOfferPrice 
      : doubleCloseResult.maxOfferPrice;
    setBuyPrice(Math.round(maxOffer).toString());
    setBuyPriceManuallySet(false);
  };

  const updateClosingCost = (field: keyof DoubleCloseClosingCosts, value: string) => {
    setUserEditedClosingCosts(true);
    setClosingCosts(prev => ({
      ...prev,
      [field]: parseNumericInput(value),
    }));
  };

  const resetClosingCostsToDefaults = () => {
    setUserEditedClosingCosts(false);
    const price = parseNumericInput(buyPrice);
    setClosingCosts(calculateDynamicClosingCosts(price, propertyState));
  };

  const handleBack = () => {
    // Save current values back to wizard context before navigating
    updatePropertyData({
      arv: parseNumericInput(arv) || wizardData.property?.arv,
      rehabBudget: parseNumericInput(rehabBudget) || wizardData.property?.rehabBudget,
      purchasePrice: parseNumericInput(purchasePrice) || wizardData.property?.purchasePrice,
    });
    // Navigate back to Step 3 (Purchase & Renovation) where the user came from
    setLocation("/deal-analysis?returnToStep=3");
  };

  const result = transactionType === "assignment" ? assignmentResult : doubleCloseResult;

  // Memoize transfer tax rate lookup for display
  const transferTaxRateInfo = useMemo(() => {
    if (!propertyState) return null;
    const rate = getTransferTaxRate(propertyState);
    return rate ? { ratePercent: rate.ratePercent, stateName: rate.stateName } : null;
  }, [propertyState]);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-4"
          data-testid="button-back-to-wizard"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deal Analysis
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Wholesale Max Offer Calculator</h1>
        </div>
        <p className="text-muted-foreground">
          Calculate your maximum offer price to ensure profitability on wholesale deals.
        </p>
      </div>

      <div ref={targetRef}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Transaction Type
              </CardTitle>
              <CardDescription>
                Select how you plan to execute this wholesale deal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={transactionType}
                onValueChange={(value) => {
                  setTransactionType(value as "assignment" | "double-close");
                  setShowTransactionalLenders(false);
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="assignment" id="assignment" data-testid="radio-assignment" />
                  <Label htmlFor="assignment" className="cursor-pointer">Assignment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="double-close" id="double-close" data-testid="radio-double-close" />
                  <Label htmlFor="double-close" className="cursor-pointer">Double Close</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Deal Information
                </CardTitle>
                <CardDescription>
                  Enter the property and deal details
                </CardDescription>
              </div>
              <div className="space-y-1 min-w-[200px]">
                <Label htmlFor="buyPrice" className="flex items-center gap-1 text-sm">
                  Buy Price
                  <span className="text-xs font-normal text-muted-foreground">
                    ({buyPriceManuallySet ? "edited" : "auto"})
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Auto-populated from Max Offer Price. Edit this to calculate Transfer Tax and Title Insurance based on a different purchase price.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="relative">
                  {isPdfMode ? (
                    <PrintableInput 
                      value={buyPrice ? formatCurrency(parseNumericInput(buyPrice)) : "-"} 
                      isPdfMode={isPdfMode}
                      prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                    />
                  ) : (
                    <>
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="buyPrice"
                        type="text"
                        value={buyPrice}
                        onChange={(e) => {
                          setBuyPrice(e.target.value);
                          setBuyPriceManuallySet(true);
                        }}
                        className="pl-9 pr-9 border-primary/50 focus:border-primary"
                        placeholder="Enter buy price"
                        autoComplete="off"
                        data-testid="input-buy-price"
                      />
                      <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="arv">After Repair Value (ARV)</Label>
                  <div className="relative">
                    {isPdfMode ? (
                      <PrintableInput 
                        value={arv ? formatCurrency(parseNumericInput(arv)) : "-"} 
                        isPdfMode={isPdfMode}
                        prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                      />
                    ) : (
                      <>
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="arv"
                          type="text"
                          value={arv}
                          onChange={(e) => setArv(e.target.value)}
                          className="pl-9"
                          placeholder="300,000"
                          autoComplete="off"
                          data-testid="input-arv"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rehab">Estimated Rehab Budget</Label>
                  <div className="relative">
                    {isPdfMode ? (
                      <PrintableInput 
                        value={rehabBudget ? formatCurrency(parseNumericInput(rehabBudget)) : "-"} 
                        isPdfMode={isPdfMode}
                        prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                      />
                    ) : (
                      <>
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="rehab"
                          type="text"
                          value={rehabBudget}
                          onChange={(e) => setRehabBudget(e.target.value)}
                          className="pl-9"
                          placeholder="50,000"
                          autoComplete="off"
                          data-testid="input-rehab"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buyersMaxPercent">Buyer's Max Buy Price % of ARV</Label>
                  <div className="relative">
                    {isPdfMode ? (
                      <PrintableInput 
                        value={buyersMaxArvPercent ? `${buyersMaxArvPercent}%` : "-"} 
                        isPdfMode={isPdfMode}
                        prefix={<Percent className="h-4 w-4 text-muted-foreground shrink-0" />}
                      />
                    ) : (
                      <>
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="buyersMaxPercent"
                          type="text"
                          value={buyersMaxArvPercent}
                          onChange={(e) => setBuyersMaxArvPercent(e.target.value)}
                          className="pl-9"
                          placeholder="75"
                          autoComplete="off"
                          data-testid="input-buyers-max-percent"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="wholesaleFee">Your Wholesale Fee</Label>
                    {hasSavedWholesaleFee && !wholesaleFeeManuallyEdited && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-600" />
                        Saved
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    {isPdfMode ? (
                      <PrintableInput 
                        value={wholesaleFee ? formatCurrency(parseNumericInput(wholesaleFee)) : "-"} 
                        isPdfMode={isPdfMode}
                        prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                      />
                    ) : (
                      <>
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="wholesaleFee"
                          type="text"
                          value={wholesaleFee}
                          onChange={(e) => {
                            setWholesaleFee(e.target.value);
                            setWholesaleFeeManuallyEdited(true);
                          }}
                          className="pl-9"
                          placeholder="15,000"
                          autoComplete="off"
                          data-testid="input-wholesale-fee"
                        />
                      </>
                    )}
                  </div>
                  {/* Save to Profile option when value is manually edited */}
                  {isAuthenticated && wholesaleFeeManuallyEdited && !isPdfMode && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:text-primary/80"
                        onClick={() => {
                          const feeValue = parseNumericInput(wholesaleFee);
                          if (feeValue >= 0) {
                            saveWholesaleFeeMutation.mutate(feeValue);
                          }
                        }}
                        disabled={saveWholesaleFeeMutation.isPending}
                        data-testid="button-save-wholesale-fee"
                      >
                        {saveWholesaleFeeMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save to Profile
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {transactionType === "double-close" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Transaction 1 Closing Costs
                </CardTitle>
                <CardDescription>
                  Edit the estimated closing costs for your purchase transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="titleSearch">Title Search</Label>
                    <div className="relative">
                      {isPdfMode ? (
                        <PrintableInput 
                          value={formatCurrency(closingCosts.titleSearch)} 
                          isPdfMode={isPdfMode}
                          prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                        />
                      ) : (
                        <>
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="titleSearch"
                            type="text"
                            value={closingCosts.titleSearch.toString()}
                            onChange={(e) => updateClosingCost("titleSearch", e.target.value)}
                            className="pl-9"
                            data-testid="input-title-search"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="titleInsurance">Title Insurance</Label>
                    <div className="relative">
                      {isPdfMode ? (
                        <PrintableInput 
                          value={formatCurrency(closingCosts.titleInsurance)} 
                          isPdfMode={isPdfMode}
                          prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                        />
                      ) : (
                        <>
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="titleInsurance"
                            type="text"
                            value={closingCosts.titleInsurance.toString()}
                            onChange={(e) => updateClosingCost("titleInsurance", e.target.value)}
                            className="pl-9"
                            data-testid="input-title-insurance"
                          />
                        </>
                      )}
                    </div>
                    {!isPdfMode && <p className="text-xs text-muted-foreground">Auto-calculated at 1.2% of purchase price</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recordingFees">Recording Fees</Label>
                    <div className="relative">
                      {isPdfMode ? (
                        <PrintableInput 
                          value={formatCurrency(closingCosts.recordingFees)} 
                          isPdfMode={isPdfMode}
                          prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                        />
                      ) : (
                        <>
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="recordingFees"
                            type="text"
                            value={closingCosts.recordingFees.toString()}
                            onChange={(e) => updateClosingCost("recordingFees", e.target.value)}
                            className="pl-9"
                            data-testid="input-recording-fees"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transferTax" className="flex items-center gap-1">
                      Transfer Tax/Fee
                      {!isPdfMode && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-sm">
                              Transfer taxes vary by state and may be paid by buyer, seller, or split. 
                              This is auto-calculated based on state rates but can be edited.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <div className="relative">
                      {isPdfMode ? (
                        <PrintableInput 
                          value={formatCurrency(closingCosts.transferTax)} 
                          isPdfMode={isPdfMode}
                          prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                        />
                      ) : (
                        <>
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="transferTax"
                            type="text"
                            value={closingCosts.transferTax.toString()}
                            onChange={(e) => updateClosingCost("transferTax", e.target.value)}
                            className="pl-9"
                            data-testid="input-transfer-tax"
                          />
                        </>
                      )}
                    </div>
                    {!isPdfMode && transferTaxRateInfo && (
                      <p className="text-xs text-muted-foreground">
                        Auto-calculated at {transferTaxRateInfo.ratePercent}% for {transferTaxRateInfo.stateName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="attorneyFees">Attorney Fees</Label>
                    <div className="relative">
                      {isPdfMode ? (
                        <PrintableInput 
                          value={formatCurrency(closingCosts.attorneyFees)} 
                          isPdfMode={isPdfMode}
                          prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                        />
                      ) : (
                        <>
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="attorneyFees"
                            type="text"
                            value={closingCosts.attorneyFees.toString()}
                            onChange={(e) => updateClosingCost("attorneyFees", e.target.value)}
                            className="pl-9"
                            data-testid="input-attorney-fees"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otherFees">Other Fees</Label>
                    <div className="relative">
                      {isPdfMode ? (
                        <PrintableInput 
                          value={formatCurrency(closingCosts.otherFees)} 
                          isPdfMode={isPdfMode}
                          prefix={<DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}
                        />
                      ) : (
                        <>
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="otherFees"
                            type="text"
                            value={closingCosts.otherFees.toString()}
                            onChange={(e) => updateClosingCost("otherFees", e.target.value)}
                            className="pl-9"
                            data-testid="input-other-fees"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!hasResultsAccess ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Ready to Calculate?</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {hasRemainingQuota 
                        ? `You have ${usageData?.remainingWholesaleCalcs ?? 2} free calculations remaining this month.`
                        : "You've used all your free calculations this month."}
                    </p>
                  </div>
                  {hasRemainingQuota ? (
                    <Button 
                      size="lg" 
                      onClick={handleRunCalculation}
                      disabled={wholesaleCalcMutation.isPending}
                      data-testid="button-run-calculation"
                    >
                      {wholesaleCalcMutation.isPending ? "Processing..." : "Run Calculation"}
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={() => setShowQuotaModal(true)}
                      data-testid="button-upgrade-for-calculations"
                    >
                      Upgrade for Unlimited
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl">Calculation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Buyer's Max Price (ARV × {buyersMaxArvPercent}%)</span>
                    <span className="font-semibold" data-testid="text-buyers-max-price">
                      {formatCurrency(result.buyersMaxPrice)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Less: Rehab Budget</span>
                    <span className="font-semibold text-red-600" data-testid="text-less-rehab">
                      - {formatCurrency(wholesaleInputs.rehabBudget)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Less: Your Wholesale Fee</span>
                    <span className="font-semibold text-red-600" data-testid="text-less-wholesale-fee">
                      - {formatCurrency(wholesaleInputs.wholesaleFee)}
                    </span>
                  </div>

                  {transactionType === "double-close" && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Less: Closing Costs</span>
                      <span className="font-semibold text-red-600" data-testid="text-less-closing-costs">
                        - {formatCurrency(doubleCloseResult.totalClosingCosts)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center py-3">
                    <span className="text-lg font-semibold">Max Offer Price</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-max-offer-price">
                      {formatCurrency(result.maxOfferPrice)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasResultsAccess && profitabilityComparison && (
            <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Profitability Comparison
                    </CardTitle>
                    <CardDescription>
                      See how your negotiated buy price affects your wholesale profit
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetBuyPrice}
                    data-testid="button-reset-buy-price"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Recommended
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Original Plan
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Buy Price:</span>
                        <span className="font-medium" data-testid="text-original-buy-price">
                          {formatCurrency(profitabilityComparison.original.buyPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Wholesale Fee:</span>
                        <span className="font-semibold text-primary" data-testid="text-original-wholesale-fee">
                          {formatCurrency(profitabilityComparison.original.wholesaleFee)}
                        </span>
                      </div>
                      {profitabilityComparison.original.closingCosts !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Closing Costs:</span>
                          <span className="font-medium" data-testid="text-original-closing-costs">
                            {formatCurrency(profitabilityComparison.original.closingCosts)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-sm font-medium text-primary uppercase tracking-wide">
                      At Your Buy Price
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Buy Price:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" data-testid="text-adjusted-buy-price">
                            {formatCurrency(profitabilityComparison.adjusted.buyPrice)}
                          </span>
                          <span className={`text-xs flex items-center gap-0.5 ${profitabilityComparison.delta.buyPriceDiff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profitabilityComparison.delta.buyPriceDiff < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <TrendingUp className="h-3 w-3" />
                            )}
                            {formatCurrency(Math.abs(profitabilityComparison.delta.buyPriceDiff))}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Wholesale Fee:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-lg" data-testid="text-adjusted-wholesale-fee">
                            {formatCurrency(profitabilityComparison.adjusted.wholesaleFee)}
                          </span>
                          <span className={`text-xs flex items-center gap-0.5 font-semibold ${profitabilityComparison.delta.wholesaleFeeDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profitabilityComparison.delta.wholesaleFeeDiff > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {formatCurrency(Math.abs(profitabilityComparison.delta.wholesaleFeeDiff))}
                          </span>
                        </div>
                      </div>
                      {profitabilityComparison.adjusted.closingCosts !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Closing Costs:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium" data-testid="text-adjusted-closing-costs">
                              {formatCurrency(profitabilityComparison.adjusted.closingCosts)}
                            </span>
                            {profitabilityComparison.delta.closingCostsDiff !== undefined && (
                              <span className={`text-xs flex items-center gap-0.5 ${profitabilityComparison.delta.closingCostsDiff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profitabilityComparison.delta.closingCostsDiff < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <TrendingUp className="h-3 w-3" />
                                )}
                                {formatCurrency(Math.abs(profitabilityComparison.delta.closingCostsDiff))}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 rounded-lg bg-muted/30 text-center">
                  <span className="text-sm text-muted-foreground">
                    {profitabilityComparison.delta.wholesaleFeeDiff > 0 ? (
                      <>By negotiating a lower buy price, you'll earn <strong className="text-green-600">{formatCurrency(profitabilityComparison.delta.wholesaleFeeDiff)} more</strong> on this deal!</>
                    ) : profitabilityComparison.delta.wholesaleFeeDiff < 0 ? (
                      <>At this higher buy price, your profit decreases by <strong className="text-red-600">{formatCurrency(Math.abs(profitabilityComparison.delta.wholesaleFeeDiff))}</strong>.</>
                    ) : (
                      <>Your wholesale fee remains unchanged.</>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {hasResultsAccess && transactionType === "double-close" && !showTransactionalLenders && (
            <div className="flex justify-center">
              <Button 
                size="lg"
                onClick={() => setShowTransactionalLenders(true)}
                data-testid="button-find-transactional-lenders"
              >
                Find Transactional Lenders
              </Button>
            </div>
          )}

          {hasResultsAccess && transactionType === "double-close" && showTransactionalLenders && (
            <Card>
              <CardHeader>
                <CardTitle>Transactional Funding Lenders</CardTitle>
                <CardDescription>
                  Compare lenders who offer transactional funding for double close deals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLenders ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading transactional lenders...
                  </div>
                ) : transactionalLenderResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactional funding lenders available at this time.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {transactionalLenderResults.map((lender, index) => {
                      const originalLender = transactionalLendersData?.[index];
                      return (
                        <Card key={lender.lenderId} className="border-2 min-w-0">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg break-words">{lender.lenderName}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">Flat Fee:</span>
                              <span className="font-semibold text-right">{formatCurrency(lender.flatFee)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">Points:</span>
                              <span className="font-semibold text-right">{lender.totalPointsWithReferral.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">Points Cost:</span>
                              <span className="font-semibold text-right">{formatCurrency(lender.pointsCost)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground shrink-0">Total Lender Fees:</span>
                              <span className="font-semibold text-red-600 text-right">{formatCurrency(lender.totalLenderFees)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2 pt-2 bg-primary/5 -mx-6 px-6 py-3">
                              <span className="font-semibold shrink-0">Adjusted Max Offer:</span>
                              <span className="text-xl font-bold text-primary text-right" data-testid={`text-adjusted-max-offer-${index}`}>
                                {formatCurrency(lender.adjustedMaxOfferPrice)}
                              </span>
                            </div>
                            
                            {originalLender?.referralLink && (
                              <div className="flex flex-col items-center pt-4 gap-2">
                                <span className="text-sm text-muted-foreground">Scan to contact lender:</span>
                                <QRCodeSVG 
                                  value={originalLender.referralLink} 
                                  size={100}
                                  level="M"
                                />
                              </div>
                            )}
                            
                            {isAuthenticated && originalLender && (
                              <div className="flex justify-center pt-4 print:hidden">
                                <Button
                                  variant="outline"
                                  onClick={() => handleContactLender(originalLender)}
                                  data-testid={`button-contact-lender-${index}`}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Contact Lender
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {hasResultsAccess && transactionType === "double-close" && showTransactionalLenders && transactionalLenderResults.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf}
            disabled={isPdfMode}
            data-testid="button-download-pdf"
          >
            <Download className="mr-2 h-4 w-4" />
            {isPdfMode ? "Generating PDF..." : "Download PDF with QR Codes"}
          </Button>
        </div>
      )}

      <WholesaleQuotaModal
        open={showQuotaModal}
        onOpenChange={setShowQuotaModal}
        onGoBack={handleGoBackFromModal}
      />

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact {selectedLenderForContact?.lenderName}
            </DialogTitle>
            <DialogDescription>
              Send an inquiry about transactional funding for your wholesale deal.
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
                <li>Deal details (ARV, rehab budget, max offer)</li>
                <li>Transaction type and wholesale fee</li>
                <li>Selected lender product information</li>
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
