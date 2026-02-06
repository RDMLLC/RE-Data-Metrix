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
  Ticket,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Search,
  DollarSign,
  Percent,
  Users,
  TrendingUp,
  Calendar,
  Download,
  Eye,
  Building2,
  RefreshCw,
  CreditCard,
  AlertCircle,
} from "lucide-react";

interface DiscountCode {
  id: string;
  code: string;
  displayName: string;
  partnerName: string | null;
  description: string | null;
  planApplicability: 'monthly' | 'annual' | 'both';
  percentOff: string | null;
  amountOff: string | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  createdAt: string | null;
  totalRedemptions: number;
  totalAmountDiscounted: number;
  lastUsedAt: string | null;
  stripeCouponId: string | null;
}

interface DiscountCodeStats {
  totalCodes: number;
  activeCodes: number;
  totalRedemptions: number;
  totalAmountDiscounted: number;
  topCodes: Array<{
    id: string;
    code: string;
    displayName: string;
    partnerName: string | null;
    redemptions: number;
    amountDiscounted: number;
  }>;
}

interface DiscountCodeUsage {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  plan: string;
  amountDiscounted: string;
  redeemedAt: string | null;
}

interface CodeFormData {
  code: string;
  displayName: string;
  partnerName: string;
  description: string;
  planApplicability: 'monthly' | 'annual' | 'both';
  discountType: 'percent' | 'amount';
  percentOff: string;
  amountOff: string;
  maxRedemptions: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
}

const emptyFormData: CodeFormData = {
  code: '',
  displayName: '',
  partnerName: '',
  description: '',
  planApplicability: 'both',
  discountType: 'percent',
  percentOff: '',
  amountOff: '',
  maxRedemptions: '',
  startAt: '',
  endAt: '',
  isActive: true,
};

