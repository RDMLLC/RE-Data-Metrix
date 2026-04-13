import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketingEvents } from "@/components/MarketingPixelLoader";
import Layout from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ArrowRight, Loader2, FileText, Eye, EyeOff, UserCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { TermsModal } from "@/components/TermsModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "District of Columbia" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    fullName: z.string().min(1, "Full name is required"),
    companyName: z.string().optional(),
    phone: z.string().min(7, "Phone number is required"),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the User Agreement and Privacy Policy" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { trackCompleteRegistration } = useMarketingEvents();
  const [isLoading, setIsLoading] = useState(false);
  const [compCode, setCompCode] = useState<string>("");
  const [compEmail, setCompEmail] = useState<string | null>(null);
  const [auditorCode, setAuditorCode] = useState<string>("");
  const [auditorEmail, setAuditorEmail] = useState<string | null>(null);
  const [contractorRefCode, setContractorRefCode] = useState<string>("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate returnTo to only allow safe relative paths (prevents open redirect)
  const isValidReturnTo = (url: string | null): boolean => {
    if (!url) return false;
    // Must start with "/" and not contain protocol or double slashes
    return url.startsWith("/") && !url.includes("//") && !url.includes(":");
  };

  // Check for comp code, returnTo, and plan in URL params
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const comp = params.get("comp");
    const auditor = params.get("auditor");
    const returnToParam = params.get("returnTo");
    const planParam = params.get("plan");
    const refType = params.get("ref");
    const refCode = params.get("code");
    
    if (auditor) {
      validateAuditorCode(auditor.toUpperCase());
    } else if (comp) {
      validateCompCode(comp.toUpperCase());
    }
    if (refType === "contractor" && refCode) {
      setContractorRefCode(refCode.toUpperCase());
    }
    if (returnToParam && isValidReturnTo(returnToParam)) {
      setReturnTo(returnToParam);
    }
    if (planParam && (planParam === "monthly" || planParam === "annual")) {
      setSelectedPlan(planParam);
    }
  }, []);

  const validateCompCode = async (code: string) => {
    try {
      const res = await fetch(`/api/comp-invites/validate/${code}`);
      const data = await res.json();
      if (data.valid) {
        setCompCode(code);
        if (data.email) {
          setCompEmail(data.email);
        }
      }
    } catch {
      // Silently fail - user can still register normally
    }
  };

  const validateAuditorCode = async (code: string) => {
    try {
      const res = await fetch(`/api/auditor-invites/validate/${code}`);
      const data = await res.json();
      if (data.valid) {
        setAuditorCode(code);
        if (data.email) {
          setAuditorEmail(data.email);
        }
      }
    } catch {
      // Silently fail - user can still register normally
    }
  };

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      companyName: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      termsAccepted: false as unknown as true,
    },
  });

  useEffect(() => {
    if (auditorEmail) {
      form.setValue("email", auditorEmail);
    } else if (compEmail) {
      form.setValue("email", compEmail);
    }
  }, [compEmail, auditorEmail, form]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const metaEventId = crypto.randomUUID();
      const finalData = {
        ...registerData,
        metaEventId,
        compCode: compCode || undefined,
        auditorCode: auditorCode || undefined,
        referralCode: contractorRefCode || undefined,
        pendingPlan: selectedPlan || undefined,
      };
      const result = await register(finalData);
      
      const requiresVerification = (result as any)?.requiresVerification;
      const isComped = (result as any)?.isComped;
      
      const loginUrl = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";

      // Fire browser pixel for CompleteRegistration (free signup) with shared event ID for CAPI deduplication
      if (!isComped) {
        trackCompleteRegistration({ eventId: metaEventId });
      }
      
      if (isComped && !requiresVerification) {
        toast({
          title: "Account Created!",
          description: "Your account is ready. Please log in to get started.",
        });
        setLocation(loginUrl);
      } else if (requiresVerification) {
        toast({
          title: "Check your email!",
          description: (result as any).message || "We've sent you a verification link. Please check your inbox.",
        });
        setLocation(loginUrl);
      } else {
        toast({
          title: "Welcome to RE Data Metrix!",
          description: "Your account has been created successfully. Please log in.",
        });
        setLocation(loginUrl);
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Create Account"
        description="Create your free RE Data Metrix account. Get access to real estate deal analysis tools, lender directory, wholesale calculators, and more — free to start, no credit card required."
        noIndex={true}
      />
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left Side - Navy Value Prop Panel */}
            <div className="lg:col-span-2 bg-primary text-primary-foreground rounded-lg p-12 space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-6">Join RE Data Metrix</h1>
                <div className="h-1 w-24 bg-accent mb-8"></div>
                <div className="space-y-4 text-lg">
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <span>Professional deal analysis tools</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <span>Compare multiple lenders instantly</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <span>Save and track your deals</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <span>Access curated investor resources</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="lg:col-span-3">
              <Card className="p-8 shadow-xl bg-card" data-testid="card-register">
                <CardHeader>
                  <CardTitle className="text-2xl">Create Your Free Account</CardTitle>
                  <CardDescription>
                    Get started with free access to deal analysis tools
                  </CardDescription>
                  {contractorRefCode && (
                    <div className="flex items-center gap-2 mt-2 p-3 rounded-md bg-accent/10 border border-accent/20 text-sm text-muted-foreground">
                      <UserCheck className="h-4 w-4 text-accent flex-shrink-0" />
                      <span>You were referred by a trusted contractor partner</span>
                    </div>
                  )}
                </CardHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="John Doe"
                                autoComplete="name"
                                data-testid="input-fullname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Company Name (optional)"
                                autoComplete="organization"
                                data-testid="input-company-name"
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
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="tel"
                                placeholder="(555) 555-5555"
                                autoComplete="tel"
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="123 Main St"
                                autoComplete="street-address"
                                data-testid="input-street"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Atlanta"
                                  autoComplete="address-level2"
                                  data-testid="input-city"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-state" autoComplete="address-level1">
                                    <SelectValue placeholder="Select State" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {US_STATES.map((s) => (
                                    <SelectItem key={s.abbr} value={s.abbr}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip Code <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="30301"
                                autoComplete="postal-code"
                                data-testid="input-zipcode"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="johndoe"
                                autoComplete="username"
                                data-testid="input-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                disabled={!!compEmail || !!auditorEmail}
                                data-testid="input-email"
                              />
                            </FormControl>
                            {(compEmail || auditorEmail) && (
                              <FormDescription>
                                Email is pre-filled from your invitation
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  autoComplete="new-password"
                                  data-testid="input-password"
                                />
                                <Button
                                  type="button"
                                  tabIndex={-1}
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2"
                                  onClick={() => setShowPassword(!showPassword)}
                                  data-testid="button-toggle-password"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                </Button>
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
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  autoComplete="new-password"
                                  data-testid="input-confirm-password"
                                />
                                <Button
                                  type="button"
                                  tabIndex={-1}
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  data-testid="button-toggle-confirm-password"
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Terms and Conditions */}
                      <FormField
                        control={form.control}
                        name="termsAccepted"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                                data-testid="checkbox-terms"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                I agree to the{" "}
                                <button
                                  type="button"
                                  onClick={() => setShowTermsModal(true)}
                                  className="text-primary hover:underline"
                                  data-testid="link-terms"
                                >
                                  User Agreement and Privacy Policy
                                </button>
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <div className="px-6 pb-6 space-y-4">
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isLoading}
                        data-testid="button-register"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Free Account"
                        )}
                      </Button>
                      
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?{" "}
                          <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                            Sign in
                          </Link>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Want full access?{" "}
                          <Link href="/pricing" className="text-primary hover:underline" data-testid="link-pricing">
                            View pricing plans
                          </Link>
                        </p>
                      </div>
                    </div>
                  </form>
                </Form>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <TermsModal 
        open={showTermsModal} 
        onOpenChange={setShowTermsModal}
        onAccept={() => {
          form.setValue("termsAccepted", true);
          setShowTermsModal(false);
        }}
      />
    </Layout>
  );
}
