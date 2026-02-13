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
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  User,
  UserPlus,
  FileCheck,
  Pencil,
  Save,
} from "lucide-react";
import jsPDF from "jspdf";

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
  signupCount: number;
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
  const { user: currentUser, isLoading: userAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'developer';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadDescription, setUploadDescription] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [assigningDocId, setAssigningDocId] = useState<string | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    companyName: "",
    phone: "",
    website: "",
    description: "",
    specialties: [] as string[],
    licenseNumber: "",
    licensedStates: [] as string[],
    isInsured: false,
    isBonded: false,
  });

  useEffect(() => {
    if (!authLoading && !userAuthLoading && !isAuthenticated && !isAdmin) {
      setLocation("/login");
    }
  }, [authLoading, userAuthLoading, isAuthenticated, isAdmin, setLocation]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && contractor && !contractor.agreementSignedAt) {
      setLocation("/contractor-agreement");
    }
  }, [authLoading, isAuthenticated, contractor, setLocation]);

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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const token = localStorage.getItem('_sessionToken');
      const res = await fetch("/api/contractors/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { 'X-Session-Token': token } : {}),
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/me"] });
      setIsEditingProfile(false);
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    },
  });

  const startEditing = () => {
    if (contractor) {
      setProfileForm({
        name: contractor.name || "",
        companyName: contractor.companyName || "",
        phone: contractor.phone || "",
        website: contractor.website || "",
        description: contractor.description || "",
        specialties: contractor.specialties || [],
        licenseNumber: contractor.licenseNumber || "",
        licensedStates: contractor.licensedStates || [],
        isInsured: contractor.isInsured || false,
        isBonded: contractor.isBonded || false,
      });
      setIsEditingProfile(true);
    }
  };

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
    setLocation("/login");
  };

  const generateAgreementPdf = () => {
    if (!contractor) return;

    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 60;
    const maxWidth = pageWidth - margin * 2;
    let y = 60;

    const addText = (text: string, opts?: { bold?: boolean; size?: number; indent?: number; spacing?: number; signature?: boolean }) => {
      const size = opts?.size || 10;
      const indent = opts?.indent || 0;
      const spacing = opts?.spacing || 4;
      if (opts?.signature) {
        doc.setFont("times", "bolditalic");
        doc.setFontSize(size);
        doc.setTextColor(0, 30, 100);
      } else {
        const style = opts?.bold ? "bold" : "normal";
        doc.setFontSize(size);
        doc.setFont("helvetica", style);
        doc.setTextColor(0, 0, 0);
      }
      const lines = doc.splitTextToSize(text, maxWidth - indent);
      for (const line of lines) {
        if (y > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          y = 60;
        }
        doc.text(line, margin + indent, y);
        y += size + spacing;
      }
      if (opts?.signature) {
        doc.setTextColor(0, 0, 0);
      }
    };

    const addSpace = (pts: number) => { y += pts; };

    addText("CONTRACTOR REFERRAL AGREEMENT", { bold: true, size: 16 });
    addSpace(10);

    addText(`This Contractor Referral Agreement ("Agreement") is entered into by and between RE Data Metrix, LLC ("RDM") and the undersigned Contractor (collectively, the "Parties"), effective as of the date of the last signature below.`);
    addSpace(10);

    addText("1. Purpose", { bold: true, size: 11 });
    addSpace(4);
    addText("RDM agrees to list Contractor on RDM's website for the purpose of referring the Contractor to users of RDM's platform (\"Users\"). This listing is provided at no charge to the Contractor.");
    addSpace(10);

    addText("2. Referral Fees", { bold: true, size: 11 });
    addSpace(4);
    addText("If a User hires the Contractor following a referral by RDM, the Contractor agrees to pay RDM a referral fee as follows:");
    addText("- For jobs valued at $50,000 or more: $1,000.", { indent: 16 });
    addText("- For jobs valued at up to $49,999: $500.", { indent: 16 });
    addSpace(4);
    addText("Payment shall be made via ACH, wire transfer, or another mutually agreed method. All fees are due within two (2) business days of the execution of a contract or agreement between the Contractor and the referred User.");
    addSpace(10);

    addText("3. Residual Referral Fees and First Contract Date", { bold: true, size: 11 });
    addSpace(4);
    addText("For purposes of this Agreement, the \"First Contract Date\" means the date on which the first written contract or agreement between the Contractor and a referred User is executed.");
    addSpace(4);
    addText("Contractor acknowledges that RDM is referring a client relationship, not a single project. Therefore, additional referral fees are due for future contracts between the Contractor and the same User as follows, measured from the First Contract Date:");
    addText("- For contracts or agreements executed on or before the 12-month anniversary of the First Contract Date (\"Year One\"): 50% of the initial referral fee (i.e., $500 for jobs valued at $50,000 or more; $250 for jobs valued at up to $49,999).", { indent: 16 });
    addText("- For contracts or agreements executed after the 12-month anniversary but on or before the 24-month anniversary of the First Contract Date (\"Year Two\"): 50% of the Year One residual fee (i.e., $250 for jobs valued at $50,000 or more; $125 for jobs valued at up to $49,999).", { indent: 16 });
    addSpace(4);
    addText("No referral fees are due for contracts executed after the 24-month anniversary of the First Contract Date.");
    addSpace(4);
    addText("For all purposes under this Section, the relevant date is the execution date of the contract or agreement, not the date work begins or is completed.");
    addSpace(10);

    addText("4. Reporting and Payment Responsibility", { bold: true, size: 11 });
    addSpace(4);
    addText("The Contractor is responsible for reporting all qualifying contracts with referred Users and for submitting the appropriate referral payments. Reporting of referrals will be available via the Contractor Portal provided by RDM, or by request directly from RDM.");
    addSpace(4);
    addText("RDM has no independent means of tracking such activity; therefore, the Contractor must ensure timely reporting and payment in accordance with this Agreement.");
    addSpace(10);

    addText("5. Compliance and Enforcement", { bold: true, size: 11 });
    addSpace(4);
    addText("The Contractor agrees not to engage in any workarounds, side arrangements, or other methods intended to avoid the payment of fees owed to RDM.");
    addSpace(4);
    addText("Failure to comply with this Agreement will result in removal from RDM's referral program and may result in legal action. RDM reserves the right to recover any unpaid fees, as well as reasonable attorney's fees, court costs, or other expenses incurred in the enforcement of this Agreement.");
    addSpace(10);

    addText("6. Term and Termination", { bold: true, size: 11 });
    addSpace(4);
    addText("This Agreement shall remain in effect until terminated. Either Party may terminate this Agreement upon thirty (30) days' written notice to the other Party.");
    addSpace(10);

    addText("7. Effect of Termination on Existing Referrals", { bold: true, size: 11 });
    addSpace(4);
    addText("a. Survival of Referral Fee Obligations. Contractor's obligation to pay referral fees shall survive termination of this Agreement with respect to any User that was referred to Contractor by RDM on or before the effective date of termination, whether or not Contractor and such User have entered into a contract as of the termination date.");
    addSpace(4);
    addText("b. Existing Referred Users. For each such referred User, all applicable referral fees (initial referral job fee, Year One residual fees, and Year Two residual fees) shall remain payable in accordance with Sections 2 and 3 for any qualifying contracts or agreements executed within the relevant time periods, measured from the First Contract Date for that User.");
    addSpace(4);
    addText("c. No New Referrals After Termination. After the effective date of termination, RDM shall have no obligation to provide new referrals to Contractor, and Contractor shall have no obligation to pay referral fees for Users first referred after the effective date of termination.");
    addSpace(10);

    addText("8. Entire Agreement", { bold: true, size: 11 });
    addSpace(4);
    addText("This Agreement constitutes the entire understanding between the Parties regarding the referral relationship and supersedes any prior agreements, oral or written, relating to this subject matter.");
    addSpace(20);

    addText("IN WITNESS WHEREOF, the Parties have executed this Agreement as of the dates indicated below.", { bold: true });
    addSpace(20);

    addText("Contractor:", { bold: true, size: 11 });
    addSpace(6);
    addText(`Name: ${contractor.agreementSignerName || contractor.name || ""}`);
    addText(`Company Name: ${contractor.companyName || ""}`);
    addText(`Title/Authorized Signer: ${contractor.agreementSignerTitle || ""}`);
    addSpace(4);
    addText(`/s/ ${contractor.agreementSignerName || contractor.name || ""}`, { signature: true, size: 16 });
    addSpace(2);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y - 4, margin + 200, y - 4);
    addText("Signature");
    const signedDate = contractor.agreementSignedAt ? new Date(contractor.agreementSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
    addText(`Date: ${signedDate}`);
    addSpace(20);

    addText("RE DATA METRIX, LLC", { bold: true, size: 11 });
    addSpace(6);
    addText(`Daniel Turro`, { signature: true, size: 16 });
    addSpace(2);
    doc.line(margin, y - 4, margin + 200, y - 4);
    addText("Authorized Signature");
    addText("Name: Daniel Turro");
    addText("Title: Founder");
    addSpace(16);

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(`Agreement Version: ${contractor.agreementVersion || "1.0"} | Electronically signed on ${signedDate}`, margin, y);

    const fileName = `Contractor_Referral_Agreement_${(contractor.companyName || contractor.name || "").replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (authLoading || userAuthLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (isAdmin && !isAuthenticated) {
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
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Admin Preview</Badge>
                  <p className="text-muted-foreground">
                    This is what contractors see when they log in
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setLocation("/admin/contractors")} data-testid="button-admin-contractors">
                Contractor Management
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
                      <p className="text-2xl font-bold">0</p>
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
                      <p className="text-2xl font-bold">0</p>
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
                      <p className="text-2xl font-bold">0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Signed Agreement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm py-2 text-center">
                  Agreement details appear here after the contractor signs.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Referral Link
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Referral Code</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          SAMPLE-A1B2C3
                        </Badge>
                        <Button size="icon" variant="ghost" disabled>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Referral codes are auto-generated when a contractor completes signup.
                    </p>
                  </div>
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
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Users assigned to this contractor appear here.
                  </p>
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
                    <Input type="file" disabled accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Description (optional)</label>
                    <Textarea disabled placeholder="Brief description of this document..." className="resize-none" />
                  </div>
                  <Button disabled>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
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
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Uploaded documents appear here.
                </p>
              </CardContent>
            </Card>
          </div>
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
            <div className="flex items-center gap-2 flex-wrap">
              {currentUser && (
                <Button variant="outline" onClick={() => setLocation("/portal/dashboard")} data-testid="button-member-dashboard">
                  <User className="mr-2 h-4 w-4" />
                  Member Dashboard
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout} data-testid="button-contractor-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                  <div className="p-2 rounded-md bg-accent/10">
                    <UserPlus className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Referred Signups</p>
                    <p className="text-2xl font-bold" data-testid="text-referral-signups">
                      {statsLoading ? "..." : (referralStats?.signupCount || 0)}
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

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5" />
                  Profile Settings
                </CardTitle>
                {!isEditingProfile ? (
                  <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(false)} data-testid="button-cancel-edit">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => updateProfileMutation.mutate(profileForm)} disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                      {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name">Contact Name</Label>
                      <Input
                        id="edit-name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-edit-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-company">Company Name</Label>
                      <Input
                        id="edit-company"
                        value={profileForm.companyName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, companyName: e.target.value }))}
                        data-testid="input-edit-company"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        data-testid="input-edit-phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-website">Website</Label>
                      <Input
                        id="edit-website"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                        data-testid="input-edit-website"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={profileForm.description}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      data-testid="input-edit-description"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-specialties">Specialties (comma separated)</Label>
                      <Input
                        id="edit-specialties"
                        value={profileForm.specialties.join(", ")}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, specialties: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                        placeholder="Rehabs, New Construction, Renovations"
                        data-testid="input-edit-specialties"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-license">License Number</Label>
                      <Input
                        id="edit-license"
                        value={profileForm.licenseNumber}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        data-testid="input-edit-license"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-licensed-states">Licensed States (comma separated)</Label>
                    <Input
                      id="edit-licensed-states"
                      value={profileForm.licensedStates.join(", ")}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, licensedStates: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean) }))}
                      placeholder="GA, FL, AL"
                      data-testid="input-edit-licensed-states"
                    />
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-insured"
                        checked={profileForm.isInsured}
                        onCheckedChange={(checked) => setProfileForm(prev => ({ ...prev, isInsured: !!checked }))}
                        data-testid="checkbox-edit-insured"
                      />
                      <Label htmlFor="edit-insured">Insured</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-bonded"
                        checked={profileForm.isBonded}
                        onCheckedChange={(checked) => setProfileForm(prev => ({ ...prev, isBonded: !!checked }))}
                        data-testid="checkbox-edit-bonded"
                      />
                      <Label htmlFor="edit-bonded">Bonded</Label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contact Name</p>
                    <p className="font-medium">{contractor.name || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Company</p>
                    <p className="font-medium">{contractor.companyName || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{contractor.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{contractor.phone || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Website</p>
                    <p className="font-medium">{contractor.website || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">License Number</p>
                    <p className="font-medium">{contractor.licenseNumber || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Specialties</p>
                    <p className="font-medium">{contractor.specialties?.length ? contractor.specialties.join(", ") : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Licensed States</p>
                    <p className="font-medium">{contractor.licensedStates?.length ? contractor.licensedStates.join(", ") : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Insurance / Bonding</p>
                    <p className="font-medium">
                      {contractor.isInsured ? "Insured" : "Not insured"}
                      {" / "}
                      {contractor.isBonded ? "Bonded" : "Not bonded"}
                    </p>
                  </div>
                  {contractor.description && (
                    <div className="md:col-span-2">
                      <p className="text-muted-foreground">Description</p>
                      <p className="font-medium">{contractor.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {contractor.agreementSignedAt && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Signed Agreement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" data-testid="badge-agreement-status">
                        <FileCheck className="h-3 w-3 mr-1" />
                        Executed
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Version {contractor.agreementVersion || "1.0"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-agreement-signed-date">
                      Signed on {new Date(contractor.agreementSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      {contractor.agreementSignerName && ` by ${contractor.agreementSignerName}`}
                      {contractor.agreementSignerTitle && `, ${contractor.agreementSignerTitle}`}
                    </p>
                  </div>
                  <Button onClick={generateAgreementPdf} data-testid="button-download-agreement">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                      {" | "}
                      Signups: <span className="font-semibold">{referralStats.signupCount || 0}</span>
                    </p>
                  </div>
                ) : statsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Loading referral code...
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      No referral code found. Please contact support if this issue persists.
                    </p>
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
