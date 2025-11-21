import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useState } from "react";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const LOAN_TYPES = [
  { value: "hard-money", label: "Hard Money / Bridge" },
  { value: "dscr", label: "DSCR" },
  { value: "transactional", label: "Transactional Funding" },
  { value: "private-seller", label: "Private/Seller Financing" },
  { value: "portfolio", label: "Portfolio / Blanket" },
  { value: "interest-only", label: "Interest-Only" },
  { value: "balloon", label: "Balloon" },
  { value: "arm", label: "5/1 ARM (Adjustable Rate)" },
  { value: "conventional", label: "Conventional" },
  { value: "fha-va", label: "FHA/VA" },
  { value: "multi-unit", label: "Multi-Unit (5+ units)" },
];

const questionnaireSchema = z.object({
  lenderId: z.string(),
  brokerOrDirectLender: z.string().optional(),
  fastestClosingTime: z.string().optional(),
  offerNonTraditionalLending: z.boolean().optional(),
  workWithNewInvestors: z.boolean().optional(),
  minCreditScore: z.string().optional(),
  offerDeferredPayment: z.boolean().optional(),
  offerRolledPoints: z.boolean().optional(),
  offer100PercentFunding: z.boolean().optional(),
  offerLoansAllStates: z.string().optional(),
  statesServiced: z.array(z.string()).optional(),
  loanTypes: z.array(z.string()).optional(),
});

type QuestionnaireForm = z.infer<typeof questionnaireSchema>;

export default function LenderQuestionnaire() {
  const { toast } = useToast();
  const [showStatesSelection, setShowStatesSelection] = useState(false);

  const saveQuestionnaireMutation = useMutation({
    mutationFn: async (data: QuestionnaireForm) => {
      const res = await apiRequest("POST", "/api/lender-questionnaire", data);
      return await res.json();
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

  const form = useForm<QuestionnaireForm>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      lenderId: "d775835d-9fa7-4709-b96d-3887f7f417ca", // TODO: Get from auth context when lender auth is implemented
      brokerOrDirectLender: "",
      fastestClosingTime: "",
      offerNonTraditionalLending: false,
      workWithNewInvestors: false,
      minCreditScore: "",
      offerDeferredPayment: false,
      offerRolledPoints: false,
      offer100PercentFunding: false,
      offerLoansAllStates: "",
      statesServiced: [],
      loanTypes: [],
    },
  });

  const onSubmit = async (data: QuestionnaireForm) => {
    saveQuestionnaireMutation.mutate(data);
  };

  const offerLoansAllStates = form.watch("offerLoansAllStates");

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
              Complete this questionnaire to help investors understand your lending criteria
            </p>
          </div>

          <Card className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Are you a direct lender or broker? */}
                <FormField
                  control={form.control}
                  name="brokerOrDirectLender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Are you a direct lender or broker?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-broker-or-lender">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Lender">Lender</SelectItem>
                          <SelectItem value="Broker">Broker</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* What is the fastest you can close a loan? */}
                <FormField
                  control={form.control}
                  name="fastestClosingTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">What is the fastest you can close a loan?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-closing-time">
                            <SelectValue placeholder="Select timeframe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-7 DAYS">1-7 DAYS</SelectItem>
                          <SelectItem value="8-14 DAYS">8-14 DAYS</SelectItem>
                          <SelectItem value="15-21 DAYS">15-21 DAYS</SelectItem>
                          <SelectItem value="22-30 DAYS">22-30 DAYS</SelectItem>
                          <SelectItem value="More than 30 days">More than 30 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Offer Non-Traditional Lending (Checkbox) */}
                <FormField
                  control={form.control}
                  name="offerNonTraditionalLending"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-non-traditional"
                        />
                      </FormControl>
                      <FormLabel className="text-foreground font-normal cursor-pointer">
                        Offer non-traditional / creative lending
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Work with New Investors (Checkbox) */}
                <FormField
                  control={form.control}
                  name="workWithNewInvestors"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-new-investors"
                        />
                      </FormControl>
                      <FormLabel className="text-foreground font-normal cursor-pointer">
                        Work with new investors
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* What is the minimum credit score you will work with? */}
                <FormField
                  control={form.control}
                  name="minCreditScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">What is the minimum credit score you will work with?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-credit-score">
                            <SelectValue placeholder="Select credit score range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Below 600">Below 600</SelectItem>
                          <SelectItem value="600-649">600-649</SelectItem>
                          <SelectItem value="650-699">650-699</SelectItem>
                          <SelectItem value="700+">700+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                {/* Loan Types Offered */}
                <FormField
                  control={form.control}
                  name="loanTypes"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-foreground text-base">Loan Types Offered</FormLabel>
                        <p className="text-sm text-muted-foreground">Select all loan types you offer</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {LOAN_TYPES.map((loanType) => (
                          <FormField
                            key={loanType.value}
                            control={form.control}
                            name="loanTypes"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={loanType.value}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(loanType.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), loanType.value])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== loanType.value
                                              )
                                            )
                                      }}
                                      data-testid={`checkbox-loan-type-${loanType.value}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    {loanType.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Offer Deferred Payment Loans (Checkbox) */}
                <FormField
                  control={form.control}
                  name="offerDeferredPayment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-deferred-payment"
                        />
                      </FormControl>
                      <FormLabel className="text-foreground font-normal cursor-pointer">
                        Offer deferred payment loans
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Offer Rolled Points (Checkbox) */}
                <FormField
                  control={form.control}
                  name="offerRolledPoints"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-rolled-points"
                        />
                      </FormControl>
                      <FormLabel className="text-foreground font-normal cursor-pointer">
                        Offer rolled / points on the back
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Offer 100% Funding (Checkbox) */}
                <FormField
                  control={form.control}
                  name="offer100PercentFunding"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-100-percent-funding"
                        />
                      </FormControl>
                      <FormLabel className="text-foreground font-normal cursor-pointer">
                        Offer 100% funding of both the purchase and the rehab
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                {/* Do you offer loans in all 50 States? Y/N */}
                <FormField
                  control={form.control}
                  name="offerLoansAllStates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Do you offer loans in all 50 States?</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setShowStatesSelection(value === "No");
                          if (value === "Yes") {
                            form.setValue("statesServiced", []);
                          }
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-all-states">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* States Serviced - Only show if "No" to all 50 states */}
                {(offerLoansAllStates === "No" || showStatesSelection) && (
                  <FormField
                    control={form.control}
                    name="statesServiced"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-foreground mb-4 block">
                          Select the states where you offer loans:
                        </FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto border rounded-md p-4">
                          {US_STATES.map((state) => (
                            <FormField
                              key={state}
                              control={form.control}
                              name="statesServiced"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={state}
                                    className="flex flex-row items-start space-x-2 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(state)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), state])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== state
                                                )
                                              );
                                        }}
                                        data-testid={`checkbox-state-${state.toLowerCase().replace(/\s+/g, '-')}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {state}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
