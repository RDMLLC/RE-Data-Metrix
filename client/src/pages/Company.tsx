import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Building2, MapPin, Mail, Phone } from "lucide-react";
import companyImg from "@assets/generated_images/Company_headquarters_building_0830ca98.png";
import { SEO } from "@/components/SEO";
import { AboutPageSchema } from "@/components/StructuredData";

export default function Company() {
  return (
    <Layout>
      <SEO
        title="The Company"
        description="RE Data Metrix, LLC is revolutionizing how investors analyze deals and find funding. Based in Atlanta, GA, we provide powerful investment analysis tools and lender connections."
        canonicalUrl="https://redatametrix.com/company"
      />
      <AboutPageSchema
        pageUrl="https://redatametrix.com/company"
        pageName="RE Data Metrix — The Company"
        pageDescription="RE Data Metrix, LLC revolutionizes how real estate investors analyze deals and connect with funding sources. Based in Atlanta, GA, we provide sophisticated investment analysis tools and lender connections."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold text-primary mb-4">The Company</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            RE Data Metrix, LLC is revolutionizing how real estate investors analyze deals and connect with funding sources.
          </p>
        </div>

        {/* Company Image and Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <img 
              src={companyImg} 
              alt="RE Data Metrix Headquarters"
              className="w-full rounded-lg shadow-lg"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-primary mb-6">Who We Are</h2>
            <div className="h-1 w-16 bg-accent mb-6"></div>
            <p className="text-lg text-foreground mb-4">
              RE Data Metrix, LLC is a technology-driven real estate analytics platform headquartered in Atlanta, Georgia. We specialize in providing investors with sophisticated deal analysis tools and direct connections to funding sources.
            </p>
            <p className="text-lg text-foreground mb-6">
              Our platform combines cutting-edge financial modeling with a curated network of lenders, creating a comprehensive solution for real estate investment success.
            </p>
            
            <Card className="p-6 bg-primary text-primary-foreground">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-6 w-6 text-accent" />
                <h3 className="text-xl font-semibold">Company Information</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">RE Data Metrix, LLC</div>
                    <div className="text-primary-foreground/80">8735 Dunwoody Pl, Suite R</div>
                    <div className="text-primary-foreground/80">Atlanta, GA 30350</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-accent" />
                  <span className="text-primary-foreground/80">(888) 450-4408</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-accent" />
                  <a href="/contact" className="text-accent hover:underline">Contact Us</a>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Platform Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-primary mb-4">Our Platform</h2>
          <div className="h-1 w-16 bg-accent mb-8"></div>
          
          <div className="space-y-6">
            <Card className="p-8">
              <h3 className="text-2xl font-semibold text-primary mb-4">Affordable Subscription Model</h3>
              <p className="text-lg text-foreground">
                For a simple monthly fee, gain unlimited access to our comprehensive suite of deal analysis tools, lender database, and application platform. No hidden fees, no per-transaction charges—just straightforward pricing that scales with your success.
              </p>
            </Card>

            <Card className="p-8">
              <h3 className="text-2xl font-semibold text-primary mb-4">Advanced Profitability Analysis</h3>
              <p className="text-lg text-foreground">
                We let you take your analysis further by comparing individual loan products from numerous lenders to determine how the loan impacts your overall profitability, but also your cash-on-cash return, your annualized ROI, and more.
              </p>
            </Card>

            <Card className="p-8">
              <h3 className="text-2xl font-semibold text-primary mb-4">One-Click Lender Access</h3>
              <p className="text-lg text-foreground">
                Once you've analyzed your deal and funding options, connect directly with our network of verified lenders through our streamlined application flow. Don't have a deal to analyze, or just want to find a lender that meets your needs? You can search for a lender that meets your needs. Are you looking for lenders that offer deferred interest? Have less stringent credit requirements? Aren't afraid to deal with a new investor? Just enter your criteria, hit search, and you're one click away from accessing their information and application.
              </p>
            </Card>
          </div>
        </section>

        {/* Commitment */}
        <section>
          <Card className="p-12 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground text-center">
            <h2 className="text-3xl font-bold mb-6">Our Commitment to You</h2>
            <p className="text-xl mb-4 max-w-3xl mx-auto">
              We're committed to continuously improving our platform, expanding our lender network, and providing you with the tools and insights you need to make confident investment decisions.
            </p>
            <p className="text-lg text-primary-foreground/80 max-w-3xl mx-auto">
              Your success is our success, and we're here to support you every step of the way—from initial analysis to final funding.
            </p>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
