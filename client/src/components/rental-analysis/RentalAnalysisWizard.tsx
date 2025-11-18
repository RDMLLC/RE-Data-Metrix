import { useState } from "react";
import { useWizardData } from "@/contexts/WizardDataContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { calculateDSCR } from "@shared/utils/dscr-calculator";
import { useLocation } from "wouter";

export default function RentalAnalysisWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const { wizardData, hasPropertyData } = useWizardData();
  const [, setLocation] = useLocation();
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(6.5);

  if (!hasPropertyData()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Rental Analysis requires property information. Please complete the Deal Analysis wizard first.
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button
              onClick={() => setLocation("/deal-analysis")}
              data-testid="button-start-deal-analysis"
            >
              Start Deal Analysis
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const property = wizardData.property!;
  const investor = wizardData.investor;

  const monthlyPropertyTax = ((property.taxAssessedValue || property.purchasePrice || 0) * 0.012) / 12;
  const monthlyInsurance = (property.annualInsurance || 0) / 12;
  const monthlyHoa = property.hoaFees || 0;

  const dscrResults = monthlyRent > 0 && property.arv
    ? calculateDSCR({
        arv: property.arv,
        monthlyRent,
        monthlyPropertyTax,
        monthlyInsurance,
        monthlyHoa,
        interestRate,
      })
    : null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Rental Analysis</h1>
          <p className="text-lg text-muted-foreground">
            Analyze rental property cash flow and DSCR
          </p>
        </div>

        <Card className="p-8">
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Property Review</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{property.address}, {property.city}, {property.state} {property.zip}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ARV</p>
                    <p className="font-medium">${property.arv?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                    <p className="font-medium">{property.bedrooms || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                    <p className="font-medium">{property.bathrooms || "N/A"}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <Button onClick={() => setCurrentStep(2)} data-testid="button-next-step">
                    Next: Enter Rental Income
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Rental Income</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Expected Monthly Rent</label>
                  <input
                    type="number"
                    value={monthlyRent || ""}
                    onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    placeholder="e.g., 2500"
                    data-testid="input-monthly-rent"
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} data-testid="button-back">
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(3)} data-testid="button-calculate-dscr">
                    Calculate DSCR
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && dscrResults && (
            <div>
              <h2 className="text-2xl font-bold mb-6">DSCR Results</h2>
              <div className="space-y-6">
                <div className={`p-6 rounded-lg ${
                  dscrResults.dscrStatus === 'good' ? 'bg-green-500/10 border-2 border-green-500' :
                  dscrResults.dscrStatus === 'caution' ? 'bg-yellow-500/10 border-2 border-yellow-500' :
                  'bg-red-500/10 border-2 border-red-500'
                }`}>
                  <p className="text-sm text-muted-foreground mb-1">Debt Service Coverage Ratio</p>
                  <p className="text-4xl font-bold">{dscrResults.dscr.toFixed(2)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Loan Amount (80% LTV)</p>
                    <p className="font-medium">${dscrResults.loanAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly P&I</p>
                    <p className="font-medium">${dscrResults.monthlyPrincipalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Tax</p>
                    <p className="font-medium">${dscrResults.monthlyPropertyTax.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Insurance</p>
                    <p className="font-medium">${dscrResults.monthlyInsurance.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly HOA</p>
                    <p className="font-medium">${dscrResults.monthlyHoa.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total PITIA</p>
                    <p className="font-medium">${dscrResults.totalMonthlyPITIA.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="button-back-to-rent">
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} data-testid="button-find-lenders">
                    Find DSCR Lenders
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">DSCR Lenders</h2>
              <p className="text-muted-foreground mb-4">
                Lender matching will be available soon. This section will display matched DSCR lenders based on your property and credit profile.
              </p>
              <Button variant="outline" onClick={() => setCurrentStep(3)} data-testid="button-back-to-results">
                Back to Results
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
