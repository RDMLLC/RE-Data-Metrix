import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { WizardFormData } from "./DealAnalysisWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Step6CriteriaSelection from "./Step6CriteriaSelection";
import type { LoanCriteria } from "@shared/schema";

interface Step6ResultsProps {
  form: UseFormReturn<WizardFormData>;
  onBack: () => void;
}

export default function Step6Results({ form, onBack }: Step6ResultsProps) {
  const [showCriteriaSelection, setShowCriteriaSelection] = useState(true);
  const [criteriaSelected, setCriteriaSelected] = useState(false);
  const [useDefaultCriteria, setUseDefaultCriteria] = useState(true);
  const [primaryCriteria, setPrimaryCriteria] = useState<LoanCriteria | undefined>();
  const [secondaryCriteria, setSecondaryCriteria] = useState<LoanCriteria | undefined>();

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
          {useDefaultCriteria ? (
            <Badge>Default Criteria</Badge>
          ) : (
            <>
              {primaryCriteria && <Badge>Primary: {primaryCriteria}</Badge>}
              {secondaryCriteria && <Badge variant="secondary">Secondary: {secondaryCriteria}</Badge>}
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
                  <TableHead className="text-center">Your Loan</TableHead>
                  <TableHead className="text-center">Lender 1</TableHead>
                  <TableHead className="text-center">Lender 2</TableHead>
                  <TableHead className="text-center">Lender 3</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Purchase Price</TableCell>
                  <TableCell className="text-center" data-testid="cash-purchase-price">-</TableCell>
                  <TableCell className="text-center" data-testid="user-purchase-price">-</TableCell>
                  <TableCell className="text-center" data-testid="lender1-purchase-price">-</TableCell>
                  <TableCell className="text-center" data-testid="lender2-purchase-price">-</TableCell>
                  <TableCell className="text-center" data-testid="lender3-purchase-price">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Rehab Budget</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Total Project Cost</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Closing Costs (Buy)</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Carrying Costs</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Total Investment</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Sell Price (ARV)</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Closing Costs (Sell)</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Real Estate Commission</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Rolled Costs</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Lender Draw Fees</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Est. Profit</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Est. Out of Pocket Cost</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Cash-on-Cash ROI</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                </TableRow>
                
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Annualized Cash-on-Cash ROI</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Percentage ARV</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium">Percentage ARV (Lender)</TableCell>
                  <TableCell className="text-center">N/A</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell className="font-medium"></TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" variant="outline" disabled data-testid="button-apply-user-loan">
                      Your Loan
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" data-testid="button-apply-lender1">
                      Click Here to Apply
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" data-testid="button-apply-lender2">
                      Click Here to Apply
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" data-testid="button-apply-lender3">
                      Click Here to Apply
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-center">
            <Button variant="outline" data-testid="button-view-more-loans">
              Click Here to View More Loans
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
