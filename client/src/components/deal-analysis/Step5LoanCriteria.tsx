import { UseFormReturn } from "react-hook-form";
import { WizardFormData } from "./DealAnalysisWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, DollarSign, BookOpen, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface Step5LoanCriteriaProps {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onBack: () => void;
}

export default function Step5LoanCriteria({ form, onNext, onBack }: Step5LoanCriteriaProps) {
  const isNewInvestor = form.watch("isNewInvestor");
  const isDoubleClose = form.watch("isDoubleClose");
  const hasExistingLoan = form.watch("hasExistingLoan");
  const appraisalRequired = form.watch("appraisalRequired");
  
  const address = form.watch("address");
  const city = form.watch("city");
  const state = form.watch("state");
  const zipCode = form.watch("zipCode");
  
  const hasAddressData = !!(address && city && state && zipCode);

  const handleSubmit = form.handleSubmit(() => {
    onNext();
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Loan Criteria
        </h2>
        <p className="text-muted-foreground mt-1">
          Tell us about your experience and financing needs
        </p>
      </div>

      {/* Educational Banner */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-foreground mb-2">
                <strong>New to real estate financing?</strong> Learn about different loan types and find the right financing for your investment strategy.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/loan-types">
                  <Button variant="outline" size="sm" className="h-8" data-testid="link-loan-types">
                    <BookOpen className="h-3 w-3 mr-1.5" />
                    View Loan Types
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/about-private-lenders">
                  <Button variant="outline" size="sm" className="h-8" data-testid="link-private-lenders">
                    About Private Lenders
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Investor Profile</CardTitle>
              <CardDescription>Help us understand your investment experience</CardDescription>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deal Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="isDoubleClose"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal cursor-pointer">
                        Click Here if Double Close
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Are you purchasing the property during the same closing session as you are selling?
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isDoubleClose === true && (
                <FormField
                  control={form.control}
                  name="payingForBothSides"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are you paying for both sides?</FormLabel>
                      <FormDescription className="text-xs">
                        Does the seller pay for their closing and you pay only for your side, or are you paying for both?
                      </FormDescription>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(value === "true")}
                          value={field.value === undefined ? undefined : field.value.toString()}
                          className="flex gap-4"
                          data-testid="radio-paying-both-sides"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="both-yes" data-testid="radio-paying-both-yes" />
                            <label htmlFor="both-yes" className="cursor-pointer">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="both-no" data-testid="radio-paying-both-no" />
                            <label htmlFor="both-no" className="cursor-pointer">No</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loan Information</CardTitle>
              <CardDescription>Do you already have a loan product in mind?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hasExistingLoan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Do you have a loan you are currently looking at?</FormLabel>
                    {!hasAddressData && (
                      <FormDescription className="text-xs text-amber-600">
                        This field will be enabled once you complete the property address information in earlier steps.
                      </FormDescription>
                    )}
                    <FormControl>
                      <RadioGroup
                        disabled={!hasAddressData}
                        onValueChange={(value) => field.onChange(value === "true")}
                        value={field.value === undefined ? undefined : field.value.toString()}
                        className="flex gap-4"
                        data-testid="radio-has-loan"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="loan-yes" data-testid="radio-has-loan-yes" disabled={!hasAddressData} />
                          <label htmlFor="loan-yes" className={hasAddressData ? "cursor-pointer" : "cursor-not-allowed opacity-50"}>Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="loan-no" data-testid="radio-has-loan-no" disabled={!hasAddressData} />
                          <label htmlFor="loan-no" className={hasAddressData ? "cursor-pointer" : "cursor-not-allowed opacity-50"}>No</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hasExistingLoan === true && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxLendBuy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max % Lend on Purchase</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pr-7"
                                data-testid="input-max-lend-buy"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
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
                          <FormLabel>Max % Lend on Rehab</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pr-7"
                                data-testid="input-max-lend-rehab"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="loanInterestRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest Rate (Annual)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pr-7"
                                data-testid="input-interest-rate"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="loanPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points</FormLabel>
                          <FormDescription className="text-xs">
                            1 point = 1% of loan
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pr-7"
                                data-testid="input-points"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxLoanToArv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max % Loan to ARV</FormLabel>
                          <FormDescription className="text-xs">
                            After Repair Value (ARV) ratio
                          </FormDescription>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pr-7"
                                data-testid="input-max-loan-arv"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="interestDeferred"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest Payments Deferred?</FormLabel>
                          <FormDescription className="text-xs">
                            Are interest payments waived until the loan is settled?
                          </FormDescription>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === "true")}
                              value={field.value === undefined ? undefined : field.value.toString()}
                              className="flex gap-4"
                              data-testid="radio-interest-deferred"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="int-defer-yes" data-testid="radio-interest-deferred-yes" />
                                <label htmlFor="int-defer-yes" className="cursor-pointer">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="int-defer-no" data-testid="radio-interest-deferred-no" />
                                <label htmlFor="int-defer-no" className="cursor-pointer">No</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="drawnFundsOnly"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drawn Funds Only?</FormLabel>
                          <FormDescription className="text-xs">
                            Does the lender charge interest only when funds are received?
                          </FormDescription>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === "true")}
                              value={field.value === undefined ? undefined : field.value.toString()}
                              className="flex gap-4"
                              data-testid="radio-drawn-funds"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="drawn-yes" data-testid="radio-drawn-funds-yes" />
                                <label htmlFor="drawn-yes" className="cursor-pointer">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="drawn-no" data-testid="radio-drawn-funds-no" />
                                <label htmlFor="drawn-no" className="cursor-pointer">No</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="pointsDeferred"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points Deferred?</FormLabel>
                        <FormDescription className="text-xs">
                          Are the points deferred until the loan is paid off?
                        </FormDescription>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value === undefined ? undefined : field.value.toString()}
                            className="flex gap-4"
                            data-testid="radio-points-deferred"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="pts-defer-yes" data-testid="radio-points-deferred-yes" />
                              <label htmlFor="pts-defer-yes" className="cursor-pointer">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="pts-defer-no" data-testid="radio-points-deferred-no" />
                              <label htmlFor="pts-defer-no" className="cursor-pointer">No</label>
                            </div>
                          </RadioGroup>
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
                        <FormLabel>Appraisal Required?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value === undefined ? undefined : field.value.toString()}
                            className="flex gap-4"
                            data-testid="radio-appraisal-required"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="appr-yes" data-testid="radio-appraisal-yes" />
                              <label htmlFor="appr-yes" className="cursor-pointer">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="appr-no" data-testid="radio-appraisal-no" />
                              <label htmlFor="appr-no" className="cursor-pointer">No</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {appraisalRequired === true && (
                    <FormField
                      control={form.control}
                      name="appraisalFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Appraisal Fee</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pl-7"
                                data-testid="input-appraisal-fee"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="drawFees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Draw Fees (per draw)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pl-7"
                                data-testid="input-draw-fees"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="loanDocPrepFees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Doc Prep Fees</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="pl-7"
                                data-testid="input-doc-prep-fees"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="closingTimeline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How fast do you need to close?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-closing-timeline">
                              <SelectValue placeholder="Select timeline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not-selected">Not Selected</SelectItem>
                            <SelectItem value="1-7">1-7 days</SelectItem>
                            <SelectItem value="8-14">8-14 days</SelectItem>
                            <SelectItem value="15-21">15-21 days</SelectItem>
                            <SelectItem value="21-30">21-30 days</SelectItem>
                            <SelectItem value="30+">30+ days</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" data-testid="button-continue">
              Continue to Results
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
