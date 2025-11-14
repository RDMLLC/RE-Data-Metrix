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

const questionnaireSchema = z.object({
  lenderId: z.string(),
  brokerOrDirectLender: z.string().optional(),
  fastestClosingTime: z.string().optional(),
  offerNonTraditionalLending: z.string().optional(),
  workWithNewInvestors: z.string().optional(),
  minCreditScore: z.string().optional(),
  offerDeferredPayment: z.string().optional(),
  offerRolledPoints: z.string().optional(),
  offer100PercentFunding: z.string().optional(),
  offerMultiUnitFinancing: z.string().optional(),
  offerDscrLoans: z.string().optional(),
  offerLoansAllStates: z.string().optional(),
  statesServiced: z.array(z.string()).optional(),
});

type QuestionnaireForm = z.infer<typeof questionnaireSchema>;

export default function LenderQuestionnaire() {
  const { toast } = useToast();
  const [showStatesSelection, setShowStatesSelection] = useState(false);

  const saveQuestionnaireMutation = useMutation({
    mutationFn: async (data: QuestionnaireForm) => {
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

  const form = useForm<QuestionnaireForm>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      lenderId: "temp-lender-id",
      brokerOrDirectLender: "",
      fastestClosingTime: "",
      offerNonTraditionalLending: "",
      workWithNewInvestors: "",
      minCreditScore: "",
      offerDeferredPayment: "",
      offerRolledPoints: "",
      offer100PercentFunding: "",
      offerMultiUnitFinancing: "",
      offerDscrLoans: "",
      offerLoansAllStates: "",
      statesServiced: [],
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

                {/* Do you offer non-traditional / creative lending? */}
                <FormField
                  control={form.control}
                  name="offerNonTraditionalLending"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Do you offer non-traditional / creative lending?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-non-traditional">
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

                {/* Do you work with new investors? */}
                <FormField
                  control={form.control}
                  name="workWithNewInvestors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Do you work with new investors?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-investors">
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

                {/* Do you offer deferred payment loans? */}
                <FormField
                  control={form.control}
                  name="offerDeferredPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Do you offer deferred payment loans?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-deferred-payment">
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

                {/* Do you offer rolled / points on the back? */}
                <FormField
                  control={form.control}
                  name="offerRolledPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Do you offer rolled / points on the back?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-rolled-points">
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

                {/* Do you offer 100% funding of both the purchase and the rehab? */}
                <FormField
                  control={form.control}
                  name="offer100PercentFunding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Do you offer 100% funding of both the purchase and the rehab?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-100-percent-funding">
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

                {/* Do you offer financing on multi-unit properties? (5+ units) */}
                <FormField
                  control={form.control}
                  name="offerMultiUnitFinancing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Do you offer financing on multi-unit properties? (5+ units)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-multi-unit">
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

                {/* Do you offer DSCR loans? */}
                <FormField
                  control={form.control}
                  name="offerDscrLoans"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Do you offer DSCR loans?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-dscr-loans">
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
