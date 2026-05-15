import { useEffect, useRef, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, Search, ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ArvHelper from "./ArvHelper";
import MobileStepWrapper from "@/components/mobile/MobileStepWrapper";
import CollapsibleSection from "@/components/mobile/CollapsibleSection";

interface Step2PropertyDetailsProps {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onBack: () => void;
  isMobile?: boolean;
}

const propertyTypes = [
  { value: "SINGLE_FAMILY", label: "Single Family" },
  { value: "MULTI_FAMILY", label: "Multi-Family" },
  { value: "CONDO", label: "Condo" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "LOT", label: "Lot/Land" },
  { value: "MANUFACTURED", label: "Manufactured" },
  { value: "APARTMENT", label: "Apartment" },
];

export default function Step2PropertyDetails({
  form,
  onNext,
  onBack,
  isMobile,
}: Step2PropertyDetailsProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const addingSquareFootage = form.watch("addingSquareFootage");
  const dataSource = form.watch("propertyDataSource") || "unknown";
  const [showArvHelper, setShowArvHelper] = useState(false);
  const [arvVideoOpen, setArvVideoOpen] = useState(false);
  const [showFormDetails, setShowFormDetails] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);

  const handleArvHelperOpen = () => {
    setShowFormDetails(false);
    setShowArvHelper(true);
  };

  const handleArvHelperClose = () => {
    setShowArvHelper(false);
    setShowFormDetails(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };
  
  const estimateLabel = "Estimated Market Value";

  const handleSubmit = form.handleSubmit(() => {
    onNext();
  });

  if (isMobile) {
    const purchasePrice = form.watch("purchasePrice") || 0;
    const rehabBudget = form.watch("rehabBudget") || 0;
    const arvValue = form.watch("arv") || form.watch("estimatedValue") || 0;
    const percentOfArv =
      arvValue > 0 ? ((purchasePrice + rehabBudget) / arvValue) * 100 : 0;
    const percentColorClass =
      percentOfArv <= 70
        ? "text-green-600 dark:text-green-400"
        : percentOfArv < 80
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

    return (
      <MobileStepWrapper
        title="Property Details"
        subtitle="Confirm or adjust the property information"
      >
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <CollapsibleSection title="Property Info" defaultOpen={true}>
              <div className="w-full space-y-4">
                {(form.watch("address") || form.watch("city") || form.watch("state")) && (
                  <div className="w-full space-y-2">
                    <FormLabel>Property Address</FormLabel>
                    <div className="p-3 bg-muted rounded-md border">
                      <p className="font-medium" data-testid="text-property-address-mobile">
                        {[
                          form.watch("address"),
                          form.watch("city"),
                          form.watch("state"),
                          form.watch("zipCode")
                        ].filter(Boolean).join(", ").replace(/, ([A-Z]{2}),/, ", $1")}
                      </p>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        data-testid="select-property-type-mobile"
                      >
                        <FormControl>
                          <SelectTrigger
                            className={`w-full min-h-12 ${fieldState.error ? "border-destructive" : ""}`}
                            data-testid="button-property-type-mobile"
                          >
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {propertyTypes.map((type) => (
                            <SelectItem
                              key={type.value}
                              value={type.value}
                              data-testid={`option-property-type-mobile-${type.value}`}
                            >
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            className={`w-full min-h-12 ${fieldState.error ? "border-destructive" : ""}`}
                            data-testid="input-bedrooms-mobile"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            className={`w-full min-h-12 ${fieldState.error ? "border-destructive" : ""}`}
                            data-testid="input-bathrooms-mobile"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="sqft"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Square Footage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className={`w-full min-h-12 ${fieldState.error ? "border-destructive" : ""}`}
                          data-testid="input-sqft-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lotSize"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Lot Size (sq ft)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className={`w-full min-h-12 ${fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          data-testid="input-lot-size-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearBuilt"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Year Built</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="1800"
                          max={new Date().getFullYear() + 1}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          className={`w-full min-h-12 ${fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          data-testid="input-year-built-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="annualTax"
                  render={({ field }) => {
                    const isEmpty = !field.value || field.value === 0;
                    return (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Annual Tax ($)</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Tax data is not always accurate. Users are encouraged to fetch the data themselves from the county and enter it here if there is a discrepancy.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Math.round(parseFloat(e.target.value)) : undefined
                              )
                            }
                            className={`w-full min-h-12 ${isEmpty ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : ""}`}
                            data-testid="input-annual-tax-mobile"
                          />
                        </FormControl>
                        {isEmpty && (
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            Tax data was not found. Please look up the annual property tax from your county records and enter it here.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="hoaFees"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>HOA Monthly</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className={`w-full min-h-12 ${fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          data-testid="input-hoa-monthly-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hoaTransferFee"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        HOA Transfer Fee
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>HOA Transfer Fee is not publicly available information. You can get it directly from the HOA, enter one month HOA as an estimate, or leave it blank.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className={`w-full min-h-12 ${fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          data-testid="input-hoa-transfer-fee-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-sm text-muted-foreground">
                  Please fill in the HOA values if there is an HOA
                </p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Valuation" defaultOpen={true}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="estimatedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-col items-start gap-0">
                        <span>{estimateLabel}</span>
                        <span className="flex items-center gap-1">
                          (Enter ARV Here)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>The estimated market value is based on Rentcast Data. It may or may not represent improved properties. Do your own research.</p>
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder={`Enter ${estimateLabel.toLowerCase()}`}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className="w-full min-h-12"
                          data-testid="input-estimated-value-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {arvValue > 0 && (purchasePrice > 0 || rehabBudget > 0) && (
                  <div
                    className={`text-sm font-medium ${percentColorClass}`}
                    data-testid="text-percent-of-arv-mobile"
                  >
                    {percentOfArv.toFixed(1)}% of ARV
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="ARV Helper" defaultOpen={false}>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use comparable sales to estimate ARV
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-12"
                  onClick={handleArvHelperOpen}
                  data-testid="button-open-arv-helper-mobile"
                >
                  Open ARV Helper
                </Button>
              </div>
            </CollapsibleSection>

            {showArvHelper && (
              <div className="px-4 py-4">
                <ArvHelper form={form} onClose={handleArvHelperClose} />
              </div>
            )}
          </form>
        </Form>
      </MobileStepWrapper>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="w-full sm:w-auto text-center sm:text-left">
          <h2 className="text-2xl font-semibold">
            Property Details
          </h2>
          <p className="text-muted-foreground mt-1">
            Review and update the property information below
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 font-bold text-base"
          onClick={() => showArvHelper ? handleArvHelperClose() : handleArvHelperOpen()}
          data-testid="button-help-with-arv"
        >
          <Search className="h-4 w-4" />
          Help with ARV
          {showArvHelper ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        </div>
      </div>

      {showArvHelper && (
        <ArvHelper form={form} onClose={handleArvHelperClose} />
      )}

      <Collapsible open={arvVideoOpen} onOpenChange={setArvVideoOpen} className="mt-3 hidden sm:block">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-foreground bg-muted/60 border border-border px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <PlayCircle className="h-4 w-4 flex-shrink-0 text-primary" />
            <strong>Watch ARV Helper Tutorial</strong>
            <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${arvVideoOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="relative aspect-video bg-black rounded-md overflow-hidden border border-border">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/gxVt-VspJRU?rel=0&modestbranding=1"
              title="ARV Helper Tutorial"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">ARV Helper step-by-step tutorial</p>
        </CollapsibleContent>
      </Collapsible>

      <div ref={formRef}>
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
          onClick={() => setShowFormDetails(!showFormDetails)}
        >
          {showFormDetails 
            ? <ChevronUp className="h-4 w-4" /> 
            : <ChevronDown className="h-4 w-4" />}
          {showFormDetails ? "Hide property details" : "Show property details"}
        </button>
        {showFormDetails && (
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Property Address Display - Always shown */}
              {(form.watch("address") || form.watch("city") || form.watch("state")) && (
                <div className="space-y-2">
                  <FormLabel>Property Address</FormLabel>
                  <div className="p-3 bg-muted rounded-md border">
                    <p className="font-medium" data-testid="text-property-address">
                      {[
                        form.watch("address"),
                        form.watch("city"),
                        form.watch("state"),
                        form.watch("zipCode")
                      ].filter(Boolean).join(", ").replace(/, ([A-Z]{2}),/, ", $1")}
                    </p>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      data-testid="select-property-type"
                    >
                      <FormControl>
                        <SelectTrigger data-testid="button-property-type">
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {propertyTypes.map((type) => (
                          <SelectItem
                            key={type.value}
                            value={type.value}
                            data-testid={`option-property-type-${type.value}`}
                          >
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {dataSource === "manual" && (
                <>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Main Street"
                            {...field}
                            value={field.value ?? ""}
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="City"
                              {...field}
                              value={field.value ?? ""}
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="FL"
                              maxLength={2}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              data-testid="input-state"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="12345"
                              maxLength={5}
                              {...field}
                              value={field.value ?? ""}
                              data-testid="input-zip-code"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="yearBuilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Built</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="1800"
                          max={new Date().getFullYear() + 1}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          data-testid="input-year-built"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sqft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Square Footage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-sqft"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="annualTax"
                  render={({ field }) => {
                    const isEmpty = !field.value || field.value === 0;
                    return (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Annual Tax ($)</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Tax data is not always accurate. Users are encouraged to fetch the data themselves from the county and enter it here if there is a discrepancy.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Math.round(parseFloat(e.target.value)) : undefined
                              )
                            }
                            className={isEmpty ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : ""}
                            data-testid="input-annual-tax"
                          />
                        </FormControl>
                        {isEmpty && (
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            Tax data was not found. Please look up the annual property tax from your county records and enter it here.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              {/* Square footage question hidden for now - functionality preserved for future use */}
              {/* 
              <FormField
                control={form.control}
                name="addingSquareFootage"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Are you adding square footage?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === "yes")}
                        value={field.value ? "yes" : "no"}
                        className="flex gap-4"
                        data-testid="radio-adding-sqft"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="adding-sqft-yes" data-testid="radio-adding-sqft-yes" />
                          <label htmlFor="adding-sqft-yes" className="text-sm font-medium cursor-pointer">
                            Yes
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="adding-sqft-no" data-testid="radio-adding-sqft-no" />
                          <label htmlFor="adding-sqft-no" className="text-sm font-medium cursor-pointer">
                            No
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {addingSquareFootage && (
                <FormField
                  control={form.control}
                  name="newSquareFootage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What's the new square footage?</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Enter new square footage"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-new-sqft"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-col items-start gap-0">
                        <span>{estimateLabel}</span>
                        <span className="flex items-center gap-1">
                          (Enter ARV Here)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>The estimated market value is based on Rentcast Data. It may or may not represent improved properties. Do your own research.</p>
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder={`Enter ${estimateLabel.toLowerCase()}`}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-estimated-value"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hoaFees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HOA Monthly</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-hoa-monthly"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hoaTransferFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        HOA Transfer Fee
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>HOA Transfer Fee is not publicly available information. You can get it directly from the HOA, enter one month HOA as an estimate, or leave it blank.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-hoa-transfer-fee"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Please fill in the requested values if there is an HOA
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-bedrooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-bathrooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lotSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lot Size (sq ft)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-lot-size"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {!isMobile && (
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto min-h-11 sm:min-h-9"
              data-testid="button-back"
            >
              Back
            </Button>
            <Button type="submit" className="w-full sm:w-auto" data-testid="button-continue">
              Continue to Purchase Details
            </Button>
          </div>
          )}

          {/* Mobile-only: Help with ARV + Tutorial appear below the Continue button so the
              primary CTA is the first thing users see on small screens. */}
          <div className="sm:hidden flex flex-col gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-11 gap-1.5"
              onClick={() => showArvHelper ? handleArvHelperClose() : handleArvHelperOpen()}
              data-testid="button-help-with-arv-mobile"
            >
              <Search className="h-4 w-4" />
              Help with ARV
              {showArvHelper ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            <Collapsible open={arvVideoOpen} onOpenChange={setArvVideoOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-11 gap-1.5"
                  data-testid="button-watch-arv-tutorial-mobile"
                >
                  <PlayCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                  <strong>Watch ARV Helper Tutorial</strong>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${arvVideoOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="relative aspect-video bg-black rounded-md overflow-hidden border border-border">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src="https://www.youtube.com/embed/gxVt-VspJRU?rel=0&modestbranding=1"
                    title="ARV Helper Tutorial"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">ARV Helper step-by-step tutorial</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </form>
      </Form>
        )}
      </div>
    </div>
  );
}
