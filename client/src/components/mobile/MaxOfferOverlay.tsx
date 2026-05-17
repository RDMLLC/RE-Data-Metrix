import { useEffect, useState } from "react";
import { X, Lightbulb, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

interface MaxOfferOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialArv: number;
  initialRehabBudget: number;
  onApply: (values: { purchasePrice: number; arv: number; rehabBudget: number }) => void;
  onOpenArvHelper: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MaxOfferOverlay({
  isOpen,
  onClose,
  initialArv,
  initialRehabBudget,
  onApply,
  onOpenArvHelper,
}: MaxOfferOverlayProps) {
  const { toast } = useToast();
  const [calcArv, setCalcArv] = useState<number>(initialArv || 0);
  const [calcRehabBudget, setCalcRehabBudget] = useState<number>(initialRehabBudget || 0);
  const [maxArvPercent, setMaxArvPercent] = useState<number>(70);
  const [ruleExpanded, setRuleExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCalcArv(initialArv || 0);
      setCalcRehabBudget(initialRehabBudget || 0);
      setMaxArvPercent(70);
      setRuleExpanded(false);
    }
  }, [isOpen, initialArv, initialRehabBudget]);

  if (!isOpen) return null;

  const maxProjectCost = calcArv * (maxArvPercent / 100);
  const maxOfferPrice = Math.round(Math.max(0, maxProjectCost - calcRehabBudget));

  const handleApply = () => {
    onApply({
      purchasePrice: maxOfferPrice,
      arv: calcArv,
      rehabBudget: calcRehabBudget,
    });
    toast({
      title: "Values Applied",
      description: `Purchase: ${formatCurrency(maxOfferPrice)}, ARV: ${formatCurrency(calcArv)}, Rehab: ${formatCurrency(calcRehabBudget)}`,
    });
    onClose();
  };

  return (
    <div
      className="mobile-overlay fixed inset-0 bg-background z-[10001] flex flex-col"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="Max Offer Calculator"
      data-testid="overlay-max-offer"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <img src={logoImg} alt="RE Data Metrix" className="h-10 w-10 shrink-0" />
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <Lightbulb className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-base font-semibold truncate">Max Offer Calculator</h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          data-testid="button-max-offer-overlay-close"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        <div className="rounded-md border border-border p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Help Determine Max Offer Price</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Calculate your maximum purchase price based on ARV percentage and rehab costs
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="mo-arv" className="text-sm font-medium m-0 max-w-[45%]">
                ARV
              </Label>
              <div className="w-[52%]">
                <Input
                  id="mo-arv"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={calcArv || ""}
                  onChange={(e) => setCalcArv(parseFloat(e.target.value) || 0)}
                  placeholder="Enter ARV"
                  className="w-full text-right"
                  data-testid="input-mo-arv"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mo-rehab" className="text-xs font-medium">
                  Rehab Budget
                </Label>
                <Input
                  id="mo-rehab"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={calcRehabBudget || ""}
                  onChange={(e) => setCalcRehabBudget(parseFloat(e.target.value) || 0)}
                  placeholder="Enter rehab"
                  className="w-full text-right"
                  data-testid="input-mo-rehab"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mo-pct" className="text-xs font-medium">
                  Max % of ARV
                </Label>
                <Input
                  id="mo-pct"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100"
                  step="1"
                  value={maxArvPercent}
                  onChange={(e) => setMaxArvPercent(parseFloat(e.target.value) || 70)}
                  className="w-full text-right"
                  data-testid="input-mo-pct"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setRuleExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground min-h-8 cursor-pointer"
              aria-expanded={ruleExpanded}
              data-testid="button-mo-rule-toggle"
            >
              {ruleExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>What is the 70% rule?</span>
            </button>
            {ruleExpanded && (
              <p className="text-xs text-muted-foreground mt-1">
                The 70% rule is common for fix &amp; flip. Your total project cost (purchase +
                rehab) should not exceed this percentage of ARV.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Max Project Cost</span>
            <span
              className="text-base font-semibold"
              data-testid="text-mo-max-project-cost"
            >
              {formatCurrency(maxProjectCost)}
            </span>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Max Offer / Purchase Price
            </div>
            <div
              className="p-3 bg-primary/10 border-2 border-primary rounded-md text-xl font-bold text-primary text-center"
              data-testid="text-mo-max-offer-price"
            >
              {formatCurrency(maxOfferPrice)}
            </div>
          </div>
        </div>

        <Button
          type="button"
          className="w-full min-h-11"
          onClick={handleApply}
          disabled={maxOfferPrice <= 0}
          data-testid="button-mo-use-offer"
        >
          Use This Offer Price
        </Button>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              onOpenArvHelper();
            }}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-primary min-h-11"
            data-testid="button-mo-open-arv-helper"
          >
            <Search className="h-4 w-4" />
            Need help determining ARV? Search for comps
          </button>
        </div>
      </main>
    </div>
  );
}
