import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator, 
  Building2, 
  Wrench, 
  Users, 
  TrendingUp,
  Clock,
  Copy,
  LogOut,
  Pencil,
  ExternalLink,
  MapPin,
  Key,
  Gift,
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MemberStats {
  totalDeals: number;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  savedLenders: number;
}

interface SavedDeal {
  id: string;
  propertyAddress: string;
  city: string;
  state: string;
  purchasePrice: string;
  status: string;
  createdAt: string;
}

export default function MemberDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<MemberStats>({
    queryKey: ["/api/member/stats"],
  });

  const { data: recentDeals, isLoading: dealsLoading } = useQuery<SavedDeal[]>({
    queryKey: ["/api/member/deals"],
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Unable to determine your email",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Password Reset Email Sent",
          description: `A password reset link has been sent to ${user.email}`,
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

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Won</Badge>;
      case "lost":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Lost</Badge>;
      case "active":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Active</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
      case "comped":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">Comped</Badge>;
      case "referral_trial":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Trial</Badge>;
      default:
        return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const displayName = user.profile?.fullName || user.username || "Member";

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-welcome">
                Welcome back, {displayName}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">Subscription:</span>
                {getSubscriptionBadge(user.subscriptionStatus || "inactive")}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                data-testid="button-change-password"
              >
                <Key className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline text-xs">{isChangingPassword ? "..." : "Password"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/portal/profile")}
                data-testid="button-edit-profile"
              >
                <Pencil className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline text-xs">Profile</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline text-xs">{isLoggingOut ? "..." : "Logout"}</span>
              </Button>
            </div>
          </div>

          {/* KPI Cards - 2 columns on mobile, row on desktop */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Deals Analyzed - Clickable */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/portal/deals")}
              data-testid="card-kpi-deals"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Deals Analyzed</p>
                    <p className="text-2xl font-bold text-primary">
                      {statsLoading ? "..." : stats?.totalDeals || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saved Lenders */}
            <Card data-testid="card-kpi-lenders">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Saved Lenders</p>
                    <p className="text-2xl font-bold text-accent">
                      {statsLoading ? "..." : stats?.savedLenders || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - 3 cards in a row */}
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/deal-analysis")}
              data-testid="card-action-deal-analysis"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calculator className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Start Deal Analysis</p>
                    <p className="text-xs text-muted-foreground">Analyze a property</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/lenders")}
              data-testid="card-action-browse-lenders"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Browse Lenders</p>
                    <p className="text-xs text-muted-foreground">Compare financing</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/toolbox")}
              data-testid="card-action-toolbox"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wrench className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Toolbox</p>
                    <p className="text-xs text-muted-foreground">Resources & guides</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Deals & Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Deals */}
            <div className="lg:col-span-2">
              <Card data-testid="card-recent-deals">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <div>
                    <CardTitle className="text-base">Recent Deals</CardTitle>
                    <CardDescription className="text-xs">Your latest analyses</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/portal/deals")}
                    data-testid="button-view-all-deals"
                  >
                    View All
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {dealsLoading ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      Loading deals...
                    </div>
                  ) : recentDeals && recentDeals.length > 0 ? (
                    <div className="space-y-2">
                      {recentDeals.slice(0, 4).map((deal) => (
                        <div
                          key={deal.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-muted/50 rounded-lg hover-elevate cursor-pointer gap-1.5"
                          onClick={() => setLocation(`/deal-analysis?dealId=${deal.id}`)}
                          data-testid={`deal-row-${deal.id}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {deal.propertyAddress || "Property Address"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {deal.city}, {deal.state}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-5 sm:ml-0">
                            {getStatusBadge(deal.status)}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {deal.createdAt && formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">No deals yet</p>
                      <Button size="sm" onClick={() => setLocation("/deal-analysis")} data-testid="button-start-first-deal">
                        Start Your First Deal
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Refer & Earn + Account */}
            <div className="space-y-4">
              {/* Refer & Earn Card */}
              <Card data-testid="card-referrals">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base">Refer & Earn</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-3">
                    Share your code with friends. When they sign up for a paid subscription, you get <span className="font-semibold text-green-600">2 months free!</span>
                  </p>
                  <div className="flex items-center justify-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <code className="text-lg font-bold" data-testid="text-referral-code">
                      {user.referralCode || "N/A"}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={copyReferralCode}
                      disabled={!user.referralCode}
                      data-testid="button-copy-referral"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Account Summary Card */}
              <Card data-testid="card-account-summary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Account</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Username</span>
                    <span className="font-medium">{user.username}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium truncate ml-2 max-w-[140px] text-xs">{user.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {getSubscriptionBadge(user.subscriptionStatus || "inactive")}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setLocation("/portal/profile")}
                    data-testid="button-manage-account"
                  >
                    Manage Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
