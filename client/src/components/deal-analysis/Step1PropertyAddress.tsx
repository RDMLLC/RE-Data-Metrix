import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ExternalLink, HardHat, Lock, Sparkles } from "lucide-react";
import type { WizardFormData } from "./DealAnalysisWizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWizardData } from "@/contexts/WizardDataContext";
import GroundUpModal from "./GroundUpModal";
import { Link } from "wouter";

// YouTube video for demo
const YOUTUBE_VIDEO_ID = "m6SjKQ3dYe4";

interface Step1Props {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onPropertyDataLoaded: (data: any) => void;
  isSubscriber?: boolean;
}

export default function Step1PropertyAddress({ form, onNext, onPropertyDataLoaded, isSubscriber = false }: Step1Props) {
  const { toast } = useToast();
  const { updatePropertyData, clearWizardData } = useWizardData();
  const [isLookupComplete, setIsLookupComplete] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [manualEntryPreference, setManualEntryPreference] = useState<boolean>(false);
  const [propertyImage, setPropertyImage] = useState<string | null>(null);
  const [groundUpModalOpen, setGroundUpModalOpen] = useState(false);

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
        propertyType: data.propertyType || "",
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
      
      toast({
        title: "Property Found",
        description: "Property details have been loaded successfully.",
      });
    },
    onError: (error: any) => {
      // Parse error message from API response (format: "500: {"error":"message"}")
      let errorMessage = "Unable to find property data. Please check the URL and try again, or use manual entry.";
      
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

    onNext();
  };

  return (
    <div className="space-y-6">
      {!isSubscriber && (
        <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
          <h3 className="font-semibold text-lg mb-2">See What This Tool Can Do</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Watch a quick demo to see how the Deal Analysis tool helps you compare loan options, calculate profits, and find the best financing for your deals.
          </p>
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-white/20">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
              title="RE Data Metrix Demo Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              data-testid="video-demo"
            />
          </div>
        </div>
      )}

      {!manualEntryPreference && (
        <>
          {/* For non-subscribers: Show "Try it for free" first, then premium lookup */}
          {!isSubscriber && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2">Get Started</h2>
                <p className="text-muted-foreground mb-4">
                  Enter property details manually to analyze your deal and compare financing options.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button
                    type="button"
                    onClick={() => setManualEntryPreference(true)}
                    data-testid="button-switch-manual-entry"
                  >
                    Try it for Free
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
                      Premium Feature: Auto Property Lookup & Lender Referral
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Members can automatically fetch property details, tax records, and valuations from Zillow or Redfin URLs - saving time and ensuring accuracy.
                    </p>
                    <Link href="/checkout">
                      <Button size="sm" data-testid="button-upgrade-lookup">
                        Upgrade to Unlock
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* For subscribers: Show property lookup interface */}
          {isSubscriber && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2">Property Lookup</h2>
                <p className="text-muted-foreground">
                  Paste a Redfin or Zillow property URL to get started. We'll automatically fetch property details to help you analyze the deal.
                </p>
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
                      disabled={propertyLookupMutation.isPending}
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
                    onClick={() => setManualEntryPreference(true)}
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
