import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('user'),
  subscriptionStatus: text("subscription_status").notNull().default('inactive'),
  referredBy: varchar("referred_by"),
  referralCode: varchar("referral_code").unique(),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  verificationToken: varchar("verification_token").unique(),
  verificationExpiry: timestamp("verification_expiry"),
  passwordResetToken: varchar("password_reset_token").unique(),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  referralCode: true,
  isEmailVerified: true,
  verificationToken: true,
  verificationExpiry: true,
  passwordResetToken: true,
  passwordResetExpiry: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const compInvites = pgTable("comp_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  compCode: varchar("comp_code").notNull().unique(),
  status: text("status").notNull().default('pending'),
  invitedBy: varchar("invited_by").references(() => users.id),
  acceptedBy: varchar("accepted_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompInviteSchema = createInsertSchema(compInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  acceptedBy: true,
});

export type InsertCompInvite = z.infer<typeof insertCompInviteSchema>;
export type CompInvite = typeof compInvites.$inferSelect;

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  fullName: text("full_name").notNull(),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  creditScoreRange: text("credit_score_range"),
  autoPopulateDefaults: boolean("auto_populate_defaults").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export const investmentPreferences = pgTable("investment_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").notNull(),
});

export const insertInvestmentPreferenceSchema = createInsertSchema(investmentPreferences).omit({
  id: true,
});

export type InsertInvestmentPreference = z.infer<typeof insertInvestmentPreferenceSchema>;
export type InvestmentPreference = typeof investmentPreferences.$inferSelect;

export const userInvestmentPreferences = pgTable("user_investment_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  preferenceId: varchar("preference_id").notNull().references(() => investmentPreferences.id),
});

export const insertUserInvestmentPreferenceSchema = createInsertSchema(userInvestmentPreferences).omit({
  id: true,
});

export type InsertUserInvestmentPreference = z.infer<typeof insertUserInvestmentPreferenceSchema>;
export type UserInvestmentPreference = typeof userInvestmentPreferences.$inferSelect;

export const savedDeals = pgTable("saved_deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dealSnapshot: jsonb("deal_snapshot").notNull(),
  resultsSnapshot: jsonb("results_snapshot"),
  propertyAddress: text("property_address"),
  arv: decimal("arv", { precision: 12, scale: 2 }),
  roi: decimal("roi", { precision: 5, scale: 2 }),
  profit: decimal("profit", { precision: 12, scale: 2 }),
  dscr: decimal("dscr", { precision: 5, scale: 2 }),
  status: text("status").notNull().default('active'),
  notes: text("notes"),
  lendersPresented: jsonb("lenders_presented"),
  lendersClicked: jsonb("lenders_clicked"),
  usedReDMxLender: boolean("used_redmx_lender"),
  closedWithLenderId: varchar("closed_with_lender_id").references(() => lenders.id),
  closedWithProductId: varchar("closed_with_product_id").references(() => loanProducts.id),
  wonDate: timestamp("won_date"),
  lostDate: timestamp("lost_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: { name: "saved_deals_user_id_idx", columns: [table.userId] },
}));

export const insertSavedDealSchema = createInsertSchema(savedDeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedDeal = z.infer<typeof insertSavedDealSchema>;
export type SavedDeal = typeof savedDeals.$inferSelect;

export const savedLenders = pgTable("saved_lenders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: { name: "saved_lenders_user_id_idx", columns: [table.userId] },
  uniqueUserLender: { name: "saved_lenders_unique", columns: [table.userId, table.lenderId] },
}));

export const insertSavedLenderSchema = createInsertSchema(savedLenders).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedLender = z.infer<typeof insertSavedLenderSchema>;
export type SavedLender = typeof savedLenders.$inferSelect;

export const lenderReferrals = pgTable("lender_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  loanProductId: varchar("loan_product_id").references(() => loanProducts.id),
  savedDealId: varchar("saved_deal_id").references(() => savedDeals.id),
  referralType: text("referral_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: { name: "lender_referrals_user_id_idx", columns: [table.userId] },
  lenderIdIdx: { name: "lender_referrals_lender_id_idx", columns: [table.lenderId] },
}));

