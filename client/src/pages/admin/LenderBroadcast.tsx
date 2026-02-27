import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Send,
  Eye,
  Users,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Building2,
  X,
} from "lucide-react";

const DEFAULT_SUBJECT = "Action Required: Set Up Your Loan Products on RE Data Metrix";

const DEFAULT_BODY = `<p>I wanted to share a quick update on where RE Data Metrix stands and why now is an important time to make sure your lender profile is complete.</p>

<h3 style="color: #1E3A8A; font-size: 16px;">We've Hired a Marketing Firm</h3>
<p>RE Data Metrix has officially partnered with <strong>BizIQ</strong>, a digital marketing agency, to handle our SEO and AEO optimization along with other behind-the-scenes improvements to the platform. We are actively preparing for a monthly paid digital ad campaign &mdash; which means qualified real estate investors will soon be finding us through search and targeted advertising.</p>

<h3 style="color: #1E3A8A; font-size: 16px;">Growth is Coming</h3>
<p>We're already seeing users come through the platform, and with BizIQ's efforts now underway, we expect signups to accelerate in the near term. This is exactly the moment to make sure your profile is ready to receive those referrals.</p>

<h3 style="color: #1E3A8A; font-size: 16px;">One Lender Is Ready &mdash; Make Sure You Are Too</h3>
<p>At this point, only one lender on the platform has fully loaded their loan products. That matters because <strong>investors are only matched with and referred to lenders whose loan products are visible in the system.</strong> If your loan products aren't set up, you will not appear in investor results &mdash; and those referrals will go elsewhere.</p>

<h3 style="color: #1E3A8A; font-size: 16px;">What to Do</h3>
<p>Please log in to your Lender Portal and complete your loan product setup today. The button below will take you directly to your portal.</p>

<p>Need a refresher on how to set up your portal? <a href="https://youtu.be/pGaiRLIkcmQ" style="color: #1E3A8A; font-weight: 600;">Watch a short walkthrough video here</a>.</p>

<p>If you need assistance, feel free to contact me directly. For your convenience, you can use the links in my signature below to schedule a short phone call, or a longer video meeting if you'd like to walk through it together on a video call.</p>`;

