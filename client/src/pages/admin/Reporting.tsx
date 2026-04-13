// client/src/pages/admin/Reporting.tsx

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, DollarSign, MousePointer,
  BarChart3, Plus, Edit2, Trash2, X, ChevronDown, ChevronUp,
  HelpCircle, ExternalLink, Mail, Eye, EyeOff, BookOpen
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface Snapshot {
  id: string;
  weekStart: string;
  totalVisitors: number;
  directVisitors: number;
  paidVisitors: number;
  paidSocialVisitors: number;
  organicVisitors: number;
  socialVisitors: number;
  referralVisitors: number;
  signupFreeInitiated: number;
  signupFreeConfirmed: number;
  signupPaidInitiated: number;
  signupPaidComplete: number;
  signupPaidConfirmed: number;
  loginSuccess: number;
  dealAnalysisVisited: number;
  dealAnalysisSubmitted: number;
  lendersVisited: number;
  toolboxVisited: number;
  pricingCtaClicked: number;
  metaSpend: number;
  googleSpend: number;
  metaClicks: number;
  googleClicks: number;
  metaImpressions: number;
  googleImpressions: number;
  organicImpressions: number;
  organicClicks: number;
  avgPosition: number;
  notes: string;
}

const EMPTY_FORM: Omit<Snapshot, "id"> = {
  weekStart: "",
  totalVisitors: 0, directVisitors: 0, paidVisitors: 0, paidSocialVisitors: 0,
  organicVisitors: 0, socialVisitors: 0, referralVisitors: 0,
  signupFreeInitiated: 0, signupFreeConfirmed: 0,
  signupPaidInitiated: 0, signupPaidComplete: 0, signupPaidConfirmed: 0,
  loginSuccess: 0,
  dealAnalysisVisited: 0, dealAnalysisSubmitted: 0,
  lendersVisited: 0, toolboxVisited: 0, pricingCtaClicked: 0,
  metaSpend: 0, googleSpend: 0,
  metaClicks: 0, googleClicks: 0,
  metaImpressions: 0, googleImpressions: 0,
  organicImpressions: 0, organicClicks: 0, avgPosition: 0,
  notes: "",
};

// ── Platform Tools Config ──────────────────────────────────────
const TOOLS = [
  {
    name: "Google Analytics",
    url: "https://analytics.google.com/analytics/web/#/p388290809/reports/home",
    email: "admin@redatametrix.com",
    color: "text-orange-500",
    icon: "GA4",
  },
  {
    name: "Google Search Console",
    url: "https://search.google.com/search-console?resource_id=https://redatametrix.com/",
    email: "admin@redatametrix.com",
    color: "text-green-500",
    icon: "GSC",
  },
  {
    name: "Google Ads",
    url: "https://ads.google.com",
    email: "admin@redatametrix.com",
    color: "text-blue-500",
    icon: "GAds",
    note: "Add Customer ID when available",
  },
  {
    name: "Meta Ads Manager",
    url: "https://business.facebook.com/latest/home",
    email: "info@redatametrix.com",
    color: "text-blue-600",
    icon: "Meta",
  },
  {
    name: "PageSense",
    url: "https://pagesense.zoho.com",
    email: "info@redatametrix.com",
    color: "text-red-500",
    icon: "PS",
  },
  {
    name: "Zoho CRM",
    url: "https://crm.zoho.com",
    email: "info@redatametrix.com",
    color: "text-yellow-500",
    icon: "CRM",
  },
];

// ── Helpers ────────────────────────────────────────────────────
const fmt = (n: number) => (n ?? 0).toLocaleString();
const dollars = (cents: number) => `$${((cents || 0) / 100).toFixed(2)}`;
const pct = (a: number, b: number) => b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—";
const cpa = (cents: number, conversions: number) =>
  conversions > 0 ? `$${((cents / 100) / conversions).toFixed(2)}` : "—";
const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

const formatWeek = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getMondayOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
};

// ── Sub-components ─────────────────────────────────────────────

