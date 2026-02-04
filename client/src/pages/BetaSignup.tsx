import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, Loader2, AlertCircle, Tag, Eye, EyeOff, Sparkles } from "lucide-react";
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
} from "@/components/ui/form";
import { TermsModal } from "@/components/TermsModal";

const betaFeatures = [
  "Complete Deal Analysis with ROI calculations",
  "Side-by-side lender loan comparisons",
  "Rental Analysis with DSCR calculations",
  "Access to curated lender network",
  "Save and track unlimited deals",
  "Full access to Toolbox resources",
  "Early access to new features",
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

export default function BetaSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; message: string; codeType?: string; promoCodeId?: string; durationMonths?: number } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      termsAccepted: undefined,
    },
  });

  const validatePromoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/subscription/validate-discount", { 
        code, 
        plan: "monthly" 
      });
      return await response.json();
    },
    onSuccess: (data: { valid: boolean; percentOff?: number; message?: string; codeType?: string; promoCodeId?: string; durationMonths?: number }) => {
      setIsValidatingPromo(false);
      if (data.valid && data.percentOff === 100) {
        setAppliedPromo({
          code: promoCode.toUpperCase(),
          message: data.message || "Promo code applied!",
          codeType: data.codeType,
          promoCodeId: data.promoCodeId,
          durationMonths: data.durationMonths,
        });
        toast({
          title: "Promo Code Applied!",
          description: data.message || "Your promo code has been applied.",
        });
      } else if (data.valid && data.percentOff !== 100) {
        toast({
          title: "Invalid Promo Code",
          description: "This page is for BETA signups with 100% free promo codes only.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invalid Promo Code",
          description: data.message || "This promo code is not valid.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setIsValidatingPromo(false);
      toast({
        title: "Error",
        description: "Unable to validate promo code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setIsValidatingPromo(true);
    validatePromoMutation.mutate(promoCode.trim());
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!appliedPromo) {
      toast({
        title: "Promo Code Required",
        description: "Please enter a valid BETA promo code to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);

    try {
      const response = await fetch("/api/subscription/checkout/free-with-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          discountCode: appliedPromo.code,
          selectedPlan: "monthly",
          codeType: appliedPromo.codeType,
          promoCodeId: appliedPromo.promoCodeId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: "Welcome to the BETA!",
        description: appliedPromo.durationMonths 
          ? `Your ${appliedPromo.durationMonths} months of free access has been activated.`
          : "Your premium account has been activated.",
      });

      setLocation("/portal/dashboard");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">BETA Access</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Join the RE Data Metrix BETA</h1>
            <p className="text-muted-foreground">Get early access to our real estate investment platform - no credit card required</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Registration Form */}
            <Card className="lg:col-span-3" data-testid="card-beta-registration">
              <CardHeader>
                <CardTitle>Create Your Account</CardTitle>
                <CardDescription>Enter your details to join the BETA program</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} data-testid="input-beta-fullname" />
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
                            <Input placeholder="johndoe" {...field} data-testid="input-beta-username" />
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
                            <Input type="email" placeholder="you@example.com" {...field} data-testid="input-beta-email" />
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
                                  type={showPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  {...field} 
                                  data-testid="input-beta-password" 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2"
                                  onClick={() => setShowPassword(!showPassword)}
                                  tabIndex={-1}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                                  type={showConfirmPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  {...field} 
                                  data-testid="input-beta-confirm-password" 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  tabIndex={-1}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Promo Code Section */}
                    <div className="pt-4 border-t">
                      <Label className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-primary" />
                        BETA Promo Code <span className="text-destructive">*</span>
                      </Label>
                      {appliedPromo ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-700 dark:text-green-400">{appliedPromo.code}</span>
                            <span className="text-sm text-green-600 dark:text-green-500">- {appliedPromo.message}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removePromo}
                            className="text-green-700 hover:text-green-800"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter your BETA promo code"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            className="flex-1"
                            data-testid="input-beta-promo-code"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleApplyPromo}
                            disabled={!promoCode.trim() || isValidatingPromo}
                            data-testid="button-apply-promo"
                          >
                            {isValidatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                          </Button>
                        </div>
                      )}
                      {!appliedPromo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          A valid BETA promo code is required to sign up
                        </p>
                      )}
                    </div>

                    {/* Terms Acceptance */}
                    <FormField
                      control={form.control}
                      name="termsAccepted"
                      render={({ field }) => (
                        <FormItem>
                          <div className="border rounded-lg p-4 bg-muted/30">
                            <div className="flex items-start gap-3">
                              {field.value ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <Check className="h-5 w-5" />
                                  <span className="text-sm font-medium">Terms Accepted</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <AlertCircle className="h-5 w-5" />
                                  <span className="text-sm">Please review and accept terms</span>
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                className="ml-auto p-0 h-auto text-sm"
                                onClick={() => setTermsModalOpen(true)}
                              >
                                {field.value ? "Review Again" : "Review Terms"}
                              </Button>
                            </div>
                          </div>
                          <FormMessage />
                          <TermsModal
                            open={termsModalOpen}
                            onOpenChange={setTermsModalOpen}
                            onAccept={() => {
                              field.onChange(true);
                              setTermsModalOpen(false);
                            }}
                          />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isRegistering || !appliedPromo}
                      data-testid="button-beta-submit"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Join BETA Program"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Features Panel */}
            <Card className="lg:col-span-2 h-fit" data-testid="card-beta-features">
              <CardHeader>
                <CardTitle className="text-lg">What You Get</CardTitle>
                <CardDescription>Full access to all premium features</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {betaFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-center text-muted-foreground">
                    <span className="font-semibold text-primary">No credit card required</span>
                    <br />
                    Just enter your promo code to get started
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
