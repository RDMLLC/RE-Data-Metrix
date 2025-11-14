# RE Data Metrix

## Overview

RE Data Metrix is a real estate investment analytics and financing platform designed to connect investors with lenders. Its primary purpose is to provide sophisticated deal analysis tools, streamline the lending application process, and facilitate connections between real estate investors and verified lenders. The platform aims to offer advanced profitability metric analysis, compare diverse financing options, and enable direct lender engagement through a simplified application flow.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React and TypeScript, using Vite for bundling. It utilizes `shadcn/ui` (New York style) with Radix UI primitives and Tailwind CSS for a consistent, professional design inspired by Stripe, Linear, and Carta. Client-side routing is handled by Wouter. State management and data fetching rely on React Query, while forms use react-hook-form with Zod validation. Key components include marketing pages, feature placeholders, authentication, and a lender portal.

### Backend

The backend is developed with Node.js and Express.js, implementing a RESTful API structure under the `/api` prefix. It features an abstracted storage interface (`IStorage`) with a functional in-memory implementation for CRUD operations, specifically for lender questionnaires and loan products. Session management is prepared using connect-pg-simple for PostgreSQL.

### Database

PostgreSQL is used as the database, accessed via Neon serverless driver with WebSocket connections. Drizzle ORM handles type-safe database operations and schema management. The schema includes tables for `users`, `prelaunch_signups`, `lenders`, `lender_questionnaires`, and `loan_products`, designed to store comprehensive investor, lender, and loan product data. Drizzle Kit manages schema migrations.

### Authentication & Authorization

Basic authentication infrastructure exists with user and lender tables containing password fields. Full session management and authorization middleware are planned for future implementation.

### Form Handling & Validation

Client-side validation is done with react-hook-form and Zod schemas, using `@hookform/resolvers`. Server-side, all API endpoints include full Zod schema validation for data integrity and type safety. The system supports various forms, including prelaunch signups, contact forms, detailed lender questionnaires, and loan product entry forms.

### Build & Deployment

Development uses Vite with HMR. Production builds involve Vite for the client (to `dist/public`) and esbuild for the Express server (to `dist/index.js`). Path aliases simplify imports across the monorepo structure, which includes `/client`, `/server`, `/shared`, and `/attached_assets`.

### Deal Analysis Wizard

The deal analysis wizard systematically guides users through property analysis. Key steps include:
- **Step 3 (Purchase & Renovation)**: Captures purchase price, rehab budget, ARV, and project length. Calculates total project cost, gross profit, and percentage of ARV.
- **Step 4 (Holding Period & Exit)**: Details estimated closing costs (buy), carrying costs (e.g., HOA, utilities, insurance, using state-based lookup tables), and exit strategy (sell price, closing costs, commission). It then calculates estimated total investment, profit, cash on cash ROI, and annual ROI. Calculations are performed client-side with real-time updates.

## External Dependencies

### Database Service
- **Neon Serverless PostgreSQL**: Managed database solution.

### UI Component Libraries
- **Radix UI**: Unstyled accessible components.
- **shadcn/ui**: Styled components built on Radix.
- **Lucide React**: Icon library.

### Third-Party Integrations (Planned)
- **Zoho CRM**: For lead capture and management.

### Frontend Libraries
- **React Query**: Server state management.
- **Wouter**: Client-side routing.
- **React Hook Form**: Form state and validation.
- **Zod**: Schema validation.
- **date-fns**: Date manipulation.
- **Tailwind CSS**: Utility-first CSS framework.
- **class-variance-authority**: Component variant management.

### Development Tools
- **TypeScript**: Type safety.
- **Vite**: Build tool and dev server.
- **esbuild**: JavaScript bundler.
- **PostCSS**: CSS processing.

## Recent Changes

### Deal Analysis Wizard - Steps 3, 4 & 5 Implementation

**Date**: November 14, 2025

**Overview**: Implemented Steps 3-5 of the Deal Analysis wizard, covering financial inputs, profitability calculations, and loan criteria. These steps capture investor deal parameters, calculate ROI metrics with state-based auto-fills, and gather financing preferences for lender matching.

#### Step 3: Purchase & Renovation
- **Input Fields**: Purchase Price, Rehab Budget, ARV (After Repair Value), Project Length (months)
- **Real-Time Calculations**:
  - Total Project Cost = Purchase Price + Rehab Budget
  - Gross Profit = ARV - Total Project Cost
  - Percentage of ARV = (Total Project Cost / ARV) × 100
- **Auto-Fill**: ARV defaults to estimated value from Step 2 if available
- **UI**: Clean summary panel with live updates, currency formatting

#### Step 4: Holding Period & Exit
- **Collapsible Sections** for organized cost breakdown
- **Estimated Closing Costs (Buy)**:
  - Attorney Fees (default: $750)
  - Doc Prep Fees (default: $1,500)
  - Title Exam (default: $250)
  - Title Insurance (auto-calculated: Purchase Price × 1.2%)
