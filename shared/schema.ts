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
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsVersion: text("terms_version"),
  privacyVersion: text("privacy_version"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionPlan: text("subscription_plan"), // 'free', 'monthly', 'annual'
  pendingPlan: text("pending_plan"),
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

// Pending registrations - stores registration data before Stripe payment completes
export const pendingRegistrations = pgTable("pending_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
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

export const loanTypeEnum = ['bridge', 'dscr-purchase', 'dscr-refi', 'new-construction', 'transactional-funding'] as const;
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
  sourceField: text("source_field").notNull(), // RE Data Metrix field
  targetField: text("target_field").notNull(), // CRM field
  transformType: text("transform_type"), // 'none', 'date_format', 'currency_cents', etc.
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

// Property Cache - caches Zillow/HasData API responses to reduce API calls
export const propertyCache = pgTable("property_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  normalizedAddress: text("normalized_address").notNull().unique(), // lowercase, trimmed address for matching
  street: text("street"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  provider: text("provider").notNull().default('hasdata'), // 'hasdata', 'rentcast', etc.
  payload: jsonb("payload").notNull(), // full API response data
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // cache TTL
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPropertyCacheSchema = createInsertSchema(propertyCache).omit({
  id: true,
  createdAt: true,
  hitCount: true,
});

export type InsertPropertyCache = z.infer<typeof insertPropertyCacheSchema>;
export type PropertyCache = typeof propertyCache.$inferSelect;

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
  licensedStates: text("licensed_states").array().default([]), // States where contractor is licensed (e.g., ["GA", "AL"])
  isInsured: boolean("is_insured").default(false),
  isBonded: boolean("is_bonded").default(false),
  referralLink: text("referral_link"), // Affiliate link if applicable
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  inviteToken: varchar("invite_token").unique(),
  inviteExpiry: timestamp("invite_expiry"),
  inviteAccepted: boolean("invite_accepted").default(false),
  passwordResetToken: varchar("password_reset_token").unique(),
  passwordResetExpiry: timestamp("password_reset_expiry"),
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
