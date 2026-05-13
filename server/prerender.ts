import fs from 'fs';
import path from 'path';
import type { Express } from 'express';

const BASE_URL = 'https://redatametrix.com';
const SITE_NAME = 'RE Data Metrix';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

const COMPANY_ADDRESS = {
  "@type": "PostalAddress",
  "streetAddress": "8735 Dunwoody Pl, Suite R",
  "addressLocality": "Atlanta",
  "addressRegion": "GA",
  "postalCode": "30350",
  "addressCountry": "US"
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "RE Data Metrix",
  "url": BASE_URL,
  "logo": `${BASE_URL}/logo.png`,
  "description": "Real estate investment analysis and funding platform connecting investors with lenders.",
  "sameAs": ["https://www.facebook.com/groups/1455681056068763/"],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "info@redatametrix.com"
  }
};

const webAppSchema = {
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

const aboutPageSchemaBase = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
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

const contactPageSchema = {
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

const pricingPageSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "RE Data Metrix",
  "url": BASE_URL,
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web Browser",
  "description": "Real estate investment analysis platform with deal calculators, lender directory, and profitability tools.",
  "offers": [
    {
      "@type": "Offer",
      "name": "Monthly Subscription",
      "price": "25.00",
      "priceCurrency": "USD",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Full access to all RE Data Metrix tools on a monthly basis."
    },
    {
      "@type": "Offer",
      "name": "Annual Subscription",
      "price": "250.00",
      "priceCurrency": "USD",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Full access to all RE Data Metrix tools on an annual basis — save $50 vs monthly."
    }
  ],
  "featureList": [
    "Fix & Flip Deal Analysis",
    "DSCR Rental Calculator",
    "ARV Helper with Comparable Sales",
    "Wholesale Max Offer Calculator",
    "Private Lender Directory",
    "Loan Comparison Tools",
    "State-Specific Investment Calculations",
    "Investor Toolbox & Partner Resources"
  ]
};

const lendersPageSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Private Lender Directory — RE Data Metrix",
  "url": `${BASE_URL}/lenders`,
  "description": "Search and connect with verified private lenders specializing in real estate investment financing.",
  "serviceType": "Real Estate Lending Marketplace",
  "areaServed": { "@type": "Country", "name": "United States" },
  "provider": {
    "@type": "Organization",
    "name": "RE Data Metrix, LLC",
    "url": BASE_URL,
    "address": COMPANY_ADDRESS
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Loan Types",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Hard Money Loans" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "DSCR Loans" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Bridge Loans" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Fix and Flip Loans" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Rental Portfolio Loans" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "New Construction Loans" } }
    ]
  }
};

const faqPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is RE Data Metrix?", "acceptedAnswer": { "@type": "Answer", "text": "RE Data Metrix is an online tool that helps real estate investors analyze individual deals and compare loan options side by side based on profit, cash required, and ROI metrics." } },
    { "@type": "Question", "name": "What types of properties can I analyze?", "acceptedAnswer": { "@type": "Answer", "text": "The tool is designed primarily for single-family real estate investments, with support for common strategies like rentals, BRRRR, and fix-and-flip properties." } },
    { "@type": "Question", "name": "What loan metrics does the tool calculate?", "acceptedAnswer": { "@type": "Answer", "text": "It estimates total cash-out-of-pocket, overall ROI, and annualized ROI for each loan product so you can see which financing structure best fits your goals." } },
    { "@type": "Question", "name": "How is this different from a simple spreadsheet?", "acceptedAnswer": { "@type": "Answer", "text": "RE Data Metrix standardizes your assumptions, automates complex loan math, and lets you compare multiple scenarios and lenders in one place instead of manually updating formulas." } },
    { "@type": "Question", "name": "Who is RE Data Metrix built for?", "acceptedAnswer": { "@type": "Answer", "text": "It is built for real estate investors who want a clear, data-driven way to evaluate each deal and compare financing options." } },
    { "@type": "Question", "name": "How is RE Data Metrix priced?", "acceptedAnswer": { "@type": "Answer", "text": "Our affordable pricing gives investors full access to our tools and partners for $25 a month or $250 for an annual subscription." } },
    { "@type": "Question", "name": "Do you offer a free account?", "acceptedAnswer": { "@type": "Answer", "text": "Yes! Free accounts include 2 automated deal analyses per month, unlimited manual deal entry, access to all three calculators, full Toolbox access, lender search, and CSV export." } },
    { "@type": "Question", "name": "Can I cancel my subscription?", "acceptedAnswer": { "@type": "Answer", "text": "You can cancel before your next billing date, and your access will continue through the end of the current period." } },
    { "@type": "Question", "name": "Is my deal data private?", "acceptedAnswer": { "@type": "Answer", "text": "Your deal inputs and analysis are stored in your account and are not shared with other users." } },
    { "@type": "Question", "name": "How do I get started?", "acceptedAnswer": { "@type": "Answer", "text": "Create an account, add a property, enter your assumptions, and then compare loan options to see profit, cash to close, and ROI for each scenario." } }
  ]
};

