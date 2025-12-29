import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Link2,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Ban,
  Loader2,
  Plus,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface DemoToken {
  id: string;
  token: string;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  status: string;
  expiresAt: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string | null;
  demoUrl?: string;
}

export default function DemoLinks() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tokenToRevoke, setTokenToRevoke] = useState<DemoToken | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin') {
            toast({
              title: "Access Denied",
              description: "Admin privileges required.",
              variant: "destructive",
            });
            setLocation("/admin/login");
            return;
          }
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

  const { data: tokens, isLoading } = useQuery<DemoToken[]>({
    queryKey: ["/api/admin/demo-links"],
    enabled: !isAuthChecking,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { contactName: string; contactEmail: string; notes: string; expiresInDays: number }) => {
      const response = await fetch("/api/admin/demo-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create demo link");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-links"] });
      toast({
        title: "Demo Link Created",
        description: "The demo access link has been generated.",
      });
      setIsCreateOpen(false);
      resetForm();
      if (data.demoUrl) {
        navigator.clipboard.writeText(data.demoUrl);
        toast({
          title: "Link Copied",
          description: "The demo link has been copied to your clipboard.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create demo link",
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/demo-links/${id}/revoke`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to revoke demo link");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-links"] });
      toast({
        title: "Demo Link Revoked",
        description: "The demo access link has been disabled.",
      });
      setTokenToRevoke(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke demo link",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setContactName("");
    setContactEmail("");
    setNotes("");
    setExpiresInDays("30");
  };

  const handleCreate = () => {
    createMutation.mutate({
      contactName,
      contactEmail,
      notes,
      expiresInDays: parseInt(expiresInDays),
    });
  };

  const copyToClipboard = async (token: string) => {
    const baseUrl = window.location.origin;
    const demoUrl = `${baseUrl}/demo/${token}`;
    await navigator.clipboard.writeText(demoUrl);
    setCopiedToken(token);
    toast({
      title: "Copied",
      description: "Demo link copied to clipboard",
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getStatusBadge = (token: DemoToken) => {
    const isExpired = new Date(token.expiresAt) < new Date();
    
    if (token.status === 'revoked') {
      return <Badge variant="destructive" data-testid={`badge-status-${token.id}`}><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
    }
    if (isExpired) {
      return <Badge variant="secondary" data-testid={`badge-status-${token.id}`}><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${token.id}`}><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
  };

  if (isAuthChecking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  const activeTokens = tokens?.filter(t => t.status === 'active' && new Date(t.expiresAt) > new Date()) || [];
  const inactiveTokens = tokens?.filter(t => t.status === 'revoked' || new Date(t.expiresAt) <= new Date()) || [];

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Demo Access Links</h1>
          <p className="text-muted-foreground">
            Generate and manage demo access links for potential customers, lenders, and affiliates
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-demo-link">
          <Plus className="h-4 w-4 mr-2" />
          Create Demo Link
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-count">{activeTokens.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-usage-count">
              {tokens?.reduce((sum, t) => sum + t.usageCount, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired/Revoked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-inactive-count">{inactiveTokens.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Demo Links
          </CardTitle>
          <CardDescription>
            Each link provides temporary access to the Deal Analysis wizard with demo lenders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tokens || tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No demo links created yet</p>
              <p className="text-sm">Click "Create Demo Link" to generate your first one</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`row-demo-link-${token.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(token)}
                      {token.contactName && (
                        <span className="font-medium" data-testid={`text-contact-${token.id}`}>
                          {token.contactName}
                        </span>
                      )}
                      {token.contactEmail && (
                        <span className="text-muted-foreground text-sm">
                          ({token.contactEmail})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Expires: {format(new Date(token.expiresAt), "MMM d, yyyy")}
                      </span>
                      <span>
                        Uses: {token.usageCount}
                      </span>
                      {token.lastUsedAt && (
                        <span>
                          Last used: {formatDistanceToNow(new Date(token.lastUsedAt))} ago
                        </span>
                      )}
                    </div>
                    {token.notes && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {token.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(token.token)}
                      data-testid={`button-copy-${token.id}`}
                    >
                      {copiedToken === token.token ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/demo/${token.token}`, '_blank')}
                      data-testid={`button-preview-${token.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {token.status === 'active' && new Date(token.expiresAt) > new Date() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTokenToRevoke(token)}
                        data-testid={`button-revoke-${token.id}`}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Demo Access Link</DialogTitle>
            <DialogDescription>
              Generate a link that provides temporary demo access to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name (Optional)</Label>
              <Input
                id="contactName"
                placeholder="e.g., John Smith"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email (Optional)</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="e.g., john@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expires In</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger data-testid="select-expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Demo for REIA presentation"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-confirm-create">
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Generate Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!tokenToRevoke} onOpenChange={() => setTokenToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Demo Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable the demo link
              {tokenToRevoke?.contactName && ` for ${tokenToRevoke.contactName}`}.
              Anyone using this link will no longer be able to access the demo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tokenToRevoke && revokeMutation.mutate(tokenToRevoke.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Revoke"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
