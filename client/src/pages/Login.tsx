import Layout from "@/components/Layout";
import PrelaunchForm from "@/components/PrelaunchForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left Side - Value Prop & Lender Login */}
            <div className="lg:col-span-2 space-y-6">
              {/* Investor Welcome Box */}
              <div className="bg-primary text-primary-foreground rounded-lg p-12">
                <h2 className="text-4xl font-bold mb-6">Welcome to RE Data Metrix</h2>
                <div className="h-1 w-24 bg-accent mb-8"></div>
                <div className="space-y-4 text-lg">
                  <p className="flex items-start gap-3">
                    <span className="text-accent mt-1">✓</span>
                    <span>Advanced deal analysis tools</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-accent mt-1">✓</span>
                    <span>Direct lender connections</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-accent mt-1">✓</span>
                    <span>One-click application flow</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-accent mt-1">✓</span>
                    <span>Comprehensive profitability analysis</span>
                  </p>
                </div>
              </div>

              {/* Lender Login Section */}
              <Card className="p-8 bg-card">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-primary mb-3">Are you a lender?</h3>
                  <p className="text-muted-foreground mb-6">
                    Access your lender portal to manage your loan products and connect with investors
                  </p>
                  <Link href="/lender-portal">
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary"
                      size="lg"
                      data-testid="button-lender-portal"
                    >
                      Lender Portal Login
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>

            {/* Right Side - Form */}
            <div className="lg:col-span-3">
              <Card className="p-8 shadow-xl bg-primary text-primary-foreground">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Join the Waitlist</h1>
                  <p className="text-primary-foreground/80">
                    We're launching soon! Sign up to get early access and be among the first to experience our platform.
                  </p>
                </div>
                <PrelaunchForm source="login_prelaunch" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
