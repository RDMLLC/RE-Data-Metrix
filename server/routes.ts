import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLenderQuestionnaireSchema, insertLoanProductSchema } from "@shared/schema";
import { z } from "zod";

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

  const httpServer = createServer(app);

  return httpServer;
}
