import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Shield, TrendingUp, Users, Calculator, Building2, ArrowRight } from "lucide-react";

const memberBenefits = [
  "Complete Deal Analysis with ROI calculations",
  "Side-by-side lender loan comparisons",
  "Rental Analysis with DSCR calculations",
  "Access to curated lender network",
  "Save and track unlimited deals",
  "Save favorite lenders for quick access",
  "Export loan analysis reports",
  "Full access to Toolbox resources",
  "Priority email support",
];

const memberFeatures = [
  { feature: "Deal Analysis Wizard", value: "Full access" },
  { feature: "Loan Comparisons", value: "Unlimited" },
  { feature: "Rental Analysis", value: "Full DSCR calculations" },
  { feature: "Lender Search", value: "Full database access" },
  { feature: "Save Deals", value: "Unlimited" },
  { feature: "Save Lenders", value: "Unlimited" },
  { feature: "Toolbox Resources", value: "Complete access" },
  { feature: "Export Reports", value: "PDF & detailed reports" },
  { feature: "Email Support", value: "Priority response" },
];

export default function Pricing() {
  const { isAuthenticated, isSubscriber, user } = useAuth();

  const getSubscriptionLabel = () => {
    if (!user) return null;
    switch (user.subscriptionStatus) {
      case 'active':
        return { text: "Active Member", variant: "default" as const };
      case 'comped':
        return { text: "Complimentary Access", variant: "secondary" as const };
      case 'referral_trial':
        return { text: "Referral Trial", variant: "secondary" as const };
      default:
        return null;
    }
  };

  const subscriptionLabel = getSubscriptionLabel();

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4" data-testid="text-pricing-title">
              Simple, Transparent Pricing
            </h1>
            <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get full access to all the tools you need to analyze deals, compare lenders, and fund your investments with confidence.
            </p>
          </div>

          {isSubscriber && subscriptionLabel && (
            <div className="max-w-md mx-auto mb-8">
              <Card className="border-success/30 bg-success/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-3">
                    <Check className="h-5 w-5 text-success" />
                    <span className="font-medium text-foreground">
                      You have <Badge className="ml-1">{subscriptionLabel.text}</Badge>
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    <Link href="/portal/profile" className="text-primary hover:underline">
                      Manage your subscription
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 max-w-lg mx-auto mb-16">
            <Card className="relative border-2 border-accent shadow-lg">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground px-4 py-1">
                  <Star className="h-3 w-3 mr-1 inline" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-primary">Full Membership</CardTitle>
                <CardDescription>Everything you need to succeed</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">$49</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {memberBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isSubscriber ? (
                  <Link href="/portal/profile" className="w-full">
                    <Button className="w-full" variant="outline" data-testid="button-manage-subscription">
                      Manage Subscription
                    </Button>
                  </Link>
                ) : (
                  <Link href="/checkout" className="w-full">
                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-get-started">
                      {isAuthenticated ? "Upgrade Now" : "Get Started"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-primary text-center mb-8" data-testid="text-features-title">
              What's Included
            </h2>
            <Card className="overflow-hidden max-w-2xl mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-member-features">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="text-left px-6 py-4 font-semibold">Feature</th>
                      <th className="text-left px-6 py-4 font-semibold">Included</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberFeatures.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="px-6 py-4 text-foreground font-medium">{row.feature}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-success flex-shrink-0" />
                            <span className="text-success font-medium text-sm">{row.value}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Have a comp code?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Register with your code
              </Link>{" "}
              for complimentary access.
            </p>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-primary text-center mb-8">
              Why RE Data Metrix?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="text-center p-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Smart Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive deal analysis with ROI, cash flow, and profitability calculations.
                </p>
              </Card>
              <Card className="text-center p-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Curated Lenders</h3>
                <p className="text-sm text-muted-foreground">
                  Access our vetted network of private lenders specializing in real estate.
                </p>
              </Card>
              <Card className="text-center p-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Compare Options</h3>
                <p className="text-sm text-muted-foreground">
                  Side-by-side loan comparisons to find the best financing for your deals.
                </p>
              </Card>
              <Card className="text-center p-6">
                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Secure Platform</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is protected with enterprise-grade security and encryption.
                </p>
              </Card>
            </div>
          </div>

          <div className="bg-primary rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Deal Analysis?
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
              Join thousands of real estate investors who use RE Data Metrix to analyze deals, compare financing options, and close with confidence.
            </p>
            {!isSubscriber ? (
              <Link href="/checkout">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-cta-signup">
                  {isAuthenticated ? "Upgrade Now" : "Get Started"}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href="/portal/dashboard">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-cta-dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-16 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-4">Questions?</h3>
            <p className="text-muted-foreground mb-4">
              Check our <Link href="/faq" className="text-primary hover:underline">FAQ</Link> or{" "}
              <Link href="/contact" className="text-primary hover:underline">contact us</Link> for more information.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
