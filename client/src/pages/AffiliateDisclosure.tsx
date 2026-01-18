import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

export default function AffiliateDisclosure() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Affiliate Disclosure</h1>
          <div className="h-0.5 w-24 bg-accent mx-auto mb-4 mt-3"></div>
          <p className="text-xs text-muted-foreground">Last Updated: January 2026</p>
        </div>

        <Card className="p-6 prose prose-sm max-w-none dark:prose-invert prose-headings:text-base prose-headings:font-semibold prose-p:text-[13px] prose-p:leading-relaxed prose-li:text-[13px] prose-li:leading-relaxed">
          <h2 className="text-primary">About This Disclosure</h2>
          <p className="text-foreground">
            In the interest of full transparency, RE Data Metrix ("RDM") wants you to be aware that we participate in affiliate marketing programs and referral arrangements with various third parties. This disclosure explains how these relationships work and how they may affect the content and recommendations on our platform.
          </p>

          <h2 className="text-primary">Affiliate Relationships</h2>
          <p className="text-foreground">
            RE Data Metrix maintains affiliate relationships with various companies and service providers in the real estate investment industry. When you click on certain links on our platform and make a purchase or sign up for a service, we may receive a commission or referral fee at no additional cost to you.
          </p>
          <p className="text-foreground">
            These affiliate relationships may include, but are not limited to:
          </p>
          <ul className="text-foreground">
            <li>Real estate investment software and tools</li>
            <li>Property management platforms</li>
            <li>Lead generation services</li>
            <li>Real estate education and training programs</li>
            <li>Market data and analytics providers</li>
            <li>CRM and business management tools</li>
          </ul>

          <h2 className="text-primary">Lender Referral Program</h2>
          <p className="text-foreground">
            A significant aspect of our business model involves our Lender Referral Program. When you express interest in a loan product through our platform and subsequently work with that lender, RE Data Metrix may receive compensation in the form of:
          </p>
          <ul className="text-foreground">
            <li>Referral fees</li>
            <li>Points or basis points on funded loans</li>
            <li>Commission payments</li>
          </ul>
          <p className="text-foreground">
            This compensation arrangement does not increase the cost of your loan. The terms and conditions of any loan you obtain are determined solely by the lender based on your qualifications and their lending criteria.
          </p>

          <h2 className="text-primary">How Compensation May Influence Content</h2>
          <p className="text-foreground">
            While we strive to provide objective and helpful information, you should be aware that our affiliate relationships may influence:
          </p>
          <ul className="text-foreground">
            <li>Which products and services are featured on our platform</li>
            <li>The order in which products or lenders are displayed</li>
            <li>The prominence given to certain recommendations</li>
          </ul>
          <p className="text-foreground">
            However, we are committed to only partnering with companies and services that we believe provide genuine value to our users. We do not promote products solely based on compensation, and we include information about services regardless of whether we receive affiliate compensation.
          </p>

          <h2 className="text-primary">Our Commitment to You</h2>
          <p className="text-foreground">
            Despite our affiliate relationships, RE Data Metrix is committed to:
          </p>
          <ul className="text-foreground">
            <li>Providing honest and accurate information about products and services</li>
            <li>Only recommending products we believe are valuable to our users</li>
            <li>Disclosing our affiliate relationships transparently</li>
            <li>Never letting compensation influence our editorial integrity</li>
            <li>Including both affiliated and non-affiliated options when relevant</li>
          </ul>

          <h2 className="text-primary">Your Choice</h2>
          <p className="text-foreground">
            You are never obligated to use any affiliate links or partner services. You can always choose to find and access these products and services directly. Using our affiliate links is one way to support RE Data Metrix while getting the same products and services you would otherwise purchase.
          </p>

          <h2 className="text-primary">Questions About Our Affiliate Relationships</h2>
          <p className="text-foreground">
            If you have questions about specific affiliate relationships or would like clarification about whether a particular recommendation involves affiliate compensation, please <Link href="/contact" className="text-primary hover:underline">contact us</Link>. We are happy to provide additional information about our partnerships.
          </p>

          <h2 className="text-primary">Related Policies</h2>
          <p className="text-foreground">
            For more information about how we operate, please review our:
          </p>
          <ul className="text-foreground">
            <li><Link href="/terms" className="text-primary hover:underline">Terms of Service</Link></li>
            <li><Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link></li>
            <li><Link href="/disclaimer" className="text-primary hover:underline">Investment Disclaimer</Link></li>
          </ul>
        </Card>
      </div>
    </Layout>
  );
}
