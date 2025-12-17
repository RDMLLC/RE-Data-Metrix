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

## External Dependencies
- **Database Service**: Neon Serverless PostgreSQL
- **UI Component Libraries**: Radix UI, shadcn/ui, Lucide React
- **Frontend Libraries**: React Query, Wouter, React Hook Form, Zod, date-fns, Tailwind CSS, class-variance-authority, Stripe (for billing and subscription management)
- **Email Service**: Zoho Mail SMTP
- **Property Data APIs**:
    - RentCast API (Primary for property details, tax info, estimated values, and rent)
    - HasData API (for property images from Zillow/Redfin, integrated into RentCastAPIService)