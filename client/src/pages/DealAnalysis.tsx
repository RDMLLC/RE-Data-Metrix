import Layout from "@/components/Layout";
import ComingSoon from "@/components/ComingSoon";
import dealAnalysisImg from "@assets/generated_images/Deal_analysis_dashboard_preview_c0bac1cf.png";

export default function DealAnalysis() {
  return (
    <Layout>
      <ComingSoon
        title="Deal Analysis"
        description="Advanced profitability analysis tools that go beyond standard deal calculators. Analyze multiple scenarios, model cash flows, assess risks, and compare financing options—all in one comprehensive platform."
        imageSrc={dealAnalysisImg}
        imageAlt="Deal Analysis Dashboard Preview"
      />
    </Layout>
  );
}
