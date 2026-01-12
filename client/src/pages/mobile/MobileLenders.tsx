import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceMode } from "@/contexts/DeviceModeContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Heart, 
  ExternalLink,
  Phone,
  Mail,
  Building2,
  Filter,
  X,
  ArrowLeft,
  Monitor,
  Video,
  Play,
  ChevronDown,
  ChevronUp,
  Loader2
} from "lucide-react";
import type { TrainingVideo } from "@shared/schema";

interface SearchResult {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  referralLink: string;
  companyDescription: string;
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

const PLACEHOLDER_LENDERS: SearchResult[] = [
  {
    id: "demo-1",
    companyName: "Capital Bridge Funding",
    contactName: "Michael Thompson",
    phone: "(555) 123-4567",
    email: "contact@example.com",
    website: "https://example.com",
    referralLink: "#",
    companyDescription: "Nationwide hard money lender specializing in fix-and-flip and bridge loans with competitive rates.",
  },
  {
    id: "demo-2",
    companyName: "Prime DSCR Loans",
    contactName: "Sarah Martinez",
    phone: "(555) 234-5678",
    email: "contact@example.com",
    website: "https://example.com",
    referralLink: "#",
    companyDescription: "DSCR loan specialists offering 30-year fixed rate investment property loans.",
  },
];

export default function MobileLenders() {
  const { user, isSubscriber } = useAuth();
  const { toast } = useToast();
  const { setDeviceMode } = useDeviceMode();
  const [, setLocation] = useLocation();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const [expandedLender, setExpandedLender] = useState<string | null>(null);
  const [pendingLenderIds, setPendingLenderIds] = useState<Set<string>>(new Set());
  
  const handleViewDesktop = () => {
    setDeviceMode("desktop");
    setLocation("/lenders");
  };

  const [filters, setFilters] = useState({
    state: "any",
    loanType: "any",
  });

  const { data: videos = [] } = useQuery<TrainingVideo[]>({
    queryKey: ["/api/training-videos"],
  });

  const { data: demoModeData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/demo-mode"],
  });

  const isDemoMode = demoModeData?.enabled === true;

  interface SavedLenderData {
    lenderId: string;
  }

  const { data: savedLendersData } = useQuery<SavedLenderData[]>({
    queryKey: ["/api/member/saved-lenders"],
    enabled: !!user,
  });

  const savedLenderIds = savedLendersData?.map((sl) => sl.lenderId) ?? [];

  const lenderVideos = videos.filter(v => 
    v.title.toLowerCase().includes("lender") || 
    v.title.toLowerCase().includes("financing") ||
    v.title.toLowerCase().includes("loan")
  ).slice(0, 2);

