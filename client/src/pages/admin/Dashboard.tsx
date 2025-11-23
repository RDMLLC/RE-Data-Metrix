import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Building2, BarChart3, LogOut, Key } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setAdminName(data.email?.split("@")[0] || "Admin");
          setAdminEmail(data.email || "");
        }
      } catch (error) {
        console.error("Failed to fetch admin info");
      }
    };
    fetchAdminInfo();
  }, []);

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

      console.log('Password reset response:', response.status, response.ok);
      if (response.ok) {
        console.log('Showing toast for email:', adminEmail);
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-elevate cursor-pointer" data-testid="card-user-management">
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

            <Card className="hover-elevate cursor-pointer" data-testid="card-lender-management">
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

            <Card className="hover-elevate cursor-pointer" data-testid="card-analytics">
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
          </div>

          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button className="w-full" data-testid="button-create-lender-invite">
                Create Lender Invite
              </Button>
              <Button variant="outline" className="w-full" data-testid="button-view-users">
                View All Users
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
