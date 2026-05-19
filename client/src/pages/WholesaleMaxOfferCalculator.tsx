import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, DollarSign, Download, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { usePDF } from "react-to-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Navigation from "@/components/Navigation";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/StructuredData";
import { CalculatorContent, type FAQItem } from "@/components/CalculatorContent";
import { PdfSignupDialog } from "@/components/PdfSignupDialog";
import { useAuth } from "@/contexts/AuthContext";

const WHOLESALE_EXPLAINER =
  "Wholesaling is a real estate strategy where you contract a property at a below-market price and then assign that contract — or execute a double close — to an end buyer for a fee. Your profit comes from the spread between what you pay and what your buyer pays, so knowing your maximum buy price before you negotiate is essential. This calculator helps you work backwards from your buyer's maximum offer to determine the highest price you can pay the seller while still protecting your wholesale fee and covering closing costs. Toggle between assignment and double-close transaction types to see how each affects your net profit, and add closing costs to see the true number you need to hit on the buy side.";

const WHOLESALE_FAQS: FAQItem[] = [
  {
    question: "What is wholesaling in real estate?",
    answer:
      "Wholesaling is the practice of putting a property under contract at a discounted price and then selling that contract to an investor buyer for a fee — without ever renovating or owning the property. Wholesalers make money on the spread between the seller's price and the buyer's price. It requires no renovation capital but depends entirely on finding properties priced below what investors are willing to pay.",
  },
  {
    question: "What's the difference between assignment and double close?",
    answer:
      "In an assignment, you sell your contract to the end buyer — your fee is visible to all parties. In a double close, you actually purchase the property and immediately resell it to your buyer in a separate transaction, keeping your fee private. Double closes involve two sets of closing costs but are preferred when sellers or buyers object to seeing the wholesale spread.",
  },
  {
    question: "How do I determine my wholesale fee?",
    answer:
      "Most wholesalers target $10,000–$20,000 per deal, but the right fee depends on the deal size, your market, and how much margin exists between the seller's price and the buyer's maximum offer. A fee that leaves your buyer with a strong enough profit to close is more important than maximizing your spread — buyers who make money come back for more deals.",
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


function NumInput({
  id,
  value,
  onChange,
  step = "1",
  testId,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
  testId: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      step={step}
      value={value || ""}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      data-testid={testId}
    />
  );
}

export default function WholesaleMaxOfferCalculator() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const [arv, setArv] = useState(300000);
  const [rehab, setRehab] = useState(40000);
  const [buyerMaxPct, setBuyerMaxPct] = useState(75);
  const [wholesaleFee, setWholesaleFee] = useState(15000);
  const [txType, setTxType] = useState<"assignment" | "double-close">("assignment");

  const [ccOpen, setCcOpen] = useState(true);
  const [attorney, setAttorney] = useState(1500);
  const [titleIns, setTitleIns] = useState(800);
  const [transferTax, setTransferTax] = useState(500);
  const [otherCc, setOtherCc] = useState(0);
  const [showPdfDialog, setShowPdfDialog] = useState(false);

  const handleDownloadPdf = () => {
    if (!isAuthenticated) {
      setShowPdfDialog(true);
    } else {
      toPDF();
    }
  };

  const { toPDF, targetRef } = usePDF({
    filename: "wholesale-max-offer-calculator.pdf",
    page: { format: "letter", margin: 20 },
    canvas: { qualityRatio: 1 },
  });

  const result = useMemo(() => {
    const buyerMaxOffer = arv * (buyerMaxPct / 100) - rehab;
    const totalCC = txType === "double-close" ? attorney + titleIns + transferTax + otherCc : 0;
    const yourMaxBuy = buyerMaxOffer - wholesaleFee - totalCC;
    const netProfit = wholesaleFee - totalCC;
    return { buyerMaxOffer, totalCC, yourMaxBuy, netProfit };
  }, [arv, rehab, buyerMaxPct, wholesaleFee, txType, attorney, titleIns, transferTax, otherCc]);

  const profitOk = result.netProfit > 0;
  const buyOk = result.yourMaxBuy > 0;

  const handleAccessLenders = () => {
    setLocation(isAuthenticated ? "/lenders" : "/calculator-access");
  };

  return (
    <>
      <SEO
        fullTitle="Wholesale Max Offer Calculator — Assignment & Double Close | RE Data Metrix"
        description="Calculate your maximum buy price for wholesale deals. Model assignment or double-close transactions with full fee breakdowns and net profit."
      />
      <FAQSchema faqs={WHOLESALE_FAQS} />
      <Navigation />
      <div className="container max-w-5xl mx-auto py-6 px-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-3"
          data-testid="button-wm-back"
        >
          <Link href="/toolbox">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <DollarSign className="h-7 w-7" style={{ color: "#1d408b" }} />
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: "#1d408b" }}
              data-testid="text-wm-title"
            >
              Wholesale Max Offer Calculator
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Calculate assignment or double-close offer prices with full fee breakdowns.
          </p>
        </div>

        <div ref={targetRef} className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold" style={{ color: "#1d408b" }}>
                Deal Information
              </h2>
              <div className="space-y-2">
                <Label htmlFor="wm-arv">ARV</Label>
                <NumInput id="wm-arv" value={arv} onChange={setArv} step="1000" testId="input-wm-arv" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wm-rehab">Rehab Budget</Label>
                <NumInput
                  id="wm-rehab"
                  value={rehab}
                  onChange={setRehab}
                  step="1000"
                  testId="input-wm-rehab"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wm-pct">Buyer's Max % of ARV</Label>
                <div className="relative">
                  <NumInput
                    id="wm-pct"
                    value={buyerMaxPct}
                    onChange={setBuyerMaxPct}
                    step="1"
                    testId="input-wm-pct"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wm-fee">Your Wholesale Fee</Label>
                <NumInput
                  id="wm-fee"
                  value={wholesaleFee}
                  onChange={setWholesaleFee}
                  step="500"
                  testId="input-wm-fee"
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label>Transaction Type</Label>
                <RadioGroup
                  value={txType}
                  onValueChange={(v) => setTxType(v as "assignment" | "double-close")}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="assignment" id="wm-tx-a" data-testid="radio-wm-assignment" />
                    <Label htmlFor="wm-tx-a" className="cursor-pointer font-normal">
                      Assignment
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="double-close"
                      id="wm-tx-d"
                      data-testid="radio-wm-doubleclose"
                    />
                    <Label htmlFor="wm-tx-d" className="cursor-pointer font-normal">
                      Double Close
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {txType === "double-close" && (
                <div className="border rounded-md">
                  <button
                    type="button"
                    onClick={() => setCcOpen((s) => !s)}
                    className="w-full flex items-center justify-between p-3 text-sm font-medium hover-elevate"
                    data-testid="button-wm-cc-toggle"
                  >
                    <span>Closing Costs</span>
                    {ccOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {ccOpen && (
                    <div className="p-3 pt-0 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="wm-att" className="text-xs">
                          Attorney / Title Fees
                        </Label>
                        <NumInput
                          id="wm-att"
                          value={attorney}
                          onChange={setAttorney}
                          step="100"
                          testId="input-wm-attorney"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wm-ti" className="text-xs">
                          Title Insurance
                        </Label>
                        <NumInput
                          id="wm-ti"
                          value={titleIns}
                          onChange={setTitleIns}
                          step="100"
                          testId="input-wm-titleins"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wm-tt" className="text-xs">
                          Transfer Tax
                        </Label>
                        <NumInput
                          id="wm-tt"
                          value={transferTax}
                          onChange={setTransferTax}
                          step="100"
                          testId="input-wm-transfertax"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wm-oc" className="text-xs">
                          Other Closing Costs
                        </Label>
                        <NumInput
                          id="wm-oc"
                          value={otherCc}
                          onChange={setOtherCc}
                          step="100"
                          testId="input-wm-othercc"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 text-center">
                <div className="text-sm text-muted-foreground mb-1">Your Max Buy Price</div>
                <div
                  className={`text-5xl md:text-6xl font-bold ${
                    buyOk ? "text-green-600" : "text-red-600"
                  }`}
                  data-testid="text-wm-yourmax-hero"
                >
                  {fmt(result.yourMaxBuy)}
                </div>
                {!buyOk && (
                  <p className="text-sm text-red-600 mt-2" data-testid="text-wm-warning">
                    At these numbers the deal does not work for you as the wholesaler.
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
                    <div className="text-xs text-muted-foreground mb-1">Buyer's Max Offer</div>
                    <div className="font-semibold" data-testid="text-wm-buyermax">
                      {fmt(result.buyerMaxOffer)}
                    </div>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="text-xs text-muted-foreground mb-1">Your Wholesale Fee</div>
                    <div className="font-semibold" data-testid="text-wm-feeout">
                      {fmt(wholesaleFee)}
                    </div>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="text-xs text-muted-foreground mb-1">Net Profit</div>
                    <div
                      className={`font-semibold ${
                        profitOk ? "text-green-600" : "text-red-600"
                      }`}
                      data-testid="text-wm-netprofit"
                    >
                      {fmt(result.netProfit)}
                    </div>
                  </div>
                  {txType === "double-close" && (
                    <div className="border rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">Total Closing Costs</div>
                      <div className="font-semibold" data-testid="text-wm-totalcc">
                        {fmt(result.totalCC)}
                      </div>
                    </div>
                  )}
                  <div className="border rounded-md p-3">
                    <div className="text-xs text-muted-foreground mb-1">Transaction Type</div>
                    <div className="font-semibold capitalize">
                      {txType === "assignment" ? "Assignment" : "Double Close"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            className="gap-2"
            data-testid="button-wm-pdf"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            onClick={handleAccessLenders}
            className="gap-2 w-full sm:w-auto"
            style={{ background: "#e0b32e", color: "#1d408b" }}
            data-testid="button-wm-lenders"
          >
            {isAuthenticated ? "Browse Lenders" : "Access Lenders Today"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <CalculatorContent
          explainer={WHOLESALE_EXPLAINER}
          faqs={WHOLESALE_FAQS}
          testIdPrefix="wm"
        />

        <PdfSignupDialog
          open={showPdfDialog}
          onOpenChange={setShowPdfDialog}
        />

        <div className="text-xs text-muted-foreground text-center mt-8 pt-6 border-t">
          No account required. Results are estimates for educational purposes.
        </div>
      </div>
    </>
  );
}
