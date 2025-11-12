import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLoanProductSchema, type InsertLoanProduct } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Link } from "wouter";

export default function LenderLoanProducts() {
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(insertLoanProductSchema.extend({
      interestRate: insertLoanProductSchema.shape.interestRate.nullable().optional(),
      minLoanAmount: insertLoanProductSchema.shape.minLoanAmount.nullable().optional(),
      maxLoanAmount: insertLoanProductSchema.shape.maxLoanAmount.nullable().optional(),
      downPaymentPercent: insertLoanProductSchema.shape.downPaymentPercent.nullable().optional(),
      closingCosts: insertLoanProductSchema.shape.closingCosts.nullable().optional(),
      description: insertLoanProductSchema.shape.description.nullable().optional(),
      loanTerm: insertLoanProductSchema.shape.loanTerm.nullable().optional(),
    })),
    defaultValues: {
      lenderId: "temp-lender-id",
      productName: "",
      loanType: "",
      interestRate: null,
      minLoanAmount: null,
      maxLoanAmount: null,
      loanTerm: null,
      downPaymentPercent: null,
      closingCosts: null,
      description: null,
      isActive: true,
    },
  });

  const onSubmit = async (data: InsertLoanProduct) => {
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

          {/* Add New Product Form */}
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
                  name="loanType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Loan Type</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Bridge Loan, DSCR Loan, Hard Money"
                          data-testid="input-loan-type"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    name="loanTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Loan Term (months)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="12"
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                            data-testid="input-loan-term"
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
                    name="minLoanAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Minimum Loan Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="50000"
                            data-testid="input-min-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxLoanAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Maximum Loan Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="5000000"
                            data-testid="input-max-amount"
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
                    name="downPaymentPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Down Payment (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="20"
                            data-testid="input-down-payment"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="closingCosts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Closing Costs ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="2500"
                            data-testid="input-closing-costs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Product Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Describe the key features, requirements, and benefits of this loan product"
                          rows={4}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-active"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-foreground">
                          Make this product active and visible to investors
                        </FormLabel>
                      </div>
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

          {/* Existing Products List */}
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
