import { 
  type User, 
  type InsertUser,
  type LenderQuestionnaire,
  type InsertLenderQuestionnaire,
  type LoanProduct,
  type InsertLoanProduct
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  updateLenderCompanyInfo(data: any): Promise<any>;
  getLenderCompanyInfo(lenderId: string): Promise<any>;
  
  upsertLenderQuestionnaire(data: InsertLenderQuestionnaire): Promise<LenderQuestionnaire>;
  getLenderQuestionnaire(lenderId: string): Promise<LenderQuestionnaire | undefined>;
  
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
    
    const questionnaire = await this.getLenderQuestionnaire(lenderId);
    if (questionnaire && data.companyDescription) {
      await this.upsertLenderQuestionnaire({
        lenderId,
        companyDescription: data.companyDescription,
        businessStructure: questionnaire.businessStructure,
        yearsInBusiness: questionnaire.yearsInBusiness,
        statesOperating: questionnaire.statesOperating,
        specializations: questionnaire.specializations,
        minLoanAmount: questionnaire.minLoanAmount,
        maxLoanAmount: questionnaire.maxLoanAmount,
        creditRequirements: questionnaire.creditRequirements,
        workWithNewInvestors: questionnaire.workWithNewInvestors,
        offerDeferredInterest: questionnaire.offerDeferredInterest,
      });
    }
    
    return updated;
  }

  async getLenderCompanyInfo(lenderId: string): Promise<any> {
    const info = this.companyInfo.get(lenderId);
    const questionnaire = await this.getLenderQuestionnaire(lenderId);
    
    return {
      ...info,
      companyDescription: questionnaire?.companyDescription || info?.companyDescription,
    };
  }

  async upsertLenderQuestionnaire(data: InsertLenderQuestionnaire): Promise<LenderQuestionnaire> {
    const existing = Array.from(this.questionnaires.values()).find(
      (q) => q.lenderId === data.lenderId
    );
    
    if (existing) {
      const updated: LenderQuestionnaire = {
        ...existing,
        ...data,
        companyDescription: data.companyDescription ?? existing.companyDescription ?? null,
        businessStructure: data.businessStructure ?? existing.businessStructure ?? null,
        yearsInBusiness: data.yearsInBusiness ?? existing.yearsInBusiness ?? null,
        statesOperating: data.statesOperating ?? existing.statesOperating ?? null,
        specializations: data.specializations ?? existing.specializations ?? null,
        minLoanAmount: data.minLoanAmount ?? existing.minLoanAmount ?? null,
        maxLoanAmount: data.maxLoanAmount ?? existing.maxLoanAmount ?? null,
        creditRequirements: data.creditRequirements ?? existing.creditRequirements ?? null,
        workWithNewInvestors: data.workWithNewInvestors ?? existing.workWithNewInvestors ?? false,
        offerDeferredInterest: data.offerDeferredInterest ?? existing.offerDeferredInterest ?? false,
        updatedAt: new Date(),
      };
      this.questionnaires.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const questionnaire: LenderQuestionnaire = {
        id,
        lenderId: data.lenderId,
        companyDescription: data.companyDescription ?? null,
        businessStructure: data.businessStructure ?? null,
        yearsInBusiness: data.yearsInBusiness ?? null,
        statesOperating: data.statesOperating ?? null,
        specializations: data.specializations ?? null,
        minLoanAmount: data.minLoanAmount ?? null,
        maxLoanAmount: data.maxLoanAmount ?? null,
        creditRequirements: data.creditRequirements ?? null,
        workWithNewInvestors: data.workWithNewInvestors ?? false,
        offerDeferredInterest: data.offerDeferredInterest ?? false,
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

export const storage = new MemStorage();
