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