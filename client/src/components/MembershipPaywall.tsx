import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Star, Check } from "lucide-react";

interface MembershipPaywallProps {
  title?: string;
  description?: string;
}

export default function MembershipPaywall({ 
  title = "Members Only Content",
  description = "This feature is available exclusively to RE Data Metrix members."
}: MembershipPaywallProps) {
  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl text-primary" data-testid="text-paywall-title">
          {title}
        </CardTitle>
        <CardDescription className="text-base" data-testid="text-paywall-description">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" />
              Member Benefits
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  Complete deal analysis with lender comparisons
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  Save and track unlimited deals
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  Access our curated lender network
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  Export loan analysis reports
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5" />
                <span className="text-muted-foreground">
                  Full access to Toolbox resources and affiliate programs
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing">
              <Button className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-view-pricing-paywall">
                View Membership Plans
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-login-paywall">
                Login to Your Account
              </Button>
            </Link>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already a member?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to access your full benefits. Or{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              view our plans
            </Link>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
