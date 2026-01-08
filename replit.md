# RE Data Metrix

## Overview
RE Data Metrix is a real estate investment analytics and financing platform connecting investors with lenders. It offers advanced profitability analysis, diverse financing options, and streamlined lender engagement, aiming to simplify real estate investment and financing through comprehensive deal analysis and an efficient lending application workflow.

## User Preferences
Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)
Calculation verification: Use `shared/data/calculationReference.ts` as the source of truth when verifying calculations are working correctly

## System Architecture
The platform features a React/TypeScript frontend with `shadcn/ui`, Radix UI, Tailwind CSS, Wouter for routing, React Query for state, and react-hook-form with Zod for forms. The backend uses Node.js/Express.js with a RESTful API and Zod for server-side validation. PostgreSQL, accessed via Neon serverless driver and Drizzle ORM, handles data persistence, including tables for users, lenders, and loan products. A database seeding system ensures consistent baseline data post-deployment.

Authentication includes user/lender tables, session management (Express sessions with PostgreSQL store), email verification, and password resets. Middleware-based authorization protects routes for user, lender, and admin roles. A subscription-based access system, integrated with Stripe Billing, gates premium features like full deal analysis results, property API lookups, and rental analysis.

Key features include a 5-step Deal Analysis Wizard with Fix & Flip and Rental/DSCR tabs, supporting double close transactions and detailed loan comparison. The Fix & Flip tab includes summary metrics, editable variables, and an expandable loan comparison table with PDF generation capabilities. The Rental/DSCR tab provides property overview, DSCR calculation, and lender comparison. An Investor Inquiries system facilitates direct contact between investors and lenders. An Admin portal provides a reference for platform calculations and affiliate management. All loan calculation logic is centralized in `shared/calculations/loan-calculations.ts` for consistency.

## Data Protection & Recovery

### Production Database Protection
The production database is protected by Replit's **point-in-time restore** feature:

- **Automatic protection** - Replit maintains restore points for your production database
- **Any-moment recovery** - You can restore to any specific point in time (not just scheduled backups)
- **7-day soft delete** - Deleted databases can be recovered within 7 days

### How to Restore Production Data
1. Open the **Database pane** in your Replit workspace
2. Select your **Production database**
3. Go to the **Settings** tab
4. Use the **point-in-time restore** feature to select when to restore to
5. Note: This restores only the database, not the application code (use checkpoints for code)

### Development vs Production
- **Development database** - Used for testing changes, not backed up
- **Production database** - Your live user data, protected by point-in-time restore
- **Code deployments** - Only affect code; database data is preserved unless structure changes
- **Seed data** - Only used for initial population of empty databases; production data is your source of truth

## Critical Feature Dependencies

### Admin Access to Lender Portal
Admin users can access the Lender Portal to preview what lenders see. This feature requires:
- **Backend**: `/api/lenders/me` endpoint uses `ensureLenderOrAdmin` middleware (in `server/auth.ts`)
- **Backend**: Returns synthetic lender profile with `isAdminPreview: true` for admin users
- **Frontend**: `LenderAuthContext` exposes `isAdminPreview` flag from the lender data
- **Frontend**: Lender pages (LenderDashboard, LenderCompanyInfo) call `refetchLender()` on mount to get fresh data
- **Frontend**: Admin preview banner displays when `isAdminPreview` is true

**DO NOT BREAK**: If changing lender authentication or the `/api/lenders/me` endpoint, ensure admin access is preserved.

### Demo Mode Lender Anonymization
Demo mode anonymizes real lender data in Step 5 Results:
- **Backend**: `demo_mode` setting controls anonymization
- **Frontend**: `getDisplayLenders()` and `getDisplayDscrLenders()` helper functions in Step5Results.tsx
- Used for: Step 5 loan comparison tables, CSV export, PDF export, DSCR section

**DO NOT BREAK**: Changes to lender display logic must maintain demo mode anonymization.

### Developer Role Access Control
Developer users are external CRM integrators with limited admin access:
- **Backend Middleware**: `ensureAdminOrDeveloper` in `server/auth.ts` for routes developers can access
- **Allowed Access**: 
  - Integrations page (view API status)
  - Developer Integration Portal (CRM connections, webhooks, mappings)
  - Partner Tools (full CRUD)
  - Lender Management (view only - no invite creation)
  - Calculations Reference (view)
  - Training Videos (view)
  - Data Health endpoint (view)
- **Restricted Access**: 
  - User Management
  - Reports
  - Discount Codes
  - Comp Users
  - Database seed/reset
  - Lender Invite creation
  - Stripe/billing settings
- **Frontend**: Navigation shows "Developer Dashboard" label; Dashboard hides restricted cards
- **Badge Display**: Indigo colored badge with "DV" initials
- **Creation**: Admins can create developer accounts via User Management > "Create Developer" button

**DO NOT BREAK**: Routes using `ensureAdmin` should remain restricted. Routes using `ensureAdminOrDeveloper` allow developer access.

