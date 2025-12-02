import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, CreditCard, Shield, Lock, ArrowLeft, Loader2, AlertCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

const planDetails = {
  name: "Full Membership",
  price: 49,
  interval: "month",
  features: [
    "Complete Deal Analysis with ROI calculations",
    "Side-by-side lender loan comparisons",
    "Rental Analysis with DSCR calculations",
    "Access to curated lender network",
    "Save and track unlimited deals",
    "Save favorite lenders for quick access",
    "Export loan analysis reports",
    "Full access to Toolbox resources",
    "Priority email support",
  ],
};

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    fullName: z.string().min(1, "Full name is required"),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Checkout() {
  const { isAuthenticated, isSubscriber, user, register: registerUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState<string>("no");
  const [justRegistered, setJustRegistered] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      referralCode: "",
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/checkout", { planId: "full-membership" });
      return await response.json();
    },
    onSuccess: (data: { redirectUrl?: string; success?: boolean; message?: string; integrationPending?: boolean }) => {
      setIsProcessing(false);
      
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.success) {
        toast({
          title: "Subscription Activated!",
          description: data.message || "Welcome to RE Data Metrix membership!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/portal/dashboard");
      } else if (data.integrationPending) {
        toast({
          title: "Payment System Setup in Progress",
          description: data.message || "Our payment system is being configured. Please check back soon.",
        });
      } else {
        toast({
          title: "Unable to Process",
          description: data.message || "Please try again later.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Unable to process your request. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleCheckout = async () => {
    setIsProcessing(true);
    checkoutMutation.mutate();
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setIsRegistering(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const finalData = {
        ...registerData,
        referralCode: hasReferralCode === "yes" && registerData.referralCode 
          ? registerData.referralCode 
          : undefined,
        pendingSubscription: true, // Flag to indicate this is a subscription registration
      };
      const result = await registerUser(finalData);
      
      if ((result as any)?.requiresVerification) {
        toast({
          title: "Check your email!",
          description: "We've sent you a verification link. Please verify your email to activate your account and complete your subscription.",
        });
        setJustRegistered(true);
      } else {
        toast({
          title: "Account Created!",
          description: "Now proceeding to payment...",
        });
        // Auto-proceed to checkout after registration
        handleCheckout();
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Just registered but needs email verification
  if (justRegistered && !isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-lg mx-auto px-4">
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">Almost There!</CardTitle>
                <CardDescription className="text-base">
                  Your account has been created. Please check your email to verify your account and complete your subscription.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Check your email for the verification link</li>
                    <li>Click the link to verify your account</li>
                    <li>Sign in to complete your subscription</li>
                  </ol>
                </div>
                <Link href="/login?redirect=/checkout" className="block">
                  <Button className="w-full" data-testid="button-sign-in-after-verify">
                    Sign In After Verification
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Not authenticated - show registration form with order summary
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Link href="/register" className="inline-flex items-center text-primary hover:underline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Registration Options
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Registration Form */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl text-primary" data-testid="text-register-checkout-title">
                      Create Your Account
                    </CardTitle>
                    <CardDescription>
                      Complete registration to subscribe to RE Data Metrix
                    </CardDescription>
                  </CardHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onRegisterSubmit)}>
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
                                  data-testid="input-checkout-fullname"
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
                                  data-testid="input-checkout-username"
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
                                  data-testid="input-checkout-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
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
                                    data-testid="input-checkout-password"
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
                                    data-testid="input-checkout-confirm-password"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Do you have a referral code?
                          </Label>
                          <RadioGroup
                            value={hasReferralCode}
                            onValueChange={(value) => {
                              setHasReferralCode(value);
                              if (value === "no") {
                                form.setValue("referralCode", "");
                              }
                            }}
                            className="flex gap-4"
                            data-testid="radio-checkout-has-referral"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="no-referral" data-testid="radio-checkout-no-referral" />
                              <Label htmlFor="no-referral" className="font-normal cursor-pointer">
                                No
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="yes-referral" data-testid="radio-checkout-yes-referral" />
                              <Label htmlFor="yes-referral" className="font-normal cursor-pointer">
                                Yes
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {hasReferralCode === "yes" && (
                          <FormField
                            control={form.control}
                            name="referralCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Enter Referral Code</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="ABC12345"
                                    data-testid="input-checkout-referral-code"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Get 1 month free trial with a referral code
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </CardContent>
                      <CardFooter className="flex flex-col gap-4">
                        <Button
                          type="submit"
                          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                          size="lg"
                          disabled={isRegistering}
                          data-testid="button-register-and-subscribe"
                        >
                          {isRegistering ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Create Account & Subscribe
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          By continuing, you agree to our{" "}
                          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                        </p>
                      </CardFooter>
                    </form>
                  </Form>
                </Card>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link href="/login?redirect=/checkout" className="text-primary hover:underline" data-testid="link-login">
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-2">
                <Card className="sticky top-24">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{planDetails.name}</span>
                      <span className="font-medium">${planDetails.price}/{planDetails.interval}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Today</span>
                      <span className="text-primary">${planDetails.price}.00</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You'll be charged ${planDetails.price}/month after registration. Cancel anytime.
                    </p>

                    <Separator />

                    <div>
                      <h4 className="font-medium text-sm mb-3">What's Included</h4>
                      <ul className="space-y-2">
                        {planDetails.features.slice(0, 4).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        + {planDetails.features.length - 4} more features
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3 text-success" />
                        <span>PCI-DSS compliant</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3 text-success" />
                        <span>256-bit SSL encryption</span>
                      </div>
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

  if (isSubscriber) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
          <div className="max-w-lg mx-auto px-4">
            <Card className="border-success/30">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="text-2xl text-success">You're Already a Member!</CardTitle>
                <CardDescription>
                  You have full access to all RE Data Metrix features.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                  <Badge className="text-sm">
                    {user?.subscriptionStatus === 'active' && 'Active Member'}
                    {user?.subscriptionStatus === 'comped' && 'Complimentary Access'}
                    {user?.subscriptionStatus === 'referral_trial' && 'Referral Trial'}
                  </Badge>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/portal/dashboard" className="block">
                    <Button className="w-full" data-testid="button-go-dashboard">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link href="/portal/profile" className="block">
                    <Button variant="outline" className="w-full" data-testid="button-manage-account">
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Authenticated but not subscribed - show payment checkout
  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/pricing" className="inline-flex items-center text-primary hover:underline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pricing
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-primary" data-testid="text-checkout-title">
                    Complete Your Purchase
                  </CardTitle>
                  <CardDescription>
                    Upgrade to full membership and unlock all features.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="h-5 w-5 text-accent" />
                      <span className="font-medium text-foreground">Zoho Billing Integration</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When you click "Subscribe Now", you'll be securely redirected to our payment portal 
                      powered by Zoho Billing. Your payment information is processed securely and never 
                      stored on our servers.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-foreground mb-4">What's Included</h3>
                    <ul className="space-y-2">
                      {planDetails.features.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground mt-3">
                      + {planDetails.features.length - 5} more features
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-success" />
                      <span>PCI-DSS compliant payment processing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4 text-success" />
                      <span>256-bit SSL encryption</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4 text-success" />
                      <span>Cancel anytime from your account</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="sticky top-24">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{planDetails.name}</span>
                    <span className="font-medium">${planDetails.price}/{planDetails.interval}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Today</span>
                    <span className="text-primary">${planDetails.price}.00</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll be charged ${planDetails.price}/month. Cancel anytime.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    onClick={handleCheckout}
                    disabled={isProcessing || checkoutMutation.isPending}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    size="lg"
                    data-testid="button-subscribe-now"
                  >
                    {isProcessing || checkoutMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Subscribe Now
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    By subscribing, you agree to our{" "}
                    <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
