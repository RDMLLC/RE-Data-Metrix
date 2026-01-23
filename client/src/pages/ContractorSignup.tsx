import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Loader2, Eye, EyeOff, X, Plus, CheckCircle, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ServiceRegion } from "@shared/schema";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "GA", label: "Georgia" },
];

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

const signupSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  name: z.string().min(1, "Contact name is required"),
  companyName: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  website: z.string().optional(),
  description: z.string().optional(),
  licenseNumber: z.string().optional(),
  licensedStates: z.array(z.string()).default([]),
  isInsured: z.boolean().default(false),
  isBonded: z.boolean().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function ContractorSignup() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAllSpecialties, setIsAllSpecialties] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtySelectKey, setSpecialtySelectKey] = useState(0); // Force re-render to clear selection
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [signupComplete, setSignupComplete] = useState(false);

  const { data: inviteData, isLoading: validating, error: validateError } = useQuery<{
    valid: boolean;
    contractorId: string;
    email: string;
    companyName: string;
  }>({
    queryKey: ['/api/contractors/validate-invite', token],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/contractors/validate-invite/${token}`);
      return await response.json();
    },
    retry: false,
  });

  const { data: allRegions, isLoading: regionsLoading } = useQuery<ServiceRegion[]>({
    queryKey: ["/api/service-regions"],
    queryFn: async () => {
      const response = await fetch(`/api/service-regions`);
      if (!response.ok) throw new Error("Failed to fetch regions");
      return response.json();
    },
  });

  // Group regions by state
  const regionsByState = allRegions?.reduce((acc, region) => {
    const state = region.state;
    if (!acc[state]) acc[state] = [];
    acc[state].push(region);
    return acc;
  }, {} as Record<string, ServiceRegion[]>) || {};

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      name: "",
      companyName: "",
      phone: "",
      website: "",
      description: "",
      licenseNumber: "",
      licensedStates: [],
      isInsured: false,
      isBonded: false,
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      // If "ALL" is selected, send all specialties; otherwise send selected ones
      const specialtiesToSend = isAllSpecialties ? SPECIALTY_OPTIONS : selectedSpecialties;
      const res = await apiRequest("POST", `/api/contractors/accept-invite/${token}`, {
        password: data.password,
        name: data.name,
        companyName: data.companyName || inviteData?.companyName || "",
        phone: data.phone,
        website: data.website,
        description: data.description,
        specialties: specialtiesToSend,
        licenseNumber: data.licenseNumber,
        licensedStates: data.licensedStates,
        isInsured: data.isInsured,
        isBonded: data.isBonded,
        serviceRegionIds: selectedRegions,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Created!",
        description: "Your contractor profile has been set up successfully.",
      });
      setSignupComplete(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete signup",
        variant: "destructive",
      });
    },
  });

  const handleSpecialtyChange = (value: string) => {
    if (value === "ALL") {
      setIsAllSpecialties(true);
      setSelectedSpecialties([]);
      setSpecialtySelectKey(prev => prev + 1); // Force re-render to show "ALL"
    } else {
      // When selecting a specific specialty, deselect ALL
      setIsAllSpecialties(false);
      if (!selectedSpecialties.includes(value)) {
        setSelectedSpecialties([...selectedSpecialties, value]);
      }
      // Force Select to re-render so user can pick another specialty
      setSpecialtySelectKey(prev => prev + 1);
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    const newSpecialties = selectedSpecialties.filter((s) => s !== specialty);
    setSelectedSpecialties(newSpecialties);
    // If no specialties remain, default back to ALL
    if (newSpecialties.length === 0) {
      setIsAllSpecialties(true);
    }
  };

  const handleToggleRegion = (regionId: string) => {
    if (selectedRegions.includes(regionId)) {
      setSelectedRegions(selectedRegions.filter((r) => r !== regionId));
    } else {
      setSelectedRegions([...selectedRegions, regionId]);
    }
  };

  const onSubmit = (data: SignupForm) => {
    if (selectedRegions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one service region",
        variant: "destructive",
      });
      return;
    }
    signupMutation.mutate(data);
  };

  if (validating) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Validating invite...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (validateError || !inviteData?.valid) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Invalid Invite</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This invite link is invalid or has expired. Please contact the administrator for a new invite.
              </p>
              <Button
                className="w-full mt-4"
                onClick={() => setLocation("/")}
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (signupComplete) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background flex items-center justify-center">
          <Card className="max-w-md text-center">
            <CardHeader>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-green-600">Profile Created!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Your contractor profile has been successfully created. You'll now be visible to investors searching for contractors in your service areas.
              </p>
              <Button
                className="w-full"
                onClick={() => setLocation("/")}
                data-testid="button-back-home"
              >
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">Complete Your Contractor Profile</h1>
            <div className="h-1 w-24 bg-accent mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Welcome! Complete your profile to start connecting with real estate investors.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Company: {inviteData.companyName}</CardTitle>
              <p className="text-sm text-muted-foreground">{inviteData.email}</p>
            </CardHeader>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            autoComplete="name"
                            {...field}
                            data-testid="input-contact-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="(555) 123-4567"
                            autoComplete="tel"
                            {...field}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a password"
                                autoComplete="new-password"
                                {...field}
                                data-testid="input-password"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                                {...field}
                                data-testid="input-confirm-password"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                data-testid="button-toggle-confirm-password"
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={inviteData.companyName}
                            {...field}
                            data-testid="input-company-name"
                          />
                        </FormControl>
                        <FormDescription>Leave blank to use: {inviteData.companyName}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://www.yourcompany.com"
                            {...field}
                            data-testid="input-website"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell investors about your company, experience, and what makes you stand out..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="GC-12345"
                            {...field}
                            data-testid="input-license"
                          />
                        </FormControl>
                        <FormDescription>Your contractor license number (if applicable)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="licensedStates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Licensed States</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {US_STATES.map((state) => (
                            <div
                              key={state.value}
                              className={`px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                                field.value?.includes(state.value)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted"
                              }`}
                              onClick={() => {
                                const newValue = field.value?.includes(state.value)
                                  ? field.value.filter((s: string) => s !== state.value)
                                  : [...(field.value || []), state.value];
                                field.onChange(newValue);
                              }}
                              data-testid={`toggle-license-state-${state.value}`}
                            >
                              {state.label}
                            </div>
                          ))}
                        </div>
                        <FormDescription>Select all states where you hold a contractor license</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="isInsured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-insured"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Insured</FormLabel>
                            <FormDescription>I carry liability insurance</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isBonded"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-bonded"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Bonded</FormLabel>
                            <FormDescription>I am bonded</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specialties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Show badges only when specific specialties are selected (not ALL) */}
                  {!isAllSpecialties && selectedSpecialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedSpecialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                          {specialty}
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecialty(specialty)}
                            className="ml-1 hover:text-destructive"
                            data-testid={`button-remove-specialty-${specialty}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div>
                    <FormLabel>Specialties</FormLabel>
                    <Select 
                      key={specialtySelectKey}
                      value={isAllSpecialties ? "ALL" : undefined} 
                      onValueChange={handleSpecialtyChange}
                    >
                      <SelectTrigger data-testid="select-specialty">
                        <SelectValue placeholder={isAllSpecialties ? "ALL" : "Select a specialty to add"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">ALL</SelectItem>
                        {SPECIALTY_OPTIONS.filter((s) => !selectedSpecialties.includes(s)).map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>
                            {specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {isAllSpecialties 
                        ? "You offer all specialty services" 
                        : "Select specific areas of work you specialize in"}
                    </FormDescription>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Service Regions *</CardTitle>
                  <p className="text-sm text-muted-foreground">Select the areas where you provide services</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {regionsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading regions...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {US_STATES.map((state) => {
                        const stateRegions = regionsByState[state.value] || [];
                        const stateSelectedCount = stateRegions.filter(r => selectedRegions.includes(r.id)).length;
                        
                        return (
                          <Collapsible
                            key={state.value}
                            open={expandedStates[state.value] ?? false}
                            onOpenChange={(open) => setExpandedStates(prev => ({ ...prev, [state.value]: open }))}
                          >
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between gap-2 p-3 rounded-lg border cursor-pointer hover-elevate">
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedStates[state.value] ? 'rotate-0' : '-rotate-90'}`} />
                                  <span className="font-medium">{state.label}</span>
                                  {stateSelectedCount > 0 && (
                                    <Badge variant="secondary">{stateSelectedCount} selected</Badge>
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {stateSelectedCount === 0 ? "SELECT" : `${stateSelectedCount}/${stateRegions.length}`}
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="pt-3 pl-6 space-y-3">
                                {stateRegions.length > 0 && (
                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const allStateRegionIds = stateRegions.map(r => r.id);
                                        const allSelected = allStateRegionIds.every(id => selectedRegions.includes(id));
                                        if (allSelected) {
                                          setSelectedRegions(selectedRegions.filter(id => !allStateRegionIds.includes(id)));
                                        } else {
                                          setSelectedRegions(Array.from(new Set([...selectedRegions, ...allStateRegionIds])));
                                        }
                                      }}
                                      data-testid={`button-select-all-${state.value}`}
                                    >
                                      {stateRegions.every(r => selectedRegions.includes(r.id)) ? "Deselect All" : "Select All"}
                                    </Button>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {stateRegions.map((region) => (
                                    <button
                                      key={region.id}
                                      type="button"
                                      onClick={() => handleToggleRegion(region.id)}
                                      className={`p-3 rounded-lg border text-left transition-colors ${
                                        selectedRegions.includes(region.id)
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border hover:border-primary/50"
                                      }`}
                                      data-testid={`button-region-${region.id}`}
                                    >
                                      <div className="font-medium text-sm">{region.name}</div>
                                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                        {region.keyCities?.slice(0, 3).join(", ")}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}

                  {selectedRegions.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedRegions.length} region(s) selected total
                    </p>
                  )}

                  {selectedRegions.length === 0 && (
                    <p className="text-sm text-destructive">Please select at least one service region</p>
                  )}
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={signupMutation.isPending || selectedRegions.length === 0}
                data-testid="button-submit"
              >
                {signupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  "Create My Profile"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
