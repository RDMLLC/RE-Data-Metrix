import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLoanProductSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Link } from "wouter";

export default function LenderLoanProducts() {
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(insertLoanProductSchema.extend({
      minCreditScore: insertLoanProductSchema.shape.minCreditScore.nullable().optional(),
      maxLtvBuy: insertLoanProductSchema.shape.maxLtvBuy.nullable().optional(),
      maxLendRehab: insertLoanProductSchema.shape.maxLendRehab.nullable().optional(),
      interestRate: insertLoanProductSchema.shape.interestRate.nullable().optional(),
      points: insertLoanProductSchema.shape.points.nullable().optional(),
      maxLoanArv: insertLoanProductSchema.shape.maxLoanArv.nullable().optional(),
      estimatedAppraisalCost: insertLoanProductSchema.shape.estimatedAppraisalCost.nullable().optional(),
      fees: insertLoanProductSchema.shape.fees.nullable().optional(),
      costPerDraw: insertLoanProductSchema.shape.costPerDraw.nullable().optional(),
    })),
    defaultValues: {
      lenderId: "temp-lender-id",
      productName: "",
      newInvestorOk: false,
      minCreditScore: null,
      maxLtvBuy: null,
      maxLendRehab: null,
      interestRate: null,
      interestDeferred: false,
      drawnFundsOnly: false,
      points: null,
      pointsDeferred: false,
      maxLoanArv: null,
      appraisalRequired: false,
      estimatedAppraisalCost: null,
      fees: null,
      costPerDraw: null,
      isActive: true,
    },
  });

  const onSubmit = async (data: any) => {
    toast({
      title: "Product Added",
      description: "Your loan product has been added successfully.",
    });
    console.log("Loan product data:", data);
    form.reset();
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/lender-dashboard">
              <Button
                variant="outline"
                data-testid="button-back"
              >
                ← Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">Manage Loan Products</h1>
            <div className="h-1 w-24 bg-accent mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Add and manage your loan products to make them available to investors
            </p>
          </div>

          <Card className="p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-primary flex items-center gap-2">
                <Plus className="h-6 w-6" />
                Add New Loan Product
              </h2>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Product Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Fix & Flip Bridge Loan"
                          data-testid="input-product-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newInvestorOk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">New investor OK?</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "true")}
                        value={field.value ? "true" : "false"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-new-investor">
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minCreditScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Minimum Credit Score</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="660"
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          value={field.value || ""}
                          data-testid="input-min-credit-score"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="maxLtvBuy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Max LTV / Buy (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="75"
                            data-testid="input-max-ltv-buy"
                          />
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
                        <FormLabel className="text-foreground">Max Lend / Rehab (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="100"
                            data-testid="input-max-lend-rehab"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Interest Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="8.50"
                            data-testid="input-interest-rate"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interestDeferred"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Interest Deferred?</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "true")}
                          value={field.value ? "true" : "false"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-interest-deferred">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="drawnFundsOnly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Drawn Funds Only</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "true")}
                        value={field.value ? "true" : "false"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-drawn-funds">
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Points</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="2.5"
                            data-testid="input-points"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pointsDeferred"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Points Deferred?</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "true")}
                          value={field.value ? "true" : "false"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-points-deferred">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="maxLoanArv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Max Loan / ARV (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="70"
                            data-testid="input-max-loan-arv"
                          />
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
                        <FormLabel className="text-foreground">Appraisal Required?</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "true")}
                          value={field.value ? "true" : "false"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-appraisal-required">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="estimatedAppraisalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Estimated Appraisal Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="text"
                          placeholder="500"
                          data-testid="input-appraisal-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Fees (Doc prep, other) ($)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="text"
                          placeholder="1500"
                          data-testid="input-fees"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costPerDraw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Cost per Draw? ($)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="text"
                          placeholder="250"
                          data-testid="input-cost-per-draw"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    className="flex-1"
                    data-testid="button-add-product"
                  >
                    Add Product
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    data-testid="button-reset"
                  >
                    Reset Form
                  </Button>
                </div>
              </form>
            </Form>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-primary mb-6">Your Loan Products</h2>
            <div className="text-center py-12 text-muted-foreground">
              <p>No loan products added yet.</p>
              <p className="mt-2">Use the form above to add your first loan product.</p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
