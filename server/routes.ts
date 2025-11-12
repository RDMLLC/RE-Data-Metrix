import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLenderQuestionnaireSchema, insertLoanProductSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
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

  const httpServer = createServer(app);

  return httpServer;
}
