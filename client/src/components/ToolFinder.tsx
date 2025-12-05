import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Check, X, Search, RotateCcw } from "lucide-react";
import { tools, featureLabels, getToolsByFeatures, type ToolFeatures, type Tool } from "@/data/toolComparison";

export default function ToolFinder() {
  const [selectedFeatures, setSelectedFeatures] = useState<(keyof ToolFeatures)[]>([]);

  const toggleFeature = (feature: keyof ToolFeatures) => {
    setSelectedFeatures(prev => 
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const resetFilters = () => {
    setSelectedFeatures([]);
  };

  const matchingTools = getToolsByFeatures(selectedFeatures);
  const allFeatureKeys = Object.keys(featureLabels) as (keyof ToolFeatures)[];

  const renderFeatureCheckbox = (feature: keyof ToolFeatures) => (
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

  const renderToolCard = (tool: Tool) => {
    const matchingCount = selectedFeatures.filter(f => tool.features[f]).length;
    const totalFeatures = Object.values(tool.features).filter(Boolean).length;

    return (
      <Card key={tool.id} className="p-5" data-testid={`card-tool-${tool.id}`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground" data-testid={`text-tool-name-${tool.id}`}>
                {tool.name}
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
              onClick={() => window.open(tool.website, '_blank', 'noopener,noreferrer')}
              data-testid={`button-visit-${tool.id}`}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Visit
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {allFeatureKeys.map(feature => {
              const hasFeature = tool.features[feature];
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

      {selectedFeatures.length > 0 ? (
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
      ) : (
        <Card className="p-8 text-center border-dashed">
          <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Select one or more features above to see matching tools.
          </p>
        </Card>
      )}
    </div>
  );
}
