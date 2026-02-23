import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Loader2, MessageSquare, Clock, Users, Mail, Eye } from "lucide-react";

const PRIORITY_LABELS: Record<string, { label: string; icon: typeof Clock }> = {
  custom_timing: { label: "Custom Timing", icon: Clock },
  custom_recipients: { label: "Custom Recipients", icon: Users },
  custom_messages: { label: "Custom Messages", icon: Mail },
  read_receipts: { label: "Read Receipts", icon: Eye },
};

interface FeedbackItem {
  id: string;
  userId: string | null;
  featureName: string;
  priorities: string[] | null;
  comments: string | null;
  email: string | null;
  createdAt: string;
  username: string | null;
  userEmail: string | null;
}

export default function AdminFeatureFeedback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [sortOrder, setSortOrder] = useState("newest");
  const [featureFilter, setFeatureFilter] = useState("all");

  const queryParams = new URLSearchParams();
  if (featureFilter !== "all") queryParams.set("feature", featureFilter);
  if (sortOrder === "oldest") queryParams.set("sort", "oldest");
  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `/api/admin/feature-feedback?${queryString}`
    : "/api/admin/feature-feedback";

  const { data, isLoading } = useQuery<{ feedback: FeedbackItem[] }>({
    queryKey: [endpoint],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/feature-feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: "Deleted", description: "Feedback entry removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete feedback.", variant: "destructive" });
    },
  });

  const feedback = data?.feedback || [];

  const priorityCounts: Record<string, number> = {};
  feedback.forEach((item) => {
    (item.priorities || []).forEach((p) => {
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-feedback-admin-title">
              Feature Feedback
            </h1>
            <p className="text-muted-foreground" data-testid="text-feedback-count">
              {feedback.length} response{feedback.length !== 1 ? "s" : ""} collected
            </p>
          </div>
        </div>

        {feedback.length > 0 && (
          <Card className="mb-6" data-testid="card-priority-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Priority Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(PRIORITY_LABELS).map(([key, config]) => {
                  const count = priorityCounts[key] || 0;
                  const percentage = feedback.length > 0 ? Math.round((count / feedback.length) * 100) : 0;
                  return (
                    <div key={key} className="text-center p-3 rounded-lg bg-muted/50" data-testid={`stat-priority-${key}`}>
                      <config.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold text-foreground">{percentage}%</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                      <p className="text-xs text-muted-foreground">({count} votes)</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Select value={featureFilter} onValueChange={setFeatureFilter}>
              <SelectTrigger className="w-48" data-testid="select-feature-filter">
                <SelectValue placeholder="Filter by feature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Features</SelectItem>
                <SelectItem value="custom_email_workflow">Custom Email Workflow</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-36" data-testid="select-sort-order">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : feedback.length === 0 ? (
          <Card data-testid="card-empty-feedback">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-foreground">No feedback yet</p>
              <p className="text-muted-foreground">
                Feedback will appear here as users submit it.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feedback.map((item) => (
              <Card key={item.id} data-testid={`card-feedback-${item.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground" data-testid={`text-feedback-user-${item.id}`}>
                          {item.username || item.userEmail || item.email || "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground" data-testid={`text-feedback-date-${item.id}`}>
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {item.priorities && item.priorities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.priorities.map((p) => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {PRIORITY_LABELS[p]?.label || p}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {item.comments && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-feedback-comment-${item.id}`}>
                          {item.comments}
                        </p>
                      )}
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          data-testid={`button-delete-feedback-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this feedback entry. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete-feedback">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(item.id)}
                            data-testid="button-confirm-delete-feedback"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
