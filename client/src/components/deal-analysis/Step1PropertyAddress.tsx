import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ExternalLink } from "lucide-react";
import type { WizardFormData } from "./DealAnalysisWizard";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Step1Props {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onPropertyDataLoaded: (data: any) => void;
}

export default function Step1PropertyAddress({ form, onNext, onPropertyDataLoaded }: Step1Props) {
  const { toast } = useToast();
  const [isLookupComplete, setIsLookupComplete] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");

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
      
      form.setValue("address", data.address || "");
      form.setValue("city", data.city || "");
      form.setValue("state", data.state || "");
      form.setValue("zipCode", data.zipCode || "");
      form.setValue("propertyType", data.propertyType || "");
      form.setValue("bedrooms", data.bedrooms);
      form.setValue("bathrooms", data.bathrooms);
      form.setValue("sqft", data.sqft);
      form.setValue("lotSize", data.lotSize);
      form.setValue("yearBuilt", data.yearBuilt);
      form.setValue("taxAssessedValue", data.taxAssessedValue);
      form.setValue("estimatedValue", data.estimatedValue);
      form.setValue("propertyDataSource", dataSource);
      
      onPropertyDataLoaded(data);
      setIsLookupComplete(true);
      
      toast({
        title: "Property Found",
        description: "Property details have been loaded successfully.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Unable to find property data. Please check the URL and try again.";
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
        description: "Please provide a valid Redfin or Zillow property URL.",
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
      <div>
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
              placeholder="https://www.redfin.com/..."
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
            Example: https://www.redfin.com/CA/San-Francisco/123-Main-St-94102/home/12345678
          </p>
        </div>

        {isLookupComplete && (
          <div className="pt-4 border-t space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-semibold mb-2">Property Found</h3>
              <p className="text-sm text-muted-foreground">
                {form.getValues("address")}, {form.getValues("city")}, {form.getValues("state")} {form.getValues("zipCode")}
              </p>
            </div>
            
            <Button
              type="button"
              onClick={handleNext}
              className="w-full md:w-auto"
              data-testid="button-next-step"
            >
              Continue to Property Details
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
