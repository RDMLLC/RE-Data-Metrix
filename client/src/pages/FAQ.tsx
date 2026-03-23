import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Users, DollarSign, Shield, Rocket } from "lucide-react";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/StructuredData";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: JSX.Element;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: "Product Basics",
    icon: <HelpCircle className="h-4 w-4 text-accent" />,
    items: [
      {
        question: "What is RE Data Metrix?",
        answer: "RE Data Metrix is an online tool that helps real estate investors analyze individual deals and compare loan options side by side based on profit, cash required, and ROI metrics."
      },
      {
        question: "What types of properties can I analyze?",
        answer: "The tool is designed primarily for single-family real estate investments, with support for common strategies like rentals, BRRRR, and fix-and-flip properties."
      },
      {
        question: "What loan metrics does the tool calculate?",
        answer: "It estimates total cash-out-of-pocket, overall ROI, and annualized ROI for each loan product so you can see which financing structure best fits your goals."
      },
      {
        question: "How is this different from a simple spreadsheet?",
        answer: "RE Data Metrix standardizes your assumptions, automates complex loan math, and lets you compare multiple scenarios and lenders in one place instead of manually updating formulas."
      },
      {
        question: "Does the tool replace my underwriter or lender?",
        answer: "No, it is an analysis and comparison tool to help you ask better questions and choose smarter loan options; your final terms still come from your lender."
      }
    ]
  },
  {
    title: "Who It's For & Use Cases",
    icon: <Users className="h-4 w-4 text-accent" />,
    items: [
      {
        question: "Who is RE Data Metrix built for?",
        answer: "It is built for real estate investors who want a clear, data-driven way to evaluate each deal and compare financing options."
      },
      {
        question: "I'm a newer investor—will this be too advanced?",
        answer: "No; the tool is meant to simplify the math so newer investors can understand key numbers without building complex spreadsheets."
      },
      {
        question: "Can experienced investors still benefit?",
        answer: "Yes; experienced investors can standardize their underwriting, quickly compare loan structures, and scale deal volume with a consistent framework."
      },
      {
        question: "What investment strategies does this support?",
        answer: "Common strategies include buy-and-hold rentals, BRRRR deals, fix-and-flip projects, and wholesale pricing strategies. The platform helps with loan structure, cash to close calculations, DSCR analysis, and maximum offer pricing for wholesale deals."
      },
      {
        question: "Can I use this for multiple markets?",
        answer: "Yes; we don't use boilerplate data for the entire country. The data is based on state averages. However, you can input your own pricing, rents, and cost assumptions for any deal, anywhere."
      }
    ]
  },
  {
    title: "Pricing & Account Details",
    icon: <DollarSign className="h-4 w-4 text-accent" />,
    items: [
      {
        question: "How is RE Data Metrix priced?",
        answer: "Our affordable pricing gives investors full access to our tools and partners for $25 a month or $250 for an annual subscription. That's much lower than many of the tools available to investors."
      },
      {
        question: "Do you offer a free account?",
        answer: "Yes! Free accounts include 2 automated deal analyses per month (using property lookups from Zillow or Redfin), unlimited manual deal entry, access to all three calculators (Fix & Flip, DSCR, and Wholesale Max Offer), full Toolbox access, lender search, and CSV export. Paid subscribers get unlimited automated analyses, PDF export, deal saving, deal sharing, and priority support."
      },
      {
        question: "Can I cancel my subscription?",
        answer: "You can cancel before your next billing date, and your access will continue through the end of the current period."
      },
      {
        question: "Do you offer monthly and annual plans?",
        answer: "Yes, monthly for flexibility and annual for discounted pricing if you use the tool regularly."
      },
      {
        question: "Is there a plan for teams or partners?",
        answer: "We don't have an enterprise plan, but members can share some or all of their deals with anyone else on the platform. Add as many paying members to your team as you like. You can even give them a free month via your referral code—and you'll get two months free from their paid subscription."
      }
    ]
  },
  {
    title: "Data, Integrations & Security",
    icon: <Shield className="h-4 w-4 text-accent" />,
    items: [
      {
        question: "Is my deal data private?",
        answer: "Your deal inputs and analysis are stored in your account and are not shared with other users."
      },
      {
        question: "Can this connect to my CRM or marketing systems?",
        answer: "This is a feature under consideration for future implementation."
      },
      {
        question: "Can I export my analyses?",
        answer: "Yes. You can download a PDF showing the analysis. You can also share your analysis with other paying members on the platform."
      },
      {
        question: "Do you store my lender offers or term sheets?",
        answer: "The tool focuses on modeling loan structures and terms you enter or provided by the lender; it does not act as a lender or originate loans. You can save your preferred lenders in your portal."
      },
      {
        question: "How accurate are the results?",
        answer: "Results are based on the numbers and assumptions you provide, along with standardized formulas for profit, cash required, and ROI; they are estimates, not guarantees."
      }
    ]
  },
  {
    title: "Support & Getting Started",
    icon: <Rocket className="h-4 w-4 text-accent" />,
    items: [
      {
        question: "How do I get started?",
        answer: "Create an account, add a property, enter your assumptions, and then compare loan options to see profit, cash to close, and ROI for each scenario."
      },
      {
        question: "Do you provide any templates or example deals?",
        answer: "Yes, we include sample deals and default assumptions so you can learn by tweaking real examples."
      },
      {
        question: "What kind of support do you offer?",
        answer: "Support is available via email or in-app chat for help with account issues, feature questions, or deal setup."
      },
      {
        question: "Do you have training or tutorials?",
        answer: "We provide short walkthroughs and help articles that show you how to set up your first deal and interpret the outputs."
      },
      {
        question: "How can I share feedback or request features?",
        answer: "You can submit feature requests or feedback directly via the Contact Us page or by emailing our support team."
      }
    ]
  }
];

export default function FAQ() {
  const allFaqs = faqSections.flatMap(section => section.items);
  
  return (
    <Layout>
      <SEO 
        title="FAQ"
        description="Frequently asked questions about RE Data Metrix. Learn about our real estate investment analysis tools, pricing, private lender directory, and how to get started."
        canonicalUrl="https://redatametrix.com/faq"
      />
      <FAQSchema faqs={allFaqs} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2" data-testid="text-faq-title">
            Frequently Asked Questions
          </h1>
          <div className="h-0.5 w-24 bg-accent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Everything you need to know about RE Data Metrix
          </p>
        </div>

        <div className="space-y-4">
          {faqSections.map((section, sectionIndex) => (
            <Card key={sectionIndex} className="p-4" data-testid={`card-faq-section-${sectionIndex}`}>
              <div className="flex items-center gap-2 mb-3">
                {section.icon}
                <h2 className="text-base font-semibold text-primary">{section.title}</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                {section.items.map((item, itemIndex) => (
                  <AccordionItem 
                    key={itemIndex} 
                    value={`section-${sectionIndex}-item-${itemIndex}`}
                    data-testid={`accordion-item-${sectionIndex}-${itemIndex}`}
                    className="border-b-0 last:border-b-0"
                  >
                    <AccordionTrigger className="text-left text-[13px] hover:text-primary py-2">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-[13px] leading-relaxed pb-2">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-6 bg-primary text-primary-foreground text-center">
          <h3 className="text-lg font-semibold mb-2">Still have questions?</h3>
          <p className="text-primary-foreground/80 text-sm mb-4">
            We're here to help. Reach out to our support team anytime.
          </p>
          <a 
            href="/contact" 
            className="inline-block bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
            data-testid="link-contact-support"
          >
            Contact Support
          </a>
        </Card>
      </div>
    </Layout>
  );
}
