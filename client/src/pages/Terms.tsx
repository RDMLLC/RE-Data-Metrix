import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary mb-4">Terms of Service</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="p-8 prose prose-lg max-w-none">
          <p className="text-foreground">
            This is a placeholder for the Terms of Service. Your terms will be added here before launch.
          </p>
          <p className="text-muted-foreground">
            By using RE Data Metrix services, you agree to our terms and conditions.
          </p>
        </Card>
      </div>
    </Layout>
  );
}
