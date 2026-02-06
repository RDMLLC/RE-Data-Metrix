import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Users,
  Calendar,
  Search,
  Mail,
  Phone,
  Download,
  RefreshCw,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  Trash2,
  MoreHorizontal,
  UserCheck,
  UserX,
  HelpCircle,
  Video,
  Link2,
  Unlink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WebinarRegistration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  webinarId: string;
  webinarDate: string | null;
  source: string | null;
  referralSource: string | null;
  registeredAt: string;
  rsvpStatus: string | null;
  rsvpUpdatedAt: string | null;
  attended: boolean | null;
  attendanceMarkedAt: string | null;
  postWebinarEmailSentAt: string | null;
  subscriptionLevel: string | null;
}

interface ReferralStat {
  slug: string;
  name: string;
  count: number;
}

type RsvpFilter = 'all' | 'confirmed' | 'declined' | 'pending';
type AttendanceFilter = 'all' | 'attended' | 'not_attended' | 'unmarked';
type SortField = 'registeredAt' | 'rsvpStatus' | 'name' | 'webinarDate';
type SortDirection = 'asc' | 'desc';

export default function WebinarRegistrations() {
  const [, setLocation] = useLocation();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';
  const [searchTerm, setSearchTerm] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');
  const [webinarDateFilter, setWebinarDateFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('webinarDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [zohoDialogOpen, setZohoDialogOpen] = useState(false);
  const [meetingKey, setMeetingKey] = useState("");
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [noShowEmailDialogOpen, setNoShowEmailDialogOpen] = useState(false);
  const [nextWebinarDate, setNextWebinarDate] = useState("");
  const [attendedNotSignedUpDialogOpen, setAttendedNotSignedUpDialogOpen] = useState(false);
  const [followUpPromoCode, setFollowUpPromoCode] = useState("WEBINAR2026");
  const { toast } = useToast();

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

  interface ZohoSession {
    meetingKey: string;
    topic: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: string;
    type: 'webinar' | 'meeting';
  }


  const { data: registrations = [], isLoading, refetch, isRefetching } = useQuery<WebinarRegistration[]>({
    queryKey: ["/api/admin/webinar-registrations"],
  });

  const { data: referralStats = [] } = useQuery<ReferralStat[]>({
    queryKey: ["/api/admin/referral-stats"],
  });

  const getRsvpStatus = (status: string | null): string => {
    return status || 'pending';
  };

  const rsvpCounts = {
    confirmed: registrations.filter(r => getRsvpStatus(r.rsvpStatus) === 'confirmed').length,
    declined: registrations.filter(r => getRsvpStatus(r.rsvpStatus) === 'declined').length,
    pending: registrations.filter(r => getRsvpStatus(r.rsvpStatus) === 'pending').length,
  };

  // Only count attendance for past webinars - future webinars can't have attendance yet
  const now = new Date();
  const pastWebinarRegs = registrations.filter(r => !r.webinarDate || new Date(r.webinarDate) <= now);
  const futureWebinarRegs = registrations.filter(r => r.webinarDate && new Date(r.webinarDate) > now);
  
  const attendanceCounts = {
    attended: pastWebinarRegs.filter(r => r.attended === true).length,
    notAttended: pastWebinarRegs.filter(r => r.attended === false).length,
    unmarked: pastWebinarRegs.filter(r => r.attended === null).length + futureWebinarRegs.length,
  };

  const webinarDates = Array.from(new Set(registrations.map(r => r.webinarDate).filter(Boolean)))
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

  const toggleAttendanceMutation = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/webinar-registrations/${id}/attendance`, {
        attended
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Attendance Updated",
        description: data.registration?.attended ? "Marked as attended" : "Marked as not attended",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webinar-registrations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update",
        description: error.message || "An error occurred while updating attendance",
        variant: "destructive",
      });
    },
  });

  const clearAttendanceMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/webinar-registrations/${id}/attendance`, {
        attended: null
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance Cleared",
        description: "Attendance status reset to unmarked",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webinar-registrations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update",
        description: error.message || "An error occurred while clearing attendance",
        variant: "destructive",
      });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, level }: { id: string; level: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/webinar-registrations/${id}/subscription`, {
        subscriptionLevel: level
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Updated",
        description: "Subscription level has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webinar-registrations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update",
        description: error.message || "An error occurred while updating subscription",
        variant: "destructive",
      });
    },
  });

  const sendPostWebinarEmailsMutation = useMutation({
    mutationFn: async ({ promoCode, nextWebinarDate, facebookGroupUrl }: { promoCode: string; nextWebinarDate: string; facebookGroupUrl: string }) => {
      const response = await apiRequest("POST", "/api/admin/webinar-registrations/send-post-webinar-emails", {
        promoCode,
        nextWebinarDate,
        facebookGroupUrl
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Post-Webinar Emails Sent",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webinar-registrations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Emails",
        description: error.message || "An error occurred while sending emails",
        variant: "destructive",
      });
    },
  });

  const sendConfirmationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/webinar-registrations/send-confirmations", {
        webinarId: "soft-launch-2026"
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Confirmation Emails Sent",
        description: data.message || `Successfully sent confirmation emails`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Emails",
        description: error.message || "An error occurred while sending emails",
        variant: "destructive",
      });
    },
  });

  const deleteRegistrationMutation = useMutation({
    mutationFn: async ({ id, notify, email, name }: { id: string; notify: boolean; email: string; name: string }) => {
      const url = notify 
        ? `/api/admin/webinar-registrations/${id}?notify=true&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`
        : `/api/admin/webinar-registrations/${id}`;
      const response = await apiRequest("DELETE", url);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration Removed",
        description: data.message || "The registrant has been removed from the webinar.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webinar-registrations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Remove",
        description: error.message || "An error occurred while removing the registration",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRegistration = (id: string, name: string, email: string, notify: boolean) => {
    const confirmMessage = notify 
      ? `Remove ${name} and send notification email?`
      : `Remove ${name} from the webinar? (No notification will be sent)`;
    
    if (confirm(confirmMessage)) {
      deleteRegistrationMutation.mutate({ id, notify, email, name });
    }
  };

  const syncSubscriptionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/webinar-registrations/sync-subscriptions");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscriptions Synced",
        description: `Updated ${data.synced} registrations. ${data.withAccounts} of ${data.total} have accounts.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webinar-registrations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync subscriptions with user accounts",
        variant: "destructive",
      });
    },
  });

  const sendNoShowEmailsMutation = useMutation({
    mutationFn: async ({ nextWebinarDate }: { nextWebinarDate: string }) => {
      const response = await apiRequest("POST", "/api/admin/webinar-registrations/send-noshow-emails", {
        nextWebinarDate,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "No-Show Emails Sent",
        description: data.message || `Sent reminder emails to ${data.sent} no-shows`,
      });
      setNoShowEmailDialogOpen(false);
      setNextWebinarDate("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Emails",
        description: error.message || "An error occurred while sending emails",
        variant: "destructive",
      });
    },
  });

  interface AttendedNotSignedUpPreview {
    recipients: { name: string; email: string }[];
    alreadySignedUp: { name: string; email: string }[];
    totalAttended: number;
  }

  const { data: attendedNotSignedUpPreview, isLoading: isLoadingPreview, refetch: refetchPreview, isFetching: isFetchingPreview } = useQuery<AttendedNotSignedUpPreview>({
    queryKey: ["/api/admin/webinar-registrations/attended-not-signed-up"],
    enabled: attendedNotSignedUpDialogOpen,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const sendAttendedNotSignedUpMutation = useMutation({
    mutationFn: async ({ promoCode }: { promoCode: string }) => {
      const response = await apiRequest("POST", "/api/admin/webinar-registrations/send-attended-not-signed-up-emails", {
        promoCode,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Follow-Up Emails Sent",
        description: data.message || `Sent ${data.sent} follow-up emails`,
      });
      setAttendedNotSignedUpDialogOpen(false);
      refetchPreview();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Emails",
        description: error.message || "An error occurred while sending emails",
        variant: "destructive",
      });
    },
  });

  const setWebinarDateMutation = useMutation({
    mutationFn: async ({ webinarDate }: { webinarDate: string }) => {
      const response = await apiRequest("POST", "/api/admin/webinar-registrations/set-webinar-date", {
        webinarDate,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Webinar Dates Updated",
        description: data.message || `Updated ${data.updated} registrations`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webinar-registrations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Dates",
        description: error.message || "An error occurred while updating dates",
        variant: "destructive",
      });
    },
  });

  const { data: zohoStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/zoho/status"],
    refetchInterval: false,
  });

  const { data: zohoWebinars, isLoading: isLoadingWebinars, refetch: refetchWebinars } = useQuery<{ sessions: ZohoSession[] }>({
    queryKey: ["/api/zoho/webinars"],
    enabled: zohoDialogOpen && !!zohoStatus?.connected,
  });

  const syncZohoAttendanceMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await apiRequest("POST", "/api/admin/webinar-registrations/sync-zoho-attendance", {
        meetingKey: key
      });
      return response.json();
    },
    onSuccess: (data) => {
      setZohoDialogOpen(false);
      toast({
        title: "Attendance Synced from Zoho",
        description: data.message || `Matched ${data.matched} attendees`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webinar-registrations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync attendance from Zoho",
        variant: "destructive",
      });
    },
  });

  const connectZohoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/zoho/authorize");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.open(data.authUrl, "_blank");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Zoho",
        variant: "destructive",
      });
    },
  });

  const disconnectZohoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/zoho/disconnect");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Zoho has been disconnected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/zoho/status"] });
    },
  });

  const filteredRegistrations = registrations
    .filter(reg => {
      const matchesSearch = 
        reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reg.phone && reg.phone.includes(searchTerm));
      
      const matchesRsvp = rsvpFilter === 'all' || getRsvpStatus(reg.rsvpStatus) === rsvpFilter;
      
      const matchesAttendance = attendanceFilter === 'all' || 
        (attendanceFilter === 'attended' && reg.attended === true) ||
        (attendanceFilter === 'not_attended' && reg.attended === false) ||
        (attendanceFilter === 'unmarked' && reg.attended === null);
      
      const matchesWebinarDate = webinarDateFilter === 'all' || 
        (webinarDateFilter === 'not_set' && !reg.webinarDate) ||
        (reg.webinarDate && format(new Date(reg.webinarDate), "yyyy-MM-dd") === webinarDateFilter);
      
      return matchesSearch && matchesRsvp && matchesAttendance && matchesWebinarDate;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'rsvpStatus') {
        const statusOrder = { confirmed: 1, pending: 2, declined: 3 };
        const aStatus = getRsvpStatus(a.rsvpStatus);
        const bStatus = getRsvpStatus(b.rsvpStatus);
        comparison = (statusOrder[aStatus as keyof typeof statusOrder] || 2) - (statusOrder[bStatus as keyof typeof statusOrder] || 2);
      } else if (sortField === 'registeredAt') {
        comparison = new Date(a.registeredAt || 0).getTime() - new Date(b.registeredAt || 0).getTime();
      } else if (sortField === 'webinarDate') {
        const aDate = a.webinarDate ? new Date(a.webinarDate).getTime() : 0;
        const bDate = b.webinarDate ? new Date(b.webinarDate).getTime() : 0;
        comparison = aDate - bDate;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getRsvpBadge = (status: string | null) => {
    const rsvp = getRsvpStatus(status);
    switch (rsvp) {
      case 'confirmed':
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getAttendanceBadge = (attended: boolean | null, id: string, webinarDate: Date | string | null) => {
    const isFutureWebinar = webinarDate && new Date(webinarDate) > new Date();
    
    if (isFutureWebinar) {
      return (
        <Badge 
          variant="outline"
          className="text-muted-foreground"
          data-testid={`badge-upcoming-${id}`}
        >
          <Clock className="h-3 w-3 mr-1" />
          Upcoming
        </Badge>
      );
    }
    
    if (attended === true) {
      return (
        <Badge 
          variant="default" 
          className={`bg-emerald-600 ${!isAuditor ? 'cursor-pointer' : ''}`}
          onClick={!isAuditor ? () => toggleAttendanceMutation.mutate({ id, attended: false }) : undefined}
          data-testid={`badge-attended-${id}`}
        >
          <UserCheck className="h-3 w-3 mr-1" />
          Attended
        </Badge>
      );
    } else if (attended === false) {
      return (
        <Badge 
          variant="destructive"
          className={!isAuditor ? 'cursor-pointer' : ''}
          onClick={!isAuditor ? () => clearAttendanceMutation.mutate({ id }) : undefined}
          data-testid={`badge-not-attended-${id}`}
        >
          <UserX className="h-3 w-3 mr-1" />
          No Show
        </Badge>
      );
    }
    return (
      <Badge 
        variant="secondary"
        className={!isAuditor ? 'cursor-pointer' : ''}
        onClick={!isAuditor ? () => toggleAttendanceMutation.mutate({ id, attended: true }) : undefined}
        data-testid={`badge-unmarked-${id}`}
      >
        <HelpCircle className="h-3 w-3 mr-1" />
        {isAuditor ? 'Unmarked' : 'Select'}
      </Badge>
    );
  };

  const getSubscriptionBadge = (level: string | null, id: string) => {
    const levelLabels: Record<string, string> = {
      'free': 'Free',
      'monthly': 'Monthly',
      'annual': 'Annual',
      'beta_free': 'BETA Free',
      'comped': 'Comped',
    };
    
    if (!level) {
      return (
        <Select onValueChange={(value) => updateSubscriptionMutation.mutate({ id, level: value })}>
          <SelectTrigger className="h-7 w-24 text-xs" data-testid={`select-subscription-${id}`}>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
            <SelectItem value="beta_free">BETA Free</SelectItem>
            <SelectItem value="comped">Comped</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    const colors: Record<string, string> = {
      'free': 'bg-gray-500',
      'monthly': 'bg-blue-600',
      'annual': 'bg-purple-600',
      'beta_free': 'bg-amber-600',
      'comped': 'bg-pink-600',
    };
    
    return (
      <Select value={level} onValueChange={(value) => updateSubscriptionMutation.mutate({ id, level: value })}>
        <SelectTrigger className="h-7 w-24 text-xs border-0 p-0" data-testid={`select-subscription-${id}`}>
          <Badge className={`${colors[level] || 'bg-gray-500'}`}>
            {levelLabels[level] || level}
          </Badge>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="annual">Annual</SelectItem>
          <SelectItem value="beta_free">BETA Free</SelectItem>
          <SelectItem value="comped">Comped</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Webinar Date", "RSVP Status", "Attended", "Referral Source", "Registered At"];
    const rows = filteredRegistrations.map(reg => [
      reg.name,
      reg.email,
      reg.phone || "",
      reg.webinarDate ? format(new Date(reg.webinarDate), "yyyy-MM-dd") : "",
      getRsvpStatus(reg.rsvpStatus),
      reg.attended === true ? "Yes" : reg.attended === false ? "No" : "Unmarked",
      reg.referralSource || "",
      reg.registeredAt ? format(new Date(reg.registeredAt), "yyyy-MM-dd HH:mm:ss") : ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webinar-registrations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin")}
              data-testid="button-back-admin"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">Webinar Registrations</h1>
              <p className="text-muted-foreground">View and manage webinar signups</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAuditor && (
            <>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => sendConfirmationsMutation.mutate()}
              disabled={sendConfirmationsMutation.isPending || registrations.length === 0}
              data-testid="button-send-confirmations"
            >
              {sendConfirmationsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Confirmations
            </Button>
            <Button
              variant="outline"
              onClick={() => syncSubscriptionsMutation.mutate()}
              disabled={syncSubscriptionsMutation.isPending || registrations.length === 0}
              data-testid="button-sync-subscriptions"
            >
              {syncSubscriptionsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Sync Accounts
            </Button>
            
            {/* Zoho Sync Button */}
            {zohoStatus?.connected ? (
              <Dialog open={zohoDialogOpen} onOpenChange={setZohoDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                    data-testid="button-sync-zoho"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Sync from Zoho
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Sync Attendance from Zoho Meeting</DialogTitle>
                    <DialogDescription>
                      Select a webinar or meeting to fetch attendance data and automatically update registrant attendance status.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {!useManualEntry ? (
                      <div className="grid gap-2">
                        <Label>Select Webinar/Meeting</Label>
                        {isLoadingWebinars ? (
                          <div className="flex items-center gap-2 p-3 border rounded-md">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Loading webinars...</span>
                          </div>
                        ) : zohoWebinars?.sessions && zohoWebinars.sessions.length > 0 ? (
                          <Select 
                            value={meetingKey} 
                            onValueChange={setMeetingKey}
                          >
                            <SelectTrigger data-testid="select-webinar">
                              <SelectValue placeholder="Choose a webinar or meeting" />
                            </SelectTrigger>
                            <SelectContent>
                              {zohoWebinars.sessions.map((session) => (
                                <SelectItem key={session.meetingKey} value={session.meetingKey}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={session.type === 'webinar' ? 'default' : 'secondary'} className="text-xs">
                                      {session.type}
                                    </Badge>
                                    <span className="truncate max-w-[250px]">{session.topic || 'Untitled'}</span>
                                    {session.startTime && (
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(session.startTime), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 border rounded-md text-sm text-muted-foreground">
                            No webinars or meetings found. Try manual entry below.
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetchWebinars()}
                            disabled={isLoadingWebinars}
                            data-testid="button-refresh-webinars"
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingWebinars ? 'animate-spin' : ''}`} />
                            Refresh List
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary underline-offset-4 hover:underline"
                            onClick={() => setUseManualEntry(true)}
                            data-testid="button-manual-entry"
                          >
                            Enter key manually
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <Label htmlFor="meetingKey">Meeting Key</Label>
                        <Input
                          id="meetingKey"
                          value={meetingKey}
                          onChange={(e) => setMeetingKey(e.target.value)}
                          placeholder="e.g., 3455656789"
                          data-testid="input-meeting-key"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter the numeric webinar key from your Zoho Meeting dashboard (found in session details).
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start px-0 text-primary underline-offset-4 hover:underline"
                          onClick={() => {
                            setUseManualEntry(false);
                            setMeetingKey("");
                          }}
                          data-testid="button-back-to-dropdown"
                        >
                          Back to webinar list
                        </Button>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => disconnectZohoMutation.mutate()}
                      disabled={disconnectZohoMutation.isPending}
                      data-testid="button-disconnect-zoho"
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect Zoho
                    </Button>
                    <Button
                      onClick={() => syncZohoAttendanceMutation.mutate(meetingKey)}
                      disabled={syncZohoAttendanceMutation.isPending || !meetingKey.trim()}
                      data-testid="button-sync-zoho-confirm"
                    >
                      {syncZohoAttendanceMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sync Attendance
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Button
                variant="outline"
                onClick={() => connectZohoMutation.mutate()}
                disabled={connectZohoMutation.isPending}
                data-testid="button-connect-zoho"
              >
                {connectZohoMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Connect Zoho
              </Button>
            )}
            
            <Button
              onClick={handleExportCSV}
              disabled={filteredRegistrations.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            </>
            )}
          </div>
        </div>

        {isAuditor && (
          <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="banner-read-only">
            <p className="text-sm text-amber-800 dark:text-amber-200">You are viewing this page in read-only mode.</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-registrations">
                {registrations.length}
              </div>
              <p className="text-xs text-muted-foreground">
                All signups
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${rsvpFilter === 'confirmed' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setRsvpFilter(rsvpFilter === 'confirmed' ? 'all' : 'confirmed')}
            data-testid="card-filter-confirmed"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Confirmed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-confirmed">
                {rsvpCounts.confirmed}
              </div>
              <p className="text-xs text-muted-foreground">
                {registrations.length > 0 
                  ? `${Math.round((rsvpCounts.confirmed / registrations.length) * 100)}% of registrants`
                  : "0%"}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${rsvpFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setRsvpFilter(rsvpFilter === 'pending' ? 'all' : 'pending')}
            data-testid="card-filter-pending"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending">
                {rsvpCounts.pending}
              </div>
              <p className="text-xs text-muted-foreground">
                {registrations.length > 0 
                  ? `${Math.round((rsvpCounts.pending / registrations.length) * 100)}% awaiting response`
                  : "0%"}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${rsvpFilter === 'declined' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setRsvpFilter(rsvpFilter === 'declined' ? 'all' : 'declined')}
            data-testid="card-filter-declined"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Declined</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-declined">
                {rsvpCounts.declined}
              </div>
              <p className="text-xs text-muted-foreground">
                {registrations.length > 0 
                  ? `${Math.round((rsvpCounts.declined / registrations.length) * 100)}% won't attend`
                  : "0%"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Phone</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-with-phone">
                {registrations.filter(r => r.phone).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {registrations.length > 0 
                  ? `${Math.round((registrations.filter(r => r.phone).length / registrations.length) * 100)}% have phone`
                  : "0%"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card 
            className={`cursor-pointer transition-colors ${attendanceFilter === 'attended' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setAttendanceFilter(attendanceFilter === 'attended' ? 'all' : 'attended')}
            data-testid="card-filter-attended"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">Attended</CardTitle>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div 
                className="text-2xl font-bold text-emerald-600 cursor-pointer" 
                data-testid="text-attended"
                onClick={() => setAttendanceFilter(attendanceFilter === 'attended' ? 'all' : 'attended')}
              >
                {attendanceCounts.attended}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {registrations.length > 0 
                  ? `${Math.round((attendanceCounts.attended / registrations.length) * 100)}% attended`
                  : "0%"}
              </p>
              {!isAuditor && attendanceCounts.attended > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttendedNotSignedUpDialogOpen(true);
                  }}
                  data-testid="button-send-followup-emails"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Follow-Up Email
                </Button>
              )}
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${attendanceFilter === 'not_attended' ? 'ring-2 ring-red-500' : ''}`}
            data-testid="card-filter-not-attended"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle 
                className="text-sm font-medium text-red-600 cursor-pointer"
                onClick={() => setAttendanceFilter(attendanceFilter === 'not_attended' ? 'all' : 'not_attended')}
              >
                No Shows
              </CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div 
                className="text-2xl font-bold text-red-600 cursor-pointer" 
                data-testid="text-not-attended"
                onClick={() => setAttendanceFilter(attendanceFilter === 'not_attended' ? 'all' : 'not_attended')}
              >
                {attendanceCounts.notAttended}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {registrations.length > 0 
                  ? `${Math.round((attendanceCounts.notAttended / registrations.length) * 100)}% no shows`
                  : "0%"}
              </p>
              {!isAuditor && attendanceCounts.notAttended > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoShowEmailDialogOpen(true);
                  }}
                  data-testid="button-send-noshow-emails"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Send Reminder
                </Button>
              )}
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${attendanceFilter === 'unmarked' ? 'ring-2 ring-gray-500' : ''}`}
            onClick={() => setAttendanceFilter(attendanceFilter === 'unmarked' ? 'all' : 'unmarked')}
            data-testid="card-filter-unmarked"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unmarked</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-unmarked">
                {attendanceCounts.unmarked}
              </div>
              <p className="text-xs text-muted-foreground">
                Need attendance marked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Webinar Dates</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-webinar-dates">
                {webinarDates.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Different sessions
              </p>
              {!isAuditor && registrations.filter(r => !r.webinarDate).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setWebinarDateMutation.mutate({ webinarDate: '2026-01-30T12:00:00' })}
                  disabled={setWebinarDateMutation.isPending}
                  data-testid="button-set-webinar-dates"
                >
                  {setWebinarDateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Set Jan 30 for {registrations.filter(r => !r.webinarDate).length}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referral Stats */}
        {referralStats.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Referral Partner Signups</CardTitle>
              <CardDescription>Webinar registrations by referral source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {referralStats.map(stat => (
                  <div key={stat.slug} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`referral-stat-${stat.slug}`}>
                    <div>
                      <div className="font-medium">{stat.name}</div>
                      <div className="text-xs text-muted-foreground">?ref={stat.slug}</div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3">
                      {stat.count}
                    </Badge>
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Direct / No Referral</div>
                    <div className="text-xs text-muted-foreground">No referral link</div>
                  </div>
                  <Badge variant="outline" className="text-lg px-3">
                    {registrations.filter(r => !r.referralSource).length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alert for missing webinar dates */}
        {registrations.filter(r => !r.webinarDate).length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {registrations.filter(r => !r.webinarDate).length} registrations are missing webinar dates
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Set the webinar date so you can track which session they registered for.
                </p>
              </div>
            </div>
            <Button
              variant="default"
              onClick={() => setWebinarDateMutation.mutate({ webinarDate: '2026-01-30T12:00:00' })}
              disabled={setWebinarDateMutation.isPending}
              data-testid="button-set-webinar-dates-alert"
            >
              {setWebinarDateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Set Jan 30, 2026 for All
            </Button>
          </div>
        )}

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Registrations</CardTitle>
                <CardDescription>
                  {filteredRegistrations.length} of {registrations.length} registrations
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={webinarDateFilter} onValueChange={setWebinarDateFilter}>
                  <SelectTrigger className="w-48" data-testid="select-webinar-date-filter">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by webinar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Webinar Dates</SelectItem>
                    <SelectItem value="2026-02-06">Feb 6, 2026</SelectItem>
                    {webinarDates
                      .filter(dateStr => format(new Date(dateStr!), "yyyy-MM-dd") !== "2026-02-06")
                      .map((dateStr) => (
                        <SelectItem 
                          key={dateStr} 
                          value={format(new Date(dateStr!), "yyyy-MM-dd")}
                        >
                          {format(new Date(dateStr!), "MMM d, yyyy")}
                        </SelectItem>
                      ))}
                    <SelectItem value="not_set">Not Set</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={rsvpFilter} onValueChange={(value) => setRsvpFilter(value as RsvpFilter)}>
                  <SelectTrigger className="w-40" data-testid="select-rsvp-filter">
                    <SelectValue placeholder="Filter by RSVP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm || rsvpFilter !== 'all' || webinarDateFilter !== 'all' || attendanceFilter !== 'all'
                  ? "No registrations match your filters" 
                  : "No registrations yet"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('name')}
                      data-testid="header-sort-name"
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortField === 'name' && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Referral</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('webinarDate')}
                      data-testid="header-sort-webinar-date"
                    >
                      <div className="flex items-center gap-1">
                        Webinar Date
                        {sortField === 'webinarDate' && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('rsvpStatus')}
                      data-testid="header-sort-rsvp"
                    >
                      <div className="flex items-center gap-1">
                        RSVP Status
                        {sortField === 'rsvpStatus' && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => toggleSort('registeredAt')}
                      data-testid="header-sort-registered"
                    >
                      <div className="flex items-center gap-1">
                        Registered
                        {sortField === 'registeredAt' && (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    {!isAuditor && <TableHead className="w-16">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => (
                    <TableRow key={reg.id} data-testid={`row-registration-${reg.id}`}>
                      <TableCell className="font-medium">{reg.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${reg.email}`}
                            className="text-primary hover:underline"
                          >
                            {reg.email}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reg.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`tel:${reg.phone}`}
                              className="hover:underline"
                            >
                              {reg.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {reg.referralSource ? (
                          <Badge variant="outline">{reg.referralSource}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {reg.webinarDate 
                          ? format(new Date(reg.webinarDate), "MMM d, yyyy")
                          : <span className="text-muted-foreground italic">Not set</span>}
                      </TableCell>
                      <TableCell>
                        {getAttendanceBadge(reg.attended, reg.id, reg.webinarDate)}
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(reg.subscriptionLevel, reg.id)}
                      </TableCell>
                      <TableCell>
                        {getRsvpBadge(reg.rsvpStatus)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {reg.registeredAt 
                          ? format(new Date(reg.registeredAt), "MMM d, yyyy h:mm a")
                          : "-"}
                      </TableCell>
                      {!isAuditor && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={deleteRegistrationMutation.isPending}
                                data-testid={`button-actions-${reg.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteRegistration(reg.id, reg.name, reg.email, false)}
                                data-testid={`button-delete-${reg.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteRegistration(reg.id, reg.name, reg.email, true)}
                                data-testid={`button-delete-notify-${reg.id}`}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Delete & Notify
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={noShowEmailDialogOpen} onOpenChange={setNoShowEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Reminder to No-Shows</DialogTitle>
            <DialogDescription>
              Send an email to {attendanceCounts.notAttended} registrants who missed the webinar, inviting them to the next one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="next-webinar-date">Next Webinar Date</Label>
              <Input
                id="next-webinar-date"
                placeholder="e.g., Friday, February 14th"
                value={nextWebinarDate}
                onChange={(e) => setNextWebinarDate(e.target.value)}
                data-testid="input-next-webinar-date"
              />
              <p className="text-xs text-muted-foreground">
                This date will appear in the email template. The registration link will automatically point to your webinar landing page.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNoShowEmailDialogOpen(false);
                setNextWebinarDate("");
              }}
              data-testid="button-cancel-noshow-email"
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendNoShowEmailsMutation.mutate({ nextWebinarDate })}
              disabled={!nextWebinarDate.trim() || sendNoShowEmailsMutation.isPending}
              data-testid="button-send-noshow-email-confirm"
            >
              {sendNoShowEmailsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {attendanceCounts.notAttended} No-Shows
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attendedNotSignedUpDialogOpen} onOpenChange={setAttendedNotSignedUpDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Follow-Up: Attendees Not Signed Up</DialogTitle>
            <DialogDescription>
              Send a follow-up email to attendees who haven't created an account yet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(isLoadingPreview || isFetchingPreview) ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading recipients...</span>
              </div>
            ) : attendedNotSignedUpPreview ? (
              <>
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Will receive email:</span>
                    <Badge variant="default" data-testid="badge-recipient-count">
                      {attendedNotSignedUpPreview.recipients.length}
                    </Badge>
                  </div>
                  {attendedNotSignedUpPreview.recipients.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {attendedNotSignedUpPreview.recipients.map((r, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{r.name}</span>
                          <span className="opacity-60">({r.email})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No attendees need follow-up emails.</p>
                  )}
                </div>
                
                {attendedNotSignedUpPreview.alreadySignedUp.length > 0 && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">Already signed up (will skip):</span>
                      <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-400">
                        {attendedNotSignedUpPreview.alreadySignedUp.length}
                      </Badge>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {attendedNotSignedUpPreview.alreadySignedUp.map((r, idx) => (
                        <div key={idx} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{r.name}</span>
                          <span className="opacity-60">({r.email})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
            
            <div className="space-y-2">
              <Label htmlFor="followup-promo-code">Promo Code</Label>
              <Input
                id="followup-promo-code"
                placeholder="e.g., WEBINAR2026"
                value={followUpPromoCode}
                onChange={(e) => setFollowUpPromoCode(e.target.value)}
                data-testid="input-followup-promo-code"
              />
              <p className="text-xs text-muted-foreground">
                This promo code will be prominently displayed in the email.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAttendedNotSignedUpDialogOpen(false)}
              data-testid="button-cancel-followup-email"
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendAttendedNotSignedUpMutation.mutate({ promoCode: followUpPromoCode })}
              disabled={!followUpPromoCode.trim() || sendAttendedNotSignedUpMutation.isPending || !attendedNotSignedUpPreview?.recipients.length}
              data-testid="button-send-followup-email-confirm"
            >
              {sendAttendedNotSignedUpMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {attendedNotSignedUpPreview?.recipients.length || 0}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
