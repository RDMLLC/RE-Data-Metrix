import { type MouseEvent, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calculator, 
  Building2, 
  Wrench, 
  TrendingUp,
  Copy,
  Gift,
  Search,
  HardHat,
  Lightbulb,
  ArrowRight,
  Bug,
  Sparkles,
  CheckCircle,
  Loader2,
  MessageSquarePlus,
  X,
  Zap
} from "lucide-react";
import { Link } from "wouter";

interface MemberStats {
  totalDeals: number;
  draftDeals: number;
  finalDeals: number;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  savedLenders: number;
}

type SubmissionType = 'issue' | 'feature';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  type: SubmissionType;
  userEmail?: string;
}

function FeedbackModal({ open, onClose, type, userEmail }: FeedbackModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user-submissions", {
        type,
        title: title.trim(),
        description: description.trim(),
        email: userEmail,
      });
      return await res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Unable to submit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setSubmitted(false);
    onClose();
  };

  const isIssue = type === 'issue';
  const modalTitle = isIssue ? "Report an Issue" : "Suggest a Feature";
  const titlePlaceholder = isIssue
    ? "Brief description of the issue"
    : "Name your feature idea";
  const descPlaceholder = isIssue
    ? "What happened? What did you expect to happen? Steps to reproduce if known."
    : "Describe your idea and how it would help you.";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-feedback-modal">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">{modalTitle}</DialogTitle>
          <DialogDescription>
            {isIssue
              ? "Tell us what went wrong and we'll look into it."
              : "Share your idea and help shape the future of the platform."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center" data-testid="div-submission-success">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-foreground">Thank you!</p>
            <p className="text-sm text-muted-foreground">
              {isIssue
                ? "We've received your report and will look into it."
                : "Your idea has been submitted. We appreciate your input!"}
            </p>
            <Button onClick={handleClose} data-testid="button-close-success">Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="submission-title">
                {isIssue ? "Issue Summary" : "Feature Title"}
              </Label>
              <Input
                id="submission-title"
                placeholder={titlePlaceholder}
                value={title}
                onChange={e => setTitle(e.target.value)}
                data-testid="input-submission-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="submission-description">Details</Label>
              <Textarea
                id="submission-description"
                placeholder={descPlaceholder}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                data-testid="input-submission-description"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} data-testid="button-cancel-modal">
                Cancel
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!title.trim() || !description.trim() || submitMutation.isPending}
                data-testid="button-submit-feedback"
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const BANNER_KEY = "dashboard_upgrade_banner_dismissed";

