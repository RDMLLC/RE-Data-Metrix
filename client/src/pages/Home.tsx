import Layout from "@/components/Layout";
import Hero from "@/components/Hero";
import PrelaunchForm from "@/components/PrelaunchForm";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, BarChart3, Zap, Shield } from "lucide-react";

export default function Home() {
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
      icon: <Zap className="h-8 w-8 text-accent" />,
      title: "One-Click Applications",
      description: "Streamlined application process to get funding faster and close deals with confidence."
    },
    {
      icon: <DollarSign className="h-8 w-8 text-accent" />,
      title: "Monthly Subscription",
      description: "Affordable access to powerful tools and resources without breaking the bank."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-accent" />,
      title: "Real-Time Insights",
      description: "Stay updated with market trends and funding opportunities tailored to your investment strategy."
    },
    {
      icon: <Shield className="h-8 w-8 text-accent" />,
      title: "Secure & Reliable",
      description: "Your data and deals are protected with enterprise-grade security and privacy standards."
    }
  ];

  return (
    <Layout>
      <Hero />
      
      {/* Features Section */}
      <section className="py-24 bg-background">
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

      {/* Stats Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl font-bold text-accent mb-2">500+</div>
              <div className="text-xl text-primary-foreground/80">Verified Lenders</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-accent mb-2">$2B+</div>
              <div className="text-xl text-primary-foreground/80">Deals Analyzed</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-accent mb-2">95%</div>
              <div className="text-xl text-primary-foreground/80">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Prelaunch Signup Section */}
      <section id="prelaunch-form" className="py-24 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              Lock in your Pre-Launch Discount Now
            </h2>
            <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
            <p className="text-xl text-muted-foreground">
              No obligation, just a great discount and early access when we launch
            </p>
          </div>

          <Card className="p-8 bg-primary text-primary-foreground">
            <PrelaunchForm source="home_prelaunch" />
          </Card>
        </div>
      </section>
    </Layout>
  );
}
