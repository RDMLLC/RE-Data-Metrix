import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Building2, ShieldCheck } from "lucide-react";
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
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      setLocation("/portal/profile");
    } catch (error: any) {
      const errorMessage = error.message || "Invalid email or password";
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

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left Side - Navy Value Prop Panel */}
            <div className="lg:col-span-2 bg-primary text-primary-foreground rounded-lg p-12 space-y-8">
              <div>
                <h2 className="text-4xl font-bold mb-6">Welcome Back</h2>
                <div className="h-1 w-24 bg-accent mb-8"></div>
                <div className="space-y-4 text-lg">
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
                    <span>Track your investment portfolio</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Three Login Options */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* User Login Card */}
              <Card className="p-8 shadow-xl bg-card" data-testid="card-login">
                <CardHeader>
                  <CardTitle className="text-2xl">Login to Your Account</CardTitle>
                  <CardDescription>
                    Enter your credentials to access the platform
                  </CardDescription>
                </CardHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
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
                                data-testid="input-email"
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
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground text-center">
                          <Link href="/request-password-reset">
                            <a className="text-accent hover:underline" data-testid="link-forgot-password">
                              Forgot your password?
                            </a>
                          </Link>
                        </p>
                        <p className="text-sm text-muted-foreground text-center">
                          Don't have an account?{" "}
                          <Link href="/register">
                            <a className="text-primary hover:underline" data-testid="link-register">
                              Sign up
                            </a>
                          </Link>
                        </p>
                      </div>
                    </CardFooter>
                  </form>
                </Form>
              </Card>

              {/* Lender Login Card */}
              <Card className="border border-accent/20" data-testid="card-lender-login">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Lender Portal</h3>
                      <p className="text-xs text-muted-foreground">Manage loan products</p>
                    </div>
                  </div>
                  <Link href="/lender-portal">
                    <Button
                      className="w-full"
                      size="sm"
                      data-testid="button-lender-portal"
                    >
                      Lender Login
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Admin Login Card */}
              <Card className="border border-primary/20" data-testid="card-admin-login">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Admin Panel</h3>
                      <p className="text-xs text-muted-foreground">Platform management</p>
                    </div>
                  </div>
                  <Link href="/admin/login">
                    <Button
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
