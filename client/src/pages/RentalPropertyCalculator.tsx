import { useLocation } from "wouter";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import RentalCalculatorForm from "@/components/RentalCalculatorForm";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/StructuredData";
import { CalculatorContent, type FAQItem } from "@/components/CalculatorContent";

const RENTAL_EXPLAINER =
  "Buying a rental property is one of the most powerful long-term wealth-building strategies available to individual investors — but only if the numbers work. This calculator gives you a complete financial picture of any buy-and-hold rental: monthly and annual cash flow, net operating income, cap rate, cash-on-cash return, and the projected IRR over your full holding period. Unlike simple rent-minus-mortgage calculators, this tool accounts for vacancy, property management fees, annual rent and expense growth, and the eventual sale of the property, giving you a realistic projection of returns rather than a back-of-the-napkin estimate. Use it to compare properties, stress-test assumptions, and identify the deals that actually deliver on their promise.";

const RENTAL_FAQS: FAQItem[] = [
  {
    question: "What is a good cap rate for a rental property?",
    answer:
      "Cap rate measures a property's annual net operating income as a percentage of its purchase price, independent of financing. A cap rate between 5% and 10% is generally considered reasonable for residential rentals, though what's \"good\" depends heavily on your market — a 5% cap rate in a high-appreciation urban market may outperform an 8% cap rate in a stagnant one. Cap rate is best used to compare similar properties in the same market, not across different regions.",
  },
  {
    question: "What is cash-on-cash return and how is it different from IRR?",
    answer:
      "Cash-on-cash return measures your annual cash flow as a percentage of the cash you actually invested — your down payment, closing costs, and repairs. It tells you how hard your money is working each year. IRR (Internal Rate of Return) is a more complete measure that accounts for all cash flows over the entire holding period, including the profit at sale. A property can have a modest cash-on-cash return in early years but a strong IRR if it appreciates significantly by the time you sell.",
  },
  {
    question: "How do vacancy rate and management fee affect my cash flow?",
    answer:
      "Vacancy rate represents the percentage of time your property sits unrented — even a 5% vacancy rate reduces your effective annual income by one month's rent. Management fees, typically 8–12% of collected rent, are the cost of having a property manager handle tenant relations, maintenance coordination, and rent collection. Together these two factors can reduce your gross rental income by 13–17% before you pay a single expense, which is why accurate estimates of both are critical when underwriting a deal.",
  },
];

export default function RentalPropertyCalculator() {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/toolbox");
    }
  };

  return (
    <>
      <SEO
        fullTitle="Rental Property Calculator — Cash Flow, Cap Rate & IRR | RE Data Metrix"
        description="Analyze any buy-and-hold rental property. Calculate monthly cash flow, cap rate, cash-on-cash return, NOI, and IRR over your full holding period."
      />
      <FAQSchema faqs={RENTAL_FAQS} />
      <Navigation />
      <div className="container max-w-5xl mx-auto py-6 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3"
          onClick={handleBack}
          data-testid="button-rc-back-home"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <Home className="h-7 w-7" style={{ color: "#1d408b" }} />
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: "#1d408b" }}
              data-testid="text-rc-title"
            >
              Rental Property Calculator
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Modify the values and click Calculate to evaluate a buy-and-hold rental.
            See cash flow, cap rate, IRR, and projected returns at sale.
          </p>
        </div>

        <RentalCalculatorForm variant="page" />

        <CalculatorContent
          explainer={RENTAL_EXPLAINER}
          faqs={RENTAL_FAQS}
          testIdPrefix="rc"
        />

        <div className="text-xs text-muted-foreground text-center mt-8 pt-6 border-t">
          No account required. Results are estimates for educational purposes.
        </div>
      </div>
    </>
  );
}