export default function MemberDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [modalType, setModalType] = useState<SubmissionType | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return sessionStorage.getItem(BANNER_KEY) === "1"; } catch { return false; }
  });

  const dismissBanner = () => {
    try { sessionStorage.setItem(BANNER_KEY, "1"); } catch {}
    setBannerDismissed(true);
  };

  const isPaidSubscriber = ['active', 'cancelling', 'referral_trial', 'comped'].includes(user?.subscriptionStatus || '');

  const { data: stats, isLoading: statsLoading } = useQuery<MemberStats>({
    queryKey: ["/api/member/stats"],
  });

  const copyReferralCode = (e: MouseEvent) => {
    e.stopPropagation();
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const getSubscriptionBadge = (status: string, plan?: string | null, hasStripeSubscription?: boolean) => {
    switch (status) {
      case "active":
        if (hasStripeSubscription) {
          if (plan === 'annual') {
            return <Badge className="bg-green-500/10 text-green-600 border-green-200">Annual</Badge>;
          }
          return <Badge className="bg-green-500/10 text-green-600 border-green-200">Monthly</Badge>;
        }
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">Free</Badge>;
      case "comped":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">Comped</Badge>;
      case "cancelling":
        if (plan === 'annual') {
          return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Annual (Cancelling)</Badge>;
        }
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Monthly (Cancelling)</Badge>;
      case "referral_trial":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Trial</Badge>;
      case "free":
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const displayName = user.profile?.fullName || user.username || "Member";

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-welcome">
              Welcome back, {displayName}!
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Subscription:</span>
              {getSubscriptionBadge(user.subscriptionStatus || "free", user.subscriptionPlan, !!user.stripeSubscriptionId)}
            </div>
          </div>

          {/* Upgrade banner — free users only, dismissible per session */}
          {!isPaidSubscriber && !bannerDismissed && (
            <div
              className="relative flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-3 mb-6"
              data-testid="banner-upgrade"
            >
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-accent flex-shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  You&apos;re on the free plan.{" "}
                  <span className="text-muted-foreground font-normal">
                    Upgrade to unlock unlimited deal analyses, lender matching, and PDF exports.
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setLocation("/upgrade")}
                  data-testid="button-banner-upgrade"
                >
                  See Plans
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={dismissBanner}
                  data-testid="button-banner-dismiss"
                  aria-label="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Full-width hero CTA — only when user has run 0 deals */}
          {!statsLoading && (stats?.totalDeals ?? 0) === 0 && (
            <Card
              className="hover-elevate cursor-pointer mb-6 bg-primary border-0"
              onClick={() => setLocation("/deal-analysis")}
              data-testid="card-start-deal-analysis-hero"
            >
              <CardContent className="py-8 px-6 sm:px-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-16 h-16 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calculator className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-primary-foreground mb-1">Start Here — Analyze Your First Deal in 3 Minutes</h2>
                    <p className="text-primary-foreground/75 text-sm mb-4">
                      Enter an address and we'll pull the property data automatically. Get projected profit, ROI, max allowable offer, and matched lenders.
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-primary-foreground/65">
                      <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-primary-foreground/80" /> Automated property lookup</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-primary-foreground/80" /> Profit & ROI projections</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-primary-foreground/80" /> Lender comparison</span>
                    </div>
                  </div>
                  <Button
                    className="flex-shrink-0 self-start sm:self-center bg-white/90 text-primary border-white/70"
                    onClick={(e) => { e.stopPropagation(); setLocation("/deal-analysis"); }}
                    data-testid="button-hero-start-deal"
                  >
                    Start Analysis
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2x3 Grid of Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Start Deal Analysis — shown in grid only after first deal is completed */}
            {(statsLoading || (stats?.totalDeals ?? 0) > 0) && (
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/deal-analysis")}
              data-testid="card-start-deal-analysis"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">Start Deal Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Analyze a new investment property with detailed projections
                </CardDescription>
              </CardContent>
            </Card>
            )}

            {/* Deals Analyzed */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/portal/deals")}
              data-testid="card-deals-analyzed"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Deals Analyzed</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary mb-1">
                  {statsLoading ? "..." : stats?.totalDeals || 0}
                </p>
                <CardDescription>Click to view history</CardDescription>
              </CardContent>
            </Card>

            {/* Tools & Resources */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/toolbox")}
              data-testid="card-tools-resources"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-base">Tools & Resources</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Access calculators, guides, and educational content
                </CardDescription>
              </CardContent>
            </Card>

            {/* Search Lenders */}
            <Card 
              className="hover-elevate cursor-pointer" 
              onClick={() => setLocation("/lenders")}
              data-testid="card-search-lenders"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Search className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-base">Search Lenders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Find and compare financing options from our lender network
                </CardDescription>
              </CardContent>
            </Card>

            {/* Saved Lenders */}
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation("/portal/saved-lenders")}
              data-testid="card-saved-lenders"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-base">Saved Lenders</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-accent mb-1">
                  {statsLoading ? "..." : stats?.savedLenders || 0}
                </p>
                <CardDescription>Lenders you've bookmarked</CardDescription>
              </CardContent>
            </Card>

            {/* Contractor Portal - shown if user is also a contractor */}
            {user?.isContractor && (
              <Card 
                className="hover-elevate cursor-pointer"
                onClick={() => { window.location.href = "/contractor-portal"; }}
                data-testid="card-contractor-portal"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <HardHat className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-base">Contractor Portal</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Access your contractor dashboard, referrals, and documents
                  </CardDescription>
                </CardContent>
              </Card>
            )}

            {/* Refer a Friend - Coming Soon */}
            <Card data-testid="card-refer-friend">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Gift className="h-5 w-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-base">Refer a Friend</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-2">
                  <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg blur-sm pointer-events-none select-none">
                    <code className="text-lg font-bold flex-1">XXXXXXXX</code>
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-md font-semibold text-sm shadow-lg">
                      Coming Soon
                    </div>
                  </div>
                </div>
                <CardDescription className="space-y-1">
                  <span className="block">Give a friend <span className="font-semibold text-green-600">1 month free</span></span>
                  <span className="block">You get <span className="font-semibold text-green-600">2 months free</span> with their paid subscription</span>
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Provide Feedback Banner */}
          <Card className="mt-6 border-accent/30 bg-accent/5" data-testid="card-provide-feedback">
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                  <MessageSquarePlus className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-base">Provide Feedback</CardTitle>
                  <CardDescription className="mt-0.5">Help us improve the platform</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="divide-y divide-border/60">
                {/* Report an Issue */}
                <div className="flex items-center gap-4 py-3" data-testid="row-report-issue">
                  <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Bug className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Report an Issue</p>
                    <p className="text-xs text-muted-foreground">Found something that isn't working? Let us know</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setModalType('issue')}
                    data-testid="button-report-issue"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Suggest a Feature */}
                <div className="flex items-center gap-4 py-3" data-testid="row-suggest-feature">
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Suggest a Feature</p>
                    <p className="text-xs text-muted-foreground">Have an idea to make the platform better?</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setModalType('feature')}
                    data-testid="button-suggest-feature"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Coming Soon: Custom Email Reminders */}
                <div className="flex items-center gap-4 py-3" data-testid="row-email-reminders">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                    <Lightbulb className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Coming Soon: Custom Email Reminders
                    </p>
                    <p className="text-xs text-muted-foreground">Help us prioritize this feature</p>
                  </div>
                  <Link href="/feedback?feature=custom_email_workflow" data-testid="link-email-reminders-feedback">
                    <Button variant="ghost" size="icon" data-testid="button-email-reminders-feedback">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feedback Modal */}
      {modalType && (
        <FeedbackModal
          open={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
          userEmail={user?.email}
        />
      )}
    </Layout>
  );
}
