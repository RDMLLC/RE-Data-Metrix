import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Search,
  HardHat,
  MapPin,
  Phone,
  Mail,
  Globe,
  Loader2,
  Shield,
  Send,
  Copy,
  CheckCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Contractor, ServiceRegion } from "@shared/schema";

interface ContractorWithRegions extends Contractor {
  serviceRegions?: ServiceRegion[];
}

interface ContractorFormData {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  specialties: string[];
  licenseNumber: string;
  isInsured: boolean;
  isBonded: boolean;
  referralLink: string;
  notes: string;
  isActive: boolean;
  sortOrder: number;
  serviceRegionIds: string[];
}

interface ServiceRegionFormData {
  name: string;
  state: string;
  keyCities: string[];
  isActive: boolean;
  sortOrder: number;
}

const SPECIALTY_OPTIONS = [
  "Full Rehabs",
  "Kitchen Remodels",
  "Bathroom Remodels",
  "Roofing",
  "Foundation",
  "HVAC",
  "Electrical",
  "Plumbing",
  "New Construction",
  "Additions",
  "Basement Finishing",
  "Exterior/Siding",
  "Windows/Doors",
  "Flooring",
  "Painting",
  "Landscaping",
  "Decks/Patios",
  "General Repairs",
];

const emptyContractorForm: ContractorFormData = {
  name: '',
  companyName: '',
  phone: '',
  email: '',
  website: '',
  description: '',
  specialties: [],
  licenseNumber: '',
  isInsured: false,
  isBonded: false,
  referralLink: '',
  notes: '',
  isActive: true,
  sortOrder: 0,
  serviceRegionIds: [],
};

const emptyRegionForm: ServiceRegionFormData = {
  name: '',
  state: 'GA',
  keyCities: [],
  isActive: true,
  sortOrder: 0,
};

const stateNames: Record<string, string> = {
  GA: 'Georgia',
  AL: 'Alabama',
};

function getStateName(abbrev: string): string {
  return stateNames[abbrev] || abbrev;
}

