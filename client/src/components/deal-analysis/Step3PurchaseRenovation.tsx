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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DollarSign, TrendingUp, HelpCircle, Calculator, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWizardData } from "@/contexts/WizardDataContext";
import { useToast } from "@/hooks/use-toast";

const closingTimelineOptions = [
  { value: "7-days", label: "7 days or less" },
  { value: "8-14-days", label: "8-14 days" },
  { value: "15-21-days", label: "15-21 days" },
  { value: "22-30-days", label: "22-30 days" },
  { value: "31-plus-days", label: "31+ days" },
];

interface Step3PurchaseRenovationProps {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3PurchaseRenovation({
  form,
  onNext,
  onBack,
}: Step3PurchaseRenovationProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { updatePropertyData, updateInvestorData, setCurrentStep, wizardData } = useWizardData();
  const purchasePrice = form.watch("purchasePrice") || 0;
  const rehabBudget = form.watch("rehabBudget") || 0;
  const arv = form.watch("arv") || 0;
  
  const totalProjectCost = purchasePrice + rehabBudget;
  const grossProfit = arv - totalProjectCost;
  const percentageOfArv = arv > 0 ? (totalProjectCost / arv) * 100 : 0;

  // Max Offer Calculator state
  const [showMaxOfferCalc, setShowMaxOfferCalc] = useState(false);
  const [maxArvPercent, setMaxArvPercent] = useState(70);
  const [calcArv, setCalcArv] = useState(arv || 0);
  const [calcRehabBudget, setCalcRehabBudget] = useState(rehabBudget || 0);

  // Max Offer Calculator calculations
  const maxProjectCost = calcArv * (maxArvPercent / 100);
  const maxOfferPrice = Math.max(0, maxProjectCost - calcRehabBudget);

  // Sync ARV from form when it changes (only if calc hasn't been customized)
  useEffect(() => {
    if (arv > 0 && calcArv === 0) {
      setCalcArv(arv);
    }
  }, [arv]);

  // Sync rehab budget from form when it changes
  useEffect(() => {
    if (rehabBudget > 0 && calcRehabBudget === 0) {
      setCalcRehabBudget(rehabBudget);
    }
  }, [rehabBudget]);

  useEffect(() => {
    if (form.getValues("estimatedValue") && !form.getValues("arv")) {
      form.setValue("arv", form.getValues("estimatedValue"));
    }
  }, [form]);

  const handleSubmit = form.handleSubmit(() => {
    const projectLength = form.getValues("projectLength");
    
    const errors: string[] = [];
    
    if (!projectLength || projectLength <= 0) {
      errors.push("Project Length is required");
    }
    
    if (errors.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: errors.join(". "),
        variant: "destructive",
      });
      return;
    }
    
    onNext();
  });

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
      estimatedRent: wizardData.property?.estimatedRent,
    });

    if (formData.creditScore) {
      updateInvestorData({
        creditScore: formData.creditScore,
        experienceLevel: formData.isNewInvestor ? "new" : "experienced",
      });
    }

    setLocation("/rental-analysis");
  };

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
          <DollarSign className="h-6 w-6 text-primary" />
          Purchase & Renovation
        </h2>
        <p className="text-muted-foreground mt-1">
          Enter your purchase price, rehab budget, and expected after-repair value
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">Investment Details</CardTitle>
                <Popover open={showMaxOfferCalc} onOpenChange={setShowMaxOfferCalc}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      data-testid="button-max-offer-calc"
                    >
                      <Lightbulb className="h-4 w-4" />
                      Max Offer Calculator
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 sm:w-96" align="end">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Help Determine Max Offer Price</h4>
                        <p className="text-xs text-muted-foreground">
                          Calculate your maximum purchase price based on ARV percentage and rehab costs
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="calcArv" className="text-xs font-medium">ARV</Label>
                          <Input
                            id="calcArv"
                            type="number"
                            min="0"
                            step="1"
                            value={calcArv || ""}
                            onChange={(e) => setCalcArv(parseFloat(e.target.value) || 0)}
                            placeholder="Enter ARV"
                            className="mt-1"
                            data-testid="input-calc-arv"
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxArvPercent" className="text-xs font-medium flex items-center gap-1">
                            Max % of ARV
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>The 70% rule is common for fix & flip. Your total project cost (purchase + rehab) should not exceed this percentage of ARV.</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              id="maxArvPercent"
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              value={maxArvPercent}
                              onChange={(e) => setMaxArvPercent(parseFloat(e.target.value) || 70)}
                              className="w-20"
                              data-testid="input-max-arv-percent"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium">Max Project Cost:</span>
                          <span className="text-sm font-semibold text-primary" data-testid="text-max-project-cost">
                            {formatCurrency(maxProjectCost)}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="calcRehabBudget" className="text-xs font-medium">Rehab Budget</Label>
                            <Input
                              id="calcRehabBudget"
                              type="number"
                              min="0"
                              step="1"
                              value={calcRehabBudget || ""}
                              onChange={(e) => setCalcRehabBudget(parseFloat(e.target.value) || 0)}
                              placeholder="Enter rehab budget"
                              className="mt-1"
                              data-testid="input-calc-rehab-budget"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Max Offer/Purchase Price</Label>
                            <div 
                              className="mt-1 p-2 bg-primary/10 border-2 border-primary rounded-md text-base font-bold text-primary"
                              data-testid="text-max-offer-price"
                            >
                              {formatCurrency(maxOfferPrice)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => {
                            form.setValue("purchasePrice", maxOfferPrice);
                            if (calcArv > 0) {
                              form.setValue("arv", calcArv);
                            }
                            if (calcRehabBudget > 0) {
                              form.setValue("rehabBudget", calcRehabBudget);
                            }
                            toast({
                              title: "Values Applied",
                              description: `ARV: ${formatCurrency(calcArv)}, Rehab: ${formatCurrency(calcRehabBudget)}, Purchase: ${formatCurrency(maxOfferPrice)}`,
                            });
                            setShowMaxOfferCalc(false);
                          }}
                          disabled={maxOfferPrice <= 0}
                          data-testid="button-use-max-offer"
                        >
                          Use This Offer Price
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMaxOfferCalc(false)}
                          data-testid="button-close-calc"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <CardDescription>
                Enter the key financial details for this deal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          step="1"
                          placeholder="Enter purchase price"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-purchase-price"
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
                          step="1"
                          placeholder="Enter rehab budget"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-rehab-budget"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDoubleClose"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) => {
                            field.onChange(checked === true);
                            if (checked !== true) {
                              form.setValue("payingForBothSides", false);
                            }
                          }}
                          data-testid="checkbox-double-close"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Click Here if Double Close
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("isDoubleClose") === true && (
                <FormField
                  control={form.control}
                  name="payingForBothSides"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are you paying for both transactions?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(value === "yes")}
                          value={field.value === true ? "yes" : field.value === false ? "no" : ""}
                          className="flex gap-4"
                          data-testid="radio-paying-both-sides"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="paying-both-yes" data-testid="radio-paying-both-yes" />
                            <Label htmlFor="paying-both-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="paying-both-no" data-testid="radio-paying-both-no" />
                            <Label htmlFor="paying-both-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                <FormField
                  control={form.control}
                  name="arv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-sm">
                        Est. Market Value
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>The estimated market value is based on Rentcast Data. It may or may not represent improved properties. Do your own research.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter estimated market value"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-arv"
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
                      <FormLabel className="text-sm">Length (mo)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          step="1"
                          placeholder="Months"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          data-testid="input-project-length"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closingTimeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Close Speed</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        data-testid="select-closing-timeline"
                      >
                        <FormControl>
                          <SelectTrigger data-testid="button-closing-timeline">
                            <SelectValue placeholder="Select timeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {closingTimelineOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              data-testid={`option-closing-${option.value}`}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
              <CardDescription>
                Calculated metrics for this deal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Project Cost:</span>
                <span className="text-lg font-semibold" data-testid="text-total-project-cost">
                  {formatCurrency(totalProjectCost)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Expected ARV:</span>
                <span className="text-lg font-semibold" data-testid="text-expected-arv">
                  {formatCurrency(arv)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Gross Profit:</span>
                <span 
                  className={`text-lg font-semibold ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                  data-testid="text-gross-profit"
                >
                  {formatCurrency(grossProfit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Percentage of ARV:</span>
                <span className="text-lg font-semibold" data-testid="text-percentage-arv">
                  {percentageOfArv.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <div className="flex gap-3 justify-between flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                data-testid="button-back"
              >
                Back
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const formData = form.getValues();
                    // Save ALL form data to context before navigating
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
                    setCurrentStep(3);
                    setLocation("/deal-analysis/wholesale-calculator");
                  }}
                  data-testid="button-wholesale-calculator"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Wholesale Max Offer Price
                </Button>
                <Button type="submit" data-testid="button-continue">
                  Continue to Investor Information
                </Button>
              </div>
            </div>
            
            {purchasePrice > 0 && arv > 0 && (
              <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                        Planning to Keep as Rental?
                      </h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                        Analyze this property's rental income potential, calculate DSCR (Debt Service Coverage Ratio), and find DSCR lenders.
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        onClick={handleNavigateToRentalAnalysis}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        data-testid="button-rental-analysis"
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Analyze as Rental Property
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
