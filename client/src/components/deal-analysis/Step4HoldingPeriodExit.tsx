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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [closingCosts2Open, setClosingCosts2Open] = useState(false);
  const [carryingCostsOpen, setCarryingCostsOpen] = useState(false);

  const purchasePrice = form.watch("purchasePrice") || 0;
  const rehabBudget = form.watch("rehabBudget") || 0;
  const arv = form.watch("arv") || 0;
  const projectLength = form.watch("projectLength") || 0;
  const state = form.watch("state") || "";
  const sqft = form.watch("sqft") || 0;
  
  // Double close fields
  const isDoubleClose = form.watch("isDoubleClose");
  const payingForBothSides = form.watch("payingForBothSides");
  
  const attorneyFees = form.watch("attorneyFees") || 0;
  const docPrepFees = form.watch("docPrepFees") || 0;
  const titleExam = form.watch("titleExam") || 0;
  const titleInsurance = form.watch("titleInsurance") || 0;
  
  // Buy2 closing costs (for double close)
  const attorneyFees2 = form.watch("attorneyFees2") || 0;
  const docPrepFees2 = form.watch("docPrepFees2") || 0;
  const titleExam2 = form.watch("titleExam2") || 0;
  const titleInsurance2 = form.watch("titleInsurance2") || 0;
  
  const hoaFees = form.watch("hoaFees") || 0;
  const hoaTransferFee = form.watch("hoaTransferFee") || 0;
  const monthlyUtilities = form.watch("monthlyUtilities") || 0;
  const annualInsurance = form.watch("annualInsurance") || 0;
  const taxAssessedValue = form.watch("taxAssessedValue") || 0;
  const annualTax = form.watch("annualTax") || 0;
  
  const sellPrice = form.watch("sellPrice") || 0;
  const closingCostsSellPercent = form.watch("closingCostsSellPercent") || 1;
  const realEstateCommissionPercent = form.watch("realEstateCommissionPercent") || 6;

  // Your Loan fields
  const hasExistingLoan = form.watch("hasExistingLoan");
  const appraisalRequired = form.watch("appraisalRequired");

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
    
    // Set default values for Buy2 closing costs (same as Buy1)
    if (!form.getValues("attorneyFees2")) {
      form.setValue("attorneyFees2", 750);
    }
    if (!form.getValues("docPrepFees2")) {
      form.setValue("docPrepFees2", 0);
    }
    if (!form.getValues("titleExam2")) {
      form.setValue("titleExam2", 250);
    }
    if (!form.getValues("titleInsurance2") && purchasePrice) {
      form.setValue("titleInsurance2", Math.round(purchasePrice * 0.012));
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
  
  // Buy1 closing costs
  const estimatedClosingCostsBuy1 = attorneyFees + docPrepFees + titleExam + titleInsurance;
  
  // Buy2 closing costs (for double close when paying for both sides)
  const estimatedClosingCostsBuy2 = attorneyFees2 + docPrepFees2 + titleExam2 + titleInsurance2;
  
  // Total closing costs: includes Buy2 only if double close AND paying for both sides
  const showBuy2ClosingCosts = isDoubleClose === true && payingForBothSides === true;
  const estimatedClosingCostsBuy = showBuy2ClosingCosts 
    ? estimatedClosingCostsBuy1 + estimatedClosingCostsBuy2 
    : estimatedClosingCostsBuy1;
  
  // Use actual annualTax if available from API, otherwise estimate based on taxAssessedValue (1% rate)
  const propertyTaxMonthly = annualTax > 0 
    ? (annualTax / 12) 
    : (taxAssessedValue > 0 ? (taxAssessedValue * 0.01 / 12) : 0);
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
                      <CardTitle className="text-lg">
                        {showBuy2ClosingCosts ? "Estimated Closing Costs (Buy1)" : "Estimated Closing Costs (Buy)"}
                      </CardTitle>
                      <CardDescription>
                        {formatCurrency(estimatedClosingCostsBuy1)} total
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

          {showBuy2ClosingCosts && (
            <Collapsible open={closingCosts2Open} onOpenChange={setClosingCosts2Open}>
              <Card>
                <CollapsibleTrigger className="w-full" data-testid="button-toggle-closing-costs-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <CardTitle className="text-lg">Estimated Closing Costs (Buy2)</CardTitle>
                        <CardDescription>
                          {formatCurrency(estimatedClosingCostsBuy2)} total
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Expand for details or to make changes</span>
                        <ChevronDown className={`h-5 w-5 transition-transform ${closingCosts2Open ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="attorneyFees2"
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
                                data-testid="input-attorney-fees-2"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="docPrepFees2"
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
                                data-testid="input-doc-prep-fees-2"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="titleExam2"
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
                                data-testid="input-title-exam-2"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="titleInsurance2"
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
                                data-testid="input-title-insurance-2"
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
          )}

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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entered Loan</CardTitle>
              <CardDescription>
                Do you already have a loan product in mind? Enter the details to compare it against our lenders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hasExistingLoan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Do you have a loan you are currently looking at?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === "true")}
                        value={field.value === undefined ? undefined : field.value.toString()}
                        className="flex gap-4"
                        data-testid="radio-has-loan"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="loan-yes" data-testid="radio-has-loan-yes" />
                          <label htmlFor="loan-yes" className="cursor-pointer">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="loan-no" data-testid="radio-has-loan-no" />
                          <label htmlFor="loan-no" className="cursor-pointer">No</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hasExistingLoan === true && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxLendBuy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max % Lend on Purchase</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-max-lend-buy"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxLendRehab"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max % Lend on Rehab</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-max-lend-rehab"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="loanInterestRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest Rate (Annual)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-interest-rate"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="loanPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points</FormLabel>
                          <FormDescription className="text-xs">
                            Upfront fee (1 point = 1% of loan)
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-points"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxLoanToArv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max % Loan to ARV</FormLabel>
                          <FormDescription className="text-xs">
                            After Repair Value ratio
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-max-loan-arv"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="interestDeferred"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest Payments Deferred?</FormLabel>
                          <FormDescription className="text-xs">
                            Are interest payments waived until the loan is settled?
                          </FormDescription>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === "true")}
                              value={field.value === undefined ? undefined : field.value.toString()}
                              className="flex gap-4"
                              data-testid="radio-interest-deferred"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="int-defer-yes" data-testid="radio-interest-deferred-yes" />
                                <label htmlFor="int-defer-yes" className="cursor-pointer">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="int-defer-no" data-testid="radio-interest-deferred-no" />
                                <label htmlFor="int-defer-no" className="cursor-pointer">No</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="drawnFundsOnly"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drawn Funds Only?</FormLabel>
                          <FormDescription className="text-xs">
                            Interest charged only when funds are received?
                          </FormDescription>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === "true")}
                              value={field.value === undefined ? undefined : field.value.toString()}
                              className="flex gap-4"
                              data-testid="radio-drawn-funds"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="drawn-yes" data-testid="radio-drawn-funds-yes" />
                                <label htmlFor="drawn-yes" className="cursor-pointer">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="drawn-no" data-testid="radio-drawn-funds-no" />
                                <label htmlFor="drawn-no" className="cursor-pointer">No</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="pointsDeferred"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points Deferred?</FormLabel>
                        <FormDescription className="text-xs">
                          Are the points deferred until the loan is paid off?
                        </FormDescription>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value === undefined ? undefined : field.value.toString()}
                            className="flex gap-4"
                            data-testid="radio-points-deferred"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="pts-defer-yes" data-testid="radio-points-deferred-yes" />
                              <label htmlFor="pts-defer-yes" className="cursor-pointer">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="pts-defer-no" data-testid="radio-points-deferred-no" />
                              <label htmlFor="pts-defer-no" className="cursor-pointer">No</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appraisalRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appraisal Required?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value === undefined ? undefined : field.value.toString()}
                            className="flex gap-4"
                            data-testid="radio-appraisal-required"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="appr-yes" data-testid="radio-appraisal-yes" />
                              <label htmlFor="appr-yes" className="cursor-pointer">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="appr-no" data-testid="radio-appraisal-no" />
                              <label htmlFor="appr-no" className="cursor-pointer">No</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {appraisalRequired === true && (
                    <FormField
                      control={form.control}
                      name="appraisalFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Appraisal Fee</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pl-7"
                                data-testid="input-appraisal-fee"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="drawFees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Draw Fees (per draw)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pl-7"
                                data-testid="input-draw-fees"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="loanDocPrepFees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Doc Prep Fees</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pl-7"
                                data-testid="input-doc-prep-fees"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loan Preferences</CardTitle>
              <CardDescription>
                Select how you want us to rank lenders for your deal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="loanPreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select your loan preferences:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || "one-of-each"}
                        className="space-y-3 pt-2"
                        data-testid="radio-loan-preference"
                      >
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="lowest-oop" id="pref-lowest-oop" data-testid="radio-lowest-oop" />
                          <div className="flex flex-col">
                            <label htmlFor="pref-lowest-oop" className="cursor-pointer font-medium">
                              Lowest out-of-pocket
                            </label>
                            <span className="text-xs text-muted-foreground">
                              Show 2 lenders with the lowest upfront cash required
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="highest-profit" id="pref-highest-profit" data-testid="radio-highest-profit" />
                          <div className="flex flex-col">
                            <label htmlFor="pref-highest-profit" className="cursor-pointer font-medium">
                              Highest Net Profit
                            </label>
                            <span className="text-xs text-muted-foreground">
                              Show 2 lenders that maximize your profit in dollars
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="one-of-each" id="pref-one-of-each" data-testid="radio-one-of-each" />
                          <div className="flex flex-col">
                            <label htmlFor="pref-one-of-each" className="cursor-pointer font-medium">
                              One of each
                            </label>
                            <span className="text-xs text-muted-foreground">
                              Show the best lender for lowest out-of-pocket AND the best for highest profit
                            </span>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              Continue to Results
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
