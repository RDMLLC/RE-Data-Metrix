import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ArrowRight, Loader2, FileText, Eye, EyeOff } from "lucide-react";
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

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    fullName: z.string().min(1, "Full name is required"),
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
  const [isLoading, setIsLoading] = useState(false);
  const [compCode, setCompCode] = useState<string>("");
  const [compEmail, setCompEmail] = useState<string | null>(null);
  const [auditorCode, setAuditorCode] = useState<string>("");
  const [auditorEmail, setAuditorEmail] = useState<string | null>(null);
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
    
    if (auditor) {
      validateAuditorCode(auditor.toUpperCase());
    } else if (comp) {
      validateCompCode(comp.toUpperCase());
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
      const finalData = {
        ...registerData,
        compCode: compCode || undefined,
        auditorCode: auditorCode || undefined,
        pendingPlan: selectedPlan || undefined,
      };
      const result = await register(finalData);
      
      const requiresVerification = (result as any)?.requiresVerification;
      const isComped = (result as any)?.isComped;
      
      const loginUrl = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
      
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
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left Side - Navy Value Prop Panel */}
            <div className="lg:col-span-2 bg-primary text-primary-foreground rounded-lg p-12 space-y-8">
              <div>
                <h2 className="text-4xl font-bold mb-6">Join RE Data Metrix</h2>
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
