# RE Data Metrix

## Overview
RE Data Metrix is a real estate investment analytics and financing platform designed to connect investors with lenders. It provides advanced profitability analysis, diverse financing options, and a streamlined engagement process for lenders. The platform's core purpose is to simplify real estate investment and financing through comprehensive deal analysis tools and an efficient lending application workflow.

## User Preferences
Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)
Calculation verification: Use `shared/data/calculationReference.ts` as the source of truth when verifying calculations are working correctly

## System Architecture
The platform features a React/TypeScript frontend utilizing `shadcn/ui`, Radix UI, Tailwind CSS, Wouter for routing, React Query for state management, and `react-hook-form` with Zod for form validation. The backend is built with Node.js/Express.js, exposing a RESTful API with Zod for server-side validation. Data persistence is managed by PostgreSQL, accessed via Neon serverless driver and Drizzle ORM, with tables for users, lenders, and loan products. A database seeding system ensures consistent baseline data.

Authentication includes user and lender management, session handling with Express sessions and a PostgreSQL store, email verification, and password resets. Role-based authorization (user, lender, admin) is implemented via middleware. User account processes are centralized in `server/services/auth.service.ts`, which handles registration (including comp code validation), email verification, password reset, and subscription status management. Routes in `server/routes.ts` are thin wrappers that call these service methods. A subscription system, integrated with Stripe Billing, gates premium features like full deal analysis, property API lookups, and rental analysis.

The signup flow uses a pre-registration comparison page at `/signup` where users choose between Free and Premium plans:
- **Signup Flow**: `/signup` (plan comparison) → `/register?plan=X` (account creation) → verify email → `/checkout?plan=X` (premium) OR `/upgrade` (free)
- **pendingPlan Field**: Stores user's plan selection ("monthly" or "annual") during registration for post-verification routing
- **Email Templates**: Verification emails include live links (Deal Analysis, Lender Directory, Toolbox), conditional CTAs based on plan selection
- **Login Redirect Logic**: Free users with pendingPlan go to checkout; free users without pendingPlan go to upgrade page; subscribers go to dashboard

Key features include a 5-step Deal Analysis Wizard supporting Fix & Flip and Rental/DSCR scenarios, including double close transactions and loan comparisons. An Investor Inquiries system facilitates direct communication between investors and lenders. An Admin portal provides calculation references and affiliate management. All loan calculation logic is centralized in `shared/calculations/loan-calculations.ts`. Dedicated mobile pages (`/m/deal-analysis`, `/m/lenders`, `/m/toolbox`) offer touch-optimized experiences with an auto-redirect mechanism for mobile users. A freemium model tracks monthly usage for property lookups and PDF downloads, offering paid subscriptions for unlimited access. The platform also includes a Wholesale Max Offer Calculator with support for Assignment and Double Close transactions, with calculations centralized in `shared/calculations/wholesale-calculations.ts`. For Double Close transactions, users can apply for transactional funding directly through an embedded Straightline Funding form (Zoho Forms) that pre-fills property address, purchase prices, and user contact info from the deal analysis. Admin users have preview access to the Lender Portal, and a demo mode anonymizes lender data for preview purposes. A developer role provides limited admin access for CRM integrators, who can use the Developer Integration Portal to connect external systems via configurable integrations, webhooks, and field mappings. A demo access link system allows potential customers to preview features with anonymized data.

A Contractor Search feature allows subscribers to find general contractors by service region. Contractors are organized by metro areas/regions (more limited than state-wide lenders). Database tables include `service_regions` (state, name, key_cities array), `contractors` (company info, specialties, insurance/bonding status, and invitation fields), and `contractor_service_regions` (junction table). Georgia is seeded with 15 service regions including Atlanta Metro, North Georgia Mountains, Athens, Augusta, Macon, Savannah, Columbus, Albany, etc. Admin panel at `/admin/contractors` provides contractor invitation and service region management.

Contractor onboarding follows an invitation-based workflow (mirroring lenders): admin sends email invitation with company name → contractor receives link → completes profile (name, phone, password, company details, specialties, insurance/bonding) → selects service regions from state-based grid → profile is activated. Key endpoints: `POST /api/contractors/invite` (admin), `GET /api/contractors/validate-invite/:token`, `POST /api/contractors/accept-invite/:token`. Contractor signup page at `/contractor-signup/:token`. Admin panel shows invite status badges (Pending/Complete).

## External Dependencies
- **Database Service**: Neon Serverless PostgreSQL
- **UI Component Libraries**: Radix UI, shadcn/ui, Lucide React
- **Frontend Libraries**: React Query, Wouter, React Hook Form, Zod, date-fns, Tailwind CSS, class-variance-authority, Stripe (for billing and subscription management)
- **Email Service**: Zoho Mail SMTP
- **Property Data APIs**: RentCast API (primary for property details, tax info, estimated values, and rent), HasData API (for property images from Zillow/Redfin)