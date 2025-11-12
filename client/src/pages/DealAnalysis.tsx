import Layout from "@/components/Layout";
import ComingSoon from "@/components/ComingSoon";
import dealAnalysisImg from "@assets/generated_images/Deal_analysis_dashboard_preview_c0bac1cf.png";

export default function DealAnalysis() {
  return (
    <Layout>
      <ComingSoon
        title="Deal Analysis"
        description="There are so many funding scenarios available, it can be hard to determine which is the best. Additionally, there are so many 'hidden' costs associated with real estate. Costs like lenders' fees, title search and insurance, utilities, property insurance, and HOA fees can erode profitability without you even realizing it. Let us help you find the most profitable loan for your deal."
        imageSrc={dealAnalysisImg}
        imageAlt="Deal Analysis Dashboard Preview"
      />
    </Layout>
  );
}
