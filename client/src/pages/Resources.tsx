import { useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { WebApplicationSchema } from "@/components/StructuredData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AffiliateCard } from "@/components/AffiliateCard";
import { GlossarySection } from "@/components/GlossarySection";
import ToolFinder, { ToolFinderTutorial } from "@/components/ToolFinder";
import ContractorSearch from "@/components/ContractorSearch";
import { categoryInfo } from "@/data/affiliatePrograms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench, CheckCircle, Lock, Play, Video, HardHat, BookOpen, Scale, Users, Shield, ExternalLink, Newspaper, ArrowRight } from "lucide-react";
import { blogPosts } from "../data/blogPosts";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import type { Affiliate, TrainingVideo } from "@shared/schema";
import { useDemoAccess } from "@/hooks/use-demo-access";

function SubscribeOverlay({ title = "Subscribe to View" }: { title?: string }) {
  return (
    <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center p-6 rounded-lg">
      <Lock className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-lg font-semibold text-foreground text-center mb-2">{title}</p>
      <p className="text-sm text-muted-foreground text-center mb-4">
        Get full access to our curated partner programs and tools
      </p>
      <Link href="/pricing">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-subscribe-affiliates">
          View Membership Plans
        </Button>
      </Link>
    </div>
  );
}

function getYoutubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match ? match[1] : null;
}

function getYoutubeThumbnail(url: string): string {
  const videoId = getYoutubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  return "";
}

