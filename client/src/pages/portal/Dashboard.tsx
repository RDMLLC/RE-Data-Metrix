import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  PlusCircle, 
  FolderOpen, 
  Heart, 
  LogOut, 
  Key,
  TrendingUp,
  TrendingDown,
  BarChart3
} from "lucide-react";

interface DealStats {
  totalDeals: number;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  savedLenders: number;
}

export default function MemberDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: stats } = useQuery<DealStats>({
    queryKey: ["/api/member/stats"],
  });

  useEffect(() => {
    const fetchMemberInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setMemberName(data.username || data.email?.split("@")[0] || "Member");
          setMemberEmail(data.email || "");
        } else {
          setLocation("/login");
        }
      } catch (error) {
        console.error("Failed to fetch member info");
        setLocation("/login");
      }
    };
    fetchMemberInfo();
  }, [setLocation]);

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
      setLocation("/");
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
    if (!memberEmail) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: memberEmail }),
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Password Reset Email Sent",
          description: `A password reset link has been sent to ${memberEmail}`,
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-member-title">Member Portal</h1>
              <p className="text-muted-foreground mt-2" data-testid="text-member-welcome">Welcome back, {memberName}</p>
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
                data-testid="button-member-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoading ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/deal-analysis")}
              data-testid="card-new-deal"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <PlusCircle className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>New Deal Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Start analyzing a new investment property with our comprehensive deal calculator
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/portal/deals")}
              data-testid="card-view-deals"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle>View Deals Analyzed</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Review your saved deals, track won/lost status, and access your deal history
                </CardDescription>
              </CardContent>
            </Card>

            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/portal/saved-lenders")}
              data-testid="card-saved-lenders"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <Heart className="h-5 w-5 text-destructive" />
                  </div>
                  <CardTitle>Saved Lenders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  View your favorite lenders that you've saved for quick access
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Quick Stats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold text-primary" data-testid="stat-total-deals">
                  {stats?.totalDeals ?? 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Deals</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-foreground" data-testid="stat-active-deals">
                  {stats?.activeDeals ?? 0}
                </div>
                <div className="text-sm text-muted-foreground">Active Deals</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-success" data-testid="stat-won-deals">
                    {stats?.wonDeals ?? 0}
                  </div>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div className="text-sm text-muted-foreground">Won Deals</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-destructive" data-testid="stat-lost-deals">
                    {stats?.lostDeals ?? 0}
                  </div>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                <div className="text-sm text-muted-foreground">Lost Deals</div>
              </Card>
            </div>
          </div>

          <Card className="p-6 bg-muted/30">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold text-foreground">Saved Lenders</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              You have <span className="font-semibold text-foreground" data-testid="stat-saved-lenders">{stats?.savedLenders ?? 0}</span> lenders saved to your favorites
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/portal/saved-lenders")}
              data-testid="button-view-saved-lenders"
            >
              View Saved Lenders
            </Button>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