export const insertLenderReferralSchema = createInsertSchema(lenderReferrals).omit({
  id: true,
  createdAt: true,
});

export type InsertLenderReferral = z.infer<typeof insertLenderReferralSchema>;
export type LenderReferral = typeof lenderReferrals.$inferSelect;

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  affiliateId: text("affiliate_id").notNull(),
  affiliateName: text("affiliate_name").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: { name: "affiliate_clicks_user_id_idx", columns: [table.userId] },
  affiliateIdIdx: { name: "affiliate_clicks_affiliate_id_idx", columns: [table.affiliateId] },
}));

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({
  id: true,
  createdAt: true,
});

export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;

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
  companyDescription: text("company_description"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  contactName: text("contact_name").notNull(),
  phone: text("phone"),
  website: text("website"),
  referralLink: text("referral_link"),
  referralAmount: decimal("referral_amount", { precision: 12, scale: 2 }).notNull(),
  referralType: text("referral_type").notNull(),
  inviteToken: varchar("invite_token").unique(),
  inviteExpiry: timestamp("invite_expiry"),
  inviteAccepted: boolean("invite_accepted").default(false),
  archived: boolean("archived").default(false),
  isPreferred: boolean("is_preferred").default(false),
  passwordResetToken: varchar("password_reset_token").unique(),
  passwordResetExpiry: timestamp("password_reset_expiry"),
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
  brokerOrDirectLender: text("broker_or_direct_lender"),
  fastestClosingTime: text("fastest_closing_time"),
  offerNonTraditionalLending: boolean("offer_non_traditional_lending").default(false),
  workWithNewInvestors: boolean("work_with_new_investors").default(false),
  minCreditScore: text("min_credit_score"),
  offerDeferredPayment: boolean("offer_deferred_payment").default(false),
  offerRolledPoints: boolean("offer_rolled_points").default(false),
  offer100PercentFunding: boolean("offer_100_percent_funding").default(false),
  offerLoansAllStates: text("offer_loans_all_states"),
  statesServiced: text("states_serviced").array(),
  loanTypes: text("loan_types").array(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLenderQuestionnaireSchema = createInsertSchema(lenderQuestionnaires).omit({
  id: true,
  updatedAt: true,
});

export type InsertLenderQuestionnaire = z.infer<typeof insertLenderQuestionnaireSchema>;
export type LenderQuestionnaire = typeof lenderQuestionnaires.$inferSelect;

export const loanTypeEnum = ['bridge', 'dscr-purchase', 'dscr-refi', 'new-construction'] as const;
export type LoanTypeEnum = typeof loanTypeEnum[number];

export const loanProducts = pgTable("loan_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  loanType: text("loan_type").notNull().default('bridge'),
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
  timeToClose: integer("time_to_close"),
  cashOutOk: boolean("cash_out_ok").default(false),
  cashOutMaxLtv: decimal("cash_out_max_ltv", { precision: 5, scale: 2 }),
  referralLink: text("referral_link"),
  loanTermYears: integer("loan_term_years"),
  minDscrRequired: decimal("min_dscr_required", { precision: 4, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoanProductSchema = createInsertSchema(loanProducts).omit({
  id: true,
  createdAt: true,
});

export type InsertLoanProduct = z.infer<typeof insertLoanProductSchema>;
export type LoanProduct = typeof loanProducts.$inferSelect;

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  normalizedAddress: text("normalized_address").notNull().unique(),
  propertyType: text("property_type"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  sqft: integer("sqft"),
  lotSize: integer("lot_size"),
  yearBuilt: integer("year_built"),
  taxAssessedValue: decimal("tax_assessed_value", { precision: 12, scale: 2 }),
  estimatedValue: decimal("estimated_value", { precision: 12, scale: 2 }),
  lastSalePrice: decimal("last_sale_price", { precision: 12, scale: 2 }),
  lastSaleDate: text("last_sale_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  normalizedAddress: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export const dealAnalyses = pgTable("deal_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  userId: varchar("user_id").references(() => users.id),
  
  propertySnapshot: jsonb("property_snapshot").notNull(),
  
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }),
  closingCosts: decimal("closing_costs", { precision: 12, scale: 2 }),
  rehabBudget: decimal("rehab_budget", { precision: 12, scale: 2 }),
  contingencyPercent: decimal("contingency_percent", { precision: 5, scale: 2 }),
  
  holdingMonths: integer("holding_months"),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }),
  sellingCosts: decimal("selling_costs", { precision: 12, scale: 2 }),
  monthlyRent: decimal("monthly_rent", { precision: 12, scale: 2 }),
  exitStrategy: text("exit_strategy"),
  
  needsLoan: boolean("needs_loan").default(false),
  desiredLoanAmount: decimal("desired_loan_amount", { precision: 12, scale: 2 }),
  maxInterestRate: decimal("max_interest_rate", { precision: 5, scale: 2 }),
  maxPoints: decimal("max_points", { precision: 5, scale: 2 }),
  preferredLoanTerm: integer("preferred_loan_term"),
  
  resultsSnapshot: jsonb("results_snapshot"),
  
  stepCompleted: integer("step_completed").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: { name: "user_id_idx", columns: [table.userId] },
}));

