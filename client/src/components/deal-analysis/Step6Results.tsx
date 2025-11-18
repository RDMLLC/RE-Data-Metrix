import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { WizardFormData } from "./DealAnalysisWizard";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Step6CriteriaSelection from "./Step6CriteriaSelection";
import type { LoanCriteria } from "@shared/schema";
import { useWizardData } from "@/contexts/WizardDataContext";

interface Step6ResultsProps {
  form: UseFormReturn<WizardFormData>;
  onBack: () => void;
}

interface LoanComparisonColumn {
  type: 'cash' | 'user-loan' | 'lender';
  lenderId?: string;
  lenderName?: string;
  productId?: string;
  productName?: string;
  timeToClose?: number;
  maxLoanArv?: number;
  purchasePrice: number;
  rehabBudget: number;
  totalProjectCost: number;
  closingCostsBuy: number;
  carryingCosts: number;
  totalInvestment: number;
  sellPrice: number;
  closingCostsSell: number;
  commission: number;
  rolledCosts: number;
  lenderDrawFees: number;
  profit: number;
  outOfPocketCost: number;
  cashOnCashRoi: number;
  annualizedRoi: number;
  roi: number;
  percentageArv: number;
  percentageArvLender?: number;
}

interface ResultsResponse {
  cashSaleColumn: LoanComparisonColumn;
  userLoanColumn: LoanComparisonColumn | null;
  lenderColumns: LoanComparisonColumn[];
  criteriaUsed: {
    useDefaultCriteria: boolean;
    primary?: LoanCriteria;
    secondary?: LoanCriteria;
  };
  numberOfDraws: number;
  allRankedProducts: number;
}

