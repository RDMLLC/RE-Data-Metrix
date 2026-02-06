import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Pencil, Trash2, Star, Eye, EyeOff, Video, Loader2, GripVertical, ExternalLink } from "lucide-react";
import type { TrainingVideo } from "@shared/schema";

export default function AdminTrainingVideos() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    youtubeUrl: "",
    thumbnailUrl: "",
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
  });

  const { data: videos, isLoading } = useQuery<TrainingVideo[]>({
    queryKey: ["/api/admin/training-videos"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/admin/training-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create video");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training-videos"] });
      toast({ title: "Video added successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to add video", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/admin/training-videos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update video");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training-videos"] });
      toast({ title: "Video updated successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update video", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/training-videos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete video");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training-videos"] });
      toast({ title: "Video deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete video", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingVideo(null);
    setFormData({
      title: "",
      description: "",
      youtubeUrl: "",
      thumbnailUrl: "",
      isFeatured: false,
      isActive: true,
      sortOrder: 0,
    });
  };

  const openEditDialog = (video: TrainingVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description || "",
      youtubeUrl: video.youtubeUrl,
      thumbnailUrl: video.thumbnailUrl || "",
      isFeatured: video.isFeatured,
      isActive: video.isActive,
      sortOrder: video.sortOrder || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleFeatured = (video: TrainingVideo) => {
    updateMutation.mutate({ id: video.id, data: { isFeatured: !video.isFeatured } });
  };

  const toggleActive = (video: TrainingVideo) => {
    updateMutation.mutate({ id: video.id, data: { isActive: !video.isActive } });
  };

  const getYoutubeThumbnail = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return "";
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin")}
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Training Videos</h1>
              <p className="text-muted-foreground">
                Manage educational videos displayed in the Toolbox
              </p>
            </div>
            {!isAuditor && (
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-video">
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            )}
          </div>

          {isAuditor && (
            <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="banner-read-only">
              <p className="text-sm text-amber-800 dark:text-amber-200">You are viewing this page in read-only mode.</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !videos || videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Training Videos</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first training video to get started
                </p>
                {!isAuditor && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Video
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => {
                const thumbnail = video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl);
                return (
                  <Card key={video.id} className={!video.isActive ? "opacity-60" : ""} data-testid={`card-video-${video.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex items-center text-muted-foreground">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        {thumbnail && (
                          <div className="w-40 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                            <img
                              src={thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground" data-testid={`text-video-title-${video.id}`}>
                                  {video.title}
                                </h3>
                                {video.isFeatured && (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    <Star className="h-3 w-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                                {!video.isActive && (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Hidden
                                  </Badge>
                                )}
                              </div>
                              {video.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {video.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <a
                                  href={video.youtubeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View on YouTube
                                </a>
                                <span className="text-xs text-muted-foreground">
                                  Sort: {video.sortOrder}
                                </span>
                              </div>
                            </div>
                            {!isAuditor && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleFeatured(video)}
                                  title={video.isFeatured ? "Remove featured" : "Set as featured"}
                                  data-testid={`button-toggle-featured-${video.id}`}
                                >
                                  <Star className={`h-4 w-4 ${video.isFeatured ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleActive(video)}
                                  title={video.isActive ? "Hide video" : "Show video"}
                                  data-testid={`button-toggle-active-${video.id}`}
                                >
                                  {video.isActive ? (
                                    <Eye className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(video)}
                                  data-testid={`button-edit-video-${video.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this video?")) {
                                      deleteMutation.mutate(video.id);
                                    }
                                  }}
                                  data-testid={`button-delete-video-${video.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Edit Video" : "Add Training Video"}</DialogTitle>
            <DialogDescription>
              {editingVideo ? "Update the video details below" : "Add a new training video to the Toolbox"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="How to Use Deal Analysis"
                required
                data-testid="input-video-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Learn how to analyze real estate deals..."
                rows={3}
                data-testid="input-video-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input
                id="youtubeUrl"
                value={formData.youtubeUrl}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                data-testid="input-video-youtube-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Custom Thumbnail URL (optional)</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="Leave empty to use YouTube thumbnail"
                data-testid="input-video-thumbnail"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-video-sort-order"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                  data-testid="switch-video-featured"
                />
                <Label htmlFor="isFeatured" className="cursor-pointer">Featured Video</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-video-active"
                />
                <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-video"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingVideo ? "Save Changes" : "Add Video"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
