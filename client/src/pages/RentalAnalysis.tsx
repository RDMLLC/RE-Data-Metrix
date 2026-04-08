import Layout from "@/components/Layout";
import RentalAnalysisWizard from "@/components/rental-analysis/RentalAnalysisWizard";
import { useAuth } from "@/contexts/AuthContext";
import MembershipPaywall from "@/components/MembershipPaywall";

export default function RentalAnalysis() {
  const { isSubscriber, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
                Rental Property Analysis
              </h1>
              <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Analyze potential rental properties with DSCR calculations and profitability projections.
              </p>
            </div>
            <MembershipPaywall 
              title="Rental Analysis Tool"
              description="Access our comprehensive rental property analysis wizard with DSCR calculations by becoming a member."
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <RentalAnalysisWizard />
    </Layout>
  );
}