export default function LenderBroadcast() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_BODY);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [excludedEmails, setExcludedEmails] = useState<Set<string>>(new Set());

  const isAuditor = user?.role === "auditor";

  const { data: previewData, isLoading: previewLoading } = useQuery<{
    recipientCount: number;
    recipients: Array<{ companyName: string; contactName: string; email: string }>;
  }>({
    queryKey: ["/api/admin/lender-broadcast/preview"],
  });

  const activeRecipients = (previewData?.recipients ?? []).filter(
    r => !excludedEmails.has(r.email)
  );

  const toggleExclusion = (email: string) => {
    setExcludedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
    setConfirmSend(false);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/lender-broadcast", {
        subject,
        bodyHtml,
        excludedEmails: Array.from(excludedEmails),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Broadcast Sent",
        description: `Successfully sent to ${data.sent} of ${data.totalLenders} lenders.${data.failed > 0 ? ` ${data.failed} failed.` : ""}`,
      });
      setConfirmSend(false);
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send broadcast email.",
        variant: "destructive",
      });
      setConfirmSend(false);
    },
  });

  const renderEmailPreview = () => {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1E3A8A 0%, #0F7B49 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">RE Data Metrix</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Lender Partner Update</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi [Contact Name],</p>
          ${bodyHtml}
          <div style="background: #F0FDF4; border: 1px solid #0F7B49; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 12px; font-weight: 600; color: #0F7B49;">Access Your Lender Portal</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #555;">Log in to complete your loan product setup and start receiving investor referrals.</p>
            <a href="#" style="display: inline-block; padding: 14px 28px; background: #D4AF37; color: #1E3A8A; text-decoration: none; border-radius: 6px; margin: 10px 0; font-weight: bold; font-size: 16px;">Log Into Your Portal</a>
          </div>
          <p style="margin-top: 24px;">Thank you for being a part of RE Data Metrix. We're building something valuable here, and your participation is what makes it work for investors.</p>
          <p style="margin-top: 24px;">Warm regards,<br><strong>RE Data Metrix</strong></p>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
          <p>&copy; 2026 RE Data Metrix. All rights reserved.</p>
          <p style="font-size: 12px; color: #9ca3af;">8375 Dunwoody Place, STE R, Atlanta, GA 30350</p>
        </div>
      </div>
    `;
  };

  return (
    <div className="min-h-screen bg-background">
      {isAuditor && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Read-only access. You can view but cannot send broadcast emails.
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin/lenders">
            <Button variant="ghost" size="icon" data-testid="button-back-lenders">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Lender Broadcast Email</h1>
            <p className="text-sm text-muted-foreground">Send an email to active lender partners</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Card className="flex-1 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Lenders</p>
                <p className="text-2xl font-bold" data-testid="text-active-lender-count">
                  {previewLoading ? "..." : previewData?.recipientCount ?? 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="flex-1 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/10">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Emails to Send</p>
                <p className="text-2xl font-bold" data-testid="text-email-count">
                  {previewLoading ? "..." : activeRecipients.length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {previewData && previewData.recipientCount > 0 && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Recipients</h3>
              </div>
              <p className="text-xs text-muted-foreground">Click a name to exclude from this send</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {previewData.recipients.map((r, i) => {
                const excluded = excludedEmails.has(r.email);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleExclusion(r.email)}
                    data-testid={`badge-recipient-${i}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-colors border ${
                      excluded
                        ? "bg-muted text-muted-foreground border-border line-through opacity-50"
                        : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80"
                    }`}
                  >
                    {r.companyName}
                    {excluded ? (
                      <span className="text-xs">excluded</span>
                    ) : (
                      <X className="h-3 w-3 opacity-60" />
                    )}
                  </button>
                );
              })}
            </div>
            {excludedEmails.size > 0 && (
              <button
                type="button"
                onClick={() => setExcludedEmails(new Set())}
                className="mt-3 text-xs text-primary underline-offset-2 hover:underline"
                data-testid="button-reset-exclusions"
              >
                Reset — include all lenders
              </button>
            )}
          </Card>
        )}

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Compose Email</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject Line</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                data-testid="input-subject"
                disabled={isAuditor}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Email Body <span className="text-muted-foreground font-normal">(HTML supported)</span>
              </label>
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={16}
                className="font-mono text-xs"
                data-testid="input-body"
                disabled={isAuditor}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                The greeting ("Hi [Name]"), portal CTA button, closing, and footer are added automatically.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            data-testid="button-toggle-preview"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>

          {!isAuditor && (
            <>
              {!confirmSend ? (
                <Button
                  onClick={() => setConfirmSend(true)}
                  disabled={!subject.trim() || !bodyHtml.trim() || activeRecipients.length === 0}
                  data-testid="button-prepare-send"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to {activeRecipients.length} {activeRecipients.length === 1 ? "Lender" : "Lenders"}
                </Button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Send to {activeRecipients.length} {activeRecipients.length === 1 ? "lender" : "lenders"}?
                      {excludedEmails.size > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({excludedEmails.size} excluded)
                        </span>
                      )}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    data-testid="button-confirm-send"
                  >
                    {sendMutation.isPending ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Yes, Send Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmSend(false)}
                    disabled={sendMutation.isPending}
                    data-testid="button-cancel-send"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {showPreview && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2">Email Preview</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Subject: <strong>{subject}</strong>
            </p>
            <div
              className="border rounded-md overflow-hidden"
              dangerouslySetInnerHTML={{ __html: renderEmailPreview() }}
              data-testid="div-email-preview"
            />
          </Card>
        )}
      </div>
    </div>
  );
}
