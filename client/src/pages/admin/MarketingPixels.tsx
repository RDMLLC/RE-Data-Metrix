import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { SiFacebook, SiLinkedin, SiGoogle, SiTiktok, SiX } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { MarketingPixel } from "@shared/schema";

const PLATFORM_CONFIG = {
  meta: {
    name: "Meta (Facebook/Instagram)",
    icon: SiFacebook,
    color: "text-blue-600",
    description: "Track conversions across Facebook and Instagram ads",
    idLabel: "Pixel ID",
    idPlaceholder: "123456789012345",
    helpUrl: "https://www.facebook.com/business/help/952192354843755",
  },
  linkedin: {
    name: "LinkedIn Insight",
    icon: SiLinkedin,
    color: "text-blue-700",
    description: "Track B2B conversions and build professional audiences",
    idLabel: "Partner ID",
    idPlaceholder: "1234567",
    helpUrl: "https://www.linkedin.com/help/lms/answer/a418880",
  },
  google: {
    name: "Google Ads",
    icon: SiGoogle,
    color: "text-red-500",
    description: "Track Google Ads conversions and remarketing",
    idLabel: "Conversion ID",
    idPlaceholder: "AW-123456789",
    helpUrl: "https://support.google.com/google-ads/answer/6095821",
  },
  tiktok: {
    name: "TikTok",
    icon: SiTiktok,
    color: "text-black dark:text-white",
    description: "Track TikTok ad conversions",
    idLabel: "Pixel ID",
    idPlaceholder: "C1234567890123456789",
    helpUrl: "https://ads.tiktok.com/help/article/tiktok-pixel",
  },
  twitter: {
    name: "X (Twitter)",
    icon: SiX,
    color: "text-black dark:text-white",
    description: "Track X/Twitter ad conversions",
    idLabel: "Pixel ID",
    idPlaceholder: "o1234",
    helpUrl: "https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html",
  },
};

type PlatformKey = keyof typeof PLATFORM_CONFIG;

const TRACKED_EVENTS = [
  { name: "PageView", description: "Every page load (automatic)" },
  { name: "CompleteRegistration", description: "When a user signs up for an account" },
  { name: "Subscribe", description: "When a user purchases a subscription" },
  { name: "Lead", description: "When someone registers for a webinar" },
  { name: "ViewContent", description: "When someone views a deal analysis" },
  { name: "InitiateCheckout", description: "When someone starts the checkout process" },
  { name: "SubmitApplication", description: "When someone clicks 'Apply Now' on a lender" },
];

