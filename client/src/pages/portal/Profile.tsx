import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>

          <div className="grid gap-6">
            <Card data-testid="card-profile-info">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Username</p>
                    <p className="text-lg" data-testid="text-username">{user.username}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-lg" data-testid="text-email">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-lg" data-testid="text-fullname">
                      {user.profile?.fullName || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subscription Status</p>
                    <p className="text-lg capitalize" data-testid="text-subscription-status">
                      {user.subscriptionStatus.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-referral-code">
              <CardHeader>
                <CardTitle>Your Referral Code</CardTitle>
                <CardDescription>
                  Share this code to give friends 1 month free trial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <code 
                    className="text-2xl font-bold bg-muted px-4 py-2 rounded-md"
                    data-testid="text-referral-code"
                  >
                    {user.referralCode}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(user.referralCode);
                    }}
                    data-testid="button-copy-referral"
                  >
                    Copy Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/deal-analysis")}
                  data-testid="button-new-analysis"
                >
                  Start New Deal Analysis
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/rental-analysis")}
                  data-testid="button-rental-analysis"
                >
                  Rental Property Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
