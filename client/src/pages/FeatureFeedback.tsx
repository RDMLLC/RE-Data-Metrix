import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, Loader2, Mail, Users, Clock, Eye, CheckCircle, Lightbulb } from "lucide-react";

const PRIORITY_OPTIONS = [
  { id: "custom_timing", label: "Custom timing for reminders (e.g., 7 days, 4 days before closing)", icon: Clock },
  { id: "custom_recipients", label: "Send reminders to your team (title company, agent, partners, etc.)", icon: Users },
  { id: "custom_messages", label: "Write your own talking points for each reminder", icon: Mail },
  { id: "read_receipts", label: "See when recipients have read your emails", icon: Eye },
];

export default function FeatureFeedback() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const urlParams = new URLSearchParams(searchString);
  const featureName = urlParams.get("feature") || "custom_email_workflow";

  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [email, setEmail] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/feature-feedback", {
        featureName,
        priorities: selectedPriorities,
        comments: comments.trim() || null,
        email: email.trim() || null,
      });
      return await response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted. We appreciate your input!",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Unable to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const togglePriority = (id: string) => {
    setSelectedPriorities(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16">
          <div className="max-w-lg mx-auto px-4">
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Feedback Received!</h2>
                <p className="text-muted-foreground">
                  Thank you for helping us shape the future of RE Data Metrix. Your input directly influences what we build next.
                </p>
                <div className="pt-4">
                  {isAuthenticated ? (
                    <Button onClick={() => setLocation("/portal/deals")} data-testid="button-back-to-deals">
                      Back to My Deals
                    </Button>
                  ) : (
                    <Button onClick={() => setLocation("/")} data-testid="button-back-home">
                      Back to Home
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation(isAuthenticated ? "/portal/deals" : "/")}
              className="mb-4"
              data-testid="button-back-from-feedback"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl" data-testid="text-feedback-title">
                    Coming Soon: Custom Email Reminders
                  </CardTitle>
                  <CardDescription>Help us build exactly what you need</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">
                  We're building custom email reminders for your deals.
                </p>
                <p>
                  Instead of just our standard closing reminders, you'll be able to create your own 
                  reminder emails with custom timing, your own talking points, and send them to your 
                  entire team — title company, real estate agent, partners, and more.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  What matters most to you? (Select all that apply)
                </Label>
                <div className="space-y-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPriorities.includes(option.id)
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                      data-testid={`checkbox-priority-${option.id}`}
                    >
                      <Checkbox
                        checked={selectedPriorities.includes(option.id)}
                        onCheckedChange={() => togglePriority(option.id)}
                        className="mt-0.5"
                      />
                      <div className="flex items-start gap-2 flex-1">
                        <option.icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="text-sm">{option.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments" className="text-sm font-medium">
                  Any other ideas or suggestions? (Optional)
                </Label>
                <Textarea
                  id="comments"
                  placeholder="Tell us what would make this feature perfect for your workflow..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="resize-none"
                  rows={4}
                  data-testid="textarea-feedback-comments"
                />
              </div>

              {!isAuthenticated && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Your email (optional, so we can follow up)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-feedback-email"
                  />
                </div>
              )}

              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || (selectedPriorities.length === 0 && !comments.trim())}
                className="w-full"
                size="lg"
                data-testid="button-submit-feedback"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your feedback helps us prioritize features. Thank you for being part of the RE Data Metrix community!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
