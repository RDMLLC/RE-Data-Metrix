import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Users, Gift } from "lucide-react";
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

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState<string>("no");
  const [compCode, setCompCode] = useState<string | null>(null);
  const [compCodeValid, setCompCodeValid] = useState<boolean | null>(null);
  const [compEmail, setCompEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const comp = params.get("comp");
    if (comp) {
      setCompCode(comp.toUpperCase());
      fetch(`/api/comp-invites/validate/${comp}`)
        .then(res => res.json())
        .then(data => {
          setCompCodeValid(data.valid);
          if (data.valid && data.email) {
            setCompEmail(data.email);
          }
        })
        .catch(() => setCompCodeValid(false));
    }
  }, []);

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
        setLocation("/portal/profile");
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
              <Card className="p-8 shadow-xl bg-card" data-testid="card-register">
                <CardHeader>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription>
                    Start analyzing deals and connecting with lenders
                  </CardDescription>
                </CardHeader>
                {compCodeValid === true && (
                  <Alert className="mb-4 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
                    <Gift className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="text-emerald-800 dark:text-emerald-200">
                      Premium Access Invitation
                    </AlertTitle>
                    <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                      You've been invited with complimentary premium access! Complete your registration to activate your free membership.
                    </AlertDescription>
                  </Alert>
                )}
                
                {compCodeValid === false && compCode && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Invalid or Expired Code</AlertTitle>
                    <AlertDescription>
                      The comp code "{compCode}" is invalid or has expired. You can still register for a standard account.
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
