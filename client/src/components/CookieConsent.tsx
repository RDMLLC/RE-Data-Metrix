import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const COOKIE_CONSENT_KEY = "rdm-cookie-consent-accepted";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    // Don't show banner to admin users
    if (isAdmin) return;
    
    const hasAccepted = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasAccepted) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAdmin]);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    setShowBanner(false);
  };

  // Hide banner for admins or if already accepted
  if (isAdmin || !showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] bg-card border-t border-border shadow-lg"
      data-testid="banner-cookie-consent"
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Cookie className="h-4 w-4 text-accent flex-shrink-0" />
            <p className="text-xs text-muted-foreground truncate">
              We use essential cookies to keep you logged in.{" "}
              <Link href="/privacy" className="text-primary hover:underline inline-flex items-center gap-1" data-testid="link-cookie-policy">
                Learn more
              </Link>
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleAccept}
            className="flex-shrink-0 text-xs px-3 py-1 h-7"
            data-testid="button-accept-cookies"
          >
            Got It
          </Button>
        </div>
      </div>
    </div>
  );
}
