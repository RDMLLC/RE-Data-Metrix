import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, DollarSign, Heart, MessageSquare, Loader2, Eye, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { LoanProduct } from "@shared/schema";
import { useLenderAuth } from "@/contexts/LenderAuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LenderDashboard() {
  const [, setLocation] = useLocation();
  const { isAdminPreview, refetchLender } = useLenderAuth();
  
  // Refetch lender data when this page mounts to ensure we have fresh data
  useEffect(() => {
    refetchLender();
  }, []);

  const { data: loanProducts, isLoading: loadingProducts } = useQuery<LoanProduct[]>({
    queryKey: ["/api/loan-products"],
    queryFn: async () => {
      const res = await fetch("/api/loan-products", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch loan products");
      return res.json();
    },
  });

  const { data: inquiryCount, isLoading: loadingInquiries } = useQuery<{ count: number }>({
    queryKey: ["/api/lender/inquiries/count"],
    queryFn: async () => {
      const res = await fetch("/api/lender/inquiries/count", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inquiry count");
      return res.json();
    },
  });

  const { data: savedByMembers, isLoading: loadingSaved } = useQuery({
    queryKey: ["/api/lender/saved-by"],
    queryFn: async () => {
      const res = await fetch("/api/lender/saved-by", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch saved by members");
      return res.json();
    },
  });

  const activeLoanProducts = loanProducts?.filter(p => p.isActive) || [];
  const totalInquiries = inquiryCount?.count || 0;
  const savedByCount = Array.isArray(savedByMembers) ? savedByMembers.length : 0;
  const isLoadingStats = loadingProducts || loadingInquiries || loadingSaved;

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isAdminPreview && (
            <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
              <Eye className="h-4 w-4 text-amber-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-amber-800 dark:text-amber-200">
                  You are viewing the Lender Portal as an admin. This is a preview of what lenders see.
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation("/admin/dashboard")}
                  className="ml-4"
                  data-testid="button-return-admin"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Admin
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">Lender Dashboard</h1>
            <div className="h-1 w-24 bg-accent"></div>
            <p className="text-lg text-muted-foreground mt-4">
              Manage your lender profile, questionnaire, and loan products
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Company Info Card */}
            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-primary">Company Info</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Update your company information, contact details, and business credentials
              </p>
              <Link href="/lender-company-info">
                <Button
                  className="w-full"
                  variant="default"
                  data-testid="button-company-info"
                >
                  Manage Company Info
                </Button>
              </Link>
            </Card>

            {/* Questionnaire Card */}
            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-primary">Questionnaire</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Complete your lender questionnaire to help investors find and connect with you
              </p>
              <Link href="/lender-questionnaire">
                <Button
                  className="w-full"
                  variant="default"
                  data-testid="button-questionnaire"
                >
                  Update Questionnaire
                </Button>
              </Link>
            </Card>

            {/* Loan Products Card */}
            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-primary">Loan Products</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Add, edit, and manage your loan products available to investors
              </p>
              <Link href="/lender-loan-products">
                <Button
                  className="w-full"
                  variant="default"
                  data-testid="button-loan-products"
                >
                  Manage Products
                </Button>
              </Link>
            </Card>

            {/* Who Saved You Card */}
            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <Heart className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-primary">Who Saved You</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                See which investors have saved your lender profile to their favorites
              </p>
              <Link href="/lender-saved-by">
                <Button
                  className="w-full"
                  variant="default"
                  data-testid="button-who-saved-you"
                >
                  View Saved By
                </Button>
              </Link>
            </Card>

            {/* Investor Inquiries Card */}
            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-primary">Investor Inquiries</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                View contact requests from investors interested in your loan products
              </p>
              <Link href="/lender-inquiries">
                <Button
                  className="w-full"
                  variant="default"
                  data-testid="button-investor-inquiries"
                >
                  View Inquiries
                </Button>
              </Link>
            </Card>
          </div>

          {/* Quick Stats Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="text-3xl font-bold text-accent mb-2" data-testid="stat-loan-products">
                  {loadingProducts ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    activeLoanProducts.length
                  )}
                </div>
                <div className="text-muted-foreground">Active Loan Products</div>
              </Card>
              <Card className="p-6">
                <div className="text-3xl font-bold text-accent mb-2" data-testid="stat-inquiries">
                  {loadingInquiries ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    totalInquiries
                  )}
                </div>
                <div className="text-muted-foreground">Investor Inquiries</div>
              </Card>
              <Card className="p-6">
                <div className="text-3xl font-bold text-accent mb-2" data-testid="stat-saved-by">
                  {loadingSaved ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    savedByCount
                  )}
                </div>
                <div className="text-muted-foreground">Saved By Investors</div>
              </Card>
              <Card className="p-6">
                <div className="text-3xl font-bold text-accent mb-2" data-testid="stat-profile-status">Pending</div>
                <div className="text-muted-foreground">Profile Status</div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
