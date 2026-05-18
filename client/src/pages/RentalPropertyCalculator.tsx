import { Link } from "wouter";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import RentalCalculatorForm from "@/components/RentalCalculatorForm";
import { SEO } from "@/components/SEO";

export default function RentalPropertyCalculator() {
  return (
    <>
      <SEO
        title="Rental Property Calculator"
        description="Free rental property calculator — analyze buy-and-hold deals with IRR, cap rate, cash-on-cash return, and year-by-year cash flow projections."
      />
      <Navigation />
      <div className="container max-w-5xl mx-auto py-6 px-4">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3"
            data-testid="button-rc-back-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

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

        <div className="text-xs text-muted-foreground text-center mt-8 pt-6 border-t">
          No account required. Results are estimates for educational purposes.
        </div>
      </div>
    </>
  );
}
