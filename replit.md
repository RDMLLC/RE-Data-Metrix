# RE Data Metrix

## Overview

RE Data Metrix is a real estate investment analytics and financing platform connecting investors with lenders. Its primary purpose is to provide advanced profitability analysis, compare diverse financing options, and facilitate direct lender engagement through a streamlined application process. The platform offers sophisticated deal analysis tools and simplifies the lending application workflow, aiming to streamline real estate investment and financing.

## User Preferences

Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)

### Navigation Requirements (DO NOT CHANGE)
**CRITICAL**: The main navigation bar must remain simple with NO dropdown menus for login/user accounts.
- "Login" appears as a regular navigation link in the nav bar (same as Contact, Toolbox, etc.)
- Clicking "Login" takes users directly to the /login page
- NO dropdown menus showing username, email, or user account options
- NO "My Portal" or "Logout" options in the navigation bar
- Keep navigation clean and simple with all links at the same level

## System Architecture

### Frontend

The frontend is built with React and TypeScript, utilizing Vite for bundling. It employs `shadcn/ui` (New York style) with Radix UI primitives and Tailwind CSS for a professional design. Wouter manages client-side routing. State management and data fetching are handled by React Query, while forms are managed with react-hook-form and Zod validation. Key features include marketing pages, authentication, a lender portal, and a Deal Analysis Wizard for comprehensive property analysis (purchase, renovation, holding, exit, loan criteria) with real-time client-side calculations. UI/UX design emphasizes a clean, professional aesthetic.

### Backend

The backend is developed with Node.js and Express.js, providing a RESTful API. It includes an abstracted storage interface with an in-memory implementation for CRUD operations on lender questionnaires and loan products. The system is designed for PostgreSQL for session management and data persistence. Server-side validation uses Zod schemas for all API endpoints.

### Database

PostgreSQL is the chosen database, accessed via the Neon serverless driver. Drizzle ORM ensures type-safe operations and manages the schema, which includes tables for `users` (with email verification fields), `prelaunch_signups`, `lenders` (with archived boolean field), `lender_questionnaires`, `loan_products`, and `lender_referrals` for tracking investor referrals to lenders. Drizzle Kit handles schema migrations.

### Email Integration (Zoho Mail)

Transactional email system using Zoho Mail SMTP (smtppro.zoho.com:587):
- **Email Verification**: Sent automatically on registration with 24-hour token expiry
- **Welcome Email**: Sent after successful email verification
- **Password Reset**: Secure token-based reset flow with 1-hour expiry
- **Contact Form Confirmation**: Instant auto-reply to contact form submissions
- **CRM Integration** (Future): Marketing/relationship emails handled by CRM
- **Security**: All credentials stored as encrypted Replit secrets

### Authentication & Authorization

Complete authentication infrastructure implemented with user and lender tables, session management, and email verification:
- **Email Verification**: Required for all new user registrations via Zoho Mail SMTP
- **Password Reset**: Secure token-based password recovery workflow
- **Session Management**: Express sessions with PostgreSQL store
- **Protected Routes**: Middleware-based authorization for user, lender, and admin access
- **Login Page**: Features three entry points - main user login (center), Lender Portal (left panel), and Admin Portal (card below main login) with navy/gold design scheme
- **Admin Portal**: Comprehensive dashboard at /admin/dashboard with Lender Management at /admin/lenders featuring:
  - List all lenders with referral counts and status (Active/Pending/Archived)
  - Delete lenders with zero referrals (transaction-wrapped cascade delete of loan products and questionnaires)
  - Archive lenders with referrals (permanent preservation, cannot be deleted)
  - Business rule enforcement: archived lenders cannot be deleted, only zero-referral lenders can be permanently removed
  - All admin endpoints secured with ensureAdmin middleware checking user.role === 'admin'
  - **Referral Fields**: Admin sets referralType and referralAmount during lender invite; these fields are visible to lenders (read-only in Company Info) but NOT visible to investors
  - **Lender Detail Page**: Clickable lender cards navigate to /admin/lenders/:id showing complete profile with company info, referral configuration, questionnaire responses, all loan products, and referral history
- **Lender Portal**: Comprehensive loan product management at /lender-dashboard featuring:
  - Add, edit, and delete individual loan products with full form validation
  - CSV bulk import/export for batch product management
  - Edit mode allows updating existing products with form pre-population

### Membership Access Control