function TrainingVideosSection() {
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);

  const { data: videos, isLoading } = useQuery<TrainingVideo[]>({
    queryKey: ["/api/training-videos"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return null;
  }

  // Sort videos: featured first, then by sortOrder
  const sortedVideos = [...videos].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  return (
    <>
      <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Video className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-lg">Training Videos</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Watch our training videos to learn how to use RE Data Metrix effectively.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedVideos.map((video) => {
            const thumbnail = video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl);
            return (
              <Card
                key={video.id}
                className="overflow-hidden cursor-pointer hover-elevate"
                onClick={() => setSelectedVideo(video)}
                data-testid={`card-video-thumbnail-${video.id}`}
              >
                <div className="aspect-video bg-muted relative">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                  {video.isFeatured && (
                    <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-medium px-2 py-0.5 rounded">
                      Featured
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h5 className="font-medium text-sm line-clamp-2" data-testid={`text-video-title-${video.id}`}>
                    {video.title}
                  </h5>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            {selectedVideo && getYoutubeVideoId(selectedVideo.youtubeUrl) && (
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeVideoId(selectedVideo.youtubeUrl)}?autoplay=1`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            )}
          </div>
          {selectedVideo?.description && (
            <div className="p-4 pt-0">
              <p className="text-muted-foreground">{selectedVideo.description}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function BlogSection() {
  const formatDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };
  const now = new Date();
  const published = blogPosts
    .filter(p => new Date(p.publishDate) <= now)
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6" data-testid="section-blog">
      <div className="flex items-center gap-3 mb-2">
        <Newspaper className="h-7 w-7 text-primary" />
        <h2 className="text-2xl font-semibold">Latest from the Blog</h2>
      </div>

      {published.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-blog-tab-empty">
            New posts are published every Tuesday and Thursday. Check back soon.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {published.map(post => (
              <Card key={post.slug} className="hover-elevate" data-testid={`card-blog-tab-${post.slug}`}>
                <CardContent className="py-5">
                  <p className="text-xs text-muted-foreground mb-1">{formatDate(post.publishDate)}</p>
                  <h3 className="text-lg font-semibold text-primary mb-2">{post.title}</h3>
                  <p className="text-sm text-foreground/90 mb-3">{post.excerpt}</p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    data-testid={`link-blog-tab-read-${post.slug}`}
                  >
                    Read More
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              data-testid="link-blog-tab-view-all"
            >
              View All Posts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function LegalSection() {
  const legalShieldUrl = "https://132034141.legalshieldassociate.com";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-semibold">Legal Services</h2>
        </div>
        <p className="text-muted-foreground">
          Protect yourself and your real estate investments with affordable legal services
        </p>
      </div>

      <Card className="overflow-hidden" data-testid="card-legalshield">
        <div className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="p-4 rounded-xl bg-primary/10">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-bold text-2xl">LegalShield</h3>
              </div>
              <p className="text-muted-foreground mb-6 max-w-xl">
                As a real estate investor, having access to legal protection is essential. LegalShield provides 
                affordable legal services that give you peace of mind when reviewing contracts, handling disputes, 
                or navigating complex transactions.
              </p>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <a 
                  href={legalShieldUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="gap-2" data-testid="button-legalshield-visit">
                    <ExternalLink className="h-4 w-4" />
                    Learn More at LegalShield
                  </Button>
                </a>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full lg:w-auto lg:min-w-[280px]">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border">
                <Scale className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">Contract Reviews</p>
                  <p className="text-xs text-muted-foreground">Attorney review of agreements</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">Legal Consultations</p>
                  <p className="text-xs text-muted-foreground">Unlimited phone access</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border">
                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">Document Preparation</p>
                  <p className="text-xs text-muted-foreground">Professional legal documents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Resources() {
  const { isSubscriber, isLoading: authLoading } = useAuth();
  const { isDemoMode, hasDemoToken } = useDemoAccess();
  const [propertyManagementFilter, setPropertyManagementFilter] = useState<"all" | "short-term" | "long-term">("all");
  
  // Demo token users get access but with anonymized partner data
  const effectiveIsSubscriber = isSubscriber || hasDemoToken;
  
  const { data: affiliates = [], isLoading: affiliatesLoading } = useQuery<Affiliate[]>({
    queryKey: ['/api/affiliates'],
  });
  
  const getAffiliateProgramsByCategory = (category: string) => {
    return affiliates
      .filter(program => program.categories.includes(category))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });
  };
  
  const getPropertyManagementAffiliates = () => {
    let filtered = affiliates.filter(program => {
      if (propertyManagementFilter === "all") {
        return program.categories.includes("property-management") || 
               program.categories.includes("short-term-rentals") || 
               program.categories.includes("long-term-rentals");
      } else if (propertyManagementFilter === "short-term") {
        return program.categories.includes("short-term-rentals");
      } else {
        return program.categories.includes("long-term-rentals");
      }
    });
    return filtered.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  };

  const renderAffiliateContent = (category: string, info: { name: string; description: string }) => {
    if (authLoading || affiliatesLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    const categoryAffiliates = getAffiliateProgramsByCategory(category);
    
    const content = (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{info.name}</h2>
          <p className="text-muted-foreground">{info.description}</p>
        </div>
        {categoryAffiliates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No Partner Tools available in this category yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categoryAffiliates.map((program, index) => (
              <AffiliateCard 
                key={program.id} 
                program={program} 
                isDemoMode={isDemoMode}
                demoIndex={index}
              />
            ))}
          </div>
        )}
      </div>
    );

    if (!effectiveIsSubscriber) {
      return (
        <div className="relative">
          <div className="pointer-events-none select-none">
            {content}
          </div>
          <SubscribeOverlay title="Subscribe to View Programs" />
        </div>
      );
    }
    
    return content;
  };

  return (
    <Layout>
      <SEO
        title="Real Estate Investing Tools & Resources"
        description="Discover real estate investing tools for deal analysis, lead generation, project management, and more. Built for serious investors."
        canonicalUrl="https://redatametrix.com/toolbox"
      />
      <WebApplicationSchema />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold">Real Estate Investing Tools and Resources for Investors</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-3">
            <strong><em>real estate investing tools</em></strong> curated to help investors analyze deals, manage projects, generate leads, and scale their business with the right systems in place.
          </p>
          <p className="text-lg text-muted-foreground mb-6">
            Explore tools across categories like deal analysis, property management, marketing, and data so you can build a more efficient and profitable real estate operation.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary mb-3">Build Your Real Estate Investing Stack</h2>
          <p className="text-muted-foreground">
            Successful investors rely on the right combination of tools to manage deals, analyze opportunities, and streamline operations. Our toolbox helps you identify which platforms best fit your strategy.
          </p>
        </div>

        <Tabs defaultValue="about" className="space-y-6">
          {/* Hide category tabs on mobile for non-subscribers */}
          <TabsList className={`flex flex-wrap h-auto gap-2 bg-muted/50 p-2 ${!effectiveIsSubscriber ? "hidden sm:flex" : ""}`} data-testid="tabs-toolbox">
            <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
            <TabsTrigger value="contractors" data-testid="tab-contractors" className="flex items-center gap-1">
              <HardHat className="h-4 w-4" />
              Contractors
            </TabsTrigger>
            <TabsTrigger value="property-management" data-testid="tab-property-management">Property Management</TabsTrigger>
            <TabsTrigger value="project-management" data-testid="tab-project-management">Project Management</TabsTrigger>
            <TabsTrigger value="lead-generation" data-testid="tab-lead-generation">Lead Generation</TabsTrigger>
            <TabsTrigger value="comps" data-testid="tab-comps">Comps & Data</TabsTrigger>
            <TabsTrigger value="resources" data-testid="tab-resources" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            {/* 1. Tool Finder Tutorial Video - Always on top */}
            <ToolFinderTutorial />

            {/* 2. Training Videos Thumbnails */}
            <TrainingVideosSection />

            {/* 3. Tool Finder Text and Search Feature */}
            <div>
              {authLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ToolFinder isBlurred={!isSubscriber} showTutorial={false} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="contractors" className="space-y-6">
            {authLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : effectiveIsSubscriber ? (
              <ContractorSearch />
            ) : (
              <div className="relative">
                <div className="pointer-events-none select-none">
                  <ContractorSearch isBlurred />
                </div>
                <SubscribeOverlay title="Subscribe to Find Contractors" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <Tabs defaultValue="blog" className="space-y-4">
              <TabsList className="bg-muted/50 p-1" data-testid="tabs-resources">
                <TabsTrigger value="blog" data-testid="tab-resources-blog" className="flex items-center gap-1">
                  <Newspaper className="h-4 w-4" />
                  Blog
                </TabsTrigger>
                <TabsTrigger value="glossary" data-testid="tab-resources-glossary" className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  Glossary
                </TabsTrigger>
                <TabsTrigger value="legal" data-testid="tab-resources-legal" className="flex items-center gap-1">
                  <Scale className="h-4 w-4" />
                  Legal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="blog">
                <BlogSection />
              </TabsContent>

              <TabsContent value="glossary">
                <GlossarySection />
              </TabsContent>

              <TabsContent value="legal">
                <LegalSection />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="property-management">
            {authLoading || affiliatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">{categoryInfo["property-management"].name}</h2>
                  <p className="text-muted-foreground">{categoryInfo["property-management"].description}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={propertyManagementFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPropertyManagementFilter("all")}
                    data-testid="button-filter-all"
                  >
                    All
                  </Button>
                  <Button
                    variant={propertyManagementFilter === "short-term" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPropertyManagementFilter("short-term")}
                    data-testid="button-filter-short-term"
                  >
                    Short-Term Rentals
                  </Button>
                  <Button
                    variant={propertyManagementFilter === "long-term" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPropertyManagementFilter("long-term")}
                    data-testid="button-filter-long-term"
                  >
                    Long-Term Rentals
                  </Button>
                </div>
                
                {(() => {
                  const filteredAffiliates = getPropertyManagementAffiliates();
                  const content = filteredAffiliates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No Partner Tools available in this category yet.
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {filteredAffiliates.map((program, index) => (
                        <AffiliateCard 
                          key={program.id} 
                          program={program} 
                          isDemoMode={isDemoMode}
                          demoIndex={index}
                        />
                      ))}
                    </div>
                  );
                  
                  if (!effectiveIsSubscriber) {
                    return (
                      <div className="relative">
                        <div className="pointer-events-none select-none">
                          {content}
                        </div>
                        <SubscribeOverlay title="Subscribe to View Programs" />
                      </div>
                    );
                  }
                  
                  return content;
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="project-management">
            {renderAffiliateContent("project-management", categoryInfo["project-management"])}
          </TabsContent>

          <TabsContent value="lead-generation">
            {renderAffiliateContent("lead-generation", categoryInfo["lead-generation"])}
          </TabsContent>

          <TabsContent value="comps">
            {renderAffiliateContent("comps", categoryInfo.comps)}
          </TabsContent>
        </Tabs>

        <section className="mt-12 mb-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Categories of Real Estate Investing Tools</h2>

          <h3 className="text-xl font-semibold text-primary mb-2">Deal Analysis and Financial Modeling</h3>
          <p className="text-muted-foreground mb-6">
            Analyze potential investments, calculate ROI, and compare financing options to make smarter purchasing decisions.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Lead Generation and Marketing Tools</h3>
          <p className="text-muted-foreground mb-6">
            Find off-market deals, build targeted lists, and automate outreach to generate consistent deal flow.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Project and Property Management</h3>
          <p className="text-muted-foreground mb-6">
            Manage renovations, contractors, and rental properties efficiently with systems designed for real estate investors.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Data, Comps, and Market Insights</h3>
          <p className="text-muted-foreground mb-8">
            Access property data, comparable sales, and market trends to support accurate deal analysis and pricing decisions.
          </p>

          <h2 className="text-2xl font-bold text-primary mb-4">Use These Tools with Deal Analysis and Funding</h2>
          <p className="text-muted-foreground">
            Pair your tools with our <a href="/deal-analysis" className="text-primary hover:underline">deal analysis software</a> to evaluate opportunities and connect with <a href="/lenders" className="text-primary hover:underline">real estate investment lenders</a> to secure funding faster.
          </p>
        </section>
      </div>
    </Layout>
  );
}
