import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://redatametrix.com';
const COMPANY_ADDRESS = {
  "@type": "PostalAddress",
  "streetAddress": "8735 Dunwoody Pl, Suite R",
  "addressLocality": "Atlanta",
  "addressRegion": "GA",
  "postalCode": "30350",
  "addressCountry": "US"
};

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RE Data Metrix",
    "url": BASE_URL,
    "logo": `${BASE_URL}/logo.png`,
    "description": "Real estate investment analysis and funding platform connecting investors with lenders.",
    "sameAs": [
      "https://www.facebook.com/groups/1455681056068763/"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "info@redatametrix.com"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function WebApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "RE Data Metrix",
    "url": BASE_URL,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "description": "Real estate investment analysis platform with deal calculators, lender directory, and profitability tools.",
    "offers": {
      "@type": "Offer",
      "price": "25.00",
      "priceCurrency": "USD",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock"
    },
    "featureList": [
      "Fix & Flip Deal Analysis",
      "DSCR Rental Calculator",
      "ARV Helper with Comparable Sales",
      "Wholesale Max Offer Calculator",
      "Private Lender Directory",
      "Loan Comparison Tools"
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface FAQSchemaProps {
  faqs: Array<{ question: string; answer: string }>;
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function AboutPageSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About RE Data Metrix",
    "url": `${BASE_URL}/about`,
    "description": "RE Data Metrix™, LLC is a technology-driven real estate analytics platform headquartered in Atlanta, Georgia, empowering investors with data-driven deal analysis and lender connections.",
    "mainEntity": {
      "@type": "Organization",
      "name": "RE Data Metrix, LLC",
      "url": BASE_URL,
      "logo": `${BASE_URL}/logo.png`,
      "address": COMPANY_ADDRESS,
      "telephone": "+18884504408",
      "email": "info@redatametrix.com",
      "foundingLocation": "Atlanta, Georgia",
      "description": "Technology-driven real estate analytics platform providing sophisticated deal analysis tools and direct connections to funding sources."
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function ContactPageSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact RE Data Metrix",
    "url": `${BASE_URL}/contact`,
    "description": "Contact RE Data Metrix for questions about our real estate investment analysis platform.",
    "mainEntity": {
      "@type": "Organization",
      "name": "RE Data Metrix, LLC",
      "url": BASE_URL,
      "address": COMPANY_ADDRESS,
      "telephone": "+18884504408",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": "English",
        "areaServed": "US",
        "contactOption": "TollFree"
      }
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
