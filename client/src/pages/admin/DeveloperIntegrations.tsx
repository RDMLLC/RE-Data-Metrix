import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft,
  Plus,
  Settings,
  Zap,
  Link2,
  FileText,
  History,
  Loader2,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  Edit,
  RefreshCw,
  Key,
  Webhook,
  Database,
  Upload,
  Download
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface IntegrationConfig {
  id: string;
  provider: string;
  name: string;
  isActive: boolean;
  credentials: { configured: boolean } | null;
  settings: Record<string, any> | null;
  lastSyncAt: string | null;
  createdAt: string;
}

interface EventTrigger {
  id: string;
  integrationId: string;
  eventType: string;
  isEnabled: boolean;
  targetModule: string | null;
  settings: Record<string, any> | null;
}

interface FieldMapping {
  id: string;
  integrationId: string;
  eventType: string;
  sourceField: string;
  targetField: string;
  transformType: string | null;
  isRequired: boolean;
}

interface IntegrationWebhook {
  id: string;
  integrationId: string | null;
  name: string;
  endpoint: string;
  secretToken: string;
  isActive: boolean;
  allowedActions: string[] | null;
  lastCalledAt: string | null;
  callCount: number;
}

interface SyncLog {
  id: string;
  integrationId: string | null;
  eventType: string;
  status: string;
  direction: string;
  recordId: string | null;
  requestData: Record<string, any> | null;
  responseData: Record<string, any> | null;
  errorMessage: string | null;
  createdAt: string;
}

const EVENT_TYPES = [
  { value: 'user_signup', label: 'User Signup', description: 'When a new user registers' },
  { value: 'lender_signup', label: 'Lender Signup', description: 'When a new lender registers' },
  { value: 'payment_success', label: 'Payment Success', description: 'When a subscription payment succeeds' },
  { value: 'payment_failed', label: 'Payment Failed', description: 'When a subscription payment fails' },
  { value: 'subscription_created', label: 'Subscription Created', description: 'When a new subscription is created' },
  { value: 'subscription_cancelled', label: 'Subscription Cancelled', description: 'When a subscription is cancelled' },
  { value: 'deal_analysis_created', label: 'Deal Analysis Created', description: 'When a user creates a deal analysis' },
  { value: 'inquiry_submitted', label: 'Inquiry Submitted', description: 'When an investor submits an inquiry' },
];

const USER_FIELDS = [
  'id', 'username', 'email', 'role', 'subscriptionStatus', 'createdAt',
  'profile.fullName', 'profile.phone', 'profile.state', 'profile.city'
];

const LENDER_FIELDS = [
  'id', 'companyName', 'contactName', 'email', 'phone', 'status', 'createdAt'
];

