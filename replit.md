# RE Data Metrix

## Overview
RE Data Metrix is a real estate investment analytics and financing platform connecting investors with lenders. It offers advanced profitability analysis, compares diverse financing options, and streamlines direct lender engagement. The platform aims to simplify real estate investment and financing by providing sophisticated deal analysis tools and a smooth lending application workflow. Its core capabilities include comprehensive deal analysis, multi-option financing comparisons, and a direct conduit to lenders. The business vision is to become a leading platform for real estate investment and financing, offering significant market potential by streamlining a complex process for both investors and lenders.

## User Preferences
Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)

## System Architecture

### Frontend
The frontend is built with React and TypeScript, using Vite, `shadcn/ui` (New York style), Radix UI, and Tailwind CSS. Wouter handles client-side routing. React Query manages state and data fetching, while forms utilize react-hook-form and Zod validation. Key features include marketing pages, authentication, a lender portal, and a 5-step Deal Analysis Wizard.

### Backend
The backend is developed with Node.js and Express.js, providing a RESTful API. It features an abstracted storage interface with an in-memory implementation for CRUD operations. PostgreSQL is used for session management and data persistence. All API endpoints use Zod schemas for server-side validation.

### Database
PostgreSQL is the chosen database, accessed via the Neon serverless driver. Drizzle ORM ensures type-safe operations and manages the schema, which includes tables for `users`, `prelaunch_signups`, `lenders`, `lender_questionnaires`, `loan_products`, and `lender_referrals`. Drizzle Kit handles schema migrations.

### Authentication & Authorization
The platform includes a complete authentication system with user and lender tables, session management, and email verification via Zoho Mail SMTP. It supports password reset functionality and uses Express sessions with a PostgreSQL store. Middleware-based authorization protects routes for user, lender, and admin access. Separate portals exist for Admin, Lender, and Members, each with specific functionalities (e.g., lender management, loan product management, deal analysis, and referral programs). The Admin Portal includes comprehensive user management with subscription control, user deletion/archiving, and terms acceptance tracking.

### Legal Documents & Terms Acceptance
The platform includes legal pages for `/terms` (User Agreement) and `/privacy` (Privacy Policy), both effective December 4, 2025. User acceptance of these terms is tracked in the database (`termsAcceptedAt`, `termsVersion`, `privacyVersion`) during registration and displayed in the user profile and Admin Portal.

### Membership Access Control
A subscription-based access system restricts premium features. Registration requires either a paid subscription or a valid comp code, with no free accounts. Pricing tiers include monthly and annual options, with discount code support. The platform integrates a checkout flow, and subscription management is available in the user's profile.

### CSV Loan Product Templates
The Lender Portal provides two CSV templates for bulk loan product imports: "Fix & Flip" for bridge loans and "DSCR / New Construction" for rental and construction loans, each with specific fields and numeric loan type codes.

### Total LTC Cap Feature
Bridge loan products support a Total LTC (Loan-to-Cost) Cap that limits the total loan amount based on a percentage of total project cost (purchase price + rehab budget):

**Database Schema:**
- `isLtcWeighted` (boolean): Indicates if the product has an LTC cap enabled
- `maxLtcPercent` (decimal, max 100): The maximum percentage of total project cost the lender will fund

**Calculation Logic:**
- When LTC cap is active, the system calculates three potential loan limits: standard (based on buy LTV + rehab), ARV cap, and LTC cap
- The lowest of the three caps determines the final loan amount
- When LTC is the limiting factor, rehab stays at 100% of advertised percentage, and the buy amount is reduced first
- The effective buy percentage is recalculated based on remaining loan capacity after rehab

**UI Indicators:**
- Lender Portal: Toggle and percentage input for bridge loan products only
- Deal Analysis Results: Shows "LTC Cap" badge and effective buy percentage when LTC adjustment is applied
- CSV Import: Bridge template includes `is_ltc_weighted` (0/1) and `max_ltc_percent` columns

### Form Handling & Validation
Client-side validation uses react-hook-form and Zod, complemented by comprehensive server-side Zod schema validation for all API endpoints.

