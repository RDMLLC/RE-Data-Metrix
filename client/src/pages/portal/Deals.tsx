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
  Bell,
  EyeOff
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
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [hideOtherAnalyses, setHideOtherAnalyses] = useState(true);
  const [showHiddenAnalyses, setShowHiddenAnalyses] = useState(false);
  
  // Additional sold modal fields
  const [actualHoldingCosts, setActualHoldingCosts] = useState("");
  const [actualSellingCosts, setActualSellingCosts] = useState("");
  
  const [estimatedClosingDate, setEstimatedClosingDate] = useState("");
  const [usedReDMxLender, setUsedReDMxLender] = useState<boolean | null>(null);
  const [selectedLenderId, setSelectedLenderId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [saveCustomLender, setSaveCustomLender] = useState(false);
  const [customLenderName, setCustomLenderName] = useState("");
  const [customLoanType, setCustomLoanType] = useState("");
  const [actualPurchasePrice, setActualPurchasePrice] = useState("");
  const [actualRehabBudget, setActualRehabBudget] = useState("");
  const [exitStrategy, setExitStrategy] = useState<string>("");
  const [sellPrice, setSellPrice] = useState("");
  const [closingCosts, setClosingCosts] = useState("");
  const [transactionalFundingCosts, setTransactionalFundingCosts] = useState("");
  const [assignmentFee, setAssignmentFee] = useState("");
  const [rehabLevel, setRehabLevel] = useState<string>("");
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [rehabCostBreakdown, setRehabCostBreakdown] = useState<Record<string, string>>({
    paint: "",
    flooring: "",
    kitchen: "",
    bathrooms: "",
    roof: "",
    hvac: "",
    windowsDoors: "",
    electrical: "",
    plumbing: "",
    exterior: "",
    other: "",
  });

  const { data: deals, isLoading } = useQuery<DealWithLender[]>({
    queryKey: ["/api/member/deals"],
  });

  // Fetch hidden analyses when toggle is enabled
  const { data: hiddenDeals } = useQuery<DealWithLender[]>({
    queryKey: ["/api/member/deals", "includeHidden"],
    queryFn: async () => {
      const response = await fetch("/api/member/deals?includeHidden=true");
      if (!response.ok) throw new Error("Failed to fetch hidden deals");
      const allDeals = await response.json();
      // Filter to only hidden ones
      return allDeals.filter((d: DealWithLender) => d.isHidden);
    },
    enabled: showHiddenAnalyses,
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

  const hideOtherAnalysesMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const response = await apiRequest("POST", `/api/member/deals/${dealId}/hide-other-analyses`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/deals"] });
      if (data.count > 0) {
        toast({
          title: "Previous Analyses Archived",
          description: `${data.count} other analyses have been archived for this property.`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive other analyses.",
        variant: "destructive",
      });
    },
  });

  const unhideDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const response = await apiRequest("POST", `/api/member/deals/${dealId}/unhide`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/deals", "includeHidden"] });
      toast({
        title: "Analysis Recovered",
        description: "The analysis has been restored and is now visible.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recover the analysis.",
        variant: "destructive",
      });
    },
  });

  const closeAllModals = () => {
    setUnderContractModalOpen(false);
    setWonModalOpen(false);
    setSoldModalOpen(false);
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
    setExitStrategy("");
    setSellPrice("");
    setClosingCosts("");
    setTransactionalFundingCosts("");
    setAssignmentFee("");
    setRehabLevel("");
    setShowDetailedBreakdown(false);
    setHideOtherAnalyses(true);
    setActualHoldingCosts("");
    setActualSellingCosts("");
    setRehabCostBreakdown({
      paint: "",
      flooring: "",
      kitchen: "",
      bathrooms: "",
      roof: "",
      hvac: "",
      windowsDoors: "",
      electrical: "",
      plumbing: "",
      exterior: "",
      other: "",
    });
  };

  const handleMarkUnderContract = (deal: DealWithLender) => {
    setSelectedDeal(deal);
    setUnderContractModalOpen(true);
  };

  const handleConfirmUnderContract = () => {
    if (!selectedDeal || !estimatedClosingDate || !exitStrategy) return;

    updateDealMutation.mutate({
      dealId: selectedDeal.id,
      updates: {
        status: "under_contract",
        underContractDate: new Date(),
        estimatedClosingDate: new Date(estimatedClosingDate),
        exitStrategy,
      },
    }, {
      onSuccess: () => {
        // Hide other analyses if user opted to do so
        if (hideOtherAnalyses && selectedDeal) {
          hideOtherAnalysesMutation.mutate(selectedDeal.id);
        }
      }
    });
  };

  const handleMarkWon = (deal: DealWithLender) => {
    setSelectedDeal(deal);
    const snapshot = deal.dealSnapshot as any;
    const results = deal.resultsSnapshot as any;
    
    // Pre-populate purchase price from analysis
    if (snapshot?.purchasePrice) {
      setActualPurchasePrice(snapshot.purchasePrice.toString());
    }
    if (snapshot?.rehabBudget) {
      setActualRehabBudget(snapshot.rehabBudget.toString());
    }
    if (deal.exitStrategy) {
      setExitStrategy(deal.exitStrategy);
    }
    
    // For wholesale deals, auto-populate wholesale-specific fields from analysis
    if (deal.exitStrategy === "wholesale") {
      // Sell price (B-C resale price) - check various sources
      if (snapshot?.sellPrice) {
        setSellPrice(snapshot.sellPrice.toString());
      } else if (snapshot?.resalePrice) {
        setSellPrice(snapshot.resalePrice.toString());
      } else if (results?.bToCPrice) {
        setSellPrice(results.bToCPrice.toString());
      }
      
      // Assignment fee / wholesale fee
      if (snapshot?.assignmentFee) {
        setAssignmentFee(snapshot.assignmentFee.toString());
      } else if (snapshot?.wholesaleFee) {
        setAssignmentFee(snapshot.wholesaleFee.toString());
      } else if (results?.profit) {
        // Use profit from results as the assignment fee
        setAssignmentFee(results.profit.toString());
      }
      
      // Transactional funding costs for double close
      if (snapshot?.transactionalFundingCosts) {
        setTransactionalFundingCosts(snapshot.transactionalFundingCosts.toString());
      } else if (results?.lenderFee) {
        // For double close deals, lender fee represents transactional funding cost
        setTransactionalFundingCosts(results.lenderFee.toString());
      }
      
      // Check if they applied for Straightline Funding (tracked in analysis)
      if (snapshot?.appliedForStraightline || results?.usedTransactionalFunding) {
        setUsedReDMxLender(true);
        // Note: lender selection will need to be done manually since availableLenders 
        // is only fetched when modal is open with usedReDMxLender === true
      }
    }
    
    setWonModalOpen(true);
  };

  const handleConfirmWon = () => {
    if (!selectedDeal) return;
    
    const effectiveExitStrategy = selectedDeal.exitStrategy || exitStrategy;
    if (!effectiveExitStrategy) {
      toast({
        title: "Exit Strategy Required",
        description: "Please select an exit strategy before completing the deal.",
        variant: "destructive",
      });
      return;
    }

    const updates: Partial<SavedDeal> = {
      status: "purchased",
      wonDate: new Date(),
      actualClosingDate: new Date(),
      purchaseDate: new Date(),
      usedReDMxLender: usedReDMxLender ?? false,
    };

    if (exitStrategy && !selectedDeal?.exitStrategy) {
      updates.exitStrategy = exitStrategy;
    }

    if (actualPurchasePrice) {
      updates.actualPurchasePrice = actualPurchasePrice;
    }
    if (sellPrice) {
      updates.sellPrice = sellPrice;
    }
    if (closingCosts) {
      updates.closingCosts = closingCosts;
    }
    
    if (exitStrategy === "wholesale") {
      if (assignmentFee) {
        updates.assignmentFee = assignmentFee;
      }
      if (transactionalFundingCosts) {
        updates.transactionalFundingCosts = transactionalFundingCosts;
      }
      updates.sellDate = new Date();
    } else {
      if (actualRehabBudget) {
        updates.actualRehabBudget = actualRehabBudget;
      }
      if (rehabLevel) {
        updates.rehabLevel = rehabLevel;
      }
      const hasBreakdownValues = Object.values(rehabCostBreakdown).some(v => v && v.trim() !== "");
      if (showDetailedBreakdown && hasBreakdownValues) {
        const breakdown: Record<string, number> = {};
        for (const [key, value] of Object.entries(rehabCostBreakdown)) {
          if (value && value.trim() !== "") {
            breakdown[key] = parseFloat(value);
          }
        }
        updates.rehabCostBreakdown = breakdown;
      }
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

  const handleRevertToDraft = (deal: DealWithLender) => {
    updateDealMutation.mutate({
      dealId: deal.id,
      updates: {
        status: "analyzing",
        lostDate: null,
        wonDate: null,
      },
    });
  };

  const handleMarkSold = (deal: DealWithLender) => {
    setSelectedDeal(deal);
    const snapshot = deal.dealSnapshot as any;
    const results = deal.resultsSnapshot as any;
    
    // Pre-populate from analysis or deal data
    if (deal.exitStrategy) {
      setExitStrategy(deal.exitStrategy);
    }
    if (deal.sellPrice) {
      setSellPrice(deal.sellPrice.toString());
    } else if (snapshot?.arv) {
      setSellPrice(snapshot.arv.toString());
    }
    if (deal.actualRehabBudget) {
      setActualRehabBudget(deal.actualRehabBudget.toString());
    } else if (snapshot?.rehabBudget) {
      setActualRehabBudget(snapshot.rehabBudget.toString());
    }
    if (deal.rehabLevel) {
      setRehabLevel(deal.rehabLevel);
    }
    // Pre-fill costs from analysis if available
    if (snapshot?.closingCosts) {
      setClosingCosts(snapshot.closingCosts.toString());
    }
    if (results?.holdingCosts) {
      setActualHoldingCosts(results.holdingCosts.toString());
    }
    if (results?.sellingCosts) {
      setActualSellingCosts(results.sellingCosts.toString());
    }
    
    setSoldModalOpen(true);
  };

  const handleConfirmSold = () => {
    if (!selectedDeal) return;
    
    // Validate required field
    if (!sellPrice) {
      toast({
        title: "Selling Price Required",
        description: "Please enter the selling price before marking as sold.",
        variant: "destructive",
      });
      return;
    }

    const updates: Partial<SavedDeal> = {
      status: "sold",
      soldDate: new Date(),
      sellDate: new Date(),
    };

    // Convert string values to proper format for decimal fields
    if (sellPrice) {
      updates.sellPrice = parseFloat(sellPrice).toString();
    }
    if (actualRehabBudget) {
      updates.actualRehabBudget = parseFloat(actualRehabBudget).toString();
    }
    if (rehabLevel) {
      updates.rehabLevel = rehabLevel;
    }
    if (closingCosts) {
      updates.actualClosingCosts = parseFloat(closingCosts).toString();
    }
    if (actualHoldingCosts) {
      updates.actualHoldingCosts = parseFloat(actualHoldingCosts).toString();
    }
    if (actualSellingCosts) {
      updates.actualSellingCosts = parseFloat(actualSellingCosts).toString();
    }
    
    // Handle detailed rehab breakdown
    const hasBreakdownValues = Object.values(rehabCostBreakdown).some(v => v && v.trim() !== "");
    if (showDetailedBreakdown && hasBreakdownValues) {
      const breakdown: Record<string, number> = {};
      for (const [key, value] of Object.entries(rehabCostBreakdown)) {
        if (value && value.trim() !== "") {
          breakdown[key] = parseFloat(value);
        }
      }
      updates.rehabCostBreakdown = breakdown;
    }

    updateDealMutation.mutate({ dealId: selectedDeal.id, updates }, {
      onSuccess: () => {
        // Hide other analyses if user opted to do so
        if (hideOtherAnalyses && selectedDeal) {
          hideOtherAnalysesMutation.mutate(selectedDeal.id);
        }
      }
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
      case "active":
      case "analyzing":
        return <Badge variant="secondary">Analyzing</Badge>;
      case "under_contract":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Under Contract</Badge>;
      case "purchased":
      case "won":
        return <Badge className="bg-success text-success-foreground">Purchased</Badge>;
      case "sold":
        return <Badge className="bg-emerald-600 text-white">Sold</Badge>;
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
    if (statusFilter === "all") {
      // Filter out lost deals from "All Deals" - they go in Archive section
      return groupedDeals
        .map(group => ({
          ...group,
          deals: group.deals.filter(deal => deal.status !== "lost"),
        }))
        .filter(group => group.deals.length > 0);
    }
    
    // Map "analyzing" filter to match draft/active/analyzing statuses
    const matchesFilter = (status: string) => {
      if (statusFilter === "analyzing") {
        return status === "draft" || status === "active" || status === "analyzing";
      }
      if (statusFilter === "purchased") {
        return status === "purchased" || status === "won";
      }
      return status === statusFilter;
    };
    
    return groupedDeals
      .map(group => ({
        ...group,
        deals: group.deals.filter(deal => matchesFilter(deal.status)),
      }))
      .filter(group => group.deals.length > 0);
  }, [groupedDeals, statusFilter]);

  // Get lost/archived deals for the Archive section
  const archivedGroups = useMemo(() => {
    if (!deals) return [];
    
    const lostDeals = deals.filter(deal => deal.status === "lost");
    if (lostDeals.length === 0) return [];
    
    const groups: Record<string, PropertyGroup> = {};
    lostDeals.forEach(deal => {
      const address = deal.propertyAddress || "No Address";
      if (!groups[address]) {
        groups[address] = {
          address,
          deals: [],
          bestROI: null,
          latestStatus: deal.status,
          latestDate: deal.lostDate ? new Date(deal.lostDate) : null,
        };
      }
      groups[address].deals.push(deal);
    });
    
    return Object.values(groups);
  }, [deals]);

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
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="purchased">Purchased</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
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
                                  {deal.exitStrategy && (
                                    <Badge variant="outline" className="text-xs">
                                      {deal.exitStrategy === "rehab" ? "Fix & Flip" : deal.exitStrategy === "wholetail" ? "Wholetail" : "Wholesale"}
                                    </Badge>
                                  )}
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

                                {(deal.status === "won" || deal.status === "purchased" || deal.status === "sold") && (
                                  <div className={`mt-3 p-2 rounded-md space-y-2 ${deal.status === "sold" ? "bg-emerald-500/10" : "bg-success/10"}`}>
                                    {deal.closedWithLender && (
                                      <div className={`text-sm flex items-center gap-2 ${deal.status === "sold" ? "text-emerald-600" : "text-success"}`}>
                                        <Check className="h-4 w-4" />
                                        Closed with: <span className="font-medium">{deal.closedWithLender.companyName}</span>
                                        {deal.closedWithProduct && (
                                          <span className="text-muted-foreground">({deal.closedWithProduct.productName})</span>
                                        )}
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                      {deal.actualPurchasePrice && (
                                        <div>
                                          <span className="text-muted-foreground">Purchase:</span>{" "}
                                          <span className="font-medium">{formatCurrency(deal.actualPurchasePrice)}</span>
                                        </div>
                                      )}
                                      {deal.sellPrice && (
                                        <div>
                                          <span className="text-muted-foreground">Sell:</span>{" "}
                                          <span className="font-medium">{formatCurrency(deal.sellPrice)}</span>
                                        </div>
                                      )}
                                      {deal.rehabLevel && (
                                        <div>
                                          <span className="text-muted-foreground">Rehab:</span>{" "}
                                          <span className="font-medium capitalize">{deal.rehabLevel}</span>
                                        </div>
                                      )}
                                      {deal.actualRehabBudget && (
                                        <div>
                                          <span className="text-muted-foreground">Rehab Cost:</span>{" "}
                                          <span className="font-medium">{formatCurrency(deal.actualRehabBudget)}</span>
                                        </div>
                                      )}
                                      {deal.assignmentFee && (
                                        <div>
                                          <span className="text-muted-foreground">Assignment:</span>{" "}
                                          <span className="font-medium">{formatCurrency(deal.assignmentFee)}</span>
                                        </div>
                                      )}
                                      {deal.closingCosts && (
                                        <div>
                                          <span className="text-muted-foreground">Closing:</span>{" "}
                                          <span className="font-medium">{formatCurrency(deal.closingCosts)}</span>
                                        </div>
                                      )}
                                      {deal.transactionalFundingCosts && (
                                        <div>
                                          <span className="text-muted-foreground">Trans. Funding:</span>{" "}
                                          <span className="font-medium">{formatCurrency(deal.transactionalFundingCosts)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {/* Analyzing → Under Contract or Lost */}
                                {(deal.status === "draft" || deal.status === "active" || deal.status === "analyzing") && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkUnderContract(deal)}
                                      data-testid={`button-under-contract-${deal.id}`}
                                    >
                                      <Building2 className="h-4 w-4 mr-1" />
                                      Under Contract
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
                                  </>
                                )}
                                {/* Under Contract → Purchased or Lost */}
                                {deal.status === "under_contract" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkWon(deal)}
                                      data-testid={`button-mark-purchased-${deal.id}`}
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
                                {/* Purchased → Sold or Lost */}
                                {(deal.status === "purchased" || deal.status === "won") && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkSold(deal)}
                                      data-testid={`button-mark-sold-${deal.id}`}
                                    >
                                      <DollarSign className="h-4 w-4 mr-1" />
                                      Sold
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
                                  </>
                                )}
                                {/* Lost → Reactivate */}
                                {deal.status === "lost" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRevertToDraft(deal)}
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

          {/* Archive Section for Lost Deals and Hidden Analyses */}
          {(archivedGroups.length > 0 || showHiddenAnalyses) && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold text-muted-foreground">Archive</h2>
                  <Badge variant="secondary" className="text-xs">
                    {archivedGroups.reduce((sum, g) => sum + g.deals.length, 0)} lost + {hiddenDeals?.length || 0} hidden
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-hidden"
                    checked={showHiddenAnalyses}
                    onCheckedChange={(checked) => setShowHiddenAnalyses(!!checked)}
                    data-testid="checkbox-show-hidden"
                  />
                  <label htmlFor="show-hidden" className="text-sm text-muted-foreground cursor-pointer">
                    Show hidden analyses
                  </label>
                </div>
              </div>
              <div className="grid gap-4">
                {archivedGroups.map((group) => (
                  <Card key={group.address} className="overflow-hidden opacity-60 hover:opacity-100 transition-opacity" data-testid={`card-archived-${group.address}`}>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <h3 className="font-medium text-muted-foreground">
                                {group.address}
                              </h3>
                              <Badge variant="destructive" className="text-xs">Lost</Badge>
                              <Badge variant="outline" className="text-xs">
                                {group.deals.length} {group.deals.length === 1 ? "analysis" : "analyses"}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">{formatDate(group.latestDate)}</span>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t px-4 py-2">
                          {group.deals.map((deal, index) => (
                            <div key={deal.id} className={`py-3 ${index > 0 ? "border-t" : ""}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Analysis #{index + 1}</span>
                                  {deal.exitStrategy && (
                                    <Badge variant="outline" className="text-xs">
                                      {deal.exitStrategy === "rehab" ? "Fix & Flip" : deal.exitStrategy === "wholetail" ? "Wholetail" : "Wholesale"}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRevertToDraft(deal)}
                                    data-testid={`button-reactivate-${deal.id}`}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reactivate
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => deleteDealMutation.mutate(deal.id)}
                                    data-testid={`button-delete-archived-${deal.id}`}
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

              {/* Hidden Analyses Section */}
              {showHiddenAnalyses && hiddenDeals && hiddenDeals.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">Hidden Analyses</h3>
                  </div>
                  <div className="space-y-2">
                    {hiddenDeals.map((deal) => (
                      <Card key={deal.id} className="p-3 opacity-60 hover:opacity-100 transition-opacity" data-testid={`card-hidden-${deal.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{deal.propertyAddress}</span>
                            <Badge variant="outline" className="text-xs">
                              {deal.exitStrategy === "rehab" ? "Fix & Flip" : deal.exitStrategy === "wholetail" ? "Wholetail" : deal.exitStrategy === "wholesale" ? "Wholesale" : "No Strategy"}
                            </Badge>
                            {getStatusBadge(deal.status as DealWithLender['status'])}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatDate(deal.createdAt || "")}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unhideDealMutation.mutate(deal.id)}
                              disabled={unhideDealMutation.isPending}
                              data-testid={`button-recover-${deal.id}`}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Recover
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              <Label htmlFor="exitStrategy">Exit Strategy</Label>
              <Select value={exitStrategy} onValueChange={setExitStrategy}>
                <SelectTrigger className="mt-2" data-testid="select-exit-strategy">
                  <SelectValue placeholder="Select your exit strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="rehab">Rehab (Fix & Flip)</SelectItem>
                  <SelectItem value="wholetail">Wholetail</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            
            {/* Soft delete other analyses option */}
            <div className="flex items-start space-x-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
              <Checkbox
                id="hideOtherAnalyses"
                checked={hideOtherAnalyses}
                onCheckedChange={(checked) => setHideOtherAnalyses(checked === true)}
                data-testid="checkbox-hide-analyses"
              />
              <div className="space-y-1">
                <Label htmlFor="hideOtherAnalyses" className="font-medium cursor-pointer">
                  Archive previous analyses
                </Label>
                <p className="text-xs text-muted-foreground">
                  Other analyses for this property will be archived. They can be recovered if needed.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnderContractModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUnderContract}
              disabled={!estimatedClosingDate || !exitStrategy || updateDealMutation.isPending}
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
            {selectedDeal?.exitStrategy ? (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Exit Strategy: <span className="font-medium text-foreground capitalize">{exitStrategy === "rehab" ? "Rehab (Fix & Flip)" : exitStrategy}</span>
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="wonExitStrategy">Exit Strategy</Label>
                <Select value={exitStrategy} onValueChange={setExitStrategy}>
                  <SelectTrigger className="mt-2" data-testid="select-won-exit-strategy">
                    <SelectValue placeholder="Select your exit strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="rehab">Rehab (Fix & Flip)</SelectItem>
                    <SelectItem value="wholetail">Wholetail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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
                <Label htmlFor="sellPrice">Sell Price</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2"
                  data-testid="input-sell-price"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="closingCosts">Closing Costs</Label>
              <Input
                id="closingCosts"
                type="number"
                value={closingCosts}
                onChange={(e) => setClosingCosts(e.target.value)}
                placeholder="Enter amount"
                className="mt-2"
                data-testid="input-closing-costs"
              />
            </div>

            {exitStrategy === "wholesale" && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Wholesale Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assignmentFee">Assignment Fee</Label>
                    <Input
                      id="assignmentFee"
                      type="number"
                      value={assignmentFee}
                      onChange={(e) => setAssignmentFee(e.target.value)}
                      placeholder="Enter amount"
                      className="mt-2"
                      data-testid="input-assignment-fee"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transactionalFunding">Transactional Funding Costs</Label>
                    <Input
                      id="transactionalFunding"
                      type="number"
                      value={transactionalFundingCosts}
                      onChange={(e) => setTransactionalFundingCosts(e.target.value)}
                      placeholder="If double close"
                      className="mt-2"
                      data-testid="input-transactional-funding"
                    />
                  </div>
                </div>
              </div>
            )}

            {(exitStrategy === "rehab" || exitStrategy === "wholetail") && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">{exitStrategy === "rehab" ? "Rehab Details" : "Wholetail Details"}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rehabBudget">Actual Rehab Budget</Label>
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
                  <div>
                    <Label htmlFor="rehabLevel">Rehab Level</Label>
                    <Select value={rehabLevel} onValueChange={setRehabLevel}>
                      <SelectTrigger className="mt-2" data-testid="select-rehab-level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light (Cosmetic)</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="heavy">Heavy</SelectItem>
                        <SelectItem value="full">Full (Gut Rehab)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showBreakdown"
                    checked={showDetailedBreakdown}
                    onCheckedChange={(checked) => setShowDetailedBreakdown(checked === true)}
                    data-testid="checkbox-show-breakdown"
                  />
                  <Label htmlFor="showBreakdown" className="text-sm font-normal cursor-pointer">
                    Add detailed cost breakdown (helps with future estimates)
                  </Label>
                </div>

                {showDetailedBreakdown && (
                  <div className="space-y-3 pl-6 border-l-2 border-muted">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Paint/Interior</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.paint}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, paint: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-paint"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Flooring</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.flooring}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, flooring: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-flooring"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Kitchen</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.kitchen}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, kitchen: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-kitchen"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bathrooms</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.bathrooms}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, bathrooms: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-bathrooms"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Roof</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.roof}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, roof: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-roof"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">HVAC</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.hvac}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, hvac: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-hvac"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Windows/Doors</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.windowsDoors}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, windowsDoors: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-windows"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Electrical</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.electrical}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, electrical: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-electrical"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Plumbing</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.plumbing}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, plumbing: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-plumbing"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Exterior</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.exterior}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, exterior: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-exterior"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Other</Label>
                        <Input
                          type="number"
                          value={rehabCostBreakdown.other}
                          onChange={(e) => setRehabCostBreakdown(prev => ({ ...prev, other: e.target.value }))}
                          placeholder="$"
                          className="mt-1 h-8"
                          data-testid="input-breakdown-other"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-4">
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

      {/* Sold Modal */}
      <Dialog open={soldModalOpen} onOpenChange={setSoldModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Property Sold
            </DialogTitle>
            <DialogDescription>
              {selectedDeal?.propertyAddress}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                Exit Strategy: <span className="font-medium text-foreground capitalize">{exitStrategy === "rehab" ? "Rehab (Fix & Flip)" : exitStrategy}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="soldSellPrice">Selling Price</Label>
                <Input
                  id="soldSellPrice"
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2"
                  data-testid="input-sold-sell-price"
                />
              </div>
              <div>
                <Label htmlFor="soldClosingCosts">Closing Costs</Label>
                <Input
                  id="soldClosingCosts"
                  type="number"
                  value={closingCosts}
                  onChange={(e) => setClosingCosts(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2"
                  data-testid="input-sold-closing-costs"
                />
              </div>
            </div>

            {(exitStrategy === "rehab" || exitStrategy === "wholetail") && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Rehab Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="soldRehabBudget">Actual Rehab Budget</Label>
                    <Input
                      id="soldRehabBudget"
                      type="number"
                      value={actualRehabBudget}
                      onChange={(e) => setActualRehabBudget(e.target.value)}
                      placeholder="Enter amount"
                      className="mt-2"
                      data-testid="input-sold-rehab-budget"
                    />
                  </div>
                  <div>
                    <Label htmlFor="soldRehabLevel">Rehab Level</Label>
                    <Select value={rehabLevel} onValueChange={setRehabLevel}>
                      <SelectTrigger className="mt-2" data-testid="select-sold-rehab-level">
                        <SelectValue placeholder="Select rehab level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="heavy">Heavy</SelectItem>
                        <SelectItem value="full">Full Gut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="soldHoldingCosts">Holding Costs</Label>
                <Input
                  id="soldHoldingCosts"
                  type="number"
                  value={actualHoldingCosts}
                  onChange={(e) => setActualHoldingCosts(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2"
                  data-testid="input-sold-holding-costs"
                />
              </div>
              <div>
                <Label htmlFor="soldSellingCosts">Selling Costs</Label>
                <Input
                  id="soldSellingCosts"
                  type="number"
                  value={actualSellingCosts}
                  onChange={(e) => setActualSellingCosts(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2"
                  data-testid="input-sold-selling-costs"
                />
              </div>
            </div>

            {/* Soft delete other analyses option */}
            <div className="flex items-start space-x-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-md border border-emerald-200 dark:border-emerald-800">
              <Checkbox
                id="hideOtherAnalysesSold"
                checked={hideOtherAnalyses}
                onCheckedChange={(checked) => setHideOtherAnalyses(checked === true)}
                data-testid="checkbox-hide-analyses-sold"
              />
              <div className="space-y-1">
                <Label htmlFor="hideOtherAnalysesSold" className="font-medium cursor-pointer">
                  Archive other analyses
                </Label>
                <p className="text-xs text-muted-foreground">
                  Other analyses for this property will be archived. They can be recovered if needed.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSoldModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSold}
              disabled={!sellPrice || updateDealMutation.isPending}
              data-testid="button-confirm-sold"
            >
              {updateDealMutation.isPending ? "Saving..." : "Mark as Sold"}
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
