import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Building2, ShieldCheck, Eye, EyeOff, HardHat, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

const lenderLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const contractorLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type LenderLoginFormData = z.infer<typeof lenderLoginSchema>;
type ContractorLoginFormData = z.infer<typeof contractorLoginSchema>;
type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function Login() {
  const { login, isAuthenticated, isLoading: authLoading, user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLenderLoading, setIsLenderLoading] = useState(false);
  const [isContractorLoading, setIsContractorLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [contractorLoginInProgress, setContractorLoginInProgress] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLenderPassword, setShowLenderPassword] = useState(false);
  const [showContractorPassword, setShowContractorPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const isValidReturnTo = (url: string | null): boolean => {
    if (!url) return false;
    return url.startsWith("/") && !url.includes("//") && !url.includes(":");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnToParam = params.get("returnTo");
    if (returnToParam && isValidReturnTo(returnToParam)) {
      setReturnTo(returnToParam);
    }
  }, []);

  useEffect(() => {
    if (contractorLoginInProgress) return;
    if (!authLoading && isAuthenticated && currentUser) {
      if (currentUser.role === 'admin' || currentUser.role === 'developer' || currentUser.role === 'auditor') {
        setLocation(returnTo || "/admin");
      } else {
        if ((currentUser as any).pendingPlan) {
          setLocation(`/checkout?plan=${(currentUser as any).pendingPlan}`);
        } else if (currentUser.isContractor) {
          setLocation("/contractor-portal");
        } else {
          setLocation(returnTo || "/portal/dashboard");
        }
      }
    }
  }, [isAuthenticated, authLoading, setLocation, currentUser, returnTo, contractorLoginInProgress]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const lenderForm = useForm<LenderLoginFormData>({
    resolver: zodResolver(lenderLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const contractorForm = useForm<ContractorLoginFormData>({
    resolver: zodResolver(contractorLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const adminForm = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const user = await login(data);
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      if (user.role === 'admin' || user.role === 'developer' || user.role === 'auditor') {
        window.location.href = returnTo || "/admin";
      } else {
        if ((user as any).pendingPlan) {
          window.location.href = `/checkout?plan=${(user as any).pendingPlan}`;
        } else {
          window.location.href = returnTo || "/portal/dashboard";
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "Invalid credentials";
      const isVerificationError = errorMessage.includes("verify") || errorMessage.includes("Email not verified");
      toast({
        title: isVerificationError ? "Email Verification Required" : "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onLenderSubmit = async (data: LenderLoginFormData) => {
    setIsLenderLoading(true);
    try {
      const response = await fetch("/api/lenders/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Invalid email or password");
      }
      const lenderData = await response.json();
      if (lenderData._sessionToken) {
        localStorage.setItem('_sessionToken', lenderData._sessionToken);
      }
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in to the Lender Portal.",
      });
      window.location.href = "/lender-dashboard";
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLenderLoading(false);
    }
  };

  const onContractorSubmit = async (data: ContractorLoginFormData) => {
    setIsContractorLoading(true);
    setContractorLoginInProgress(true);
    try {
      const res = await apiRequest("POST", "/api/contractors/login", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Login failed");
      }
      const responseData = await res.json();
      if (responseData._sessionToken) {
        localStorage.setItem('_sessionToken', responseData._sessionToken);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in to the Contractor Portal.",
      });
      if (responseData.contractor && !responseData.contractor.agreementSignedAt) {
        window.location.href = "/contractor-agreement";
      } else {
        window.location.href = "/contractor-portal";
      }
    } catch (error: any) {
      setContractorLoginInProgress(false);
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsContractorLoading(false);
    }
  };

  const onAdminSubmit = async (data: AdminLoginFormData) => {
    setIsAdminLoading(true);
    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: data.email, password: data.password }),
        credentials: "include",
      });
      if (response.ok) {
        const userData = await response.json();
        if (userData._sessionToken) {
          localStorage.setItem('_sessionToken', userData._sessionToken);
        }
        queryClient.setQueryData(["/api/auth/me"], userData);
        toast({
          title: "Welcome Admin",
          description: "You've successfully logged in.",
        });
        window.location.href = "/admin/dashboard";
        return;
      } else if (response.status === 403) {
        toast({
          title: "Access Denied",
          description: "You don't have admin access. Contact support.",
          variant: "destructive",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Login failed",
          description: error.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setIsAdminLoading(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Log In"
        description="Log in to your RE Data Metrix account to access your deal analyses, lender comparisons, and investment tools."
        noIndex={true}
      />
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="bg-primary text-primary-foreground rounded-md p-8 sm:p-12 space-y-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-4">Welcome Back</h1>
                <div className="h-1 w-24 bg-accent mb-6"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <span>Access your saved deal analyses</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <span>Compare financing options</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <span>Connect with top lenders</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <span>Build out your toolbox</span>
                  </p>
                </div>
              </div>
            </div>

            <Card className="shadow-xl bg-card" data-testid="card-login">
              <CardHeader>
                <CardTitle className="text-2xl">Member Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access the platform
                </CardDescription>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email or Username</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="you@example.com or username"
                              data-testid="input-identifier"
                            />
                          </FormControl>
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
                                placeholder="Enter your password"
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
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-login"
                    >
                      {isLoading ? "Logging in..." : "Sign In"}
                    </Button>
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                      <Link href="/request-password-reset" className="text-accent hover:underline" data-testid="link-forgot-password">
                        Forgot your password?
                      </Link>
                      <span className="hidden sm:inline">|</span>
                      <Link href="/pricing" className="text-accent hover:underline" data-testid="link-new-account">
                        Create an account
                      </Link>
                    </div>
                  </CardFooter>
                </form>
              </Form>
            </Card>

            <Card className="bg-card" data-testid="card-partner-logins">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="lender" className="border-b px-6" data-testid="accordion-lender">
                    <AccordionTrigger className="hover:no-underline" data-testid="trigger-lender-login">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-md flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-accent" />
                        </div>
                        <div className="text-left">
                          <span className="text-base font-medium">Lender Sign In</span>
                          <p className="text-xs text-muted-foreground font-normal">Manage loan products and applications</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Form {...lenderForm}>
                        <form onSubmit={lenderForm.handleSubmit(onLenderSubmit)} className="space-y-4 pt-2">
                          <FormField
                            control={lenderForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="lender@example.com"
                                    data-testid="input-lender-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={lenderForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      {...field}
                                      type={showLenderPassword ? "text" : "password"}
                                      placeholder="Enter your password"
                                      data-testid="input-lender-password"
                                    />
                                    <Button
                                      type="button"
                                      tabIndex={-1}
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-1 top-1/2 -translate-y-1/2"
                                      onClick={() => setShowLenderPassword(!showLenderPassword)}
                                      data-testid="button-toggle-lender-password"
                                    >
                                      {showLenderPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex flex-col gap-3">
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={isLenderLoading}
                              data-testid="button-lender-login"
                            >
                              {isLenderLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Signing In...
                                </>
                              ) : (
                                "Sign In as Lender"
                              )}
                            </Button>
                            <p className="text-sm text-muted-foreground text-center">
                              <Link href="/lender/request-password-reset" className="text-accent hover:underline" data-testid="link-lender-forgot-password">
                                Forgot your password?
                              </Link>
                            </p>
                          </div>
                        </form>
                      </Form>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="contractor" className="border-b px-6" data-testid="accordion-contractor">
                    <AccordionTrigger className="hover:no-underline" data-testid="trigger-contractor-login">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-md flex items-center justify-center flex-shrink-0">
                          <HardHat className="h-4 w-4 text-accent" />
                        </div>
                        <div className="text-left">
                          <span className="text-base font-medium">Contractor Sign In</span>
                          <p className="text-xs text-muted-foreground font-normal">Access your contractor portal</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Form {...contractorForm}>
                        <form onSubmit={contractorForm.handleSubmit(onContractorSubmit)} className="space-y-4 pt-2">
                          <FormField
                            control={contractorForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="contractor@email.com"
                                    autoComplete="email"
                                    data-testid="input-contractor-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={contractorForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      {...field}
                                      type={showContractorPassword ? "text" : "password"}
                                      placeholder="Enter your password"
                                      autoComplete="current-password"
                                      data-testid="input-contractor-password"
                                    />
                                    <Button
                                      type="button"
                                      tabIndex={-1}
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-1 top-1/2 -translate-y-1/2"
                                      onClick={() => setShowContractorPassword(!showContractorPassword)}
                                      data-testid="button-toggle-contractor-password"
                                    >
                                      {showContractorPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex flex-col gap-3">
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={isContractorLoading}
                              data-testid="button-contractor-login"
                            >
                              {isContractorLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Signing In...
                                </>
                              ) : (
                                "Sign In as Contractor"
                              )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Check your email for login credentials sent by RE Data Metrix.
                            </p>
                            <div className="text-center text-sm mt-2">
                              <Link href="/contractor/request-password-reset" className="text-accent hover:underline" data-testid="link-contractor-forgot-password">
                                Forgot your password?
                              </Link>
                            </div>
                          </div>
                        </form>
                      </Form>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="admin" className="border-b-0 px-6" data-testid="accordion-admin">
                    <AccordionTrigger className="hover:no-underline" data-testid="trigger-admin-login">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <span className="text-base font-medium">Admin Sign In</span>
                          <p className="text-xs text-muted-foreground font-normal">Platform administrator access</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Form {...adminForm}>
                        <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4 pt-2">
                          <FormField
                            control={adminForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="admin@example.com"
                                    data-testid="input-admin-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={adminForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      {...field}
                                      type={showAdminPassword ? "text" : "password"}
                                      placeholder="Enter your password"
                                      data-testid="input-admin-password"
                                    />
                                    <Button
                                      type="button"
                                      tabIndex={-1}
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-1 top-1/2 -translate-y-1/2"
                                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                                      data-testid="button-toggle-admin-password"
                                    >
                                      {showAdminPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex flex-col gap-3">
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={isAdminLoading}
                              data-testid="button-admin-login"
                            >
                              {isAdminLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Signing In...
                                </>
                              ) : (
                                "Sign In as Admin"
                              )}
                            </Button>
                            <p className="text-sm text-muted-foreground text-center">
                              <Link href="/admin/request-password-reset" className="text-accent hover:underline" data-testid="link-admin-forgot-password">
                                Forgot your password?
                              </Link>
                            </p>
                          </div>
                        </form>
                      </Form>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
