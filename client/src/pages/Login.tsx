import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Building2, ShieldCheck, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
} from "@/components/ui/form";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

const lenderLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type LenderLoginFormData = z.infer<typeof lenderLoginSchema>;

export default function Login() {
  const { login, isAuthenticated, isLoading: authLoading, user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLenderLoading, setIsLenderLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated && currentUser) {
      if (currentUser.role === 'admin' || currentUser.role === 'developer') {
        setLocation("/admin");
      } else {
        setLocation("/portal/dashboard");
      }
    }
  }, [isAuthenticated, authLoading, setLocation, currentUser]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const lenderForm = useForm<LenderLoginFormData>({
    resolver: zodResolver(lenderLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const user = await login(data);
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      
      // Redirect based on user role
      if (user.role === 'admin' || user.role === 'developer') {
        setLocation("/admin");
      } else {
        setLocation("/portal/dashboard");
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

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in to the Lender Portal.",
      });
      setLocation("/lender-dashboard");
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

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Side - Navy Value Prop Panel */}
            <div className="lg:col-span-3 bg-primary text-primary-foreground rounded-lg p-12 space-y-8">
              <div>
                <h2 className="text-4xl font-bold mb-6">Welcome Back</h2>
                <div className="h-1 w-24 bg-accent mb-8"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-lg">
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <span>Access your saved deal analyses</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <span>Compare financing options</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <span>Connect with top lenders</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <span>Build out your toolbox</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Main User Login Card - Full Width */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* User Login Card */}
              <Card className="p-8 shadow-xl bg-card" data-testid="card-login">
                <CardHeader>
                  <CardTitle className="text-2xl">Member Portal</CardTitle>
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
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                data-testid="input-password"
                              />
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
                        {isLoading ? "Logging in..." : "Login"}
                      </Button>
                      <p className="text-sm text-muted-foreground text-center">
                        <Link href="/request-password-reset" className="text-accent hover:underline" data-testid="link-forgot-password">
                          Forgot your password?
                        </Link>
                      </p>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </div>

            {/* Left Column - New Account and Admin Panel stacked */}
            <div className="lg:col-span-1 xl:col-span-1 flex flex-col gap-4">
              {/* New Account Signup Card - Hidden on mobile */}
              <Card className="hidden md:block border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" data-testid="card-new-account">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">New Account</h3>
                      <p className="text-xs text-muted-foreground">Join RE Data Metrix</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get access to deal analysis, lender comparisons, and investment tools.
                  </p>
                  <Link href="/checkout">
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      size="sm"
                      data-testid="button-new-account"
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Admin Panel Card - Hidden on mobile */}
              <Card className="hidden md:block border border-primary/20" data-testid="card-admin-login">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Admin Panel</h3>
                      <p className="text-xs text-muted-foreground">Platform management</p>
                    </div>
                  </div>
                  <Link href="/admin/login">
                    <Button
                      variant="outline"
                      className="w-full"
                      size="sm"
                      data-testid="button-admin-portal"
                    >
                      Admin Login
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 xl:col-span-2" id="lender-portal">
              {/* Lender Login Card */}
              <Card className="border border-accent/20" data-testid="card-lender-login">
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Lender Portal</CardTitle>
                      <CardDescription className="text-sm">Manage loan products and applications</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <Form {...lenderForm}>
                  <form onSubmit={lenderForm.handleSubmit(onLenderSubmit)}>
                    <CardContent className="p-6 pt-0 space-y-4">
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
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                data-testid="input-lender-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="p-6 pt-0 flex flex-col gap-3">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLenderLoading}
                        data-testid="button-lender-login"
                      >
                        {isLenderLoading ? "Logging in..." : "Login as Lender"}
                      </Button>
                      <p className="text-sm text-muted-foreground text-center">
                        <Link href="/lender/request-password-reset" className="text-accent hover:underline" data-testid="link-lender-forgot-password">
                          Forgot your password?
                        </Link>
                      </p>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </div>

            {/* Subtle Admin Link - Visible on mobile only (cards hidden on desktop show admin access) */}
            <div className="lg:col-span-3 md:hidden text-center">
              <Link 
                href="/admin/login" 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-admin-mobile"
              >
                Admin access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
