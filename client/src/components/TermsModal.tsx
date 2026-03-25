import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, FileText, Shield, ArrowDown } from "lucide-react";

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export function TermsModal({ open, onOpenChange, onAccept }: TermsModalProps) {
  const [termsScrolledToBottom, setTermsScrolledToBottom] = useState(false);
  const [privacyScrolledToBottom, setPrivacyScrolledToBottom] = useState(false);
  const [activeTab, setActiveTab] = useState("terms");
  
  const termsScrollRef = useRef<HTMLDivElement>(null);
  const privacyScrollRef = useRef<HTMLDivElement>(null);

  const canAccept = termsScrolledToBottom && privacyScrolledToBottom;

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    setScrolled: (value: boolean) => void,
    afterScrolled?: () => void
  ) => {
    const element = ref.current;
    if (element) {
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
      if (isAtBottom) {
        setScrolled(true);
        afterScrolled?.();
      }
    }
  };

  useEffect(() => {
    if (open) {
      setTermsScrolledToBottom(false);
      setPrivacyScrolledToBottom(false);
      setActiveTab("terms");
    }
  }, [open]);

  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  const step = !termsScrolledToBottom ? 1 : !privacyScrolledToBottom ? 2 : 3;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" data-testid="dialog-terms-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review and Accept Terms
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-3 mt-1">
              <div className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-md ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground line-through"}`}>
                {termsScrolledToBottom ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="text-xs font-bold">1</span>}
                Read User Agreement
              </div>
              <span className="text-muted-foreground">→</span>
              <div className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-md ${step === 2 ? "bg-primary text-primary-foreground" : step === 3 ? "bg-muted text-muted-foreground line-through" : "bg-muted text-muted-foreground"}`}>
                {privacyScrolledToBottom ? <CheckCircle className="h-3.5 w-3.5" /> : <span className="text-xs font-bold">2</span>}
                Read Privacy Policy
              </div>
              <span className="text-muted-foreground">→</span>
              <div className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-md ${step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <span className="text-xs font-bold">3</span>
                Accept
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terms" className="flex items-center gap-2" data-testid="tab-user-agreement">
              <FileText className="h-4 w-4" />
              User Agreement
              {termsScrolledToBottom && <CheckCircle className="h-4 w-4 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2" data-testid="tab-privacy-policy">
              <Shield className="h-4 w-4" />
              Privacy Policy
              {privacyScrolledToBottom && <CheckCircle className="h-4 w-4 text-green-500" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="flex-1 min-h-0 mt-4">
            <div 
              ref={termsScrollRef}
              className="h-[380px] overflow-y-auto border rounded-md p-4 bg-muted/30"
              onScroll={() => handleScroll(termsScrollRef, setTermsScrolledToBottom, () => setActiveTab("privacy"))}
              data-testid="scroll-terms-content"
            >
              <div className="terms-fine-print">
                <TermsContent />
              </div>
            </div>
            {!termsScrolledToBottom && (
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-primary font-medium animate-pulse">
                <ArrowDown className="h-4 w-4" />
                Scroll to the bottom to continue
                <ArrowDown className="h-4 w-4" />
              </div>
            )}
            {termsScrolledToBottom && (
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" />
                Done — now read the Privacy Policy
              </div>
            )}
          </TabsContent>

          <TabsContent value="privacy" className="flex-1 min-h-0 mt-4">
            <div 
              ref={privacyScrollRef}
              className="h-[380px] overflow-y-auto border rounded-md p-4 bg-muted/30"
              onScroll={() => handleScroll(privacyScrollRef, setPrivacyScrolledToBottom)}
              data-testid="scroll-privacy-content"
            >
              <div className="terms-fine-print">
                <PrivacyContent />
              </div>
            </div>
            {!privacyScrolledToBottom && (
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-primary font-medium animate-pulse">
                <ArrowDown className="h-4 w-4" />
                Scroll to the bottom to continue
                <ArrowDown className="h-4 w-4" />
              </div>
            )}
            {privacyScrolledToBottom && (
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" />
                Done — you can now accept
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <div className="flex-1 text-sm text-muted-foreground flex items-center">
            {canAccept && (
              <span className="text-green-600 flex items-center gap-1 font-medium">
                <CheckCircle className="h-4 w-4" />
                Both documents reviewed — ready to accept
              </span>
            )}
          </div>
          <Button 
            onClick={handleAccept} 
            disabled={!canAccept}
            data-testid="button-accept-terms"
          >
            I Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TermsContent() {
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <h2 className="text-sm font-bold">USER AGREEMENT</h2>
        <p className="text-[10px] text-muted-foreground">(Terms of Service)</p>
        <p className="text-[10px] text-muted-foreground">Effective Date: December 4, 2025</p>
      </div>

      <p className="text-[11px] leading-relaxed">
        This User Agreement outlines the terms and conditions governing your access to and use of the RE Data Metrix™ ("RDM") platform and its associated services.
      </p>

      <h3 className="text-xs font-semibold mt-3">1. Agreement Overview</h3>
      <p className="text-[11px] leading-relaxed">
        This Agreement ("Agreement") constitutes a legally binding contract between you, the user, and RE Data Metrix. RDM provides a comprehensive, subscription-based online platform designed to assist real estate investors in efficiently analyzing potential real estate deals, comparing various loan products, and connecting with a network of lenders. By accessing, subscribing to, or using the RDM platform, you acknowledge that you have read, understood, and agree to be bound by these terms. If you do not agree, you may not access or use the RDM platform.
      </p>

      <h3 className="text-xs font-semibold mt-3">2. Definitions</h3>
      <p className="text-[11px] leading-relaxed">For the purposes of this Agreement, the following terms shall have the meanings set forth below:</p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li><strong>Agreement:</strong> This legally binding contract, including all its terms and conditions.</li>
        <li><strong>Customer/Subscriber/User:</strong> Any individual or entity that accesses, subscribes to, or uses the RE Data Metrix platform and its associated services.</li>
        <li><strong>Deal Analysis Tool:</strong> The core RDM platform feature for analyzing real estate deals and comparing loan options.</li>
        <li><strong>Lender:</strong> A financial institution or individual providing loan products for real estate investments.</li>
        <li><strong>Platform:</strong> The RE Data Metrix online system, including its website, software, tools, and services.</li>
        <li><strong>RE Data Metrix ("RDM"):</strong> The company providing the online platform and services.</li>
        <li><strong>Subscription:</strong> The recurring payment made by a user to gain access to the full features of the RDM platform.</li>
      </ul>

      <h3 className="text-xs font-semibold mt-3">3. Eligibility and User Registration</h3>
      <p className="text-[11px] leading-relaxed">
        To access and use the RDM Platform, you must be at least 18 years old and have the legal capacity to enter into this Agreement. By registering for an account, you represent and warrant that you meet these eligibility requirements. You agree to provide accurate, current, and complete information during the registration process and to keep this information updated. Your account is for your sole use, and you are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
      </p>

      <h3 className="text-xs font-semibold mt-3">4. Grant of Rights and Access</h3>
      <p className="text-[11px] leading-relaxed">
        Subject to the terms and conditions of this Agreement and your timely payment of all applicable Subscription Fees, RDM grants you a limited, non-exclusive, non-transferable, and revocable right to access and use the RDM Platform and its associated services. This includes access to the Deal Analysis Tool for unlimited deal analyses, viewing and comparing lender information and programs, accessing educational materials and bonus content, and the ability to export or download your deal analyses in PDF or CSV formats.
      </p>

      <h3 className="text-xs font-semibold mt-3">5. User Responsibilities and Acceptable Use</h3>
      <p className="text-[11px] leading-relaxed">As a User, you agree to:</p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li>Provide accurate, current, and complete information when inputting data into the Deal Analysis Tool.</li>
        <li>Use the Platform solely for your internal real estate investment analysis purposes and in compliance with all applicable laws and regulations.</li>
        <li>Maintain the confidentiality of your account credentials.</li>
        <li>Acknowledge that RDM provides tools and information for analysis only and does not constitute legal, financial, or investment advice.</li>
        <li>Understand that RDM is not responsible for the terms or outcomes of any loan agreements you establish with third-party lenders.</li>
      </ul>

      <h3 className="text-xs font-semibold mt-3">6. Warranties and Representations</h3>
      <p className="text-[11px] leading-relaxed">You represent and warrant that:</p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li>You have full power and authority to enter into this Agreement and to use the Platform.</li>
        <li>You have all necessary rights, consents, and permissions to submit User-Generated Content to the Platform.</li>
        <li>Your User-Generated Content is accurate, current, and complete to the best of your knowledge.</li>
        <li>You will not upload, input, or otherwise provide any data or content that you are not legally authorized to share.</li>
      </ul>

      <h3 className="text-xs font-semibold mt-3">7. Subscription Plans, Fees, and Payment Terms</h3>
      <p className="text-[11px] leading-relaxed">
        RDM offers Monthly and Annual Subscription plans, providing full access and unlimited deal analyses. Subscription fees are billed in advance on a recurring basis and automatically renew unless canceled. You authorize RDM to charge your provided payment method. RDM may change fees with prior notice, effective at your next billing cycle. All subscription fees are non-refundable.
      </p>

      <h3 className="text-xs font-semibold mt-3">8. Intellectual Property Rights</h3>
      <p className="text-[11px] leading-relaxed">
        RDM or its licensors own all legal right, title, and interest in and to the RDM Platform, including all software, tools, designs, trademarks, and content (excluding your User-Generated Content). All intellectual property rights are exclusively RDM's. You retain ownership of your User-Generated Content and grant RDM a worldwide, non-exclusive, royalty-free license to use it solely for providing, maintaining, and improving the Platform.
      </p>

      <h3 className="text-xs font-semibold mt-3">9. Data Ownership, Privacy, and Security</h3>
      <p className="text-[11px] leading-relaxed">
        You retain all ownership rights in your User-Generated Content. RDM collects and processes your data to provide, maintain, and improve services, personalize your experience, and facilitate the Lender Referral Program. All data handling is subject to RDM's Privacy Policy. You consent to RDM sharing your User-Generated Content and contact information with participating lenders when you express interest in a loan. RDM implements reasonable security measures but cannot guarantee absolute security.
      </p>

      <h3 className="text-xs font-semibold mt-3">10. Relationship to Privacy Policy</h3>
      <p className="text-[11px] leading-relaxed">
        Your use of the Platform is also governed by RDM's Privacy Policy. The Privacy Policy explains how RDM collects, uses, shares, and protects personal information when you use the Platform or otherwise interact with RDM. By accepting this Agreement or using the Platform, you acknowledge that you have read and understood the Privacy Policy. In the event of a conflict between this Agreement and the Privacy Policy with respect to data protection and privacy, the Privacy Policy will control to the extent required by applicable law; otherwise, this Agreement will govern.
      </p>

      <h3 className="text-xs font-semibold mt-3">11. Third-Party Services and Integrations</h3>
      <p className="text-[11px] leading-relaxed">
        The RDM Platform may integrate with or link to Third-Party Services. RDM does not endorse or control these services, and your use is at your own risk, subject to their terms and policies. You acknowledge that RDM may share your User-Generated Content and contact information with these services to provide Platform functionalities.
      </p>

      <h3 className="text-xs font-semibold mt-3">12. Lender Referral Program Terms</h3>
      <p className="text-[11px] leading-relaxed">
        RDM operates a Lender Referral Program to connect users with lenders. By using the Platform and expressing interest in a loan through RDM links, you consent to RDM identifying you as a referral to that lender. You understand RDM may receive compensation from lenders if you secure a loan through an RDM referral. RDM acts solely as a referral service; it does not guarantee loan approval, specific terms, or make credit decisions.
      </p>

      <h3 className="text-xs font-semibold mt-3">13. Disclaimers and Limitations of Liability</h3>
      <p className="text-[11px] leading-relaxed">
        <strong>Service Provided As-Is:</strong> The RDM Platform and its services are provided "as is" and "as available" for informational and analytical purposes only and do not constitute financial, investment, legal, or other professional advice. You are solely responsible for verifying information and conducting independent due diligence.
      </p>
      <p className="text-[11px] leading-relaxed">
        <strong>No Fiduciary Duty:</strong> RDM is not your agent, advisor, or fiduciary and does not have any duty to act in your best interests or to monitor your investments or financing decisions.
      </p>
      <p className="text-[11px] leading-relaxed">
        <strong>Limitation of Liability:</strong> To the fullest extent permitted by law, in no event will RDM, its affiliates, or their respective officers, directors, employees, or agents be liable to you for any indirect, incidental, special, consequential, exemplary, or punitive damages, including any loss of profits, revenue, goodwill, or data.
      </p>
      <p className="text-[11px] leading-relaxed">
        <strong>Cap on Liability:</strong> The total aggregate liability of RDM will not exceed the total Subscription fees you actually paid to RDM in the twelve (12) months immediately preceding the event giving rise to the claim.
      </p>

      <h3 className="text-xs font-semibold mt-3">14. Termination and Cancellation</h3>
      <p className="text-[11px] leading-relaxed">
        <strong>User-Initiated Cancellation:</strong> You may cancel your RDM subscription at any time by logging into your account. Cancellation requests received before your next billing date will take effect at the end of your current billing cycle; no refunds will be issued for the current billing period. You will retain access to the Platform through the end of your paid subscription period.
      </p>
      <p className="text-[11px] leading-relaxed">
        <strong>RDM-Initiated Termination:</strong> RDM may suspend or terminate your account and access to the Platform immediately and without liability if you violate any provision of this Agreement, engage in prohibited activities, or breach payment obligations.
      </p>

      <h3 className="text-xs font-semibold mt-3">15. Service Level Agreement</h3>
      <p className="text-[11px] leading-relaxed">
        <strong>Uptime Guarantee:</strong> RDM commits to maintaining Platform availability of 99.5% per calendar month. Scheduled maintenance windows are excluded from uptime calculations. RDM provides email support with standard response times of 24 hours for non-emergency issues and 2 hours for account security issues.
      </p>

      <h3 className="text-xs font-semibold mt-3">16. Governing Law and Dispute Resolution</h3>
      <p className="text-[11px] leading-relaxed">
        <strong>Governing Law:</strong> This Agreement is governed by and construed in accordance with the laws of Georgia, U.S.A., without regard to its conflict of law principles.
      </p>
      <p className="text-[11px] leading-relaxed">
        <strong>Dispute Resolution:</strong> If you have a dispute with RDM, you agree to first attempt to resolve it through good-faith negotiation for at least 30 days. If the dispute is not resolved, both you and RDM agree that the dispute will be settled by binding arbitration administered by the American Arbitration Association (AAA). You and RDM agree that any arbitration or litigation shall be conducted on an individual basis and not as a class action.
      </p>

      <h3 className="text-xs font-semibold mt-3">17. Amendments and Changes</h3>
      <p className="text-[11px] leading-relaxed">
        RDM reserves the right to modify this Agreement at any time. Material changes will be effective upon the date specified in the notice, which will be no less than 30 days after notification. Your continued use of the Platform 30 days after such notice constitutes your acceptance of the modified Agreement.
      </p>

      <h3 className="text-xs font-semibold mt-3">18. Indemnification</h3>
      <p className="text-[11px] leading-relaxed">
        You agree to indemnify, defend, and hold harmless RE Data Metrix, its affiliates, and their respective officers, directors, employees, contractors, and agents from and against any and all claims, demands, actions, proceedings, damages, losses, liabilities, costs, and expenses arising out of or related to your use of the Platform in violation of this Agreement or any applicable law or regulation.
      </p>

      <h3 className="text-xs font-semibold mt-3">19. Contact Information</h3>
      <p className="text-[11px] leading-relaxed">
        RE Data Metrix<br />
        8375 Dunwoody Place, STE R<br />
        Atlanta, GA 30350<br />
        Email: info@redatametrix.com
      </p>

      <div className="mt-4 pt-4 border-t">
        <p className="text-[10px] text-muted-foreground text-center">
          By clicking "I Accept," you acknowledge that you have read, understood, and agree to be bound by this User Agreement.
        </p>
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <h2 className="text-sm font-bold">PRIVACY POLICY</h2>
        <p className="text-[10px] text-muted-foreground">Last Updated: December 4, 2025</p>
      </div>

      <p className="text-[11px] leading-relaxed">
        This Privacy Policy explains how RE Data Metrix™ ("RDM," "we," "us," or "our") collects, uses, discloses, and safeguards information about you when you visit our website, use the RE Data Metrix™ platform, or otherwise interact with us (collectively, the "Services"). It is separate from, and incorporated by reference into, our User Agreement, which governs your use of the Services. If you do not agree with this Privacy Policy, you should not use the Services.
      </p>
      <p className="text-[11px] leading-relaxed">
        By accessing or using the Services, you acknowledge that you have read and understood this Privacy Policy and our User Agreement.
      </p>

      <h3 className="text-xs font-semibold mt-3">1. Information We Collect</h3>
      <p className="text-[11px] leading-relaxed">We collect information in three main ways: (a) directly from you, (b) automatically when you use the Services, and (c) from third parties.</p>

      <p className="text-[11px] leading-relaxed"><strong>Information you provide directly:</strong></p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li>Account information (e.g., name, email address, password, phone number, company name, role).</li>
        <li>Subscription and billing information (e.g., billing address; payment details are processed by third-party payment processors).</li>
        <li>Deal and property information (e.g., property address, purchase price, rehab budgets, ARV, rent estimates, closing costs, loan terms).</li>
        <li>Communications (e.g., support requests, survey responses, feedback).</li>
      </ul>

      <p className="text-[11px] leading-relaxed"><strong>Information collected automatically:</strong></p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li>Device and usage data (e.g., IP address, browser type, operating system, device identifiers, pages viewed).</li>
        <li>Log and analytics data related to how you interact with the Deal Analysis Tool and other features.</li>
      </ul>
      <p className="text-[11px] leading-relaxed">
        We may use cookies, pixels, and similar tracking technologies to collect some of this information.
      </p>

      <p className="text-[11px] leading-relaxed"><strong>Information from third parties:</strong></p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li>Lenders and other financial partners who interact with you through our Lender Referral Program.</li>
        <li>Public record databases and third-party data providers integrated into the Platform.</li>
        <li>Marketing, analytics, or affiliate partners, where permitted by law.</li>
      </ul>

      <h3 className="text-xs font-semibold mt-3">2. How We Use Your Information</h3>
      <p className="text-[11px] leading-relaxed">We use the information we collect for purposes including:</p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li><strong>Providing and maintaining the Services:</strong> Operating the Platform, processing registrations and subscriptions, enabling deal analysis, generating reports.</li>
        <li><strong>Facilitating lender referrals:</strong> Sharing relevant data with lenders when you request or consent to a lender connection.</li>
        <li><strong>Improving and personalizing the Services:</strong> Understanding usage patterns, enhancing features, developing new tools.</li>
        <li><strong>Communicating with you:</strong> Sending service-related messages, responding to your inquiries, providing customer support.</li>
        <li><strong>Marketing (where permitted):</strong> Sending you newsletters, product updates, promotions; you can opt out at any time.</li>
        <li><strong>Security and fraud prevention:</strong> Protecting accounts, monitoring for suspicious activity.</li>
        <li><strong>Legal compliance:</strong> Complying with legal obligations, responding to lawful requests.</li>
      </ul>

      <h3 className="text-xs font-semibold mt-3">3. How We Share Your Information</h3>
      <p className="text-[11px] leading-relaxed">We may share your information in the following circumstances:</p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li><strong>With lenders and third-party services at your direction:</strong> When you request lender connections or enable integrations.</li>
        <li><strong>With service providers:</strong> With vendors who perform services on our behalf (hosting, analytics, customer support, email delivery, payment processing).</li>
        <li><strong>With affiliates and business partners:</strong> In connection with joint offerings, integrations, or referral arrangements.</li>
        <li><strong>For legal and safety reasons:</strong> When we believe disclosure is reasonably necessary to comply with law or protect rights and safety.</li>
        <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or similar transaction.</li>
        <li><strong>Aggregated or de-identified information:</strong> We may share data that does not reasonably identify you for research or business purposes.</li>
      </ul>
      <p className="text-[11px] leading-relaxed">
        We do not sell personal information in the ordinary sense of the word.
      </p>

      <h3 className="text-xs font-semibold mt-3">4. Data Retention, Security, and Your Rights</h3>

      <p className="text-[11px] leading-relaxed"><strong>Data retention:</strong></p>
      <p className="text-[11px] leading-relaxed">
        We retain personal information for as long as your account is active and as necessary to provide the Services, comply with legal obligations, resolve disputes, and enforce our agreements. After account closure, we may retain limited information for backup, audit, or legal purposes.
      </p>

      <p className="text-[11px] leading-relaxed"><strong>Security:</strong></p>
      <p className="text-[11px] leading-relaxed">
        We implement reasonable technical and organizational measures to protect personal information from accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.
      </p>

      <p className="text-[11px] leading-relaxed"><strong>Your rights and choices:</strong></p>
      <p className="text-[11px] leading-relaxed">Depending on your location and applicable law, you may have rights such as:</p>
      <ul className="text-[11px] leading-relaxed list-disc pl-4 space-y-1">
        <li>Accessing or requesting a copy of the personal information we hold about you.</li>
        <li>Requesting correction of inaccurate or incomplete information.</li>
        <li>Requesting deletion of your personal information, subject to legal and contractual limits.</li>
        <li>Objecting to or restricting certain processing activities.</li>
        <li>Withdrawing consent where we rely on consent.</li>
        <li>Opting out of marketing communications at any time.</li>
      </ul>

      <h3 className="text-xs font-semibold mt-3">5. International Transfers</h3>
      <p className="text-[11px] leading-relaxed">
        Our servers and service providers may be located in the United States and other jurisdictions. If you access the Services from outside the United States, your information may be transferred to, stored in, and processed in countries that may have different data protection laws than your home jurisdiction. Where required, we use appropriate safeguards for such transfers.
      </p>

      <h3 className="text-xs font-semibold mt-3">6. Children's Privacy</h3>
      <p className="text-[11px] leading-relaxed">
        The Services are not directed to individuals under the age of 18, and we do not knowingly collect personal information from anyone under 18. If we learn that we have collected personal information from a child under 18, we will take reasonable steps to delete it.
      </p>

      <h3 className="text-xs font-semibold mt-3">7. Changes to This Privacy Policy</h3>
      <p className="text-[11px] leading-relaxed">
        We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or other factors. When we make material changes, we will update the "Last Updated" date at the top and may provide additional notice. Your continued use of the Services after any changes become effective means you accept those changes.
      </p>

      <h3 className="text-xs font-semibold mt-3">8. Contact Us</h3>
      <p className="text-[11px] leading-relaxed">
        If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
      </p>
      <p className="text-[11px] leading-relaxed">
        RE Data Metrix<br />
        8375 Dunwoody Place, STE R<br />
        Atlanta, GA 30350<br />
        Email: info@redatametrix.com
      </p>

      <div className="mt-4 pt-4 border-t">
        <p className="text-[10px] text-muted-foreground text-center">
          By clicking "I Accept," you acknowledge that you have read, understood, and agree to this Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default TermsModal;
