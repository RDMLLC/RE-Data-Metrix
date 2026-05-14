import { useState, useEffect, useRef } from "react";
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
  EyeOff,
  Download,
  Pencil,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface UserWithStats {
  id: string;
  username: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  archiveReason: string | null;
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
  signupSource: string | null;
  signupRef: string | null;
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
  const [userToUpdate, setUserToUpdate] = useState<{user: UserWithStats, status: string, plan?: string | null, archiveReason?: string} | null>(null);
  const [userToResendVerification, setUserToResendVerification] = useState<UserWithStats | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null);
  const [showCreateDeveloper, setShowCreateDeveloper] = useState(false);
  const [developerEmail, setDeveloperEmail] = useState("");
  const [developerUsername, setDeveloperUsername] = useState("");
  const [developerPassword, setDeveloperPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userToEditEmail, setUserToEditEmail] = useState<UserWithStats | null>(null);
  const [editEmailValue, setEditEmailValue] = useState("");
  const [editEmailError, setEditEmailError] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailErrorDetails, setEmailErrorDetails] = useState<string[]>([]);
  const [lastSendResult, setLastSendResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const topScrollInnerRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  useEffect(() => {
    const sync = () => {
      const table = tableScrollRef.current;
      const inner = topScrollInnerRef.current;
      if (table && inner) {
        inner.style.width = `${table.scrollWidth}px`;
      }
    };
    sync();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    if (ro && tableScrollRef.current) ro.observe(tableScrollRef.current);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('resize', sync);
      if (ro) ro.disconnect();
    };
  }, []);

  const handleTopScroll = () => {
    if (isSyncingScroll.current) { isSyncingScroll.current = false; return; }
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (top && table && table.scrollLeft !== top.scrollLeft) {
      isSyncingScroll.current = true;
      table.scrollLeft = top.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (isSyncingScroll.current) { isSyncingScroll.current = false; return; }
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (top && table && top.scrollLeft !== table.scrollLeft) {
      isSyncingScroll.current = true;
      top.scrollLeft = table.scrollLeft;
    }
  };

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
    mutationFn: async ({ userId, subscriptionStatus, subscriptionPlan, archiveReason }: { userId: string; subscriptionStatus: string; subscriptionPlan?: string | null; archiveReason?: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/subscription`, { subscriptionStatus, subscriptionPlan, archiveReason });
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

  const updateEmailMutation = useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/email`, { email });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update email");
      }
      return data;
    },
    onSuccess: (data: { emailSent?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "Email Updated",
        description: data.emailSent
          ? "Email updated and verification link sent."
          : "Email updated, but the verification email could not be sent. Use Resend Verification to retry.",
      });
      setUserToEditEmail(null);
      setEditEmailValue("");
      setEditEmailError("");
    },
    onError: (error: any) => {
      setEditEmailError(error.message || "Failed to update email");
    },
  });

  const sendBulkEmailMutation = useMutation({
    mutationFn: async ({ userIds, subject, body }: { userIds: string[]; subject: string; body: string }) => {
      const response = await apiRequest("POST", "/api/admin/users/send-email", { userIds, subject, body });
      return response.json() as Promise<{ sent: number; failed: number; errors: string[] }>;
    },
    onSuccess: (data) => {
      setLastSendResult({ sent: data.sent, failed: data.failed, errors: data.errors || [] });
      if (data.failed > 0 && data.sent === 0) {
        setEmailErrorDetails(data.errors.length ? data.errors : ["All sends failed"]);
        toast({
          title: "Send Failed",
          description: `Failed to send to all ${data.failed} recipient(s).`,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Emails Sent",
        description: `Email sent to ${data.sent} recipient${data.sent === 1 ? '' : 's'}${data.failed > 0 ? ` (${data.failed} failed)` : ''}.`,
      });
      setSendEmailOpen(false);
      setEmailSubject("");
      setEmailBody("");
      setEmailErrorDetails([]);
      setSelectedUserIds(new Set());
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to send emails";
      setEmailErrorDetails([msg]);
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const handleToggleUser = (userId: string, checked: boolean) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(userId); else next.delete(userId);
      return next;
    });
  };

  const handleToggleAllVisible = (checked: boolean, visibleIds: string[]) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (checked) {
        visibleIds.forEach(id => next.add(id));
      } else {
        visibleIds.forEach(id => next.delete(id));
      }
      return next;
    });
  };

  const handleSendEmailSubmit = () => {
    setEmailErrorDetails([]);
    setLastSendResult(null);
    if (!emailSubject.trim() || !emailBody.trim() || selectedUserIds.size === 0) return;
    sendBulkEmailMutation.mutate({
      userIds: Array.from(selectedUserIds),
      subject: emailSubject,
      body: emailBody,
    });
  };

  const handleEditEmailOpen = (user: UserWithStats) => {
    setUserToEditEmail(user);
    setEditEmailValue(user.email);
    setEditEmailError("");
  };

  const handleEditEmailSubmit = () => {
    if (!userToEditEmail) return;
    setEditEmailError("");
    updateEmailMutation.mutate({ userId: userToEditEmail.id, email: editEmailValue });
  };

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

  const getDisplayStatus = (status: string, plan?: string | null): string => {
    if (status === 'active') {
      return plan === 'annual' ? 'annual' : 'monthly';
    }
    return status;
  };

  const getDisplayLabel = (status: string, plan?: string | null): string => {
    if (status === 'active') return plan === 'annual' ? 'Annual' : 'Monthly';
    if (status === 'cancelling') return plan === 'annual' ? 'Annual (Cancelling)' : 'Monthly (Cancelling)';
    const labels: Record<string, string> = {
      free: 'Free', comped: 'Comped', referral_trial: 'Referral Trial', archived: 'Archived', suspended: 'Suspended',
    };
    return labels[status] || status;
  };

  const getSubscriptionBadge = (status: string, plan?: string | null) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            {plan === 'annual' ? 'Annual' : 'Monthly'}
          </Badge>
        );
      case 'cancelling':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            {plan === 'annual' ? 'Annual (Cancelling)' : 'Monthly (Cancelling)'}
          </Badge>
        );
      case 'comped':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Comped</Badge>;
      case 'referral_trial':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Referral Trial</Badge>;
      case 'archived':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Archived</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Suspended</Badge>;
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
    
    const matchesSubscription =
      subscriptionFilter === "all" ||
      (subscriptionFilter === 'monthly' && user.subscriptionStatus === 'active' && user.subscriptionPlan !== 'annual') ||
      (subscriptionFilter === 'annual' && user.subscriptionStatus === 'active' && user.subscriptionPlan === 'annual') ||
      user.subscriptionStatus === subscriptionFilter;
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
                <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>User Directory</CardTitle>
                    <CardDescription>Search and manage all registered users</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isAuditor && selectedUserIds.size > 0 && (
                      <Button
                        variant="default"
                        size="default"
                        data-testid="button-send-email"
                        onClick={() => {
                          setEmailErrorDetails([]);
                          setSendEmailOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Email ({selectedUserIds.size})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="default"
                      data-testid="button-export-csv"
                      onClick={() => {
                        window.location.href = "/api/admin/users/export.csv";
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </CardHeader>
                {lastSendResult && (
                  <div className="px-6 pb-2" data-testid="bulk-email-summary">
                    <div className={`rounded-md border p-3 ${
                      lastSendResult.failed > 0
                        ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800'
                        : 'border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            lastSendResult.failed > 0
                              ? 'text-amber-900 dark:text-amber-100'
                              : 'text-green-900 dark:text-green-100'
                          }`} data-testid="text-bulk-email-summary">
                            Sent: {lastSendResult.sent} | Failed: {lastSendResult.failed}
                          </p>
                          {lastSendResult.failed > 0 && lastSendResult.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">Failed recipients:</p>
                              <ul className="text-xs text-amber-800 dark:text-amber-200 list-disc pl-5 space-y-0.5 max-h-40 overflow-auto">
                                {lastSendResult.errors.map((e, i) => (
                                  <li key={i} data-testid={`text-bulk-email-failed-${i}`}>{e}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLastSendResult(null)}
                          data-testid="button-dismiss-bulk-email-summary"
                          aria-label="Dismiss send summary"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="cancelling">Cancelling</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="comped">Comped</SelectItem>
                        <SelectItem value="referral_trial">Referral Trial</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
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
                    <>
                      <div
                        ref={topScrollRef}
                        onScroll={handleTopScroll}
                        className="overflow-x-auto"
                        style={{ height: 12 }}
                        data-testid="scroll-users-top"
                      >
                        <div ref={topScrollInnerRef} style={{ height: 1 }} />
                      </div>
                      <div
                        ref={tableScrollRef}
                        onScroll={handleTableScroll}
                        className="overflow-x-auto"
                        data-testid="scroll-users-bottom"
                      >
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow>
                            {!isAuditor && (
                              <TableHead className="w-10">
                                <Checkbox
                                  data-testid="checkbox-select-all"
                                  checked={
                                    directoryUsers.length > 0 &&
                                    directoryUsers.every(u => selectedUserIds.has(u.id))
                                  }
                                  onCheckedChange={(checked) =>
                                    handleToggleAllVisible(!!checked, directoryUsers.map(u => u.id))
                                  }
                                  aria-label="Select all visible users"
                                />
                              </TableHead>
                            )}
                            <TableHead className="w-48">User</TableHead>
                            <TableHead className="w-32">Status</TableHead>
                            <TableHead className="w-28">Role</TableHead>
                            <TableHead className="w-12 text-center">Verified</TableHead>
                            <TableHead className="w-14 text-center">Deals</TableHead>
                            <TableHead className="w-14 text-center">Lenders</TableHead>
                            <TableHead className="w-14 text-center">Referrals</TableHead>
                            <TableHead className="w-20">Joined</TableHead>
                            <TableHead className="w-20 text-center">Source</TableHead>
                            <TableHead className="w-16">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {directoryUsers.map((user) => (
                            <TableRow
                              key={user.id}
                              data-testid={`row-user-${user.id}`}
                              data-state={selectedUserIds.has(user.id) ? 'selected' : undefined}
                              className={selectedUserIds.has(user.id) ? 'bg-blue-50 dark:bg-blue-950/30' : ''}
                            >
                              {!isAuditor && (
                                <TableCell>
                                  <Checkbox
                                    data-testid={`checkbox-user-${user.id}`}
                                    checked={selectedUserIds.has(user.id)}
                                    onCheckedChange={(checked) => handleToggleUser(user.id, !!checked)}
                                    aria-label={`Select ${user.email}`}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <div>
                                  <p className="font-medium">{user.fullName || user.username}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {!isAuditor ? (
                                  <Select
                                    value={getDisplayStatus(user.subscriptionStatus, user.subscriptionPlan)}
                                    onValueChange={(value) => {
                                      if (value === 'monthly') {
                                        setUserToUpdate({ user, status: 'active', plan: 'monthly' });
                                      } else if (value === 'annual') {
                                        setUserToUpdate({ user, status: 'active', plan: 'annual' });
                                      } else {
                                        setUserToUpdate({ user, status: value, plan: null });
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="annual">Annual</SelectItem>
                                      <SelectItem value="cancelling">Cancelling</SelectItem>
                                      <SelectItem value="free">Free</SelectItem>
                                      <SelectItem value="comped">Comped</SelectItem>
                                      <SelectItem value="referral_trial">Referral Trial</SelectItem>
                                      <SelectItem value="suspended">Suspended</SelectItem>
                                      <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm">{getSubscriptionBadge(user.subscriptionStatus, user.subscriptionPlan)}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {!isAuditor ? (
                                  <Select
                                    value={user.role}
                                    onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value })}
                                  >
                                    <SelectTrigger className="w-24" data-testid={`select-role-${user.id}`}>
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
                              <TableCell className="text-center">
                                {user.isEmailVerified ? (
                                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="text-center">{user.dealsAnalyzed}</TableCell>
                              <TableCell className="text-center">{user.lendersSaved}</TableCell>
                              <TableCell className="text-center">{user.referralCount}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {user.createdAt ? format(new Date(user.createdAt), 'M/d/yy') : '-'}
                              </TableCell>
                              <TableCell className="text-center" data-testid={`text-source-${user.id}`}>
                                {user.signupSource === 'meta' ? (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-transparent">Meta</Badge>
                                ) : user.signupSource === 'google' ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent">Google</Badge>
                                ) : user.signupSource ? (
                                  <Badge variant="secondary">{user.signupSource}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {!isAuditor && (
                                  <div className="flex items-center gap-1">
                                    {/* EDIT_BUTTON_HIDDEN — uncomment to restore
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          onClick={() => handleEditEmailOpen(user)}
                                          data-testid={`button-edit-email-${user.id}`}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit email address</TooltipContent>
                                    </Tooltip>
                                    */}
                                    {!user.isEmailVerified && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => setUserToResendVerification(user)}
                                            data-testid={`button-resend-${user.id}`}
                                          >
                                            <Mail className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Resend verification email</TooltipContent>
                                      </Tooltip>
                                    )}
                                    {user.role !== 'admin' && (!user.isEmailVerified || user.referralCount === 0) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            className="text-red-600"
                                            onClick={() => setUserToDelete(user)}
                                            data-testid={`button-delete-${user.id}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete user</TooltipContent>
                                      </Tooltip>
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
                    </>
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
                          <TableCell>{getSubscriptionBadge(user.subscriptionStatus, user.subscriptionPlan)}</TableCell>
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
                            <TableCell>{getSubscriptionBadge(user.subscriptionStatus, user.subscriptionPlan)}</TableCell>
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
                          <TableCell>{getSubscriptionBadge(user.subscriptionStatus, user.subscriptionPlan)}</TableCell>
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
                            <TableCell>{getSubscriptionBadge(user.subscriptionStatus, user.subscriptionPlan)}</TableCell>
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
              Are you sure you want to change {userToUpdate?.user.email}'s subscription to "{userToUpdate ? getDisplayLabel(userToUpdate.status, userToUpdate.plan) : ''}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(userToUpdate?.status === 'archived' || userToUpdate?.status === 'suspended') && (
            <div className="px-1 pb-2 space-y-1">
              <Label>Reason</Label>
              <Select
                value={userToUpdate.archiveReason || ''}
                onValueChange={(v) => setUserToUpdate(prev => prev ? { ...prev, archiveReason: v } : null)}
              >
                <SelectTrigger data-testid="select-archive-reason">
                  <SelectValue placeholder="Select reason (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="fraud">Fraud</SelectItem>
                  <SelectItem value="erasure">Erasure</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToUpdate) {
                  updateSubscriptionMutation.mutate({
                    userId: userToUpdate.user.id,
                    subscriptionStatus: userToUpdate.status,
                    subscriptionPlan: userToUpdate.plan,
                    archiveReason: userToUpdate.archiveReason,
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

      {/* Edit Email Dialog */}
      <Dialog
        open={!!userToEditEmail}
        onOpenChange={(open) => {
          if (!open) {
            setUserToEditEmail(null);
            setEditEmailValue("");
            setEditEmailError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Email Address
            </DialogTitle>
            <DialogDescription>
              Update the email address for {userToEditEmail?.fullName || userToEditEmail?.username}. A new verification link will be sent to the updated address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmailValue}
                onChange={(e) => {
                  setEditEmailValue(e.target.value);
                  setEditEmailError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditEmailSubmit();
                }}
                data-testid="input-edit-email"
              />
              {editEmailError && (
                <p className="text-sm text-red-600" data-testid="text-edit-email-error">{editEmailError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUserToEditEmail(null);
                setEditEmailValue("");
                setEditEmailError("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditEmailSubmit}
              disabled={updateEmailMutation.isPending}
              data-testid="button-confirm-edit-email"
            >
              {updateEmailMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Send Verification"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  tabIndex={-1}
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

      <Dialog
        open={sendEmailOpen}
        onOpenChange={(open) => {
          if (!sendBulkEmailMutation.isPending) {
            setSendEmailOpen(open);
            if (!open) setEmailErrorDetails([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email to {selectedUserIds.size} Recipient{selectedUserIds.size === 1 ? '' : 's'}</DialogTitle>
            <DialogDescription>
              Compose a one-time email to the selected users. Merge fields are personalized per recipient.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-email-subject">Subject</Label>
              <Input
                id="bulk-email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject line"
                data-testid="input-bulk-email-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-email-body">Body</Label>
              <Textarea
                id="bulk-email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={10}
                placeholder={`Hi {{firstName}},\n\nWrite your message here...`}
                data-testid="input-bulk-email-body"
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Available merge fields (work in subject and body):</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><code>{`{{firstName}}`}</code> — recipient's first name (falls back to "there")</li>
                  <li><code>{`{{fullName}}`}</code> — recipient's full name</li>
                  <li><code>{`{{email}}`}</code> — recipient's email address</li>
                  <li><code>{`{{username}}`}</code> — recipient's username</li>
                </ul>
              </div>
            </div>
            {emailErrorDetails.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3" data-testid="bulk-email-errors">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Send errors:</p>
                <ul className="text-xs text-red-700 dark:text-red-300 list-disc pl-5 space-y-0.5 max-h-40 overflow-auto">
                  {emailErrorDetails.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendEmailOpen(false)}
              disabled={sendBulkEmailMutation.isPending}
              data-testid="button-cancel-bulk-email"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmailSubmit}
              disabled={
                sendBulkEmailMutation.isPending ||
                !emailSubject.trim() ||
                !emailBody.trim() ||
                selectedUserIds.size === 0
              }
              data-testid="button-confirm-bulk-email"
            >
              {sendBulkEmailMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
