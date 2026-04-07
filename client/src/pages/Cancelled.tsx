import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Users, Wrench, ArrowRight } from "lucide-react";

export default function Cancelled() {
  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-cancelled">
              Sorry to see you go
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Your account has been cancelled. We hope RE Data Metrix was useful during your time with us.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 pb-6">
              <p className="text-sm font-medium text-foreground mb-4">
                Here's what you had access to:
              </p>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <Calculator className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Deal Analysis Tool</p>
                    <p className="text-xs text-muted-foreground">Analyze any property investment in seconds</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Lenders Directory</p>
                    <p className="text-xs text-muted-foreground">Connect with private lenders ready to fund your deals</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Wrench className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Toolbox</p>
                    <p className="text-xs text-muted-foreground">A full suite of real estate investing calculators and resources</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Changed your mind? You're always welcome back.
            </p>
            <Link href="/pricing">
              <Button size="lg" data-testid="button-resubscribe">
                Resubscribe Here
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
