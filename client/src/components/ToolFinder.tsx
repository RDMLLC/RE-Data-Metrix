import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ExternalLink, Check, X, Search, RotateCcw, Lock, Loader2, DollarSign, Video, Info } from "lucide-react";
import type { Affiliate, AffiliateCategory } from "@shared/schema";

const TOOL_FINDER_VIDEO_ID = "5hfQdtC42fk";

export function ToolFinderTutorial() {
  return (
    <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Video className="h-5 w-5 text-accent" />
        <h3 className="font-semibold text-lg">Tool Finder Tutorial</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Learn how to use the Tool Finder to discover the perfect tools for your real estate investing needs.
      </p>
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white/20" data-testid="video-tool-finder-tutorial">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${TOOL_FINDER_VIDEO_ID}?rel=0&modestbranding=1`}
          title="Tool Finder Tutorial"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

interface ToolFinderProps {
  isBlurred?: boolean;
  showTutorial?: boolean;
}

const PLACEHOLDER_AFFILIATES: Affiliate[] = (([
  {
    id: "demo-1",
    name: "Property Research Tool",
    description: "Find investment opportunities with this powerful property research platform. Access market data, property details, and investment analytics.",
    benefits: ["Market Analysis", "Property Data", "Investment Insights"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["comps", "lead-generation", "deal-analysis", "mls-access", "list-building", "marketplace"],
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
  },
  {
    id: "demo-2",
    name: "Lead Generation Platform",
    description: "Discover motivated sellers and off-market deals with advanced lead generation tools and skip tracing capabilities.",
    benefits: ["Skip Tracing", "Motivated Sellers", "Off-Market Deals"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["lead-generation", "marketplace", "skip-tracing", "list-building", "direct-mail", "sms", "crm", "marketing-automation"],
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
  },
  {
    id: "demo-3",
    name: "Property Management Software",
    description: "Streamline your rental property management with automated rent collection, maintenance tracking, and tenant communication.",
    benefits: ["Rent Collection", "Maintenance Tracking", "Tenant Portal"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["property-management", "team-collaboration", "crm", "mobile-app", "deal-analysis", "legal", "project-management"],
    features: [],
    iconName: "Building2",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$12/unit",
    costTo: "$25/unit",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 3,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-4",
    name: "Project Management Hub",
    description: "Manage your rehab projects, track budgets, coordinate contractors, and monitor timelines all in one place.",
    benefits: ["Budget Tracking", "Contractor Management", "Timeline Monitoring"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["project-management", "rehab-cost-estimating", "team-collaboration", "deal-analysis", "mobile-app", "property-management"],
    features: [],
    iconName: "ClipboardList",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$39/mo",
    costTo: "$149/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 4,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-5",
    name: "Investor Community Platform",
    description: "Connect with other investors, find partners, and access exclusive deal opportunities through this investor marketplace.",
    benefits: ["Networking", "Deal Sharing", "Partnership Matching"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["marketplace", "lead-generation", "deal-analysis", "crm", "team-collaboration", "legal"],
    features: [],
    iconName: "Users",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$0",
    costTo: "$99/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 5,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-6",
    name: "MLS Data Access",
    description: "Get direct access to MLS listings and market data for comprehensive property research and analysis.",
    benefits: ["MLS Listings", "Real-time Data", "Property History"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["mls-access", "comps", "deal-analysis", "lead-generation", "list-building", "marketplace"],
    features: [],
    iconName: "Database",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$49/mo",
    costTo: "$149/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 6,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-7",
    name: "Real Estate Legal Services",
    description: "Access legal document templates, contract reviews, and attorney consultations for your real estate transactions.",
    benefits: ["Contract Templates", "Legal Review", "Attorney Access"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["legal", "deal-analysis", "project-management", "property-management", "team-collaboration"],
    features: [],
    iconName: "Scale",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$29/mo",
    costTo: "$199/mo",
    hasFreeTrial: false,
    isActive: true,
    sortOrder: 7,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-8",
    name: "Driving for Dollars App",
    description: "Mobile app for driving neighborhoods and identifying distressed properties with GPS tracking and photo capture.",
    benefits: ["GPS Tracking", "Photo Capture", "Route Planning"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["driving-for-dollars", "mobile-app", "virtual-driving", "lead-generation", "list-building", "comps", "skip-tracing"],
    features: [],
    iconName: "Car",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$19/mo",
    costTo: "$49/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 8,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-9",
    name: "Direct Mail Campaign Manager",
    description: "Create and send targeted direct mail campaigns to motivated sellers with tracking and analytics.",
    benefits: ["Mail Templates", "Campaign Tracking", "List Integration"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["direct-mail", "marketing-automation", "list-building", "lead-generation", "crm", "sms", "skip-tracing"],
    features: [],
    iconName: "Mail",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$0.50/piece",
    costTo: "$2/piece",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 9,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-10",
    name: "Skip Tracing Service",
    description: "Find property owner contact information including phone numbers, emails, and addresses for motivated seller outreach.",
    benefits: ["Phone Numbers", "Email Addresses", "Owner Info"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["skip-tracing", "list-building", "lead-generation", "direct-mail", "sms", "crm", "marketing-automation"],
    features: [],
    iconName: "Search",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$0.10/record",
    costTo: "$0.25/record",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 10,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-11",
    name: "Real Estate CRM",
    description: "Manage your leads, follow-ups, and deals with a CRM designed specifically for real estate investors.",
    benefits: ["Lead Management", "Follow-up Automation", "Deal Pipeline"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["crm", "lead-generation", "marketing-automation", "deal-analysis", "team-collaboration", "mobile-app", "sms", "direct-mail"],
    features: [],
    iconName: "Users",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$49/mo",
    costTo: "$199/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 11,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-12",
    name: "Deal Analysis Calculator",
    description: "Analyze fix & flip and rental deals with comprehensive calculators including ARV, repair costs, and ROI projections.",
    benefits: ["ROI Calculator", "ARV Analysis", "Cash Flow Projections"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["deal-analysis", "rehab-cost-estimating", "comps", "mls-access", "project-management", "mobile-app"],
    features: [],
    iconName: "Calculator",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$0",
    costTo: "$49/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 12,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-13",
    name: "Real Estate Mobile App",
    description: "Access your deals, contacts, and analytics on the go with a powerful mobile app for real estate investors.",
    benefits: ["Mobile Access", "Offline Mode", "Push Notifications"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["mobile-app", "crm", "deal-analysis", "driving-for-dollars", "virtual-driving", "comps", "lead-generation"],
    features: [],
    iconName: "Smartphone",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$0",
    costTo: "$29/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 13,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-14",
    name: "Team Collaboration Suite",
    description: "Coordinate with your team, assign tasks, and share documents for seamless real estate operations.",
    benefits: ["Task Assignment", "Document Sharing", "Team Chat"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["team-collaboration", "project-management", "crm", "property-management", "mobile-app", "deal-analysis"],
    features: [],
    iconName: "Users",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$12/user",
    costTo: "$25/user",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 14,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-15",
    name: "Marketing Automation Platform",
    description: "Automate your marketing campaigns across email, SMS, and direct mail with drip campaigns and follow-up sequences.",
    benefits: ["Email Campaigns", "SMS Marketing", "Drip Sequences"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["marketing-automation", "sms", "direct-mail", "crm", "lead-generation", "list-building", "website-landing-page"],
    features: [],
    iconName: "Zap",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$79/mo",
    costTo: "$299/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 15,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-16",
    name: "Rehab Estimator Pro",
    description: "Create detailed repair estimates with contractor-level accuracy using room-by-room cost breakdowns.",
    benefits: ["Cost Templates", "Contractor Pricing", "Detailed Reports"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["rehab-cost-estimating", "project-management", "deal-analysis", "comps", "mobile-app", "team-collaboration"],
    features: [],
    iconName: "Hammer",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$29/mo",
    costTo: "$79/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 16,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-17",
    name: "Investor Website Builder",
    description: "Create professional websites and landing pages to attract motivated sellers and build your investor brand.",
    benefits: ["Landing Pages", "SEO Optimization", "Lead Capture"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["website-landing-page", "lead-generation", "marketing-automation", "crm", "sms", "direct-mail"],
    features: [],
    iconName: "Globe",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$39/mo",
    costTo: "$99/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 17,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-18",
    name: "Virtual Driving Platform",
    description: "Explore neighborhoods virtually with street-level imagery and satellite views to find distressed properties from your desk.",
    benefits: ["Street View", "Satellite Imagery", "Property Markers"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["virtual-driving", "driving-for-dollars", "comps", "lead-generation", "list-building", "mls-access", "mobile-app"],
    features: [],
    iconName: "Map",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$29/mo",
    costTo: "$79/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 18,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-19",
    name: "SMS Marketing Platform",
    description: "Send bulk SMS messages to motivated sellers with compliance features and response tracking.",
    benefits: ["Bulk SMS", "Compliance Tools", "Response Tracking"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["sms", "marketing-automation", "lead-generation", "crm", "direct-mail", "list-building", "skip-tracing"],
    features: [],
    iconName: "MessageSquare",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$49/mo",
    costTo: "$199/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 19,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "demo-20",
    name: "Complete Investor Suite",
    description: "All-in-one platform combining CRM, deal analysis, marketing automation, and team collaboration for serious investors.",
    benefits: ["All-in-One", "Integrated Tools", "Enterprise Features"],
    referralLink: "#",
    portalUrl: null,
    loginUsername: null,
    loginPassword: null,
    categories: ["crm", "deal-analysis", "marketing-automation", "team-collaboration", "lead-generation", "property-management", "project-management", "mls-access", "comps", "list-building", "skip-tracing", "direct-mail", "sms", "mobile-app", "website-landing-page"],
    features: [],
    iconName: "Briefcase",
    referralFee: null,
    referralFeeType: null,
    costFrom: "$199/mo",
    costTo: "$499/mo",
    hasFreeTrial: true,
    isActive: true,
    sortOrder: 20,
    createdAt: null,
    updatedAt: null,
  },
]) as any[]);

export default function ToolFinder({ isBlurred = false, showTutorial = true }: ToolFinderProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");

  const { data: affiliates, isLoading: affiliatesLoading } = useQuery<Affiliate[]>({
    queryKey: ["/api/affiliates"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<AffiliateCategory[]>({
    queryKey: ["/api/affiliate-categories"],
  });

  const { data: demoModeData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/demo-mode"],
  });

  const isDemoMode = demoModeData?.enabled === true;

  const isLoading = affiliatesLoading || categoriesLoading;

  const displayAffiliates = useMemo(() => {
    if (isDemoMode) {
      return PLACEHOLDER_AFFILIATES;
    }
    return affiliates?.filter(a => a.categories && a.categories.length > 0) || [];
  }, [affiliates, isDemoMode]);

  const toolAffiliates = displayAffiliates;

  const categoryLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    categories?.forEach(cat => { labels[cat.id] = cat.name; });
    return labels;
  }, [categories]);

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
    setSearchText("");
  };

  const normalizedSearch = searchText.trim().toLowerCase();

  const matchingTools = useMemo(() => {
    const hasText = normalizedSearch.length > 0;
    const hasCats = selectedCategories.length > 0;

    if (!hasText && !hasCats) return [];

    return toolAffiliates.filter(affiliate => {
      const catMatch = hasCats
        ? selectedCategories.every(categoryId => affiliate.categories?.includes(categoryId))
        : true;

      if (!catMatch) return false;

      if (hasText) {
        const haystack = [
          affiliate.name,
          affiliate.description,
          ...(affiliate.benefits || []),
          ...(affiliate.categories || []).map((c: string) => categoryLabels[c] || c),
          ...(affiliate.features || []),
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedSearch);
      }

      return true;
    }).sort((a, b) => (b.categories?.length || 0) - (a.categories?.length || 0));
  }, [toolAffiliates, selectedCategories, normalizedSearch, categoryLabels]);

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

  const getLogoUrl = (referralLink: string): string | null => {
    try {
      const url = new URL(referralLink);
      const domain = url.hostname.replace('www.', '');
      return `https://logo.clearbit.com/${domain}`;
    } catch {
      return null;
    }
  };

  const renderToolCard = (affiliate: Affiliate) => {
    const affiliateCategories = affiliate.categories || [];
    const matchingCount = selectedCategories.filter(c => affiliateCategories.includes(c)).length;
    const totalCategories = affiliateCategories.length;
    const costDisplay = formatCostRange(affiliate.costFrom, affiliate.costTo);
    const logoUrl = getLogoUrl(affiliate.referralLink);

    return (
      <Card key={affiliate.id} className="p-5" data-testid={`card-tool-${affiliate.id}`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              {logoUrl && (
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-border/50 flex items-center justify-center overflow-hidden">
                  <img 
                    src={logoUrl} 
                    alt={`${affiliate.name} logo`}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    data-testid={`img-logo-${affiliate.id}`}
                  />
                </div>
              )}
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
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {affiliate.slug && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  data-testid={`button-learn-more-${affiliate.id}`}
                >
                  <Link href={`/partners/${affiliate.slug}`}>
                    <Info className="h-4 w-4 mr-1" />
                    Learn More
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(affiliate.referralLink, '_blank', 'noopener,noreferrer')}
                data-testid={`button-visit-${affiliate.id}`}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Visit
              </Button>
            </div>
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

    if (selectedCategories.length > 0 || searchText.trim()) {
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
                No tools match your search. Try different keywords or removing some filters.
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
          Search by keyword or select categories above to find matching tools.
        </p>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {showTutorial && (
        <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-lg">Tool Finder Tutorial</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Learn how to use the Tool Finder to discover the perfect tools for your real estate investing needs.
          </p>
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white/20" data-testid="video-tool-finder-tutorial">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${TOOL_FINDER_VIDEO_ID}?rel=0&modestbranding=1`}
              title="Tool Finder Tutorial"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-2">Tool Finder</h2>
        <p className="text-muted-foreground">
          Search by keyword or select categories to find the right tools for your investing needs.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Find Tools</h3>
          </div>
          {(selectedCategories.length > 0 || searchText.trim()) && (
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

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by keyword (e.g. SMS, CRM, skip tracing…)"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-9"
            data-testid="input-tool-search"
          />
        </div>

        <p className="text-sm text-muted-foreground mb-3">Or filter by category:</p>

        {categoriesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {allCategoryKeys.map(renderCategoryCheckbox)}
          </div>
        )}

        {(selectedCategories.length > 0 || searchText.trim()) && (
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
