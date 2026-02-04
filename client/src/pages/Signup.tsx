import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, ArrowRight, Zap, User } from "lucide-react";

const featureComparison = [
  { feature: "Property Lookups (Zillow/Redfin)", free: "2 per month", paid: "Unlimited", freeHas: true, paidBetter: true },
  { feature: "Wholesale Calculator", free: "2 per month", paid: "Unlimited", freeHas: true, paidBetter: true },
  { feature: "Deal Analysis Wizard", free: "Manual entry", paid: "Full automation", freeHas: true, paidBetter: true },
  { feature: "Lender Loan Comparisons", free: "First 2 lookups", paid: "Unlimited", freeHas: true, paidBetter: true },
  { feature: "Rental/DSCR Analysis", free: "Manual entry", paid: "Full access", freeHas: true, paidBetter: true },
  { feature: "Lender Search Tool", free: "Yes", paid: "Yes", freeHas: true, paidBetter: false },
  { feature: "State-Specific Calculations", free: "No", paid: "Yes", freeHas: false, paidBetter: true },
  { feature: "Save Deals", free: "No", paid: "Unlimited", freeHas: false, paidBetter: true },
  { feature: "Save Lenders", free: "No", paid: "Unlimited", freeHas: false, paidBetter: true },
  { feature: "Toolbox Resources", free: "Yes", paid: "Yes", freeHas: true, paidBetter: false },
  { feature: "Export Reports (PDF & CSV)", free: "No", paid: "Yes", freeHas: false, paidBetter: true },
  { feature: "Email Support", free: "Standard", paid: "Priority", freeHas: true, paidBetter: true },
];

const MONTHLY_PRICE = 25;
const ANNUAL_PRICE = 250;
const ANNUAL_SAVINGS = (MONTHLY_PRICE * 12) - ANNUAL_PRICE;

export default function Signup() {
  const { isAuthenticated, isSubscriber, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  
  // Get returnTo from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const returnTo = urlParams.get("returnTo");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (isSubscriber) {
        setLocation(returnTo || "/portal/dashboard");
      } else {
        setLocation("/upgrade");
      }
    }
  }, [isLoading, isAuthenticated, isSubscriber, setLocation, returnTo]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center gap-2 bg-accent/10 text-accent rounded-full px-4 py-1.5 mb-4">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Choose Your Plan</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-3" data-testid="text-signup-title">
              Start Your Real Estate Investment Journey
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your investing needs. Try free with limited features, or go Premium for full access.
            </p>
          </div>

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
                  Save ${ANNUAL_SAVINGS}
                </Badge>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card className="relative border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-xl text-primary">Free Account</CardTitle>
                </div>
                <CardDescription>Get started at no cost</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">$0</span>
                  <span className="text-muted-foreground ml-2">/forever</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    2 property lookups/month
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    2 wholesale calcs/month
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Manual deal analysis
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Lender search access
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="h-4 w-4 text-muted-foreground" />
                    Cannot save deals
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="h-4 w-4 text-muted-foreground" />
                    No PDF/CSV export
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={`/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="w-full">
                  <Button className="w-full" variant="outline" data-testid="button-signup-free">
                    Continue with Free
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="relative border-2 border-accent shadow-lg">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground px-4 py-1">
                  <Star className="h-3 w-3 mr-1 inline" />
                  Recommended
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-primary">
                  Premium {billingCycle === "monthly" ? "Monthly" : "Annual"}
                </CardTitle>
                <CardDescription>
                  {billingCycle === "annual" ? `Save $${ANNUAL_SAVINGS}/year` : "Full access, cancel anytime"}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">
                    ${billingCycle === "monthly" ? MONTHLY_PRICE : ANNUAL_PRICE}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    /{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>
                {billingCycle === "annual" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Just ${(ANNUAL_PRICE / 12).toFixed(2)}/month
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    <strong>Unlimited</strong> property lookups
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    <strong>Unlimited</strong> wholesale calcs
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Full lender comparisons
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Save <strong>unlimited</strong> deals
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    PDF & CSV export
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success" />
                    Priority support
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={`/register?plan=${billingCycle}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="w-full">
                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-signup-premium">
                    Sign Up for Premium
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <Card className="overflow-hidden mb-10">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle className="text-lg">Full Feature Comparison</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-feature-comparison">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-6 py-3 font-semibold text-foreground">Feature</th>
                    <th className="text-center px-6 py-3 font-semibold text-foreground">Free</th>
                    <th className="text-center px-6 py-3 font-semibold text-foreground">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="px-6 py-3 text-foreground">{row.feature}</td>
                      <td className="px-6 py-3 text-center">
                        {row.freeHas ? (
                          <span className={`text-sm ${row.paidBetter ? "text-muted-foreground" : "text-foreground"}`}>
                            {row.free}
                          </span>
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="text-sm text-success font-medium">{row.paid}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Questions? Check our <Link href="/faq" className="text-primary hover:underline">FAQ</Link> or{" "}
              <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
