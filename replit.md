# RE Data Metrix

## Overview

RE Data Metrix is a real estate investment analytics and financing platform that connects investors with lenders. The platform provides sophisticated deal analysis tools and streamlines the lending application process. Currently in pre-launch phase, the application features a marketing site to collect early signups and establish the lender network database.

The platform enables real estate investors to analyze profitability metrics beyond standard calculators, compare financing options across different loan products, and connect directly with verified lenders through a one-click application flow.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript, using Vite as the build tool and module bundler.

**UI Framework**: Implements shadcn/ui component library (New York style variant) with Radix UI primitives. All components follow a consistent design system with Tailwind CSS for styling.

**Routing**: Client-side routing via Wouter library. Main routes include marketing pages (Home, About, Company), feature placeholders (Deal Analysis, Lenders, Resources), authentication (Login), contact functionality, and lender portal pages.

**Design System**: 
- Color scheme: Primary navy (#1E3A8A), accent gold (#D4AF37), success emerald (#0F7B49)
- Typography: Inter font family with specific weight hierarchies
- Spacing: Tailwind's consistent spacing scale
- Inspired by Stripe, Linear, and Carta aesthetics for professional SaaS appearance

**State Management**: React Query (@tanstack/react-query) for server state management and data fetching. Forms use react-hook-form with Zod schema validation.

### Backend Architecture

**Runtime**: Node.js with Express.js framework running in ES Module mode.

**API Structure**: RESTful API architecture with routes prefixed under `/api`. Fully implemented with storage interface pattern for CRUD operations.

**Session Management**: Uses connect-pg-simple for PostgreSQL session storage (infrastructure prepared but not fully implemented).

**Data Storage Pattern**: Abstracted storage interface (`IStorage`) with in-memory implementation (`MemStorage`). Fully functional with CRUD methods for lender questionnaires and loan products.

### Database Architecture

**Database**: PostgreSQL via Neon serverless driver with WebSocket connections.

**ORM**: Drizzle ORM for type-safe database operations and schema management.

**Schema Design**:
- **users**: Basic authentication (id, username, password)
- **prelaunch_signups**: Early access registrations with source tracking (home_prelaunch, login_prelaunch)
- **lenders**: Lender company profiles and credentials (companyName, email, password, contactName, phone, website)
- **lender_questionnaires**: Detailed lender criteria (businessStructure, yearsInBusiness, statesOperating, specializations, minLoanAmount, maxLoanAmount, creditRequirements, workWithNewInvestors, offerDeferredInterest)
- **loan_products**: 15-field loan offerings including productName, newInvestorOk, minCreditScore, maxLtvBuy, maxLendRehab, interestRate, interestDeferred, drawnFundsOnly, points, pointsDeferred, maxLoanArv, appraisalRequired, estimatedAppraisalCost, fees, costPerDraw, and isActive flag

**Migrations**: Drizzle Kit manages schema migrations stored in `/migrations` directory.

### Authentication & Authorization

Currently minimal authentication infrastructure. Schema includes user and lender tables with password fields, indicating planned credential-based authentication. No active session management or authorization middleware implemented yet (pre-launch phase).

### Form Handling & Validation

**Client-Side**: react-hook-form with @hookform/resolvers for Zod schema integration. Validation schemas defined using drizzle-zod for database-backed forms.

**Server-Side**: Full Zod schema validation on API endpoints with proper error handling and type safety.

**Form Types**:
- Prelaunch signup forms (home and login pages)
- Contact form
- Lender questionnaire (multi-field business profile, fully functional with backend persistence)
- Loan product entry form (15 fields, fully functional with backend persistence and display)

### Build & Deployment

**Development**: Vite dev server with HMR, Replit-specific plugins for error overlay and development tools.

**Production Build**: 
- Client: Vite builds to `dist/public`
- Server: esbuild bundles Express server to `dist/index.js`

**Module Resolution**: Path aliases configured for clean imports:
- `@/*` → client/src
- `@shared/*` → shared schemas and types
- `@assets/*` → attached_assets directory

### Code Organization

**Monorepo Structure**:
- `/client` - React frontend application
- `/server` - Express backend
- `/shared` - Shared TypeScript schemas and types
- `/attached_assets` - Static assets (images, videos, documents)

**Component Organization**: Functional components in `/client/src/components` with example usage in `/examples` subdirectory. Page components in `/client/src/pages`.

## External Dependencies

### Database Service
- **Neon Serverless PostgreSQL**: Managed database with WebSocket support for serverless environments
- Connection via `DATABASE_URL` environment variable
- Drizzle ORM for query building and migrations

### UI Component Libraries
- **Radix UI**: Unstyled accessible components (@radix-ui/* packages)
- **shadcn/ui**: Pre-styled component patterns built on Radix
- **Lucide React**: Icon library

### Third-Party Integrations (Planned)
- **Zoho CRM**: Customer relationship management for lead capture
  - Form submissions mapped to CRM with source tracking
  - Fields: Name, Company, Email, Phone, Consent checkbox
  - Not yet implemented (console logging placeholder)

### Frontend Libraries
- **React Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **React Hook Form**: Form state and validation
- **Zod**: Schema validation
- **date-fns**: Date manipulation utilities
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Fast build tool and dev server
- **esbuild**: Fast JavaScript bundler for production server
- **PostCSS**: CSS processing with Tailwind

### Replit-Specific
- Runtime error modal plugin
- Cartographer plugin (development only)
- Dev banner plugin (development only)

## Recent Changes

### Lender Portal - Company Info and Questionnaire Separation (Latest)

**Date**: November 12, 2025

**Overview**: Separated Company Info from Questionnaire into two distinct sections, rebuilt questionnaire with new dropdown-based fields per user specifications.

**Company Info Implementation**:
- Created standalone Company Info page (`/lender-company-info`)
- 6 fields: Company Name, Contact Name, Phone Number, Email Address, Website, "What's cool about your company?"
- Updated dashboard: Changed "Company Profile" to "Company Info" and activated the card
- New API endpoints:
  - POST `/api/lender-company-info` - Save company information
  - GET `/api/lender-company-info/:lenderId` - Retrieve company information
- Separate storage in MemStorage for company info data

**Questionnaire Rebuild**:
- Completely rebuilt questionnaire schema with 12 new fields:
  1. Are you a broker or direct lender? (Y/N dropdown)
  2. What is the fastest you can close a loan? (1-7 DAYS, 8-14 DAYS, 15-21 DAYS, 21-30 DAYS)
  3. Do you offer non-traditional / creative lending? (Y/N dropdown)
  4. Do you work with new investors? (Y/N dropdown)
  5. What is the minimum credit score you will work with? (Below 600, 600-649, 650-699, 700+)
  6. Do you offer deferred payment loans? (Y/N dropdown)
  7. Do you offer rolled / points on the back? (Y/N dropdown)
  8. Do you offer 100% funding of both the purchase and the rehab? (Y/N dropdown)
  9. Do you offer financing on multi-unit properties? (5+ units) (Y/N dropdown)
  10. Do you offer DSCR loans? (Y/N dropdown)
  11. Do you offer loans in all 50 States? (Y/N dropdown)
  12. State selection checkboxes (conditional - appears only if "No" to all 50 states)

**Schema Changes** (`shared/schema.ts`):
- Replaced old questionnaire fields with new dropdown-based fields
- All fields stored as text for dropdown selections
- Added `statesServiced` as text array for state checkboxes
- Removed old fields: companyDescription, businessStructure, yearsInBusiness, statesOperating, specializations, minLoanAmount, maxLoanAmount, creditRequirements, workWithNewInvestors (boolean), offerDeferredInterest (boolean)

**Frontend Implementation**:
- Clean questionnaire UI with shadcn Select components for all dropdowns
- Conditional rendering of state checkboxes based on "all 50 states" selection
- All 50 US states displayed in a scrollable grid with checkboxes
- React Hook Form with Zod validation
- Success toast notifications on save

**Testing**:
- End-to-end playwright test confirms all dropdowns work correctly
- State selection shows/hides based on "all 50 states" answer
- Form submission and data persistence verified
- Company Info form saves independently from questionnaire

**Loan Products** (unchanged):
- 15-field loan product form fully functional
- Backend persistence and display working correctly

**Architecture Notes**:
- Company Info is now completely separate from Questionnaire
- Company Info accessed via dashboard card
- Questionnaire accessed via separate dashboard card
- Both save to independent storage structures

**Files Modified**:
- `shared/schema.ts` - Rebuilt lenderQuestionnaires table with new fields
- `server/storage.ts` - Updated upsertLenderQuestionnaire method, added company info methods
- `server/routes.ts` - Added company info API endpoints
- `client/src/pages/LenderQuestionnaire.tsx` - Complete rebuild with new dropdown fields
- `client/src/pages/LenderCompanyInfo.tsx` - New file for company information
- `client/src/pages/LenderDashboard.tsx` - Updated to show "Company Info" instead of "Company Profile"
- `client/src/App.tsx` - Added route for company info page

**Known Limitations**:
- Password storage is plaintext (marked as TODO for production)
- Using placeholder lenderId "temp-lender-id" for testing
- Edit/delete buttons not yet in UI for loan products (API routes exist)