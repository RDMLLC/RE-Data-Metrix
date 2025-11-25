import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, User, Mail, Phone, Globe, DollarSign, Calendar, FileText, Package, Users, Star } from "lucide-react";
import type { Lender, LenderQuestionnaire, LoanProduct } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface LenderDetailData {
  lender: Lender;
  questionnaire: LenderQuestionnaire | null;
  loanProducts: LoanProduct[];
  referrals: Array<{
    id: string;
    userId: string | null;
    investorName: string | null;
    investorEmail: string | null;
    referralType: string;
    propertyAddress: string | null;
    createdAt: Date | null;
  }>;
}

export default function AdminLenderDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const lenderId = params.id;
  const { toast } = useToast();

  const preferredMutation = useMutation({
    mutationFn: async (isPreferred: boolean) => {
      const response = await apiRequest("PATCH", `/api/admin/lenders/${lenderId}/preferred`, { isPreferred });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lenders", lenderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lenders"] });
      toast({
        title: data.isPreferred ? "Lender Marked as Preferred" : "Preferred Status Removed",
        description: `${data.companyName} has been ${data.isPreferred ? "marked as a preferred lender" : "removed from preferred status"}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferred status.",
        variant: "destructive",
      });
    },
  });

  const { data, isLoading, error } = useQuery<LenderDetailData>({
    queryKey: ["/api/admin/lenders", lenderId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/lenders/${lenderId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch lender details");
      return res.json();
    },
    enabled: !!lenderId,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading lender details...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <p className="text-destructive">Failed to load lender details</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation("/admin/lenders")}
              >
                Back to Lenders
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const { lender, questionnaire, loanProducts, referrals } = data;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => setLocation("/admin/lenders")}
                data-testid="button-back-to-lenders"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lenders
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">{lender.companyName}</h1>
                  {lender.archived ? (
                    <Badge variant="secondary">Archived</Badge>
                  ) : lender.inviteAccepted ? (
                    <Badge variant="default" className="bg-success">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning text-warning">Pending</Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">
                  Lender Profile
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card data-testid="card-company-info">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{lender.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Name</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {lender.contactName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {lender.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {lender.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <p className="font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {lender.website ? (
                        <a href={lender.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {lender.website}
                        </a>
                      ) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(lender.createdAt)}
                    </p>
                  </div>
                </div>
                {lender.companyDescription && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm mt-1">{lender.companyDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-referral-info">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Referral Configuration
                </CardTitle>
                <CardDescription>
                  Referral fee settings (admin-managed)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Referral Amount</p>
                    <p className="text-2xl font-bold text-primary">
                      {lender.referralType === '%' ? `${lender.referralAmount}%` : `$${lender.referralAmount}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fee Type</p>
                    <p className="font-medium">
                      {lender.referralType === '%' ? 'Percentage' : 'Fixed Dollar'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referral Link</p>
                  <p className="text-sm font-mono break-all">
                    {lender.referralLink || "Not set"}
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="preferred-toggle" className="flex items-center gap-2 cursor-pointer">
                        <Star className={`h-4 w-4 ${lender.isPreferred ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
                        Preferred Lender
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Preferred lenders are prioritized in New Construction results
                      </p>
                    </div>
                    <Switch
                      id="preferred-toggle"
                      checked={lender.isPreferred ?? false}
                      onCheckedChange={(checked) => preferredMutation.mutate(checked)}
                      disabled={preferredMutation.isPending || lender.archived === true}
                      data-testid="switch-preferred-lender"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={lender.inviteAccepted ? "default" : "outline"}>
                        {lender.inviteAccepted ? "Invite Accepted" : "Pending Acceptance"}
                      </Badge>
                      {lender.isPreferred && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Preferred
                        </Badge>
                      )}
                      {lender.archived && <Badge variant="secondary">Archived</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {questionnaire && (
            <Card className="mb-6" data-testid="card-questionnaire">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lender Questionnaire
                </CardTitle>
                <CardDescription>
                  Responses from onboarding questionnaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Broker or Direct Lender</p>
                    <p className="font-medium capitalize">{questionnaire.brokerOrDirectLender || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fastest Closing Time</p>
                    <p className="font-medium">{questionnaire.fastestClosingTime || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Min Credit Score</p>
                    <p className="font-medium">{questionnaire.minCreditScore || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Non-Traditional Lending</p>
                    <p className="font-medium">{questionnaire.offerNonTraditionalLending ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Work with New Investors</p>
                    <p className="font-medium">{questionnaire.workWithNewInvestors ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Deferred Payment</p>
                    <p className="font-medium">{questionnaire.offerDeferredPayment ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rolled Points</p>
                    <p className="font-medium">{questionnaire.offerRolledPoints ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">100% Funding</p>
                    <p className="font-medium">{questionnaire.offer100PercentFunding ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">All States</p>
                    <p className="font-medium">{questionnaire.offerLoansAllStates || "N/A"}</p>
                  </div>
                  {questionnaire.statesServiced && questionnaire.statesServiced.length > 0 && (
                    <div className="col-span-full">
                      <p className="text-sm text-muted-foreground">States Serviced</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {questionnaire.statesServiced.map((state) => (
                          <Badge key={state} variant="outline" className="text-xs">{state}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {questionnaire.loanTypes && questionnaire.loanTypes.length > 0 && (
                    <div className="col-span-full">
                      <p className="text-sm text-muted-foreground">Loan Types Offered</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {questionnaire.loanTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs capitalize">{type.replace(/_/g, ' ')}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6" data-testid="card-loan-products">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Loan Products ({loanProducts.length})
              </CardTitle>
              <CardDescription>
                All loan products offered by this lender
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loanProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No loan products added yet</p>
              ) : (
                <div className="space-y-4">
                  {loanProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 border rounded-lg"
                      data-testid={`product-${product.id}`}
                    >
                      <div className="flex items-start justify-between mb-3 gap-4">
                        <div>
                          <h4 className="font-semibold">{product.productName}</h4>
                          <Badge variant={product.isActive ? "default" : "secondary"} className="mt-1">
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                        {product.minCreditScore !== null && (
                          <div>
                            <span className="text-muted-foreground">Min Credit:</span>
                            <span className="ml-1 font-medium">{product.minCreditScore}</span>
                          </div>
                        )}
                        {product.interestRate !== null && (
                          <div>
                            <span className="text-muted-foreground">Interest:</span>
                            <span className="ml-1 font-medium">{product.interestRate}%</span>
                          </div>
                        )}
                        {product.maxLtvBuy !== null && (
                          <div>
                            <span className="text-muted-foreground">Max LTV:</span>
                            <span className="ml-1 font-medium">{product.maxLtvBuy}%</span>
                          </div>
                        )}
                        {product.maxLendRehab !== null && (
                          <div>
                            <span className="text-muted-foreground">Max Rehab:</span>
                            <span className="ml-1 font-medium">{product.maxLendRehab}%</span>
                          </div>
                        )}
                        {product.points !== null && (
                          <div>
                            <span className="text-muted-foreground">Points:</span>
                            <span className="ml-1 font-medium">{product.points}</span>
                          </div>
                        )}
                        {product.maxLoanArv !== null && (
                          <div>
                            <span className="text-muted-foreground">Max ARV:</span>
                            <span className="ml-1 font-medium">{product.maxLoanArv}%</span>
                          </div>
                        )}
                        {product.fees !== null && (
                          <div>
                            <span className="text-muted-foreground">Fees:</span>
                            <span className="ml-1 font-medium">${product.fees}</span>
                          </div>
                        )}
                        {product.estimatedAppraisalCost !== null && (
                          <div>
                            <span className="text-muted-foreground">Appraisal:</span>
                            <span className="ml-1 font-medium">${product.estimatedAppraisalCost}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">New Investor OK:</span>
                          <span className="ml-1 font-medium">{product.newInvestorOk ? "Yes" : "No"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Interest Deferred:</span>
                          <span className="ml-1 font-medium">{product.interestDeferred ? "Yes" : "No"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Points Deferred:</span>
                          <span className="ml-1 font-medium">{product.pointsDeferred ? "Yes" : "No"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Drawn Funds Only:</span>
                          <span className="ml-1 font-medium">{product.drawnFundsOnly ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-referral-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Referral History ({referrals.length})
              </CardTitle>
              <CardDescription>
                Investors referred to this lender
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No referrals yet</p>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                      data-testid={`referral-${referral.id}`}
                    >
                      <div>
                        <p className="font-medium">{referral.investorName || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground">{referral.investorEmail || "N/A"}</p>
                        {referral.propertyAddress && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Property: {referral.propertyAddress}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="capitalize">
                          {referral.referralType.replace(/_/g, ' ')}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(referral.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
