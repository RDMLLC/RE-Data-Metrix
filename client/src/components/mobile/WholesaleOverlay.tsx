import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  X,
  Calculator,
  DollarSign,
  Pencil,
  RotateCcw,
  Save,
  Check,
  Loader2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useWizardData } from "@/contexts/WizardDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import CollapsibleSection from "@/components/mobile/CollapsibleSection";
import {
  calculateAssignmentMaxOffer,
  calculateDoubleCloseMaxOffer,
  calculateDoubleCloseMaxOfferOwnCash,
  calculateDynamicClosingCosts,
  calculateWholesaleFeeFromBuyPrice,
  calculateDoubleCloseWholesaleFeeFromBuyPrice,
  calculateLenderFee,
  type WholesaleInputs,
  type DoubleCloseClosingCosts,
} from "@shared/calculations/wholesale-calculations";
import { getTransferTaxRate } from "@shared/data/transferTaxRates";
import { usePDF } from "react-to-pdf";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

interface WholesaleOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseNumericInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const STRAIGHTLINE_BASE_URL =
  "https://forms.straightlinefunding.com/straightlinefunding/form/TransactionalFundingSubmissionFormREDataMetrix/formperma/mHsvTfwLV7T8fYveRFzlpbECm1HeV3cMWA7cRoGCTRU";

