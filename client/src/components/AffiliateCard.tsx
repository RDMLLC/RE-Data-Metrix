import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, Lock } from "lucide-react";
import type { Affiliate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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

function getDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    
    // If only 2 parts (e.g., freedomsoft.com), return as is
    if (parts.length <= 2) {
      return hostname;
    }
    
    // Handle country code TLDs like .co.uk, .com.au, .org.uk
    const countryCodeTLDs = ['co.uk', 'com.au', 'org.uk', 'net.au', 'co.nz', 'com.br'];
    const lastTwo = parts.slice(-2).join('.');
    if (countryCodeTLDs.includes(lastTwo)) {
      // Return last 3 parts for country code TLDs
      return parts.slice(-3).join('.');
    }
    
    // For subdomains (e.g., fkc.freedomsoft.com), return root domain (last 2 parts)
    return parts.slice(-2).join('.');
  } catch {
    return null;
  }
}

function CompanyLogo({ referralLink, name, size = 24, fallbackIcon: FallbackIcon }: { referralLink: string; name: string; size?: number; fallbackIcon: any }) {
  const [hasError, setHasError] = useState(false);
  const domain = getDomainFromUrl(referralLink);
  
  if (!domain || hasError) {
    return <FallbackIcon className="h-6 w-6 text-accent" />;
  }
  
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      className="rounded-sm object-contain"
      style={{ width: size, height: size }}
      onError={() => setHasError(true)}
    />
  );
}

interface AffiliateCardProps {
  program: Affiliate;
}

export function AffiliateCard({ program }: AffiliateCardProps) {
  const Icon = iconMap[program.iconName] || Building2;
  const isActive = program.isActive;

  const handleClick = async () => {
    if (!isActive) return;
    
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
            <CompanyLogo referralLink={program.referralLink} name={program.name} size={24} fallbackIcon={Icon} />
          </div>
          <CardTitle className="text-lg">{program.name}</CardTitle>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {program.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Why this helps you:</p>
          <ul className="space-y-1.5">
            {program.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter>
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
            Visit {program.name}
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
