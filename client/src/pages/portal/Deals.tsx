import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  X
} from "lucide-react";
import type { SavedDeal, Lender, LoanProduct } from "@shared/schema";

interface DealWithLender extends SavedDeal {
  closedWithLender?: Lender;
  closedWithProduct?: LoanProduct;
}

export default function ViewDeals() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDeal, setSelectedDeal] = useState<DealWithLender | null>(null);
  const [wonModalOpen, setWonModalOpen] = useState(false);
  const [usedReDMxLender, setUsedReDMxLender] = useState<boolean | null>(null);
  const [selectedLenderId, setSelectedLenderId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const { data: deals, isLoading } = useQuery<DealWithLender[]>({
    queryKey: ["/api/member/deals", statusFilter],
  });

  const { data: availableLenders } = useQuery<Lender[]>({
    queryKey: ["/api/lenders"],
    enabled: wonModalOpen && usedReDMxLender === true,
  });

  const { data: lenderProducts } = useQuery<LoanProduct[]>({
    queryKey: ["/api/lenders", selectedLenderId, "products"],
    enabled: !!selectedLenderId,
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
      setWonModalOpen(false);
      setSelectedDeal(null);
      setUsedReDMxLender(null);
      setSelectedLenderId("");
      setSelectedProductId("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update deal status.",
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

  const handleMarkWon = (deal: DealWithLender) => {
    setSelectedDeal(deal);
    setWonModalOpen(true);
  };

  const handleConfirmWon = () => {
    if (!selectedDeal) return;

    const updates: Partial<SavedDeal> = {
      status: "won",
      wonDate: new Date(),
      usedReDMxLender: usedReDMxLender ?? false,
    };

    if (usedReDMxLender && selectedLenderId) {
      updates.closedWithLenderId = selectedLenderId;
      if (selectedProductId) {
        updates.closedWithProductId = selectedProductId;
      }
    }

    updateDealMutation.mutate({ dealId: selectedDeal.id, updates });
  };

  const handleMarkLost = (deal: DealWithLender) => {
    updateDealMutation.mutate({
      dealId: deal.id,
      updates: {
        status: "lost",
        lostDate: new Date(),
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "final":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Final</Badge>;
      case "won":
        return <Badge className="bg-success text-success-foreground">Won</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      case "active":
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    const num = typeof value === "string" ? parseFloat(value) : value;
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

  const filteredDeals = deals?.filter((deal) => {
    if (statusFilter === "all") return true;
    return deal.status === statusFilter;
  });

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
                  {filteredDeals?.length ?? 0} deals found
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deals</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
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
          ) : filteredDeals && filteredDeals.length > 0 ? (
            <div className="grid gap-4">
              {filteredDeals.map((deal) => (
                <Card key={deal.id} className="hover-elevate" data-testid={`card-deal-${deal.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-lg text-foreground">
                            {deal.propertyAddress || "Property Address Not Set"}
                          </h3>
                          {getStatusBadge(deal.status)}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-muted-foreground">ARV</div>
                            <div className="font-medium" data-testid={`deal-arv-${deal.id}`}>
                              {formatCurrency(deal.arv)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Profit</div>
                            <div className="font-medium" data-testid={`deal-profit-${deal.id}`}>
                              {formatCurrency(deal.profit)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">ROI</div>
                            <div className="font-medium" data-testid={`deal-roi-${deal.id}`}>
                              {deal.roi ? `${deal.roi}%` : "N/A"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created
                            </div>
                            <div className="font-medium text-sm">
                              {formatDate(deal.createdAt)}
                            </div>
                          </div>
                        </div>

                        {deal.status === "won" && deal.closedWithLender && (
                          <div className="mt-3 p-2 bg-success/10 rounded-md">
                            <div className="text-sm text-success flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              Closed with: <span className="font-medium">{deal.closedWithLender.companyName}</span>
                              {deal.closedWithProduct && (
                                <span className="text-muted-foreground">
                                  ({deal.closedWithProduct.productName})
                                </span>
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
                            onClick={() => updateDealMutation.mutate({ dealId: deal.id, updates: { status: "final" } })}
                            data-testid={`button-mark-final-${deal.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Mark Final
                          </Button>
                        )}
                        {deal.status === "final" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateDealMutation.mutate({ dealId: deal.id, updates: { status: "draft" } })}
                            data-testid={`button-mark-draft-${deal.id}`}
                          >
                            Move to Drafts
                          </Button>
                        )}
                        {(deal.status === "active" || deal.status === "final") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkWon(deal)}
                              data-testid={`button-mark-won-${deal.id}`}
                            >
                              <TrendingUp className="h-4 w-4 mr-1" />
                              Mark Won
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkLost(deal)}
                              data-testid={`button-mark-lost-${deal.id}`}
                            >
                              <TrendingDown className="h-4 w-4 mr-1" />
                              Mark Lost
                            </Button>
                          </>
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
                  </CardContent>
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
                  : `No ${statusFilter} deals found. Try a different filter.`}
              </p>
              <Button onClick={() => setLocation("/deal-analysis")} data-testid="button-start-first-deal">
                Start Your First Deal
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={wonModalOpen} onOpenChange={setWonModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Congratulations on Your Win!
            </DialogTitle>
            <DialogDescription>
              Help us track the effectiveness of our lender network.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Did you use an RE Data Metrix lender for this deal?
              </label>
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
                  <label className="text-sm font-medium text-foreground">
                    Which lender did you use?
                  </label>
                  <Select value={selectedLenderId} onValueChange={setSelectedLenderId}>
                    <SelectTrigger className="mt-2" data-testid="select-lender">
                      <SelectValue placeholder="Select a lender" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLenders?.map((lender) => (
                        <SelectItem key={lender.id} value={lender.id}>
                          {lender.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLenderId && lenderProducts && lenderProducts.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Which loan product did you use?
                    </label>
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

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setWonModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmWon}
                disabled={usedReDMxLender === null || updateDealMutation.isPending}
                data-testid="button-confirm-won"
              >
                {updateDealMutation.isPending ? "Saving..." : "Mark as Won"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
