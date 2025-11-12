import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2 } from "lucide-react";

const prelaunchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  consent: z.boolean().refine(val => val === true, {
    message: "You must consent to receive updates"
  }),
});

type PrelaunchFormData = z.infer<typeof prelaunchSchema>;

interface PrelaunchFormProps {
  source?: 'home_prelaunch' | 'login_prelaunch';
}

export default function PrelaunchForm({ source = 'home_prelaunch' }: PrelaunchFormProps) {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<PrelaunchFormData>({
    resolver: zodResolver(prelaunchSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      consent: false,
    },
  });

  const onSubmit = (data: PrelaunchFormData) => {
    console.log('Prelaunch form submitted:', { ...data, source });
    // TODO: Connect to Zoho CRM API
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-success/10 border-l-4 border-success rounded-md p-6" data-testid="text-confirmation">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-success text-lg mb-1">Thank you!</h3>
            <p className="text-foreground">We'll keep you informed of our progress!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-primary-foreground font-medium">
                Name <span className="text-accent">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  {...field}
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:ring-accent"
                  data-testid="input-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-primary-foreground font-medium">
                Company <span className="text-accent">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Your Company LLC"
                  {...field}
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:ring-accent"
                  data-testid="input-company"
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
              <FormLabel className="text-primary-foreground font-medium">
                Email Address <span className="text-accent">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  {...field}
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:ring-accent"
                  data-testid="input-email"
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
              <FormLabel className="text-primary-foreground font-medium">
                Phone Number (Optional)
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  {...field}
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:ring-accent"
                  data-testid="input-phone"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="border-white/40 bg-white/10 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  data-testid="checkbox-consent"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm text-primary-foreground font-normal cursor-pointer">
                  I consent to receive updates and information about RE Data Metrix <span className="text-accent">*</span>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent"
          size="lg"
          data-testid="button-submit"
        >
          Lock in my Discount
        </Button>
      </form>
    </Form>
  );
}
