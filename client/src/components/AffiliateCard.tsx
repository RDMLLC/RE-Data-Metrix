import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, Lock, Info } from "lucide-react";
import type { Affiliate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Building2,
  Users,
  Wrench,
  Target,
  MapPin,
  Calculator,
  BarChart3,
  Layers,
} from "lucide-react";

const iconMap: Record<string, any> = {
  Building2,
  Users,
  Wrench,
  Target,
  MapPin,
  Calculator,
  BarChart3,
  Layers,
};

const DEMO_AFFILIATE_NAMES = [
  "Property Pro Tools",
  "Investor Essentials",
  "RealTech Solutions",
  "Deal Finder Plus",
  "Portfolio Manager Pro",
  "Rental Analytics Hub",
  "Market Research Co",
  "Investment Tracker",
];

const DEMO_AFFILIATE_DESCRIPTIONS = [
  "Comprehensive tools for real estate investors to streamline their property management.",
  "All-in-one platform for investment analysis and property tracking.",
  "Advanced analytics and reporting for rental property portfolios.",
  "Market research and deal analysis tools for savvy investors.",
];

interface AffiliateCardProps {
  program: Affiliate;
  isDemoMode?: boolean;
  demoIndex?: number;
}

export function AffiliateCard({ program, isDemoMode = false, demoIndex = 0 }: AffiliateCardProps) {
  const Icon = iconMap[program.iconName] || Building2;
  const isActive = program.isActive;

  const handleClick = async () => {
    if (!isActive || isDemoMode) return;
    
    try {
      await apiRequest('POST', '/api/affiliate-clicks', {
        affiliateId: program.id,
        affiliateName: program.name,
        category: program.categories[0] || 'unknown',
      });
    } catch (error) {
      console.log('Click tracking failed silently');
    }
  };

  const displayName = isDemoMode 
    ? DEMO_AFFILIATE_NAMES[demoIndex % DEMO_AFFILIATE_NAMES.length]
    : program.name;
  
  const displayDescription = isDemoMode
    ? DEMO_AFFILIATE_DESCRIPTIONS[demoIndex % DEMO_AFFILIATE_DESCRIPTIONS.length]
    : program.description;
  
  const displayBenefits = isDemoMode
    ? ["Exclusive discounts for members", "Streamlined workflow integration", "Premium support access"]
    : program.benefits;

  if (!isActive) {
    return (
      <Card className="flex flex-col h-full relative overflow-hidden" data-testid={`card-affiliate-${program.id}`}>
        <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center p-6">
          <Lock className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground text-center font-medium">Coming Soon</p>
          <p className="text-xs text-muted-foreground/70 text-center mt-1">This partner program is not yet available</p>
        </div>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-accent/10">
              <Icon className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="text-lg blur-sm select-none">Partner Name</CardTitle>
          </div>
          <CardDescription className="text-sm leading-relaxed blur-sm select-none">
            Partner description and details will be available soon.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground blur-sm select-none">Benefits:</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-sm text-muted-foreground blur-sm select-none">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>Benefit details coming soon</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground blur-sm select-none">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>Additional benefits</span>
              </li>
            </ul>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            disabled
            className="w-full"
            data-testid={`button-visit-${program.id}`}
          >
            Coming Soon
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full hover-elevate" data-testid={`card-affiliate-${program.id}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-accent/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-accent" />
          </div>
          <CardTitle className="text-lg">{displayName}</CardTitle>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {displayDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Why this helps you:</p>
          <ul className="space-y-1.5">
            {displayBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {isDemoMode ? (
          <Button
            className="w-full"
            data-testid={`button-visit-${program.id}`}
            onClick={(e) => e.preventDefault()}
          >
            Visit Partner
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <>
            {program.slug && (
              <Button
                asChild
                variant="outline"
                className="w-full"
                data-testid={`button-details-${program.id}`}
              >
                <Link href={`/partners/${program.slug}`}>
                  <Info className="h-4 w-4 mr-2" />
                  Learn More
                </Link>
              </Button>
            )}
            <Button
              asChild
              className="w-full"
              data-testid={`button-visit-${program.id}`}
            >
              <a
                href={program.referralLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
              >
                Visit {displayName}
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
