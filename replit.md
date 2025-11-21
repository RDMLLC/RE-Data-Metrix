# RE Data Metrix

## Overview

RE Data Metrix is a real estate investment analytics and financing platform connecting investors with lenders. Its primary purpose is to provide advanced profitability analysis, compare diverse financing options, and facilitate direct lender engagement through a streamlined application process. The platform offers sophisticated deal analysis tools and simplifies the lending application workflow, aiming to streamline real estate investment and financing.

## User Preferences

Preferred communication style: Simple, everyday language
Spelling: American English (analyze, not analyse)

## System Architecture

### Frontend

The frontend is built with React and TypeScript, utilizing Vite for bundling. It employs `shadcn/ui` (New York style) with Radix UI primitives and Tailwind CSS for a professional design. Wouter manages client-side routing. State management and data fetching are handled by React Query, while forms are managed with react-hook-form and Zod validation. Key features include marketing pages, authentication, a lender portal, and a Deal Analysis Wizard for comprehensive property analysis (purchase, renovation, holding, exit, loan criteria) with real-time client-side calculations. UI/UX design emphasizes a clean, professional aesthetic.

### Backend

The backend is developed with Node.js and Express.js, providing a RESTful API. It includes an abstracted storage interface with an in-memory implementation for CRUD operations on lender questionnaires and loan products. The system is designed for PostgreSQL for session management and data persistence. Server-side validation uses Zod schemas for all API endpoints.

### Database

PostgreSQL is the chosen database, accessed via the Neon serverless driver. Drizzle ORM ensures type-safe operations and manages the schema, which includes tables for `users`, `prelaunch_signups`, `lenders`, `lender_questionnaires`, and `loan_products`. Drizzle Kit handles schema migrations.

### Authentication & Authorization

Basic authentication infrastructure is implemented with user and lender tables. Full session management and authorization middleware are planned for future development.

### Form Handling & Validation

Client-side validation is performed using react-hook-form and Zod. All API endpoints include comprehensive server-side Zod schema validation. The system supports various forms, including prelaunch signups, contact forms, detailed lender questionnaires, and loan product entry forms.

### Build & Deployment

Vite is used for development and client-side production builds, while esbuild handles the Express server build. Path aliases support a monorepo structure comprising `/client`, `/server`, `/shared`, and `/attached_assets`.

### Feature Specifications

The platform includes comprehensive loan type education, intelligent lender filtering with deep linking, and a consolidated rental analysis experience. It integrates Zillow RentZestimate for automatic rent estimations and provides detailed deal analysis and loan comparison services. Educational content is a core component, accessible through dedicated pages and within the deal analysis workflow. UX improvements focus on data persistence, clear navigation, and user-friendly input methods (e.g., manual address entry, HOA fields). Loan calculations are robust, providing complete cash sale and loan comparison metrics.

The Toolbox & Resources section provides investors with curated affiliate programs and a comprehensive investment glossary. Features include tabbed navigation with 5 affiliate categories (Marketplace & Community, Property Management, Project Management, Lead Generation, Comps & Data), 8 vetted partner programs with detailed descriptions and benefits, and a searchable glossary of 50+ essential real estate investment terms organized into 7 collapsible categories.

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