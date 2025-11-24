import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Copy, CheckCircle2, DollarSign } from "lucide-react";
import { useState } from "react";

const inviteSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  username: z.string().min(1, "Email is required"),
  referralAmount: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? undefined : val,
    z.coerce.number().positive("Must be a positive number")
  ),
  referralType: z.enum(["$", "%"]),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function LenderInvite() {
  const { toast } = useToast();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      companyName: "",
      username: "",
      referralAmount: 0,
      referralType: "$",
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
      const res = await apiRequest("POST", "/api/lenders/invite", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.type === "invite") {
        setInviteLink(data.inviteUrl);
        toast({
          title: "Invite Created",
          description: `Lender invite created successfully. Password has been sent to their email.`,
        });
      } else if (data.type === "password_reset") {
        toast({
          title: "Password Reset Email Sent",
          description: `Password reset link has been sent to ${form.getValues("username")}. The lender can use the new temporary password or click the reset link.`,
        });
      }
      form.reset();
      setInviteLink(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteForm) => {
    createInviteMutation.mutate(data);
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">Create Lender Invite</h1>
            <div className="h-1 w-24 bg-accent mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Create an invite link for a new lender to join the platform
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lender Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ABC Lending Inc."
                            {...field}
                            data-testid="input-company-name"
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="lender@company.com"
                            {...field}
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Referral Fee Configuration
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Set the referral fee for this lender. This will be visible to investors but not editable by the lender.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="referralAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Referral Fee Amount *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 500 or 2.5"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-referral-amount"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="referralType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fee Type *</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground"
                                data-testid="select-referral-type"
                              >
                                <option value="$">Dollars ($)</option>
                                <option value="%">Percentage (%)</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    A temporary password will be automatically generated and sent to the lender's email. For new lenders, they will be required to change it upon signup. For existing lenders, this will send a password reset link.
                  </p>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createInviteMutation.isPending}
                    data-testid="button-create-invite"
                  >
                    {createInviteMutation.isPending ? "Creating..." : "Create Invite"}
                  </Button>
                </form>
              </Form>

              {inviteLink && (
                <div className="mt-6 p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">Invite Link Generated:</p>
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="flex-1"
                      data-testid="text-invite-link"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                      data-testid="button-copy-link"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this link with the lender to complete their signup. Link expires in 7 days.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