export default function Contractors() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const isAuditor = userRole === 'auditor';
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contractorToDelete, setContractorToDelete] = useState<Contractor | null>(null);
  const [regionToDelete, setRegionToDelete] = useState<ServiceRegion | null>(null);
  const [showContractorDialog, setShowContractorDialog] = useState(false);
  const [showRegionDialog, setShowRegionDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', companyName: '' });
  const [inviteResult, setInviteResult] = useState<{ inviteUrl?: string; message?: string } | null>(null);
  const [selectedState, setSelectedState] = useState<string>("all");
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [editingContractor, setEditingContractor] = useState<ContractorWithRegions | null>(null);
  const [editingRegion, setEditingRegion] = useState<ServiceRegion | null>(null);
  const [contractorForm, setContractorForm] = useState<ContractorFormData>(emptyContractorForm);
  const [regionForm, setRegionForm] = useState<ServiceRegionFormData>(emptyRegionForm);
  
  const [keyCitiesInput, setKeyCitiesInput] = useState("");

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin' && data.role !== 'auditor') {
            toast({ title: "Access Denied", description: "Admin privileges required.", variant: "destructive" });
            setLocation("/admin/login");
            return;
          }
          setUserRole(data.role);
        } else {
          setLocation("/admin/login");
          return;
        }
      } catch {
        setLocation("/admin/login");
        return;
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkAdminAuth();
  }, [setLocation, toast]);

  const { data: contractors = [], isLoading: contractorsLoading } = useQuery<ContractorWithRegions[]>({
    queryKey: ["/api/admin/contractors"],
  });

  const { data: serviceRegions = [], isLoading: regionsLoading } = useQuery<ServiceRegion[]>({
    queryKey: ["/api/admin/service-regions"],
  });

  const saveContractorMutation = useMutation({
    mutationFn: async (data: ContractorFormData & { id?: string }) => {
      const url = data.id ? `/api/admin/contractors/${data.id}` : "/api/admin/contractors";
      const method = data.id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save contractor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contractors"] });
      toast({ title: editingContractor ? "Contractor updated" : "Contractor created" });
      setShowContractorDialog(false);
      setEditingContractor(null);
      setContractorForm(emptyContractorForm);
    },
    onError: () => {
      toast({ title: "Failed to save contractor", variant: "destructive" });
    },
  });

  const deleteContractorMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/contractors/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete contractor");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contractors"] });
      toast({ title: "Contractor deleted" });
      setContractorToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete contractor", variant: "destructive" });
    },
  });

  const saveRegionMutation = useMutation({
    mutationFn: async (data: ServiceRegionFormData & { id?: string }) => {
      const url = data.id ? `/api/admin/service-regions/${data.id}` : "/api/admin/service-regions";
      const method = data.id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save service region");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-regions"] });
      toast({ title: editingRegion ? "Service region updated" : "Service region created" });
      setShowRegionDialog(false);
      setEditingRegion(null);
      setRegionForm(emptyRegionForm);
    },
    onError: () => {
      toast({ title: "Failed to save service region", variant: "destructive" });
    },
  });

  const deleteRegionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/service-regions/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete service region");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-regions"] });
      toast({ title: "Service region deleted" });
      setRegionToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete service region", variant: "destructive" });
    },
  });

  const inviteContractorMutation = useMutation({
    mutationFn: async (data: { email: string; companyName: string }) => {
      const response = await fetch("/api/contractors/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contractors"] });
      setInviteResult({ inviteUrl: data.inviteUrl, message: data.message });
      toast({ title: data.message || "Invitation sent successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to send invitation", variant: "destructive" });
    },
  });

  const handleSendInvite = () => {
    if (!inviteForm.email || !inviteForm.companyName) {
      toast({ title: "Email and company name are required", variant: "destructive" });
      return;
    }
    inviteContractorMutation.mutate(inviteForm);
  };

  const openInviteDialog = () => {
    setInviteForm({ email: '', companyName: '' });
    setInviteResult(null);
    setShowInviteDialog(true);
  };

  const copyInviteLink = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      toast({ title: "Invite link copied to clipboard" });
    }
  };

  const openEditContractor = (contractor: ContractorWithRegions) => {
    setEditingContractor(contractor);
    setContractorForm({
      name: contractor.name,
      companyName: contractor.companyName || '',
      phone: contractor.phone || '',
      email: contractor.email || '',
      website: contractor.website || '',
      description: contractor.description || '',
      specialties: contractor.specialties || [],
      licenseNumber: contractor.licenseNumber || '',
      isInsured: contractor.isInsured || false,
      isBonded: contractor.isBonded || false,
      referralLink: contractor.referralLink || '',
      notes: contractor.notes || '',
      isActive: contractor.isActive,
      sortOrder: contractor.sortOrder || 0,
      serviceRegionIds: contractor.serviceRegions?.map(r => r.id) || [],
    });
    
    setShowContractorDialog(true);
  };

  const openEditRegion = (region: ServiceRegion) => {
    setEditingRegion(region);
    setRegionForm({
      name: region.name,
      state: region.state,
      keyCities: region.keyCities || [],
      isActive: region.isActive,
      sortOrder: region.sortOrder || 0,
    });
    setKeyCitiesInput((region.keyCities || []).join(", "));
    setShowRegionDialog(true);
  };

  const openNewContractor = () => {
    setEditingContractor(null);
    setContractorForm(emptyContractorForm);
    
    setShowContractorDialog(true);
  };

  const openNewRegion = () => {
    setEditingRegion(null);
    setRegionForm(emptyRegionForm);
    setKeyCitiesInput("");
    setShowRegionDialog(true);
  };

  const handleSaveContractor = () => {
    const data = {
      ...contractorForm,
      id: editingContractor?.id,
    };
    saveContractorMutation.mutate(data);
  };

  const handleSaveRegion = () => {
    const data = {
      ...regionForm,
      keyCities: keyCitiesInput.split(",").map(s => s.trim()).filter(Boolean),
      id: editingRegion?.id,
    };
    saveRegionMutation.mutate(data);
  };

  const filteredContractors = contractors.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && c.isActive) ||
      (statusFilter === "inactive" && !c.isActive);
    return matchesSearch && matchesStatus;
  });

  const toggleRegion = (regionId: string) => {
    setContractorForm(prev => ({
      ...prev,
      serviceRegionIds: prev.serviceRegionIds.includes(regionId)
        ? prev.serviceRegionIds.filter(id => id !== regionId)
        : [...prev.serviceRegionIds, regionId]
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <HardHat className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-bold">Contractor Management</h1>
        </div>
      </div>

      {isAuditor && (
        <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="banner-read-only">
          <p className="text-sm text-amber-800 dark:text-amber-200">You are viewing this page in read-only mode.</p>
        </div>
      )}

      <Tabs defaultValue="contractors" className="space-y-6">
        <TabsList data-testid="tabs-contractor-management">
          <TabsTrigger value="contractors" data-testid="tab-contractors">
            <HardHat className="h-4 w-4 mr-2" />
            Contractors
          </TabsTrigger>
          <TabsTrigger value="regions" data-testid="tab-regions">
            <MapPin className="h-4 w-4 mr-2" />
            Service Regions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle>Contractors ({filteredContractors.length})</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contractors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-contractors"
                  />
                </div>
                {!isAuditor && (
                  <Button onClick={openInviteDialog} data-testid="button-invite-contractor">
                    <Send className="h-4 w-4 mr-2" />
                    Invite Contractor
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {contractorsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : filteredContractors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No contractors found. Add your first contractor.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredContractors.map(contractor => (
                    <Card key={contractor.id} className="p-4" data-testid={`card-contractor-${contractor.id}`}>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold">{contractor.name}</h3>
                            {contractor.companyName && (
                              <span className="text-sm text-muted-foreground">({contractor.companyName})</span>
                            )}
                            <Badge variant={contractor.isActive ? "default" : "secondary"}>
                              {contractor.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {contractor.inviteAccepted === false && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                                <Clock className="h-3 w-3 mr-1" />
                                Invite Pending
                              </Badge>
                            )}
                            {contractor.inviteAccepted === true && (
                              <Badge variant="outline" className="text-green-600 border-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Profile Complete
                              </Badge>
                            )}
                          </div>
                          {contractor.description && (
                            <p className="text-sm text-muted-foreground mb-2">{contractor.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {contractor.specialties?.map(s => (
                              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {contractor.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {contractor.phone}
                              </div>
                            )}
                            {contractor.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {contractor.email}
                              </div>
                            )}
                            {contractor.website && (
                              <div className="flex items-center gap-1">
                                <Globe className="h-4 w-4" />
                                <a href={contractor.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  Website
                                </a>
                              </div>
                            )}
                          </div>
                          {contractor.serviceRegions && contractor.serviceRegions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-xs text-muted-foreground">Regions:</span>
                              {contractor.serviceRegions.map(r => (
                                <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {!isAuditor && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditContractor(contractor)} data-testid={`button-edit-${contractor.id}`}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setContractorToDelete(contractor)} data-testid={`button-delete-${contractor.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <CardTitle>Service Regions</CardTitle>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-[180px]" data-testid="select-state-filter">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {Array.from(new Set(serviceRegions.map(r => r.state))).sort().map(state => (
                      <SelectItem key={state} value={state}>{getStateName(state)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isAuditor && (
                <Button onClick={openNewRegion} data-testid="button-add-region">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Region
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {regionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : serviceRegions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No service regions found. Add your first region.
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const filteredRegions = selectedState === "all" 
                      ? serviceRegions 
                      : serviceRegions.filter(r => r.state === selectedState);
                    
                    const groupedByState = filteredRegions.reduce((acc, region) => {
                      const state = region.state || 'Unknown';
                      if (!acc[state]) acc[state] = [];
                      acc[state].push(region);
                      return acc;
                    }, {} as Record<string, typeof serviceRegions>);

                    return Object.entries(groupedByState)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([state, regions]) => (
                        <Collapsible 
                          key={state}
                          open={expandedStates[state] ?? false}
                          onOpenChange={(open) => setExpandedStates(prev => ({ ...prev, [state]: open }))}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-2 mb-4 cursor-pointer hover-elevate p-2 rounded-md -ml-2">
                              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedStates[state] ? 'rotate-0' : '-rotate-90'}`} />
                              <MapPin className="h-5 w-5 text-accent" />
                              <h3 className="text-lg font-semibold">{getStateName(state)}</h3>
                              <Badge variant="outline">{regions.length} regions</Badge>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                              {regions
                                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                                .map(region => (
                                  <Card key={region.id} className="p-4" data-testid={`card-region-${region.id}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <h3 className="font-semibold">{region.name}</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {region.keyCities?.map(city => (
                                            <Badge key={city} variant="secondary" className="text-xs">{city}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                      {!isAuditor && (
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="icon" onClick={() => openEditRegion(region)} data-testid={`button-edit-region-${region.id}`}>
                                            <Edit2 className="h-4 w-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => setRegionToDelete(region)} data-testid={`button-delete-region-${region.id}`}>
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showContractorDialog} onOpenChange={setShowContractorDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContractor ? "Edit Contractor" : "Add Contractor"}</DialogTitle>
            <DialogDescription>
              {editingContractor ? "Update contractor information" : "Add a new contractor to the directory"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={contractorForm.name}
                  onChange={(e) => setContractorForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contact name"
                  data-testid="input-contractor-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={contractorForm.companyName}
                  onChange={(e) => setContractorForm(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Company name"
                  data-testid="input-company-name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={contractorForm.phone}
                  onChange={(e) => setContractorForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contractorForm.email}
                  onChange={(e) => setContractorForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                  data-testid="input-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={contractorForm.website}
                onChange={(e) => setContractorForm(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://..."
                data-testid="input-website"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={contractorForm.description}
                onChange={(e) => setContractorForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of services..."
                data-testid="input-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Specialties</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                <div className="flex items-center space-x-2 pb-1 mb-1 border-b">
                  <Checkbox
                    id="specialty-all"
                    checked={contractorForm.specialties.length === SPECIALTY_OPTIONS.length}
                    onCheckedChange={(checked) => {
                      setContractorForm(prev => ({
                        ...prev,
                        specialties: checked ? [...SPECIALTY_OPTIONS] : []
                      }));
                    }}
                    data-testid="checkbox-specialty-all"
                  />
                  <label htmlFor="specialty-all" className="text-sm font-medium cursor-pointer">Select All</label>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {SPECIALTY_OPTIONS.map(specialty => (
                    <div key={specialty} className="flex items-center space-x-2">
                      <Checkbox
                        id={`specialty-${specialty}`}
                        checked={contractorForm.specialties.includes(specialty)}
                        onCheckedChange={(checked) => {
                          setContractorForm(prev => ({
                            ...prev,
                            specialties: checked
                              ? [...prev.specialties, specialty]
                              : prev.specialties.filter(s => s !== specialty)
                          }));
                        }}
                        data-testid={`checkbox-specialty-${specialty}`}
                      />
                      <label htmlFor={`specialty-${specialty}`} className="text-sm cursor-pointer">{specialty}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={contractorForm.licenseNumber}
                  onChange={(e) => setContractorForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  placeholder="License #"
                  data-testid="input-license"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={contractorForm.sortOrder}
                  onChange={(e) => setContractorForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  data-testid="input-sort-order"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="isInsured"
                  checked={contractorForm.isInsured}
                  onCheckedChange={(checked) => setContractorForm(prev => ({ ...prev, isInsured: checked }))}
                  data-testid="switch-insured"
                />
                <Label htmlFor="isInsured">Insured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isBonded"
                  checked={contractorForm.isBonded}
                  onCheckedChange={(checked) => setContractorForm(prev => ({ ...prev, isBonded: checked }))}
                  data-testid="switch-bonded"
                />
                <Label htmlFor="isBonded">Bonded</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={contractorForm.isActive}
                  onCheckedChange={(checked) => setContractorForm(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-active"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Service Regions</Label>
              <div className="max-h-64 overflow-y-auto border rounded-md p-3 space-y-2">
                {(() => {
                  const states = Array.from(new Set(serviceRegions.map(r => r.state))).sort();
                  return states.map(state => {
                    const stateRegions = serviceRegions.filter(r => r.state === state);
                    const selectedCount = stateRegions.filter(r => contractorForm.serviceRegionIds.includes(r.id)).length;
                    return (
                      <Collapsible key={state}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer hover-elevate" data-testid={`trigger-state-${state}`}>
                            <div className="flex items-center gap-2">
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{state}</span>
                              {selectedCount > 0 && (
                                <Badge variant="secondary">{selectedCount}</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{stateRegions.length} areas</span>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pl-6 pt-1 pb-2 space-y-1">
                            <div className="flex justify-end mb-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const allIds = stateRegions.map(r => r.id);
                                  const allSelected = allIds.every(id => contractorForm.serviceRegionIds.includes(id));
                                  if (allSelected) {
                                    setContractorForm(prev => ({
                                      ...prev,
                                      serviceRegionIds: prev.serviceRegionIds.filter(id => !allIds.includes(id))
                                    }));
                                  } else {
                                    setContractorForm(prev => ({
                                      ...prev,
                                      serviceRegionIds: Array.from(new Set([...prev.serviceRegionIds, ...allIds]))
                                    }));
                                  }
                                }}
                                data-testid={`button-select-all-${state}`}
                              >
                                {stateRegions.every(r => contractorForm.serviceRegionIds.includes(r.id)) ? "Deselect All" : "Select All"}
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {stateRegions.map(region => (
                                <div key={region.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`region-${region.id}`}
                                    checked={contractorForm.serviceRegionIds.includes(region.id)}
                                    onCheckedChange={() => toggleRegion(region.id)}
                                    data-testid={`checkbox-region-${region.id}`}
                                  />
                                  <label htmlFor={`region-${region.id}`} className="text-sm cursor-pointer">
                                    {region.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  });
                })()}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (internal)</Label>
              <Textarea
                id="notes"
                value={contractorForm.notes}
                onChange={(e) => setContractorForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes..."
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractorDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveContractor} 
              disabled={!contractorForm.name || saveContractorMutation.isPending}
              data-testid="button-save-contractor"
            >
              {saveContractorMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingContractor ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRegionDialog} onOpenChange={setShowRegionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRegion ? "Edit Service Region" : "Add Service Region"}</DialogTitle>
            <DialogDescription>
              Service regions define the geographic areas contractors serve
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regionName">Region Name *</Label>
                <Input
                  id="regionName"
                  value={regionForm.name}
                  onChange={(e) => setRegionForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Atlanta Metro"
                  data-testid="input-region-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={regionForm.state}
                  onValueChange={(value) => setRegionForm(prev => ({ ...prev, state: value }))}
                >
                  <SelectTrigger id="state" data-testid="select-region-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stateNames).map(([abbrev, name]) => (
                      <SelectItem key={abbrev} value={abbrev}>{name} ({abbrev})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyCities">Key Cities (comma-separated)</Label>
              <Textarea
                id="keyCities"
                value={keyCitiesInput}
                onChange={(e) => setKeyCitiesInput(e.target.value)}
                placeholder="Atlanta, Marietta, Decatur, Sandy Springs"
                data-testid="input-key-cities"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regionSortOrder">Sort Order</Label>
                <Input
                  id="regionSortOrder"
                  type="number"
                  value={regionForm.sortOrder}
                  onChange={(e) => setRegionForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  data-testid="input-region-sort-order"
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch
                  id="regionActive"
                  checked={regionForm.isActive}
                  onCheckedChange={(checked) => setRegionForm(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-region-active"
                />
                <Label htmlFor="regionActive">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegionDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRegion} 
              disabled={!regionForm.name || !regionForm.state || saveRegionMutation.isPending}
              data-testid="button-save-region"
            >
              {saveRegionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingRegion ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!contractorToDelete} onOpenChange={() => setContractorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contractor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{contractorToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contractorToDelete && deleteContractorMutation.mutate(contractorToDelete.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!regionToDelete} onOpenChange={() => setRegionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Region?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{regionToDelete?.name}"? This will remove the region from all contractors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regionToDelete && deleteRegionMutation.mutate(regionToDelete.id)}
              data-testid="button-confirm-delete-region"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-accent" />
                Invite Contractor
              </div>
            </DialogTitle>
            <DialogDescription>
              Send an email invitation to a contractor. They'll receive a link to complete their profile and select their service regions.
            </DialogDescription>
          </DialogHeader>
          
          {!inviteResult ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contractor@example.com"
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-company">Company Name *</Label>
                  <Input
                    id="invite-company"
                    value={inviteForm.companyName}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="ABC Construction"
                    data-testid="input-invite-company"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendInvite} 
                  disabled={!inviteForm.email || !inviteForm.companyName || inviteContractorMutation.isPending}
                  data-testid="button-send-invite"
                >
                  {inviteContractorMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">{inviteResult.message}</span>
              </div>
              
              <div className="space-y-2">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={inviteResult.inviteUrl} 
                    readOnly 
                    className="text-xs"
                    data-testid="input-invite-url"
                  />
                  <Button variant="outline" size="icon" onClick={copyInviteLink} data-testid="button-copy-invite">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This link will expire in 7 days. The contractor will receive an email with this link.
                </p>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setInviteResult(null);
                    setInviteForm({ email: '', companyName: '' });
                  }}
                  data-testid="button-invite-another"
                >
                  Invite Another
                </Button>
                <Button onClick={() => setShowInviteDialog(false)} data-testid="button-close-invite">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
