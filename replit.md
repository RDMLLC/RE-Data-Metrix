# RE Data Metrix

## Overview

RE Data Metrix is a real estate investment analytics and financing platform designed to connect investors with lenders. Its core purpose is to offer advanced profitability metric analysis, compare diverse financing options, and facilitate direct lender engagement through a streamlined application process. The platform aims to provide sophisticated deal analysis tools and simplify the lending application workflow.

## Recent Changes (November 2025)

### New Features (Latest)
- **Consolidated Rental Analysis**: Transformed 3-step wizard into single-page experience for faster user workflow
  - Removed separate rental income page (old Step 2)
  - Now displays: Property Overview card → Expected Monthly Rent card → DSCR Results card (all on one page)
  - DSCR results appear immediately when rent is entered (no "Calculate" button needed)
  - Added state reset on component mount to prevent users getting stuck in lender view
  - All previous features preserved: editable interest rate with live recalculation, loan assumptions, PITIA breakdown, Expected Monthly Rent display
- **Enhanced Main Navigation**: Added "Loan Types" link to header between "Rental Analysis" and "Lenders" for improved educational content discoverability
- **Functional Lender Referrals**: "Click Here to Apply" buttons in Step 6 Results now open lender referral links in new tabs
  - Opens referralLink in new tab with proper security flags (noopener, noreferrer)
  - Buttons disabled with toast notification when referralLink unavailable
  - Error handling for missing or invalid lender data
- **Expanded Loan Product Details**: Step 6 Results comparison table now displays comprehensive loan product information
  - Added 5 new rows: Loan Product Name, Interest Rate, Max LTV (Buy), Points, Time to Close
  - Proper N/A handling for missing/optional data (prevents stray symbols)
  - Applied to both user custom loan and matched lender products
  - LoanComparisonColumn interface extended with referralLink, interestRate, maxLtvBuy, points, timeToClose fields
- **Enhanced Loan Types Page**: Educational content with direct lender search integration
  - "Find {Loan Type} Lenders" buttons on each loan type card linking to /lenders
  - New "Private Lenders & Creative Financing" section with educational content
  - "Learn More About Private Lending" button linking to /about-private-lenders
- **Zillow RentZestimate Integration**: Automatically captures and displays estimated monthly rent from Zillow property lookups
  - rentZestimate extracted from Zillow API response during property lookup in Step 1
  - Stored in WizardDataContext and persisted to localStorage
  - Pre-fills monthly rent input in Rental Analysis wizard with editable Zillow estimate
  - Displays "Zillow RentZestimate: $X,XXX (editable)" with green CheckCircle icon when available
  - Shows amber AlertCircle with "No estimated rent available" message when rentZestimate is unavailable
  - Automatically clears stale rent data when looking up new properties

### Bug Fixes
- **Optional Loan Field Rendering**: Fixed bug where missing loan product data (interestRate, maxLtvBuy, points, timeToClose) would render stray symbols like "%" or "days". Now displays "N/A" for all missing data with proper null/undefined guards.
- **Rental Analysis Data Flow**: Fixed issue where clicking "Analyze as Rental Property" from Deal Analysis Step 3 or Step 6 would navigate to Rental Analysis without saving the deal data first, causing "Please complete the Deal Analysis wizard first" error. Both buttons now properly save all form data to WizardDataContext before navigation.
- **Step 3 BRRRR Banner**: Fixed premature display of "Analyze as Rental Property" button - now only appears after user enters both purchase price AND ARV to ensure required data is available for Rental Analysis validation

