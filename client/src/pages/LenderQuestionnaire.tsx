import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLenderQuestionnaireSchema, type InsertLenderQuestionnaire } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function LenderQuestionnaire() {
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(insertLenderQuestionnaireSchema.extend({
      businessStructure: insertLenderQuestionnaireSchema.shape.businessStructure.nullable().optional(),
      statesOperating: insertLenderQuestionnaireSchema.shape.statesOperating.nullable().optional(),
      specializations: insertLenderQuestionnaireSchema.shape.specializations.nullable().optional(),
      minLoanAmount: insertLenderQuestionnaireSchema.shape.minLoanAmount.nullable().optional(),
      maxLoanAmount: insertLenderQuestionnaireSchema.shape.maxLoanAmount.nullable().optional(),
      creditRequirements: insertLenderQuestionnaireSchema.shape.creditRequirements.nullable().optional(),
      yearsInBusiness: insertLenderQuestionnaireSchema.shape.yearsInBusiness.nullable().optional(),
    })),
    defaultValues: {
      lenderId: "temp-lender-id",
      businessStructure: null,
      yearsInBusiness: null,
      statesOperating: null,
      specializations: null,
      minLoanAmount: null,
      maxLoanAmount: null,
      creditRequirements: null,
      workWithNewInvestors: false,
      offerDeferredInterest: false,
    },
  });

  const onSubmit = async (data: InsertLenderQuestionnaire) => {
    toast({
      title: "Questionnaire Saved",
      description: "Your lender questionnaire has been updated successfully.",
    });
    console.log("Questionnaire data:", data);
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
            <h1 className="text-4xl font-bold text-primary mb-4">Lender Questionnaire</h1>
            <div className="h-1 w-24 bg-accent mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Complete this questionnaire to help investors understand your lending criteria and capabilities
            </p>
          </div>

          <Card className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="businessStructure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Business Structure</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="e.g., LLC, Corporation, Partnership"
                          data-testid="input-business-structure"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearsInBusiness"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Years in Business</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Enter number of years"
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ""}
                          data-testid="input-years-business"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="statesOperating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">States Operating In</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="List the states where you operate (e.g., GA, FL, NC)"
                          data-testid="input-states"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specializations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Specializations</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Describe your lending specializations (e.g., fix-and-flip, rental properties, commercial)"
                          data-testid="input-specializations"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="minLoanAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Minimum Loan Amount</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="$50,000"
                            data-testid="input-min-loan"
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
                        <FormLabel className="text-foreground">Maximum Loan Amount</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="text"
                            placeholder="$5,000,000"
                            data-testid="input-max-loan"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="creditRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Credit Requirements</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Describe your credit score requirements and other credit considerations"
                          data-testid="input-credit-requirements"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workWithNewInvestors"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-new-investors"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-foreground">
                          I work with new/first-time investors
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="offerDeferredInterest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-deferred-interest"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-foreground">
                          I offer deferred interest options
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    className="flex-1"
                    data-testid="button-save-questionnaire"
                  >
                    Save Questionnaire
                  </Button>
                  <Link href="/lender-dashboard">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