  const saveLenderMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      setPendingLenderIds(prev => new Set(prev).add(lenderId));
      const response = await apiRequest("POST", `/api/member/saved-lenders/${lenderId}`);
      return response.json();
    },
    onSuccess: (_, lenderId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/saved-lenders"] });
      toast({ title: "Lender Saved" });
      setPendingLenderIds(prev => { const n = new Set(prev); n.delete(lenderId); return n; });
    },
    onError: (_, lenderId) => {
      toast({ title: "Error", description: "Failed to save lender", variant: "destructive" });
      setPendingLenderIds(prev => { const n = new Set(prev); n.delete(lenderId); return n; });
    },
  });

  const unsaveLenderMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      setPendingLenderIds(prev => new Set(prev).add(lenderId));
      const response = await apiRequest("DELETE", `/api/member/saved-lenders/${lenderId}`);
      if (!response.ok) throw new Error("Failed");
      return { success: true };
    },
    onSuccess: (_, lenderId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/saved-lenders"] });
      toast({ title: "Lender Removed" });
      setPendingLenderIds(prev => { const n = new Set(prev); n.delete(lenderId); return n; });
    },
    onError: (_, lenderId) => {
      toast({ title: "Error", description: "Failed to remove lender", variant: "destructive" });
      setPendingLenderIds(prev => { const n = new Set(prev); n.delete(lenderId); return n; });
    },
  });

  const handleToggleSave = (lenderId: string) => {
    if (!user) {
      toast({ title: "Sign in Required", description: "Please sign in to save lenders", variant: "destructive" });
      return;
    }
    if (pendingLenderIds.has(lenderId)) return;
    const isSaved = savedLenderIds.includes(lenderId);
    if (isSaved) {
      unsaveLenderMutation.mutate(lenderId);
    } else {
      saveLenderMutation.mutate(lenderId);
    }
  };

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSearchResults(PLACEHOLDER_LENDERS);
      } else {
        const response = await apiRequest("POST", "/api/search-lenders", filters);
        const results = await response.json();
        setSearchResults(results);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setShowFilters(false);
    }
  }, [filters, isDemoMode]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-base font-semibold">Lender Search</h1>
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
      </header>

      <main className="p-4 pb-24 space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Find Lenders</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Connect with verified investment property lenders
          </p>
        </div>

        {lenderVideos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Video className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">Learn About Financing</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {lenderVideos.map((video) => {
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
                        <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                      </div>
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

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => setShowFilters(true)}
          data-testid="button-search-lenders"
        >
          <Search className="h-5 w-5 mr-2" />
          Search Lenders
        </Button>

        {searchResults.length > 0 && (
          <div className="space-y-3" data-testid="section-search-results">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" data-testid="text-results-count">{searchResults.length} Lender{searchResults.length !== 1 ? 's' : ''} Found</p>
              <Button variant="ghost" size="sm" onClick={() => setSearchResults([])} data-testid="button-clear-results">
                Clear
              </Button>
            </div>
            {searchResults.map((lender) => {
              const isExpanded = expandedLender === lender.id;
              const isSaved = savedLenderIds.includes(lender.id);
              const isPending = pendingLenderIds.has(lender.id);

              return (
                <Card key={lender.id} className="overflow-hidden" data-testid={`card-lender-${lender.id}`}>
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => setExpandedLender(isExpanded ? null : lender.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" data-testid={`text-lender-name-${lender.id}`}>{lender.companyName}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-lender-contact-${lender.id}`}>{lender.contactName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); handleToggleSave(lender.id); }}
                          disabled={isPending}
                          data-testid={`button-save-lender-${lender.id}`}
                        >
                          <Heart className={`h-4 w-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t space-y-3" data-testid={`section-lender-details-${lender.id}`}>
                      <p className="text-xs text-muted-foreground" data-testid={`text-lender-desc-${lender.id}`}>{lender.companyDescription}</p>
                      <div className="flex flex-wrap gap-2">
                        <a href={`tel:${lender.phone}`}>
                          <Button variant="outline" size="sm" data-testid={`button-call-${lender.id}`}>
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </Button>
                        </a>
                        <a href={`mailto:${lender.email}`}>
                          <Button variant="outline" size="sm" data-testid={`button-email-${lender.id}`}>
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Button>
                        </a>
                        {lender.website && (
                          <a href={lender.website} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" data-testid={`button-website-${lender.id}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Website
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {searchResults.length === 0 && (
          <Card className="p-4 text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Search for Lenders</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the search button to find lenders that match your criteria
            </p>
          </Card>
        )}
      </main>

      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Search Filters
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Property State</label>
              <Select value={filters.state} onValueChange={(v) => setFilters(f => ({ ...f, state: v }))}>
                <SelectTrigger data-testid="select-state">
                  <SelectValue placeholder="Any State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any State</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="GA">Georgia</SelectItem>
                  <SelectItem value="NC">North Carolina</SelectItem>
                  <SelectItem value="OH">Ohio</SelectItem>
                  <SelectItem value="PA">Pennsylvania</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Loan Type</label>
              <Select value={filters.loanType} onValueChange={(v) => setFilters(f => ({ ...f, loanType: v }))}>
                <SelectTrigger data-testid="select-loan-type">
                  <SelectValue placeholder="Any Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Type</SelectItem>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="dscr">DSCR</SelectItem>
                  <SelectItem value="hard_money">Hard Money / Bridge</SelectItem>
                  <SelectItem value="new_construction">New Construction / Ground-Up</SelectItem>
                  <SelectItem value="fha_va">FHA/VA</SelectItem>
                  <SelectItem value="portfolio">Portfolio / Blanket</SelectItem>
                  <SelectItem value="arm">5/1 ARM</SelectItem>
                  <SelectItem value="balloon">Balloon</SelectItem>
                  <SelectItem value="interest_only">Interest-Only</SelectItem>
                  <SelectItem value="transactional">Transactional Funding</SelectItem>
                  <SelectItem value="private-seller">Private/Seller Financing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowFilters(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSearch} disabled={isSearching} data-testid="button-apply-search">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
