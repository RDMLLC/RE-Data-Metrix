# RE Data Metrix

## Overview
RE Data Metrix is a real estate investment analytics and financing platform designed to connect investors with lenders. It provides advanced profitability analysis, compares diverse financing options, and facilitates direct lender engagement through a streamlined application process. The platform aims to simplify real estate investment and financing by offering sophisticated deal analysis tools and a smooth lending application workflow. Its core capabilities include comprehensive deal analysis, multi-option financing comparisons, and a direct conduit to lenders. The business vision is to become a leading platform for real estate investment and financing, offering significant market potential by streamlining a complex process for both investors and lenders.

## User Preferences
Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)

## System Architecture

### Frontend
The frontend is built with React and TypeScript, using Vite for bundling. It leverages `shadcn/ui` (New York style) with Radix UI and Tailwind CSS for a professional design. Wouter manages client-side routing. State management and data fetching are handled by React Query, while forms utilize react-hook-form and Zod validation. Key features include marketing pages, authentication, a lender portal, and a 5-step Deal Analysis Wizard.

### Backend
The backend is developed with Node.js and Express.js, providing a RESTful API. It features an abstracted storage interface with an in-memory implementation for CRUD operations. PostgreSQL is used for session management and data persistence. All API endpoints use Zod schemas for server-side validation.

### Database
PostgreSQL is the chosen database, accessed via the Neon serverless driver. Drizzle ORM ensures type-safe operations and manages the schema, which includes tables for `users`, `prelaunch_signups`, `lenders`, `lender_questionnaires`, `loan_products`, and `lender_referrals`. Drizzle Kit handles schema migrations.

### Authentication & Authorization
The platform includes a complete authentication system with user and lender tables, session management, and email verification via Zoho Mail SMTP. It supports password reset functionality and uses Express sessions with a PostgreSQL store. Middleware-based authorization protects routes for user, lender, and admin access. The login page provides distinct entry points for main users, lenders, and administrators. An Admin Portal offers comprehensive lender management, including listing, archiving, and deleting lenders, along with managing referral configurations. A Lender Portal allows for comprehensive loan product management, including adding, editing, deleting, and bulk importing loan products, categorized into Bridge/Hard Money, DSCR Purchase, DSCR Refinance, and New Construction. A Member Portal provides a dashboard with access to deals analyzed, deal analysis initiation, saved lenders, lender search, tools, and a referral program.

### Admin User Management
The Admin Portal includes a comprehensive User Management system accessible at `/admin/users`:
- **User Directory**: Searchable/filterable table of all registered users with subscription management
- **Stats Overview**: Real-time metrics showing total users, active subscriptions, comped users, referral trials, recent signups, and unverified accounts
- **Tab Views**: User Directory, Top Active (ranked by deals+lenders activity), Referral Leaders, Recent Signups, Unverified Users, Archived Users
- **Subscription Control**: Admins can update user subscription status (active, inactive, comped, referral_trial, archived)
- **User Deletion**: 
  - Delete button visible only for users with 0 referral activity and non-admin role
  - Referral activity check includes: direct user referrals, lender referrals, and affiliate clicks
  - Confirmation dialog warns about permanent data deletion
  - Cascading delete removes all related records (profile, deals, saved lenders, etc.)
- **Archived Users**: Users with referrals cannot be deleted but can be archived
  - Archived users hidden from main directory unless explicitly filtered
  - Dedicated "Archived Users" tab shows archived users with activity stats
  - Archived users can be restored to Active/Inactive status
- **Email Verification**: Ability to resend verification emails for unverified users
- **API Endpoints**:
  - `GET /api/admin/users` - Returns sanitized user list with activity stats
  - `GET /api/admin/users/stats` - Returns aggregate user statistics
  - `PATCH /api/admin/users/:id/subscription` - Update subscription status (including 'archived')
  - `POST /api/admin/users/:id/resend-verification` - Resend verification email
  - `DELETE /api/admin/users/:id` - Permanently delete user (only if no referral activity)
- **Security**: All endpoints are protected by `ensureAdmin` middleware and use `sanitizeUserForAdmin` helper to prevent exposure of sensitive fields (password hashes, verification tokens, etc.)

### Membership Access Control
A subscription-based access system restricts premium features to paying members. A `MembershipPaywall` component displays a lock icon and benefits for protected features like the Deal Analysis wizard's results, loan types education, rental analysis, and certain Toolbox/Resources tabs.

### Subscription-Only Registration
The platform requires either a paid subscription or a valid comp code to create an account. There are no free accounts.

**Pricing Tiers**:
- Monthly: $15/month
- Annual: $150/year (saves $30 compared to monthly)
- Discount codes can further reduce these prices

**Registration Flow** (`/register`):
- Two-path choice screen: "Subscribe" or "Enter Comp Code"
- Subscribe path leads to `/checkout` for inline registration + payment
- Comp Code path validates the code first, then shows registration form
- Valid comp codes create accounts with 'comped' subscription status
- Checkout registrations create accounts with 'inactive' status (pending payment)

**Pricing Page** (`/pricing`):
- Monthly/Annual toggle with savings badge
- Side-by-side comparison cards
- Discount code section directing to checkout
- CTAs adapt to auth state: "Get Started" → "Upgrade Now" → "Go to Dashboard"
- Comp code link at bottom for users with invitation codes

**Checkout Page** (`/checkout`):
- Plan selection (monthly/annual) with inline switching
- Discount code input with real-time validation
- Unauthenticated users see inline registration form + order summary
- Order summary updates dynamically based on plan and discounts
- After registration, proceeds to payment (placeholder for Zoho integration)
- Shows "Already a Member" state for existing subscribers
- Security badges (PCI-DSS, SSL encryption)

