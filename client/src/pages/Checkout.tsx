import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, CreditCard, Shield, Lock, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const planDetails = {
  name: "Full Membership",
  price: 49,
  interval: "month",
  features: [
    "Complete Deal Analysis with ROI calculations",
    "Side-by-side lender loan comparisons",
    "Rental Analysis with DSCR calculations",
    "Access to curated lender network",
    "Save and track unlimited deals",
    "Save favorite lenders for quick access",
    "Export loan analysis reports",
    "Full access to Toolbox resources",
    "Priority email support",
  ],
};

export default function Checkout() {
  const { isAuthenticated, isSubscriber, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/checkout", { planId: "full-membership" });
      return await response.json();
    },
    onSuccess: (data: { redirectUrl?: string; success?: boolean; message?: string; integrationPending?: boolean }) => {
      setIsProcessing(false);
      
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.success) {
        toast({
          title: "Subscription Activated!",
          description: data.message || "Welcome to RE Data Metrix membership!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/portal/dashboard");
      } else if (data.integrationPending) {
        toast({
          title: "Payment System Setup in Progress",
          description: data.message || "Our payment system is being configured. Please check back soon.",
        });
      } else {
        toast({
          title: "Unable to Process",
          description: data.message || "Please try again later.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Unable to process your request. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setLocation("/login?redirect=/checkout");
      return;
    }
    setIsProcessing(true);
    checkoutMutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-lg mx-auto px-4">
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Sign In Required</CardTitle>
                <CardDescription>
                  Please sign in or create an account to continue with your purchase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/login?redirect=/checkout" className="block">
                  <Button className="w-full" data-testid="button-checkout-login">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register?redirect=/checkout" className="block">
                  <Button variant="outline" className="w-full" data-testid="button-checkout-register">
                    Create Account
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (isSubscriber) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-lg mx-auto px-4">
            <Card className="border-success/30">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="text-2xl text-success">You're Already a Member!</CardTitle>
                <CardDescription>
                  You have full access to all RE Data Metrix features.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                  <Badge className="text-sm">
                    {user?.subscriptionStatus === 'active' && 'Active Member'}
                    {user?.subscriptionStatus === 'comped' && 'Complimentary Access'}
                    {user?.subscriptionStatus === 'referral_trial' && 'Referral Trial'}
                  </Badge>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/portal/dashboard" className="block">
                    <Button className="w-full" data-testid="button-go-dashboard">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link href="/portal/profile" className="block">
                    <Button variant="outline" className="w-full" data-testid="button-manage-account">
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/pricing" className="inline-flex items-center text-primary hover:underline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pricing
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-primary" data-testid="text-checkout-title">
                    Complete Your Purchase
                  </CardTitle>
                  <CardDescription>
                    Upgrade to full membership and unlock all features.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="h-5 w-5 text-accent" />
                      <span className="font-medium text-foreground">Zoho Billing Integration</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When you click "Subscribe Now", you'll be securely redirected to our payment portal 
                      powered by Zoho Billing. Your payment information is processed securely and never 
                      stored on our servers.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-foreground mb-4">What's Included</h3>
                    <ul className="space-y-2">
                      {planDetails.features.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground mt-3">
                      + {planDetails.features.length - 5} more features
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-success" />
                      <span>PCI-DSS compliant payment processing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4 text-success" />
                      <span>256-bit SSL encryption</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4 text-success" />
                      <span>Cancel anytime from your account</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="sticky top-24">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{planDetails.name}</span>
                    <span className="font-medium">${planDetails.price}/{planDetails.interval}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Today</span>
                    <span className="text-primary">${planDetails.price}.00</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll be charged ${planDetails.price}/month. Cancel anytime.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    onClick={handleCheckout}
                    disabled={isProcessing || checkoutMutation.isPending}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    size="lg"
                    data-testid="button-subscribe-now"
                  >
                    {isProcessing || checkoutMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Subscribe Now
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    By subscribing, you agree to our{" "}
                    <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
