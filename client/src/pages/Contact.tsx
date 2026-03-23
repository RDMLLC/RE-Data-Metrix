import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Card } from "@/components/ui/card";
import { MapPin, Mail, Clock } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ContactPageSchema } from "@/components/StructuredData";

export default function Contact() {
  return (
    <Layout>
      <SEO
        fullTitle="Contact RE Data Metrix | Real Estate Investment Platform"
        description="Contact RE Data Metrix with questions about deal analysis tools, lenders, or your account. Our team is here to help."
        canonicalUrl="https://redatametrix.com/contact"
      />
      <ContactPageSchema />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold text-primary mb-4">Contact RE Data Metrix</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground">
            <strong><em>real estate investment platform</em></strong> support for investors who need help with deal analysis tools, lender connections, or account questions.
          </p>
          <p className="text-lg text-muted-foreground mt-4">
            Reach out to our team and we'll respond as quickly as possible to help you move forward with your next investment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">Send Us a Message</h2>
              <ContactForm />
            </Card>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-primary text-primary-foreground">
              <div className="flex items-start gap-4 mb-6">
                <MapPin className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Our Location</h3>
                  <div className="text-sm text-primary-foreground/80 space-y-1">
                    <p>RE Data Metrix, LLC</p>
                    <p>8735 Dunwoody Pl, Suite R</p>
                    <p>Atlanta, GA 30350</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <Mail className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Email</h3>
                  <p className="text-sm text-primary-foreground/80">
                    Use the contact form and we'll respond promptly
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Response Time</h3>
                  <p className="text-sm text-primary-foreground/80">
                    We typically respond within 24-48 business hours
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-success/10 border-l-4 border-success">
              <h3 className="font-semibold text-success text-lg mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/about" className="text-foreground hover:text-accent transition-colors">
                    Learn About Our Mission
                  </a>
                </li>
                <li>
                  <a href="/company" className="text-foreground hover:text-accent transition-colors">
                    Explore Our Platform
                  </a>
                </li>
                <li>
                  <a href="/login" className="text-foreground hover:text-accent transition-colors">
                    Join the Waitlist
                  </a>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        <section className="mt-16 max-w-3xl">
          <h2 className="text-2xl font-bold text-primary mb-6">How We Can Help</h2>

          <h3 className="text-xl font-semibold text-primary mb-2">Deal Analysis Support</h3>
          <p className="text-muted-foreground mb-6">
            Get help using our tools to analyze deals, calculate ROI, and compare financing options.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Lender and Funding Questions</h3>
          <p className="text-muted-foreground mb-6">
            Learn how to connect with lenders and find the right financing solutions for your deals.
          </p>

          <h3 className="text-xl font-semibold text-primary mb-2">Account and Platform Assistance</h3>
          <p className="text-muted-foreground mb-6">
            Need help with your account or features? Our team is here to guide you.
          </p>

          <p className="text-muted-foreground">
            Want to explore first? Try our <a href="/deal-analysis" className="text-primary hover:underline">deal analysis tool</a> or browse <a href="/lenders" className="text-primary hover:underline">real estate investment lenders</a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
