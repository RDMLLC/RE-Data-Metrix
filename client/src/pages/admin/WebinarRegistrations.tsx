import { useState } from "react";
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
} from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');
  const [sortField, setSortField] = useState<SortField>('webinarDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();

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

  const attendanceCounts = {
    attended: registrations.filter(r => r.attended === true).length,
    notAttended: registrations.filter(r => r.attended === false).length,
    unmarked: registrations.filter(r => r.attended === null).length,
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
      
      return matchesSearch && matchesRsvp && matchesAttendance;
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

  const getAttendanceBadge = (attended: boolean | null, id: string) => {
    if (attended === true) {
      return (
        <Badge 
          variant="default" 
          className="bg-emerald-600 cursor-pointer"
          onClick={() => toggleAttendanceMutation.mutate({ id, attended: false })}
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
          className="cursor-pointer"
          onClick={() => toggleAttendanceMutation.mutate({ id, attended: true })}
          data-testid={`badge-not-attended-${id}`}
        >
          <UserX className="h-3 w-3 mr-1" />
          No Show
        </Badge>
      );
    }
    return (
      <Badge 
        variant="outline"
        className="cursor-pointer"
        onClick={() => toggleAttendanceMutation.mutate({ id, attended: true })}
        data-testid={`badge-unmarked-${id}`}
      >
        <HelpCircle className="h-3 w-3 mr-1" />
        Mark Attendance
      </Badge>
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
              onClick={handleExportCSV}
              disabled={filteredRegistrations.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

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
              <div className="text-2xl font-bold text-emerald-600" data-testid="text-attended">
                {attendanceCounts.attended}
              </div>
              <p className="text-xs text-muted-foreground">
                {registrations.length > 0 
                  ? `${Math.round((attendanceCounts.attended / registrations.length) * 100)}% attended`
                  : "0%"}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${attendanceFilter === 'not_attended' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setAttendanceFilter(attendanceFilter === 'not_attended' ? 'all' : 'not_attended')}
            data-testid="card-filter-not-attended"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-600">No Shows</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-not-attended">
                {attendanceCounts.notAttended}
              </div>
              <p className="text-xs text-muted-foreground">
                {registrations.length > 0 
                  ? `${Math.round((attendanceCounts.notAttended / registrations.length) * 100)}% no shows`
                  : "0%"}
              </p>
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
              <div className="flex items-center gap-3">
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
                {searchTerm || rsvpFilter !== 'all' 
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
                    <TableHead className="w-16">Actions</TableHead>
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
                        {getAttendanceBadge(reg.attended, reg.id)}
                      </TableCell>
                      <TableCell>
                        {getRsvpBadge(reg.rsvpStatus)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {reg.registeredAt 
                          ? format(new Date(reg.registeredAt), "MMM d, yyyy h:mm a")
                          : "-"}
                      </TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
