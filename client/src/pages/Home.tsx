import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import Hero from "@/components/Hero";
import PrelaunchForm from "@/components/PrelaunchForm";
import { Card } from "@/components/ui/card";
import { Users, BarChart3, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isLender, setIsLender] = useState(false);
  const [lenderChecked, setLenderChecked] = useState(false);

  useEffect(() => {
    async function checkLenderSession() {
      try {
        const response = await fetch("/api/lenders/me", {
          credentials: "include",
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
        setLocation("/portal/dashboard");
      }
    }
  }, [authLoading, lenderChecked, isAuthenticated, isLender, user, setLocation]);

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

      {/* Stats Section - Hidden on mobile to reduce scrolling */}
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
