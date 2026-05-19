import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import MobileAdminSwitcher from "@/components/MobileAdminSwitcher";
import { useDemoAccess } from "@/hooks/use-demo-access";
import { useDeviceMode } from "@/contexts/DeviceModeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Video,
  ExternalLink,
  Filter,
  X,
  ArrowLeft,
  Monitor,
  Lock,
  RotateCcw,
  DollarSign,
  Check,
  BookOpen,
  GraduationCap,
  Scale,
  Home,
  TrendingUp,
  Calculator,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Affiliate, AffiliateCategory } from "@shared/schema";

const TOOL_FINDER_VIDEO_ID = "5hfQdtC42fk";
const TOOL_FINDER_VIDEO_TITLE = "Tool Finder Tutorial";

const PLACEHOLDER_AFFILIATES: Affiliate[] = (([
  {
    id: "demo-1",
    name: "Property Research Tool",
    description: "Find investment opportunities with powerful property research.",
    benefits: ["Market Analysis", "Property Data"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["comps", "lead-generation"],
    features: [],
    iconName: "Search",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$29/mo",
    costTo: "$99/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 1,
    createdAt: null,
    updatedAt: null,
    notes: null,
  },
  {
    id: "demo-2",
    name: "Lead Generation Platform",
    description: "Discover motivated sellers and off-market deals.",
    benefits: ["Skip Tracing", "Motivated Sellers"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["lead-generation", "skip-tracing"],
    features: [],
    iconName: "Users",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$49/mo",
    costTo: "$199/mo",
    hasFreeTrial: false,
    isActive: true,
    sortOrder: 2,
    createdAt: null,
    updatedAt: null,
    notes: null,
  },
]) as any[]);

export default function MobileToolbox() {
  const { isSubscriber, isLoading: authLoading, isAuthenticated } = useAuth();
  const { hasDemoToken } = useDemoAccess();
  const { setDeviceMode } = useDeviceMode();
  const [, setLocation] = useLocation();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showToolFinderVideo, setShowToolFinderVideo] = useState(false);

  const backHref = isAuthenticated ? "/portal/dashboard" : "/";

  const handleViewDesktop = () => {
    setDeviceMode("desktop");
    setLocation("/toolbox");
  };

  const effectiveIsSubscriber = isSubscriber || hasDemoToken;

  const FREE_CALCULATORS: Array<{
    title: string;
    description: string;
    href: string;
    Icon: typeof Home;
    testId: string;
  }> = [
    {
      title: "Rental Property Calculator",
      description:
        "Analyze buy-and-hold rentals: cash flow, cap rate, IRR, and projected returns at sale.",
      href: "/rental-property-calculator",
      Icon: Home,
      testId: "rental-property",
    },
    {
      title: "DSCR Calculator",
      description:
        "Project rental income, expenses, and DSCR to qualify properties for long-term financing.",
      href: "/dscr-calculator",
      Icon: TrendingUp,
      testId: "dscr",
    },
    {
      title: "Max Offer Calculator",
      description:
        "Calculate the maximum you can pay on a fix & flip while protecting your target profit.",
      href: "/max-offer-calculator",
      Icon: Calculator,
      testId: "max-offer",
    },
    {
      title: "Wholesale Max Offer Calculator",
      description:
        "Determine assignment or double-close offer prices for wholesale deals with full fee breakdowns.",
      href: "/wholesale-calculator",
      Icon: DollarSign,
      testId: "wholesale-max-offer",
    },
  ];

  const { data: affiliates = [] } = useQuery<Affiliate[]>({
    queryKey: ["/api/affiliates"],
  });

  const { data: categories = [] } = useQuery<AffiliateCategory[]>({
    queryKey: ["/api/affiliate-categories"],
  });

  const { data: demoModeData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/demo-mode"],
  });

  const isSystemDemoMode = demoModeData?.enabled === true;

  const displayAffiliates = useMemo(() => {
    if (isSystemDemoMode) {
      return PLACEHOLDER_AFFILIATES;
    }
    return affiliates?.filter(a => a.categories && a.categories.length > 0) || [];
  }, [affiliates, isSystemDemoMode]);

  const sortedCategories = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

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
    ? displayAffiliates.filter(affiliate =>
        selectedCategories.every(categoryId => affiliate.categories?.includes(categoryId))
      ).sort((a, b) => (b.categories?.length || 0) - (a.categories?.length || 0))
    : displayAffiliates;

  const formatCostRange = (costFrom: string | null | undefined, costTo: string | null | undefined): string | null => {
    if (!costFrom && !costTo) return null;
    if (costFrom && costTo) return `${costFrom} - ${costTo}`;
    if (costFrom) return `From ${costFrom}`;
    if (costTo) return `Up to ${costTo}`;
    return null;
  };

  const getLogoUrl = (referralLink: string): string | null => {
    try {
      const url = new URL(referralLink);
      const domain = url.hostname.replace('www.', '');
      return `https://logo.clearbit.com/${domain}`;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <Link href={backHref}>
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-col items-center min-w-0 px-2">
            <h1 className="text-xl font-semibold leading-tight" data-testid="text-page-title">Toolbox</h1>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">Investor tools & resources</p>
          </div>
          <div className="flex items-center gap-1">
            <MobileAdminSwitcher />
            <Button
              variant="ghost"
              size="icon"
              title="Desktop Version"
              onClick={handleViewDesktop}
              data-testid="button-desktop-version"
            >
              <Monitor className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 pb-12 space-y-4">
        {/* Free Calculators — always shown at top */}
        <div className="space-y-2" data-testid="section-free-calculators">
          <h3 className="text-sm font-semibold" data-testid="heading-free-calculators">
            Free Calculators
          </h3>
          <div className="space-y-2">
            {FREE_CALCULATORS.map(({ title, description, href, Icon, testId }) => (
              <Link key={testId} href={href}>
                <Card
                  className="p-3 hover-elevate cursor-pointer"
                  data-testid={`card-calc-${testId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-[11px] text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {!authLoading && effectiveIsSubscriber && (
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button className="w-full" size="lg" data-testid="button-filter-tools">
                <Filter className="h-5 w-5 mr-2" />
                Browse Tools
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{selectedCategories.length}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>Filter by Category</span>
                  {selectedCategories.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 overflow-y-auto max-h-[50vh]">
                {sortedCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover-elevate"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <Checkbox
                      id={category.id}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                      data-testid={`checkbox-category-${category.id}`}
                    />
                    <label htmlFor={category.id} className="text-sm flex-1 cursor-pointer">
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button className="w-full" onClick={() => setShowFilters(false)} data-testid="button-apply-filters">
                  Show {matchingTools.length} Tool{matchingTools.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {!effectiveIsSubscriber && (
          <Card className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium">Subscribe for Full Access</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Get access to all partner tools and exclusive discounts
            </p>
            <Link href="/pricing">
              <Button size="sm" className="w-full" data-testid="button-view-pricing">
                View Plans
              </Button>
            </Link>
          </Card>
        )}

        {effectiveIsSubscriber && (
          <div className="space-y-3" data-testid="section-tools-list">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" data-testid="text-tools-count">
                {selectedCategories.length > 0 ? `${matchingTools.length} Matching Tools` : `${matchingTools.length} Tools`}
              </p>
              {selectedCategories.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-clear-filters">
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {matchingTools.map((tool) => {
              const logoUrl = getLogoUrl(tool.referralLink);
              const costDisplay = formatCostRange(tool.costFrom, tool.costTo);
              const matchCount = selectedCategories.filter(c => tool.categories?.includes(c)).length;

              return (
                <Card key={tool.id} className="p-3" data-testid={`card-tool-${tool.id}`}>
                  <div className="flex gap-3">
                    {logoUrl && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border flex items-center justify-center overflow-hidden">
                        <img
                          src={logoUrl}
                          alt={tool.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold truncate" data-testid={`text-tool-name-${tool.id}`}>{tool.name}</p>
                          <p className="text-[10px] text-muted-foreground" data-testid={`text-tool-categories-${tool.id}`}>
                            {tool.categories?.length || 0} categories
                            {selectedCategories.length > 0 && matchCount > 0 && (
                              <span className="text-accent ml-1">({matchCount} matched)</span>
                            )}
                          </p>
                        </div>
                        {tool.hasFreeTrial && (
                          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-free-trial-${tool.id}`}>
                            Free Trial
                          </Badge>
                        )}
                      </div>
                      {costDisplay && (
                        <div className="flex items-center gap-1 mt-1">
                          <DollarSign className="h-3 w-3 text-accent" aria-hidden="true" />
                          <span className="text-xs font-medium text-accent" data-testid={`text-tool-cost-${tool.id}`}>{costDisplay}</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2" data-testid={`text-tool-desc-${tool.id}`}>{tool.description}</p>
                      {tool.benefits && tool.benefits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tool.benefits.slice(0, 3).map((benefit, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0">
                              <Check className="h-2 w-2 mr-0.5" />
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {tool.referralLink && tool.referralLink !== "#" && (
                        <a href={tool.referralLink} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                          <Button variant="outline" size="sm" className="w-full" data-testid={`button-visit-${tool.id}`}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Visit Tool
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Resources section — mirrors desktop Resources tab */}
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold" data-testid="heading-resources">Resources</h3>
          <div className="space-y-2">
            <Link href="/blog">
              <Card className="p-3 hover-elevate cursor-pointer" data-testid="card-resource-blog">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Blog</p>
                    <p className="text-[11px] text-muted-foreground">Investor education and analysis</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link href="/toolbox#glossary">
              <Card className="p-3 hover-elevate cursor-pointer" data-testid="card-resource-glossary">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Glossary</p>
                    <p className="text-[11px] text-muted-foreground">Real estate investing terms</p>
                  </div>
                </div>
              </Card>
            </Link>
            <a href="https://www.legalshield.com" target="_blank" rel="noopener noreferrer">
              <Card className="p-3 hover-elevate cursor-pointer" data-testid="card-resource-legal">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">Legal Services</p>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">LegalShield for investors</p>
                  </div>
                </div>
              </Card>
            </a>
          </div>
        </div>

        {/* Tool Finder Tutorial Video — collapsed by default */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowToolFinderVideo((v) => !v)}
            className="flex items-center justify-between w-full p-3 rounded-md border border-border hover-elevate"
            data-testid="button-toggle-tool-finder-video"
            aria-expanded={showToolFinderVideo}
          >
            <span className="flex items-center gap-2">
              <Video className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">{TOOL_FINDER_VIDEO_TITLE}</span>
            </span>
            {showToolFinderVideo ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showToolFinderVideo && (
            <div className="mt-2 w-full">
              <div
                className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-border"
                data-testid="video-tool-finder-tutorial"
              >
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${TOOL_FINDER_VIDEO_ID}?rel=0&modestbranding=1`}
                  title={TOOL_FINDER_VIDEO_TITLE}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
