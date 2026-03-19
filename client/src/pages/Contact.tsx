import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Card } from "@/components/ui/card";
import { MapPin, Mail, Clock } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Contact() {
  return (
    <Layout>
      <SEO
        title="Contact Us"
        description="Get in touch with RE Data Metrix. Have questions about our real estate deal analysis tools, lender directory, or pricing? We'd love to hear from you — we respond within 24-48 business hours."
        keywords="contact RE Data Metrix, real estate software support, investor tools help, customer service"
        canonicalUrl="https://redatametrix.com/contact"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold text-primary mb-4">Contact Us</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground">
            Have questions? We'd love to hear from you.
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
      </div>
    </Layout>
  );
}
