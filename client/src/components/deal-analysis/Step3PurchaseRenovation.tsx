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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { useEffect } from "react";

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
                        step="1000"
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
                        step="1000"
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
                name="arv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ARV (After Repair Value)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Enter expected ARV"
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
                    <FormLabel>Project Length (months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        step="1"
                        placeholder="Enter project duration in months"
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
              Continue to Holding Period & Exit
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