### Build & Deployment
Vite is used for frontend development and production builds, while esbuild handles the Express server build. Path aliases support a monorepo structure.

### Feature Specifications
The platform includes loan type education, intelligent lender filtering with deep linking, consolidated rental analysis, and integrates Zillow RentZestimate. It provides detailed deal analysis and loan comparison services. Educational content, UX improvements for data persistence and navigation, and comprehensive loan calculations are core components. The Toolbox & Resources section offers curated affiliate programs and a searchable glossary. The Rental Analysis flow includes intelligent DSCR lender matching, filtering DSCR products by state and calculating DSCR and loan amounts per product.

### Deal Analysis - Unified Analysis Toggle
The Deal Analysis results page (Step 5) now features a tabbed interface that allows users to toggle between two analysis modes without navigating away:
- **Fix & Flip Tab**: The original loan comparison table with editable variables (Buy Price, Rehab, Project Length) for fix-and-flip investment analysis
- **Rental / DSCR Tab**: In-place DSCR (Debt Service Coverage Ratio) analysis featuring:
  - Property overview with address, ARV, bedrooms, and bathrooms
  - Monthly rent input (pre-populated with Zillow RentZestimate if available)
  - Real-time DSCR calculation with status indicators (good/caution/poor)
  - PITIA (Principal, Interest, Taxes, Insurance, Association) breakdown
  - DSCR lender comparison showing qualifying lenders based on the property's state and calculated DSCR
The toggle uses Shadcn Tabs component with data-testid attributes for testing.

### Lender Email Alerts & Investor Inquiries
The platform now includes comprehensive lender notification and investor engagement features:

**Email Notifications:**
- **Loan Product Changes**: Lenders receive email notifications when their loan products are created or updated via the Lender Portal
- **Contact Lender Alerts**: When investors click "Contact Lender" on deal analysis results, lenders receive detailed emails including:
  - Investor contact information (name, email, phone)
  - Property address and details
  - Deal metrics (ARV, Estimated Profit, ROI, Project Costs)
  - Selected loan product information
  - Investor's optional message

**Investor Inquiries System:**
- **Database Storage**: Contact requests stored in `lender_inquiries` table with deal snapshots, timestamps, and status
- **Lender Portal Page** (`/lender-inquiries`): Searchable list of all investor inquiries with:
  - Search by property address
  - Filter by date range (7 days, 30 days, all time)
  - Expandable cards showing full deal details
  - Investor contact information

**Lender Dashboard Updates:**
- New "Investor Inquiries" card with quick access to inquiries page
- Live Quick Stats showing Active Loan Products, Investor Inquiries count, and Saved By Investors count
- Loading states for authenticated API calls

**Contact Lender Flow** (Step 5 Results):
- "Contact Lender" button on Fix & Flip loan comparison table rows
- "Contact Lender" button on DSCR lender comparison cards
- Dialog for optional investor message before sending
- Full deal data automatically included in inquiry

### Calculations Reference (Admin)
Admin portal page for reviewing all platform calculations and formulas:

**Page Location:** `/admin/calculations`

**Features:**
- 21 calculations organized into 8 categories: Loan Sizing, Interest Costs, Carrying Costs, Investment Costs, Exit/Sale, Profit & ROI, DSCR/Rental, Cash Sale
- Each calculation shows: description, formula with display syntax, inputs with sources, output format, and worked example
- Sidebar category navigation with anchors
- Search functionality across names, descriptions, and formulas
- Expand/collapse all functionality
- Stored in shared metadata file (`shared/data/calculationReference.ts`) to prevent documentation drift

**Categories:**
1. Loan Sizing (5 calculations): Buy Loan, Rehab Loan, ARV Cap, LTC Cap, Total Loan Amount
2. Interest Costs (2 calculations): Buy Loan Interest, Draw Interest
3. Carrying Costs (3 calculations): Taxes, Insurance, Monthly P&I
4. Investment Costs (4 calculations): Closing Costs, Investment Costs, Total Out-of-Pocket, Cash Required At Close
5. Exit/Sale (1 calculation): Net Proceeds
6. Profit & ROI (2 calculations): Estimated Profit, Cash-on-Cash ROI
7. DSCR/Rental (3 calculations): Monthly PITIA, DSCR Ratio, Max Loan Amount
8. Cash Sale (1 calculation): Cash Purchase Profit

