import { 
  type User, 
  type InsertUser,
  type LenderQuestionnaire,
  type InsertLenderQuestionnaire,
  type LoanProduct,
  type InsertLoanProduct,
  users as usersTable,
  lenders as lendersTable,
  lenderQuestionnaires as lenderQuestionnairesTable,
  loanProducts as loanProductsTable
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  updateLenderCompanyInfo(data: any): Promise<any>;
  getLenderCompanyInfo(lenderId: string): Promise<any>;
  
  upsertLenderQuestionnaire(data: InsertLenderQuestionnaire): Promise<LenderQuestionnaire>;
  getLenderQuestionnaire(lenderId: string): Promise<LenderQuestionnaire | undefined>;
  searchLenders(criteria: any): Promise<any[]>;
  
  createLoanProduct(data: InsertLoanProduct): Promise<LoanProduct>;
  getLoanProducts(lenderId: string): Promise<LoanProduct[]>;
  updateLoanProduct(id: string, data: Partial<InsertLoanProduct>): Promise<LoanProduct | undefined>;
  deleteLoanProduct(id: string): Promise<boolean>;
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
    const user: User = { ...insertUser, id };
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
        offerNonTraditionalLending: data.offerNonTraditionalLending ?? existing.offerNonTraditionalLending ?? null,
        workWithNewInvestors: data.workWithNewInvestors ?? existing.workWithNewInvestors ?? null,
        minCreditScore: data.minCreditScore ?? existing.minCreditScore ?? null,
        offerDeferredPayment: data.offerDeferredPayment ?? existing.offerDeferredPayment ?? null,
        offerRolledPoints: data.offerRolledPoints ?? existing.offerRolledPoints ?? null,
        offer100PercentFunding: data.offer100PercentFunding ?? existing.offer100PercentFunding ?? null,
        offerMultiUnitFinancing: data.offerMultiUnitFinancing ?? existing.offerMultiUnitFinancing ?? null,
        offerDscrLoans: data.offerDscrLoans ?? existing.offerDscrLoans ?? null,
        offerLoansAllStates: data.offerLoansAllStates ?? existing.offerLoansAllStates ?? null,
        statesServiced: data.statesServiced ?? existing.statesServiced ?? null,
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
        offerNonTraditionalLending: data.offerNonTraditionalLending ?? null,
        workWithNewInvestors: data.workWithNewInvestors ?? null,
        minCreditScore: data.minCreditScore ?? null,
        offerDeferredPayment: data.offerDeferredPayment ?? null,
        offerRolledPoints: data.offerRolledPoints ?? null,
        offer100PercentFunding: data.offer100PercentFunding ?? null,
        offerMultiUnitFinancing: data.offerMultiUnitFinancing ?? null,
        offerDscrLoans: data.offerDscrLoans ?? null,
        offerLoansAllStates: data.offerLoansAllStates ?? null,
        statesServiced: data.statesServiced ?? null,
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
      if (criteria.offerMultiUnitFinancing && criteria.offerMultiUnitFinancing !== "" && criteria.offerMultiUnitFinancing !== "any" &&
          q.offerMultiUnitFinancing !== criteria.offerMultiUnitFinancing) {
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
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.referralLink !== undefined) updateData.referralLink = data.referralLink;
    
    await db.update(lendersTable).set(updateData).where(eq(lendersTable.id, lenderId));
    
    const result = await db.select().from(lendersTable).where(eq(lendersTable.id, lenderId)).limit(1);
    return { ...result[0], companyDescription: data.companyDescription };
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
          offerMultiUnitFinancing: data.offerMultiUnitFinancing,
          offerDscrLoans: data.offerDscrLoans,
          offerLoansAllStates: data.offerLoansAllStates,
          statesServiced: data.statesServiced,
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
      if (criteria.offerMultiUnitFinancing && criteria.offerMultiUnitFinancing !== "" && criteria.offerMultiUnitFinancing !== "any" &&
          q.offerMultiUnitFinancing !== criteria.offerMultiUnitFinancing) {
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

  async updateLoanProduct(id: string, data: Partial<InsertLoanProduct>): Promise<LoanProduct | undefined> {
    const result = await db.update(loanProductsTable).set(data).where(eq(loanProductsTable.id, id)).returning();
    return result[0];
  }

  async deleteLoanProduct(id: string): Promise<boolean> {
    const result = await db.delete(loanProductsTable).where(eq(loanProductsTable.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
