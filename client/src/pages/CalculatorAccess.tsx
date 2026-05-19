import { Link, useLocation } from "wouter";
import { ArrowLeft, Check, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";

const NAVY = "#1d408b";
const GOLD = "#e0b32e";

interface Row {
  feature: string;
  free: string | "check" | "x";
  paid: string | "check" | "x";
}

const ROWS: Row[] = [
  { feature: "Property Lookups", free: "2/month automated", paid: "Unlimited" },
  { feature: "Wholesale Calculator", free: "2/month", paid: "Unlimited" },
  { feature: "ARV/Comp Reports", free: "2/month", paid: "Unlimited" },
  { feature: "Deal Analysis", free: "2 auto + manual", paid: "Unlimited" },
  { feature: "Lender Directory", free: "Unlimited", paid: "Unlimited" },
  { feature: "Automated Lender Comparisons", free: "2/month", paid: "Unlimited" },
  { feature: "Manual Loan Entry + Analysis", free: "Unlimited", paid: "Unlimited" },
  { feature: "Save Deals & Lenders", free: "x", paid: "check" },
  { feature: "Export PDF/CSV", free: "x", paid: "check" },
  { feature: "State-Specific Calculators", free: "x", paid: "check" },
  { feature: "Priority Support", free: "Standard", paid: "Priority" },
];

function CellValue({ value, kind }: { value: string | "check" | "x"; kind: "free" | "paid" }) {
  if (value === "check") {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-5 w-5 text-green-600" aria-label="Included" />
      </span>
    );
  }
  if (value === "x") {
    return (
      <span className="inline-flex items-center justify-center">
        <X className="h-5 w-5 text-muted-foreground" aria-label="Not available" />
      </span>
    );
  }
  return (
    <span
      className={kind === "paid" ? "font-medium text-foreground" : "text-foreground"}
    >
      {value}
    </span>
  );
}

export default function CalculatorAccess() {
  const [, setLocation] = useLocation();
  const goRegister = () => setLocation("/register");

  return (
    <>
      <SEO
        fullTitle="Unlock the Full Platform | RE Data Metrix"
        description="A free RE Data Metrix account gives you deal analysis, lender access, and a full investing toolset. See what's included and create your free account today."
      />
      <Navigation />

      <div
        data-page="calculator-access"
        data-testid="page-calculator-access"
        className="min-h-screen bg-background"
      >
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-10 md:py-14">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-3"
            data-testid="button-ca-back"
          >
            <Link href="/toolbox">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>

          {/* 1. Hero */}
          <section className="text-center mb-3 md:mb-14" data-testid="section-ca-hero">
            <h1
              className="text-3xl md:text-5xl font-bold leading-tight mb-2 md:mb-4"
              style={{ color: NAVY }}
              data-testid="text-ca-headline"
            >
              Your calculators are just the beginning.
            </h1>
            <p
              className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
              data-testid="text-ca-subheadline"
            >
              A free RE Data Metrix account gives you deal analysis, lender access,
              and a full investing toolset — no credit card required.
            </p>
          </section>

          {/* 2. Comparison Table */}
          <section className="mb-2" data-testid="section-ca-comparison">
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-ca-comparison">
                  <thead>
                    <tr style={{ backgroundColor: NAVY }}>
                      <th className="text-left px-4 py-3 text-white font-semibold">
                        Feature
                      </th>
                      <th className="text-center px-4 py-3 text-white font-semibold">
                        Free
                      </th>
                      <th
                        className="text-center px-4 py-3 font-bold"
                        style={{ color: GOLD }}
                      >
                        Paid
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row, i) => (
                      <tr
                        key={row.feature}
                        className={i % 2 === 0 ? "bg-muted/40" : "bg-background"}
                        data-testid={`row-ca-feature-${i}`}
                      >
                        <td className="px-4 py-3 font-medium">{row.feature}</td>
                        <td className="px-4 py-3 text-center">
                          <CellValue value={row.free} kind="free" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <CellValue value={row.paid} kind="paid" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Mid-page CTA */}
          <div className="flex justify-center mt-2 mb-4" data-testid="section-ca-mid-cta">
            <Button
              size="lg"
              onClick={goRegister}
              className="w-full md:w-auto md:min-w-[200px] font-bold border-transparent"
              style={{ backgroundColor: GOLD, color: NAVY }}
              data-testid="button-ca-mid-cta"
            >
              Create Free Account
            </Button>
          </div>

          {/* 3. Pricing cards */}
          <section
            className="grid gap-4 md:grid-cols-2 mb-8"
            data-testid="section-ca-pricing"
          >
            <Card data-testid="card-ca-monthly">
              <CardContent className="p-6 flex flex-col">
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Monthly
                </div>
                <div className="mb-2">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: NAVY }}
                    data-testid="text-ca-monthly-price"
                  >
                    $25
                  </span>
                  <span className="text-base text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Cancel anytime. No contracts.
                </p>
                <Button
                  onClick={goRegister}
                  className="w-full border-transparent mt-auto"
                  style={{ backgroundColor: GOLD, color: NAVY }}
                  data-testid="button-ca-monthly-cta"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card
              className="border-2"
              style={{ borderColor: GOLD }}
              data-testid="card-ca-annual"
            >
              <CardContent className="p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Annual
                  </div>
                  <Badge
                    className="border-transparent"
                    style={{ backgroundColor: GOLD, color: NAVY }}
                    data-testid="badge-ca-best-value"
                  >
                    Best Value
                  </Badge>
                </div>
                <div className="mb-2">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: NAVY }}
                    data-testid="text-ca-annual-price"
                  >
                    $250
                  </span>
                  <span className="text-base text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Save $50 — that's 2 months free.
                </p>
                <Button
                  onClick={goRegister}
                  className="w-full border-transparent mt-auto"
                  style={{ backgroundColor: GOLD, color: NAVY }}
                  data-testid="button-ca-annual-cta"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* 4. Secondary CTA */}
          <div className="text-center mb-8">
            <a
              href="/features"
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              data-testid="link-ca-see-features"
            >
              Want to see everything that's included? → See All Features
            </a>
          </div>

          {/* 5. Footer note */}
          <p
            className="text-xs text-muted-foreground text-center"
            data-testid="text-ca-footer-note"
          >
            No credit card required. Free account is yours to keep forever.
          </p>
        </div>
      </div>
    </>
  );
}
