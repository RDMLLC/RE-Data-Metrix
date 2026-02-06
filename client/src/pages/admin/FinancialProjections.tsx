import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function FinancialProjections() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin' && data.role !== 'auditor') {
            toast({
              title: "Access Denied",
              description: "Admin or auditor privileges required.",
              variant: "destructive",
            });
            setLocation("/admin/login");
            return;
          }
        } else {
          setLocation("/admin/login");
          return;
        }
      } catch {
        setLocation("/admin/login");
        return;
      }
      setIsAuthChecking(false);
    };
    checkAuth();
  }, [setLocation, toast]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-6 pb-0">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Financial Projections</h1>
            <p className="text-muted-foreground mt-1">
              Company financial projections and forecasts
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 px-6 pb-6">
        <iframe
          src="https://docs.google.com/spreadsheets/d/e/2PACX-1vSVCbVoIeY3TgB1R-45L1hm-NV2uBpiepp7Ry7sYsS6W53CDaxkwPZD8N1R4AmWPyxGOOow-iZWawik/pubhtml?widget=true&headers=false&chrome=false&rm=minimal"
          className="w-full h-full min-h-[calc(100vh-160px)] border rounded-lg"
          title="Financial Projections"
          data-testid="iframe-financial-projections"
        />
      </div>
    </div>
  );
}
