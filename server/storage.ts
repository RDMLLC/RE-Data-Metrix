import crypto from "crypto";
import { 
  type User, 
  type InsertUser,
  type Lender,
  type InsertLender,
  type LenderQuestionnaire,
  type InsertLenderQuestionnaire,
  type LoanProduct,
  type InsertLoanProduct,
  type Property,
  type InsertProperty,
  type DealAnalysis,
  type InsertDealAnalysis,
  type DealAnalysisAccess,
  type InsertDealAnalysisAccess,
  type LenderReferral,
  type InsertLenderReferral,
  type AffiliateClick,
  type InsertAffiliateClick,
  type CompInvite,
  type DiscountCode,
  type DiscountCodeUse,
  type Affiliate,
  type InsertAffiliate,
  type AffiliateCategory,
  type InsertAffiliateCategory,
  type SiteSetting,
  type InsertSiteSetting,
  type TrainingVideo,
  type InsertTrainingVideo,
  type DemoToken,
  type InsertDemoToken,
  type IntegrationConfig,
  type InsertIntegrationConfig,
  type IntegrationEventTrigger,
  type InsertIntegrationEventTrigger,
  type IntegrationFieldMapping,
  type InsertIntegrationFieldMapping,
  type IntegrationWebhook,
  type InsertIntegrationWebhook,
  type OutboundWebhook,
  type InsertOutboundWebhook,
  type IntegrationSyncLog,
  type InsertIntegrationSyncLog,
  type PropertyCache,
  type InsertPropertyCache,
  type ServiceRegion,
  type InsertServiceRegion,
  type Contractor,
  type InsertContractor,
  type ContractorServiceRegion,
  type InsertContractorServiceRegion,
  users as usersTable,
  lenders as lendersTable,
  lenderQuestionnaires as lenderQuestionnairesTable,
  loanProducts as loanProductsTable,
  properties as propertiesTable,
  dealAnalyses as dealAnalysesTable,
  dealAnalysisAccess as dealAnalysisAccessTable,
  lenderReferrals as lenderReferralsTable,
  savedDeals as savedDealsTable,
  savedLenders as savedLendersTable,
  affiliateClicks as affiliateClicksTable,
  compInvites as compInvitesTable,
  discountCodes as discountCodesTable,
  discountCodeUses as discountCodeUsesTable,
  affiliates as affiliatesTable,
  affiliateCategories as affiliateCategoriesTable,
  siteSettings as siteSettingsTable,
  trainingVideos as trainingVideosTable,
  demoTokens as demoTokensTable,
  integrationConfigs as integrationConfigsTable,
  integrationEventTriggers as integrationEventTriggersTable,
  integrationFieldMappings as integrationFieldMappingsTable,
  integrationWebhooks as integrationWebhooksTable,
  outboundWebhooks as outboundWebhooksTable,
  integrationSyncLogs as integrationSyncLogsTable,
  propertyCache as propertyCacheTable,
  userUsageCounters as userUsageCountersTable,
  serviceRegions as serviceRegionsTable,
  contractors as contractorsTable,
  contractorServiceRegions as contractorServiceRegionsTable,
  webinarRegistrations as webinarRegistrationsTable,
  type WebinarRegistration,
  type InsertWebinarRegistration,
  referralPartners as referralPartnersTable,
  type ReferralPartner,
  type InsertReferralPartner,
  marketingPixels as marketingPixelsTable,
  type MarketingPixel,
  type InsertMarketingPixel,
  promoCodes as promoCodesTable,
  type PromoCode,
  auditorInvites as auditorInvitesTable,
  type AuditorInvite
} from "@shared/schema";
import { randomBytes, randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gt, desc, sql, sql as sqlCount, count } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLender(id: string): Promise<Lender | undefined>;
  getLenderByEmail(email: string): Promise<Lender | undefined>;
  getLenderByUsername(username: string): Promise<Lender | undefined>;
  createLenderInvite(username: string, password: string, companyName: string, referralAmount: number, referralType: string): Promise<{token: string, lender: Lender, isNewInvite: boolean}>;
  validateLenderInvite(token: string): Promise<Lender | undefined>;
  completeLenderSignup(lenderId: string, password: string, contactName: string, phone?: string, companyName?: string): Promise<Lender>;
  
  updateLenderCompanyInfo(data: any): Promise<any>;
  getLenderCompanyInfo(lenderId: string): Promise<any>;
  
  upsertLenderQuestionnaire(data: InsertLenderQuestionnaire): Promise<LenderQuestionnaire>;
  getLenderQuestionnaire(lenderId: string): Promise<LenderQuestionnaire | undefined>;
  getAllLenderQuestionnaires(): Promise<LenderQuestionnaire[]>;
  searchLenders(criteria: any): Promise<any[]>;
  
  createLoanProduct(data: InsertLoanProduct): Promise<LoanProduct>;
  getLoanProducts(lenderId: string): Promise<LoanProduct[]>;
  getAllActiveLoanProducts(): Promise<LoanProduct[]>;
  getAllLenders(): Promise<any[]>;
  updateLoanProduct(id: string, data: Partial<InsertLoanProduct>): Promise<LoanProduct | undefined>;
  deleteLoanProduct(id: string): Promise<boolean>;
  bulkCreateLoanProducts(lenderId: string, products: Omit<InsertLoanProduct, 'lenderId'>[]): Promise<LoanProduct[]>;
  
  createOrGetProperty(data: InsertProperty): Promise<Property>;
  getPropertyById(id: string): Promise<Property | undefined>;
  
  createDealAnalysis(data: InsertDealAnalysis): Promise<DealAnalysis>;
  getDealAnalysis(id: string): Promise<DealAnalysis | undefined>;
  updateDealAnalysis(id: string, data: Partial<Omit<InsertDealAnalysis, 'propertyId' | 'propertySnapshot'>>): Promise<DealAnalysis | undefined>;
  deleteDealAnalysis(id: string): Promise<boolean>;
  getDealAnalysesByUser(userId: string): Promise<DealAnalysis[]>;
  
  createAccessToken(analysisId: string, expiresAt?: Date): Promise<DealAnalysisAccess>;
  getDealAnalysisByToken(token: string): Promise<DealAnalysis | undefined>;
  revokeAccessToken(token: string): Promise<boolean>;
  
  createLenderReferral(data: InsertLenderReferral): Promise<LenderReferral>;
  getLenderReferrals(lenderId: string): Promise<Array<LenderReferral & {investorName?: string, propertyAddress?: string}>>;
  
  getAllLendersWithReferralCounts(): Promise<Array<Lender & {referralCount: number, loanProductCount: number}>>;
  deleteLender(id: string): Promise<boolean>;
  archiveLender(id: string): Promise<Lender | undefined>;
  getLenderReferralCount(lenderId: string): Promise<number>;
  
  // Admin Reports
  getAllLenderReferralsForAdmin(): Promise<Array<{
    id: string;
    lenderId: string;
    lenderName: string;
    userId: string | null;
    investorName: string | null;
    investorEmail: string | null;
    referralType: string;
    savedDealId: string | null;
    propertyAddress: string | null;
    createdAt: Date | null;
  }>>;
  getAdminDashboardStats(): Promise<{
    totalUsers: number;
    activeSubscribers: number;
    totalLenders: number;
    activeLenders: number;
    totalReferrals: number;
    totalDealsAnalyzed: number;
  }>;
  getAllUsers(): Promise<Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    subscriptionStatus: string;
    createdAt: Date | null;
    isEmailVerified: boolean;
  }>>;
  
  // Affiliate Clicks
  trackAffiliateClick(data: {
    userId: string | null;
    affiliateId: string;
    affiliateName: string;
    category: string;
    source?: string;
    referrer?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
  getAffiliateClicksForAdmin(): Promise<Array<{
    id: string;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    affiliateId: string;
    affiliateName: string;
    category: string;
    source: string | null;
    referrer: string | null;
    createdAt: Date | null;
  }>>;
  getAffiliateClickStats(): Promise<Array<{
    affiliateId: string;
    affiliateName: string;
    totalClicks: number;
    uniqueUsers: number;
  }>>;
  
  // Affiliate Management
  getAllAffiliates(): Promise<Affiliate[]>;
  getActiveAffiliates(): Promise<Affiliate[]>;
  getAffiliateById(id: string): Promise<Affiliate | undefined>;
  getAffiliateBySlug(slug: string): Promise<Affiliate | undefined>;
  getAffiliateByReportToken(token: string): Promise<Affiliate | undefined>;
  createAffiliate(data: InsertAffiliate): Promise<Affiliate>;
  updateAffiliate(id: string, data: Partial<InsertAffiliate>): Promise<Affiliate | undefined>;
  deleteAffiliate(id: string): Promise<boolean>;
  generateAffiliateReportToken(id: string): Promise<string>;
  getAffiliateClicksForAffiliate(affiliateId: string): Promise<Array<{
    id: string;
    source: string | null;
    referrer: string | null;
    createdAt: Date | null;
  }>>;
  getAllAffiliateCategories(): Promise<AffiliateCategory[]>;
  upsertAffiliateCategory(data: InsertAffiliateCategory): Promise<AffiliateCategory>;
  deleteAffiliateCategory(id: string): Promise<boolean>;
  
  // Site Settings
  getSiteSetting(key: string): Promise<string | null>;
  setSiteSetting(key: string, value: string): Promise<SiteSetting>;
  
  // Service Regions
  getAllServiceRegions(): Promise<ServiceRegion[]>;
  getServiceRegionsByState(state: string): Promise<ServiceRegion[]>;
  getServiceRegionById(id: string): Promise<ServiceRegion | undefined>;
  createServiceRegion(data: InsertServiceRegion): Promise<ServiceRegion>;
  updateServiceRegion(id: string, data: Partial<InsertServiceRegion>): Promise<ServiceRegion | undefined>;
  deleteServiceRegion(id: string): Promise<boolean>;
  
  // Contractors
  getAllContractors(): Promise<Contractor[]>;
  getActiveContractors(): Promise<Contractor[]>;
  getContractorById(id: string): Promise<Contractor | undefined>;
  getContractorsByRegion(regionId: string): Promise<Contractor[]>;
  createContractor(data: InsertContractor): Promise<Contractor>;
  updateContractor(id: string, data: Partial<InsertContractor>): Promise<Contractor | undefined>;
  deleteContractor(id: string): Promise<boolean>;
  
  // Contractor Service Regions
  getContractorServiceRegions(contractorId: string): Promise<ServiceRegion[]>;
  setContractorServiceRegions(contractorId: string, regionIds: string[]): Promise<void>;
  
  // Contractor Invitation
  createContractorInvite(email: string, companyName: string): Promise<{token: string, contractor: Contractor, isNewInvite: boolean}>;
  validateContractorInvite(token: string): Promise<Contractor | undefined>;
  completeContractorSignup(contractorId: string, data: {
    password: string;
    name: string;
    companyName?: string;
    phone?: string;
    website?: string;
    description?: string;
    specialties?: string[];
    licenseNumber?: string;
    licenseNumbers?: Record<string, string>;
    licensedStates?: string[];
    isInsured?: boolean;
    isBonded?: boolean;
    serviceRegionIds: string[];
  }): Promise<Contractor>;
  getContractorByEmail(email: string): Promise<Contractor | undefined>;
  
  // Training Videos
  getAllTrainingVideos(): Promise<TrainingVideo[]>;
  getActiveTrainingVideos(): Promise<TrainingVideo[]>;
  getTrainingVideoById(id: string): Promise<TrainingVideo | undefined>;
  createTrainingVideo(data: InsertTrainingVideo): Promise<TrainingVideo>;
  updateTrainingVideo(id: string, data: Partial<InsertTrainingVideo>): Promise<TrainingVideo | undefined>;
  deleteTrainingVideo(id: string): Promise<boolean>;
  
  // Deal Analysis Reports
  getDealAnalysisStats(): Promise<{
    totalDeals: number;
    averageArv: number;
    averageRoi: number;
    averageProfit: number;
    statusCounts: Record<string, number>;
    dealsThisMonth: number;
    dealsThisWeek: number;
  }>;
  getAllDealsForAdmin(): Promise<Array<{
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    propertyAddress: string | null;
    arv: string | null;
    roi: string | null;
    profit: string | null;
    status: string;
    createdAt: Date | null;
  }>>;
  
  // Lender Performance Reports
  getLenderPerformanceStats(): Promise<Array<{
    lenderId: string;
    lenderName: string;
    referralCount: number;
    savedCount: number;
    wonDealsCount: number;
    wonDealsValue: number;
    isActive: boolean;
  }>>;
  
  // Platform Usage Reports
  getPlatformUsageStats(): Promise<{
    activeUsersLast30Days: number;
    activeUsersLast7Days: number;
    totalDeals: number;
    totalSavedLenders: number;
    totalReferrals: number;
    totalAffiliateClicks: number;
    dealsByMonth: Array<{month: string; count: number}>;
  }>;
  
  // Revenue/Subscription Reports
  getSubscriptionStats(): Promise<{
    byStatus: Record<string, number>;
    totalActive: number;
    totalReferralTrial: number;
    totalComped: number;
    totalInactive: number;
    usersByMonth: Array<{month: string; count: number}>;
    referralConversions: number;
  }>;
  
  // New Construction Lenders
  getNewConstructionLenders(state: string): Promise<Array<{
    lenderId: string;
    companyName: string;
    referralAmount: string;
    referralType: string;
    referralLink: string | null;
    isPreferred: boolean;
    productId: string;
    productName: string;
    productReferralLink: string | null;
  }>>;
  
  // Admin: Update lender preferred status
  updateLenderPreferredStatus(lenderId: string, isPreferred: boolean): Promise<Lender | undefined>;
  
  // Comp Invites for beta testers
  createCompInvite(email: string, invitedById: string, expiresInDays?: number): Promise<{compCode: string; email: string; expiresAt: Date}>;
  getCompInviteByCode(compCode: string): Promise<{id: string; email: string; status: string; expiresAt: Date} | undefined>;
  acceptCompInvite(compCode: string, userId: string): Promise<boolean>;
  getAllCompInvites(): Promise<Array<{
    id: string;
    email: string;
    compCode: string;
    status: string;
    invitedByEmail: string | null;
    acceptedByEmail: string | null;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date | null;
  }>>;
  resendCompInvite(id: string): Promise<{compCode: string; email: string; expiresAt: Date} | undefined>;
  deleteCompInvite(id: string): Promise<boolean>;
  
  // Auditor Invites
  createAuditorInvite(email: string, invitedById: string, companyName?: string, expiresInDays?: number): Promise<{inviteCode: string; email: string; expiresAt: Date}>;
  getAuditorInviteByCode(inviteCode: string): Promise<{id: string; email: string; companyName: string | null; status: string; expiresAt: Date} | undefined>;
  acceptAuditorInvite(inviteCode: string, userId: string): Promise<boolean>;
  getAllAuditorInvites(): Promise<Array<{
    id: string;
    email: string;
    inviteCode: string;
    companyName: string | null;
    status: string;
    invitedByEmail: string | null;
    acceptedByEmail: string | null;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date | null;
  }>>;
  resendAuditorInvite(id: string): Promise<{inviteCode: string; email: string; expiresAt: Date} | undefined>;
  deleteAuditorInvite(id: string): Promise<boolean>;
  
  // Discount Codes
  createDiscountCode(data: {
    code: string;
    displayName: string;
    partnerName?: string;
    description?: string;
    planApplicability: 'monthly' | 'annual' | 'both';
    percentOff?: number;
    amountOff?: number;
    maxRedemptions?: number;
    startAt?: Date;
    endAt?: Date;
    isActive?: boolean;
    createdBy?: string;
  }): Promise<{
    id: string;
    code: string;
    displayName: string;
    partnerName: string | null;
    description: string | null;
    planApplicability: string;
    percentOff: string | null;
    amountOff: string | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    startAt: Date | null;
    endAt: Date | null;
    isActive: boolean;
    createdBy: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }>;
  
  getDiscountCode(id: string): Promise<{
    id: string;
    code: string;
    displayName: string;
    partnerName: string | null;
    description: string | null;
    planApplicability: string;
    percentOff: string | null;
    amountOff: string | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    startAt: Date | null;
    endAt: Date | null;
    isActive: boolean;
    createdBy: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  } | undefined>;
  
  getDiscountCodeByCode(code: string): Promise<{
    id: string;
    code: string;
    displayName: string;
    partnerName: string | null;
    description: string | null;
    planApplicability: string;
    percentOff: string | null;
    amountOff: string | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    startAt: Date | null;
    endAt: Date | null;
    isActive: boolean;
    createdBy: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  } | undefined>;
  
  getPromoCodeByCode(code: string): Promise<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: string;
    durationMonths: number;
    maxRedemptions: number | null;
    currentRedemptions: number;
    isActive: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
    createdBy: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  } | undefined>;
  
  getAllDiscountCodes(filters?: {
    search?: string;
    partnerName?: string;
    planApplicability?: string;
    isActive?: boolean;
  }): Promise<Array<{
    id: string;
    code: string;
    displayName: string;
    partnerName: string | null;
    description: string | null;
    planApplicability: string;
    percentOff: string | null;
    amountOff: string | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    startAt: Date | null;
    endAt: Date | null;
    isActive: boolean;
    createdBy: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    totalRedemptions: number;
    totalAmountDiscounted: number;
    lastUsedAt: Date | null;
  }>>;
  
  updateDiscountCode(id: string, data: {
    code?: string;
    displayName?: string;
    partnerName?: string | null;
    description?: string | null;
    planApplicability?: 'monthly' | 'annual' | 'both';
    percentOff?: number | null;
    amountOff?: number | null;
    maxRedemptions?: number | null;
    startAt?: Date | null;
    endAt?: Date | null;
    isActive?: boolean;
    stripeCouponId?: string | null;
  }): Promise<{
    id: string;
    code: string;
    displayName: string;
    partnerName: string | null;
    description: string | null;
    planApplicability: string;
    percentOff: string | null;
    amountOff: string | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    startAt: Date | null;
    endAt: Date | null;
    isActive: boolean;
    createdBy: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  } | undefined>;
  
  deleteDiscountCode(id: string): Promise<boolean>;
  
  recordDiscountCodeUse(data: {
    discountCodeId: string;
    userId?: string;
    plan: string;
    amountDiscounted: number;
  }): Promise<void>;
  
  getDiscountCodeUsage(discountCodeId: string): Promise<Array<{
    id: string;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    plan: string;
    amountDiscounted: string;
    redeemedAt: Date | null;
  }>>;
  
  getDiscountCodeStats(): Promise<{
    totalCodes: number;
    activeCodes: number;
    totalRedemptions: number;
    totalAmountDiscounted: number;
    topCodes: Array<{
      id: string;
      code: string;
      displayName: string;
      partnerName: string | null;
      redemptions: number;
      amountDiscounted: number;
    }>;
  }>;
  
  // Demo Tokens
  createDemoToken(data: Omit<InsertDemoToken, 'token'> & { createdBy: string }): Promise<DemoToken>;
  getDemoTokenByToken(token: string): Promise<DemoToken | undefined>;
  getAllDemoTokens(): Promise<DemoToken[]>;
  updateDemoToken(id: string, data: Partial<InsertDemoToken>): Promise<DemoToken | undefined>;
  revokeDemoToken(id: string): Promise<DemoToken | undefined>;
  recordDemoTokenUsage(token: string): Promise<DemoToken | undefined>;
  
  // Property Cache
  getPropertyCache(normalizedAddress: string, provider?: string): Promise<PropertyCache | undefined>;
  setPropertyCache(data: InsertPropertyCache): Promise<PropertyCache>;
  incrementPropertyCacheHit(id: string): Promise<void>;
  deleteExpiredPropertyCache(): Promise<number>;
  
  // User Usage Counters (for freemium limits)
  getUserUsageCounter(userId: string): Promise<{ propertyLookupCount: number; remainingLookups: number; wholesaleCalcCount: number; remainingWholesaleCalcs: number; pdfDownloadCount: number; remainingPdfDownloads: number; arvHelperCount: number; remainingArvHelpers: number; periodEnd: Date } | null>;
  incrementUserPropertyLookup(userId: string): Promise<{ propertyLookupCount: number; remainingLookups: number; canLookup: boolean }>;
  incrementUserWholesaleCalc(userId: string): Promise<{ wholesaleCalcCount: number; remainingWholesaleCalcs: number; canCalculate: boolean }>;
  incrementUserPdfDownload(userId: string): Promise<{ pdfDownloadCount: number; remainingPdfDownloads: number; canDownload: boolean }>;
  incrementUserArvHelper(userId: string): Promise<{ arvHelperCount: number; remainingArvHelpers: number; canUse: boolean }>;
  resetUserUsageIfExpired(userId: string): Promise<void>;
  
  // Marketing Pixels
  getAllMarketingPixels(): Promise<MarketingPixel[]>;
  getEnabledMarketingPixels(): Promise<MarketingPixel[]>;
  getMarketingPixelByPlatform(platform: string): Promise<MarketingPixel | undefined>;
  createMarketingPixel(data: InsertMarketingPixel): Promise<MarketingPixel>;
  updateMarketingPixel(id: string, data: Partial<InsertMarketingPixel>): Promise<MarketingPixel | undefined>;
  deleteMarketingPixel(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private questionnaires: Map<string, LenderQuestionnaire>;
  private loanProducts: Map<string, LoanProduct>;
  private companyInfo: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.questionnaires = new Map();
    this.loanProducts = new Map();
    this.companyInfo = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      role: insertUser.role || 'user',
      subscriptionStatus: insertUser.subscriptionStatus || 'free',
      referredBy: insertUser.referredBy || null,
      id,
      referralCode: null,
      isEmailVerified: false,
      verificationToken: null,
      verificationExpiry: null,
      passwordResetToken: null,
      passwordResetExpiry: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateLenderCompanyInfo(data: any): Promise<any> {
    const lenderId = data.lenderId;
    const existing = this.companyInfo.get(lenderId);
    
    const updated = {
      ...existing,
      ...data,
      lenderId,
    };
    
    if (data.referralAmount !== undefined && (!isFinite(data.referralAmount) || isNaN(data.referralAmount))) {
      throw new Error("Invalid referral amount");
    }
    
    this.companyInfo.set(lenderId, updated);
    
    return updated;
  }

  async getLenderCompanyInfo(lenderId: string): Promise<any> {
    const info = this.companyInfo.get(lenderId);
    
    return info;
  }

  async upsertLenderQuestionnaire(data: InsertLenderQuestionnaire): Promise<LenderQuestionnaire> {
    const existing = Array.from(this.questionnaires.values()).find(
      (q) => q.lenderId === data.lenderId
    );
    
    if (existing) {
      const updated: LenderQuestionnaire = {
        ...existing,
        ...data,
        brokerOrDirectLender: data.brokerOrDirectLender ?? existing.brokerOrDirectLender ?? null,
        fastestClosingTime: data.fastestClosingTime ?? existing.fastestClosingTime ?? null,
        offerNonTraditionalLending: data.offerNonTraditionalLending ?? existing.offerNonTraditionalLending ?? false,
        workWithNewInvestors: data.workWithNewInvestors ?? existing.workWithNewInvestors ?? false,
        minCreditScore: data.minCreditScore ?? existing.minCreditScore ?? null,
        offerDeferredPayment: data.offerDeferredPayment ?? existing.offerDeferredPayment ?? false,
        offerRolledPoints: data.offerRolledPoints ?? existing.offerRolledPoints ?? false,
        offer100PercentFunding: data.offer100PercentFunding ?? existing.offer100PercentFunding ?? false,
        offerLoansAllStates: data.offerLoansAllStates ?? existing.offerLoansAllStates ?? null,
        statesServiced: data.statesServiced ?? existing.statesServiced ?? null,
        loanTypes: data.loanTypes ?? existing.loanTypes ?? null,
        updatedAt: new Date(),
      };
      this.questionnaires.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const questionnaire: LenderQuestionnaire = {
        id,
        lenderId: data.lenderId,
        brokerOrDirectLender: data.brokerOrDirectLender ?? null,
        fastestClosingTime: data.fastestClosingTime ?? null,
        offerNonTraditionalLending: data.offerNonTraditionalLending ?? false,
        workWithNewInvestors: data.workWithNewInvestors ?? false,
        minCreditScore: data.minCreditScore ?? null,
        offerDeferredPayment: data.offerDeferredPayment ?? false,
        offerRolledPoints: data.offerRolledPoints ?? false,
        offer100PercentFunding: data.offer100PercentFunding ?? false,
        offerLoansAllStates: data.offerLoansAllStates ?? null,
        statesServiced: data.statesServiced ?? null,
        loanTypes: data.loanTypes ?? null,
        updatedAt: new Date(),
      };
      this.questionnaires.set(id, questionnaire);
      return questionnaire;
    }
  }

  async getLenderQuestionnaire(lenderId: string): Promise<LenderQuestionnaire | undefined> {
    return Array.from(this.questionnaires.values()).find(
      (q) => q.lenderId === lenderId
    );
  }

  async getAllLenderQuestionnaires(): Promise<LenderQuestionnaire[]> {
    return Array.from(this.questionnaires.values());
  }

  async searchLenders(criteria: any): Promise<any[]> {
    const questionnaires = Array.from(this.questionnaires.values());
    
    const creditScoreToNumeric = (score: string | null): number => {
      if (!score) return 0;
      switch (score) {
        case "750+": return 750;
        case "700-749": return 700;
        case "650-699": return 650;
        case "600-649": return 600;
        case "below-600": return 0;
        default: return 0;
      }
    };
    
    const toBool = (val: string): boolean => val.toLowerCase() === "yes";
    const isActive = (val: any): boolean => val && val !== "" && val !== "any";

    const stateAbbrToName: Record<string, string> = {
      AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
      CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
      HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
      KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
      MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
      MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
      NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
      OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
      SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
      VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    };

    const loanTypeMap: Record<string, string> = {
      hard_money: "hard-money",
      dscr: "dscr",
      conventional: "conventional",
      transactional: "transactional",
      portfolio: "portfolio",
      balloon: "balloon",
      interest_only: "interest-only",
      arm: "arm",
      "private-seller": "private-seller",
      new_construction: "new-construction",
      fha_va: "fha-va",
    };

    const matchingQuestionnaires = questionnaires.filter((q) => {
      if (isActive(criteria.state)) {
        if (q.offerLoansAllStates !== "Yes") {
          const states = q.statesServiced || [];
          const stateName = stateAbbrToName[criteria.state] || criteria.state;
          if (!states.includes(stateName)) {
            return false;
          }
        }
      }
      if (isActive(criteria.loanType)) {
        const loanTypes = q.loanTypes || [];
        const dbLoanType = loanTypeMap[criteria.loanType] || criteria.loanType;
        if (!loanTypes.includes(dbLoanType)) {
          return false;
        }
      }
      if (isActive(criteria.brokerOrDirectLender) &&
          q.brokerOrDirectLender !== criteria.brokerOrDirectLender) {
        return false;
      }
      if (isActive(criteria.fastestClosingTime) &&
          q.fastestClosingTime !== criteria.fastestClosingTime) {
        return false;
      }
      if (isActive(criteria.offerNonTraditionalLending) &&
          q.offerNonTraditionalLending !== toBool(criteria.offerNonTraditionalLending)) {
        return false;
      }
      if (isActive(criteria.workWithNewInvestors) &&
          q.workWithNewInvestors !== toBool(criteria.workWithNewInvestors)) {
        return false;
      }
      if (isActive(criteria.minCreditScore)) {
        const investorScore = creditScoreToNumeric(criteria.minCreditScore);
        const lenderMinScore = creditScoreToNumeric(q.minCreditScore);
        if (investorScore < lenderMinScore) {
          return false;
        }
      }
      if (isActive(criteria.offerDeferredPayment) &&
          q.offerDeferredPayment !== toBool(criteria.offerDeferredPayment)) {
        return false;
      }
      if (isActive(criteria.offerRolledPoints) &&
          q.offerRolledPoints !== toBool(criteria.offerRolledPoints)) {
        return false;
      }
      if (isActive(criteria.offer100PercentFunding) &&
          q.offer100PercentFunding !== toBool(criteria.offer100PercentFunding)) {
        return false;
      }
      if (isActive(criteria.offerMultiUnitFinancing) && toBool(criteria.offerMultiUnitFinancing)) {
        const loanTypes = q.loanTypes || [];
        if (!loanTypes.includes("multi-unit")) {
          return false;
        }
      }

      return true;
    });

    const results = await Promise.all(
      matchingQuestionnaires.slice(0, 3).map(async (q) => {
        const companyInfo = await this.getLenderCompanyInfo(q.lenderId);
        return {
          id: q.lenderId,
          companyName: companyInfo?.companyName || "",
          contactName: companyInfo?.contactName || "",
          phone: companyInfo?.phone || "",
          email: companyInfo?.email || "",
          website: companyInfo?.website || "",
          referralLink: companyInfo?.referralLink || "",
          companyDescription: companyInfo?.companyDescription || "",
        };
      })
    );

    return results;
  }

  async createLoanProduct(data: InsertLoanProduct): Promise<LoanProduct> {
    const id = randomUUID();
    const loanProduct: LoanProduct = {
      id,
      lenderId: data.lenderId,
      loanType: data.loanType ?? 'bridge',
      productName: data.productName,
      newInvestorOk: data.newInvestorOk ?? false,
      minCreditScore: data.minCreditScore ?? null,
      maxLtvBuy: data.maxLtvBuy ?? null,
      maxLendRehab: data.maxLendRehab ?? null,
      interestRate: data.interestRate ?? null,
      interestDeferred: data.interestDeferred ?? false,
      drawnFundsOnly: data.drawnFundsOnly ?? false,
      points: data.points ?? null,
      pointsDeferred: data.pointsDeferred ?? false,
      maxLoanArv: data.maxLoanArv ?? null,
      appraisalRequired: data.appraisalRequired ?? false,
      estimatedAppraisalCost: data.estimatedAppraisalCost ?? null,
      fees: data.fees ?? null,
      costPerDraw: data.costPerDraw ?? null,
      timeToClose: data.timeToClose ?? null,
      cashOutOk: data.cashOutOk ?? false,
      cashOutMaxLtv: data.cashOutMaxLtv ?? null,
      referralLink: data.referralLink ?? null,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
    };
    this.loanProducts.set(id, loanProduct);
    return loanProduct;
  }

  async getLoanProducts(lenderId: string): Promise<LoanProduct[]> {
    return Array.from(this.loanProducts.values()).filter(
      (p) => p.lenderId === lenderId
    );
  }

  async getAllActiveLoanProducts(): Promise<LoanProduct[]> {
    return Array.from(this.loanProducts.values()).filter(
      (p) => p.isActive
    );
  }

  async getAllLenders(): Promise<any[]> {
    return Array.from(this.companyInfo.values());
  }

  async updateLoanProduct(id: string, data: Partial<InsertLoanProduct>): Promise<LoanProduct | undefined> {
    const existing = this.loanProducts.get(id);
    if (!existing) return undefined;
    
    const updated: LoanProduct = {
      ...existing,
      ...data,
    };
    this.loanProducts.set(id, updated);
    return updated;
  }

  async deleteLoanProduct(id: string): Promise<boolean> {
    return this.loanProducts.delete(id);
  }

  async getLender(id: string): Promise<Lender | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async getLenderByEmail(email: string): Promise<Lender | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async getLenderByUsername(username: string): Promise<Lender | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async createLenderInvite(username: string, password: string, companyName: string, referralAmount?: number, referralType?: string): Promise<{token: string, lender: Lender, isNewInvite: boolean}> {
    throw new Error("Not implemented in MemStorage");
  }

  async validateLenderInvite(token: string): Promise<Lender | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async completeLenderSignup(lenderId: string, password: string, contactName: string, phone?: string, companyName?: string): Promise<Lender> {
    throw new Error("Not implemented in MemStorage");
  }

  async bulkCreateLoanProducts(lenderId: string, products: Omit<InsertLoanProduct, 'lenderId'>[]): Promise<LoanProduct[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async createLenderReferral(data: InsertLenderReferral): Promise<LenderReferral> {
    throw new Error("Not implemented in MemStorage");
  }

  async getLenderReferrals(lenderId: string): Promise<Array<LenderReferral & {investorName?: string, propertyAddress?: string}>> {
    throw new Error("Not implemented in MemStorage");
  }

  async createOrGetProperty(data: InsertProperty): Promise<Property> {
    throw new Error("Not implemented in MemStorage");
  }

  async getPropertyById(id: string): Promise<Property | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async createDealAnalysis(data: InsertDealAnalysis): Promise<DealAnalysis> {
    throw new Error("Not implemented in MemStorage");
  }

  async getDealAnalysis(id: string): Promise<DealAnalysis | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateDealAnalysis(id: string, data: Partial<Omit<InsertDealAnalysis, 'propertyId' | 'propertySnapshot'>>): Promise<DealAnalysis | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteDealAnalysis(id: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }

  async getDealAnalysesByUser(userId: string): Promise<DealAnalysis[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async createAccessToken(analysisId: string, expiresAt?: Date): Promise<DealAnalysisAccess> {
    throw new Error("Not implemented in MemStorage");
  }

  async getDealAnalysisByToken(token: string): Promise<DealAnalysis | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async revokeAccessToken(token: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAllLendersWithReferralCounts(): Promise<Array<Lender & {referralCount: number, loanProductCount: number}>> {
    throw new Error("Not implemented in MemStorage");
  }

  async getLenderReferralCount(lenderId: string): Promise<number> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteLender(id: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }

  async archiveLender(id: string): Promise<Lender | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAllLenderReferralsForAdmin(): Promise<Array<{
    id: string;
    lenderId: string;
    lenderName: string;
    userId: string | null;
    investorName: string | null;
    investorEmail: string | null;
    referralType: string;
    savedDealId: string | null;
    propertyAddress: string | null;
    createdAt: Date | null;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAdminDashboardStats(): Promise<{
    totalUsers: number;
    activeSubscribers: number;
    totalLenders: number;
    activeLenders: number;
    totalReferrals: number;
    totalDealsAnalyzed: number;
  }> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAllUsers(): Promise<Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    subscriptionStatus: string;
    createdAt: Date | null;
    isEmailVerified: boolean;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async trackAffiliateClick(data: {
    userId: string | null;
    affiliateId: string;
    affiliateName: string;
    category: string;
    source?: string;
    referrer?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAffiliateClicksForAdmin(): Promise<Array<{
    id: string;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    affiliateId: string;
    affiliateName: string;
    category: string;
    source: string | null;
    referrer: string | null;
    createdAt: Date | null;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAffiliateBySlug(slug: string): Promise<Affiliate | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAffiliateByReportToken(token: string): Promise<Affiliate | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async generateAffiliateReportToken(id: string): Promise<string> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAffiliateClicksForAffiliate(affiliateId: string): Promise<Array<{
    id: string;
    source: string | null;
    referrer: string | null;
    createdAt: Date | null;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAffiliateClickStats(): Promise<Array<{
    affiliateId: string;
    affiliateName: string;
    totalClicks: number;
    uniqueUsers: number;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async getDealAnalysisStats(): Promise<{
    totalDeals: number;
    averageArv: number;
    averageRoi: number;
    averageProfit: number;
    statusCounts: Record<string, number>;
    dealsThisMonth: number;
    dealsThisWeek: number;
  }> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAllDealsForAdmin(): Promise<Array<{
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    propertyAddress: string | null;
    arv: string | null;
    roi: string | null;
    profit: string | null;
    status: string;
    createdAt: Date | null;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async getLenderPerformanceStats(): Promise<Array<{
    lenderId: string;
    lenderName: string;
    referralCount: number;
    savedCount: number;
    wonDealsCount: number;
    wonDealsValue: number;
    isActive: boolean;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async getPlatformUsageStats(): Promise<{
    activeUsersLast30Days: number;
    activeUsersLast7Days: number;
    totalDeals: number;
    totalSavedLenders: number;
    totalReferrals: number;
    totalAffiliateClicks: number;
    dealsByMonth: Array<{month: string; count: number}>;
  }> {
    throw new Error("Not implemented in MemStorage");
  }

  async getSubscriptionStats(): Promise<{
    byStatus: Record<string, number>;
    totalActive: number;
    totalReferralTrial: number;
    totalComped: number;
    totalInactive: number;
    usersByMonth: Array<{month: string; count: number}>;
    referralConversions: number;
  }> {
    throw new Error("Not implemented in MemStorage");
  }

  async getNewConstructionLenders(state: string): Promise<Array<{
    lenderId: string;
    companyName: string;
    referralAmount: string;
    referralType: string;
    referralLink: string | null;
    isPreferred: boolean;
    productId: string;
    productName: string;
    productReferralLink: string | null;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateLenderPreferredStatus(lenderId: string, isPreferred: boolean): Promise<Lender | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async createCompInvite(email: string, invitedById: string, expiresInDays?: number): Promise<{compCode: string; email: string; expiresAt: Date}> {
    throw new Error("Not implemented in MemStorage");
  }

  async getCompInviteByCode(compCode: string): Promise<{id: string; email: string; status: string; expiresAt: Date} | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async acceptCompInvite(compCode: string, userId: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }

  async getAllCompInvites(): Promise<Array<{
    id: string;
    email: string;
    compCode: string;
    status: string;
    invitedByEmail: string | null;
    acceptedByEmail: string | null;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date | null;
  }>> {
    throw new Error("Not implemented in MemStorage");
  }

  async resendCompInvite(id: string): Promise<{compCode: string; email: string; expiresAt: Date} | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteCompInvite(id: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }

  async createAuditorInvite(email: string, invitedById: string, companyName?: string, expiresInDays?: number): Promise<{inviteCode: string; email: string; expiresAt: Date}> {
    throw new Error("Not implemented in MemStorage");
  }
  async getAuditorInviteByCode(inviteCode: string): Promise<{id: string; email: string; companyName: string | null; status: string; expiresAt: Date} | undefined> {
    throw new Error("Not implemented in MemStorage");
  }
  async acceptAuditorInvite(inviteCode: string, userId: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }
  async getAllAuditorInvites(): Promise<Array<{id: string; email: string; inviteCode: string; companyName: string | null; status: string; invitedByEmail: string | null; acceptedByEmail: string | null; expiresAt: Date; acceptedAt: Date | null; createdAt: Date | null}>> {
    throw new Error("Not implemented in MemStorage");
  }
  async resendAuditorInvite(id: string): Promise<{inviteCode: string; email: string; expiresAt: Date} | undefined> {
    throw new Error("Not implemented in MemStorage");
  }
  async deleteAuditorInvite(id: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }

  // Marketing Pixels (stubs)
  async getAllMarketingPixels(): Promise<MarketingPixel[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async getEnabledMarketingPixels(): Promise<MarketingPixel[]> {
    throw new Error("Not implemented in MemStorage");
  }

  async getMarketingPixelByPlatform(platform: string): Promise<MarketingPixel | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async createMarketingPixel(data: InsertMarketingPixel): Promise<MarketingPixel> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateMarketingPixel(id: string, data: Partial<InsertMarketingPixel>): Promise<MarketingPixel | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteMarketingPixel(id: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(sql`LOWER(${usersTable.email}) = LOWER(${email})`).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(usersTable).values(insertUser).returning();
    return result[0];
  }

  async updateLenderCompanyInfo(data: any): Promise<any> {
    const lenderId = data.lenderId;
    const updateData: any = {};
    
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.companyDescription !== undefined) updateData.companyDescription = data.companyDescription;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.referralLink !== undefined) updateData.referralLink = data.referralLink;
    if (data.referralAmount !== undefined) {
      const amount = typeof data.referralAmount === 'string' ? parseFloat(data.referralAmount) : data.referralAmount;
      if (!isFinite(amount) || isNaN(amount)) {
        throw new Error("Invalid referral amount: must be a finite number");
      }
      updateData.referralAmount = amount;
    }
    if (data.referralType !== undefined) updateData.referralType = data.referralType;
    
    await db.update(lendersTable).set(updateData).where(eq(lendersTable.id, lenderId));
    
    const result = await db.select().from(lendersTable).where(eq(lendersTable.id, lenderId)).limit(1);
    return { ...result[0], lenderId: result[0].id };
  }

  async getLenderCompanyInfo(lenderId: string): Promise<any> {
    const result = await db.select().from(lendersTable).where(eq(lendersTable.id, lenderId)).limit(1);
    if (!result[0]) return null;
    return { ...result[0], lenderId: result[0].id };
  }

  async upsertLenderQuestionnaire(data: InsertLenderQuestionnaire): Promise<LenderQuestionnaire> {
    const existing = await db.select().from(lenderQuestionnairesTable)
      .where(eq(lenderQuestionnairesTable.lenderId, data.lenderId)).limit(1);

    if (existing.length > 0) {
      const updated = await db.update(lenderQuestionnairesTable)
        .set({
          brokerOrDirectLender: data.brokerOrDirectLender,
          fastestClosingTime: data.fastestClosingTime,
          offerNonTraditionalLending: data.offerNonTraditionalLending,
          workWithNewInvestors: data.workWithNewInvestors,
          minCreditScore: data.minCreditScore,
          offerDeferredPayment: data.offerDeferredPayment,
          offerRolledPoints: data.offerRolledPoints,
          offer100PercentFunding: data.offer100PercentFunding,
          offerLoansAllStates: data.offerLoansAllStates,
          statesServiced: data.statesServiced,
          loanTypes: data.loanTypes,
          updatedAt: new Date(),
        })
        .where(eq(lenderQuestionnairesTable.id, existing[0].id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(lenderQuestionnairesTable).values(data).returning();
      return inserted[0];
    }
  }

  async getLenderQuestionnaire(lenderId: string): Promise<LenderQuestionnaire | undefined> {
    const result = await db.select().from(lenderQuestionnairesTable)
      .where(eq(lenderQuestionnairesTable.lenderId, lenderId)).limit(1);
    return result[0];
  }

  async getAllLenderQuestionnaires(): Promise<LenderQuestionnaire[]> {
    return await db.select().from(lenderQuestionnairesTable);
  }

  async searchLenders(criteria: any): Promise<any[]> {
    let query = db.select().from(lenderQuestionnairesTable);
    
    const questionnaires = await query;
    
    const creditScoreToNumeric = (score: string | null): number => {
      if (!score) return 0;
      switch (score) {
        case "750+": return 750;
        case "700-749": return 700;
        case "650-699": return 650;
        case "600-649": return 600;
        case "below-600": return 0;
        default: return 0;
      }
    };
    
    const toBool = (val: string): boolean => val.toLowerCase() === "yes";
    const isActive = (val: any): boolean => val && val !== "" && val !== "any";

    const stateAbbrToName: Record<string, string> = {
      AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
      CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
      HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
      KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
      MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
      MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
      NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
      OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
      SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
      VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    };

    const loanTypeMap: Record<string, string> = {
      hard_money: "hard-money",
      dscr: "dscr",
      conventional: "conventional",
      transactional: "transactional",
      portfolio: "portfolio",
      balloon: "balloon",
      interest_only: "interest-only",
      arm: "arm",
      "private-seller": "private-seller",
      new_construction: "new-construction",
      fha_va: "fha-va",
    };

    const matchingQuestionnaires = questionnaires.filter((q) => {
      if (isActive(criteria.state)) {
        if (q.offerLoansAllStates !== "Yes") {
          const states = q.statesServiced || [];
          const stateName = stateAbbrToName[criteria.state] || criteria.state;
          if (!states.includes(stateName)) {
            return false;
          }
        }
      }
      if (isActive(criteria.loanType)) {
        const loanTypes = q.loanTypes || [];
        const dbLoanType = loanTypeMap[criteria.loanType] || criteria.loanType;
        if (!loanTypes.includes(dbLoanType)) {
          return false;
        }
      }
      if (isActive(criteria.brokerOrDirectLender) &&
          q.brokerOrDirectLender !== criteria.brokerOrDirectLender) {
        return false;
      }
      if (isActive(criteria.fastestClosingTime) &&
          q.fastestClosingTime !== criteria.fastestClosingTime) {
        return false;
      }
      if (isActive(criteria.offerNonTraditionalLending) &&
          q.offerNonTraditionalLending !== toBool(criteria.offerNonTraditionalLending)) {
        return false;
      }
      if (isActive(criteria.workWithNewInvestors) &&
          q.workWithNewInvestors !== toBool(criteria.workWithNewInvestors)) {
        return false;
      }
      if (isActive(criteria.minCreditScore)) {
        const investorScore = creditScoreToNumeric(criteria.minCreditScore);
        const lenderMinScore = creditScoreToNumeric(q.minCreditScore);
        if (investorScore < lenderMinScore) {
          return false;
        }
      }
      if (isActive(criteria.offerDeferredPayment) &&
          q.offerDeferredPayment !== toBool(criteria.offerDeferredPayment)) {
        return false;
      }
      if (isActive(criteria.offerRolledPoints) &&
          q.offerRolledPoints !== toBool(criteria.offerRolledPoints)) {
        return false;
      }
      if (isActive(criteria.offer100PercentFunding) &&
          q.offer100PercentFunding !== toBool(criteria.offer100PercentFunding)) {
        return false;
      }
      if (isActive(criteria.offerMultiUnitFinancing) && toBool(criteria.offerMultiUnitFinancing)) {
        const loanTypes = q.loanTypes || [];
        if (!loanTypes.includes("multi-unit")) {
          return false;
        }
      }

      return true;
    });

    const results = await Promise.all(
      matchingQuestionnaires.slice(0, 3).map(async (q) => {
        const companyInfo = await this.getLenderCompanyInfo(q.lenderId);
        return {
          id: q.lenderId,
          companyName: companyInfo?.companyName || "",
          contactName: companyInfo?.contactName || "",
          phone: companyInfo?.phone || "",
          email: companyInfo?.email || "",
          website: companyInfo?.website || "",
          referralLink: companyInfo?.referralLink || "",
          companyDescription: companyInfo?.companyDescription || "",
        };
      })
    );

    return results;
  }

  async createLoanProduct(data: InsertLoanProduct): Promise<LoanProduct> {
    const result = await db.insert(loanProductsTable).values(data).returning();
    return result[0];
  }

  async getLoanProducts(lenderId: string): Promise<LoanProduct[]> {
    return await db.select().from(loanProductsTable).where(eq(loanProductsTable.lenderId, lenderId));
  }

  async getAllActiveLoanProducts(): Promise<LoanProduct[]> {
    return await db.select().from(loanProductsTable).where(eq(loanProductsTable.isActive, true));
  }

  async getAllLenders(): Promise<any[]> {
    return await db.select().from(lendersTable);
  }

  async updateLoanProduct(id: string, data: Partial<InsertLoanProduct>): Promise<LoanProduct | undefined> {
    const result = await db.update(loanProductsTable).set(data).where(eq(loanProductsTable.id, id)).returning();
    return result[0];
  }

  async deleteLoanProduct(id: string): Promise<boolean> {
    const result = await db.delete(loanProductsTable).where(eq(loanProductsTable.id, id)).returning();
    return result.length > 0;
  }

  private normalizeAddress(address: string, city: string, state: string, zipCode: string): string {
    const normalize = (str: string) => str.trim().toUpperCase().replace(/\s+/g, ' ');
    return `${normalize(address)}|${normalize(city)}|${normalize(state)}|${normalize(zipCode)}`;
  }

  async createOrGetProperty(data: InsertProperty): Promise<Property> {
    const normalizedKey = this.normalizeAddress(data.address, data.city, data.state, data.zipCode);
    
    const existing = await db.select().from(propertiesTable)
      .where(eq(propertiesTable.normalizedAddress, normalizedKey))
      .limit(1);
    
    if (existing[0]) {
      return existing[0];
    }
    
    const result = await db.insert(propertiesTable).values({
      ...data,
      normalizedAddress: normalizedKey,
    }).returning();
    return result[0];
  }

  async getPropertyById(id: string): Promise<Property | undefined> {
    const result = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id)).limit(1);
    return result[0];
  }

  async createDealAnalysis(data: InsertDealAnalysis): Promise<DealAnalysis> {
    const result = await db.insert(dealAnalysesTable).values(data).returning();
    return result[0];
  }

  async getDealAnalysis(id: string): Promise<DealAnalysis | undefined> {
    const result = await db.select().from(dealAnalysesTable).where(eq(dealAnalysesTable.id, id)).limit(1);
    return result[0];
  }

  async updateDealAnalysis(id: string, data: Partial<Omit<InsertDealAnalysis, 'propertyId' | 'propertySnapshot'>>): Promise<DealAnalysis | undefined> {
    const updateData = { ...data, updatedAt: new Date() };
    const result = await db.update(dealAnalysesTable).set(updateData).where(eq(dealAnalysesTable.id, id)).returning();
    return result[0];
  }

  async deleteDealAnalysis(id: string): Promise<boolean> {
    const result = await db.delete(dealAnalysesTable).where(eq(dealAnalysesTable.id, id)).returning();
    return result.length > 0;
  }

  async getDealAnalysesByUser(userId: string): Promise<DealAnalysis[]> {
    return await db.select().from(dealAnalysesTable).where(eq(dealAnalysesTable.userId, userId));
  }

  async createAccessToken(analysisId: string, expiresAt?: Date): Promise<DealAnalysisAccess> {
    const token = randomBytes(32).toString('base64url');
    const data: InsertDealAnalysisAccess = {
      analysisId,
      token,
      expiresAt: expiresAt || null,
    };
    const result = await db.insert(dealAnalysisAccessTable).values(data).returning();
    return result[0];
  }

  async getDealAnalysisByToken(token: string): Promise<DealAnalysis | undefined> {
    const accessResult = await db.select().from(dealAnalysisAccessTable)
      .where(eq(dealAnalysisAccessTable.token, token))
      .limit(1);
    
    if (!accessResult[0]) {
      return undefined;
    }
    
    if (accessResult[0].expiresAt && accessResult[0].expiresAt < new Date()) {
      return undefined;
    }
    
    const analysisResult = await db.select().from(dealAnalysesTable)
      .where(eq(dealAnalysesTable.id, accessResult[0].analysisId))
      .limit(1);
    
    return analysisResult[0];
  }

  async revokeAccessToken(token: string): Promise<boolean> {
    const result = await db.delete(dealAnalysisAccessTable).where(eq(dealAnalysisAccessTable.token, token)).returning();
    return result.length > 0;
  }

  async getLender(id: string): Promise<Lender | undefined> {
    const result = await db.select().from(lendersTable).where(eq(lendersTable.id, id)).limit(1);
    return result[0];
  }

  async getLenderByEmail(email: string): Promise<Lender | undefined> {
    const result = await db.select().from(lendersTable).where(eq(lendersTable.email, email)).limit(1);
    return result[0];
  }

  async getLenderByUsername(username: string): Promise<Lender | undefined> {
    const result = await db.select().from(lendersTable).where(eq(lendersTable.email, username)).limit(1);
    return result[0];
  }

  async createLenderInvite(username: string, password: string, companyName: string, referralAmount: number, referralType: string): Promise<{token: string, lender: Lender, isNewInvite: boolean}> {
    const token = randomBytes(32).toString('base64url');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    
    const hashedPassword = await hashPassword(password);
    
    // Check if lender already exists with this email
    const existing = await db.select().from(lendersTable).where(eq(lendersTable.email, username)).limit(1);
    
    if (existing.length > 0) {
      const lender = existing[0];
      // If already registered, only allow password reset for registered lenders
      if (lender.inviteAccepted) {
        // This is a password reset for an already-registered lender
        // Update password AND referral info (admin may be updating referral terms)
        const result = await db.update(lendersTable)
          .set({
            password: hashedPassword,
            companyName: companyName,
            referralAmount: referralAmount.toString(),
            referralType: referralType,
          })
          .where(eq(lendersTable.email, username))
          .returning();
        return { token, lender: result[0], isNewInvite: false };
      } else {
        // Not yet accepted, re-invite them with updated company name and referral info
        const result = await db.update(lendersTable)
          .set({
            password: hashedPassword,
            companyName: companyName,
            referralAmount: referralAmount.toString(),
            referralType: referralType,
            inviteToken: token,
            inviteExpiry: expiry,
            inviteAccepted: false,
          })
          .where(eq(lendersTable.email, username))
          .returning();
        return { token, lender: result[0], isNewInvite: true };
      }
    }
    
    // Create new lender
    const result = await db.insert(lendersTable).values({
      email: username,
      companyName: companyName,
      password: hashedPassword,
      contactName: 'Pending',
      referralAmount: referralAmount.toString(),
      referralType: referralType,
      inviteToken: token,
      inviteExpiry: expiry,
      inviteAccepted: false,
    }).returning();
    
    return { token, lender: result[0], isNewInvite: true };
  }

  async validateLenderInvite(token: string): Promise<Lender | undefined> {
    const result = await db.select().from(lendersTable)
      .where(and(
        eq(lendersTable.inviteToken, token),
        gt(lendersTable.inviteExpiry, new Date()),
        eq(lendersTable.inviteAccepted, false)
      ))
      .limit(1);
    return result[0];
  }

  async completeLenderSignup(lenderId: string, password: string, contactName: string, phone?: string, companyName?: string): Promise<Lender> {
    // Hash the password before storing
    const hashedPassword = await hashPassword(password);
    
    const updateData: any = {
      password: hashedPassword,
      contactName,
      inviteAccepted: true,
    };
    if (phone) updateData.phone = phone;
    if (companyName) updateData.companyName = companyName;
    
    const result = await db.update(lendersTable)
      .set(updateData)
      .where(eq(lendersTable.id, lenderId))
      .returning();
    return result[0];
  }

  async bulkCreateLoanProducts(lenderId: string, products: Omit<InsertLoanProduct, 'lenderId'>[]): Promise<LoanProduct[]> {
    const productsWithLender = products.map(p => ({ ...p, lenderId }));
    const result = await db.insert(loanProductsTable).values(productsWithLender).returning();
    return result;
  }

  async createLenderReferral(data: InsertLenderReferral): Promise<LenderReferral> {
    const result = await db.insert(lenderReferralsTable).values(data).returning();
    return result[0];
  }

  async getLenderReferrals(lenderId: string): Promise<Array<LenderReferral & {investorName?: string, propertyAddress?: string}>> {
    const referrals = await db.select().from(lenderReferralsTable)
      .where(eq(lenderReferralsTable.lenderId, lenderId))
      .orderBy(desc(lenderReferralsTable.createdAt));

    const enrichedReferrals = await Promise.all(referrals.map(async (ref) => {
      let investorName: string | undefined;
      let propertyAddress: string | undefined;

      if (ref.userId) {
        const user = await this.getUser(ref.userId);
        if (user) {
          const profile = await db.select().from(usersTable).where(eq(usersTable.id, ref.userId)).limit(1);
          investorName = user.username;
        }
      }

      if (ref.savedDealId) {
        const deal = await this.getDealAnalysis(ref.savedDealId);
        if (deal) {
          propertyAddress = deal.propertySnapshot && typeof deal.propertySnapshot === 'object' && 'address' in deal.propertySnapshot
            ? String(deal.propertySnapshot.address)
            : undefined;
        }
      }

      return {
        ...ref,
        investorName,
        propertyAddress,
      };
    }));

    return enrichedReferrals;
  }

  async getAllLendersWithReferralCounts(): Promise<Array<Lender & {referralCount: number, loanProductCount: number}>> {
    const lenders = await db.select().from(lendersTable).orderBy(desc(lendersTable.createdAt));
    
    const lendersWithCounts = await Promise.all(
      lenders.map(async (lender) => {
        const referralCount = await this.getLenderReferralCount(lender.id);
        
        // Count loan products for this lender
        const loanProductResult = await db
          .select({ count: count() })
          .from(loanProductsTable)
          .where(eq(loanProductsTable.lenderId, lender.id));
        const loanProductCount = loanProductResult[0]?.count || 0;
        
        return {
          ...lender,
          referralCount,
          loanProductCount,
        };
      })
    );
    
    return lendersWithCounts;
  }

  async getLenderReferralCount(lenderId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(lenderReferralsTable)
      .where(eq(lenderReferralsTable.lenderId, lenderId));
    
    return result[0]?.count || 0;
  }

  async deleteLender(id: string): Promise<boolean> {
    const lender = await db.select().from(lendersTable).where(eq(lendersTable.id, id)).limit(1);
    
    if (!lender[0]) {
      throw new Error("Lender not found");
    }
    
    if (lender[0].archived) {
      throw new Error("Cannot delete archived lender");
    }
    
    const referralCount = await this.getLenderReferralCount(id);
    
    if (referralCount > 0) {
      throw new Error("Cannot delete lender with existing referrals");
    }
    
    await db.transaction(async (tx) => {
      await tx.delete(loanProductsTable).where(eq(loanProductsTable.lenderId, id));
      await tx.delete(lenderQuestionnairesTable).where(eq(lenderQuestionnairesTable.lenderId, id));
      await tx.delete(lendersTable).where(eq(lendersTable.id, id));
    });
    
    return true;
  }

  async archiveLender(id: string): Promise<Lender | undefined> {
    const lender = await db.select().from(lendersTable).where(eq(lendersTable.id, id)).limit(1);
    
    if (!lender[0]) {
      throw new Error("Lender not found");
    }
    
    if (lender[0].archived) {
      throw new Error("Lender is already archived");
    }
    
    const result = await db
      .update(lendersTable)
      .set({ archived: true })
      .where(eq(lendersTable.id, id))
      .returning();
    
    return result[0];
  }

  async updateLenderPreferredStatus(lenderId: string, isPreferred: boolean): Promise<Lender | undefined> {
    const result = await db
      .update(lendersTable)
      .set({ isPreferred })
      .where(eq(lendersTable.id, lenderId))
      .returning();
    
    return result[0];
  }

  async createCompInvite(email: string, invitedById: string, expiresInDays: number = 30): Promise<{compCode: string; email: string; expiresAt: Date}> {
    const compCode = randomBytes(16).toString('hex').substring(0, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    await db.insert(compInvitesTable).values({
      email,
      compCode,
      status: 'pending',
      invitedBy: invitedById,
      expiresAt,
    });
    
    return { compCode, email, expiresAt };
  }

  async getCompInviteByCode(compCode: string): Promise<{id: string; email: string; status: string; expiresAt: Date} | undefined> {
    const result = await db.select().from(compInvitesTable)
      .where(sqlCount`UPPER(${compInvitesTable.compCode}) = UPPER(${compCode})`)
      .limit(1);
    
    if (!result[0]) return undefined;
    
    return {
      id: result[0].id,
      email: result[0].email,
      status: result[0].status,
      expiresAt: result[0].expiresAt,
    };
  }

  async acceptCompInvite(compCode: string, userId: string): Promise<boolean> {
    const invite = await db.select().from(compInvitesTable)
      .where(sqlCount`UPPER(${compInvitesTable.compCode}) = UPPER(${compCode})`)
      .limit(1);
    
    if (!invite[0]) return false;
    if (invite[0].status !== 'pending') return false;
    if (new Date() > invite[0].expiresAt) return false;
    
    await db.update(compInvitesTable)
      .set({ 
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: new Date(),
      })
      .where(eq(compInvitesTable.id, invite[0].id));
    
    await db.update(usersTable)
      .set({ subscriptionStatus: 'comped' })
      .where(eq(usersTable.id, userId));
    
    return true;
  }

  async getAllCompInvites(): Promise<Array<{
    id: string;
    email: string;
    compCode: string;
    status: string;
    invitedByEmail: string | null;
    acceptedByEmail: string | null;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date | null;
  }>> {
    const invites = await db.select().from(compInvitesTable)
      .orderBy(desc(compInvitesTable.createdAt));
    
    const enrichedInvites = await Promise.all(invites.map(async (invite) => {
      let invitedByEmail: string | null = null;
      let acceptedByEmail: string | null = null;
      
      if (invite.invitedBy) {
        const inviter = await db.select().from(usersTable)
          .where(eq(usersTable.id, invite.invitedBy)).limit(1);
        if (inviter[0]) invitedByEmail = inviter[0].email;
      }
      
      if (invite.acceptedBy) {
        const accepter = await db.select().from(usersTable)
          .where(eq(usersTable.id, invite.acceptedBy)).limit(1);
        if (accepter[0]) acceptedByEmail = accepter[0].email;
      }
      
      return {
        id: invite.id,
        email: invite.email,
        compCode: invite.compCode,
        status: invite.status,
        invitedByEmail,
        acceptedByEmail,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        createdAt: invite.createdAt,
      };
    }));
    
    return enrichedInvites;
  }

  async resendCompInvite(id: string): Promise<{compCode: string; email: string; expiresAt: Date} | undefined> {
    const invite = await db.select().from(compInvitesTable)
      .where(eq(compInvitesTable.id, id))
      .limit(1);
    
    if (!invite[0]) return undefined;
    
    const newCompCode = randomBytes(16).toString('hex').substring(0, 8).toUpperCase();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
    
    await db.update(compInvitesTable)
      .set({ 
        compCode: newCompCode,
        expiresAt: newExpiresAt,
        status: 'pending',
      })
      .where(eq(compInvitesTable.id, id));
    
    return { compCode: newCompCode, email: invite[0].email, expiresAt: newExpiresAt };
  }

  async deleteCompInvite(id: string): Promise<boolean> {
    const result = await db.delete(compInvitesTable)
      .where(eq(compInvitesTable.id, id))
      .returning();
    
    return result.length > 0;
  }

  async createAuditorInvite(email: string, invitedById: string, companyName?: string, expiresInDays: number = 30): Promise<{inviteCode: string; email: string; expiresAt: Date}> {
    const inviteCode = 'AUD-' + randomBytes(16).toString('hex').substring(0, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    await db.insert(auditorInvitesTable).values({
      email,
      inviteCode,
      companyName: companyName || null,
      status: 'pending',
      invitedBy: invitedById,
      expiresAt,
    });
    
    return { inviteCode, email, expiresAt };
  }

  async getAuditorInviteByCode(inviteCode: string): Promise<{id: string; email: string; companyName: string | null; status: string; expiresAt: Date} | undefined> {
    const result = await db.select().from(auditorInvitesTable)
      .where(sqlCount`UPPER(${auditorInvitesTable.inviteCode}) = UPPER(${inviteCode})`)
      .limit(1);
    
    if (!result[0]) return undefined;
    
    return {
      id: result[0].id,
      email: result[0].email,
      companyName: result[0].companyName,
      status: result[0].status,
      expiresAt: result[0].expiresAt,
    };
  }

  async acceptAuditorInvite(inviteCode: string, userId: string): Promise<boolean> {
    const invite = await db.select().from(auditorInvitesTable)
      .where(sqlCount`UPPER(${auditorInvitesTable.inviteCode}) = UPPER(${inviteCode})`)
      .limit(1);
    
    if (!invite[0]) return false;
    if (invite[0].status !== 'pending') return false;
    if (new Date() > invite[0].expiresAt) return false;
    
    await db.update(auditorInvitesTable)
      .set({ 
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: new Date(),
      })
      .where(eq(auditorInvitesTable.id, invite[0].id));
    
    await db.update(usersTable)
      .set({ role: 'auditor', subscriptionStatus: 'comped' })
      .where(eq(usersTable.id, userId));
    
    return true;
  }

  async getAllAuditorInvites(): Promise<Array<{
    id: string;
    email: string;
    inviteCode: string;
    companyName: string | null;
    status: string;
    invitedByEmail: string | null;
    acceptedByEmail: string | null;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date | null;
  }>> {
    const invites = await db.select().from(auditorInvitesTable)
      .orderBy(desc(auditorInvitesTable.createdAt));
    
    const enrichedInvites = await Promise.all(invites.map(async (invite) => {
      let invitedByEmail: string | null = null;
      let acceptedByEmail: string | null = null;
      
      if (invite.invitedBy) {
        const inviter = await db.select().from(usersTable)
          .where(eq(usersTable.id, invite.invitedBy)).limit(1);
        if (inviter[0]) invitedByEmail = inviter[0].email;
      }
      
      if (invite.acceptedBy) {
        const accepter = await db.select().from(usersTable)
          .where(eq(usersTable.id, invite.acceptedBy)).limit(1);
        if (accepter[0]) acceptedByEmail = accepter[0].email;
      }
      
      return {
        id: invite.id,
        email: invite.email,
        inviteCode: invite.inviteCode,
        companyName: invite.companyName,
        status: invite.status,
        invitedByEmail,
        acceptedByEmail,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        createdAt: invite.createdAt,
      };
    }));
    
    return enrichedInvites;
  }

  async resendAuditorInvite(id: string): Promise<{inviteCode: string; email: string; expiresAt: Date} | undefined> {
    const invite = await db.select().from(auditorInvitesTable)
      .where(eq(auditorInvitesTable.id, id))
      .limit(1);
    
    if (!invite[0]) return undefined;
    
    const newInviteCode = 'AUD-' + randomBytes(16).toString('hex').substring(0, 8).toUpperCase();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
    
    await db.update(auditorInvitesTable)
      .set({ 
        inviteCode: newInviteCode,
        expiresAt: newExpiresAt,
        status: 'pending',
      })
      .where(eq(auditorInvitesTable.id, id));
    
    return { inviteCode: newInviteCode, email: invite[0].email, expiresAt: newExpiresAt };
  }

  async deleteAuditorInvite(id: string): Promise<boolean> {
    const result = await db.delete(auditorInvitesTable)
      .where(eq(auditorInvitesTable.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getAllLenderReferralsForAdmin(): Promise<Array<{
    id: string;
    lenderId: string;
    lenderName: string;
    userId: string | null;
    investorName: string | null;
    investorEmail: string | null;
    referralType: string;
    savedDealId: string | null;
    propertyAddress: string | null;
    createdAt: Date | null;
  }>> {
    const referrals = await db.select().from(lenderReferralsTable)
      .orderBy(desc(lenderReferralsTable.createdAt));

    const enrichedReferrals = await Promise.all(referrals.map(async (ref) => {
      let lenderName = 'Unknown';
      let investorName: string | null = null;
      let investorEmail: string | null = null;
      let propertyAddress: string | null = null;

      const lender = await db.select().from(lendersTable)
        .where(eq(lendersTable.id, ref.lenderId)).limit(1);
      if (lender[0]) {
        lenderName = lender[0].companyName;
      }

      if (ref.userId) {
        const user = await db.select().from(usersTable)
          .where(eq(usersTable.id, ref.userId)).limit(1);
        if (user[0]) {
          investorName = user[0].username;
          investorEmail = user[0].email;
        }
      }

      if (ref.savedDealId) {
        const savedDeal = await db.select().from(savedDealsTable)
          .where(eq(savedDealsTable.id, ref.savedDealId)).limit(1);
        if (savedDeal[0]) {
          propertyAddress = savedDeal[0].propertyAddress || null;
          if (!propertyAddress && savedDeal[0].dealSnapshot) {
            const snapshot = savedDeal[0].dealSnapshot as any;
            if (snapshot.property?.address) {
              propertyAddress = snapshot.property.address;
            } else if (snapshot.address) {
              propertyAddress = snapshot.address;
            }
          }
        }
      }

      const isDealBased = ref.savedDealId !== null;

      return {
        id: ref.id,
        lenderId: ref.lenderId,
        lenderName,
        userId: ref.userId,
        investorName,
        investorEmail,
        referralType: isDealBased ? 'deal_based' : ref.referralType,
        savedDealId: ref.savedDealId,
        propertyAddress,
        createdAt: ref.createdAt,
      };
    }));

    return enrichedReferrals;
  }

  async getAdminDashboardStats(): Promise<{
    totalUsers: number;
    activeSubscribers: number;
    totalLenders: number;
    activeLenders: number;
    totalReferrals: number;
    totalDealsAnalyzed: number;
  }> {
    const usersResult = await db.select({ count: count() }).from(usersTable);
    const totalUsers = usersResult[0]?.count || 0;

    const subscribersResult = await db.select({ count: count() }).from(usersTable)
      .where(sqlCount`${usersTable.subscriptionStatus} IN ('active', 'referral_trial', 'comped')`);
    const activeSubscribers = subscribersResult[0]?.count || 0;

    const lendersResult = await db.select({ count: count() }).from(lendersTable);
    const totalLenders = lendersResult[0]?.count || 0;

    const activeLendersResult = await db.select({ count: count() }).from(lendersTable)
      .where(and(
        eq(lendersTable.archived, false),
        eq(lendersTable.inviteAccepted, true)
      ));
    const activeLenders = activeLendersResult[0]?.count || 0;

    const referralsResult = await db.select({ count: count() }).from(lenderReferralsTable);
    const totalReferrals = referralsResult[0]?.count || 0;

    const dealsResult = await db.select({ count: count() }).from(dealAnalysesTable);
    const totalDealsAnalyzed = dealsResult[0]?.count || 0;

    return {
      totalUsers,
      activeSubscribers,
      totalLenders,
      activeLenders,
      totalReferrals,
      totalDealsAnalyzed,
    };
  }

  async getAllUsers(): Promise<Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    subscriptionStatus: string;
    createdAt: Date | null;
    isEmailVerified: boolean;
  }>> {
    const users = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      subscriptionStatus: usersTable.subscriptionStatus,
      createdAt: usersTable.createdAt,
      isEmailVerified: usersTable.isEmailVerified,
    }).from(usersTable).orderBy(desc(usersTable.createdAt));

    return users;
  }

  async trackAffiliateClick(data: {
    userId: string | null;
    affiliateId: string;
    affiliateName: string;
    category: string;
    source?: string;
    referrer?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await db.insert(affiliateClicksTable).values({
      userId: data.userId || undefined,
      affiliateId: data.affiliateId,
      affiliateName: data.affiliateName,
      category: data.category,
      source: data.source || 'website',
      referrer: data.referrer,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  async getAffiliateClicksForAdmin(): Promise<Array<{
    id: string;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    affiliateId: string;
    affiliateName: string;
    category: string;
    source: string | null;
    referrer: string | null;
    createdAt: Date | null;
  }>> {
    const clicks = await db.select().from(affiliateClicksTable)
      .orderBy(desc(affiliateClicksTable.createdAt));

    const enrichedClicks = await Promise.all(clicks.map(async (click) => {
      let userName: string | null = null;
      let userEmail: string | null = null;

      if (click.userId) {
        const user = await db.select().from(usersTable)
          .where(eq(usersTable.id, click.userId)).limit(1);
        if (user[0]) {
          userName = user[0].username;
          userEmail = user[0].email;
        }
      }

      return {
        id: click.id,
        userId: click.userId,
        userName,
        userEmail,
        affiliateId: click.affiliateId,
        affiliateName: click.affiliateName,
        category: click.category,
        source: click.source,
        referrer: click.referrer,
        createdAt: click.createdAt,
      };
    }));

    return enrichedClicks;
  }

  async getAffiliateClickStats(): Promise<Array<{
    affiliateId: string;
    affiliateName: string;
    totalClicks: number;
    uniqueUsers: number;
  }>> {
    const stats = await db
      .select({
        affiliateId: affiliateClicksTable.affiliateId,
        affiliateName: affiliateClicksTable.affiliateName,
        totalClicks: count(),
      })
      .from(affiliateClicksTable)
      .groupBy(affiliateClicksTable.affiliateId, affiliateClicksTable.affiliateName);

    const enrichedStats = await Promise.all(stats.map(async (stat) => {
      const uniqueUsersResult = await db
        .select({ count: sqlCount`COUNT(DISTINCT ${affiliateClicksTable.userId})` })
        .from(affiliateClicksTable)
        .where(eq(affiliateClicksTable.affiliateId, stat.affiliateId));

      return {
        affiliateId: stat.affiliateId,
        affiliateName: stat.affiliateName,
        totalClicks: Number(stat.totalClicks),
        uniqueUsers: Number(uniqueUsersResult[0]?.count || 0),
      };
    }));

    return enrichedStats.sort((a, b) => b.totalClicks - a.totalClicks);
  }

  // Affiliate Management Methods
  async getAllAffiliates(): Promise<Affiliate[]> {
    return await db.select().from(affiliatesTable).orderBy(affiliatesTable.sortOrder);
  }

  async getActiveAffiliates(): Promise<Affiliate[]> {
    return await db.select().from(affiliatesTable)
      .where(eq(affiliatesTable.isActive, true))
      .orderBy(affiliatesTable.sortOrder);
  }

  async getAffiliateById(id: string): Promise<Affiliate | undefined> {
    const result = await db.select().from(affiliatesTable).where(eq(affiliatesTable.id, id)).limit(1);
    return result[0];
  }

  async getAffiliateBySlug(slug: string): Promise<Affiliate | undefined> {
    const result = await db.select().from(affiliatesTable).where(eq(affiliatesTable.slug, slug)).limit(1);
    return result[0];
  }

  async getAffiliateByReportToken(token: string): Promise<Affiliate | undefined> {
    const result = await db.select().from(affiliatesTable).where(eq(affiliatesTable.reportToken, token)).limit(1);
    return result[0];
  }

  async generateAffiliateReportToken(id: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await db.update(affiliatesTable)
      .set({ reportToken: token, updatedAt: new Date() })
      .where(eq(affiliatesTable.id, id));
    return token;
  }

  async getAffiliateClicksForAffiliate(affiliateId: string): Promise<Array<{
    id: string;
    source: string | null;
    referrer: string | null;
    createdAt: Date | null;
  }>> {
    const result = await db.select({
      id: affiliateClicksTable.id,
      source: affiliateClicksTable.source,
      referrer: affiliateClicksTable.referrer,
      createdAt: affiliateClicksTable.createdAt,
    })
    .from(affiliateClicksTable)
    .where(eq(affiliateClicksTable.affiliateId, affiliateId))
    .orderBy(desc(affiliateClicksTable.createdAt));
    return result;
  }

  async createAffiliate(data: InsertAffiliate): Promise<Affiliate> {
    const result = await db.insert(affiliatesTable).values(data).returning();
    return result[0];
  }

  async updateAffiliate(id: string, data: Partial<InsertAffiliate>): Promise<Affiliate | undefined> {
    const result = await db.update(affiliatesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(affiliatesTable.id, id))
      .returning();
    return result[0];
  }

  async deleteAffiliate(id: string): Promise<boolean> {
    const result = await db.delete(affiliatesTable).where(eq(affiliatesTable.id, id)).returning();
    return result.length > 0;
  }

  async getAllAffiliateCategories(): Promise<AffiliateCategory[]> {
    return await db.select().from(affiliateCategoriesTable).orderBy(affiliateCategoriesTable.sortOrder);
  }

  async upsertAffiliateCategory(data: InsertAffiliateCategory): Promise<AffiliateCategory> {
    const existing = await db.select().from(affiliateCategoriesTable)
      .where(eq(affiliateCategoriesTable.id, data.id))
      .limit(1);
    
    if (existing.length > 0) {
      const result = await db.update(affiliateCategoriesTable)
        .set({ name: data.name, description: data.description, sortOrder: data.sortOrder })
        .where(eq(affiliateCategoriesTable.id, data.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(affiliateCategoriesTable).values(data).returning();
      return result[0];
    }
  }

  async deleteAffiliateCategory(id: string): Promise<boolean> {
    const result = await db.delete(affiliateCategoriesTable).where(eq(affiliateCategoriesTable.id, id)).returning();
    return result.length > 0;
  }

  // Site Settings
  async getSiteSetting(key: string): Promise<string | null> {
    const result = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
    return result[0]?.value || null;
  }

  async setSiteSetting(key: string, value: string): Promise<SiteSetting> {
    const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
    if (existing.length > 0) {
      const updated = await db.update(siteSettingsTable)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettingsTable.key, key))
        .returning();
      return updated[0];
    }
    const created = await db.insert(siteSettingsTable).values({ key, value }).returning();
    return created[0];
  }

  // Training Videos
  async getAllTrainingVideos(): Promise<TrainingVideo[]> {
    return await db.select().from(trainingVideosTable).orderBy(trainingVideosTable.sortOrder);
  }

  async getActiveTrainingVideos(): Promise<TrainingVideo[]> {
    return await db.select().from(trainingVideosTable)
      .where(eq(trainingVideosTable.isActive, true))
      .orderBy(trainingVideosTable.sortOrder);
  }

  async getTrainingVideoById(id: string): Promise<TrainingVideo | undefined> {
    const result = await db.select().from(trainingVideosTable).where(eq(trainingVideosTable.id, id)).limit(1);
    return result[0];
  }

  async createTrainingVideo(data: InsertTrainingVideo): Promise<TrainingVideo> {
    const result = await db.insert(trainingVideosTable).values(data).returning();
    return result[0];
  }

  async updateTrainingVideo(id: string, data: Partial<InsertTrainingVideo>): Promise<TrainingVideo | undefined> {
    const result = await db.update(trainingVideosTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingVideosTable.id, id))
      .returning();
    return result[0];
  }

  async deleteTrainingVideo(id: string): Promise<boolean> {
    const result = await db.delete(trainingVideosTable).where(eq(trainingVideosTable.id, id)).returning();
    return result.length > 0;
  }

  async getDealAnalysisStats(): Promise<{
    totalDeals: number;
    averageArv: number;
    averageRoi: number;
    averageProfit: number;
    statusCounts: Record<string, number>;
    dealsThisMonth: number;
    dealsThisWeek: number;
  }> {
    const allDeals = await db.select().from(savedDealsTable);
    
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const totalDeals = allDeals.length;
    
    const arvValues = allDeals.filter(d => d.arv).map(d => parseFloat(d.arv || '0'));
    const roiValues = allDeals.filter(d => d.roi).map(d => parseFloat(d.roi || '0'));
    const profitValues = allDeals.filter(d => d.profit).map(d => parseFloat(d.profit || '0'));
    
    const averageArv = arvValues.length > 0 ? arvValues.reduce((a, b) => a + b, 0) / arvValues.length : 0;
    const averageRoi = roiValues.length > 0 ? roiValues.reduce((a, b) => a + b, 0) / roiValues.length : 0;
    const averageProfit = profitValues.length > 0 ? profitValues.reduce((a, b) => a + b, 0) / profitValues.length : 0;
    
    const statusCounts: Record<string, number> = {};
    allDeals.forEach(deal => {
      const status = deal.status || 'active';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const dealsThisMonth = allDeals.filter(d => d.createdAt && d.createdAt >= oneMonthAgo).length;
    const dealsThisWeek = allDeals.filter(d => d.createdAt && d.createdAt >= oneWeekAgo).length;
    
    return {
      totalDeals,
      averageArv,
      averageRoi,
      averageProfit,
      statusCounts,
      dealsThisMonth,
      dealsThisWeek,
    };
  }

  async getAllDealsForAdmin(): Promise<Array<{
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    propertyAddress: string | null;
    arv: string | null;
    roi: string | null;
    profit: string | null;
    status: string;
    createdAt: Date | null;
  }>> {
    const deals = await db.select().from(savedDealsTable)
      .orderBy(desc(savedDealsTable.createdAt));

    const enrichedDeals = await Promise.all(deals.map(async (deal) => {
      let userName: string | null = null;
      let userEmail: string | null = null;

      const user = await db.select().from(usersTable)
        .where(eq(usersTable.id, deal.userId)).limit(1);
      if (user[0]) {
        userName = user[0].username;
        userEmail = user[0].email;
      }

      return {
        id: deal.id,
        userId: deal.userId,
        userName,
        userEmail,
        propertyAddress: deal.propertyAddress,
        arv: deal.arv,
        roi: deal.roi,
        profit: deal.profit,
        status: deal.status,
        createdAt: deal.createdAt,
      };
    }));

    return enrichedDeals;
  }

  async getLenderPerformanceStats(): Promise<Array<{
    lenderId: string;
    lenderName: string;
    referralCount: number;
    savedCount: number;
    wonDealsCount: number;
    wonDealsValue: number;
    isActive: boolean;
  }>> {
    const lenders = await db.select().from(lendersTable)
      .where(eq(lendersTable.archived, false));

    const stats = await Promise.all(lenders.map(async (lender) => {
      const referrals = await db.select({ count: count() })
        .from(lenderReferralsTable)
        .where(eq(lenderReferralsTable.lenderId, lender.id));

      const saved = await db.select({ count: count() })
        .from(savedLendersTable)
        .where(eq(savedLendersTable.lenderId, lender.id));

      const wonDeals = await db.select()
        .from(savedDealsTable)
        .where(eq(savedDealsTable.closedWithLenderId, lender.id));

      const wonDealsValue = wonDeals.reduce((sum, deal) => {
        const profit = deal.profit ? parseFloat(deal.profit) : 0;
        return sum + (isNaN(profit) ? 0 : profit);
      }, 0);

      return {
        lenderId: lender.id,
        lenderName: lender.companyName || lender.contactName || 'Unknown',
        referralCount: Number(referrals[0]?.count || 0),
        savedCount: Number(saved[0]?.count || 0),
        wonDealsCount: wonDeals.length,
        wonDealsValue,
        isActive: !lender.archived,
      };
    }));

    return stats.sort((a, b) => b.referralCount - a.referralCount);
  }

  async getPlatformUsageStats(): Promise<{
    activeUsersLast30Days: number;
    activeUsersLast7Days: number;
    totalDeals: number;
    totalSavedLenders: number;
    totalReferrals: number;
    totalAffiliateClicks: number;
    dealsByMonth: Array<{month: string; count: number}>;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dealsLast30Days = await db.select({ userId: savedDealsTable.userId })
      .from(savedDealsTable)
      .where(gt(savedDealsTable.createdAt, thirtyDaysAgo));
    const uniqueUsersLast30Days = new Set(
      dealsLast30Days.map(d => d.userId).filter(Boolean)
    );

    const savedLendersLast30Days = await db.select({ userId: savedLendersTable.userId })
      .from(savedLendersTable)
      .where(gt(savedLendersTable.createdAt, thirtyDaysAgo));
    savedLendersLast30Days.forEach(s => {
      if (s.userId) uniqueUsersLast30Days.add(s.userId);
    });

    const dealsLast7Days = await db.select({ userId: savedDealsTable.userId })
      .from(savedDealsTable)
      .where(gt(savedDealsTable.createdAt, sevenDaysAgo));
    const uniqueUsersLast7Days = new Set(
      dealsLast7Days.map(d => d.userId).filter(Boolean)
    );

    const savedLendersLast7Days = await db.select({ userId: savedLendersTable.userId })
      .from(savedLendersTable)
      .where(gt(savedLendersTable.createdAt, sevenDaysAgo));
    savedLendersLast7Days.forEach(s => {
      if (s.userId) uniqueUsersLast7Days.add(s.userId);
    });

    const totalDealsResult = await db.select({ count: count() }).from(savedDealsTable);
    const totalSavedLendersResult = await db.select({ count: count() }).from(savedLendersTable);
    const totalReferralsResult = await db.select({ count: count() }).from(lenderReferralsTable);
    const totalAffiliateClicksResult = await db.select({ count: count() }).from(affiliateClicksTable);

    const allDeals = await db.select({ createdAt: savedDealsTable.createdAt }).from(savedDealsTable);
    
    const dealsByMonthMap = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      dealsByMonthMap.set(monthKey, 0);
    }
    
    allDeals.forEach(deal => {
      if (deal.createdAt) {
        const monthKey = `${deal.createdAt.getFullYear()}-${String(deal.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (dealsByMonthMap.has(monthKey)) {
          dealsByMonthMap.set(monthKey, (dealsByMonthMap.get(monthKey) || 0) + 1);
        }
      }
    });
    
    const dealsByMonth = Array.from(dealsByMonthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      activeUsersLast30Days: uniqueUsersLast30Days.size,
      activeUsersLast7Days: uniqueUsersLast7Days.size,
      totalDeals: Number(totalDealsResult[0]?.count || 0),
      totalSavedLenders: Number(totalSavedLendersResult[0]?.count || 0),
      totalReferrals: Number(totalReferralsResult[0]?.count || 0),
      totalAffiliateClicks: Number(totalAffiliateClicksResult[0]?.count || 0),
      dealsByMonth,
    };
  }

  async getSubscriptionStats(): Promise<{
    byStatus: Record<string, number>;
    totalActive: number;
    totalReferralTrial: number;
    totalComped: number;
    totalInactive: number;
    usersByMonth: Array<{month: string; count: number}>;
    referralConversions: number;
  }> {
    const allUsers = await db.select({
      subscriptionStatus: usersTable.subscriptionStatus,
      referredBy: usersTable.referredBy,
      createdAt: usersTable.createdAt,
    }).from(usersTable);

    const byStatus: Record<string, number> = {
      'active': 0,
      'referral_trial': 0,
      'comped': 0,
      'free': 0,
    };
    allUsers.forEach(user => {
      const status = user.subscriptionStatus || 'free';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    const usersByMonthMap = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      usersByMonthMap.set(monthKey, 0);
    }
    
    allUsers.forEach(user => {
      if (user.createdAt) {
        const monthKey = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (usersByMonthMap.has(monthKey)) {
          usersByMonthMap.set(monthKey, (usersByMonthMap.get(monthKey) || 0) + 1);
        }
      }
    });
    
    const usersByMonth = Array.from(usersByMonthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const referralConversions = allUsers.filter(u => 
      u.referredBy && (u.subscriptionStatus === 'active')
    ).length;

    return {
      byStatus,
      totalActive: byStatus['active'] || 0,
      totalReferralTrial: byStatus['referral_trial'] || 0,
      totalComped: byStatus['comped'] || 0,
      totalFree: byStatus['free'] || 0,
      usersByMonth,
      referralConversions,
    };
  }

  async getNewConstructionLenders(state: string): Promise<Array<{
    lenderId: string;
    companyName: string;
    referralAmount: string;
    referralType: string;
    referralLink: string | null;
    isPreferred: boolean;
    productId: string;
    productName: string;
    productReferralLink: string | null;
  }>> {
    // Get all lenders with new construction products that operate in the specified state
    const results = await db
      .select({
        lenderId: lendersTable.id,
        companyName: lendersTable.companyName,
        referralAmount: lendersTable.referralAmount,
        referralType: lendersTable.referralType,
        referralLink: lendersTable.referralLink,
        isPreferred: lendersTable.isPreferred,
        productId: loanProductsTable.id,
        productName: loanProductsTable.productName,
        productReferralLink: loanProductsTable.referralLink,
        statesServiced: lenderQuestionnairesTable.statesServiced,
        offerLoansAllStates: lenderQuestionnairesTable.offerLoansAllStates,
      })
      .from(lendersTable)
      .innerJoin(loanProductsTable, eq(lendersTable.id, loanProductsTable.lenderId))
      .leftJoin(lenderQuestionnairesTable, eq(lendersTable.id, lenderQuestionnairesTable.lenderId))
      .where(
        and(
          eq(lendersTable.archived, false),
          eq(loanProductsTable.loanType, 'new-construction'),
          eq(loanProductsTable.isActive, true)
        )
      );

    // Filter by state (lender must operate in the state or operate in all states)
    const stateFiltered = results.filter(r => {
      if (r.offerLoansAllStates === 'yes') return true;
      if (r.statesServiced && Array.isArray(r.statesServiced)) {
        return r.statesServiced.includes(state);
      }
      return false;
    });

    // Sort by: preferred first, then by referral amount (descending)
    const sorted = stateFiltered.sort((a, b) => {
      // Preferred lenders first
      if (a.isPreferred && !b.isPreferred) return -1;
      if (!a.isPreferred && b.isPreferred) return 1;
      
      // Then by referral amount (descending)
      const amountA = parseFloat(a.referralAmount) || 0;
      const amountB = parseFloat(b.referralAmount) || 0;
      return amountB - amountA;
    });

    // Apply the 2-lender logic:
    // - If 2+ preferred: return top 2 preferred by fee
    // - If 1 preferred: return that 1 + highest non-preferred
    // - If 0 preferred: return top 2 by fee
    const preferred = sorted.filter(r => r.isPreferred);
    const nonPreferred = sorted.filter(r => !r.isPreferred);

    let finalResults: typeof sorted = [];
    
    if (preferred.length >= 2) {
      finalResults = preferred.slice(0, 2);
    } else if (preferred.length === 1) {
      finalResults = [preferred[0]];
      if (nonPreferred.length > 0) {
        finalResults.push(nonPreferred[0]);
      }
    } else {
      finalResults = nonPreferred.slice(0, 2);
    }

    return finalResults.map(r => ({
      lenderId: r.lenderId,
      companyName: r.companyName,
      referralAmount: r.referralAmount,
      referralType: r.referralType,
      referralLink: r.referralLink,
      isPreferred: r.isPreferred ?? false,
      productId: r.productId,
      productName: r.productName,
      productReferralLink: r.productReferralLink,
    }));
  }

  // Discount Code Methods
  async createDiscountCode(data: {
    code: string;
    displayName: string;
    partnerName?: string;
    description?: string;
    planApplicability: 'monthly' | 'annual' | 'both';
    percentOff?: number;
    amountOff?: number;
    maxRedemptions?: number;
    startAt?: Date;
    endAt?: Date;
    isActive?: boolean;
    createdBy?: string;
  }): Promise<DiscountCode> {
    const result = await db.insert(discountCodesTable).values({
      code: data.code.toUpperCase(),
      displayName: data.displayName,
      partnerName: data.partnerName || null,
      description: data.description || null,
      planApplicability: data.planApplicability,
      percentOff: data.percentOff?.toString() || null,
      amountOff: data.amountOff?.toString() || null,
      maxRedemptions: data.maxRedemptions || null,
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy || null,
    }).returning();
    return result[0];
  }

  async getDiscountCode(id: string): Promise<DiscountCode | undefined> {
    const result = await db.select().from(discountCodesTable).where(eq(discountCodesTable.id, id));
    return result[0];
  }

  async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
    const result = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, code.toUpperCase()));
    return result[0];
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const result = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, code.toUpperCase()));
    return result[0];
  }

  async getAllDiscountCodes(filters?: {
    search?: string;
    partnerName?: string;
    planApplicability?: string;
    isActive?: boolean;
  }): Promise<Array<DiscountCode & {
    totalRedemptions: number;
    totalAmountDiscounted: number;
    lastUsedAt: Date | null;
  }>> {
    const codes = await db.select().from(discountCodesTable).orderBy(desc(discountCodesTable.createdAt));
    
    // Apply filters
    let filteredCodes = codes;
    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredCodes = filteredCodes.filter(c => 
          c.code.toLowerCase().includes(searchLower) || 
          c.displayName.toLowerCase().includes(searchLower) ||
          (c.partnerName && c.partnerName.toLowerCase().includes(searchLower))
        );
      }
      if (filters.partnerName) {
        filteredCodes = filteredCodes.filter(c => c.partnerName === filters.partnerName);
      }
      if (filters.planApplicability) {
        filteredCodes = filteredCodes.filter(c => c.planApplicability === filters.planApplicability);
      }
      if (filters.isActive !== undefined) {
        filteredCodes = filteredCodes.filter(c => c.isActive === filters.isActive);
      }
    }

    // Get usage stats for each code
    const usageStats = await db
      .select({
        discountCodeId: discountCodeUsesTable.discountCodeId,
        totalRedemptions: count(),
        totalAmountDiscounted: sqlCount`COALESCE(SUM(${discountCodeUsesTable.amountDiscounted}), 0)`,
        lastUsedAt: sqlCount`MAX(${discountCodeUsesTable.redeemedAt})`,
      })
      .from(discountCodeUsesTable)
      .groupBy(discountCodeUsesTable.discountCodeId);

    const statsMap = new Map(usageStats.map(s => [s.discountCodeId, s]));

    return filteredCodes.map(code => ({
      ...code,
      totalRedemptions: Number(statsMap.get(code.id)?.totalRedemptions || 0),
      totalAmountDiscounted: Number(statsMap.get(code.id)?.totalAmountDiscounted || 0),
      lastUsedAt: statsMap.get(code.id)?.lastUsedAt as Date | null,
    }));
  }

  async updateDiscountCode(id: string, data: {
    code?: string;
    displayName?: string;
    partnerName?: string | null;
    description?: string | null;
    planApplicability?: 'monthly' | 'annual' | 'both';
    percentOff?: number | null;
    amountOff?: number | null;
    maxRedemptions?: number | null;
    startAt?: Date | null;
    endAt?: Date | null;
    isActive?: boolean;
    stripeCouponId?: string | null;
  }): Promise<DiscountCode | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.partnerName !== undefined) updateData.partnerName = data.partnerName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.planApplicability !== undefined) updateData.planApplicability = data.planApplicability;
    if (data.percentOff !== undefined) updateData.percentOff = data.percentOff?.toString() || null;
    if (data.amountOff !== undefined) updateData.amountOff = data.amountOff?.toString() || null;
    if (data.maxRedemptions !== undefined) updateData.maxRedemptions = data.maxRedemptions;
    if (data.startAt !== undefined) updateData.startAt = data.startAt;
    if (data.endAt !== undefined) updateData.endAt = data.endAt;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.stripeCouponId !== undefined) updateData.stripeCouponId = data.stripeCouponId;

    const result = await db.update(discountCodesTable)
      .set(updateData)
      .where(eq(discountCodesTable.id, id))
      .returning();
    return result[0];
  }

  async deleteDiscountCode(id: string): Promise<boolean> {
    // First delete any usage records
    await db.delete(discountCodeUsesTable).where(eq(discountCodeUsesTable.discountCodeId, id));
    // Then delete the code
    const result = await db.delete(discountCodesTable).where(eq(discountCodesTable.id, id));
    return (result.rowCount || 0) > 0;
  }

  async recordDiscountCodeUse(data: {
    discountCodeId: string;
    userId?: string;
    plan: string;
    amountDiscounted: number;
  }): Promise<void> {
    await db.insert(discountCodeUsesTable).values({
      discountCodeId: data.discountCodeId,
      userId: data.userId || null,
      plan: data.plan,
      amountDiscounted: data.amountDiscounted.toString(),
    });
    
    // Increment the current redemptions counter
    await db.update(discountCodesTable)
      .set({ 
        currentRedemptions: sqlCount`${discountCodesTable.currentRedemptions} + 1`,
        updatedAt: new Date()
      })
      .where(eq(discountCodesTable.id, data.discountCodeId));
  }

  async getDiscountCodeUsage(discountCodeId: string): Promise<Array<{
    id: string;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    plan: string;
    amountDiscounted: string;
    redeemedAt: Date | null;
  }>> {
    const uses = await db
      .select({
        id: discountCodeUsesTable.id,
        userId: discountCodeUsesTable.userId,
        userName: usersTable.username,
        userEmail: usersTable.email,
        plan: discountCodeUsesTable.plan,
        amountDiscounted: discountCodeUsesTable.amountDiscounted,
        redeemedAt: discountCodeUsesTable.redeemedAt,
      })
      .from(discountCodeUsesTable)
      .leftJoin(usersTable, eq(discountCodeUsesTable.userId, usersTable.id))
      .where(eq(discountCodeUsesTable.discountCodeId, discountCodeId))
      .orderBy(desc(discountCodeUsesTable.redeemedAt));

    return uses;
  }

  async getDiscountCodeStats(): Promise<{
    totalCodes: number;
    activeCodes: number;
    totalRedemptions: number;
    totalAmountDiscounted: number;
    topCodes: Array<{
      id: string;
      code: string;
      displayName: string;
      partnerName: string | null;
      redemptions: number;
      amountDiscounted: number;
    }>;
  }> {
    const allCodes = await db.select().from(discountCodesTable);
    const totalCodes = allCodes.length;
    const activeCodes = allCodes.filter(c => c.isActive).length;

    const usageStats = await db
      .select({
        discountCodeId: discountCodeUsesTable.discountCodeId,
        redemptions: count(),
        amountDiscounted: sqlCount`COALESCE(SUM(${discountCodeUsesTable.amountDiscounted}), 0)`,
      })
      .from(discountCodeUsesTable)
      .groupBy(discountCodeUsesTable.discountCodeId);

    const totalRedemptions = usageStats.reduce((sum, s) => sum + Number(s.redemptions), 0);
    const totalAmountDiscounted = usageStats.reduce((sum, s) => sum + Number(s.amountDiscounted), 0);

    // Get top codes by redemptions
    const codeMap = new Map(allCodes.map(c => [c.id, c]));
    const topCodes = usageStats
      .map(s => {
        const code = codeMap.get(s.discountCodeId);
        return {
          id: s.discountCodeId,
          code: code?.code || '',
          displayName: code?.displayName || '',
          partnerName: code?.partnerName || null,
          redemptions: Number(s.redemptions),
          amountDiscounted: Number(s.amountDiscounted),
        };
      })
      .sort((a, b) => b.redemptions - a.redemptions)
      .slice(0, 10);

    return {
      totalCodes,
      activeCodes,
      totalRedemptions,
      totalAmountDiscounted,
      topCodes,
    };
  }

  // Demo Token Methods
  async createDemoToken(data: Omit<InsertDemoToken, 'token'> & { createdBy: string }): Promise<DemoToken> {
    const token = randomBytes(24).toString('base64url');
    const [demoToken] = await db.insert(demoTokensTable).values({
      ...data,
      token,
    }).returning();
    return demoToken;
  }

  async getDemoTokenByToken(token: string): Promise<DemoToken | undefined> {
    const [demoToken] = await db.select().from(demoTokensTable)
      .where(eq(demoTokensTable.token, token))
      .limit(1);
    return demoToken;
  }

  async getAllDemoTokens(): Promise<DemoToken[]> {
    return await db.select().from(demoTokensTable)
      .orderBy(desc(demoTokensTable.createdAt));
  }

  async updateDemoToken(id: string, data: Partial<InsertDemoToken>): Promise<DemoToken | undefined> {
    const [updated] = await db.update(demoTokensTable)
      .set(data)
      .where(eq(demoTokensTable.id, id))
      .returning();
    return updated;
  }

  async revokeDemoToken(id: string): Promise<DemoToken | undefined> {
    const [revoked] = await db.update(demoTokensTable)
      .set({ status: 'revoked' })
      .where(eq(demoTokensTable.id, id))
      .returning();
    return revoked;
  }

  async recordDemoTokenUsage(token: string): Promise<DemoToken | undefined> {
    const [updated] = await db.update(demoTokensTable)
      .set({ 
        lastUsedAt: new Date(),
        usageCount: sqlCount`${demoTokensTable.usageCount} + 1`
      })
      .where(eq(demoTokensTable.token, token))
      .returning();
    return updated;
  }

  // Integration Config Methods
  async createIntegrationConfig(data: InsertIntegrationConfig): Promise<IntegrationConfig> {
    const [config] = await db.insert(integrationConfigsTable).values(data).returning();
    return config;
  }

  async getIntegrationConfig(id: string): Promise<IntegrationConfig | undefined> {
    const [config] = await db.select().from(integrationConfigsTable)
      .where(eq(integrationConfigsTable.id, id))
      .limit(1);
    return config;
  }

  async getIntegrationConfigByProvider(provider: string): Promise<IntegrationConfig | undefined> {
    const [config] = await db.select().from(integrationConfigsTable)
      .where(eq(integrationConfigsTable.provider, provider))
      .limit(1);
    return config;
  }

  async getAllIntegrationConfigs(): Promise<IntegrationConfig[]> {
    return await db.select().from(integrationConfigsTable)
      .orderBy(desc(integrationConfigsTable.createdAt));
  }

  async updateIntegrationConfig(id: string, data: Partial<InsertIntegrationConfig>): Promise<IntegrationConfig | undefined> {
    const [updated] = await db.update(integrationConfigsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(integrationConfigsTable.id, id))
      .returning();
    return updated;
  }

  async deleteIntegrationConfig(id: string): Promise<boolean> {
    const result = await db.delete(integrationConfigsTable)
      .where(eq(integrationConfigsTable.id, id));
    return true;
  }

  // Integration Event Trigger Methods
  async createIntegrationEventTrigger(data: InsertIntegrationEventTrigger): Promise<IntegrationEventTrigger> {
    const [trigger] = await db.insert(integrationEventTriggersTable).values(data).returning();
    return trigger;
  }

  async getIntegrationEventTriggers(integrationId: string): Promise<IntegrationEventTrigger[]> {
    return await db.select().from(integrationEventTriggersTable)
      .where(eq(integrationEventTriggersTable.integrationId, integrationId));
  }

  async updateIntegrationEventTrigger(id: string, data: Partial<InsertIntegrationEventTrigger>): Promise<IntegrationEventTrigger | undefined> {
    const [updated] = await db.update(integrationEventTriggersTable)
      .set(data)
      .where(eq(integrationEventTriggersTable.id, id))
      .returning();
    return updated;
  }

  async deleteIntegrationEventTrigger(id: string): Promise<boolean> {
    await db.delete(integrationEventTriggersTable)
      .where(eq(integrationEventTriggersTable.id, id));
    return true;
  }

  // Integration Field Mapping Methods
  async createIntegrationFieldMapping(data: InsertIntegrationFieldMapping): Promise<IntegrationFieldMapping> {
    const [mapping] = await db.insert(integrationFieldMappingsTable).values(data).returning();
    return mapping;
  }

  async getIntegrationFieldMappings(integrationId: string, eventType?: string): Promise<IntegrationFieldMapping[]> {
    if (eventType) {
      return await db.select().from(integrationFieldMappingsTable)
        .where(and(
          eq(integrationFieldMappingsTable.integrationId, integrationId),
          eq(integrationFieldMappingsTable.eventType, eventType)
        ));
    }
    return await db.select().from(integrationFieldMappingsTable)
      .where(eq(integrationFieldMappingsTable.integrationId, integrationId));
  }

  async updateIntegrationFieldMapping(id: string, data: Partial<InsertIntegrationFieldMapping>): Promise<IntegrationFieldMapping | undefined> {
    const [updated] = await db.update(integrationFieldMappingsTable)
      .set(data)
      .where(eq(integrationFieldMappingsTable.id, id))
      .returning();
    return updated;
  }

  async deleteIntegrationFieldMapping(id: string): Promise<boolean> {
    await db.delete(integrationFieldMappingsTable)
      .where(eq(integrationFieldMappingsTable.id, id));
    return true;
  }

  // Integration Webhook Methods
  async createIntegrationWebhook(data: Omit<InsertIntegrationWebhook, 'endpoint' | 'secretToken'>): Promise<IntegrationWebhook> {
    const endpoint = randomBytes(16).toString('hex');
    const secretToken = randomBytes(32).toString('base64url');
    const [webhook] = await db.insert(integrationWebhooksTable)
      .values({ ...data, endpoint, secretToken })
      .returning();
    return webhook;
  }

  async getIntegrationWebhook(id: string): Promise<IntegrationWebhook | undefined> {
    const [webhook] = await db.select().from(integrationWebhooksTable)
      .where(eq(integrationWebhooksTable.id, id))
      .limit(1);
    return webhook;
  }

  async getIntegrationWebhookByEndpoint(endpoint: string): Promise<IntegrationWebhook | undefined> {
    const [webhook] = await db.select().from(integrationWebhooksTable)
      .where(eq(integrationWebhooksTable.endpoint, endpoint))
      .limit(1);
    return webhook;
  }

  async getIntegrationWebhooks(integrationId?: string): Promise<IntegrationWebhook[]> {
    if (integrationId) {
      return await db.select().from(integrationWebhooksTable)
        .where(eq(integrationWebhooksTable.integrationId, integrationId))
        .orderBy(desc(integrationWebhooksTable.createdAt));
    }
    return await db.select().from(integrationWebhooksTable)
      .orderBy(desc(integrationWebhooksTable.createdAt));
  }

  async updateIntegrationWebhook(id: string, data: Partial<InsertIntegrationWebhook>): Promise<IntegrationWebhook | undefined> {
    const [updated] = await db.update(integrationWebhooksTable)
      .set(data)
      .where(eq(integrationWebhooksTable.id, id))
      .returning();
    return updated;
  }

  async deleteIntegrationWebhook(id: string): Promise<boolean> {
    await db.delete(integrationWebhooksTable)
      .where(eq(integrationWebhooksTable.id, id));
    return true;
  }

  async recordWebhookCall(endpoint: string): Promise<IntegrationWebhook | undefined> {
    const [updated] = await db.update(integrationWebhooksTable)
      .set({ 
        lastCalledAt: new Date(),
        callCount: sqlCount`${integrationWebhooksTable.callCount} + 1`
      })
      .where(eq(integrationWebhooksTable.endpoint, endpoint))
      .returning();
    return updated;
  }

  // Outbound Webhook Methods
  async createOutboundWebhook(data: InsertOutboundWebhook): Promise<OutboundWebhook> {
    const [webhook] = await db.insert(outboundWebhooksTable).values(data).returning();
    return webhook;
  }

  async getOutboundWebhooks(integrationId?: string): Promise<OutboundWebhook[]> {
    if (integrationId) {
      return await db.select().from(outboundWebhooksTable)
        .where(eq(outboundWebhooksTable.integrationId, integrationId))
        .orderBy(desc(outboundWebhooksTable.createdAt));
    }
    return await db.select().from(outboundWebhooksTable)
      .orderBy(desc(outboundWebhooksTable.createdAt));
  }

  async getOutboundWebhook(id: string): Promise<OutboundWebhook | undefined> {
    const [webhook] = await db.select().from(outboundWebhooksTable)
      .where(eq(outboundWebhooksTable.id, id))
      .limit(1);
    return webhook;
  }

  async getOutboundWebhooksByEvent(eventType: string): Promise<OutboundWebhook[]> {
    return await db.select().from(outboundWebhooksTable)
      .where(and(
        eq(outboundWebhooksTable.isActive, true),
        sql`${eventType} = ANY(${outboundWebhooksTable.eventTypes})`
      ));
  }

  async updateOutboundWebhook(id: string, data: Partial<InsertOutboundWebhook>): Promise<OutboundWebhook | undefined> {
    const [updated] = await db.update(outboundWebhooksTable)
      .set(data)
      .where(eq(outboundWebhooksTable.id, id))
      .returning();
    return updated;
  }

  async deleteOutboundWebhook(id: string): Promise<boolean> {
    await db.delete(outboundWebhooksTable)
      .where(eq(outboundWebhooksTable.id, id));
    return true;
  }

  async recordOutboundWebhookResult(id: string, success: boolean): Promise<OutboundWebhook | undefined> {
    const [updated] = await db.update(outboundWebhooksTable)
      .set({ 
        lastTriggeredAt: new Date(),
        successCount: success ? sqlCount`${outboundWebhooksTable.successCount} + 1` : outboundWebhooksTable.successCount,
        failureCount: success ? outboundWebhooksTable.failureCount : sqlCount`${outboundWebhooksTable.failureCount} + 1`
      })
      .where(eq(outboundWebhooksTable.id, id))
      .returning();
    return updated;
  }

  // Integration Sync Log Methods
  async createIntegrationSyncLog(data: InsertIntegrationSyncLog): Promise<IntegrationSyncLog> {
    const [log] = await db.insert(integrationSyncLogsTable).values(data).returning();
    return log;
  }

  async getIntegrationSyncLogs(filters?: { 
    integrationId?: string; 
    eventType?: string; 
    status?: string;
    limit?: number;
  }): Promise<IntegrationSyncLog[]> {
    let query = db.select().from(integrationSyncLogsTable);
    
    const conditions = [];
    if (filters?.integrationId) {
      conditions.push(eq(integrationSyncLogsTable.integrationId, filters.integrationId));
    }
    if (filters?.eventType) {
      conditions.push(eq(integrationSyncLogsTable.eventType, filters.eventType));
    }
    if (filters?.status) {
      conditions.push(eq(integrationSyncLogsTable.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query
      .orderBy(desc(integrationSyncLogsTable.createdAt))
      .limit(filters?.limit || 100);
  }

  // Property Cache Methods
  async getPropertyCache(normalizedAddress: string, provider: string = 'hasdata'): Promise<PropertyCache | undefined> {
    const now = new Date();
    const [cached] = await db.select()
      .from(propertyCacheTable)
      .where(
        and(
          eq(propertyCacheTable.normalizedAddress, normalizedAddress),
          eq(propertyCacheTable.provider, provider),
          gt(propertyCacheTable.expiresAt, now)
        )
      )
      .limit(1);
    return cached;
  }

  async setPropertyCache(data: InsertPropertyCache): Promise<PropertyCache> {
    // Use upsert - update if exists, insert if not
    const [result] = await db.insert(propertyCacheTable)
      .values(data)
      .onConflictDoUpdate({
        target: propertyCacheTable.normalizedAddress,
        set: {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          provider: data.provider,
          payload: data.payload,
          fetchedAt: new Date(),
          expiresAt: data.expiresAt,
          hitCount: 0,
        },
      })
      .returning();
    return result;
  }

  async incrementPropertyCacheHit(id: string): Promise<void> {
    await db.update(propertyCacheTable)
      .set({ hitCount: sqlCount`${propertyCacheTable.hitCount} + 1` })
      .where(eq(propertyCacheTable.id, id));
  }

  async deleteExpiredPropertyCache(): Promise<number> {
    const now = new Date();
    const result = await db.delete(propertyCacheTable)
      .where(sqlCount`${propertyCacheTable.expiresAt} < ${now}`)
      .returning();
    return result.length;
  }

  // User Usage Counters - for freemium property lookup limits
  private readonly FREE_LOOKUPS_PER_MONTH = 2;
  private readonly FREE_WHOLESALE_CALCS_PER_MONTH = 2;
  private readonly FREE_PDF_DOWNLOADS_PER_MONTH = 2;
  private readonly FREE_ARV_HELPERS_PER_MONTH = 2;

  async getUserUsageCounter(userId: string): Promise<{ propertyLookupCount: number; remainingLookups: number; wholesaleCalcCount: number; remainingWholesaleCalcs: number; pdfDownloadCount: number; remainingPdfDownloads: number; arvHelperCount: number; remainingArvHelpers: number; periodEnd: Date } | null> {
    const [counter] = await db.select()
      .from(userUsageCountersTable)
      .where(eq(userUsageCountersTable.userId, userId))
      .limit(1);
    
    if (!counter) {
      return null;
    }
    
    const now = new Date();
    // If period has expired, reset counts
    if (counter.periodEnd < now) {
      await this.resetUserUsageIfExpired(userId);
      return {
        propertyLookupCount: 0,
        remainingLookups: this.FREE_LOOKUPS_PER_MONTH,
        wholesaleCalcCount: 0,
        remainingWholesaleCalcs: this.FREE_WHOLESALE_CALCS_PER_MONTH,
        pdfDownloadCount: 0,
        remainingPdfDownloads: this.FREE_PDF_DOWNLOADS_PER_MONTH,
        arvHelperCount: 0,
        remainingArvHelpers: this.FREE_ARV_HELPERS_PER_MONTH,
        periodEnd: this.getNextMonthEnd()
      };
    }
    
    return {
      propertyLookupCount: counter.propertyLookupCount,
      remainingLookups: Math.max(0, this.FREE_LOOKUPS_PER_MONTH - counter.propertyLookupCount),
      wholesaleCalcCount: counter.wholesaleCalcCount,
      remainingWholesaleCalcs: Math.max(0, this.FREE_WHOLESALE_CALCS_PER_MONTH - counter.wholesaleCalcCount),
      pdfDownloadCount: counter.pdfDownloadCount,
      remainingPdfDownloads: Math.max(0, this.FREE_PDF_DOWNLOADS_PER_MONTH - counter.pdfDownloadCount),
      arvHelperCount: counter.arvHelperCount,
      remainingArvHelpers: Math.max(0, this.FREE_ARV_HELPERS_PER_MONTH - counter.arvHelperCount),
      periodEnd: counter.periodEnd
    };
  }

  async incrementUserPropertyLookup(userId: string): Promise<{ propertyLookupCount: number; remainingLookups: number; canLookup: boolean }> {
    const now = new Date();
    const periodEnd = this.getNextMonthEnd();
    
    // Try to get existing counter
    let [counter] = await db.select()
      .from(userUsageCountersTable)
      .where(eq(userUsageCountersTable.userId, userId))
      .limit(1);
    
    // If no counter exists, create one
    if (!counter) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [counter] = await db.insert(userUsageCountersTable)
        .values({
          userId,
          propertyLookupCount: 1,
          periodStart,
          periodEnd,
          lastLookupAt: now,
        })
        .returning();
      
      return {
        propertyLookupCount: 1,
        remainingLookups: this.FREE_LOOKUPS_PER_MONTH - 1,
        canLookup: true
      };
    }
    
    // If period expired, reset and increment
    if (counter.periodEnd < now) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [counter] = await db.update(userUsageCountersTable)
        .set({
          propertyLookupCount: 1,
          periodStart,
          periodEnd,
          lastLookupAt: now,
          updatedAt: now,
        })
        .where(eq(userUsageCountersTable.userId, userId))
        .returning();
      
      return {
        propertyLookupCount: 1,
        remainingLookups: this.FREE_LOOKUPS_PER_MONTH - 1,
        canLookup: true
      };
    }
    
    // Check if can lookup before incrementing
    if (counter.propertyLookupCount >= this.FREE_LOOKUPS_PER_MONTH) {
      return {
        propertyLookupCount: counter.propertyLookupCount,
        remainingLookups: 0,
        canLookup: false
      };
    }
    
    // Increment the counter
    const newCount = counter.propertyLookupCount + 1;
    await db.update(userUsageCountersTable)
      .set({
        propertyLookupCount: newCount,
        lastLookupAt: now,
        updatedAt: now,
      })
      .where(eq(userUsageCountersTable.userId, userId));
    
    return {
      propertyLookupCount: newCount,
      remainingLookups: Math.max(0, this.FREE_LOOKUPS_PER_MONTH - newCount),
      canLookup: true
    };
  }

  async incrementUserWholesaleCalc(userId: string): Promise<{ wholesaleCalcCount: number; remainingWholesaleCalcs: number; canCalculate: boolean }> {
    const now = new Date();
    const periodEnd = this.getNextMonthEnd();
    
    // Try to get existing counter
    let [counter] = await db.select()
      .from(userUsageCountersTable)
      .where(eq(userUsageCountersTable.userId, userId))
      .limit(1);
    
    // If no counter exists, create one
    if (!counter) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [counter] = await db.insert(userUsageCountersTable)
        .values({
          userId,
          propertyLookupCount: 0,
          wholesaleCalcCount: 1,
          periodStart,
          periodEnd,
        })
        .returning();
      
      return {
        wholesaleCalcCount: 1,
        remainingWholesaleCalcs: this.FREE_WHOLESALE_CALCS_PER_MONTH - 1,
        canCalculate: true
      };
    }
    
    // If period expired, reset and increment
    if (counter.periodEnd < now) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [counter] = await db.update(userUsageCountersTable)
        .set({
          propertyLookupCount: 0,
          wholesaleCalcCount: 1,
          periodStart,
          periodEnd,
          updatedAt: now,
        })
        .where(eq(userUsageCountersTable.userId, userId))
        .returning();
      
      return {
        wholesaleCalcCount: 1,
        remainingWholesaleCalcs: this.FREE_WHOLESALE_CALCS_PER_MONTH - 1,
        canCalculate: true
      };
    }
    
    // Check if can calculate before incrementing
    if (counter.wholesaleCalcCount >= this.FREE_WHOLESALE_CALCS_PER_MONTH) {
      return {
        wholesaleCalcCount: counter.wholesaleCalcCount,
        remainingWholesaleCalcs: 0,
        canCalculate: false
      };
    }
    
    // Increment the counter
    const newCount = counter.wholesaleCalcCount + 1;
    await db.update(userUsageCountersTable)
      .set({
        wholesaleCalcCount: newCount,
        updatedAt: now,
      })
      .where(eq(userUsageCountersTable.userId, userId));
    
    return {
      wholesaleCalcCount: newCount,
      remainingWholesaleCalcs: Math.max(0, this.FREE_WHOLESALE_CALCS_PER_MONTH - newCount),
      canCalculate: true
    };
  }

  async incrementUserPdfDownload(userId: string): Promise<{ pdfDownloadCount: number; remainingPdfDownloads: number; canDownload: boolean }> {
    const now = new Date();
    const periodEnd = this.getNextMonthEnd();
    
    // Try to get existing counter
    let [counter] = await db.select()
      .from(userUsageCountersTable)
      .where(eq(userUsageCountersTable.userId, userId))
      .limit(1);
    
    // If no counter exists, create one
    if (!counter) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [counter] = await db.insert(userUsageCountersTable)
        .values({
          userId,
          propertyLookupCount: 0,
          wholesaleCalcCount: 0,
          pdfDownloadCount: 1,
          periodStart,
          periodEnd,
        })
        .returning();
      
      return {
        pdfDownloadCount: 1,
        remainingPdfDownloads: this.FREE_PDF_DOWNLOADS_PER_MONTH - 1,
        canDownload: true
      };
    }
    
    // If period expired, reset and increment
    if (counter.periodEnd < now) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [counter] = await db.update(userUsageCountersTable)
        .set({
          propertyLookupCount: 0,
          wholesaleCalcCount: 0,
          pdfDownloadCount: 1,
          periodStart,
          periodEnd,
          updatedAt: now,
        })
        .where(eq(userUsageCountersTable.userId, userId))
        .returning();
      
      return {
        pdfDownloadCount: 1,
        remainingPdfDownloads: this.FREE_PDF_DOWNLOADS_PER_MONTH - 1,
        canDownload: true
      };
    }
    
    // Check if can download before incrementing
    if (counter.pdfDownloadCount >= this.FREE_PDF_DOWNLOADS_PER_MONTH) {
      return {
        pdfDownloadCount: counter.pdfDownloadCount,
        remainingPdfDownloads: 0,
        canDownload: false
      };
    }
    
    // Increment the counter
    const newCount = counter.pdfDownloadCount + 1;
    await db.update(userUsageCountersTable)
      .set({
        pdfDownloadCount: newCount,
        updatedAt: now,
      })
      .where(eq(userUsageCountersTable.userId, userId));
    
    return {
      pdfDownloadCount: newCount,
      remainingPdfDownloads: Math.max(0, this.FREE_PDF_DOWNLOADS_PER_MONTH - newCount),
      canDownload: true
    };
  }

  async incrementUserArvHelper(userId: string): Promise<{ arvHelperCount: number; remainingArvHelpers: number; canUse: boolean }> {
    const now = new Date();
    const periodEnd = this.getNextMonthEnd();
    
    // Try to get existing counter
    let [counter] = await db.select()
      .from(userUsageCountersTable)
      .where(eq(userUsageCountersTable.userId, userId))
      .limit(1);
    
    // If no counter exists, create one
    if (!counter) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [counter] = await db.insert(userUsageCountersTable)
        .values({
          userId,
          arvHelperCount: 1,
          periodStart,
          periodEnd,
        })
        .returning();
      
      return {
        arvHelperCount: 1,
        remainingArvHelpers: this.FREE_ARV_HELPERS_PER_MONTH - 1,
        canUse: true
      };
    }
    
    // If period expired, reset and increment
    if (counter.periodEnd < now) {
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [counter] = await db.update(userUsageCountersTable)
        .set({
          propertyLookupCount: 0,
          wholesaleCalcCount: 0,
          pdfDownloadCount: 0,
          arvHelperCount: 1,
          periodStart,
          periodEnd,
          updatedAt: now,
        })
        .where(eq(userUsageCountersTable.userId, userId))
        .returning();
      
      return {
        arvHelperCount: 1,
        remainingArvHelpers: this.FREE_ARV_HELPERS_PER_MONTH - 1,
        canUse: true
      };
    }
    
    // Check if can use before incrementing
    if (counter.arvHelperCount >= this.FREE_ARV_HELPERS_PER_MONTH) {
      return {
        arvHelperCount: counter.arvHelperCount,
        remainingArvHelpers: 0,
        canUse: false
      };
    }
    
    // Increment the counter
    const newCount = counter.arvHelperCount + 1;
    await db.update(userUsageCountersTable)
      .set({
        arvHelperCount: newCount,
        updatedAt: now,
      })
      .where(eq(userUsageCountersTable.userId, userId));
    
    return {
      arvHelperCount: newCount,
      remainingArvHelpers: Math.max(0, this.FREE_ARV_HELPERS_PER_MONTH - newCount),
      canUse: true
    };
  }

  async resetUserUsageIfExpired(userId: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = this.getNextMonthEnd();
    
    await db.update(userUsageCountersTable)
      .set({
        propertyLookupCount: 0,
        wholesaleCalcCount: 0,
        pdfDownloadCount: 0,
        arvHelperCount: 0,
        periodStart,
        periodEnd,
        updatedAt: now,
      })
      .where(and(
        eq(userUsageCountersTable.userId, userId),
        sqlCount`${userUsageCountersTable.periodEnd} < ${now}`
      ));
  }

  private getNextMonthEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // Service Region Methods
  async getAllServiceRegions(): Promise<ServiceRegion[]> {
    return await db.select().from(serviceRegionsTable).orderBy(serviceRegionsTable.state, serviceRegionsTable.sortOrder);
  }

  async getServiceRegionsByState(state: string): Promise<ServiceRegion[]> {
    return await db.select().from(serviceRegionsTable)
      .where(and(eq(serviceRegionsTable.state, state), eq(serviceRegionsTable.isActive, true)))
      .orderBy(serviceRegionsTable.sortOrder);
  }

  async getServiceRegionById(id: string): Promise<ServiceRegion | undefined> {
    const [region] = await db.select().from(serviceRegionsTable).where(eq(serviceRegionsTable.id, id));
    return region;
  }

  async createServiceRegion(data: InsertServiceRegion): Promise<ServiceRegion> {
    const result = await db.insert(serviceRegionsTable).values(data).returning();
    return result[0];
  }

  async updateServiceRegion(id: string, data: Partial<InsertServiceRegion>): Promise<ServiceRegion | undefined> {
    const result = await db.update(serviceRegionsTable)
      .set(data)
      .where(eq(serviceRegionsTable.id, id))
      .returning();
    return result[0];
  }

  async deleteServiceRegion(id: string): Promise<boolean> {
    const result = await db.delete(serviceRegionsTable).where(eq(serviceRegionsTable.id, id)).returning();
    return result.length > 0;
  }

  // Contractor Methods
  async getAllContractors(): Promise<Contractor[]> {
    return await db.select().from(contractorsTable).orderBy(contractorsTable.sortOrder);
  }

  async getActiveContractors(): Promise<Contractor[]> {
    return await db.select().from(contractorsTable)
      .where(eq(contractorsTable.isActive, true))
      .orderBy(contractorsTable.sortOrder);
  }

  async getContractorById(id: string): Promise<Contractor | undefined> {
    const [contractor] = await db.select().from(contractorsTable).where(eq(contractorsTable.id, id));
    return contractor;
  }

  async getContractorsByRegion(regionId: string): Promise<Contractor[]> {
    const result = await db
      .select({ contractor: contractorsTable })
      .from(contractorsTable)
      .innerJoin(
        contractorServiceRegionsTable,
        eq(contractorsTable.id, contractorServiceRegionsTable.contractorId)
      )
      .where(and(
        eq(contractorServiceRegionsTable.serviceRegionId, regionId),
        eq(contractorsTable.isActive, true)
      ))
      .orderBy(contractorsTable.sortOrder);
    
    return result.map(r => r.contractor);
  }

  async createContractor(data: InsertContractor): Promise<Contractor> {
    const tempPassword = await hashPassword(randomBytes(16).toString('hex'));
    const result = await db.insert(contractorsTable).values({
      ...data,
      password: tempPassword,
    }).returning();
    return result[0];
  }

  async updateContractor(id: string, data: Partial<InsertContractor>): Promise<Contractor | undefined> {
    const result = await db.update(contractorsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contractorsTable.id, id))
      .returning();
    return result[0];
  }

  async deleteContractor(id: string): Promise<boolean> {
    const result = await db.delete(contractorsTable).where(eq(contractorsTable.id, id)).returning();
    return result.length > 0;
  }

  // Contractor Service Region Methods
  async getContractorServiceRegions(contractorId: string): Promise<ServiceRegion[]> {
    const result = await db
      .select({ region: serviceRegionsTable })
      .from(serviceRegionsTable)
      .innerJoin(
        contractorServiceRegionsTable,
        eq(serviceRegionsTable.id, contractorServiceRegionsTable.serviceRegionId)
      )
      .where(eq(contractorServiceRegionsTable.contractorId, contractorId))
      .orderBy(serviceRegionsTable.state, serviceRegionsTable.sortOrder);
    
    return result.map(r => r.region);
  }

  async setContractorServiceRegions(contractorId: string, regionIds: string[]): Promise<void> {
    // Delete existing associations
    await db.delete(contractorServiceRegionsTable)
      .where(eq(contractorServiceRegionsTable.contractorId, contractorId));
    
    // Insert new associations
    if (regionIds.length > 0) {
      await db.insert(contractorServiceRegionsTable).values(
        regionIds.map(regionId => ({
          contractorId,
          serviceRegionId: regionId
        }))
      );
    }
  }

  // Contractor Invitation Methods
  async createContractorInvite(email: string, companyName: string): Promise<{token: string, contractor: Contractor, isNewInvite: boolean}> {
    const token = randomBytes(32).toString('base64url');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    
    const tempPassword = await hashPassword(randomBytes(16).toString('hex'));
    
    // Check if contractor already exists with this email
    const existing = await db.select().from(contractorsTable).where(eq(contractorsTable.email, email)).limit(1);
    
    if (existing.length > 0) {
      const contractor = existing[0];
      if (contractor.inviteAccepted) {
        // Already registered, return existing
        return { token, contractor, isNewInvite: false };
      } else {
        // Not yet accepted, update invite token
        const result = await db.update(contractorsTable)
          .set({
            companyName: companyName,
            inviteToken: token,
            inviteExpiry: expiry,
            updatedAt: new Date()
          })
          .where(eq(contractorsTable.email, email))
          .returning();
        return { token, contractor: result[0], isNewInvite: false };
      }
    }
    
    // Create new contractor with pending invite
    const result = await db.insert(contractorsTable).values({
      name: companyName,
      email,
      password: tempPassword,
      companyName: companyName,
      inviteToken: token,
      inviteExpiry: expiry,
      inviteAccepted: false,
      isActive: false,
    }).returning();
    
    return { token, contractor: result[0], isNewInvite: true };
  }

  async validateContractorInvite(token: string): Promise<Contractor | undefined> {
    const result = await db.select().from(contractorsTable)
      .where(and(
        eq(contractorsTable.inviteToken, token),
        gt(contractorsTable.inviteExpiry, new Date()),
        eq(contractorsTable.inviteAccepted, false)
      ))
      .limit(1);
    return result[0];
  }

  async completeContractorSignup(contractorId: string, data: {
    password: string;
    name: string;
    companyName?: string;
    phone?: string;
    website?: string;
    description?: string;
    specialties?: string[];
    licenseNumber?: string;
    licenseNumbers?: Record<string, string>;
    licensedStates?: string[];
    isInsured?: boolean;
    isBonded?: boolean;
    serviceRegionIds: string[];
  }): Promise<Contractor> {
    const hashedPassword = await hashPassword(data.password);
    
    const updateData: any = {
      password: hashedPassword,
      name: data.name,
      inviteAccepted: true,
      inviteToken: null,
      inviteExpiry: null,
      isActive: true,
      updatedAt: new Date()
    };
    
    if (data.companyName) updateData.companyName = data.companyName;
    if (data.phone) updateData.phone = data.phone;
    if (data.website) updateData.website = data.website;
    if (data.description) updateData.description = data.description;
    if (data.specialties) updateData.specialties = data.specialties;
    if (data.licenseNumber) updateData.licenseNumber = data.licenseNumber;
    if (data.licenseNumbers) updateData.licenseNumbers = data.licenseNumbers;
    if (data.licensedStates) updateData.licensedStates = data.licensedStates;
    if (data.isInsured !== undefined) updateData.isInsured = data.isInsured;
    if (data.isBonded !== undefined) updateData.isBonded = data.isBonded;
    
    const result = await db.update(contractorsTable)
      .set(updateData)
      .where(eq(contractorsTable.id, contractorId))
      .returning();
    
    // Set service regions
    await this.setContractorServiceRegions(contractorId, data.serviceRegionIds);
    
    return result[0];
  }

  async getContractorByEmail(email: string): Promise<Contractor | undefined> {
    const result = await db.select().from(contractorsTable)
      .where(eq(contractorsTable.email, email))
      .limit(1);
    return result[0];
  }

  // Webinar Registration Methods
  async createWebinarRegistration(data: InsertWebinarRegistration): Promise<WebinarRegistration> {
    const [registration] = await db.insert(webinarRegistrationsTable).values(data).returning();
    return registration;
  }

  async getWebinarRegistrations(webinarId?: string): Promise<WebinarRegistration[]> {
    if (webinarId) {
      return await db.select().from(webinarRegistrationsTable)
        .where(eq(webinarRegistrationsTable.webinarId, webinarId))
        .orderBy(desc(webinarRegistrationsTable.registeredAt));
    }
    return await db.select().from(webinarRegistrationsTable)
      .orderBy(desc(webinarRegistrationsTable.registeredAt));
  }

  async getWebinarRegistrationByEmail(email: string, webinarId?: string): Promise<WebinarRegistration | undefined> {
    if (webinarId) {
      const [result] = await db.select().from(webinarRegistrationsTable)
        .where(and(
          eq(webinarRegistrationsTable.email, email),
          eq(webinarRegistrationsTable.webinarId, webinarId)
        ))
        .limit(1);
      return result;
    }
    const [result] = await db.select().from(webinarRegistrationsTable)
      .where(eq(webinarRegistrationsTable.email, email))
      .limit(1);
    return result;
  }

  async getWebinarRegistrationById(id: string): Promise<WebinarRegistration | undefined> {
    const [result] = await db.select().from(webinarRegistrationsTable)
      .where(eq(webinarRegistrationsTable.id, id))
      .limit(1);
    return result;
  }

  async updateWebinarRegistrationRsvp(id: string, rsvpStatus: string): Promise<WebinarRegistration | undefined> {
    const [result] = await db.update(webinarRegistrationsTable)
      .set({ 
        rsvpStatus,
        rsvpUpdatedAt: new Date()
      })
      .where(eq(webinarRegistrationsTable.id, id))
      .returning();
    return result;
  }

  async updateWebinarRegistrationEmailSent(id: string, emailType: 'confirmation' | 'dayBefore' | 'final'): Promise<void> {
    const updateData: Record<string, Date> = {};
    if (emailType === 'confirmation') {
      updateData.confirmationSentAt = new Date();
    } else if (emailType === 'dayBefore') {
      updateData.dayBeforeReminderSentAt = new Date();
    } else if (emailType === 'final') {
      updateData.finalReminderSentAt = new Date();
    }
    
    await db.update(webinarRegistrationsTable)
      .set(updateData)
      .where(eq(webinarRegistrationsTable.id, id));
  }

  async getWebinarRegistrationsNeedingEmail(emailType: 'dayBefore' | 'final'): Promise<WebinarRegistration[]> {
    if (emailType === 'dayBefore') {
      return await db.select().from(webinarRegistrationsTable)
        .where(sql`${webinarRegistrationsTable.dayBeforeReminderSentAt} IS NULL`);
    } else {
      return await db.select().from(webinarRegistrationsTable)
        .where(sql`${webinarRegistrationsTable.finalReminderSentAt} IS NULL`);
    }
  }

  async updateWebinarRegistrationAttendance(id: string, attended: boolean | null): Promise<WebinarRegistration | undefined> {
    const [result] = await db.update(webinarRegistrationsTable)
      .set({ 
        attended,
        attendanceMarkedAt: attended !== null ? new Date() : null
      })
      .where(eq(webinarRegistrationsTable.id, id))
      .returning();
    return result;
  }

  async updateWebinarRegistrationSubscription(id: string, subscriptionLevel: string): Promise<WebinarRegistration | undefined> {
    const [result] = await db.update(webinarRegistrationsTable)
      .set({ subscriptionLevel })
      .where(eq(webinarRegistrationsTable.id, id))
      .returning();
    return result;
  }

  async updateWebinarRegistrationWebinarDate(id: string, webinarDate: Date): Promise<WebinarRegistration | undefined> {
    const [result] = await db.update(webinarRegistrationsTable)
      .set({ webinarDate })
      .where(eq(webinarRegistrationsTable.id, id))
      .returning();
    return result;
  }

  async bulkUpdateWebinarDate(ids: string[], webinarDate: Date): Promise<void> {
    for (const id of ids) {
      await db.update(webinarRegistrationsTable)
        .set({ webinarDate })
        .where(eq(webinarRegistrationsTable.id, id));
    }
  }

  async getWebinarRegistrationsByAttendance(attended: boolean): Promise<WebinarRegistration[]> {
    return await db.select().from(webinarRegistrationsTable)
      .where(eq(webinarRegistrationsTable.attended, attended))
      .orderBy(desc(webinarRegistrationsTable.registeredAt));
  }

  async getWebinarRegistrationsNeedingPostWebinarEmail(): Promise<WebinarRegistration[]> {
    return await db.select().from(webinarRegistrationsTable)
      .where(sql`${webinarRegistrationsTable.postWebinarEmailSentAt} IS NULL`);
  }

  async updateWebinarRegistrationPostEmailSent(id: string): Promise<void> {
    await db.update(webinarRegistrationsTable)
      .set({ postWebinarEmailSentAt: new Date() })
      .where(eq(webinarRegistrationsTable.id, id));
  }

  // Referral Partners
  async getReferralPartners(): Promise<ReferralPartner[]> {
    return await db.select().from(referralPartnersTable)
      .orderBy(desc(referralPartnersTable.createdAt));
  }

  async getReferralPartnerBySlug(slug: string): Promise<ReferralPartner | undefined> {
    const [partner] = await db.select().from(referralPartnersTable)
      .where(eq(referralPartnersTable.slug, slug.toLowerCase()));
    return partner;
  }

  async createReferralPartner(data: InsertReferralPartner): Promise<ReferralPartner> {
    const [partner] = await db.insert(referralPartnersTable)
      .values({ ...data, slug: data.slug.toLowerCase() })
      .returning();
    return partner;
  }

  async updateReferralPartner(id: number, data: Partial<InsertReferralPartner>): Promise<void> {
    await db.update(referralPartnersTable)
      .set(data)
      .where(eq(referralPartnersTable.id, id));
  }

  async deleteReferralPartner(id: number): Promise<void> {
    await db.delete(referralPartnersTable)
      .where(eq(referralPartnersTable.id, id));
  }

  async getWebinarRegistrationsByReferral(referralSource: string): Promise<WebinarRegistration[]> {
    return await db.select().from(webinarRegistrationsTable)
      .where(eq(webinarRegistrationsTable.referralSource, referralSource))
      .orderBy(desc(webinarRegistrationsTable.registeredAt));
  }

  async getReferralStats(): Promise<{ slug: string; count: number; name: string }[]> {
    const partners = await this.getReferralPartners();
    const stats = [];
    for (const partner of partners) {
      const registrations = await this.getWebinarRegistrationsByReferral(partner.slug);
      stats.push({
        slug: partner.slug,
        name: partner.name,
        count: registrations.length
      });
    }
    return stats;
  }

  async deleteWebinarRegistration(id: string): Promise<boolean> {
    const result = await db.delete(webinarRegistrationsTable)
      .where(eq(webinarRegistrationsTable.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Sync webinar registrations with user account subscriptions
  async syncWebinarRegistrationSubscriptions(): Promise<{
    synced: number;
    results: Array<{
      registrationId: string;
      email: string;
      hasAccount: boolean;
      accountSubscription: string | null;
      previousLevel: string | null;
      newLevel: string | null;
    }>;
  }> {
    // Get all webinar registrations
    const registrations = await db.select().from(webinarRegistrationsTable);
    
    // Get all users with their subscription info
    const allUsers = await db.select({
      email: usersTable.email,
      subscriptionStatus: usersTable.subscriptionStatus,
      subscriptionPlan: usersTable.subscriptionPlan,
    }).from(usersTable);
    
    // Create a map of user emails to their subscription info (case-insensitive)
    const userMap = new Map<string, { status: string; plan: string | null }>();
    for (const user of allUsers) {
      userMap.set(user.email.toLowerCase(), {
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan
      });
    }
    
    const results: Array<{
      registrationId: string;
      email: string;
      hasAccount: boolean;
      accountSubscription: string | null;
      previousLevel: string | null;
      newLevel: string | null;
    }> = [];
    
    let syncedCount = 0;
    
    for (const reg of registrations) {
      const userInfo = userMap.get(reg.email.toLowerCase());
      const hasAccount = !!userInfo;
      
      let accountSubscription: string | null = null;
      let newLevel: string | null = null;
      
      if (userInfo) {
        // Determine the subscription level based on user's account
        if (userInfo.plan === 'monthly') {
          accountSubscription = 'monthly';
        } else if (userInfo.plan === 'annual') {
          accountSubscription = 'annual';
        } else if (userInfo.status === 'comped' || userInfo.status === 'active_comped') {
          accountSubscription = 'comped';
        } else if (userInfo.status === 'referral_trial' || userInfo.status === 'beta_free') {
          accountSubscription = 'beta_free';
        } else if (userInfo.status === 'active') {
          // Has active status but no plan - could be free tier or special case
          accountSubscription = 'free';
        } else {
          accountSubscription = 'free';
        }
        
        // Update the registration if it's different from current
        if (reg.subscriptionLevel !== accountSubscription) {
          newLevel = accountSubscription;
          await db.update(webinarRegistrationsTable)
            .set({ subscriptionLevel: accountSubscription })
            .where(eq(webinarRegistrationsTable.id, reg.id));
          syncedCount++;
        }
      }
      
      results.push({
        registrationId: reg.id,
        email: reg.email,
        hasAccount,
        accountSubscription,
        previousLevel: reg.subscriptionLevel,
        newLevel
      });
    }
    
    return {
      synced: syncedCount,
      results
    };
  }

  // Marketing Pixels
  async getAllMarketingPixels(): Promise<MarketingPixel[]> {
    return await db.select().from(marketingPixelsTable).orderBy(marketingPixelsTable.createdAt);
  }

  async getEnabledMarketingPixels(): Promise<MarketingPixel[]> {
    return await db.select().from(marketingPixelsTable).where(eq(marketingPixelsTable.isEnabled, true));
  }

  async getMarketingPixelByPlatform(platform: string): Promise<MarketingPixel | undefined> {
    const [pixel] = await db.select().from(marketingPixelsTable).where(eq(marketingPixelsTable.platform, platform));
    return pixel;
  }

  async createMarketingPixel(data: InsertMarketingPixel): Promise<MarketingPixel> {
    const [pixel] = await db.insert(marketingPixelsTable).values(data).returning();
    return pixel;
  }

  async updateMarketingPixel(id: string, data: Partial<InsertMarketingPixel>): Promise<MarketingPixel | undefined> {
    const [pixel] = await db.update(marketingPixelsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(marketingPixelsTable.id, id))
      .returning();
    return pixel;
  }

  async deleteMarketingPixel(id: string): Promise<boolean> {
    const [deleted] = await db.delete(marketingPixelsTable)
      .where(eq(marketingPixelsTable.id, id))
      .returning();
    return !!deleted;
  }

}

export const storage = new DatabaseStorage();
