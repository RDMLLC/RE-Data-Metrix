import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ExternalLink,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Clock,
  Archive,
  RotateCcw,
  Building2,
  BellOff,
  Bell
} from "lucide-react";
import type { SavedDeal, Lender, LoanProduct } from "@shared/schema";

interface DealWithLender extends SavedDeal {
  closedWithLender?: Lender;
  closedWithProduct?: LoanProduct;
}

interface PropertyGroup {
  address: string;
  deals: DealWithLender[];
  bestROI: number | null;
  latestStatus: string;
  latestDate: Date | null;
}

export default function ViewDeals() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  
  const [selectedDeal, setSelectedDeal] = useState<DealWithLender | null>(null);
  const [underContractModalOpen, setUnderContractModalOpen] = useState(false);
  const [wonModalOpen, setWonModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  
  const [estimatedClosingDate, setEstimatedClosingDate] = useState("");
  const [usedReDMxLender, setUsedReDMxLender] = useState<boolean | null>(null);
  const [selectedLenderId, setSelectedLenderId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [saveCustomLender, setSaveCustomLender] = useState(false);
  const [customLenderName, setCustomLenderName] = useState("");
  const [customLoanType, setCustomLoanType] = useState("");
  const [actualPurchasePrice, setActualPurchasePrice] = useState("");
  const [actualRehabBudget, setActualRehabBudget] = useState("");

  const { data: deals, isLoading } = useQuery<DealWithLender[]>({
    queryKey: ["/api/member/deals"],
  });

  const { data: availableLenders } = useQuery<Lender[]>({
    queryKey: ["/api/lenders"],
    enabled: wonModalOpen && usedReDMxLender === true,
  });

  const { data: lenderProducts } = useQuery<LoanProduct[]>({
    queryKey: ["/api/lenders", selectedLenderId, "products"],
    enabled: !!selectedLenderId,
  });

  const { data: savedLenders } = useQuery<{ lender: Lender }[]>({
    queryKey: ["/api/member/saved-lenders"],
    enabled: wonModalOpen,
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ dealId, updates }: { dealId: string; updates: Partial<SavedDeal> }) => {
      const response = await apiRequest("PATCH", `/api/member/deals/${dealId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/stats"] });
      toast({
        title: "Deal Updated",
        description: "Deal status has been updated successfully.",
      });
      closeAllModals();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update deal status.",
        variant: "destructive",
      });
    },
  });

  const archivePropertyDealsMutation = useMutation({
    mutationFn: async ({ propertyAddress, status, lostDate }: { propertyAddress: string; status: string; lostDate?: Date }) => {
      const response = await apiRequest("POST", `/api/member/deals/archive-property`, { 
        propertyAddress, 
        status,
        lostDate 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/stats"] });
      toast({
        title: "Property Archived",
        description: "All analyses for this property have been archived.",
      });
      closeAllModals();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive property deals.",
        variant: "destructive",
      });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const response = await apiRequest("DELETE", `/api/member/deals/${dealId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/stats"] });
      toast({
        title: "Deal Deleted",
        description: "Deal has been removed from your account.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete deal.",
        variant: "destructive",
      });
    },
  });

  const stopRemindersMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const response = await apiRequest("POST", `/api/member/deals/${dealId}/stop-reminders`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/deals"] });
      toast({
        title: "Reminders Stopped",
        description: "You will no longer receive closing reminders for this deal.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stop reminders.",
        variant: "destructive",
      });
    },
  });

  const closeAllModals = () => {
    setUnderContractModalOpen(false);
    setWonModalOpen(false);
    setLostModalOpen(false);
    setSelectedDeal(null);
    setUsedReDMxLender(null);
    setSelectedLenderId("");
    setSelectedProductId("");
    setEstimatedClosingDate("");
    setSaveCustomLender(false);
    setCustomLenderName("");
    setCustomLoanType("");
    setActualPurchasePrice("");
    setActualRehabBudget("");
  };

  const handleMarkActive = (deal: DealWithLender) => {
    updateDealMutation.mutate({ dealId: deal.id, updates: { status: "active" } });
  };

  const handleMarkUnderContract = (deal: DealWithLender) => {
    setSelectedDeal(deal);
    setUnderContractModalOpen(true);
  };

  const handleConfirmUnderContract = () => {
    if (!selectedDeal || !estimatedClosingDate) return;

    updateDealMutation.mutate({
      dealId: selectedDeal.id,
      updates: {
        status: "under_contract",
        underContractDate: new Date(),
        estimatedClosingDate: new Date(estimatedClosingDate),
      },
    });
  };

  const handleMarkWon = (deal: DealWithLender) => {
    setSelectedDeal(deal);
    const snapshot = deal.dealSnapshot as any;
    if (snapshot?.purchasePrice) {
      setActualPurchasePrice(snapshot.purchasePrice.toString());
    }
    if (snapshot?.rehabBudget) {
      setActualRehabBudget(snapshot.rehabBudget.toString());
    }
    setWonModalOpen(true);
  };

  const handleConfirmWon = () => {
    if (!selectedDeal) return;

    const updates: Partial<SavedDeal> = {
      status: "won",
      wonDate: new Date(),
      actualClosingDate: new Date(),
      usedReDMxLender: usedReDMxLender ?? false,
    };

    if (actualPurchasePrice) {
      updates.actualPurchasePrice = actualPurchasePrice;
    }
    if (actualRehabBudget) {
      updates.actualRehabBudget = actualRehabBudget;
    }

    if (usedReDMxLender && selectedLenderId) {
      updates.closedWithLenderId = selectedLenderId;
      if (selectedProductId) {
        updates.closedWithProductId = selectedProductId;
      }
    } else if (!usedReDMxLender && saveCustomLender && customLenderName) {
      updates.customLenderInfo = {
        lenderName: customLenderName,
        loanType: customLoanType,
      };
    }

    updateDealMutation.mutate({ dealId: selectedDeal.id, updates });
  };

  const handleMarkLost = (deal: DealWithLender) => {
    setSelectedDeal(deal);
    setLostModalOpen(true);
  };

  const handleConfirmLost = () => {
    if (!selectedDeal) return;

    archivePropertyDealsMutation.mutate({
      propertyAddress: selectedDeal.propertyAddress || "",
      status: "lost",
      lostDate: new Date(),
    });
  };

  const handleRevertToActive = (deal: DealWithLender) => {
    updateDealMutation.mutate({
      dealId: deal.id,
      updates: {
        status: "active",
        lostDate: null,
        wonDate: null,
      },
    });
  };

  const togglePropertyExpansion = (address: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "active":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Active</Badge>;
      case "under_contract":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Under Contract</Badge>;
      case "won":
        return <Badge className="bg-success text-success-foreground">Won</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const groupedDeals = useMemo(() => {
    if (!deals) return [];

    const groups: Record<string, PropertyGroup> = {};

    deals.forEach(deal => {
      const address = deal.propertyAddress || "No Address";
      
      if (!groups[address]) {
        groups[address] = {
          address,
          deals: [],
          bestROI: null,
          latestStatus: deal.status,
          latestDate: deal.createdAt ? new Date(deal.createdAt) : null,
        };
      }

      groups[address].deals.push(deal);

      const roi = deal.roi ? parseFloat(deal.roi.toString()) : null;
      if (roi !== null && (groups[address].bestROI === null || roi > groups[address].bestROI)) {
        groups[address].bestROI = roi;
      }

      const dealDate = deal.createdAt ? new Date(deal.createdAt) : null;
      if (dealDate && (!groups[address].latestDate || dealDate > groups[address].latestDate)) {
        groups[address].latestDate = dealDate;
        groups[address].latestStatus = deal.status;
      }
    });

    return Object.values(groups).sort((a, b) => {
      if (!a.latestDate) return 1;
      if (!b.latestDate) return -1;
      return b.latestDate.getTime() - a.latestDate.getTime();
    });
  }, [deals]);

  const filteredGroups = useMemo(() => {
    if (statusFilter === "all") return groupedDeals;
    
    return groupedDeals
      .map(group => ({
        ...group,
        deals: group.deals.filter(deal => deal.status === statusFilter),
      }))
      .filter(group => group.deals.length > 0);
  }, [groupedDeals, statusFilter]);

  const totalDealsCount = filteredGroups.reduce((sum, group) => sum + group.deals.length, 0);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/portal")}
                data-testid="button-back-portal"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="text-deals-title">
                  Your Deals
                </h1>
                <p className="text-muted-foreground mt-1">
                  {filteredGroups.length} properties, {totalDealsCount} analyses
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44" data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deals</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => setLocation("/deal-analysis")}
                data-testid="button-new-deal"
              >
                New Deal
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="grid gap-4">
              {filteredGroups.map((group) => (
                <Card key={group.address} className="overflow-hidden" data-testid={`card-property-${group.address}`}>
                  <Collapsible
                    open={expandedProperties.has(group.address)}
                    onOpenChange={() => togglePropertyExpansion(group.address)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedProperties.has(group.address) ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-lg text-foreground">
                              {group.address}
                            </h3>
                            {getStatusBadge(group.latestStatus)}
                            <Badge variant="outline" className="ml-2">
                              {group.deals.length} {group.deals.length === 1 ? "analysis" : "analyses"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {group.bestROI !== null && (
                              <span>Best ROI: <span className="font-medium text-foreground">{group.bestROI.toFixed(2)}%</span></span>
                            )}
                            <span>{formatDate(group.latestDate)}</span>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t">
                        {group.deals.map((deal, index) => (
                          <div
                            key={deal.id}
                            className={`p-4 pl-14 ${index > 0 ? "border-t" : ""}`}
                            data-testid={`card-deal-${deal.id}`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Analysis #{index + 1}
                                  </span>
                                  {getStatusBadge(deal.status)}
                                  {deal.status === "under_contract" && deal.estimatedClosingDate && (
                                    <span className="text-xs text-amber-600 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Closing: {formatDate(deal.estimatedClosingDate)}
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                                  <div>
                                    <div className="text-xs text-muted-foreground">ARV</div>
                                    <div className="font-medium text-sm">{formatCurrency(deal.arv)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Profit</div>
                                    <div className="font-medium text-sm">{formatCurrency(deal.profit)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">ROI</div>
                                    <div className="font-medium text-sm">{deal.roi ? `${deal.roi}%` : "N/A"}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Created</div>
                                    <div className="font-medium text-sm">{formatDate(deal.createdAt)}</div>
                                  </div>
                                </div>

                                {deal.status === "won" && deal.closedWithLender && (
                                  <div className="mt-3 p-2 bg-success/10 rounded-md">
                                    <div className="text-sm text-success flex items-center gap-2">
                                      <Check className="h-4 w-4" />
                                      Closed with: <span className="font-medium">{deal.closedWithLender.companyName}</span>
                                      {deal.closedWithProduct && (
                                        <span className="text-muted-foreground">({deal.closedWithProduct.productName})</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {deal.status === "draft" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkActive(deal)}
                                    data-testid={`button-mark-active-${deal.id}`}
                                  >
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    Mark Active
                                  </Button>
                                )}
                                {deal.status === "active" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkUnderContract(deal)}
                                    data-testid={`button-under-contract-${deal.id}`}
                                  >
                                    <Building2 className="h-4 w-4 mr-1" />
                                    Under Contract
                                  </Button>
                                )}
                                {deal.status === "under_contract" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkWon(deal)}
                                      data-testid={`button-mark-won-${deal.id}`}
                                    >
                                      <TrendingUp className="h-4 w-4 mr-1" />
                                      Purchased
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkLost(deal)}
                                      data-testid={`button-mark-lost-${deal.id}`}
                                    >
                                      <TrendingDown className="h-4 w-4 mr-1" />
                                      Lost
                                    </Button>
                                    {!deal.stopAutomatedReminders && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => stopRemindersMutation.mutate(deal.id)}
                                        data-testid={`button-stop-reminders-${deal.id}`}
                                        title="Stop email reminders for this deal"
                                      >
                                        <BellOff className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {deal.stopAutomatedReminders && (
                                      <Badge variant="secondary" className="text-xs">
                                        <BellOff className="h-3 w-3 mr-1" />
                                        Reminders Off
                                      </Badge>
                                    )}
                                  </>
                                )}
                                {deal.status === "lost" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRevertToActive(deal)}
                                    data-testid={`button-revert-${deal.id}`}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reactivate
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/deal-analysis?dealId=${deal.id}`, "_blank")}
                                  data-testid={`button-view-deal-${deal.id}`}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteDealMutation.mutate(deal.id)}
                                  data-testid={`button-delete-deal-${deal.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Deals Found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === "all"
                  ? "Start analyzing properties to see your deals here."
                  : `No ${statusFilter.replace("_", " ")} deals found. Try a different filter.`}
              </p>
              <Button onClick={() => setLocation("/deal-analysis")} data-testid="button-start-first-deal">
                Start Your First Deal
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={underContractModalOpen} onOpenChange={setUnderContractModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              Under Contract
            </DialogTitle>
            <DialogDescription>
              {selectedDeal?.propertyAddress}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="closingDate">Estimated Closing Date</Label>
              <Input
                id="closingDate"
                type="date"
                value={estimatedClosingDate}
                onChange={(e) => setEstimatedClosingDate(e.target.value)}
                className="mt-2"
                data-testid="input-closing-date"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              We'll send you reminders as your closing date approaches.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnderContractModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUnderContract}
              disabled={!estimatedClosingDate || updateDealMutation.isPending}
              data-testid="button-confirm-under-contract"
            >
              {updateDealMutation.isPending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wonModalOpen} onOpenChange={setWonModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Congratulations on Your Purchase!
            </DialogTitle>
            <DialogDescription>
              {selectedDeal?.propertyAddress}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchasePrice">Actual Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={actualPurchasePrice}
                  onChange={(e) => setActualPurchasePrice(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2"
                  data-testid="input-purchase-price"
                />
              </div>
              <div>
                <Label htmlFor="rehabBudget">Rehab Budget</Label>
                <Input
                  id="rehabBudget"
                  type="number"
                  value={actualRehabBudget}
                  onChange={(e) => setActualRehabBudget(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2"
                  data-testid="input-rehab-budget"
                />
              </div>
            </div>

            <div>
              <Label className="text-base">Did you use an RE Data Metrix lender?</Label>
              <div className="flex gap-3 mt-2">
                <Button
                  variant={usedReDMxLender === true ? "default" : "outline"}
                  onClick={() => setUsedReDMxLender(true)}
                  data-testid="button-used-lender-yes"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Yes
                </Button>
                <Button
                  variant={usedReDMxLender === false ? "default" : "outline"}
                  onClick={() => {
                    setUsedReDMxLender(false);
                    setSelectedLenderId("");
                    setSelectedProductId("");
                  }}
                  data-testid="button-used-lender-no"
                >
                  <X className="h-4 w-4 mr-1" />
                  No
                </Button>
              </div>
            </div>

            {usedReDMxLender === true && (
              <>
                <div>
                  <Label>Which lender did you use?</Label>
                  <Select value={selectedLenderId} onValueChange={setSelectedLenderId}>
                    <SelectTrigger className="mt-2" data-testid="select-lender">
                      <SelectValue placeholder="Select a lender" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedLenders?.map((sl) => (
                        <SelectItem key={sl.lender.id} value={sl.lender.id}>
                          {sl.lender.companyName} (Saved)
                        </SelectItem>
                      ))}
                      {availableLenders?.filter(l => !savedLenders?.some(sl => sl.lender.id === l.id)).map((lender) => (
                        <SelectItem key={lender.id} value={lender.id}>
                          {lender.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLenderId && lenderProducts && lenderProducts.length > 0 && (
                  <div>
                    <Label>Which loan product did you use?</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className="mt-2" data-testid="select-product">
                        <SelectValue placeholder="Select a loan product" />
                      </SelectTrigger>
                      <SelectContent>
                        {lenderProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {usedReDMxLender === false && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="saveCustomLender"
                    checked={saveCustomLender}
                    onCheckedChange={(checked) => setSaveCustomLender(checked === true)}
                    data-testid="checkbox-save-lender"
                  />
                  <Label htmlFor="saveCustomLender" className="text-sm font-normal cursor-pointer">
                    Save this lender for future calculations
                  </Label>
                </div>

                {saveCustomLender && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customLender">Lender Name</Label>
                      <Input
                        id="customLender"
                        value={customLenderName}
                        onChange={(e) => setCustomLenderName(e.target.value)}
                        placeholder="Enter lender name"
                        className="mt-2"
                        data-testid="input-custom-lender"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customLoanType">Loan Type</Label>
                      <Input
                        id="customLoanType"
                        value={customLoanType}
                        onChange={(e) => setCustomLoanType(e.target.value)}
                        placeholder="e.g., Fix & Flip"
                        className="mt-2"
                        data-testid="input-loan-type"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWonModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmWon}
              disabled={usedReDMxLender === null || updateDealMutation.isPending}
              data-testid="button-confirm-won"
            >
              {updateDealMutation.isPending ? "Saving..." : "Mark as Purchased"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lostModalOpen} onOpenChange={setLostModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Archive Property
            </DialogTitle>
            <DialogDescription>
              {selectedDeal?.propertyAddress}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              All analyses for this property will be archived. You can reactivate them later if needed.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLostModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmLost}
              disabled={archivePropertyDealsMutation.isPending}
              data-testid="button-confirm-lost"
            >
              {archivePropertyDealsMutation.isPending ? "Archiving..." : "Archive Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