### Educational Content Features
- **Loan Types Education Page** (`/loan-types`): Comprehensive guide covering all 8 loan types (Conventional, DSCR, Hard Money, FHA/VA, Portfolio, ARM, Balloon, Interest-Only) with detailed descriptions, pros/cons, use cases, and typical terms
- **Private Lenders Education Page** (`/about-private-lenders`): Educational content explaining private lending, benefits for real estate investors, how it works, and CTAs linking to lender search
- **Deal Analysis Step 5 Educational Banner**: Added prominent educational banner in Loan Criteria step with links to loan types and private lenders pages, plus enhanced field descriptions for Points and ARV
- **Rental Analysis DSCR Enhancements**:
  - Editable interest rate field (defaults to 7.5%) with live DSCR recalculation
  - Enhanced DSCR status indicators using Lucide React icons (CheckCircle, AlertTriangle, XCircle) with color-coded feedback (emerald/yellow/red)
  - Improved UI layout with detailed PITIA breakdown and loan details showing Expected Monthly Rent
  - Educational context about typical DSCR rates (7.5%-9.5%)
  - Loan assumptions clearly stated: 30-year fixed mortgage, 75% financed, 25% down payment
  - Annual insurance amount displayed alongside monthly breakdown
- **Footer Navigation**: Added links to new educational pages in footer Resources section

### UX Improvements
- **Property Image Display**: Added property photo to "Property Found" box in Step 1 after successful Zillow/Redfin lookup - displays full-size image with object-contain styling
- **DC Utility Costs**: Added Washington DC to utility costs database with $0.26/sq ft rate (matching MD and VA)
- **Manual Address Entry**: Added optional manual entry flow in Step 1 with conditional validation using Zod .superRefine() - allows users to skip property lookup and enter address details manually in Step 2
- **HOA Fields**: Added HOA Monthly and HOA Transfer Fee fields to Step 2 Property Details with instruction text
- **Footer Icons**: Changed social media icons from gold to white for better contrast on navy background
- **Contact Form**: Made Company Name field optional
- **Navigation**: Renamed "Resources" to "Toolbox" throughout navigation and routes

### Deal Analysis API & Calculations
- **Loan Calculation Service**: Created comprehensive `createCashSaleColumn()` and `createLoanComparisonColumn()` functions that return complete LoanComparisonColumn structures with all metrics (purchase price, rehab budget, total project cost, all costs, profit, ROI variants, percentage ARV)
- **Results Endpoint**: Updated POST /api/deal-analysis/results to return complete comparison data:
  - cashSaleColumn: Complete cash sale metrics
  - userLoanColumn: User's custom loan comparison (if provided)
  - lenderColumns: Top 3 matched lender products with full metrics
  - criteriaUsed: Echo of ranking criteria selection
  - numberOfDraws: Number of rehab draws
  - allRankedProducts: Total count of matched products

## User Preferences

Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)

## System Architecture

### Frontend

The frontend is built with React and TypeScript, using Vite for bundling. It leverages `shadcn/ui` (New York style) with Radix UI primitives and Tailwind CSS for a professional design. Wouter handles client-side routing. State management and data fetching utilize React Query, while forms are managed with react-hook-form and Zod validation. Key features include marketing pages, authentication, and a lender portal. The Deal Analysis Wizard guides users through property analysis, capturing purchase, renovation, holding period, exit, and loan criteria, with client-side calculations and real-time updates.

### Backend

The backend uses Node.js and Express.js, providing a RESTful API. It includes an abstracted storage interface with an in-memory implementation for CRUD operations on lender questionnaires and loan products. Session management is prepared for PostgreSQL.

### Database

PostgreSQL is the chosen database, accessed via Neon serverless driver. Drizzle ORM manages type-safe operations and schema, which includes tables for `users`, `prelaunch_signups`, `lenders`, `lender_questionnaires`, and `loan_products`. Drizzle Kit handles schema migrations.

### Authentication & Authorization

Basic authentication infrastructure is in place with user and lender tables. Full session management and authorization middleware are planned.

### Form Handling & Validation

Client-side validation is performed using react-hook-form and Zod. Server-side, all API endpoints include comprehensive Zod schema validation. The system supports various forms, including prelaunch signups, contact forms, detailed lender questionnaires, and loan product entry forms.

### Build & Deployment

Vite is used for development and client-side production builds, while esbuild handles the Express server build. Path aliases support a monorepo structure comprising `/client`, `/server`, `/shared`, and `/attached_assets`.

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