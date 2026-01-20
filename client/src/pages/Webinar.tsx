import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, 
  Clock, 
  Video, 
  BarChart3, 
  Calculator, 
  DollarSign, 
  Users, 
  Check,
  Gift,
  ArrowRight,
  Play
} from "lucide-react";

export default function Webinar() {
  const webinarDate = "Friday, January 30, 2026";
  const webinarTime = "2:00 PM EST";
  const registrationLink = "https://meet.zoho.com/nyok-eid-buf";

  const features = [
    {
      icon: <BarChart3 className="h-6 w-6 text-accent" />,
      title: "Profitability Analysis Tool",
      description: "Deep dive into deal profitability with comprehensive metrics for fix & flip and rental properties"
    },
    {
      icon: <DollarSign className="h-6 w-6 text-accent" />,
      title: "Loan Comparison",
      description: "Compare multiple loan products side-by-side to find the best financing for your deals"
    },
    {
      icon: <Calculator className="h-6 w-6 text-accent" />,
      title: "Max Offer Price Calculator",
      description: "Calculate your maximum purchase price based on ARV, rehab costs, and profit targets"
    },
    {
      icon: <Calculator className="h-6 w-6 text-accent" />,
      title: "Wholesale Buy Price Calculator",
      description: "Determine the maximum you can pay for wholesale deals including assignment and double close"
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-accent" />,
      title: "ARV Calculator with Comps",
      description: "Research comparable sales to determine accurate After Repair Values for your subject properties"
    },
    {
      icon: <Users className="h-6 w-6 text-accent" />,
      title: "Lender Directory",
      description: "Connect with verified private lenders who understand real estate investment"
    }
  ];

  const benefits = [
    "See live demonstrations of every tool",
    "Learn how to analyze deals faster and more accurately",
    "Discover how to find the best financing options",
    "Get invited to our soft launch",
    "Receive a discount code for free access to premium features"
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-primary py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Video className="h-4 w-4" />
                Live Webinar
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
                RE Data Metrix<br />
                <span className="text-accent">Soft Launch Webinar</span>
              </h1>
              <p className="text-xl text-white/80 mb-8 max-w-xl">
                Learn about this exciting new investor tool. RE Data Metrix offers real estate investors a better way to analyze and fund their deals!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex items-center gap-3 text-white">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <Calendar className="h-6 w-6 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white/60">Date</p>
                    <p className="font-semibold">{webinarDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white/60">Time</p>
                    <p className="font-semibold">{webinarTime}</p>
                  </div>
                </div>
              </div>

              <Button 
                size="lg"
                className="bg-accent text-accent-foreground"
                onClick={() => window.open(registrationLink, '_blank')}
                data-testid="button-register-webinar-hero"
              >
                Register Now - It's Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Video Placeholder */}
            <div className="hidden lg:block">
              <div className="aspect-video bg-black/20 rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary/80" />
                <div className="relative text-center z-10">
                  <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <Play className="h-10 w-10 text-accent ml-1" />
                  </div>
                  <p className="text-white/80 text-lg">Platform Overview Video</p>
                  <p className="text-white/60 text-sm mt-1">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Learn Section */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              What You'll Learn
            </h2>
            <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join us for a comprehensive walkthrough of the tools that will transform how you analyze and fund real estate deals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover-elevate" data-testid={`card-feature-${index}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-primary">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-6">
                Why Attend This Webinar?
              </h2>
              <div className="h-1 w-24 bg-accent mb-8"></div>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1 rounded-full mt-0.5">
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-lg text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Special Offer Card */}
            <Card className="bg-primary text-primary-foreground p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-accent/20 p-3 rounded-lg">
                  <Gift className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Exclusive Launch Offer</h3>
                  <p className="text-primary-foreground/80">For webinar attendees only</p>
                </div>
              </div>
              <p className="text-lg mb-6">
                At the end of the webinar, you'll be invited to be part of our soft launch and receive a <span className="text-accent font-semibold">discount code granting free access</span> to these powerful tools!
              </p>
              <div className="border-t border-primary-foreground/20 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-primary-foreground/80">Duration</span>
                  <span className="font-semibold">1 Hour</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-primary-foreground/80">Format</span>
                  <span className="font-semibold">Live Interactive Session</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-foreground/80">Cost</span>
                  <span className="font-semibold text-accent">FREE</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* About RE Data Metrix Section */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              About RE Data Metrix
            </h2>
            <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="p-8 bg-muted/30">
              <p className="text-lg text-muted-foreground mb-6">
                RE Data Metrix is a comprehensive real estate investment analytics platform designed to help investors make smarter, faster decisions. Our tools streamline the entire deal analysis process - from initial property evaluation to finding the right financing.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Whether you're a fix-and-flip investor, wholesaler, or building a rental portfolio, our platform provides the data-driven insights you need to maximize profitability and minimize risk.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t">
                <div className="text-center">
                  <p className="text-3xl font-bold text-accent">Faster</p>
                  <p className="text-sm text-muted-foreground">Deal Analysis</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-accent">Smarter</p>
                  <p className="text-sm text-muted-foreground">Investment Decisions</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-accent">Better</p>
                  <p className="text-sm text-muted-foreground">Financing Options</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 lg:py-24 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Investment Business?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join us on {webinarDate} at {webinarTime} and discover how RE Data Metrix can help you analyze deals faster and find better financing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              className="bg-accent text-accent-foreground"
              onClick={() => window.open(registrationLink, '_blank')}
              data-testid="button-register-webinar-footer"
            >
              Register for Free Webinar
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="text-white/60 mt-6 text-sm">
            Seats are limited. Reserve your spot today!
          </p>
        </div>
      </section>
    </Layout>
  );
}
