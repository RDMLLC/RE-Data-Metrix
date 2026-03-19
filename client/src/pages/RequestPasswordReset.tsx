import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2, Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const requestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function RequestPasswordReset() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      email: "",
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      const response = await apiRequest('POST', '/api/auth/request-password-reset', data);
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const onSubmit = (data: RequestFormData) => {
    requestMutation.mutate(data);
  };

  return (
    <Layout>
      <SEO
        title="Reset Password"
        description="Reset your RE Data Metrix account password."
        noIndex={true}
      />
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="p-8">
          <div className="text-center mb-8">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
            <p className="text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {submitted ? (
            <div className="bg-success/10 border-l-4 border-success rounded-md p-6" data-testid="text-success">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-success text-lg mb-1">Check your email</h3>
                  <p className="text-foreground mb-4">
                    If an account exists with that email, we've sent password reset instructions.
                  </p>
                  <Button asChild variant="outline" size="sm" data-testid="button-back-login">
                    <a href="/login">Back to Login</a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your.email@example.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestMutation.isPending}
                  data-testid="button-submit"
                >
                  {requestMutation.isPending ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <div className="text-center text-sm">
                  <a href="/login" className="text-accent hover:underline" data-testid="link-login">
                    Back to Login
                  </a>
                </div>
              </form>
            </Form>
          )}
        </Card>
      </div>
    </Layout>
  );
}
