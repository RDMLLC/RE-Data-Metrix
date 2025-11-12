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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function LenderQuestionnaire() {
  const { toast } = useToast();

  const saveQuestionnaireMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/lender-questionnaire", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender-questionnaire"] });
      toast({
        title: "Questionnaire Saved",
        description: "Your lender questionnaire has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save questionnaire. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<any>({
    resolver: zodResolver(insertLenderQuestionnaireSchema.extend({
      companyName: insertLenderQuestionnaireSchema.shape.companyDescription.nullable().optional(),
      contactName: insertLenderQuestionnaireSchema.shape.companyDescription.nullable().optional(),
      phone: insertLenderQuestionnaireSchema.shape.companyDescription.nullable().optional(),
      email: insertLenderQuestionnaireSchema.shape.companyDescription.nullable().optional(),
      website: insertLenderQuestionnaireSchema.shape.companyDescription.nullable().optional(),
      companyDescription: insertLenderQuestionnaireSchema.shape.companyDescription.nullable().optional(),
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
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      website: "",
      companyDescription: "",
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

  const onSubmit = async (data: any) => {
    saveQuestionnaireMutation.mutate(data);
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Company Info Section */}
                <div>
                  <h2 className="text-2xl font-semibold text-primary mb-6">Company Info</h2>
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Company Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="Enter your company name"
                              data-testid="input-company-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Contact Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="Enter contact person's name"
                              data-testid="input-contact-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              type="tel"
                              placeholder="(555) 123-4567"
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              type="email"
                              placeholder="contact@company.com"
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Website</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              type="url"
                              placeholder="https://www.company.com"
                              data-testid="input-website"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">What's cool about your company?</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="Tell us what makes your company unique..."
                              data-testid="input-company-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Lending Criteria Section */}
                <div>
                  <h2 className="text-2xl font-semibold text-primary mb-6">Lending Criteria</h2>
                  <div className="space-y-6">
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
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    className="flex-1"
                    data-testid="button-save-questionnaire"
                    disabled={saveQuestionnaireMutation.isPending}
                  >
                    {saveQuestionnaireMutation.isPending ? "Saving..." : "Save Questionnaire"}
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
