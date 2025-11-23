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
  users as usersTable,
  lenders as lendersTable,
  lenderQuestionnaires as lenderQuestionnairesTable,
  loanProducts as loanProductsTable,
  properties as propertiesTable,
  dealAnalyses as dealAnalysesTable,
  dealAnalysisAccess as dealAnalysisAccessTable,
  lenderReferrals as lenderReferralsTable
} from "@shared/schema";
import { randomBytes, randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gt, desc } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLender(id: string): Promise<Lender | undefined>;
  getLenderByEmail(email: string): Promise<Lender | undefined>;
  getLenderByUsername(username: string): Promise<Lender | undefined>;
  createLenderInvite(username: string, password: string): Promise<{token: string, lender: Lender}>;
  validateLenderInvite(token: string): Promise<Lender | undefined>;
  completeLenderSignup(lenderId: string, password: string, contactName: string, phone?: string): Promise<Lender>;
  
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      role: insertUser.role || 'user',
      subscriptionStatus: insertUser.subscriptionStatus || 'inactive',
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
    
    const matchingQuestionnaires = questionnaires.filter((q) => {
      if (criteria.brokerOrDirectLender && criteria.brokerOrDirectLender !== "" && criteria.brokerOrDirectLender !== "any" &&
          q.brokerOrDirectLender !== criteria.brokerOrDirectLender) {
        return false;
      }
      if (criteria.fastestClosingTime && criteria.fastestClosingTime !== "" && criteria.fastestClosingTime !== "any" &&
          q.fastestClosingTime !== criteria.fastestClosingTime) {
        return false;
      }
      if (criteria.offerNonTraditionalLending && criteria.offerNonTraditionalLending !== "" && criteria.offerNonTraditionalLending !== "any" &&
          q.offerNonTraditionalLending !== criteria.offerNonTraditionalLending) {
        return false;
      }
      if (criteria.workWithNewInvestors && criteria.workWithNewInvestors !== "" && criteria.workWithNewInvestors !== "any" &&
          q.workWithNewInvestors !== criteria.workWithNewInvestors) {
        return false;
      }
      if (criteria.minCreditScore && criteria.minCreditScore !== "" && criteria.minCreditScore !== "any" &&
          q.minCreditScore !== criteria.minCreditScore) {
        return false;
      }
      if (criteria.offerDeferredPayment && criteria.offerDeferredPayment !== "" && criteria.offerDeferredPayment !== "any" &&
          q.offerDeferredPayment !== criteria.offerDeferredPayment) {
        return false;
      }
      if (criteria.offerRolledPoints && criteria.offerRolledPoints !== "" && criteria.offerRolledPoints !== "any" &&
          q.offerRolledPoints !== criteria.offerRolledPoints) {
        return false;
      }
      if (criteria.offer100PercentFunding && criteria.offer100PercentFunding !== "" && criteria.offer100PercentFunding !== "any" &&
          q.offer100PercentFunding !== criteria.offer100PercentFunding) {
        return false;
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

  async createLenderInvite(username: string, password: string): Promise<{token: string, lender: Lender}> {
    throw new Error("Not implemented in MemStorage");
  }

  async validateLenderInvite(token: string): Promise<Lender | undefined> {
    throw new Error("Not implemented in MemStorage");
  }

  async completeLenderSignup(lenderId: string, password: string, contactName: string, phone?: string): Promise<Lender> {
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
    
    const matchingQuestionnaires = questionnaires.filter((q) => {
      if (criteria.brokerOrDirectLender && criteria.brokerOrDirectLender !== "" && criteria.brokerOrDirectLender !== "any" &&
          q.brokerOrDirectLender !== criteria.brokerOrDirectLender) {
        return false;
      }
      if (criteria.fastestClosingTime && criteria.fastestClosingTime !== "" && criteria.fastestClosingTime !== "any" &&
          q.fastestClosingTime !== criteria.fastestClosingTime) {
        return false;
      }
      if (criteria.offerNonTraditionalLending && criteria.offerNonTraditionalLending !== "" && criteria.offerNonTraditionalLending !== "any" &&
          q.offerNonTraditionalLending !== criteria.offerNonTraditionalLending) {
        return false;
      }
      if (criteria.workWithNewInvestors && criteria.workWithNewInvestors !== "" && criteria.workWithNewInvestors !== "any" &&
          q.workWithNewInvestors !== criteria.workWithNewInvestors) {
        return false;
      }
      if (criteria.minCreditScore && criteria.minCreditScore !== "" && criteria.minCreditScore !== "any" &&
          q.minCreditScore !== criteria.minCreditScore) {
        return false;
      }
      if (criteria.offerDeferredPayment && criteria.offerDeferredPayment !== "" && criteria.offerDeferredPayment !== "any" &&
          q.offerDeferredPayment !== criteria.offerDeferredPayment) {
        return false;
      }
      if (criteria.offerRolledPoints && criteria.offerRolledPoints !== "" && criteria.offerRolledPoints !== "any" &&
          q.offerRolledPoints !== criteria.offerRolledPoints) {
        return false;
      }
      if (criteria.offer100PercentFunding && criteria.offer100PercentFunding !== "" && criteria.offer100PercentFunding !== "any" &&
          q.offer100PercentFunding !== criteria.offer100PercentFunding) {
        return false;
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

  async createLenderInvite(username: string, password: string): Promise<{token: string, lender: Lender}> {
    const token = randomBytes(32).toString('base64url');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    
    const hashedPassword = await hashPassword(password);
    
    // Check if lender already exists with this email
    const existing = await db.select().from(lendersTable).where(eq(lendersTable.email, username)).limit(1);
    
    if (existing.length > 0) {
      // Update existing lender with new invite token and password
      const result = await db.update(lendersTable)
        .set({
          password: hashedPassword,
          inviteToken: token,
          inviteExpiry: expiry,
          inviteAccepted: false,
        })
        .where(eq(lendersTable.email, username))
        .returning();
      return { token, lender: result[0] };
    }
    
    // Create new lender
    const result = await db.insert(lendersTable).values({
      email: username,
      companyName: 'Pending',
      password: hashedPassword,
      contactName: 'Pending',
      inviteToken: token,
      inviteExpiry: expiry,
      inviteAccepted: false,
    }).returning();
    
    return { token, lender: result[0] };
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

  async completeLenderSignup(lenderId: string, password: string, contactName: string, phone?: string): Promise<Lender> {
    const updateData: any = {
      password,
      contactName,
      inviteAccepted: true,
    };
    if (phone) updateData.phone = phone;
    
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
}

export const storage = new DatabaseStorage();
