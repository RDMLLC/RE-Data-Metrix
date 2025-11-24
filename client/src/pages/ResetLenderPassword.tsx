import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2, Lock, Building2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const resetSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetLenderPassword() {
  const [, params] = useRoute("/lender/reset-password/:token");
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const tokenValidation = useQuery({
    queryKey: ['/api/lenders/validate-reset-token', params?.token],
    queryFn: async () => {
      const res = await fetch(`/api/lenders/validate-reset-token/${params?.token}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Invalid token');
      }
      return await res.json();
    },
    enabled: !!params?.token,
    retry: false,
  });

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetFormData) => {
      const response = await apiRequest('POST', `/api/lenders/reset-password/${params?.token || ''}`, {
        password: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setErrorMessage('');
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Password reset failed');
    },
  });

  const onSubmit = (data: ResetFormData) => {
    resetMutation.mutate(data);
  };

  if (tokenValidation.isLoading) {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Validating reset link...</p>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!params?.token || tokenValidation.isError || (tokenValidation.isSuccess && !tokenValidation.data?.valid)) {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="p-8 text-center">
            <Building2 className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-destructive mb-4">Invalid Reset Link</h2>
            <p className="text-muted-foreground mb-6">This lender password reset link is invalid or has expired.</p>
            <Button asChild data-testid="button-request-reset">
              <a href="/lender/request-password-reset">Request New Reset Link</a>
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="h-10 w-10 text-accent" />
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Set New Lender Password</h1>
            <p className="text-muted-foreground">
              Enter your new password below for your lender account.
            </p>
          </div>

          {submitted ? (
            <div className="bg-success/10 border-l-4 border-success rounded-md p-6" data-testid="text-success">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-success text-lg mb-1">Password Reset Successfully!</h3>
                  <p className="text-foreground mb-4">
                    You can now log in to the Lender Portal with your new password.
                  </p>
                  <Button asChild data-testid="button-login">
                    <a href="/login#lender-portal">Continue to Lender Login</a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {errorMessage && (
                  <div className="bg-destructive/10 border-l-4 border-destructive rounded-md p-4" data-testid="text-error">
                    <p className="text-destructive text-sm">{errorMessage}</p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          {...field}
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
                          type="password"
                          placeholder="Confirm new password"
                          {...field}
                          data-testid="input-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetMutation.isPending}
                  data-testid="button-submit"
                >
                  {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </Form>
          )}
        </Card>
      </div>
    </Layout>
  );
}
