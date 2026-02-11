import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2, Mail, ShieldAlert, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

const requestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function AdminRequestPasswordReset() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      email: "",
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      const response = await apiRequest('POST', '/api/admin/request-password-reset', data);
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
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
              <div className="flex items-center gap-3 mb-2">
                <ShieldAlert className="h-6 w-6" />
                <CardTitle className="text-2xl">Admin Password Reset</CardTitle>
              </div>
              <CardDescription className="text-primary-foreground/80">
                Reset your administrator password
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {submitted ? (
                <div className="bg-green-500/10 border-l-4 border-green-500 rounded-md p-6" data-testid="text-success">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-green-700 text-lg mb-1">Check your email</h3>
                      <p className="text-foreground mb-4">
                        If an admin account exists with that email, we've sent password reset instructions.
                      </p>
                      <Button asChild variant="outline" size="sm" data-testid="button-back-login">
                        <Link href="/login">
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back to Login
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="text-center mb-6">
                      <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Enter your admin email address and we'll send you a link to reset your password.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="admin@example.com"
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
                      <Link href="/login" className="text-accent hover:underline" data-testid="link-login">
                        <ArrowLeft className="h-4 w-4 inline mr-1" />
                        Back to Login
                      </Link>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