interface RouteConfig {
  path: string;
  title: string | null;
  description: string;
  canonicalUrl: string;
  noIndex?: boolean;
  schemas: object[];
}

const BASE_SCHEMAS = [organizationSchema, webAppSchema];

export const PRERENDER_ROUTES: RouteConfig[] = [
  {
    path: '/',
    title: null,
    description: 'RE Data Metrix - Turning Terms into Returns. Comprehensive real estate investment analysis platform with deal analysis tools, lender directory, and profitability calculators.',
    canonicalUrl: `${BASE_URL}/`,
    schemas: BASE_SCHEMAS
  },
  {
    path: '/about',
    title: 'About Us',
    description: 'Learn about RE Data Metrix, a real estate analytics platform in Atlanta, GA. We empower investors with deal analysis tools and direct lender connections.',
    canonicalUrl: `${BASE_URL}/about`,
    schemas: [
      ...BASE_SCHEMAS,
      { ...aboutPageSchemaBase, name: 'About RE Data Metrix', url: `${BASE_URL}/about` }
    ]
  },
  {
    path: '/company',
    title: 'The Company',
    description: 'RE Data Metrix, LLC is revolutionizing how investors analyze deals and find funding. Based in Atlanta, GA, we provide powerful investment analysis tools and lender connections.',
    canonicalUrl: `${BASE_URL}/company`,
    schemas: [
      ...BASE_SCHEMAS,
      { ...aboutPageSchemaBase, name: 'RE Data Metrix — The Company', url: `${BASE_URL}/company` }
    ]
  },
  {
    path: '/contact',
    title: 'Contact Us',
    description: 'Contact RE Data Metrix with questions about our deal analysis tools, lender directory, or pricing. We typically respond within 24-48 business hours.',
    canonicalUrl: `${BASE_URL}/contact`,
    schemas: [...BASE_SCHEMAS, contactPageSchema]
  },
  {
    path: '/faq',
    title: 'FAQ',
    description: 'Frequently asked questions about RE Data Metrix. Learn about our real estate investment analysis tools, pricing, private lender directory, and how to get started.',
    canonicalUrl: `${BASE_URL}/faq`,
    schemas: [...BASE_SCHEMAS, faqPageSchema]
  },
  {
    path: '/features',
    title: 'Features',
    description: 'Explore RE Data Metrix features: Fix & Flip deal analysis, DSCR rental calculators, ARV helper with comparable sales, wholesale calculator, and private lender directory.',
    canonicalUrl: `${BASE_URL}/features`,
    schemas: BASE_SCHEMAS
  },
  {
    path: '/pricing',
    title: 'Pricing',
    description: 'Simple, transparent pricing for RE Data Metrix. Get unlimited access to deal analysis tools, lender directory, and investment calculators for $25/month or $250/year.',
    canonicalUrl: `${BASE_URL}/pricing`,
    schemas: [...BASE_SCHEMAS, pricingPageSchema]
  },
  {
    path: '/lenders',
    title: 'Private Lender Directory',
    description: 'Find and connect with private lenders for real estate investments. Search by loan type, state, and criteria. Compare hard money, DSCR, bridge loans and more.',
    canonicalUrl: `${BASE_URL}/lenders`,
    schemas: [...BASE_SCHEMAS, lendersPageSchema]
  },
  {
    path: '/loan-types',
    title: 'Real Estate Loan Types Explained',
    description: 'Understand hard money, DSCR, transactional funding, conventional, and private/seller financing loans. Learn which loan type fits your real estate investment strategy.',
    canonicalUrl: `${BASE_URL}/loan-types`,
    schemas: BASE_SCHEMAS
  },
  {
    path: '/about-private-lenders',
    title: 'About Private Lenders',
    description: 'Learn how to find and work with private lenders for real estate investing. Discover sources for private capital and how RE Data Metrix connects you to vetted lenders.',
    canonicalUrl: `${BASE_URL}/about-private-lenders`,
    schemas: BASE_SCHEMAS
  },
  {
    path: '/toolbox',
    title: 'Investor Toolbox & Resources',
    description: "Access RE Data Metrix's investor toolbox. Partner tools for lead generation, property management, contractors, comps, and training videos — all in one place.",
    canonicalUrl: `${BASE_URL}/toolbox`,
    schemas: BASE_SCHEMAS
  },
  // WEBINAR_ENABLED = false — webinar prerender route deactivated
  // {
  //   path: '/webinar',
  //   title: 'Free Webinar - Real Estate Investment Training',
  //   description: 'Join our free live webinar to learn how to analyze real estate deals, connect with private lenders, and use data-driven tools to maximize your investment returns.',
  //   canonicalUrl: `${BASE_URL}/webinar`,
  //   schemas: BASE_SCHEMAS
  // },
  {
    path: '/meta-offer',
    title: 'Analyze Deals & Find the Right Lender',
    description: 'Stop guessing on real estate deals. Analyze profitability, compare lenders, and close with confidence — free to start, no credit card required.',
    canonicalUrl: `${BASE_URL}/meta-offer`,
    schemas: BASE_SCHEMAS
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'RE Data Metrix privacy policy. Learn how we collect, use, and protect your personal information.',
    canonicalUrl: `${BASE_URL}/privacy`,
    noIndex: true,
    schemas: []
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description: 'RE Data Metrix terms of service and user agreement.',
    canonicalUrl: `${BASE_URL}/terms`,
    noIndex: true,
    schemas: []
  },
  {
    path: '/disclaimer',
    title: 'Disclaimer',
    description: 'RE Data Metrix disclaimer and limitations of liability for our real estate investment analysis tools.',
    canonicalUrl: `${BASE_URL}/disclaimer`,
    noIndex: true,
    schemas: []
  },
  {
    path: '/affiliate-disclosure',
    title: 'Affiliate Disclosure',
    description: 'RE Data Metrix affiliate disclosure policy for partner tool relationships.',
    canonicalUrl: `${BASE_URL}/affiliate-disclosure`,
    noIndex: true,
    schemas: []
  },
  {
    path: '/login',
    title: 'Log In',
    description: 'Log in to your RE Data Metrix account to access your deal analyses, lender comparisons, and investment tools.',
    canonicalUrl: `${BASE_URL}/login`,
    noIndex: true,
    schemas: []
  },
  {
    path: '/register',
    title: 'Create Account',
    description: 'Create your free RE Data Metrix account. Access real estate deal analysis tools, lender directory, and investment calculators — free to start.',
    canonicalUrl: `${BASE_URL}/register`,
    noIndex: true,
    schemas: []
  }
];

