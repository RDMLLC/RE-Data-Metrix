import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { useMarketingEvents } from "@/components/MarketingPixelLoader";
import logoImg from "@assets/Transparent Logo_1762969260481.png";
import heroVideo from "@assets/A_better_way_for_investors_to_analyze_and_fund_their_deals_vid_1769901175597.mp4";
import { TrendingUp, Search, ShieldAlert, FileText } from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    text: "Instantly see cash-on-cash, ROI, and profit for any deal",
  },
  {
    icon: Search,
    text: "Compare lender funding options side-by-side",
  },
  {
    icon: ShieldAlert,
    text: "Spot bad deals early — before you overpay",
  },
  {
    icon: FileText,
    text: "Share clean reports with partners and lenders in minutes",
  },
];

function getPricingUrl() {
  const params = new URLSearchParams(window.location.search);
  const utm = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (key.startsWith("utm_") || key === "ref" || key === "code") {
      utm.set(key, value);
    }
  }
  if (!utm.has("ref")) utm.set("ref", "meta");
  if (!utm.has("utm_source")) utm.set("utm_source", "meta");
  const qs = utm.toString();
  return qs ? `/pricing?${qs}` : "/pricing";
}

export default function MobileMetaOffer() {
  const [, setLocation] = useLocation();
  const { trackLead, pixelsLoaded } = useMarketingEvents();
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (pixelsLoaded && !hasFiredRef.current) {
      trackLead({ content_name: "meta-offer-mobile" });
      hasFiredRef.current = true;
    }
  }, [pixelsLoaded, trackLead]);

  const handleCta = () => {
    setLocation(getPricingUrl());
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-meta-offer-mobile">
      <SEO
        title="Analyze Deals & Find Lenders | RE Data Metrix"
        description="Stop guessing on real estate deals. Analyze profitability, compare lenders, and close with confidence — free to start, no credit card required."
        canonicalUrl="https://redatametrix.com/meta-offer"
      />

      <header className="py-3 px-4" data-testid="header-meta-offer-mobile">
        <img
          src={logoImg}
          alt="RE Data Metrix"
          className="h-7 w-auto"
          data-testid="img-logo"
        />
      </header>

      <section className="bg-gradient-to-br from-primary via-primary/95 to-primary/90 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yIDJoMnYtMmgtMnYyem0wLTJ2LTJoLTJ2Mmgyem0tMiAwaDJ2LTJoLTJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10" />

        <div className="relative z-10 px-5 py-10 text-center">
          <h1 className="text-2xl font-bold text-white leading-tight mb-3" data-testid="heading-hero">
            Analyze Any Deal.{" "}
            <span className="text-accent">Find the Right Lender.</span>{" "}
            Close with Confidence.
          </h1>
          <p className="text-sm text-white/85 mb-6" data-testid="text-subheadline">
            Turn guesswork into data-driven decisions — know your profit, compare lenders, and move fast.
          </p>

          <div className="flex flex-col items-center gap-1.5">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground border-accent-border w-full"
              onClick={handleCta}
              data-testid="button-cta-hero"
            >
              See Plans & Pricing
            </Button>
          </div>
        </div>
      </section>

      <section className="py-8 px-5 bg-background">
        <h2 className="text-lg font-bold text-center mb-6" data-testid="heading-benefits">
          Everything you need to invest smarter
        </h2>
        <div className="space-y-5">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-3" data-testid={`benefit-${i}`}>
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                <b.icon className="h-4 w-4 text-accent" />
              </div>
              <p className="text-sm text-foreground leading-snug pt-1.5">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-8 px-5 bg-muted/50">
        <p className="text-muted-foreground text-xs text-center mb-6" data-testid="text-social-proof">
          Trusted by real estate investors across the U.S.
        </p>

        <div className="flex flex-col items-center gap-1.5 mb-8">
          <Button
            size="lg"
            className="bg-accent text-accent-foreground border-accent-border w-full"
            onClick={handleCta}
            data-testid="button-cta-bottom"
          >
            See Plans & Pricing
          </Button>
        </div>

        <div className="relative aspect-video bg-black rounded-md overflow-hidden shadow-lg border border-border">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            controls
            playsInline
            preload="none"
            data-testid="video-mobile"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </div>
      </section>
    </div>
  );
}
