import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLenderQuestionnaireSchema, insertLoanProductSchema, insertPropertySchema, users, userProfiles, investmentPreferences, userInvestmentPreferences, savedDeals, type User } from "@shared/schema";
import { z } from "zod";
import { propertyAPIService } from "./services/property-api.factory";
import { db } from "./db";
import { eq, inArray, desc, and } from "drizzle-orm";
import { hashPassword, comparePassword } from "./auth";
import passport from "./auth";
import { ensureAuthenticated, requireRole } from "./auth";
import { emailService } from "./services/email.service";
import crypto from "crypto";

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication Routes
  const registerSchema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(1),
    referralCode: z.string().optional(),
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const userReferralCode = generateReferralCode();
      const verificationToken = generateVerificationToken();
      const verificationExpiry = new Date();
      verificationExpiry.setHours(verificationExpiry.getHours() + 24);
      
      let referredByUserId = null;
      let subscriptionStatus = 'inactive';
      
      if (validatedData.referralCode) {
        const [referrer] = await db
          .select()
          .from(users)
          .where(eq(users.referralCode, validatedData.referralCode))
          .limit(1);
        
        if (referrer) {
          referredByUserId = referrer.id;
          subscriptionStatus = 'referral_trial';
        }
      }

      const [newUser] = await db
        .insert(users)
        .values({
          username: validatedData.username,
          email: validatedData.email,
          password: hashedPassword,
          role: 'user',
          subscriptionStatus,
          referralCode: userReferralCode,
          referredBy: referredByUserId,
          isEmailVerified: false,
          verificationToken,
          verificationExpiry,
        })
        .returning();

      await db.insert(userProfiles).values({
        userId: newUser.id,
        fullName: validatedData.fullName,
      });

      const emailSent = await emailService.sendVerificationEmail(
        newUser.email,
        newUser.username,
        verificationToken
      );

      if (!emailSent) {
        console.error('Failed to send verification email to:', newUser.email);
      }

      res.json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        message: emailSent 
          ? "Registration successful! Please check your email to verify your account before logging in." 
          : "Registration successful! Please contact support to verify your account.",
        requiresVerification: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid registration data", details: error.errors });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Invalid credentials" });
      }
      
      if (!user.isEmailVerified) {
        return res.status(403).json({ 
          error: "Email not verified",
          message: "Please verify your email address before logging in. Check your inbox for the verification link.",
          requiresVerification: true,
        });
      }
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/admin-login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Invalid credentials" });
      }
      
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Invalid verification token" });
      }

      if (user.verificationExpiry && new Date() > user.verificationExpiry) {
        return res.status(400).json({ error: "Verification token has expired" });
      }

      if (user.isEmailVerified) {
        return res.json({ message: "Email already verified" });
      }

      await db
        .update(users)
        .set({
          isEmailVerified: true,
          verificationToken: null,
          verificationExpiry: null,
        })
        .where(eq(users.id, user.id));

      const emailSent = await emailService.sendWelcomeEmail(user.email, user.username);
      
      if (!emailSent) {
        console.error('Failed to send welcome email to:', user.email);
      }

      res.json({ 
        message: "Email verified successfully! Welcome to RE Data Metrix.",
        username: user.username,
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ error: "Email verification failed" });
    }
  });

  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.json({ 
          message: "If an account exists with this email, a password reset link will be sent." 
        });
      }

      const resetToken = generateVerificationToken();
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1);

      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
        })
        .where(eq(users.id, user.id));

      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        user.username,
        resetToken
      );

      if (!emailSent) {
        console.error('Failed to send password reset email to:', user.email);
      }

      res.json({ 
        message: "If an account exists with this email, a password reset link will be sent." 
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ error: "Password reset request failed" });
    }
  });

  app.post("/api/auth/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      if (user.passwordResetExpiry && new Date() > user.passwordResetExpiry) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const hashedPassword = await hashPassword(password);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Lender Authentication Routes
  app.post("/api/lenders/invite", async (req, res) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      // Generate random temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();

      const result = await storage.createLenderInvite(username, tempPassword);
      
      // Send email with credentials - use request origin to generate correct URL
      const protocol = req.protocol || "https";
      const host = req.get("host") || "localhost:5000";
      
      if (result.isNewInvite) {
        // New invite - send signup link
        const inviteUrl = `${protocol}://${host}/lender-signup/${result.token}`;
        await emailService.sendLenderCredentials(username, username, tempPassword, inviteUrl);
        res.json({
          message: "Lender invite created successfully",
          token: result.token,
          inviteUrl: inviteUrl,
          isNewInvite: true,
          type: "invite"
        });
      } else {
        // Password reset for existing lender - send password reset email
        const resetUrl = `${protocol}://${host}/lender-password-reset/${result.token}`;
        await emailService.sendLenderCredentials(username, username, tempPassword, resetUrl);
        res.json({
          message: "Password reset email sent to lender",
          token: result.token,
          isNewInvite: false,
          type: "password_reset"
        });
      }
    } catch (error) {
      console.error('Lender invite error:', error);
      res.status(500).json({ error: "Failed to create lender invite" });
    }
  });

  app.get("/api/lenders/validate-invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const lender = await storage.validateLenderInvite(token);

      if (!lender) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }

      res.json({
        email: lender.email,
        isValid: true,
      });
    } catch (error) {
      res.status(500).json({ error: "Validation failed" });
    }
  });

  app.post("/api/lenders/accept-invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { companyName, contactName, phone, website } = req.body;

      const lender = await storage.validateLenderInvite(token);
      if (!lender) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }

      req.login(lender, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login after signup failed" });
        }
        res.json({
          message: "Lender account setup successfully",
          lender: lender,
        });
      });
    } catch (error) {
      console.error('Accept invite error:', error);
      res.status(500).json({ error: "Failed to complete signup" });
    }
  });

  app.post("/api/lenders/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any | false, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json({
          id: user.id,
          email: user.email,
          companyName: user.companyName,
        });
      });
    })(req, res, next);
  });

  // Lender Questionnaire Routes
  app.get("/api/lender-questionnaires/:lenderId", async (req, res) => {
    try {
      const { lenderId } = req.params;
      const questionnaire = await storage.getLenderQuestionnaire(lenderId);
      res.json(questionnaire || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questionnaire" });
    }
  });

  app.post("/api/lender-questionnaires/:lenderId", async (req, res) => {
    try {
      const { lenderId } = req.params;
      const validatedData = insertLenderQuestionnaireSchema.parse({
        ...req.body,
        lenderId,
      });

      const questionnaire = await storage.upsertLenderQuestionnaire(validatedData);
      res.json(questionnaire);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid questionnaire data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save questionnaire" });
    }
  });

  // Loan Products Routes
  app.get("/api/loan-products/:lenderId", async (req, res) => {
    try {
      const { lenderId } = req.params;
      const products = await storage.getLoanProducts(lenderId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan products" });
    }
  });

  app.post("/api/loan-products", async (req, res) => {
    try {
      const validatedData = insertLoanProductSchema.parse(req.body);
      const product = await storage.createLoanProduct(validatedData);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create loan product" });
    }
  });

  app.patch("/api/loan-products/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const validatedData = insertLoanProductSchema.parse(req.body);
      const product = await storage.updateLoanProduct(productId, validatedData);
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update loan product" });
    }
  });

  app.delete("/api/loan-products/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      await storage.deleteLoanProduct(productId);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete loan product" });
    }
  });

  // Deal Analysis Routes
  app.post("/api/deal-analyses", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const data = insertPropertySchema.parse({...req.body, userId});

      const dealAnalysis = await storage.createDealAnalysis(data);
      res.json(dealAnalysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid deal data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create deal analysis" });
    }
  });

  app.get("/api/deal-analyses", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const deals = await storage.getDealAnalysesByUser(userId);
      res.json(deals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deal analyses" });
    }
  });

  app.get("/api/deal-analyses/:dealId", ensureAuthenticated, async (req, res) => {
    try {
      const { dealId } = req.params;
      const userId = (req.user as User).id;

      const deal = await storage.getDealAnalysis(dealId);
      if (!deal || deal.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(deal);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deal analysis" });
    }
  });

  app.patch("/api/deal-analyses/:dealId", ensureAuthenticated, async (req, res) => {
    try {
      const { dealId } = req.params;
      const userId = (req.user as User).id;

      const deal = await storage.getDealAnalysis(dealId);
      if (!deal || deal.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedDeal = await storage.updateDealAnalysis(dealId, req.body);
      res.json(updatedDeal);
    } catch (error) {
      res.status(500).json({ error: "Failed to update deal analysis" });
    }
  });

  app.delete("/api/deal-analyses/:dealId", ensureAuthenticated, async (req, res) => {
    try {
      const { dealId } = req.params;
      const userId = (req.user as User).id;

      const deal = await storage.getDealAnalysis(dealId);
      if (!deal || deal.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteDealAnalysis(dealId);
      res.json({ message: "Deal analysis deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete deal analysis" });
    }
  });

  app.post("/api/lenders", async (req, res) => {
    try {
      const lenders = await storage.getAllLenders();
      res.json(lenders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lenders" });
    }
  });

  app.get("/api/lenders", async (req, res) => {
    try {
      const lenders = await storage.getAllLenders();
      res.json(lenders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lenders" });
    }
  });

  app.get("/api/lenders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const lender = await storage.getLender(id);
      if (!lender) {
        return res.status(404).json({ error: "Lender not found" });
      }
      res.json(lender);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lender" });
    }
  });

  app.post("/api/prelaunch-signups", async (req, res) => {
    try {
      const { name, company, email, phone, consent, source } = req.body;

      res.json({
        message: "Thank you for signing up!",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create signup" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      const emailSent = await emailService.sendContactConfirmation(
        email,
        name
      );

      if (!emailSent) {
        console.error('Failed to send contact confirmation to:', email);
      }

      res.json({
        message: "Thank you for contacting us. We'll get back to you soon.",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to send contact message" });
    }
  });

  // Rental Analysis Route
  app.post("/api/rental-analyses", ensureAuthenticated, async (req, res) => {
    try {
      res.json({ message: "Rental analysis created" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create rental analysis" });
    }
  });

  app.get("/api/rental-analyses", ensureAuthenticated, async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rental analyses" });
    }
  });

  // Investment Preferences
  app.get("/api/investment-preferences", async (req, res) => {
    try {
      const preferences = await db.select().from(investmentPreferences);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.post("/api/user-investment-preferences", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { preferenceId } = req.body;

      const result = await db
        .insert(userInvestmentPreferences)
        .values({
          userId,
          preferenceId,
        })
        .returning();

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to save preference" });
    }
  });

  app.get("/api/user-investment-preferences", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const preferences = await db
        .select()
        .from(userInvestmentPreferences)
        .where(eq(userInvestmentPreferences.userId, userId));

      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Create HTTP server
  const server = createServer(app);
  return server;
}
