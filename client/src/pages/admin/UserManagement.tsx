import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Search, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Users, 
  TrendingUp, 
  Clock,
  Trophy,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Trash2,
  Archive,
  FileCheck,
  FileX,
  Plus,
  Code,
  Eye,
  EyeOff
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface UserWithStats {
  id: string;
  username: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  createdAt: string | null;
  isEmailVerified: boolean;
  dealsAnalyzed: number;
  lendersSaved: number;
  referralCount: number;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  privacyVersion: string | null;
}

interface UserStats {
  total: number;
  bySubscription: {
    active: number;
    free: number;
    comped: number;
    referral_trial: number;
  };
  byRole: {
    user: number;
    admin: number;
  };
  emailVerification: {
    verified: number;
    unverified: number;
  };
  recentSignups: {
    last7Days: number;
    last30Days: number;
  };
}

export default function UserManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [userToUpdate, setUserToUpdate] = useState<{user: UserWithStats, status: string} | null>(null);
  const [userToResendVerification, setUserToResendVerification] = useState<UserWithStats | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null);
  const [showCreateDeveloper, setShowCreateDeveloper] = useState(false);
  const [developerEmail, setDeveloperEmail] = useState("");
  const [developerUsername, setDeveloperUsername] = useState("");
  const [developerPassword, setDeveloperPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const { data: users, isLoading: usersLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/admin/users/stats"],
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, subscriptionStatus }: { userId: string; subscriptionStatus: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/subscription`, { subscriptionStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "Subscription Updated",
        description: "The user's subscription has been updated successfully.",
      });
      setUserToUpdate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
      setUserToUpdate(null);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "Role Updated",
        description: "The user's role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/resend-verification`);
      return response.json();
    },
    onSuccess: (data: { emailSent: boolean }) => {
      toast({
        title: data.emailSent ? "Verification Email Sent" : "Email Failed",
        description: data.emailSent 
          ? "A verification email has been sent to the user."
          : "Failed to send verification email. Please try again.",
        variant: data.emailSent ? "default" : "destructive",
      });
      setUserToResendVerification(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
      setUserToResendVerification(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "User Deleted",
        description: "The user has been permanently deleted.",
      });
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Cannot Delete User",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
      setUserToDelete(null);
    },
  });

  const createDeveloperMutation = useMutation({
    mutationFn: async (data: { email: string; username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/admin/users/developer", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "Developer Account Created",
        description: "The developer account has been created successfully.",
      });
      setShowCreateDeveloper(false);
      setDeveloperEmail("");
      setDeveloperUsername("");
      setDeveloperPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Developer",
        description: error.message || "Failed to create developer account",
        variant: "destructive",
      });
    },
  });

  const handleCreateDeveloper = () => {
    if (!developerEmail || !developerUsername || !developerPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createDeveloperMutation.mutate({
      email: developerEmail,
      username: developerUsername,
      password: developerPassword,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="text-xs">Admin</Badge>;
      case 'developer':
        return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 text-xs">Developer</Badge>;
      default:
        return null;
    }
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case 'comped':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Comped</Badge>;
      case 'referral_trial':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Referral Trial</Badge>;
      case 'archived':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Archived</Badge>;
      case 'free':
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSubscription = subscriptionFilter === "all" || user.subscriptionStatus === subscriptionFilter;
    const matchesVerification = 
      verificationFilter === "all" || 
      (verificationFilter === "verified" && user.isEmailVerified) ||
      (verificationFilter === "unverified" && !user.isEmailVerified);
    
    return matchesSearch && matchesSubscription && matchesVerification;
  }) || [];

  const topActiveUsers = [...(users || [])].sort((a, b) => 
    (b.dealsAnalyzed + b.lendersSaved) - (a.dealsAnalyzed + a.lendersSaved)
  ).slice(0, 10);

  const topReferrers = [...(users || [])].sort((a, b) => b.referralCount - a.referralCount)
    .filter(u => u.referralCount > 0)
    .slice(0, 10);

  const recentSignups = [...(users || [])].filter(u => u.createdAt)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 10);

  const unverifiedUsers = (users || []).filter(u => !u.isEmailVerified);
  
  const archivedUsers = (users || []).filter(u => u.subscriptionStatus === 'archived');
  
  // Filter out archived users from main directory - only show them when explicitly filtering for archived
  const directoryUsers = subscriptionFilter === 'archived' 
    ? filteredUsers 
    : filteredUsers.filter(u => u.subscriptionStatus !== 'archived');

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">User Management</h1>
                <p className="text-muted-foreground mt-1">Manage users, subscriptions, and view activity</p>
              </div>
            </div>
            {!isAuditor && (
              <Button
                onClick={() => setShowCreateDeveloper(true)}
                data-testid="button-create-developer"
              >
                <Code className="h-4 w-4 mr-2" />
                Create Developer
              </Button>
            )}
          </div>

          {isAuditor && (
            <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="banner-read-only">
              <p className="text-sm text-amber-800 dark:text-amber-200">You are viewing this page in read-only mode.</p>
            </div>
          )}

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Users</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Active</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.bySubscription.active}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Comped</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.bySubscription.comped}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Referral Trial</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.bySubscription.referral_trial}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Last 7 Days</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.recentSignups.last7Days}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Unverified</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.emailVerification.unverified}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="directory" className="space-y-6">
            <TabsList>
              <TabsTrigger value="directory" data-testid="tab-directory">User Directory</TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">Top Active</TabsTrigger>
              <TabsTrigger value="referrals" data-testid="tab-referrals">Referral Leaders</TabsTrigger>
              <TabsTrigger value="recent" data-testid="tab-recent">Recent Signups</TabsTrigger>
              <TabsTrigger value="unverified" data-testid="tab-unverified">Unverified ({unverifiedUsers.length})</TabsTrigger>
              <TabsTrigger value="archived" data-testid="tab-archived">Archived ({archivedUsers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="directory">
              <Card>
                <CardHeader>
                  <CardTitle>User Directory</CardTitle>
                  <CardDescription>Search and manage all registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by email, username, or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search"
                      />
                    </div>
                    <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-subscription">
                        <SelectValue placeholder="Subscription" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subscriptions</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="comped">Comped</SelectItem>
                        <SelectItem value="referral_trial">Referral Trial</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-verification">
                        <SelectValue placeholder="Verification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="unverified">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {usersLoading ? (
                    <div className="text-center py-8">Loading users...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Verified</TableHead>
                            <TableHead>Terms</TableHead>
                            <TableHead>Deals</TableHead>
                            <TableHead>Lenders</TableHead>
                            <TableHead>Referrals</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {directoryUsers.map((user) => (
                            <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{user.fullName || user.username}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {!isAuditor ? (
                                  <Select
                                    value={user.subscriptionStatus}
                                    onValueChange={(value) => setUserToUpdate({ user, status: value })}
                                  >
                                    <SelectTrigger className="w-[130px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="free">Free</SelectItem>
                                      <SelectItem value="comped">Comped</SelectItem>
                                      <SelectItem value="referral_trial">Referral Trial</SelectItem>
                                      <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm">{getSubscriptionBadge(user.subscriptionStatus)}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {!isAuditor ? (
                                  <Select
                                    value={user.role}
                                    onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value })}
                                  >
                                    <SelectTrigger className="w-[110px]" data-testid={`select-role-${user.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="auditor">Auditor</SelectItem>
                                      <SelectItem value="developer">Developer</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm capitalize">{user.role}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.isEmailVerified ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                              </TableCell>
                              <TableCell>
                                {user.termsAcceptedAt ? (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <FileCheck className="h-5 w-5 text-green-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        Accepted v{user.termsVersion || "1.0"}<br />
                                        {format(new Date(user.termsAcceptedAt), 'MMM d, yyyy')}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <FileX className="h-5 w-5 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">No acceptance record</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell>{user.dealsAnalyzed}</TableCell>
                              <TableCell>{user.lendersSaved}</TableCell>
                              <TableCell>{user.referralCount}</TableCell>
                              <TableCell>
                                {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
                              </TableCell>
                              <TableCell>
                                {!isAuditor && (
                                  <div className="flex items-center gap-2">
                                    {!user.isEmailVerified && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setUserToResendVerification(user)}
                                        data-testid={`button-resend-${user.id}`}
                                      >
                                        <Mail className="h-4 w-4 mr-1" />
                                        Resend
                                      </Button>
                                    )}
                                    {user.referralCount === 0 && user.role !== 'admin' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => setUserToDelete(user)}
                                        data-testid={`button-delete-${user.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {directoryUsers.length === 0 && (
                        <p className="text-center py-8 text-muted-foreground">No users found</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Top Active Users
                  </CardTitle>
                  <CardDescription>Users ranked by deals analyzed + lenders saved</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Deals Analyzed</TableHead>
                        <TableHead>Lenders Saved</TableHead>
                        <TableHead>Total Activity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topActiveUsers.map((user, index) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Badge variant={index < 3 ? "default" : "secondary"}>
                              #{index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.fullName || user.username}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{user.dealsAnalyzed}</TableCell>
                          <TableCell>{user.lendersSaved}</TableCell>
                          <TableCell className="font-bold">{user.dealsAnalyzed + user.lendersSaved}</TableCell>
                          <TableCell>{getSubscriptionBadge(user.subscriptionStatus)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referrals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Referral Leaderboard
                  </CardTitle>
                  <CardDescription>Users who have referred the most new members</CardDescription>
                </CardHeader>
                <CardContent>
                  {topReferrers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Referrals</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topReferrers.map((user, index) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Badge variant={index < 3 ? "default" : "secondary"}>
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.fullName || user.username}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-bold text-lg">{user.referralCount}</TableCell>
                            <TableCell>{getSubscriptionBadge(user.subscriptionStatus)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No referrals yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Recent Signups
                  </CardTitle>
                  <CardDescription>Most recent user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSignups.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.fullName || user.username}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy h:mm a') : '-'}
                          </TableCell>
                          <TableCell>
                            {user.isEmailVerified ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>{getSubscriptionBadge(user.subscriptionStatus)}</TableCell>
                          <TableCell>
                            {user.city && user.state ? `${user.city}, ${user.state}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unverified">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Unverified Users
                  </CardTitle>
                  <CardDescription>Users who haven't verified their email address</CardDescription>
                </CardHeader>
                <CardContent>
                  {unverifiedUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unverifiedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.fullName || user.username}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>{getSubscriptionBadge(user.subscriptionStatus)}</TableCell>
                            <TableCell>
                              {!isAuditor && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setUserToResendVerification(user)}
                                  disabled={resendVerificationMutation.isPending}
                                >
                                  <RefreshCw className={`h-4 w-4 mr-1 ${resendVerificationMutation.isPending ? 'animate-spin' : ''}`} />
                                  Resend Verification
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <UserCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">All users have verified their email!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="archived">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-gray-500" />
                    Archived Users
                  </CardTitle>
                  <CardDescription>Users who have been archived (still tracked for reporting)</CardDescription>
                </CardHeader>
                <CardContent>
                  {archivedUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Deals</TableHead>
                          <TableHead>Lenders</TableHead>
                          <TableHead>Referrals</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.fullName || user.username}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>{user.dealsAnalyzed}</TableCell>
                            <TableCell>{user.lendersSaved}</TableCell>
                            <TableCell>{user.referralCount}</TableCell>
                            <TableCell>
                              {!isAuditor ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={user.subscriptionStatus}
                                    onValueChange={(value) => setUserToUpdate({ user, status: value })}
                                  >
                                    <SelectTrigger className="w-[130px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Restore Active</SelectItem>
                                      <SelectItem value="free">Set Free</SelectItem>
                                      <SelectItem value="archived">Keep Archived</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {user.referralCount === 0 && user.role !== 'admin' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => setUserToDelete(user)}
                                      data-testid={`button-delete-archived-${user.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">{user.subscriptionStatus}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">No archived users</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirm Subscription Update Dialog */}
      <AlertDialog open={!!userToUpdate} onOpenChange={() => setUserToUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Subscription Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {userToUpdate?.user.email}'s subscription status to "{userToUpdate?.status}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToUpdate) {
                  updateSubscriptionMutation.mutate({
                    userId: userToUpdate.user.id,
                    subscriptionStatus: userToUpdate.status,
                  });
                }
              }}
            >
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Resend Verification Dialog */}
      <AlertDialog open={!!userToResendVerification} onOpenChange={() => setUserToResendVerification(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Verification Email</AlertDialogTitle>
            <AlertDialogDescription>
              Send a new verification email to {userToResendVerification?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToResendVerification) {
                  resendVerificationMutation.mutate(userToResendVerification.id);
                }
              }}
            >
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete User Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete User Permanently</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to permanently delete this user?</p>
              <div className="bg-muted p-3 rounded-md mt-2">
                <p className="font-medium">{userToDelete?.fullName || userToDelete?.username}</p>
                <p className="text-sm text-muted-foreground">{userToDelete?.email}</p>
              </div>
              <p className="text-red-600 font-medium mt-2">
                This action cannot be undone. All user data including deals, saved lenders, and activity will be deleted.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (userToDelete) {
                  deleteUserMutation.mutate(userToDelete.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Developer Account Dialog */}
      <Dialog open={showCreateDeveloper} onOpenChange={setShowCreateDeveloper}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-indigo-600" />
              Create Developer Account
            </DialogTitle>
            <DialogDescription>
              Developer accounts have limited admin access for CRM integrations. They can access Partner Tools, Lender data (view only), Calculations Reference, and Training Videos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dev-email">Email</Label>
              <Input
                id="dev-email"
                type="email"
                placeholder="developer@example.com"
                value={developerEmail}
                onChange={(e) => setDeveloperEmail(e.target.value)}
                data-testid="input-developer-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-username">Username</Label>
              <Input
                id="dev-username"
                type="text"
                placeholder="developer_username"
                value={developerUsername}
                onChange={(e) => setDeveloperUsername(e.target.value)}
                data-testid="input-developer-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-password">Password</Label>
              <div className="relative">
                <Input
                  id="dev-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={developerPassword}
                  onChange={(e) => setDeveloperPassword(e.target.value)}
                  data-testid="input-developer-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDeveloper(false);
                setDeveloperEmail("");
                setDeveloperUsername("");
                setDeveloperPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDeveloper}
              disabled={createDeveloperMutation.isPending}
              data-testid="button-confirm-create-developer"
            >
              {createDeveloperMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Developer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
