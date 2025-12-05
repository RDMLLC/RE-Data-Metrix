import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Building2, MapPin, Phone, Mail, Layers, Users, Zap } from "lucide-react";
import companyImg from "@assets/generated_images/Company_headquarters_building_0830ca98.png";

export default function About() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold text-primary mb-4">About Us</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground">
            Empowering real estate investors with data-driven insights and funding solutions
          </p>
        </div>

        {/* Who We Are Section - At the top */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <img 
              src={companyImg} 
              alt="RE Data Metrix Headquarters"
              className="w-full rounded-lg shadow-lg"
            />
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2">Who We Are</h2>
              <div className="h-1 w-16 bg-accent mb-6"></div>
              <p className="text-lg text-foreground mb-4">
                RE Data Metrix, LLC is a technology-driven real estate analytics platform headquartered in Atlanta, Georgia. We specialize in providing investors with sophisticated deal analysis tools and direct connections to funding sources.
              </p>
              <p className="text-lg text-foreground mb-6">
                Our platform combines cutting-edge financial modeling with a curated network of lenders, creating a comprehensive solution for real estate investment success.
              </p>
              
              <Card className="p-6 bg-primary text-primary-foreground">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-5 w-5 text-accent" />
                  <h3 className="text-lg font-semibold">Company Information</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">RE Data Metrix, LLC</div>
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
        </section>

        {/* Our Mission Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-primary mb-2">Our Mission</h2>
          <div className="h-1 w-16 bg-accent mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <p className="text-lg text-foreground mb-4">
                RE Data Metrix was founded on a simple yet powerful vision: to democratize access to professional-grade real estate investment analysis and connect investors with the right funding partners.
              </p>
              <p className="text-lg text-foreground">
                We believe that every real estate investor, regardless of experience level, deserves access to sophisticated tools that provide comprehensive profitability analysis beyond what standard deal calculators offer.
              </p>
            </div>
            <Card className="p-6 bg-success/10 border-l-4 border-success">
              <h3 className="text-xl font-semibold text-success mb-4">What Sets Us Apart</h3>
              <ul className="space-y-3 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>Data-driven decisions, not guesswork</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>Built by real estate professionals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>Continuously updated lender network</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>Curated Toolbox with resources to help you manage and grow your business</span>
                </li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Platform Features Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Layers className="h-8 w-8 text-accent" />
            <h2 className="text-3xl font-bold text-primary">Our Platform</h2>
          </div>
          <div className="h-1 w-16 bg-accent mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Affordable Subscription Model</h3>
                  <p className="text-muted-foreground text-sm">
                    Gain unlimited access to our comprehensive suite of deal analysis tools, lender database, and application platform. No hidden fees, no per-transaction charges.
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Advanced Profitability Analysis</h3>
                  <p className="text-muted-foreground text-sm">
                    Compare individual loan products from numerous lenders to determine impact on overall profitability, cash-on-cash return, annualized ROI, and more.
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">One-Click Lender Access</h3>
                  <p className="text-muted-foreground text-sm">
                    Connect directly with our network of verified lenders through our streamlined application flow. Search for lenders that meet your specific criteria.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </Layout>
  );
}
