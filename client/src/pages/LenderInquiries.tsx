import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Users, 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Search,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  LinkIcon
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { format } from "date-fns";

interface LoanTerms {
  interestRate?: string;
  maxLtvBuy?: string;
  points?: string;
  timeToClose?: string;
}

interface Inquiry {
  id: string;
  propertyAddress: string | null;
  arv: string | null;
  buyPrice: string | null;
  rehabCost: string | null;
  projectLength: number | null;
  estProfit: string | null;
  cashOnCashRoi: string | null;
  annualizedRoi: string | null;
  estOutOfPocket: string | null;
  projectCosts: string | null;
  costsAndCarrying: string | null;
  exitSale: string | null;
  loanTerms: LoanTerms | null;
  investorName: string | null;
  investorEmail: string | null;
  investorPhone: string | null;
  productName: string | null;
  loanType: string | null;
  emailSent: boolean | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
  };
}

function formatCurrency(value: string | null): string {
  if (!value) return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function formatPercent(value: string | null): string {
  if (!value) return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  return `${num.toFixed(2)}%`;
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="p-6 hover-elevate" data-testid={`card-inquiry-${inquiry.id}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-semibold text-lg">
                {(inquiry.investorName || inquiry.user.username || "U").substring(0, 1).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground" data-testid={`text-investor-name-${inquiry.id}`}>
                {inquiry.investorName || inquiry.user.username}
              </h3>
              <div className="space-y-1 mt-2">
                {inquiry.investorEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a 
                      href={`mailto:${inquiry.investorEmail}`} 
                      className="hover:text-primary transition-colors"
                      data-testid={`link-email-${inquiry.id}`}
                    >
                      {inquiry.investorEmail}
                    </a>
                  </div>
                )}
                {inquiry.investorPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a 
                      href={`tel:${inquiry.investorPhone}`} 
                      className="hover:text-primary transition-colors"
                      data-testid={`link-phone-${inquiry.id}`}
                    >
                      {inquiry.investorPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="whitespace-nowrap">
              <Calendar className="h-3 w-3 mr-1" />
              {format(new Date(inquiry.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </Badge>
            {inquiry.emailSent && (
              <Badge variant="secondary" className="text-xs">
                Email Sent
              </Badge>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Property Address</p>
                <p className="font-medium">{inquiry.propertyAddress || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Loan Product</p>
                <p className="font-medium">{inquiry.productName || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full"
          data-testid={`button-expand-${inquiry.id}`}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Deal Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              View Deal Details
            </>
          )}
        </Button>

        {isExpanded && (
          <div className="border-t pt-4 space-y-6">
            <div>
              <h4 className="font-semibold text-primary flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4" />
                Deal Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Est. Profit</p>
                  <p className="font-semibold text-green-600">{formatCurrency(inquiry.estProfit)}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Cash-on-Cash ROI</p>
                  <p className="font-semibold">{formatPercent(inquiry.cashOnCashRoi)}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Annualized ROI</p>
                  <p className="font-semibold">{formatPercent(inquiry.annualizedRoi)}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Est. Out of Pocket</p>
                  <p className="font-semibold">{formatCurrency(inquiry.estOutOfPocket)}</p>
                </div>
              </div>
            </div>

            {inquiry.loanTerms && (
              <div>
                <h4 className="font-semibold text-primary flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4" />
                  Loan Terms
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {inquiry.loanTerms.interestRate && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Interest Rate</p>
                      <p className="font-semibold">{inquiry.loanTerms.interestRate}</p>
                    </div>
                  )}
                  {inquiry.loanTerms.maxLtvBuy && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Max LTV (Buy)</p>
                      <p className="font-semibold">{inquiry.loanTerms.maxLtvBuy}</p>
                    </div>
                  )}
                  {inquiry.loanTerms.points && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Points</p>
                      <p className="font-semibold">{inquiry.loanTerms.points}</p>
                    </div>
                  )}
                  {inquiry.loanTerms.timeToClose && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Time to Close</p>
                      <p className="font-semibold">{inquiry.loanTerms.timeToClose}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-primary mb-3">Project Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Project Costs</p>
                  <p className="font-semibold">{formatCurrency(inquiry.projectCosts)}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Costs & Carrying</p>
                  <p className="font-semibold">{formatCurrency(inquiry.costsAndCarrying)}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Exit & Sale</p>
                  <p className="font-semibold">{formatCurrency(inquiry.exitSale)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

interface ApplyClick {
  id: string;
  propertyAddress: string | null;
  arv: string | null;
  buyPrice: string | null;
  rehabCost: string | null;
  estProfit: string | null;
  loanTerms: LoanTerms | null;
  investorName: string | null;
  investorEmail: string | null;
  investorPhone: string | null;
  productName: string | null;
  loanType: string | null;
  referralLink: string | null;
  source: string | null;
  createdAt: string;
}

function ApplyClickCard({ click }: { click: ApplyClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="p-6 hover-elevate border-l-4 border-l-accent" data-testid={`card-apply-click-${click.id}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-semibold text-lg">
                {(click.investorName || "U").substring(0, 1).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground" data-testid={`text-apply-click-investor-${click.id}`}>
                {click.investorName || "Unknown Investor"}
              </h3>
              <div className="space-y-1 mt-2">
                {click.investorEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a 
                      href={`mailto:${click.investorEmail}`} 
                      className="hover:text-primary transition-colors"
                      data-testid={`link-apply-click-email-${click.id}`}
                    >
                      {click.investorEmail}
                    </a>
                  </div>
                )}
                {click.investorPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a 
                      href={`tel:${click.investorPhone}`}
                      className="hover:text-primary transition-colors"
                      data-testid={`link-apply-click-phone-${click.id}`}
                    >
                      {click.investorPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={click.source === 'referral_link' ? 'default' : 'secondary'}>
              {click.source === 'referral_link' ? 'Referral Link' : 'Direct'}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(click.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </div>

        {/* Property & Product Info */}
        <div className="flex flex-wrap gap-3">
          {click.productName && (
            <Badge variant="outline" className="text-sm">
              <DollarSign className="h-3 w-3 mr-1" />
              {click.productName}
            </Badge>
          )}
          {click.loanType && (
            <Badge variant="outline" className="text-sm">
              {click.loanType}
            </Badge>
          )}
          {click.propertyAddress && (
            <Badge variant="outline" className="text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              {click.propertyAddress}
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid={`button-toggle-apply-click-details-${click.id}`}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show Details
            </>
          )}
        </Button>

        {isExpanded && (
          <div className="space-y-6 pt-4 border-t">
            {click.propertyAddress && (
              <div>
                <h4 className="font-semibold text-primary flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4" />
                  Property & Deal Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">ARV</p>
                    <p className="font-semibold">{formatCurrency(click.arv)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Buy Price</p>
                    <p className="font-semibold">{formatCurrency(click.buyPrice)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Rehab Cost</p>
                    <p className="font-semibold">{formatCurrency(click.rehabCost)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Est. Profit</p>
                    <p className="font-semibold text-green-600">{formatCurrency(click.estProfit)}</p>
                  </div>
                </div>
              </div>
            )}

            {click.loanTerms && (
              <div>
                <h4 className="font-semibold text-primary flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4" />
                  Loan Terms Viewed
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {click.loanTerms.interestRate && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Interest Rate</p>
                      <p className="font-semibold">{click.loanTerms.interestRate}</p>
                    </div>
                  )}
                  {click.loanTerms.maxLtvBuy && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Max LTV (Buy)</p>
                      <p className="font-semibold">{click.loanTerms.maxLtvBuy}</p>
                    </div>
                  )}
                  {click.loanTerms.points && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Points</p>
                      <p className="font-semibold">{click.loanTerms.points}</p>
                    </div>
                  )}
                  {click.loanTerms.timeToClose && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Time to Close</p>
                      <p className="font-semibold">{click.loanTerms.timeToClose}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

interface ReferralStats {
  code: string | null;
  clickCount: number;
}

export default function LenderInquiries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const queryParams = new URLSearchParams();
  if (searchTerm) queryParams.set("search", searchTerm);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);
  
  const queryString = queryParams.toString();
  const apiUrl = `/api/lender/inquiries${queryString ? `?${queryString}` : ''}`;

  const { data: inquiries, isLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/lender/inquiries", searchTerm, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(apiUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      return res.json();
    },
  });
  
  const { data: referralStats } = useQuery<ReferralStats>({
    queryKey: ["/api/lender/referral-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/lender/referral-stats");
      if (!res.ok) return { code: null, clickCount: 0 };
      return res.json();
    },
  });
  
  const { data: applyClicks, isLoading: applyClicksLoading } = useQuery<ApplyClick[]>({
    queryKey: ["/api/lender/apply-clicks"],
    queryFn: async () => {
      const res = await fetch("/api/lender/apply-clicks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch apply clicks");
      return res.json();
    },
  });
  
  const [activeTab, setActiveTab] = useState<'inquiries' | 'apply-clicks'>('inquiries');

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/lender-dashboard">
              <Button variant="ghost" className="mb-4" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">Investor Inquiries</h1>
                <p className="text-muted-foreground">
                  View investors who have contacted you about your loan products
                </p>
              </div>
            </div>
            <div className="h-1 w-24 bg-accent"></div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Inquiries</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-inquiries">
                    {inquiries?.length || 0}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Apply Button Clicks</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-apply-clicks">
                    {applyClicks?.length || 0}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <MousePointerClick className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referral Link Clicks</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-referral-clicks">
                    {referralStats?.clickCount || 0}
                  </p>
                  {referralStats?.code && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <LinkIcon className="h-3 w-3" />
                      {window.location.origin}/apply/{referralStats.code}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'inquiries' ? 'default' : 'outline'}
              onClick={() => setActiveTab('inquiries')}
              data-testid="button-tab-inquiries"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Email Inquiries ({inquiries?.length || 0})
            </Button>
            <Button
              variant={activeTab === 'apply-clicks' ? 'default' : 'outline'}
              onClick={() => setActiveTab('apply-clicks')}
              data-testid="button-tab-apply-clicks"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Apply Clicks ({applyClicks?.length || 0})
            </Button>
          </div>

          {activeTab === 'inquiries' && (
            <>
              <Card className="p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by investor name, email, or property..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                      data-testid="input-start-date"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
              </Card>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : !inquiries || inquiries.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">No Inquiries Yet</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When investors contact you through the deal analysis tool, their inquiries will appear here
                    with all the details about their property and deal metrics.
                  </p>
                  <Link href="/lender-loan-products">
                    <Button className="mt-6" data-testid="button-manage-products">
                      Manage Your Loan Products
                    </Button>
                  </Link>
                </Card>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {inquiries.length} {inquiries.length === 1 ? "Inquiry" : "Inquiries"}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {inquiries.map((inquiry) => (
                      <InquiryCard key={inquiry.id} inquiry={inquiry} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          
          {activeTab === 'apply-clicks' && (
            <>
              {applyClicksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : !applyClicks || applyClicks.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">No Apply Clicks Yet</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When investors click your "Apply Now" button during their deal analysis, their activity will appear here
                    with all the details about their property and deal metrics.
                  </p>
                  <Link href="/lender-loan-products">
                    <Button className="mt-6" data-testid="button-manage-products-2">
                      Manage Your Loan Products
                    </Button>
                  </Link>
                </Card>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {applyClicks.length} Apply {applyClicks.length === 1 ? "Click" : "Clicks"}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {applyClicks.map((click) => (
                      <ApplyClickCard key={click.id} click={click} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
