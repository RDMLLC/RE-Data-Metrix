import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Calculator, Download, ArrowRight } from "lucide-react";
import { usePDF } from "react-to-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/StructuredData";
import { CalculatorContent, type FAQItem } from "@/components/CalculatorContent";
import { PdfSignupDialog } from "@/components/PdfSignupDialog";
import { useAuth } from "@/contexts/AuthContext";

const MAX_OFFER_EXPLAINER =
  "The 70% rule is one of the most reliable frameworks in fix-and-flip investing. It states that an investor should pay no more than 70% of a property's After Repair Value (ARV) minus the estimated rehab costs. This protects your profit margin by accounting for holding costs, closing costs, financing, and unexpected expenses that inevitably arise during renovation. The rule isn't rigid — experienced investors sometimes stretch to 75% on lower-risk deals or tighten to 65% in uncertain markets — but it gives every fix-and-flip a quick gut-check before you commit capital. Use this calculator to model different ARV estimates, rehab budgets, and percentage thresholds to find the maximum offer that still protects your downside.";

const MAX_OFFER_FAQS: FAQItem[] = [
  {
    question: "What is the 70% rule in real estate?",
    answer:
      "The 70% rule is a quick-analysis tool fix-and-flip investors use to determine the maximum price they should pay for a property. It caps your purchase price at 70% of the ARV minus your rehab costs, leaving room for holding costs, closing costs, financing, and profit. It's a starting point, not a guarantee — always run a full deal analysis before making an offer.",
  },
  {
    question: "How do I calculate my maximum offer on a fix and flip?",
    answer:
      "Multiply the ARV by your target percentage (typically 70%), then subtract your estimated rehab budget. The result is the highest price you can pay and still protect your profit margin. For example, on a $300,000 ARV property with $50,000 in rehab, your max offer at 70% would be $160,000.",
  },
  {
    question: "What repairs and costs should I factor into my rehab budget?",
    answer:
      "Beyond materials and labor, experienced investors budget for permits, inspections, a contractor contingency (typically 10–15% of hard costs), holding costs during renovation, and utility bills. Underestimating rehab is the most common reason fix-and-flip deals lose money. When in doubt, get a contractor walkthrough before finalizing your offer.",
  },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);
}


export default function MaxOfferCalculator() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [arv, setArv] = useState<number>(300000);
  const [rehab, setRehab] = useState<number>(40000);
  const [maxPct, setMaxPct] = useState<number>(70);
  const [showPdfDialog, setShowPdfDialog] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/toolbox");
    }
  };

  const handleDownloadPdf = () => {
    if (!isAuthenticated) {
      setShowPdfDialog(true);
    } else {
      toPDF();
    }
  };

  const { toPDF, targetRef } = usePDF({
    filename: "max-offer-calculator.pdf",
    page: { format: "letter", margin: 20 },
    canvas: { qualityRatio: 1 },
  });

  const { maxProjectCost, maxOffer, bufferDollar, bufferPct } = useMemo(() => {
    const mpc = arv * (maxPct / 100);
    const mo = mpc - rehab;
    const buf = arv - mpc;
    const bufPct = arv > 0 ? (buf / arv) * 100 : 0;
    return { maxProjectCost: mpc, maxOffer: mo, bufferDollar: buf, bufferPct: bufPct };
  }, [arv, rehab, maxPct]);

  const offerOk = maxOffer > 0;

  const handleAccessLenders = () => {
    setLocation(isAuthenticated ? "/lenders" : "/calculator-access");
  };

  return (
    <>
      <SEO
        fullTitle="Max Offer Calculator — 70% Rule for Fix and Flip Investors | RE Data Metrix"
        description="Find your maximum allowable offer on any fix-and-flip deal. Enter ARV and rehab costs to instantly calculate your max offer price using the 70% rule."
      />
      <FAQSchema faqs={MAX_OFFER_FAQS} />
      <Navigation />
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3"
          onClick={handleBack}
          data-testid="button-mo-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <Calculator className="h-7 w-7" style={{ color: "#1d408b" }} />
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: "#1d408b" }}
              data-testid="text-mo-title"
            >
              Max Offer Calculator
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            The 70% rule for fix-and-flip investors — find the maximum you should pay.
          </p>
        </div>

        <div ref={targetRef} className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mo-arv">After Repair Value (ARV)</Label>
                <Input
                  id="mo-arv"
                  type="number"
                  inputMode="decimal"
                  step="1000"
                  value={arv || ""}
                  onChange={(e) => setArv(parseFloat(e.target.value) || 0)}
                  data-testid="input-mo-arv"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mo-rehab">Rehab Budget</Label>
                <Input
                  id="mo-rehab"
                  type="number"
                  inputMode="decimal"
                  step="1000"
                  value={rehab || ""}
                  onChange={(e) => setRehab(parseFloat(e.target.value) || 0)}
                  data-testid="input-mo-rehab"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mo-pct">Maximum % of ARV</Label>
                <div className="relative">
                  <Input
                    id="mo-pct"
                    type="number"
                    inputMode="decimal"
                    step="1"
                    value={maxPct || ""}
                    onChange={(e) => setMaxPct(parseFloat(e.target.value) || 0)}
                    className="pr-8"
                    data-testid="input-mo-pct"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-center">
              <div className="text-sm text-muted-foreground mb-1">Max Offer Price</div>
              <div
                className={`text-5xl md:text-6xl font-bold ${
                  offerOk ? "text-green-600" : "text-red-600"
                }`}
                data-testid="text-mo-result"
              >
                {fmt(maxOffer)}
              </div>
              {!offerOk && (
                <p className="text-sm text-red-600 mt-2" data-testid="text-mo-warning">
                  At these numbers the deal does not work at this ARV or rehab budget.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3" style={{ color: "#1d408b" }}>
                Key Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground mb-1">Max Project Cost</div>
                  <div className="font-semibold" data-testid="text-mo-mpc">
                    {fmt(maxProjectCost)}
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground mb-1">Profit Buffer</div>
                  <div className="font-semibold" data-testid="text-mo-buffer">
                    {fmt(bufferDollar)} ({bufferPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <div
                className="rounded-md border p-3 text-sm mt-4"
                style={{ background: "#fff8e1", borderColor: "#e0b32e" }}
              >
                The 70% rule means you pay no more than 70% of the ARV minus rehab costs.
                This protects your profit margin on fix-and-flip deals.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            className="gap-2"
            data-testid="button-mo-pdf"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            onClick={handleAccessLenders}
            className="gap-2 w-full sm:w-auto"
            style={{ background: "#e0b32e", color: "#1d408b" }}
            data-testid="button-mo-lenders"
          >
            {isAuthenticated ? "Browse Lenders" : "Access Lenders Today"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <CalculatorContent
          explainer={MAX_OFFER_EXPLAINER}
          faqs={MAX_OFFER_FAQS}
          testIdPrefix="mo"
        />

        <PdfSignupDialog
          open={showPdfDialog}
          onOpenChange={setShowPdfDialog}
          onDownloadAnyway={() => toPDF()}
        />

        <div className="text-xs text-muted-foreground text-center mt-8 pt-6 border-t">
          No account required. Results are estimates for educational purposes.
        </div>
      </div>
    </>
  );
}