- **Estimated Carrying Costs**:
  - Monthly HOA Fees (multiplied by project length)
  - HOA Transfer Fee (one-time)
  - Property Tax (taxAssessedValue × 1% / 12 × project length)
  - Monthly Utilities (state-based auto-fill)
  - Annual Insurance (state-based auto-fill, pro-rated)
- **Exit Strategy**:
  - Sell Price (defaults to ARV)
  - Closing Costs (Sell) - percentage (default: 1%)
  - Real Estate Commission - percentage (default: 6%)
- **Profitability Analysis**:
  - Estimated Total Investment = Project Cost + Closing Costs + Carrying Costs
  - Estimated Profit = Sell Price - Total Investment - Closing Costs (Sell) - Commission
  - Cash on Cash ROI = (Profit / Total Investment) × 100
  - Annual ROI = Cash on Cash ROI / (Project Length / 12)
- **State Lookup Tables**:
  - Created `shared/data/utility-costs.ts` (cost per sqft/month for all 50 states)
  - Created `shared/data/insurance-costs.ts` (cost per sqft/year for all 50 states)
  - Example GA: Utilities $0.28/sqft/month, Insurance $1.00/sqft/year
- **Critical Bug Fix**: Fixed HOA fee calculation to multiply monthly fees by project length (architect review identified this issue)

#### Step 5: Loan Criteria
- **Investor Profile Section**:
  - "Are you a new investor?" (Y/N radio)
  - If NO → Show experience fields:
    - Projects completed (last 12 months) - dropdown: 0, 1-2, 3-5, 6-10, 11+
    - Projects completed (last 36 months) - dropdown: 0, 1-5, 6-10, 11-20, 21+
  - Estimated Credit Score - dropdown: Below 600, 600-649, 650-699, 700-749, 750+
- **Deal Structure Section**:
  - "Is this a double close?" (Y/N radio)
  - If YES → "Are you paying for both sides?" (Y/N radio)
- **Loan Information Section** (Conditional):
  - "Do you have a loan you are currently looking at?" (Y/N radio)
  - **Gated Field**: Disabled until address/city/state/zipCode from Step 1 are completed (per CSV spec)
  - Shows amber warning when disabled with explanation
  - If YES → Extensive loan details form:
    - Max % Lend on Purchase/Rehab (percentage inputs)
    - Interest Rate (annual %), Points (%), Max % Loan to ARV (%)
    - Interest Deferred, Drawn Funds Only, Points Deferred (Y/N radios)
    - Appraisal Required (Y/N)
      - If YES → Appraisal Fee (dollar input)
    - Draw Fees, Doc Prep Fees (dollar inputs)
    - Closing Timeline (dropdown: 1-7, 8-14, 15-21, 21-30, 30+ days)

**Technical Implementation**:
- React Hook Form with `form.watch()` for reactive conditional rendering
- useEffect hooks for smart auto-filling (preserves manual edits)
- Radix UI Collapsible components for expandable cost sections
- Color-coded profitability metrics (green/red based on positive/negative)
- Comprehensive data-testid attributes for E2E testing
- All calculations performed client-side for instant feedback

**Wizard Schema Updates**:
- Step 3 fields: purchasePrice, rehabBudget, arv, projectLength
- Step 4 fields: attorneyFees, docPrepFees, titleExam, titleInsurance, hoaFees, hoaTransferFee, monthlyUtilities, annualInsurance, sellPrice, closingCostsSellPercent, realEstateCommissionPercent
- Step 5 fields: isNewInvestor, projectsLast12Months, projectsLast36Months, creditScore, isDoubleClose, payingForBothSides, hasExistingLoan, maxLendBuy, maxLendRehab, loanInterestRate, interestDeferred, drawnFundsOnly, loanPoints, pointsDeferred, maxLoanToArv, appraisalRequired, appraisalFee, drawFees, loanDocPrepFees, closingTimeline

**Files Created**:
- `client/src/components/deal-analysis/Step3PurchaseRenovation.tsx`
- `client/src/components/deal-analysis/Step4HoldingPeriodExit.tsx`
- `client/src/components/deal-analysis/Step5LoanCriteria.tsx`
- `shared/data/utility-costs.ts`
- `shared/data/insurance-costs.ts`

**Files Modified**:
- `client/src/components/deal-analysis/DealAnalysisWizard.tsx` - Extended schema, added Step 3-5 routing
- `server/services/hasdata-api.service.ts` - Fixed Zillow API response parsing for nested property object

**Testing**:
- End-to-end Playwright tests passed for complete wizard flow Steps 1-5
- Verified all conditional rendering paths (new investor, double close, loan details, appraisal)
- Verified property lookup, data pre-filling, calculations, and state-based auto-fills
- Regression test confirmed HOA fee calculation fix with non-zero monthly fees
- Verified loan information section gating (disabled without address data)

**Architecture Notes**:
- All calculations performed client-side for instant feedback
- No API calls needed for Steps 3-5 (pure calculation/form steps)
- State lookup tables in shared code for reusability
- Form state managed centrally in DealAnalysisWizard parent component
- Conditional fields use React Hook Form watchers for reactive updates

**Next Steps**:
- Step 6: Results (lender matching and deal comparison with freemium model)