### Affiliate Management (Admin)
Complete admin portal for managing affiliate partner programs displayed in the Toolbox:

**Database Tables:**
- `affiliates`: id, name, description, benefits (text[]), referral_link, categories (text[]), icon_name, referral_fee, referral_fee_type, is_active, sort_order, created_at, updated_at
- `affiliate_categories`: id, name, description, sort_order

**Admin Portal Page** (`/admin/affiliates`):
- Tabbed interface for Affiliates and Categories management
- Affiliates table with Name, Categories, Referral Fee, Status, Actions columns
- Search by name/description, filter by status (All/Active/Inactive)
- Add/Edit affiliate dialog with all form fields including multi-select categories and icon dropdown
- Category management section with add/edit/delete functionality
- Delete confirmation dialogs

**API Routes:**
- `GET /api/affiliates`: List active affiliates (public, for Toolbox page)
- `GET /api/admin/affiliates`: List all affiliates (admin only)
- `POST /api/admin/affiliates`: Create affiliate with Zod validation (admin only)
- `PUT /api/admin/affiliates/:id`: Update affiliate with Zod validation (admin only)
- `DELETE /api/admin/affiliates/:id`: Delete affiliate (admin only)
- `GET /api/admin/affiliate-categories`: List categories (admin only)
- `POST /api/admin/affiliate-categories`: Upsert category with Zod validation (admin only)
- `DELETE /api/admin/affiliate-categories/:id`: Delete category (admin only)

**Pre-seeded Data:**
- 5 categories: marketplace, property-management, project-management, lead-generation, comps
- 16 affiliate programs migrated from static data (Connected Investors, Padsplit, Bigger Pockets, etc.)

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

### Development Tools
- TypeScript
- Vite
- esbuild
- PostCSS

## Backlog

### Zoho CRM Integration (Pending CRM Setup)
Connect platform forms to Zoho CRM for lead and contact management:

**Forms to Integrate:**
1. Contact form submissions → Create Lead (Prospect)
2. Prelaunch discount signups → Create Lead (Prospect)  
3. User registrations → Create Contact (Contact Type: Subscriber-Monthly or Subscriber-Annual)
4. Lender applications → Create Contact (Contact Type: Lender) with company info and questionnaire fields

**CRM Setup Required Before Integration:**
- Custom "Contact Type" picklist field (values: Lender, Subscriber-Monthly, Subscriber-Annual)
- Custom fields for Lender company info and questionnaire responses
- Lead Source field configured for tracking (Contact Form, Prelaunch, etc.)

**API Credentials Needed:**
- Zoho API Console: api-console.zoho.com
- Create Self Client for server-to-server integration
- Scopes required: ZohoCRM.modules.ALL, ZohoCRM.settings.ALL
- Will need: Client ID, Client Secret, Refresh Token

### Shareable Deals (Low Priority)
Allow subscribers to share deal analyses with other subscribers.

**Approach:** Independent copies (non-collaborative)
- Share via unique link or direct user invite
- Recipients see read-only snapshot of the deal
- Optional "Save a Copy" to clone deal into their own portal
- Each user's copy operates independently (no real-time sync)

**Implementation Requirements:**
- New database tables: `shared_deals` (shareCode, expiry, permissions) and `shared_deal_access` (audit log)
- Backend routes: create share, view shared deal, copy to my deals, revoke share
- Frontend: Share button on deal cards, share dialog, public shared deal view page
- Security: Only active subscribers can create/view shares; validate shareCode; enforce expiry

**Why Independent Copies:**
- Simpler than real-time collaboration
- Matches typical RE workflow where each investor runs their own numbers
- No merge conflicts or complex permissions