export default function MarketingPixels() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | "">("");
  const [pixelId, setPixelId] = useState("");
  // CAPI token editing state: maps pixel id -> draft token value
  const [capiTokenDrafts, setCapiTokenDrafts] = useState<Record<string, string>>({});
  const [showCapiToken, setShowCapiToken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin' && data.role !== 'auditor') {
            toast({ title: "Access Denied", description: "Admin privileges required.", variant: "destructive" });
            setLocation("/admin/login");
            return;
          }
          setUserRole(data.role);
        } else {
          setLocation("/admin/login");
          return;
        }
      } catch {
        setLocation("/admin/login");
        return;
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkAdminAuth();
  }, [setLocation, toast]);

  const { data: pixels = [], isLoading } = useQuery<MarketingPixel[]>({
    queryKey: ["/api/admin/marketing-pixels"],
  });

  const createPixelMutation = useMutation({
    mutationFn: async (data: { platform: string; pixelId: string }) => {
      return apiRequest("POST", "/api/admin/marketing-pixels", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-pixels"] });
      toast({ title: "Pixel added", description: "Marketing pixel has been configured." });
      setAddDialogOpen(false);
      setSelectedPlatform("");
      setPixelId("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add pixel", variant: "destructive" });
    },
  });

  const updatePixelMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; pixelId?: string; isEnabled?: boolean; capiAccessToken?: string | null }) => {
      return apiRequest("PATCH", `/api/admin/marketing-pixels/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-pixels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-pixels"] });
      toast({ title: "Updated", description: "Pixel settings saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update pixel", variant: "destructive" });
    },
  });

  const deletePixelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/marketing-pixels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-pixels"] });
      toast({ title: "Deleted", description: "Marketing pixel has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete pixel", variant: "destructive" });
    },
  });

  // Sync draft CAPI token values whenever pixels load
  useEffect(() => {
    const drafts: Record<string, string> = {};
    pixels.forEach(p => {
      if (p.platform === 'meta') {
        drafts[p.id] = (p as any).capiAccessToken ?? '';
      }
    });
    setCapiTokenDrafts(prev => ({ ...drafts, ...prev }));
  }, [pixels]);

  const existingPlatforms = new Set(pixels.map(p => p.platform));
  const availablePlatforms = Object.keys(PLATFORM_CONFIG).filter(
    p => !existingPlatforms.has(p)
  ) as PlatformKey[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {isAuditor && (
        <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="banner-read-only">
          <p className="text-sm text-amber-800 dark:text-amber-200">You are viewing this page in read-only mode.</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marketing Pixels</h1>
          <p className="text-muted-foreground">
            Add tracking pixels to measure ad performance and build retargeting audiences
          </p>
        </div>
        
        {!isAuditor && (
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availablePlatforms.length === 0} data-testid="button-add-pixel">
              <Plus className="h-4 w-4 mr-2" />
              Add Pixel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Marketing Pixel</DialogTitle>
              <DialogDescription>
                Choose a platform and enter your pixel ID from that platform's ad dashboard.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as PlatformKey)}>
                  <SelectTrigger data-testid="select-platform">
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlatforms.map(platform => {
                      const config = PLATFORM_CONFIG[platform];
                      const Icon = config.icon;
                      return (
                        <SelectItem key={platform} value={platform}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            {config.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPlatform && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {PLATFORM_CONFIG[selectedPlatform].description}
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor="pixelId">{PLATFORM_CONFIG[selectedPlatform].idLabel}</Label>
                    <Input
                      id="pixelId"
                      value={pixelId}
                      onChange={(e) => setPixelId(e.target.value)}
                      placeholder={PLATFORM_CONFIG[selectedPlatform].idPlaceholder}
                      data-testid="input-pixel-id"
                    />
                  </div>
                  <a
                    href={PLATFORM_CONFIG[selectedPlatform].helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Where do I find this?
                  </a>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={() => createPixelMutation.mutate({ platform: selectedPlatform, pixelId })}
                disabled={!selectedPlatform || !pixelId.trim() || createPixelMutation.isPending}
                data-testid="button-save-pixel"
              >
                {createPixelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Pixel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {pixels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No tracking pixels configured yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Add pixels from Meta, LinkedIn, Google, or other ad platforms to track conversions
              and build retargeting audiences for your marketing campaigns.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pixels.map(pixel => {
            const config = PLATFORM_CONFIG[pixel.platform as PlatformKey];
            if (!config) return null;
            const Icon = config.icon;
            
            return (
              <Card key={pixel.id} className={!pixel.isEnabled ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${config.color}`} />
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {pixel.pixelId}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {pixel.isEnabled ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      {!isAuditor && (
                        <Switch
                          checked={pixel.isEnabled}
                          onCheckedChange={(checked) => 
                            updatePixelMutation.mutate({ id: pixel.id, isEnabled: checked })
                          }
                          data-testid={`switch-enable-${pixel.platform}`}
                        />
                      )}
                    </div>
                    
                    {!isAuditor && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-delete-${pixel.platform}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {config.name} pixel?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will stop all tracking for this platform. You can add it back later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePixelMutation.mutate(pixel.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{config.description}</p>

                  {/* Meta-only: Conversions API (server-side) token */}
                  {pixel.platform === 'meta' && !isAuditor && (
                    <div className="space-y-2 pt-1">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        Conversions API Access Token
                        <span className="text-xs text-muted-foreground font-normal">(server-side, optional)</span>
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showCapiToken[pixel.id] ? 'text' : 'password'}
                            value={capiTokenDrafts[pixel.id] ?? ''}
                            onChange={e => setCapiTokenDrafts(prev => ({ ...prev, [pixel.id]: e.target.value }))}
                            placeholder="Enter CAPI access token..."
                            className="pr-10 font-mono text-xs"
                            data-testid={`input-capi-token-${pixel.platform}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2"
                            onClick={() => setShowCapiToken(prev => ({ ...prev, [pixel.id]: !prev[pixel.id] }))}
                            data-testid={`button-toggle-capi-token-${pixel.platform}`}
                          >
                            {showCapiToken[pixel.id]
                              ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                              : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="default"
                          disabled={updatePixelMutation.isPending}
                          onClick={() => updatePixelMutation.mutate({
                            id: pixel.id,
                            capiAccessToken: capiTokenDrafts[pixel.id] || null,
                          })}
                          data-testid={`button-save-capi-token-${pixel.platform}`}
                        >
                          {updatePixelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Found in Meta Events Manager under your pixel's Settings tab. Enables server-side event deduplication.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Tracked Events</CardTitle>
          <CardDescription>
            These events fire automatically when users perform key actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {TRACKED_EVENTS.map(event => (
              <div key={event.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="font-mono text-sm">{event.name}</span>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </div>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  Active
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
