import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  RefreshCw,
  Mail,
  Database,
  Home
} from "lucide-react";

interface IntegrationStatus {
  name: string;
  description: string;
  configured: boolean;
  ready: boolean;
  details: Record<string, any>;
}

interface IntegrationsResponse {
  integrations: IntegrationStatus[];
}

interface StripePlan {
  id: string;
  name: string;
  planType: string;
  amount: number;
  interval: string;
}

export default function AdminIntegrations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [allIntegrations, setAllIntegrations] = useState<IntegrationStatus[]>([]);

  const fetchAllIntegrations = async () => {
    try {
      const response = await fetch("/api/admin/integrations/status", {
        credentials: "include",
      });
      if (response.ok) {
        const data: IntegrationsResponse = await response.json();
        setAllIntegrations(data.integrations);
      }
    } catch (error) {
      console.error("Failed to fetch integrations status");
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const fetchStripePlans = async () => {
    setIsLoadingPlans(true);
    try {
      const response = await fetch("/api/subscription/plans", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStripePlans(data.plans || []);
        toast({
          title: "Plans Loaded",
          description: `Found ${data.plans?.length || 0} subscription plans`,
        });
      }
    } catch (error) {
      console.error("Failed to fetch Stripe plans");
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchAllIntegrations();
  }, []);

  const handleRefreshStatus = async () => {
    setIsLoadingStatus(true);
    await fetchAllIntegrations();
    toast({
      title: "Status Refreshed",
      description: "Integration status has been updated",
    });
  };

  const getStripeStatus = () => {
    return allIntegrations.find(i => i.name === "Stripe Billing");
  };

  const getIntegrationIcon = (name: string) => {
    switch (name) {
      case "Stripe Billing":
        return <CreditCard className="h-6 w-6 text-indigo-500" />;
      case "HasData API":
        return <Home className="h-6 w-6 text-emerald-500" />;
      case "Email (SMTP)":
        return <Mail className="h-6 w-6 text-purple-500" />;
      case "PostgreSQL Database":
        return <Database className="h-6 w-6 text-cyan-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getIntegrationBgColor = (name: string) => {
    switch (name) {
      case "Stripe Billing":
        return "bg-indigo-500/10";
      case "HasData API":
        return "bg-emerald-500/10";
      case "Email (SMTP)":
        return "bg-purple-500/10";
      case "PostgreSQL Database":
        return "bg-cyan-500/10";
      default:
        return "bg-muted";
    }
  };

  const stripeStatus = getStripeStatus();

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back-admin"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
              <p className="text-muted-foreground mt-1">
                Manage external service connections
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStatus}
              disabled={isLoadingStatus}
              data-testid="button-refresh-status"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="space-y-6">
            <Card data-testid="card-stripe-billing-integration">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Stripe Billing</CardTitle>
                      <CardDescription>
                        Subscription and payment processing
                      </CardDescription>
                    </div>
                  </div>
                  {stripeStatus?.ready ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Connection Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {stripeStatus?.ready ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={stripeStatus?.ready ? "text-foreground" : "text-muted-foreground"}>
                          {stripeStatus?.details?.message || "Stripe connector status"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Stripe is connected via Replit's native integration. No API keys needed.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Quick Links</h4>
                    <div className="space-y-2">
                      <a 
                        href="https://dashboard.stripe.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Stripe Dashboard
                      </a>
                      <a 
                        href="https://dashboard.stripe.com/products" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Products & Prices
                      </a>
                      <a 
                        href="https://dashboard.stripe.com/customers" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Customers
                      </a>
                    </div>
                  </div>
                </div>

                {stripePlans.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Available Plans</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {stripePlans.map((plan) => (
                        <div 
                          key={plan.id}
                          className="p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="font-medium text-sm">{plan.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {plan.planType} - {plan.interval}ly
                          </div>
                          <div className="text-sm mt-1">
                            ${(plan.amount / 100).toFixed(2)}/{plan.interval}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t">
                  {stripeStatus?.ready && (
                    <Button 
                      variant="outline"
                      onClick={fetchStripePlans}
                      disabled={isLoadingPlans}
                      data-testid="button-load-stripe-plans"
                    >
                      {isLoadingPlans ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Load Subscription Plans
                        </>
                      )}
                    </Button>
                  )}
                  {!stripeStatus?.ready && (
                    <p className="text-sm text-muted-foreground py-2">
                      Connect Stripe via the Replit integrations panel to enable payments.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Other Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allIntegrations
                  .filter(integration => integration.name !== "Stripe Billing")
                  .map((integration) => (
                    <Card 
                      key={integration.name} 
                      data-testid={`card-integration-${integration.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${getIntegrationBgColor(integration.name)} rounded-lg flex items-center justify-center`}>
                              {getIntegrationIcon(integration.name)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{integration.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {integration.description}
                              </CardDescription>
                            </div>
                          </div>
                          {integration.ready ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          ) : integration.configured ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Partial
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Not Configured
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs space-y-1">
                          {Object.entries(integration.details).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              {typeof value === 'boolean' ? (
                                value ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                )
                              ) : (
                                <CheckCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className={typeof value === 'boolean' && value ? "text-foreground" : "text-muted-foreground"}>
                                {typeof value === 'string' ? value : key.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
