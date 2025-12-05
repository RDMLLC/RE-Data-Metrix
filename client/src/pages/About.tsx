import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Target, Eye, Award, Building2, MapPin, Phone, Mail, Layers, Users, Zap } from "lucide-react";
import companyImg from "@assets/generated_images/Company_headquarters_building_0830ca98.png";

export default function About() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold text-primary mb-4">About Us</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground">
            Empowering real estate investors with data-driven insights and funding solutions
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-8 w-8 text-accent" />
                <h2 className="text-3xl font-bold text-primary">Our Mission</h2>
              </div>
              <div className="h-1 w-16 bg-accent mb-6"></div>
              <p className="text-lg text-foreground mb-4">
                RE Data Metrix was founded on a simple yet powerful vision: to democratize access to professional-grade real estate investment analysis and connect investors with the right funding partners.
              </p>
              <p className="text-lg text-foreground">
                We believe that every real estate investor, regardless of experience level, deserves access to sophisticated tools that provide comprehensive profitability analysis beyond what standard deal calculators offer.
              </p>
            </div>
            <Card className="p-8 bg-success/10 border-l-4 border-success">
              <h3 className="text-2xl font-semibold text-success mb-4">What Sets Us Apart</h3>
              <ul className="space-y-3 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>Affordable subscription model that makes powerful tools accessible to everyone</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>Profitability analysis that goes deeper than traditional calculators</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>One-click application flow connecting you directly with verified lenders</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>Comprehensive lender database with creative financing options</span>
                </li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Vision Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="h-8 w-8 text-accent" />
            <h2 className="text-3xl font-bold text-primary">Our Vision</h2>
          </div>
          <div className="h-1 w-16 bg-accent mb-6"></div>
          <p className="text-lg text-foreground mb-6">
            We envision a future where real estate investment decisions are powered by data, not guesswork. Our platform bridges the gap between investors and lenders, creating a seamless ecosystem where deals are analyzed with precision and funding is secured with confidence.
          </p>
          <p className="text-lg text-foreground">
            By combining advanced analytics with a curated network of lenders who understand creative financing, we're building the industry standard for real estate investment intelligence.
          </p>
        </section>

        {/* Values Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-8 w-8 text-accent" />
            <h2 className="text-3xl font-bold text-primary">Our Values</h2>
          </div>
          <div className="h-1 w-16 bg-accent mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-primary mb-2">Transparency</h3>
              <p className="text-muted-foreground">
                Clear pricing, honest analysis, and straightforward communication in everything we do.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-primary mb-2">Innovation</h3>
              <p className="text-muted-foreground">
                Continuously improving our tools and expanding our network to serve you better.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-primary mb-2">Accessibility</h3>
              <p className="text-muted-foreground">
                Making professional-grade tools affordable through our affordable subscription model.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-primary mb-2">Partnership</h3>
              <p className="text-muted-foreground">
                Building lasting relationships between investors, lenders, and other partners based on trust and mutual success.
              </p>
            </Card>
          </div>
        </section>

        {/* Platform Features Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="h-8 w-8 text-accent" />
            <h2 className="text-3xl font-bold text-primary">Our Platform</h2>
          </div>
          <div className="h-1 w-16 bg-accent mb-8"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <img 
              src={companyImg} 
              alt="RE Data Metrix Platform"
              className="w-full rounded-lg shadow-lg"
            />
            <div className="space-y-6">
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
          </div>
        </section>

        {/* Company Info Section */}
        <section>
          <Card className="p-8 bg-primary text-primary-foreground">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-6 w-6 text-accent" />
                  <h2 className="text-2xl font-bold">RE Data Metrix, LLC</h2>
                </div>
                <p className="text-primary-foreground/90 max-w-xl">
                  We're committed to continuously improving our platform, expanding our lender network, and providing you with the tools and insights you need to make confident investment decisions.
                </p>
              </div>
              <div className="space-y-3 text-sm flex-shrink-0">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
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
            </div>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
