import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Users, Gift, CreditCard, Ticket, ArrowLeft, Loader2, FileText } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

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

type RegistrationPath = "choice" | "subscribe" | "comp";

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState<string>("no");
  const [compCode, setCompCode] = useState<string>("");
  const [compCodeInput, setCompCodeInput] = useState<string>("");
  const [compCodeValid, setCompCodeValid] = useState<boolean | null>(null);
  const [compEmail, setCompEmail] = useState<string | null>(null);
  const [compValidating, setCompValidating] = useState(false);
  const [registrationPath, setRegistrationPath] = useState<RegistrationPath>("choice");

  // Check for comp code in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const comp = params.get("comp");
    if (comp) {
      setCompCodeInput(comp.toUpperCase());
      setRegistrationPath("comp");
      validateCompCode(comp.toUpperCase());
    }
  }, []);

  const validateCompCode = async (code: string) => {
    setCompValidating(true);
    try {
      const res = await fetch(`/api/comp-invites/validate/${code}`);
      const data = await res.json();
      setCompCodeValid(data.valid);
      if (data.valid) {
        setCompCode(code);
        if (data.email) {
          setCompEmail(data.email);
        }
      }
    } catch {
      setCompCodeValid(false);
    } finally {
      setCompValidating(false);
    }
  };

  const handleCompCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (compCodeInput.trim()) {
      validateCompCode(compCodeInput.trim().toUpperCase());
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
        compCode: compCodeValid ? compCode : undefined,
      };
      const result = await register(finalData);
      
      if ((result as any)?.requiresVerification) {
        const isComped = (result as any)?.isComped;
        toast({
          title: isComped ? "Premium Access Activated!" : "Check your email!",
          description: isComped 
            ? "Your complimentary premium access is ready. Please verify your email to log in."
            : (result as any).message || "We've sent you a verification link. Please check your inbox.",
        });
        setLocation("/login");
      } else {
        toast({
          title: "Welcome to RE Data Metrix!",
          description: "Your account has been created successfully.",
        });
        setLocation("/portal/dashboard");
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

  // Choice screen - user picks between Subscribe or Comp Code
  if (registrationPath === "choice") {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
          <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-primary mb-4">Join RE Data Metrix</h1>
              <div className="h-1 w-24 bg-accent mx-auto mb-6"></div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get access to professional deal analysis tools, lender comparisons, and investment insights.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subscribe Option */}
              <Card className="relative overflow-hidden hover-elevate cursor-pointer" data-testid="card-subscribe-option">
                <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-sm font-medium rounded-bl-lg">
                  Recommended
                </div>
                <CardHeader className="pt-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Subscribe</CardTitle>
                  <CardDescription>
                    Full access to all premium features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-primary">
                    $15<span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">or $150/year (save $30)</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Unlimited deal analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Full lender database access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Loan comparison tools
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Rental analysis & DSCR matching
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setLocation("/checkout")}
                    data-testid="button-subscribe"
                  >
                    Subscribe Now
                  </Button>
                </CardFooter>
              </Card>

              {/* Comp Code Option */}
              <Card className="hover-elevate cursor-pointer" data-testid="card-comp-option">
                <CardHeader className="pt-8">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
                    <Ticket className="h-8 w-8 text-emerald-600" />
                  </div>
                  <CardTitle className="text-2xl">Have a Comp Code?</CardTitle>
                  <CardDescription>
                    Complimentary access for invited users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-emerald-600">
                    Free<span className="text-base font-normal text-muted-foreground"> access</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-emerald-600" />
                      All premium features included
                    </li>
                    <li className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-emerald-600" />
                      No credit card required
                    </li>
                    <li className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-emerald-600" />
                      Beta tester perks
                    </li>
                    <li className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-emerald-600" />
                      Early access to new features
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="lg"
                    onClick={() => setRegistrationPath("comp")}
                    data-testid="button-use-comp-code"
                  >
                    Enter Comp Code
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Comp Code Entry Screen - user enters their code
  if (registrationPath === "comp" && !compCodeValid) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
          <div className="max-w-md w-full mx-auto px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => {
                setRegistrationPath("choice");
                setCompCodeInput("");
                setCompCodeValid(null);
              }}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Card data-testid="card-comp-code-entry">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-8 w-8 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Enter Your Comp Code</CardTitle>
                <CardDescription>
                  Enter the code you received to activate your complimentary access
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCompCodeSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="compCode">Comp Code</Label>
                    <Input
                      id="compCode"
                      value={compCodeInput}
                      onChange={(e) => setCompCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter your code (e.g., ABC12345)"
                      className="text-center text-lg tracking-wider"
                      data-testid="input-comp-code"
                    />
                  </div>

                  {compCodeValid === false && (
                    <Alert variant="destructive">
                      <AlertTitle>Invalid or Expired Code</AlertTitle>
                      <AlertDescription>
                        This code is invalid or has expired. Please check the code and try again, or contact the person who sent it to you.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!compCodeInput.trim() || compValidating}
                    data-testid="button-validate-code"
                  >
                    {compValidating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Don't have a code?{" "}
                    <button
                      type="button"
                      onClick={() => setLocation("/checkout")}
                      className="text-primary hover:underline"
                      data-testid="link-subscribe-instead"
                    >
                      Subscribe instead
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Registration Form - shown after valid comp code
  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left Side - Navy Value Prop Panel */}
            <div className="lg:col-span-2 bg-primary text-primary-foreground rounded-lg p-12 space-y-8">
              <div>
                <h2 className="text-4xl font-bold mb-6">Complete Your Registration</h2>
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

              {/* Referral Bonus CTA - Integrated */}
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
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => {
                  setRegistrationPath("choice");
                  setCompCode("");
                  setCompCodeInput("");
                  setCompCodeValid(null);
                  setCompEmail(null);
                  form.reset();
                }}
                data-testid="button-back-to-options"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to options
              </Button>

              <Card className="p-8 shadow-xl bg-card" data-testid="card-register">
                <CardHeader>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription>
                    Complete your registration to access your membership
                  </CardDescription>
                </CardHeader>
                {compCodeValid === true && (
                  <Alert className="mb-4 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
                    <Gift className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="text-emerald-800 dark:text-emerald-200">
                      Premium Access Invitation
                    </AlertTitle>
                    <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                      Code <span className="font-mono font-bold">{compCode}</span> verified! Complete your registration to activate your complimentary premium access.
                    </AlertDescription>
                  </Alert>
                )}
                
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
              <div className="space-y-3">
                <Label>Do you have a referral code?</Label>
                <RadioGroup
                  value={hasReferralCode}
                  onValueChange={(value) => {
                    setHasReferralCode(value);
                    if (value === "no") {
                      form.setValue("referralCode", "");
                    }
                  }}
                  className="flex gap-4"
                  data-testid="radio-has-referral-code"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no-referral" data-testid="radio-no-referral" />
                    <Label htmlFor="no-referral" className="font-normal cursor-pointer">
                      No
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="yes-referral" data-testid="radio-yes-referral" />
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
                          data-testid="input-referral-code"
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

              {/* Terms Agreement Checkbox */}
              <div className="border-t pt-4 mt-2">
                <FormField
                  control={form.control}
                  name="termsAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-terms-accepted"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          I agree to the{" "}
                          <Link 
                            href="/terms" 
                            className="text-primary hover:underline" 
                            target="_blank"
                            data-testid="link-terms"
                          >
                            User Agreement
                          </Link>{" "}
                          and{" "}
                          <Link 
                            href="/privacy" 
                            className="text-primary hover:underline" 
                            target="_blank"
                            data-testid="link-privacy"
                          >
                            Privacy Policy
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                  Login
                </Link>
              </p>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
