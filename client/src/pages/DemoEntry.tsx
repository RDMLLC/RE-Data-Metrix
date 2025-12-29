import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

export default function DemoEntry() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'revoked'>('loading');
  const [errorMessage, setErrorMessage] = useState("");
  const [contactName, setContactName] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStatus('invalid');
        setErrorMessage("No demo token provided");
        return;
      }

      try {
        const response = await fetch("/api/demo/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setStatus('valid');
          setContactName(data.contactName);
        } else {
          if (data.error?.includes("expired")) {
            setStatus('expired');
          } else if (data.error?.includes("revoked")) {
            setStatus('revoked');
          } else {
            setStatus('invalid');
          }
          setErrorMessage(data.error || "Invalid demo link");
        }
      } catch (error) {
        setStatus('invalid');
        setErrorMessage("Failed to validate demo link");
      }
    };

    validateToken();
  }, [token]);

  const handleStartDemo = () => {
    setLocation("/deal-analysis?demo=true");
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" data-testid="loading-spinner" />
            <p className="text-muted-foreground">Validating your demo access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'invalid' || status === 'expired' || status === 'revoked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl" data-testid="text-error-title">
              {status === 'expired' ? "Demo Link Expired" : 
               status === 'revoked' ? "Demo Link Revoked" : 
               "Invalid Demo Link"}
            </CardTitle>
            <CardDescription data-testid="text-error-message">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {status === 'expired' 
                ? "This demo link has expired. Please request a new demo link from your contact."
                : status === 'revoked'
                ? "This demo link has been deactivated. Please request a new demo link from your contact."
                : "The demo link you're trying to access is not valid. Please check the link or request a new one."}
            </p>
            <Button onClick={() => setLocation("/")} variant="outline" data-testid="button-go-home">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-welcome-title">
            Welcome to RE Data Metrix Demo
          </CardTitle>
          <CardDescription>
            {contactName ? `Hello ${contactName}! ` : ""}
            You have demo access to our Deal Analysis platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">What you can do in this demo:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Enter a property address and deal details</li>
              <li>Add your own loan product for comparison</li>
              <li>See the full analysis with demo lender comparisons</li>
              <li>Experience the complete Deal Analysis workflow</li>
            </ul>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> This is a demo environment. Lender names shown are placeholders. 
              After subscribing, you'll see real lender products and be able to save your analyses.
            </p>
          </div>
          <Button 
            onClick={handleStartDemo} 
            className="w-full" 
            size="lg"
            data-testid="button-start-demo"
          >
            Start Deal Analysis Demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
