import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, Download, ArrowRight } from "lucide-react";
import { usePDF } from "react-to-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Navigation from "@/components/Navigation";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = "/toolbox";
}

interface DscrInputs {
  purchasePrice: number;
  downPct: number;
  rate: number;
  term: 15 | 20 | 30;
  interestOnly: boolean;
  monthlyRent: number;
  otherIncome: number;
  annualTax: number;
  annualInsurance: number;
  hoaMonthly: number;
  vacancyPct: number;
}

interface DscrResults {
  loanAmount: number;
  monthlyPI: number;
  monthlyPITIA: number;
  effectiveMonthlyIncome: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  noi: number;
  capRate: number;
  dscr: number;
  requiredRent: number;
  requiredDownPct: number | null;
}

function compute(i: DscrInputs): DscrResults {
  const loanAmount = i.purchasePrice * (1 - i.downPct / 100);
  const r = i.rate / 1200;
  const n = i.term * 12;
  let monthlyPI: number;
  if (i.interestOnly) {
    monthlyPI = loanAmount * (i.rate / 1200);
  } else if (r === 0) {
    monthlyPI = n > 0 ? loanAmount / n : 0;
  } else {
    monthlyPI = (loanAmount * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  }
  const monthlyPITIA =
    monthlyPI + i.annualTax / 12 + i.annualInsurance / 12 + i.hoaMonthly;
  const grossMonthlyIncome = i.monthlyRent + i.otherIncome;
  const effectiveMonthlyIncome = grossMonthlyIncome * (1 - i.vacancyPct / 100);
  const dscr = monthlyPITIA > 0 ? grossMonthlyIncome / monthlyPITIA : 0;
  const noi =
    grossMonthlyIncome * 12 * (1 - i.vacancyPct / 100) -
    i.annualTax -
    i.annualInsurance -
    i.hoaMonthly * 12;
  const capRate = i.purchasePrice > 0 ? (noi / i.purchasePrice) * 100 : 0;
  const monthlyCashFlow = effectiveMonthlyIncome - monthlyPITIA;
  const annualCashFlow = monthlyCashFlow * 12;

  const requiredRent = monthlyPITIA * 1.25;

  // Spec: solve for down payment where new PITIA * 1.25 = current rent
  // → requiredPITIA = monthlyRent / 1.25
  const requiredPITIA = i.monthlyRent / 1.25;
  const requiredPI =
    requiredPITIA - i.annualTax / 12 - i.annualInsurance / 12 - i.hoaMonthly;
  let requiredDownPct: number | null = null;
  if (requiredPI > 0 && i.purchasePrice > 0) {
    let requiredLoan: number;
    if (i.interestOnly) {
      requiredLoan = requiredPI / (i.rate / 1200);
    } else if (r === 0) {
      requiredLoan = requiredPI * n;
    } else {
      const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      requiredLoan = requiredPI / factor;
    }
    if (requiredLoan < i.purchasePrice) {
      const pct = (1 - requiredLoan / i.purchasePrice) * 100;
      requiredDownPct = Math.max(0, Math.min(100, pct));
    } else {
      requiredDownPct = null;
    }
  } else if (requiredPI <= 0) {
    requiredDownPct = 0;
  }

  return {
    loanAmount,
    monthlyPI,
    monthlyPITIA,
    effectiveMonthlyIncome,
    monthlyCashFlow,
    annualCashFlow,
    noi,
    capRate,
    dscr,
    requiredRent: Math.max(0, requiredRent),
    requiredDownPct,
  };
}

function dscrBand(dscr: number) {
  if (dscr >= 1.25)
    return { color: "text-green-600", label: "Strong. Most lenders will approve." };
  if (dscr >= 1.0)
    return { color: "text-yellow-600", label: "Marginal. Some lenders may approve." };
  if (dscr >= 0.75)
    return { color: "text-orange-600", label: "Negative cash flow. Limited lender options." };
  return { color: "text-red-600", label: "Does not qualify for most DSCR programs." };
}

export default function DscrCalculator() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const [purchasePrice, setPurchasePrice] = useState(300000);
  const [downDisplay, setDownDisplay] = useState("25");
  const [downPct, setDownPct] = useState(25);
  const [rateDisplay, setRateDisplay] = useState("7.50");
  const [rate, setRate] = useState(7.5);
  const [term, setTerm] = useState<15 | 20 | 30>(30);
  const [interestOnly, setInterestOnly] = useState(false);
  const [monthlyRent, setMonthlyRent] = useState(2500);
  const [otherIncome, setOtherIncome] = useState(0);
  const [annualTax, setAnnualTax] = useState(3600);
  const [annualInsurance, setAnnualInsurance] = useState(1200);
  const [hoaMonthly, setHoaMonthly] = useState(0);
  const [vacancyPct, setVacancyPct] = useState(5);

  const [results, setResults] = useState<DscrResults | null>(null);

  const { toPDF, targetRef } = usePDF({
    filename: "dscr-calculator.pdf",
    page: { format: "letter", margin: 20 },
    canvas: { qualityRatio: 1 },
  });

  const handleCalculate = () => {
    setResults(
      compute({
        purchasePrice,
        downPct,
        rate,
        term,
        interestOnly,
        monthlyRent,
        otherIncome,
        annualTax,
        annualInsurance,
        hoaMonthly,
        vacancyPct,
      })
    );
  };

  const handleAccessLenders = () => {
    setLocation(isAuthenticated ? "/lenders" : "/calculator-access");
  };

  const band = results ? dscrBand(results.dscr) : null;

  return (
    <>
      <SEO
        title="DSCR Calculator"
        description="Free DSCR calculator for real estate investors. Check if your rental property qualifies for DSCR financing and see what it takes to hit 1.25."
      />
      <Navigation />
      <div className="container max-w-5xl mx-auto py-6 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3"
          onClick={goBack}
          data-testid="button-dscr-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="h-7 w-7" style={{ color: "#1d408b" }} />
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: "#1d408b" }}
              data-testid="text-dscr-title"
            >
              DSCR Calculator
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Check whether a rental property qualifies for DSCR (Debt Service Coverage Ratio) financing.
          </p>
        </div>

        <div ref={targetRef} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="font-semibold" style={{ color: "#1d408b" }}>
                  Property &amp; Loan
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="d-price">Purchase Price</Label>
                  <Input
                    id="d-price"
                    type="number"
                    step="1000"
                    value={purchasePrice || ""}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    data-testid="input-dscr-price"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d-down">Down Payment %</Label>
                  <div className="relative">
                    <Input
                      id="d-down"
                      type="text"
                      inputMode="decimal"
                      step="1"
                      value={downDisplay}
                      onChange={(e) => {
                        setDownDisplay(e.target.value);
                        const n = parseFloat(e.target.value);
                        setDownPct(isNaN(n) ? 0 : n);
                      }}
                      onBlur={() => {
                        const n = Math.round(parseFloat(downDisplay) || 0);
                        setDownPct(n);
                        setDownDisplay(String(n));
                      }}
                      className="pr-8"
                      data-testid="input-dscr-down"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d-rate">Interest Rate</Label>
                  <div className="relative">
                    <Input
                      id="d-rate"
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={rateDisplay}
                      onChange={(e) => {
                        setRateDisplay(e.target.value);
                        const n = parseFloat(e.target.value);
                        setRate(isNaN(n) ? 0 : n);
                      }}
                      onBlur={() => {
                        const n = parseFloat(rateDisplay) || 0;
                        setRate(n);
                        setRateDisplay(n.toFixed(2));
                      }}
                      className="pr-8"
                      data-testid="input-dscr-rate"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Loan Term</Label>
                  <div className="flex gap-2">
                    {[15, 20, 30].map((y) => (
                      <Button
                        key={y}
                        type="button"
                        size="sm"
                        variant={term === y ? "default" : "outline"}
                        onClick={() => setTerm(y as 15 | 20 | 30)}
                        className={
                          term === y
                            ? ""
                            : "bg-background"
                        }
                        style={
                          term === y
                            ? { background: "#1d408b", color: "white" }
                            : undefined
                        }
                        data-testid={`button-dscr-term-${y}`}
                      >
                        {y} yrs
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Interest Only?</Label>
                  <RadioGroup
                    value={interestOnly ? "yes" : "no"}
                    onValueChange={(v) => setInterestOnly(v === "yes")}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="d-io-no" data-testid="radio-dscr-io-no" />
                      <Label htmlFor="d-io-no" className="cursor-pointer font-normal">
                        No
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="d-io-yes" data-testid="radio-dscr-io-yes" />
                      <Label htmlFor="d-io-yes" className="cursor-pointer font-normal">
                        Yes
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <h2 className="font-semibold" style={{ color: "#1d408b" }}>
                  Income &amp; Expenses
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="d-rent">Monthly Rent</Label>
                  <Input
                    id="d-rent"
                    type="number"
                    step="50"
                    value={monthlyRent || ""}
                    onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    data-testid="input-dscr-rent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d-other">Other Income (laundry, parking, etc.)</Label>
                  <Input
                    id="d-other"
                    type="number"
                    step="25"
                    value={otherIncome || ""}
                    onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
                    data-testid="input-dscr-other"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d-tax">Annual Property Tax</Label>
                  <Input
                    id="d-tax"
                    type="number"
                    step="100"
                    value={annualTax || ""}
                    onChange={(e) => setAnnualTax(parseFloat(e.target.value) || 0)}
                    data-testid="input-dscr-tax"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d-ins">Annual Insurance</Label>
                  <Input
                    id="d-ins"
                    type="number"
                    step="50"
                    value={annualInsurance || ""}
                    onChange={(e) => setAnnualInsurance(parseFloat(e.target.value) || 0)}
                    data-testid="input-dscr-ins"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d-hoa">HOA Fee (monthly)</Label>
                  <Input
                    id="d-hoa"
                    type="number"
                    step="25"
                    value={hoaMonthly || ""}
                    onChange={(e) => setHoaMonthly(parseFloat(e.target.value) || 0)}
                    data-testid="input-dscr-hoa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d-vac">Vacancy Rate</Label>
                  <div className="relative">
                    <Input
                      id="d-vac"
                      type="number"
                      step="1"
                      value={vacancyPct || ""}
                      onChange={(e) => setVacancyPct(parseFloat(e.target.value) || 0)}
                      className="pr-8"
                      data-testid="input-dscr-vac"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleCalculate}
              style={{ background: "#1d408b", color: "white" }}
              data-testid="button-dscr-calculate"
            >
              Calculate DSCR
            </Button>
          </div>

          {results && band && (
            <>
              <Card>
                <CardContent className="p-5 text-center">
                  <div className="text-sm text-muted-foreground mb-1">DSCR Ratio</div>
                  <div
                    className={`text-5xl md:text-6xl font-bold ${band.color}`}
                    data-testid="text-dscr-ratio"
                  >
                    {results.dscr.toFixed(2)}
                  </div>
                  <div className={`text-sm mt-2 font-medium ${band.color}`}>
                    {band.label}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-3" style={{ color: "#1d408b" }}>
                    Key Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <Metric label="Loan Amount" value={fmt(results.loanAmount)} testId="dscr-loan" />
                    <Metric
                      label={interestOnly ? "Monthly Interest Only" : "Monthly P&I"}
                      value={fmt(results.monthlyPI)}
                      testId="dscr-pi"
                    />
                    <Metric
                      label="Monthly PITIA"
                      value={fmt(results.monthlyPITIA)}
                      testId="dscr-pitia"
                    />
                    <Metric
                      label="Monthly Cash Flow"
                      value={fmt(results.monthlyCashFlow)}
                      testId="dscr-mcf"
                      color={results.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}
                    />
                    <Metric
                      label="Annual Cash Flow"
                      value={fmt(results.annualCashFlow)}
                      testId="dscr-acf"
                      color={results.annualCashFlow >= 0 ? "text-green-600" : "text-red-600"}
                    />
                    <Metric label="NOI (annual)" value={fmt(results.noi)} testId="dscr-noi" />
                    <Metric
                      label="Cap Rate"
                      value={`${results.capRate.toFixed(2)}%`}
                      testId="dscr-cap"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-3" style={{ color: "#1d408b" }}>
                    What would it take to hit 1.25 DSCR?
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">Monthly Rent</div>
                      <div className="text-sm">
                        Current:{" "}
                        <span className="font-semibold" data-testid="text-dscr-current-rent">
                          {fmt(monthlyRent)}
                        </span>
                      </div>
                      <div className="text-sm">
                        Required:{" "}
                        <span
                          className="font-semibold text-green-600"
                          data-testid="text-dscr-required-rent"
                        >
                          {fmt(results.requiredRent)}
                        </span>
                      </div>
                      {results.requiredRent > monthlyRent && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Gap: {fmt(results.requiredRent - monthlyRent)}/mo
                        </div>
                      )}
                    </div>
                    <div className="border rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">Down Payment %</div>
                      <div className="text-sm">
                        Current:{" "}
                        <span className="font-semibold" data-testid="text-dscr-current-down">
                          {downPct}%
                        </span>
                      </div>
                      <div className="text-sm">
                        Required:{" "}
                        <span
                          className="font-semibold text-green-600"
                          data-testid="text-dscr-required-down"
                        >
                          {results.requiredDownPct === null
                            ? "Not achievable"
                            : `${Math.ceil(results.requiredDownPct)}%`}
                        </span>
                      </div>
                      {results.requiredDownPct !== null &&
                        results.requiredDownPct > downPct && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Gap: {(results.requiredDownPct - downPct).toFixed(1)} pts
                          </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {results && (
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => toPDF()}
              className="gap-2"
              data-testid="button-dscr-pdf"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={handleAccessLenders}
              className="gap-2 w-full sm:w-auto"
              style={{ background: "#e0b32e", color: "#1d408b" }}
              data-testid="button-dscr-lenders"
            >
              {isAuthenticated ? "Browse Lenders" : "Access Lenders Today"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center mt-8 pt-6 border-t">
          No account required. Results are estimates for educational purposes.
        </div>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  testId,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  testId: string;
  color?: string;
}) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-semibold ${color}`} data-testid={`text-${testId}`}>
        {value}
      </div>
    </div>
  );
}
