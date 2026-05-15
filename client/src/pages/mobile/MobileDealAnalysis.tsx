import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardData } from "@/contexts/WizardDataContext";
import { useDeviceMode } from "@/contexts/DeviceModeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  ArrowLeft,
  Monitor,
} from "lucide-react";
import type { TrainingVideo } from "@shared/schema";
import MobileAdminSwitcher from "@/components/MobileAdminSwitcher";

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
  const { isAuthenticated } = useAuth();
  const { wizardData } = useWizardData();
  const { setDeviceMode } = useDeviceMode();
  const [, setLocation] = useLocation();
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);

  const backHref = isAuthenticated ? "/portal/dashboard" : "/";

  const handleViewDesktop = () => {
    setDeviceMode("desktop");
    setLocation("/deal-analysis");
  };

  const handleStartAnalysis = () => {
    setLocation("/deal-analysis");
  };

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
        <div className="flex items-center justify-between px-3 py-2">
          <Link href={backHref}>
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-col items-center min-w-0 px-2">
            <h1 className="text-xl font-semibold leading-tight" data-testid="text-page-title">Deal Analysis</h1>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">Profit projections & lender comparison</p>
          </div>
          <div className="flex items-center gap-1">
            <MobileAdminSwitcher />
            <Button
              variant="ghost"
              size="icon"
              title="Desktop Version"
              onClick={handleViewDesktop}
              data-testid="button-desktop-version"
            >
              <Monitor className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 pb-6 space-y-4">
        <Button
          className="w-full"
          size="lg"
          onClick={handleStartAnalysis}
          data-testid="button-start-analysis"
        >
          <Calculator className="h-5 w-5 mr-2" />
          {hasInProgressDeal ? "Continue Analysis" : "Start New Analysis"}
        </Button>

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
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartAnalysis}
                data-testid="button-continue-deal"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {dealAnalysisVideos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Video className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">How It Works</span>
            </div>
            <div className="w-full">
              <div
                className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-border cursor-pointer"
                onClick={() => dealAnalysisVideos[0] && setSelectedVideo(dealAnalysisVideos[0])}
                data-testid="card-video-main"
              >
                {dealAnalysisVideos[0] && (
                  <>
                    <img
                      src={dealAnalysisVideos[0].thumbnailUrl || getYoutubeThumbnail(dealAnalysisVideos[0].youtubeUrl)}
                      alt={dealAnalysisVideos[0].title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">{dealAnalysisVideos[0]?.title}</p>
            </div>
            {dealAnalysisVideos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {dealAnalysisVideos.slice(1).map((video) => {
                  const thumbnail = video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl);
                  return (
                    <div
                      key={video.id}
                      className="flex-shrink-0 w-24 cursor-pointer"
                      onClick={() => setSelectedVideo(video)}
                      data-testid={`card-video-${video.id}`}
                    >
                      <div className="aspect-video bg-muted rounded-lg relative overflow-hidden">
                        {thumbnail && (
                          <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{video.title}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
