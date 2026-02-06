import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Building2, BarChart3, LogOut, Key, Gift, Ticket, Plug, CheckCircle, AlertCircle, Loader2, Handshake, Calculator, Database, AlertTriangle, Video, Monitor, RefreshCw, Link2, Code, HardHat, Target } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";

interface StripeStatus {
  configured: boolean;
  ready: boolean;
}

interface DataHealth {
  affiliates: number;
  activeAffiliates: number;
  affiliateCategories: number;
  lenders: number;
  loanProducts: number;
  trainingVideos: number;
  hasIssues: boolean;
  missingData: string[];
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [dataHealth, setDataHealth] = useState<DataHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);
  const [isTogglingDemoMode, setIsTogglingDemoMode] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const isAdmin = userRole === 'admin';
  const isDeveloper = userRole === 'developer';
  const isAuditor = userRole === 'auditor';

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          // Check if user is admin or developer - redirect if not
          if (data.role !== 'admin' && data.role !== 'developer' && data.role !== 'auditor') {
            toast({
              title: "Access Denied",
              description: "Admin or developer privileges required.",
              variant: "destructive",
            });
            setLocation("/admin/login");
            return;
          }
          setUserRole(data.role);
          setAdminName(data.email?.split("@")[0] || (data.role === 'developer' ? 'Developer' : data.role === 'auditor' ? 'Auditor' : 'Admin'));
          setAdminEmail(data.email || "");
        } else {
          // Not authenticated - redirect to admin login
          setLocation("/admin/login");
          return;
        }
      } catch (error) {
        console.error("Failed to fetch admin info");
        setLocation("/admin/login");
        return;
      } finally {
        setIsAuthChecking(false);
      }
    };
    
    const fetchStripeStatus = async () => {
      try {
        const response = await fetch("/api/admin/integrations/status", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const stripe = data.integrations?.find((i: any) => i.name === "Stripe Billing");
          if (stripe) {
            setStripeStatus({ configured: stripe.configured, ready: stripe.ready });
          }
        }
      } catch (error) {
        console.error("Failed to fetch Stripe status");
      }
    };
    
    const fetchDataHealth = async () => {
      setIsLoadingHealth(true);
      try {
        const response = await fetch("/api/admin/data-health", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setDataHealth(data);
        }
      } catch (error) {
        console.error("Failed to fetch data health");
      } finally {
        setIsLoadingHealth(false);
      }
    };
    
    const fetchDemoMode = async () => {
      try {
        const response = await fetch("/api/admin/settings/demo_mode", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setDemoModeEnabled(data.value === "true");
        }
      } catch (error) {
        console.error("Failed to fetch demo mode status");
      }
    };

    fetchAdminInfo();
    fetchStripeStatus();
    fetchDataHealth();
    fetchDemoMode();
  }, [setLocation, toast]);

  const handleToggleDemoMode = async () => {
    setIsTogglingDemoMode(true);
    try {
      const newValue = !demoModeEnabled;
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: "demo_mode", value: String(newValue) }),
      });
      if (response.ok) {
        setDemoModeEnabled(newValue);
        // Invalidate the demo mode cache so ToolFinder gets the new value
        queryClient.invalidateQueries({ queryKey: ["/api/settings/demo-mode"] });
        toast({
          title: newValue ? "Demo Mode Enabled" : "Demo Mode Disabled",
          description: newValue 
            ? "Tool Finder now shows placeholder affiliates" 
            : "Tool Finder now shows real affiliates",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle demo mode",
        variant: "destructive",
      });
    } finally {
      setIsTogglingDemoMode(false);
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch("/api/admin/seed-database", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Database Seeded",
          description: data.message || "Baseline data has been populated",
        });
        // Refresh data health to show new counts
        const healthResponse = await fetch("/api/admin/data-health", {
          credentials: "include",
        });
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setDataHealth(healthData);
        }
      } else {
        const error = await response.json();
        toast({
          title: "Seeding Failed",
          description: error.error || "Failed to seed database",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed database",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Show loading while checking auth
  if (isAuthChecking) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      toast({
        title: "Logged Out",
        description: "You've been successfully logged out.",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Unable to determine admin email",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: adminEmail }),
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Password Reset Email Sent",
          description: `A password reset link has been sent to ${adminEmail}`,
        });
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to send password reset email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isDeveloper ? 'Developer Dashboard' : 'Admin Dashboard'}
              </h1>
              <p className="text-muted-foreground mt-2">Welcome, {adminName}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                data-testid="button-change-password"
              >
                <Key className="h-4 w-4 mr-2" />
                {isChangingPassword ? "Sending..." : "Change Password"}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={isLoading}
                data-testid="button-admin-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoading ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>

          {dataHealth && (
            <Card className={`mb-8 ${dataHealth.hasIssues ? 'border-amber-500' : 'border-green-500'}`} data-testid="card-data-health">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dataHealth.hasIssues ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
                    <Database className={`h-5 w-5 ${dataHealth.hasIssues ? 'text-amber-500' : 'text-green-500'}`} />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Database Overview
                      {dataHealth.hasIssues ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-500">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Missing Data
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Healthy
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {dataHealth.hasIssues 
                        ? `Missing: ${dataHealth.missingData.join(', ')}`
                        : 'Production data protected by point-in-time restore'
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dataHealth.lenders}</div>
                    <div className="text-sm text-muted-foreground">Lenders</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dataHealth.loanProducts}</div>
                    <div className="text-sm text-muted-foreground">Loan Products</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {dataHealth.activeAffiliates}/{dataHealth.affiliates}
                    </div>
                    <div className="text-sm text-muted-foreground">Active/Total Affiliates</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dataHealth.affiliateCategories}</div>
                    <div className="text-sm text-muted-foreground">Categories</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dataHealth.trainingVideos}</div>
                    <div className="text-sm text-muted-foreground">Videos</div>
                  </div>
                </div>
              </CardContent>
              {isAdmin && !isAuditor && (
                <CardFooter className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSeedDatabase}
                    disabled={isSeeding}
                    data-testid="button-seed-database"
                  >
                    {isSeeding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Seeding...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Seed Database
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(isAdmin || isAuditor) && (
              <Card data-testid="card-user-management">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>User Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">
                    Manage user accounts, verify emails, and handle subscriptions
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/users")}
                      data-testid="button-users"
                    >
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Users
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/comp-users")}
                      data-testid="button-comp-users"
                    >
                      <Gift className="h-3.5 w-3.5 mr-1.5" />
                      Comp Users
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/discount-codes")}
                      data-testid="button-discount-codes"
                    >
                      <Ticket className="h-3.5 w-3.5 mr-1.5" />
                      Discount Codes
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/promo-codes")}
                      data-testid="button-promo-codes"
                    >
                      <Key className="h-3.5 w-3.5 mr-1.5" />
                      Promo Codes
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/webinar-registrations")}
                      data-testid="button-webinar-registrations"
                    >
                      <Video className="h-3.5 w-3.5 mr-1.5" />
                      Webinar Signups
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/referral-partners")}
                      data-testid="button-referral-partners"
                    >
                      <Handshake className="h-3.5 w-3.5 mr-1.5" />
                      Referral Partners
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/lenders")}
              data-testid="card-lender-management"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle>Lender Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Create invites, manage lender profiles, and handle onboarding
                </CardDescription>
              </CardContent>
            </Card>

            {(isAdmin || isAuditor) && (
              <Card data-testid="card-analytics">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-success" />
                    </div>
                    <CardTitle>Analytics & Reporting</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-3">
                    View platform metrics, usage statistics, and performance data
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/reports")}
                      data-testid="button-reports"
                    >
                      <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                      Reports
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/calculations")}
                      data-testid="button-calculations"
                    >
                      <Calculator className="h-3.5 w-3.5 mr-1.5" />
                      Calculations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-integrations">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Plug className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>Integrations</CardTitle>
                      {stripeStatus?.ready ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : stripeStatus?.configured ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Setup Required
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage external service connections and CRM integrations
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation("/admin/integrations")}
                    data-testid="button-system-integrations"
                  >
                    <Plug className="h-3.5 w-3.5 mr-1.5" />
                    System Status
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation("/admin/developer-integrations")}
                    data-testid="button-developer-integrations"
                  >
                    <Code className="h-3.5 w-3.5 mr-1.5" />
                    CRM Portal
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/affiliates")}
              data-testid="card-affiliates"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
                    <Handshake className="h-5 w-5 text-teal-500" />
                  </div>
                  <CardTitle>Affiliate Programs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage partner affiliate programs displayed in the Toolbox
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/contractors")}
              data-testid="card-contractors"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <HardHat className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle>Contractors</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage general contractors and their service regions
                </CardDescription>
              </CardContent>
            </Card>

            {(isAdmin || isAuditor) && (
              <Card 
                className="hover-elevate cursor-pointer" 
                onClick={() => setLocation("/admin/marketing-pixels")}
                data-testid="card-marketing-pixels"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-purple-500" />
                    </div>
                    <CardTitle>Marketing Pixels</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Manage tracking pixels for Facebook, LinkedIn, Google Ads, and more
                  </CardDescription>
                </CardContent>
              </Card>
            )}

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/training-videos")}
              data-testid="card-training-videos"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center">
                    <Video className="h-5 w-5 text-rose-500" />
                  </div>
                  <CardTitle>Training Videos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage educational videos displayed in the Toolbox
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {isAdmin && !isAuditor && (
            <Card className="mt-6" data-testid="card-demo-mode">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <Monitor className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Demo Mode
                        {demoModeEnabled && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            Active
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Show placeholder affiliates in Tool Finder for marketing videos
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation("/admin/demo-links")}
                      data-testid="button-demo-links"
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      Demo Links
                    </Button>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="demo-mode-toggle" className="text-sm text-muted-foreground">
                        {demoModeEnabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id="demo-mode-toggle"
                        checked={demoModeEnabled}
                        onCheckedChange={handleToggleDemoMode}
                        disabled={isTogglingDemoMode}
                        data-testid="switch-demo-mode"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

        </div>
      </div>
    </Layout>
  );
}
