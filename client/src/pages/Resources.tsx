import Layout from "@/components/Layout";
import ComingSoon from "@/components/ComingSoon";
import resourcesImg from "@assets/generated_images/Resources_and_learning_materials_43051e8c.png";

export default function Resources() {
  return (
    <Layout>
      <ComingSoon
        title="Toolbox"
        description="Tools are important in your business. Watch this space for solutions ranging from property management, to lead generation, legal, networking, and more."
        imageSrc={resourcesImg}
        imageAlt="Toolbox and Materials"
      />
    </Layout>
  );
}
