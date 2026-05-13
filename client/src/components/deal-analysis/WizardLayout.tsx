import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, RotateCcw, MapPin, Bed, Bath, Ruler, Calendar, LandPlot } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PropertyDetails {
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  lotSize?: number;
}

interface WizardLayoutProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onStartNew?: () => void;
  canGoBack: boolean;
  children: React.ReactNode;
  propertyAddress?: string;
  propertyDetails?: PropertyDetails;
}

export default function WizardLayout({
  currentStep,
  totalSteps,
  onBack,
  onStartNew,
  canGoBack,
  children,
  propertyAddress,
  propertyDetails,
}: WizardLayoutProps) {
  const { isSubscriber } = useAuth();
  const stepTitles = [
    "Property Address",
    "Property Details",
    "Purchase & Renovation",
    "Investor Information",
    "Holding Period & Exit",
    "Results",
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {canGoBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
            data-testid="button-wizard-back"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">
              Deal Analysis
            </h1>
            <div className="flex items-center gap-4">
              {onStartNew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStartNew}
                  className={!isSubscriber ? "hidden sm:inline-flex" : ""}
                  data-testid="button-start-new-analysis"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start New Analysis
                </Button>
              )}
              <span className={`text-sm text-muted-foreground ${!isSubscriber ? "hidden sm:inline" : ""}`}>
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          </div>
          
          <div className={`flex gap-2 mb-6 ${!isSubscriber ? "hidden sm:flex" : ""}`}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index < currentStep
                    ? "bg-primary"
                    : index === currentStep - 1
                    ? "bg-primary/70"
                    : "bg-muted"
                }`}
                data-testid={`progress-step-${index + 1}`}
              />
            ))}
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            {stepTitles[currentStep - 1]}
          </h2>
          
          {/* Property details bar - hidden on step 3 where it's shown inline in the form */}
          {propertyAddress && currentStep > 1 && currentStep !== 3 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mt-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{propertyAddress}</span>
              </div>
              {propertyDetails && (propertyDetails.bedrooms || propertyDetails.sqft || propertyDetails.yearBuilt || propertyDetails.lotSize) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {propertyDetails.bedrooms && propertyDetails.bathrooms && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-3 w-3" />
                      {propertyDetails.bedrooms}/{propertyDetails.bathrooms}
                    </span>
                  )}
                  {propertyDetails.sqft && (
                    <span className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      {propertyDetails.sqft.toLocaleString()} sqft
                    </span>
                  )}
                  {propertyDetails.yearBuilt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {propertyDetails.yearBuilt}
                    </span>
                  )}
                  {propertyDetails.lotSize && (
                    <span className="flex items-center gap-1">
                      <LandPlot className="h-3 w-3" />
                      {propertyDetails.lotSize.toLocaleString()} sqft lot
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <Card className="p-4 sm:p-8">{children}</Card>
      </div>
    </div>
  );
}
