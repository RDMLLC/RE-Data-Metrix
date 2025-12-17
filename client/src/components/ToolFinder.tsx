import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Check, X, Search, RotateCcw, Lock, Loader2, DollarSign } from "lucide-react";
import type { Affiliate, AffiliateCategory } from "@shared/schema";

interface ToolFinderProps {
  isBlurred?: boolean;
}

export default function ToolFinder({ isBlurred = false }: ToolFinderProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: affiliates, isLoading: affiliatesLoading } = useQuery<Affiliate[]>({
    queryKey: ["/api/affiliates"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<AffiliateCategory[]>({
    queryKey: ["/api/affiliate-categories"],
  });

  const isLoading = affiliatesLoading || categoriesLoading;

  const toolAffiliates = affiliates?.filter(a => a.categories && a.categories.length > 0) || [];

  const categoryLabels: Record<string, string> = {};
  categories?.forEach(cat => {
    categoryLabels[cat.id] = cat.name;
  });

  const allCategoryKeys = categories?.map(c => c.id).sort((a, b) => {
    const catA = categories.find(c => c.id === a);
    const catB = categories.find(c => c.id === b);
    return (catA?.sortOrder || 0) - (catB?.sortOrder || 0);
  }) || [];

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const resetFilters = () => {
    setSelectedCategories([]);
  };

  const matchingTools = selectedCategories.length > 0
    ? toolAffiliates.filter(affiliate => 
        selectedCategories.every(categoryId => affiliate.categories?.includes(categoryId))
      ).sort((a, b) => {
        const aTotal = (a.categories?.length || 0);
        const bTotal = (b.categories?.length || 0);
        return bTotal - aTotal;
      })
    : [];

  const renderCategoryCheckbox = (categoryId: string) => (
    <div key={categoryId} className="flex items-center space-x-2">
      <Checkbox
        id={categoryId}
        checked={selectedCategories.includes(categoryId)}
        onCheckedChange={() => toggleCategory(categoryId)}
        data-testid={`checkbox-category-${categoryId}`}
      />
      <label
        htmlFor={categoryId}
        className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {categoryLabels[categoryId] || categoryId}
      </label>
    </div>
  );

  const formatCostRange = (costFrom: string | null | undefined, costTo: string | null | undefined): string | null => {
    if (!costFrom && !costTo) return null;
    if (costFrom && costTo) return `${costFrom} - ${costTo}`;
    if (costFrom) return `From ${costFrom}`;
    if (costTo) return `Up to ${costTo}`;
    return null;
  };

  const renderToolCard = (affiliate: Affiliate) => {
    const affiliateCategories = affiliate.categories || [];
    const matchingCount = selectedCategories.filter(c => affiliateCategories.includes(c)).length;
    const totalCategories = affiliateCategories.length;
    const costDisplay = formatCostRange(affiliate.costFrom, affiliate.costTo);

    return (
      <Card key={affiliate.id} className="p-5" data-testid={`card-tool-${affiliate.id}`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground" data-testid={`text-tool-name-${affiliate.id}`}>
                  {affiliate.name}
                </h3>
                {affiliate.hasFreeTrial && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs" data-testid={`badge-free-trial-${affiliate.id}`}>
                    Free Trial
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {totalCategories} categor{totalCategories !== 1 ? 'ies' : 'y'}
                {selectedCategories.length > 0 && (
                  <span className="ml-2 text-accent font-medium">
                    ({matchingCount}/{selectedCategories.length} matched)
                  </span>
                )}
              </p>
              {costDisplay && (
                <div className="flex items-center gap-1 mt-1" data-testid={`text-cost-${affiliate.id}`}>
                  <DollarSign className="h-3.5 w-3.5 text-accent" />
                  <span className="text-sm font-medium text-accent">{costDisplay}</span>
                </div>
              )}
              {affiliate.description && (
                <p className="text-sm text-muted-foreground mt-2" data-testid={`text-description-${affiliate.id}`}>
                  {affiliate.description}
                </p>
              )}
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
            {allCategoryKeys.map(categoryId => {
              const hasCategory = affiliateCategories.includes(categoryId);
              const isSelected = selectedCategories.includes(categoryId);
              
              if (!hasCategory && !isSelected) return null;
              
              return (
                <Badge
                  key={categoryId}
                  variant={hasCategory ? "default" : "outline"}
                  className={`text-xs ${
                    hasCategory 
                      ? isSelected 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-muted text-muted-foreground'
                      : 'border-destructive/50 text-destructive bg-destructive/10'
                  }`}
                >
                  {hasCategory ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  {categoryLabels[categoryId] || categoryId}
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
            No tools with categories are available yet. Check back soon!
          </p>
        </Card>
      );
    }

    if (selectedCategories.length > 0) {
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
          Select one or more categories above to see matching tools.
        </p>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Tool Finder</h2>
        <p className="text-muted-foreground">
          Select the categories you need and we'll show you which tools offer them.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Select Categories You Need</h3>
          </div>
          {selectedCategories.length > 0 && (
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

        {categoriesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {allCategoryKeys.map(renderCategoryCheckbox)}
          </div>
        )}

        {selectedCategories.length > 0 && (
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
