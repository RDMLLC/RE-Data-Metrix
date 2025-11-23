import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Archive, AlertCircle } from "lucide-react";
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

type LenderWithReferrals = Lender & { referralCount: number };

export default function LenderManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [lenderToDelete, setLenderToDelete] = useState<LenderWithReferrals | null>(null);
  const [lenderToArchive, setLenderToArchive] = useState<LenderWithReferrals | null>(null);

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

  const activeLenders = lenders?.filter(l => !l.archived) || [];
  const archivedLenders = lenders?.filter(l => l.archived) || [];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => setLocation("/admin-dashboard")}
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
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`lender-${lender.id}`}
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
                          <div className="flex gap-2">
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
                          className="flex items-center justify-between p-4 border rounded-lg opacity-60"
                          data-testid={`lender-archived-${lender.id}`}
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
