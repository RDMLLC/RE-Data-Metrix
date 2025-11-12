import Layout from "@/components/Layout";
import ComingSoon from "@/components/ComingSoon";
import lendersImg from "@assets/generated_images/Lenders_partnership_concept_image_281c2e15.png";

export default function Lenders() {
  return (
    <Layout>
      <ComingSoon
        title="Lender Network"
        description="Connect with verified lenders who specialize in real estate investment financing. Search by criteria, compare options, and submit applications directly through our platform. Creative financing solutions for every deal type."
        imageSrc={lendersImg}
        imageAlt="Lender Partnership Network"
      />
    </Layout>
  );
}
