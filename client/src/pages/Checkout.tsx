import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, CreditCard, Shield, Lock, ArrowLeft, Loader2, AlertCircle, Users, Tag, Star } from "lucide-react";
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

const MONTHLY_PRICE = 15;
const ANNUAL_PRICE = 150;
const ANNUAL_MONTHLY_EQUIVALENT = (ANNUAL_PRICE / 12).toFixed(2);
const ANNUAL_SAVINGS = (MONTHLY_PRICE * 12) - ANNUAL_PRICE;

const planFeatures = [
  "Complete Deal Analysis with ROI calculations",
  "Side-by-side lender loan comparisons",
  "Rental Analysis with DSCR calculations",
  "Access to curated lender network",
  "Save and track unlimited deals",
  "Save favorite lenders for quick access",
  "Export loan analysis reports",
  "Full access to Toolbox resources",
  "Priority email support",
];

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
  const searchString = useSearch();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState<string>("no");
  const [justRegistered, setJustRegistered] = useState(false);
  
  // Plan and discount state
  const urlParams = new URLSearchParams(searchString);
  const initialPlan = urlParams.get("plan") === "monthly" ? "monthly" : "annual";
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(initialPlan);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percentOff: number; amountOff: number } | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);

  // Calculate prices with proper rounding
  const basePrice = selectedPlan === "monthly" ? MONTHLY_PRICE : ANNUAL_PRICE;
  const discountAmount = appliedDiscount 
    ? (appliedDiscount.percentOff 
        ? Math.round(basePrice * (appliedDiscount.percentOff / 100) * 100) / 100
        : appliedDiscount.amountOff)
    : 0;
  const finalPrice = Math.round(Math.max(0, basePrice - discountAmount) * 100) / 100;
  const interval = selectedPlan === "monthly" ? "month" : "year";

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

  const validateDiscountMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/subscription/validate-discount", { 
        code, 
        plan: selectedPlan 
      });
      return await response.json();
    },
    onSuccess: (data: { valid: boolean; percentOff?: number; amountOff?: number; message?: string }) => {
      setIsValidatingDiscount(false);
      if (data.valid) {
        setAppliedDiscount({
          code: discountCode.toUpperCase(),
          percentOff: data.percentOff || 0,
          amountOff: data.amountOff || 0,
        });
        toast({
          title: "Discount Applied!",
          description: data.message || "Your discount has been applied.",
        });
      } else {
        toast({
          title: "Invalid Code",
          description: data.message || "This discount code is not valid.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setIsValidatingDiscount(false);
      toast({
        title: "Error",
        description: "Unable to validate discount code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) return;
    setIsValidatingDiscount(true);
    validateDiscountMutation.mutate(discountCode.trim());
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/checkout", { 
        planId: selectedPlan === "monthly" ? "monthly" : "annual",
        discountCode: appliedDiscount?.code,
      });
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
        pendingSubscription: true,
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

  // Order summary component used in multiple places
  const OrderSummary = ({ showButton = false }: { showButton?: boolean }) => (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Plan</Label>
          <RadioGroup
            value={selectedPlan}
            onValueChange={(value) => {
              setSelectedPlan(value as "monthly" | "annual");
              // Clear discount when switching plans (plan-specific codes may not apply)
              if (appliedDiscount) {
                setAppliedDiscount(null);
                setDiscountCode("");
                toast({
                  title: "Discount Removed",
                  description: "Please re-apply your discount code for the new plan.",
                });
              }
            }}
            className="space-y-2"
            data-testid="radio-plan-selection"
          >
            <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedPlan === "monthly" ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/50"}`}>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="monthly" id="plan-monthly" data-testid="radio-plan-monthly" />
                <Label htmlFor="plan-monthly" className="cursor-pointer">
                  <div className="font-medium">Monthly</div>
                  <div className="text-sm text-muted-foreground">Billed monthly</div>
                </Label>
              </div>
              <span className="font-semibold">${MONTHLY_PRICE}/mo</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedPlan === "annual" ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/50"}`}>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="annual" id="plan-annual" data-testid="radio-plan-annual" />
                <Label htmlFor="plan-annual" className="cursor-pointer">
                  <div className="font-medium flex items-center gap-2">
                    Annual
                    <Badge variant="secondary" className="text-xs bg-success/20 text-success border-0">
                      Save ${ANNUAL_SAVINGS}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">${ANNUAL_MONTHLY_EQUIVALENT}/mo, billed yearly</div>
                </Label>
              </div>
              <span className="font-semibold">${ANNUAL_PRICE}/yr</span>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Discount Code */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Discount Code
          </Label>
          {appliedDiscount ? (
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/30">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="font-medium text-success">{appliedDiscount.code}</span>
                <span className="text-sm text-muted-foreground">
                  ({appliedDiscount.percentOff ? `${appliedDiscount.percentOff}% off` : `$${appliedDiscount.amountOff} off`})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeDiscount}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-remove-discount"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1"
                data-testid="input-discount-code"
              />
              <Button
                variant="outline"
                onClick={handleApplyDiscount}
                disabled={!discountCode.trim() || isValidatingDiscount}
                data-testid="button-apply-discount"
              >
                {isValidatingDiscount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Price Summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              {selectedPlan === "monthly" ? "Monthly" : "Annual"} Membership
            </span>
            <span className={appliedDiscount ? "line-through text-muted-foreground" : "font-medium"}>
              ${basePrice.toFixed(2)}
            </span>
          </div>
          {appliedDiscount && (
            <div className="flex justify-between items-center text-sm text-success">
              <span>Discount ({appliedDiscount.code})</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total Today</span>
          <span className="text-primary">${finalPrice.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedPlan === "monthly" 
            ? `Billed $${finalPrice.toFixed(2)}/month. Cancel anytime.`
            : `Billed $${finalPrice.toFixed(2)}/year. Cancel anytime.`
          }
        </p>

        {showButton && (
          <>
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
          </>
        )}
      </CardContent>
      {showButton && (
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
      )}
    </Card>
  );

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
                <OrderSummary showButton={false} />
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
                      <span className="font-medium text-foreground">Secure Payment</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When you click "Subscribe Now", you'll be securely redirected to our payment portal. 
                      Your payment information is processed securely and never stored on our servers.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-foreground mb-4">What's Included</h3>
                    <ul className="space-y-2">
                      {planFeatures.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground mt-3">
                      + {planFeatures.length - 5} more features
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
              <OrderSummary showButton={true} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
