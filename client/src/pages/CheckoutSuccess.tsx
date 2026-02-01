import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMarketingEvents } from "@/components/MarketingPixelLoader";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { trackSubscribe } = useMarketingEvents();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyCheckout = async () => {
      const urlParams = new URLSearchParams(searchString);
      const sessionId = urlParams.get("session_id");

      if (!sessionId) {
        setStatus("error");
        setMessage("No checkout session found.");
        return;
      }

      try {
        const response = await fetch(`/api/subscription/checkout-success?session_id=${sessionId}`, {
          credentials: "include",
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message || "Your subscription is now active!");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          trackSubscribe({ currency: "USD" });
          toast({
            title: "Welcome!",
            description: "Your subscription is now active. Enjoy RE Data Metrix!",
          });
        } else {
          setStatus("error");
          setMessage(data.error || "Unable to verify your subscription. Please contact support.");
        }
      } catch (error) {
        console.error("Checkout verification error:", error);
        setStatus("error");
        setMessage("An error occurred. Please try again or contact support.");
      }
    };

    verifyCheckout();
  }, [searchString, toast]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background flex items-center justify-center">
        <div className="max-w-md w-full px-4">
          <Card>
            <CardHeader className="text-center">
              {status === "loading" && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <CardTitle className="text-2xl">Verifying Payment...</CardTitle>
                  <CardDescription>
                    Please wait while we confirm your subscription.
                  </CardDescription>
                </>
              )}
              {status === "success" && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <CardTitle className="text-2xl text-success">Welcome to RE Data Metrix!</CardTitle>
                  <CardDescription className="text-base">
                    {message}
                  </CardDescription>
                </>
              )}
              {status === "error" && (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 bg-destructive/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <CardTitle className="text-2xl text-destructive">Something Went Wrong</CardTitle>
                  <CardDescription className="text-base">
                    {message}
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {status === "success" && (
                <>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <p className="font-medium mb-2">What's Next?</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Start analyzing your first deal</li>
                      <li>Explore our curated lender network</li>
                      <li>Access the Toolbox resources</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={() => setLocation("/portal/dashboard")} 
                    className="w-full"
                    data-testid="button-go-to-dashboard"
                  >
                    Go to Dashboard
                  </Button>
                </>
              )}
              {status === "error" && (
                <div className="space-y-3">
                  <Button 
                    onClick={() => setLocation("/checkout")} 
                    className="w-full"
                    data-testid="button-try-again"
                  >
                    Try Again
                  </Button>
                  <Link href="/contact" className="block">
                    <Button variant="outline" className="w-full" data-testid="button-contact-support">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
