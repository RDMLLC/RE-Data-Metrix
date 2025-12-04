import { useState } from "react";
import { Link, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { 
  Pencil, Check, X, CreditCard, Crown, AlertCircle, 
  Loader2, ExternalLink, Calendar, Shield, FileText, Scale 
} from "lucide-react";
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

export default function Profile() {
  const { user, logout, refetchUser, isSubscriber } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return await response.json();
    },
    onSuccess: (data: { success?: boolean; message?: string }) => {
      if (data.success) {
        toast({
          title: "Subscription Canceled",
          description: data.message || "Your subscription has been canceled. You'll retain access until the end of your billing period.",
        });
        refetchUser();
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
      setShowCancelDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
      setShowCancelDialog(false);
    },
  });

  const manageBillingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/manage-billing");
      return await response.json();
    },
    onSuccess: (data: { redirectUrl?: string; message?: string; integrationPending?: boolean }) => {
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.integrationPending) {
        toast({
          title: "Billing Portal Setup in Progress",
          description: data.message || "Our billing portal is being configured. Please check back soon.",
        });
      } else {
        toast({
          title: "Manage Billing",
          description: data.message || "Billing portal is being set up.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  const getSubscriptionBadge = () => {
    switch (user?.subscriptionStatus) {
      case 'active':
        return <Badge className="bg-success/10 text-success border-success/20">Active Member</Badge>;
      case 'comped':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Complimentary</Badge>;
      case 'referral_trial':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Referral Trial</Badge>;
      default:
        return <Badge variant="secondary">Free Account</Badge>;
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const startEditing = () => {
    setEditForm({
      username: user?.username || "",
      fullName: user?.profile?.fullName || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({ username: "", fullName: "" });
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      await apiRequest("PATCH", "/api/user/profile", {
        username: editForm.username,
        fullName: editForm.fullName,
      });
      
      await refetchUser();
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">My Profile</h1>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>

          <div className="grid gap-6">
            <Card data-testid="card-profile-info">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startEditing}
                    data-testid="button-edit-profile"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={saveChanges}
                      disabled={isSaving}
                      data-testid="button-save-profile"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelEditing}
                      disabled={isSaving}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        data-testid="input-username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        placeholder="Enter your full name"
                        data-testid="input-fullname"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email (cannot be changed)</Label>
                      <p className="text-sm mt-1 break-all" data-testid="text-email-readonly">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Username</p>
                      <p className="text-base sm:text-lg break-words" data-testid="text-username">
                        {user.username}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-base sm:text-lg break-all" data-testid="text-email">
                        {user.email}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                      <p className="text-base sm:text-lg break-words" data-testid="text-fullname">
                        {user.profile?.fullName || "Not set"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Subscription Status</p>
                      <p className="text-base sm:text-lg capitalize" data-testid="text-subscription-status">
                        {(user.subscriptionStatus || "inactive").replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-subscription">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-accent" />
                      Subscription
                    </CardTitle>
                    <CardDescription>Manage your membership and billing</CardDescription>
                  </div>
                  {getSubscriptionBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isSubscriber ? (
                  <>
                    <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-success mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">
                            {user.subscriptionStatus === 'active' && 'Full Membership Active'}
                            {user.subscriptionStatus === 'comped' && 'Complimentary Access'}
                            {user.subscriptionStatus === 'referral_trial' && 'Referral Trial Active'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            You have full access to all RE Data Metrix features.
                          </p>
                        </div>
                      </div>
                    </div>

                    {user.subscriptionStatus === 'active' && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">Plan</p>
                              <p className="text-sm text-muted-foreground">Full Membership</p>
                            </div>
                            <p className="font-semibold text-lg">$49/month</p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                              variant="outline"
                              onClick={() => manageBillingMutation.mutate()}
                              disabled={manageBillingMutation.isPending}
                              className="flex-1"
                              data-testid="button-manage-billing"
                            >
                              {manageBillingMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CreditCard className="h-4 w-4 mr-2" />
                              )}
                              Manage Billing
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setShowCancelDialog(true)}
                              className="text-muted-foreground hover:text-destructive"
                              data-testid="button-cancel-subscription"
                            >
                              Cancel Subscription
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {(user.subscriptionStatus === 'comped' || user.subscriptionStatus === 'referral_trial') && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {user.subscriptionStatus === 'comped' 
                                ? 'Your complimentary access is managed by an administrator.'
                                : 'Your referral trial will expire soon. Upgrade to keep full access.'}
                            </p>
                            {user.subscriptionStatus === 'referral_trial' && (
                              <Link href="/checkout">
                                <Button size="sm" className="mt-3" data-testid="button-upgrade-trial">
                                  Upgrade Now
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-muted-foreground mb-4">
                        Upgrade to Full Membership to unlock all features including Deal Analysis, 
                        Rental Analysis, Lender Comparisons, and more.
                      </p>
                      <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-success" />
                          Complete deal analysis with ROI calculations
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-success" />
                          Side-by-side lender comparisons
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-success" />
                          Save unlimited deals and lenders
                        </li>
                      </ul>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href="/checkout" className="flex-1">
                        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="button-upgrade-now">
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade Now - $49/month
                        </Button>
                      </Link>
                      <Link href="/pricing">
                        <Button variant="outline" data-testid="button-view-pricing">
                          View Plans
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-referral-code">
              <CardHeader>
                <CardTitle>Your Referral Code</CardTitle>
                <CardDescription>
                  Share this code to give friends 1 month free trial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <code 
                    className="text-xl sm:text-2xl font-bold bg-muted px-4 py-2 rounded-md break-all"
                    data-testid="text-referral-code"
                  >
                    {user.referralCode || "N/A"}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (user.referralCode) {
                        navigator.clipboard.writeText(user.referralCode);
                        toast({
                          title: "Copied!",
                          description: "Referral code copied to clipboard",
                        });
                      }
                    }}
                    data-testid="button-copy-referral"
                    disabled={!user.referralCode}
                  >
                    Copy Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-legal-documents">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Legal Documents</CardTitle>
                    <CardDescription>
                      Your agreement acceptance and policy documents
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.termsAcceptedAt ? (
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Agreements Accepted</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          You accepted the User Agreement (v{user.termsVersion || "1.0"}) and Privacy Policy (v{user.privacyVersion || "1.0"}) on{" "}
                          <span className="font-medium" data-testid="text-terms-accepted-date">
                            {new Date(user.termsAcceptedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          No agreement acceptance record found. If you registered before our terms tracking was implemented, 
                          your continued use of the platform indicates acceptance of our terms.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="grid gap-3">
                  <p className="text-sm font-medium text-muted-foreground">View Our Policies</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/terms" target="_blank">
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto justify-start"
                        data-testid="button-view-terms"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        User Agreement
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/privacy" target="_blank">
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto justify-start"
                        data-testid="button-view-privacy"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Privacy Policy
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/deal-analysis")}
                  data-testid="button-new-analysis"
                >
                  Start New Deal Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You'll retain access 
              until the end of your current billing period, but won't be charged again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubscriptionMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                "Yes, Cancel"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
