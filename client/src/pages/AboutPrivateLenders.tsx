import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Users, TrendingUp, Clock, Shield, Zap, DollarSign, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";

const referralPlatforms = [
  {
    name: "Private Lender Link",
    url: "https://placeholder-link.com/private-lender-link",
    description: "Connect with verified private lenders nationwide",
  },
  {
    name: "PeerStreet",
    url: "https://placeholder-link.com/peerstreet",
    description: "Real estate debt investing platform",
  },
  {
    name: "Sharestates",
    url: "https://placeholder-link.com/sharestates",
    description: "Institutional-grade private lending marketplace",
  },
  {
    name: "BiggerPockets",
    url: "https://placeholder-link.com/biggerpockets",
    description: "Real estate investing community and resources",
  },
];

const lenderSources = [
  {
    icon: Users,
    title: "Local Real Estate Networks",
    items: [
      "Local real estate investor meetings, seminars, and conferences are excellent for face-to-face networking with private lenders and other experienced investors.",
      "Self-directed retirement account classes and seminars often attract investors eager to lend out of IRAs or 401(k)s, providing a unique source of private capital.",
      "Real Estate Investment Associations (REIAs), both local and regional, regularly facilitate introductions to active private lenders and provide a platform for sharing recommendations.",
    ],
  },
  {
    icon: TrendingUp,
    title: "Professional Referrals & Direct Research",
    items: [
      "Referrals from real estate professionals such as agents, mortgage brokers, closing attorneys, or title company representatives, who often have insight into recent deals funded by private lenders.",
      "Word-of-mouth and direct networking at property tours, open houses, and local investor gatherings.",
      "Direct research using public property records and recent transaction data to find private lenders who have funded local projects.",
    ],
  },
  {
    icon: Clock,
    title: "Online Platforms & Communities",
    items: [
      "Social media groups and pages focused on real estate investing—especially on LinkedIn and Facebook—where private lenders frequently market their services and post testimonials.",
      "Local classifieds, community boards, and online marketplaces may include advertising for individual private lenders looking to fund deals.",
      "Online educational events or webinars specific to private real estate lending, portfolio lending, or hard money loans, which often include networking segments or sponsor introductions.",
    ],
  },
];

