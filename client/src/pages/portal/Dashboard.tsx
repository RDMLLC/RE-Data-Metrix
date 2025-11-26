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
      <div className="min-h-[calc(100vh-16rem)] py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-welcome">
                Welcome back, {displayName}!
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-muted-foreground">Subscription:</span>
                {getSubscriptionBadge(user.subscriptionStatus || "inactive")}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                data-testid="button-change-password"
              >
                <Key className="h-4 w-4 mr-2" />
                {isChangingPassword ? "Sending..." : "Change Password"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/portal/profile")}
                data-testid="button-edit-profile"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? "..." : "Logout"}
              </Button>
            </div>
          </div>

          {/* KPI Cards - 2 cards side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Deals Analyzed - Clickable */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/portal/deals")}
              data-testid="card-kpi-deals"
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Deals Analyzed</p>
                    <p className="text-3xl font-bold text-primary">
                      {statsLoading ? "..." : stats?.totalDeals || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Click to view history</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saved Lenders */}
            <Card data-testid="card-kpi-lenders">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saved Lenders</p>
                    <p className="text-3xl font-bold text-accent">
                      {statsLoading ? "..." : stats?.savedLenders || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Lenders you've bookmarked</p>
                  </div>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - 3 cards */}
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/deal-analysis")}
              data-testid="card-action-deal-analysis"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Start Deal Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Analyze a new investment property
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/lenders")}
              data-testid="card-action-browse-lenders"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-base">Browse Lenders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Find and compare financing options
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/toolbox")}
              data-testid="card-action-toolbox"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-base">Toolbox & Resources</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Access tools, guides, and education
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Recent Deals & Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Deals - Takes 2 columns */}
            <div className="lg:col-span-2">
              <Card data-testid="card-recent-deals">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle>Recent Deals</CardTitle>
                    <CardDescription>Your latest deal analyses</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/portal/deals")}
                    data-testid="button-view-all-deals"
                  >
                    View All
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {dealsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading deals...
                    </div>
                  ) : recentDeals && recentDeals.length > 0 ? (
                    <div className="space-y-3">
                      {recentDeals.slice(0, 5).map((deal) => (
                        <div
                          key={deal.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate cursor-pointer gap-2"
                          onClick={() => setLocation(`/deal-analysis?dealId=${deal.id}`)}
                          data-testid={`deal-row-${deal.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {deal.propertyAddress || "Property Address"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {deal.city}, {deal.state}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-7 sm:ml-0">
                            {getStatusBadge(deal.status)}
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {deal.createdAt && formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">No deals yet</p>
                      <Button onClick={() => setLocation("/deal-analysis")} data-testid="button-start-first-deal">
                        Start Your First Deal Analysis
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Cards */}
            <div className="space-y-6">
              {/* Refer & Earn Card */}
              <Card data-testid="card-referrals">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-green-600" />
                    <CardTitle>Refer & Earn</CardTitle>
                  </div>
                  <CardDescription>
                    Share your code with friends. When they sign up for a paid subscription, you get <span className="font-semibold text-green-600">2 months free!</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-2 bg-muted px-4 py-3 rounded-lg">
                    <code className="text-xl font-bold" data-testid="text-referral-code">
                      {user.referralCode || "N/A"}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
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
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Username</span>
                    <span className="font-medium">{user.username}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium truncate ml-2 max-w-[150px]">{user.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {getSubscriptionBadge(user.subscriptionStatus || "inactive")}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
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
