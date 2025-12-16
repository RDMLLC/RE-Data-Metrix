import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Search,
  Building2,
  Users,
  Wrench,
  Target,
  MapPin,
  Calculator,
  BarChart3,
  Layers,
  ExternalLink,
} from "lucide-react";
import type { Affiliate, AffiliateCategory } from "@shared/schema";

const iconOptions = [
  { value: "Building2", label: "Building", icon: Building2 },
  { value: "Users", label: "Users", icon: Users },
  { value: "Wrench", label: "Wrench", icon: Wrench },
  { value: "Target", label: "Target", icon: Target },
  { value: "MapPin", label: "Map Pin", icon: MapPin },
  { value: "Calculator", label: "Calculator", icon: Calculator },
  { value: "BarChart3", label: "Bar Chart", icon: BarChart3 },
  { value: "Search", label: "Search", icon: Search },
  { value: "Layers", label: "Layers", icon: Layers },
];

const getIconComponent = (iconName: string) => {
  const found = iconOptions.find(opt => opt.value === iconName);
  return found ? found.icon : Building2;
};

interface AffiliateFormData {
  name: string;
  description: string;
  benefits: string;
  referralLink: string;
  portalUrl: string;
  categories: string[];
  iconName: string;
  referralFee: string;
  referralFeeType: string;
  isActive: boolean;
  sortOrder: number;
}