export default function AboutPrivateLenders() {
  return (
    <Layout>
      <SEO
        title="About Private Lenders"
        description="Learn how to find and work with private lenders for real estate investing. Discover sources for private capital including local networks, referrals, and online platforms — and how RE Data Metrix connects you to vetted lenders."
        keywords="private lenders, private lending, private money, real estate private lender, hard money alternative, private capital, lender networks, investor funding"
        canonicalUrl="https://redatametrix.com/about-private-lenders"
      />
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              About Private Lenders
            </h1>
            <div className="h-1 w-24 bg-accent mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Many private lender/investor relationships can be truly personal. Investors seeking private lenders for real estate projects have more options than ever thanks to technology and growing networks within the real estate community.
            </p>
          </div>

          {/* Hero Card */}
          <Card className="p-8 mb-12 bg-primary text-primary-foreground">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold mb-4">Why Choose Private Lending?</h2>
              <p className="text-lg text-primary-foreground/90 mb-6">
                Private lenders have revolutionized real estate investing by providing capital when 
                traditional banks say no. Whether you're flipping houses, building a rental portfolio, 
                or pursuing creative investment strategies, private lenders offer the speed and flexibility 
                you need to succeed.
              </p>
              <Link href="/lenders">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20"
                  data-testid="button-find-lenders"
                >
                  Find Private Lenders
                </Button>
              </Link>
            </div>
          </Card>

          {/* Key Benefits */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary mb-8">Key Benefits of Private Lending</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">Fast Funding</h3>
                <p className="text-muted-foreground">
                  Close in 7-14 days instead of 30-45 days. Perfect for competitive markets 
                  where speed matters.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">Flexible Terms</h3>
                <p className="text-muted-foreground">
                  Negotiate custom loan structures that fit your deal. Interest-only payments, 
                  deferred points, and more.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">Credit Flexibility</h3>
                <p className="text-muted-foreground">
                  Focus on the deal quality and property value, not perfect credit scores 
                  or W-2 income.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">Rehab Funding</h3>
                <p className="text-muted-foreground">
                  Include renovation costs in the loan. Draw funds as work is completed 
                  for fix-and-flip projects.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">Relationship-Based</h3>
                <p className="text-muted-foreground">
                  Build long-term partnerships. Experienced investors often get better 
                  terms and faster approvals.
                </p>
              </Card>

              <Card className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">Creative Structures</h3>
                <p className="text-muted-foreground">
                  Access unique financing options like cross-collateralization, blanket loans, 
                  and portfolio financing.
                </p>
              </Card>
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary mb-8">How Private Lending Works</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Find the Right Lender</h3>
                    <p className="text-muted-foreground">
                      Search our network of private lenders based on your deal criteria: loan type, 
                      property location, credit score requirements, and funding speed.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Submit Your Deal</h3>
                    <p className="text-muted-foreground">
                      Provide property details, purchase price, ARV, and your experience level. 
                      Most lenders respond within 24-48 hours.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Get Your Term Sheet</h3>
                    <p className="text-muted-foreground">
                      Review the loan terms: interest rate, points, LTV ratios, fees, and closing timeline. 
                      Negotiate if needed.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Close & Execute</h3>
                    <p className="text-muted-foreground">
                      Complete paperwork, schedule appraisal if required, and close your loan. 
                      Most deals close in 7-14 days.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Online Private Lender Directories */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary mb-8">
              Online Private Lender Directories and Search Platforms
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {referralPlatforms.map((platform, index) => (
                <Card key={index} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground flex-1">
                      {platform.description}
                    </p>
                    <a 
                      href={platform.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button 
                        variant="outline" 
                        className="w-full"
                        data-testid={`button-platform-${platform.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        Visit {platform.name}
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Where to Find Private Lenders */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary mb-8">
              Where to Find Private Lenders
            </h2>
            <div className="space-y-6">
              {lenderSources.map((source, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <source.icon className="h-5 w-5 text-primary" />
                      {source.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {source.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex gap-3">
                          <span className="text-primary mt-1 flex-shrink-0">•</span>
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Best Practices Section */}
          <div className="mb-16">
            <Card className="bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Exploring and engaging through these channels can help investors secure funding, compare lender options, and build lasting professional relationships for future deals.
                </p>
                <p className="font-medium text-foreground">
                  Always vet any lender's reputation, terms, and testimonials before proceeding.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Types of Private Lenders */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary mb-8">Types of Private Lenders</h2>
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-primary mb-3">Hard Money Lenders</h3>
                <p className="text-muted-foreground mb-4">
                  Specialize in short-term, asset-based loans for fix-and-flip projects. Fast funding 
                  (7-14 days), higher interest rates (9-15%), and 6-24 month terms. Best for experienced 
                  investors who need speed and can manage higher costs.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Fix & Flip</span>
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Fast Closing</span>
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Rehab Funding</span>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold text-primary mb-3">DSCR Lenders</h3>
                <p className="text-muted-foreground mb-4">
                  Offer 30-year rental property loans based on property cash flow instead of personal income. 
                  No tax returns or W-2s required. Ideal for self-employed investors or those building 
                  large rental portfolios. Close in LLCs.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Buy & Hold</span>
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">No Income Verification</span>
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Portfolio Building</span>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold text-primary mb-3">Bridge Lenders</h3>
                <p className="text-muted-foreground mb-4">
                  Provide temporary financing while you secure permanent financing or complete value-add 
                  renovations. 12-36 month terms with refinance or sale exit strategy. Good for transitional 
                  properties or when timing matters.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Short Term</span>
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Value-Add</span>
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Refinance Exit</span>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold text-primary mb-3">Portfolio Lenders</h3>
                <p className="text-muted-foreground mb-4">
                  Keep loans on their own books instead of selling to Fannie/Freddie. Offer flexible 
                  underwriting for unique properties, multiple units, or non-conforming situations. 
                  Relationship-focused with custom terms.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Flexible Terms</span>
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Unique Properties</span>
                  <span className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full">Multi-Unit</span>
                </div>
              </Card>
            </div>
          </div>

          {/* Common Terms Explained */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary mb-8">Common Private Lending Terms</h2>
            <Card className="p-8">
              <dl className="space-y-6">
                <div>
                  <dt className="font-semibold text-primary mb-2">Points</dt>
                  <dd className="text-muted-foreground">
                    Upfront fees charged by the lender, typically 2-5% of the loan amount. One point = 1% of loan. 
                    Some lenders offer "deferred points" that are paid at loan payoff instead of upfront.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-primary mb-2">LTV (Loan-to-Value)</dt>
                  <dd className="text-muted-foreground">
                    The loan amount divided by the property's value. For example, 75% LTV means the lender 
                    will loan up to 75% of the purchase price, and you provide 25% down payment.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-primary mb-2">ARV (After Repair Value)</dt>
                  <dd className="text-muted-foreground">
                    The estimated value of a property after renovations are complete. Hard money lenders 
                    often lend based on ARV rather than purchase price for fix-and-flip deals.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-primary mb-2">Interest-Deferred</dt>
                  <dd className="text-muted-foreground">
                    Interest accrues but isn't paid monthly. Instead, all accrued interest is paid at loan 
                    payoff. This minimizes monthly payments during the flip or rehab period.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-primary mb-2">Draw Schedule</dt>
                  <dd className="text-muted-foreground">
                    For rehab loans, funds are released in stages as work is completed. Common structure: 
                    purchase at closing, then 3-4 draws during renovation based on inspection milestones.
                  </dd>
                </div>
                <div>
                  <dt className="font_semibold text-primary mb-2">Exit Strategy</dt>
                  <dd className="text-muted-foreground">
                    Your plan to repay the loan. Common exit strategies: sale of property (flip), refinance 
                    into permanent financing (BRRRR), or cash-out from another source.
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          {/* Who Should Use Private Lenders */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary mb-8">Who Should Use Private Lenders?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Great Fit For
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">Fix-and-flip investors who need fast funding</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">Self-employed investors with complex tax returns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">Investors buying rental properties in LLCs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">Experienced investors with proven track records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">Buyers in competitive markets needing cash offers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">Properties that don't qualify for conventional loans</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  Consider Conventional If
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">You have 680+ credit and W-2 income to verify</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">You're buying a primary residence or long-term rental</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">Closing timeline isn't urgent (30-45 days is fine)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">You want the lowest possible interest rate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">Property is move-in ready (no major rehab needed)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-muted-foreground">You prefer 30-year fixed rate stability</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <Card className="p-8 bg-accent/5">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-primary mb-4">
                Ready to Connect with Private Lenders?
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Browse our network of verified private lenders specializing in real estate investment financing. 
                Filter by loan type, location, and deal criteria to find the perfect match for your next project.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link href="/lenders">
                  <Button size="lg" data-testid="button-search-lenders">
                    Search Lenders
                  </Button>
                </Link>
                <Link href="/deal-analysis">
                  <Button variant="outline" size="lg" data-testid="button-analyze-deal">
                    Analyze Your Deal
                  </Button>
                </Link>
                <Link href="/loan-types">
                  <Button variant="outline" size="lg" data-testid="button-view-loan-types">
                    View All Loan Types
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