### Developer Integration Portal
The Developer Integration Portal (`/admin/developer-integrations`) allows external CRM integrators to connect their systems:
- **Database Tables**: 
  - `integration_configs`: CRM connection credentials (Zoho, HubSpot, Salesforce)
  - `integration_event_triggers`: Which events sync data (user_signup, payment_success, etc.)
  - `integration_field_mappings`: Map platform fields to CRM fields with transform options
  - `integration_webhooks`: Inbound webhook endpoints with Bearer token authentication
  - `integration_sync_logs`: History of sync operations
- **Security**: Credentials are NEVER exposed in API responses (only `{ configured: true }` flag)
- **Event Types**: user_signup, lender_signup, payment_success, payment_failed, subscription_created, subscription_cancelled, deal_analysis_created, inquiry_submitted
- **Inbound Webhooks**: External systems can POST to `/api/webhooks/inbound/:endpoint` with Bearer token auth
- **Access**: Protected by `ensureAdminOrDeveloper` middleware

**DO NOT BREAK**: API responses must never include raw credentials or secrets.

### Demo Access Link System
Demo access links allow potential customers to preview platform features with anonymized data:
- **Database Table**: `demo_tokens` stores token, contact info, status, expiration, and usage tracking
- **Admin UI**: `/admin/demo-links` for generating and managing demo links
- **Public Entry**: `/demo/:token` validates token and sets HttpOnly session cookie
- **Session API**: `/api/demo/session` checks if user has active demo session (server-side cookie validation)
- **Frontend Hook**: `useDemoAccess()` in `client/src/hooks/use-demo-access.ts` queries session status
- **Access Behavior**: 
  - Demo users see full Step 5 Results with anonymized lenders
  - Partner Tools show placeholder affiliate names
  - Banner displays indicating demo mode with signup CTA
- **Security**: Demo token cookie is HttpOnly, Secure, SameSite=Lax; validated server-side each request

**DO NOT BREAK**: Demo session check uses `/api/demo/session` endpoint, not client-side cookie reading.

### Mobile-Specific Pages
Dedicated mobile pages provide touch-optimized experiences separate from responsive desktop layouts:
- **Routes**: `/m/deal-analysis`, `/m/lenders`, `/m/toolbox`
- **Context**: `DeviceModeContext` in `client/src/contexts/DeviceModeContext.tsx` with auto-detect (768px breakpoint) and manual override
- **Layout Pattern**: All mobile pages follow the same structure:
  1. Sticky header with back button, title, and desktop version toggle
  2. Compact hero with icon, title, and subtitle
  3. Horizontal scrollable training video gallery (from `/api/training-videos`)
  4. Primary CTA button directly below videos
  5. Touch-optimized card-based content
- **Components**: `client/src/pages/mobile/MobileDealAnalysis.tsx`, `MobileLenders.tsx`, `MobileToolbox.tsx`
- **Shared Contexts**: Mobile pages reuse existing `WizardDataContext`, `AuthContext`, `useDemoAccess()` hook
- **Accessibility**: Quick steps use semantic `ul/li` with `aria-labelledby`, decorative icons have `aria-hidden="true"`

**DO NOT BREAK**: Mobile pages are separate routes, not responsive adaptations. Each mobile page links to its desktop counterpart via the monitor icon in the header.

### Wholesale Max Offer Calculator
Calculates maximum offer price for wholesale deals with support for Assignment and Double Close transactions:
- **Route**: `/deal-analysis/wholesale-calculator`
- **Access**: Button on Step 3 of Deal Analysis wizard ("Calculate Wholesale Max Offer Price")
- **Calculation Module**: `shared/calculations/wholesale-calculations.ts` - centralized calculation logic
- **Transaction Types**:
  - **Assignment**: Simple formula: ARV × Buyer's Max % - Rehab Budget - Wholesale Fee = Max Offer
  - **Double Close**: Same minus closing costs, with optional transactional lender fees
- **Data Pre-population**: ARV and Rehab Budget auto-populate from wizard context when navigating from Step 3
- **Transactional Lenders**:
  - Loan type: `transactional-funding` in `loanTypeEnum`
  - Database: `transactional_flat_fee` column in `loan_products` table
  - API: `GET /api/loan-products/transactional-funding` returns top 2 active lenders
  - Referral fee: 0.5 points added to all lender rates (constant `REFERRAL_POINTS_PERCENT`)
- **PDF Export**: Uses `react-to-pdf` with QR codes for lender referral links

**DO NOT BREAK**: Calculation logic must remain centralized in `wholesale-calculations.ts`. UI components only call functions and display results.

## External Dependencies
- **Database Service**: Neon Serverless PostgreSQL
- **UI Component Libraries**: Radix UI, shadcn/ui, Lucide React
- **Frontend Libraries**: React Query, Wouter, React Hook Form, Zod, date-fns, Tailwind CSS, class-variance-authority, Stripe (for billing and subscription management)
- **Email Service**: Zoho Mail SMTP
- **Property Data APIs**:
    - RentCast API (Primary for property details, tax info, estimated values, and rent)
    - HasData API (for property images from Zillow/Redfin, integrated into RentCastAPIService)