interface CategoryFormData {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

const emptyAffiliateForm: AffiliateFormData = {
  name: '',
  description: '',
  benefits: '',
  referralLink: '',
  portalUrl: '',
  categories: [],
  iconName: 'Building2',
  referralFee: '',
  referralFeeType: '',
  isActive: true,
  sortOrder: 0,
};

const emptyCategoryForm: CategoryFormData = {
  id: '',
  name: '',
  description: '',
  sortOrder: 0,
};

export default function Affiliates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [affiliateToDelete, setAffiliateToDelete] = useState<Affiliate | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<AffiliateCategory | null>(null);
  const [showAffiliateDialog, setShowAffiliateDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [editingCategory, setEditingCategory] = useState<AffiliateCategory | null>(null);
  const [affiliateForm, setAffiliateForm] = useState<AffiliateFormData>(emptyAffiliateForm);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(emptyCategoryForm);

  const { data: affiliates, isLoading } = useQuery<Affiliate[]>({
    queryKey: ["/api/admin/affiliates"],
  });

  const { data: categories } = useQuery<AffiliateCategory[]>({
    queryKey: ["/api/admin/affiliate-categories"],
  });

  const createAffiliateMutation = useMutation({
    mutationFn: async (data: AffiliateFormData) => {
      const response = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          benefits: data.benefits.split('\n').filter(b => b.trim()),
          referralLink: data.referralLink,
          portalUrl: data.portalUrl || null,
          categories: data.categories,
          features: [], // Categories now unified - features field deprecated
          iconName: data.iconName,
          referralFee: data.referralFee || null,
          referralFeeType: data.referralFeeType || null,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create affiliate");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      toast({ title: "Affiliate Created", description: "The affiliate has been created successfully." });
      setShowAffiliateDialog(false);
      setAffiliateForm(emptyAffiliateForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAffiliateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AffiliateFormData }) => {
      const response = await fetch(`/api/admin/affiliates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          benefits: data.benefits.split('\n').filter(b => b.trim()),
          referralLink: data.referralLink,
          portalUrl: data.portalUrl || null,
          categories: data.categories,
          features: [], // Categories now unified - features field deprecated
          iconName: data.iconName,
          referralFee: data.referralFee || null,
          referralFeeType: data.referralFeeType || null,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update affiliate");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      toast({ title: "Affiliate Updated", description: "The affiliate has been updated successfully." });
      setShowAffiliateDialog(false);
      setEditingAffiliate(null);
      setAffiliateForm(emptyAffiliateForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAffiliateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/affiliates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete affiliate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      toast({ title: "Affiliate Deleted", description: "The affiliate has been deleted." });
      setAffiliateToDelete(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete affiliate", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/admin/affiliates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates"] });
      toast({ 
        title: "Status Updated", 
        description: `Affiliate is now ${variables.isActive ? "active" : "inactive"}.` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const upsertCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await fetch("/api/admin/affiliate-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-categories"] });
      toast({ title: "Category Saved", description: "The category has been saved successfully." });
      setShowCategoryDialog(false);
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/affiliate-categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-categories"] });
      toast({ title: "Category Deleted", description: "The category has been deleted." });
      setCategoryToDelete(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    },
  });

  const handleEditAffiliate = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    setAffiliateForm({
      name: affiliate.name,
      description: affiliate.description,
      benefits: affiliate.benefits.join('\n'),
      referralLink: affiliate.referralLink,
      portalUrl: affiliate.portalUrl || '',
      categories: affiliate.categories,
      iconName: affiliate.iconName,
      referralFee: affiliate.referralFee || '',
      referralFeeType: affiliate.referralFeeType || '',
      isActive: affiliate.isActive,
      sortOrder: affiliate.sortOrder || 0,
    });
    setShowAffiliateDialog(true);
  };

  const handleEditCategory = (category: AffiliateCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder || 0,
    });
    setShowCategoryDialog(true);
  };

  const handleAffiliateSubmit = () => {
    if (editingAffiliate) {
      updateAffiliateMutation.mutate({ id: editingAffiliate.id, data: affiliateForm });
    } else {
      createAffiliateMutation.mutate(affiliateForm);
    }
  };

  const handleCategorySubmit = () => {
    upsertCategoryMutation.mutate(categoryForm);
  };

  const toggleCategory = (categoryId: string) => {
    setAffiliateForm(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };


  const filteredAffiliates = affiliates?.filter(affiliate => {
    const matchesSearch = affiliate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      affiliate.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && affiliate.isActive) ||
      (statusFilter === "inactive" && !affiliate.isActive);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort by active status first (active before inactive), then alphabetically by name
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const getCategoryName = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId)?.name || categoryId;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Affiliate Management</h1>
            <p className="text-muted-foreground">Manage affiliate programs and categories</p>
          </div>
        </div>

        <Tabs defaultValue="affiliates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="affiliates" data-testid="tab-affiliates">Affiliates</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="affiliates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Affiliate Programs</CardTitle>
                <Button onClick={() => {
                  setEditingAffiliate(null);
                  setAffiliateForm(emptyAffiliateForm);
                  setShowAffiliateDialog(true);
                }} data-testid="button-add-affiliate">
                  <Plus className="h-4 w-4 mr-2" /> Add Affiliate
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search affiliates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading affiliates...</div>
                ) : filteredAffiliates?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No affiliates found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Name</th>
                          <th className="text-left py-3 px-4 font-medium">Categories</th>
                          <th className="text-left py-3 px-4 font-medium">Referral Fee</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-right py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAffiliates?.map((affiliate) => {
                          const IconComponent = getIconComponent(affiliate.iconName);
                          return (
                            <tr key={affiliate.id} className="border-b hover-elevate" data-testid={`row-affiliate-${affiliate.id}`}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-md">
                                    <IconComponent className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium" data-testid={`text-affiliate-name-${affiliate.id}`}>{affiliate.name}</div>
                                    <div className="text-sm text-muted-foreground truncate max-w-xs">{affiliate.description}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {affiliate.categories.map(cat => (
                                    <Badge key={cat} variant="secondary" className="text-xs">
                                      {getCategoryName(cat)}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {affiliate.referralFee ? (
                                  <span className="text-sm">
                                    {affiliate.referralFee} {affiliate.referralFeeType && `(${affiliate.referralFeeType})`}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={affiliate.isActive}
                                    onCheckedChange={(checked) => 
                                      toggleStatusMutation.mutate({ id: affiliate.id, isActive: checked })
                                    }
                                    disabled={toggleStatusMutation.isPending}
                                    data-testid={`switch-status-${affiliate.id}`}
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {affiliate.isActive ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => window.open(affiliate.referralLink, '_blank')}
                                    data-testid={`button-view-link-${affiliate.id}`}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditAffiliate(affiliate)}
                                    data-testid={`button-edit-${affiliate.id}`}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setAffiliateToDelete(affiliate)}
                                    data-testid={`button-delete-${affiliate.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Affiliate Categories</CardTitle>
                <Button onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm(emptyCategoryForm);
                  setShowCategoryDialog(true);
                }} data-testid="button-add-category">
                  <Plus className="h-4 w-4 mr-2" /> Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {categories?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No categories found</div>
                ) : (
                  <div className="space-y-2">
                    {categories?.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-4 border rounded-md hover-elevate" data-testid={`row-category-${category.id}`}>
                        <div>
                          <div className="font-medium" data-testid={`text-category-name-${category.id}`}>{category.name}</div>
                          <div className="text-sm text-muted-foreground">{category.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">ID: {category.id}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCategory(category)}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCategoryToDelete(category)}
                            data-testid={`button-delete-category-${category.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showAffiliateDialog} onOpenChange={setShowAffiliateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAffiliate ? "Edit Affiliate" : "Add New Affiliate"}</DialogTitle>
              <DialogDescription>
                {editingAffiliate ? "Update the affiliate program details." : "Create a new affiliate program."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={affiliateForm.name}
                    onChange={(e) => setAffiliateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Affiliate name"
                    data-testid="input-affiliate-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iconName">Icon</Label>
                  <Select value={affiliateForm.iconName} onValueChange={(value) => setAffiliateForm(prev => ({ ...prev, iconName: value }))}>
                    <SelectTrigger data-testid="select-icon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(opt => {
                        const Icon = opt.icon;
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={affiliateForm.description}
                  onChange={(e) => setAffiliateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the affiliate program"
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits (one per line)</Label>
                <Textarea
                  id="benefits"
                  value={affiliateForm.benefits}
                  onChange={(e) => setAffiliateForm(prev => ({ ...prev, benefits: e.target.value }))}
                  placeholder="Enter each benefit on a new line"
                  rows={4}
                  data-testid="input-benefits"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralLink">Referral Link *</Label>
                <Input
                  id="referralLink"
                  value={affiliateForm.referralLink}
                  onChange={(e) => setAffiliateForm(prev => ({ ...prev, referralLink: e.target.value }))}
                  placeholder="https://..."
                  data-testid="input-referral-link"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portalUrl">Portal URL (Dashboard Login)</Label>
                <Input
                  id="portalUrl"
                  value={affiliateForm.portalUrl}
                  onChange={(e) => setAffiliateForm(prev => ({ ...prev, portalUrl: e.target.value }))}
                  placeholder="https://affiliate.example.com/login"
                  data-testid="input-portal-url"
                />
              </div>

              <div className="space-y-2">
                <Label>Categories *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {categories?.map(cat => (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${cat.id}`}
                        checked={affiliateForm.categories.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                        data-testid={`checkbox-category-${cat.id}`}
                      />
                      <Label htmlFor={`cat-${cat.id}`} className="text-sm font-normal cursor-pointer">
                        {cat.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referralFee">Referral Fee</Label>
                  <Input
                    id="referralFee"
                    value={affiliateForm.referralFee}
                    onChange={(e) => setAffiliateForm(prev => ({ ...prev, referralFee: e.target.value }))}
                    placeholder="e.g. $50, 10%"
                    data-testid="input-referral-fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referralFeeType">Fee Type</Label>
                  <Input
                    id="referralFeeType"
                    value={affiliateForm.referralFeeType}
                    onChange={(e) => setAffiliateForm(prev => ({ ...prev, referralFeeType: e.target.value }))}
                    placeholder="e.g. per signup, commission"
                    data-testid="input-fee-type"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={affiliateForm.isActive}
                  onCheckedChange={(checked) => setAffiliateForm(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-is-active"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAffiliateDialog(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={handleAffiliateSubmit}
                disabled={createAffiliateMutation.isPending || updateAffiliateMutation.isPending}
                data-testid="button-save-affiliate"
              >
                {(createAffiliateMutation.isPending || updateAffiliateMutation.isPending) ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "Update the category details." : "Create a new affiliate category."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category ID *</Label>
                <Input
                  id="categoryId"
                  value={categoryForm.id}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  placeholder="e.g. lead-generation"
                  disabled={!!editingCategory}
                  data-testid="input-category-id"
                />
                <p className="text-xs text-muted-foreground">Use lowercase with hyphens, e.g. "lead-generation"</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryName">Name *</Label>
                <Input
                  id="categoryName"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Category display name"
                  data-testid="input-category-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryDescription">Description *</Label>
                <Textarea
                  id="categoryDescription"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this category"
                  rows={3}
                  data-testid="input-category-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categorySortOrder">Sort Order</Label>
                <Input
                  id="categorySortOrder"
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  data-testid="input-category-sort-order"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)} data-testid="button-cancel-category">
                Cancel
              </Button>
              <Button
                onClick={handleCategorySubmit}
                disabled={upsertCategoryMutation.isPending}
                data-testid="button-save-category"
              >
                {upsertCategoryMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!affiliateToDelete} onOpenChange={() => setAffiliateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Affiliate</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{affiliateToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => affiliateToDelete && deleteAffiliateMutation.mutate(affiliateToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{categoryToDelete?.name}"? Affiliates using this category will need to be updated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-category">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => categoryToDelete && deleteCategoryMutation.mutate(categoryToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-category"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
