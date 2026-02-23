# RE Data Metrix

## Overview
RE Data Metrix is a real estate investment analytics and financing platform designed to connect investors with lenders. It provides advanced profitability analysis, diverse financing options, and a streamlined engagement process for lenders. The platform aims to simplify real estate investment and financing through comprehensive deal analysis tools and an efficient lending application workflow, with a business vision to become the leading platform for real estate investors and lenders.

## User Preferences
Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)
Calculation verification: Use `shared/data/calculationReference.ts` as the source of truth when verifying calculations are working correctly

## System Architecture
The platform utilizes a modern web stack with a React/TypeScript frontend, leveraging `shadcn/ui`, Radix UI, Tailwind CSS, Wouter for routing, React Query for state management, and `react-hook-form` with Zod for form validation. The backend is built with Node.js/Express.js, providing a RESTful API with Zod for server-side validation. Data persistence is managed by PostgreSQL via Neon serverless driver and Drizzle ORM, including tables for users, lenders, and loan products.

Authentication supports user and lender management, session handling with Express sessions, email verification, and password resets. Role-based authorization (user, lender, admin) is implemented. All login flows (member, lender, contractor, admin) are consolidated on a single `/login` page: member fields are always visible, while lender/contractor/admin logins are in collapsible accordion sections. Legacy routes (`/contractor-login`, `/lender-login`, `/admin/login`) redirect to `/login`. Session persistence uses a dual approach: HTTP-only cookies with `sameSite: 'none'` (primary) plus a token-based fallback via `X-Session-Token` header stored in localStorage for iframe environments where browsers block third-party cookies. All login handlers return a `_sessionToken` field (signed session ID via `cookie-signature`); the global fetch wrapper in `main.tsx` automatically attaches this header to all `/api` requests. Login redirects use `window.location.href` for full page navigation to ensure proper cookie handling. A subscription system, integrated with Stripe Billing, gates premium features like full deal analysis, property API lookups, and rental analysis. The signup flow is structured as `/signup` (plan comparison) → `/register?plan=X` (account creation) → email verification → `/checkout?plan=X` (premium) or `/upgrade` (free).

Key features include a 5-step Deal Analysis Wizard for Fix & Flip and Rental/DSCR scenarios, supporting double close transactions and loan comparisons. An Investor Inquiries system facilitates communication between investors and lenders. An Admin portal provides calculation references, affiliate management, and tools for managing contractor invitations and service regions. All loan calculation logic is centralized in `shared/calculations/loan-calculations.ts`. Dedicated mobile pages (`/m/deal-analysis`, `/m/lenders`, `/m/toolbox`) offer touch-optimized experiences. A freemium model tracks usage for property lookups and PDF downloads. The platform includes a Wholesale Max Offer Calculator with support for Assignment and Double Close transactions, with calculations in `shared/calculations/wholesale-calculations.ts`. Double Close transactions can integrate with an embedded Straightline Funding form. A Developer Integration Portal allows CRM integration via configurable integrations, webhooks, and field mappings.

A Contractor Search feature allows subscribers to find general contractors by service region. Contractor onboarding is invitation-based, allowing admins to invite contractors who then complete their profiles and select service regions. A Contractor Portal (`/contractor-portal`) provides authenticated contractors with referral reporting (referral code generation, click tracking), document management (upload contracts/agreements, assign to referred users, download/delete), and user search for document assignment. Authentication uses a `contractor-local` Passport strategy with session handling via `userType: 'contractor'`. Documents are stored as base64 in the `contractor_documents` table with user assignment support.

The Deal Tracking System allows users to manage investment deals through their lifecycle. Deals are grouped by property address, with statuses including "Analyzing," "Under Contract," "Purchased," and "Sold," with a "Lost" status for archived deals. A soft-delete system uses an `isHidden` boolean field to archive analyses without permanent deletion. Data collection dynamically updates based on the deal's status, pre-filling fields where possible from initial analyses.

A promo code system enables capped redemptions for free access and manages a waitlist for overflow users, with activation-based expiry for free periods. An apply click tracking system captures investor and property details, loan product information, and referral sources when users click "Apply Now" buttons, providing analytics for lenders in their portal.

The ARV Helper feature employs a Dual-API Hybrid Strategy for comparable sales (comps) search, querying RentCast and HasData APIs in parallel. This strategy merges data from both sources, prioritizing MLS-verified information from HasData for sale price and date, and leveraging RentCast for broader coverage, lot size, and images. Address normalization and specific search parameters (property type, bedroom range, sqft range, radius) enhance accuracy. Users can include pending sales and add comps via Zillow URLs.

A Zoho Meeting integration enables automated webinar attendance syncing. Admins can connect their Zoho account via OAuth2, then sync attendance data from Zoho Meeting by entering a meeting key. The sync uses case-insensitive email matching between Zoho participants and webinar registrations. OAuth security includes CSRF protection via state parameter validation with single-use tokens and 10-minute expiry.

A Marketing Pixel Management System enables admins to configure tracking pixels for advertising platforms (Meta, LinkedIn, Google Ads, TikTok, Twitter) via the `/admin/marketing-pixels` page. The `MarketingPixelLoader` component automatically injects enabled pixel scripts site-wide. The `useMarketingEvents` hook provides tracking functions for key conversion events: `trackLead` (webinar registration), `trackInitiateCheckout`, `trackCompleteRegistration` (account creation), and `trackSubscribe` (subscription completion).

## Future Features (Backlog)

### Custom User Email Workflow
Allow users to create custom follow-up reminder emails tied to their deals. Key capabilities:
- **Timing**: User selects days before closing (e.g., 7 days, 4 days, 1 day before)
- **Content**: User provides talking points/reminders; system generates a professional branded email from their input (e.g., "remind group to schedule final walkthrough and confirm funding")
- **Custom Recipients**: Add recipients with role labels — closing attorney/title company, real estate agent, contractor, partner, etc.
- **Read Receipts**: Embed tracking pixel in sent emails; display read/unread status per recipient in the UI
- **Implementation Notes**: Extends existing closing reminder scheduler and Zoho SMTP email infrastructure. New tables: `custom_deal_reminders` (deal ID, days before closing, talking points, subject, status, sent_at) and `custom_reminder_recipients` (reminder ID, email, name, role label, read status, read_at). Tracking pixel endpoint records opens. Minimal cost impact — uses existing SMTP service and lightweight tracking requests.

## External Dependencies
- **Database Service**: Neon Serverless PostgreSQL
- **UI Component Libraries**: Radix UI, shadcn/ui, Lucide React
- **Frontend Libraries**: React Query, Wouter, React Hook Form, Zod, date-fns, Tailwind CSS, class-variance-authority
- **Payment Processing**: Stripe (for billing and subscription management)
- **Email Service**: Zoho Mail SMTP
- **Webinar Integration**: Zoho Meeting API (OAuth2 authentication, participant attendance fetching via ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_ZSOID)
- **Property Data APIs**: RentCast API (property details, tax info, estimated values, rent estimates), HasData API (comparable sales from Zillow, pending sales, property images)