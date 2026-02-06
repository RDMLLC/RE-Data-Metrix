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
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Key,
  Plus,
  Edit2,
  Copy,
  Check,
  Search,
  Users,
  Calendar,
  Clock,
  Bell,
  UserPlus,
  TrendingUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxRedemptions: number;
  currentRedemptions: number;
  durationMonths: number;
  isActive: boolean;
  createdAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
}

interface PromoRedemption {
  id: string;
  promoCodeId: string;
  userId: string;
  activatedAt: string;
  expiresAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

interface WaitlistEntry {
  id: string;
  promoCodeId: string;
  email: string;
  userId: string | null;
  username: string | null;
  position: number;
  joinedAt: string;
  notifiedAt: string | null;
}

interface PromoFormData {
  code: string;
  name: string;
  description: string;
  maxRedemptions: string;
  durationMonths: string;
  expiresAt: string;
  isActive: boolean;
}

const emptyFormData: PromoFormData = {
  code: '',
  name: '',
  description: '',
  maxRedemptions: '100',
  durationMonths: '6',
  expiresAt: '',
  isActive: true,
};

function generatePromoCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'LAUNCH';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function PromoCodes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState<PromoFormData>(emptyFormData);
  const [activeTab, setActiveTab] = useState("codes");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin' && data.role !== 'auditor') {
            toast({
              title: "Access Denied",
              description: "Admin privileges required.",
              variant: "destructive",
            });
            setLocation("/admin/login");
            return;
          }
          setUserRole(data.role);
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

  const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ['/api/admin/promo-codes'],
    enabled: !isAuthChecking,
  });

  const { data: selectedWaitlist = [], isLoading: isLoadingWaitlist } = useQuery<WaitlistEntry[]>({
    queryKey: ['/api/admin/promo-codes', selectedPromo?.id, 'waitlist'],
    enabled: !!selectedPromo?.id && activeTab === 'waitlist',
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<PromoCode>) => {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create promo code');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      setIsCreateDialogOpen(false);
      setFormData(emptyFormData);
      toast({ title: "Promo code created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromoCode> }) => {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update promo code');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      setIsEditDialogOpen(false);
      setSelectedPromo(null);
      toast({ title: "Promo code updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const notifyNextMutation = useMutation({
    mutationFn: async (promoCodeId: string) => {
      const response = await fetch(`/api/admin/promo-codes/${promoCodeId}/notify-next`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to notify next person');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      if (selectedPromo) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes', selectedPromo.id, 'waitlist'] });
      }
      toast({ 
        title: "Notification sent", 
        description: `Notified ${data.notified?.email || 'next person'} on the waitlist` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateSubmit = () => {
    createMutation.mutate({
      code: formData.code.toUpperCase(),
      name: formData.name,
      description: formData.description || null,
      maxRedemptions: 100,
      durationMonths: 6,
      expiresAt: formData.expiresAt || null,
      isActive: formData.isActive,
    });
  };

  const handleEditSubmit = () => {
    if (!selectedPromo) return;
    updateMutation.mutate({
      id: selectedPromo.id,
      data: {
        name: formData.name,
        description: formData.description || null,
        maxRedemptions: parseInt(formData.maxRedemptions) || 100,
        isActive: formData.isActive,
      },
    });
  };

  const openEditDialog = (promo: PromoCode) => {
    setSelectedPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      maxRedemptions: String(promo.maxRedemptions),
      durationMonths: String(promo.durationMonths),
      expiresAt: promo.expiresAt || '',
      isActive: promo.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openWaitlistView = (promo: PromoCode) => {
    setSelectedPromo(promo);
    setActiveTab('waitlist');
  };

  const filteredCodes = promoCodes.filter(code =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalCodes: promoCodes.length,
    activeCodes: promoCodes.filter(c => c.isActive).length,
    totalRedemptions: promoCodes.reduce((sum, c) => sum + (c.currentRedemptions || 0), 0),
    remainingSlots: promoCodes.reduce((sum, c) => sum + (c.maxRedemptions - (c.currentRedemptions || 0)), 0),
  };

  if (isAuthChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {isAuditor && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-400" data-testid="banner-read-only">
            You are viewing this page in read-only mode
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
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
              <h1 className="text-2xl font-bold">Promo Codes</h1>
              <p className="text-muted-foreground">Manage launch promo codes and waitlists</p>
            </div>
          </div>
          {!isAuditor && (
            <Button
              onClick={() => {
                setFormData({ ...emptyFormData, code: generatePromoCode() });
                setIsCreateDialogOpen(true);
              }}
              data-testid="button-create-promo"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Promo Code
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCodes}</p>
                  <p className="text-sm text-muted-foreground">Total Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeCodes}</p>
                  <p className="text-sm text-muted-foreground">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalRedemptions}</p>
                  <p className="text-sm text-muted-foreground">Redemptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.remainingSlots}</p>
                  <p className="text-sm text-muted-foreground">Slots Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="codes" data-testid="tab-codes">
              <Key className="h-4 w-4 mr-2" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="waitlist" data-testid="tab-waitlist" disabled={!selectedPromo}>
              <Users className="h-4 w-4 mr-2" />
              Waitlist {selectedPromo ? `(${selectedPromo.code})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="codes" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Promo Codes</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search codes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-promo"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredCodes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No promo codes found</p>
                    <p className="text-sm mt-1">Create one to get started with your launch promotion</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCodes.map((promo) => (
                      <div
                        key={promo.id}
                        className="border rounded-lg p-4 hover-elevate"
                        data-testid={`promo-row-${promo.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-3 py-1.5 rounded font-mono text-sm font-semibold">
                                {promo.code}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyCode(promo.code)}
                                data-testid={`button-copy-${promo.id}`}
                              >
                                {copiedCode === promo.code ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <div>
                              <p className="font-medium">{promo.name}</p>
                              {promo.description && (
                                <p className="text-sm text-muted-foreground">{promo.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-lg font-semibold">
                                {promo.currentRedemptions || 0}/{promo.maxRedemptions}
                              </p>
                              <p className="text-xs text-muted-foreground">Redeemed</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-semibold">{promo.durationMonths}mo</p>
                              <p className="text-xs text-muted-foreground">Free Access</p>
                            </div>
                            <Badge variant={promo.isActive ? "default" : "secondary"}>
                              {promo.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openWaitlistView(promo)}
                                data-testid={`button-waitlist-${promo.id}`}
                              >
                                <Users className="h-4 w-4 mr-1" />
                                Waitlist
                              </Button>
                              {!isAuditor && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(promo)}
                                  data-testid={`button-edit-${promo.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {promo.currentRedemptions >= promo.maxRedemptions && (
                          <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-medium">Capacity reached - new signups will be added to waitlist</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waitlist" className="mt-6">
            {selectedPromo && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Waitlist for {selectedPromo.code}</CardTitle>
                      <CardDescription>
                        People waiting for a slot to open up ({selectedPromo.maxRedemptions - (selectedPromo.currentRedemptions || 0)} slots remaining)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes', selectedPromo.id, 'waitlist'] })}
                        data-testid="button-refresh-waitlist"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      {!isAuditor && (
                        <Button
                          onClick={() => notifyNextMutation.mutate(selectedPromo.id)}
                          disabled={notifyNextMutation.isPending || selectedWaitlist.length === 0}
                          data-testid="button-notify-next"
                        >
                          {notifyNextMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Bell className="h-4 w-4 mr-2" />
                          )}
                          Notify Next
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingWaitlist ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : selectedWaitlist.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No one on the waitlist yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedWaitlist.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between border rounded-lg p-3"
                          data-testid={`waitlist-entry-${entry.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{entry.username || entry.email}</p>
                              <p className="text-sm text-muted-foreground">{entry.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Joined {format(new Date(entry.joinedAt), 'MMM d, yyyy')}</span>
                            </div>
                            {entry.notifiedAt && (
                              <Badge variant="outline" className="text-green-600">
                                <Bell className="h-3 w-3 mr-1" />
                                Notified
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Promo Code</DialogTitle>
              <DialogDescription>
                Create a new promo code for your launch promotion
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="LAUNCH2026"
                  data-testid="input-promo-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Webinar Launch Special"
                  data-testid="input-promo-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="6 months free for first 100 webinar attendees"
                  rows={2}
                  data-testid="input-promo-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxRedemptions">Max Redemptions</Label>
                  <Input
                    id="maxRedemptions"
                    type="number"
                    value="100"
                    disabled
                    className="bg-muted"
                    data-testid="input-max-redemptions"
                  />
                  <p className="text-xs text-muted-foreground">Fixed at 100 for launch</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMonths">Free Months</Label>
                  <Input
                    id="durationMonths"
                    type="number"
                    value="6"
                    disabled
                    className="bg-muted"
                    data-testid="input-duration-months"
                  />
                  <p className="text-xs text-muted-foreground">Fixed at 6 months for launch</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-is-active"
                />
                <Label htmlFor="isActive">Active (can be redeemed)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={!formData.code || !formData.name || createMutation.isPending}
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Create Promo Code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Promo Code</DialogTitle>
              <DialogDescription>
                Update the promo code settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Promo Code</Label>
                <code className="block bg-muted px-3 py-2 rounded font-mono">{formData.code}</code>
                <p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Display Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  data-testid="input-edit-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-maxRedemptions">Max Redemptions</Label>
                <Input
                  id="edit-maxRedemptions"
                  type="number"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  data-testid="input-edit-max-redemptions"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-edit-is-active"
                />
                <Label htmlFor="edit-isActive">Active (can be redeemed)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={!formData.name || updateMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
