import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FAQItem {
  question: string;
  answer: string;
}

interface CalculatorContentProps {
  explainer: string;
  faqs: FAQItem[];
  testIdPrefix: string;
}

export function CalculatorContent({ explainer, faqs, testIdPrefix }: CalculatorContentProps) {
  return (
    <div className="mt-8 space-y-6">
      <Card>
        <CardContent className="p-5">
          <p
            className="text-sm leading-relaxed text-foreground"
            data-testid={`text-${testIdPrefix}-explainer`}
          >
            {explainer}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: "#1d408b" }}
            data-testid={`text-${testIdPrefix}-faq-heading`}
          >
            Frequently Asked Questions
          </h2>

          <div className="md:hidden">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger
                    className="text-left text-sm"
                    data-testid={`accordion-${testIdPrefix}-faq-${i}`}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="hidden md:block space-y-5">
            {faqs.map((faq, i) => (
              <div key={i} data-testid={`text-${testIdPrefix}-faq-${i}`}>
                <h3 className="font-medium text-sm mb-1">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm">
        <Link
          href="/toolbox"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground hover-elevate px-3 py-2 rounded-md"
          data-testid={`link-${testIdPrefix}-glossary`}
        >
          <BookOpen className="h-4 w-4" />
          New to these terms? Visit our Real Estate Glossary →
        </Link>
      </div>
    </div>
  );
}
