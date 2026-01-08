import { UseFormReturn } from "react-hook-form";
import { WizardFormData } from "./DealAnalysisWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, User, Save, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InvestorInfoResponse {
  hasSavedInfo: boolean;
  investorInfo: {
    isNewInvestor: boolean | null;
    projectsLast12Months: string | null;
    projectsLast36Months: string | null;
    creditScore: string | null;
  } | null;
}

interface Step4InvestorInfoProps {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4InvestorInfo({ form, onNext, onBack }: Step4InvestorInfoProps) {
  const isNewInvestor = form.watch("isNewInvestor");
  const { user } = useAuth();
  const { toast } = useToast();
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  
  const isSubscriber = user?.subscriptionStatus === 'active';

  // Fetch saved investor info
  const { data: investorInfoData } = useQuery<InvestorInfoResponse>({
    queryKey: ['/api/profile/investor-info'],
    enabled: !!user,
  });

  // Auto-fill form from saved profile data
  useEffect(() => {
    if (investorInfoData?.hasSavedInfo && investorInfoData.investorInfo && !hasAutoFilled) {
      const info = investorInfoData.investorInfo;
      
      // Only set values that haven't been modified by the user
      if (info.isNewInvestor !== null && form.getValues("isNewInvestor") === undefined) {
        form.setValue("isNewInvestor", info.isNewInvestor);
      }
      if (info.projectsLast12Months && !form.getValues("projectsLast12Months")) {
        form.setValue("projectsLast12Months", info.projectsLast12Months);
      }
      if (info.projectsLast36Months && !form.getValues("projectsLast36Months")) {
        form.setValue("projectsLast36Months", info.projectsLast36Months);
      }
      if (info.creditScore && !form.getValues("creditScore")) {
        form.setValue("creditScore", info.creditScore);
      }
      
      setHasAutoFilled(true);
    }
  }, [investorInfoData, form, hasAutoFilled]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Mutation to save investor info
  const saveInvestorInfoMutation = useMutation({
    mutationFn: async (data: { isNewInvestor?: boolean; projectsLast12Months?: string; projectsLast36Months?: string; creditScore?: string }) => {
      return apiRequest('PUT', '/api/profile/investor-info', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/investor-info'] });
      toast({
        title: "Saved to Profile",
        description: "Your investor information will auto-fill in future deals.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save investor information to your profile.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit(async () => {
    // Save to profile if checkbox is checked and user is a subscriber
    if (saveToProfile && isSubscriber) {
      const formData = {
        isNewInvestor: form.getValues("isNewInvestor"),
        projectsLast12Months: form.getValues("projectsLast12Months"),
        projectsLast36Months: form.getValues("projectsLast36Months"),
        creditScore: form.getValues("creditScore"),
      };
      await saveInvestorInfoMutation.mutateAsync(formData);
    }
    onNext();
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          Investor Information
        </h2>
        <p className="text-muted-foreground mt-1">
          Tell us about your investment experience
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Investor Profile</CardTitle>
              <CardDescription>Help us match you with the right lenders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="isNewInvestor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Are you a new investor?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === "true")}
                        value={field.value === undefined ? undefined : field.value.toString()}
                        className="flex gap-4"
                        data-testid="radio-new-investor"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="new-yes" data-testid="radio-new-investor-yes" />
                          <label htmlFor="new-yes" className="cursor-pointer">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="new-no" data-testid="radio-new-investor-no" />
                          <label htmlFor="new-no" className="cursor-pointer">No</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isNewInvestor === false && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <FormField
                    control={form.control}
                    name="projectsLast12Months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Projects completed (last 12 months)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-projects-12">
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="1-2">1-2</SelectItem>
                            <SelectItem value="3-5">3-5</SelectItem>
                            <SelectItem value="6-10">6-10</SelectItem>
                            <SelectItem value="11+">11+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectsLast36Months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Projects completed (last 36 months)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-projects-36">
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="1-5">1-5</SelectItem>
                            <SelectItem value="6-10">6-10</SelectItem>
                            <SelectItem value="11-20">11-20</SelectItem>
                            <SelectItem value="21+">21+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="creditScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Credit Score</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-credit-score">
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="below-600">Below 600</SelectItem>
                        <SelectItem value="600-649">600-649</SelectItem>
                        <SelectItem value="650-699">650-699</SelectItem>
                        <SelectItem value="700-749">700-749</SelectItem>
                        <SelectItem value="750+">750+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Auto-filled indicator */}
              {investorInfoData?.hasSavedInfo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>Auto-filled from your saved profile</span>
                </div>
              )}

              {/* Save to Profile option for subscribers */}
              {isSubscriber && (
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Checkbox
                    id="save-to-profile"
                    checked={saveToProfile}
                    onCheckedChange={(checked) => setSaveToProfile(checked === true)}
                    data-testid="checkbox-save-to-profile"
                  />
                  <label
                    htmlFor="save-to-profile"
                    className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Save to my profile for future deals
                  </label>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button type="submit" data-testid="button-continue">
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
