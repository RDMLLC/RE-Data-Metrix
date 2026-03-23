import Layout from "@/components/Layout";
import DealAnalysisWizard from "@/components/deal-analysis/DealAnalysisWizard";
import { SEO } from "@/components/SEO";

export default function DealAnalysis() {
  return (
    <Layout>
      <SEO
        title="Real Estate Deal Analyzer"
        description="Analyze real estate deals, compare loan options, and calculate ROI. Built for fix and flip and wholesale investors."
        canonicalUrl="https://redatametrix.com/deal-analysis"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
            Real Estate Deal Analyzer for Smarter Investment Decisions
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mb-3">
            <strong><em>real estate deal analyzer</em></strong> designed for fix and flip and wholesale investors who need to evaluate deals quickly, compare financing options, and maximize profitability.
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Instantly calculate cash on cash return, ROI, and total project costs while comparing loan products side by side. Make confident decisions before committing to your next investment.
          </p>
        </div>

        <DealAnalysisWizard />

        <section className="mt-16 mb-8 max-w-3xl">
          <h2 className="text-2xl font-bold text-primary mb-4">How Our Deal Analysis Tool Works</h2>
          <p className="text-muted-foreground mb-6">
            Our platform helps investors break down every part of a deal, from purchase price to financing structure, so you can clearly see profitability before moving forward.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Compare Loan Options</h3>
          <p className="text-muted-foreground mb-6">
            Evaluate multiple loan products side by side to understand how each option impacts your returns and overall investment strategy.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Calculate Key Investment Metrics</h3>
          <p className="text-muted-foreground mb-6">
            Analyze cash on cash return, annualized ROI, and total profit so you know exactly what to expect from your deal.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Make Faster Investment Decisions</h3>
          <p className="text-muted-foreground">
            With real-time insights and clear financial modeling, you can confidently move forward on deals that meet your criteria.
          </p>
        </section>
      </div>
    </Layout>
  );
}
