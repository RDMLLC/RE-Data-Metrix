import { useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AffiliateCard } from "@/components/AffiliateCard";
import { GlossarySection } from "@/components/GlossarySection";
import ToolFinder from "@/components/ToolFinder";
import { categoryInfo } from "@/data/affiliatePrograms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench, CheckCircle, Lock, Play, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import type { Affiliate, TrainingVideo } from "@shared/schema";

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

  const featuredVideo = videos.find(v => v.isFeatured) || videos[0];
  const additionalVideos = videos.filter(v => v.id !== featuredVideo.id);

  const featuredVideoId = getYoutubeVideoId(featuredVideo.youtubeUrl);

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-lg">Training Videos</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {featuredVideo.description || "Watch our training videos to learn how to use RE Data Metrix effectively."}
          </p>
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-white/20" data-testid="card-featured-video">
            {featuredVideoId ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${featuredVideoId}?rel=0&modestbranding=1`}
                title={featuredVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Video not available
              </div>
            )}
          </div>
        </div>

        {additionalVideos.length > 0 && (
          <div>
            <h4 className="font-medium text-muted-foreground mb-3">More Videos</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {additionalVideos.map((video) => {
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
        )}
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            {selectedVideo && getYoutubeVideoId(selectedVideo.youtubeUrl) && (
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeVideoId(selectedVideo.youtubeUrl)}`}
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

export default function Resources() {
  const { isSubscriber, isLoading: authLoading } = useAuth();
  
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
            No affiliate programs available in this category yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categoryAffiliates.map((program) => (
              <AffiliateCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </div>
    );

    if (!isSubscriber) {
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold">Toolbox & Resources</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Your comprehensive toolkit for real estate investment success
          </p>
        </div>

        <Tabs defaultValue="about" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-2" data-testid="tabs-toolbox">
            <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
            <TabsTrigger value="marketplace" data-testid="tab-marketplace">Marketplace & Community</TabsTrigger>
            <TabsTrigger value="property-management" data-testid="tab-property-management">Property Management</TabsTrigger>
            <TabsTrigger value="project-management" data-testid="tab-project-management">Project Management</TabsTrigger>
            <TabsTrigger value="lead-generation" data-testid="tab-lead-generation">Lead Generation</TabsTrigger>
            <TabsTrigger value="comps" data-testid="tab-comps">Comps & Data</TabsTrigger>
            <TabsTrigger value="glossary" data-testid="tab-glossary">Glossary</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <h2 className="text-2xl font-semibold mb-4">Your Investor Toolbox</h2>
              
              <p className="text-muted-foreground leading-relaxed">
                Success in real estate investment requires more than just capital and ambition—it demands 
                the right tools, partnerships, and knowledge. We've curated a comprehensive selection of 
                trusted platforms and services that our community of investors relies on every day.
              </p>

              <div className="not-prose mt-6">
                <TrainingVideosSection />
              </div>
            </div>

            {/* Tool Finder Section */}
            <div className="mt-8 pt-8 border-t">
              {authLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ToolFinder isBlurred={!isSubscriber} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="marketplace">
            {renderAffiliateContent("marketplace", categoryInfo.marketplace)}
          </TabsContent>

          <TabsContent value="property-management">
            {renderAffiliateContent("property-management", categoryInfo["property-management"])}
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

          <TabsContent value="glossary">
            <GlossarySection />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