function MetricCard({ title, value, sub, trend, icon: Icon, color = "blue" }: {
  title: string; value: string; sub?: string;
  trend?: number; icon: any; color?: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-600", green: "text-green-600",
    amber: "text-amber-600", purple: "text-purple-600", red: "text-red-600"
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className={`w-5 h-5 ${colors[color]} mt-1`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}% vs last week
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-3 h-3 text-muted-foreground inline ml-1 cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function Field({ label, id, value, onChange, type = "number", help }: {
  label: string; id: string; value: any;
  onChange: (v: any) => void; type?: string; help?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
        {help && <HelpTip text={help} />}
      </Label>
      <Input
        id={id} type={type}
        value={value ?? ""}
        onChange={e => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}

function FormSection({ title, source, children, defaultOpen = true }: {
  title: string; source?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium flex-shrink-0">{title}</span>
          {source && (
            <span className="text-xs text-muted-foreground truncate">{source}</span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
      </button>
      {open && (
        <div className="p-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Tools Panel ────────────────────────────────────────────────
function ToolsPanel() {
  const [showEmails, setShowEmails] = useState(false);
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2 flex-wrap">
        <CardTitle className="text-sm font-medium">Marketing Platforms</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowEmails(!showEmails)}
          className="gap-1 text-xs text-muted-foreground"
        >
          {showEmails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showEmails ? "Hide" : "Show"} logins
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TOOLS.map(tool => (
            <div
              key={tool.name}
              className="border rounded-lg p-3 flex flex-col gap-2 hover-elevate"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${tool.color} bg-muted px-1.5 py-0.5 rounded`}>
                    {tool.icon}
                  </span>
                  <span className="text-sm font-medium">{tool.name}</span>
                </div>
              </div>
              {showEmails && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{tool.email}</span>
                </div>
              )}
              {tool.note && (
                <p className="text-xs text-amber-600">{tool.note}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs"
                onClick={() => window.open(tool.url, "_blank")}
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Weekly Guide Data ──────────────────────────────────────────
const GUIDE_STEPS = [
  {
    title: "Step 1 — Meta Ads Manager",
    short: "Amount spent, link clicks, impressions",
    detail: `Go to business.facebook.com → Ads Manager → Campaigns tab
Set date range to Monday–Sunday of the week you are reporting
Make sure these columns are visible: Amount Spent, Link Clicks, Impressions. If missing click "Columns: Performance" → Customize columns → add them
Enter Amount Spent in dollars and cents (e.g. 164.94)
Enter Link Clicks (not "Clicks all" — specifically Link Clicks)
Enter Impressions
Note: Conversions shown in Meta may differ from GA4 — use GA4 as your source of truth for signups`,
  },
  {
    title: "Step 2 — Google Ads",
    short: "Cost, clicks, impressions",
    detail: `Go to ads.google.com → Campaigns tab
Set date range to Monday–Sunday of the week you are reporting
Enter Cost, Clicks, and Impressions for the week`,
  },
  {
    title: "Step 3 — GA4 Traffic Sources",
    short: "Total visitors by channel",
    detail: `Go to analytics.google.com
In the left sidebar click Reports → expand Generate leads → click User acquisition
In the top right set date range to Custom → Monday–Sunday of the week you are reporting
Read the Total row for Total Visitors
Enter each channel row individually: Paid Search + Paid Other combined = Paid Search field; Paid Social = Paid Social field; Direct = Direct field; Organic Search = Organic Search field; Organic Social = Social field; Referral = Referral field
Exclude: Unassigned, Cross-network`,
  },
  {
    title: "Step 4 — GA4 Conversion Funnel",
    short: "Key event counts",
    detail: `Stay in analytics.google.com
In the left sidebar click Reports → expand Understand web and/or app t... → expand View user engagement & retention → click Events
Confirm date range is still set to Monday–Sunday of the week you are reporting
In the bottom right change Rows per page to 25 to show all events
Find each event by name and enter its Event count value
If an event does not appear in the list enter 0`,
  },
  {
    title: "Step 5 — GA4 Engagement",
    short: "Feature usage events",
    detail: `Stay on the same GA4 Events screen from Step 4
Find each engagement event by name and enter its Event count value
If an event does not appear in the list enter 0`,
  },
  {
    title: "Step 6 — Google Search Console",
    short: "Impressions, clicks, avg position",
    detail: `Go to search.google.com/search-console
In the left sidebar click Performance
In the top left set date range to Custom → Monday–Sunday of the week you are reporting
Make sure Total clicks and Total impressions are checked (highlighted in color) at the top
Also check Average position to confirm the value
Enter Organic Impressions, Organic Clicks, and Avg Position from the metric cards at the top`,
  },
  {
    title: "Step 7 — Save and review",
    short: "Notes, save, check insights",
    detail: `Add any notes about the week (new campaigns launched, site changes, anomalies)
Click Save Snapshot
Review dashboard for any unexpected changes week over week`,
  },
];

function WeeklyGuide() {
  const [open, setOpen] = useState(false);
  const [openStep, setOpenStep] = useState<number | null>(null);

  return (
    <div className="mb-6 border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium flex-1">How to enter weekly data</span>
        <span className="text-xs text-muted-foreground mr-2">7 steps — open each for details</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="divide-y">
          {GUIDE_STEPS.map((step, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenStep(openStep === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{step.short}</div>
                </div>
                {openStep === i
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                }
              </button>

              {openStep === i && (
                <div className="px-4 pb-4 pt-1">
                  <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "inherit" }}>
                    {step.detail}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Reporting() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Auth
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== "admin" && data.role !== "auditor") {
            toast({ title: "Access Denied", description: "Admin privileges required.", variant: "destructive" });
            setLocation("/admin/login");
            return;
          }
          setUserRole(data.role);
        } else {
          setLocation("/admin/login");
        }
      } catch {
        setLocation("/admin/login");
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkAdminAuth();
  }, []);

  const isAuditor = userRole === "auditor";

  // Data
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Snapshot, "id">>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "funnel" | "ads" | "seo" | "engagement">("overview");

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const r = await fetch("/api/admin/reporting/snapshots");
      if (!r.ok) throw new Error();
      setSnapshots(await r.json());
    } catch {
      toast({ title: "Error", description: "Failed to load reporting data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!isAuthChecking) loadSnapshots(); }, [isAuthChecking]);

  const set = (key: keyof typeof form) => (val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  const openNew = () => {
    setForm({ ...EMPTY_FORM, weekStart: getMondayOfWeek() });
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEdit = (s: Snapshot) => {
    const { id, ...rest } = s;
    setForm({
      ...rest,
      metaSpend: (rest.metaSpend || 0) / 100,
      googleSpend: (rest.googleSpend || 0) / 100,
    });
    setEditingId(id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const saveSnapshot = async () => {
    if (!form.weekStart) {
      toast({ title: "Error", description: "Week start date is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/reporting/snapshots/${editingId}`
        : "/api/admin/reporting/snapshots";
      const method = editingId ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          metaSpend: Math.round((form.metaSpend || 0) * 100),
          googleSpend: Math.round((form.googleSpend || 0) * 100),
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Save failed");
      }
      toast({ title: "Saved", description: `Week of ${formatWeek(form.weekStart)} saved.` });
      cancelForm();
      loadSnapshots();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteSnapshot = async (id: string, weekStart: string) => {
    if (!confirm(`Delete snapshot for week of ${formatWeek(weekStart)}?`)) return;
    try {
      const r = await fetch(`/api/admin/reporting/snapshots/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast({ title: "Deleted", description: "Snapshot removed." });
      loadSnapshots();
    } catch {
      toast({ title: "Error", description: "Failed to delete snapshot", variant: "destructive" });
    }
  };

  // Derived
  const latest = snapshots[0];
  const previous = snapshots[1];
  const trend = (key: keyof Snapshot) => {
    if (!latest || !previous) return undefined;
    const a = Number(latest[key]) || 0;
    const b = Number(previous[key]) || 0;
    if (b === 0) return undefined;
    return ((a - b) / b) * 100;
  };
  const totalSpend = (s: Snapshot) => (s.metaSpend || 0) + (s.googleSpend || 0);
  const totalClicks = (s: Snapshot) => (s.metaClicks || 0) + (s.googleClicks || 0);
  const totalPaidConversions = (s: Snapshot) => s.signupPaidConfirmed || 0;

  const chartData = [...snapshots].reverse().map(s => ({
    week: formatWeek(s.weekStart),
    visitors: s.totalVisitors || 0,
    freeSignups: s.signupFreeInitiated || 0,
    paidSignups: s.signupPaidConfirmed || 0,
    dealAnalysis: s.dealAnalysisVisited || 0,
    metaSpend: (s.metaSpend || 0) / 100,
    googleSpend: (s.googleSpend || 0) / 100,
    cpa: totalPaidConversions(s) > 0 ? (totalSpend(s) / 100) / totalPaidConversions(s) : 0,
    organicClicks: s.organicClicks || 0,
    avgPosition: (s.avgPosition || 0) / 10,
  }));

  const trafficSourceData = latest ? [
    { name: "Direct", value: latest.directVisitors || 0 },
    { name: "Paid", value: latest.paidVisitors || 0 },
    { name: "Organic", value: latest.organicVisitors || 0 },
    { name: "Social", value: latest.socialVisitors || 0 },
    { name: "Referral", value: latest.referralVisitors || 0 },
  ].filter(d => d.value > 0) : [];

  const TABS = ["overview", "funnel", "ads", "seo", "engagement"] as const;

  if (isAuthChecking) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Marketing Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Weekly performance snapshots — RE Data Metrix
            </p>
          </div>
          {!showForm && !isAuditor && (
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Add Week
            </Button>
          )}
        </div>

        <ToolsPanel />
        <WeeklyGuide />

        {/* ── Entry Form ───────────────────────────────────────── */}
        {showForm && !isAuditor && (
          <Card className="mb-8 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-2">
              <CardTitle className="text-base">
                {editingId ? "Edit Week" : "Add Week"} —{" "}
                {form.weekStart ? `Week of ${formatWeek(form.weekStart)}` : "Select a date"}
              </CardTitle>
              <button onClick={cancelForm}><X className="w-4 h-4 text-muted-foreground" /></button>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid grid-cols-1 gap-2 max-w-xs">
                <Field
                  label="Week Start Date (Monday)"
                  id="weekStart" value={form.weekStart}
                  onChange={set("weekStart")} type="date"
                  help="Always use Monday as the start of the week for consistency."
                />
              </div>

              <FormSection title="Ad Spend (Meta + Google)" source="Meta Ads Manager / Google Ads" defaultOpen={false}>
                <Field label="Meta Spend ($)" id="metaSpend" value={form.metaSpend} onChange={set("metaSpend")}
                  help="Meta Ads Manager → Campaigns → Amount spent. Enter as dollars: $150.00 → type 150." />
                <Field label="Meta Clicks" id="metaClicks" value={form.metaClicks} onChange={set("metaClicks")}
                  help="Meta Ads Manager → Campaigns → Link clicks." />
                <Field label="Meta Impressions" id="metaImpressions" value={form.metaImpressions} onChange={set("metaImpressions")}
                  help="Meta Ads Manager → Campaigns → Impressions." />
                <Field label="Google Spend ($)" id="googleSpend" value={form.googleSpend} onChange={set("googleSpend")}
                  help="Google Ads → Campaigns → Cost. Enter as dollars: $89.50 → type 89.50." />
                <Field label="Google Clicks" id="googleClicks" value={form.googleClicks} onChange={set("googleClicks")}
                  help="Google Ads → Campaigns → Clicks." />
                <Field label="Google Impressions" id="googleImpressions" value={form.googleImpressions} onChange={set("googleImpressions")}
                  help="Google Ads → Campaigns → Impressions." />
              </FormSection>

              <FormSection title="Traffic Sources" source="Google Analytics 4 — User Acquisition">
                <Field label="Total Visitors" id="totalVisitors" value={form.totalVisitors} onChange={set("totalVisitors")}
                  help="GA4 → Reports → Generate leads → User acquisition → Total row. Set date range to Mon–Sun." />
                <Field label="Paid Search" id="paidVisitors" value={form.paidVisitors} onChange={set("paidVisitors")}
                  help="GA4 → User acquisition → Paid Search + Paid Other rows combined." />
                <Field label="Paid Social" id="paidSocialVisitors" value={form.paidSocialVisitors} onChange={set("paidSocialVisitors")}
                  help="GA4 → User acquisition → Paid Social row." />
                <Field label="Direct" id="directVisitors" value={form.directVisitors} onChange={set("directVisitors")}
                  help="GA4 → User acquisition → Direct row." />
                <Field label="Organic Search" id="organicVisitors" value={form.organicVisitors} onChange={set("organicVisitors")}
                  help="GA4 → User acquisition → Organic Search row." />
                <Field label="Social" id="socialVisitors" value={form.socialVisitors} onChange={set("socialVisitors")}
                  help="GA4 → User acquisition → Organic Social row." />
                <Field label="Referral" id="referralVisitors" value={form.referralVisitors} onChange={set("referralVisitors")}
                  help="GA4 → User acquisition → Referral row." />
              </FormSection>

              <FormSection title="Conversion Funnel" source="Google Analytics 4 — Events">
                <Field label="signup_free_initiated" id="signupFreeInitiated" value={form.signupFreeInitiated} onChange={set("signupFreeInitiated")}
                  help="GA4 → Reports → Events → Event count for signup_free_initiated." />
                <Field label="signup_free_confirmed" id="signupFreeConfirmed" value={form.signupFreeConfirmed} onChange={set("signupFreeConfirmed")}
                  help="GA4 → Events → Event count for signup_free_confirmed. Fires on /verify-email/[token] (no ?plan= in URL)." />
                <Field label="signup_paid_initiated" id="signupPaidInitiated" value={form.signupPaidInitiated} onChange={set("signupPaidInitiated")}
                  help="GA4 → Events → Event count for signup_paid_initiated. Fires on visits to /checkout?plan=monthly or /checkout?plan=annual." />
                <Field label="signup_paid_complete" id="signupPaidComplete" value={form.signupPaidComplete} onChange={set("signupPaidComplete")}
                  help="GA4 → Events → Event count for signup_paid_complete (reached /checkout/success)." />
                <Field label="signup_paid_confirmed" id="signupPaidConfirmed" value={form.signupPaidConfirmed} onChange={set("signupPaidConfirmed")}
                  help="GA4 → Events → Event count for signup_paid_confirmed. Fires on /verify-email/[token]?plan=monthly or ?plan=annual." />
                <Field label="login_success" id="loginSuccess" value={form.loginSuccess} onChange={set("loginSuccess")}
                  help="GA4 → Events → Event count for login_success (reached /portal/dashboard)." />
              </FormSection>

              <FormSection title="Engagement" source="Google Analytics 4 — Events">
                <Field label="deal_analysis_visited" id="dealAnalysisVisited" value={form.dealAnalysisVisited} onChange={set("dealAnalysisVisited")}
                  help="GA4 → Events → Event count for deal_analysis_visited." />
                <Field label="deal_analysis_submitted" id="dealAnalysisSubmitted" value={form.dealAnalysisSubmitted} onChange={set("dealAnalysisSubmitted")}
                  help="GA4 → Events → Event count for deal_analysis_submitted." />
                <Field label="lenders_visited" id="lendersVisited" value={form.lendersVisited} onChange={set("lendersVisited")}
                  help="GA4 → Events → Event count for lenders_visited." />
                <Field label="toolbox_visited" id="toolboxVisited" value={form.toolboxVisited} onChange={set("toolboxVisited")}
                  help="GA4 → Events → Event count for toolbox_visited." />
                <Field label="pricing_cta_clicked" id="pricingCtaClicked" value={form.pricingCtaClicked} onChange={set("pricingCtaClicked")}
                  help="GA4 → Events → Event count for pricing_cta_clicked." />
              </FormSection>

              <FormSection title="SEO — Google Search Console" source="Google Search Console — Performance" defaultOpen={false}>
                <Field label="Organic Impressions" id="organicImpressions" value={form.organicImpressions} onChange={set("organicImpressions")}
                  help="Search Console → Performance → Total impressions. Set date range Mon–Sun." />
                <Field label="Organic Clicks" id="organicClicks" value={form.organicClicks} onChange={set("organicClicks")}
                  help="Search Console → Performance → Total clicks." />
                <Field label="Avg Position (×10)" id="avgPosition" value={form.avgPosition} onChange={set("avgPosition")}
                  help="Search Console → Performance → Average position. Multiply by 10 to store as integer: position 12.3 = enter 123." />
              </FormSection>

              <div className="flex flex-col gap-1">
                <Label htmlFor="notes" className="text-xs text-muted-foreground">
                  Notes / Observations
                  <HelpTip text="What happened this week? Campaigns launched, site changes, budget changes, notable events." />
                </Label>
                <Textarea
                  id="notes" value={form.notes || ""}
                  onChange={e => set("notes")(e.target.value)}
                  placeholder="e.g. Launched new Meta campaign targeting RE investors. Increased Google Ads budget by $200."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={saveSnapshot} disabled={saving}>
                  {saving ? "Saving..." : "Save Snapshot"}
                </Button>
                <Button variant="outline" onClick={cancelForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── No Data State ─────────────────────────────────────── */}
        {!loading && snapshots.length === 0 && (
          <Card className="text-center py-16">
            <CardContent>
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">No data yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first weekly snapshot to start tracking performance.
              </p>
              {!isAuditor && (
                <Button onClick={openNew} className="gap-2">
                  <Plus className="w-4 h-4" /> Add This Week
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Dashboard ─────────────────────────────────────────── */}
        {!loading && snapshots.length > 0 && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
              <MetricCard
                title="Total Visitors"
                value={fmt(latest.totalVisitors)}
                icon={Users} color="blue"
                trend={trend("totalVisitors")}
              />
              <MetricCard
                title="Free Signups"
                value={fmt(latest.signupFreeInitiated)}
                sub={`${pct(latest.signupFreeInitiated, latest.totalVisitors)} conversion`}
                icon={TrendingUp} color="green"
                trend={trend("signupFreeInitiated")}
              />
              <MetricCard
                title="Paid Signups"
                value={fmt(latest.signupPaidConfirmed)}
                sub={`${cpa(totalSpend(latest), totalPaidConversions(latest))} CPA`}
                icon={DollarSign} color="amber"
                trend={trend("signupPaidConfirmed")}
              />
              <MetricCard
                title="Deal Analyses"
                value={fmt(latest.dealAnalysisVisited)}
                sub={`${pct(latest.dealAnalysisVisited, latest.totalVisitors)} of visitors`}
                icon={MousePointer} color="purple"
                trend={trend("dealAnalysisVisited")}
              />
            </div>

            {/* Ad Spend Summary — only show if data exists */}
            {(latest.metaSpend > 0 || latest.googleSpend > 0) && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <MetricCard title="Meta Spend" value={dollars(latest.metaSpend)} icon={DollarSign} color="blue" />
                <MetricCard title="Google Spend" value={dollars(latest.googleSpend)} icon={DollarSign} color="amber" />
                <MetricCard
                  title="Total Ad Spend"
                  value={dollars(totalSpend(latest))}
                  sub={`${fmt(totalClicks(latest))} clicks total`}
                  icon={MousePointer} color="purple"
                />
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-muted/40 rounded-lg p-1 w-fit flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize
                    ${activeTab === tab
                      ? "bg-white shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ─────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Weekly Visitors</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} dot={false} name="Visitors" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Traffic Sources — This Week</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={trafficSourceData} cx="50%" cy="50%" outerRadius={80}
                          dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {trafficSourceData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Signups Over Time</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="freeSignups" fill="#10b981" name="Free Signups" />
                        <Bar dataKey="paidSignups" fill="#f59e0b" name="Paid Signups" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Deal Analysis Usage</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="dealAnalysis" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Analyses Run" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Funnel Tab ───────────────────────────────────── */}
            {activeTab === "funnel" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Conversion Funnel — This Week</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { label: "Total Visitors", val: latest.totalVisitors, color: "bg-blue-500" },
                        { label: "Free Signup Initiated", val: latest.signupFreeInitiated, color: "bg-blue-400" },
                        { label: "Free Signup Confirmed", val: latest.signupFreeConfirmed, color: "bg-green-500" },
                        { label: "Paid Signup Initiated", val: latest.signupPaidInitiated, color: "bg-amber-400" },
                        { label: "Paid Signup Complete", val: latest.signupPaidComplete, color: "bg-amber-500" },
                        { label: "Paid Signup Confirmed", val: latest.signupPaidConfirmed, color: "bg-amber-600" },
                        { label: "Login Success", val: latest.loginSuccess, color: "bg-purple-500" },
                      ].map((row) => {
                        const width = latest.totalVisitors > 0
                          ? Math.max(4, (row.val / latest.totalVisitors) * 100)
                          : 0;
                        return (
                          <div key={row.label}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span className="font-medium">
                                {fmt(row.val)}
                                <span className="text-muted-foreground text-xs ml-2">
                                  {pct(row.val, latest.totalVisitors)}
                                </span>
                              </span>
                            </div>
                            <div className="h-6 bg-muted rounded overflow-hidden">
                              <div
                                className={`h-full ${row.color} rounded transition-all`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Free → Paid Conversion Rate</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-semibold">{fmt(latest.signupFreeConfirmed)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Free Accounts</p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{fmt(latest.signupPaidComplete)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Paid Accounts</p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-amber-600">
                          {pct(latest.signupPaidComplete, latest.signupFreeConfirmed)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Free → Paid Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Ads Tab ──────────────────────────────────────── */}
            {activeTab === "ads" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricCard title="Total Spend" value={dollars(totalSpend(latest))} icon={DollarSign} color="blue" />
                  <MetricCard title="Total Clicks" value={fmt(totalClicks(latest))} icon={MousePointer} color="green" />
                  <MetricCard
                    title="Avg Cost Per Click"
                    value={totalClicks(latest) > 0
                      ? `$${(totalSpend(latest) / 100 / totalClicks(latest)).toFixed(2)}`
                      : "—"}
                    icon={TrendingUp} color="amber"
                  />
                  <MetricCard
                    title="Cost Per Paid Signup"
                    value={cpa(totalSpend(latest), totalPaidConversions(latest))}
                    icon={Users} color="purple"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Meta vs Google Spend</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                          <RechartsTooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
                          <Legend />
                          <Bar dataKey="metaSpend" fill="#3b82f6" name="Meta ($)" />
                          <Bar dataKey="googleSpend" fill="#f59e0b" name="Google ($)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Cost Per Acquisition Trend</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={chartData.filter(d => d.cpa > 0)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                          <RechartsTooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
                          <Line type="monotone" dataKey="cpa" stroke="#ef4444" strokeWidth={2} dot={false} name="CPA ($)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Platform breakdown table */}
                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Platform Breakdown — This Week</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="text-left py-2">Platform</th>
                            <th className="text-right py-2">Spend</th>
                            <th className="text-right py-2">Clicks</th>
                            <th className="text-right py-2">Impressions</th>
                            <th className="text-right py-2">CPC</th>
                            <th className="text-right py-2">CTR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: "Meta Ads", spend: latest.metaSpend, clicks: latest.metaClicks, impressions: latest.metaImpressions },
                            { name: "Google Ads", spend: latest.googleSpend, clicks: latest.googleClicks, impressions: latest.googleImpressions },
                          ].map(row => (
                            <tr key={row.name} className="border-b last:border-0">
                              <td className="py-2 font-medium">{row.name}</td>
                              <td className="text-right">{dollars(row.spend)}</td>
                              <td className="text-right">{fmt(row.clicks)}</td>
                              <td className="text-right">{fmt(row.impressions)}</td>
                              <td className="text-right">
                                {row.clicks > 0 ? `$${(row.spend / 100 / row.clicks).toFixed(2)}` : "—"}
                              </td>
                              <td className="text-right">{pct(row.clicks, row.impressions)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── SEO Tab ──────────────────────────────────────── */}
            {activeTab === "seo" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard
                    title="Organic Impressions"
                    value={fmt(latest.organicImpressions)}
                    icon={BarChart3} color="blue"
                    trend={trend("organicImpressions")}
                  />
                  <MetricCard
                    title="Organic Clicks"
                    value={fmt(latest.organicClicks)}
                    sub={`${pct(latest.organicClicks, latest.organicImpressions)} CTR`}
                    icon={MousePointer} color="green"
                    trend={trend("organicClicks")}
                  />
                  <MetricCard
                    title="Avg Position"
                    value={(latest.avgPosition / 10).toFixed(1)}
                    sub="Lower = better"
                    icon={TrendingUp} color="amber"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Organic Clicks Over Time</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip />
                          <Line type="monotone" dataKey="organicClicks" stroke="#10b981" strokeWidth={2} dot={false} name="Organic Clicks" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Average Position Trend
                        <HelpTip text="Lower is better. Position 1 = top of Google search results." />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData.filter(d => d.avgPosition > 0)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                          <YAxis reversed tick={{ fontSize: 11 }} />
                          <RechartsTooltip />
                          <Line type="monotone" dataKey="avgPosition" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Avg Position" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ── Engagement Tab ───────────────────────────────── */}
            {activeTab === "engagement" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricCard title="Deal Analysis Visits" value={fmt(latest.dealAnalysisVisited)} icon={BarChart3} color="purple" trend={trend("dealAnalysisVisited")} />
                  <MetricCard
                    title="Analyses Submitted"
                    value={fmt(latest.dealAnalysisSubmitted)}
                    sub={`${pct(latest.dealAnalysisSubmitted, latest.dealAnalysisVisited)} submit rate`}
                    icon={MousePointer} color="blue"
                    trend={trend("dealAnalysisSubmitted")}
                  />
                  <MetricCard title="Lenders Visited" value={fmt(latest.lendersVisited)} icon={Users} color="green" trend={trend("lendersVisited")} />
                  <MetricCard title="Toolbox Visited" value={fmt(latest.toolboxVisited)} icon={TrendingUp} color="amber" trend={trend("toolboxVisited")} />
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Page Engagement — % of Visitors</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { label: "Deal Analysis — Visited", val: latest.dealAnalysisVisited },
                        { label: "Deal Analysis — Submitted", val: latest.dealAnalysisSubmitted },
                        { label: "Lenders Page", val: latest.lendersVisited },
                        { label: "Toolbox Page", val: latest.toolboxVisited },
                        { label: "Pricing CTA Clicked", val: latest.pricingCtaClicked },
                      ].map(row => {
                        const width = latest.totalVisitors > 0
                          ? Math.max(2, (row.val / latest.totalVisitors) * 100)
                          : 0;
                        return (
                          <div key={row.label}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span className="font-medium">
                                {fmt(row.val)}
                                <span className="text-muted-foreground text-xs ml-2">
                                  {pct(row.val, latest.totalVisitors)}
                                </span>
                              </span>
                            </div>
                            <div className="h-4 bg-muted rounded overflow-hidden">
                              <div className="h-full bg-blue-500 rounded" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── History Table ─────────────────────────────────── */}
            <Card className="mt-8">
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-medium">Weekly History</CardTitle>
                {!isAuditor && (
                  <Button variant="outline" size="sm" onClick={openNew} className="gap-1 text-xs">
                    <Plus className="w-3 h-3" /> Add Week
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left py-2">Week of</th>
                        <th className="text-right py-2">Visitors</th>
                        <th className="text-right py-2">Free</th>
                        <th className="text-right py-2">Paid</th>
                        <th className="text-right py-2">Analyses</th>
                        <th className="text-right py-2">Ad Spend</th>
                        <th className="text-right py-2">CPA</th>
                        {!isAuditor && <th className="text-right py-2"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map(s => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 font-medium">
                            {formatWeek(s.weekStart)}
                            {s.notes && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="ml-2 text-xs text-muted-foreground cursor-help">[note]</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">{s.notes}</TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                          <td className="text-right">{fmt(s.totalVisitors)}</td>
                          <td className="text-right">{fmt(s.signupFreeConfirmed)}</td>
                          <td className="text-right">{fmt(s.signupPaidComplete)}</td>
                          <td className="text-right">{fmt(s.dealAnalysisVisited)}</td>
                          <td className="text-right">{dollars(totalSpend(s))}</td>
                          <td className="text-right">{cpa(totalSpend(s), totalPaidConversions(s))}</td>
                          {!isAuditor && (
                            <td className="text-right">
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button onClick={() => deleteSnapshot(s.id, s.weekStart)} className="text-muted-foreground hover:text-red-500">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