export const insertDealAnalysisSchema = createInsertSchema(dealAnalyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDealAnalysis = z.infer<typeof insertDealAnalysisSchema>;
export type DealAnalysis = typeof dealAnalyses.$inferSelect;

export const dealAnalysisAccess = pgTable("deal_analysis_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: varchar("analysis_id").notNull().references(() => dealAnalyses.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  expiresAtIdx: { name: "expires_at_idx", columns: [table.expiresAt] },
}));

export const insertDealAnalysisAccessSchema = createInsertSchema(dealAnalysisAccess).omit({
  id: true,
  createdAt: true,
});

export type InsertDealAnalysisAccess = z.infer<typeof insertDealAnalysisAccessSchema>;
export type DealAnalysisAccess = typeof dealAnalysisAccess.$inferSelect;

export interface DrawSchedule {
  drawNumber: number;
  timingInDays: number;
  amount: number;
}

export interface LoanCalculation {
  buyLoanAmount: number;
  rehabLoanAmount: number;
  totalLoanAmount: number;
  arvCapAdjustment: number;
  finalLoanAmount: number;
  additionalDownPayment: number;
  
  buyInterest: number;
  rehabInterest: number;
  totalInterest: number;
  
  points: number;
  pointsDeferred: boolean;
  
  fees: number;
  appraisalCost: number;
  drawFees: number;
  
  monthlyPayment: number;
  monthlyCarryingCosts: number;
  
  rolledCosts: number;
  outOfPocketCost: number;
  
  profit: number;
  roi: number;
  cashOnCashRoi: number;
  annualizedRoi: number;
}

export interface LoanComparisonColumn {
  type: 'cash' | 'user-loan' | 'lender';
  lenderId?: string;
  lenderName?: string;
  productId?: string;
  productName?: string;
  timeToClose?: number;
  maxLoanArv?: number;
  referralLink?: string;
  interestRate?: number;
  maxLtvBuy?: number;
  points?: number;
  
  purchasePrice: number;
  rehabBudget: number;
  totalProjectCost: number;
  
  closingCostsBuy: number;
  carryingCosts: number;
  totalInvestment: number;
  
  sellPrice: number;
  closingCostsSell: number;
  commission: number;
  
  rolledCosts?: number;
  lenderDrawFees?: number;
  
  profit: number;
  outOfPocketCost: number;
  
  cashOnCashRoi: number;
  annualizedRoi: number;
  roi: number;
  
  percentageArv: number;
  percentageArvLender?: number;
  
  loanCalculation?: LoanCalculation;
}

export type LoanCriteria = 'profit' | 'out-of-pocket' | 'fastest';

export interface CriteriaSelection {
  primary?: LoanCriteria;
  secondary?: LoanCriteria;
}

export const criteriaSelectionSchema = z.object({
  useDefaultCriteria: z.boolean(),
  primary: z.enum(['profit', 'out-of-pocket', 'fastest']).optional(),
  secondary: z.enum(['profit', 'out-of-pocket', 'fastest']).optional(),
});

export type CriteriaSelectionData = z.infer<typeof criteriaSelectionSchema>;
