import { useState } from "react";
import { useWizardData } from "@/contexts/WizardDataContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { calculateDSCR } from "@shared/utils/dscr-calculator";
import { useLocation } from "wouter";

export default function RentalAnalysisWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const { wizardData, hasPropertyData } = useWizardData();
  const [, setLocation] = useLocation();
  const [monthlyRent, setMonthlyRent] = useState<number>(wizardData.property?.estimatedRent || 0);
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
                  {property.estimatedRent && property.estimatedRent > 0 && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <CheckCircle className="inline h-4 w-4 mr-1 text-emerald-600" />
                      Zillow RentZestimate: ${property.estimatedRent.toLocaleString()} (editable)
                    </p>
                  )}
                  {(!property.estimatedRent || property.estimatedRent === 0) && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <AlertCircle className="inline h-4 w-4 mr-1 text-amber-600" />
                      No estimated rent available from property data - please enter manually
                    </p>
                  )}
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
                {/* DSCR Score Display */}
                <div className={`p-6 rounded-lg ${
                  dscrResults.dscrStatus === 'good' ? 'bg-emerald-500/10 border-2 border-emerald-500' :
                  dscrResults.dscrStatus === 'caution' ? 'bg-yellow-500/10 border-2 border-yellow-500' :
                  'bg-red-500/10 border-2 border-red-500'
                }`}>
                  <p className="text-sm text-muted-foreground mb-1">Debt Service Coverage Ratio</p>
                  <p className="text-4xl font-bold">{dscrResults.dscr.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {dscrResults.dscrStatus === 'good' && (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-700">
                          Excellent - Most DSCR lenders approve 1.2+
                        </p>
                      </>
                    )}
                    {dscrResults.dscrStatus === 'caution' && (
                      <>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <p className="text-sm font-medium text-yellow-700">
                          Borderline - Limited lender options at 1.0-1.2
                        </p>
                      </>
                    )}
                    {dscrResults.dscrStatus === 'poor' && (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <p className="text-sm font-medium text-red-700">
                          Below Minimum - DSCR lenders require 1.0+
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Editable Interest Rate */}
                <Card className="p-4 bg-accent/5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2">
                        Interest Rate (Annual)
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Adjust to see how different rates affect your DSCR
                      </p>
                      <div className="relative max-w-xs">
                        <input
                          type="number"
                          value={interestRate}
                          onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                          min="0"
                          max="20"
                          step="0.25"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm pr-8"
                          data-testid="input-interest-rate"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-1">Typical DSCR Rates:</p>
                      <p className="text-xs">• 7.5% - 9.5% (current market)</p>
                      <p className="text-xs">• Varies by credit score</p>
                      <p className="text-xs">• Higher rates = lower DSCR</p>
                    </div>
                  </div>
                </Card>

                {/* Loan Details Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Loan Details (80% LTV on ARV)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Loan Amount</p>
                      <p className="font-medium">${dscrResults.loanAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="font-medium">{interestRate.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly P&I</p>
                      <p className="font-medium">${dscrResults.monthlyPrincipalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Rent</p>
                      <p className="font-medium">${monthlyRent.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                  </div>
                </div>

                {/* PITIA Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Monthly PITIA Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Principal & Interest</p>
                      <p className="font-medium">${dscrResults.monthlyPrincipalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Property Tax</p>
                      <p className="font-medium">${dscrResults.monthlyPropertyTax.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Insurance</p>
                      <p className="font-medium">${dscrResults.monthlyInsurance.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">HOA Fees</p>
                      <p className="font-medium">${dscrResults.monthlyHoa.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                    <div className="col-span-2 border-t pt-2">
                      <p className="text-sm text-muted-foreground">Total Monthly PITIA</p>
                      <p className="font-bold text-lg">${dscrResults.totalMonthlyPITIA.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
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