export default function Step6Results({ form, onBack }: Step6ResultsProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { updatePropertyData, updateInvestorData } = useWizardData();
  const [showCriteriaSelection, setShowCriteriaSelection] = useState(true);
  const [criteriaSelected, setCriteriaSelected] = useState(false);
  const [useDefaultCriteria, setUseDefaultCriteria] = useState(true);
  const [primaryCriteria, setPrimaryCriteria] = useState<LoanCriteria | undefined>();
  const [secondaryCriteria, setSecondaryCriteria] = useState<LoanCriteria | undefined>();
  const [visibleLenderCount, setVisibleLenderCount] = useState(3);
  const [results, setResults] = useState<ResultsResponse | null>(null);

  const calculateResultsMutation = useMutation<ResultsResponse, Error, any>({
    mutationFn: async (payload: any) => {
      const response = await apiRequest("POST", "/api/deal-analysis/results", payload);
      return await response.json();
    },
    onSuccess: (data) => {
      setResults(data);
    },
    onError: (error: any) => {
      toast({
        title: "Calculation Error",
        description: error.message || "Failed to calculate loan results",
        variant: "destructive",
      });
    },
  });

  const handleCriteriaSelected = (
    useDefault: boolean,
    primary?: LoanCriteria,
    secondary?: LoanCriteria
  ) => {
    setUseDefaultCriteria(useDefault);
    setPrimaryCriteria(primary);
    setSecondaryCriteria(secondary);
    setShowCriteriaSelection(false);
    setCriteriaSelected(true);

    const formData = form.getValues();
    
    const monthlyInsurance = (formData.annualInsurance || 0) / 12;
    const monthlyUtilities = formData.monthlyUtilities || 0;
    const monthlyPropertyTax = ((formData.taxAssessedValue || formData.purchasePrice || 0) * 0.012) / 12;
    const monthlyHoa = formData.hoaFees || 0;
    const projectLength = formData.projectLength || 6;
    const totalCarryingCosts = (monthlyInsurance + monthlyUtilities + monthlyPropertyTax + monthlyHoa) * projectLength;
    
    const payload = {
      dealInputs: {
        purchasePrice: formData.purchasePrice || 0,
        rehabBudget: formData.rehabBudget || 0,
        arv: formData.arv || 0,
        projectLength: projectLength,
        closingCostsBuy: (formData.attorneyFees || 0) + (formData.docPrepFees || 0) + 
                         (formData.titleExam || 0) + (formData.titleInsurance || 0),
        carryingCosts: totalCarryingCosts,
        sellPrice: formData.sellPrice || formData.arv || 0,
        closingCostsSell: (formData.sellPrice || formData.arv || 0) * 
                          ((formData.closingCostsSellPercent || 2) / 100),
        commission: (formData.sellPrice || formData.arv || 0) * 
                    ((formData.realEstateCommissionPercent || 6) / 100),
        monthlyInsurance: monthlyInsurance,
        monthlyUtilities: monthlyUtilities,
        monthlyPropertyTax: monthlyPropertyTax,
        monthlyHoa: monthlyHoa,
      },
      criteriaSelection: {
        useDefaultCriteria: useDefault,
        primary: primary,
        secondary: secondary,
      },
      userLoan: formData.maxLendBuy ? {
        desiredLoanAmount: undefined,
        interestRate: formData.loanInterestRate || 12,
        interestDeferred: formData.interestDeferred || false,
        points: formData.loanPoints || 0,
        pointsDeferred: formData.pointsDeferred || false,
        maxLoanToArv: formData.maxLoanToArv || 70,
        appraisalRequired: formData.appraisalRequired || false,
        appraisalFee: formData.appraisalFee || 500,
        drawFees: formData.drawFees || 0,
        loanDocPrepFees: formData.loanDocPrepFees || 0,
      } : undefined,
      numberOfDraws: 3,
      excludeProductIds: [],
    };

    calculateResultsMutation.mutate(payload);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const handleViewMoreLoans = () => {
    if (results && visibleLenderCount < results.lenderColumns.length) {
      setVisibleLenderCount(prev => Math.min(prev + 3, results.lenderColumns.length));
    }
  };

  const handleNavigateToRentalAnalysis = () => {
    // Save current form data to WizardDataContext before navigating
    const formData = form.getValues();
    
    updatePropertyData({
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zipCode,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      squareFootage: formData.sqft,
      purchasePrice: formData.purchasePrice,
      arv: formData.arv,
      rehabBudget: formData.rehabBudget,
      taxAssessedValue: formData.taxAssessedValue,
      annualInsurance: formData.annualInsurance,
      monthlyUtilities: formData.monthlyUtilities,
      hoaFees: formData.hoaFees,
      hoaTransferFee: formData.hoaTransferFee,
      projectLength: formData.projectLength,
      sellPrice: formData.sellPrice,
      closingCostsSellPercent: formData.closingCostsSellPercent,
      realEstateCommissionPercent: formData.realEstateCommissionPercent,
      attorneyFees: formData.attorneyFees,
      docPrepFees: formData.docPrepFees,
      titleExam: formData.titleExam,
      titleInsurance: formData.titleInsurance,
    });

    if (formData.creditScore) {
      updateInvestorData({
        creditScore: parseInt(formData.creditScore),
        experienceLevel: formData.isNewInvestor ? "new" : "experienced",
      });
    }

    setLocation("/rental-analysis");
  };

  if (showCriteriaSelection) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Step6CriteriaSelection onContinue={handleCriteriaSelected} />
      </div>
    );
  }

  if (calculateResultsMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Calculating loan comparisons...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-lg text-destructive">No results available</p>
        <Button onClick={() => setShowCriteriaSelection(true)}>
          Try Again
        </Button>
      </div>
    );
  }

  const visibleLenders = results.lenderColumns.slice(0, visibleLenderCount);
  const hasMoreLenders = visibleLenderCount < results.lenderColumns.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowCriteriaSelection(true)}
          data-testid="button-change-criteria"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Change Criteria
        </Button>
        
        <div className="flex gap-2">
          {results.criteriaUsed.useDefaultCriteria ? (
            <Badge>Default Criteria</Badge>
          ) : (
            <>
              {results.criteriaUsed.primary && <Badge>Primary: {results.criteriaUsed.primary}</Badge>}
              {results.criteriaUsed.secondary && <Badge variant="secondary">Secondary: {results.criteriaUsed.secondary}</Badge>}
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Comparison Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Metric</TableHead>
                  <TableHead className="text-center">Cash Sale</TableHead>
                  {results.userLoanColumn && <TableHead className="text-center">Your Loan</TableHead>}
                  {visibleLenders.map((lender, index) => (
                    <TableHead key={index} className="text-center">
                      {lender.lenderName || `Lender ${index + 1}`}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Purchase Price</TableCell>
                  <TableCell className="text-center" data-testid="cash-purchase-price">
                    {formatCurrency(results.cashSaleColumn.purchasePrice)}
                  </TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center" data-testid="user-purchase-price">
                      {formatCurrency(results.userLoanColumn.purchasePrice)}
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center" data-testid={`lender${index + 1}-purchase-price`}>
                      {formatCurrency(lender.purchasePrice)}
                    </TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Rehab Budget</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.rehabBudget)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.rehabBudget)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.rehabBudget)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Total Project Cost</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.totalProjectCost)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.totalProjectCost)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.totalProjectCost)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Closing Costs (Buy)</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.closingCostsBuy)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.closingCostsBuy)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.closingCostsBuy)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Carrying Costs</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.carryingCosts)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.carryingCosts)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.carryingCosts)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Total Investment</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.totalInvestment)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.totalInvestment)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.totalInvestment)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Sell Price (ARV)</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.sellPrice)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.sellPrice)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.sellPrice)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Closing Costs (Sell)</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.closingCostsSell)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.closingCostsSell)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.closingCostsSell)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Real Estate Commission</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.commission)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.commission)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.commission)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Rolled Costs</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.rolledCosts)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.rolledCosts)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.rolledCosts)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Lender Draw Fees</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.lenderDrawFees)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.lenderDrawFees)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.lenderDrawFees)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Est. Profit</TableCell>
                  <TableCell className="text-center font-bold">{formatCurrency(results.cashSaleColumn.profit)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-bold">{formatCurrency(results.userLoanColumn.profit)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatCurrency(lender.profit)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Out of Pocket Cost</TableCell>
                  <TableCell className="text-center">{formatCurrency(results.cashSaleColumn.outOfPocketCost)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatCurrency(results.userLoanColumn.outOfPocketCost)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatCurrency(lender.outOfPocketCost)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">ROI %</TableCell>
                  <TableCell className="text-center font-bold">{formatPercent(results.cashSaleColumn.roi)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-bold">{formatPercent(results.userLoanColumn.roi)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatPercent(lender.roi)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Cash-on-Cash ROI</TableCell>
                  <TableCell className="text-center font-bold">{formatPercent(results.cashSaleColumn.cashOnCashRoi)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-bold">{formatPercent(results.userLoanColumn.cashOnCashRoi)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatPercent(lender.cashOnCashRoi)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Annualized Cash-on-Cash ROI</TableCell>
                  <TableCell className="text-center font-bold">{formatPercent(results.cashSaleColumn.annualizedRoi)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center font-bold">{formatPercent(results.userLoanColumn.annualizedRoi)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center font-bold">{formatPercent(lender.annualizedRoi)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Percentage ARV</TableCell>
                  <TableCell className="text-center">{formatPercent(results.cashSaleColumn.percentageArv)}</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatPercent(results.userLoanColumn.percentageArv)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatPercent(lender.percentageArv)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Percentage ARV (Lender)</TableCell>
                  <TableCell className="text-center">N/A</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">{formatPercent(results.userLoanColumn.percentageArvLender || 0)}</TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">{formatPercent(lender.percentageArvLender || 0)}</TableCell>
                  ))}
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium"></TableCell>
                  <TableCell className="text-center">-</TableCell>
                  {results.userLoanColumn && (
                    <TableCell className="text-center">
                      <Button size="sm" variant="outline" disabled data-testid="button-apply-user-loan">
                        Your Loan
                      </Button>
                    </TableCell>
                  )}
                  {visibleLenders.map((lender, index) => (
                    <TableCell key={index} className="text-center">
                      <Button size="sm" data-testid={`button-apply-lender${index + 1}`}>
                        Click Here to Apply
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {hasMoreLenders && (
            <div className="mt-6 flex justify-center">
              <Button 
                variant="outline" 
                onClick={handleViewMoreLoans}
                data-testid="button-view-more-loans"
              >
                View More Loans ({results.lenderColumns.length - visibleLenderCount} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                Considering the BRRRR Strategy?
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                Analyze this property as a rental! Calculate your DSCR (Debt Service Coverage Ratio), evaluate long-term cash flow, and find specialized DSCR lenders who offer financing based on rental income.
              </p>
              <Button
                type="button"
                variant="default"
                onClick={handleNavigateToRentalAnalysis}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="button-rental-analysis-step6"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Analyze as Rental Property
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
