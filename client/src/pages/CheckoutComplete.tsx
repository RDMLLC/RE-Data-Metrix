import { useEffect, useState } from "react";
import { useSearch, Link } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, Mail } from "lucide-react";
import { useMarketingEvents } from "@/components/MarketingPixelLoader";

export default function CheckoutComplete() {
  const searchString = useSearch();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { trackCompleteRegistration, trackSubscribe, pixelsLoaded } = useMarketingEvents();
  const [pendingPixelData, setPendingPixelData] = useState<{
    metaEventId?: string;
    plan?: string;
    value?: number;
    subscriptionId?: string;
  } | null>(null);

  useEffect(() => {
    const completeCheckout = async () => {
      const urlParams = new URLSearchParams(searchString);
      const sessionId = urlParams.get("session_id");

      if (!sessionId) {
        setStatus("error");
        setMessage("No checkout session found.");
        return;
      }

      try {
        const response = await fetch(`/api/subscription/checkout/complete?session_id=${sessionId}`, {
          credentials: "include",
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message || "Your account has been created!");
          setPendingPixelData({
            metaEventId: data.metaEventId,
            plan: data.plan,
            value: data.value,
            subscriptionId: data.subscriptionId,
          });
        } else {
          setStatus("error");
          setMessage(data.error || "Unable to complete registration. Please contact support.");
        }
      } catch (error) {
        console.error("Checkout completion error:", error);
        setStatus("error");
        setMessage("An error occurred. Please try again or contact support.");
      }
    };

    completeCheckout();
  }, [searchString]);

  // Fire browser pixel events and GA4 once pixels are loaded and we have the event data
  useEffect(() => {
    if (!pixelsLoaded || !pendingPixelData) return;
    trackCompleteRegistration({ eventId: pendingPixelData.metaEventId });
    trackSubscribe();
    window.gtag?.('event', 'sign_up', { account_type: 'paid' });
    if (typeof (window as any).gtag === "function" && pendingPixelData.plan) {
      (window as any).gtag("event", "subscription_purchase", {
        currency: "USD",
        value: pendingPixelData.value,
        transaction_id: pendingPixelData.subscriptionId,
        plan: pendingPixelData.plan,
        item_name: pendingPixelData.plan === "annual" ? "Annual Plan" : "Monthly Plan",
      });
    }
  }, [pixelsLoaded, pendingPixelData]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-lg mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              {status === 'loading' && (
                <>
                  <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" data-testid="icon-loading" />
                  <CardTitle className="text-2xl">Completing your registration...</CardTitle>
                  <CardDescription>Please wait while we set up your account.</CardDescription>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" data-testid="icon-success" />
                  <CardTitle className="text-2xl text-success">Payment Successful!</CardTitle>
                  <CardDescription className="text-base">{message}</CardDescription>
                </>
              )}

              {status === 'error' && (
                <>
                  <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" data-testid="icon-error" />
                  <CardTitle className="text-2xl text-destructive">Something went wrong</CardTitle>
                  <CardDescription className="text-base">{message}</CardDescription>
                </>
              )}
            </CardHeader>

            <CardContent>
              {status === 'success' && (
                <div className="space-y-6 text-center">
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                    <Mail className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="font-medium text-foreground">Check your email</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We've sent you a verification link. Please verify your email to activate your account.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button asChild className="w-full" data-testid="button-go-to-login">
                      <Link href="/login">Go to Login</Link>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      After verifying your email, you can sign in to access your dashboard.
                    </p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="space-y-4 text-center">
                  <Button asChild variant="outline" className="w-full" data-testid="button-try-again">
                    <Link href="/checkout">Try Again</Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Need help?{" "}
                    <Link href="/contact" className="text-accent hover:underline">Contact us</Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
