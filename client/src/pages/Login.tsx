import Layout from "@/components/Layout";
import PrelaunchForm from "@/components/PrelaunchForm";
import { Card } from "@/components/ui/card";

export default function Login() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            {/* Left Side - Value Prop */}
            <div className="lg:col-span-2 bg-primary text-primary-foreground rounded-lg p-12">
              <h2 className="text-4xl font-bold mb-6">Welcome to RE Data Metrix</h2>
              <div className="h-1 w-24 bg-accent mb-8"></div>
              <div className="space-y-4 text-lg">
                <p className="flex items-start gap-3">
                  <span className="text-accent mt-1">✓</span>
                  <span>Advanced deal analysis tools</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-accent mt-1">✓</span>
                  <span>Direct lender connections</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-accent mt-1">✓</span>
                  <span>One-click application flow</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-accent mt-1">✓</span>
                  <span>Comprehensive profitability analysis</span>
                </p>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="lg:col-span-3">
              <Card className="p-8 shadow-xl">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-primary mb-2">Join the Waitlist</h1>
                  <p className="text-muted-foreground">
                    We're launching soon! Sign up to get early access and be among the first to experience our platform.
                  </p>
                </div>
                <PrelaunchForm source="login_prelaunch" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
