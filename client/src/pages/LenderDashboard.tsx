import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, DollarSign, Heart } from "lucide-react";
import { Link } from "wouter";

export default function LenderDashboard() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          </div>

          {/* Quick Stats Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="text-3xl font-bold text-accent mb-2" data-testid="stat-loan-products">0</div>
                <div className="text-muted-foreground">Active Loan Products</div>
              </Card>
              <Card className="p-6">
                <div className="text-3xl font-bold text-accent mb-2" data-testid="stat-inquiries">0</div>
                <div className="text-muted-foreground">Investor Inquiries</div>
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
