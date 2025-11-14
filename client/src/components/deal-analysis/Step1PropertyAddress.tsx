import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import type { WizardFormData } from "./DealAnalysisWizard";

interface Step1Props {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onPropertyDataLoaded: (data: any) => void;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function Step1PropertyAddress({ form, onNext, onPropertyDataLoaded }: Step1Props) {
  const { toast } = useToast();
  const [isLookupComplete, setIsLookupComplete] = useState(false);

  const propertyLookupMutation = useMutation({
    mutationFn: async (data: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
    }) => {
      const response = await apiRequest("POST", "/api/property/lookup", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      form.setValue("propertyType", data.propertyType || "");
      form.setValue("bedrooms", data.bedrooms);
      form.setValue("bathrooms", data.bathrooms);
      form.setValue("sqft", data.sqft);
      form.setValue("lotSize", data.lotSize);
      form.setValue("yearBuilt", data.yearBuilt);
      form.setValue("taxAssessedValue", data.taxAssessedValue);
      form.setValue("estimatedValue", data.estimatedValue);
      form.setValue("lastSalePrice", data.lastSalePrice);
      form.setValue("lastSaleDate", data.lastSaleDate);
      
      onPropertyDataLoaded(data);
      setIsLookupComplete(true);
      
      toast({
        title: "Property Found",
        description: "Property details have been loaded successfully.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Unable to find property data. You can still continue and enter details manually.";
      toast({
        variant: "destructive",
        title: "Property Not Found",
        description: errorMessage,
      });
      setIsLookupComplete(true);
    },
  });

  const handleLookup = () => {
    const address = form.getValues("address");
    const city = form.getValues("city");
    const state = form.getValues("state");
    const zipCode = form.getValues("zipCode");

    if (!address || !city || !state || !zipCode) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in address, city, state, and ZIP code.",
      });
      return;
    }

    propertyLookupMutation.mutate({ address, city, state, zipCode });
  };

  const handleNext = () => {
    const address = form.getValues("address");
    const city = form.getValues("city");
    const state = form.getValues("state");
    const zipCode = form.getValues("zipCode");

    if (!address || !city || !state || !zipCode) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Enter the property address to get started. We'll automatically fetch property details to help you analyze the deal.
      </p>

      <Form {...form}>
        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="123 Main St"
                    data-testid="input-address"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="San Francisco"
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {...field}
                      placeholder="94102"
                      data-testid="input-zipcode"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <Button
              type="button"
              onClick={handleLookup}
              disabled={propertyLookupMutation.isPending}
              className="w-full md:w-auto"
              data-testid="button-lookup-property"
            >
              {propertyLookupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Looking up property...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Lookup Property
                </>
              )}
            </Button>
          </div>

          {isLookupComplete && (
            <div className="pt-4 border-t">
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
      </Form>
    </div>
  );
}
