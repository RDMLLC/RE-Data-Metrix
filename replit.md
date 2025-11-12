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

### Lender Portal Backend Implementation (Latest)

**Date**: Current session

**Overview**: Implemented complete backend persistence and UI integration for the lender portal, enabling lenders to save and manage their questionnaire data and loan products.

**Schema Updates**:
- Completely rebuilt `loan_products` table to match user requirements with 15 fields
- Added proper nullable fields for optional loan product attributes
- Implemented `isActive` boolean flag for product lifecycle management

**Backend Implementation**:
- Created storage interface methods: `saveLenderQuestionnaire`, `getLenderQuestionnaire`, `createLoanProduct`, `getLoanProducts`, `updateLoanProduct`, `deleteLoanProduct`
- Implemented API routes:
  - POST `/api/lender-questionnaire` - Upsert questionnaire data
  - GET `/api/lender-questionnaire/:lenderId` - Retrieve questionnaire
  - POST `/api/loan-products` - Create new loan product
  - GET `/api/loan-products/:lenderId` - Get all products for lender
  - PATCH `/api/loan-products/:id` - Update product
  - DELETE `/api/loan-products/:id` - Delete product
- Full Zod validation on all endpoints using schemas from drizzle-zod

**Frontend Integration**:
- Wired both forms to backend using React Query mutations
- Proper cache invalidation after mutations using hierarchical query keys
- Added `useQuery` to fetch and display saved loan products
- Loading states, error handling, and success toasts
- Product list displays immediately after adding products (cache invalidation works correctly)
- Used styled divs instead of nested Cards for product display items

**Testing**:
- End-to-end playwright tests confirm full data persistence flow
- Lenders can save questionnaire, add multiple loan products, and see them displayed
- All form validations working correctly
- Optional numeric fields handled properly with nullable types
- Company Info section tested and working with all 6 new fields

**Questionnaire Form Sections:**
1. **Company Info** - Company Name, Contact Name, Phone Number, Email Address, Website, What's cool about your company?
2. **Lending Criteria** - Business Structure, Years in Business, States Operating, Specializations, Loan Amounts, Credit Requirements, Checkboxes for new investors and deferred interest

**Known Limitations**:
- Password storage is plaintext (marked as TODO for production)
- Edit/delete buttons not yet in UI for loan products (API routes exist)
- Using placeholder lenderId "temp-lender-id" for testing
- Company contact fields (name, email, phone, website) currently submitted with questionnaire; should be separated to update lenders table when real auth is implemented

**Files Modified**:
- `shared/schema.ts` - Updated loan_products schema, added companyDescription to lenderQuestionnaires
- `server/storage.ts` - Added CRUD methods for questionnaire and loan products
- `server/routes.ts` - Implemented all API endpoints
- `client/src/pages/LenderQuestionnaire.tsx` - Added Company Info section, wired to backend with React Query
- `client/src/pages/LenderLoanProducts.tsx` - Complete form + product display with backend integration