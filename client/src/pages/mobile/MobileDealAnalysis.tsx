import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardData } from "@/contexts/WizardDataContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calculator, 
  Play, 
  Video, 
  ChevronRight, 
  Home, 
  FileText,
  TrendingUp,
  ArrowLeft,
  Monitor,
  CheckCircle
} from "lucide-react";
import type { TrainingVideo } from "@shared/schema";

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

export default function MobileDealAnalysis() {
  const { user, isSubscriber } = useAuth();
  const { wizardData } = useWizardData();
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);

  const { data: videos = [] } = useQuery<TrainingVideo[]>({
    queryKey: ["/api/training-videos"],
  });

  const dealAnalysisVideos = videos.filter(v => 
    v.title.toLowerCase().includes("deal") || 
    v.title.toLowerCase().includes("analysis") ||
    v.title.toLowerCase().includes("wizard") ||
    v.isFeatured
  ).slice(0, 3);

  const hasInProgressDeal = wizardData.property?.address;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-base font-semibold">Deal Analysis</h1>
          <Link href="/deal-analysis">
            <Button variant="ghost" size="icon" title="Desktop Version" data-testid="button-desktop-version">
              <Monitor className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Analyze Your Deal</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Get detailed profit projections and lender comparisons
          </p>
        </div>

        {dealAnalysisVideos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Video className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">How It Works</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {dealAnalysisVideos.map((video) => {
                const thumbnail = video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl);
                return (
                  <Card
                    key={video.id}
                    className="flex-shrink-0 w-36 overflow-hidden cursor-pointer hover-elevate"
                    onClick={() => setSelectedVideo(video)}
                    data-testid={`card-video-${video.id}`}
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
                          <Video className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                      {video.isFeatured && (
                        <Badge className="absolute top-1 left-1 text-[10px] px-1 py-0">Featured</Badge>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-medium line-clamp-2">{video.title}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <Link href="/deal-analysis">
          <Button 
            className="w-full" 
            size="lg"
            data-testid="button-start-analysis"
          >
            <Calculator className="h-5 w-5 mr-2" />
            {hasInProgressDeal ? "Continue Analysis" : "Start New Analysis"}
          </Button>
        </Link>

        {hasInProgressDeal && (
          <Card className="p-3 border-accent/50 bg-accent/5" data-testid="card-in-progress-deal">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Home className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground" data-testid="text-deal-status">In Progress</p>
                <p className="text-sm font-semibold truncate" data-testid="text-deal-address">{wizardData.property?.address}</p>
                <p className="text-xs text-muted-foreground" data-testid="text-deal-location">
                  {wizardData.property?.city}, {wizardData.property?.state}
                </p>
              </div>
              <Link href="/deal-analysis">
                <Button variant="outline" size="sm" data-testid="button-continue-deal">
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">What You'll Get</h3>
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3">
              <TrendingUp className="h-5 w-5 text-accent mb-1.5" />
              <p className="text-xs font-medium">Profit Projections</p>
              <p className="text-[10px] text-muted-foreground">ROI & cash-on-cash returns</p>
            </Card>
            <Card className="p-3">
              <FileText className="h-5 w-5 text-accent mb-1.5" />
              <p className="text-xs font-medium">Lender Comparison</p>
              <p className="text-[10px] text-muted-foreground">Side-by-side loan terms</p>
            </Card>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold" id="quick-steps-heading">Quick Steps</h3>
          <ul className="space-y-1.5" aria-labelledby="quick-steps-heading" role="list" data-testid="list-wizard-steps">
            {[
              { step: 1, title: "Enter Property Address", desc: "Auto-lookup or manual entry" },
              { step: 2, title: "Property Details", desc: "Beds, baths, sqft" },
              { step: 3, title: "Purchase & Renovation", desc: "Price, rehab budget, ARV" },
              { step: 4, title: "Your Info", desc: "Experience & credit" },
              { step: 5, title: "Holding Period", desc: "Timeline & exit strategy" },
              { step: 6, title: "Results", desc: "Profit & lender comparison" },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50" data-testid={`step-${step}`}>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
                  <span className="text-xs font-bold text-primary">{step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" data-testid={`text-step-${step}-title`}>{title}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-muted-foreground/30" aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>

        {!isSubscriber && (
          <Card className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <p className="text-xs font-medium mb-1">Unlock Full Results</p>
            <p className="text-[10px] text-muted-foreground mb-2">
              Subscribe to see detailed lender comparisons
            </p>
            <Link href="/pricing">
              <Button size="sm" className="w-full" data-testid="button-view-pricing">
                View Plans
              </Button>
            </Link>
          </Card>
        )}
      </main>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-[95vw] p-0 overflow-hidden">
          <DialogHeader className="p-3 pb-0">
            <DialogTitle className="text-sm">{selectedVideo?.title}</DialogTitle>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
