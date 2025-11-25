import { useState } from "react";
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

export default function AdminReports() {
  const [, setLocation] = useLocation();
  const [referralSearch, setReferralSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [affiliateSearch, setAffiliateSearch] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/reports/dashboard-stats"],
  });

  const { data: referrals, isLoading: referralsLoading } = useQuery<LenderReferral[]>({
    queryKey: ["/api/admin/reports/lender-referrals"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserReport[]>({
    queryKey: ["/api/admin/reports/users"],
  });

  const { data: affiliateClicks, isLoading: affiliateClicksLoading } = useQuery<AffiliateClick[]>({
    queryKey: ["/api/admin/reports/affiliate-clicks"],
  });

  const { data: affiliateStats, isLoading: affiliateStatsLoading } = useQuery<AffiliateStats[]>({
    queryKey: ["/api/admin/reports/affiliate-stats"],
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
      inactive: 'secondary',
      prospect: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'} data-testid={`badge-subscription-${status}`}>
        {status.replace('_', ' ')}
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
                      <div className="flex items-center gap-2">
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
                          onClick={exportUsersToCSV}
                          disabled={!users?.length}
                          data-testid="button-export-users"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
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
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}
