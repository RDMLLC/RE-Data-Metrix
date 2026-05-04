import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Users, 
  Building2, 
  TrendingUp, 
  FileText,
  Search,
  Download,
  ExternalLink,
  MousePointer
} from "lucide-react";
import { format } from "date-fns";

interface DashboardStats {
  totalUsers: number;
  activeSubscribers: number;
  totalLenders: number;
  activeLenders: number;
  totalReferrals: number;
  totalDealsAnalyzed: number;
}

interface LenderReferral {
  id: string;
  lenderId: string;
  lenderName: string;
  userId: string | null;
  investorName: string | null;
  investorEmail: string | null;
  referralType: string;
  savedDealId: string | null;
  propertyAddress: string | null;
  createdAt: string | null;
}

interface UserReport {
  id: string;
  username: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  createdAt: string | null;
  isEmailVerified: boolean;
}

interface AffiliateClick {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  affiliateId: string;
  affiliateName: string;
  category: string;
  createdAt: string | null;
}

interface AffiliateStats {
  affiliateId: string;
  affiliateName: string;
  totalClicks: number;
  uniqueUsers: number;
}

interface DealStats {
  totalDeals: number;
  averageArv: number;
  averageRoi: number;
  averageProfit: number;
  statusCounts: Record<string, number>;
  dealsThisMonth: number;
  dealsThisWeek: number;
}

interface DealReport {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  propertyAddress: string | null;
  arv: string | null;
  roi: string | null;
  profit: string | null;
  status: string;
  createdAt: string | null;
}

interface LenderPerformance {
  lenderId: string;
  lenderName: string;
  referralCount: number;
  savedCount: number;
  wonDealsCount: number;
  wonDealsValue: number;
  isActive: boolean;
}

interface PlatformUsageStats {
  activeUsersLast30Days: number;
  activeUsersLast7Days: number;
  totalDeals: number;
  totalSavedLenders: number;
  totalReferrals: number;
  totalAffiliateClicks: number;
  dealsByMonth: Array<{month: string; count: number}>;
}

interface SubscriptionStats {
  byStatus: Record<string, number>;
  totalActive: number;
  totalReferralTrial: number;
  totalComped: number;
  totalFree: number;
  usersByMonth: Array<{month: string; count: number}>;
  referralConversions: number;
}

interface WeeklySignupRow {
  weekStart: string;
  weekEnd: string;
  newFree: number;
  newMonthly: number;
  newAnnual: number;
  upgrades: number;
  totalFree: number;
  totalMonthly: number;
  totalAnnual: number;
  totalSubscribers: number;
}