Subscription-based access system restricts premium features to paying members:
- **Subscriber Status**: `isSubscriber` in AuthContext checks if user has subscriptionStatus of 'active', 'referral_trial', or 'comped'
- **Paywall Component**: `MembershipPaywall` displays lock icon, benefits list, and login/register CTAs
- **Protected Features** (require subscription):
  - Deal Analysis wizard steps 5 (Loan Criteria) and 6 (Results)
  - Loan Types education page
  - Rental Analysis wizard
  - Toolbox/Resources affiliate program tabs (About and Glossary remain free)
- **Loading State Handling**: All protected pages show loading spinner while auth state resolves to prevent flash-of-paywall for legitimate subscribers

### Form Handling & Validation

Client-side validation is performed using react-hook-form and Zod. All API endpoints include comprehensive server-side Zod schema validation. The system supports various forms, including prelaunch signups, contact forms, detailed lender questionnaires, and loan product entry forms.

### Build & Deployment

Vite is used for development and client-side production builds, while esbuild handles the Express server build. Path aliases support a monorepo structure comprising `/client`, `/server`, `/shared`, and `/attached_assets`.

### Feature Specifications

The platform includes comprehensive loan type education, intelligent lender filtering with deep linking, and a consolidated rental analysis experience. It integrates Zillow RentZestimate for automatic rent estimations and provides detailed deal analysis and loan comparison services. Educational content is a core component, accessible through dedicated pages and within the deal analysis workflow. UX improvements focus on data persistence, clear navigation, and user-friendly input methods (e.g., manual address entry, HOA fields). Loan calculations are robust, providing complete cash sale and loan comparison metrics.

The Toolbox & Resources section provides investors with curated affiliate programs and a comprehensive investment glossary. Features include tabbed navigation with 5 affiliate categories (Marketplace & Community, Property Management, Project Management, Lead Generation, Comps & Data), 8 vetted partner programs with detailed descriptions and benefits, and a searchable glossary of 44 essential real estate investment terms organized into 7 collapsible categories.

## External Dependencies

### Database Service
- **Neon Serverless PostgreSQL**

### UI Component Libraries
- **Radix UI**
- **shadcn/ui**
- **Lucide React**

### Frontend Libraries
- **React Query**
- **Wouter**
- **React Hook Form**
- **Zod**
- **date-fns**
- **Tailwind CSS**
- **class-variance-authority**

### Development Tools
- **TypeScript**
- **Vite**
- **esbuild**
- **PostCSS**

## Future Tasks & Backlog

This section tracks features, improvements, and fixes to be implemented in future sessions. Tasks are organized by priority.

### High Priority
- **Page Scroll Position**: Ensure all page loads show the top of the page so users don't have to scroll up to see content
  - **Context**: Currently some page navigations land partway down the page
  - **Impact**: Better UX, eliminates confusion when navigating between pages
  - **Scope**: Review all route changes and page loads, add scroll restoration logic

- **Password Visibility Toggle**: Add show/hide password option to all password input fields
  - **Context**: Password reset forms and all password fields currently don't allow users to verify what they've typed
  - **Impact**: Better UX, reduces password entry errors, improves accessibility
  - **Scope**: Add eye icon toggle to password reset forms (user & lender), login forms, registration forms, and any future password inputs

- **Configure SPF/DKIM Records for Email Deliverability**: Set up domain authentication to prevent Gmail from blocking/spam-filtering emails
  - **Context**: Emails are being sent successfully to Zoho SMTP and appear in Sent folder, but Gmail blocks or spam-filters them due to missing SPF/DKIM records on redatametrix.com domain
  - **Impact**: Critical for production - users cannot receive password resets, lender invites, or other transactional emails reliably
  - **Scope**: Add SPF, DKIM, and DMARC DNS records to redatametrix.com domain registrar (external task - requires domain DNS access, not code changes)
  - **Resources**: Zoho Mail provides specific DNS records to add - https://www.zoho.com/mail/help/adminconsole/spf-configuration.html

### Medium Priority
- **Lender Logout Button**: Add a logout button for lenders in the Lender Portal
  - **Context**: Lenders currently don't have an obvious way to log out of their portal session
  - **Impact**: Better security and user control, allows lenders to properly end their session
  - **Scope**: Add logout button to lender portal navigation/header, implement logout endpoint if needed

### Low Priority
- **Add District of Columbia to States List**: Include DC as an option in state selection dropdowns
  - **Context**: Currently only includes 50 states, missing District of Columbia
  - **Impact**: Better data accuracy for DC-based properties and users
  - **Scope**: Update state lists in property address forms, user registration, and lender location fields

### Notes
- Tasks added here persist across sessions
- At the start of each build session, agent will review backlog and ask which tasks to tackle
- New ideas can be added anytime without immediate implementation pressure