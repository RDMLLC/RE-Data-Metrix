import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Users,
  Link2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface ReferralPartner {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  promoCode: string | null;
  isActive: boolean;
  createdAt: string | null;
}

interface ReferralStats {
  partner: string;
  signupCount: number;
}

interface PartnerFormData {
  name: string;
  slug: string;
  email: string;
  promoCode: string;
  isActive: boolean;
}

const emptyFormData: PartnerFormData = {
  name: '',
  slug: '',
  email: '',
  promoCode: '',
  isActive: true,
};

export default function ReferralPartners() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<ReferralPartner | null>(null);
  const [formData, setFormData] = useState<PartnerFormData>(emptyFormData);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
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
      } catch (error) {
        setLocation("/admin/login");
        return;
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkAuth();
  }, [setLocation, toast]);

  const { data: partners = [], isLoading: isLoadingPartners } = useQuery<ReferralPartner[]>({
    queryKey: ['/api/admin/referral-partners'],
    enabled: !isAuthChecking,
  });

  const { data: stats = [] } = useQuery<ReferralStats[]>({
    queryKey: ['/api/admin/referral-stats'],
    enabled: !isAuthChecking,
  });

  const createMutation = useMutation({
    mutationFn: async (data: PartnerFormData) => {
      const response = await fetch('/api/admin/referral-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create partner');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/referral-partners'] });
      setIsCreateDialogOpen(false);
      setFormData(emptyFormData);
      toast({
        title: "Partner Created",
        description: "Referral partner has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PartnerFormData> }) => {
      const response = await fetch(`/api/admin/referral-partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update partner');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/referral-partners'] });
      setIsEditDialogOpen(false);
      setSelectedPartner(null);
      setFormData(emptyFormData);
      toast({
        title: "Partner Updated",
        description: "Referral partner has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/referral-partners/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete partner');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/referral-partners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/referral-stats'] });
      setIsDeleteDialogOpen(false);
      setSelectedPartner(null);
      toast({
        title: "Partner Deleted",
        description: "Referral partner has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and URL slug are required.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditSubmit = () => {
    if (!selectedPartner) return;
    updateMutation.mutate({ id: selectedPartner.id, data: formData });
  };

  const handleDeleteConfirm = () => {
    if (!selectedPartner) return;
    deleteMutation.mutate(selectedPartner.id);
  };

  const openEditDialog = (partner: ReferralPartner) => {
    setSelectedPartner(partner);
    setFormData({
      name: partner.name,
      slug: partner.slug,
      email: partner.email || '',
      promoCode: partner.promoCode || '',
      isActive: partner.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (partner: ReferralPartner) => {
    setSelectedPartner(partner);
    setIsDeleteDialogOpen(true);
  };

  const copyReferralLink = (slug: string) => {
    const link = `https://redatametrix.com/webinar?ref=${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(slug);
    setTimeout(() => setCopiedLink(null), 2000);
    toast({
      title: "Link Copied",
      description: "Referral link copied to clipboard.",
    });
  };

  const getSignupCount = (slug: string): number => {
    const stat = stats.find(s => s.partner === slug);
    return stat?.signupCount || 0;
  };

  const generateSlug = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  if (isAuthChecking || isLoadingPartners) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalSignups = stats.reduce((sum, s) => sum + s.signupCount, 0);
  const activePartners = partners.filter(p => p.isActive).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Referral Partners</h1>
              <p className="text-muted-foreground">Manage partners and track referral signups</p>
            </div>
          </div>
          <Button onClick={() => {
            setFormData(emptyFormData);
            setIsCreateDialogOpen(true);
          }} data-testid="button-create-partner">
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{partners.length}</p>
                  <p className="text-sm text-muted-foreground">Total Partners</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activePartners}</p>
                  <p className="text-sm text-muted-foreground">Active Partners</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Link2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalSignups}</p>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Partners</CardTitle>
            <CardDescription>
              Share referral links with partners. Signups with ?ref=slug will be tracked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {partners.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referral partners yet</p>
                <p className="text-sm">Add your first partner to start tracking referrals</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Referral Link</TableHead>
                    <TableHead>Promo Code</TableHead>
                    <TableHead className="text-center">Signups</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id} data-testid={`row-partner-${partner.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          {partner.email && (
                            <p className="text-sm text-muted-foreground">{partner.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            ?ref={partner.slug}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyReferralLink(partner.slug)}
                            data-testid={`button-copy-link-${partner.id}`}
                          >
                            {copiedLink === partner.slug ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {partner.promoCode ? (
                          <Badge variant="secondary">{partner.promoCode}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{getSignupCount(partner.slug)}</Badge>
                      </TableCell>
                      <TableCell>
                        {partner.isActive ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(partner)}
                            data-testid={`button-edit-${partner.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(partner)}
                            data-testid={`button-delete-${partner.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Referral Partner</DialogTitle>
              <DialogDescription>
                Create a new partner to track their referral signups.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Partner Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sakira"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  data-testid="input-partner-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  placeholder="e.g., sakira"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  data-testid="input-partner-slug"
                />
                <p className="text-xs text-muted-foreground">
                  Used in referral link: /webinar?ref={formData.slug || 'slug'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="partner@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-partner-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promoCode">Promo Code (optional)</Label>
                <Input
                  id="promoCode"
                  placeholder="e.g., PARTNER2026"
                  value={formData.promoCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, promoCode: e.target.value.toUpperCase() }))}
                  data-testid="input-partner-promo"
                />
                <p className="text-xs text-muted-foreground">
                  Must be created separately in Promo Codes section
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-partner-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSubmit} 
                disabled={createMutation.isPending}
                data-testid="button-submit-create"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Partner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Referral Partner</DialogTitle>
              <DialogDescription>
                Update partner details and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Partner Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">URL Slug *</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  data-testid="input-edit-slug"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-edit-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-promoCode">Promo Code</Label>
                <Input
                  id="edit-promoCode"
                  value={formData.promoCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, promoCode: e.target.value.toUpperCase() }))}
                  data-testid="input-edit-promo"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-isActive">Active</Label>
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-edit-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleEditSubmit} 
                disabled={updateMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Partner</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedPartner?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Partner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
