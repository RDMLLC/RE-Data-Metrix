import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2 } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  comments: z.string().min(10, "Please provide at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      comments: "",
    },
  });

  const onSubmit = (data: ContactFormData) => {
    console.log('Contact form submitted:', { ...data, source: 'contact_us' });
    // TODO: Connect to Zoho CRM API
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-success/10 border-l-4 border-success rounded-md p-6" data-testid="text-confirmation">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-success text-lg mb-1">Thank you for reaching out!</h3>
            <p className="text-foreground">We'll respond shortly.</p>
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
              <FormLabel className="text-foreground font-medium">
                Name <span className="text-accent">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  {...field}
                  className="border-border focus:ring-accent"
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
              <FormLabel className="text-foreground font-medium">
                Company Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Your Company LLC"
                  {...field}
                  className="border-border focus:ring-accent"
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
              <FormLabel className="text-foreground font-medium">
                Email Address <span className="text-accent">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  {...field}
                  className="border-border focus:ring-accent"
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
              <FormLabel className="text-foreground font-medium">
                Phone Number (Optional)
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  {...field}
                  className="border-border focus:ring-accent"
                  data-testid="input-phone"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground font-medium">
                Comments <span className="text-accent">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="How can we help you?"
                  {...field}
                  rows={5}
                  className="border-border focus:ring-accent resize-none"
                  data-testid="input-comments"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary"
          size="lg"
          data-testid="button-submit"
        >
          Send Message
        </Button>
      </form>
    </Form>
  );
}
