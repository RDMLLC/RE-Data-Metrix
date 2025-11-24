import { useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const companyInfoSchema = z.object({
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  referralLink: z.string().url().optional().or(z.literal("")),
  referralAmount: z.any().optional(),
  referralType: z.any().optional(),
  companyDescription: z.string().optional(),
});

type CompanyInfoForm = z.infer<typeof companyInfoSchema>;

export default function LenderCompanyInfo() {
  const { toast } = useToast();

  const { data: lenderData, isLoading: isLoadingLender } = useQuery({
    queryKey: ['/api/lenders/me'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/lenders/me");
      return await res.json();
    },
  });

  const saveCompanyInfoMutation = useMutation({
    mutationFn: async (data: CompanyInfoForm) => {
      const res = await apiRequest("POST", "/api/lender-company-info", data);
      return await res.json();
    },
    onSuccess: async (updatedLender) => {
      queryClient.setQueryData(["/api/lenders/me"], updatedLender);
      form.reset({
        companyName: updatedLender.companyName || "",
        contactName: updatedLender.contactName || "",
        phone: updatedLender.phone || "",
        email: updatedLender.email || "",
        website: updatedLender.website || "",
        referralLink: updatedLender.referralLink || "",
        referralAmount: updatedLender.referralAmount,
        referralType: updatedLender.referralType || "$",
        companyDescription: updatedLender.companyDescription || "",
      });
      toast({
        title: "Company Info Saved",
        description: "Your company information has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save company info. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CompanyInfoForm>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      website: "",
      referralLink: "",
      referralAmount: "",
      referralType: "$",
      companyDescription: "",
    },
  });

  // Reset form when lender data loads
  useEffect(() => {
    if (lenderData) {
      form.reset({
        companyName: lenderData.companyName || "",
        contactName: lenderData.contactName || "",
        phone: lenderData.phone || "",
        email: lenderData.email || "",
        website: lenderData.website || "",
        referralLink: lenderData.referralLink || "",
        referralAmount: lenderData.referralAmount,
        referralType: lenderData.referralType || "$",
        companyDescription: lenderData.companyDescription || "",
      });
    }
  }, [lenderData]);

  const onSubmit = async (data: CompanyInfoForm) => {
    saveCompanyInfoMutation.mutate(data);
  };

  if (isLoadingLender) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] py-16 bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading your information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/lender-dashboard">
              <Button
                variant="outline"
                data-testid="button-back"
              >
                ← Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">Company Info</h1>
            <div className="h-1 w-24 bg-accent mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Update your company information and contact details
            </p>
          </div>

          <Card className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Company Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Enter your company name"
                          data-testid="input-company-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Contact Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Enter contact person's name"
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="tel"
                          placeholder="(555) 123-4567"
                          data-testid="input-phone"
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
                      <FormLabel className="text-foreground">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="email"
                          placeholder="contact@company.com"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Website</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="url"
                          placeholder="https://www.company.com"
                          data-testid="input-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referralLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Referral Link</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="url"
                          placeholder="https://www.company.com/apply"
                          data-testid="input-referral-link"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="referralType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">
                          Referral Type
                          {lenderData?.referralType && <span className="text-xs text-muted-foreground ml-2">(Set by admin)</span>}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                          disabled={!!lenderData?.referralType}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-referral-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="$" data-testid="option-dollar">$ (Dollar Amount)</SelectItem>
                            <SelectItem value="%" data-testid="option-percent">% (Percentage)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referralAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">
                          Referral Amount
                          {lenderData?.referralAmount && <span className="text-xs text-muted-foreground ml-2">(Set by admin)</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type="number"
                            step="0.01"
                            placeholder="Enter amount"
                            disabled={!!lenderData?.referralAmount}
                            data-testid="input-referral-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="companyDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">What's cool about your company?</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Tell us what makes your company unique..."
                          data-testid="input-company-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    className="flex-1"
                    data-testid="button-save-company-info"
                    disabled={saveCompanyInfoMutation.isPending}
                  >
                    {saveCompanyInfoMutation.isPending ? "Saving..." : "Save Company Info"}
                  </Button>
                  <Link href="/lender-dashboard">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
