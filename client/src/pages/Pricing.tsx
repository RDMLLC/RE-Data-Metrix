import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Shield, TrendingUp, Users, Calculator, Building2, ArrowRight, Tag, Copy, CheckCheck } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PricingPageSchema } from "@/components/StructuredData";

const featureComparison = [
  { feature: "Property Lookups", free: "2 per month", paid: "Unlimited" },
  { feature: "Wholesale Calculator", free: "2 per month", paid: "Unlimited" },
  { feature: "ARV Calculations", free: "2 per month", paid: "Unlimited" },
  { feature: "Comp Reports", free: "2 per month", paid: "Unlimited" },
  { feature: "Deal Analysis Wizard", free: "2 automated + unlimited manual", paid: "Unlimited automation" },
  { feature: "Lender Loan Comparisons", free: "First 2 lookups only", paid: "Unlimited" },
  { feature: "Rental/DSCR Analysis", free: "2 automated + unlimited manual", paid: "Unlimited automation" },
  { feature: "Lender Search Tool", free: "Yes", paid: "Yes" },
  { feature: "State-Specific Calculations", free: "No", paid: "Yes" },
  { feature: "Save Deals", free: "No", paid: "Unlimited" },
  { feature: "Save Lenders", free: "No", paid: "Unlimited" },
  { feature: "Toolbox Resources", free: "Yes", paid: "Yes" },
  { feature: "Export Reports (PDF & CSV)", free: "No", paid: "Yes" },
  { feature: "Email Support", free: "Standard", paid: "Priority" },
];

