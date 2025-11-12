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

**API Structure**: RESTful API architecture with routes prefixed under `/api`. Currently minimal implementation with storage interface pattern prepared for CRUD operations.

**Session Management**: Uses connect-pg-simple for PostgreSQL session storage (infrastructure prepared but not fully implemented).

**Data Storage Pattern**: Abstracted storage interface (`IStorage`) with in-memory implementation (`MemStorage`) as placeholder. Designed to be swapped with database-backed implementation.

### Database Architecture

**Database**: PostgreSQL via Neon serverless driver with WebSocket connections.

**ORM**: Drizzle ORM for type-safe database operations and schema management.

**Schema Design**:
- **users**: Basic authentication (id, username, password)
- **prelaunch_signups**: Early access registrations with source tracking (home_prelaunch, login_prelaunch)
- **lenders**: Lender company profiles and credentials
- **lender_questionnaires**: Detailed lender criteria (states, specializations, credit requirements, investor experience)
- **loan_products**: Individual loan offerings with terms, rates, and requirements

**Migrations**: Drizzle Kit manages schema migrations stored in `/migrations` directory.

### Authentication & Authorization

Currently minimal authentication infrastructure. Schema includes user and lender tables with password fields, indicating planned credential-based authentication. No active session management or authorization middleware implemented yet (pre-launch phase).

### Form Handling & Validation

**Client-Side**: react-hook-form with @hookform/resolvers for Zod schema integration. Validation schemas defined using drizzle-zod for database-backed forms.

**Server-Side**: Validation logic prepared through Zod schemas but API endpoints not yet implemented.

**Form Types**:
- Prelaunch signup forms (home and login pages)
- Contact form
- Lender questionnaire (multi-field business profile)
- Loan product entry form

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