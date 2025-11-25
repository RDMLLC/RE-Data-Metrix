import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, TrendingUp, DollarSign, Clock, Users, Zap } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MembershipPaywall from "@/components/MembershipPaywall";

interface LoanType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  typicalTerms: {
    interestRate: string;
    loanTerm: string;
    downPayment: string;
    closingTime: string;
  };
}

const loanTypes: LoanType[] = [
  {
    id: "hard-money",
    name: "Hard Money / Bridge",
    icon: <Clock className="h-8 w-8 text-accent" />,
    description: "Short-term loans from private lenders secured by real estate. These are asset-based loans focused on the property's value (ARV) rather than the borrower's creditworthiness. Ideal for fix-and-flip projects.",
    bestFor: [
      "Fix-and-flip investors",
      "Projects requiring fast closing",
      "Borrowers with credit challenges",
      "Properties that need significant renovation",
      "Experienced investors who can manage rehab projects"
    ],
    pros: [
      "Very fast approval and funding (7-14 days)",
      "Flexible terms negotiated with lender",
      "Can include rehab costs in the loan",
      "Credit score less important than deal quality",
      "Interest-only payments during rehab",
      "Option to defer points until sale"
    ],
    cons: [
      "High interest rates (9-15%)",
      "Significant upfront costs (2-5 points)",
      "Short loan terms (6-24 months)",
      "Requires solid exit strategy",
      "Monthly payments can be high if not interest-deferred"
    ],
    typicalTerms: {
      interestRate: "9.0% - 15.0%",
      loanTerm: "6-24 months",
      downPayment: "10% - 25%",
      closingTime: "7-14 days"
    }
  },
  {
    id: "dscr",
    name: "DSCR (Debt Service Coverage Ratio)",
    icon: <TrendingUp className="h-8 w-8 text-accent" />,
    description: "Investment property loans that qualify based on the property's rental income rather than the borrower's personal income. DSCR measures whether the property generates enough income to cover the debt payments.",
    bestFor: [
      "Self-employed investors with complex tax returns",
      "Investors with multiple properties",
      "Properties with strong rental income potential",
      "Borrowers who don't want to verify personal income"
    ],
    pros: [
      "No personal income verification required",
      "Qualify based on property cash flow",
      "Can close in your business entity (LLC)",
      "Great for building a rental portfolio",
      "Faster approval than conventional loans"
    ],
    cons: [
      "Higher interest rates (typically 1-2% above conventional)",
      "Larger down payment required (20-25%)",
      "Property must generate sufficient rental income",
      "Not available for primary residences"
    ],
    typicalTerms: {
      interestRate: "7.5% - 10.0%",
      loanTerm: "30 years (fixed or ARM)",
      downPayment: "20% - 25%",
      closingTime: "21-30 days"
    }
  },
  {
    id: "transactional",
    name: "Transactional Funding",
    icon: <Zap className="h-8 w-8 text-accent" />,
    description: "Ultra-short-term financing for same-day or back-to-back closings. Provides 100% financing for wholesale deals where you buy and immediately resell a property. Note: Transactional Funding is almost exclusively for wholesale deals, although some lenders can help if your loan will take just one or two days longer than needed.",
    bestFor: [
      "Wholesale real estate transactions",
      "Back-to-back (double) closings",
      "Investors without capital for traditional purchases",
      "Quick-turn deals with immediate buyers",
      "Wholesalers who need proof of funds"
    ],
    pros: [
      "100% financing for purchase price and closing costs",
      "Extremely fast closings (same day to a few days)",
      "No credit checks or income verification required",
      "Minimal financial exposure (short loan duration)",
      "Provides proof of funds to secure deals",
      "No appraisals, insurance, or full title reports needed"
    ],
    cons: [
      "Only suitable for wholesale/double closing strategies",
      "Requires confirmed end buyer before funding",
      "High fees (typically 1-2% of loan amount per day or flat fee)",
      "Very short-term only (usually 24-72 hours)",
      "Limited to experienced wholesalers",
      "Not available for traditional buy-and-hold strategies"
    ],
    typicalTerms: {
      interestRate: "Flat fees typically $1,500-$3,000 or 1-2% per day",
      loanTerm: "1-3 days (sometimes up to 7 days)",
      downPayment: "0% (100% financing)",
      closingTime: "Same day to 3 days"
    }
  },
  {
    id: "private-seller",
    name: "Private/Seller Financing",
    icon: <Users className="h-8 w-8 text-accent" />,
    description: "Financing directly from the property seller or a private individual investor, bypassing traditional financial institutions. These creative arrangements offer flexible terms customized to both parties' needs.",
    bestFor: [
      "Buyers who can't qualify for traditional financing",
      "Properties that don't meet conventional lending standards",
      "Sellers wanting to generate ongoing income",
      "Creative deal structures and negotiations",
      "Building relationships with private capital sources"
    ],
    pros: [
      "Extremely flexible terms and structures",
      "Faster closings with less paperwork",
      "Can work around credit issues",
      "Negotiable interest rates and down payments",
      "Often includes mentorship opportunities",
      "Can structure profit-sharing or equity partnerships"
    ],
    cons: [
      "Requires finding willing sellers or private lenders",
      "Terms vary widely by individual",
      "May require larger down payment than expected",
      "Interest rates can be higher than conventional",
      "Due diligence is critical for both parties",
      "Limited legal protections compared to institutional lending"
    ],
    typicalTerms: {
      interestRate: "6.0% - 12.0% (negotiable)",
      loanTerm: "5-30 years (negotiable)",
      downPayment: "10% - 30% (negotiable)",
      closingTime: "7-30 days"
    }
  },
  {
    id: "portfolio",
    name: "Portfolio / Blanket",
    icon: <DollarSign className="h-8 w-8 text-accent" />,
    description: "Loans kept by the originating lender rather than sold on the secondary market. This allows lenders to create flexible terms outside of conventional guidelines. Blanket loans cover multiple properties under one loan, ideal for portfolio investors.",
    bestFor: [
      "Unique or non-conforming properties",
      "Borrowers who don't meet conventional guidelines",
      "Mixed-use properties",
      "Large multi-unit buildings (5+ units)",
      "Investors with multiple properties"
    ],
    pros: [
      "Flexible underwriting guidelines",
      "Can accommodate unique property types",
      "May allow higher debt-to-income ratios",
      "Relationship-based lending",
      "Can be customized to specific situations"
    ],
    cons: [
      "Higher interest rates than conventional",
      "Larger down payment requirements",
      "Fees can be higher",
      "Availability varies by lender",
      "Terms may be less favorable than conventional"
    ],
    typicalTerms: {
      interestRate: "7.0% - 10.0%",
      loanTerm: "15-30 years",
      downPayment: "20% - 30%",
      closingTime: "30-45 days"
    }
  },
  {
    id: "interest-only",
    name: "Interest-Only",
    icon: <DollarSign className="h-8 w-8 text-accent" />,
    description: "Loans where you only pay interest for an initial period (typically 5-10 years), with no principal reduction. After the interest-only period ends, payments increase significantly to pay off principal over the remaining term.",
    bestFor: [
      "Fix-and-flip investors during rehab",
      "Borrowers with irregular income",
      "Properties expected to appreciate significantly",
      "Investors maximizing cash flow during holding period",
      "Borrowers planning to sell before principal payments begin"
    ],
    pros: [
      "Much lower initial monthly payments",
      "Maximizes cash flow during interest-only period",
      "Frees up capital for other investments",
      "Useful for short-term holds",
      "Can improve debt-to-income ratios for qualification"
    ],
    cons: [
      "No equity build-up during interest-only period",
      "Payment shock when principal payments begin",
      "Higher total interest paid over life of loan",
      "Must have solid exit strategy",
      "Risk if property doesn't appreciate as expected"
    ],
    typicalTerms: {
      interestRate: "7.0% - 11.0%",
      loanTerm: "10-30 years (5-10 year I/O period)",
      downPayment: "20% - 30%",
      closingTime: "14-30 days"
    }
  },
  {
    id: "balloon",
    name: "Balloon",
    icon: <Clock className="h-8 w-8 text-accent" />,
    description: "Loans with regular monthly payments based on a long amortization schedule, but the entire remaining balance becomes due at a specified date (typically 5-7 years). Popular with commercial properties and seller financing.",
    bestFor: [
      "Short-term investment strategies",
      "Borrowers planning to refinance",
      "Commercial property investors",
      "Seller-financed deals",
      "Borrowers expecting significant income increase"
    ],
    pros: [
      "Lower monthly payments",
      "Can offer competitive interest rates",
      "Easier qualification than conventional",
      "Good for properties you plan to sell or refinance",
      "Flexible terms with private lenders"
    ],
    cons: [
      "Large lump sum payment required at maturity",
      "Must have exit strategy (sale or refinance)",
      "Risk if property value declines",
      "Refinancing not guaranteed",
      "Can be difficult to budget for balloon payment"
    ],
    typicalTerms: {
      interestRate: "6.5% - 9.0%",
      loanTerm: "5-7 years (amortized over 30)",
      downPayment: "20% - 30%",
      closingTime: "21-45 days"
    }
  },
  {
    id: "arm",
    name: "5/1 ARM (Adjustable Rate Mortgage)",
    icon: <TrendingUp className="h-8 w-8 text-accent" />,
    description: "Mortgages with interest rates that adjust periodically based on market conditions. ARMs typically start with a lower fixed rate for an initial period (3, 5, 7, or 10 years) before adjusting annually.",
    bestFor: [
      "Borrowers planning to sell before adjustment period",
      "Investors expecting income to increase",
      "Properties to be refinanced or sold within 5-7 years",
      "Borrowers comfortable with rate fluctuation risk"
    ],
    pros: [
      "Lower initial interest rates",
      "Lower initial monthly payments",
      "Can qualify for larger loan amounts",
      "Rate caps limit how much rates can increase",
      "Good for short-term ownership strategies"
    ],
    cons: [
      "Payment uncertainty after initial period",
      "Rates and payments can increase significantly",
      "More complex to understand",
      "Harder to budget for long-term",
      "Risk if unable to refinance when rates adjust"
    ],
    typicalTerms: {
      interestRate: "5.5% - 7.5% (initial)",
      loanTerm: "30 years (5/1, 7/1, 10/1 ARM)",
      downPayment: "15% - 25%",
      closingTime: "30-45 days"
    }
  },
  {
    id: "conventional",
    name: "Conventional",
    icon: <DollarSign className="h-8 w-8 text-accent" />,
    description: "Traditional mortgages offered by banks and credit unions that follow Fannie Mae and Freddie Mac guidelines. These loans typically require good credit and stable income verification.",
    bestFor: [
      "Borrowers with strong credit (680+ score)",
      "Traditional W-2 income earners",
      "Long-term buy-and-hold investors",
      "Owner-occupied or rental properties"
    ],
    pros: [
      "Lower interest rates compared to alternative financing",
      "Longer repayment terms (15-30 years)",
      "Predictable monthly payments with fixed rates",
      "Can be used for primary residence or investment properties"
    ],
    cons: [
      "Strict income and credit requirements",
      "Extensive documentation needed",
      "Longer approval and closing process (30-45 days)",
      "May require 20% down payment to avoid PMI on investment properties"
    ],
    typicalTerms: {
      interestRate: "6.0% - 8.0%",
      loanTerm: "15-30 years",
      downPayment: "15% - 25%",
      closingTime: "30-45 days"
    }
  },
  {
    id: "fha-va",
    name: "FHA/VA",
    icon: <Users className="h-8 w-8 text-accent" />,
    description: "Government-backed loans designed to help first-time homebuyers and veterans. FHA loans require lower down payments and credit scores, while VA loans offer zero down payment options for qualified veterans.",
    bestFor: [
      "First-time homebuyers",
      "Veterans and active military (VA)",
      "Buyers with limited down payment funds",
      "Borrowers with credit scores in the 580-680 range",
      "Owner-occupied properties only"
    ],
    pros: [
      "Low down payment requirements (3.5% FHA, 0% VA)",
      "More lenient credit requirements",
      "Competitive interest rates",
      "VA loans have no monthly mortgage insurance",
      "Can be assumed by future buyers"
    ],
    cons: [
      "Only for owner-occupied properties (not investment)",
      "FHA requires mortgage insurance (MIP)",
      "Property must meet strict condition standards",
      "Loan limits vary by county",
      "VA loans require funding fee (unless disabled)"
    ],
    typicalTerms: {
      interestRate: "6.0% - 7.5%",
      loanTerm: "15-30 years",
      downPayment: "0% - 3.5%",
      closingTime: "30-45 days"
    }
  }
];

