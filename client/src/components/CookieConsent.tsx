import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const COOKIE_CONSENT_KEY = "rdm-cookie-consent-accepted";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasAccepted) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg"
      data-testid="banner-cookie-consent"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">
                Cookie Notice
              </p>
              <p className="text-sm text-muted-foreground">
                We use essential cookies to keep you logged in and enable site features. 
                By continuing to use this site, you consent to our use of cookies.{" "}
                <Link href="/privacy" className="text-primary hover:underline inline-flex items-center gap-1" data-testid="link-cookie-policy">
                  Learn more
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </p>
            </div>
          </div>
          <Button 
            onClick={handleAccept}
            className="flex-shrink-0"
            data-testid="button-accept-cookies"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
}
