import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  CheckCircle,
  XCircle,
  Copy,
  Loader2,
  Mail,
  Building2,
  CreditCard,
  Activity,
  User as UserIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UserDetail {
  id: string;
  fullName: string | null;
  email: string;
  username: string;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  subscriptionType: string | null;
  subscriptionStatus: string;
  accountStatus: string;
  signupSource: string | null;
  signupRef: string | null;
  createdAt: string | null;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  role: string;
  dealAnalysisAuto: number;
  dealAnalysisManual: number;
  savedLendersCount: number;
  referralsCount: number;
  lastArvAddress: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  reportLogoUrl: string | null;
  reportCompanyName: string | null;
}

interface UserDetailPanelProps {
  userId: string | null;
  onClose: () => void;
}

interface EditForm {
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  subscriptionType: string;
  role: string;
  accountStatus: string;
}

const EMPTY_FORM: EditForm = {
  fullName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  subscriptionType: "free",
  role: "user",
  accountStatus: "active",
};

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Field({ label, value, testid }: { label: string; value: React.ReactNode; testid?: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 break-words" data-testid={testid}>{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function CopyableId({ value, testid }: { value: string | null; testid?: string }) {
  const { toast } = useToast();
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <code className="text-xs font-mono truncate flex-1 min-w-0" data-testid={testid}>{value}</code>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast({ description: "Copied to clipboard" });
        }}
        data-testid={`button-copy-${testid}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    archived: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <Badge className={`${map[status] || "bg-muted text-foreground"} border-transparent capitalize`}>
      {status}
    </Badge>
  );
}

export default function UserDetailPanel({ userId, onClose }: UserDetailPanelProps) {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [emailError, setEmailError] = useState<string | null>(null);

  const open = !!userId;

  const { data, isLoading } = useQuery<UserDetail>({
    queryKey: ['/api/admin/users', userId, 'detail'],
    enabled: !!userId,
  });

  // Reset edit mode whenever the panel reopens with a different user
  useEffect(() => {
    setIsEditMode(false);
    setEmailError(null);
  }, [userId]);

  // Hydrate form from data when entering edit mode
  useEffect(() => {
    if (data && isEditMode) {
      setForm({
        fullName: data.fullName || "",
        email: data.email || "",
        phone: data.phone || "",
        street: data.street || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zipCode || "",
        subscriptionType: data.subscriptionType || "free",
        role: data.role || "user",
        accountStatus: data.accountStatus || "active",
      });
      setEmailError(null);
    }
  }, [data, isEditMode]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<EditForm>) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}`, payload);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId, 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ description: "User updated successfully" });
      setIsEditMode(false);
    },
    onError: (err: any) => {
      const msg = err?.message || 'Failed to save changes';
      if (msg.toLowerCase().includes('email')) {
        setEmailError(msg);
      } else {
        toast({ variant: 'destructive', description: msg });
      }
    },
  });

  const handleSave = () => {
    setEmailError(null);
    saveMutation.mutate({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || null as any,
      street: form.street || null as any,
      city: form.city || null as any,
      state: form.state || null as any,
      zipCode: form.zipCode || null as any,
      subscriptionType: form.subscriptionType as any,
      role: form.role,
      accountStatus: form.accountStatus,
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const addressLine = data
    ? [data.street, data.city, data.state, data.zipCode].filter(Boolean).join(', ')
    : '';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="space-y-1 pr-10">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate" data-testid="text-panel-name">
                {data?.fullName || data?.username || 'User'}
              </SheetTitle>
              <SheetDescription className="truncate" data-testid="text-panel-email">
                {data?.email || ''}
              </SheetDescription>
            </div>
            {!isLoading && data && !isEditMode && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsEditMode(true)}
                data-testid="button-panel-edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEditMode ? (
          <div className="mt-6 space-y-6 pb-24">
            <Section icon={UserIcon} title="Identity">
              <div className="space-y-1.5">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  id="edit-fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  data-testid="input-edit-fullName"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setEmailError(null);
                  }}
                  data-testid="input-edit-email"
                />
                {emailError && (
                  <p className="text-xs text-destructive" data-testid="text-email-error">{emailError}</p>
                )}
              </div>
              <Field label="Username" value={data.username} />
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="input-edit-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-street">Street</Label>
                <Input
                  id="edit-street"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  data-testid="input-edit-street"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    data-testid="input-edit-city"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    data-testid="input-edit-state"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-zipCode">ZIP Code</Label>
                <Input
                  id="edit-zipCode"
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                  data-testid="input-edit-zipCode"
                />
              </div>
            </Section>

            <Section icon={CreditCard} title="Account">
              <div className="space-y-1.5">
                <Label>Subscription Type</Label>
                <Select
                  value={form.subscriptionType}
                  onValueChange={(v) => setForm({ ...form, subscriptionType: v })}
                >
                  <SelectTrigger data-testid="select-edit-subscriptionType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger data-testid="select-edit-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="auditor">Auditor</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Account Status</Label>
                <Select
                  value={form.accountStatus}
                  onValueChange={(v) => setForm({ ...form, accountStatus: v })}
                >
                  <SelectTrigger data-testid="select-edit-accountStatus"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Section>

            <div className="fixed bottom-0 right-0 w-full sm:max-w-[480px] border-t bg-background p-4 flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditMode(false)}
                disabled={saveMutation.isPending}
                data-testid="button-edit-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-edit-save"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6 pb-6">
            <Section icon={UserIcon} title="Identity">
              <Field label="Full Name" value={data.fullName} testid="text-detail-fullName" />
              <Field label="Email" value={data.email} testid="text-detail-email" />
              <Field label="Username" value={data.username} testid="text-detail-username" />
              <Field label="Phone" value={data.phone} testid="text-detail-phone" />
              <Field label="Address" value={addressLine || null} testid="text-detail-address" />
            </Section>

            <Section icon={CreditCard} title="Account">
              <Field
                label="Subscription Type"
                value={data.subscriptionType ? (
                  <Badge variant="secondary" className="capitalize">{data.subscriptionType}</Badge>
                ) : <Badge variant="outline">Free</Badge>}
              />
              <Field
                label="Subscription Status"
                value={<Badge variant="secondary" className="capitalize">{data.subscriptionStatus}</Badge>}
              />
              <Field
                label="Role"
                value={<Badge variant="secondary" className="capitalize">{data.role}</Badge>}
              />
              <Field label="Account Status" value={statusBadge(data.accountStatus)} />
              <Field
                label="Signup Date"
                value={data.createdAt ? format(new Date(data.createdAt), 'M/d/yy') : null}
              />
              <Field label="Source" value={data.signupSource} />
              <Field label="Signup Ref" value={data.signupRef} />
              <Field
                label="Email Verified"
                value={
                  data.isEmailVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {data.emailVerifiedAt ? format(new Date(data.emailVerifiedAt), 'M/d/yy') : 'Verified'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Unverified
                    </span>
                  )
                }
              />
            </Section>

            <Section icon={Activity} title="Activity">
              <Field
                label="Deal Analyses"
                value={`${data.dealAnalysisAuto} automated + ${data.dealAnalysisManual} manual`}
                testid="text-detail-dealAnalyses"
              />
              <Field label="Saved Lenders" value={String(data.savedLendersCount)} testid="text-detail-savedLenders" />
              <Field label="Referrals" value={String(data.referralsCount)} testid="text-detail-referrals" />
              {data.lastArvAddress && (
                <Field label="Last ARV Address" value={data.lastArvAddress} testid="text-detail-lastArv" />
              )}
            </Section>

            <Section icon={Mail} title="Billing">
              <Field
                label="Stripe Customer"
                value={<CopyableId value={data.stripeCustomerId} testid="stripe-customer" />}
              />
              <Field
                label="Stripe Subscription"
                value={<CopyableId value={data.stripeSubscriptionId} testid="stripe-subscription" />}
              />
            </Section>

            {(data.reportCompanyName || data.reportLogoUrl) && (
              <Section icon={Building2} title="Branding">
                <Field label="Company Name" value={data.reportCompanyName} testid="text-detail-companyName" />
                <Field
                  label="Logo URL"
                  value={data.reportLogoUrl ? (
                    <a href={data.reportLogoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs break-all hover:underline">
                      {data.reportLogoUrl}
                    </a>
                  ) : null}
                  testid="text-detail-logoUrl"
                />
              </Section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
