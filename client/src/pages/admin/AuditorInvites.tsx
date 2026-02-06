import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Building2,
} from "lucide-react";

interface AuditorInvite {
  id: string;
  email: string;
  inviteCode: string;
  companyName: string | null;
  status: string;
  invitedByEmail: string | null;
  acceptedByEmail: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string | null;
}

export default function AuditorInvites() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [auditorEmail, setAuditorEmail] = useState("");
  const [auditorCompanyName, setAuditorCompanyName] = useState("");
  const [auditorExpiresInDays, setAuditorExpiresInDays] = useState("30");
  const [inviteToDelete, setInviteToDelete] = useState<AuditorInvite | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin' && data.role !== 'auditor') {
            toast({
              title: "Access Denied",
              description: "Admin privileges required.",
              variant: "destructive",
            });
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
      }
      setIsAuthChecking(false);
    };
    checkAdminAuth();
  }, [setLocation, toast]);

  const { data: auditorInvites, isLoading } = useQuery<AuditorInvite[]>({
    queryKey: ["/api/admin/auditor-invites"],
    enabled: !isAuthChecking,
  });

  const createMutation = useMutation({
    mutationFn: async ({ email, companyName, expiresInDays }: { email: string; companyName: string; expiresInDays: number }) => {
      const response = await fetch("/api/admin/auditor-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, companyName: companyName || undefined, expiresInDays }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create auditor invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auditor-invites"] });
      toast({
        title: "Auditor Invitation Sent",
        description: data.emailSent 
          ? `Auditor invitation sent to ${data.email}` 
          : "Invitation created but email failed to send",
      });
      setAuditorEmail("");
      setAuditorCompanyName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create auditor invitation",
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/auditor-invites/${id}/resend`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resend auditor invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auditor-invites"] });
      toast({
        title: "Auditor Invitation Resent",
        description: data.emailSent 
          ? `New invitation sent to ${data.email}` 
          : "Invitation updated but email failed to send",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend auditor invitation",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/auditor-invites/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete auditor invitation");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auditor-invites"] });
      toast({
        title: "Auditor Invitation Deleted",
        description: "The auditor invitation has been deleted.",
      });
      setInviteToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete auditor invitation",
        variant: "destructive",
      });
      setInviteToDelete(null);
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditorEmail) {
      toast({
        title: "Missing Email",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    if (!auditorEmail.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ 
      email: auditorEmail, 
      companyName: auditorCompanyName,
      expiresInDays: parseInt(auditorExpiresInDays) 
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Code Copied",
      description: "Auditor invite code copied to clipboard.",
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const pendingInvites = auditorInvites?.filter(i => i.status === "pending" && new Date(i.expiresAt) >= new Date()) || [];
  const acceptedInvites = auditorInvites?.filter(i => i.status === "accepted") || [];
  const expiredInvites = auditorInvites?.filter(i => i.status === "pending" && new Date(i.expiresAt) < new Date()) || [];

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {isAuditor && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-400" data-testid="banner-read-only">
            You are viewing this page in read-only mode
          </div>
        )}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Auditor Invitations</h1>
            <p className="text-muted-foreground mt-1">
              Invite marketing agencies or partners with read-only admin access
            </p>
          </div>
        </div>

        {!isAuditor && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Send Auditor Invitation
              </CardTitle>
              <CardDescription>
                Send an invitation for read-only admin access — auditors can view reports, analytics, and user data without editing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="email"
                  placeholder="Enter email address..."
                  value={auditorEmail}
                  onChange={(e) => setAuditorEmail(e.target.value)}
                  className="flex-1"
                  data-testid="input-auditor-email"
                />
                <Input
                  type="text"
                  placeholder="Company name (optional)"
                  value={auditorCompanyName}
                  onChange={(e) => setAuditorCompanyName(e.target.value)}
                  className="w-[200px]"
                  data-testid="input-auditor-company"
                />
                <Select value={auditorExpiresInDays} onValueChange={setAuditorExpiresInDays}>
                  <SelectTrigger className="w-[140px]" data-testid="select-auditor-expires-days">
                    <SelectValue placeholder="Expires in" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-send-auditor-invite"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/40 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingInvites.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-accepted-count">{acceptedInvites.length}</p>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 rounded-lg flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-expired-count">{expiredInvites.length}</p>
                  <p className="text-sm text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              All Auditor Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading auditor invitations...
              </div>
            ) : !auditorInvites || auditorInvites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-state">
                No auditor invitations yet. Send one above to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {auditorInvites.map((invite) => {
                  const isExpired = new Date(invite.expiresAt) < new Date();
                  const canResend = invite.status === "pending";
                  const canDelete = invite.status !== "accepted";
                  
                  return (
                    <div
                      key={invite.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg"
                      data-testid={`auditor-invite-${invite.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate" data-testid={`text-auditor-email-${invite.id}`}>
                            {invite.email}
                          </span>
                          {invite.companyName && (
                            <Badge variant="outline" className="gap-1">
                              <Building2 className="h-3 w-3" />
                              {invite.companyName}
                            </Badge>
                          )}
                          {invite.status === "accepted" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Accepted
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <span>Code:</span>
                            <code className="bg-muted px-2 py-0.5 rounded font-mono">
                              {invite.inviteCode}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyCode(invite.inviteCode)}
                              data-testid={`button-copy-auditor-code-${invite.id}`}
                            >
                              {copiedCode === invite.inviteCode ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <span>Expires: {formatDate(invite.expiresAt)}</span>
                          {invite.acceptedByEmail && (
                            <span>Accepted by: {invite.acceptedByEmail}</span>
                          )}
                        </div>
                      </div>
                      
                      {!isAuditor && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canResend && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendMutation.mutate(invite.id)}
                              disabled={resendMutation.isPending}
                              data-testid={`button-resend-auditor-${invite.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setInviteToDelete(invite)}
                              data-testid={`button-delete-auditor-${invite.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!inviteToDelete} onOpenChange={() => setInviteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Auditor Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the auditor invitation for{" "}
              <strong>{inviteToDelete?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-auditor">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => inviteToDelete && deleteMutation.mutate(inviteToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-auditor"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
