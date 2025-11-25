import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Archive, AlertCircle, Search, Mail, Copy, CheckCircle, Eye } from "lucide-react";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Lender } from "@shared/schema";

type LenderWithReferrals = Lender & { referralCount: number, loanProductCount: number };

export default function LenderManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [lenderToDelete, setLenderToDelete] = useState<LenderWithReferrals | null>(null);
  const [lenderToArchive, setLenderToArchive] = useState<LenderWithReferrals | null>(null);
  const [companyNameSearch, setCompanyNameSearch] = useState("");
  const [contactNameSearch, setContactNameSearch] = useState("");
  const [newLenderEmail, setNewLenderEmail] = useState("");
  const [newLenderCompany, setNewLenderCompany] = useState("");
  const [newLenderReferralAmount, setNewLenderReferralAmount] = useState("");
  const [newLenderReferralType, setNewLenderReferralType] = useState("$");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: lenders, isLoading } = useQuery<LenderWithReferrals[]>({
    queryKey: ["/api/admin/lenders"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      const response = await fetch(`/api/admin/lenders/${lenderId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete lender");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lenders"] });
      toast({
        title: "Lender Deleted",
        description: "The lender has been successfully deleted.",
      });
      setLenderToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lender",
        variant: "destructive",
      });
      setLenderToDelete(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      const response = await fetch(`/api/admin/lenders/${lenderId}/archive`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to archive lender");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lenders"] });
      toast({
        title: "Lender Archived",
        description: "The lender has been successfully archived.",
      });
      setLenderToArchive(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive lender",
        variant: "destructive",
      });
      setLenderToArchive(null);
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      const response = await fetch(`/api/admin/lenders/${lenderId}/resend-invite`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resend invite");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invite Resent",
        description: "The lender invitation has been resent successfully.",
      });
      if (data.inviteUrl) {
        setInviteLink(data.inviteUrl);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invite",
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, companyName, referralAmount, referralType }: { email: string; companyName: string; referralAmount: number; referralType: string }) => {
      const response = await fetch("/api/lenders/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: email, companyName, referralAmount, referralType }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invite");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lenders"] });
      toast({
        title: "Invite Sent",
        description: "Lender invitation has been sent successfully.",
      });
      if (data.inviteUrl) {
        setInviteLink(data.inviteUrl);
      }
      setNewLenderEmail("");
      setNewLenderCompany("");
      setNewLenderReferralAmount("");
      setNewLenderReferralType("$");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLenderEmail || !newLenderCompany || !newLenderReferralAmount) {
      toast({
        title: "Missing Information",
        description: "Please provide email, company name, and referral amount.",
        variant: "destructive",
      });
      return;
    }
    const referralAmount = parseFloat(newLenderReferralAmount);
    if (isNaN(referralAmount) || referralAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Referral amount must be a positive number.",
        variant: "destructive",
      });
      return;
    }
    inviteMutation.mutate({ email: newLenderEmail, companyName: newLenderCompany, referralAmount, referralType: newLenderReferralType });
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: "Link Copied",
        description: "Invite link copied to clipboard.",
      });
    }
  };

  const handleDelete = (lender: LenderWithReferrals) => {
    if (lender.referralCount > 0) {
      toast({
        title: "Cannot Delete",
        description: "This lender has referrals and must be archived instead.",
        variant: "destructive",
      });
      return;
    }
    setLenderToDelete(lender);
  };

  const handleArchive = (lender: LenderWithReferrals) => {
    setLenderToArchive(lender);
  };

  const filterLenders = (lendersList: LenderWithReferrals[]) => {
    return lendersList.filter(lender => {
      const companyMatch = !companyNameSearch || 
        lender.companyName.toLowerCase().includes(companyNameSearch.toLowerCase());
      const contactMatch = !contactNameSearch || 
        lender.contactName.toLowerCase().includes(contactNameSearch.toLowerCase());
      
      return companyMatch && contactMatch;
    });
  };

  const activeLenders = filterLenders(lenders?.filter(l => !l.archived) || []);
  const archivedLenders = filterLenders(lenders?.filter(l => l.archived) || []);

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
                <h1 className="text-3xl font-bold text-foreground">Lender Management</h1>
                <p className="text-muted-foreground mt-2">
                  Manage lender accounts and track referral activity
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Lenders
                </CardTitle>
                <CardDescription>
                  Filter lenders by company name or contact name
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="company-search" className="text-sm font-medium mb-2 block">
                      Company Name
                    </label>
                    <Input
                      id="company-search"
                      placeholder="Search by company name..."
                      value={companyNameSearch}
                      onChange={(e) => setCompanyNameSearch(e.target.value)}
                      data-testid="input-company-search"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-search" className="text-sm font-medium mb-2 block">
                      Contact Name
                    </label>
                    <Input
                      id="contact-search"
                      placeholder="Search by contact name..."
                      value={contactNameSearch}
                      onChange={(e) => setContactNameSearch(e.target.value)}
                      data-testid="input-contact-search"
                    />
                  </div>
                </div>
                {(companyNameSearch || contactNameSearch) && (
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompanyNameSearch("");
                        setContactNameSearch("");
                      }}
                      data-testid="button-clear-search"
                    >
                      Clear Search
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Found {activeLenders.length + archivedLenders.length} lender{activeLenders.length + archivedLenders.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Add Lender - Send Link
                </CardTitle>
                <CardDescription>
                  Send an invitation email with auto-generated password to a new lender
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="new-lender-email" className="text-sm font-medium mb-2 block">
                        Lender Email *
                      </label>
                      <Input
                        id="new-lender-email"
                        type="email"
                        placeholder="lender@example.com"
                        value={newLenderEmail}
                        onChange={(e) => setNewLenderEmail(e.target.value)}
                        required
                        data-testid="input-new-lender-email"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-lender-company" className="text-sm font-medium mb-2 block">
                        Company Name *
                      </label>
                      <Input
                        id="new-lender-company"
                        placeholder="Company Name"
                        value={newLenderCompany}
                        onChange={(e) => setNewLenderCompany(e.target.value)}
                        required
                        data-testid="input-new-lender-company"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Referral Fee Configuration *</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Set by admin - visible to investors but not editable by lender
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="new-lender-referral-amount" className="text-sm font-medium mb-2 block">
                          Referral Amount *
                        </label>
                        <Input
                          id="new-lender-referral-amount"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 500 or 2.5"
                          value={newLenderReferralAmount}
                          onChange={(e) => setNewLenderReferralAmount(e.target.value)}
                          required
                          data-testid="input-new-lender-referral-amount"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-lender-referral-type" className="text-sm font-medium mb-2 block">
                          Fee Type *
                        </label>
                        <select
                          id="new-lender-referral-type"
                          value={newLenderReferralType}
                          onChange={(e) => setNewLenderReferralType(e.target.value)}
                          className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground"
                          data-testid="select-new-lender-referral-type"
                        >
                          <option value="$">Dollars ($)</option>
                          <option value="%">Percentage (%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={inviteMutation.isPending}
                    data-testid="button-send-invite"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {inviteMutation.isPending ? "Sending..." : "Send Invite Link"}
                  </Button>
                </form>

                {inviteLink && (
                  <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-success mb-2">Invite Sent Successfully!</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          The invitation email has been sent with an auto-generated password. 
                          Copy the link below to share manually if needed:
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            value={inviteLink}
                            readOnly
                            className="font-mono text-sm"
                            data-testid="input-invite-link"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyLink}
                            data-testid="button-copy-link"
                          >
                            {linkCopied ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading lenders...</p>
            </div>
          ) : (
            <>
              <Card className="mb-8" data-testid="card-active-lenders">
                <CardHeader>
                  <CardTitle>Active Lenders ({activeLenders.length})</CardTitle>
                  <CardDescription>
                    Lenders currently active on the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeLenders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No active lenders found
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activeLenders.map((lender) => (
                        <div
                          key={lender.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                          data-testid={`lender-${lender.id}`}
                          onClick={() => setLocation(`/admin/lenders/${lender.id}`)}
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                              {lender.companyName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {lender.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Contact: {lender.contactName}
                              {lender.phone && ` • ${lender.phone}`}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                {lender.referralCount} referral{lender.referralCount !== 1 ? 's' : ''}
                              </span>
                              <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded">
                                {lender.loanProductCount} loan product{lender.loanProductCount !== 1 ? 's' : ''}
                              </span>
                              {lender.inviteAccepted ? (
                                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded">
                                  Active
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/admin/lenders/${lender.id}`)}
                              data-testid={`button-view-${lender.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {!lender.inviteAccepted && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInviteMutation.mutate(lender.id)}
                                disabled={resendInviteMutation.isPending}
                                data-testid={`button-resend-${lender.id}`}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                {resendInviteMutation.isPending ? "Sending..." : "Resend Link"}
                              </Button>
                            )}
                            {lender.referralCount > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleArchive(lender)}
                                data-testid={`button-archive-${lender.id}`}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(lender)}
                                data-testid={`button-delete-${lender.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {archivedLenders.length > 0 && (
                <Card data-testid="card-archived-lenders">
                  <CardHeader>
                    <CardTitle>Archived Lenders ({archivedLenders.length})</CardTitle>
                    <CardDescription>
                      Lenders that have been archived
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {archivedLenders.map((lender) => (
                        <div
                          key={lender.id}
                          className="flex items-center justify-between p-4 border rounded-lg opacity-60 hover-elevate cursor-pointer"
                          data-testid={`lender-archived-${lender.id}`}
                          onClick={() => setLocation(`/admin/lenders/${lender.id}`)}
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                              {lender.companyName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {lender.email}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                                {lender.referralCount} referral{lender.referralCount !== 1 ? 's' : ''}
                              </span>
                              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                                Archived
                              </span>
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/admin/lenders/${lender.id}`)}
                              data-testid={`button-view-archived-${lender.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!lenderToDelete} onOpenChange={() => setLenderToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lender</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{lenderToDelete?.companyName}</strong>?
              This action cannot be undone. All associated data including questionnaires
              and loan products will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => lenderToDelete && deleteMutation.mutate(lenderToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!lenderToArchive} onOpenChange={() => setLenderToArchive(null)}>
        <AlertDialogContent data-testid="dialog-archive-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Lender</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{lenderToArchive?.companyName}</strong>?
              This lender will no longer be active but their data will be preserved.
              Archived lenders cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-archive">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => lenderToArchive && archiveMutation.mutate(lenderToArchive.id)}
              data-testid="button-confirm-archive"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
