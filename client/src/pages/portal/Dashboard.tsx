import { type MouseEvent } from "react";
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
  TrendingUp,
  Copy,
  Gift,
  Search,
  HardHat
} from "lucide-react";

interface MemberStats {
  totalDeals: number;
  draftDeals: number;
  finalDeals: number;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  savedLenders: number;
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<MemberStats>({
    queryKey: ["/api/member/stats"],
  });

  const copyReferralCode = (e: MouseEvent) => {
    e.stopPropagation();
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const getSubscriptionBadge = (status: string, plan?: string | null, hasStripeSubscription?: boolean) => {
    switch (status) {
      case "active":
        // Show plan type: Free (no Stripe subscription), Monthly, or Annual
        if (hasStripeSubscription) {
          if (plan === 'annual') {
            return <Badge className="bg-green-500/10 text-green-600 border-green-200">Annual</Badge>;
          }
          return <Badge className="bg-green-500/10 text-green-600 border-green-200">Monthly</Badge>;
        }
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">Free</Badge>;
      case "comped":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">Comped</Badge>;
      case "referral_trial":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Trial</Badge>;
      case "free":
      default:
        return <Badge variant="secondary">Free</Badge>;
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-welcome">
              Welcome back, {displayName}!
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Subscription:</span>
              {getSubscriptionBadge(user.subscriptionStatus || "free", user.subscriptionPlan, !!user.stripeSubscriptionId)}
            </div>
          </div>

          {/* 2x3 Grid of Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Row 1: Start Deal Analysis | Deals Analyzed | Tools & Resources */}
            
            {/* Start Deal Analysis */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/deal-analysis")}
              data-testid="card-start-deal-analysis"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">Start Deal Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Analyze a new investment property with detailed projections
                </CardDescription>
              </CardContent>
            </Card>

            {/* Deals Analyzed - Clickable */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/portal/deals")}
              data-testid="card-deals-analyzed"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Deals Analyzed</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary mb-1">
                  {statsLoading ? "..." : stats?.totalDeals || 0}
                </p>
                <CardDescription>Click to view history</CardDescription>
              </CardContent>
            </Card>

            {/* Tools & Resources */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/toolbox")}
              data-testid="card-tools-resources"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-base">Tools & Resources</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Access calculators, guides, and educational content
                </CardDescription>
              </CardContent>
            </Card>

            {/* Row 2: Search Lenders | Saved Lenders | Refer a Friend */}

            {/* Search Lenders */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/lenders")}
              data-testid="card-search-lenders"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Search className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-base">Search Lenders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Find and compare financing options from our lender network
                </CardDescription>
              </CardContent>
            </Card>

            {/* Saved Lenders */}
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation("/portal/saved-lenders")}
              data-testid="card-saved-lenders"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-base">Saved Lenders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-accent mb-1">
                  {statsLoading ? "..." : stats?.savedLenders || 0}
                </p>
                <CardDescription>Lenders you've bookmarked</CardDescription>
              </CardContent>
            </Card>

            {/* Contractor Portal - shown if user is also a contractor */}
            {user?.isContractor && (
              <Card 
                className="hover-elevate cursor-pointer"
                onClick={() => { window.location.href = "/contractor-portal"; }}
                data-testid="card-contractor-portal"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <HardHat className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-base">Contractor Portal</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Access your contractor dashboard, referrals, and documents
                  </CardDescription>
                </CardContent>
              </Card>
            )}

            {/* Refer a Friend - Coming Soon */}
            <Card 
              data-testid="card-refer-friend"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Gift className="h-5 w-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-base">Refer a Friend</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* Blurred code section with Coming Soon overlay */}
                <div className="relative mb-2">
                  <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg blur-sm pointer-events-none select-none">
                    <code className="text-lg font-bold flex-1">
                      XXXXXXXX
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled
                      className="h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-md font-semibold text-sm shadow-lg">
                      Coming Soon
                    </div>
                  </div>
                </div>
                <CardDescription className="space-y-1">
                  <span className="block">Give a friend <span className="font-semibold text-green-600">1 month free</span></span>
                  <span className="block">You get <span className="font-semibold text-green-600">2 months free</span> with their paid subscription</span>
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
