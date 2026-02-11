import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useContractorAuth } from "@/contexts/ContractorAuthContext";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import {
  Loader2,
  Copy,
  Link,
  MousePointerClick,
  FileText,
  Upload,
  Trash2,
  Download,
  Users,
  Search,
  X,
  LogOut,
  UserPlus,
} from "lucide-react";

interface DocumentItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  description: string | null;
  userId: string | null;
  assignedUser: { email: string; username: string } | null;
  createdAt: string;
}

interface ReferralStats {
  code: string | null;
  clickCount: number;
  documentsCount: number;
  assignedUsersCount: number;
  assignedUsers: Array<{ id: string; email: string; username: string }>;
}

interface SearchedUser {
  id: string;
  email: string;
  username: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContractorPortal() {
  const [, setLocation] = useLocation();
  const { contractor, isLoading: authLoading, isAuthenticated, logout } = useContractorAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadDescription, setUploadDescription] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [assigningDocId, setAssigningDocId] = useState<string | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/contractor-login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: referralStats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/contractors/referral-stats"],
    enabled: isAuthenticated,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery<DocumentItem[]>({
    queryKey: ["/api/contractors/documents"],
    enabled: isAuthenticated,
  });

  const { data: searchedUsers = [] } = useQuery<SearchedUser[]>({
    queryKey: ["/api/contractors/search-users", userSearchQuery],
    enabled: isAuthenticated && userSearchQuery.length >= 3,
    queryFn: async () => {
      const res = await fetch(`/api/contractors/search-users?email=${encodeURIComponent(userSearchQuery)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: assignSearchedUsers = [] } = useQuery<SearchedUser[]>({
    queryKey: ["/api/contractors/search-users", assignSearchQuery],
    enabled: isAuthenticated && assignSearchQuery.length >= 3,
    queryFn: async () => {
      const res = await fetch(`/api/contractors/search-users?email=${encodeURIComponent(assignSearchQuery)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contractors/generate-referral-code");
      if (!res.ok) throw new Error("Failed to generate code");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/referral-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/me"] });
      toast({ title: "Referral Code Generated", description: "Your referral code is ready to share." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate referral code", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/contractors/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/referral-stats"] });
      setUploadDescription("");
      setAssignUserId("");
      setUserSearchQuery("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Document Uploaded", description: "Your document has been uploaded successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await apiRequest("DELETE", `/api/contractors/documents/${docId}`);
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/referral-stats"] });
      toast({ title: "Document Deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ docId, userId }: { docId: string; userId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/contractors/documents/${docId}/assign`, { userId });
      if (!res.ok) throw new Error("Failed to assign document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/referral-stats"] });
      setAssigningDocId(null);
      setAssignSearchQuery("");
      toast({ title: "Document Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign document", variant: "destructive" });
    },
  });

  const handleFileUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ title: "No File", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (uploadDescription) formData.append("description", uploadDescription);
    if (assignUserId) formData.append("userId", assignUserId);

    uploadMutation.mutate(formData);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/contractor-login");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !contractor) return null;

  const referralUrl = referralStats?.code
    ? `${window.location.origin}/api/contractor-ref/${referralStats.code}`
    : null;

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary" data-testid="text-portal-title">
                Contractor Portal
              </h1>
              <div className="h-1 w-24 bg-accent mt-2"></div>
              <p className="text-muted-foreground mt-2">
                Welcome back, {contractor.name || contractor.companyName}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} data-testid="button-contractor-logout">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <MousePointerClick className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Referral Clicks</p>
                    <p className="text-2xl font-bold" data-testid="text-referral-clicks">
                      {statsLoading ? "..." : (referralStats?.clickCount || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="text-2xl font-bold" data-testid="text-documents-count">
                      {statsLoading ? "..." : (referralStats?.documentsCount || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned Users</p>
                    <p className="text-2xl font-bold" data-testid="text-assigned-users-count">
                      {statsLoading ? "..." : (referralStats?.assignedUsersCount || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Referral Link
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referralStats?.code ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Referral Code</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-base px-3 py-1" data-testid="text-referral-code">
                          {referralStats.code}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(referralStats.code!)}
                          data-testid="button-copy-code"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {referralUrl && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Shareable Link</p>
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={referralUrl}
                            className="text-sm"
                            data-testid="input-referral-url"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(referralUrl)}
                            data-testid="button-copy-url"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Total clicks: <span className="font-semibold">{referralStats.clickCount}</span>
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      Generate a referral code to start tracking clicks.
                    </p>
                    <Button
                      onClick={() => generateCodeMutation.mutate()}
                      disabled={generateCodeMutation.isPending}
                      data-testid="button-generate-code"
                    >
                      {generateCodeMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Link className="mr-2 h-4 w-4" />
                      )}
                      Generate Referral Code
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referred Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referralStats?.assignedUsers && referralStats.assignedUsers.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {referralStats.assignedUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No users assigned yet. Assign users when uploading documents.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Contract / Agreement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">File (PDF, DOC, DOCX, JPG, PNG - Max 10MB)</label>
                  <Input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    data-testid="input-file-upload"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description (optional)</label>
                  <Textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Brief description of this document..."
                    className="resize-none"
                    data-testid="input-upload-description"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Assign to User (optional)</label>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          setAssignUserId("");
                        }}
                        placeholder="Search by email..."
                        data-testid="input-user-search"
                      />
                      {assignUserId && (
                        <Button size="icon" variant="ghost" onClick={() => { setAssignUserId(""); setUserSearchQuery(""); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {userSearchQuery.length >= 3 && !assignUserId && searchedUsers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 border rounded-md bg-popover shadow-lg max-h-40 overflow-y-auto">
                        {searchedUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover-elevate text-sm"
                            onClick={() => {
                              setAssignUserId(u.id);
                              setUserSearchQuery(u.email);
                            }}
                            data-testid={`button-select-user-${u.id}`}
                          >
                            <span className="font-medium">{u.username}</span>
                            <span className="text-muted-foreground ml-2">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleFileUpload}
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload-document"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No documents uploaded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-md border gap-4 flex-wrap"
                      data-testid={`document-row-${doc.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-doc-name-${doc.id}`}>
                            {doc.fileName}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize)}
                            </span>
                            {doc.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {doc.description}
                              </span>
                            )}
                            {doc.assignedUser ? (
                              <Badge variant="secondary" className="text-xs">
                                <UserPlus className="h-3 w-3 mr-1" />
                                {doc.assignedUser.email}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Unassigned</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (assigningDocId === doc.id) {
                              setAssigningDocId(null);
                              setAssignSearchQuery("");
                            } else {
                              setAssigningDocId(doc.id);
                              setAssignSearchQuery("");
                            }
                          }}
                          data-testid={`button-assign-${doc.id}`}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <a
                          href={`/api/contractors/documents/${doc.id}/download`}
                          className="inline-flex"
                          data-testid={`button-download-${doc.id}`}
                        >
                          <Button size="icon" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(doc.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-doc-${doc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {assigningDocId === doc.id && (
                        <div className="w-full mt-2 pl-8">
                          <div className="relative">
                            <Input
                              value={assignSearchQuery}
                              onChange={(e) => setAssignSearchQuery(e.target.value)}
                              placeholder="Search user by email to assign..."
                              className="text-sm"
                              data-testid={`input-assign-search-${doc.id}`}
                            />
                            {assignSearchQuery.length >= 3 && assignSearchedUsers.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 border rounded-md bg-popover shadow-lg max-h-40 overflow-y-auto">
                                {assignSearchedUsers.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 hover-elevate text-sm"
                                    onClick={() => {
                                      assignMutation.mutate({ docId: doc.id, userId: u.id });
                                    }}
                                    data-testid={`button-assign-user-${u.id}-doc-${doc.id}`}
                                  >
                                    <span className="font-medium">{u.username}</span>
                                    <span className="text-muted-foreground ml-2">{u.email}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {doc.assignedUser && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => assignMutation.mutate({ docId: doc.id, userId: null })}
                                data-testid={`button-unassign-${doc.id}`}
                              >
                                <X className="mr-1 h-3 w-3" />
                                Remove Assignment
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
