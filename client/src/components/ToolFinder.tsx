import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Check, X, Search, RotateCcw, Lock, Loader2 } from "lucide-react";
import type { Affiliate } from "@shared/schema";

interface ToolFinderProps {
  isBlurred?: boolean;
}

// Feature definitions for the Tool Finder
// Note: Feature names should be distinct from Category names to avoid confusion
const featureLabels: Record<string, string> = {
  drivingForDollars: "Driving for Dollars",
  directMail: "Direct Mail",
  skipTracing: "Skip Tracing",
  listBuilding: "List Building",
  crm: "CRM",
  propertyAnalytics: "Property Analytics",
  dealAnalysis: "Deal Analysis",
  mobileApp: "Mobile App",
  teamCollaboration: "Team Collaboration",
  marketingAutomation: "Marketing Automation",
  rehabCostEstimating: "Rehab Cost Estimating",
  landlordTools: "Landlord/Tenant Tools",
  websiteLandingPage: "Website/Landing Page",
  mlsDataFeeds: "MLS Data Feeds",
  virtualDriving: "Virtual Driving",
};

const allFeatureKeys = Object.keys(featureLabels);

export default function ToolFinder({ isBlurred = false }: ToolFinderProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Fetch active affiliates with features from the database
  const { data: affiliates, isLoading } = useQuery<Affiliate[]>({
    queryKey: ["/api/affiliates"],
  });

  // Filter affiliates that have features defined
  const toolAffiliates = affiliates?.filter(a => a.features && a.features.length > 0) || [];

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const resetFilters = () => {
    setSelectedFeatures([]);
  };

  // Filter affiliates by selected features - must match ALL selected features
  const matchingTools = selectedFeatures.length > 0
    ? toolAffiliates.filter(affiliate => 
        selectedFeatures.every(feature => affiliate.features?.includes(feature))
      ).sort((a, b) => {
        // Sort by total number of features (descending) as a secondary sort
        const aTotal = (a.features?.length || 0);
        const bTotal = (b.features?.length || 0);
        return bTotal - aTotal;
      })
    : [];

  const renderFeatureCheckbox = (feature: string) => (
    <div key={feature} className="flex items-center space-x-2">
      <Checkbox
        id={feature}
        checked={selectedFeatures.includes(feature)}
        onCheckedChange={() => toggleFeature(feature)}
        data-testid={`checkbox-feature-${feature}`}
      />
      <label
        htmlFor={feature}
        className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {featureLabels[feature]}
      </label>
    </div>
  );

  const renderToolCard = (affiliate: Affiliate) => {
    const affiliateFeatures = affiliate.features || [];
    const matchingCount = selectedFeatures.filter(f => affiliateFeatures.includes(f)).length;
    const totalFeatures = affiliateFeatures.length;

    return (
      <Card key={affiliate.id} className="p-5" data-testid={`card-tool-${affiliate.id}`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground" data-testid={`text-tool-name-${affiliate.id}`}>
                {affiliate.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {totalFeatures} feature{totalFeatures !== 1 ? 's' : ''}
                {selectedFeatures.length > 0 && (
                  <span className="ml-2 text-accent font-medium">
                    ({matchingCount}/{selectedFeatures.length} matched)
                  </span>
                )}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0"
              onClick={() => window.open(affiliate.referralLink, '_blank', 'noopener,noreferrer')}
              data-testid={`button-visit-${affiliate.id}`}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Visit
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {allFeatureKeys.map(feature => {
              const hasFeature = affiliateFeatures.includes(feature);
              const isSelected = selectedFeatures.includes(feature);
              
              if (!hasFeature && !isSelected) return null;
              
              return (
                <Badge
                  key={feature}
                  variant={hasFeature ? "default" : "outline"}
                  className={`text-xs ${
                    hasFeature 
                      ? isSelected 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-muted text-muted-foreground'
                      : 'border-destructive/50 text-destructive bg-destructive/10'
                  }`}
                >
                  {hasFeature ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  {featureLabels[feature]}
                </Badge>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  const renderBlurredOverlay = () => (
    <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center p-6 rounded-lg">
      <Lock className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-lg font-semibold text-foreground text-center mb-2">Subscribe to View Tools</p>
      <p className="text-sm text-muted-foreground text-center mb-4">
        Get full access to our curated tool recommendations
      </p>
      <Link href="/pricing">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-subscribe-tools">
          View Membership Plans
        </Button>
      </Link>
    </div>
  );

  const renderResults = () => {
    if (isLoading) {
      return (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading tools...</p>
        </Card>
      );
    }

    if (toolAffiliates.length === 0) {
      return (
        <Card className="p-8 text-center border-dashed">
          <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            No tools with features are available yet. Check back soon!
          </p>
        </Card>
      );
    }

    if (selectedFeatures.length > 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Matching Tools</h3>
          
          {matchingTools.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {matchingTools.map(renderToolCard)}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No tools match all your selected criteria. Try removing some filters.
              </p>
            </Card>
          )}
        </div>
      );
    }

    return (
      <Card className="p-8 text-center border-dashed">
        <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground">
          Select one or more features above to see matching tools.
        </p>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Tool Finder</h2>
        <p className="text-muted-foreground">
          Select the features you need and we'll show you which tools offer them.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Select Features You Need</h3>
          </div>
          {selectedFeatures.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              data-testid="button-reset-filters"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {allFeatureKeys.map(renderFeatureCheckbox)}
        </div>

        {selectedFeatures.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{matchingTools.length}</span> tool{matchingTools.length !== 1 ? 's' : ''} match{matchingTools.length === 1 ? 'es' : ''} your criteria
            </p>
          </div>
        )}
      </Card>

      {isBlurred ? (
        <div className="relative">
          <div className="pointer-events-none select-none">
            {renderResults()}
          </div>
          {renderBlurredOverlay()}
        </div>
      ) : (
        renderResults()
      )}
    </div>
  );
}
