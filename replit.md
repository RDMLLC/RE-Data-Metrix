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

### Form Handling & Validation
Client-side validation uses react-hook-form and Zod, complemented by comprehensive server-side Zod schema validation for all API endpoints.

### Build & Deployment
Vite is used for frontend development and production builds, while esbuild handles the Express server build. Path aliases support a monorepo structure.

### Feature Specifications
The platform includes loan type education, intelligent lender filtering with deep linking, consolidated rental analysis, and integrates Zillow RentZestimate. It provides detailed deal analysis and loan comparison services. Educational content, UX improvements for data persistence and navigation, and comprehensive loan calculations are core components. The Toolbox & Resources section offers curated affiliate programs and a searchable glossary. The Rental Analysis flow includes intelligent DSCR lender matching, filtering DSCR products by state and calculating DSCR and loan amounts per product.

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