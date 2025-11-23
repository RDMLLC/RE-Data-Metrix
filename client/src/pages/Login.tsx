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

              {/* Lender CTA - Integrated */}
              <div className="border-t border-primary-foreground/20 pt-8">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-accent" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Are you a lender?</h3>
                  <p className="mb-6 text-primary-foreground/90">
                    Access your lender portal to manage loan products and connect with investors
                  </p>
                  <Link href="/lender-portal">
                    <Button
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      size="lg"
                      data-testid="button-lender-portal"
                    >
                      Lender Portal Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="lg:col-span-3">
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

              {/* Admin Portal Section - Below Main Login */}
              <Card className="mt-8 border-2 border-primary">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="h-8 w-8 text-accent" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-foreground">Platform Administrator</h3>
                    <p className="mb-6 text-muted-foreground">
                      Access admin dashboard to manage lenders and platform settings
                    </p>
                    <Link href="/admin/lender-invite">
                      <Button
                        className="w-full"
                        size="lg"
                        data-testid="button-admin-portal"
                      >
                        Admin Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
