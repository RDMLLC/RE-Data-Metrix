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

interface ZohoStatus {
  configured: boolean;
  ready: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  hasOrganizationId: boolean;
}

interface ZohoPlan {
  code: string;
  name: string;
  price: number;
}

interface IntegrationStatus {
  name: string;
  description: string;
  configured: boolean;
  ready: boolean;
  details: Record<string, boolean>;
}

interface IntegrationsResponse {
  integrations: IntegrationStatus[];
}

export default function AdminIntegrations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [zohoStatus, setZohoStatus] = useState<ZohoStatus | null>(null);
  const [zohoPlans, setZohoPlans] = useState<ZohoPlan[]>([]);
  const [isConnectingZoho, setIsConnectingZoho] = useState(false);
  const [isTestingZoho, setIsTestingZoho] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [allIntegrations, setAllIntegrations] = useState<IntegrationStatus[]>([]);

  const fetchZohoStatus = async () => {
    try {
      const response = await fetch("/api/zoho/status", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setZohoStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Zoho status");
    } finally {
      setIsLoadingStatus(false);
    }
  };

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
    }
  };

  useEffect(() => {
    fetchZohoStatus();
    fetchAllIntegrations();
  }, []);

  const handleConnectZoho = async () => {
    setIsConnectingZoho(true);
    try {
      const response = await fetch("/api/zoho/auth", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          // Open in a new browser tab to avoid iframe restrictions
          // Zoho blocks OAuth in iframes for security
          window.open(data.authUrl, '_blank', 'noopener,noreferrer');
          toast({
            title: "Authorization Started",
            description: "Complete the authorization in the new tab, then return here and click Refresh",
          });
        }
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to start Zoho authorization",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to Zoho",
        variant: "destructive",
      });
    } finally {
      setIsConnectingZoho(false);
    }
  };

  const handleTestZoho = async () => {
    setIsTestingZoho(true);
    try {
      const response = await fetch("/api/zoho/test", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setZohoPlans(data.plans || []);
        toast({
          title: "Connection Successful",
          description: `Found ${data.plansFound} plans in Zoho Billing`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to Zoho Billing",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test Zoho connection",
        variant: "destructive",
      });
    } finally {
      setIsTestingZoho(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsLoadingStatus(true);
    await Promise.all([fetchZohoStatus(), fetchAllIntegrations()]);
    toast({
      title: "Status Refreshed",
      description: "Integration status has been updated",
    });
  };

  const getIntegrationIcon = (name: string) => {
    switch (name) {
      case "Zoho Billing":
        return <CreditCard className="h-6 w-6 text-blue-500" />;
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
      case "Zoho Billing":
        return "bg-blue-500/10";
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
            <Card data-testid="card-zoho-billing-integration">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Zoho Billing</CardTitle>
                      <CardDescription>
                        Subscription and payment processing
                      </CardDescription>
                    </div>
                  </div>
                  {zohoStatus?.ready ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : zohoStatus?.configured ? (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Needs Authorization
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not Configured
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Required Credentials</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {zohoStatus?.hasClientId ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={zohoStatus?.hasClientId ? "text-foreground" : "text-muted-foreground"}>
                          ZOHO_CLIENT_ID
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {zohoStatus?.hasClientSecret ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={zohoStatus?.hasClientSecret ? "text-foreground" : "text-muted-foreground"}>
                          ZOHO_CLIENT_SECRET
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {zohoStatus?.hasRefreshToken ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={zohoStatus?.hasRefreshToken ? "text-foreground" : "text-muted-foreground"}>
                          ZOHO_REFRESH_TOKEN
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {zohoStatus?.hasOrganizationId ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={zohoStatus?.hasOrganizationId ? "text-foreground" : "text-muted-foreground"}>
                          ZOHO_ORGANIZATION_ID
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Quick Links</h4>
                    <div className="space-y-2">
                      <a 
                        href="https://api-console.zoho.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Zoho API Console
                      </a>
                      <a 
                        href="https://billing.zoho.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Zoho Billing Dashboard
                      </a>
                      <a 
                        href="https://www.zoho.com/billing/api/v1/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        API Documentation
                      </a>
                    </div>
                  </div>
                </div>

                {zohoPlans.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Available Plans</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {zohoPlans.map((plan) => (
                        <div 
                          key={plan.code}
                          className="p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="font-medium text-sm">{plan.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Code: {plan.code}
                          </div>
                          {plan.price && (
                            <div className="text-sm mt-1">${plan.price}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t">
                  {!zohoStatus?.hasRefreshToken && zohoStatus?.configured && (
                    <Button 
                      onClick={handleConnectZoho}
                      disabled={isConnectingZoho}
                      data-testid="button-authorize-zoho"
                    >
                      {isConnectingZoho ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Authorize with Zoho
                        </>
                      )}
                    </Button>
                  )}
                  {zohoStatus?.ready && (
                    <Button 
                      variant="outline"
                      onClick={handleTestZoho}
                      disabled={isTestingZoho}
                      data-testid="button-test-zoho-connection"
                    >
                      {isTestingZoho ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  )}
                  {!zohoStatus?.configured && (
                    <p className="text-sm text-muted-foreground py-2">
                      Add ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET to Replit Secrets to get started.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Other Integrations */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Other Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allIntegrations
                  .filter(integration => integration.name !== "Zoho Billing")
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
                              {value ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className={value ? "text-foreground" : "text-muted-foreground"}>
                                {key.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}
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
