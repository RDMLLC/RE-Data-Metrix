import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import Hero from "@/components/Hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, Wrench, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import { OrganizationSchema, WebApplicationSchema } from "@/components/StructuredData";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const pageFaqs = [
  {
    question: "Is RE Data Metrix free to use?",
    answer: "Yes. The free plan includes unlimited deal analyses via manual entry, 2 automated property lookups per month, and unlimited access to the lender directory. No credit card required."
  },
  {
    question: "What makes RE Data Metrix different from other deal analysis tools?",
    answer: "Most deal analysis tools stop at the numbers. RE Data Metrix combines deal analysis with side-by-side loan comparison and a verified lender directory — so you can analyze a deal and find financing for it in the same place."
  },
  {
    question: "Who is RE Data Metrix built for?",
    answer: "Real estate investors — fix and flip, wholesale, and buy and hold. The platform helps you analyze deals, compare loan options, save your analyses, connect with lenders, and access curated tools to manage and grow your investing business."
  }
];

function PageFAQSection() {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="section-home-faq">
      <h2 className="text-2xl font-bold text-primary mb-6 text-center">
        Frequently Asked Questions
      </h2>
      <Accordion type="single" collapsible className="space-y-2">
        {pageFaqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
            <AccordionTrigger className="text-left font-medium text-foreground" data-testid={`accordion-home-faq-trigger-${i}`}>
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground" data-testid={`accordion-home-faq-content-${i}`}>
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isLender, setIsLender] = useState(false);
  const [lenderChecked, setLenderChecked] = useState(false);

  useEffect(() => {
    async function checkLenderSession() {
      try {
        const token = localStorage.getItem('_sessionToken');
        const response = await fetch("/api/lenders/me", {
          credentials: "include",
          headers: token ? { 'X-Session-Token': token } : {},
        });
        if (response.ok) {
          setIsLender(true);
        }
      } catch (error) {
        // Not a lender
      }
      setLenderChecked(true);
    }

    if (!authLoading && !isAuthenticated) {
      checkLenderSession();
    } else {
      setLenderChecked(true);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !lenderChecked) return;

    if (isLender) {
      setLocation("/lender-dashboard");
      return;
    }

    if (isAuthenticated && user) {
      if (user.role === "admin") {
        setLocation("/admin/dashboard");
      } else {
        // On mobile (< 768px), go directly to Deal Analysis as the core functionality
        const isMobile = window.innerWidth < 768;
        setLocation(isMobile ? "/deal-analysis" : "/portal/dashboard");
      }
    }
  }, [authLoading, lenderChecked, isAuthenticated, isLender, user, setLocation]);

  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": pageFaqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-schema-home";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      const existing = document.getElementById("faq-schema-home");
      if (existing) existing.remove();
    };
  }, []);

  if (authLoading || !lenderChecked) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isAuthenticated || isLender) {
    return null;
  }

  const features = [
    {
      icon: <BarChart3 className="h-8 w-8 text-accent" />,
      title: "Advanced Deal Analysis",
      description: "Profitability analysis that goes beyond standard calculators with comprehensive metrics and insights."
    },
    {
      icon: <Users className="h-8 w-8 text-accent" />,
      title: "Lender Network",
      description: "Connect with verified lenders who understand real estate investment and creative financing."
    },
    {
      icon: <Wrench className="h-8 w-8 text-accent" />,
      title: "Investors Toolbox",
      description: "Our curated partnerships will help you sort through the noise to determine the tools best suited to help you."
    }
  ];

  return (
    <Layout>
      <SEO 
        title="Real Estate Deal Analysis Software"
        description="Analyze real estate deals, compare loan options, and connect with lenders. Built for fix and flip and wholesale investors."
        canonicalUrl="https://redatametrix.com/"
      />
      <OrganizationSchema />
      <WebApplicationSchema />
      <Hero />

      {/* Features Section - Mobile compact version */}
      <section className="md:hidden py-8 bg-background" data-testid="section-features-mobile">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold text-primary text-center mb-4">
            Why Choose RE Data Metrix?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="p-3 text-center" data-testid={`feature-mobile-${index}`}>
                <div className="flex justify-center mb-2">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-primary mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Desktop full version */}
      <section className="hidden md:block py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              Why Choose RE Data Metrix?
            </h2>
            <div className="h-1 w-24 bg-accent mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover-elevate">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-primary mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - Mobile compact version */}
      <section className="md:hidden py-4 bg-primary text-primary-foreground" data-testid="section-stats-mobile">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div data-testid="stat-mobile-analyze">
              <div className="text-2xl font-bold text-accent mb-0.5">Analyze</div>
              <div className="text-xs text-primary-foreground/80">Deals</div>
            </div>
            <div data-testid="stat-mobile-fund">
              <div className="text-2xl font-bold text-accent mb-0.5">Fund</div>
              <div className="text-xs text-primary-foreground/80">Faster</div>
            </div>
            <div data-testid="stat-mobile-grow">
              <div className="text-2xl font-bold text-accent mb-0.5">Grow</div>
              <div className="text-xs text-primary-foreground/80">Portfolio</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Desktop full version */}
      <section className="hidden md:block py-24 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-accent/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-10 w-10 text-accent" />
                </div>
              </div>
              <div className="text-3xl font-bold text-accent mb-2">Analyze</div>
            </div>
            <div>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-accent/20 rounded-lg flex items-center justify-center">
                  <svg className="h-10 w-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-accent mb-2">Fund</div>
            </div>
            <div>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-accent/20 rounded-lg flex items-center justify-center">
                  <svg className="h-10 w-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-accent mb-2">Grow</div>
            </div>
          </div>
        </div>
      </section>

      <PageFAQSection />

      <div className="sm:hidden text-center text-sm text-muted-foreground px-4 pb-6" data-testid="text-not-ready-mobile">
        Not ready to start?{" "}
        <a href="/features" className="text-accent hover:underline" data-testid="link-learn-more-features">
          Learn more about what we offer
        </a>
        .
      </div>

      {/* Signup CTA Section - Mobile compact version */}
      <section id="signup-cta-mobile" className="md:hidden py-8 px-4 bg-background" data-testid="section-signup-cta-mobile">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold text-primary mb-3">
            Start Analyzing Deals for Free
          </h2>
          <a href="/register">
            <Button
              size="lg"
              className="w-full min-h-11 bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-signup-cta-mobile"
            >
              Get Started Free
            </Button>
          </a>
        </div>
      </section>

      {/* Signup CTA Section - Desktop full version */}
      <section id="signup-cta" className="hidden md:block py-24 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              Start Analyzing Deals for Free
            </h2>
            <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
            <p className="text-xl text-muted-foreground">
              Create your free account and start analyzing real estate deals today
            </p>
          </div>

          <Card className="p-8 bg-primary text-primary-foreground text-center">
            <h3 className="text-2xl font-bold mb-4">What You Get with a Free Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span>2 automated deal analyses per month</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span>Unlimited manual deal analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span>Fix & Flip and DSCR calculators</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span>Access to lender search tools</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span>Max Wholesale Buy Price calculator (2 per month)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span>Full Toolbox access</span>
              </div>
            </div>
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setLocation('/pricing')}
              data-testid="button-signup-cta"
            >
              Get Started Free
            </Button>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
