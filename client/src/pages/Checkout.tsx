import { useState, useEffect, memo } from "react";
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
import { Check, CreditCard, Shield, Lock, ArrowLeft, Loader2, AlertCircle, Tag, Star, FileText, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMarketingEvents } from "@/components/MarketingPixelLoader";
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

const MONTHLY_PRICE = 25;
const ANNUAL_PRICE = 250;
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
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the User Agreement and Privacy Policy" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface OrderSummaryProps {
  showButton: boolean;
  selectedPlan: "free" | "monthly" | "annual";
  setSelectedPlan: (plan: "free" | "monthly" | "annual") => void;
  appliedDiscount: { code: string; percentOff: number; amountOff: number; codeType?: string; promoCodeId?: string; durationMonths?: number } | null;
  setAppliedDiscount: (discount: { code: string; percentOff: number; amountOff: number; codeType?: string; promoCodeId?: string; durationMonths?: number } | null) => void;
  discountCode: string;
  setDiscountCode: (code: string) => void;
  isValidatingDiscount: boolean;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  isProcessing: boolean;
  isPending: boolean;
  onApplyDiscount: () => void;
  onRemoveDiscount: () => void;
  onCheckout: () => void;
}

const OrderSummary = memo(function OrderSummary({
  showButton,
  selectedPlan,
  setSelectedPlan,
  appliedDiscount,
  setAppliedDiscount,
  discountCode,
  setDiscountCode,
  isValidatingDiscount,
  basePrice,
  discountAmount,
  finalPrice,
  isProcessing,
  isPending,
  onApplyDiscount,
  onRemoveDiscount,
  onCheckout,
}: OrderSummaryProps) {
  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Plan</Label>
          <RadioGroup
            value={selectedPlan}
            onValueChange={(value) => {
              setSelectedPlan(value as "free" | "monthly" | "annual");
              if (appliedDiscount) {
                setAppliedDiscount(null);
                setDiscountCode("");
              }
            }}
            className="space-y-2"
            data-testid="radio-plan-selection"
          >
            <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedPlan === "free" ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/50"}`}>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="free" id="plan-free" data-testid="radio-plan-free" />
                <Label htmlFor="plan-free" className="cursor-pointer">
                  <div className="font-medium">Free</div>
                  <div className="text-sm text-muted-foreground">2 automated deal analyses/month</div>
                </Label>
              </div>
              <span className="font-semibold">$0</span>
            </div>
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

        {selectedPlan !== "free" && (
          <>
            <Separator />

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
                    onClick={onRemoveDiscount}
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
                    onClick={onApplyDiscount}
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
          </>
        )}

        {selectedPlan === "free" && (
          <>
            <Separator />
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Today</span>
              <span className="text-success">$0.00</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Free account with 2 automated deal analyses per month. Upgrade anytime.
            </p>
          </>
        )}

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
            onClick={onCheckout}
            disabled={isProcessing || isPending}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
            data-testid="button-subscribe-now"
          >
            {isProcessing || isPending ? (
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
});

export default function Checkout() {
  const { isAuthenticated, isSubscriber, user, register: registerUser } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { trackInitiateCheckout, trackCompleteRegistration } = useMarketingEvents();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  
  // Plan and discount state
  const urlParams = new URLSearchParams(searchString);
  const urlPlan = urlParams.get("plan");
  const urlCode = urlParams.get("code");
  const initialPlan = urlPlan === "monthly" ? "monthly" : urlPlan === "free" ? "free" : "annual";
  const [selectedPlan, setSelectedPlan] = useState<"free" | "monthly" | "annual">(initialPlan);
  const [discountCode, setDiscountCode] = useState(urlCode ? urlCode.toUpperCase() : "");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percentOff: number; amountOff: number; codeType?: string; promoCodeId?: string; durationMonths?: number } | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  
  // Comp code state
  const [compCode, setCompCode] = useState("");
  const [showCompCodeField, setShowCompCodeField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Terms modal state
  const [showTermsModal, setShowTermsModal] = useState(false);

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
      termsAccepted: false as unknown as true,
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
    onSuccess: (data: { valid: boolean; percentOff?: number; amountOff?: number; message?: string; codeType?: string; promoCodeId?: string; durationMonths?: number }) => {
      setIsValidatingDiscount(false);
      if (data.valid) {
        setAppliedDiscount({
          code: discountCode.toUpperCase(),
          percentOff: data.percentOff || 0,
          amountOff: data.amountOff || 0,
          codeType: data.codeType,
          promoCodeId: data.promoCodeId,
          durationMonths: data.durationMonths,
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

  // Auto-apply discount code from URL params on mount
  useEffect(() => {
    if (urlCode && urlCode.trim() && selectedPlan !== "free") {
      setIsValidatingDiscount(true);
      validateDiscountMutation.mutate(urlCode.trim().toUpperCase());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
  };

  const [stripePrices, setStripePrices] = useState<{ monthly?: string; annual?: string }>({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState(false);

  // Fetch Stripe prices on mount
  useEffect(() => {
    const fetchPrices = async () => {
      setPricesLoading(true);
      setPricesError(false);
      try {
        const response = await fetch("/api/subscription/plans");
        if (response.ok) {
          const data = await response.json();
          const prices: { monthly?: string; annual?: string } = {};
          for (const plan of data.plans || []) {
            if (plan.planType === "monthly") {
              prices.monthly = plan.id;
            } else if (plan.planType === "annual") {
              prices.annual = plan.id;
            }
          }
          if (prices.monthly && prices.annual) {
            setStripePrices(prices);
          } else {
            setPricesError(true);
          }
        } else {
          setPricesError(true);
        }
      } catch (error) {
        console.error("Failed to fetch Stripe prices:", error);
        setPricesError(true);
      } finally {
        setPricesLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const priceId = selectedPlan === "monthly" ? stripePrices.monthly : stripePrices.annual;
      if (!priceId) {
        throw new Error("Subscription plans are not available. Please try again later.");
      }
      const response = await apiRequest("POST", "/api/subscription/checkout", { 
        priceId,
        discountCode: appliedDiscount?.code,
      });
      return await response.json();
    },
    onSuccess: (data: { url?: string; success?: boolean; message?: string; error?: string }) => {
      setIsProcessing(false);
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.success) {
        toast({
          title: "Subscription Activated!",
          description: data.message || "Welcome to RE Data Metrix membership!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        setLocation("/portal/dashboard");
      } else {
        toast({
          title: "Unable to Process",
          description: data.error || data.message || "Please try again later.",
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
    trackInitiateCheckout({ value: finalPrice, currency: "USD" });
    checkoutMutation.mutate();
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setIsRegistering(true);
    try {
      // For free plan OR if a comp code is provided, register without Stripe
      // Comp codes give premium access, so no payment is needed
      if (selectedPlan === "free" || compCode.trim()) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            username: data.username,
            email: data.email,
            password: data.password,
            fullName: data.fullName,
            compCode: compCode.trim() || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Registration failed");
        }

        // Check if this is a comp user (they get immediate access)
        if (result.user?.subscriptionStatus === 'comped') {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({
            title: "Welcome to RE Data Metrix!",
            description: "Your complimentary account has been activated.",
          });
          setLocation("/portal/dashboard");
          return;
        }

        // Check if email verification is required
        if (result.requiresVerification) {
          setJustRegistered(true);
          trackCompleteRegistration();
          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account.",
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          trackCompleteRegistration();
          toast({
            title: "Welcome to RE Data Metrix!",
            description: "Your free account has been created successfully.",
          });
          setLocation("/portal/dashboard");
        }
        return;
      }

      // For 100% discount codes, bypass Stripe and register with premium access directly
      console.log('[CHECKOUT DEBUG] finalPrice:', finalPrice, 'appliedDiscount:', appliedDiscount);
      if (finalPrice === 0 && appliedDiscount) {
        console.log('[CHECKOUT DEBUG] Using free-with-discount endpoint (100% off)');
        const response = await fetch("/api/subscription/checkout/free-with-discount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            username: data.username,
            email: data.email,
            password: data.password,
            fullName: data.fullName,
            discountCode: appliedDiscount.code,
            selectedPlan,
            codeType: appliedDiscount.codeType,
            promoCodeId: appliedDiscount.promoCodeId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Registration failed");
        }

        // Check if email verification is required
        if (result.requiresVerification) {
          setJustRegistered(true);
          trackCompleteRegistration();
          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account.",
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          trackCompleteRegistration();
          toast({
            title: "Welcome to RE Data Metrix!",
            description: "Your premium account has been activated with 100% discount.",
          });
          setLocation("/portal/dashboard");
        }
        return;
      }

      // For paid plans, proceed with Stripe checkout
      console.log('[CHECKOUT DEBUG] Proceeding with Stripe checkout - finalPrice:', finalPrice);
      const priceId = selectedPlan === "monthly" ? stripePrices.monthly : stripePrices.annual;
      if (!priceId) {
        toast({
          title: "Unable to process",
          description: "Subscription plans are not available. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      // Call the payment-first checkout endpoint
      const response = await fetch("/api/subscription/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          priceId,
          selectedPlan,
          discountCode: appliedDiscount?.code,
          termsAccepted: data.termsAccepted,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("No checkout URL returned");
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

  // Common props for OrderSummary component
  const orderSummaryProps = {
    selectedPlan,
    setSelectedPlan,
    appliedDiscount,
    setAppliedDiscount,
    discountCode,
    setDiscountCode,
    isValidatingDiscount,
    basePrice,
    discountAmount,
    finalPrice,
    isProcessing,
    isPending: checkoutMutation.isPending,
    onApplyDiscount: handleApplyDiscount,
    onRemoveDiscount: removeDiscount,
    onCheckout: handleCheckout,
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
              <Link href="/pricing" className="inline-flex items-center text-primary hover:underline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pricing
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
                                  <div className="relative">
                                    <Input
                                      {...field}
                                      type={showPassword ? "text" : "password"}
                                      placeholder="••••••••"
                                      autoComplete="new-password"
                                      data-testid="input-checkout-password"
                                    />
                                    <Button
                                      type="button"
                                      tabIndex={-1}
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-1 top-1/2 -translate-y-1/2"
                                      onClick={() => setShowPassword(!showPassword)}
                                      data-testid="button-toggle-checkout-password"
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
                                      data-testid="input-checkout-confirm-password"
                                    />
                                    <Button
                                      type="button"
                                      tabIndex={-1}
                                      variant="ghost"
                                      size="icon"
                                      className="absolute right-1 top-1/2 -translate-y-1/2"
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                      data-testid="button-toggle-checkout-confirm-password"
                                    >
                                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Comp Code Section */}
                        <div className="border-t pt-4 mt-2">
                          <div className="space-y-2">
                            {!showCompCodeField ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-auto p-0 text-sm text-muted-foreground hover:text-primary"
                                onClick={() => setShowCompCodeField(true)}
                                data-testid="button-show-comp-code"
                              >
                                Have a comp code?
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Comp Code</Label>
                                <div className="flex gap-2">
                                  <Input
                                    value={compCode}
                                    onChange={(e) => setCompCode(e.target.value.toUpperCase())}
                                    placeholder="Enter comp code"
                                    className="uppercase"
                                    data-testid="input-checkout-comp-code"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setShowCompCodeField(false);
                                      setCompCode("");
                                    }}
                                    data-testid="button-hide-comp-code"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Enter your complimentary access code if you have one
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Terms Agreement Section */}
                        <div className="border-t pt-4 mt-2">
                          <FormField
                            control={form.control}
                            name="termsAccepted"
                            render={({ field }) => (
                              <FormItem>
                                <div className="space-y-3">
                                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    Legal Agreements
                                  </FormLabel>
                                  {field.value ? (
                                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/30">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-success" />
                                        <span className="text-sm text-success font-medium">Terms Accepted</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowTermsModal(true)}
                                        className="text-muted-foreground hover:text-foreground"
                                        data-testid="button-review-terms-again"
                                      >
                                        Review Again
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() => setShowTermsModal(true)}
                                      data-testid="button-review-terms"
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Review and Accept Terms
                                    </Button>
                                  )}
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Terms Modal */}
                        <TermsModal
                          open={showTermsModal}
                          onOpenChange={setShowTermsModal}
                          onAccept={() => form.setValue("termsAccepted", true)}
                        />
                      </CardContent>
                      <CardFooter className="flex flex-col gap-4">
                        {pricesError && (
                          <p className="text-sm text-destructive text-center">
                            Unable to load subscription plans. Please refresh the page.
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                          size="lg"
                          disabled={isRegistering || pricesLoading || pricesError}
                          data-testid="button-register-and-subscribe"
                        >
                          {pricesLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading Plans...
                            </>
                          ) : isRegistering ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating Account...
                            </>
                          ) : selectedPlan === "free" ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Create Free Account
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Create Account & Subscribe
                            </>
                          )}
                        </Button>
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
                <OrderSummary showButton={false} {...orderSummaryProps} />
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
              <OrderSummary showButton={true} {...orderSummaryProps} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
