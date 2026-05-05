import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { useMarketingEvents } from "@/components/MarketingPixelLoader";
import logoImg from "@assets/Transparent Logo_1762969260481.png";
import { TrendingUp, Search, ShieldAlert, FileText } from "lucide-react";

const YOUTUBE_VIDEO_ID = "WkuAgslCrrM";
const YOUTUBE_EMBED_URL = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;

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

export default function MetaOffer() {
  const [, setLocation] = useLocation();
  const { trackLead, pixelsLoaded } = useMarketingEvents();
  const hasFiredRef = useRef(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleUnmute = () => {
    const iframe = document.getElementById("yt-player") as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "unMute", args: [] }),
        "*"
      );
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setVolume", args: [100] }),
        "*"
      );
    }
    setIsMuted(false);
  };

  useEffect(() => {
    if (pixelsLoaded && !hasFiredRef.current) {
      trackLead({ content_name: "meta-offer" });
      hasFiredRef.current = true;
    }
  }, [pixelsLoaded, trackLead]);

  const handleCta = () => {
    setLocation(getPricingUrl());
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0" data-testid="page-meta-offer">
      <SEO
        title="Analyze Deals & Find the Right Lender"
        description="Stop guessing on real estate deals. Analyze profitability, compare lenders, and close with confidence — free to start, no credit card required."
        canonicalUrl="https://redatametrix.com/meta-offer"
      />

      <header className="py-4 px-6" data-testid="header-meta-offer">
        <img
          src={logoImg}
          alt="RE Data Metrix"
          className="h-8 w-auto"
          data-testid="img-logo"
        />
      </header>

      {/* 1. Headline */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-primary/90 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yIDJoMnYtMmgtMnYyem0wLTJ2LTJoLTJ2Mmgyem0tMiAwaDJ2LTJoLTJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-10 pb-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3" data-testid="heading-hero">
            Analyze Any Deal.{" "}
            <span className="text-accent">Find the Right Lender.</span>{" "}
            Close with Confidence.
          </h1>
          <p className="text-lg text-white/85" data-testid="text-subheadline">
            Turn guesswork into data-driven decisions — know your profit, compare lenders, and move fast.
          </p>
          <p className="text-sm text-white/60 mt-3" data-testid="text-social-proof-hero">
            Built by Investors for Investors.
          </p>
        </div>
      </section>

      {/* 2. Video — YouTube embed */}
      <section className="bg-gradient-to-br from-primary/90 to-primary/80 pb-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="relative aspect-video bg-black rounded-md overflow-hidden shadow-xl border border-white/20">
            <iframe
              id="yt-player"
              src={YOUTUBE_EMBED_URL}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ border: 0 }}
              data-testid="video-main"
            />
            {isMuted && (
              <button
                type="button"
                onClick={handleUnmute}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors"
                data-testid="button-unmute-video"
              >
                🔇 Tap to unmute
              </button>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 mt-6">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground border-accent-border w-full sm:w-auto"
              onClick={handleCta}
              data-testid="button-cta-video"
            >
              Start Analyzing Deals for Free
            </Button>
          </div>
        </div>
      </section>

      {/* 3. Benefits */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-10" data-testid="heading-benefits">
            Everything you need to invest smarter
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-4" data-testid={`benefit-${i}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-accent" />
                </div>
                <p className="text-base text-foreground leading-snug pt-2">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Closing CTA */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-muted-foreground text-sm mb-8" data-testid="text-social-proof">
            Trusted by real estate investors across the U.S.
          </p>

          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground border-accent-border w-full sm:w-auto"
              onClick={handleCta}
              data-testid="button-cta-bottom"
            >
              Start Analyzing Deals for Free
            </Button>
          </div>
        </div>
      </section>

      {/* 5. Sticky mobile CTA bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary border-t border-white/20 shadow-lg px-4 py-3"
        data-testid="sticky-mobile-cta"
      >
        <Button
          size="lg"
          className="bg-accent text-accent-foreground border-accent-border w-full"
          onClick={handleCta}
          data-testid="button-cta-sticky"
        >
          Start Analyzing Deals for Free
        </Button>
      </div>
    </div>
  );
}
