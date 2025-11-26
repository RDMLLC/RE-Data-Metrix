import { useState, useEffect } from "react";
import { useWizardData } from "@/contexts/WizardDataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, AlertTriangle, XCircle, Phone, Mail, Globe, Clock, Percent, Building, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { calculateDSCR } from "@shared/utils/dscr-calculator";
import { getInsuranceCostPerSqFt } from "@shared/data/insurance-costs";
import { useLocation } from "wouter";
import LoanTypeEducation from "./LoanTypeEducation";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface DSCRLender {
  productId: string;
  lenderId: string;
  lenderName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  productName: string;
  loanType: string;
  interestRate: number;
  points: number;
  minCreditScore: number;
  maxLtvBuy: number;
  maxLoanArv: number;
  timeToClose: number;
  referralLink: string;
  fees: number;
  isPreferred: boolean;
}

export default function RentalAnalysisWizard() {
  const { wizardData, hasPropertyData, clearWizardData } = useWizardData();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [monthlyRent, setMonthlyRent] = useState<number>(wizardData.property?.estimatedRent || 0);
  const [interestRate, setInterestRate] = useState<number>(7.5);
  const [showLenders, setShowLenders] = useState(false);

  const handleStartNewAnalysis = () => {
    clearWizardData();
    toast({
      title: "Starting new analysis...",
      description: "Your previous data has been cleared.",
    });
    setLocation('/deal-analysis');
  };

  // Reset showLenders when component mounts to prevent getting stuck in lender view
  useEffect(() => {
    setShowLenders(false);
  }, []);

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

  // Calculate annual insurance using the insurance costs table if not already set
  const annualInsurance = property.annualInsurance || 
    (property.state && property.squareFootage 
      ? Math.round(property.squareFootage * getInsuranceCostPerSqFt(property.state))
      : 0);

  const monthlyPropertyTax = ((property.taxAssessedValue || property.purchasePrice || 0) * 0.012) / 12;
  const monthlyInsurance = annualInsurance / 12;
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

  const { data: dscrLenders, isLoading: isLoadingLenders } = useQuery<DSCRLender[]>({
    queryKey: ['/api/dscr-lenders', property?.state],
    queryFn: async () => {
      const url = property?.state 
        ? `/api/dscr-lenders?state=${encodeURIComponent(property.state)}`
        : '/api/dscr-lenders';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch DSCR lenders');
      return res.json();
    },
    enabled: showLenders,
  });

  const getLoanTypeLabel = (loanType: string) => {
    switch (loanType) {
      case 'dscr-purchase': return 'DSCR Purchase';
      case 'dscr-refi': return 'DSCR Refinance';
      default: return loanType;
    }
  };

  if (showLenders) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowLenders(false)} 
              className="gap-2"
              data-testid="button-back-to-results"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Results
            </Button>
          </div>
          
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-2 text-primary">DSCR Lenders</h2>
            <p className="text-muted-foreground mb-6">
              Lenders offering DSCR loans for rental property purchases and refinances in {property?.state || 'your area'}.
            </p>
            
            {isLoadingLenders ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading lenders...</span>
              </div>
            ) : dscrLenders && dscrLenders.length > 0 ? (
              <div className="space-y-6">
                {dscrLenders.map((lender) => (
                  <Card key={lender.productId} className="p-6 border-l-4 border-l-primary" data-testid={`card-dscr-lender-${lender.productId}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-semibold text-primary" data-testid={`text-lender-name-${lender.productId}`}>
                            {lender.lenderName}
                          </h3>
                          {lender.isPreferred && (
                            <Badge variant="default" className="bg-accent text-accent-foreground">
                              Preferred
                            </Badge>
                          )}
                          <Badge variant="secondary">
                            {getLoanTypeLabel(lender.loanType)}
                          </Badge>
                        </div>
                        
                        <p className="text-lg font-medium text-foreground mb-3">{lender.productName}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Interest Rate</p>
                              <p className="font-semibold">{lender.interestRate}%</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Points</p>
                              <p className="font-semibold">{lender.points}%</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Time to Close</p>
                              <p className="font-semibold">{lender.timeToClose || 'N/A'} days</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Max LTV</p>
                            <p className="font-semibold">{lender.maxLtvBuy || lender.maxLoanArv || 'N/A'}%</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {lender.contactName && (
                            <span>Contact: {lender.contactName}</span>
                          )}
                          {lender.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lender.phone}
                            </span>
                          )}
                          {lender.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {lender.email}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 lg:items-end">
                        {lender.referralLink && (
                          <Button asChild data-testid={`button-apply-${lender.productId}`}>
                            <a href={lender.referralLink} target="_blank" rel="noopener noreferrer" className="gap-2">
                              Apply Now <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {lender.website && (
                          <Button variant="outline" asChild data-testid={`button-website-${lender.productId}`}>
                            <a href={lender.website} target="_blank" rel="noopener noreferrer" className="gap-2">
                              <Globe className="h-4 w-4" /> Visit Website
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No DSCR Lenders Found</h3>
                <p className="text-muted-foreground mb-6">
                  We don't have any DSCR lenders in our database yet for {property?.state || 'your area'}. 
                  Check back soon as we're constantly adding new lending partners.
                </p>
                <Button variant="outline" onClick={() => setShowLenders(false)}>
                  Back to Analysis
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/deal-analysis?step=5')} 
            className="gap-2"
            data-testid="button-back-to-deal-analysis"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deal Analysis
          </Button>
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h1 className="text-4xl font-bold text-primary">Rental Analysis</h1>
            <Button
              variant="outline"
              onClick={handleStartNewAnalysis}
              data-testid="button-start-new-analysis"
            >
              Start New Analysis
            </Button>
          </div>
          <p className="text-lg text-muted-foreground mb-4">
            Analyze rental property cash flow and DSCR
          </p>
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-6 space-y-3">
            <p className="text-foreground">
              There are a lot more options available to an investor when purchasing a buy and hold property. On this page, we'll help you do a basic profitability analysis of the property when looking at a 30-year fixed loan. It's a good starting point!
            </p>
            <p className="text-muted-foreground">
              Scroll down to learn more about the various options available and help in selecting a lender or broker.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Property Review Card */}
          <Card>
            <CardHeader>
              <CardTitle>Property Overview</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Rental Income Card */}
          <Card>
            <CardHeader>
              <CardTitle>Expected Monthly Rent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {property.estimatedRent && property.estimatedRent > 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Zillow RentZestimate: ${property.estimatedRent.toLocaleString()} (editable)
                  </p>
                )}
                {(!property.estimatedRent || property.estimatedRent === 0) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    No estimated rent available from property data - please enter manually
                  </p>
                )}
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input
                    type="number"
                    value={monthlyRent || ""}
                    onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm pl-6"
                    placeholder="2500"
                    data-testid="input-monthly-rent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DSCR Results Card - Only show if monthly rent is entered */}
          {dscrResults && (
            <Card>
              <CardHeader>
                <CardTitle>DSCR Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <div className="flex flex-col lg:flex-row items-start gap-4">
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
                    <div className="text-sm text-muted-foreground border-l pl-4">
                      <p className="font-medium mb-2">Assumptions:</p>
                      <p className="text-xs">• 30-year fixed mortgage</p>
                      <p className="text-xs">• 75% financed</p>
                      <p className="text-xs">• 25% down payment (or equity contribution)</p>
                    </div>
                    <div className="text-sm text-muted-foreground border-l pl-4">
                      <p className="font-medium mb-2">Typical DSCR Rates:</p>
                      <p className="text-xs">• 7.5% - 9.5% (current market)</p>
                      <p className="text-xs">• Varies by credit score</p>
                      <p className="text-xs">• Higher rates = lower DSCR</p>
                    </div>
                  </div>
                </Card>

                {/* Loan Details Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Loan Details (75% LTV on ARV)</h3>
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
                      <p className="text-sm text-muted-foreground">Expected Monthly Rent</p>
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
                      <p className="text-sm text-muted-foreground">Insurance (Monthly)</p>
                      <p className="font-medium">${dscrResults.monthlyInsurance.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Annual: ${annualInsurance.toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </p>
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

                <div className="mt-6">
                  <Button onClick={() => setShowLenders(true)} data-testid="button-find-lenders">
                    Find DSCR Lenders
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loan Type Education Section */}
          <div className="mt-12">
            <LoanTypeEducation 
              propertyState={property.state} 
              creditScore={wizardData.investor?.creditScore}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
