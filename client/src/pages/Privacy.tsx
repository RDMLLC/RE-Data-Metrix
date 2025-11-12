import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";

export default function Privacy() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary mb-4">Privacy Policy</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="p-8 prose prose-lg max-w-none">
          <p className="text-foreground">
            This is a placeholder for the Privacy Policy. Your privacy policy will be added here before launch.
          </p>
          <p className="text-muted-foreground">
            RE Data Metrix, LLC is committed to protecting your privacy and ensuring the security of your personal information.
          </p>
        </Card>
      </div>
    </Layout>
  );
}