export default function DiscountCodes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';
  const [searchQuery, setSearchQuery] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeToDelete, setCodeToDelete] = useState<DiscountCode | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [viewingUsage, setViewingUsage] = useState<DiscountCode | null>(null);
  const [formData, setFormData] = useState<CodeFormData>(emptyFormData);

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

  const { data: codes, isLoading } = useQuery<DiscountCode[]>({
    queryKey: ["/api/admin/discount-codes"],
  });

  const { data: stats } = useQuery<DiscountCodeStats>({
    queryKey: ["/api/admin/discount-codes/stats"],
  });

  const { data: usageData, isLoading: usageLoading } = useQuery<DiscountCodeUsage[]>({
    queryKey: ["/api/admin/discount-codes", viewingUsage?.id, "usage"],
    enabled: !!viewingUsage,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CodeFormData) => {
      const response = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: data.code,
          displayName: data.displayName,
          partnerName: data.partnerName || null,
          description: data.description || null,
          planApplicability: data.planApplicability,
          percentOff: data.discountType === 'percent' ? Number(data.percentOff) : null,
          amountOff: data.discountType === 'amount' ? Number(data.amountOff) : null,
          maxRedemptions: data.maxRedemptions ? Number(data.maxRedemptions) : null,
          startAt: data.startAt || null,
          endAt: data.endAt || null,
          isActive: data.isActive,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create discount code");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({
        title: "Discount Code Created",
        description: "The discount code has been created successfully.",
      });
      setShowCreateDialog(false);
      setFormData(emptyFormData);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create discount code",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CodeFormData }) => {
      const response = await fetch(`/api/admin/discount-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: data.code,
          displayName: data.displayName,
          partnerName: data.partnerName || null,
          description: data.description || null,
          planApplicability: data.planApplicability,
          percentOff: data.discountType === 'percent' ? Number(data.percentOff) : null,
          amountOff: data.discountType === 'amount' ? Number(data.amountOff) : null,
          maxRedemptions: data.maxRedemptions ? Number(data.maxRedemptions) : null,
          startAt: data.startAt || null,
          endAt: data.endAt || null,
          isActive: data.isActive,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update discount code");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({
        title: "Discount Code Updated",
        description: "The discount code has been updated successfully.",
      });
      setEditingCode(null);
      setFormData(emptyFormData);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update discount code",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/discount-codes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete discount code");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({
        title: "Discount Code Deleted",
        description: "The discount code has been deleted.",
      });
      setCodeToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete discount code",
        variant: "destructive",
      });
      setCodeToDelete(null);
    },
  });

  const syncStripeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/discount-codes/${id}/sync-stripe`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to sync to Stripe");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({
        title: "Synced to Stripe",
        description: `Created Stripe coupon: ${data.stripeCouponId}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync discount code to Stripe",
        variant: "destructive",
      });
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Code Copied",
      description: "Discount code copied to clipboard.",
    });
  };

  const handleEdit = (code: DiscountCode) => {
    setFormData({
      code: code.code,
      displayName: code.displayName,
      partnerName: code.partnerName || '',
      description: code.description || '',
      planApplicability: code.planApplicability,
      discountType: code.percentOff ? 'percent' : 'amount',
      percentOff: code.percentOff || '',
      amountOff: code.amountOff || '',
      maxRedemptions: code.maxRedemptions?.toString() || '',
      startAt: code.startAt ? code.startAt.split('T')[0] : '',
      endAt: code.endAt ? code.endAt.split('T')[0] : '',
      isActive: code.isActive,
    });
    setEditingCode(code);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.displayName) {
      toast({
        title: "Missing Fields",
        description: "Code and display name are required.",
        variant: "destructive",
      });
      return;
    }
    if (formData.discountType === 'percent' && !formData.percentOff) {
      toast({
        title: "Missing Discount",
        description: "Please enter a percentage off.",
        variant: "destructive",
      });
      return;
    }
    if (formData.discountType === 'amount' && !formData.amountOff) {
      toast({
        title: "Missing Discount",
        description: "Please enter an amount off.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.discountType === 'percent') {
      const percent = Number(formData.percentOff);
      if (percent <= 0 || percent > 100) {
        toast({
          title: "Invalid Discount",
          description: "Percent off must be between 1 and 100.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (formData.discountType === 'amount') {
      const amount = Number(formData.amountOff);
      if (amount <= 0) {
        toast({
          title: "Invalid Discount",
          description: "Amount off must be greater than 0.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (formData.startAt && formData.endAt && new Date(formData.startAt) >= new Date(formData.endAt)) {
      toast({
        title: "Invalid Dates",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleExportCSV = () => {
    if (!codes) return;
    
    const headers = ['Code', 'Display Name', 'Partner', 'Plan', 'Discount', 'Redemptions', 'Amount Saved', 'Status'];
    const rows = codes.map(code => [
      code.code,
      code.displayName,
      code.partnerName || '',
      code.planApplicability,
      code.percentOff ? `${code.percentOff}%` : `$${code.amountOff}`,
      code.totalRedemptions.toString(),
      `$${code.totalAmountDiscounted.toFixed(2)}`,
      code.isActive ? 'Active' : 'Inactive',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discount-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getUniquePartners = () => {
    if (!codes) return [];
    const partners = codes
      .map(c => c.partnerName)
      .filter((p): p is string => !!p);
    return Array.from(new Set(partners));
  };

  const filteredCodes = codes?.filter(code => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!code.code.toLowerCase().includes(query) && 
          !code.displayName.toLowerCase().includes(query) &&
          !(code.partnerName && code.partnerName.toLowerCase().includes(query))) {
        return false;
      }
    }
    if (partnerFilter !== 'all') {
      if (partnerFilter === 'none' && code.partnerName) return false;
      if (partnerFilter !== 'none' && code.partnerName !== partnerFilter) return false;
    }
    if (planFilter !== 'all' && code.planApplicability !== planFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !code.isActive) return false;
      if (statusFilter === 'inactive' && code.isActive) return false;
    }
    return true;
  });

  const partnerCodes = codes?.filter(c => c.partnerName) || [];
  const generalCodes = codes?.filter(c => !c.partnerName) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Discount Codes</h1>
              <p className="text-muted-foreground mt-1">
                Manage discount codes for partners and promotions
              </p>
            </div>
          </div>
          {!isAuditor && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={!codes || codes.length === 0}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => {
                  setFormData(emptyFormData);
                  setShowCreateDialog(true);
                }}
                data-testid="button-create-code"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Code
              </Button>
            </div>
          )}
        </div>

        {isAuditor && (
          <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="banner-read-only">
            <p className="text-sm text-amber-800 dark:text-amber-200">You are viewing this page in read-only mode.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalCodes || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activeCodes || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalRedemptions || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Uses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${(stats?.totalAmountDiscounted || 0).toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Total Discounted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All Codes ({codes?.length || 0})</TabsTrigger>
            <TabsTrigger value="partners" data-testid="tab-partners">Partner Codes ({partnerCodes.length})</TabsTrigger>
            <TabsTrigger value="general" data-testid="tab-general">General Codes ({generalCodes.length})</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search codes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-partner-filter">
                      <SelectValue placeholder="Partner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Partners</SelectItem>
                      <SelectItem value="none">No Partner</SelectItem>
                      {getUniquePartners().map(partner => (
                        <SelectItem key={partner} value={partner}>{partner}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-plan-filter">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading discount codes...
                  </div>
                ) : !filteredCodes || filteredCodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {codes?.length === 0 
                      ? "No discount codes yet. Create one to get started."
                      : "No codes match your filters."
                    }
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg"
                        data-testid={`discount-code-${code.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="bg-muted px-2 py-1 rounded font-mono font-bold text-sm">
                              {code.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyCode(code.code)}
                              data-testid={`button-copy-${code.id}`}
                            >
                              {copiedCode === code.code ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Badge variant={code.isActive ? "default" : "secondary"}>
                              {code.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">
                              {code.planApplicability === 'both' ? 'All Plans' : 
                               code.planApplicability === 'monthly' ? 'Monthly Only' : 'Annual Only'}
                            </Badge>
                            <Badge 
                              variant={code.stripeCouponId ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {code.stripeCouponId ? "Stripe Ready" : "No Stripe Coupon"}
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <span className="font-medium">{code.displayName}</span>
                            {code.partnerName && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                <Building2 className="h-3 w-3 mr-1" />
                                {code.partnerName}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              {code.percentOff ? (
                                <>
                                  <Percent className="h-3 w-3" />
                                  {code.percentOff}% off
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-3 w-3" />
                                  ${code.amountOff} off
                                </>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {code.totalRedemptions} uses
                              {code.maxRedemptions && ` / ${code.maxRedemptions} max`}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${code.totalAmountDiscounted.toFixed(2)} saved
                            </span>
                            {code.endAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expires: {formatDate(code.endAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingUsage(code)}
                            data-testid={`button-view-usage-${code.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isAuditor && (
                            <>
                              {!code.stripeCouponId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => syncStripeMutation.mutate(code.id)}
                                  disabled={syncStripeMutation.isPending}
                                  data-testid={`button-sync-stripe-${code.id}`}
                                >
                                  {syncStripeMutation.isPending ? (
                                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <CreditCard className="h-4 w-4 mr-1" />
                                  )}
                                  Sync to Stripe
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(code)}
                                data-testid={`button-edit-${code.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCodeToDelete(code)}
                                data-testid={`button-delete-${code.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partners" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Partner Discount Codes
                </CardTitle>
                <CardDescription>
                  Codes assigned to specific partners (REIAs, vendors, affiliates)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {partnerCodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No partner codes yet. Create a code with a partner name to track referrals.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {partnerCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg"
                        data-testid={`partner-code-${code.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="bg-muted px-2 py-1 rounded font-mono font-bold text-sm">
                              {code.code}
                            </code>
                            <Badge variant="outline">
                              <Building2 className="h-3 w-3 mr-1" />
                              {code.partnerName}
                            </Badge>
                            <Badge 
                              variant={code.stripeCouponId ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {code.stripeCouponId ? "Stripe Ready" : "No Stripe Coupon"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{code.displayName}</span>
                            <span>{code.totalRedemptions} members signed up</span>
                            <span>${code.totalAmountDiscounted.toFixed(2)} in discounts</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!code.stripeCouponId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncStripeMutation.mutate(code.id)}
                              disabled={syncStripeMutation.isPending}
                              data-testid={`button-sync-stripe-partner-${code.id}`}
                            >
                              {syncStripeMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CreditCard className="h-4 w-4 mr-1" />
                              )}
                              Sync
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingUsage(code)}
                            data-testid={`button-view-partner-${code.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Members
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  General Discount Codes
                </CardTitle>
                <CardDescription>
                  Promotional codes not tied to specific partners
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generalCodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No general codes yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {generalCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg"
                        data-testid={`general-code-${code.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="bg-muted px-2 py-1 rounded font-mono font-bold text-sm">
                              {code.code}
                            </code>
                            <Badge variant={code.isActive ? "default" : "secondary"}>
                              {code.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge 
                              variant={code.stripeCouponId ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {code.stripeCouponId ? "Stripe Ready" : "No Stripe Coupon"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{code.displayName}</span>
                            <span>
                              {code.percentOff ? `${code.percentOff}% off` : `$${code.amountOff} off`}
                            </span>
                            <span>{code.totalRedemptions} uses</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!code.stripeCouponId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncStripeMutation.mutate(code.id)}
                              disabled={syncStripeMutation.isPending}
                              data-testid={`button-sync-stripe-general-${code.id}`}
                            >
                              {syncStripeMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CreditCard className="h-4 w-4 mr-1" />
                              )}
                              Sync
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(code)}
                            data-testid={`button-edit-general-${code.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Performing Codes
                </CardTitle>
                <CardDescription>
                  Ranked by number of redemptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!stats?.topCodes || stats.topCodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No usage data yet. Codes will appear here once they're used.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.topCodes.map((code, index) => (
                      <div
                        key={code.id}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                        data-testid={`top-code-${code.id}`}
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono font-bold text-sm">
                              {code.code}
                            </code>
                            {code.partnerName && (
                              <Badge variant="outline" className="text-xs">
                                {code.partnerName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{code.displayName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{code.redemptions} uses</p>
                          <p className="text-sm text-muted-foreground">${code.amountDiscounted.toFixed(2)} saved</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateDialog || !!editingCode} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingCode(null);
          setFormData(emptyFormData);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCode ? "Edit Discount Code" : "Create Discount Code"}
            </DialogTitle>
            <DialogDescription>
              {editingCode 
                ? "Update the discount code details below."
                : "Create a new discount code for partners or promotions."
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE20"
                  data-testid="input-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Save 20%"
                  data-testid="input-display-name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="partnerName">Partner Name (optional)</Label>
              <Input
                id="partnerName"
                value={formData.partnerName}
                onChange={(e) => setFormData(prev => ({ ...prev, partnerName: e.target.value }))}
                placeholder="Atlanta REIA"
                data-testid="input-partner-name"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for general promotional codes
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Exclusive discount for REIA members"
                rows={2}
                data-testid="input-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select 
                  value={formData.discountType} 
                  onValueChange={(v: 'percent' | 'amount') => setFormData(prev => ({ ...prev, discountType: v }))}
                >
                  <SelectTrigger data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage Off</SelectItem>
                    <SelectItem value="amount">Fixed Amount Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === 'percent' ? 'Percent Off' : 'Amount Off ($)'}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={formData.discountType === 'percent' ? formData.percentOff : formData.amountOff}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    [formData.discountType === 'percent' ? 'percentOff' : 'amountOff']: e.target.value
                  }))}
                  placeholder={formData.discountType === 'percent' ? '20' : '5'}
                  data-testid="input-discount-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Applicability</Label>
                <Select 
                  value={formData.planApplicability} 
                  onValueChange={(v: 'monthly' | 'annual' | 'both') => setFormData(prev => ({ ...prev, planApplicability: v }))}
                >
                  <SelectTrigger data-testid="select-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">All Plans</SelectItem>
                    <SelectItem value="monthly">Monthly Only</SelectItem>
                    <SelectItem value="annual">Annual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRedemptions">Max Redemptions</Label>
                <Input
                  id="maxRedemptions"
                  type="number"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxRedemptions: e.target.value }))}
                  placeholder="Unlimited"
                  data-testid="input-max-redemptions"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startAt">Start Date (optional)</Label>
                <Input
                  id="startAt"
                  type="date"
                  value={formData.startAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">End Date (optional)</Label>
                <Input
                  id="endAt"
                  type="date"
                  value={formData.endAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, endAt: e.target.value }))}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                data-testid="switch-active"
              />
              <Label htmlFor="isActive">Code is active</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingCode(null);
                  setFormData(emptyFormData);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-code"
              >
                {(createMutation.isPending || updateMutation.isPending) 
                  ? "Saving..." 
                  : editingCode ? "Update Code" : "Create Code"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingUsage} onOpenChange={(open) => !open && setViewingUsage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usage Report: {viewingUsage?.code}
            </DialogTitle>
            <DialogDescription>
              {viewingUsage?.partnerName 
                ? `Members who signed up using ${viewingUsage.partnerName}'s code`
                : "All redemptions of this discount code"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold">{viewingUsage?.totalRedemptions || 0}</p>
                <p className="text-sm text-muted-foreground">Total Uses</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold">${(viewingUsage?.totalAmountDiscounted || 0).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Amount Discounted</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold">{formatDate(viewingUsage?.lastUsedAt || null)}</p>
                <p className="text-sm text-muted-foreground">Last Used</p>
              </div>
            </div>

            {usageLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading usage data...
              </div>
            ) : !usageData || usageData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No redemptions yet for this code.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">User</th>
                      <th className="text-left p-3 text-sm font-medium">Plan</th>
                      <th className="text-left p-3 text-sm font-medium">Discount</th>
                      <th className="text-left p-3 text-sm font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData.map((use) => (
                      <tr key={use.id} className="border-t">
                        <td className="p-3">
                          <p className="font-medium">{use.userName || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{use.userEmail || "—"}</p>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{use.plan}</Badge>
                        </td>
                        <td className="p-3">${Number(use.amountDiscounted).toFixed(2)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDate(use.redeemedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!codeToDelete} onOpenChange={() => setCodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the code{" "}
              <strong>{codeToDelete?.code}</strong>? This will also delete all usage history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => codeToDelete && deleteMutation.mutate(codeToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
