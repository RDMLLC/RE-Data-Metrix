import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Building2, BarChart3, LogOut, Key, Gift, Ticket, Plug, CheckCircle, AlertCircle, Loader2, Handshake, Calculator, Database, AlertTriangle } from "lucide-react";

interface StripeStatus {
  configured: boolean;
  ready: boolean;
}

interface DataHealth {
  affiliates: number;
  affiliateCategories: number;
  lenders: number;
  loanProducts: number;
  hasIssues: boolean;
  missingData: string[];
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [dataHealth, setDataHealth] = useState<DataHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          // Check if user is admin - redirect if not
          if (data.role !== 'admin') {
            toast({
              title: "Access Denied",
              description: "Admin privileges required. Please log in as admin.",
              variant: "destructive",
            });
            setLocation("/admin/login");
            return;
          }
          setAdminName(data.email?.split("@")[0] || "Admin");
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
    
    fetchAdminInfo();
    fetchStripeStatus();
    fetchDataHealth();
  }, [setLocation, toast]);

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
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dataHealth.lenders}</div>
                    <div className="text-sm text-muted-foreground">Lenders</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dataHealth.loanProducts}</div>
                    <div className="text-sm text-muted-foreground">Loan Products</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dataHealth.affiliates}</div>
                    <div className="text-sm text-muted-foreground">Affiliates</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dataHealth.affiliateCategories}</div>
                    <div className="text-sm text-muted-foreground">Categories</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/users")}
              data-testid="card-user-management"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>User Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage user accounts, verify emails, and handle subscriptions
                </CardDescription>
              </CardContent>
            </Card>

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

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/reports")}
              data-testid="card-analytics"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-success" />
                  </div>
                  <CardTitle>Analytics & Reporting</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  View platform metrics, usage statistics, and performance data
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/comp-users")}
              data-testid="card-comp-users"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Gift className="h-5 w-5 text-amber-500" />
                  </div>
                  <CardTitle>Comp Users</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Invite beta testers with complimentary premium access
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/discount-codes")}
              data-testid="card-discount-codes"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-purple-500" />
                  </div>
                  <CardTitle>Discount Codes</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Create and manage discount codes for partners and promotions
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/admin/integrations")}
              data-testid="card-integrations"
            >
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
                  Manage Stripe Billing and other external service connections
                </CardDescription>
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
              onClick={() => setLocation("/admin/calculations")}
              data-testid="card-calculations"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-indigo-500" />
                  </div>
                  <CardTitle>Calculations Reference</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Review all formulas and calculations used in deal analysis
                </CardDescription>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </Layout>
  );
}