function buildFullTitle(title: string | null): string {
  if (!title) return `${SITE_NAME} - Real Estate Investment Analysis & Funding`;
  return `${title} | ${SITE_NAME}`;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHeadTags(route: RouteConfig): string {
  const fullTitle = buildFullTitle(route.title);
  const lines: string[] = [];

  lines.push(`  <!-- Prerendered SEO: ${route.path} -->`);
  lines.push(`  <title>${fullTitle}</title>`);

  if (route.noIndex) {
    lines.push(`  <meta name="robots" content="noindex, nofollow" />`);
  }

  lines.push(`  <meta property="og:title" content="${escapeAttr(fullTitle)}" />`);
  lines.push(`  <meta property="og:description" content="${escapeAttr(route.description)}" />`);
  lines.push(`  <meta property="og:type" content="website" />`);
  lines.push(`  <meta property="og:image" content="${DEFAULT_IMAGE}" />`);
  lines.push(`  <meta property="og:site_name" content="${SITE_NAME}" />`);
  lines.push(`  <meta property="og:url" content="${route.canonicalUrl}" />`);
  lines.push(`  <meta name="twitter:card" content="summary_large_image" />`);
  lines.push(`  <meta name="twitter:title" content="${escapeAttr(fullTitle)}" />`);
  lines.push(`  <meta name="twitter:description" content="${escapeAttr(route.description)}" />`);
  lines.push(`  <meta name="twitter:image" content="${DEFAULT_IMAGE}" />`);

  for (const schema of route.schemas) {
    lines.push(`  <script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  }

  lines.push(`  <!-- End prerendered SEO -->`);
  return lines.join('\n');
}

function injectIntoHtml(baseHtml: string, headTags: string): string {
  let html = baseHtml;
  html = html.replace(/<title>[^<]*<\/title>/, '');
  html = html.replace(/<meta\s+name="description"[^/]*(\/?>)/, '');
  const viewportIdx = html.indexOf('<meta name="viewport"');
  if (viewportIdx !== -1) {
    const lineEnd = html.indexOf('\n', viewportIdx);
    const insertAfter = lineEnd !== -1 ? lineEnd + 1 : viewportIdx + 1;
    html = html.slice(0, insertAfter) + headTags + '\n' + html.slice(insertAfter);
  } else {
    html = html.replace('</head>', `${headTags}\n</head>`);
  }
  return html;
}

export async function runPrerender(): Promise<void> {
  const distDir = path.resolve(process.cwd(), 'dist', 'public');
  const baseHtmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(baseHtmlPath)) {
    console.warn('[prerender] dist/public/index.html not found — skipping. Run vite build first.');
    return;
  }

  const baseHtml = fs.readFileSync(baseHtmlPath, 'utf-8');
  let generated = 0;
  let skipped = 0;

  for (const route of PRERENDER_ROUTES) {
    try {
      const headTags = buildHeadTags(route);
      const renderedHtml = injectIntoHtml(baseHtml, headTags);

      if (route.path === '/') {
        fs.writeFileSync(baseHtmlPath, renderedHtml, 'utf-8');
      } else {
        const slug = route.path.replace(/^\//, '');
        const routeDir = path.join(distDir, slug);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, 'index.html'), renderedHtml, 'utf-8');
      }
      generated++;
    } catch (err) {
      console.error(`[prerender] Failed for ${route.path}:`, err);
      skipped++;
    }
  }

  console.log(`[prerender] Done: ${generated} routes generated, ${skipped} skipped.`);
}

export function registerPrerenderRoutes(app: Express): void {
  const distDir = path.resolve(process.cwd(), 'dist', 'public');

  for (const route of PRERENDER_ROUTES) {
    if (route.path === '/') continue;

    const slug = route.path.replace(/^\//, '');
    const htmlFile = path.join(distDir, slug, 'index.html');
    const routePath = route.path;

    app.get(routePath, (_req, res, next) => {
      if (fs.existsSync(htmlFile)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.sendFile(htmlFile);
      } else {
        next();
      }
    });
  }
}
