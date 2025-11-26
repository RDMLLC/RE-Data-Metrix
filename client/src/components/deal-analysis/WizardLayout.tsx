import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

interface WizardLayoutProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  canGoBack: boolean;
  children: React.ReactNode;
}

export default function WizardLayout({
  currentStep,
  totalSteps,
  onBack,
  canGoBack,
  children,
}: WizardLayoutProps) {
  const stepTitles = [
    "Property Address",
    "Property Details",
    "Purchase & Renovation",
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
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          
          <div className="flex gap-2 mb-6">
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
        </div>

        <Card className="p-8">{children}</Card>
      </div>
    </div>
  );
}
