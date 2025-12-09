# RE Data Metrix

## Overview
RE Data Metrix is a real estate investment analytics and financing platform designed to connect investors with lenders. It provides advanced profitability analysis, compares diverse financing options, and streamlines direct lender engagement to simplify real estate investment and financing. The platform aims to be a leading solution in the market by offering comprehensive deal analysis tools and an efficient lending application workflow.

## User Preferences
Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)
Calculation verification: Use `shared/data/calculationReference.ts` as the source of truth when verifying calculations are working correctly

## System Architecture

### Frontend
The frontend uses React and TypeScript, built with Vite, `shadcn/ui` (New York style), Radix UI, and Tailwind CSS. Routing is handled by Wouter, state and data fetching by React Query, and forms by react-hook-form with Zod validation. It includes marketing pages, authentication, a lender portal, and a 5-step Deal Analysis Wizard.

### Backend
The backend is built with Node.js and Express.js, providing a RESTful API. It utilizes an abstracted storage interface with an in-memory implementation for CRUD operations and PostgreSQL for session management and data persistence. All API endpoints include Zod schemas for server-side validation.

### Database
PostgreSQL is the chosen database, accessed via the Neon serverless driver. Drizzle ORM ensures type-safe operations and manages the schema, which includes tables for `users`, `prelaunch_signups`, `lenders`, `lender_questionnaires`, `loan_products`, and `lender_referrals`. Drizzle Kit handles schema migrations.

### Authentication & Authorization
The platform features a complete authentication system with user and lender tables, session management, email verification via Zoho Mail SMTP, and password reset functionality. Express sessions with a PostgreSQL store are used. Middleware-based authorization protects routes for user, lender, and admin access, with separate portals for each. Admin functionalities include user management, subscription control, and terms acceptance tracking. Legal documents (`/terms`, `/privacy`) with user acceptance tracking are integrated.

### Membership Access Control
A subscription-based access system restricts premium features, requiring either a paid subscription or a valid comp code. Pricing tiers are monthly ($15) and annual ($150), with discount code support. Stripe Billing is integrated for checkout and subscription management.

**Premium Feature Gating:**
- Deal Analysis Step 5 (Results): Requires subscription to view full analysis and lender recommendations
- Property API Lookup: Automatic property data fetch from Zillow/Redfin URLs is subscriber-only
- Non-subscribers can still use Deal Analysis with manual property entry
- Rental Analysis: Full tool access requires subscription
- Toolbox & Resources: Affiliate programs require subscription

### Stripe Billing Integration
The platform uses Stripe for all subscription and payment processing via Replit's native connector (`stripe-replit-sync`):

**Key Components:**
- `server/services/stripeClient.ts`: Stripe initialization and configuration (supports manual API keys as fallback)
- `server/services/stripeService.ts`: Checkout sessions, billing portal, and subscription management
- Webhook route: `/api/stripe/webhook/:uuid` (registered before express.json() middleware)

**API Key Configuration:**
- Primary: Uses Replit's Stripe connector for development
- Fallback: Manual `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` environment secrets for production
- The stripeClient.ts checks for manual keys first, then falls back to Replit connector

**Stripe Product Setup:**
- Products must have `plan_type` metadata set to either `monthly` or `annual`
- Metadata can be on either the Price OR the Product object (code checks both)
- Products must be created in LIVE mode for production (test mode products are separate)

**API Endpoints:**
- `GET /api/subscription/plans`: List available subscription plans
- `POST /api/subscription/checkout`: Create Stripe Checkout session
- `GET /api/subscription/checkout-success`: Verify checkout completion
- `POST /api/subscription/cancel`: Cancel subscription
- `GET /api/subscription/billing-portal`: Redirect to Stripe Customer Portal

**Discount Codes:**
- Discount codes can link to Stripe coupons via `stripeCouponId` column in `discount_codes` table
- When set, the Stripe coupon is automatically applied during checkout

### Feature Specifications
Key features include loan type education, intelligent lender filtering with deep linking, consolidated rental analysis, Zillow RentZestimate integration, detailed deal analysis, and loan comparison services. The platform also offers a "Toolbox & Resources" section with affiliate programs and a glossary. The Rental Analysis flow includes intelligent DSCR lender matching and loan calculations.

The Deal Analysis results page (Step 5) features a tabbed interface for "Fix & Flip" and "Rental / DSCR" analysis. 

**Fix & Flip Tab Features:**
- Summary metrics box at top displaying: Net Profit, Total Out-of-Pocket, Cash-on-Cash Return, and Annualized Return
- Editable variables section for quick recalculations (Buy Price, Rehab, Project Length)
- Detailed loan comparison table with expandable breakdowns
- PDF download with QR codes for lender referral links (hidden in browser, shown in PDF)

