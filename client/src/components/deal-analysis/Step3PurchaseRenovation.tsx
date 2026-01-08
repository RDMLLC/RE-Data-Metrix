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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DollarSign, TrendingUp, HelpCircle, Calculator } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
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
  const { updatePropertyData, updateInvestorData, wizardData } = useWizardData();
  const purchasePrice = form.watch("purchasePrice") || 0;
  const rehabBudget = form.watch("rehabBudget") || 0;
  const arv = form.watch("arv") || 0;
  
  const totalProjectCost = purchasePrice + rehabBudget;
  const grossProfit = arv - totalProjectCost;
  const percentageOfArv = arv > 0 ? (totalProjectCost / arv) * 100 : 0;

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
              <CardTitle className="text-lg">Investment Details</CardTitle>
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
                    <FormItem>
                      <FormLabel>Is this a double close?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value === "yes");
                            if (value === "no") {
                              form.setValue("payingForBothSides", false);
                            }
                          }}
                          value={field.value === true ? "yes" : field.value === false ? "no" : ""}
                          className="flex gap-4"
                          data-testid="radio-double-close"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="double-close-yes" data-testid="radio-double-close-yes" />
                            <Label htmlFor="double-close-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="double-close-no" data-testid="radio-double-close-no" />
                            <Label htmlFor="double-close-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
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
                    updatePropertyData({
                      arv: formData.arv,
                      rehabBudget: formData.rehabBudget,
                    });
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
