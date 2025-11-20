import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLenderQuestionnaireSchema, insertLoanProductSchema, insertPropertySchema } from "@shared/schema";
import { z } from "zod";
import { propertyAPIService } from "./services/property-api.factory";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Company Info Routes
  const companyInfoSchema = z.object({
    lenderId: z.string(),
    companyName: z.string().optional(),
    contactName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    referralLink: z.string().optional(),
    referralAmount: z.preprocess(
      (val) => val === null || val === undefined || val === "" ? undefined : val,
      z.coerce.number().refine((val) => !isNaN(val) && isFinite(val)).optional()
    ),
    referralType: z.enum(["$", "%"]).optional(),
    companyDescription: z.string().optional(),
  });

  app.post("/api/lender-company-info", async (req, res) => {
    try {
      const validatedData = companyInfoSchema.parse(req.body);
      const updated = await storage.updateLenderCompanyInfo(validatedData);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Invalid company info data" });
    }
  });

  app.get("/api/lender-company-info/:lenderId", async (req, res) => {
    try {
      const companyInfo = await storage.getLenderCompanyInfo(req.params.lenderId);
      if (!companyInfo) {
        return res.status(404).json({ error: "Company info not found" });
      }
      res.json(companyInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company info" });
    }
  });
  
  // Lender Questionnaire Routes
  app.post("/api/lender-questionnaire", async (req, res) => {
    try {
      const validatedData = insertLenderQuestionnaireSchema.parse(req.body);
      const questionnaire = await storage.upsertLenderQuestionnaire(validatedData);
      res.json(questionnaire);
    } catch (error) {
      res.status(400).json({ error: "Invalid questionnaire data" });
    }
  });

  app.get("/api/lender-questionnaire/:lenderId", async (req, res) => {
    try {
      const questionnaire = await storage.getLenderQuestionnaire(req.params.lenderId);
      if (!questionnaire) {
        return res.status(404).json({ error: "Questionnaire not found" });
      }
      res.json(questionnaire);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questionnaire" });
    }
  });

  // Lender Matching Routes
  const lenderMatchQuerySchema = z.object({
    loanType: z.string(),
    state: z.string().length(2),
    creditScore: z.coerce.number().min(300).max(850),
  });

  app.get("/api/lenders/match", async (req, res) => {
    try {
      const validatedQuery = lenderMatchQuerySchema.parse(req.query);
      const { matchLendersByLoanType } = await import("./services/lender-matching.service");
      
      const matchedLenders = await matchLendersByLoanType({
        loanType: validatedQuery.loanType,
        state: validatedQuery.state,
        creditScore: validatedQuery.creditScore,
        storage,
      });
      
      res.json(matchedLenders);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      res.status(500).json({ error: "Failed to match lenders" });
    }
  });

  // Loan Product Routes
  app.post("/api/loan-products", async (req, res) => {
    try {
      const validatedData = insertLoanProductSchema.parse(req.body);
      const product = await storage.createLoanProduct(validatedData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid loan product data" });
    }
  });

  app.get("/api/loan-products/:lenderId", async (req, res) => {
    try {
      const products = await storage.getLoanProducts(req.params.lenderId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan products" });
    }
  });

  app.patch("/api/loan-products/:id", async (req, res) => {
    try {
      const updated = await storage.updateLoanProduct(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Loan product not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update loan product" });
    }
  });

  app.delete("/api/loan-products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLoanProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Loan product not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete loan product" });
    }
  });

  // Search Lenders Route
  app.post("/api/search-lenders", async (req, res) => {
    try {
      const results = await storage.searchLenders(req.body);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to search lenders" });
    }
  });

  // Property Lookup Route
  const propertyLookupSchema = z.object({
    url: z.string().url("Valid property URL is required").refine(
      (url) => url.includes('redfin.com') || url.includes('zillow.com'),
      { message: "URL must be from Redfin or Zillow" }
    ),
  });

  app.post("/api/property/lookup", async (req, res) => {
    try {
      const { url } = propertyLookupSchema.parse(req.body);
      const propertyData = await propertyAPIService.getPropertyByUrl(url);
      
      if (!propertyData) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      res.json(propertyData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Property lookup error:", error);
      res.status(500).json({ error: "Failed to fetch property data" });
    }
  });

  // Step 6 Results API
  const step6RequestSchema = z.object({
    dealInputs: z.object({
      purchasePrice: z.number(),
      rehabBudget: z.number(),
      arv: z.number(),
      projectLength: z.number(),
      closingCostsBuy: z.number(),
      carryingCosts: z.number(),
      sellPrice: z.number(),
      closingCostsSell: z.number(),
      commission: z.number(),
      monthlyInsurance: z.number(),
      monthlyUtilities: z.number(),
      monthlyPropertyTax: z.number(),
      monthlyHoa: z.number(),
    }),
    criteriaSelection: z.object({
      useDefaultCriteria: z.boolean(),
      primary: z.enum(['profit', 'out-of-pocket', 'fastest']).optional(),
      secondary: z.enum(['profit', 'out-of-pocket', 'fastest']).optional(),
    }),
    userLoan: z.object({
      desiredLoanAmount: z.number().optional(),
      interestRate: z.number(),
      interestDeferred: z.boolean(),
      points: z.number(),
      pointsDeferred: z.boolean(),
      maxLoanToArv: z.number().optional(),
      appraisalRequired: z.boolean(),
      appraisalFee: z.number().optional(),
      drawFees: z.number().optional(),
      loanDocPrepFees: z.number().optional(),
    }).optional(),
    numberOfDraws: z.number().default(3),
    excludeProductIds: z.array(z.string()).default([]),
  });

  app.post("/api/deal-analysis/results", async (req, res) => {
    try {
      const validatedData = step6RequestSchema.parse(req.body);
      
      const { rankLoanProducts } = await import("./services/lender-ranking.service");
      const { createCashSaleColumn, createLoanComparisonColumn } = await import("./services/loan-calculation.service");
      
      const loanProducts = await storage.getAllActiveLoanProducts();
      const lenders = await storage.getAllLenders();
      
      const filteredProducts = validatedData.excludeProductIds.length > 0
        ? loanProducts.filter(p => !validatedData.excludeProductIds.includes(p.id))
        : loanProducts;
      
      const rankedProducts = rankLoanProducts({
        dealInputs: validatedData.dealInputs,
        loanProducts: filteredProducts,
        lenders,
        useDefaultCriteria: validatedData.criteriaSelection.useDefaultCriteria,
        primaryCriteria: validatedData.criteriaSelection.primary,
        secondaryCriteria: validatedData.criteriaSelection.secondary,
        numberOfDraws: validatedData.numberOfDraws,
      });
      
      const cashSaleColumn = createCashSaleColumn(validatedData.dealInputs);
      
      let userLoanColumn = null;
      if (validatedData.userLoan) {
        const loanInputs = {
          maxLtvBuy: 80,
          maxLendRehab: 100,
          maxLoanArv: validatedData.userLoan.maxLoanToArv || 70,
          interestRate: validatedData.userLoan.interestRate,
          interestDeferred: validatedData.userLoan.interestDeferred,
          drawnFundsOnly: false,
          points: validatedData.userLoan.points,
          pointsDeferred: validatedData.userLoan.pointsDeferred,
          fees: validatedData.userLoan.loanDocPrepFees || 0,
          appraisalCost: validatedData.userLoan.appraisalRequired ? 
                        (validatedData.userLoan.appraisalFee || 500) : 0,
          costPerDraw: validatedData.userLoan.drawFees || 0,
        };
        
        userLoanColumn = createLoanComparisonColumn(
          'user-loan',
          validatedData.dealInputs,
          loanInputs,
          validatedData.numberOfDraws
        );
      }
      
      const lenderColumns = rankedProducts.slice(0, 3).map(rp => {
        const loanInputs = {
          maxLtvBuy: parseFloat(rp.loanProduct.maxLtvBuy || '80'),
          maxLendRehab: parseFloat(rp.loanProduct.maxLendRehab || '100'),
          maxLoanArv: parseFloat(rp.loanProduct.maxLoanArv || '70'),
          interestRate: parseFloat(rp.loanProduct.interestRate || '12'),
          interestDeferred: rp.loanProduct.interestDeferred || false,
          drawnFundsOnly: rp.loanProduct.drawnFundsOnly || false,
          points: parseFloat(rp.loanProduct.points || '0'),
          pointsDeferred: rp.loanProduct.pointsDeferred || false,
          fees: parseFloat(rp.loanProduct.fees || '0'),
          appraisalCost: rp.loanProduct.appraisalRequired ? 
                        parseFloat(rp.loanProduct.estimatedAppraisalCost || '500') : 0,
          costPerDraw: parseFloat(rp.loanProduct.costPerDraw || '0'),
        };
        
        return createLoanComparisonColumn(
          'lender',
          validatedData.dealInputs,
          loanInputs,
          validatedData.numberOfDraws,
          undefined,
          {
            lenderId: rp.lender.id,
            lenderName: rp.lender.companyName,
            productId: rp.loanProduct.id,
            productName: rp.loanProduct.productName,
            timeToClose: rp.loanProduct.timeToClose || undefined,
            referralLink: rp.lender.referralLink || undefined,
          }
        );
      });
      
      res.json({
        cashSaleColumn,
        userLoanColumn,
        lenderColumns,
        criteriaUsed: {
          useDefaultCriteria: validatedData.criteriaSelection.useDefaultCriteria,
          primary: validatedData.criteriaSelection.primary,
          secondary: validatedData.criteriaSelection.secondary,
        },
        numberOfDraws: validatedData.numberOfDraws,
        allRankedProducts: rankedProducts.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Step 6 results error:", error);
      res.status(500).json({ error: "Failed to calculate loan results" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
