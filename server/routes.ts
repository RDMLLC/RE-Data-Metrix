import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLenderQuestionnaireSchema, insertLoanProductSchema, insertPropertySchema, insertAffiliateSchema, insertAffiliateCategorySchema, users, userProfiles, investmentPreferences, userInvestmentPreferences, savedDeals, savedLenders, lenders, loanProducts, lenderReferrals, affiliateClicks, dealAnalyses, lenderInquiries, pendingRegistrations, discountCodeUses, compInvites, type User } from "@shared/schema";
import { z } from "zod";
import { propertyAPIService } from "./services/property-api.factory";
import { db } from "./db";
import { eq, inArray, desc, and, sql, count } from "drizzle-orm";
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
    compCode: z.string().optional(),
    termsAccepted: z.boolean().optional(),
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
      let compInviteToAccept: {id: string; email: string; status: string; expiresAt: Date} | undefined = undefined;
      
      // Check for comp code first (highest priority)
      if (validatedData.compCode) {
        console.log('[Registration] Comp code provided:', validatedData.compCode.toUpperCase());
        const invite = await storage.getCompInviteByCode(validatedData.compCode.toUpperCase());
        console.log('[Registration] Comp invite found:', invite ? { 
          id: invite.id, 
          email: invite.email, 
          status: invite.status, 
          expiresAt: invite.expiresAt 
        } : 'null');
        if (invite && invite.status === 'pending' && new Date() <= invite.expiresAt) {
          compInviteToAccept = invite;
          subscriptionStatus = 'comped';
          console.log('[Registration] Comp code valid - setting status to comped');
        } else if (invite) {
          console.log('[Registration] Comp code invalid - status:', invite.status, 'expired:', new Date() > invite.expiresAt);
        }
      } else {
        console.log('[Registration] No comp code provided');
      }
      
      // If no valid comp code, check for referral code
      if (!compInviteToAccept && validatedData.referralCode) {
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

      // Comp users are auto-verified since they clicked a link sent to their email
      const isAutoVerified = !!compInviteToAccept;
      
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
          isEmailVerified: isAutoVerified,
          verificationToken: isAutoVerified ? null : verificationToken,
          verificationExpiry: isAutoVerified ? null : verificationExpiry,
          termsAcceptedAt: validatedData.termsAccepted ? new Date() : null,
          termsVersion: validatedData.termsAccepted ? "1.0" : null,
          privacyVersion: validatedData.termsAccepted ? "1.0" : null,
        })
        .returning();

      await db.insert(userProfiles).values({
        userId: newUser.id,
        fullName: validatedData.fullName,
      });

      // Accept the comp invite if there was one
      if (compInviteToAccept) {
        await storage.acceptCompInvite(validatedData.compCode!.toUpperCase(), newUser.id);
      }

      // Only send verification email for non-comp users
      let emailSent = false;
      if (!isAutoVerified) {
        emailSent = await emailService.sendVerificationEmail(
          newUser.email,
          newUser.username,
          verificationToken
        );

        if (!emailSent) {
          console.error('Failed to send verification email to:', newUser.email);
        }
      }

      res.json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        message: isAutoVerified
          ? "Registration successful! Your premium access is ready. You can now log in."
          : (emailSent 
              ? "Registration successful! Please check your email to verify your account before logging in." 
              : "Registration successful! Please contact support to verify your account."),
        requiresVerification: !isAutoVerified,
        isComped: !!compInviteToAccept,
      });
    } catch (error: any) {
      console.error('[Registration Error]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid registration data", details: error.errors });
      }
      // Handle database unique constraint violations
      if (error.code === '23505') {
        if (error.constraint?.includes('username')) {
          return res.status(400).json({ error: "Username already taken" });
        }
        if (error.constraint?.includes('email')) {
          return res.status(400).json({ error: "Email already in use" });
        }
        return res.status(400).json({ error: "Account already exists" });
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
        console.error('[Admin Login] Authentication error:', err);
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!user) {
        console.log('[Admin Login] Invalid credentials for:', req.body.email);
        return res.status(401).json({ error: info.message || "Invalid credentials" });
      }
      
      if (user.role !== 'admin') {
        console.log('[Admin Login] Non-admin user attempted login:', user.email, user.role);
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('[Admin Login] Session creation failed:', err);
          return res.status(500).json({ error: "Login failed" });
        }
        console.log('[Admin Login] Success for:', user.email, 'Session ID:', req.sessionID);
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as User;
    
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion,
      profile: userProfile ? {
        fullName: userProfile.fullName || "",
        creditScoreRange: userProfile.creditScoreRange || "",
        state: userProfile.state || "",
      } : null,
    });
  });

  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const currentUser = req.user as User;
    const { username, fullName } = req.body;
    
    try {
      if (username && username !== currentUser.username) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
          
        if (existingUser) {
          return res.status(400).json({ error: "Username is already taken" });
        }
        
        await db
          .update(users)
          .set({ username })
          .where(eq(users.id, currentUser.id));
      }
      
      if (fullName !== undefined) {
        const [existingProfile] = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, currentUser.id))
          .limit(1);
          
        if (existingProfile) {
          await db
            .update(userProfiles)
            .set({ fullName })
            .where(eq(userProfiles.userId, currentUser.id));
        } else {
          await db.insert(userProfiles).values({
            userId: currentUser.id,
            fullName: fullName || "",
          });
        }
      }
      
      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // ============================================
  // Stripe Payment Routes
  // ============================================
  
  // Import Stripe services
  const { getUncachableStripeClient, getStripePublishableKey, isStripeConfigured } = await import('./services/stripeClient');

  // Get Stripe publishable key for frontend
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const configured = await isStripeConfigured();
      if (!configured) {
        return res.status(503).json({ error: "Stripe not configured" });
      }
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error('Stripe key error:', error);
      res.status(500).json({ error: "Failed to get Stripe key" });
    }
  });

  // Check all integrations status (admin only)
  app.get("/api/admin/integrations/status", ensureAdmin, async (req, res) => {
    try {
      // Stripe status
      const stripeConfigured = await isStripeConfigured();
      const stripeStatus = {
        name: "Stripe Billing",
        description: "Subscription billing and payment processing",
        configured: stripeConfigured,
        ready: stripeConfigured,
        details: {
          connected: stripeConfigured,
          message: stripeConfigured ? "Stripe is connected and ready" : "Stripe connector not configured"
        }
      };

      // RentCast API status (property data - ACTIVE)
      const rentCastStatus = {
        name: "RentCast API",
        description: "Primary property data source: tax records, valuations (AVM), and rent estimates",
        configured: !!process.env.RENTCAST_API_KEY,
        ready: !!process.env.RENTCAST_API_KEY,
        active: true,
        details: {
          hasApiKey: !!process.env.RENTCAST_API_KEY,
          features: ["Property lookup", "Tax assessed value", "Annual tax amount", "Value estimates (AVM)", "Rent estimates", "Comparable sales"],
          note: "Primary API for all property data except images"
        }
      };

      // HasData API status (property images - ACTIVE)
      const hasDataStatus = {
        name: "HasData API",
        description: "Property images from Zillow and Redfin listings",
        configured: !!process.env.HASDATA_API_KEY,
        ready: !!process.env.HASDATA_API_KEY,
        active: true,
        details: {
          hasApiKey: !!process.env.HASDATA_API_KEY,
          features: ["Property photos"],
          note: "Used as fallback for property images when RentCast doesn't provide them"
        }
      };

      // SMTP/Email status
      const smtpStatus = {
        name: "Email (SMTP)",
        description: "Email notifications and verification",
        configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
        ready: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM_EMAIL),
        details: {
          hasHost: !!process.env.SMTP_HOST,
          hasPort: !!process.env.SMTP_PORT,
          hasUser: !!process.env.SMTP_USER,
          hasPassword: !!process.env.SMTP_PASSWORD,
          hasFromEmail: !!process.env.SMTP_FROM_EMAIL,
          hasFromName: !!process.env.SMTP_FROM_NAME
        }
      };

      // Database status (always configured via Replit)
      const databaseStatus = {
        name: "PostgreSQL Database",
        description: "Primary data storage powered by Neon",
        configured: !!process.env.DATABASE_URL,
        ready: !!process.env.DATABASE_URL,
        details: {
          hasDatabaseUrl: !!process.env.DATABASE_URL
        }
      };

      res.json({
        integrations: [
          stripeStatus,
          rentCastStatus,
          hasDataStatus,
          smtpStatus,
          databaseStatus
        ]
      });
    } catch (error) {
      console.error('Integrations status error:', error);
      res.status(500).json({ error: "Failed to get integrations status" });
    }
  });

  // ============================================
  // Stripe Subscription Routes
  // ============================================

  // Get available subscription plans (prices from Stripe)
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const prices = await stripe.prices.list({
        active: true,
        expand: ['data.product'],
        limit: 10,
      });

      const plans = prices.data
        .filter(price => price.recurring && (price.metadata?.plan_type || (price.product as any)?.metadata?.plan_type))
        .map(price => ({
          id: price.id,
          productId: (price.product as any).id,
          name: (price.product as any).name,
          description: (price.product as any).description,
          planType: price.metadata?.plan_type || (price.product as any)?.metadata?.plan_type,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval,
        }));

      res.json({ plans });
    } catch (error) {
      console.error('Plans error:', error);
      res.status(500).json({ error: "Failed to get plans" });
    }
  });

  // Payment-first checkout - for NEW user registration (unauthenticated)
  // Validates credentials, stores pending registration, creates Stripe checkout
  const checkoutStartSchema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(1),
    priceId: z.string(),
    selectedPlan: z.enum(['monthly', 'annual']),
    discountCode: z.string().optional(),
    termsAccepted: z.literal(true),
  });

  app.post("/api/subscription/checkout/start", async (req, res) => {
    try {
      const validatedData = checkoutStartSchema.parse(req.body);

      // Check if email is already in use
      const existingEmail = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${validatedData.email})`)
        .limit(1);

      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }

      // Check if username is already in use
      const existingUsername = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.username}) = LOWER(${validatedData.username})`)
        .limit(1);

      if (existingUsername.length > 0) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Check if there's already a pending registration with this email
      const existingPending = await db
        .select()
        .from(pendingRegistrations)
        .where(and(
          sql`LOWER(${pendingRegistrations.email}) = LOWER(${validatedData.email})`,
          eq(pendingRegistrations.status, 'pending')
        ))
        .limit(1);

      // Delete old pending registration if exists
      if (existingPending.length > 0) {
        await db
          .delete(pendingRegistrations)
          .where(eq(pendingRegistrations.id, existingPending[0].id));
      }

      // Hash password
      const passwordHash = await hashPassword(validatedData.password);

      // Set expiry for 24 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create pending registration
      const [pending] = await db
        .insert(pendingRegistrations)
        .values({
          username: validatedData.username,
          email: validatedData.email,
          passwordHash,
          fullName: validatedData.fullName,
          discountCode: validatedData.discountCode || null,
          selectedPlan: validatedData.selectedPlan,
          expiresAt,
        })
        .returning();

      // Create Stripe checkout session
      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;

      // Create a new Stripe customer for this pending registration
      const customer = await stripe.customers.create({
        email: validatedData.email,
        name: validatedData.fullName,
        metadata: {
          pendingRegistrationId: pending.id,
        },
      });

      // Build checkout session params
      const sessionParams: any = {
        customer: customer.id,
        line_items: [{ price: validatedData.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout?canceled=true`,
        metadata: {
          pendingRegistrationId: pending.id,
        },
      };

      // Apply discount if provided
      if (validatedData.discountCode) {
        const normalizedCode = validatedData.discountCode.toUpperCase();
        const discount = await storage.getDiscountCodeByCode(normalizedCode);
        
        if (discount && discount.stripeCouponId) {
          sessionParams.discounts = [{ coupon: discount.stripeCouponId }];
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Update pending registration with session ID
      await db
        .update(pendingRegistrations)
        .set({ stripeSessionId: session.id })
        .where(eq(pendingRegistrations.id, pending.id));

      console.log(`[CHECKOUT] Created pending registration ${pending.id} with Stripe session ${session.id}`);

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout start error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid registration data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to start checkout" });
    }
  });

  // Complete checkout - after successful Stripe payment, creates the user account
  // Uses the shared checkout service which handles missing pending registrations gracefully
  app.get("/api/subscription/checkout/complete", async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const { completeCheckoutSession } = await import('./services/checkoutService');
      const result = await completeCheckoutSession(session_id);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ error: result.error || result.message });
      }
    } catch (error) {
      console.error('Checkout complete error:', error);
      res.status(500).json({ error: "Failed to complete registration" });
    }
  });

  // Create Stripe Checkout session (for EXISTING authenticated users)
  app.post("/api/subscription/checkout", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { priceId, discountCode } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      // Check if user already has an active subscription
      if (['active', 'comped', 'referral_trial'].includes(user.subscriptionStatus)) {
        return res.status(400).json({ 
          error: "You already have an active subscription",
          currentStatus: user.subscriptionStatus 
        });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;

      // Create or get existing Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        
        // Store the customer ID
        await db
          .update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, user.id));
      }

      // Build checkout session params
      const sessionParams: any = {
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout?canceled=true`,
        metadata: {
          userId: user.id,
        },
      };

      // Apply discount if provided (lookup Stripe coupon from our discount code)
      let discountApplied = false;
      if (discountCode) {
        const normalizedCode = discountCode.toUpperCase();
        const discount = await storage.getDiscountCodeByCode(normalizedCode);
        
        if (discount) {
          if (discount.stripeCouponId) {
            sessionParams.discounts = [{ coupon: discount.stripeCouponId }];
            discountApplied = true;
            console.log(`[STRIPE] Discount code ${normalizedCode} applied with Stripe coupon ${discount.stripeCouponId}`);
          } else {
            // Discount code exists but no Stripe coupon - return error
            console.warn(`[STRIPE] Discount code ${normalizedCode} has no Stripe coupon ID configured`);
            return res.status(400).json({ 
              error: "This discount code is not yet configured for Stripe checkout. Please contact support.",
              code: "DISCOUNT_NOT_CONFIGURED"
            });
          }
        } else {
          // Invalid discount code
          return res.status(400).json({ 
            error: "Invalid discount code",
            code: "INVALID_DISCOUNT"
          });
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      console.log(`[STRIPE] Checkout session created for user ${user.id}`);

      res.json({
        success: true,
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: "Failed to initiate checkout" });
    }
  });

  // Validate discount code (uses database-stored codes)
  app.post("/api/subscription/validate-discount", async (req, res) => {
    try {
      const { code, plan } = req.body;

      if (!code) {
        return res.status(400).json({ valid: false, message: "Discount code is required" });
      }

      const upperCode = code.toUpperCase();
      
      // Look up the discount code in the database
      const discount = await storage.getDiscountCodeByCode(upperCode);
      
      if (!discount) {
        return res.json({
          valid: false,
          message: "Invalid discount code. Please check and try again.",
        });
      }
      
      // Check if the code is active
      if (!discount.isActive) {
        return res.json({
          valid: false,
          message: "This discount code is no longer active.",
        });
      }
      
      // Check date validity
      const now = new Date();
      if (discount.startAt && now < discount.startAt) {
        return res.json({
          valid: false,
          message: "This discount code is not yet active.",
        });
      }
      if (discount.endAt && now > discount.endAt) {
        return res.json({
          valid: false,
          message: "This discount code has expired.",
        });
      }
      
      // Check redemption limit
      if (discount.maxRedemptions && discount.currentRedemptions >= discount.maxRedemptions) {
        return res.json({
          valid: false,
          message: "This discount code has reached its maximum number of uses.",
        });
      }
      
      // Check plan applicability
      if (discount.planApplicability !== 'both' && discount.planApplicability !== plan) {
        const planName = discount.planApplicability === 'annual' ? 'annual' : 'monthly';
        return res.json({
          valid: false,
          message: `This code is only valid for ${planName} plans.`,
        });
      }
      
      // Build success message
      let message = '';
      if (discount.percentOff) {
        message = `${discount.percentOff}% off your subscription!`;
      } else if (discount.amountOff) {
        message = `$${discount.amountOff} off your payment!`;
      }
      if (discount.displayName && discount.partnerName) {
        message = `${discount.displayName} - ${message}`;
      }

      return res.json({
        valid: true,
        discountCodeId: discount.id,
        percentOff: discount.percentOff ? Number(discount.percentOff) : undefined,
        amountOff: discount.amountOff ? Number(discount.amountOff) : undefined,
        message,
      });
    } catch (error) {
      console.error('Discount validation error:', error);
      res.status(500).json({ valid: false, message: "Unable to validate discount code" });
    }
  });

  app.post("/api/subscription/cancel", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      if (user.subscriptionStatus !== 'active') {
        return res.status(400).json({ 
          error: "No active subscription to cancel" 
        });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ 
          error: "No Stripe subscription found" 
        });
      }

      const stripe = await getUncachableStripeClient();
      
      // Cancel at end of billing period
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      console.log(`[STRIPE] Subscription ${user.stripeSubscriptionId} set to cancel at period end`);

      res.json({
        success: true,
        message: "Your subscription has been canceled. You'll retain access until the end of your billing period.",
      });
    } catch (error) {
      console.error('Subscription cancel error:', error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Create Stripe Customer Portal session
  app.post("/api/subscription/manage-billing", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      if (!user.stripeCustomerId) {
        return res.status(400).json({ 
          error: "No billing account found. Please subscribe first." 
        });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/profile`,
      });

      console.log(`[STRIPE] Billing portal session created for user ${user.id}`);

      res.json({
        success: true,
        url: session.url,
      });
    } catch (error) {
      console.error('Manage billing error:', error);
      res.status(500).json({ error: "Failed to open billing portal" });
    }
  });

  // Get current subscription status with Stripe details
  app.get("/api/subscription/status", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      let subscriptionDetails = null;

      // Fetch subscription details from Stripe if user has a subscription
      if (user.stripeSubscriptionId) {
        try {
          const stripe = await getUncachableStripeClient();
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
            expand: ['items.data.price.product'],
          });

          subscriptionDetails = {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            plan: (subscription.items.data[0]?.price.product as any)?.metadata?.plan_type || 'unknown',
          };
        } catch (error) {
          console.error('Error fetching subscription details:', error);
        }
      }

      res.json({
        status: user.subscriptionStatus,
        isActive: ['active', 'comped', 'referral_trial'].includes(user.subscriptionStatus),
        stripeCustomerId: user.stripeCustomerId,
        subscription: subscriptionDetails,
      });
    } catch (error) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Handle checkout success - verify session and activate subscription
  app.get("/api/subscription/checkout-success", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['subscription'],
      });

      // Verify the session is for this user
      if (session.customer !== user.stripeCustomerId) {
        return res.status(403).json({ error: "Session does not belong to this user" });
      }

      const subscription = session.subscription as any;
      
      if (subscription && subscription.status === 'active') {
        // Update user subscription status
        await db
          .update(users)
          .set({ 
            subscriptionStatus: 'active',
            stripeSubscriptionId: subscription.id,
          })
          .where(eq(users.id, user.id));

        console.log(`[STRIPE] User ${user.id} subscription activated: ${subscription.id}`);

        res.json({
          success: true,
          message: "Subscription activated successfully!",
          subscriptionId: subscription.id,
        });
      } else {
        res.status(400).json({ 
          error: "Subscription not active",
          status: subscription?.status 
        });
      }
    } catch (error) {
      console.error('Checkout success error:', error);
      res.status(500).json({ error: "Failed to verify checkout" });
    }
  });

  // ============================================
  // End of Subscription Routes
  // ============================================

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

      // Check if user has an active subscription or is comped
      const hasSubscription = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'comped';

      res.json({ 
        message: "Email verified successfully! Welcome to RE Data Metrix.",
        username: user.username,
        hasSubscription,
        isComped: user.subscriptionStatus === 'comped',
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

  // Admin endpoint to trigger password reset for any lender (works for accepted or pending)
  app.post("/api/admin/lenders/:lenderId/trigger-password-reset", ensureAdmin, async (req, res) => {
    try {
      const { lenderId } = req.params;
      console.log('[ADMIN LENDER RESET] Request received for lender ID:', lenderId);

      // Get lender by ID
      const [lender] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.id, lenderId))
        .limit(1);

      if (!lender) {
        console.log('[ADMIN LENDER RESET] Lender not found');
        return res.status(404).json({ error: "Lender not found" });
      }

      console.log('[ADMIN LENDER RESET] Found lender:', lender.companyName, 'email:', lender.email);

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('base64url');
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 24); // 24 hours expiry

      // Update lender with reset token
      await db
        .update(lenders)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
        })
        .where(eq(lenders.id, lenderId));

      console.log('[ADMIN LENDER RESET] Token saved, sending email...');

      // Send password reset email
      const emailSent = await emailService.sendLenderPasswordResetEmail(
        lender.email,
        lender.companyName,
        resetToken
      );

      console.log('[ADMIN LENDER RESET] Email service returned:', emailSent);

      res.json({
        message: emailSent 
          ? "Password reset email sent successfully" 
          : "Password reset link created but email failed to send",
        emailSent,
        // Return the reset link for admin to share manually if email fails
        resetLink: emailSent ? undefined : `https://redatametrix.com/lender/reset-password/${resetToken}`,
      });
    } catch (error) {
      console.error('[ADMIN LENDER RESET] ERROR:', error);
      res.status(500).json({ error: "Failed to trigger password reset" });
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
        console.log('[RESEND INVITE] Lender has already accepted invite, use password reset instead');
        return res.status(400).json({ error: "Lender has already accepted the invite. Use 'Trigger Password Reset' instead." });
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

  app.post("/api/lenders/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
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
      
      // Send email notification to lender (async, don't wait)
      (async () => {
        try {
          const [lender] = await db.select().from(lenders).where(eq(lenders.id, lenderId));
          if (lender && lender.email) {
            await emailService.sendLoanProductChangedNotification(
              lender.email,
              lender.companyName,
              product.productName,
              'created'
            );
          }
        } catch (emailError) {
          console.error("Error sending loan product created notification:", emailError);
        }
      })();
      
      res.json(product);
    } catch (error) {
      console.error('Loan product creation error:', error);
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
      
      // Send email notification to lender (async, don't wait)
      (async () => {
        try {
          const [lender] = await db.select().from(lenders).where(eq(lenders.id, lenderId));
          if (lender && lender.email) {
            await emailService.sendLoanProductChangedNotification(
              lender.email,
              lender.companyName,
              product.productName,
              'updated'
            );
          }
        } catch (emailError) {
          console.error("Error sending loan product updated notification:", emailError);
        }
      })();
      
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

  // Bridge/Fix & Flip CSV Template - focused fields for bridge loans only
  app.get("/api/loan-products/template/bridge", ensureLenderAuthenticated, async (req, res) => {
    try {
      const instructionRow = '# LOAN TYPE: This template is for Bridge/Fix & Flip loans only. Leave loanType as 1.';
      const headers = [
        'productName',
        'loanType',
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
        'isLtcWeighted',
        'maxLtcPercent',
        'appraisalRequired',
        'estimatedAppraisalCost',
        'fees',
        'costPerDraw',
        'timeToClose',
        'referralLink',
        'isActive'
      ];
      
      const exampleRows = [
        [
          'Bridge/Fix & Flip - Standard',
          '1',
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
          'FALSE',
          '',
          'TRUE',
          '500.00',
          '1500.00',
          '250.00',
          '21',
          '',
          'TRUE'
        ],
        [
          'Bridge/Fix & Flip - LTC Weighted',
          '1',
          'FALSE',
          '720',
          '90.00',
          '100.00',
          '9.50',
          'FALSE',
          'TRUE',
          '1.50',
          'FALSE',
          '75.00',
          'TRUE',
          '90.00',
          'TRUE',
          '450.00',
          '1200.00',
          '200.00',
          '14',
          '',
          'TRUE'
        ]
      ];
      
      const csv = [
        instructionRow,
        headers.join(','),
        ...exampleRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bridge-fix-flip-template.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate Bridge CSV template" });
    }
  });

  // DSCR & New Construction CSV Template - for rental and new construction loans
  app.get("/api/loan-products/template/dscr", ensureLenderAuthenticated, async (req, res) => {
    try {
      const instructionRow = '# LOAN TYPE: Enter 1 for DSCR Purchase | Enter 2 for DSCR Refi | Enter 3 for New Construction';
      const headers = [
        'productName',
        'loanType',
        'newInvestorOk',
        'minCreditScore',
        'maxLtvBuy',
        'interestRate',
        'points',
        'loanTermYears',
        'minDscrRequired',
        'appraisalRequired',
        'estimatedAppraisalCost',
        'fees',
        'cashOutOk',
        'cashOutMaxLtv',
        'referralLink',
        'isActive'
      ];
      
      const exampleRows = [
        [
          'DSCR Purchase - Standard',
          '1',
          'TRUE',
          '700',
          '80.00',
          '7.50',
          '1.50',
          '30',
          '1.0',
          'TRUE',
          '450.00',
          '1000.00',
          '',
          '',
          '',
          'TRUE'
        ],
        [
          'DSCR Refi - Cash Out',
          '2',
          'FALSE',
          '720',
          '75.00',
          '7.50',
          '1.50',
          '30',
          '1.2',
          'TRUE',
          '450.00',
          '1000.00',
          'TRUE',
          '70.00',
          '',
          'TRUE'
        ],
        [
          'New Construction Loan',
          '3',
          'FALSE',
          '700',
          '65.00',
          '9.00',
          '2.00',
          '',
          '',
          'TRUE',
          '600.00',
          '2000.00',
          '',
          '',
          'https://example.com/apply',
          'TRUE'
        ]
      ];
      
      const csv = [
        instructionRow,
        headers.join(','),
        ...exampleRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="dscr-new-construction-template.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate DSCR CSV template" });
    }
  });

  // Legacy combined template (kept for backwards compatibility)
  app.get("/api/loan-products/template", ensureLenderAuthenticated, async (req, res) => {
    try {
      const headers = [
        'productName',
        'loanType',
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
        'cashOutOk',
        'cashOutMaxLtv',
        'referralLink',
        'isActive',
        'loanTermYears',
        'minDscrRequired'
      ];
      
      const exampleRows = [
        [
          'Bridge/Fix & Flip Loan',
          'bridge',
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
          '',
          '',
          '',
          'TRUE',
          '',
          ''
        ],
        [
          'DSCR Purchase Loan',
          'dscr-purchase',
          'TRUE',
          '700',
          '80.00',
          '',
          '7.50',
          'FALSE',
          '',
          '1.50',
          '',
          '',
          'TRUE',
          '450.00',
          '1000.00',
          '',
          '',
          '',
          '',
          '',
          'TRUE',
          '30',
          '1.0'
        ],
        [
          'DSCR Refi with Cash-Out',
          'dscr-refi',
          'FALSE',
          '720',
          '75.00',
          '',
          '7.25',
          'FALSE',
          '',
          '1.00',
          '',
          '',
          'TRUE',
          '450.00',
          '1000.00',
          '',
          '',
          'TRUE',
          '70.00',
          '',
          'TRUE',
          '30',
          '1.2'
        ],
        [
          'New Construction Loan',
          'new-construction',
          'FALSE',
          '700',
          '65.00',
          '',
          '9.00',
          '',
          '',
          '2.00',
          '',
          '',
          'TRUE',
          '600.00',
          '2000.00',
          '300.00',
          '30',
          '',
          '',
          'https://example.com/apply',
          'TRUE',
          '',
          ''
        ]
      ];
      
      const csv = [
        headers.join(','),
        ...exampleRows.map(row => row.join(','))
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
        comment: '#', // Skip instruction rows starting with #
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

          // Convert numeric codes to loan types (from CSV templates)
          // Bridge template: 1 = bridge
          // DSCR template: 1 = dscr-purchase, 2 = dscr-refi, 3 = new-construction
          const numericToLoanType: Record<string, string> = {
            '1': 'bridge', // Default for bridge template, but DSCR template overrides based on context
          };
          const dscrNumericToLoanType: Record<string, string> = {
            '1': 'dscr-purchase',
            '2': 'dscr-refi', 
            '3': 'new-construction',
          };
          const validLoanTypes = ['bridge', 'dscr-purchase', 'dscr-refi', 'new-construction'];
          const rawLoanType = record.loanType ? String(record.loanType).trim().toLowerCase() : 'bridge';
          
          let loanType: string;
          if (validLoanTypes.includes(rawLoanType)) {
            // Already a valid string loan type
            loanType = rawLoanType;
          } else if (rawLoanType === '1' && record.loanTermYears) {
            // If it's "1" and has loanTermYears, it's from DSCR template
            loanType = 'dscr-purchase';
          } else if (dscrNumericToLoanType[rawLoanType] && (record.loanTermYears || record.minDscrRequired || rawLoanType === '3')) {
            // DSCR template numeric codes (1, 2, 3) with DSCR-specific fields
            loanType = dscrNumericToLoanType[rawLoanType];
          } else if (rawLoanType === '1') {
            // Default "1" without DSCR fields = bridge
            loanType = 'bridge';
          } else {
            // Default fallback
            loanType = 'bridge';
          }

          const productData = {
            lenderId,
            productName: record.productName ? String(record.productName).trim().replace(/^'+/, '') : '',
            loanType,
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
            cashOutOk: parseBool(record.cashOutOk),
            cashOutMaxLtv: parseDecimal(record.cashOutMaxLtv, 'cashOutMaxLtv'),
            referralLink: record.referralLink ? String(record.referralLink).trim() : null,
            isActive: record.isActive !== undefined ? parseBool(record.isActive) : true,
            loanTermYears: parseInteger(record.loanTermYears, 'loanTermYears'),
            minDscrRequired: parseDecimal(record.minDscrRequired, 'minDscrRequired'),
            isLtcWeighted: parseBool(record.isLtcWeighted),
            maxLtcPercent: parseDecimal(record.maxLtcPercent, 'maxLtcPercent'),
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

  // Helper function to sanitize user data for admin responses (excludes sensitive fields)
  function sanitizeUserForAdmin(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt,
      isEmailVerified: user.isEmailVerified,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion,
    };
  }

  // Admin Password Reset Routes
  const adminPasswordResetRequestSchema = z.object({
    email: z.string().email("Invalid email format"),
  });

  const adminPasswordResetSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

  app.post("/api/admin/request-password-reset", async (req, res) => {
    try {
      const validationResult = adminPasswordResetRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }
      const { email } = validationResult.data;
      console.log('[ADMIN PASSWORD RESET] Request received for email:', email);

      // Find admin user by email
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          sql`LOWER(${users.email}) = LOWER(${email})`,
          eq(users.role, 'admin')
        ))
        .limit(1);

      if (!user) {
        console.log('[ADMIN PASSWORD RESET] No admin user found for email:', email);
        // Return same message to prevent email enumeration
        return res.json({ 
          message: "If an admin account exists with this email, a password reset link will be sent." 
        });
      }

      console.log('[ADMIN PASSWORD RESET] Admin user found:', user.username, '- Generating token...');
      const resetToken = generateVerificationToken();
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1); // 1 hour expiry

      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
        })
        .where(eq(users.id, user.id));

      console.log('[ADMIN PASSWORD RESET] Token saved to database. Attempting to send email...');
      
      // Send password reset email with admin-specific URL
      const protocol = req.protocol || "https";
      const host = req.get("host") || "localhost:5000";
      const resetUrl = `${protocol}://${host}/admin/reset-password/${resetToken}`;
      
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        user.username,
        resetToken,
        resetUrl
      );

      console.log('[ADMIN PASSWORD RESET] Email service returned:', emailSent);
      if (!emailSent) {
        console.error('[ADMIN PASSWORD RESET] WARNING: Email service reported failure for:', user.email);
      } else {
        console.log('[ADMIN PASSWORD RESET] Email sent successfully to:', user.email);
      }

      res.json({ 
        message: "If an admin account exists with this email, a password reset link will be sent." 
      });
    } catch (error) {
      console.error('[ADMIN PASSWORD RESET] Error:', error);
      res.status(500).json({ error: "Password reset request failed" });
    }
  });

  app.post("/api/admin/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const validationResult = adminPasswordResetSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }
      const { password } = validationResult.data;

      // Find admin user with this reset token
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.passwordResetToken, token),
          eq(users.role, 'admin')
        ))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (user.passwordResetExpiry && new Date() > user.passwordResetExpiry) {
        return res.status(400).json({ error: "Reset token has expired. Please request a new one." });
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

      console.log('[ADMIN PASSWORD RESET] Password reset successfully for:', user.email);
      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error('[ADMIN PASSWORD RESET] Error:', error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Admin User Management Routes
  app.get("/api/admin/users", ensureAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      // Get additional stats for each user with sanitized data (no sensitive fields)
      const usersWithStats = await Promise.all(allUsers.map(async (user) => {
        const dealsCount = await db.select({ count: count() }).from(savedDeals)
          .where(eq(savedDeals.userId, user.id));
        const lendersCount = await db.select({ count: count() }).from(savedLenders)
          .where(eq(savedLenders.userId, user.id));
        const referrals = await db.select({ count: count() }).from(users)
          .where(eq(users.referredBy, user.id));
        const profile = await db.select().from(userProfiles)
          .where(eq(userProfiles.userId, user.id)).limit(1);
        
        // Use sanitizeUserForAdmin helper and extend with additional profile data
        return {
          ...sanitizeUserForAdmin(user),
          dealsAnalyzed: Number(dealsCount[0]?.count || 0),
          lendersSaved: Number(lendersCount[0]?.count || 0),
          referralCount: Number(referrals[0]?.count || 0),
          fullName: profile[0]?.fullName || null,
          phone: profile[0]?.phone || null,
          city: profile[0]?.city || null,
          state: profile[0]?.state || null,
        };
      }));
      
      res.json(usersWithStats);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/stats", ensureAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      const stats = {
        total: allUsers.length,
        bySubscription: {
          active: allUsers.filter(u => u.subscriptionStatus === 'active').length,
          inactive: allUsers.filter(u => u.subscriptionStatus === 'inactive').length,
          comped: allUsers.filter(u => u.subscriptionStatus === 'comped').length,
          referral_trial: allUsers.filter(u => u.subscriptionStatus === 'referral_trial').length,
        },
        byRole: {
          user: allUsers.filter(u => u.role === 'user').length,
          admin: allUsers.filter(u => u.role === 'admin').length,
        },
        emailVerification: {
          verified: allUsers.filter(u => u.isEmailVerified).length,
          unverified: allUsers.filter(u => !u.isEmailVerified).length,
        },
        recentSignups: {
          last7Days: allUsers.filter(u => u.createdAt && new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
          last30Days: allUsers.filter(u => u.createdAt && new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        },
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  app.patch("/api/admin/users/:id/subscription", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { subscriptionStatus } = req.body;
      
      if (!['active', 'inactive', 'comped', 'referral_trial', 'archived'].includes(subscriptionStatus)) {
        return res.status(400).json({ error: "Invalid subscription status" });
      }
      
      const [updated] = await db.update(users)
        .set({ subscriptionStatus })
        .where(eq(users.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return sanitized user data (no sensitive fields)
      res.json({ message: "Subscription updated successfully", user: sanitizeUserForAdmin(updated) });
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  app.post("/api/admin/users/:id/resend-verification", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.isEmailVerified) {
        return res.status(400).json({ error: "User email is already verified" });
      }
      
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('base64url');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await db.update(users)
        .set({ verificationToken, verificationExpiry })
        .where(eq(users.id, id));
      
      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(user.email, user.username, verificationToken);
      
      res.json({ 
        message: emailSent ? "Verification email sent successfully" : "Failed to send email",
        emailSent 
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // Delete user (Admin) - only allowed if user has no referrals
  app.delete("/api/admin/users/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user has any referral activity (direct referrals, lender referrals, affiliate clicks)
      let totalReferralActivity = 0;
      
      // Check direct user referrals (users who were referred by this user)
      if (user.referralCode) {
        const directReferrals = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`${users.referredBy} = ${user.referralCode}`);
        
        totalReferralActivity += Number(directReferrals[0]?.count || 0);
      }
      
      // Check lender referrals created by this user
      const lenderReferralCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(lenderReferrals)
        .where(eq(lenderReferrals.userId, id));
      
      totalReferralActivity += Number(lenderReferralCount[0]?.count || 0);
      
      // Check affiliate clicks by this user
      const affiliateClickCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(affiliateClicks)
        .where(eq(affiliateClicks.userId, id));
      
      totalReferralActivity += Number(affiliateClickCount[0]?.count || 0);
      
      if (totalReferralActivity > 0) {
        return res.status(400).json({ 
          error: "Cannot delete user with referral activity",
          message: "This user has referral activity recorded. Use 'inactive' or 'archived' status instead."
        });
      }
      
      // Prevent deleting admin users
      if (user.role === 'admin') {
        return res.status(400).json({ error: "Cannot delete admin users" });
      }
      
      // Delete related records first (cascade)
      await db.delete(userProfiles).where(eq(userProfiles.userId, id));
      await db.delete(userInvestmentPreferences).where(eq(userInvestmentPreferences.userId, id));
      await db.delete(savedDeals).where(eq(savedDeals.userId, id));
      await db.delete(savedLenders).where(eq(savedLenders.userId, id));
      await db.delete(lenderReferrals).where(eq(lenderReferrals.userId, id));
      await db.delete(affiliateClicks).where(eq(affiliateClicks.userId, id));
      await db.delete(dealAnalyses).where(eq(dealAnalyses.userId, id));
      await db.delete(discountCodeUses).where(eq(discountCodeUses.userId, id));
      await db.delete(lenderInquiries).where(eq(lenderInquiries.userId, id));
      // Clear comp invite references (set to null instead of deleting the invites)
      await db.update(compInvites).set({ invitedBy: null }).where(eq(compInvites.invitedBy, id));
      await db.update(compInvites).set({ acceptedBy: null }).where(eq(compInvites.acceptedBy, id));
      
      // Delete the user
      await db.delete(users).where(eq(users.id, id));
      
      console.log(`[ADMIN] User deleted: ${user.email} (ID: ${id})`);
      
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error('Delete user error:', error);
      // Provide more specific error messages
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        return res.status(400).json({ 
          error: "Cannot delete user",
          message: "User has related records that couldn't be deleted. Try updating their status to 'inactive' instead."
        });
      }
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Comp Invite Routes (Admin)
  app.post("/api/admin/comp-invites", ensureAdmin, async (req, res) => {
    try {
      const { email, expiresInDays } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const adminId = (req.user as User).id;
      const result = await storage.createCompInvite(email, adminId, expiresInDays || 30);
      
      // Send the invitation email
      const emailSent = await emailService.sendCompInviteEmail(result.email, result.compCode, result.expiresAt);
      
      res.json({ 
        ...result, 
        emailSent,
        message: emailSent ? "Invitation sent successfully" : "Invitation created but email failed to send"
      });
    } catch (error) {
      console.error('Create comp invite error:', error);
      res.status(500).json({ error: "Failed to create comp invite" });
    }
  });

  app.get("/api/admin/comp-invites", ensureAdmin, async (req, res) => {
    try {
      const invites = await storage.getAllCompInvites();
      res.json(invites);
    } catch (error) {
      console.error('Get comp invites error:', error);
      res.status(500).json({ error: "Failed to fetch comp invites" });
    }
  });

  app.post("/api/admin/comp-invites/:id/resend", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.resendCompInvite(id);
      
      if (!result) {
        return res.status(404).json({ error: "Comp invite not found" });
      }
      
      // Send the invitation email
      const emailSent = await emailService.sendCompInviteEmail(result.email, result.compCode, result.expiresAt);
      
      res.json({ 
        ...result, 
        emailSent,
        message: emailSent ? "Invitation resent successfully" : "Invitation updated but email failed to send"
      });
    } catch (error) {
      console.error('Resend comp invite error:', error);
      res.status(500).json({ error: "Failed to resend comp invite" });
    }
  });

  app.delete("/api/admin/comp-invites/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCompInvite(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Comp invite not found" });
      }
      
      res.json({ success: true, message: "Comp invite deleted" });
    } catch (error) {
      console.error('Delete comp invite error:', error);
      res.status(500).json({ error: "Failed to delete comp invite" });
    }
  });

  // =====================
  // Admin Discount Codes Routes
  // =====================

  // Get all discount codes with usage stats
  app.get("/api/admin/discount-codes", ensureAdmin, async (req, res) => {
    try {
      const { search, partnerName, planApplicability, isActive } = req.query;
      const filters: any = {};
      if (search) filters.search = search as string;
      if (partnerName) filters.partnerName = partnerName as string;
      if (planApplicability) filters.planApplicability = planApplicability as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const codes = await storage.getAllDiscountCodes(filters);
      res.json(codes);
    } catch (error) {
      console.error('Get discount codes error:', error);
      res.status(500).json({ error: "Failed to fetch discount codes" });
    }
  });

  // Get discount code stats for dashboard
  app.get("/api/admin/discount-codes/stats", ensureAdmin, async (req, res) => {
    try {
      const stats = await storage.getDiscountCodeStats();
      res.json(stats);
    } catch (error) {
      console.error('Get discount code stats error:', error);
      res.status(500).json({ error: "Failed to fetch discount code stats" });
    }
  });

  // Get single discount code
  app.get("/api/admin/discount-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const code = await storage.getDiscountCode(id);
      
      if (!code) {
        return res.status(404).json({ error: "Discount code not found" });
      }
      
      res.json(code);
    } catch (error) {
      console.error('Get discount code error:', error);
      res.status(500).json({ error: "Failed to fetch discount code" });
    }
  });

  // Get usage for a specific discount code
  app.get("/api/admin/discount-codes/:id/usage", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const usage = await storage.getDiscountCodeUsage(id);
      res.json(usage);
    } catch (error) {
      console.error('Get discount code usage error:', error);
      res.status(500).json({ error: "Failed to fetch discount code usage" });
    }
  });

  // Create new discount code
  app.post("/api/admin/discount-codes", ensureAdmin, async (req, res) => {
    try {
      const adminUser = req.user as User;
      const { code, displayName, partnerName, description, planApplicability, percentOff, amountOff, maxRedemptions, startAt, endAt, isActive } = req.body;
      
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return res.status(400).json({ error: "Code is required" });
      }
      
      if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
        return res.status(400).json({ error: "Display name is required" });
      }
      
      // Parse and validate discount values with explicit NaN checks
      const numPercentOff = percentOff !== undefined && percentOff !== null && percentOff !== '' 
        ? Number(percentOff) 
        : null;
      const numAmountOff = amountOff !== undefined && amountOff !== null && amountOff !== '' 
        ? Number(amountOff) 
        : null;
      
      // Check for NaN
      if (numPercentOff !== null && !Number.isFinite(numPercentOff)) {
        return res.status(400).json({ error: "Percent off must be a valid number" });
      }
      
      if (numAmountOff !== null && !Number.isFinite(numAmountOff)) {
        return res.status(400).json({ error: "Amount off must be a valid number" });
      }
      
      // Validate mutual exclusivity
      if (numPercentOff === null && numAmountOff === null) {
        return res.status(400).json({ error: "Either percent off or amount off is required" });
      }
      
      if (numPercentOff !== null && numAmountOff !== null) {
        return res.status(400).json({ error: "Cannot specify both percent off and amount off" });
      }
      
      // Validate ranges
      if (numPercentOff !== null && (numPercentOff <= 0 || numPercentOff > 100)) {
        return res.status(400).json({ error: "Percent off must be between 1 and 100" });
      }
      
      if (numAmountOff !== null && numAmountOff <= 0) {
        return res.status(400).json({ error: "Amount off must be greater than 0" });
      }
      
      // Validate maxRedemptions if provided
      if (maxRedemptions !== undefined && maxRedemptions !== null && maxRedemptions !== '') {
        const numMax = Number(maxRedemptions);
        if (!Number.isFinite(numMax) || numMax <= 0 || !Number.isInteger(numMax)) {
          return res.status(400).json({ error: "Max redemptions must be a positive integer" });
        }
      }
      
      // Validate date ordering
      if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
        return res.status(400).json({ error: "End date must be after start date" });
      }

      // Check if code already exists
      const existing = await storage.getDiscountCodeByCode(code);
      if (existing) {
        return res.status(409).json({ error: "A discount code with this code already exists" });
      }
      
      const newCode = await storage.createDiscountCode({
        code,
        displayName,
        partnerName,
        description,
        planApplicability: planApplicability || 'both',
        percentOff: numPercentOff || undefined,
        amountOff: numAmountOff || undefined,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        startAt: startAt ? new Date(startAt) : undefined,
        endAt: endAt ? new Date(endAt) : undefined,
        isActive: isActive ?? true,
        createdBy: adminUser.id,
      });
      
      res.status(201).json(newCode);
    } catch (error) {
      console.error('Create discount code error:', error);
      res.status(500).json({ error: "Failed to create discount code" });
    }
  });

  // Update discount code
  app.patch("/api/admin/discount-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({ error: "Invalid discount code ID" });
      }
      
      const { code, displayName, partnerName, description, planApplicability, percentOff, amountOff, maxRedemptions, startAt, endAt, isActive } = req.body;
      
      const updateData: any = {};
      if (code !== undefined) {
        if (typeof code !== 'string' || code.trim().length === 0) {
          return res.status(400).json({ error: "Code cannot be empty" });
        }
        updateData.code = code;
      }
      if (displayName !== undefined) {
        if (typeof displayName !== 'string' || displayName.trim().length === 0) {
          return res.status(400).json({ error: "Display name cannot be empty" });
        }
        updateData.displayName = displayName;
      }
      if (partnerName !== undefined) updateData.partnerName = partnerName;
      if (description !== undefined) updateData.description = description;
      if (planApplicability !== undefined) updateData.planApplicability = planApplicability;
      
      // Handle discount values with validation
      if (percentOff !== undefined || amountOff !== undefined) {
        const numPercentOff = percentOff !== undefined && percentOff !== null && percentOff !== '' 
          ? Number(percentOff) 
          : null;
        const numAmountOff = amountOff !== undefined && amountOff !== null && amountOff !== '' 
          ? Number(amountOff) 
          : null;
        
        // Check for NaN
        if (numPercentOff !== null && !Number.isFinite(numPercentOff)) {
          return res.status(400).json({ error: "Percent off must be a valid number" });
        }
        
        if (numAmountOff !== null && !Number.isFinite(numAmountOff)) {
          return res.status(400).json({ error: "Amount off must be a valid number" });
        }
        
        if (numPercentOff !== null && numAmountOff !== null) {
          return res.status(400).json({ error: "Cannot specify both percent off and amount off" });
        }
        
        if (numPercentOff !== null && (numPercentOff <= 0 || numPercentOff > 100)) {
          return res.status(400).json({ error: "Percent off must be between 1 and 100" });
        }
        
        if (numAmountOff !== null && numAmountOff <= 0) {
          return res.status(400).json({ error: "Amount off must be greater than 0" });
        }
        
        updateData.percentOff = numPercentOff;
        updateData.amountOff = numAmountOff;
      }
      
      // Validate maxRedemptions if provided
      if (maxRedemptions !== undefined) {
        if (maxRedemptions !== null && maxRedemptions !== '') {
          const numMax = Number(maxRedemptions);
          if (!Number.isFinite(numMax) || numMax <= 0 || !Number.isInteger(numMax)) {
            return res.status(400).json({ error: "Max redemptions must be a positive integer" });
          }
          updateData.maxRedemptions = numMax;
        } else {
          updateData.maxRedemptions = null;
        }
      }
      
      if (startAt !== undefined) updateData.startAt = startAt ? new Date(startAt) : null;
      if (endAt !== undefined) updateData.endAt = endAt ? new Date(endAt) : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // Validate date ordering
      if (updateData.startAt && updateData.endAt && updateData.startAt >= updateData.endAt) {
        return res.status(400).json({ error: "End date must be after start date" });
      }

      // Check for code uniqueness if changing code
      if (code) {
        const existing = await storage.getDiscountCodeByCode(code);
        if (existing && existing.id !== id) {
          return res.status(409).json({ error: "A discount code with this code already exists" });
        }
      }
      
      const updated = await storage.updateDiscountCode(id, updateData);
      
      if (!updated) {
        return res.status(404).json({ error: "Discount code not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Update discount code error:', error);
      res.status(500).json({ error: "Failed to update discount code" });
    }
  });

  // Delete discount code
  app.delete("/api/admin/discount-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: "Invalid discount code ID" });
      }
      
      const deleted = await storage.deleteDiscountCode(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Discount code not found" });
      }
      
      res.json({ success: true, message: "Discount code deleted" });
    } catch (error) {
      console.error('Delete discount code error:', error);
      res.status(500).json({ error: "Failed to delete discount code" });
    }
  });

  // Sync discount code to Stripe (create coupon)
  app.post("/api/admin/discount-codes/:id/sync-stripe", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the discount code
      const discountCode = await storage.getDiscountCode(id);
      if (!discountCode) {
        return res.status(404).json({ error: "Discount code not found" });
      }
      
      // Check if already synced
      if (discountCode.stripeCouponId) {
        return res.status(400).json({ 
          error: "Already synced", 
          message: `This discount code is already linked to Stripe coupon: ${discountCode.stripeCouponId}` 
        });
      }
      
      // Get Stripe client
      const stripe = await getUncachableStripeClient();
      
      // Build coupon params
      const couponParams: any = {
        id: discountCode.code, // Use code as coupon ID for easy reference
        name: `${discountCode.code} - ${discountCode.displayName}`,
        duration: 'once', // Apply once per subscription
      };
      
      if (discountCode.percentOff) {
        couponParams.percent_off = Number(discountCode.percentOff);
      } else if (discountCode.amountOff) {
        couponParams.amount_off = Math.round(Number(discountCode.amountOff) * 100); // Convert to cents
        couponParams.currency = 'usd';
      }
      
      // Create coupon in Stripe
      const stripeCoupon = await stripe.coupons.create(couponParams);
      
      // Update discount code with Stripe coupon ID
      const updated = await storage.updateDiscountCode(id, {
        stripeCouponId: stripeCoupon.id,
      });
      
      console.log(`[STRIPE] Created coupon ${stripeCoupon.id} for discount code ${discountCode.code}`);
      
      res.json({ 
        success: true, 
        message: `Successfully synced to Stripe`,
        stripeCouponId: stripeCoupon.id,
        discountCode: updated
      });
    } catch (error: any) {
      console.error('Sync discount code to Stripe error:', error);
      
      // Handle Stripe-specific errors
      if (error.type === 'StripeInvalidRequestError') {
        if (error.code === 'resource_already_exists') {
          return res.status(400).json({ 
            error: "Coupon already exists in Stripe", 
            message: "A coupon with this code already exists in Stripe. You may need to link it manually or use a different code." 
          });
        }
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: "Failed to sync discount code to Stripe" });
    }
  });

  // Affiliate Management Routes
  // List all affiliates (admin only)
  app.get("/api/admin/affiliates", ensureAdmin, async (req, res) => {
    try {
      const affiliates = await storage.getAllAffiliates();
      res.json(affiliates);
    } catch (error) {
      console.error('Get all affiliates error:', error);
      res.status(500).json({ error: "Failed to fetch affiliates" });
    }
  });

  // List active affiliates (public, for Resources page)
  app.get("/api/affiliates", async (req, res) => {
    try {
      const affiliates = await storage.getActiveAffiliates();
      res.json(affiliates);
    } catch (error) {
      console.error('Get active affiliates error:', error);
      res.status(500).json({ error: "Failed to fetch affiliates" });
    }
  });

  // Create affiliate (admin only) - with Zod validation
  const createAffiliateSchema = insertAffiliateSchema.extend({
    benefits: z.array(z.string()).default([]),
    categories: z.array(z.string()).min(1, "At least one category is required"),
  });
  
  app.post("/api/admin/affiliates", ensureAdmin, async (req, res) => {
    try {
      const validationResult = createAffiliateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const data = validationResult.data;
      const affiliate = await storage.createAffiliate({
        name: data.name,
        description: data.description,
        benefits: data.benefits,
        referralLink: data.referralLink,
        categories: data.categories,
        iconName: data.iconName || 'Building2',
        referralFee: data.referralFee || null,
        referralFeeType: data.referralFeeType || null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      });
      
      res.status(201).json(affiliate);
    } catch (error) {
      console.error('Create affiliate error:', error);
      res.status(500).json({ error: "Failed to create affiliate" });
    }
  });

  // Update affiliate (admin only) - with Zod validation
  const updateAffiliateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    benefits: z.array(z.string()).optional(),
    referralLink: z.string().min(1).optional(),
    categories: z.array(z.string()).min(1, "At least one category is required").optional(),
    iconName: z.string().optional(),
    referralFee: z.string().nullable().optional(),
    referralFeeType: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
  });
  
  app.put("/api/admin/affiliates/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validationResult = updateAffiliateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const data = validationResult.data;
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.benefits !== undefined) updateData.benefits = data.benefits;
      if (data.referralLink !== undefined) updateData.referralLink = data.referralLink;
      if (data.categories !== undefined) updateData.categories = data.categories;
      if (data.iconName !== undefined) updateData.iconName = data.iconName;
      if (data.referralFee !== undefined) updateData.referralFee = data.referralFee;
      if (data.referralFeeType !== undefined) updateData.referralFeeType = data.referralFeeType;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      
      const updated = await storage.updateAffiliate(id, updateData);
      
      if (!updated) {
        return res.status(404).json({ error: "Affiliate not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Update affiliate error:', error);
      res.status(500).json({ error: "Failed to update affiliate" });
    }
  });

  // Delete affiliate (admin only)
  app.delete("/api/admin/affiliates/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAffiliate(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Affiliate not found" });
      }
      
      res.json({ success: true, message: "Affiliate deleted" });
    } catch (error) {
      console.error('Delete affiliate error:', error);
      res.status(500).json({ error: "Failed to delete affiliate" });
    }
  });

  // List affiliate categories (admin only)
  app.get("/api/admin/affiliate-categories", ensureAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllAffiliateCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get affiliate categories error:', error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Create/update affiliate category (admin only) - with Zod validation
  const upsertCategorySchema = z.object({
    id: z.string().min(1, "ID is required"),
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    sortOrder: z.number().optional(),
  });
  
  app.post("/api/admin/affiliate-categories", ensureAdmin, async (req, res) => {
    try {
      const validationResult = upsertCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      
      const data = validationResult.data;
      const category = await storage.upsertAffiliateCategory({
        id: data.id,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
      });
      
      res.json(category);
    } catch (error) {
      console.error('Upsert affiliate category error:', error);
      res.status(500).json({ error: "Failed to save category" });
    }
  });

  // Delete affiliate category (admin only)
  app.delete("/api/admin/affiliate-categories/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAffiliateCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json({ success: true, message: "Category deleted" });
    } catch (error) {
      console.error('Delete affiliate category error:', error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Validate comp code (public - for registration page)
  app.get("/api/comp-invites/validate/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const invite = await storage.getCompInviteByCode(code.toUpperCase());
      
      if (!invite) {
        return res.json({ valid: false, reason: "Invalid code" });
      }
      
      if (invite.status !== 'pending') {
        return res.json({ valid: false, reason: "Code has already been used" });
      }
      
      if (new Date() > invite.expiresAt) {
        return res.json({ valid: false, reason: "Code has expired" });
      }
      
      res.json({ valid: true, email: invite.email });
    } catch (error) {
      console.error('Validate comp code error:', error);
      res.status(500).json({ error: "Failed to validate code" });
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

  // Deal Analysis Results Calculation
  const dealAnalysisResultsSchema = z.object({
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
      monthlyInsurance: z.number().optional(),
      monthlyUtilities: z.number().optional(),
      monthlyPropertyTax: z.number().optional(),
      monthlyHoa: z.number().optional(),
    }),
    criteriaSelection: z.object({
      useDefaultCriteria: z.boolean(),
      primary: z.enum(['profit', 'out-of-pocket', 'fastest']).optional(),
      secondary: z.enum(['profit', 'out-of-pocket', 'fastest']).optional(),
    }),
    loanPreference: z.enum(['lowest-oop', 'highest-profit', 'one-of-each']).optional(),
    userLoan: z.object({
      desiredLoanAmount: z.number().optional(),
      interestRate: z.number(),
      interestDeferred: z.boolean().optional(),
      points: z.number(),
      pointsDeferred: z.boolean().optional(),
      maxLoanToArv: z.number(),
      appraisalRequired: z.boolean().optional(),
      appraisalFee: z.number().optional(),
      drawFees: z.number().optional(),
      loanDocPrepFees: z.number().optional(),
    }).optional(),
    numberOfDraws: z.number().default(3),
    excludeProductIds: z.array(z.string()).optional(),
  });

  app.post("/api/deal-analysis/results", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = dealAnalysisResultsSchema.parse(req.body);
      const { dealInputs, criteriaSelection, userLoan, numberOfDraws, excludeProductIds } = validatedData;

      const { purchasePrice, rehabBudget, arv, projectLength, closingCostsBuy, carryingCosts, sellPrice, closingCostsSell, commission } = dealInputs;
      const totalProjectCost = purchasePrice + rehabBudget;
      const percentageArv = arv > 0 ? (totalProjectCost / arv) * 100 : 0;

      // Calculate Cash Sale Column (no financing)
      // For cash purchase, closingCostsBuy is just the base amount (no lender fees)
      const cashOutOfPocketBreakdown = {
        downPayment: totalProjectCost,
        baseClosingCosts: closingCostsBuy,
        pointsCost: 0,
        appraisalCost: 0,
        docPrepFee: 0,
        lenderFees: 0,
        totalClosingCostsBuy: closingCostsBuy,
        carryingCosts: carryingCosts,
        total: totalProjectCost + closingCostsBuy + carryingCosts,
      };
      
      const cashSaleColumn = {
        type: 'cash' as const,
        purchasePrice,
        rehabBudget,
        totalProjectCost,
        closingCostsBuy,
        carryingCosts,
        totalInvestment: totalProjectCost + closingCostsBuy + carryingCosts,
        sellPrice,
        closingCostsSell,
        commission,
        rolledCosts: 0,
        lenderDrawFees: 0,
        profit: sellPrice - (totalProjectCost + closingCostsBuy + carryingCosts) - closingCostsSell - commission,
        outOfPocketCost: totalProjectCost + closingCostsBuy + carryingCosts,
        outOfPocketBreakdown: cashOutOfPocketBreakdown,
        cashOnCashRoi: 0,
        annualizedRoi: 0,
        roi: 0,
        percentageArv,
      };
      
      const cashTotalInvestment = cashSaleColumn.totalInvestment;
      cashSaleColumn.profit = sellPrice - cashTotalInvestment - closingCostsSell - commission;
      cashSaleColumn.roi = cashTotalInvestment > 0 ? (cashSaleColumn.profit / cashTotalInvestment) * 100 : 0;
      cashSaleColumn.cashOnCashRoi = cashSaleColumn.roi;
      cashSaleColumn.annualizedRoi = projectLength > 0 ? (cashSaleColumn.cashOnCashRoi / (projectLength / 12)) : 0;

      // Calculate User Loan Column (if provided)
      let userLoanColumn = null;
      if (userLoan) {
        // Calculate maximum loan based on ARV constraint
        const maxLoanFromArv = arv * (userLoan.maxLoanToArv / 100);
        // Use desiredLoanAmount if specified, otherwise cap at max from ARV or total project cost
        const loanAmount = userLoan.desiredLoanAmount 
          ? Math.min(userLoan.desiredLoanAmount, maxLoanFromArv)
          : Math.min(totalProjectCost, maxLoanFromArv);
        
        const pointsCost = loanAmount * (userLoan.points / 100);
        const monthlyInterestPayment = (loanAmount * (userLoan.interestRate / 100) / 12);
        const interestCost = monthlyInterestPayment * projectLength;
        const appraisalCost = userLoan.appraisalRequired ? (userLoan.appraisalFee || 500) : 0;
        const drawFeesCost = (userLoan.drawFees || 0) * numberOfDraws;
        const docPrepFees = userLoan.loanDocPrepFees || 0;
        
        // Properly handle deferred costs - they are NOT paid upfront but ARE added at sale
        const rolledCosts = (userLoan.pointsDeferred ? pointsCost : 0) + 
                           (userLoan.interestDeferred ? interestCost : 0);
        
        // User loan carrying costs include monthly interest when NOT deferred
        const userLoanCarryingCosts = carryingCosts + (!userLoan.interestDeferred ? interestCost : 0);
        
        // Upfront loan costs (points if not deferred + appraisal + draws + doc prep)
        const upfrontLoanCosts = (!userLoan.pointsDeferred ? pointsCost : 0) + 
                                 appraisalCost + drawFeesCost + docPrepFees;
        
        // Calculate per-lender total closing costs
        const upfrontPointsCost = !userLoan.pointsDeferred ? pointsCost : 0;
        const totalClosingCostsBuyUser = closingCostsBuy + upfrontPointsCost + appraisalCost + docPrepFees;
        
        // Down payment = project cost minus loan
        const downPayment = Math.max(0, totalProjectCost - loanAmount);
        
        // Out of pocket = what you pay upfront (down payment + total closing costs + carrying + draw fees)
        const outOfPocket = downPayment + totalClosingCostsBuyUser + userLoanCarryingCosts + drawFeesCost;
        // Total investment includes rolled costs that come due at sale
        const totalInvestment = outOfPocket + rolledCosts;
        // Profit = sale proceeds minus all costs (upfront and rolled)
        const profit = sellPrice - totalProjectCost - closingCostsBuy - userLoanCarryingCosts - 
                      upfrontLoanCosts - rolledCosts - closingCostsSell - commission;
        
        // Build out-of-pocket breakdown for user loan (draw fees included in lenderFees for display)
        const userLoanBreakdown = {
          downPayment,
          baseClosingCosts: closingCostsBuy,
          pointsCost: upfrontPointsCost,
          totalPointsCost: pointsCost,
          pointsDeferred: userLoan.pointsDeferred || false,
          appraisalCost,
          docPrepFee: docPrepFees,
          lenderFees: drawFeesCost,
          totalClosingCostsBuy: totalClosingCostsBuyUser + drawFeesCost,
          carryingCosts: userLoanCarryingCosts,
          total: outOfPocket,
        };
        
        userLoanColumn = {
          type: 'user-loan' as const,
          interestRate: userLoan.interestRate,
          points: userLoan.points,
          maxLtvBuy: userLoan.maxLoanToArv,
          purchasePrice,
          rehabBudget,
          totalProjectCost,
          closingCostsBuy: totalClosingCostsBuyUser + drawFeesCost,
          carryingCosts: userLoanCarryingCosts,
          interestCost,
          totalInvestment,
          sellPrice,
          closingCostsSell,
          commission,
          rolledCosts,
          lenderDrawFees: drawFeesCost,
          profit,
          outOfPocketCost: outOfPocket,
          outOfPocketBreakdown: userLoanBreakdown,
          cashOnCashRoi: outOfPocket > 0 ? (profit / outOfPocket) * 100 : 0,
          annualizedRoi: outOfPocket > 0 && projectLength > 0 ? ((profit / outOfPocket) * 100) / (projectLength / 12) : 0,
          roi: totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0,
          percentageArv,
          percentageArvLender: arv > 0 ? (loanAmount / arv) * 100 : 0,
        };
      }

      // Get active loan products and filter
      const allProducts = await storage.getAllActiveLoanProducts();
      const allLenders = await storage.getAllLenders();
      
      // Create lender lookup map
      const lenderMap = new Map<string, any>();
      allLenders.forEach(lender => {
        lenderMap.set(lender.id || lender.lenderId, lender);
      });

      // Filter products (exclude specified, only bridge/hard money for now)
      let filteredProducts = allProducts.filter(p => {
        if (excludeProductIds?.includes(p.id)) return false;
        if (p.loanType !== 'bridge') return false;
        return true;
      });

      // Calculate columns for each lender product
      const lenderColumns = filteredProducts.map(product => {
        const maxLtvBuy = parseFloat(String(product.maxLtvBuy || 0));
        const maxLendRehab = parseFloat(String(product.maxLendRehab || 0));
        const maxLoanArv = parseFloat(String(product.maxLoanArv || 70));
        const interestRate = parseFloat(String(product.interestRate || 12));
        const points = parseFloat(String(product.points || 0));
        const costPerDraw = parseFloat(String(product.costPerDraw || 0));
        const estimatedAppraisalCost = parseFloat(String(product.estimatedAppraisalCost || 0));
        const fees = parseFloat(String(product.fees || 0));
        const isLtcWeighted = product.isLtcWeighted || false;
        const maxLtcPercent = product.maxLtcPercent ? parseFloat(String(product.maxLtcPercent)) : undefined;
        
        const lender = lenderMap.get(product.lenderId);
        
        // Calculate base loan amounts
        let purchaseLoanAmount = purchasePrice * (maxLtvBuy / 100);
        let rehabLoanAmount = rehabBudget * (maxLendRehab / 100);
        const totalLoanDesired = purchaseLoanAmount + rehabLoanAmount;
        
        // Apply ARV cap
        const maxFromArv = arv * (maxLoanArv / 100);
        
        // Apply LTC cap if applicable
        let maxFromLtc = totalLoanDesired;
        let isLtcAdjusted = false;
        let effectiveBuyPercent = maxLtvBuy;
        
        if (isLtcWeighted && maxLtcPercent && maxLtcPercent > 0) {
          maxFromLtc = totalProjectCost * (maxLtcPercent / 100);
        }
        
        // Apply whichever cap is lower
        let loanAmount = Math.min(totalLoanDesired, maxFromArv, maxFromLtc);
        
        // If LTC cap is the limiting factor, adjust buy amount first (rehab stays at 100%)
        if (isLtcWeighted && maxLtcPercent && maxFromLtc < maxFromArv && maxFromLtc < totalLoanDesired) {
          isLtcAdjusted = true;
          // Rehab amount stays at full percentage, adjust buy amount
          rehabLoanAmount = rehabBudget * (maxLendRehab / 100);
          purchaseLoanAmount = loanAmount - rehabLoanAmount;
          if (purchaseLoanAmount < 0) {
            purchaseLoanAmount = 0;
            rehabLoanAmount = loanAmount;
          }
          if (purchasePrice > 0) {
            effectiveBuyPercent = (purchaseLoanAmount / purchasePrice) * 100;
          }
        }
        
        const pointsCost = loanAmount * (points / 100);
        const monthlyInterestPayment = (loanAmount * (interestRate / 100) / 12);
        const interestCost = monthlyInterestPayment * projectLength;
        const drawFeesCost = costPerDraw * numberOfDraws;
        const appraisalCost = product.appraisalRequired ? estimatedAppraisalCost : 0;
        
        // Properly handle deferred costs - they are NOT paid upfront but ARE added at sale
        const rolledCosts = (product.pointsDeferred ? pointsCost : 0) + 
                           (product.interestDeferred ? interestCost : 0);
        
        // Lender-specific carrying costs include monthly interest when NOT deferred
        // Base carrying costs (from frontend) + interest payments if not deferred
        const lenderCarryingCosts = carryingCosts + (!product.interestDeferred ? interestCost : 0);
        
        // Calculate upfront points cost (only if not deferred)
        const upfrontPointsCost = !product.pointsDeferred ? pointsCost : 0;
        
        // Calculate per-lender total closing costs (base + points + appraisal + lender fees)
        const totalClosingCostsBuyLender = closingCostsBuy + upfrontPointsCost + appraisalCost + fees;
        
        // Calculate down payment using component breakdown:
        // 1. Buy Down Payment = Buy Price × (100% - Max LTV Buy%)
        // 2. Rehab Down Payment = Rehab × (100% - Max Lend Rehab%)
        // 3. ARV Adjustment = amount by which loan exceeds ARV cap
        const buyDownPayment = purchasePrice * (1 - maxLtvBuy / 100);
        const rehabDownPayment = rehabBudget * (1 - maxLendRehab / 100);
        const arvAdjustment = Math.max(0, totalLoanDesired - maxFromArv);
        // Also check LTC adjustment if applicable
        const ltcAdjustment = (isLtcWeighted && maxLtcPercent) ? Math.max(0, totalLoanDesired - maxFromLtc) : 0;
        // Final down payment is the sum of components, taking the larger of ARV or LTC adjustment
        const capAdjustment = Math.max(arvAdjustment, ltcAdjustment);
        const downPaymentLender = buyDownPayment + rehabDownPayment + capAdjustment;
        
        // Debug: Log calculation details for troubleshooting
        if (lender?.companyName?.includes('Test Lender')) {
          console.log('[Down Payment Debug]', {
            lender: lender?.companyName,
            product: product.productName,
            purchasePrice,
            rehabBudget,
            totalProjectCost,
            maxLtvBuy,
            maxLendRehab,
            maxLoanArv,
            arv,
            purchaseLoanAmount,
            rehabLoanAmount,
            totalLoanDesired,
            maxFromArv,
            maxFromLtc,
            isLtcWeighted,
            maxLtcPercent,
            finalLoanAmount: loanAmount,
            // Down payment component breakdown
            buyDownPayment,
            rehabDownPayment,
            arvAdjustment,
            ltcAdjustment,
            capAdjustment,
            downPayment: downPaymentLender,
            limitingFactor: loanAmount === maxFromArv ? 'ARV cap' : (loanAmount === maxFromLtc ? 'LTC cap' : 'LTV cap'),
          });
        }
        
        // Out of pocket = what you pay upfront (down payment + total closing costs + carrying + draw fees)
        const outOfPocket = downPaymentLender + totalClosingCostsBuyLender + lenderCarryingCosts + drawFeesCost;
        const totalInvestment = outOfPocket + rolledCosts;
        const profit = sellPrice - totalProjectCost - closingCostsBuy - lenderCarryingCosts - 
                      upfrontPointsCost - appraisalCost - drawFeesCost - fees - rolledCosts - closingCostsSell - commission;
        
        // Build out-of-pocket breakdown for this lender
        // Lender fees (admin/origination fees) separated from draw fees for clarity
        const lenderBreakdown = {
          downPayment: downPaymentLender,
          // Down payment component breakdown for debugging/display
          buyDownPayment,
          rehabDownPayment,
          arvAdjustment,
          ltcAdjustment,
          capAdjustment,
          baseClosingCosts: closingCostsBuy,
          pointsCost: upfrontPointsCost,
          totalPointsCost: pointsCost,
          pointsDeferred: product.pointsDeferred || false,
          appraisalCost,
          docPrepFee: 0, // Lender products don't have separate doc prep - included in lenderFees
          lenderFees: fees + drawFeesCost,
          totalClosingCostsBuy: totalClosingCostsBuyLender + drawFeesCost,
          carryingCosts: lenderCarryingCosts,
          total: outOfPocket,
        };

        return {
          type: 'lender' as const,
          lenderId: product.lenderId,
          lenderName: lender?.companyName || 'Unknown Lender',
          productId: product.id,
          productName: product.productName,
          timeToClose: product.timeToClose,
          maxLoanArv,
          referralLink: product.referralLink,
          interestRate,
          maxLtvBuy,
          points,
          isLtcWeighted,
          maxLtcPercent,
          isLtcAdjusted,
          effectiveBuyPercent,
          purchasePrice,
          rehabBudget,
          totalProjectCost,
          closingCostsBuy: totalClosingCostsBuyLender + drawFeesCost,
          carryingCosts: lenderCarryingCosts,
          interestCost,
          totalInvestment,
          sellPrice,
          closingCostsSell,
          commission,
          rolledCosts,
          lenderDrawFees: drawFeesCost,
          profit,
          outOfPocketCost: outOfPocket,
          outOfPocketBreakdown: lenderBreakdown,
          cashOnCashRoi: outOfPocket > 0 ? (profit / outOfPocket) * 100 : 0,
          annualizedRoi: outOfPocket > 0 && projectLength > 0 ? ((profit / outOfPocket) * 100) / (projectLength / 12) : 0,
          roi: totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0,
          percentageArv,
          percentageArvLender: arv > 0 ? (loanAmount / arv) * 100 : 0,
        };
      });

      // Sort by criteria
      const sortedLenderColumns = lenderColumns.sort((a, b) => {
        const primary = criteriaSelection.primary || 'out-of-pocket';
        const secondary = criteriaSelection.secondary || 'profit';
        
        const comparators: Record<string, (x: any, y: any) => number> = {
          'out-of-pocket': (x, y) => (x.outOfPocketCost || 0) - (y.outOfPocketCost || 0),
          'profit': (x, y) => (y.profit || 0) - (x.profit || 0), // Higher profit first
          'fastest': (x, y) => (x.timeToClose || 999) - (y.timeToClose || 999),
        };
        
        const primaryResult = comparators[primary](a, b);
        if (primaryResult !== 0) return primaryResult;
        return comparators[secondary](a, b);
      });

      res.json({
        cashSaleColumn,
        userLoanColumn,
        lenderColumns: sortedLenderColumns,
        criteriaUsed: criteriaSelection,
        numberOfDraws,
        allRankedProducts: sortedLenderColumns.length,
      });
    } catch (error) {
      console.error("Deal analysis results error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to calculate deal analysis results" });
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

  // DSCR Lenders - for Rental Analysis
  app.get("/api/dscr-lenders", async (req, res) => {
    try {
      const { state } = req.query;
      
      // Get all active loan products
      const allProducts = await storage.getAllActiveLoanProducts();
      const allLenders = await storage.getAllLenders();
      const allQuestionnaires = await storage.getAllLenderQuestionnaires();
      
      // State code to full name mapping for questionnaire matching
      const stateCodeToName: Record<string, string> = {
        AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
        CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
        HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
        KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
        MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
        MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
        NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
        OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
        SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
        VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
      };
      
      // Convert state code to full name for matching questionnaire
      const stateName = state && typeof state === 'string' ? (stateCodeToName[state.toUpperCase()] || state) : null;
      
      // Create lender map for quick lookup
      const lenderMap = new Map<string, typeof allLenders[0]>();
      allLenders.forEach(lender => {
        if (!lender.archived) {
          lenderMap.set(lender.id, lender);
        }
      });
      
      // Create questionnaire map for quick lookup
      const questionnaireMap = new Map<string, typeof allQuestionnaires[0]>();
      allQuestionnaires.forEach(q => {
        questionnaireMap.set(q.lenderId, q);
      });
      
      // Filter for DSCR products only (dscr-purchase and dscr-refi)
      const dscrProducts = allProducts.filter(p => 
        p.loanType === 'dscr-purchase' || p.loanType === 'dscr-refi'
      );
      
      // Map products to response format with lender info
      const results = dscrProducts.map(product => {
        const lender = lenderMap.get(product.lenderId);
        if (!lender) return null;
        
        const questionnaire = questionnaireMap.get(product.lenderId);
        
        // If state filter provided, check if lender serves that state via questionnaire
        if (stateName && questionnaire) {
          const offersAllStates = questionnaire.offerLoansAllStates === 'Yes';
          const statesServiced = questionnaire.statesServiced || [];
          
          if (!offersAllStates && !statesServiced.includes(stateName)) {
            return null;
          }
        } else if (stateName && !questionnaire) {
          // No questionnaire = can't verify state coverage
          return null;
        }
        
        return {
          productId: product.id,
          lenderId: product.lenderId,
          lenderName: lender.companyName,
          contactName: lender.contactName,
          phone: lender.phone,
          email: lender.email,
          website: lender.website,
          productName: product.productName,
          loanType: product.loanType,
          interestRate: product.interestRate,
          points: product.points,
          minCreditScore: product.minCreditScore,
          maxLtvBuy: product.maxLtvBuy,
          maxLoanArv: product.maxLoanArv,
          timeToClose: product.timeToClose,
          referralLink: product.referralLink || lender.referralLink,
          fees: product.fees,
          isPreferred: lender.isPreferred || false,
          loanTermYears: product.loanTermYears,
          minDscrRequired: product.minDscrRequired,
          estimatedAppraisalCost: product.estimatedAppraisalCost,
          appraisalRequired: product.appraisalRequired,
          cashOutOk: product.cashOutOk,
          cashOutMaxLtv: product.cashOutMaxLtv,
        };
      }).filter(Boolean);
      
      // Sort by preferred status first, then by interest rate
      results.sort((a: any, b: any) => {
        if (a.isPreferred !== b.isPreferred) return b.isPreferred ? 1 : -1;
        return (a.interestRate || 0) - (b.interestRate || 0);
      });
      
      res.json(results);
    } catch (error) {
      console.error("DSCR lenders error:", error);
      res.status(500).json({ error: "Failed to fetch DSCR lenders" });
    }
  });

  app.post("/api/prelaunch-signups", async (req, res) => {
    try {
      const { name, company, email, phone, consent, source } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      // Log the signup for now (could save to database later)
      console.log(`[PRELAUNCH] New signup: ${name} (${email}) - Company: ${company || 'N/A'} - Source: ${source || 'unknown'}`);

      // Send confirmation email
      const emailSent = await emailService.sendPrelaunchConfirmation(email, name);
      
      if (!emailSent) {
        console.error(`[PRELAUNCH] FAILED to send confirmation email to ${email}`);
        return res.status(500).json({ 
          error: "We received your signup but couldn't send the confirmation email. Please try again or contact support." 
        });
      }

      console.log(`[PRELAUNCH] Confirmation email sent successfully to ${email}`);
      res.json({
        message: "Thank you for signing up!",
        success: true,
      });
    } catch (error) {
      console.error('[PRELAUNCH] Signup error:', error);
      res.status(500).json({ error: "Failed to process signup. Please try again." });
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
      
      // Fetch property image from HasData if the service supports it and no image was returned
      if (!propertyData.imageUrl && 'fetchPropertyImageFromUrl' in propertyAPIService) {
        try {
          const imageUrl = await (propertyAPIService as any).fetchPropertyImageFromUrl(url);
          if (imageUrl) {
            propertyData.imageUrl = imageUrl;
          }
        } catch (imageError) {
          console.log("Could not fetch property image:", imageError);
        }
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
      const user = req.user as User;
      const userId = user.id;
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
      
      // Send email notification to the lender (async, don't wait)
      (async () => {
        try {
          // Get the lender's info
          const [lender] = await db
            .select()
            .from(lenders)
            .where(eq(lenders.id, lenderId));
          
          if (lender && lender.email) {
            // Get the member's profile for display name
            const [profile] = await db
              .select()
              .from(userProfiles)
              .where(eq(userProfiles.userId, userId));
            
            const memberName = profile?.fullName || user.username || "A member";
            const companyName = lender.companyName || "Lender";
            
            await emailService.sendLenderSavedNotification(
              lender.email,
              companyName,
              memberName
            );
          }
        } catch (emailError) {
          console.error("Error sending lender saved notification:", emailError);
        }
      })();
      
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

  // Get members who saved the current lender (for lender portal)
  app.get("/api/lender/saved-by", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lender = req.user as any;
      
      const savedByMembers = await db
        .select({
          id: savedLenders.id,
          savedAt: savedLenders.createdAt,
          user: {
            id: users.id,
            username: users.username,
            email: users.email,
          },
          profile: {
            fullName: userProfiles.fullName,
            city: userProfiles.city,
            state: userProfiles.state,
            phone: userProfiles.phone,
          },
        })
        .from(savedLenders)
        .innerJoin(users, eq(savedLenders.userId, users.id))
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(eq(savedLenders.lenderId, lender.id))
        .orderBy(desc(savedLenders.createdAt));
      
      res.json(savedByMembers);
    } catch (error) {
      console.error("Error fetching saved-by members:", error);
      res.status(500).json({ error: "Failed to fetch saved-by members" });
    }
  });

  // Contact Lender - Member sends inquiry with deal details
  const contactLenderSchema = z.object({
    lenderId: z.string(),
    loanProductId: z.string().optional(),
    propertyAddress: z.string(),
    arv: z.number().optional(),
    buyPrice: z.number().optional(),
    rehabCost: z.number().optional(),
    projectLength: z.number().optional(),
    estProfit: z.number().optional(),
    cashOnCashRoi: z.number().optional(),
    annualizedRoi: z.number().optional(),
    estOutOfPocket: z.number().optional(),
    projectCosts: z.number().optional(),
    costsAndCarrying: z.number().optional(),
    exitSale: z.number().optional(),
    loanTerms: z.object({
      interestRate: z.string().optional(),
      maxLtvBuy: z.string().optional(),
      points: z.string().optional(),
      timeToClose: z.string().optional(),
    }).optional(),
    productName: z.string().optional(),
    loanType: z.string().optional(),
  });

  app.post("/api/member/contact-lender", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const data = contactLenderSchema.parse(req.body);
      
      // Get user profile for investor info
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id));
      
      // Get lender info
      const [lender] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.id, data.lenderId));
      
      if (!lender) {
        return res.status(404).json({ error: "Lender not found" });
      }
      
      const investorName = profile?.fullName || user.username || "Unknown Investor";
      const investorEmail = user.email;
      const investorPhone = profile?.phone || undefined;
      
      // Store the inquiry in the database
      const [inquiry] = await db
        .insert(lenderInquiries)
        .values({
          lenderId: data.lenderId,
          loanProductId: data.loanProductId,
          userId: user.id,
          propertyAddress: data.propertyAddress,
          arv: data.arv?.toString(),
          buyPrice: data.buyPrice?.toString(),
          rehabCost: data.rehabCost?.toString(),
          projectLength: data.projectLength,
          estProfit: data.estProfit?.toString(),
          cashOnCashRoi: data.cashOnCashRoi?.toString(),
          annualizedRoi: data.annualizedRoi?.toString(),
          estOutOfPocket: data.estOutOfPocket?.toString(),
          projectCosts: data.projectCosts?.toString(),
          costsAndCarrying: data.costsAndCarrying?.toString(),
          exitSale: data.exitSale?.toString(),
          loanTerms: data.loanTerms,
          investorName,
          investorEmail,
          investorPhone,
          productName: data.productName,
          loanType: data.loanType,
          emailSent: false,
        })
        .returning();
      
      // Helper function to format currency
      const formatCurrency = (value: number | undefined): string => {
        if (value === undefined || value === null) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
      };
      
      // Helper function to format percentage
      const formatPercent = (value: number | undefined): string => {
        if (value === undefined || value === null) return 'N/A';
        return `${value.toFixed(2)}%`;
      };
      
      // Send email notification to lender (async, don't wait)
      (async () => {
        try {
          if (lender.email) {
            await emailService.sendLenderContactNotification(
              lender.email,
              lender.companyName,
              {
                investorName,
                investorEmail,
                investorPhone,
                propertyAddress: data.propertyAddress,
                productName: data.productName || 'Not specified',
                loanType: data.loanType || 'Not specified',
                estProfit: formatCurrency(data.estProfit),
                cashOnCashRoi: formatPercent(data.cashOnCashRoi),
                annualizedRoi: formatPercent(data.annualizedRoi),
                estOutOfPocket: formatCurrency(data.estOutOfPocket),
                interestRate: data.loanTerms?.interestRate,
                maxLtvBuy: data.loanTerms?.maxLtvBuy,
                points: data.loanTerms?.points,
                timeToClose: data.loanTerms?.timeToClose,
                projectCosts: formatCurrency(data.projectCosts),
                costsAndCarrying: formatCurrency(data.costsAndCarrying),
                exitSale: formatCurrency(data.exitSale),
              }
            );
            
            // Update inquiry to mark email as sent
            await db
              .update(lenderInquiries)
              .set({ emailSent: true })
              .where(eq(lenderInquiries.id, inquiry.id));
          }
        } catch (emailError) {
          console.error("Error sending lender contact notification:", emailError);
        }
      })();
      
      res.json({ 
        success: true, 
        message: "Your inquiry has been sent to the lender",
        inquiryId: inquiry.id 
      });
    } catch (error) {
      console.error("Error contacting lender:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send inquiry" });
    }
  });
  
  // Get lender inquiries (for lender portal)
  app.get("/api/lender/inquiries", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lender = req.user as any;
      const { search, startDate, endDate } = req.query;
      
      let query = db
        .select({
          id: lenderInquiries.id,
          propertyAddress: lenderInquiries.propertyAddress,
          arv: lenderInquiries.arv,
          buyPrice: lenderInquiries.buyPrice,
          rehabCost: lenderInquiries.rehabCost,
          projectLength: lenderInquiries.projectLength,
          estProfit: lenderInquiries.estProfit,
          cashOnCashRoi: lenderInquiries.cashOnCashRoi,
          annualizedRoi: lenderInquiries.annualizedRoi,
          estOutOfPocket: lenderInquiries.estOutOfPocket,
          projectCosts: lenderInquiries.projectCosts,
          costsAndCarrying: lenderInquiries.costsAndCarrying,
          exitSale: lenderInquiries.exitSale,
          loanTerms: lenderInquiries.loanTerms,
          investorName: lenderInquiries.investorName,
          investorEmail: lenderInquiries.investorEmail,
          investorPhone: lenderInquiries.investorPhone,
          productName: lenderInquiries.productName,
          loanType: lenderInquiries.loanType,
          emailSent: lenderInquiries.emailSent,
          createdAt: lenderInquiries.createdAt,
          user: {
            id: users.id,
            username: users.username,
          },
        })
        .from(lenderInquiries)
        .innerJoin(users, eq(lenderInquiries.userId, users.id))
        .where(eq(lenderInquiries.lenderId, lender.id))
        .orderBy(desc(lenderInquiries.createdAt));
      
      const inquiries = await query;
      
      // Filter by search term if provided
      let filteredInquiries = inquiries;
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        filteredInquiries = inquiries.filter(inq => 
          inq.investorName?.toLowerCase().includes(searchLower) ||
          inq.investorEmail?.toLowerCase().includes(searchLower) ||
          inq.propertyAddress?.toLowerCase().includes(searchLower) ||
          inq.productName?.toLowerCase().includes(searchLower)
        );
      }
      
      // Filter by date range if provided
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        filteredInquiries = filteredInquiries.filter(inq => 
          inq.createdAt && new Date(inq.createdAt) >= start
        );
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the whole end day
        filteredInquiries = filteredInquiries.filter(inq => 
          inq.createdAt && new Date(inq.createdAt) <= end
        );
      }
      
      res.json(filteredInquiries);
    } catch (error) {
      console.error("Error fetching lender inquiries:", error);
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });
  
  // Get inquiry count for lender dashboard
  app.get("/api/lender/inquiries/count", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lender = req.user as any;
      
      const [result] = await db
        .select({ count: count() })
        .from(lenderInquiries)
        .where(eq(lenderInquiries.lenderId, lender.id));
      
      res.json({ count: result?.count || 0 });
    } catch (error) {
      console.error("Error fetching inquiry count:", error);
      res.status(500).json({ error: "Failed to fetch inquiry count" });
    }
  });

  // Create HTTP server
  const server = createServer(app);
  return server;
}