export default function WholesaleOverlay({ isOpen, onClose }: WholesaleOverlayProps) {
  const { wizardData, updatePropertyData } = useWizardData();
  const { isAuthenticated, isSubscriber, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [transactionType, setTransactionType] = useState<"assignment" | "double-close">("assignment");
  const [fundingSource, setFundingSource] = useState<"transactional" | "own-cash">("transactional");

  const [arv, setArv] = useState<string>("");
  const [rehabBudget, setRehabBudget] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [propertyState, setPropertyState] = useState<string>("");
  const [buyersMaxArvPercent, setBuyersMaxArvPercent] = useState<string>("75");
  const [wholesaleFee, setWholesaleFee] = useState<string>("15000");
  const [wholesaleFeeManuallyEdited, setWholesaleFeeManuallyEdited] = useState(false);
  const [hasSavedWholesaleFee, setHasSavedWholesaleFee] = useState(false);

  const [buyPrice, setBuyPrice] = useState<string>("");
  const [buyPriceManuallySet, setBuyPriceManuallySet] = useState(false);

  const [closingCosts, setClosingCosts] = useState<DoubleCloseClosingCosts>(() =>
    calculateDynamicClosingCosts(0, "")
  );
  const [userEditedClosingCosts, setUserEditedClosingCosts] = useState(false);
  const [closingCostsInitialized, setClosingCostsInitialized] = useState(false);
  const wasOpenRef = useRef(false);

  const [isPdfMode, setIsPdfMode] = useState(false);
  const { toPDF, targetRef } = usePDF({
    filename: "wholesale-deal-analysis.pdf",
    page: { format: "letter", margin: 20 },
    canvas: { qualityRatio: 1 },
  });

  // Reset & re-hydrate ONLY on open transition (not on wizardData changes while open)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const p = wizardData.property;
      setTransactionType("assignment");
      setFundingSource("transactional");
      setBuyersMaxArvPercent("75");
      setWholesaleFee("15000");
      setWholesaleFeeManuallyEdited(false);
      setHasSavedWholesaleFee(false);
      setUserEditedClosingCosts(false);
      setClosingCostsInitialized(false);
      setBuyPriceManuallySet(false);
      setArv(p?.arv != null ? p.arv.toString() : "");
      setRehabBudget(p?.rehabBudget != null ? p.rehabBudget.toString() : "");
      setPropertyState(p?.state ?? "");
      if (p?.purchasePrice != null) {
        const priceStr = p.purchasePrice.toString();
        setPurchasePrice(priceStr);
        setBuyPrice(priceStr);
        setBuyPriceManuallySet(true);
      } else {
        setPurchasePrice("");
        setBuyPrice("");
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, wizardData]);

  // Free-user quota
  const { data: usageData } = useQuery<{
    isSubscriber: boolean;
    wholesaleCalcCount: number;
    remainingWholesaleCalcs: number;
  }>({
    queryKey: ["/api/user/usage"],
    enabled: isOpen && isAuthenticated && !isSubscriber,
  });

  // Saved wholesale fee
  const { data: wholesaleFeeData } = useQuery<{
    hasSavedFee: boolean;
    defaultWholesaleFee: number | null;
  }>({
    queryKey: ["/api/profile/wholesale-fee"],
    enabled: isOpen && isAuthenticated,
  });

  useEffect(() => {
    if (
      wholesaleFeeData?.hasSavedFee &&
      wholesaleFeeData.defaultWholesaleFee != null &&
      !wholesaleFeeManuallyEdited
    ) {
      setWholesaleFee(wholesaleFeeData.defaultWholesaleFee.toString());
      setHasSavedWholesaleFee(true);
    }
  }, [wholesaleFeeData, wholesaleFeeManuallyEdited]);

  const saveWholesaleFeeMutation = useMutation({
    mutationFn: async (fee: number) => {
      const response = await apiRequest("PUT", "/api/profile/wholesale-fee", {
        defaultWholesaleFee: fee,
      });
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

  const wholesaleCalcMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/wholesale-calc", {
        address: wizardData.property?.address || "",
        city: wizardData.property?.city || "",
        state: wizardData.property?.state || "",
        zip: wizardData.property?.zip || "",
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data?.canCalculate) {
        updatePropertyData({ wholesaleUnlocked: true });
        queryClient.invalidateQueries({ queryKey: ["/api/user/usage"] });
      }
    },
    onError: () => {},
  });

  const hasRemainingQuota =
    !usageData || (usageData.remainingWholesaleCalcs ?? 2) > 0;

  const wholesaleInputs: WholesaleInputs = useMemo(
    () => ({
      arv: parseNumericInput(arv),
      rehabBudget: parseNumericInput(rehabBudget),
      buyersMaxArvPercent: parseNumericInput(buyersMaxArvPercent),
      wholesaleFee: parseNumericInput(wholesaleFee),
    }),
    [arv, rehabBudget, buyersMaxArvPercent, wholesaleFee]
  );

  const assignmentResult = useMemo(
    () => calculateAssignmentMaxOffer(wholesaleInputs),
    [wholesaleInputs]
  );

  const doubleCloseResult = useMemo(
    () =>
      fundingSource === "own-cash"
        ? calculateDoubleCloseMaxOfferOwnCash(wholesaleInputs, closingCosts)
        : calculateDoubleCloseMaxOffer(wholesaleInputs, closingCosts),
    [wholesaleInputs, closingCosts, fundingSource]
  );

  const currentMaxOfferPrice =
    transactionType === "assignment"
      ? assignmentResult.maxOfferPrice
      : doubleCloseResult.maxOfferPrice;

  // Auto-populate buyPrice from Max Offer when not manually set
  useEffect(() => {
    if (!buyPriceManuallySet && currentMaxOfferPrice > 0) {
      setBuyPrice(Math.round(currentMaxOfferPrice).toString());
    }
  }, [currentMaxOfferPrice, buyPriceManuallySet]);

  // Recompute dynamic closing costs
  useEffect(() => {
    const price = parseNumericInput(buyPrice);
    if (price > 0 && !userEditedClosingCosts) {
      if (!closingCostsInitialized || !buyPriceManuallySet) {
        setClosingCosts(calculateDynamicClosingCosts(price, propertyState));
        setClosingCostsInitialized(true);
      }
    }
  }, [
    buyPrice,
    propertyState,
    userEditedClosingCosts,
    buyPriceManuallySet,
    closingCostsInitialized,
  ]);

  const profitabilityComparison = useMemo(() => {
    const currentBuyPrice = parseNumericInput(buyPrice);
    const originalMaxOffer =
      transactionType === "assignment"
        ? assignmentResult.maxOfferPrice
        : doubleCloseResult.maxOfferPrice;
    const hasDifference =
      buyPriceManuallySet && Math.abs(currentBuyPrice - originalMaxOffer) > 0.01;
    if (!hasDifference) return null;

    const reverseInputs = {
      arv: parseNumericInput(arv),
      rehabBudget: parseNumericInput(rehabBudget),
      buyersMaxArvPercent: parseNumericInput(buyersMaxArvPercent),
      buyPrice: currentBuyPrice,
    };

    let adjustedWholesaleFee: number;
    let adjustedClosingCosts: number | undefined;
    let adjustedLenderFee: number | undefined;

    if (transactionType === "assignment") {
      adjustedWholesaleFee =
        calculateWholesaleFeeFromBuyPrice(reverseInputs).calculatedWholesaleFee;
    } else {
      const adjustedCosts: DoubleCloseClosingCosts = userEditedClosingCosts
        ? closingCosts
        : calculateDynamicClosingCosts(currentBuyPrice, propertyState);
      const reverseResult = calculateDoubleCloseWholesaleFeeFromBuyPrice(
        reverseInputs,
        adjustedCosts,
        fundingSource
      );
      adjustedWholesaleFee = reverseResult.calculatedWholesaleFee;
      adjustedClosingCosts = reverseResult.totalClosingCosts;
      adjustedLenderFee = reverseResult.lenderFee;
    }

    const originalWholesaleFee = parseNumericInput(wholesaleFee);
    const originalClosingCosts =
      transactionType === "double-close" ? doubleCloseResult.totalClosingCosts : undefined;
    const originalLenderFee =
      transactionType === "double-close" ? doubleCloseResult.lenderFee : undefined;

    return {
      original: {
        buyPrice: originalMaxOffer,
        wholesaleFee: originalWholesaleFee,
        closingCosts: originalClosingCosts,
        lenderFee: originalLenderFee,
      },
      adjusted: {
        buyPrice: currentBuyPrice,
        wholesaleFee: adjustedWholesaleFee,
        closingCosts: adjustedClosingCosts,
        lenderFee: adjustedLenderFee,
      },
      delta: {
        buyPriceDiff: currentBuyPrice - originalMaxOffer,
        wholesaleFeeDiff: adjustedWholesaleFee - originalWholesaleFee,
        closingCostsDiff:
          adjustedClosingCosts !== undefined && originalClosingCosts !== undefined
            ? adjustedClosingCosts - originalClosingCosts
            : undefined,
        lenderFeeDiff:
          adjustedLenderFee !== undefined && originalLenderFee !== undefined
            ? adjustedLenderFee - originalLenderFee
            : undefined,
      },
    };
  }, [
    buyPrice,
    buyPriceManuallySet,
    arv,
    rehabBudget,
    buyersMaxArvPercent,
    wholesaleFee,
    transactionType,
    assignmentResult,
    doubleCloseResult,
    propertyState,
    closingCosts,
    userEditedClosingCosts,
    fundingSource,
  ]);

  const transferTaxRateInfo = useMemo(() => {
    if (!propertyState) return null;
    const rate = getTransferTaxRate(propertyState);
    return rate ? { ratePercent: rate.ratePercent, stateName: rate.stateName } : null;
  }, [propertyState]);

  const handleResetBuyPrice = () => {
    const maxOffer =
      transactionType === "assignment"
        ? assignmentResult.maxOfferPrice
        : doubleCloseResult.maxOfferPrice;
    setBuyPrice(Math.round(maxOffer).toString());
    setBuyPriceManuallySet(false);
    if (!userEditedClosingCosts) {
      setClosingCosts(calculateDynamicClosingCosts(maxOffer, propertyState));
      setClosingCostsInitialized(true);
    }
  };

  const updateClosingCost = (field: keyof DoubleCloseClosingCosts, value: string) => {
    setUserEditedClosingCosts(true);
    setClosingCosts((prev) => ({ ...prev, [field]: parseNumericInput(value) }));
  };

  const resetClosingCostsToDefaults = () => {
    setUserEditedClosingCosts(false);
    const price = parseNumericInput(buyPrice);
    setClosingCosts(calculateDynamicClosingCosts(price, propertyState));
  };

  const handleRunCalculation = () => {
    if (!isAuthenticated || isSubscriber) return;
    wholesaleCalcMutation.mutate();
  };

  const handleDownloadPdf = async () => {
    setIsPdfMode(true);
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      await toPDF();
    } finally {
      setIsPdfMode(false);
    }
  };

  const handleApplyValues = () => {
    const arvValue = parseNumericInput(arv);
    const maxPercent = parseNumericInput(buyersMaxArvPercent) / 100;
    const rehabValue = parseNumericInput(rehabBudget);
    const calculatedResalePrice = arvValue * maxPercent - rehabValue;
    const finalBuyPrice = parseNumericInput(buyPrice) || parseNumericInput(purchasePrice);

    updatePropertyData({
      arv: arvValue || wizardData.property?.arv,
      rehabBudget: rehabValue || wizardData.property?.rehabBudget,
      purchasePrice: finalBuyPrice || wizardData.property?.purchasePrice,
      wholesaleTransactionType: transactionType,
      wholesaleFee: parseNumericInput(wholesaleFee),
      resalePrice: calculatedResalePrice > 0 ? calculatedResalePrice : undefined,
    });

    toast({
      title: "Values Applied",
      description: `Buy Price: ${formatCurrency(finalBuyPrice)} • Wholesale Fee: ${formatCurrency(parseNumericInput(wholesaleFee))}`,
    });
    onClose();
  };

  const buildStraightlineUrl = (): string => {
    const params = new URLSearchParams();
    const roundToNearest50 = (value: number) => Math.round(value / 50) * 50;
    const atoBPrice = roundToNearest50(parseNumericInput(buyPrice));
    if (atoBPrice > 0) params.set("Currency", atoBPrice.toString());
    const arvValue = parseNumericInput(arv);
    const maxPercent = parseNumericInput(buyersMaxArvPercent) / 100;
    const rehabValue = parseNumericInput(rehabBudget);
    const bToCPrice = roundToNearest50(arvValue * maxPercent - rehabValue);
    if (bToCPrice > 0) params.set("Currency1", bToCPrice.toString());
    if (wizardData.property?.address) params.set("Address1_AddressLine1", wizardData.property.address);
    if (wizardData.property?.city) params.set("Address1_City", wizardData.property.city);
    if (wizardData.property?.state) params.set("Address1_Region", wizardData.property.state);
    if (wizardData.property?.zip) params.set("Address1_ZipCode", wizardData.property.zip);
    if (user?.profile?.street) params.set("Address_AddressLine1", user.profile.street);
    if (user?.profile?.city) params.set("Address_City", user.profile.city);
    if (user?.profile?.state) params.set("Address_Region", user.profile.state);
    if (user?.profile?.zipCode) params.set("Address_ZipCode", user.profile.zipCode);
    if (user?.profile?.fullName) {
      const parts = user.profile.fullName.split(" ");
      params.set("Name_First", parts[0] || "");
      params.set("Name_Last", parts.slice(1).join(" ") || "");
    }
    if (user?.email) params.set("Email", user.email);
    if (user?.profile?.phone) params.set("PhoneNumber_countrycode", user.profile.phone);
    const qs = params.toString();
    return qs ? `${STRAIGHTLINE_BASE_URL}?${qs}` : STRAIGHTLINE_BASE_URL;
  };

  const handleApplyForFunding = () => {
    updatePropertyData({ appliedForStraightline: true });
    window.open(buildStraightlineUrl(), "_blank", "noopener,noreferrer");
  };

  if (!isOpen) return null;

  const result = transactionType === "assignment" ? assignmentResult : doubleCloseResult;
  const buyPriceNum = parseNumericInput(buyPrice);

  return (
    <div
      className="mobile-overlay fixed inset-0 bg-background z-[10001] flex flex-col"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="Wholesale Max Offer Calculator"
      data-testid="overlay-wholesale"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <img src={logoImg} alt="RE Data Metrix" className="h-10 w-10 shrink-0" />
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <Calculator className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-base font-semibold truncate">Wholesale Max Offer</h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          data-testid="button-wholesale-overlay-close"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div ref={targetRef} className="px-4 py-4 space-y-4">
          {/* Section 1: Transaction Type */}
          <div className="rounded-md border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Transaction Type</h3>
            <RadioGroup
              value={transactionType}
              onValueChange={(v) => setTransactionType(v as "assignment" | "double-close")}
              className="flex gap-4"
              data-testid="radio-wo-transaction-type"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assignment" id="wo-assignment" data-testid="radio-wo-assignment" />
                <Label htmlFor="wo-assignment" className="cursor-pointer text-sm">Assignment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="double-close" id="wo-double-close" data-testid="radio-wo-double-close" />
                <Label htmlFor="wo-double-close" className="cursor-pointer text-sm">Double Close</Label>
              </div>
            </RadioGroup>

            {transactionType === "double-close" && (
              <div className="pt-3 border-t border-border">
                <Label className="text-xs font-medium mb-2 block">Funding Source</Label>
                <RadioGroup
                  value={fundingSource}
                  onValueChange={(v) => setFundingSource(v as "transactional" | "own-cash")}
                  className="flex flex-col gap-2"
                  data-testid="radio-wo-funding-source"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transactional" id="wo-transactional" data-testid="radio-wo-transactional" />
                    <Label htmlFor="wo-transactional" className="cursor-pointer text-sm">
                      Transactional Funding
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="own-cash" id="wo-own-cash" data-testid="radio-wo-own-cash" />
                    <Label htmlFor="wo-own-cash" className="cursor-pointer text-sm">
                      Own Cash
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-2">
                  {fundingSource === "own-cash"
                    ? "No lender fees — only closing costs apply"
                    : "Includes 1.25% lender fee (min $1,000)"}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Deal Information */}
          <div className="rounded-md border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Deal Information</h3>

            {/* Buy Price (full width) */}
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="wo-buy-price" className="text-sm font-medium m-0 max-w-[45%]">
                Buy Price
                <span className="block text-[10px] font-normal text-muted-foreground">
                  ({buyPriceManuallySet ? "edited" : "auto"})
                </span>
              </Label>
              <div className="w-[52%] relative">
                <Input
                  id="wo-buy-price"
                  type="number"
                  inputMode="numeric"
                  value={buyPrice}
                  onChange={(e) => {
                    setBuyPrice(e.target.value);
                    setBuyPriceManuallySet(true);
                  }}
                  className="w-full text-right pr-8"
                  placeholder="0"
                  data-testid="input-wo-buy-price"
                  disabled={isPdfMode}
                />
                <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="wo-arv" className="text-xs font-medium">ARV</Label>
                <Input
                  id="wo-arv"
                  type="number"
                  inputMode="numeric"
                  value={arv}
                  onChange={(e) => setArv(e.target.value)}
                  className="w-full text-right"
                  placeholder="0"
                  data-testid="input-wo-arv"
                  disabled={isPdfMode}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wo-rehab" className="text-xs font-medium">Rehab Budget</Label>
                <Input
                  id="wo-rehab"
                  type="number"
                  inputMode="numeric"
                  value={rehabBudget}
                  onChange={(e) => setRehabBudget(e.target.value)}
                  className="w-full text-right"
                  placeholder="0"
                  data-testid="input-wo-rehab"
                  disabled={isPdfMode}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wo-max-pct" className="text-xs font-medium">Buyer's Max % of ARV</Label>
                <Input
                  id="wo-max-pct"
                  type="number"
                  inputMode="numeric"
                  value={buyersMaxArvPercent}
                  onChange={(e) => setBuyersMaxArvPercent(e.target.value)}
                  className="w-full text-right"
                  placeholder="75"
                  data-testid="input-wo-max-pct"
                  disabled={isPdfMode}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wo-fee" className="text-xs font-medium">Your Fee</Label>
                  {hasSavedWholesaleFee && !wholesaleFeeManuallyEdited && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Check className="h-2.5 w-2.5 text-green-600" />
                      Saved
                    </span>
                  )}
                </div>
                <Input
                  id="wo-fee"
                  type="number"
                  inputMode="numeric"
                  value={wholesaleFee}
                  onChange={(e) => {
                    setWholesaleFee(e.target.value);
                    setWholesaleFeeManuallyEdited(true);
                  }}
                  className="w-full text-right"
                  placeholder="15000"
                  data-testid="input-wo-fee"
                  disabled={isPdfMode}
                />
              </div>
            </div>

            {isAuthenticated && wholesaleFeeManuallyEdited && !isPdfMode && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-primary"
                onClick={() => {
                  const feeValue = parseNumericInput(wholesaleFee);
                  if (feeValue >= 0) saveWholesaleFeeMutation.mutate(feeValue);
                }}
                disabled={saveWholesaleFeeMutation.isPending}
                data-testid="button-wo-save-fee"
              >
                {saveWholesaleFeeMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save to Profile
              </Button>
            )}
          </div>

          {/* Section 3: Transaction 1 Closing Costs (Double Close only) */}
          {transactionType === "double-close" && (
            <div className="rounded-md border border-border overflow-hidden">
              <CollapsibleSection
                title="Transaction 1 Closing Costs"
                defaultOpen={false}
                headerAction={
                  userEditedClosingCosts && !isPdfMode ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={resetClosingCostsToDefaults}
                      data-testid="button-wo-reset-closing"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  ) : undefined
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "titleSearch" as const, label: "Title Search" },
                    { key: "titleInsurance" as const, label: "Title Insurance", hint: "1.2% of buy price" },
                    { key: "recordingFees" as const, label: "Recording Fees" },
                    {
                      key: "transferTax" as const,
                      label: "Transfer Tax",
                      hint: transferTaxRateInfo
                        ? `${transferTaxRateInfo.ratePercent}% (${transferTaxRateInfo.stateName})`
                        : undefined,
                    },
                    { key: "attorneyFees" as const, label: "Attorney Fees" },
                    { key: "otherFees" as const, label: "Other Fees" },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={`wo-cc-${key}`} className="text-xs font-medium">
                        {label}
                      </Label>
                      <Input
                        id={`wo-cc-${key}`}
                        type="number"
                        inputMode="numeric"
                        value={closingCosts[key].toString()}
                        onChange={(e) => updateClosingCost(key, e.target.value)}
                        className="w-full text-right"
                        data-testid={`input-wo-cc-${key}`}
                        disabled={isPdfMode}
                      />
                      {hint && (
                        <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Section 4: Calculation Results */}
          <div className="rounded-md border border-border p-4 space-y-3 bg-primary/5">
            <h3 className="text-sm font-semibold">Calculation Results</h3>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">
                  Buyer's Max Price (ARV × {buyersMaxArvPercent || 0}%)
                </span>
                <span className="font-semibold" data-testid="text-wo-buyers-max-price">
                  {formatCurrency(result.buyersMaxPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Less: Rehab Budget</span>
                <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-wo-less-rehab">
                  − {formatCurrency(wholesaleInputs.rehabBudget)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Less: Wholesale Fee</span>
                <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-wo-less-fee">
                  − {formatCurrency(wholesaleInputs.wholesaleFee)}
                </span>
              </div>
              {transactionType === "double-close" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Less: Closing Costs</span>
                    <span
                      className="font-semibold text-red-600 dark:text-red-400"
                      data-testid="text-wo-less-closing"
                    >
                      − {formatCurrency(doubleCloseResult.totalClosingCosts)}
                    </span>
                  </div>
                  {fundingSource === "transactional" ? (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">Less: Lender Fee (1.25%)</span>
                      <span
                        className="font-semibold text-red-600 dark:text-red-400"
                        data-testid="text-wo-less-lender"
                      >
                        − {formatCurrency(doubleCloseResult.lenderFee)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">Lender Fee</span>
                      <span
                        className="font-semibold text-green-600 dark:text-green-400"
                        data-testid="text-wo-no-lender"
                      >
                        $0 (Own Cash)
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Max Offer Price</div>
              <div
                className="p-3 bg-primary/10 border-2 border-primary rounded-md text-xl font-bold text-primary text-center"
                data-testid="text-wo-max-offer-price"
              >
                {formatCurrency(result.maxOfferPrice)}
              </div>
            </div>

            {isAuthenticated && !isSubscriber && !isPdfMode && (
              <div className="flex flex-col items-center gap-1.5 pt-1" data-testid="section-wo-quota">
                <Button
                  size="sm"
                  onClick={handleRunCalculation}
                  disabled={!hasRemainingQuota || wholesaleCalcMutation.isPending}
                  data-testid="button-wo-run-calc"
                >
                  {wholesaleCalcMutation.isPending ? "Processing..." : "Run Calculation"}
                </Button>
                <p
                  className={`text-xs text-center ${!hasRemainingQuota ? "text-destructive font-medium" : "text-muted-foreground"}`}
                  data-testid="text-wo-quota"
                >
                  {2 - (usageData?.remainingWholesaleCalcs ?? 2)} of 2 wholesale calculations used this month
                  {!hasRemainingQuota && (
                    <>
                      {" "}
                      <Link href="/pricing" className="underline">Upgrade</Link>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Section 5: Profitability Comparison (conditional) */}
          {profitabilityComparison && (
            <div className="rounded-md border-2 border-primary/30 overflow-hidden">
              <CollapsibleSection
                title="Profitability Comparison"
                defaultOpen={true}
                headerAction={
                  !isPdfMode ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleResetBuyPrice}
                      data-testid="button-wo-reset-buy-price"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  ) : undefined
                }
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted/50 p-2 space-y-1.5 min-w-0 overflow-hidden">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase">
                        Recommended
                      </div>
                      <Row label="Buy Price" value={profitabilityComparison.original.buyPrice} />
                      <Row
                        label="Wholesale Fee"
                        value={profitabilityComparison.original.wholesaleFee}
                        valueClass="text-primary font-semibold"
                      />
                      {profitabilityComparison.original.closingCosts !== undefined && (
                        <Row label="Closing" value={profitabilityComparison.original.closingCosts} />
                      )}
                      {profitabilityComparison.original.lenderFee !== undefined && (
                        <Row label="Lender Fee" value={profitabilityComparison.original.lenderFee} />
                      )}
                    </div>
                    <div className="rounded-md bg-primary/10 border border-primary/20 p-2 space-y-1.5 min-w-0 overflow-hidden">
                      <div className="text-[10px] font-medium text-primary uppercase">Your Offer</div>
                      <RowWithDelta
                        label="Buy Price"
                        value={profitabilityComparison.adjusted.buyPrice}
                        delta={profitabilityComparison.delta.buyPriceDiff}
                        positiveIsGood={false}
                      />
                      <RowWithDelta
                        label="Wholesale Fee"
                        value={profitabilityComparison.adjusted.wholesaleFee}
                        delta={profitabilityComparison.delta.wholesaleFeeDiff}
                        positiveIsGood={true}
                        valueClass="text-primary font-bold"
                      />
                      {profitabilityComparison.adjusted.closingCosts !== undefined && (
                        <RowWithDelta
                          label="Closing"
                          value={profitabilityComparison.adjusted.closingCosts}
                          delta={profitabilityComparison.delta.closingCostsDiff}
                          positiveIsGood={false}
                        />
                      )}
                      {profitabilityComparison.adjusted.lenderFee !== undefined && (
                        <RowWithDelta
                          label="Lender Fee"
                          value={profitabilityComparison.adjusted.lenderFee}
                          delta={profitabilityComparison.delta.lenderFeeDiff}
                          positiveIsGood={false}
                        />
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded-md bg-muted/30 text-center text-xs">
                    {profitabilityComparison.delta.wholesaleFeeDiff > 0 ? (
                      <>
                        By negotiating a lower buy price, you'll earn{" "}
                        <strong className="text-green-600 dark:text-green-400">
                          {formatCurrency(profitabilityComparison.delta.wholesaleFeeDiff)} more
                        </strong>
                        .
                      </>
                    ) : profitabilityComparison.delta.wholesaleFeeDiff < 0 ? (
                      <>
                        At this higher buy price, your profit decreases by{" "}
                        <strong className="text-red-600 dark:text-red-400">
                          {formatCurrency(Math.abs(profitabilityComparison.delta.wholesaleFeeDiff))}
                        </strong>
                        .
                      </>
                    ) : (
                      <>Your wholesale fee is unchanged.</>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Section 6: Apply for Transactional Funding (Double Close only) */}
          {transactionType === "double-close" && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Apply for Transactional Funding
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get funded quickly through Straightline Funding
                </p>
              </div>

              {(() => {
                const purchase = buyPriceNum;
                const totalClosingCosts = doubleCloseResult.totalClosingCosts;
                const fundedAmount = purchase + totalClosingCosts;
                const lenderFee = calculateLenderFee(purchase);
                const payoffAmount = fundedAmount + lenderFee;
                return (
                  <div className="bg-background rounded-md border border-border p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-sm mb-1">Estimated Costs</div>
                    <Row label="Purchase Price (A→B)" value={purchase} small />
                    <Row label="Closing Costs" value={totalClosingCosts} small />
                    <div className="border-t border-border pt-1.5">
                      <Row label="Funded Amount" value={fundedAmount} small bold />
                    </div>
                    <Row label="Lender Fee (1.25%)" value={lenderFee} small valueClass="text-red-600 dark:text-red-400" />
                    <div className="border-t border-border pt-1.5">
                      <Row label="Payoff Amount" value={payoffAmount} small bold valueClass="text-primary" />
                    </div>
                  </div>
                );
              })()}

              <Button
                type="button"
                className="w-full min-h-11 gap-1.5"
                onClick={handleApplyForFunding}
                data-testid="button-wo-apply-funding"
              >
                <ExternalLink className="h-4 w-4" />
                Apply for Transactional Funding
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Opens Straightline Funding application in a new tab.
              </p>
            </div>
          )}

          {/* Section 7: Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              type="button"
              className="w-full min-h-11"
              onClick={handleApplyValues}
              data-testid="button-wo-apply-values"
            >
              Use This Offer Price
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-11 gap-1.5"
              onClick={handleDownloadPdf}
              disabled={isPdfMode}
              data-testid="button-wo-download-pdf"
            >
              {isPdfMode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isPdfMode ? "Generating PDF..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  small,
  bold,
  valueClass,
}: {
  label: string;
  value: number;
  small?: boolean;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className={`text-muted-foreground ${small ? "text-xs" : "text-sm"}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${small ? "text-xs" : "text-sm"} ${valueClass ?? ""}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function RowWithDelta({
  label,
  value,
  delta,
  positiveIsGood,
  valueClass,
}: {
  label: string;
  value: number;
  delta?: number;
  positiveIsGood: boolean;
  valueClass?: string;
}) {
  const hasDelta = delta !== undefined && delta !== 0;
  const isGood = hasDelta && delta !== undefined && (positiveIsGood ? delta > 0 : delta < 0);
  return (
    <div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
        <span className={`text-xs break-words ${valueClass ?? "font-medium"}`}>
          {formatCurrency(value)}
        </span>
        {hasDelta && delta !== undefined && (
          <span
            className={`text-[10px] inline-flex items-center gap-0.5 break-words ${
              isGood ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {delta > 0 ? (
              <TrendingUp className="h-2.5 w-2.5 shrink-0" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5 shrink-0" />
            )}
            {formatCurrency(Math.abs(delta))}
          </span>
        )}
      </div>
    </div>
  );
}
