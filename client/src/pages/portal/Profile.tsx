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
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Pencil, Check, X, CreditCard, Crown, AlertCircle, 
  Loader2, ExternalLink, Calendar, Shield, FileText, Scale, Home, Phone,
  ArrowDownCircle, XCircle, AlertTriangle, ImageIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Profile() {
  const { user, logout, refetchUser, isSubscriber } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelStep, setCancelStep] = useState<'closed' | 'choice' | 'confirm-cancel'>('closed');
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
  });
  
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
  });

  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingForm, setBrandingForm] = useState({
    reportLogoUrl: "",
    reportCompanyName: "",
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (choice: 'downgrade' | 'cancel') => {
      const response = await apiRequest("POST", "/api/subscription/cancel", { choice });
      return await response.json();
    },
    onSuccess: (data: { success?: boolean; message?: string }) => {
      if (data.success) {
        toast({
          title: "Subscription Cancelled",
          description: data.message || "Your subscription has been cancelled.",
        });
        refetchUser();
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
      setCancelStep('closed');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
      setCancelStep('closed');
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

  const { data: subscriptionData } = useQuery<{
    status: string;
    isActive: boolean;
    subscription?: {
      cancelAtPeriodEnd?: boolean;
      currentPeriodEnd?: string;
    } | null;
  }>({
    queryKey: ["/api/subscription/status"],
    enabled: user?.subscriptionStatus === 'cancelling',
  });

  const periodEndDate = subscriptionData?.subscription?.currentPeriodEnd
    ? new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  const getSubscriptionBadge = () => {
    switch (user?.subscriptionStatus) {
      case 'active':
        if (user?.stripeSubscriptionId) {
          if (user?.subscriptionPlan === 'annual') {
            return <Badge className="bg-green-500/10 text-green-600 border-green-200">Annual Member</Badge>;
          }
          return <Badge className="bg-green-500/10 text-green-600 border-green-200">Monthly Member</Badge>;
        }
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">Free Account</Badge>;
      case 'cancelling':
        if (user?.subscriptionPlan === 'annual') {
          return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Annual Member (Cancelling)</Badge>;
        }
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Monthly Member (Cancelling)</Badge>;
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

  const startEditingAddress = () => {
    setAddressForm({
      street: user?.profile?.street || "",
      city: user?.profile?.city || "",
      state: user?.profile?.state || "",
      zipCode: user?.profile?.zipCode || "",
      phone: user?.profile?.phone || "",
    });
    setIsEditingAddress(true);
  };

  const cancelEditingAddress = () => {
    setIsEditingAddress(false);
    setAddressForm({ street: "", city: "", state: "", zipCode: "", phone: "" });
  };

  const saveAddressChanges = async () => {
    setIsSavingAddress(true);
    try {
      await apiRequest("PATCH", "/api/user/profile/address", addressForm);
      
      await refetchUser();
      setIsEditingAddress(false);
      toast({
        title: "Address Saved",
        description: "Your home address has been saved and will be auto-filled on future transactional funding applications.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive",
      });
    } finally {
      setIsSavingAddress(false);
    }
  };

  const startEditingBranding = () => {
    setBrandingForm({
      reportLogoUrl: user?.reportLogoUrl || "",
      reportCompanyName: user?.reportCompanyName || "",
    });
    setIsEditingBranding(true);
  };

  const cancelEditingBranding = () => {
    setIsEditingBranding(false);
    setBrandingForm({ reportLogoUrl: "", reportCompanyName: "" });
  };

  const saveBrandingChanges = async () => {
    setIsSavingBranding(true);
    try {
      await apiRequest("PATCH", "/api/user/report-branding", {
        reportLogoUrl: brandingForm.reportLogoUrl.trim() || null,
        reportCompanyName: brandingForm.reportCompanyName.trim() || null,
      });
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditingBranding(false);
      toast({
        title: "Branding Saved",
        description: "Your report branding has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save branding",
        variant: "destructive",
      });
    } finally {
      setIsSavingBranding(false);
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
                        {(user.subscriptionStatus || "free").replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-home-address">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Home Address
                  </CardTitle>
                  <CardDescription>
                    Save your home address to auto-fill transactional funding applications
                  </CardDescription>
                </div>
                {!isEditingAddress ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startEditingAddress}
                    data-testid="button-edit-address"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={saveAddressChanges}
                      disabled={isSavingAddress}
                      data-testid="button-save-address"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelEditingAddress}
                      disabled={isSavingAddress}
                      data-testid="button-cancel-address"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingAddress ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={addressForm.street}
                        onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                        placeholder="123 Main Street"
                        data-testid="input-street"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="Atlanta"
                          data-testid="input-city"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          placeholder="GA"
                          maxLength={2}
                          data-testid="input-state"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          value={addressForm.zipCode}
                          onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                          placeholder="30301"
                          data-testid="input-zipcode"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        data-testid="input-phone"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user.profile?.street || user.profile?.city || user.profile?.state || user.profile?.zipCode ? (
                      <>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Address</p>
                          <p className="text-base" data-testid="text-full-address">
                            {user.profile?.street || ""}
                            {user.profile?.street && (user.profile?.city || user.profile?.state || user.profile?.zipCode) ? ", " : ""}
                            {user.profile?.city || ""}{user.profile?.city && user.profile?.state ? ", " : " "}
                            {user.profile?.state || ""} {user.profile?.zipCode || ""}
                          </p>
                        </div>
                        {user.profile?.phone && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Phone</p>
                            <p className="text-base flex items-center gap-2" data-testid="text-phone">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              {user.profile.phone}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          This address will be pre-filled on transactional funding applications.
                        </p>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">No home address saved</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click the edit button to add your address for faster form submissions.
                        </p>
                      </div>
                    )}
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
                            {user.subscriptionStatus === 'cancelling' && 'Full Membership Active'}
                            {user.subscriptionStatus === 'comped' && 'Complimentary Access'}
                            {user.subscriptionStatus === 'referral_trial' && 'Referral Trial Active'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            You have full access to all RE Data Metrix features.
                          </p>
                        </div>
                      </div>
                    </div>

                    {user.subscriptionStatus === 'cancelling' && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Cancellation Scheduled</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Your subscription is scheduled to end at the close of your current billing period.
                              {periodEndDate && (
                                <> Your access will remain active until <span className="font-medium text-foreground">{periodEndDate}</span>.</>
                              )}
                              {!periodEndDate && ' You have full access until your billing period ends.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(user.subscriptionStatus === 'active' || user.subscriptionStatus === 'cancelling') && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">Plan</p>
                              <p className="text-sm text-muted-foreground">Full Membership</p>
                            </div>
                            <p className="font-semibold text-lg">$25/month</p>
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
                            {user.subscriptionStatus === 'active' && (
                              <Button
                                variant="ghost"
                                onClick={() => setCancelStep('choice')}
                                className="text-muted-foreground hover:text-destructive"
                                data-testid="button-cancel-subscription"
                              >
                                Cancel Subscription
                              </Button>
                            )}
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
                          Upgrade Now - $25/month
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

            {isSubscriber && (
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
            )}

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

            {/* Report Branding Card */}
            {isSubscriber && <Card data-testid="card-report-branding">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Report Branding</CardTitle>
                  <CardDescription>
                    Add your logo and company name to PDF deal analysis reports
                  </CardDescription>
                </div>
                {!isEditingBranding ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startEditingBranding}
                    data-testid="button-edit-branding"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={saveBrandingChanges}
                      disabled={isSavingBranding}
                      data-testid="button-save-branding"
                    >
                      {isSavingBranding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelEditingBranding}
                      disabled={isSavingBranding}
                      data-testid="button-cancel-branding"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingBranding ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reportCompanyName">Company Name</Label>
                      <Input
                        id="reportCompanyName"
                        value={brandingForm.reportCompanyName}
                        onChange={(e) => setBrandingForm({ ...brandingForm, reportCompanyName: e.target.value })}
                        placeholder="Your Company LLC"
                        maxLength={100}
                        data-testid="input-report-company-name"
                      />
                    </div>
                    <div>
                      <Label>Logo</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="logoFileUpload"
                            className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm font-medium hover-elevate"
                            data-testid="button-upload-logo"
                          >
                            <ImageIcon className="h-4 w-4" />
                            Upload Logo
                          </label>
                          <input
                            id="logoFileUpload"
                            type="file"
                            accept="image/png,image/jpeg"
                            className="sr-only"
                            data-testid="input-logo-file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (!['image/png', 'image/jpeg'].includes(file.type)) {
                                toast({ title: "Invalid file type", description: "Only PNG and JPG files are supported.", variant: "destructive" });
                                return;
                              }
                              if (file.size > 2 * 1024 * 1024) {
                                toast({ title: "File too large", description: "Logo must be under 2MB.", variant: "destructive" });
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const dataUrl = ev.target?.result as string;
                                setBrandingForm(prev => ({ ...prev, reportLogoUrl: dataUrl }));
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          {brandingForm.reportLogoUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBrandingForm(prev => ({ ...prev, reportLogoUrl: "" }))}
                              data-testid="button-remove-logo"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">PNG or JPG only — max 2MB. Or paste an HTTPS image URL below.</p>
                        <Input
                          value={brandingForm.reportLogoUrl.startsWith('data:') ? '' : brandingForm.reportLogoUrl}
                          onChange={(e) => setBrandingForm({ ...brandingForm, reportLogoUrl: e.target.value })}
                          placeholder="https://yoursite.com/logo.png"
                          data-testid="input-report-logo-url"
                        />
                      </div>
                    </div>
                    {brandingForm.reportLogoUrl && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                        <div className="flex items-center gap-3 border rounded-md p-3 bg-muted/30">
                          <img
                            src={brandingForm.reportLogoUrl}
                            alt="Logo preview"
                            className="h-10 w-auto object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          {brandingForm.reportCompanyName && (
                            <span className="font-semibold text-sm">{brandingForm.reportCompanyName}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user.reportLogoUrl || user.reportCompanyName ? (
                      <div className="flex items-center gap-3">
                        {user.reportLogoUrl && (
                          <img
                            src={user.reportLogoUrl}
                            alt="Report logo"
                            className="h-10 w-auto object-contain"
                          />
                        )}
                        <div>
                          {user.reportCompanyName && (
                            <p className="font-semibold text-sm" data-testid="text-report-company-name">{user.reportCompanyName}</p>
                          )}
                          {user.reportLogoUrl && (
                            <p className="text-xs text-muted-foreground" data-testid="text-report-logo-url">
                              {user.reportLogoUrl.startsWith('data:') ? 'Uploaded logo' : user.reportLogoUrl}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
                        <ImageIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          No branding set. Click the edit icon to add your company logo and name to PDF reports.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>}

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

      {/* Step 1: Choice dialog */}
      <Dialog open={cancelStep === 'choice'} onOpenChange={(open) => { if (!open) setCancelStep('closed'); }}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-cancel-choice">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Choose how you'd like to proceed with your cancellation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <button
              className="w-full text-left rounded-md border p-4 hover-elevate active-elevate-2 transition-colors cursor-pointer"
              onClick={() => cancelSubscriptionMutation.mutate('downgrade')}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-choice-downgrade"
            >
              <div className="flex items-start gap-3">
                <ArrowDownCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Downgrade to Free</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Keep your account on the free plan. Your saved deals and lenders will be held for you — available again the moment you resubscribe.
                  </p>
                </div>
              </div>
            </button>

            <button
              className="w-full text-left rounded-md border border-destructive/30 p-4 hover-elevate active-elevate-2 transition-colors cursor-pointer"
              onClick={() => setCancelStep('confirm-cancel')}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-choice-cancel-account"
            >
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Cancel My Account Completely</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Close your account. Your saved deals and lenders will be permanently deleted in 30 days.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setCancelStep('closed')} data-testid="button-keep-subscription">
              Keep My Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Full cancel confirmation */}
      <Dialog open={cancelStep === 'confirm-cancel'} onOpenChange={(open) => { if (!open) setCancelStep('closed'); }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-cancel-confirm">
          <DialogHeader>
            <DialogTitle>Confirm Account Cancellation</DialogTitle>
          </DialogHeader>

          <div className="rounded-md bg-destructive/5 border border-destructive/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <p className="font-medium text-foreground text-sm">Your data will be permanently deleted</p>
              <p className="text-sm text-muted-foreground">
                All saved deals, deal analyses, and saved lenders will be permanently removed from our systems 30 days from today. This cannot be undone.
              </p>
              <p className="text-sm text-muted-foreground">
                If you change your mind before then, resubscribing will restore everything.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setCancelStep('choice')}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-back-to-choice"
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelSubscriptionMutation.mutate('cancel')}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-confirm-cancel-account"
            >
              {cancelSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Click to Cancel My Account"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
