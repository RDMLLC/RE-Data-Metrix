import { UseFormReturn } from "react-hook-form";
import { WizardFormData } from "./DealAnalysisWizard";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { TrendingUp, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getUtilityCostPerSqFt } from "@shared/data/utility-costs";
import { getInsuranceCostPerSqFt } from "@shared/data/insurance-costs";

interface Step4HoldingPeriodExitProps {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4HoldingPeriodExit({
  form,
  onNext,
  onBack,
}: Step4HoldingPeriodExitProps) {
  const [closingCostsOpen, setClosingCostsOpen] = useState(false);
  const [carryingCostsOpen, setCarryingCostsOpen] = useState(false);

  const purchasePrice = form.watch("purchasePrice") || 0;
  const rehabBudget = form.watch("rehabBudget") || 0;
  const arv = form.watch("arv") || 0;
  const projectLength = form.watch("projectLength") || 0;
  const state = form.watch("state") || "";
  const sqft = form.watch("sqft") || 0;
  
  const attorneyFees = form.watch("attorneyFees") || 0;
  const docPrepFees = form.watch("docPrepFees") || 0;
  const titleExam = form.watch("titleExam") || 0;
  const titleInsurance = form.watch("titleInsurance") || 0;
  
  const hoaFees = form.watch("hoaFees") || 0;
  const hoaTransferFee = form.watch("hoaTransferFee") || 0;
  const monthlyUtilities = form.watch("monthlyUtilities") || 0;
  const annualInsurance = form.watch("annualInsurance") || 0;
  const taxAssessedValue = form.watch("taxAssessedValue") || 0;
  
  const sellPrice = form.watch("sellPrice") || 0;
  const closingCostsSellPercent = form.watch("closingCostsSellPercent") || 1;
  const realEstateCommissionPercent = form.watch("realEstateCommissionPercent") || 6;

  // Track previous values using refs to detect changes for recalculation
  const prevPurchasePriceRef = useRef<number>(purchasePrice);
  const prevArvRef = useRef<number>(arv);
  const isInitializedRef = useRef<boolean>(false);

  // Initial setup of default values (runs once on mount)
  useEffect(() => {
    if (!form.getValues("attorneyFees")) {
      form.setValue("attorneyFees", 750);
    }
    if (!form.getValues("docPrepFees")) {
      form.setValue("docPrepFees", 0);
    }
    if (!form.getValues("titleExam")) {
      form.setValue("titleExam", 250);
    }
    if (!form.getValues("titleInsurance") && purchasePrice) {
      form.setValue("titleInsurance", Math.round(purchasePrice * 0.012));
    }
    
    if (!form.getValues("monthlyUtilities") && state && sqft) {
      const utilityCostPerSqFt = getUtilityCostPerSqFt(state);
      form.setValue("monthlyUtilities", Math.round(sqft * utilityCostPerSqFt));
    }
    
    if (!form.getValues("annualInsurance") && state && sqft) {
      const insuranceCostPerSqFt = getInsuranceCostPerSqFt(state);
      form.setValue("annualInsurance", Math.round(sqft * insuranceCostPerSqFt));
    }
    
    if (!form.getValues("sellPrice") && arv) {
      form.setValue("sellPrice", arv);
    }
    
    if (!form.getValues("closingCostsSellPercent")) {
      form.setValue("closingCostsSellPercent", 1);
    }
    
    if (!form.getValues("realEstateCommissionPercent")) {
      form.setValue("realEstateCommissionPercent", 6);
    }
    
    // Mark as initialized after first render
    isInitializedRef.current = true;
  }, [form, state, sqft]);

  // Recalculate Title Insurance when Purchase Price changes
  useEffect(() => {
    if (isInitializedRef.current && purchasePrice !== prevPurchasePriceRef.current) {
      form.setValue("titleInsurance", Math.round(purchasePrice * 0.012));
      prevPurchasePriceRef.current = purchasePrice;
    }
  }, [purchasePrice, form]);

  // Update Sell Price when ARV changes (if user hasn't manually overridden)
  useEffect(() => {
    if (isInitializedRef.current && arv !== prevArvRef.current) {
      const currentSellPrice = form.getValues("sellPrice");
      // Only update if sell price still equals the previous ARV (user hasn't manually changed it)
      if (currentSellPrice === prevArvRef.current || !currentSellPrice) {
        form.setValue("sellPrice", arv);
      }
      prevArvRef.current = arv;
    }
  }, [arv, form]);

  const totalProjectCost = purchasePrice + rehabBudget;
  
  const estimatedClosingCostsBuy = attorneyFees + docPrepFees + titleExam + titleInsurance;
  
  const propertyTaxMonthly = taxAssessedValue > 0 ? (taxAssessedValue * 0.01 / 12) : 0;
  const propertyTaxTotal = propertyTaxMonthly * projectLength;
  const utilitiesTotal = monthlyUtilities * projectLength;
  const insuranceTotal = (annualInsurance / 12) * projectLength;
  const hoaFeesTotal = hoaFees * projectLength;
  
  const estimatedCarryingCosts = hoaFeesTotal + hoaTransferFee + propertyTaxTotal + utilitiesTotal + insuranceTotal;
  
  const estimatedTotalInvestment = totalProjectCost + estimatedClosingCostsBuy + estimatedCarryingCosts;
  
  const closingCostsSell = sellPrice * (closingCostsSellPercent / 100);
  const realEstateCommission = sellPrice * (realEstateCommissionPercent / 100);
  
  const estimatedProfit = sellPrice - estimatedTotalInvestment - closingCostsSell - realEstateCommission;
  
  const percentageArv = arv > 0 ? (totalProjectCost / arv) * 100 : 0;
  const cashOnCashRoi = estimatedTotalInvestment > 0 ? (estimatedProfit / estimatedTotalInvestment) * 100 : 0;
  const annualCashOnCashRoi = projectLength > 0 ? (cashOnCashRoi / (projectLength / 12)) : 0;

  const handleSubmit = form.handleSubmit(() => {
    onNext();
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Holding Period & Exit Strategy
        </h2>
        <p className="text-muted-foreground mt-1">
          Review costs and profitability for this investment
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Purchase Price:</span>
                <span className="font-medium">{formatCurrency(purchasePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Rehab Budget:</span>
                <span className="font-medium">{formatCurrency(rehabBudget)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total Project Cost:</span>
                <span className="font-semibold" data-testid="text-total-project-cost-step4">
                  {formatCurrency(totalProjectCost)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Collapsible open={closingCostsOpen} onOpenChange={setClosingCostsOpen}>
            <Card>
              <CollapsibleTrigger className="w-full" data-testid="button-toggle-closing-costs">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <CardTitle className="text-lg">Estimated Closing Costs (Buy)</CardTitle>
                      <CardDescription>
                        {formatCurrency(estimatedClosingCostsBuy)} total
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Expand for details or to make changes</span>
                      <ChevronDown className={`h-5 w-5 transition-transform ${closingCostsOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="attorneyFees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attorney Fees</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              data-testid="input-attorney-fees"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="docPrepFees"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Doc Prep Fees</FormLabel>
                            <span className="text-xs text-muted-foreground">Will be filled out in the lender step</span>
                          </div>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              data-testid="input-doc-prep-fees"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="titleExam"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title Exam</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              data-testid="input-title-exam"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="titleInsurance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title Insurance</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              data-testid="input-title-insurance"
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-calculated at 1.2% of purchase price
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={carryingCostsOpen} onOpenChange={setCarryingCostsOpen}>
            <Card>
              <CollapsibleTrigger className="w-full" data-testid="button-toggle-carrying-costs">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <CardTitle className="text-lg">Estimated Carrying Costs</CardTitle>
                      <CardDescription>
                        {formatCurrency(estimatedCarryingCosts)} total
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Expand for details or to make changes</span>
                      <ChevronDown className={`h-5 w-5 transition-transform ${carryingCostsOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hoaFees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly HOA Fees</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              data-testid="input-hoa-fees"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hoaTransferFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HOA Transfer Fee</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              data-testid="input-hoa-transfer-fee"
                            />
                          </FormControl>
                          <FormDescription>
                            Typically one month HOA fee if applicable
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monthlyUtilities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Utilities</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              data-testid="input-monthly-utilities"
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-filled based on {state} averages
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="annualInsurance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Insurance</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              data-testid="input-annual-insurance"
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-filled based on {state} rates
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-muted/50 p-3 rounded-md space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Property Tax ({projectLength} months):</span>
                      <span className="font-medium">{formatCurrency(propertyTaxTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Utilities ({projectLength} months):</span>
                      <span className="font-medium">{formatCurrency(utilitiesTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance ({projectLength} months):</span>
                      <span className="font-medium">{formatCurrency(insuranceTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exit Strategy</CardTitle>
              <CardDescription>
                Adjust key variables to see real-time impact on profitability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-purchase-price-exit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rehabBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rehab Budget</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-rehab-budget-exit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Length (months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          step="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          data-testid="input-project-length-exit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sellPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Sell Price (ARV)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-sell-price"
                        />
                      </FormControl>
                      <FormDescription>
                        Defaults to ARV
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closingCostsSellPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closing Costs (Sell) %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-closing-costs-sell-percent"
                        />
                      </FormControl>
                      <FormDescription>
                        {formatCurrency(closingCostsSell)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="realEstateCommissionPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Real Estate Commission %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-commission-percent"
                        />
                      </FormControl>
                      <FormDescription>
                        {formatCurrency(realEstateCommission)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex flex-wrap items-baseline gap-2">
                <CardTitle className="text-lg">Profitability Analysis</CardTitle>
                <span className="text-sm text-muted-foreground">— Cash-on-cash return metrics for this deal</span>
              </div>
              <CardDescription>
                Profitability shown for a cash purchase I.E. no lender.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Estimated Total Investment:</span>
                <span className="text-lg font-semibold" data-testid="text-total-investment">
                  {formatCurrency(estimatedTotalInvestment)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Estimated Sell Price:</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(sellPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="font-semibold">Estimated Profit:</span>
                <span 
                  className={`text-xl font-bold ${estimatedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                  data-testid="text-estimated-profit"
                >
                  {formatCurrency(estimatedProfit)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">% of ARV</div>
                  <div className="text-lg font-semibold" data-testid="text-percentage-arv-step4">
                    {percentageArv.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Cash on Cash ROI</div>
                  <div className="text-lg font-semibold" data-testid="text-cash-on-cash-roi">
                    {cashOnCashRoi.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Annual ROI</div>
                  <div className="text-lg font-semibold" data-testid="text-annual-roi">
                    {annualCashOnCashRoi.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              data-testid="button-back"
            >
              Back
            </Button>
            <Button type="submit" data-testid="button-continue">
              Get Loan Information
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
