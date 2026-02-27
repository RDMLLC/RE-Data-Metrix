import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bug, Sparkles, Loader2, CheckCircle, Circle } from "lucide-react";
import { format } from "date-fns";

interface Submission {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedEmail: string;
}

type FilterTab = 'all' | 'issue' | 'feature' | 'resolved';

export default function UserSubmissions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/admin/user-submissions"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/user-submissions/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-submissions"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const filtered = submissions.filter(s => {
    if (activeTab === 'all') return s.status !== 'resolved';
    if (activeTab === 'issue') return s.type === 'issue' && s.status !== 'resolved';
    if (activeTab === 'feature') return s.type === 'feature' && s.status !== 'resolved';
    if (activeTab === 'resolved') return s.status === 'resolved';
    return true;
  });

  const counts = {
    all: submissions.filter(s => s.status !== 'resolved').length,
    issue: submissions.filter(s => s.type === 'issue' && s.status !== 'resolved').length,
    feature: submissions.filter(s => s.type === 'feature' && s.status !== 'resolved').length,
    resolved: submissions.filter(s => s.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Feedback</h1>
            <p className="text-muted-foreground text-sm">Bug reports and feature suggestions from members</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as FilterTab)} className="mb-6">
          <TabsList data-testid="tabs-filter">
            <TabsTrigger value="all" data-testid="tab-all">
              All Open ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="issue" data-testid="tab-issues">
              Issues ({counts.issue})
            </TabsTrigger>
            <TabsTrigger value="feature" data-testid="tab-features">
              Features ({counts.feature})
            </TabsTrigger>
            <TabsTrigger value="resolved" data-testid="tab-resolved">
              Resolved ({counts.resolved})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Submissions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16" data-testid="div-loading">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card data-testid="card-empty-state">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-medium text-foreground">Nothing here</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'resolved'
                  ? "No resolved submissions yet"
                  : "No open submissions in this category"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="list-submissions">
            {filtered.map(submission => (
              <Card key={submission.id} data-testid={`card-submission-${submission.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      submission.type === 'issue'
                        ? 'bg-red-500/10'
                        : 'bg-indigo-500/10'
                    }`}>
                      {submission.type === 'issue'
                        ? <Bug className="h-4 w-4 text-red-500" />
                        : <Sparkles className="h-4 w-4 text-indigo-500" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={submission.type === 'issue'
                              ? 'bg-red-500/10 text-red-600 border-red-200'
                              : 'bg-indigo-500/10 text-indigo-600 border-indigo-200'}
                            data-testid={`badge-type-${submission.id}`}
                          >
                            {submission.type === 'issue' ? 'Issue' : 'Feature'}
                          </Badge>
                          {submission.status === 'resolved' && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-200" data-testid={`badge-resolved-${submission.id}`}>
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {submission.createdAt ? format(new Date(submission.createdAt), "MMM d, yyyy") : ""}
                        </span>
                      </div>

                      <p className="font-medium text-foreground mt-1.5" data-testid={`text-title-${submission.id}`}>
                        {submission.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-description-${submission.id}`}>
                        {submission.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2" data-testid={`text-email-${submission.id}`}>
                        From: {submission.resolvedEmail}
                      </p>
                    </div>

                    {/* Status toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({
                          id: submission.id,
                          status: submission.status === 'resolved' ? 'open' : 'resolved',
                        })
                      }
                      disabled={statusMutation.isPending}
                      className="shrink-0"
                      data-testid={`button-toggle-status-${submission.id}`}
                    >
                      {submission.status === 'resolved' ? (
                        <>
                          <Circle className="h-3.5 w-3.5 mr-1.5" />
                          Reopen
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Resolve
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