export default function Pricing() {
  const { isAuthenticated, isSubscriber, user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [codeCopied, setCodeCopied] = useState(false);

  const copyPromoCode = () => {
    navigator.clipboard.writeText("FREEMONTH");
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const monthlyPrice = 25;
  const annualPrice = 250;
  const annualMonthlyEquivalent = (annualPrice / 12).toFixed(2);
  const annualSavings = (monthlyPrice * 12) - annualPrice;

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
      <SEO 
        title="Deal Analysis Software Pricing"
        description="View pricing for real estate deal analysis software. Compare plans, features, and tools for fix and flip and wholesale investors."
        canonicalUrl="https://redatametrix.com/pricing"
      />
      <PricingPageSchema />
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4" data-testid="text-pricing-title">
              Simple Pricing for Real Estate Deal Analysis Software
            </h1>
            <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-3">
              <strong><em>real estate deal analysis software pricing</em></strong> designed for investors who need powerful tools to analyze deals, compare lenders, and make smarter investment decisions.
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose a plan that fits your strategy, whether you're analyzing a few deals per month or scaling your investment business with unlimited access.
            </p>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-primary mb-3">Choose the Right Plan for Your Investment Strategy</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're just getting started or actively scaling your portfolio, our pricing plans are built to support every stage of your real estate investing journey.
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

          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center bg-muted rounded-lg p-1" data-testid="billing-toggle">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="button-monthly"
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  billingCycle === "annual"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="button-annual"
              >
                Annual
                <Badge variant="secondary" className="text-xs bg-success/20 text-success border-0">
                  Save ${annualSavings}
                </Badge>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {/* Free Tier */}
            <Card className="relative transition-all border">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-primary">Free</CardTitle>
                <CardDescription>Get started with basic features</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">$0</span>
                  <span className="text-muted-foreground ml-2">/forever</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    2 automated deal analyses/month
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    2 wholesale calcs/month
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    2 ARV calcs/month
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    2 comp reports/month
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    2 automated deal analyses/month
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Unlimited manual deal analysis
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Lender search tool access
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Full toolbox access
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                {isAuthenticated ? (
                  <Link href="/deal-analysis" className="w-full">
                    <Button className="w-full" variant="outline" data-testid="button-start-free">
                      Start Analyzing
                    </Button>
                  </Link>
                ) : (
                  <Link href="/register" className="w-full">
                    <Button className="w-full" variant="outline" data-testid="button-signup-free">
                      Get Started
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>

            {/* Monthly */}
            <Card className={`relative transition-all ${billingCycle === "monthly" ? "border-2 border-accent shadow-lg" : "border"}`}>
              {billingCycle === "monthly" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground px-4 py-1">
                    Selected
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-primary">Monthly</CardTitle>
                <CardDescription>Full access, cancel anytime</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">${monthlyPrice}</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
              </CardHeader>
              <div className="relative">
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Unlimited property lookups
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Unlimited wholesale calcs
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Unlimited ARV calculations
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Unlimited comp reports
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Full lender comparisons
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Save unlimited deals
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Priority support
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={isAuthenticated ? "/portal/upgrade" : "/checkout?plan=monthly"}>
                    <Button 
                      className={`w-full ${billingCycle === "monthly" ? "bg-accent text-accent-foreground" : ""}`}
                      variant={billingCycle === "monthly" ? "default" : "outline"}
                      data-testid="button-get-started-monthly"
                    >
                      {isAuthenticated ? "Upgrade Now" : "Get Started"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardFooter>
              </div>
            </Card>

            {/* Annual */}
            <Card className={`relative transition-all ${billingCycle === "annual" ? "border-2 border-accent shadow-lg" : "border"}`}>
              {billingCycle === "annual" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground px-4 py-1">
                    <Star className="h-3 w-3 mr-1 inline" />
                    Best Value
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-primary">Annual</CardTitle>
                <CardDescription>Save ${annualSavings}/year</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">${annualPrice}</span>
                  <span className="text-muted-foreground ml-2">/year</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Just ${annualMonthlyEquivalent}/month
                </p>
              </CardHeader>
              <div className="relative">
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Everything in Monthly
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      2 months free
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success" />
                      Lock in your rate
                    </li>
                  </ul>

                  <div className="rounded-md border border-accent/50 bg-accent/10 p-3 space-y-2" data-testid="promo-banner-freemonth">
                    <div className="flex items-start gap-2">
                      <Tag className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground leading-snug">
                        <span className="font-semibold text-accent">Limited time offer:</span> Get an additional month free. Pay for 9 months, get 12.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-background/60 rounded px-2 py-1.5">
                      <span className="text-xs font-mono font-bold text-foreground tracking-widest">FREEMONTH</span>
                      <button
                        onClick={copyPromoCode}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="button-copy-promo-code"
                      >
                        {codeCopied ? (
                          <><CheckCheck className="h-3.5 w-3.5 text-success" /><span className="text-success">Copied</span></>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={isAuthenticated ? "/portal/upgrade?plan=annual&code=FREEMONTH" : "/checkout?plan=annual&code=FREEMONTH"} className="w-full">
                    <Button 
                      className={`w-full ${billingCycle === "annual" ? "bg-accent text-accent-foreground" : ""}`}
                      variant={billingCycle === "annual" ? "default" : "outline"}
                      data-testid="button-get-started-annual"
                    >
                      {isAuthenticated ? "Upgrade Now" : "Get Started"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardFooter>
              </div>
            </Card>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-primary text-center mb-8" data-testid="text-features-title">
              Feature Comparison
            </h2>
            <Card className="overflow-hidden max-w-3xl mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-feature-comparison">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="text-left px-6 py-4 font-semibold">Feature</th>
                      <th className="text-center px-6 py-4 font-semibold">Free</th>
                      <th className="text-center px-6 py-4 font-semibold">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparison.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="px-6 py-4 text-foreground font-medium">{row.feature}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-sm ${row.free === "No" ? "text-muted-foreground" : "text-foreground"}`}>
                            {row.free}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-success font-medium">{row.paid}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
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

          <section className="mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-primary mb-6">What You Get with RE Data Metrix</h2>

            <h3 className="text-xl font-semibold text-primary mb-2">Advanced Deal Analysis Tools</h3>
            <p className="text-muted-foreground mb-6">
              Analyze deals with detailed financial modeling, including ROI, cash on cash return, and full profitability breakdowns.
            </p>

            <h3 className="text-xl font-semibold text-primary mb-2">Lender Comparison and Funding Access</h3>
            <p className="text-muted-foreground mb-6">
              Compare loan options and connect directly with lenders who can fund your deals based on your criteria.
            </p>

            <h3 className="text-xl font-semibold text-primary mb-2">Scalable Tools for Growing Investors</h3>
            <p className="text-muted-foreground mb-6">
              From manual deal analysis to automated workflows and saved reports, our platform grows with your investment business.
            </p>

            <p className="text-muted-foreground">
              Want to see how it works? Try our <a href="/deal-analysis" className="text-primary hover:underline">deal analysis tool</a> or explore <a href="/lenders" className="text-primary hover:underline">real estate investment lenders</a> to start funding your deals.
            </p>
          </section>

          <div className="bg-primary rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-primary-foreground mb-4">
              Ready to Transform Your Deal Analysis?
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
              Create your free account today and start analyzing deals, comparing lenders, and making smarter investment decisions.
            </p>
            {isSubscriber ? (
              <Link href="/portal/dashboard">
                <Button size="lg" className="bg-accent text-accent-foreground" data-testid="button-cta-dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="lg" className="bg-accent text-accent-foreground" data-testid="button-cta-register">
                  Get Started Free
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