export default function DeveloperIntegrations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("connections");
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  
  // Dialog states
  const [showCreateConnection, setShowCreateConnection] = useState(false);
  const [showCreateTrigger, setShowCreateTrigger] = useState(false);
  const [showCreateMapping, setShowCreateMapping] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadedMappings, setUploadedMappings] = useState<any[]>([]);
  
  // Form states
  const [newConnection, setNewConnection] = useState({ provider: 'zoho', name: '', clientId: '', clientSecret: '' });
  const [newTrigger, setNewTrigger] = useState({ eventType: '', targetModule: '' });
  const [newMapping, setNewMapping] = useState({ eventType: '', sourceField: '', targetField: '', transformType: 'none' });
  const [newWebhook, setNewWebhook] = useState({ name: '', allowedActions: '' });

  // Check auth
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'developer'))) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  // Queries
  const { data: configs = [], isLoading: configsLoading } = useQuery<IntegrationConfig[]>({
    queryKey: ["/api/integrations/configs"],
    enabled: !authLoading && !!user,
  });

  const { data: triggers = [] } = useQuery<EventTrigger[]>({
    queryKey: ["/api/integrations/configs", selectedIntegration, "triggers"],
    enabled: !!selectedIntegration,
    queryFn: async () => {
      const res = await fetch(`/api/integrations/configs/${selectedIntegration}/triggers`, { credentials: 'include' });
      return res.json();
    }
  });

  const { data: mappings = [] } = useQuery<FieldMapping[]>({
    queryKey: ["/api/integrations/configs", selectedIntegration, "mappings"],
    enabled: !!selectedIntegration,
    queryFn: async () => {
      const res = await fetch(`/api/integrations/configs/${selectedIntegration}/mappings`, { credentials: 'include' });
      return res.json();
    }
  });

  const { data: webhooks = [] } = useQuery<IntegrationWebhook[]>({
    queryKey: ["/api/integrations/webhooks"],
    enabled: !authLoading && !!user,
  });

  const { data: syncLogs = [] } = useQuery<SyncLog[]>({
    queryKey: ["/api/integrations/sync-logs"],
    enabled: !authLoading && !!user,
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/integrations/configs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs"] });
      setShowCreateConnection(false);
      setNewConnection({ provider: 'zoho', name: '', clientId: '', clientSecret: '' });
      toast({ title: "Connection Created", description: "Your CRM connection has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/integrations/configs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs"] });
      toast({ title: "Updated", description: "Connection updated successfully." });
    }
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/integrations/configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs"] });
      setSelectedIntegration(null);
      toast({ title: "Deleted", description: "Connection deleted successfully." });
    }
  });

  const createTriggerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/integrations/configs/${selectedIntegration}/triggers`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs", selectedIntegration, "triggers"] });
      setShowCreateTrigger(false);
      setNewTrigger({ eventType: '', targetModule: '' });
      toast({ title: "Trigger Created", description: "Event trigger has been created." });
    }
  });

  const updateTriggerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/integrations/triggers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs", selectedIntegration, "triggers"] });
    }
  });

  const createMappingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/integrations/configs/${selectedIntegration}/mappings`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs", selectedIntegration, "mappings"] });
      setShowCreateMapping(false);
      setNewMapping({ eventType: '', sourceField: '', targetField: '', transformType: 'none' });
      toast({ title: "Mapping Created", description: "Field mapping has been created." });
    }
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/integrations/mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs", selectedIntegration, "mappings"] });
      toast({ title: "Deleted", description: "Mapping deleted." });
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (mappings: any[]) => {
      const res = await apiRequest("POST", `/api/integrations/configs/${selectedIntegration}/mappings/bulk`, { mappings });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/configs", selectedIntegration, "mappings"] });
      setShowBulkUpload(false);
      setUploadedMappings([]);
      if (data.errors?.length > 0) {
        toast({ 
          title: "Partial Success", 
          description: `Created ${data.created} mappings. ${data.errors.length} errors occurred.`,
          variant: "destructive"
        });
      } else {
        toast({ title: "Upload Complete", description: `Successfully created ${data.created} field mappings.` });
      }
    },
    onError: () => {
      toast({ title: "Upload Failed", description: "Failed to upload mappings. Please check your file format.", variant: "destructive" });
    }
  });

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          toast({ title: "Invalid File", description: "CSV must have a header row and at least one data row.", variant: "destructive" });
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const eventTypeIdx = headers.findIndex(h => h === 'eventtype' || h === 'event_type' || h === 'event');
        const sourceFieldIdx = headers.findIndex(h => h === 'sourcefield' || h === 'source_field' || h === 'source');
        const targetFieldIdx = headers.findIndex(h => h === 'targetfield' || h === 'target_field' || h === 'target');
        const transformIdx = headers.findIndex(h => h === 'transformtype' || h === 'transform_type' || h === 'transform');

        if (eventTypeIdx === -1 || sourceFieldIdx === -1 || targetFieldIdx === -1) {
          toast({ 
            title: "Invalid Headers", 
            description: "CSV must have columns: eventType (or event), sourceField (or source), targetField (or target)", 
            variant: "destructive" 
          });
          return;
        }

        const parsedMappings = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values[eventTypeIdx] && values[sourceFieldIdx] && values[targetFieldIdx]) {
            parsedMappings.push({
              eventType: values[eventTypeIdx],
              sourceField: values[sourceFieldIdx],
              targetField: values[targetFieldIdx],
              transformType: transformIdx !== -1 ? values[transformIdx] || 'none' : 'none',
              isRequired: false
            });
          }
        }

        setUploadedMappings(parsedMappings);
        toast({ title: "File Parsed", description: `Found ${parsedMappings.length} mappings to import.` });
      } catch (err) {
        toast({ title: "Parse Error", description: "Failed to parse CSV file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const createWebhookMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/integrations/webhooks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/webhooks"] });
      setShowCreateWebhook(false);
      setNewWebhook({ name: '', allowedActions: '' });
      toast({ title: "Webhook Created", description: "Inbound webhook endpoint has been created." });
    }
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/integrations/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/webhooks"] });
      toast({ title: "Deleted", description: "Webhook deleted." });
    }
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  if (authLoading || configsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Developer Integration Portal</h1>
              <p className="text-muted-foreground">Configure CRM connections, webhooks, and data sync</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="connections" className="gap-2" data-testid="tab-connections">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Connections</span>
            </TabsTrigger>
            <TabsTrigger value="triggers" className="gap-2" data-testid="tab-triggers">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Triggers</span>
            </TabsTrigger>
            <TabsTrigger value="mappings" className="gap-2" data-testid="tab-mappings">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Mappings</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2" data-testid="tab-webhooks">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2" data-testid="tab-logs">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">CRM Connections</h2>
              <Button onClick={() => setShowCreateConnection(true)} data-testid="button-create-connection">
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </div>

            {configs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Connections Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first CRM connection to start syncing data.</p>
                  <Button onClick={() => setShowCreateConnection(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Connection
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {configs.map((config) => (
                  <Card key={config.id} className={selectedIntegration === config.id ? "ring-2 ring-primary" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{config.name}</CardTitle>
                          <CardDescription className="capitalize">{config.provider} CRM</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {config.credentials?.configured && (
                          <Badge variant="outline" className="gap-1">
                            <Key className="h-3 w-3" />
                            Configured
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {config.lastSyncAt ? (
                            <>Last sync: {formatDistanceToNow(new Date(config.lastSyncAt))} ago</>
                          ) : (
                            <>Created: {format(new Date(config.createdAt), 'MMM d, yyyy')}</>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIntegration(config.id === selectedIntegration ? null : config.id)}
                            data-testid={`button-select-${config.id}`}
                          >
                            {selectedIntegration === config.id ? "Deselect" : "Select"}
                          </Button>
                          <Switch
                            checked={config.isActive}
                            onCheckedChange={(checked) => updateConfigMutation.mutate({ id: config.id, data: { isActive: checked } })}
                            data-testid={`switch-active-${config.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteConfigMutation.mutate(config.id)}
                            data-testid={`button-delete-${config.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Triggers Tab */}
          <TabsContent value="triggers" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Event Triggers</h2>
                <p className="text-sm text-muted-foreground">Configure which events send data to your CRM</p>
              </div>
              {selectedIntegration && (
                <Button onClick={() => setShowCreateTrigger(true)} data-testid="button-create-trigger">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trigger
                </Button>
              )}
            </div>

            {!selectedIntegration ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Connection</h3>
                  <p className="text-muted-foreground">Go to Connections and select a CRM to configure triggers.</p>
                </CardContent>
              </Card>
            ) : triggers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Triggers Configured</h3>
                  <p className="text-muted-foreground mb-4">Add triggers to sync data when events occur.</p>
                  <Button onClick={() => setShowCreateTrigger(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Trigger
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {triggers.map((trigger) => {
                  const eventInfo = EVENT_TYPES.find(e => e.value === trigger.eventType);
                  return (
                    <Card key={trigger.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Zap className={`h-5 w-5 ${trigger.isEnabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
                            <div>
                              <p className="font-medium">{eventInfo?.label || trigger.eventType}</p>
                              <p className="text-sm text-muted-foreground">{eventInfo?.description}</p>
                              {trigger.targetModule && (
                                <p className="text-xs text-muted-foreground mt-1">Target: {trigger.targetModule}</p>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={trigger.isEnabled}
                            onCheckedChange={(checked) => updateTriggerMutation.mutate({ id: trigger.id, data: { isEnabled: checked } })}
                            data-testid={`switch-trigger-${trigger.id}`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Mappings Tab */}
          <TabsContent value="mappings" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Field Mappings</h2>
                <p className="text-sm text-muted-foreground">Map platform fields to your CRM fields</p>
              </div>
              {selectedIntegration && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowBulkUpload(true)} data-testid="button-upload-mappings">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                  <Button onClick={() => setShowCreateMapping(true)} data-testid="button-create-mapping">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mapping
                  </Button>
                </div>
              )}
            </div>

            {!selectedIntegration ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Connection</h3>
                  <p className="text-muted-foreground">Go to Connections and select a CRM to configure field mappings.</p>
                </CardContent>
              </Card>
            ) : mappings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Mappings Configured</h3>
                  <p className="text-muted-foreground mb-4">Add field mappings to define how data syncs to your CRM.</p>
                  <Button onClick={() => setShowCreateMapping(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mapping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Source Field</TableHead>
                      <TableHead>Target Field</TableHead>
                      <TableHead>Transform</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">
                          {EVENT_TYPES.find(e => e.value === mapping.eventType)?.label || mapping.eventType}
                        </TableCell>
                        <TableCell><code className="bg-muted px-1 py-0.5 rounded text-sm">{mapping.sourceField}</code></TableCell>
                        <TableCell><code className="bg-muted px-1 py-0.5 rounded text-sm">{mapping.targetField}</code></TableCell>
                        <TableCell>{mapping.transformType || 'none'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMappingMutation.mutate(mapping.id)}
                            data-testid={`button-delete-mapping-${mapping.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Inbound Webhooks</h2>
                <p className="text-sm text-muted-foreground">Create endpoints for external systems to send data</p>
              </div>
              <Button onClick={() => setShowCreateWebhook(true)} data-testid="button-create-webhook">
                <Plus className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>
            </div>

            {webhooks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Webhooks Created</h3>
                  <p className="text-muted-foreground mb-4">Create webhook endpoints for external systems to call.</p>
                  <Button onClick={() => setShowCreateWebhook(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {webhooks.map((webhook) => {
                  const webhookUrl = `${window.location.origin}/api/webhooks/inbound/${webhook.endpoint}`;
                  return (
                    <Card key={webhook.id}>
                      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                        <div>
                          <CardTitle className="text-lg">{webhook.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {webhook.callCount} calls • {webhook.lastCalledAt 
                              ? `Last called ${formatDistanceToNow(new Date(webhook.lastCalledAt))} ago`
                              : 'Never called'}
                          </CardDescription>
                        </div>
                        <Badge variant={webhook.isActive ? "default" : "secondary"}>
                          {webhook.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">{webhookUrl}</code>
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl, 'URL')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Secret Token (for Authorization header)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">Bearer {webhook.secretToken.slice(0, 8)}...</code>
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(`Bearer ${webhook.secretToken}`, 'Token')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                            className="text-destructive"
                            data-testid={`button-delete-webhook-${webhook.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Sync Logs</h2>
                <p className="text-sm text-muted-foreground">View history of data sync operations</p>
              </div>
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/integrations/sync-logs"] })}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {syncLogs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Sync Activity Yet</h3>
                  <p className="text-muted-foreground">Sync logs will appear here when data is sent or received.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge variant="default" className="gap-1 bg-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {EVENT_TYPES.find(e => e.value === log.eventType)?.label || log.eventType}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.direction}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt))} ago
                        </TableCell>
                        <TableCell>
                          {log.errorMessage && (
                            <span className="text-destructive text-sm">{log.errorMessage}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Connection Dialog */}
      <Dialog open={showCreateConnection} onOpenChange={setShowCreateConnection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add CRM Connection</DialogTitle>
            <DialogDescription>Connect to your CRM to sync contacts, deals, and more.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={newConnection.provider} onValueChange={(v) => setNewConnection({ ...newConnection, provider: v })}>
                <SelectTrigger data-testid="select-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoho">Zoho CRM</SelectItem>
                  <SelectItem value="hubspot">HubSpot</SelectItem>
                  <SelectItem value="salesforce">Salesforce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input
                placeholder="e.g., Production Zoho"
                value={newConnection.name}
                onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                data-testid="input-connection-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                placeholder="Your CRM API Client ID"
                value={newConnection.clientId}
                onChange={(e) => setNewConnection({ ...newConnection, clientId: e.target.value })}
                data-testid="input-client-id"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                placeholder="Your CRM API Client Secret"
                value={newConnection.clientSecret}
                onChange={(e) => setNewConnection({ ...newConnection, clientSecret: e.target.value })}
                data-testid="input-client-secret"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateConnection(false)}>Cancel</Button>
            <Button
              onClick={() => createConfigMutation.mutate({
                provider: newConnection.provider,
                name: newConnection.name,
                credentials: { clientId: newConnection.clientId, clientSecret: newConnection.clientSecret }
              })}
              disabled={!newConnection.name || createConfigMutation.isPending}
              data-testid="button-save-connection"
            >
              {createConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Trigger Dialog */}
      <Dialog open={showCreateTrigger} onOpenChange={setShowCreateTrigger}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Event Trigger</DialogTitle>
            <DialogDescription>Choose an event that will trigger a sync to your CRM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={newTrigger.eventType} onValueChange={(v) => setNewTrigger({ ...newTrigger, eventType: v })}>
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((event) => (
                    <SelectItem key={event.value} value={event.value}>{event.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Module (optional)</Label>
              <Input
                placeholder="e.g., Contacts, Deals, Leads"
                value={newTrigger.targetModule}
                onChange={(e) => setNewTrigger({ ...newTrigger, targetModule: e.target.value })}
                data-testid="input-target-module"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTrigger(false)}>Cancel</Button>
            <Button
              onClick={() => createTriggerMutation.mutate(newTrigger)}
              disabled={!newTrigger.eventType || createTriggerMutation.isPending}
              data-testid="button-save-trigger"
            >
              {createTriggerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Mapping Dialog */}
      <Dialog open={showCreateMapping} onOpenChange={setShowCreateMapping}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Field Mapping</DialogTitle>
            <DialogDescription>Map a platform field to a CRM field.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={newMapping.eventType} onValueChange={(v) => setNewMapping({ ...newMapping, eventType: v })}>
                <SelectTrigger data-testid="select-mapping-event">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((event) => (
                    <SelectItem key={event.value} value={event.value}>{event.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source Field (Platform)</Label>
              <Select value={newMapping.sourceField} onValueChange={(v) => setNewMapping({ ...newMapping, sourceField: v })}>
                <SelectTrigger data-testid="select-source-field">
                  <SelectValue placeholder="Select source field" />
                </SelectTrigger>
                <SelectContent>
                  {(newMapping.eventType.includes('user') ? USER_FIELDS : LENDER_FIELDS).map((field) => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Field (CRM)</Label>
              <Input
                placeholder="e.g., First_Name, Email, Phone"
                value={newMapping.targetField}
                onChange={(e) => setNewMapping({ ...newMapping, targetField: e.target.value })}
                data-testid="input-target-field"
              />
            </div>
            <div className="space-y-2">
              <Label>Transform Type</Label>
              <Select value={newMapping.transformType} onValueChange={(v) => setNewMapping({ ...newMapping, transformType: v })}>
                <SelectTrigger data-testid="select-transform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="date_format">Date Format</SelectItem>
                  <SelectItem value="currency_cents">Currency (cents to dollars)</SelectItem>
                  <SelectItem value="uppercase">Uppercase</SelectItem>
                  <SelectItem value="lowercase">Lowercase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateMapping(false)}>Cancel</Button>
            <Button
              onClick={() => createMappingMutation.mutate(newMapping)}
              disabled={!newMapping.eventType || !newMapping.sourceField || !newMapping.targetField || createMappingMutation.isPending}
              data-testid="button-save-mapping"
            >
              {createMappingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Inbound Webhook</DialogTitle>
            <DialogDescription>Create an endpoint for external systems to send data to this platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook Name</Label>
              <Input
                placeholder="e.g., Zoho Contact Sync"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                data-testid="input-webhook-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Allowed Actions (comma-separated)</Label>
              <Input
                placeholder="e.g., create_user, update_user"
                value={newWebhook.allowedActions}
                onChange={(e) => setNewWebhook({ ...newWebhook, allowedActions: e.target.value })}
                data-testid="input-allowed-actions"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWebhook(false)}>Cancel</Button>
            <Button
              onClick={() => createWebhookMutation.mutate({
                name: newWebhook.name,
                allowedActions: newWebhook.allowedActions.split(',').map(s => s.trim()).filter(Boolean)
              })}
              disabled={!newWebhook.name || createWebhookMutation.isPending}
              data-testid="button-save-webhook"
            >
              {createWebhookMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Mappings Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={(open) => {
        setShowBulkUpload(open);
        if (!open) setUploadedMappings([]);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Field Mappings</DialogTitle>
            <DialogDescription>Upload a CSV file to add multiple field mappings at once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                data-testid="input-csv-upload"
              />
              <p className="text-xs text-muted-foreground">
                CSV must have columns: <code>eventType</code>, <code>sourceField</code>, <code>targetField</code>, and optionally <code>transformType</code>
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Example CSV Format:</p>
              <code className="text-xs block whitespace-pre">
{`eventType,sourceField,targetField,transformType
user_signup,email,Email,none
user_signup,profile.fullName,Full_Name,none
payment_success,amount,Payment_Amount,currency_cents`}
              </code>
            </div>

            {uploadedMappings.length > 0 && (
              <div className="space-y-2">
                <Label>Preview ({uploadedMappings.length} mappings found)</Label>
                <div className="max-h-48 overflow-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Transform</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedMappings.slice(0, 10).map((m, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{m.eventType}</TableCell>
                          <TableCell className="text-sm"><code>{m.sourceField}</code></TableCell>
                          <TableCell className="text-sm"><code>{m.targetField}</code></TableCell>
                          <TableCell className="text-sm">{m.transformType}</TableCell>
                        </TableRow>
                      ))}
                      {uploadedMappings.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            ... and {uploadedMappings.length - 10} more
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkUpload(false);
              setUploadedMappings([]);
            }}>Cancel</Button>
            <Button
              onClick={() => bulkUploadMutation.mutate(uploadedMappings)}
              disabled={uploadedMappings.length === 0 || bulkUploadMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {bulkUploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {uploadedMappings.length} Mappings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
