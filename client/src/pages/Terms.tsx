import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary mb-4">User Agreement</h1>
          <p className="text-lg text-muted-foreground">(Terms of Service)</p>
          <div className="h-1 w-32 bg-accent mx-auto mb-8 mt-4"></div>
          <p className="text-muted-foreground">Effective Date: December 4, 2025</p>
        </div>

        <Card className="p-8 prose prose-lg max-w-none dark:prose-invert">
          <p className="text-foreground lead">
            This User Agreement outlines the terms and conditions governing your access to and use of the RE Data Metrix ("RDM") platform and its associated services.
          </p>

          <h2 className="text-primary">1. Agreement Overview</h2>
          <p className="text-foreground">
            This Agreement ("Agreement") constitutes a legally binding contract between you, the user, and RE Data Metrix. RDM provides a comprehensive, subscription-based online platform designed to assist real estate investors in efficiently analyzing potential real estate deals, comparing various loan products, and connecting with a network of lenders. By accessing, subscribing to, or using the RDM platform, you acknowledge that you have read, understood, and agree to be bound by these terms. If you do not agree, you may not access or use the RDM platform.
          </p>

          <h2 className="text-primary">2. Definitions</h2>
          <p className="text-foreground">For the purposes of this Agreement, the following terms shall have the meanings set forth below:</p>
          <ul className="text-foreground">
            <li><strong>Agreement:</strong> This legally binding contract, including all its terms and conditions.</li>
            <li><strong>Customer/Subscriber/User:</strong> Any individual or entity that accesses, subscribes to, or uses the RE Data Metrix platform and its associated services.</li>
            <li><strong>Deal Analysis Tool:</strong> The core RDM platform feature for analyzing real estate deals and comparing loan options.</li>
            <li><strong>Lender:</strong> A financial institution or individual providing loan products for real estate investments, often featured on the RDM platform for referral.</li>
            <li><strong>Platform:</strong> The RE Data Metrix online system, including its website, software, tools, and services.</li>
            <li><strong>Real Estate Investment and Financial Terms:</strong> Terms such as ARV (After Repair Value), Cash-on-Cash Return, DSCR (Debt Service Coverage Ratio), Drawn Funds Only, Loan Specs, LTV (Loan-to-Value), Points, Rehab Estimate, and ROI (Return on Investment) are defined as their commonly accepted meanings within the real estate investor and financial sectors.</li>
            <li><strong>RE Data Metrix ("RDM"):</strong> The company providing the online platform and services for real estate deal analysis, loan product comparison, and lender referrals.</li>
            <li><strong>Referral Program:</strong> The arrangement where RDM receives compensation for connecting investors with lenders.</li>
            <li><strong>Subscription:</strong> The recurring payment made by a user to gain access to the full features of the RDM platform.</li>
            <li><strong>Third-Party Services:</strong> Any services, applications, or websites provided by entities other than RDM, which may be integrated with or linked from the RDM platform (e.g., lender websites, affiliate programs).</li>
            <li><strong>User-Generated Content:</strong> The data and information you input into the RDM Platform, such as property data, project data, closing costs, experience levels, and estimated credit scores.</li>
          </ul>

          <h2 className="text-primary">3. Eligibility and User Registration</h2>
          <p className="text-foreground">
            To access and use the RDM Platform, you must be at least 18 years old and have the legal capacity to enter into this Agreement. By registering for an account, you represent and warrant that you meet these eligibility requirements. You agree to provide accurate, current, and complete information during the registration process and to keep this information updated. Your account is for your sole use, and you are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify RDM immediately of any unauthorized use of your account or any other security breach.
          </p>

          <h2 className="text-primary">4. Grant of Rights and Access</h2>
          <p className="text-foreground">
            Subject to the terms and conditions of this Agreement and your timely payment of all applicable Subscription Fees, RDM grants you a limited, non-exclusive, non-transferable, and revocable right to access and use the RDM Platform and its associated services. This includes access to the Deal Analysis Tool for unlimited deal analyses, viewing and comparing lender information and programs, accessing educational materials and bonus content, and the ability to export or download your deal analyses in PDF or CSV formats. Your access and use are solely for your internal real estate investment analysis purposes. This Agreement does not grant you any ownership or intellectual property rights in the RDM Platform or its underlying technology. All rights not expressly granted are reserved by RDM.
          </p>

          <h2 className="text-primary">5. User Responsibilities and Acceptable Use</h2>
          <p className="text-foreground">As a User, you agree to:</p>
          <ul className="text-foreground">
            <li>Provide accurate, current, and complete information when inputting data into the Deal Analysis Tool (e.g., property details, project costs, experience level, estimated credit score).</li>
            <li>Use the Platform solely for your internal real estate investment analysis purposes and in compliance with all applicable laws and regulations.</li>
            <li>Maintain the confidentiality of your account credentials.</li>
            <li>Acknowledge that RDM provides tools and information for analysis only and does not constitute legal, financial, or investment advice. You should consult qualified professionals.</li>
            <li>Understand that RDM is not responsible for the terms or outcomes of any loan agreements you establish with third-party lenders.</li>
          </ul>
          <p className="text-foreground">
            You also agree not to engage in prohibited activities, including but not limited to: (a) creating multiple accounts to exploit free trial periods or circumvent account suspensions; (b) using the Platform to provide analysis, recommendations, or services to third parties, clients, or in any commercial or professional capacity (including white-labeling, reselling, or business service use); (c) sharing your credentials or account access with unrelated third parties or the public (household members and immediate business partners may access your account at your discretion, but you remain solely responsible for all activity); and (d) unauthorized access, interference with Platform integrity, transmitting harmful content, reverse engineering, automated data extraction, or circumventing security measures.
          </p>

          <h2 className="text-primary">6. Warranties and Representations</h2>
          <p className="text-foreground">You represent and warrant that:</p>
          <ul className="text-foreground">
            <li>You have full power and authority to enter into this Agreement and to use the Platform in connection with your real estate investment activities.</li>
            <li>You have all necessary rights, consents, and permissions to submit User-Generated Content to the Platform, including property information, financial data, and any third-party data you upload or input.</li>
            <li>Your User-Generated Content is accurate, current, and complete to the best of your knowledge and does not infringe, misappropriate, or violate any intellectual property, privacy, contractual, or other rights of any third party.</li>
            <li>You will not upload, input, or otherwise provide any data or content to the Platform that you are not legally authorized to share.</li>
          </ul>

          <h2 className="text-primary">7. Subscription Plans, Fees, and Payment Terms</h2>
          <p className="text-foreground">
            RDM offers Monthly and Annual Subscription plans, providing full access and unlimited deal analyses. Subscription fees are billed in advance on a recurring basis and automatically renew unless canceled. You authorize RDM to charge your provided payment method. RDM may change fees with prior notice, effective at your next billing cycle. All subscription fees are non-refundable.
          </p>

          <h2 className="text-primary">8. Intellectual Property Rights</h2>
          <p className="text-foreground">
            RDM or its licensors own all legal right, title, and interest in and to the RDM Platform, including all software, tools, designs, trademarks, and content (excluding your User-Generated Content). All intellectual property rights are exclusively RDM's. You retain ownership of your User-Generated Content and grant RDM a worldwide, non-exclusive, royalty-free license to use it solely for providing, maintaining, and improving the Platform and the Lender Referral Program. You agree not to copy, modify, distribute, sell, lease, reverse engineer, or remove any proprietary notices from the Platform. If you provide feedback, you grant RDM a worldwide, perpetual, irrevocable, royalty-free license to use and incorporate it.
          </p>

          <h2 className="text-primary">9. Data Ownership, Privacy, and Security</h2>
          <p className="text-foreground">
            You retain all ownership rights in your User-Generated Content. RDM collects and processes your data to provide, maintain, and improve services, personalize your experience, and facilitate the Lender Referral Program. This includes sending automated emails to lenders, RDM contacts, and you. All data handling is subject to RDM's <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. You consent to RDM sharing your User-Generated Content and contact information with participating lenders when you express interest in a loan, and RDM may share anonymized/aggregated data with third parties. RDM implements reasonable security measures but cannot guarantee absolute security. You are responsible for account credential confidentiality. RDM will retain data for service provision, legal compliance, and as available via daily reports to the designated RDM contact.
          </p>

          <h2 className="text-primary">10. Relationship to Privacy Policy</h2>
          <p className="text-foreground">
            Your use of the Platform is also governed by RDM's <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. The Privacy Policy explains how RDM collects, uses, shares, and protects personal information when you use the Platform or otherwise interact with RDM. By accepting this Agreement or using the Platform, you acknowledge that you have read and understood the Privacy Policy. In the event of a conflict between this Agreement and the Privacy Policy with respect to data protection and privacy, the Privacy Policy will control to the extent required by applicable law; otherwise, this Agreement will govern.
          </p>

          <h2 className="text-primary">11. Third-Party Services and Integrations</h2>
          <p className="text-foreground">
            The RDM Platform may integrate with or link to Third-Party Services (e.g., public record databases, lender websites, affiliate platforms like Bigger Pockets, Propstream, Privy, Buildium, local REIAs). RDM does not endorse or control these services, and your use is at your own risk, subject to their terms and policies. You acknowledge that RDM may share your User-Generated Content and contact information with these services to provide Platform functionalities (e.g., lender referrals, automated data input via APIs). RDM may receive compensation from affiliate programs when you engage with these services through RDM links. You are responsible for reviewing third-party terms.
          </p>

          <h2 className="text-primary">12. Lender Referral Program Terms</h2>
          <p className="text-foreground">
            RDM operates a Lender Referral Program to connect users with lenders. By using the Platform and expressing interest in a loan through RDM links, you consent to RDM identifying you as a referral to that lender. You understand RDM may receive compensation (fees, points, commissions) from lenders if you secure a loan through an RDM referral, which may continue in perpetuity even after your subscription ends. You explicitly consent to RDM sharing your User-Generated Content and contact information with selected lenders upon inquiry. RDM acts solely as a referral service; it does not guarantee loan approval, specific terms, or make credit decisions. All loan agreements are solely between you and the lender. RDM disclaims liability for your dealings with lenders.
          </p>

          <h2 className="text-primary">13. Disclaimers and Limitations of Liability</h2>
          <p className="text-foreground">
            <strong>Service Provided As-Is:</strong> The RDM Platform and its services are provided "as is" and "as available" for informational and analytical purposes only and do not constitute financial, investment, legal, or other professional advice. You are solely responsible for verifying information and conducting independent due diligence. RDM does not guarantee specific financial outcomes or loan approvals.
          </p>
          <p className="text-foreground">
            <strong>No Fiduciary Duty or Recommendations:</strong> RDM is not your agent, advisor, or fiduciary and does not have any duty to act in your best interests or to monitor your investments or financing decisions. RDM does not provide personalized recommendations, does not make loan or investment recommendations, and does not undertake to compare all possible lenders, loan products, or investment opportunities on your behalf. You remain solely responsible for selecting lenders, loans, and investment strategies and for evaluating whether they are appropriate for your objectives and risk tolerance.
          </p>
          <p className="text-foreground">
            <strong>No Warranty of Uninterrupted Service:</strong> RDM does not warrant the Platform to be uninterrupted or error-free. While RDM implements reasonable security measures (as described in Section 9) to protect user data, no system is completely secure, and RDM cannot guarantee absolute protection against all security threats. You acknowledge the inherent risks of online platforms and agree that RDM's security obligations are limited to implementing industry-standard reasonable measures.
          </p>
          <p className="text-foreground">
            <strong>Data Accuracy Disclaimer:</strong> RDM does not guarantee the accuracy, completeness, or reliability of any data or projections, including auto-populated data or lender program details. You are responsible for independently verifying all information.
          </p>
          <p className="text-foreground">
            <strong>Limitation of Liability:</strong> To the fullest extent permitted by law, in no event will RDM, its affiliates, or their respective officers, directors, employees, or agents be liable to you for any indirect, incidental, special, consequential, exemplary, or punitive damages, including any loss of profits, revenue, goodwill, or data, arising out of or in connection with this Agreement or your use of or inability to use the Platform, whether based in contract, tort (including negligence), strict liability, or any other legal theory, even if RDM has been advised of the possibility of such damages.
          </p>
          <p className="text-foreground">
            <strong>Cap on Liability:</strong> To the fullest extent permitted by law, the total aggregate liability of RDM and its affiliates for all claims arising out of or relating to this Agreement or the Platform will not exceed the total Subscription fees you actually paid to RDM for access to the Platform in the twelve (12) months immediately preceding the event giving rise to the claim.
          </p>
          <p className="text-foreground">
            <strong>Exceptions:</strong> The limitations in this Section do not apply to liabilities that cannot be limited under applicable law, and do not limit your obligation to indemnify RDM (as described in Section 18) or your liability for your own fraud or intentional misconduct.
          </p>

          <h2 className="text-primary">14. Termination and Cancellation</h2>
          <p className="text-foreground">
            <strong>User-Initiated Cancellation:</strong> You may cancel your RDM subscription at any time by logging into your account, accessing the subscription settings, and selecting "Cancel Subscription," or by contacting RDM at info@redatametrix.com. Cancellation requests received before your next billing date will take effect at the end of your current billing cycle; no refunds will be issued for the current billing period. You will retain access to the Platform through the end of your paid subscription period. After cancellation, your account and User-Generated Content will be deactivated but may be retained by RDM for 90 days before deletion, unless you request immediate deletion in writing.
          </p>
          <p className="text-foreground">
            <strong>RDM-Initiated Termination:</strong> RDM may suspend or terminate your account and access to the Platform immediately and without liability if: (a) you violate any provision of this Agreement; (b) you engage in prohibited activities; (c) your account has been inactive for more than 12 months; or (d) you breach payment obligations. RDM will provide written notice of termination except in cases of immediate security threats or legal violations.
          </p>
          <p className="text-foreground">
            <strong>Effect of Termination:</strong> Upon termination, your right to access the Platform ceases immediately. RDM's liability limitations and your indemnification obligations survive termination. Any lender referrals made during your subscription period remain active, and RDM may continue to receive compensation from those referrals.
          </p>

          <h2 className="text-primary">15. Service Level Agreement</h2>
          <p className="text-foreground">
            <strong>Uptime Guarantee:</strong> RDM commits to maintaining Platform availability of 99.5% per calendar month, measured as time when the Platform is accessible and functional, excluding scheduled maintenance windows (which RDM will communicate at least 48 hours in advance).
          </p>
          <p className="text-foreground">
            <strong>Scheduled Maintenance:</strong> RDM may perform scheduled maintenance on the Platform during Sundays, 2:00 AM - 4:00 AM EST, which are excluded from uptime calculations. RDM will use commercially reasonable efforts to minimize service disruptions.
          </p>
          <p className="text-foreground">
            <strong>Support Services:</strong> RDM provides email support with standard response times of 24 hours for non-emergency issues and 2 hours for account security issues. Support is available Monday - Friday, 9 AM - 5 PM EST, excluding holidays.
          </p>
          <p className="text-foreground">
            <strong>Service Credit:</strong> If the Platform experiences downtime exceeding 1% in a calendar month (excluding scheduled maintenance and user-caused outages), you may request a service credit equal to 10% of your subscription fee for that month. Service credits are your sole remedy for downtime and will be credited to your account for future billing periods or refunded, at RDM's discretion. To claim a credit, contact RDM within 30 days of the outage.
          </p>

          <h2 className="text-primary">16. Governing Law and Dispute Resolution</h2>
          <p className="text-foreground">
            <strong>Governing Law:</strong> This Agreement is governed by and construed in accordance with the laws of Georgia, U.S.A., without regard to its conflict of law principles. The United Nations Convention on Contracts for the International Sale of Goods shall not apply to this Agreement.
          </p>
          <p className="text-foreground">
            <strong>Dispute Resolution Process:</strong>
          </p>
          <p className="text-foreground">
            <em>Step 1 – Informal Negotiation:</em> If you have a dispute with RDM, you agree to first attempt to resolve it through good-faith negotiation. Either party may initiate this by sending written notice to the other party's contact address (as provided in Section 19) describing the dispute and the resolution sought. The parties agree to negotiate for at least 30 days before pursuing other remedies.
          </p>
          <p className="text-foreground">
            <em>Step 2 – Binding Arbitration:</em> If the dispute is not resolved within 30 days, both you and RDM agree that the dispute will be settled by binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. The arbitration shall take place in Atlanta, Georgia, and the arbitrator's decision shall be final and enforceable in any court of competent jurisdiction. Each party will bear its own attorney's fees and costs, and the arbitration filing fees will be split equally.
          </p>
          <p className="text-foreground">
            <strong>Exceptions to Arbitration:</strong> Notwithstanding the above, the following matters may be brought in court and are not subject to arbitration: (a) claims for injunctive relief to prevent intellectual property infringement or misuse of the Platform; (b) claims arising under or related to RDM's indemnification; and (c) small claims court actions where permitted by law.
          </p>
          <p className="text-foreground">
            <strong>No Class Action:</strong> You and RDM agree that any arbitration or litigation shall be conducted on an individual basis and not as a class action or representative action.
          </p>

          <h2 className="text-primary">17. Amendments and Changes to This Agreement</h2>
          <p className="text-foreground">
            <strong>Right to Modify:</strong> RDM reserves the right to modify this Agreement at any time. Material changes include modifications to pricing, liability limitations, data handling practices, lender referral compensation, or your core rights and obligations. Changes will be effective upon the date specified in the notice, which will be no less than 30 days after notification (except for changes required by law, which may be effective immediately).
          </p>
          <p className="text-foreground">
            <strong>How We Notify You:</strong> RDM will notify you of material changes by: (a) posting the updated Agreement on the Platform with an updated effective date; (b) sending you an email notification to the address associated with your account; or (c) displaying a prominent notice on the Platform. Your continued use of the Platform 30 days after such notice constitutes your acceptance of the modified Agreement.
          </p>
          <p className="text-foreground">
            <strong>Your Right to Terminate:</strong> If you do not agree with any material change to this Agreement, you may terminate your subscription within 30 days of the change notice without penalty and receive a prorated refund for the unused portion of your current billing period only if the change materially increases your obligations or decreases your core rights. Non-material changes (e.g., administrative updates, clarifications) do not trigger this right.
          </p>
          <p className="text-foreground">
            <strong>Updates to Privacy Policy:</strong> Changes to RDM's Privacy Policy follow the same notification process and your continued use of the Platform following notice constitutes acceptance.
          </p>

          <h2 className="text-primary">18. Indemnification</h2>
          <p className="text-foreground">
            <strong>18.1 User Indemnification of RDM:</strong> You agree to indemnify, defend, and hold harmless RE Data Metrix ("RDM"), its affiliates, and their respective officers, directors, employees, contractors, and agents from and against any and all claims, demands, actions, proceedings, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the Platform in violation of this Agreement or any applicable law or regulation; (b) your User-Generated Content, including any allegation that such content is inaccurate, misleading, incomplete, infringing, defamatory, or otherwise unlawful; (c) your real estate transactions, loan applications, or agreements with lenders or other third parties; and (d) your negligence, willful misconduct, or fraud. This obligation applies to third-party claims brought against RDM and does not require RDM to prove that you acted intentionally unless required by applicable law.
          </p>
          <p className="text-foreground">
            <strong>18.2 RDM Indemnification of User for IP Infringement:</strong> RDM will indemnify, defend, and hold you harmless from and against any third-party claim alleging that your authorized use of the unmodified RDM Platform directly infringes that third party's United States patent, copyright, or trademark, and will pay any court-awarded damages and reasonable attorneys' fees finally awarded against you as a result of such claim. This obligation is conditioned on you: (a) promptly notifying RDM in writing of the claim; (b) giving RDM sole control of the defense and settlement of the claim (except that RDM may not settle any claim that imposes a monetary or non-monetary obligation on you without your prior written consent); and (c) providing RDM with reasonable cooperation, at RDM's expense.
          </p>
          <p className="text-foreground">
            RDM will have no obligation under this Section 18.2 to the extent a claim results from: (i) your unauthorized use of the Platform; (ii) modification of the Platform by anyone other than RDM; (iii) combination or use of the Platform with any products, services, data, or software not provided by RDM, if the claim would not have arisen but for that combination or use; or (iv) your User-Generated Content. As RDM's sole and exclusive obligations for any such IP claim, RDM may, at its option and expense: (1) modify the Platform so that it is non-infringing; (2) obtain a license for you to continue using the Platform; or (3) terminate your access to the allegedly infringing feature and refund any prepaid, unused Subscription fees for that feature.
          </p>
          <p className="text-foreground">
            <strong>18.3 Procedures and Limitations:</strong> The indemnified party must promptly notify the indemnifying party of any claim for which it seeks indemnification and provide reasonable cooperation. Failure to provide prompt notice will relieve the indemnifying party of its obligations only to the extent it is materially prejudiced by the delay. The indemnifying party has the right to control the defense and settlement of the claim, subject to the limitations set out above. The indemnification obligations in this Section 18 are subject to the liability limitations in Section 13, except for any liabilities that cannot be limited under applicable law.
          </p>
          <p className="text-foreground">
            <strong>18.4 Survival:</strong> The indemnification obligations in this Section 18 will survive termination or expiration of this Agreement for a period of two (2) years, or for as long as any related third-party claim is pending, whichever is longer.
          </p>

          <h2 className="text-primary">19. Contact Information</h2>
          <p className="text-foreground">
            For questions, concerns, complaints, or notices related to this Agreement, the Platform, or RDM's services, please contact us at:
          </p>
          <div className="text-foreground bg-muted/50 p-6 rounded-lg mt-4">
            <p className="font-semibold">RE Data Metrix</p>
            <p>8375 Dunwoody Place, STE R<br />Atlanta, GA 30350</p>
            <p className="mt-4"><strong>Email:</strong> info@redatametrix.com</p>
            <p><strong>Phone:</strong> +1 (888) 450-4408</p>
            <p><strong>Website:</strong> www.redatametrix.com</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Response Time: RDM will acknowledge receipt of legal notices within 5 business days and will respond substantively within 15 business days, unless the notice requires extended investigation or legal review.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              By using RE Data Metrix, you acknowledge that you have read, understood, and agree to be bound by this User Agreement. See also our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