export default function LoanTypes() {
  const { isSubscriber, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isSubscriber) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
                Real Estate Loan Types Explained
              </h1>
              <div className="h-1 w-24 bg-accent mb-6"></div>
              <p className="text-lg text-muted-foreground max-w-3xl">
                Understanding different loan types is crucial for successful real estate investing.
              </p>
            </div>
            <MembershipPaywall 
              title="Loan Type Education"
              description="Access detailed information about hard money, DSCR, transactional funding, and more loan types by becoming a member."
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              Real Estate Loan Types Explained
            </h1>
            <div className="h-1 w-24 bg-accent mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Understanding different loan types is crucial for successful real estate investing. 
              Each loan product serves different investment strategies and borrower profiles. 
              Choose the right financing to maximize your returns and minimize risk.
            </p>
          </div>

          {/* CTA Banner */}
          <Card className="p-6 mb-12 bg-primary text-primary-foreground">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">Ready to analyze your deal?</h2>
                <p className="text-primary-foreground/90">
                  Use our Deal Analysis wizard to compare loan options and find the best financing for your investment.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link href="/deal-analysis">
                  <Button
                    variant="outline"
                    className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20"
                    data-testid="button-deal-analysis"
                  >
                    Start Deal Analysis
                  </Button>
                </Link>
                <Link href="/lenders">
                  <Button
                    variant="outline"
                    className="bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20"
                    data-testid="button-find-lenders"
                  >
                    Find Lenders
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Loan Types */}
          <div className="space-y-8">
            {loanTypes.map((loanType, index) => (
              <Card key={loanType.id} className="p-8" data-testid={`card-loan-type-${loanType.id}`}>
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {loanType.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-primary mb-2">{loanType.name}</h2>
                    <p className="text-muted-foreground">{loanType.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                  {/* Best For */}
                  <div>
                    <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-accent" />
                      Best For
                    </h3>
                    <ul className="space-y-2">
                      {loanType.bestFor.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-accent mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Typical Terms */}
                  <div>
                    <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-accent" />
                      Typical Terms
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Interest Rate:</dt>
                        <dd className="font-medium text-foreground">{loanType.typicalTerms.interestRate}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Loan Term:</dt>
                        <dd className="font-medium text-foreground">{loanType.typicalTerms.loanTerm}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Down Payment:</dt>
                        <dd className="font-medium text-foreground">{loanType.typicalTerms.downPayment}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Closing Time:</dt>
                        <dd className="font-medium text-foreground">{loanType.typicalTerms.closingTime}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Pros */}
                  <div>
                    <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      Advantages
                    </h3>
                    <ul className="space-y-2">
                      {loanType.pros.map((pro, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div>
                    <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-destructive" />
                      Considerations
                    </h3>
                    <ul className="space-y-2">
                      {loanType.cons.map((con, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Find Lenders Button */}
                <div className="mt-6 pt-6 border-t">
                  <Link href="/lenders">
                    <Button 
                      size="lg" 
                      className="w-full md:w-auto"
                      data-testid={`button-find-lenders-${loanType.id}`}
                    >
                      Find {loanType.name} Lenders
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
            
            {/* Private Lenders Section */}
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5" data-testid="card-private-lenders">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-primary mb-2">Private Lenders & Creative Financing</h2>
                  <p className="text-muted-foreground">
                    Private money lending comes from individuals or private companies rather than traditional financial institutions. These relationships can offer flexible terms, faster approvals, and creative deal structures that banks simply can't match.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                {/* What is Private Lending */}
                <div>
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    What is Private Lending?
                  </h3>
                  <ul className="space-y-2">
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Funding from individuals, family offices, or private companies</span>
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Relationship-based lending with flexible underwriting</span>
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Ideal for deals that don't fit conventional boxes</span>
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Often includes mentorship and partnership opportunities</span>
                    </li>
                  </ul>
                </div>

                {/* Key Benefits */}
                <div>
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    Key Benefits
                  </h3>
                  <ul className="space-y-2">
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Fast approval and funding (days, not weeks)</span>
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Customizable terms based on the deal</span>
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Credit score may be less important</span>
                    </li>
                    <li className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Creative structures like profit-sharing or equity splits</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Learn More Button */}
              <div className="mt-6 pt-6 border-t">
                <Link href="/about-private-lenders">
                  <Button 
                    size="lg" 
                    variant="default"
                    className="w-full md:w-auto"
                    data-testid="button-learn-more-private-lenders"
                  >
                    Learn More About Private Lending
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Bottom CTA */}
          <Card className="p-8 mt-12 bg-accent/5">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-primary mb-4">
                Need Help Choosing the Right Loan?
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Connect with experienced lenders who specialize in real estate investment financing. 
                Our network includes hard money lenders, DSCR specialists, and conventional lenders.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link href="/lenders">
                  <Button size="lg" data-testid="button-browse-lenders">
                    Browse Lenders
                  </Button>
                </Link>
                <Link href="/about-private-lenders">
                  <Button variant="outline" size="lg" data-testid="button-learn-private-lending">
                    Learn About Private Lending
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
