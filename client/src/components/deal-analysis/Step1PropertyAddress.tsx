import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ExternalLink, HardHat, Lock, Sparkles, Info, ChevronDown, PlayCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { WizardFormData } from "./DealAnalysisWizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWizardData } from "@/contexts/WizardDataContext";
import GroundUpModal from "./GroundUpModal";
import QuotaExhaustedModal from "./QuotaExhaustedModal";
import { normalizePropertyTypeToEnum } from "./propertyTypeUtils";
import { Link, useLocation } from "wouter";

const YOUTUBE_VIDEO_ID = "m6SjKQ3dYe4";

interface Step1Props {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onPropertyDataLoaded: (data: any) => void;
  isSubscriber?: boolean;
  isAuthenticated?: boolean;
}

export default function Step1PropertyAddress({ form, onNext, onPropertyDataLoaded, isSubscriber = false, isAuthenticated = false }: Step1Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { updatePropertyData, clearWizardData } = useWizardData();
  const [isLookupComplete, setIsLookupComplete] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [manualEntryPreference, setManualEntryPreference] = useState<boolean>(false);
  const [propertyImage, setPropertyImage] = useState<string | null>(null);
  const [groundUpModalOpen, setGroundUpModalOpen] = useState(false);
  const [quotaExhaustedModalOpen, setQuotaExhaustedModalOpen] = useState(false);
  const [missingAutoFillFields, setMissingAutoFillFields] = useState<string[]>([]);
  const [videoOpen, setVideoOpen] = useState(false);

  const { data: usageData, isLoading: usageLoading, isError: usageError } = useQuery<{
    isSubscriber: boolean;
    remainingLookups: number;
    propertyLookupCount: number;
  }>({
    queryKey: ['/api/user/usage'],
    enabled: isAuthenticated && !isSubscriber,
    retry: 2,
  });

  const usageReady = isSubscriber || (!usageLoading && !usageError && usageData != null);
  const remainingLookups = isSubscriber ? -1 : (usageData?.remainingLookups ?? null);
  const lookupQuotaExhausted = !isSubscriber && remainingLookups !== null && remainingLookups <= 0;

  // Check if form already has property data (e.g., when navigating back) and restore state
  useEffect(() => {
    const address = form.getValues("address");
    const city = form.getValues("city");
    const state = form.getValues("state");
    const propertyDataSource = form.getValues("propertyDataSource");
    
    if (address && city && state) {
      if (propertyDataSource === "manual") {
        setManualEntryPreference(true);
      } else {
        setIsLookupComplete(true);
      }
    }
  }, [form]);

  const propertyLookupMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/property/lookup", { url });
      return await response.json();
    },
    onSuccess: (data: any, url: string) => {
      let dataSource = 'unknown';
      if (url.includes('zillow.com')) {
        dataSource = 'zillow';
      } else if (url.includes('redfin.com')) {
        dataSource = 'redfin';
      }
      
      // Clear previous wizard data completely
      clearWizardData();
      
      // Use form.reset() to atomically reset ALL fields and set new property data
      // This properly resets react-hook-form's internal state unlike setValue()
      form.reset({
        // New property data from lookup
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zipCode || "",
        propertyType: normalizePropertyTypeToEnum(data.propertyType),
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        sqft: data.sqft,
        lotSize: data.lotSize,
        yearBuilt: data.yearBuilt,
        taxAssessedValue: data.taxAssessedValue,
        annualTax: data.annualTax,
        estimatedValue: data.estimatedValue,
        hoaFees: data.hoaFees,
        propertyDataSource: dataSource,
        // Store coordinates for comps distance calculation
        propertyLatitude: data.latitude,
        propertyLongitude: data.longitude,
        // Required defaults
        addingSquareFootage: false,
        closingTimeline: "22-30-days",
        loanPreference: "one-of-each",
        hasExistingLoan: false,
        // Explicitly clear all financial/analysis fields
        purchasePrice: undefined,
        rehabBudget: undefined,
        arv: undefined,
        projectLength: undefined,
        sellPrice: undefined,
        isDoubleClose: undefined,
        payingForBothSides: undefined,
        // Clear Step 4 fields
        attorneyFees: undefined,
        docPrepFees: undefined,
        titleExam: undefined,
        titleInsurance: undefined,
        transferFee: undefined,
        attorneyFees2: undefined,
        docPrepFees2: undefined,
        titleExam2: undefined,
        titleInsurance2: undefined,
        monthlyUtilities: undefined,
        annualInsurance: undefined,
        hoaTransferFee: undefined,
        otherCarryingCosts: undefined,
        closingCostsSellPercent: undefined,
        realEstateCommissionPercent: undefined,
        // Clear investor fields
        isNewInvestor: undefined,
        creditScore: undefined,
      });
      
      // Store property image
      if (data.imageUrl) {
        setPropertyImage(data.imageUrl);
      } else {
        setPropertyImage(null);
      }
      
      // Save only the lookup data to WizardDataContext (with financial fields cleared)
      updatePropertyData({
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zipCode,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFootage: data.sqft,
        taxAssessedValue: data.taxAssessedValue,
        estimatedRent: data.estimatedRent,
        estimatedRentSource: data.estimatedRentSource || undefined,
        propertyUrl: url,
        // Explicitly clear financial fields in context
        purchasePrice: undefined,
        arv: undefined,
        rehabBudget: undefined,
        projectLength: undefined,
        sellPrice: undefined,
        attorneyFees: undefined,
        docPrepFees: undefined,
        titleExam: undefined,
        titleInsurance: undefined,
        annualInsurance: undefined,
        monthlyUtilities: undefined,
        hoaFees: data.hoaFees,
        hoaTransferFee: undefined,
        closingCostsSellPercent: undefined,
        realEstateCommissionPercent: undefined,
      });
      
      onPropertyDataLoaded(data);
      setIsLookupComplete(true);

      // Detect fields the API couldn't populate so we can warn the user
      const missing: string[] = [];
      if (!data.sqft || data.sqft <= 0) missing.push("Square footage");
      if (!data.bedrooms || data.bedrooms <= 0) missing.push("Bedrooms");
      if (!data.bathrooms || data.bathrooms <= 0) missing.push("Bathrooms");
      if (!data.yearBuilt || data.yearBuilt <= 0) missing.push("Year built");
      setMissingAutoFillFields(missing);

      queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });

      toast({
        title: "Property Found",
        description: "Property details have been loaded successfully.",
      });
    },
    onError: (error: any) => {
      // Parse error message from API response (format: "500: {"error":"message"}")
      let errorMessage = "Unable to find property data. Please check the URL and try again, or use manual entry.";
      let errorCode = "";
      
      try {
        const errorString = error?.message || "";
        
        // Try to extract JSON from the error message (greedy match for nested objects)
        const jsonMatch = errorString.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          try {
            const errorJson = JSON.parse(jsonMatch[0]);
            if (errorJson.error) {
              errorMessage = errorJson.error;
            }
            if (errorJson.code) {
              errorCode = errorJson.code;
            }
          } catch {
            // JSON parse failed, use default message
          }
        }
        
        // Fallback: if no JSON found, check for status code format
        if (errorMessage === "Unable to find property data. Please check the URL and try again, or use manual entry.") {
          if (errorString.includes(":") && !errorString.includes("{")) {
            const afterColon = errorString.split(":").slice(1).join(":").trim();
            if (afterColon && afterColon.length > 10) {
              errorMessage = afterColon;
            }
          }
        }
      } catch {
        // Keep default error message
      }
      
      // Check for quota exhaustion - show modal instead of toast
      if (errorCode === "LOOKUP_LIMIT_REACHED") {
        setQuotaExhaustedModalOpen(true);
        return;
      }
      
      toast({
        variant: "destructive",
        title: "Property Not Found",
        description: errorMessage,
      });
    },
  });

  const handleLookup = () => {
    if (!propertyUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Missing URL",
        description: "Please enter a Redfin or Zillow property URL.",
      });
      return;
    }

    if (!propertyUrl.includes('redfin.com') && !propertyUrl.includes('zillow.com')) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please provide a valid Redfin or Zillow property URL. We currently only support these platforms.",
      });
      return;
    }

    window.gtag?.('event', 'deal_analysis_submitted', {
      event_category: 'engagement',
      event_label: 'deal_analysis',
    });
    propertyLookupMutation.mutate(propertyUrl);
  };

  const handleNext = () => {
    const address = form.getValues("address");
    const city = form.getValues("city");
    const state = form.getValues("state");

    if (!address || !city || !state) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please lookup a property first or wait for the data to load.",
      });
      return;
    }

    window.gtag?.('event', 'deal_analysis_submitted', {
      event_category: 'engagement',
      event_label: 'deal_analysis',
    });
    onNext();
  };

  // Handles both quota-redirect and direct "switch to manual" — clears stale data
  // and skips directly to Step 2 without the intermediate manual-entry screen.
  const handleGoToManualEntry = () => {
    form.setValue("purchasePrice", undefined);
    form.setValue("rehabBudget", undefined);
    form.setValue("arv", undefined);
    form.setValue("projectLength", undefined);
    form.setValue("sellPrice", undefined);
    form.setValue("closingTimeline", "22-30-days");
    form.setValue("isDoubleClose", undefined);
    form.setValue("payingForBothSides", undefined);
    form.setValue("propertyDataSource", "manual");
    form.setValue("address", "");
    form.setValue("city", "");
    form.setValue("state", "");
    form.setValue("zipCode", "");
    updatePropertyData({ estimatedRent: undefined, estimatedRentSource: undefined });
    onNext();
  };

  return (
    <div className="space-y-6">

      {!manualEntryPreference && (
        <>
          {/* For unauthenticated users: Show signup prompt */}
          {!isAuthenticated && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2">Get Started</h2>
                <p className="text-muted-foreground mb-4">
                  Create a free account to analyze deals with 2 automated deal analyses per month, plus unlimited manual entry.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button
                    type="button"
                    onClick={() => setLocation("/pricing?returnTo=/deal-analysis")}
                    data-testid="button-switch-manual-entry"
                  >
                    Get Started Free
                  </Button>
                  <button
                    type="button"
                    onClick={() => setGroundUpModalOpen(true)}
                    className="text-sm text-blue-600 hover:underline underline-offset-4 flex items-center gap-1"
                    data-testid="link-ground-up"
                  >
                    <HardHat className="h-4 w-4" />
                    Click Here for Ground-Up / New Build Projects
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Auto Property Lookup & Lender Referral
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Free accounts get 2 automated deal analyses per month. Subscribers get unlimited analyses plus deal saving, PDF export, and more.
                    </p>
                    <Link href="/pricing">
                      <Button size="sm" data-testid="button-upgrade-lookup">
                        View Plans
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* For authenticated users (free or subscriber): Show property lookup interface */}
          {isAuthenticated && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2">Property Lookup</h2>
                <p className="text-muted-foreground">
                  Paste a Redfin or Zillow property URL to get started. We'll automatically fetch property details to help you analyze the deal.
                </p>

                <Collapsible open={videoOpen} onOpenChange={setVideoOpen} className="mt-3">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm text-foreground bg-muted/60 border border-border px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                      data-testid="button-toggle-training-video"
                    >
                      <PlayCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                      Watch a quick demo
                      <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${videoOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="relative aspect-video bg-black rounded-md overflow-hidden border border-border">
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
                        title="RE Data Metrix Training Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        data-testid="video-demo"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>


                <Alert className="mt-4">
                  <ExternalLink className="h-4 w-4" />
                  <AlertDescription>
                    Find your property on{" "}
                    <a
                      href="https://www.redfin.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline underline-offset-4 hover:text-primary"
                    >
                      Redfin
                    </a>
                    {" "}or{" "}
                    <a
                      href="https://www.zillow.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline underline-offset-4 hover:text-primary"
                    >
                      Zillow
                    </a>
                    , then copy and paste the full URL here.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label htmlFor="property-url" className="text-sm font-medium">
                    Property URL *
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="property-url"
                      value={propertyUrl}
                      onChange={(e) => setPropertyUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLookup();
                        }
                      }}
                      placeholder="https://www.zillow.com/homedetails/123-Main-St-Anytown-CA-12345/123456789_zpid/"
                      className="flex-1"
                      data-testid="input-property-url"
                    />
                    <Button
                      type="button"
                      onClick={handleLookup}
                      disabled={propertyLookupMutation.isPending || lookupQuotaExhausted || (!isSubscriber && !usageReady)}
                      data-testid="button-lookup-property"
                    >
                      {propertyLookupMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: https://www.zillow.com/homedetails/123-Main-St-Anytown-CA-12345/123456789_zpid/
                  </p>
                </div>

                {isLookupComplete && (
                  <div className="pt-4 border-t space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <h3 className="font-semibold mb-2">Property Found</h3>
                      <div className="mb-3 rounded-md overflow-hidden bg-muted">
                        <img 
                          src={propertyImage || "/images/property-placeholder.svg"} 
                          alt="Property"
                          className="w-full max-h-64 md:max-h-80 object-contain"
                          data-testid="img-property"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/property-placeholder.svg";
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {form.getValues("address")}, {form.getValues("city")}, {form.getValues("state")} {form.getValues("zipCode")}
                      </p>
                    </div>
                    
                    {missingAutoFillFields.length > 0 && (
                      <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-missing-autofill">
                        <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                          <span className="font-medium">Some data couldn't be retrieved automatically:</span>{" "}
                          {missingAutoFillFields.join(", ")}.{" "}
                          Please enter these fields manually on the next step before proceeding.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-3 flex-wrap">
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="flex-1 md:flex-initial"
                        data-testid="button-next-step"
                      >
                        Continue to Property Details
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(propertyUrl, '_blank', 'noopener,noreferrer')}
                        disabled={!propertyUrl}
                        className="flex-1 md:flex-initial"
                        data-testid="button-view-listing"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Listing
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Don't have a property URL? You can enter property details manually instead.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoToManualEntry}
                    data-testid="button-switch-manual-entry-subscriber"
                  >
                    Switch to Manual Entry
                  </Button>
                  <button
                    type="button"
                    onClick={() => setGroundUpModalOpen(true)}
                    className="text-sm text-blue-600 hover:underline underline-offset-4 flex items-center gap-1"
                    data-testid="link-ground-up-subscriber"
                  >
                    <HardHat className="h-4 w-4" />
                    Click Here for Ground-Up / New Build Projects
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <GroundUpModal open={groundUpModalOpen} onOpenChange={setGroundUpModalOpen} />
      
      <QuotaExhaustedModal 
        open={quotaExhaustedModalOpen} 
        onOpenChange={setQuotaExhaustedModalOpen}
        onContinueManual={handleGoToManualEntry}
        isAuthenticated={isAuthenticated}
      />

      {manualEntryPreference && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Manual Property Entry</h2>
            <p className="text-muted-foreground">
              You'll enter all property details manually in the next step.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setManualEntryPreference(false)}
              data-testid="button-back-to-lookup"
            >
              Back to Property Lookup
            </Button>
            <Button
              type="button"
              onClick={() => {
                // Clear financial fields for fresh analysis (not wizard context)
                form.setValue("purchasePrice", undefined);
                form.setValue("rehabBudget", undefined);
                form.setValue("arv", undefined);
                form.setValue("projectLength", undefined);
                form.setValue("sellPrice", undefined);
                form.setValue("closingTimeline", "22-30-days");
                form.setValue("isDoubleClose", undefined);
                form.setValue("payingForBothSides", undefined);
                
                form.setValue("propertyDataSource", "manual");
                form.setValue("address", "");
                form.setValue("city", "");
                form.setValue("state", "");
                form.setValue("zipCode", "");
                updatePropertyData({ estimatedRent: undefined, estimatedRentSource: undefined });
                window.gtag?.('event', 'deal_analysis_submitted', {
                  event_category: 'engagement',
                  event_label: 'deal_analysis',
                });
                onNext();
              }}
              data-testid="button-manual-next"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
