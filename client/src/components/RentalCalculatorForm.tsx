import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, Calculator as CalcIcon, RotateCcw } from "lucide-react";
import { usePDF } from "react-to-pdf";
import {
  calculateRental,
  defaultRentalInputs,
  type RentalInputs,
  type RentalResults,
} from "@/lib/rentalCalculations";

interface Props {
  variant?: "page" | "overlay";
}

function fmtCurrency(n: number): string {
  if (!isFinite(n)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmtPct(n: number | null): string {
  if (n === null || !isFinite(n)) return "N/A";
  return `${n.toFixed(2)}%`;
}

function signColor(n: number): string {
  if (n > 0) return "text-green-600";
  if (n < 0) return "text-red-600";
  return "text-foreground";
}

function NumberField({
  id,
  value,
  onChange,
  prefix,
  suffix,
  testId,
  step = "1",
  className = "",
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  testId?: string;
  step?: string;
  className?: string;
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && (
        <span className="absolute left-2 text-xs text-muted-foreground pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`text-right ${prefix ? "pl-6" : ""} ${suffix ? "pr-7" : ""}`}
        data-testid={testId}
      />
      {suffix && (
        <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      className="bg-[#1d408b] text-white px-4 py-2 rounded-t-md text-sm font-semibold"
      style={{ backgroundColor: "#1d408b" }}
    >
      {title}
    </div>
  );
}

export default function RentalCalculatorForm({ variant = "page" }: Props) {
  const [inputs, setInputs] = useState<RentalInputs>(defaultRentalInputs);
  const [results, setResults] = useState<RentalResults | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toPDF, targetRef } = usePDF({
    filename: "rental-property-analysis.pdf",
    page: { format: "letter", margin: 12, orientation: "portrait" },
    canvas: { qualityRatio: 1 },
  });
  const [isPdfMode, setIsPdfMode] = useState(false);

  const update = <K extends keyof RentalInputs>(
    key: K,
    value: RentalInputs[K]
  ) => setInputs((prev) => ({ ...prev, [key]: value }));

  const updateExpense = (
    key: "propertyTax" | "totalInsurance" | "hoaFee" | "maintenance" | "otherCosts",
    field: "amount" | "annualIncrease",
    value: number
  ) =>
    setInputs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));

  const handleCalculate = () => {
    const r = calculateRental(inputs);
    setResults(r);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleClear = () => {
    setInputs(defaultRentalInputs);
    setResults(null);
  };

  const handleDownloadPdf = async () => {
    if (!results) return;
    setIsPdfMode(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      await toPDF();
    } finally {
      setIsPdfMode(false);
    }
  };

  const expenseRows: Array<{
    key: "propertyTax" | "totalInsurance" | "hoaFee" | "maintenance" | "otherCosts";
    label: string;
  }> = [
    { key: "propertyTax", label: "Property Tax" },
    { key: "totalInsurance", label: "Total Insurance" },
    { key: "hoaFee", label: "HOA Fee" },
    { key: "maintenance", label: "Maintenance" },
    { key: "otherCosts", label: "Other Costs" },
  ];

  const PurchaseSection = (
    <div className="border border-border rounded-md overflow-hidden">
      <SectionHeader title="Purchase" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Purchase Price</Label>
          <div className="w-40">
            <NumberField
              id="rc-purchase-price"
              value={inputs.purchasePrice}
              onChange={(n) => update("purchasePrice", n)}
              prefix="$"
              testId="input-rc-purchase-price"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Use Loan?</Label>
          <RadioGroup
            value={inputs.useLoan ? "yes" : "no"}
            onValueChange={(v) => update("useLoan", v === "yes")}
            className="flex gap-4"
          >
            <div className="flex items-center gap-1">
              <RadioGroupItem value="yes" id="rc-loan-yes" data-testid="radio-rc-loan-yes" />
              <Label htmlFor="rc-loan-yes" className="text-sm cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="no" id="rc-loan-no" data-testid="radio-rc-loan-no" />
              <Label htmlFor="rc-loan-no" className="text-sm cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {inputs.useLoan && (
          <div className="pl-4 space-y-2 border-l-2 border-[#e0b32e]">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Down Payment</Label>
              <div className="w-28">
                <NumberField
                  id="rc-down"
                  value={inputs.downPaymentPct}
                  onChange={(n) => update("downPaymentPct", n)}
                  suffix="%"
                  step="0.1"
                  testId="input-rc-down"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Interest Rate</Label>
              <div className="w-28">
                <NumberField
                  id="rc-rate"
                  value={inputs.interestRate}
                  onChange={(n) => update("interestRate", n)}
                  suffix="%"
                  step="0.1"
                  testId="input-rc-rate"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Loan Term</Label>
              <div className="w-28 flex items-center gap-1">
                <NumberField
                  id="rc-term"
                  value={inputs.loanTerm}
                  onChange={(n) => update("loanTerm", n)}
                  testId="input-rc-term"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Closing Cost</Label>
          <div className="w-40">
            <NumberField
              id="rc-closing"
              value={inputs.closingCost}
              onChange={(n) => update("closingCost", n)}
              prefix="$"
              testId="input-rc-closing"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Need Repairs?</Label>
          <RadioGroup
            value={inputs.needsRepairs ? "yes" : "no"}
            onValueChange={(v) => update("needsRepairs", v === "yes")}
            className="flex gap-4"
          >
            <div className="flex items-center gap-1">
              <RadioGroupItem value="yes" id="rc-rep-yes" data-testid="radio-rc-rep-yes" />
              <Label htmlFor="rc-rep-yes" className="text-sm cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="no" id="rc-rep-no" data-testid="radio-rc-rep-no" />
              <Label htmlFor="rc-rep-no" className="text-sm cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {inputs.needsRepairs && (
          <div className="pl-4 space-y-2 border-l-2 border-[#e0b32e]">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Repair Cost</Label>
              <div className="w-40">
                <NumberField
                  id="rc-repair"
                  value={inputs.repairCost}
                  onChange={(n) => update("repairCost", n)}
                  prefix="$"
                  testId="input-rc-repair"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Value After Repairs</Label>
              <div className="w-40">
                <NumberField
                  id="rc-arv"
                  value={inputs.valueAfterRepairs}
                  onChange={(n) => update("valueAfterRepairs", n)}
                  prefix="$"
                  testId="input-rc-arv"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const ExpensesSection = (
    <div className="border border-border rounded-md overflow-hidden">
      <SectionHeader title="Recurring Operating Expenses" />
      <div className="p-4">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 items-center">
          <div></div>
          <div className="text-xs font-medium text-muted-foreground text-center w-28">
            Annual
          </div>
          <div className="text-xs font-medium text-muted-foreground text-center w-24">
            Annual Increase
          </div>
          {expenseRows.map((row) => (
            <RowExpense
              key={row.key}
              label={row.label}
              amount={inputs[row.key].amount}
              annualIncrease={inputs[row.key].annualIncrease}
              onAmount={(n) => updateExpense(row.key, "amount", n)}
              onInc={(n) => updateExpense(row.key, "annualIncrease", n)}
              testKey={row.key}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const IncomeSection = (
    <div className="border border-border rounded-md overflow-hidden">
      <SectionHeader title="Income" />
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 items-center">
          <div></div>
          <div className="text-xs font-medium text-muted-foreground text-center w-28">
            Monthly
          </div>
          <div className="text-xs font-medium text-muted-foreground text-center w-24">
            Annual Increase
          </div>

          <Label className="text-sm">Monthly Rent</Label>
          <div className="w-28">
            <NumberField
              id="rc-rent"
              value={inputs.monthlyRent}
              onChange={(n) => update("monthlyRent", n)}
              prefix="$"
              testId="input-rc-rent"
            />
          </div>
          <div className="w-24">
            <NumberField
              id="rc-rent-inc"
              value={inputs.rentAnnualIncrease}
              onChange={(n) => update("rentAnnualIncrease", n)}
              suffix="%"
              step="0.1"
              testId="input-rc-rent-inc"
            />
          </div>

          <Label className="text-sm">Other Monthly Income</Label>
          <div className="w-28">
            <NumberField
              id="rc-other-inc"
              value={inputs.otherMonthlyIncome}
              onChange={(n) => update("otherMonthlyIncome", n)}
              prefix="$"
              testId="input-rc-other-inc"
            />
          </div>
          <div className="w-24">
            <NumberField
              id="rc-other-inc-inc"
              value={inputs.otherIncomeAnnualIncrease}
              onChange={(n) => update("otherIncomeAnnualIncrease", n)}
              suffix="%"
              step="0.1"
              testId="input-rc-other-inc-inc"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Vacancy Rate</Label>
          <div className="w-28">
            <NumberField
              id="rc-vac"
              value={inputs.vacancyRate}
              onChange={(n) => update("vacancyRate", n)}
              suffix="%"
              step="0.1"
              testId="input-rc-vac"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Management Fee</Label>
          <div className="w-28">
            <NumberField
              id="rc-mgmt"
              value={inputs.managementFee}
              onChange={(n) => update("managementFee", n)}
              suffix="%"
              step="0.1"
              testId="input-rc-mgmt"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const SellSection = (
    <div className="border border-border rounded-md overflow-hidden">
      <SectionHeader title="Sell" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Do You Know the Sell Price?</Label>
          <RadioGroup
            value={inputs.knowSellPrice ? "yes" : "no"}
            onValueChange={(v) => update("knowSellPrice", v === "yes")}
            className="flex gap-4"
          >
            <div className="flex items-center gap-1">
              <RadioGroupItem value="yes" id="rc-sp-yes" data-testid="radio-rc-sp-yes" />
              <Label htmlFor="rc-sp-yes" className="text-sm cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="no" id="rc-sp-no" data-testid="radio-rc-sp-no" />
              <Label htmlFor="rc-sp-no" className="text-sm cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {!inputs.knowSellPrice ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Value Appreciation</Label>
              <div className="w-28 flex items-center gap-1">
                <NumberField
                  id="rc-app"
                  value={inputs.valueAppreciation}
                  onChange={(n) => update("valueAppreciation", n)}
                  suffix="%"
                  step="0.1"
                  testId="input-rc-app"
                />
              </div>
              <span className="text-xs text-muted-foreground">per year</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Holding Length</Label>
              <div className="w-28 flex items-center gap-1">
                <NumberField
                  id="rc-hold"
                  value={inputs.holdingLength}
                  onChange={(n) => update("holdingLength", n)}
                  testId="input-rc-hold"
                />
              </div>
              <span className="text-xs text-muted-foreground">years</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Sell Price</Label>
              <div className="w-40">
                <NumberField
                  id="rc-sell-price"
                  value={inputs.sellPrice}
                  onChange={(n) => update("sellPrice", n)}
                  prefix="$"
                  testId="input-rc-sell-price"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Holding Length</Label>
              <div className="w-28">
                <NumberField
                  id="rc-hold-2"
                  value={inputs.holdingLength}
                  onChange={(n) => update("holdingLength", n)}
                  testId="input-rc-hold-2"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Cost to Sell</Label>
          <div className="w-28">
            <NumberField
              id="rc-cost-sell"
              value={inputs.costToSell}
              onChange={(n) => update("costToSell", n)}
              suffix="%"
              step="0.1"
              testId="input-rc-cost-sell"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const isMobile = variant === "overlay";

  return (
    <div className="space-y-4">
      <div
        className={
          isMobile
            ? "space-y-4"
            : "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start"
        }
      >
        <div className="space-y-4">
          {PurchaseSection}
          {ExpensesSection}
        </div>
        <div className="space-y-4">
          {IncomeSection}
          {SellSection}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Button
          type="button"
          onClick={handleCalculate}
          className="min-w-32"
          style={{ backgroundColor: "#1d408b", color: "#e0b32e" }}
          data-testid="button-rc-calculate"
        >
          <CalcIcon className="h-4 w-4 mr-2" />
          Calculate
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          data-testid="button-rc-clear"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      {results && (
        <div ref={resultsRef} className="pt-4">
          <div ref={targetRef} className="bg-white">
            {isPdfMode && (
              <div
                className="px-4 py-3 mb-4 rounded-t-md text-white"
                style={{ backgroundColor: "#1d408b" }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold">RE Data Metrix</div>
                  <div className="text-xs">Rental Property Analysis</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard
                label="IRR"
                value={fmtPct(results.irr)}
                color={
                  results.irr === null
                    ? "text-foreground"
                    : signColor(results.irr)
                }
                testId="text-rc-irr"
              />
              <MetricCard
                label="Cap Rate"
                value={fmtPct(results.capRate)}
                color={signColor(results.capRate)}
                testId="text-rc-cap"
              />
              <MetricCard
                label="Cash on Cash"
                value={fmtPct(results.cashOnCashReturn)}
                color={signColor(results.cashOnCashReturn)}
                testId="text-rc-coc"
              />
              <MetricCard
                label="Monthly Cash Flow"
                value={fmtCurrency(results.monthlyCashFlow)}
                color={signColor(results.monthlyCashFlow)}
                testId="text-rc-monthly-cf"
              />
              <MetricCard
                label="Annual Cash Flow"
                value={fmtCurrency(results.annualCashFlow)}
                color={signColor(results.annualCashFlow)}
                testId="text-rc-annual-cf"
              />
              <MetricCard
                label="NOI"
                value={fmtCurrency(results.noi)}
                color={signColor(results.noi)}
                testId="text-rc-noi"
              />
              <MetricCard
                label="Equity at Sale"
                value={fmtCurrency(results.equityAtSale)}
                color={signColor(results.equityAtSale)}
                testId="text-rc-equity"
              />
              <MetricCard
                label="Total Profit"
                value={fmtCurrency(results.totalProfit)}
                color={signColor(results.totalProfit)}
                testId="text-rc-profit"
              />
            </div>

            <div className="border border-border rounded-md overflow-hidden mb-4">
              <SectionHeader title="Breakdown" />
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <BD label="Total Investment" value={fmtCurrency(results.totalInvestment)} />
                <BD label="Loan Amount" value={fmtCurrency(results.loanAmount)} />
                <BD
                  label="Monthly Payment"
                  value={inputs.useLoan ? fmtCurrency(results.monthlyPayment) : "—"}
                />
                <BD label="Down Payment" value={fmtCurrency(results.downPayment)} />
                <BD
                  label="Annual Gross Income (Yr 1)"
                  value={fmtCurrency(results.annualGrossIncome)}
                />
                <BD
                  label="Annual Op. Expenses (Yr 1)"
                  value={fmtCurrency(results.annualOperatingExpenses)}
                />
                <BD label="Sell Price (Final Year)" value={fmtCurrency(results.finalSellPrice)} />
                <BD
                  label="Remaining Loan at Sale"
                  value={fmtCurrency(results.remainingBalanceAtSale)}
                />
              </div>
            </div>

            <div className="border border-border rounded-md overflow-hidden">
              <SectionHeader title="Year-by-Year Cash Flow" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-2 text-left">Year</th>
                      <th className="px-2 py-2 text-right">Gross Income</th>
                      <th className="px-2 py-2 text-right">Op. Expenses</th>
                      <th className="px-2 py-2 text-right">Mortgage</th>
                      <th className="px-2 py-2 text-right">Cash Flow</th>
                      <th className="px-2 py-2 text-right">Cumulative CF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.yearByYear.map((y) => (
                      <tr
                        key={y.year}
                        className="border-t border-border"
                        data-testid={`row-rc-year-${y.year}`}
                      >
                        <td className="px-2 py-1.5">{y.year}</td>
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(y.grossIncome)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(y.operatingExpenses)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {fmtCurrency(y.mortgagePayment)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right ${signColor(
                            y.cashFlow
                          )}`}
                        >
                          {fmtCurrency(y.cashFlow)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right ${signColor(
                            y.cumulativeCashFlow
                          )}`}
                        >
                          {fmtCurrency(y.cumulativeCashFlow)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {!isPdfMode && (
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPdf}
                data-testid="button-rc-download-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RowExpense({
  label,
  amount,
  annualIncrease,
  onAmount,
  onInc,
  testKey,
}: {
  label: string;
  amount: number;
  annualIncrease: number;
  onAmount: (n: number) => void;
  onInc: (n: number) => void;
  testKey: string;
}) {
  return (
    <>
      <Label className="text-sm">{label}</Label>
      <div className="w-28">
        <NumberField
          id={`rc-${testKey}-amt`}
          value={amount}
          onChange={onAmount}
          prefix="$"
          testId={`input-rc-${testKey}-amt`}
        />
      </div>
      <div className="w-24">
        <NumberField
          id={`rc-${testKey}-inc`}
          value={annualIncrease}
          onChange={onInc}
          suffix="%"
          step="0.1"
          testId={`input-rc-${testKey}-inc`}
        />
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  color,
  testId,
}: {
  label: string;
  value: string;
  color: string;
  testId: string;
}) {
  return (
    <div className="border border-border rounded-md p-3 bg-card">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`} data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

function BD({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
