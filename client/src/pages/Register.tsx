import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Users, ArrowRight, Loader2, FileText } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TermsModal } from "@/components/TermsModal";

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    fullName: z.string().min(1, "Full name is required"),
    referralCode: z.string().optional(),
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
  const [hasReferralCode, setHasReferralCode] = useState<string>("no");
  const [compCode, setCompCode] = useState<string>("");
  const [compEmail, setCompEmail] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Check for comp code in URL params (hidden functionality for admin invite links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const comp = params.get("comp");
    if (comp) {
      validateCompCode(comp.toUpperCase());
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

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      referralCode: "",
      termsAccepted: false as unknown as true,
    },
  });

  useEffect(() => {
    if (compEmail) {
      form.setValue("email", compEmail);
    }
  }, [compEmail, form]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const finalData = {
        ...registerData,
        referralCode: hasReferralCode === "yes" && registerData.referralCode 
          ? registerData.referralCode 
          : undefined,
        compCode: compCode || undefined,
      };
      const result = await register(finalData);
      
      const requiresVerification = (result as any)?.requiresVerification;
      const isComped = (result as any)?.isComped;
      
      if (isComped && !requiresVerification) {
        toast({
          title: "Account Created!",
          description: "Your account is ready. Please log in to get started.",
        });
        setLocation("/login");
      } else if (requiresVerification) {
        toast({
          title: "Check your email!",
          description: (result as any).message || "We've sent you a verification link. Please check your inbox.",
        });
        setLocation("/login");
      } else {
        toast({
          title: "Welcome to RE Data Metrix!",
          description: "Your account has been created successfully. Please log in.",
        });
        setLocation("/login");
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
                    <span>Earn referral bonuses</span>
                  </p>
                </div>
              </div>

              {/* Referral Bonus CTA */}
              <div className="border-t border-primary-foreground/20 pt-8">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center">
                      <Users className="h-8 w-8 text-accent" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Have a referral code?</h3>
                  <p className="mb-6 text-primary-foreground/90">
                    Use a referral code to get 1 month free trial and help your referrer earn bonuses
                  </p>
                  <p className="text-sm text-primary-foreground/80">
                    Enter your code in the registration form
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
                                disabled={!!compEmail}
                                data-testid="input-email"
                              />
                            </FormControl>
                            {compEmail && (
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
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                data-testid="input-password"
                              />
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
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                data-testid="input-confirm-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Referral Code Option */}
                      <div className="space-y-3">
                        <FormLabel>Have a referral code?</FormLabel>
                        <RadioGroup
                          value={hasReferralCode}
                          onValueChange={setHasReferralCode}
                          className="flex flex-row gap-4"
                          data-testid="radio-referral"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no-referral" data-testid="radio-no-referral" />
                            <label htmlFor="no-referral" className="text-sm">No</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes-referral" data-testid="radio-yes-referral" />
                            <label htmlFor="yes-referral" className="text-sm">Yes</label>
                          </div>
                        </RadioGroup>
                      </div>

                      {hasReferralCode === "yes" && (
                        <FormField
                          control={form.control}
                          name="referralCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referral Code</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter referral code"
                                  data-testid="input-referral-code"
                                />
                              </FormControl>
                              <FormDescription>
                                Get 1 month free when you use a valid referral code
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

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
