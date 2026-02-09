import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, CheckCircle, Star, Tag, Play, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Affiliate } from "@shared/schema";

interface BrandColors {
  primary: string;
  dark: string;
  accent: string;
}

const brandColorMap: Record<string, BrandColors> = {
  "deal-machine": {
    primary: "#31CCE5",
    dark: "#004E64",
    accent: "#F2633A",
  },
};

function getYouTubeVideoId(url: string): string | null {
  if (url.includes("youtube.com/watch")) {
    return new URL(url).searchParams.get("v") || null;
  } else if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1]?.split("?")[0] || null;
  }
  return null;
}

function getVideoEmbed(url: string): string {
  if (url.includes("vimeo.com")) {
    const videoId = url.split("vimeo.com/")[1]?.split("?")[0] || "";
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return url;
}

export default function AffiliateDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: affiliate, isLoading, error } = useQuery<Affiliate>({
    queryKey: ["/api/affiliates/by-slug", slug],
    queryFn: async () => {
      const response = await fetch(`/api/affiliates/by-slug/${slug}`);
      if (!response.ok) throw new Error("Affiliate not found");
      return response.json();
    },
    enabled: !!slug,
  });

  const videoUrl = affiliate?.videoUrl?.trim() || "";
  const hasVideo = videoUrl !== "";
  const isYouTubeVideo = hasVideo && (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be"));
  const youtubeVideoId = isYouTubeVideo ? getYouTubeVideoId(videoUrl) : null;

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const initYouTubePlayer = useCallback(() => {
    if (!youtubeVideoId || !playerContainerRef.current) return;
    if (playerRef.current) return;

    const onPlayerStateChange = (event: any) => {
      const YT = (window as any).YT;
      if (event.data === YT.PlayerState.PLAYING) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const player = playerRef.current;
          if (player && player.getDuration && player.getCurrentTime) {
            const duration = player.getDuration();
            const currentTime = player.getCurrentTime();
            if (duration > 0 && currentTime >= duration - 1) {
              player.seekTo(0);
              player.pauseVideo();
              if (timerRef.current) clearInterval(timerRef.current);
            }
          }
        }, 500);
      } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    const YT = (window as any).YT;
    playerRef.current = new YT.Player(playerContainerRef.current, {
      videoId: youtubeVideoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
      },
      events: {
        onStateChange: onPlayerStateChange,
      },
    });
  }, [youtubeVideoId]);

  useEffect(() => {
    if (!youtubeVideoId) return;

    if ((window as any).YT && (window as any).YT.Player) {
      initYouTubePlayer();
      return;
    }

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      initYouTubePlayer();
    };

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, [youtubeVideoId, initYouTubePlayer]);

  const handleVisitClick = async () => {
    if (!affiliate) return;
    
    try {
      await apiRequest("POST", "/api/affiliate-clicks", {
        affiliateId: affiliate.id,
        affiliateName: affiliate.name,
        category: affiliate.categories[0] || "general",
        source: "detail_page",
      });
    } catch (error) {
      console.log("Click tracking failed silently");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !affiliate) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Partner Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The partner program you're looking for doesn't exist or is no longer available.
            </p>
            <Link href="/resources">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Resources
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const hasExclusiveBenefits = affiliate.exclusiveBenefits && affiliate.exclusiveBenefits.length > 0;
  const brandColors = slug ? brandColorMap[slug] : undefined;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/resources" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Resources
        </Link>

        <div className="grid gap-8">
          {brandColors ? (
            <div
              className="rounded-lg p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6"
              style={{ background: `linear-gradient(135deg, ${brandColors.dark} 0%, ${brandColors.dark}dd 100%)` }}
            >
              {affiliate.logoUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={affiliate.logoUrl}
                    alt={affiliate.name}
                    className="h-20 w-auto object-contain rounded-lg bg-white/10 p-3"
                    data-testid="img-affiliate-logo"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2 text-white" data-testid="text-affiliate-name">
                  {affiliate.name}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {affiliate.categories.map((category) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="bg-white/15 text-white border-white/20 no-default-hover-elevate no-default-active-elevate"
                    >
                      {category}
                    </Badge>
                  ))}
                  {affiliate.hasFreeTrial && (
                    <Badge
                      variant="outline"
                      className="border-green-400 text-green-300 no-default-hover-elevate no-default-active-elevate"
                    >
                      Free Trial Available
                    </Badge>
                  )}
                </div>
                <p className="text-white/80 text-lg">
                  {affiliate.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {affiliate.logoUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={affiliate.logoUrl}
                    alt={affiliate.name}
                    className="h-24 w-auto object-contain rounded-lg border p-2"
                    data-testid="img-affiliate-logo"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2" data-testid="text-affiliate-name">
                  {affiliate.name}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {affiliate.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                  {affiliate.hasFreeTrial && (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Free Trial Available
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-lg">
                  {affiliate.description}
                </p>
              </div>
            </div>
          )}

          {hasVideo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Watch Demo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden bg-muted relative">
                  {isYouTubeVideo ? (
                    <div ref={playerContainerRef} className="w-full h-full" />
                  ) : (
                    <iframe
                      src={getVideoEmbed(affiliate.videoUrl!)}
                      title={`${affiliate.name} Demo Video`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
                </div>
              </CardContent>
            </Card>
          )}

          {affiliate.detailedDescription && (
            <Card>
              <CardHeader>
                <CardTitle>About {affiliate.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {affiliate.detailedDescription.split("\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Key Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {affiliate.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {hasExclusiveBenefits && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Star className="h-5 w-5" />
                    Exclusive Benefits
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Special perks when you sign up through RE Data Metrix
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {affiliate.exclusiveBenefits!.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {affiliate.features && affiliate.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {affiliate.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(affiliate.costFrom || affiliate.costTo) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  {affiliate.costFrom && affiliate.costTo
                    ? `$${affiliate.costFrom} - $${affiliate.costTo}/month`
                    : affiliate.costFrom
                    ? `Starting at $${affiliate.costFrom}/month`
                    : `Up to $${affiliate.costTo}/month`}
                </p>
                {affiliate.hasFreeTrial && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Free trial available
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-center py-8">
            <Button
              size="lg"
              asChild
              className="px-8"
              style={brandColors ? { backgroundColor: brandColors.primary, borderColor: brandColors.primary, color: brandColors.dark } : undefined}
              data-testid="button-visit-affiliate"
            >
              <a
                href={affiliate.referralLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleVisitClick}
              >
                Visit {affiliate.name}
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              By clicking this link, you'll be redirected to {affiliate.name}'s website.
              RE Data Metrix may receive a referral commission at no additional cost to you.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
