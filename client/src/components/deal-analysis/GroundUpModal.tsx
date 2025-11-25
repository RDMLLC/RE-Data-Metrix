import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, ExternalLink, HardHat, Star, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GroundUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NewConstructionLender {
  lenderId: string;
  companyName: string;
  referralAmount: string;
  referralType: string;
  referralLink: string | null;
  isPreferred: boolean;
  productId: string;
  productName: string;
  productReferralLink: string | null;
}

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export default function GroundUpModal({ open, onOpenChange }: GroundUpModalProps) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [estimatedLoanAmount, setEstimatedLoanAmount] = useState<string>("");
  const [showLenders, setShowLenders] = useState(false);

  const { data: lenders, isLoading, refetch } = useQuery<NewConstructionLender[]>({
    queryKey: ["/api/new-construction-lenders", selectedState],
    queryFn: async () => {
      const res = await fetch(`/api/new-construction-lenders?state=${encodeURIComponent(selectedState)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch lenders");
      return res.json();
    },
    enabled: showLenders && !!selectedState,
  });

  const handleFindLenders = () => {
    if (!selectedState) return;
    if (!estimatedLoanAmount || parseFloat(estimatedLoanAmount) <= 0) return;
    setShowLenders(true);
    refetch();
  };

  const handleClose = () => {
    setSelectedState("");
    setEstimatedLoanAmount("");
    setShowLenders(false);
    onOpenChange(false);
  };

  const getReferralLink = (lender: NewConstructionLender) => {
    return lender.productReferralLink || lender.referralLink || "#";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HardHat className="h-6 w-6 text-accent" />
            Ground-Up / New Build Projects
          </DialogTitle>
          <DialogDescription>
            New construction loans are not supported for automated analysis, but we can connect you with lenders who specialize in ground-up projects.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            New construction and ground-up loans have unique variables that require direct lender consultation. Use this tool to find qualified lenders in your state.
          </AlertDescription>
        </Alert>

        {!showLenders ? (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">What state is the project in?</label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger data-testid="select-ground-up-state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Loan Amount</label>
              <Input
                type="number"
                placeholder="Enter estimated loan amount"
                value={estimatedLoanAmount}
                onChange={(e) => setEstimatedLoanAmount(e.target.value)}
                data-testid="input-estimated-loan-amount"
              />
              <p className="text-xs text-muted-foreground">
                This helps lenders understand the scope of your project
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleFindLenders}
                disabled={!selectedState || !estimatedLoanAmount || parseFloat(estimatedLoanAmount) <= 0}
                className="flex-1"
                data-testid="button-find-lenders"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Find New Construction Lenders
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Showing lenders for: <span className="text-primary">{selectedState}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Estimated Loan: {formatCurrency(parseFloat(estimatedLoanAmount) || 0)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLenders(false)}
              >
                Change Search
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !lenders || lenders.length === 0 ? (
              <Card className="p-6 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No new construction lenders found for {selectedState}.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try selecting a different state or check back later as we add more lenders.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {lenders.map((lender) => (
                  <Card
                    key={`${lender.lenderId}-${lender.productId}`}
                    className="p-4 hover-elevate"
                    data-testid={`lender-card-${lender.lenderId}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-primary">
                            {lender.companyName}
                          </h3>
                          {lender.isPreferred && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Preferred
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {lender.productName}
                        </p>
                      </div>
                      <Button
                        onClick={() => window.open(getReferralLink(lender), '_blank', 'noopener,noreferrer')}
                        disabled={!getReferralLink(lender) || getReferralLink(lender) === "#"}
                        data-testid={`button-apply-${lender.lenderId}`}
                      >
                        Apply Now
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <Button variant="outline" onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
