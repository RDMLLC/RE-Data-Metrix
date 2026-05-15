import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

const FEATURES = [
  "Calculate cash-on-cash return",
  "Compare loan products",
  "Analyze fix & flip and rental deals",
];

export default function DealAnalysisAbout() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Real Estate Deal Analyzer"
        description="Analyze fix & flip and rental property deals on the go. Calculate cash-on-cash return and compare loan products instantly."
        canonicalUrl="/deal-analysis/about"
      />

      <header className="px-4 py-3 border-b border-border flex items-center gap-2">
        <img src={logoImg} alt="RE Data Metrix" className="h-9 w-9" />
        <span className="font-bold text-lg text-primary">RE Data Metrix</span>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl w-full mx-auto space-y-6">
        <section className="space-y-3">
          <h1
            className="text-3xl font-bold leading-tight"
            data-testid="text-page-title"
          >
            Real Estate Deal Analyzer
          </h1>
          <p className="text-base text-muted-foreground">
            Underwrite fix & flip and rental properties in minutes. Plug in
            purchase, rehab, and financing details to see profitability,
            cash-on-cash return, and side-by-side loan comparisons — all from
            your phone.
          </p>
        </section>

        <section
          className="relative w-full rounded-md overflow-hidden bg-muted"
          style={{ aspectRatio: "16 / 9" }}
        >
          <iframe
            src="https://www.youtube.com/embed/m6SjKQ3dYe4"
            title="RE Data Metrix Deal Analyzer Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
            data-testid="iframe-demo-video"
          />
        </section>

        <Button
          size="lg"
          className="w-full"
          onClick={() => setLocation("/deal-analysis")}
          data-testid="button-launch-calculator"
        >
          Launch Calculator
        </Button>

        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold">What you can do</h2>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-sm"
                data-testid={`text-feature-${f.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