**PDF Generation Notes:**
- Uses `react-to-pdf` library which uses HTML-to-canvas (NOT CSS print media queries)
- `isGeneratingPdf` state controls element visibility during PDF capture
- QR codes shown only in PDF via conditional rendering `{isGeneratingPdf && ...}`
- "Contact Lender" buttons and "Show More Loans" hidden in PDF via `{!isGeneratingPdf && ...}`

The Rental / DSCR tab provides property overview, monthly rent input, real-time DSCR calculation, PITIA breakdown, and DSCR lender comparison.

Lender email alerts notify lenders of loan product changes and new investor inquiries. The Investor Inquiries system stores contact requests in a `lender_inquiries` table, viewable by lenders in a dedicated portal page (`/lender-inquiries`) with search and filter capabilities. A "Contact Lender" flow on the Deal Analysis results page allows investors to send detailed inquiries.

An Admin portal page (`/admin/calculations`) provides a reference for 23 platform calculations across 8 categories, including descriptions, formulas, inputs, and worked examples, with search and navigation features. **This reference (`shared/data/calculationReference.ts`) should be used as the source of truth when verifying calculations are functioning correctly.**

### Double Close Transaction Support
Deal Analysis Step 3 includes support for double close transactions (common when buying from wholesalers). Features include:
- "Is this a double close?" question with Yes/No radio buttons
- Follow-up "Are you paying for both transactions?" question when Yes is selected
- Step 4 displays two separate closing cost sections (Buy1 and Buy2) when paying for both sides
- Both sections are pre-populated with standard closing cost defaults and fully editable
- Total investment calculations automatically include both sets of closing costs

An Admin portal for Affiliate Management (`/admin/affiliates`) allows managing affiliate partner programs and categories, including CRUD operations and pre-seeded data.

### Total LTC Cap Feature
Bridge loan products include a Total LTC (Loan-to-Cost) Cap feature, allowing lenders to limit the total loan amount based on a percentage of the total project cost. The system calculates loan limits based on LTV, ARV, and LTC caps, with the lowest determining the final loan amount. UI indicators are present in the Lender Portal and Deal Analysis Results.

### Carrying Costs Calculation
Deal Analysis Step 4 collects carrying/holding costs with the following fields arranged in two rows:
- **Row 1:** Monthly Insurance, Monthly Utilities, Monthly Property Tax
- **Row 2:** Monthly HOA, HOA Transfer Fee (one-time, with tooltip), Other Costs (one-time, with tooltip)
- **Monthly Interest:** Read-only field showing $0 with helper text "Will be calculated upon lender selection"

The backend calculates per-lender carrying costs:
- When interest is NOT deferred: Monthly interest payments are added to carrying costs for display
- When interest IS deferred: Interest goes to rolled costs (added to payoff amount)
- Total carrying costs = (monthly costs × project length) + one-time costs + interest (if not deferred)

### Form Handling & Validation
Client-side validation uses react-hook-form and Zod, complemented by comprehensive server-side Zod schema validation for all API endpoints.

### Build & Deployment
Vite is used for frontend development and production builds, while esbuild handles the Express server build. Path aliases support a monorepo structure.

## External Dependencies

### Database Service
- Neon Serverless PostgreSQL

### UI Component Libraries
- Radix UI
- shadcn/ui
- Lucide React

### Frontend Libraries
- React Query
- Wouter
- React Hook Form
- Zod
- date-fns
- Tailwind CSS
- class-variance-authority
- Stripe (for billing and subscription management)

### Development Tools
- TypeScript
- Vite
- esbuild
- PostCSS

### Email Service
- Zoho Mail SMTP (for email verification and notifications)

### Property Data APIs
- **RentCast API** (Active): Primary property data source
  - Service file: `server/services/rentcast-api.service.ts`
  - Supports address-based lookup and URL parsing (Zillow/Redfin)
  - Returns: property details, tax assessed value, annual tax amount, estimated value, estimated rent, comparable sales
- **HasData API** (Active - Images Only): Property photos from Zillow/Redfin
  - Integrated into RentCastAPIService via `fetchPropertyImageFromUrl` method
  - **Source Priority Order**: Redfin first (more reliable), Zillow as fallback
  - Both sources are tried in sequence until an image is found
  - If both fail, a placeholder image is returned
  - Includes success/error logging to track which source is working

### API Integration Tracking
Admin panel (`/admin/integrations`) shows all API integrations with active/inactive status:
- Active integrations show features and ready status
- Inactive integrations are grayed out with deprecation notes
- Integration changes should be tracked in Admin Panel