import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, CheckCircle, Star, Tag, Play, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Affiliate } from "@shared/schema";

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

  const hasVideo = affiliate.videoUrl && affiliate.videoUrl.trim() !== "";
  const hasExclusiveBenefits = affiliate.exclusiveBenefits && affiliate.exclusiveBenefits.length > 0;

  const getVideoEmbed = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = "";
      if (url.includes("youtube.com/watch")) {
        videoId = new URL(url).searchParams.get("v") || "";
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
      }
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("vimeo.com")) {
      const videoId = url.split("vimeo.com/")[1]?.split("?")[0] || "";
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/resources" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Resources
        </Link>

        <div className="grid gap-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {affiliate.logoUrl && (
              <div className="flex-shrink-0">
                <img
                  src={affiliate.logoUrl}
                  alt={affiliate.name}
                  className="h-24 w-auto object-contain rounded-lg border p-2"
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

          {hasVideo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Watch Demo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={getVideoEmbed(affiliate.videoUrl!)}
                    title={`${affiliate.name} Demo Video`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
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
