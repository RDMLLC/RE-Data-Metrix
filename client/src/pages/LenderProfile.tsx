import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Building2, Mail, Phone, Globe, Check, X } from "lucide-react";
import type { LoanProduct } from "@shared/schema";

export default function LenderProfile() {
  const { id } = useParams();

  const { data: companyInfo, isLoading: loadingCompany } = useQuery({
    queryKey: ["/api/lender-company-info", id],
    queryFn: async () => {
      const res = await fetch(`/api/lender-company-info/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch company info");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: questionnaire, isLoading: loadingQuestionnaire } = useQuery({
    queryKey: ["/api/lender-questionnaire", id],
    queryFn: async () => {
      const res = await fetch(`/api/lender-questionnaire/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch questionnaire");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: loanProducts, isLoading: loadingProducts } = useQuery<LoanProduct[]>({
    queryKey: ["/api/loan-products", id],
    queryFn: async () => {
      const res = await fetch(`/api/loan-products/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error("Failed to fetch loan products");
      }
      return res.json();
    },
    retry: false,
  });

  const isLoading = loadingCompany || loadingQuestionnaire || loadingProducts;

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">Loading lender profile...</div>
          </div>
        </div>
      </Layout>
    );
  }

  const activeLoanProducts = loanProducts?.filter((p: LoanProduct) => p.isActive) || [];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/deal-analysis">
              <Button variant="outline" data-testid="button-back">
                ← Back to Deal Analysis
              </Button>
            </Link>
          </div>

          {/* Company Header */}
          <Card className="p-8 mb-8">
            {!companyInfo ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Company information not available</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="h-8 w-8 text-primary" />
                    <h1 className="text-4xl font-bold text-primary" data-testid="text-company-name">
                      {companyInfo.companyName || "Lender Profile"}
                    </h1>
                  </div>
                  
                  {companyInfo.companyDescription && (
                    <p className="text-lg text-muted-foreground mb-6" data-testid="text-company-description">
                      {companyInfo.companyDescription}
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companyInfo.contactName && (
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="font-medium">Contact:</span>
                        <span data-testid="text-contact-name">{companyInfo.contactName}</span>
                      </div>
                    )}
                    {companyInfo.email && (
                      <div className="flex items-center gap-2 text-foreground">
                        <Mail className="h-4 w-4 text-primary" />
                        <a href={`mailto:${companyInfo.email}`} className="hover:text-primary" data-testid="link-email">
                          {companyInfo.email}
                        </a>
                      </div>
                    )}
                    {companyInfo.phone && (
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 text-primary" />
                        <a href={`tel:${companyInfo.phone}`} className="hover:text-primary" data-testid="link-phone">
                          {companyInfo.phone}
                        </a>
                      </div>
                    )}
                    {companyInfo.website && (
                      <div className="flex items-center gap-2 text-foreground">
                        <Globe className="h-4 w-4 text-primary" />
                        <a
                          href={companyInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary"
                          data-testid="link-website"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {companyInfo.email && (
                    <Button variant="default" size="lg" asChild data-testid="button-contact-lender">
                      <a href={`mailto:${companyInfo.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Contact Lender
                      </a>
                    </Button>
                  )}
                  {companyInfo.referralLink && (
                    <Button variant="outline" size="lg" asChild data-testid="button-apply-now">
                      <a href={companyInfo.referralLink} target="_blank" rel="noopener noreferrer">
                        Apply Now
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Lending Criteria */}
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold text-primary mb-6">Lending Criteria</h2>
            {!questionnaire ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Lending criteria information not available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Loan Types */}
                {questionnaire.loanTypes && questionnaire.loanTypes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Loan Types Offered</h3>
                    <div className="space-y-2">
                      {questionnaire.loanTypes.map((type: string) => (
                        <div key={type} className="flex items-center gap-2 text-foreground" data-testid={`loan-type-${type}`}>
                          <Check className="h-4 w-4 text-accent" />
                          <span>{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Credit Score */}
                {questionnaire.minCreditScore && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Minimum Credit Score</h3>
                    <p className="text-foreground" data-testid="text-min-credit-score">{questionnaire.minCreditScore}</p>
                  </div>
                )}

                {/* States Serviced */}
                {questionnaire.offerLoansAllStates === "Yes" ? (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Geographic Coverage</h3>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-accent" />
                      <span data-testid="text-all-states">All 50 States</span>
                    </div>
                  </div>
                ) : questionnaire.statesServiced && questionnaire.statesServiced.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">States Serviced</h3>
                    <div className="flex flex-wrap gap-2">
                      {questionnaire.statesServiced.map((state: string) => (
                        <span
                          key={state}
                          className="px-3 py-1 bg-accent/10 text-accent rounded-md text-sm"
                          data-testid={`state-${state}`}
                        >
                          {state}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Programs */}
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-foreground mb-3">Special Programs & Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {questionnaire.offerNonTraditionalLending && (
                      <div className="flex items-center gap-2 text-foreground" data-testid="feature-non-traditional">
                        <Check className="h-4 w-4 text-accent" />
                        <span>Non-traditional / Creative Lending</span>
                      </div>
                    )}
                    {questionnaire.workWithNewInvestors && (
                      <div className="flex items-center gap-2 text-foreground" data-testid="feature-new-investors">
                        <Check className="h-4 w-4 text-accent" />
                        <span>Works with New Investors</span>
                      </div>
                    )}
                    {questionnaire.offerDeferredPayment && (
                      <div className="flex items-center gap-2 text-foreground" data-testid="feature-deferred-payment">
                        <Check className="h-4 w-4 text-accent" />
                        <span>Deferred Payment Loans</span>
                      </div>
                    )}
                    {questionnaire.offerRolledPoints && (
                      <div className="flex items-center gap-2 text-foreground" data-testid="feature-rolled-points">
                        <Check className="h-4 w-4 text-accent" />
                        <span>Rolled / Points on the Back</span>
                      </div>
                    )}
                    {questionnaire.offer100PercentFunding && (
                      <div className="flex items-center gap-2 text-foreground" data-testid="feature-100-funding">
                        <Check className="h-4 w-4 text-accent" />
                        <span>100% Funding (Purchase + Rehab)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Loan Products */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-primary mb-6">Available Loan Products</h2>
            {activeLoanProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No active loan products available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeLoanProducts.map((product) => (
                  <Card key={product.id} className="p-6 hover-elevate" data-testid={`product-card-${product.id}`}>
                    <h3 className="text-xl font-semibold text-foreground mb-4" data-testid={`product-name-${product.id}`}>
                      {product.productName}
                    </h3>
                    <div className="space-y-2 text-sm">
                      {product.interestRate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span className="font-medium text-foreground">{product.interestRate}%</span>
                        </div>
                      )}
                      {product.points && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Points:</span>
                          <span className="font-medium text-foreground">{product.points}</span>
                        </div>
                      )}
                      {product.maxLtvBuy && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max LTV (Buy):</span>
                          <span className="font-medium text-foreground">{product.maxLtvBuy}%</span>
                        </div>
                      )}
                      {product.maxLendRehab && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Lend (Rehab):</span>
                          <span className="font-medium text-foreground">{product.maxLendRehab}%</span>
                        </div>
                      )}
                      {product.timeToClose && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time to Close:</span>
                          <span className="font-medium text-foreground">{product.timeToClose} days</span>
                        </div>
                      )}
                      {product.newInvestorOk && (
                        <div className="flex items-center gap-2 text-accent mt-3">
                          <Check className="h-4 w-4" />
                          <span className="text-sm">New Investor Friendly</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
