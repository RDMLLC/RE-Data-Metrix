import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle } from "lucide-react";
import type { AffiliateProgram } from "@/data/affiliatePrograms";

interface AffiliateCardProps {
  program: AffiliateProgram;
}

export function AffiliateCard({ program }: AffiliateCardProps) {
  const Icon = program.icon;

  return (
    <Card className="flex flex-col h-full hover-elevate" data-testid={`card-affiliate-${program.id}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-accent/10">
            <Icon className="h-6 w-6 text-accent" />
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
          >
            Visit {program.name}
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
