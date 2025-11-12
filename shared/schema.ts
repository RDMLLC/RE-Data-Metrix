import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const prelaunchSignups = pgTable("prelaunch_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  consent: boolean("consent").notNull().default(true),
  source: text("source").notNull(),
});

export const insertPrelaunchSignupSchema = createInsertSchema(prelaunchSignups).omit({
  id: true,
});

export type InsertPrelaunchSignup = z.infer<typeof insertPrelaunchSignupSchema>;
export type PrelaunchSignup = typeof prelaunchSignups.$inferSelect;

export const lenders = pgTable("lenders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  contactName: text("contact_name").notNull(),
  phone: text("phone"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLenderSchema = createInsertSchema(lenders).omit({
  id: true,
  createdAt: true,
});

export type InsertLender = z.infer<typeof insertLenderSchema>;
export type Lender = typeof lenders.$inferSelect;

export const lenderQuestionnaires = pgTable("lender_questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  businessStructure: text("business_structure"),
  yearsInBusiness: integer("years_in_business"),
  statesOperating: text("states_operating"),
  specializations: text("specializations"),
  minLoanAmount: decimal("min_loan_amount", { precision: 12, scale: 2 }),
  maxLoanAmount: decimal("max_loan_amount", { precision: 12, scale: 2 }),
  creditRequirements: text("credit_requirements"),
  workWithNewInvestors: boolean("work_with_new_investors").default(false),
  offerDeferredInterest: boolean("offer_deferred_interest").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLenderQuestionnaireSchema = createInsertSchema(lenderQuestionnaires).omit({
  id: true,
  updatedAt: true,
});

export type InsertLenderQuestionnaire = z.infer<typeof insertLenderQuestionnaireSchema>;
export type LenderQuestionnaire = typeof lenderQuestionnaires.$inferSelect;

export const loanProducts = pgTable("loan_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  productName: text("product_name").notNull(),
  newInvestorOk: boolean("new_investor_ok").default(false),
  minCreditScore: integer("min_credit_score"),
  maxLtvBuy: decimal("max_ltv_buy", { precision: 5, scale: 2 }),
  maxLendRehab: decimal("max_lend_rehab", { precision: 5, scale: 2 }),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  interestDeferred: boolean("interest_deferred").default(false),
  drawnFundsOnly: boolean("drawn_funds_only").default(false),
  points: decimal("points", { precision: 5, scale: 2 }),
  pointsDeferred: boolean("points_deferred").default(false),
  maxLoanArv: decimal("max_loan_arv", { precision: 5, scale: 2 }),
  appraisalRequired: boolean("appraisal_required").default(false),
  estimatedAppraisalCost: decimal("estimated_appraisal_cost", { precision: 12, scale: 2 }),
  fees: decimal("fees", { precision: 12, scale: 2 }),
  costPerDraw: decimal("cost_per_draw", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoanProductSchema = createInsertSchema(loanProducts).omit({
  id: true,
  createdAt: true,
});

export type InsertLoanProduct = z.infer<typeof insertLoanProductSchema>;
export type LoanProduct = typeof loanProducts.$inferSelect;
