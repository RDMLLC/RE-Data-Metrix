import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, decimal, numeric, timestamp, jsonb, serial, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('user'),
  subscriptionStatus: text("subscription_status").notNull().default('free'),
  referredBy: varchar("referred_by"),
  referralCode: varchar("referral_code").unique(),
  signupSource: varchar("signup_source", { length: 50 }),
  signupRef: varchar("signup_ref", { length: 100 }),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  verificationToken: varchar("verification_token").unique(),
  verificationExpiry: timestamp("verification_expiry"),
  passwordResetToken: varchar("password_reset_token").unique(),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsVersion: text("terms_version"),
  privacyVersion: text("privacy_version"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionPlan: text("subscription_plan"), // 'free', 'monthly', 'annual'
  pendingPlan: text("pending_plan"),
  downgradedAt: timestamp("downgraded_at"),
  paymentFailedAt: timestamp("payment_failed_at"),
  pendingCancellationChoice: text("pending_cancellation_choice"),
  reportLogoUrl: text("report_logo_url"),       // user's logo URL for PDF reports
  reportCompanyName: text("report_company_name"), // user's company name for PDF reports
  archiveReason: text("archive_reason"), // 'cancelled', 'fraud', 'erasure', 'test', 'other'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  referralCode: true,
  isEmailVerified: true,
  emailVerifiedAt: true,
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

export const auditorInvites = pgTable("auditor_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  inviteCode: varchar("invite_code").notNull().unique(),
  companyName: text("company_name"),
  status: text("status").notNull().default('pending'),
  invitedBy: varchar("invited_by").references(() => users.id),
  acceptedBy: varchar("accepted_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditorInviteSchema = createInsertSchema(auditorInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  acceptedBy: true,
});

export type InsertAuditorInvite = z.infer<typeof insertAuditorInviteSchema>;
export type AuditorInvite = typeof auditorInvites.$inferSelect;

// Pending registrations - stores registration data before Stripe payment completes
export const pendingRegistrations = pgTable("pending_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name"),
  discountCode: text("discount_code"),
  selectedPlan: text("selected_plan").notNull(), // 'monthly' or 'annual'
  stripeSessionId: text("stripe_session_id"),
  status: text("status").notNull().default('pending'), // 'pending', 'completed', 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPendingRegistrationSchema = createInsertSchema(pendingRegistrations).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertPendingRegistration = z.infer<typeof insertPendingRegistrationSchema>;
export type PendingRegistration = typeof pendingRegistrations.$inferSelect;

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  fullName: text("full_name").notNull(),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  companyName: text("company_name"),
  creditScoreRange: text("credit_score_range"),
  autoPopulateDefaults: boolean("auto_populate_defaults").default(false),
  // Investor information fields for deal analysis auto-fill
  isNewInvestor: boolean("is_new_investor"),
  projectsLast12Months: text("projects_last_12_months"),
  projectsLast36Months: text("projects_last_36_months"),
  investorCreditScore: text("investor_credit_score"),
  // Wholesale calculator default values
  defaultWholesaleFee: integer("default_wholesale_fee"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// User usage counters for tracking free tier limits (e.g., 2 property lookups per month)
export const userUsageCounters = pgTable("user_usage_counters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  propertyLookupCount: integer("property_lookup_count").notNull().default(0),
  wholesaleCalcCount: integer("wholesale_calc_count").notNull().default(0),
  pdfDownloadCount: integer("pdf_download_count").notNull().default(0),
  arvHelperCount: integer("arv_helper_count").notNull().default(0),
  loanAnalysisCount: integer("loan_analysis_count").notNull().default(0),
  savedDealCount: integer("saved_deal_count").notNull().default(0),
  savedLenderCount: integer("saved_lender_count").notNull().default(0),
  lastArvAddress: varchar("last_arv_address", { length: 500 }),
  dscrCount: integer("dscr_count").notNull().default(0),
  lastDscrAddress: varchar("last_dscr_address", { length: 500 }),
  maxOfferCount: integer("max_offer_count").notNull().default(0),
  lastMaxOfferAddress: varchar("last_max_offer_address", { length: 500 }),
  lastWholesaleAddress: varchar("last_wholesale_address", { length: 500 }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  lastLookupAt: timestamp("last_lookup_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserUsageCounterSchema = createInsertSchema(userUsageCounters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserUsageCounter = z.infer<typeof insertUserUsageCounterSchema>;
export type UserUsageCounter = typeof userUsageCounters.$inferSelect;

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
  status: text("status").notNull().default('draft'),
  notes: text("notes"),
  lendersPresented: jsonb("lenders_presented"),
  lendersClicked: jsonb("lenders_clicked"),
  usedReDMxLender: boolean("used_redmx_lender"),
  closedWithLenderId: varchar("closed_with_lender_id").references(() => lenders.id),
  closedWithProductId: varchar("closed_with_product_id").references(() => loanProducts.id),
  customLenderInfo: jsonb("custom_lender_info"),
  underContractDate: timestamp("under_contract_date"),
  estimatedClosingDate: timestamp("estimated_closing_date"),
  actualClosingDate: timestamp("actual_closing_date"),
  purchaseDate: timestamp("purchase_date"),
  actualPurchasePrice: decimal("actual_purchase_price", { precision: 12, scale: 2 }),
  actualRehabBudget: decimal("actual_rehab_budget", { precision: 12, scale: 2 }),
  sellDate: timestamp("sell_date"),
  stopAutomatedReminders: boolean("stop_automated_reminders").default(false),
  wonDate: timestamp("won_date"),
  lostDate: timestamp("lost_date"),
  exitStrategy: text("exit_strategy"),
  sellPrice: decimal("sell_price", { precision: 12, scale: 2 }),
  assignmentFee: decimal("assignment_fee", { precision: 12, scale: 2 }),
  closingCosts: decimal("closing_costs", { precision: 12, scale: 2 }),
  transactionalFundingCosts: decimal("transactional_funding_costs", { precision: 12, scale: 2 }),
  rehabLevel: text("rehab_level"),
  rehabCostBreakdown: jsonb("rehab_cost_breakdown"),
  // New fields for the updated status system
  soldDate: timestamp("sold_date"),
  actualClosingCosts: decimal("actual_closing_costs", { precision: 12, scale: 2 }),
  actualHoldingCosts: decimal("actual_holding_costs", { precision: 12, scale: 2 }),
  actualSellingCosts: decimal("actual_selling_costs", { precision: 12, scale: 2 }),
  // Soft delete field - hidden deals are archived but kept in database
  isHidden: boolean("is_hidden").default(false),
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
  source: text("source").default('website'),
  referrer: text("referrer"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
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
  generatedReferralCode: varchar("generated_referral_code").unique(),
  referralClickCount: integer("referral_click_count").default(0),
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

export const loanTypeEnum = ['bridge', 'dscr-purchase', 'dscr-refi', 'new-construction', 'transactional-funding', 'usda'] as const;
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
  isLtcWeighted: boolean("is_ltc_weighted").default(false),
  maxLtcPercent: decimal("max_ltc_percent", { precision: 5, scale: 2 }),
  transactionalFlatFee: decimal("transactional_flat_fee", { precision: 12, scale: 2 }),
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

export interface OutOfPocketBreakdown {
  downPayment: number;
  baseClosingCosts: number;
  pointsCost: number;
  appraisalCost: number;
  lenderFees: number;
  totalClosingCostsBuy: number;
  carryingCosts: number;
  total: number;
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
  isLtcWeighted?: boolean;
  maxLtcPercent?: number;
  isLtcAdjusted?: boolean;
  effectiveBuyPercent?: number;
  
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
  outOfPocketBreakdown?: OutOfPocketBreakdown;
  
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

// Discount Codes for subscription pricing
export const discountCodes = pgTable("discount_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  displayName: text("display_name").notNull(),
  partnerName: text("partner_name"),
  description: text("description"),
  planApplicability: text("plan_applicability").notNull().default('both'), // 'monthly', 'annual', or 'both'
  percentOff: decimal("percent_off", { precision: 5, scale: 2 }),
  amountOff: decimal("amount_off", { precision: 12, scale: 2 }),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").notNull().default(0),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  stripeCouponId: varchar("stripe_coupon_id", { length: 100 }),
  stripeDuration: text("stripe_duration").default('repeating'), // 'once', 'repeating', or 'forever'
  stripeDurationInMonths: integer("stripe_duration_in_months").default(12), // used when stripeDuration = 'repeating'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({
  id: true,
  currentRedemptions: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodes.$inferSelect;

// Track discount code usage
export const discountCodeUses = pgTable("discount_code_uses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discountCodeId: varchar("discount_code_id").notNull().references(() => discountCodes.id),
  userId: varchar("user_id").references(() => users.id),
  plan: text("plan").notNull(), // 'monthly' or 'annual'
  amountDiscounted: decimal("amount_discounted", { precision: 12, scale: 2 }).notNull(),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
}, (table) => ({
  discountCodeIdIdx: { name: "discount_code_uses_code_idx", columns: [table.discountCodeId] },
  userIdIdx: { name: "discount_code_uses_user_idx", columns: [table.userId] },
}));

export const insertDiscountCodeUseSchema = createInsertSchema(discountCodeUses).omit({
  id: true,
  redeemedAt: true,
});

export type InsertDiscountCodeUse = z.infer<typeof insertDiscountCodeUseSchema>;
export type DiscountCodeUse = typeof discountCodeUses.$inferSelect;

// Extended type for discount code with usage stats
export interface DiscountCodeWithStats extends DiscountCode {
  totalRedemptions: number;
  totalAmountDiscounted: number;
  lastUsedAt: Date | null;
}

// Lender Inquiries - record contact requests from investors
export const lenderInquiries = pgTable("lender_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  loanProductId: varchar("loan_product_id").references(() => loanProducts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyAddress: text("property_address"),
  arv: decimal("arv", { precision: 12, scale: 2 }),
  buyPrice: decimal("buy_price", { precision: 12, scale: 2 }),
  rehabCost: decimal("rehab_cost", { precision: 12, scale: 2 }),
  projectLength: integer("project_length"),
  estProfit: decimal("est_profit", { precision: 12, scale: 2 }),
  cashOnCashRoi: decimal("cash_on_cash_roi", { precision: 8, scale: 2 }),
  annualizedRoi: decimal("annualized_roi", { precision: 8, scale: 2 }),
  estOutOfPocket: decimal("est_out_of_pocket", { precision: 12, scale: 2 }),
  projectCosts: decimal("project_costs", { precision: 12, scale: 2 }),
  costsAndCarrying: decimal("costs_and_carrying", { precision: 12, scale: 2 }),
  exitSale: decimal("exit_sale", { precision: 12, scale: 2 }),
  loanTerms: jsonb("loan_terms"),
  investorName: text("investor_name"),
  investorEmail: text("investor_email"),
  investorPhone: text("investor_phone"),
  productName: text("product_name"),
  loanType: text("loan_type"),
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  lenderIdIdx: { name: "lender_inquiries_lender_id_idx", columns: [table.lenderId] },
  userIdIdx: { name: "lender_inquiries_user_id_idx", columns: [table.userId] },
}));

export const insertLenderInquirySchema = createInsertSchema(lenderInquiries).omit({
  id: true,
  createdAt: true,
});

export type InsertLenderInquiry = z.infer<typeof insertLenderInquirySchema>;
export type LenderInquiry = typeof lenderInquiries.$inferSelect;

// Apply Clicks - tracks when investors click "Apply Now" on loan products
export const applyClicks = pgTable("apply_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lenderId: varchar("lender_id").notNull().references(() => lenders.id),
  loanProductId: varchar("loan_product_id").references(() => loanProducts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyAddress: text("property_address"),
  arv: decimal("arv", { precision: 12, scale: 2 }),
  buyPrice: decimal("buy_price", { precision: 12, scale: 2 }),
  rehabCost: decimal("rehab_cost", { precision: 12, scale: 2 }),
  estProfit: decimal("est_profit", { precision: 12, scale: 2 }),
  loanTerms: jsonb("loan_terms"),
  investorName: text("investor_name"),
  investorEmail: text("investor_email"),
  investorPhone: text("investor_phone"),
  productName: text("product_name"),
  loanType: text("loan_type"),
  referralLink: text("referral_link"),
  source: text("source").default('direct'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  lenderIdIdx: { name: "apply_clicks_lender_id_idx", columns: [table.lenderId] },
  userIdIdx: { name: "apply_clicks_user_id_idx", columns: [table.userId] },
}));

export const insertApplyClickSchema = createInsertSchema(applyClicks).omit({
  id: true,
  createdAt: true,
});

export type InsertApplyClick = z.infer<typeof insertApplyClickSchema>;
export type ApplyClick = typeof applyClicks.$inferSelect;

// Affiliates - partner programs displayed in the Toolbox
// Note: loginUsername/loginPassword store admin's credentials for external affiliate portals (admin-only access)
export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  benefits: text("benefits").array().notNull(),
  referralLink: text("referral_link").notNull(),
  portalUrl: text("portal_url"),
  loginUsername: text("login_username"),
  loginPassword: text("login_password"),
  categories: text("categories").array().notNull(),
  features: text("features").array().default([]),
  iconName: text("icon_name").notNull().default("Building2"),
  referralFee: text("referral_fee"),
  referralFeeType: text("referral_fee_type"),
  costFrom: text("cost_from"),
  costTo: text("cost_to"),
  hasFreeTrial: boolean("has_free_trial").default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  slug: text("slug").unique(),
  reportToken: text("report_token").unique(),
  notificationEmail: text("notification_email"),
  videoUrl: text("video_url"),
  detailedDescription: text("detailed_description"),
  exclusiveBenefits: text("exclusive_benefits").array().default([]),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;

// Category info for affiliates
export const affiliateCategories = pgTable("affiliate_categories", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const insertAffiliateCategorySchema = createInsertSchema(affiliateCategories);

export type InsertAffiliateCategory = z.infer<typeof insertAffiliateCategorySchema>;
export type AffiliateCategory = typeof affiliateCategories.$inferSelect;

// Site Settings - global configuration options
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

// Training Videos - educational content for the Toolbox
export const trainingVideos = pgTable("training_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  youtubeUrl: text("youtube_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrainingVideoSchema = createInsertSchema(trainingVideos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingVideo = z.infer<typeof insertTrainingVideoSchema>;
export type TrainingVideo = typeof trainingVideos.$inferSelect;

// Demo Access Tokens - for providing demo access links to potential customers/lenders
export const demoTokens = pgTable("demo_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  status: text("status").notNull().default('active'), // 'active', 'revoked', 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDemoTokenSchema = createInsertSchema(demoTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  usageCount: true,
});

export type InsertDemoToken = z.infer<typeof insertDemoTokenSchema>;
export type DemoToken = typeof demoTokens.$inferSelect;

// Integration Configurations - stores CRM credentials and settings
export const integrationConfigs = pgTable("integration_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // 'zoho', 'hubspot', etc.
  name: text("name").notNull(), // display name for this integration
  isActive: boolean("is_active").notNull().default(false),
  credentials: jsonb("credentials"), // encrypted credentials (client_id, client_secret, access_token, refresh_token)
  settings: jsonb("settings"), // provider-specific settings
  lastSyncAt: timestamp("last_sync_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIntegrationConfigSchema = createInsertSchema(integrationConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export type InsertIntegrationConfig = z.infer<typeof insertIntegrationConfigSchema>;
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;

// Integration Event Triggers - which events trigger syncs
export const integrationEventTriggers = pgTable("integration_event_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").notNull().references(() => integrationConfigs.id, { onDelete: 'cascade' }),
  eventType: text("event_type").notNull(), // 'user_signup', 'lender_signup', 'payment_success', 'usage_update'
  isEnabled: boolean("is_enabled").notNull().default(true),
  targetModule: text("target_module"), // Zoho module name like 'Contacts', 'Deals'
  settings: jsonb("settings"), // event-specific settings
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIntegrationEventTriggerSchema = createInsertSchema(integrationEventTriggers).omit({
  id: true,
  createdAt: true,
});

export type InsertIntegrationEventTrigger = z.infer<typeof insertIntegrationEventTriggerSchema>;
export type IntegrationEventTrigger = typeof integrationEventTriggers.$inferSelect;

// Integration Field Mappings - map platform fields to CRM fields
export const integrationFieldMappings = pgTable("integration_field_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").notNull().references(() => integrationConfigs.id, { onDelete: 'cascade' }),
  eventType: text("event_type").notNull(), // which event this mapping applies to
  sourceField: text("source_field").notNull(), // RE Data Metrix field (or 'FIXED_VALUE' for fixed mappings)
  targetField: text("target_field").notNull(), // CRM field
  transformType: text("transform_type"), // 'none', 'date_format', 'currency_cents', 'subscription_to_type', etc.
  fixedValue: text("fixed_value"), // static value to use when sourceField is 'FIXED_VALUE'
  isRequired: boolean("is_required").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIntegrationFieldMappingSchema = createInsertSchema(integrationFieldMappings).omit({
  id: true,
  createdAt: true,
});

export type InsertIntegrationFieldMapping = z.infer<typeof insertIntegrationFieldMappingSchema>;
export type IntegrationFieldMapping = typeof integrationFieldMappings.$inferSelect;

// Integration Webhooks - inbound API endpoints for external systems
export const integrationWebhooks = pgTable("integration_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => integrationConfigs.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  endpoint: varchar("endpoint").notNull().unique(), // unique URL path segment
  secretToken: varchar("secret_token").notNull(), // for authenticating incoming requests
  isActive: boolean("is_active").notNull().default(true),
  allowedActions: text("allowed_actions").array(), // what actions this webhook can trigger
  lastCalledAt: timestamp("last_called_at"),
  callCount: integer("call_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIntegrationWebhookSchema = createInsertSchema(integrationWebhooks).omit({
  id: true,
  createdAt: true,
  lastCalledAt: true,
  callCount: true,
});

export type InsertIntegrationWebhook = z.infer<typeof insertIntegrationWebhookSchema>;
export type IntegrationWebhook = typeof integrationWebhooks.$inferSelect;

// Outbound Webhooks - send data to external endpoints
export const outboundWebhooks = pgTable("outbound_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => integrationConfigs.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  targetUrl: text("target_url").notNull(),
  httpMethod: text("http_method").notNull().default('POST'),
  eventTypes: text("event_types").array(), // which events trigger this webhook
  headers: jsonb("headers"), // custom headers to send
  isActive: boolean("is_active").notNull().default(true),
  retryCount: integer("retry_count").notNull().default(3),
  lastTriggeredAt: timestamp("last_triggered_at"),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOutboundWebhookSchema = createInsertSchema(outboundWebhooks).omit({
  id: true,
  createdAt: true,
  lastTriggeredAt: true,
  successCount: true,
  failureCount: true,
});

export type InsertOutboundWebhook = z.infer<typeof insertOutboundWebhookSchema>;
export type OutboundWebhook = typeof outboundWebhooks.$inferSelect;

// Integration Sync Logs - history of sync operations
export const integrationSyncLogs = pgTable("integration_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id").references(() => integrationConfigs.id, { onDelete: 'cascade' }),
  eventType: text("event_type").notNull(),
  status: text("status").notNull(), // 'success', 'failed', 'pending'
  direction: text("direction").notNull(), // 'outbound' or 'inbound'
  recordId: varchar("record_id"), // the ID of the record that was synced
  requestData: jsonb("request_data"), // what was sent
  responseData: jsonb("response_data"), // what was received
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIntegrationSyncLogSchema = createInsertSchema(integrationSyncLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertIntegrationSyncLog = z.infer<typeof insertIntegrationSyncLogSchema>;
export type IntegrationSyncLog = typeof integrationSyncLogs.$inferSelect;

// Property Cache - caches Zillow/HasData API responses to reduce API calls and share results across users
// Unique key: (normalized_address, cache_type) — one row per address per data type
export const propertyCache = pgTable("property_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  normalizedAddress: text("normalized_address").notNull(), // canonical lowercase key
  cacheType: text("cache_type").notNull(), // 'property_details' | 'street_view'
  zpid: text("zpid"), // Zillow property ID — secondary lookup key, nullable
  street: text("street"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  payload: jsonb("payload").notNull(), // full API response data
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // cache TTL
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  normalizedAddressCacheTypeUnique: uniqueIndex("property_cache_addr_type_unique").on(table.normalizedAddress, table.cacheType),
}));

export const insertPropertyCacheSchema = createInsertSchema(propertyCache).omit({
  id: true,
  createdAt: true,
  hitCount: true,
});

export type InsertPropertyCache = z.infer<typeof insertPropertyCacheSchema>;
export type PropertyCache = typeof propertyCache.$inferSelect;

// Comp Cache - caches comp search results by address + radius + date range (24h TTL)
export const compCache = pgTable("comp_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheKey: text("cache_key").notNull().unique(), // "normalized_address|radiusMiles|dateRangeDays"
  normalizedAddress: text("normalized_address").notNull(),
  radiusMiles: numeric("radius_miles").notNull(),
  dateRangeDays: integer("date_range_days").notNull(),
  comps: jsonb("comps").notNull(), // array of HybridCompResult
  radiusExpanded: boolean("radius_expanded").notNull().default(false),
  actualRadiusMiles: numeric("actual_radius_miles").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompCacheSchema = createInsertSchema(compCache).omit({
  id: true,
  createdAt: true,
  hitCount: true,
});

export type InsertCompCache = z.infer<typeof insertCompCacheSchema>;
export type CompCache = typeof compCache.$inferSelect;

// Service Regions - geographic areas for contractor coverage
export const serviceRegions = pgTable("service_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  state: text("state").notNull(), // e.g., "GA", "FL"
  name: text("name").notNull(), // e.g., "Atlanta Metro", "North Georgia Mountains"
  keyCities: text("key_cities").array().notNull(), // Cities shown in tooltip
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceRegionSchema = createInsertSchema(serviceRegions).omit({
  id: true,
  createdAt: true,
});

export type InsertServiceRegion = z.infer<typeof insertServiceRegionSchema>;
export type ServiceRegion = typeof serviceRegions.$inferSelect;

// Contractors - general contractors with service area coverage
export const contractors = pgTable("contractors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyName: text("company_name"),
  phone: text("phone"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  website: text("website"),
  description: text("description"),
  specialties: text("specialties").array().default([]), // e.g., ["Rehabs", "New Construction", "Renovations"]
  licenseNumber: text("license_number"),
  licenseNumbers: jsonb("license_numbers").default({}), // Per-state license numbers e.g., {"GA": "GC-12345", "FL": "FL-98765"}
  licensedStates: text("licensed_states").array().default([]), // States where contractor is licensed (e.g., ["GA", "AL"])
  isInsured: boolean("is_insured").default(false),
  isBonded: boolean("is_bonded").default(false),
  referralLink: text("referral_link"),
  generatedReferralCode: varchar("generated_referral_code").unique(),
  referralClickCount: integer("referral_click_count").default(0),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  inviteToken: varchar("invite_token").unique(),
  inviteExpiry: timestamp("invite_expiry"),
  inviteAccepted: boolean("invite_accepted").default(false),
  passwordResetToken: varchar("password_reset_token").unique(),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  agreementSignedAt: timestamp("agreement_signed_at"),
  agreementSignerName: text("agreement_signer_name"),
  agreementSignerTitle: text("agreement_signer_title"),
  agreementSignerIp: text("agreement_signer_ip"),
  agreementVersion: text("agreement_version"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  password: true,
  inviteToken: true,
  inviteExpiry: true,
  inviteAccepted: true,
  passwordResetToken: true,
  passwordResetExpiry: true,
  generatedReferralCode: true,
  referralClickCount: true,
  agreementSignedAt: true,
  agreementSignerName: true,
  agreementSignerTitle: true,
  agreementSignerIp: true,
  agreementVersion: true,
});

export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractors.$inferSelect;

// Contractor Service Regions - junction table linking contractors to their service areas
export const contractorServiceRegions = pgTable("contractor_service_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: varchar("contractor_id").notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  serviceRegionId: varchar("service_region_id").notNull().references(() => serviceRegions.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContractorServiceRegionSchema = createInsertSchema(contractorServiceRegions).omit({
  id: true,
  createdAt: true,
});

export type InsertContractorServiceRegion = z.infer<typeof insertContractorServiceRegionSchema>;
export type ContractorServiceRegion = typeof contractorServiceRegions.$inferSelect;

// Promo Codes - for webinar soft launch and other promotional campaigns
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(), // e.g., "Webinar Soft Launch January 2026"
  description: text("description"),
  type: text("type").notNull().default('subscription'), // 'subscription', 'discount', etc.
  durationMonths: integer("duration_months").notNull().default(6), // How long the free access lasts
  maxRedemptions: integer("max_redemptions"), // null = unlimited, or e.g., 100
  currentRedemptions: integer("current_redemptions").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  currentRedemptions: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// Promo Redemptions - tracks who redeemed which promo code
export const promoRedemptions = pgTable("promo_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: varchar("promo_code_id").notNull().references(() => promoCodes.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  activatedAt: timestamp("activated_at").notNull().defaultNow(), // When the promo was activated
  expiresAt: timestamp("expires_at").notNull(), // When the free access ends (calculated from activatedAt + durationMonths)
  status: text("status").notNull().default('active'), // 'active', 'expired', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromoRedemptionSchema = createInsertSchema(promoRedemptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPromoRedemption = z.infer<typeof insertPromoRedemptionSchema>;
export type PromoRedemption = typeof promoRedemptions.$inferSelect;

// Promo Waitlist - for users who want a promo code but the cap has been reached
export const promoWaitlist = pgTable("promo_waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: varchar("promo_code_id").notNull().references(() => promoCodes.id),
  userId: varchar("user_id").references(() => users.id), // Optional - if they already have an account
  email: text("email").notNull(),
  name: text("name"),
  position: integer("position").notNull(), // Their position in line (first-come, first-served)
  status: text("status").notNull().default('waiting'), // 'waiting', 'notified', 'converted', 'expired'
  notifiedAt: timestamp("notified_at"),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromoWaitlistSchema = createInsertSchema(promoWaitlist).omit({
  id: true,
  position: true,
  notifiedAt: true,
  convertedAt: true,
  createdAt: true,
});

export type InsertPromoWaitlist = z.infer<typeof insertPromoWaitlistSchema>;
export type PromoWaitlist = typeof promoWaitlist.$inferSelect;

// API Usage Logs - tracks API calls per user with cost
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Can be null for anonymous requests
  endpoint: text("endpoint").notNull(), // e.g., '/api/property/lookup', '/api/comps/search'
  apiProvider: text("api_provider").notNull(), // 'rentcast', 'hasdata', etc.
  apiEndpoint: text("api_endpoint"), // The external API endpoint called
  requestPayload: jsonb("request_payload"), // What was sent (sanitized)
  responseStatus: integer("response_status"), // HTTP status code
  costCents: integer("cost_cents").notNull().default(0), // Cost in cents
  durationMs: integer("duration_ms"), // How long the call took
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

// Referral Partners - tracks partners who can refer webinar signups
export const referralPartners = pgTable("referral_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Partner's name (e.g., "Sakira")
  slug: text("slug").notNull().unique(), // URL slug (e.g., "sakira" for ?ref=sakira)
  email: text("email"), // Partner's email for contact
  promoCode: text("promo_code"), // Their unique promo code (e.g., "PARTNER2026")
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReferralPartnerSchema = createInsertSchema(referralPartners).omit({
  id: true,
  createdAt: true,
});

export type InsertReferralPartner = z.infer<typeof insertReferralPartnerSchema>;
export type ReferralPartner = typeof referralPartners.$inferSelect;

// Webinar Registrations - stores registrations from webinar landing page
export const webinarRegistrations = pgTable("webinar_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  webinarId: text("webinar_id").notNull().default('soft-launch-2026'), // Identifier for which webinar
  webinarDate: timestamp("webinar_date"), // The date/time of the webinar they registered for
  source: text("source"), // Where they came from (utm_source, etc.)
  referralSource: text("referral_source"), // Referral partner slug (e.g., "sakira")
  registeredAt: timestamp("registered_at").defaultNow(),
  // RSVP tracking
  rsvpStatus: text("rsvp_status").default('pending'), // pending, confirmed, declined
  rsvpUpdatedAt: timestamp("rsvp_updated_at"),
  // Attendance tracking
  attended: boolean("attended"), // Did they actually attend the webinar? null = unmarked
  attendanceMarkedAt: timestamp("attendance_marked_at"), // When attendance was marked
  // Subscription activation tracking
  subscriptionLevel: text("subscription_level"), // 'free', 'monthly', 'annual', 'beta_free', 'comped'
  // Email tracking
  confirmationSentAt: timestamp("confirmation_sent_at"),
  dayBeforeReminderSentAt: timestamp("day_before_reminder_sent_at"),
  finalReminderSentAt: timestamp("final_reminder_sent_at"),
  postWebinarEmailSentAt: timestamp("post_webinar_email_sent_at"), // Promo code or next date email
});

export const insertWebinarRegistrationSchema = createInsertSchema(webinarRegistrations).omit({
  id: true,
  registeredAt: true,
  rsvpStatus: true,
  rsvpUpdatedAt: true,
  attended: true,
  attendanceMarkedAt: true,
  confirmationSentAt: true,
  dayBeforeReminderSentAt: true,
  finalReminderSentAt: true,
  postWebinarEmailSentAt: true,
});

export type InsertWebinarRegistration = z.infer<typeof insertWebinarRegistrationSchema>;
export type WebinarRegistration = typeof webinarRegistrations.$inferSelect;

// Zoho OAuth tokens for meeting API integration
export const zohoTokens = pgTable("zoho_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertZohoTokenSchema = createInsertSchema(zohoTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertZohoToken = z.infer<typeof insertZohoTokenSchema>;
export type ZohoToken = typeof zohoTokens.$inferSelect;

// Marketing pixels for tracking (Meta, LinkedIn, Google, TikTok, etc.)
export const marketingPixels = pgTable("marketing_pixels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // 'meta', 'linkedin', 'google', 'tiktok', 'twitter'
  pixelId: text("pixel_id").notNull(),
  capiAccessToken: text("capi_access_token"), // Meta Conversions API server-side token (Meta only)
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketingPixelSchema = createInsertSchema(marketingPixels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMarketingPixel = z.infer<typeof insertMarketingPixelSchema>;
export type MarketingPixel = typeof marketingPixels.$inferSelect;

export const contractorDocuments = pgTable("contractor_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: varchar("contractor_id").notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  fileName: text("file_name").notNull(),
  fileData: text("file_data").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  contractorIdIdx: { name: "contractor_documents_contractor_id_idx", columns: [table.contractorId] },
  userIdIdx: { name: "contractor_documents_user_id_idx", columns: [table.userId] },
}));

export const insertContractorDocumentSchema = createInsertSchema(contractorDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertContractorDocument = z.infer<typeof insertContractorDocumentSchema>;
export type ContractorDocument = typeof contractorDocuments.$inferSelect;

export const featureFeedback = pgTable("feature_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  featureName: text("feature_name").notNull(),
  priorities: text("priorities").array(),
  comments: text("comments"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeatureFeedbackSchema = createInsertSchema(featureFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertFeatureFeedback = z.infer<typeof insertFeatureFeedbackSchema>;
export type FeatureFeedback = typeof featureFeedback.$inferSelect;

export const sentReminders = pgTable("sent_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull(),
  daysUntilClosing: integer("days_until_closing").notNull(),
  sentDate: text("sent_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sentSignupFollowups = pgTable("sent_signup_followups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  emailType: text("email_type").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
}, (table) => ({
  userEmailTypeUnique: { name: "sent_signup_followups_user_email_type_unique", columns: [table.userId, table.emailType], unique: true },
}));

export const emailSenderAliases = pgTable("email_sender_aliases", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailSenderAliasSchema = createInsertSchema(emailSenderAliases).omit({
  id: true,
  createdAt: true,
  isDefault: true,
});
export type InsertEmailSenderAlias = z.infer<typeof insertEmailSenderAliasSchema>;
export type EmailSenderAlias = typeof emailSenderAliases.$inferSelect;

export const emailCategorySettings = pgTable("email_category_settings", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().unique(), // 'transactional' | 'support' | 'webinar' | 'marketing' | 'lender'
  aliasId: integer("alias_id").references(() => emailSenderAliases.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EmailCategorySettings = typeof emailCategorySettings.$inferSelect;

export const userSubmissions = pgTable("user_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userEmail: text("user_email"),
  type: text("type").notNull(), // 'issue' | 'feature'
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default('open'), // 'open' | 'resolved'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSubmissionSchema = createInsertSchema(userSubmissions).omit({
  id: true,
  createdAt: true,
  status: true,
});
export type InsertUserSubmission = z.infer<typeof insertUserSubmissionSchema>;
export type UserSubmission = typeof userSubmissions.$inferSelect;

export const reportingSnapshots = pgTable("reporting_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStart: date("week_start").notNull(),

  // Traffic
  totalVisitors: integer("total_visitors").default(0),
  directVisitors: integer("direct_visitors").default(0),
  paidVisitors: integer("paid_visitors").default(0),
  paidSocialVisitors: integer("paid_social_visitors").default(0),
  organicVisitors: integer("organic_visitors").default(0),
  socialVisitors: integer("social_visitors").default(0),
  referralVisitors: integer("referral_visitors").default(0),

  // Funnel
  signupFreeInitiated: integer("signup_free_initiated").default(0),
  signupFreeConfirmed: integer("signup_free_confirmed").default(0),
  signupPaidInitiated: integer("signup_paid_initiated").default(0),
  signupPaidComplete: integer("signup_paid_complete").default(0),
  signupPaidConfirmed: integer("signup_paid_confirmed").default(0),
  loginSuccess: integer("login_success").default(0),
  loginSuccessUsers: integer("login_success_users").default(0),

  // Engagement
  dealAnalysisVisited: integer("deal_analysis_visited").default(0),
  dealAnalysisVisitedUsers: integer("deal_analysis_visited_users").default(0),
  dealAnalysisSubmitted: integer("deal_analysis_submitted").default(0),
  dealAnalysisSubmittedUsers: integer("deal_analysis_submitted_users").default(0),
  lendersVisited: integer("lenders_visited").default(0),
  lendersVisitedUsers: integer("lenders_visited_users").default(0),
  toolboxVisited: integer("toolbox_visited").default(0),
  toolboxVisitedUsers: integer("toolbox_visited_users").default(0),
  pricingCtaClicked: integer("pricing_cta_clicked").default(0),
  pricingCtaClickedUsers: integer("pricing_cta_clicked_users").default(0),

  // Ad Spend — Meta
  metaSpend: integer("meta_spend").default(0),
  metaClicks: integer("meta_clicks").default(0),
  metaImpressions: integer("meta_impressions").default(0),
  metaConversions: integer("meta_conversions").default(0),
  // Ad Spend — Google
  googleSpend: integer("google_spend").default(0),
  googleClicks: integer("google_clicks").default(0),
  googleImpressions: integer("google_impressions").default(0),
  googleConversions: integer("google_conversions").default(0),
  googleAvgCpc: integer("google_avg_cpc").default(0),
  googleCtr: integer("google_ctr").default(0),
  googleCostPerConv: integer("google_cost_per_conv").default(0),

  // SEO
  organicImpressions: integer("organic_impressions").default(0),
  organicClicks: integer("organic_clicks").default(0),
  avgPosition: integer("avg_position").default(0),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReportingSnapshotSchema = createInsertSchema(reportingSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReportingSnapshot = z.infer<typeof insertReportingSnapshotSchema>;
export type ReportingSnapshot = typeof reportingSnapshots.$inferSelect;
