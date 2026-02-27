import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Star, Trash2, Mail } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface EmailSenderAlias {
  id: number;
  label: string;
  fromName: string;
  fromEmail: string;
  isDefault: boolean;
  createdAt: string | null;
}

interface EmailCategorySetting {
  id: number;
  category: string;
  aliasId: number | null;
  updatedAt: string | null;
}

interface EmailSendersData {
  aliases: EmailSenderAlias[];
  categories: EmailCategorySetting[];
}

const CATEGORIES = [
  {
    key: "transactional",
    label: "Transactional",
    description: "Verification emails, password resets, welcome emails",
  },
  {
    key: "support",
    label: "Support",
    description: "Contact confirmations, general inquiries",
  },
  {
    key: "webinar",
    label: "Webinar",
    description: "Webinar confirmations, reminders, and follow-ups",
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Feature follow-up emails, affiliate notifications",
  },
  {
    key: "lender",
    label: "Lender",
    description: "Lender credentials, product notifications, broadcasts",
  },
];

export default function EmailSenders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [aliasToDelete, setAliasToDelete] = useState<EmailSenderAlias | null>(null);
  const [form, setForm] = useState({ label: "", fromName: "", fromEmail: "" });

  const { data, isLoading } = useQuery<EmailSendersData>({
    queryKey: ["/api/admin/email-senders"],
  });

  const createMutation = useMutation({
    mutationFn: (payload: { label: string; fromName: string; fromEmail: string }) =>
      apiRequest("POST", "/api/admin/email-senders", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-senders"] });
      setShowAddDialog(false);
      setForm({ label: "", fromName: "", fromEmail: "" });
      toast({ title: "Address added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add address", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/email-senders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-senders"] });
      setAliasToDelete(null);
      toast({ title: "Address removed" });
    },
    onError: (err: any) => {
      toast({ title: "Cannot remove address", description: err.message, variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/email-senders/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-senders"] });
      toast({ title: "Default sender updated" });
    },
    onError: () => {
      toast({ title: "Failed to update default", variant: "destructive" });
    },
  });

  const setCategoryMutation = useMutation({
    mutationFn: ({ category, aliasId }: { category: string; aliasId: number | null }) =>
      apiRequest("PATCH", `/api/admin/email-category/${category}`, { aliasId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-senders"] });
      toast({ title: "Category assignment saved" });
    },
    onError: () => {
      toast({ title: "Failed to save assignment", variant: "destructive" });
    },
  });

  const aliases = data?.aliases ?? [];
  const categories = data?.categories ?? [];

  const getCategoryAliasId = (categoryKey: string): string => {
    const setting = categories.find((c) => c.category === categoryKey);
    return setting?.aliasId ? String(setting.aliasId) : "default";
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.fromName.trim() || !form.fromEmail.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Email Senders</h1>
            <p className="text-muted-foreground text-sm">
              Manage the "from" addresses used for outgoing emails
            </p>
          </div>
        </div>

        {/* Registered Addresses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Registered Addresses</CardTitle>
              <CardDescription>
                Add email aliases from your Zoho account. The default address is used when no
                category assignment is set.
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-address"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Loading…</p>
            ) : aliases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No addresses registered yet.</p>
                <p className="text-xs mt-1">
                  Add your email aliases to control which address sends each type of email.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aliases.map((alias) => (
                    <TableRow key={alias.id} data-testid={`row-alias-${alias.id}`}>
                      <TableCell className="font-medium">{alias.label}</TableCell>
                      <TableCell>{alias.fromName}</TableCell>
                      <TableCell className="text-muted-foreground">{alias.fromEmail}</TableCell>
                      <TableCell>
                        {alias.isDefault ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Default
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultMutation.mutate(alias.id)}
                            disabled={setDefaultMutation.isPending}
                            data-testid={`button-set-default-${alias.id}`}
                            title="Set as default"
                          >
                            <Star className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {!alias.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAliasToDelete(alias)}
                            data-testid={`button-delete-alias-${alias.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Category Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Category Assignments</CardTitle>
            <CardDescription>
              Choose which address to use for each type of email. "Use Default" falls back to
              whatever address is marked as the default above (or your SMTP environment settings if
              none are configured).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="flex flex-row items-center justify-between gap-4 flex-wrap py-3 border-b last:border-0"
                  data-testid={`category-row-${cat.key}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{cat.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                  </div>
                  <Select
                    value={getCategoryAliasId(cat.key)}
                    onValueChange={(val) =>
                      setCategoryMutation.mutate({
                        category: cat.key,
                        aliasId: val === "default" ? null : parseInt(val),
                      })
                    }
                    disabled={aliases.length === 0}
                  >
                    <SelectTrigger
                      className="w-56"
                      data-testid={`select-category-${cat.key}`}
                    >
                      <SelectValue placeholder="Use Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use Default</SelectItem>
                      {aliases.map((alias) => (
                        <SelectItem key={alias.id} value={String(alias.id)}>
                          {alias.label} — {alias.fromEmail}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Address Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent data-testid="dialog-add-address">
          <DialogHeader>
            <DialogTitle>Add Email Address</DialogTitle>
            <DialogDescription>
              Add an alias email address configured in your Zoho account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="e.g. Support Team"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                data-testid="input-label"
              />
              <p className="text-xs text-muted-foreground">
                A short internal label to identify this address
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">Display Name</Label>
              <Input
                id="fromName"
                placeholder="e.g. RE Data Metrix Support"
                value={form.fromName}
                onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
                data-testid="input-from-name"
              />
              <p className="text-xs text-muted-foreground">
                The name recipients see in their inbox
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email Address</Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="e.g. support@redatametrix.com"
                value={form.fromEmail}
                onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))}
                data-testid="input-from-email"
              />
              <p className="text-xs text-muted-foreground">
                Must be a verified alias in your Zoho Mail account
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-confirm-add"
              >
                {createMutation.isPending ? "Adding…" : "Add Address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!aliasToDelete} onOpenChange={(open) => !open && setAliasToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove address?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{aliasToDelete?.fromEmail}</strong> from your registered
              addresses. Any categories assigned to it will fall back to the default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => aliasToDelete && deleteMutation.mutate(aliasToDelete.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