export default function AdminReports() {
  const [, setLocation] = useLocation();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';
  const [referralSearch, setReferralSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [affiliateSearch, setAffiliateSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");
  const [lenderSearch, setLenderSearch] = useState("");
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 83); // 12 weeks back
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin' && data.role !== 'auditor') {
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
  }, [setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/reports/dashboard-stats"],
  });

  const { data: referrals, isLoading: referralsLoading } = useQuery<LenderReferral[]>({
    queryKey: ["/api/admin/reports/lender-referrals"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserReport[]>({
    queryKey: ["/api/admin/reports/users"],
  });

  const weeklyReportUrl = (() => {
    const params = new URLSearchParams();
    if (reportStartDate) params.set('startDate', reportStartDate);
    if (reportEndDate) params.set('endDate', reportEndDate);
    const qs = params.toString();
    return qs ? `/api/admin/reports/weekly-signups?${qs}` : '/api/admin/reports/weekly-signups';
  })();

  const { data: weeklyReport, isLoading: weeklyReportLoading } = useQuery<WeeklySignupRow[]>({
    queryKey: [weeklyReportUrl],
    enabled: showWeeklyReport,
  });

  const { data: affiliateClicks, isLoading: affiliateClicksLoading } = useQuery<AffiliateClick[]>({
    queryKey: ["/api/admin/reports/affiliate-clicks"],
  });

  const { data: affiliateStats, isLoading: affiliateStatsLoading } = useQuery<AffiliateStats[]>({
    queryKey: ["/api/admin/reports/affiliate-stats"],
  });

  const { data: dealStats, isLoading: dealStatsLoading } = useQuery<DealStats>({
    queryKey: ["/api/admin/reports/deal-stats"],
  });

  const { data: deals, isLoading: dealsLoading } = useQuery<DealReport[]>({
    queryKey: ["/api/admin/reports/deals"],
  });

  const { data: lenderPerformance, isLoading: lenderPerformanceLoading } = useQuery<LenderPerformance[]>({
    queryKey: ["/api/admin/reports/lender-performance"],
  });

  const { data: platformUsage, isLoading: platformUsageLoading } = useQuery<PlatformUsageStats>({
    queryKey: ["/api/admin/reports/platform-usage"],
  });

  const { data: subscriptionStats, isLoading: subscriptionStatsLoading } = useQuery<SubscriptionStats>({
    queryKey: ["/api/admin/reports/subscriptions"],
  });

  const filteredReferrals = referrals?.filter(ref => {
    if (!referralSearch) return true;
    const search = referralSearch.toLowerCase();
    return (
      ref.lenderName?.toLowerCase().includes(search) ||
      ref.investorName?.toLowerCase().includes(search) ||
      ref.investorEmail?.toLowerCase().includes(search) ||
      ref.propertyAddress?.toLowerCase().includes(search) ||
      ref.referralType?.toLowerCase().includes(search)
    );
  }) || [];

  const filteredUsers = users?.filter(user => {
    if (!userSearch) return true;
    const search = userSearch.toLowerCase();
    return (
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search) ||
      user.subscriptionStatus?.toLowerCase().includes(search)
    );
  }) || [];

  const filteredAffiliateClicks = affiliateClicks?.filter(click => {
    if (!affiliateSearch) return true;
    const search = affiliateSearch.toLowerCase();
    return (
      click.affiliateName?.toLowerCase().includes(search) ||
      click.userName?.toLowerCase().includes(search) ||
      click.userEmail?.toLowerCase().includes(search) ||
      click.category?.toLowerCase().includes(search)
    );
  }) || [];

  const filteredDeals = deals?.filter(deal => {
    if (!dealSearch) return true;
    const search = dealSearch.toLowerCase();
    return (
      deal.userName?.toLowerCase().includes(search) ||
      deal.userEmail?.toLowerCase().includes(search) ||
      deal.propertyAddress?.toLowerCase().includes(search) ||
      deal.status?.toLowerCase().includes(search)
    );
  }) || [];

  const filteredLenderPerformance = lenderPerformance?.filter(lender => {
    if (!lenderSearch) return true;
    const search = lenderSearch.toLowerCase();
    return lender.lenderName?.toLowerCase().includes(search);
  }) || [];

  const exportReferralsToCSV = () => {
    if (!referrals) return;
    const headers = ['Date', 'Lender', 'Investor Name', 'Investor Email', 'Referral Type', 'Property Address'];
    const rows = referrals.map(ref => [
      ref.createdAt ? format(new Date(ref.createdAt), 'MM/dd/yyyy HH:mm') : '',
      ref.lenderName,
      ref.investorName || 'Anonymous',
      ref.investorEmail || '',
      ref.referralType,
      ref.propertyAddress || 'Direct Search'
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lender-referrals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportUsersToCSV = () => {
    if (!users) return;
    const headers = ['Username', 'Email', 'Role', 'Subscription Status', 'Email Verified', 'Created At'];
    const rows = users.map(user => [
      user.username,
      user.email,
      user.role,
      user.subscriptionStatus,
      user.isEmailVerified ? 'Yes' : 'No',
      user.createdAt ? format(new Date(user.createdAt), 'MM/dd/yyyy HH:mm') : ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWeeklyReportToCSV = () => {
    if (!weeklyReport || weeklyReport.length === 0) return;
    const headers = ['Week Start', 'Week End', 'New Free', 'New Monthly', 'New Annual', 'Upgrades', 'Total Free', 'Total Monthly', 'Total Annual', 'Total Subscribers'];
    const rows = weeklyReport.map(w => [
      w.weekStart,
      w.weekEnd,
      String(w.newFree),
      String(w.newMonthly),
      String(w.newAnnual),
      String(w.upgrades),
      String(w.totalFree),
      String(w.totalMonthly),
      String(w.totalAnnual),
      String(w.totalSubscribers),
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-signups-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAffiliateClicksToCSV = () => {
    if (!affiliateClicks) return;
    const headers = ['Date', 'Affiliate', 'Category', 'User Name', 'User Email'];
    const rows = affiliateClicks.map(click => [
      click.createdAt ? format(new Date(click.createdAt), 'MM/dd/yyyy HH:mm') : '',
      click.affiliateName,
      click.category,
      click.userName || 'Anonymous',
      click.userEmail || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `affiliate-clicks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDealsToCSV = () => {
    if (!deals) return;
    const headers = ['Date', 'User', 'Email', 'Property Address', 'ARV', 'ROI %', 'Profit', 'Status'];
    const rows = deals.map(deal => [
      deal.createdAt ? format(new Date(deal.createdAt), 'MM/dd/yyyy HH:mm') : '',
      deal.userName || 'Unknown',
      deal.userEmail || '',
      deal.propertyAddress || '',
      deal.arv ? `$${parseFloat(deal.arv).toLocaleString()}` : '',
      deal.roi ? `${parseFloat(deal.roi).toFixed(1)}%` : '',
      deal.profit ? `$${parseFloat(deal.profit).toLocaleString()}` : '',
      deal.status
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-analysis-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      active: 'default',
      won: 'default',
      lost: 'secondary',
      archived: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'} data-testid={`badge-status-${status}`}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return `$${num.toLocaleString()}`;
  };

  const formatPercent = (value: string | null) => {
    if (!value) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return `${num.toFixed(1)}%`;
  };

  const exportLenderPerformanceToCSV = () => {
    if (!lenderPerformance) return;
    const headers = ['Lender Name', 'Status', 'Referrals', 'Saved By Users', 'Won Deals', 'Won Deals Value'];
    const rows = lenderPerformance.map(lender => [
      lender.lenderName,
      lender.isActive ? 'Active' : 'Inactive',
      lender.referralCount.toString(),
      lender.savedCount.toString(),
      lender.wonDealsCount.toString(),
      `$${lender.wonDealsValue.toLocaleString()}`
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lender-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'marketplace': 'Marketplace & Community',
      'property-management': 'Property Management',
      'project-management': 'Project Management',
      'lead-generation': 'Lead Generation',
      'comps': 'Comps & Data'
    };
    return labels[category] || category;
  };

  const getSubscriptionBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      active: 'default',
      referral_trial: 'default',
      comped: 'default',
      free: 'secondary',
      prospect: 'outline',
    };
    const displayStatus = status === 'free' ? 'Free' : status.replace('_', ' ');
    return (
      <Badge variant={variants[status] || 'outline'} data-testid={`badge-subscription-${status}`}>
        {displayStatus}
      </Badge>
    );
  };

  const getReferralTypeBadge = (type: string) => {
    const isDeal = type === 'deal_based' || type === 'deal';
    return (
      <Badge variant={isDeal ? 'default' : 'secondary'} data-testid={`badge-referral-${type}`}>
        {isDeal ? 'Deal Based' : 'Direct Search'}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                onClick={() => setLocation("/admin/dashboard")}
                data-testid="button-back-to-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
                <p className="text-muted-foreground mt-2">
                  View platform metrics and detailed reports
                </p>
              </div>
            </div>

            {isAuditor && (
              <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="banner-read-only">
                <p className="text-sm text-amber-800 dark:text-amber-200">You are viewing this page in read-only mode.</p>
              </div>
            )}

            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-20 mb-2" />
                      <div className="h-8 bg-muted rounded w-12" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <Card data-testid="stat-total-users">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Total Users</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-active-subscribers">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Subscribers</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.activeSubscribers || 0}</p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-total-lenders">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm">Total Lenders</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.totalLenders || 0}</p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-active-lenders">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm">Active Lenders</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.activeLenders || 0}</p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-total-referrals">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm">Referrals</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-deals-analyzed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Deals Analyzed</span>
                    </div>
                    <p className="text-2xl font-bold">{stats?.totalDealsAnalyzed || 0}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Tabs defaultValue="referrals" className="space-y-6">
              <TabsList data-testid="tabs-reports">
                <TabsTrigger value="referrals" data-testid="tab-referrals">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Lender Referrals
                </TabsTrigger>
                <TabsTrigger value="users" data-testid="tab-users">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="affiliates" data-testid="tab-affiliates">
                  <MousePointer className="h-4 w-4 mr-2" />
                  Affiliate Clicks
                </TabsTrigger>
                <TabsTrigger value="deals" data-testid="tab-deals">
                  <FileText className="h-4 w-4 mr-2" />
                  Deal Analysis
                </TabsTrigger>
                <TabsTrigger value="lenders" data-testid="tab-lenders">
                  <Building2 className="h-4 w-4 mr-2" />
                  Lender Performance
                </TabsTrigger>
                <TabsTrigger value="usage" data-testid="tab-usage">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Platform Usage
                </TabsTrigger>
                <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">
                  <Users className="h-4 w-4 mr-2" />
                  Subscriptions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="referrals">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Lender Referrals</CardTitle>
                        <CardDescription>
                          Track member referrals to lenders and associated properties
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search referrals..."
                            value={referralSearch}
                            onChange={(e) => setReferralSearch(e.target.value)}
                            className="pl-9 w-64"
                            data-testid="input-search-referrals"
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={exportReferralsToCSV}
                          disabled={!referrals?.length}
                          data-testid="button-export-referrals"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {referralsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading referrals...
                      </div>
                    ) : filteredReferrals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {referralSearch ? 'No referrals match your search' : 'No referrals recorded yet'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Lender</TableHead>
                              <TableHead>Investor</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Property</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredReferrals.map((ref) => (
                              <TableRow key={ref.id} data-testid={`row-referral-${ref.id}`}>
                                <TableCell className="whitespace-nowrap">
                                  {ref.createdAt
                                    ? format(new Date(ref.createdAt), 'MMM d, yyyy h:mm a')
                                    : '-'}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {ref.lenderName}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p>{ref.investorName || 'Anonymous'}</p>
                                    {ref.investorEmail && (
                                      <p className="text-sm text-muted-foreground">
                                        {ref.investorEmail}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getReferralTypeBadge(ref.referralType)}
                                </TableCell>
                                <TableCell>
                                  {ref.propertyAddress || (
                                    <span className="text-muted-foreground">Direct Search</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {filteredReferrals.length > 0 && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        Showing {filteredReferrals.length} of {referrals?.length || 0} referrals
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>User Reports</CardTitle>
                        <CardDescription>
                          View all registered users and their subscription status
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search users..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="pl-9 w-64"
                            data-testid="input-search-users"
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setShowWeeklyReport(v => !v)}
                          data-testid="button-toggle-weekly-report"
                        >
                          {showWeeklyReport ? 'Hide Report' : 'Weekly Signup Report'}
                        </Button>
                        {showWeeklyReport && (
                          <>
                            <div className="flex items-center gap-1">
                              <label htmlFor="weekly-report-start" className="text-sm text-muted-foreground">From</label>
                              <Input
                                id="weekly-report-start"
                                type="date"
                                value={reportStartDate}
                                onChange={(e) => setReportStartDate(e.target.value)}
                                className="w-40"
                                data-testid="input-weekly-report-start"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <label htmlFor="weekly-report-end" className="text-sm text-muted-foreground">To</label>
                              <Input
                                id="weekly-report-end"
                                type="date"
                                value={reportEndDate}
                                onChange={(e) => setReportEndDate(e.target.value)}
                                className="w-40"
                                data-testid="input-weekly-report-end"
                              />
                            </div>
                          </>
                        )}
                        <Button
                          variant="outline"
                          onClick={showWeeklyReport ? exportWeeklyReportToCSV : exportUsersToCSV}
                          disabled={showWeeklyReport ? !weeklyReport?.length : !users?.length}
                          data-testid="button-export-users"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {showWeeklyReport ? 'Export Weekly Report' : 'Export CSV'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {usersLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading users...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {userSearch ? 'No users match your search' : 'No users registered yet'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Subscription</TableHead>
                              <TableHead>Verified</TableHead>
                              <TableHead>Joined</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.map((user) => (
                              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                                <TableCell className="font-medium">
                                  {user.username}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                                    {user.role}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {getSubscriptionBadge(user.subscriptionStatus)}
                                </TableCell>
                                <TableCell>
                                  {user.isEmailVerified ? (
                                    <Badge variant="default">Yes</Badge>
                                  ) : (
                                    <Badge variant="secondary">No</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {user.createdAt
                                    ? format(new Date(user.createdAt), 'MMM d, yyyy')
                                    : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {filteredUsers.length > 0 && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        Showing {filteredUsers.length} of {users?.length || 0} users
                      </div>
                    )}
                    {showWeeklyReport && (
                      <div className="mt-6 border-t pt-6" data-testid="section-weekly-report">
                        <h3 className="text-lg font-semibold mb-3">Weekly Signup Report</h3>
                        {weeklyReportLoading ? (
                          <div className="text-center py-8 text-muted-foreground" data-testid="text-weekly-report-loading">
                            Loading weekly report...
                          </div>
                        ) : !weeklyReport || weeklyReport.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground" data-testid="text-weekly-report-empty">
                            No weekly data available for the selected range.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Week</TableHead>
                                  <TableHead className="text-right">New Free</TableHead>
                                  <TableHead className="text-right">New Monthly</TableHead>
                                  <TableHead className="text-right">New Annual</TableHead>
                                  <TableHead className="text-right">Upgrades</TableHead>
                                  <TableHead className="text-right">Total Free</TableHead>
                                  <TableHead className="text-right">Total Monthly</TableHead>
                                  <TableHead className="text-right">Total Annual</TableHead>
                                  <TableHead className="text-right">Total Subscribers</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {weeklyReport.map((w) => (
                                  <TableRow key={w.weekStart} data-testid={`row-weekly-${w.weekStart}`}>
                                    <TableCell className="whitespace-nowrap font-medium" data-testid={`text-week-${w.weekStart}`}>
                                      {format(new Date(`${w.weekStart}T00:00:00`), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right" data-testid={`text-new-free-${w.weekStart}`}>
                                      {w.newFree}
                                    </TableCell>
                                    <TableCell
                                      className={`text-right ${w.newMonthly > 0 ? 'bg-success/10 text-success font-medium' : ''}`}
                                      data-testid={`text-new-monthly-${w.weekStart}`}
                                    >
                                      {w.newMonthly}
                                    </TableCell>
                                    <TableCell
                                      className={`text-right ${w.newAnnual > 0 ? 'bg-success/10 text-success font-medium' : ''}`}
                                      data-testid={`text-new-annual-${w.weekStart}`}
                                    >
                                      {w.newAnnual}
                                    </TableCell>
                                    <TableCell className="text-right" data-testid={`text-upgrades-${w.weekStart}`}>
                                      {w.upgrades > 0 ? w.upgrades : '—'}
                                    </TableCell>
                                    <TableCell className="text-right" data-testid={`text-total-free-${w.weekStart}`}>
                                      {w.totalFree}
                                    </TableCell>
                                    <TableCell className="text-right" data-testid={`text-total-monthly-${w.weekStart}`}>
                                      {w.totalMonthly}
                                    </TableCell>
                                    <TableCell className="text-right" data-testid={`text-total-annual-${w.weekStart}`}>
                                      {w.totalAnnual}
                                    </TableCell>
                                    <TableCell className="text-right font-bold" data-testid={`text-total-subscribers-${w.weekStart}`}>
                                      {w.totalSubscribers}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="affiliates">
                <div className="space-y-6">
                  {/* Affiliate Stats Summary */}
                  {affiliateStatsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="h-4 bg-muted rounded w-24 mb-2" />
                            <div className="h-8 bg-muted rounded w-12" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : affiliateStats && affiliateStats.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Affiliate Programs by Clicks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {affiliateStats.slice(0, 4).map((stat) => (
                            <div key={stat.affiliateId} className="p-4 border rounded-md">
                              <p className="font-medium text-sm mb-1">{stat.affiliateName}</p>
                              <p className="text-2xl font-bold">{stat.totalClicks}</p>
                              <p className="text-sm text-muted-foreground">
                                {stat.uniqueUsers} unique users
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  {/* Click Log Table */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <CardTitle>Affiliate Click Log</CardTitle>
                          <CardDescription>
                            Track individual clicks on affiliate programs
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search clicks..."
                              value={affiliateSearch}
                              onChange={(e) => setAffiliateSearch(e.target.value)}
                              className="pl-9 w-64"
                              data-testid="input-search-affiliates"
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={exportAffiliateClicksToCSV}
                            disabled={!affiliateClicks?.length}
                            data-testid="button-export-affiliates"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {affiliateClicksLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading affiliate clicks...
                        </div>
                      ) : filteredAffiliateClicks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <MousePointer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">
                            {affiliateSearch ? 'No clicks match your search' : 'No affiliate clicks recorded yet'}
                          </p>
                          <p className="text-sm">
                            Clicks will appear here when users visit affiliate links.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Affiliate</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>User</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredAffiliateClicks.map((click) => (
                                <TableRow key={click.id} data-testid={`row-affiliate-${click.id}`}>
                                  <TableCell className="whitespace-nowrap">
                                    {click.createdAt
                                      ? format(new Date(click.createdAt), 'MMM d, yyyy h:mm a')
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {click.affiliateName}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {getCategoryLabel(click.category)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {click.userName ? (
                                      <div>
                                        <p>{click.userName}</p>
                                        {click.userEmail && (
                                          <p className="text-sm text-muted-foreground">
                                            {click.userEmail}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">Anonymous</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {filteredAffiliateClicks.length > 0 && (
                        <div className="mt-4 text-sm text-muted-foreground">
                          Showing {filteredAffiliateClicks.length} of {affiliateClicks?.length || 0} clicks
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="deals">
                <div className="space-y-6">
                  {dealStatsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="h-4 bg-muted rounded w-24 mb-2" />
                            <div className="h-8 bg-muted rounded w-12" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : dealStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card data-testid="stat-total-deals">
                        <CardContent className="p-4">
                          <div className="text-muted-foreground text-sm mb-1">Total Deals</div>
                          <p className="text-2xl font-bold">{dealStats.totalDeals}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {dealStats.dealsThisMonth} this month
                          </p>
                        </CardContent>
                      </Card>
                      <Card data-testid="stat-avg-arv">
                        <CardContent className="p-4">
                          <div className="text-muted-foreground text-sm mb-1">Avg ARV</div>
                          <p className="text-2xl font-bold">${dealStats.averageArv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </CardContent>
                      </Card>
                      <Card data-testid="stat-avg-roi">
                        <CardContent className="p-4">
                          <div className="text-muted-foreground text-sm mb-1">Avg ROI</div>
                          <p className="text-2xl font-bold">{dealStats.averageRoi.toFixed(1)}%</p>
                        </CardContent>
                      </Card>
                      <Card data-testid="stat-avg-profit">
                        <CardContent className="p-4">
                          <div className="text-muted-foreground text-sm mb-1">Avg Profit</div>
                          <p className="text-2xl font-bold">${dealStats.averageProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}

                  {dealStats && Object.keys(dealStats.statusCounts).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Deals by Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-4">
                          {Object.entries(dealStats.statusCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center gap-2">
                              {getStatusBadge(status)}
                              <span className="font-bold">{count}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <CardTitle>Deal Analysis Log</CardTitle>
                          <CardDescription>
                            All saved deal analyses from investors
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search deals..."
                              value={dealSearch}
                              onChange={(e) => setDealSearch(e.target.value)}
                              className="pl-9 w-64"
                              data-testid="input-search-deals"
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={exportDealsToCSV}
                            disabled={!deals?.length}
                            data-testid="button-export-deals"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {dealsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading deals...
                        </div>
                      ) : filteredDeals.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">
                            {dealSearch ? 'No deals match your search' : 'No saved deals yet'}
                          </p>
                          <p className="text-sm">
                            Deals will appear here when investors save their analyses.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Property</TableHead>
                                <TableHead className="text-right">ARV</TableHead>
                                <TableHead className="text-right">ROI</TableHead>
                                <TableHead className="text-right">Profit</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredDeals.map((deal) => (
                                <TableRow key={deal.id} data-testid={`row-deal-${deal.id}`}>
                                  <TableCell className="whitespace-nowrap">
                                    {deal.createdAt
                                      ? format(new Date(deal.createdAt), 'MMM d, yyyy')
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{deal.userName || 'Unknown'}</p>
                                      {deal.userEmail && (
                                        <p className="text-sm text-muted-foreground">
                                          {deal.userEmail}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {deal.propertyAddress || (
                                      <span className="text-muted-foreground">No address</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(deal.arv)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatPercent(deal.roi)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(deal.profit)}
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(deal.status)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {filteredDeals.length > 0 && (
                        <div className="mt-4 text-sm text-muted-foreground">
                          Showing {filteredDeals.length} of {deals?.length || 0} deals
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="lenders">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Lender Performance</CardTitle>
                        <CardDescription>
                          Track lender engagement, referrals, and won deals
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search lenders..."
                            value={lenderSearch}
                            onChange={(e) => setLenderSearch(e.target.value)}
                            className="pl-9 w-64"
                            data-testid="input-search-lenders"
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={exportLenderPerformanceToCSV}
                          disabled={!lenderPerformance?.length}
                          data-testid="button-export-lenders"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {lenderPerformanceLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading lender performance data...
                      </div>
                    ) : filteredLenderPerformance.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">
                          {lenderSearch ? 'No lenders match your search' : 'No lenders registered yet'}
                        </p>
                        <p className="text-sm">
                          Lender performance data will appear here after lenders are added to the platform.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Lender</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Referrals</TableHead>
                              <TableHead className="text-right">Saved By</TableHead>
                              <TableHead className="text-right">Won Deals</TableHead>
                              <TableHead className="text-right">Won Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredLenderPerformance.map((lender) => (
                              <TableRow key={lender.lenderId} data-testid={`row-lender-${lender.lenderId}`}>
                                <TableCell className="font-medium">
                                  {lender.lenderName}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={lender.isActive ? 'default' : 'secondary'}>
                                    {lender.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {lender.referralCount}
                                </TableCell>
                                <TableCell className="text-right">
                                  {lender.savedCount}
                                </TableCell>
                                <TableCell className="text-right">
                                  {lender.wonDealsCount}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  ${lender.wonDealsValue.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {filteredLenderPerformance.length > 0 && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        Showing {filteredLenderPerformance.length} of {lenderPerformance?.length || 0} lenders
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Usage</CardTitle>
                    <CardDescription>
                      Track feature usage, user engagement, and platform activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {platformUsageLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading platform usage data...
                      </div>
                    ) : !platformUsage ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No usage data available</p>
                        <p className="text-sm">
                          Platform usage metrics will appear here as users interact with the platform.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Active (30 days)</div>
                              <p className="text-2xl font-bold">{platformUsage.activeUsersLast30Days}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Active (7 days)</div>
                              <p className="text-2xl font-bold">{platformUsage.activeUsersLast7Days}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Total Deals</div>
                              <p className="text-2xl font-bold">{platformUsage.totalDeals}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Saved Lenders</div>
                              <p className="text-2xl font-bold">{platformUsage.totalSavedLenders}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Referrals</div>
                              <p className="text-2xl font-bold">{platformUsage.totalReferrals}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Affiliate Clicks</div>
                              <p className="text-2xl font-bold">{platformUsage.totalAffiliateClicks}</p>
                            </CardContent>
                          </Card>
                        </div>

                        {platformUsage.dealsByMonth.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Deals by Month</h3>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">Deals Created</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {platformUsage.dealsByMonth.map((item) => (
                                    <TableRow key={item.month} data-testid={`row-month-${item.month}`}>
                                      <TableCell>{item.month}</TableCell>
                                      <TableCell className="text-right font-medium">{item.count}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscriptions">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Analytics</CardTitle>
                    <CardDescription>
                      Track subscription status, conversions, and membership trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subscriptionStatsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading subscription data...
                      </div>
                    ) : !subscriptionStats ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No subscription data available</p>
                        <p className="text-sm">
                          Subscription analytics will appear here as users sign up for the platform.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Active</div>
                              <p className="text-2xl font-bold text-green-600">{subscriptionStats.totalActive}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Referral Trial</div>
                              <p className="text-2xl font-bold text-blue-600">{subscriptionStats.totalReferralTrial}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Comped</div>
                              <p className="text-2xl font-bold text-purple-600">{subscriptionStats.totalComped}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Free</div>
                              <p className="text-2xl font-bold text-muted-foreground">{subscriptionStats.totalFree}</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Referral Conversions</div>
                              <p className="text-2xl font-bold text-amber-600">{subscriptionStats.referralConversions}</p>
                            </CardContent>
                          </Card>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-4">Subscription Status Breakdown</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(subscriptionStats.byStatus).map(([status, count]) => (
                                  <TableRow key={status} data-testid={`row-status-${status}`}>
                                    <TableCell>
                                      <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                                        {status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{count}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {subscriptionStats.usersByMonth.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-4">User Registrations by Month</h3>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">New Users</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {subscriptionStats.usersByMonth.map((item) => (
                                    <TableRow key={item.month} data-testid={`row-users-${item.month}`}>
                                      <TableCell>{item.month}</TableCell>
                                      <TableCell className="text-right font-medium">{item.count}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}