**Discount Code Validation** (Placeholder):
- Endpoint: `POST /api/subscription/validate-discount`
- Example test codes: SAVE10, SAVE20, FIRST5, WELCOME, ANNUAL25
- Some codes are plan-specific (e.g., ANNUAL25 only for annual plans)
- In production, will validate against Zoho Billing's coupon system

**Profile Subscription Management** (`/portal/profile`):
- Subscription status card with appropriate badge (Active/Comped/Trial/Free)
- For active subscribers: Plan details, Manage Billing button, Cancel option
- For free users: Upgrade CTA with feature highlights
- Cancel subscription confirmation dialog

**Backend API Endpoints** (Placeholder for Zoho integration):
- `POST /api/subscription/checkout` - Initiates checkout (returns integrationPending until Zoho connected)
- `POST /api/subscription/cancel` - Cancels active subscription
- `POST /api/subscription/manage-billing` - Opens billing portal
- `POST /api/subscription/webhook` - Webhook endpoint for Zoho events
- `GET /api/subscription/status` - Returns current subscription status

**Integration Points for Zoho Billing**:
When Zoho is configured, the checkout endpoint will:
1. Create/retrieve customer in Zoho Billing
2. Generate hosted payment page session
3. Return redirect URL to Zoho's payment page
4. Handle webhooks for subscription status updates

### CSV Loan Product Templates
The Lender Portal provides two separate CSV templates for bulk loan product imports with simplified numeric loan type codes:
- **Fix & Flip Template** (`/api/loan-products/template/bridge`): 19 fields optimized for bridge loans, including rehab %, draw costs, ARV %, interest deferred, time to close. Uses loan type code: 1 = Bridge.
- **DSCR / New Construction Template** (`/api/loan-products/template/dscr`): 16 fields for rental and construction loans, including loan term years, min DSCR required, cash-out options. Uses loan type codes: 1 = DSCR Purchase, 2 = DSCR Refi, 3 = New Construction.

Both templates include an instruction row (starting with #) explaining the loan type codes. The CSV parser automatically skips these comment lines during import.

### Form Handling & Validation
Client-side validation is performed using react-hook-form and Zod, complemented by comprehensive server-side Zod schema validation for all API endpoints.

### Build & Deployment
Vite is used for frontend development and production builds, while esbuild handles the Express server build. Path aliases support a monorepo structure.

### Feature Specifications
The platform includes loan type education, intelligent lender filtering with deep linking, and a consolidated rental analysis experience. It integrates Zillow RentZestimate for automatic rent estimations and provides detailed deal analysis and loan comparison services. Educational content is a core component. UX improvements focus on data persistence, clear navigation, and user-friendly input methods. Loan calculations provide complete cash sale and loan comparison metrics. The Toolbox & Resources section offers curated affiliate programs and a searchable glossary of real estate investment terms.

### DSCR Lender Matching (Rental Analysis)
The Rental Analysis flow includes intelligent DSCR lender matching using actual loan products:
- **Endpoint**: `/api/dscr-lenders` filters DSCR products by state using lender_questionnaires.states_serviced
- **Calculation Logic**: 
  - DSCR Purchase: Loan amount = purchasePrice × LTV
  - DSCR Refi: Loan amount = ARV × LTV
  - DSCR = Monthly Rent ÷ Total PITIA (P&I + Taxes + Insurance + HOA)
- **Per-Product Display**: Each lender product shows calculated DSCR, loan amount, interest rate, term, LTV, points, and full PITIA breakdown
- **Sorting**: Products ranked by best DSCR (highest first)
- **Warnings**: Alert shown when calculated DSCR is below lender's minimum DSCR requirement
- **Quick Apply**: Single "Apply Now" button per product with referral link (QR codes reserved for future PDF export)
- **Data Normalization**: All numeric values normalized via Number() coercion before calculations and display

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

## Future Tasks & Backlog

This section tracks features, improvements, and fixes to be implemented in future sessions.

### Low Priority
- **Login Page Layout Reorganization**
  - Remove "Don't have an account? Sign up" link from under Member Portal form
  - Create new "New Account" signup box where Admin Panel currently sits (left side, same row as Lender Portal)
  - Move Admin Panel box below the Lender Portal section
  - **Impact**: Cleaner layout with prominent signup option for new users

- **Registration Flow Simplification (Option A)**
  - Skip /register page entirely - send new users directly to /checkout
  - The checkout page already handles plan selection, discount codes, and registration
  - Add small "Have a comp code instead?" link at bottom of checkout that expands comp code input
  - Comp codes could be entered in discount code field with special handling, or via expandable section
  - **Impact**: Eliminates extra step, streamlines user journey, de-emphasizes comp codes appropriately

### Medium Priority
- **BRRRR Analysis**: Full Buy-Rehab-Rent-Refinance-Repeat strategy modeling
  - **Context**: Investors often use bridge/hard money loans for acquisition and rehab, then refinance into a long-term DSCR loan once the property is stabilized and rented
  - **Impact**: Shows the complete financing picture including: Phase 1 (Bridge loan for purchase + rehab), Phase 2 (DSCR refi to pay off bridge loan), and potential cash-out if all-in cost is below refi LTV threshold
  - **Scope**: 
    - Connect Deal Analysis (bridge loan) with Rental Analysis (DSCR refi) in a unified view
    - Calculate "all-in" cost (purchase + rehab) vs. ARV
    - Show equity position at refi: cash back if all-in ≤ 70% and refi LTV is 75%, or additional cash needed to close
    - Display both loan phases with costs and timelines
  - **Dependencies**: Requires more populated lender database and lender input before implementation
  - **Future PDF Export**: Include QR codes for lender referral links in downloadable PDF version

### Notes
- Tasks added here persist across sessions
- New ideas can be added anytime without immediate implementation pressure