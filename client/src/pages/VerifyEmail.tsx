import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, params] = useRoute("/verify-email/:token");
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!params?.token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email/${params.token}`, {
          credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message);
          setUsername(data.username || '');
          setHasSubscription(data.hasSubscription || false);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification');
      }
    };

    verifyEmail();
  }, [params?.token]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="p-8">
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" data-testid="icon-loading" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Verifying your email...</h2>
              <p className="text-muted-foreground">Please wait while we verify your account.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" data-testid="icon-success" />
              <h2 className="text-2xl font-bold text-success mb-2">Email Verified!</h2>
              <p className="text-foreground mb-6" data-testid="text-message">{message}</p>
              {username && (
                <p className="text-muted-foreground mb-6">Welcome, {username}!</p>
              )}
              {hasSubscription ? (
                <Button asChild data-testid="button-dashboard">
                  <a href="/portal/dashboard">Go to Dashboard</a>
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-sm">
                    <p className="text-foreground font-medium mb-1">Account Ready!</p>
                    <p className="text-muted-foreground">
                      Your email is verified. Start by analyzing your first deal.
                    </p>
                  </div>
                  <Button asChild data-testid="button-complete-subscription">
                    <a href="/deal-analysis">
                      Analyze a Deal
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" data-testid="icon-error" />
              <h2 className="text-2xl font-bold text-destructive mb-2">Verification Failed</h2>
              <p className="text-foreground mb-6" data-testid="text-error">{message}</p>
              <div className="space-y-2">
                <Button asChild variant="default" data-testid="button-login">
                  <a href="/login">Go to Login</a>
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Need help? <a href="/contact" className="text-accent hover:underline">Contact us</a>
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
