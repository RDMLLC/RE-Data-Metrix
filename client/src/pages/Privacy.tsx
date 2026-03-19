import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";

export default function Privacy() {
  return (
    <Layout>
      <SEO
        title="Privacy Policy"
        description="Read the RE Data Metrix Privacy Policy — how we collect, use, and protect your information when you use our real estate investment platform."
        noIndex={true}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Privacy Policy</h1>
          <div className="h-0.5 w-24 bg-accent mx-auto mb-4"></div>
          <p className="text-xs text-muted-foreground">Last Updated: February 6, 2026</p>
        </div>

        <Card className="p-6 prose prose-sm max-w-none dark:prose-invert prose-headings:text-base prose-headings:font-semibold prose-p:text-[13px] prose-p:leading-relaxed prose-li:text-[13px] prose-li:leading-relaxed">
          <p className="text-foreground text-sm">
            This Privacy Policy explains how RE Data Metrix ("RDM," "we," "us," or "our") collects, uses, discloses, and safeguards information about you when you visit our website, use the RE Data Metrix platform, or otherwise interact with us (collectively, the "Services"). It is separate from, and incorporated by reference into, our <Link href="/terms" className="text-primary hover:underline">User Agreement</Link>, which governs your use of the Services. If you do not agree with this Privacy Policy, you should not use the Services.
          </p>
          <p className="text-foreground text-sm">
            By accessing or using the Services, you acknowledge that you have read and understood this Privacy Policy and our User Agreement.
          </p>

          <h2 className="text-primary">1. Information We Collect</h2>
          <p className="text-foreground">We collect information in three main ways: (a) directly from you, (b) automatically when you use the Services, and (c) from third parties.</p>

          <h3 className="text-primary/90">Information you provide directly</h3>
          <ul className="text-foreground">
            <li>Account information (e.g., name, email address, password, phone number, company name, role).</li>
            <li>Subscription and billing information (e.g., billing address; payment details are generally processed by third-party payment processors and not stored in full by RDM).</li>
            <li>Deal and property information (e.g., property address, purchase price, rehab budgets, ARV, rent estimates, closing costs, loan terms, experience level, estimated credit score, and other User-Generated Content you input into the Deal Analysis Tool).</li>
            <li>Communications (e.g., support requests, survey responses, feedback, email or phone communications).</li>
            <li>Webinar registration and attendance information (e.g., name, email, attendance status) collected through Zoho Meeting integrations.</li>
            <li>Contractor profile information (e.g., company name, service regions, contact details) provided by contractors during the invitation-based onboarding process.</li>
            <li>Developer Portal configuration data (e.g., webhook URLs, field mappings, integration credentials) provided by users setting up CRM integrations.</li>
            <li>Promo code and referral code usage data, including which codes were redeemed and associated account activity.</li>
          </ul>

          <h3 className="text-primary/90">Information collected automatically</h3>
          <p className="text-foreground">When you use the Services, we and our service providers may automatically collect:</p>
          <ul className="text-foreground">
            <li>Device and usage data (e.g., IP address, browser type, operating system, device identifiers, pages viewed, links clicked, referring/exit pages, dates and times of access, and general location based on IP).</li>
            <li>Log and analytics data related to how you interact with the Deal Analysis Tool and other features, which helps us maintain security, troubleshoot issues, and improve performance.</li>
            <li>Apply click tracking data, which records when you click 'Apply Now' buttons on lender listings, including the associated property details, loan product information, and referral source.</li>
            <li>Marketing pixel data collected by third-party advertising platforms (Meta/Facebook, LinkedIn, Google Ads, TikTok, Twitter/X) embedded on the Platform. These pixels may collect information about your browsing activity, page views, and conversion events (such as account registration, subscription purchase, and webinar registration).</li>
          </ul>
          <h3 className="text-primary/90">Cookies and tracking technologies</h3>
          <p className="text-foreground">
            We use cookies, pixels, and similar tracking technologies to collect some of this information. The types of cookies we use include:
          </p>
          <ul className="text-foreground">
            <li><strong>Essential cookies:</strong> Required for the Services to function properly, including session authentication cookies that keep you logged in and security cookies that protect against unauthorized access. These cookies cannot be disabled.</li>
            <li><strong>Partner Tools tracking cookies:</strong> Our Toolbox features Partner Tools (affiliate programs) from third-party services. When you click on Partner Tool links, these services place tracking cookies to attribute referrals. These cookies are necessary for the Partner Tools to function and cannot be opted out of if you use those features. RDM may receive compensation when you engage with Partner Tools through our platform.</li>
            <li><strong>Analytics cookies:</strong> Help us understand how visitors use the Services, which pages are most popular, and how to improve user experience.</li>
            <li><strong>Advertising and measurement pixels:</strong> The Platform uses tracking pixels from advertising platforms including Meta (Facebook/Instagram), LinkedIn, Google Ads, TikTok, and Twitter (X). These pixels collect data about your interactions with the Platform to measure advertising effectiveness, build advertising audiences, and attribute conversions. You may opt out of personalized advertising through each platform's privacy settings or through industry opt-out tools such as the Digital Advertising Alliance (DAA) at optout.aboutads.info.</li>
          </ul>
          <p className="text-foreground">
            You can usually control non-essential cookies through your browser settings, but disabling cookies may limit certain features of the Services. Essential and Partner Tools cookies are required for core functionality and cannot be disabled.
          </p>

          <h3 className="text-primary/90">Information from third parties</h3>
          <p className="text-foreground">We may receive information about you or your properties from:</p>
          <ul className="text-foreground">
            <li>Lenders and other financial partners who interact with you through our Lender Referral Program.</li>
            <li>Public record databases and third-party data providers integrated into the Platform.</li>
            <li>Marketing, analytics, or affiliate partners, where permitted by law and their privacy policies.</li>
            <li>Property data providers, including RentCast and HasData (which sources data from Zillow), which provide property details, comparable sales data, tax information, rent estimates, and property images when you use the ARV Helper or Deal Analysis tools.</li>
            <li>Zoho Meeting, which provides webinar attendance data that we sync with our registration records to track educational event participation.</li>
          </ul>

          <h2 className="text-primary">2. How We Use Your Information</h2>
          <p className="text-foreground">We use the information we collect for purposes including:</p>
          <ul className="text-foreground">
            <li><strong>Providing and maintaining the Services:</strong> Operating the Platform, processing registrations and subscriptions, enabling deal analysis, generating reports, and maintaining your account.</li>
            <li><strong>Facilitating lender referrals:</strong> Sharing relevant data with lenders when you request or consent to a lender connection, and tracking the status of referrals.</li>
            <li><strong>Improving and personalizing the Services:</strong> Understanding usage patterns, enhancing features, developing new tools, and tailoring content or recommendations.</li>
            <li><strong>Communicating with you:</strong> Sending service-related messages (e.g., confirmations, technical notices, updates, security alerts), responding to your inquiries, and providing customer support.</li>
            <li><strong>Marketing (where permitted):</strong> Sending you newsletters, product updates, promotions, or event information; you can opt out of marketing emails at any time via the unsubscribe link or by contacting us.</li>
            <li><strong>Security and fraud prevention:</strong> Protecting accounts, monitoring for suspicious activity, and enforcing our User Agreement and policies.</li>
            <li><strong>Legal compliance:</strong> Complying with legal obligations, responding to lawful requests, and protecting our rights, users, and the public.</li>
            <li><strong>Providing property data and comparable sales:</strong> Sending property addresses and search parameters to third-party APIs (RentCast and HasData) to retrieve property details, comparable sales, rent estimates, and property images for the ARV Helper and Deal Analysis tools.</li>
            <li><strong>Processing payments:</strong> Sharing billing information with Stripe to process subscription payments, manage billing cycles, and handle refunds or disputes.</li>
            <li><strong>Sending transactional emails:</strong> Using Zoho Mail SMTP to deliver account verification emails, password reset emails, invitation emails, and other system notifications.</li>
            <li><strong>Tracking webinar attendance:</strong> Syncing attendance data from Zoho Meeting with our webinar registration records to track participation in educational events.</li>
            <li><strong>Advertising measurement:</strong> Using marketing pixels to measure the effectiveness of advertising campaigns, track conversion events, and build advertising audiences on platforms such as Meta, LinkedIn, Google Ads, TikTok, and Twitter.</li>
            <li><strong>Developer Portal integrations:</strong> Transmitting Platform event data (such as deal analysis completions or user registrations) to external CRM systems configured by users through the Developer Portal, via webhooks and API integrations.</li>
            <li><strong>Enabling auditor review:</strong> Providing authorized auditors (third-party marketing agencies or compliance reviewers) with read-only access to administrative dashboards, analytics, reports, and user data for marketing performance evaluation and compliance review purposes.</li>
          </ul>
          <p className="text-foreground">
            Where required (e.g., for users in the European Economic Area or U.K.), we rely on lawful bases such as performance of a contract (providing the Services), our legitimate interests (e.g., improving and securing the Services), consent (for certain marketing and cookies), and compliance with legal obligations.
          </p>

          <h2 className="text-primary">3. How We Share Your Information</h2>
          <p className="text-foreground">We may share your information in the following circumstances:</p>
          <ul className="text-foreground">
            <li><strong>With lenders and third-party services at your direction:</strong> When you request lender connections, use referral links, or enable integrations, we share relevant User-Generated Content and contact information with those third parties so they can provide their services to you.</li>
            <li><strong>With service providers:</strong> With vendors who perform services on our behalf, such as hosting, analytics, customer support, email delivery, and payment processing. These providers are authorized to use your information only as necessary to provide services to us.</li>
            <li><strong>With affiliates and business partners:</strong> With our affiliates or business partners in connection with joint offerings, integrations, or referral arrangements, consistent with this Policy and applicable law.</li>
            <li><strong>For legal and safety reasons:</strong> When we believe disclosure is reasonably necessary to comply with law, regulation, legal process, or governmental request; to protect the rights, property, or safety of RDM, our users, or others; or to detect, prevent, or address fraud, security, or technical issues.</li>
            <li><strong>Business transfers:</strong> In connection with a merger, acquisition, financing, reorganization, bankruptcy, sale of assets, or similar transaction, your information may be transferred as part of that transaction, subject to this Privacy Policy or a successor policy that provides at least the same level of protection.</li>
            <li><strong>Aggregated or de-identified information:</strong> We may share aggregated or de-identified data that does not reasonably identify you, for research, analytics, or business purposes.</li>
            <li><strong>With property data providers:</strong> When you use the ARV Helper or Deal Analysis tools, we send property addresses and search parameters to RentCast and HasData to retrieve comparable sales, property details, and rent estimates. These providers may process this data according to their own privacy policies.</li>
            <li><strong>With payment processors:</strong> We share billing and payment information with Stripe to process your subscription payments. Stripe processes this data according to its own privacy policy (available at stripe.com/privacy).</li>
            <li><strong>With email service providers:</strong> We share your email address and name with Zoho Mail to send transactional emails such as account verification, password resets, and system notifications.</li>
            <li><strong>With advertising platforms:</strong> Through marketing pixels, certain browsing and conversion data may be shared with Meta (Facebook/Instagram), LinkedIn, Google Ads, TikTok, and Twitter (X) for advertising measurement and audience building. You can manage your preferences through each platform's privacy controls.</li>
            <li><strong>With authorized auditors:</strong> We may provide read-only access to administrative data, analytics, and reports to authorized auditors (such as marketing agencies) for performance evaluation and compliance review. Auditors are bound by confidentiality obligations and are granted access only through our invitation system.</li>
            <li><strong>Through Developer Portal integrations:</strong> If you configure CRM integrations through the Developer Portal, Platform event data may be transmitted to your designated external systems via webhooks. You are responsible for the privacy and security practices of your own integrated systems.</li>
          </ul>
          <p className="text-foreground">
            We do not sell personal information in the ordinary sense of the word. If applicable privacy laws (such as the CCPA) treat certain sharing as a "sale" or "sharing" for targeted advertising, we will provide required notices and opt-out mechanisms.
          </p>

          <h2 className="text-primary">4. Data Retention, Security, and Your Rights</h2>

          <h3 className="text-primary/90">Data retention</h3>
          <p className="text-foreground">
            We retain personal information for as long as your account is active and as necessary to provide the Services, comply with legal obligations, resolve disputes, and enforce our agreements. After account closure, we may retain limited information for backup, audit, or legal purposes and may continue to use aggregated or de-identified data. We also retain data as described in our User Agreement and internal retention policies.
          </p>
          <p className="text-foreground">
            Apply click tracking data (recording when users click 'Apply Now' on lender listings) is retained for analytics and lender reporting purposes for the duration of the lender's participation in our referral program. Marketing pixel data retention is governed by the respective advertising platform's data retention policies.
          </p>

          <h3 className="text-primary/90">Security</h3>
          <p className="text-foreground">
            We implement reasonable technical and organizational measures to protect personal information from accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access (for example, encryption in transit, access controls, and security monitoring). However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.
          </p>

          <h3 className="text-primary/90">Your rights and choices</h3>
          <p className="text-foreground">Depending on your location and applicable law, you may have rights such as:</p>
          <ul className="text-foreground">
            <li>Accessing or requesting a copy of the personal information we hold about you.</li>
            <li>Requesting correction of inaccurate or incomplete information.</li>
            <li>Requesting deletion of your personal information, subject to legal and contractual limits.</li>
            <li>Objecting to or restricting certain processing activities.</li>
            <li>Withdrawing consent where we rely on consent (e.g., for certain marketing).</li>
            <li>Opting out of marketing communications at any time (by using the unsubscribe link or contacting us).</li>
          </ul>
          <p className="text-foreground">
            You can exercise many of these rights by logging into your account or by contacting us using the details in the "Contact Us" section below. We may need to verify your identity before responding to your request. For California or other state-specific rights, we will handle requests consistent with applicable law.
          </p>

          <h2 className="text-primary">5. International Transfers, Children's Privacy, Changes, and Contact</h2>

          <h3 className="text-primary/90">International data transfers</h3>
          <p className="text-foreground">
            Our servers and service providers may be located in the United States and other jurisdictions. If you access the Services from outside the United States, your information may be transferred to, stored in, and processed in countries that may have different data protection laws than your home jurisdiction. Where required, we use appropriate safeguards (such as contractual protections) for such transfers.
          </p>

          <h3 className="text-primary/90">Children's privacy</h3>
          <p className="text-foreground">
            The Services are not directed to individuals under the age of 18, and we do not knowingly collect personal information from anyone under 18. If we learn that we have collected personal information from a child under 18, we will take reasonable steps to delete it. If you believe a child has provided us with personal information, please contact us.
          </p>

          <h3 className="text-primary/90">Changes to this Privacy Policy</h3>
          <p className="text-foreground">
            We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or other factors. When we make material changes, we will update the "Last Updated" date at the top of this page and may provide additional notice (such as by email or a notice within the Platform), consistent with the "Amendments and Changes" section of our User Agreement. Your continued use of the Services after any changes become effective means you accept those changes.
          </p>

          <h2 className="text-primary">Contact Us</h2>
          <p className="text-foreground">
            If you have questions or requests regarding this Privacy Policy or our privacy practices, you can contact us at:
          </p>
          <div className="text-foreground bg-muted/50 p-6 rounded-lg mt-4">
            <p className="font-semibold">RE Data Metrix</p>
            <p>8375 Dunwoody Place, STE R<br />Atlanta, GA 30350</p>
            <p className="mt-4"><strong>Email:</strong> info@redatametrix.com</p>
            <p><strong>Phone:</strong> +1 (888) 450-4408</p>
          </div>

          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              This Privacy Policy is incorporated by reference into our <Link href="/terms" className="text-primary hover:underline">User Agreement</Link>. By using RE Data Metrix, you acknowledge that you have read and understood both documents.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
