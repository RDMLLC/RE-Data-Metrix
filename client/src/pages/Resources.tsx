import Layout from "@/components/Layout";
import ComingSoon from "@/components/ComingSoon";
import resourcesImg from "@assets/generated_images/Resources_and_learning_materials_43051e8c.png";

export default function Resources() {
  return (
    <Layout>
      <ComingSoon
        title="Additional Resources"
        description="Educational content, market insights, and tools to help you become a more successful real estate investor. From beginner guides to advanced strategies, we've got you covered."
        imageSrc={resourcesImg}
        imageAlt="Learning Resources and Materials"
      />
    </Layout>
  );
}
