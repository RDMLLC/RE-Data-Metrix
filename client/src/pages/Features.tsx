import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  TrendingUp, 
  Building2, 
  Users, 
  Briefcase, 
  FileText, 
  ArrowRight,
  Check,
  DollarSign,
  Home,
  Wrench
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const coreFeatures = [
  {
    icon: Calculator,
    title: "Fix & Flip Deal Analysis",
    description: "Comprehensive deal analysis wizard that walks you through every step. Calculate purchase price, rehab costs, holding costs, and potential profit with automatic property data lookup from Zillow and Redfin.",
    highlights: ["Automatic property data lookup", "ROI & profit calculations", "Holding cost estimates", "Side-by-side lender comparisons"]
  },
  {
    icon: TrendingUp,
    title: "DSCR Rental Analysis",
    description: "Evaluate rental properties with Debt Service Coverage Ratio calculations. Compare lender products specifically designed for buy-and-hold investors.",
    highlights: ["DSCR calculations", "Rental income analysis", "Dynamic calculations", "DSCR lender comparisons"]
  },
  {
    icon: DollarSign,
    title: "Wholesale Max Offer Calculator",
    description: "Calculate the maximum offer price for wholesale deals. Supports both Assignment and Double Close transactions with optional transactional lender fees.",
    highlights: ["Instant max offer", "Transactional lender options", "Calculates for Assignment or Double Close", "Quick, easy, and accurate"]
  },
  {
    icon: Users,
    title: "Lender Referral Network",
    description: "Access our curated network of private lenders, hard money lenders, and DSCR lenders. Compare rates, terms, and requirements side-by-side.",
    highlights: ["Pre-vetted lender network", "Side-by-side comparisons", "Direct lender contact", "Save favorite lenders"]
  },
  {
    icon: Wrench,
    title: "Investor Toolbox",
    description: "Access resources to help you manage and grow your real estate investment business. Training videos, calculators, and guides designed for investors.",
    highlights: ["20+ tool categories", "Lead gen & marketing", "Property management", "Comps & analysis", "Rehab estimating", "Legal"]
  }
];

const additionalBenefits = [
  {
    icon: FileText,
    title: "PDF Export",
    description: "Generate professional PDF reports of your deal analysis to share with partners or lenders.",
    badge: "Paid"
  },
  {
    icon: Home,
    title: "Save Unlimited Deals",
    description: "Save your deal analyses and track multiple properties. Access your saved deals anytime.",
    badge: "Paid"
  },
  {
    icon: Building2,
    title: "State-Specific Calculations",
    description: "Dynamic closing cost calculations with state-based transfer tax rates for accurate projections.",
    badge: "Paid"
  },
  {
    icon: Briefcase,
    title: "Priority Support",
    description: "Get faster responses and dedicated support for your investment questions.",
    badge: "Paid"
  },
  {
    icon: TrendingUp,
    title: "Auto-Lookup Property Details",
    description: "Automatically fetch property data from Zillow and Redfin URLs. Save time with instant property information.",
    badge: "Paid"
  },
  {
    icon: FileText,
    title: "CSV Export",
    description: "Export your deal analysis data to spreadsheets for custom analysis and record keeping.",
    badge: "Paid"
  }
];

export default function Features() {
  const { isAuthenticated, isSubscriber } = useAuth();

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] bg-background">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-6" data-testid="text-features-title">
              Everything You Need to Analyze Real Estate Deals
            </h1>
            <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              From quick property lookups to detailed profit analysis, our tools help you make informed investment decisions and connect with the right lenders.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {isAuthenticated ? (
                <Link href="/deal-analysis">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-start-analyzing">
                    Start Analyzing Deals
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-get-started">
                      Get Started Free
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" data-testid="button-view-pricing">
                      View Pricing
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                Core Investment Tools
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful calculators and analysis tools designed specifically for real estate investors
              </p>
            </div>

            <div className="space-y-8">
              {coreFeatures.map((feature, index) => (
                <Card key={index} className="overflow-hidden" data-testid={`card-feature-${index}`}>
                  <div className="md:flex">
                    <div className="md:w-1/3 bg-primary/5 p-8 flex items-center justify-center">
                      <div className="w-20 h-20 bg-accent/20 rounded-xl flex items-center justify-center">
                        <feature.icon className="h-10 w-10 text-accent" />
                      </div>
                    </div>
                    <div className="md:w-2/3 p-8">
                      <CardHeader className="p-0 mb-4">
                        <CardTitle className="text-2xl text-primary">{feature.title}</CardTitle>
                        <CardDescription className="text-base mt-2">{feature.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {feature.highlights.map((highlight, hIndex) => (
                            <li key={hIndex} className="flex items-center gap-2 text-sm text-foreground">
                              <Check className="h-4 w-4 text-success flex-shrink-0" />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Benefits Section */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                Additional Benefits
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                More features to help you succeed in real estate investing
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {additionalBenefits.map((benefit, index) => (
                <Card key={index} className="relative" data-testid={`card-benefit-${index}`}>
                  {benefit.badge && (
                    <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">
                      {benefit.badge}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                    <CardDescription>{benefit.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Free vs Paid Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                Free vs Paid Comparison
              </h2>
              <p className="text-lg text-muted-foreground">
                Start free and upgrade when you're ready for unlimited access
              </p>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-free-vs-paid">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="text-left px-6 py-4 font-semibold">Feature</th>
                      <th className="text-center px-6 py-4 font-semibold">Free</th>
                      <th className="text-center px-6 py-4 font-semibold">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-muted/30">
                      <td className="px-6 py-4 font-medium">Property Lookups</td>
                      <td className="px-6 py-4 text-center">2/month</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">Manual Deal Entry</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Unlimited</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Unlimited</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="px-6 py-4 font-medium">Lender Comparisons</td>
                      <td className="px-6 py-4 text-center">First 2 lookups</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">DSCR Analysis</td>
                      <td className="px-6 py-4 text-center">Manual entry</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Full access</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="px-6 py-4 font-medium">Wholesale Calculator</td>
                      <td className="px-6 py-4 text-center">2/month</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">Lender Search</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Yes</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Yes</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="px-6 py-4 font-medium">Save Deals</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">No</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">PDF Export</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">No</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Yes</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="px-6 py-4 font-medium">Toolbox Resources</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Yes</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Yes</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">CSV Export</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">No</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Yes</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="px-6 py-4 font-medium">State-Specific Calculations</td>
                      <td className="px-6 py-4 text-center text-muted-foreground">No</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Yes</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">Support</td>
                      <td className="px-6 py-4 text-center">Standard</td>
                      <td className="px-6 py-4 text-center text-success font-medium">Priority</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Start Analyzing Deals?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8">
              Create your free account and analyze your first deal in minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {isAuthenticated ? (
                isSubscriber ? (
                  <Link href="/deal-analysis">
                    <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-cta-analyze">
                      Start Analyzing
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/deal-analysis">
                      <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" data-testid="button-cta-try-free">
                        Try Free Features
                      </Button>
                    </Link>
                    <Link href="/pricing">
                      <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-cta-upgrade">
                        Upgrade for Full Access
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </>
                )
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-cta-signup">
                      Create Free Account
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" data-testid="button-cta-pricing">
                      View Pricing
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
