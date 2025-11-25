import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLenderQuestionnaireSchema, insertLoanProductSchema, insertPropertySchema, users, userProfiles, investmentPreferences, userInvestmentPreferences, savedDeals, savedLenders, lenders, loanProducts, type User } from "@shared/schema";
import { z } from "zod";
import { propertyAPIService } from "./services/property-api.factory";
import { db } from "./db";
import { eq, inArray, desc, and, sql } from "drizzle-orm";
import { hashPassword, comparePassword } from "./auth";
import passport, { ensureAdmin, ensureLenderAuthenticated, ensureAuthenticated, requireRole } from "./auth";
import { emailService } from "./services/email.service";
import crypto from "crypto";
import multer from "multer";
import { parse } from "csv-parse/sync";

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

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1
  }
});

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
    passport.authenticate("user-local", (err: any, user: User | false, info: { message: string }) => {
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
    passport.authenticate("user-local", (err: any, user: User | false, info: { message: string }) => {
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
      console.log('[PASSWORD RESET] Request received for email:', email);

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);

      if (!user) {
        console.log('[PASSWORD RESET] No user found for email:', email);
        return res.json({ 
          message: "If an account exists with this email, a password reset link will be sent." 
        });
      }

      console.log('[PASSWORD RESET] User found:', user.username, '- Generating token...');
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

      console.log('[PASSWORD RESET] Token saved to database. Attempting to send email...');
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        user.username,
        resetToken
      );

      console.log('[PASSWORD RESET] Email service returned:', emailSent);
      if (!emailSent) {
        console.error('[PASSWORD RESET] WARNING: Email service reported failure for:', user.email);
      } else {
        console.log('[PASSWORD RESET] Email sent successfully to:', user.email);
      }

      res.json({ 
        message: "If an account exists with this email, a password reset link will be sent." 
      });
    } catch (error) {
      console.error('[PASSWORD RESET] Error:', error);
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
      const { username, companyName, referralAmount, referralType } = req.body;

      if (!username) {
        return res.status(400).json({ error: "Email is required" });
      }

      if (!companyName) {
        return res.status(400).json({ error: "Company name is required" });
      }

      if (referralAmount === undefined || referralAmount === null || referralAmount === "") {
        return res.status(400).json({ error: "Referral amount is required" });
      }

      if (!referralType) {
        return res.status(400).json({ error: "Referral type is required" });
      }

      const parsedReferralAmount = parseFloat(referralAmount);
      if (isNaN(parsedReferralAmount) || parsedReferralAmount <= 0) {
        return res.status(400).json({ error: "Referral amount must be a positive number" });
      }

      // Generate random temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();

      const result = await storage.createLenderInvite(username, tempPassword, companyName, parsedReferralAmount, referralType);
      
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
        // Password reset for existing lender - send password reset email with temp password
        await emailService.sendLenderCredentials(username, username, tempPassword, `${protocol}://${host}/lender-login`);
        res.json({
          message: "Password reset email sent to lender",
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
        valid: true,
        lenderId: lender.id,
        email: lender.email,
        companyName: lender.companyName,
      });
    } catch (error) {
      res.status(500).json({ error: "Validation failed" });
    }
  });

  app.post("/api/lenders/accept-invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password, companyName, contactName, phone, website } = req.body;

      const lender = await storage.validateLenderInvite(token);
      if (!lender) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }

      const updatedLender = await storage.completeLenderSignup(
        lender.id,
        password,
        contactName,
        phone,
        companyName
      );

      req.login({ ...updatedLender, userType: 'lender' }, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login after signup failed" });
        }
        res.json({
          message: "Lender account setup successfully",
          lender: updatedLender,
        });
      });
    } catch (error) {
      console.error('Accept invite error:', error);
      res.status(500).json({ error: "Failed to complete signup" });
    }
  });

  app.post("/api/admin/lenders/:lenderId/resend-invite", ensureAdmin, async (req, res) => {
    try {
      const { lenderId } = req.params;
      console.log('[RESEND INVITE] Request received for lender ID:', lenderId);

      // Get lender by ID
      const [lender] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.id, lenderId))
        .limit(1);

      if (!lender) {
        console.log('[RESEND INVITE] Lender not found');
        return res.status(404).json({ error: "Lender not found" });
      }

      console.log('[RESEND INVITE] Found lender:', lender.companyName, 'inviteAccepted:', lender.inviteAccepted);

      if (lender.inviteAccepted) {
        console.log('[RESEND INVITE] Lender has already accepted invite');
        return res.status(400).json({ error: "Lender has already accepted the invite" });
      }

      // Generate new invite token and temp password
      const newToken = crypto.randomBytes(32).toString('base64url');
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
      const hashedPassword = await hashPassword(tempPassword);

      console.log('[RESEND INVITE] Generated new token and password, updating database...');

      // Update lender with new token and password
      await db
        .update(lenders)
        .set({
          inviteToken: newToken,
          password: hashedPassword,
        })
        .where(eq(lenders.id, lenderId));

      // Send email with new credentials
      const protocol = req.protocol || "https";
      const host = req.get("host") || "localhost:5000";
      const inviteUrl = `${protocol}://${host}/lender-signup/${newToken}`;
      
      console.log('[RESEND INVITE] Attempting to send email to:', lender.email);
      const emailSent = await emailService.sendLenderCredentials(lender.email, lender.email, tempPassword, inviteUrl);
      console.log('[RESEND INVITE] Email service returned:', emailSent);

      res.json({
        message: "Invite resent successfully",
        inviteUrl: inviteUrl,
      });
    } catch (error) {
      console.error('[RESEND INVITE] ERROR:', error);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  app.get("/api/lenders/me", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lender = req.user as any;
      res.json({
        id: lender.id,
        email: lender.email,
        companyName: lender.companyName,
        contactName: lender.contactName,
        phone: lender.phone,
        website: lender.website,
        referralLink: lender.referralLink,
        referralAmount: lender.referralAmount,
        referralType: lender.referralType,
        companyDescription: lender.companyDescription,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lender info" });
    }
  });

  app.post("/api/lenders/login", (req, res, next) => {
    passport.authenticate("lender-local", (err: any, user: any | false, info: { message: string }) => {
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

  app.post("/api/lenders/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      console.log('[LENDER RESET] Request received for email:', email);

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [lender] = await db
        .select()
        .from(lenders)
        .where(sql`LOWER(${lenders.email}) = LOWER(${email})`)
        .limit(1);

      if (!lender) {
        console.log('[LENDER RESET] Lender not found in database for:', email);
        return res.json({ 
          message: "If an account exists with this email, a password reset link will be sent." 
        });
      }

      console.log('[LENDER RESET] Lender found:', lender.companyName, '- Generating token...');
      const resetToken = generateVerificationToken();
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1);

      await db
        .update(lenders)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
        })
        .where(eq(lenders.id, lender.id));

      console.log('[LENDER RESET] Token saved to database. Attempting to send email...');
      const emailSent = await emailService.sendLenderPasswordResetEmail(
        lender.email,
        lender.companyName,
        resetToken
      );

      console.log('[LENDER RESET] Email service returned:', emailSent);
      if (!emailSent) {
        console.log('[LENDER RESET] WARNING: Email service reported failure');
      } else {
        console.log('[LENDER RESET] Email service reported success');
      }

      res.json({ 
        message: "If an account exists with this email, a password reset link will be sent." 
      });
    } catch (error) {
      console.log('[LENDER RESET] ERROR occurred:', error);
      res.status(500).json({ error: "Password reset request failed" });
    }
  });

  app.get("/api/lenders/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [lender] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.passwordResetToken, token))
        .limit(1);

      if (!lender) {
        return res.status(400).json({ valid: false, error: "Invalid reset token" });
      }

      if (lender.passwordResetExpiry && new Date() > lender.passwordResetExpiry) {
        return res.status(400).json({ valid: false, error: "Reset token has expired" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error('Lender token validation error:', error);
      res.status(500).json({ valid: false, error: "Token validation failed" });
    }
  });

  app.post("/api/lenders/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const [lender] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.passwordResetToken, token))
        .limit(1);

      if (!lender) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      if (lender.passwordResetExpiry && new Date() > lender.passwordResetExpiry) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const hashedPassword = await hashPassword(password);

      await db
        .update(lenders)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          inviteAccepted: true,
        })
        .where(eq(lenders.id, lender.id));

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error('Lender password reset error:', error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Lender Questionnaire Routes
  app.get("/api/lender-questionnaires", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lenderId = (req.user as any).id;
      const questionnaire = await storage.getLenderQuestionnaire(lenderId);
      res.json(questionnaire || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questionnaire" });
    }
  });

  app.post("/api/lender-questionnaires", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lenderId = (req.user as any).id;
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
  app.get("/api/loan-products", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lenderId = (req.user as any).id;
      const products = await storage.getLoanProducts(lenderId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loan products" });
    }
  });

  app.post("/api/loan-products", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lenderId = (req.user as any).id;
      const validatedData = insertLoanProductSchema.parse({
        ...req.body,
        lenderId,
      });
      const product = await storage.createLoanProduct(validatedData);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create loan product" });
    }
  });

  app.patch("/api/loan-products/:productId", ensureLenderAuthenticated, async (req, res) => {
    try {
      const { productId } = req.params;
      const lenderId = (req.user as any).id;
      
      const existingProduct = await storage.getLoanProducts(lenderId);
      const productBelongsToLender = existingProduct.some(p => p.id === productId);
      
      if (!productBelongsToLender) {
        return res.status(403).json({ error: "Forbidden: Cannot modify another lender's product" });
      }
      
      const validatedData = insertLoanProductSchema.parse({
        ...req.body,
        lenderId,
      });
      const product = await storage.updateLoanProduct(productId, validatedData);
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update loan product" });
    }
  });

  app.delete("/api/loan-products/:productId", ensureLenderAuthenticated, async (req, res) => {
    try {
      const { productId } = req.params;
      const lenderId = (req.user as any).id;
      
      const existingProducts = await storage.getLoanProducts(lenderId);
      const productBelongsToLender = existingProducts.some(p => p.id === productId);
      
      if (!productBelongsToLender) {
        return res.status(403).json({ error: "Forbidden: Cannot delete another lender's product" });
      }
      
      await storage.deleteLoanProduct(productId);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete loan product" });
    }
  });

  app.get("/api/loan-products/template", ensureLenderAuthenticated, async (req, res) => {
    try {
      const headers = [
        'productName',
        'newInvestorOk',
        'minCreditScore',
        'maxLtvBuy',
        'maxLendRehab',
        'interestRate',
        'interestDeferred',
        'drawnFundsOnly',
        'points',
        'pointsDeferred',
        'maxLoanArv',
        'appraisalRequired',
        'estimatedAppraisalCost',
        'fees',
        'costPerDraw',
        'timeToClose',
        'isActive'
      ];
      
      const exampleRow = [
        'Example Fix & Flip Loan',
        'TRUE',
        '680',
        '75.00',
        '100.00',
        '10.50',
        'FALSE',
        'FALSE',
        '2.00',
        'FALSE',
        '70.00',
        'TRUE',
        '500.00',
        '1500.00',
        '250.00',
        '21',
        'TRUE'
      ];
      
      const csv = [
        headers.join(','),
        exampleRow.join(',')
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="loan-products-template.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate CSV template" });
    }
  });

  app.post("/api/loan-products/bulk-import", ensureLenderAuthenticated, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
              error: "File too large", 
              message: "CSV file must be under 5MB. Please reduce the file size or split into multiple uploads." 
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              error: "Too many files", 
              message: "Please upload only one CSV file at a time." 
            });
          }
          return res.status(400).json({ 
            error: "Upload error", 
            message: err.message 
          });
        }
        return res.status(500).json({ 
          error: "Server error", 
          message: "An error occurred during file upload." 
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const lenderId = (req.user as any).id;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (records.length > 1000) {
        return res.status(400).json({ 
          error: "Too many products in CSV", 
          message: "Maximum 1000 products per upload. Please split your file and upload in batches." 
        });
      }

      const errors: Array<{ row: number; error: string }> = [];
      const validProducts: any[] = [];

      for (let i = 0; i < records.length; i++) {
        const record: any = records[i];
        const rowNumber = i + 2;

        try {
          const parseBool = (value: any) => {
            if (value === '' || value === null || value === undefined) return false;
            const str = String(value).toUpperCase().trim();
            return str === 'TRUE' || str === 'YES' || str === '1';
          };

          const parseDecimal = (value: any, fieldName: string) => {
            if (value === '' || value === null || value === undefined) return null;
            const cleaned = String(value).trim().replace(/^'+/, '');
            const num = parseFloat(cleaned);
            if (isNaN(num)) {
              throw new Error(`Invalid decimal value for ${fieldName}: "${value}"`);
            }
            return String(num);
          };

          const parseInteger = (value: any, fieldName: string) => {
            if (value === '' || value === null || value === undefined) return null;
            const cleaned = String(value).trim().replace(/^'+/, '');
            const num = parseInt(cleaned, 10);
            if (isNaN(num)) {
              throw new Error(`Invalid integer value for ${fieldName}: "${value}"`);
            }
            return num;
          };

          const productData = {
            lenderId,
            productName: record.productName ? String(record.productName).trim().replace(/^'+/, '') : '',
            newInvestorOk: parseBool(record.newInvestorOk),
            minCreditScore: parseInteger(record.minCreditScore, 'minCreditScore'),
            maxLtvBuy: parseDecimal(record.maxLtvBuy, 'maxLtvBuy'),
            maxLendRehab: parseDecimal(record.maxLendRehab, 'maxLendRehab'),
            interestRate: parseDecimal(record.interestRate, 'interestRate'),
            interestDeferred: parseBool(record.interestDeferred),
            drawnFundsOnly: parseBool(record.drawnFundsOnly),
            points: parseDecimal(record.points, 'points'),
            pointsDeferred: parseBool(record.pointsDeferred),
            maxLoanArv: parseDecimal(record.maxLoanArv, 'maxLoanArv'),
            appraisalRequired: parseBool(record.appraisalRequired),
            estimatedAppraisalCost: parseDecimal(record.estimatedAppraisalCost, 'estimatedAppraisalCost'),
            fees: parseDecimal(record.fees, 'fees'),
            costPerDraw: parseDecimal(record.costPerDraw, 'costPerDraw'),
            timeToClose: parseInteger(record.timeToClose, 'timeToClose'),
            isActive: record.isActive !== undefined ? parseBool(record.isActive) : true,
          };

          const validatedData = insertLoanProductSchema.parse(productData);
          validProducts.push(validatedData);
        } catch (error: any) {
          if (error instanceof z.ZodError) {
            errors.push({ 
              row: rowNumber, 
              error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` 
            });
          } else {
            errors.push({ row: rowNumber, error: error.message || "Unknown error" });
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          error: "CSV validation failed", 
          errors,
          validCount: validProducts.length,
          errorCount: errors.length 
        });
      }

      const createdProducts = [];
      for (const productData of validProducts) {
        const product = await storage.createLoanProduct(productData);
        createdProducts.push(product);
      }

      res.json({ 
        message: `Successfully imported ${createdProducts.length} loan products`,
        count: createdProducts.length,
        products: createdProducts 
      });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      res.status(500).json({ error: "Failed to import loan products", details: error.message });
    }
  });

  // Admin Lender Management Routes
  app.get("/api/admin/lenders", ensureAdmin, async (req, res) => {
    try {
      const lenders = await storage.getAllLendersWithReferralCounts();
      res.json(lenders);
    } catch (error) {
      console.error('Get lenders error:', error);
      res.status(500).json({ error: "Failed to fetch lenders" });
    }
  });

  app.delete("/api/admin/lenders/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLender(id);
      res.json({ message: "Lender deleted successfully" });
    } catch (error: any) {
      if (error.message === "Lender not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Cannot delete archived lender") {
        return res.status(409).json({ error: error.message });
      }
      if (error.message === "Cannot delete lender with existing referrals") {
        return res.status(400).json({ error: error.message });
      }
      console.error('Delete lender error:', error);
      res.status(500).json({ error: "Failed to delete lender" });
    }
  });

  app.patch("/api/admin/lenders/:id/archive", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const lender = await storage.archiveLender(id);
      res.json(lender);
    } catch (error: any) {
      if (error.message === "Lender not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Lender is already archived") {
        return res.status(400).json({ error: error.message });
      }
      console.error('Archive lender error:', error);
      res.status(500).json({ error: "Failed to archive lender" });
    }
  });

  app.patch("/api/admin/lenders/:id/preferred", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isPreferred } = req.body;
      
      if (typeof isPreferred !== 'boolean') {
        return res.status(400).json({ error: "isPreferred must be a boolean" });
      }
      
      const lender = await storage.updateLenderPreferredStatus(id, isPreferred);
      if (!lender) {
        return res.status(404).json({ error: "Lender not found" });
      }
      res.json(lender);
    } catch (error) {
      console.error('Update preferred status error:', error);
      res.status(500).json({ error: "Failed to update preferred status" });
    }
  });

  app.get("/api/admin/lenders/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const lender = await storage.getLender(id);
      if (!lender) {
        return res.status(404).json({ error: "Lender not found" });
      }
      
      const questionnaire = await storage.getLenderQuestionnaire(id);
      const loanProducts = await storage.getLoanProducts(id);
      const allReferrals = await storage.getAllLenderReferralsForAdmin();
      const lenderReferrals = allReferrals.filter(r => r.lenderId === id);
      
      res.json({
        lender,
        questionnaire,
        loanProducts,
        referrals: lenderReferrals,
      });
    } catch (error) {
      console.error('Get lender detail error:', error);
      res.status(500).json({ error: "Failed to fetch lender details" });
    }
  });

  // Admin Reports Routes
  app.get("/api/admin/reports/dashboard-stats", ensureAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/admin/reports/lender-referrals", ensureAdmin, async (req, res) => {
    try {
      const referrals = await storage.getAllLenderReferralsForAdmin();
      res.json(referrals);
    } catch (error) {
      console.error('Lender referrals report error:', error);
      res.status(500).json({ error: "Failed to fetch lender referrals" });
    }
  });

  app.get("/api/admin/reports/users", ensureAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Users report error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/reports/affiliate-clicks", ensureAdmin, async (req, res) => {
    try {
      const clicks = await storage.getAffiliateClicksForAdmin();
      res.json(clicks);
    } catch (error) {
      console.error('Affiliate clicks report error:', error);
      res.status(500).json({ error: "Failed to fetch affiliate clicks" });
    }
  });

  app.get("/api/admin/reports/affiliate-stats", ensureAdmin, async (req, res) => {
    try {
      const stats = await storage.getAffiliateClickStats();
      res.json(stats);
    } catch (error) {
      console.error('Affiliate stats error:', error);
      res.status(500).json({ error: "Failed to fetch affiliate stats" });
    }
  });

  app.get("/api/admin/reports/deal-stats", ensureAdmin, async (req, res) => {
    try {
      const stats = await storage.getDealAnalysisStats();
      res.json(stats);
    } catch (error) {
      console.error('Deal stats error:', error);
      res.status(500).json({ error: "Failed to fetch deal stats" });
    }
  });

  app.get("/api/admin/reports/deals", ensureAdmin, async (req, res) => {
    try {
      const deals = await storage.getAllDealsForAdmin();
      res.json(deals);
    } catch (error) {
      console.error('Deals report error:', error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  app.get("/api/admin/reports/lender-performance", ensureAdmin, async (req, res) => {
    try {
      const stats = await storage.getLenderPerformanceStats();
      res.json(stats);
    } catch (error) {
      console.error('Lender performance error:', error);
      res.status(500).json({ error: "Failed to fetch lender performance stats" });
    }
  });

  app.get("/api/admin/reports/platform-usage", ensureAdmin, async (req, res) => {
    try {
      const stats = await storage.getPlatformUsageStats();
      res.json(stats);
    } catch (error) {
      console.error('Platform usage error:', error);
      res.status(500).json({ error: "Failed to fetch platform usage stats" });
    }
  });

  app.get("/api/admin/reports/subscriptions", ensureAdmin, async (req, res) => {
    try {
      const stats = await storage.getSubscriptionStats();
      res.json(stats);
    } catch (error) {
      console.error('Subscription stats error:', error);
      res.status(500).json({ error: "Failed to fetch subscription stats" });
    }
  });

  // Track affiliate click (available to logged in users and guests)
  app.post("/api/affiliate-clicks", async (req, res) => {
    try {
      const { affiliateId, affiliateName, category } = req.body;
      
      if (!affiliateId || !affiliateName || !category) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const userId = req.isAuthenticated() ? (req.user as User).id : null;
      
      await storage.trackAffiliateClick(userId, affiliateId, affiliateName, category);
      res.json({ success: true });
    } catch (error) {
      console.error('Track affiliate click error:', error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // Lender Company Info Routes
  app.post("/api/lender-company-info", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lenderId = (req.user as any).id;
      
      const { email, referralAmount, referralType, ...allowedFields } = req.body;
      
      const data = {
        ...allowedFields,
        lenderId,
      };
      const updatedInfo = await storage.updateLenderCompanyInfo(data);
      res.json(updatedInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to update company info" });
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

  app.post("/api/search-lenders", async (req, res) => {
    try {
      const results = await storage.searchLenders(req.body);
      res.json(results);
    } catch (error) {
      console.error("Search lenders error:", error);
      res.status(500).json({ error: "Failed to search lenders" });
    }
  });

  // New Construction Lenders - for Ground-Up projects
  app.get("/api/new-construction-lenders", async (req, res) => {
    try {
      const { state } = req.query;
      
      if (!state || typeof state !== 'string') {
        return res.status(400).json({ error: "State is required" });
      }

      const results = await storage.getNewConstructionLenders(state);
      res.json(results);
    } catch (error) {
      console.error("New construction lenders error:", error);
      res.status(500).json({ error: "Failed to fetch new construction lenders" });
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

  // Property Lookup Route
  app.post("/api/property/lookup", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "Property URL is required" });
      }
      
      if (!url.includes('zillow.com') && !url.includes('redfin.com')) {
        return res.status(400).json({ 
          error: "Please provide a valid Zillow or Redfin property URL" 
        });
      }
      
      const propertyData = await propertyAPIService.getPropertyByUrl(url);
      
      if (!propertyData) {
        return res.status(404).json({ 
          error: "Property not found. Please check the URL and try again." 
        });
      }
      
      res.json(propertyData);
    } catch (error: any) {
      console.error("Property lookup error:", error);
      
      // Check for specific error types
      if (error.message?.includes("API key")) {
        return res.status(503).json({ 
          error: "Property lookup service is temporarily unavailable. Please use manual entry instead." 
        });
      }
      
      if (error.message?.includes("rate limit")) {
        return res.status(429).json({ 
          error: "Too many requests. Please wait a moment and try again." 
        });
      }
      
      res.status(500).json({ 
        error: error.message || "Unable to fetch property data. Please try manual entry instead." 
      });
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

  // Member Portal Routes
  
  // Get member stats
  app.get("/api/member/stats", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      
      const [dealStats] = await db
        .select({
          totalDeals: sql<number>`count(*)::int`,
          activeDeals: sql<number>`count(*) filter (where ${savedDeals.status} = 'active')::int`,
          wonDeals: sql<number>`count(*) filter (where ${savedDeals.status} = 'won')::int`,
          lostDeals: sql<number>`count(*) filter (where ${savedDeals.status} = 'lost')::int`,
        })
        .from(savedDeals)
        .where(eq(savedDeals.userId, userId));
      
      const [savedLenderStats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(savedLenders)
        .where(eq(savedLenders.userId, userId));
      
      res.json({
        totalDeals: dealStats?.totalDeals ?? 0,
        activeDeals: dealStats?.activeDeals ?? 0,
        wonDeals: dealStats?.wonDeals ?? 0,
        lostDeals: dealStats?.lostDeals ?? 0,
        savedLenders: savedLenderStats?.count ?? 0,
      });
    } catch (error) {
      console.error("Error fetching member stats:", error);
      res.status(500).json({ error: "Failed to fetch member stats" });
    }
  });
  
  // Get member deals
  app.get("/api/member/deals", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const statusFilter = req.query.status as string | undefined;
      
      let query = db
        .select()
        .from(savedDeals)
        .where(eq(savedDeals.userId, userId))
        .orderBy(desc(savedDeals.createdAt));
      
      const deals = await query;
      
      // Fetch lender/product info for won deals
      const dealsWithLenders = await Promise.all(
        deals.map(async (deal) => {
          if (deal.closedWithLenderId) {
            const [lender] = await db
              .select()
              .from(lenders)
              .where(eq(lenders.id, deal.closedWithLenderId));
            
            let product = null;
            if (deal.closedWithProductId) {
              const [productResult] = await db
                .select()
                .from(loanProducts)
                .where(eq(loanProducts.id, deal.closedWithProductId));
              product = productResult;
            }
            
            return {
              ...deal,
              closedWithLender: lender || null,
              closedWithProduct: product,
            };
          }
          return deal;
        })
      );
      
      res.json(dealsWithLenders);
    } catch (error) {
      console.error("Error fetching member deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });
  
  // Update deal status
  app.patch("/api/member/deals/:dealId", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { dealId } = req.params;
      const updates = req.body;
      
      // Verify ownership
      const [existingDeal] = await db
        .select()
        .from(savedDeals)
        .where(and(eq(savedDeals.id, dealId), eq(savedDeals.userId, userId)));
      
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      const [updatedDeal] = await db
        .update(savedDeals)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(savedDeals.id, dealId))
        .returning();
      
      res.json(updatedDeal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });
  
  // Delete deal
  app.delete("/api/member/deals/:dealId", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { dealId } = req.params;
      
      // Verify ownership
      const [existingDeal] = await db
        .select()
        .from(savedDeals)
        .where(and(eq(savedDeals.id, dealId), eq(savedDeals.userId, userId)));
      
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      await db.delete(savedDeals).where(eq(savedDeals.id, dealId));
      
      res.json({ message: "Deal deleted successfully" });
    } catch (error) {
      console.error("Error deleting deal:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });
  
  // Get saved lenders
  app.get("/api/member/saved-lenders", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      
      const saved = await db
        .select({
          id: savedLenders.id,
          lenderId: savedLenders.lenderId,
          createdAt: savedLenders.createdAt,
          lender: lenders,
        })
        .from(savedLenders)
        .innerJoin(lenders, eq(savedLenders.lenderId, lenders.id))
        .where(eq(savedLenders.userId, userId))
        .orderBy(desc(savedLenders.createdAt));
      
      res.json(saved);
    } catch (error) {
      console.error("Error fetching saved lenders:", error);
      res.status(500).json({ error: "Failed to fetch saved lenders" });
    }
  });
  
  // Save a lender (heart)
  app.post("/api/member/saved-lenders/:lenderId", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { lenderId } = req.params;
      
      // Check if already saved
      const [existing] = await db
        .select()
        .from(savedLenders)
        .where(and(eq(savedLenders.userId, userId), eq(savedLenders.lenderId, lenderId)));
      
      if (existing) {
        return res.json({ message: "Lender already saved", id: existing.id });
      }
      
      const [saved] = await db
        .insert(savedLenders)
        .values({
          userId,
          lenderId,
        })
        .returning();
      
      res.json(saved);
    } catch (error) {
      console.error("Error saving lender:", error);
      res.status(500).json({ error: "Failed to save lender" });
    }
  });
  
  // Unsave a lender (unheart)
  app.delete("/api/member/saved-lenders/:lenderId", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { lenderId } = req.params;
      
      await db
        .delete(savedLenders)
        .where(and(eq(savedLenders.userId, userId), eq(savedLenders.lenderId, lenderId)));
      
      res.json({ message: "Lender removed from saved" });
    } catch (error) {
      console.error("Error removing saved lender:", error);
      res.status(500).json({ error: "Failed to remove lender" });
    }
  });
  
  // Check if lender is saved
  app.get("/api/member/saved-lenders/:lenderId/status", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { lenderId } = req.params;
      
      const [existing] = await db
        .select()
        .from(savedLenders)
        .where(and(eq(savedLenders.userId, userId), eq(savedLenders.lenderId, lenderId)));
      
      res.json({ isSaved: !!existing });
    } catch (error) {
      console.error("Error checking saved lender status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Create HTTP server
  const server = createServer(app);
  return server;
}
