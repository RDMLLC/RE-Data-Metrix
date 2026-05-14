import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLenderQuestionnaireSchema, insertLoanProductSchema, insertPropertySchema, insertAffiliateSchema, insertAffiliateCategorySchema, insertServiceRegionSchema, insertContractorSchema, insertMarketingPixelSchema, users, userProfiles, investmentPreferences, userInvestmentPreferences, savedDeals, savedLenders, lenders, loanProducts, lenderReferrals, affiliateClicks, dealAnalyses, lenderInquiries, applyClicks, pendingRegistrations, discountCodeUses, discountCodes, compInvites, auditorInvites, affiliates, affiliateCategories, trainingVideos, marketingPixels, promoCodes, promoRedemptions, contractors, contractorDocuments, contractorServiceRegions, featureFeedback, emailSenderAliases, emailCategorySettings, insertEmailSenderAliasSchema, userSubmissions, insertUserSubmissionSchema, insertReportingSnapshotSchema, sentSignupFollowups, userUsageCounters, promoWaitlist, apiUsageLogs, demoTokens, integrationConfigs, outboundWebhooks, type User } from "@shared/schema";
import { z } from "zod";
import { propertyAPIService, PropertyAPIFactory } from "./services/property-api.factory";
import { HasDataAPIService } from "./services/hasdata-api.service";
import { db } from "./db";
import { eq, inArray, desc, asc, and, sql, count, gt, or, ne } from "drizzle-orm";
import { hashPassword, comparePassword } from "./auth";
import passport, { ensureAdmin, ensureAdminOrDeveloper, ensureAdminReadAccess, ensureLenderAuthenticated, ensureLenderOrAdmin, ensureAuthenticated, ensureContractorAuthenticated, requireRole } from "./auth";
import { emailService } from "./services/email.service";
import { authService, registrationSchema } from "./services/auth.service";
import crypto from "crypto";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { seedAffiliates, seedAffiliateCategories, seedLenders, seedLoanProducts, seedTrainingVideos } from "./seed-data";
import { outboundWebhookService } from "./services/outbound-webhook.service";
import { sendMetaCapiEvent } from "./services/metaCapi";
import { normalizePropertyAddress, extractZpidFromUrl, buildCompCacheKey } from "./utils/normalize-address";
import { calculateDrawSchedule, calculateRehabLoanInterest, calculateBuyLoanInterest } from "@shared/calculations/loan-calculations";
import { appendFileSync } from "node:fs";
// @ts-ignore
import signature from "cookie-signature";
import { getUncachableStripeClient } from "./services/stripeClient";

// ── CRM contact type helper ─────────────────────────────────────────────────
function getCrmContactType(plan: string | null | undefined): string {
  switch (plan) {
    case 'monthly': return 'Paid-Monthly';
    case 'annual':  return 'Paid-Annual';
    case 'free':
    case 'comped':
    default:        return 'Free';
  }
}

// Cached portal configuration ID that disables the cancel button.
// Set STRIPE_PORTAL_NO_CANCEL_CONFIG_ID in env to avoid creating a new config
// on every cold start (preferred for production stability).
let _noCancelPortalConfigId: string | null = process.env.STRIPE_PORTAL_NO_CANCEL_CONFIG_ID || null;

// Returns the ID of a Stripe portal configuration with subscription cancellation
// disabled. Throws if the configuration cannot be obtained — callers must fail
// closed (do not create a default portal session without this config).
async function getOrCreateNoCancelPortalConfig(stripe: any): Promise<string> {
  if (_noCancelPortalConfigId) return _noCancelPortalConfigId;

  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your billing information',
    },
    features: {
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'address', 'phone', 'tax_id'],
      },
    },
  });
  _noCancelPortalConfigId = config.id;
  console.log(`[STRIPE] Created no-cancel portal configuration: ${config.id} — set STRIPE_PORTAL_NO_CANCEL_CONFIG_ID=${config.id} in env to reuse across restarts`);
  return config.id;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getSignedSessionToken(req: any): string {
  const secret = process.env.SESSION_SECRET!;
  return 's:' + signature.sign(req.sessionID, secret);
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

  // ─── Public Health Check ─────────────────────────────────────────────────────
  // No auth required — designed for external uptime monitors (UptimeRobot, etc.)
  // Returns 200 + { status: "ok" } when the property data pipeline is healthy.
  // Returns 503 + { status: "degraded", failedChecks: [...] } when fields are missing.
  //
  // Use ?force=true to bypass the property cache and hit the live Zillow API.
  // Recommended: hit without ?force every 5 min (fast/free), and with ?force once/day.
  app.get("/api/health/property-lookup", async (req, res) => {
    const force = req.query.force === "true";
    const started = Date.now();

    // Default (no ?force=true): key-presence check only — no API calls, no quota consumed.
    // Used by automated monitors (UptimeRobot etc.).
    // Pass ?force=true to run a full live end-to-end check for manual diagnostics.
    if (!force) {
      const hasDataKeyPresent = !!process.env.HASDATA_API_KEY;
      const status = hasDataKeyPresent ? "ok" : "error";
      return res.status(hasDataKeyPresent ? 200 : 503).json({
        status,
        mode: "key-check",
        checks: { hasdata_api_key: hasDataKeyPresent },
        message: hasDataKeyPresent
          ? "API key present. Use ?force=true for a full live check."
          : "HASDATA_API_KEY not configured.",
        elapsed_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    }

    // Full live check — only runs when ?force=true is explicitly passed.
    const TEST_URL = "https://www.zillow.com/homedetails/3127-Snapfinger-Ct-Decatur-GA-30034/14435242_zpid/";
    try {
      const data = await propertyAPIService.getPropertyByUrl(TEST_URL, true);

      if (!data) {
        return res.status(503).json({
          status: "error",
          mode: "live-check",
          message: "Property lookup returned no data",
          timestamp: new Date().toISOString(),
        });
      }

      const required: Record<string, boolean> = {
        address:          !!(data.address && data.address.length > 0),
        city:             !!(data.city && data.city.length > 0),
        state:            !!(data.state && data.state.length > 0),
        sqft:             !!(data.sqft && data.sqft > 0),
        bedrooms:         !!(data.bedrooms && data.bedrooms > 0),
        bathrooms:        !!(data.bathrooms && data.bathrooms > 0),
        propertyType:     !!(data.propertyType),
        annualTax:        !!(data.annualTax && data.annualTax > 0),
        annualTaxIsWhole: data.annualTax !== undefined ? Number.isInteger(data.annualTax) : true,
      };

      const informational: Record<string, boolean> = {
        yearBuilt:      !!(data.yearBuilt && data.yearBuilt > 0),
        estimatedValue: !!(data.estimatedValue && data.estimatedValue > 0),
        latitude:       !!(data.latitude),
        longitude:      !!(data.longitude),
      };

      const failedRequired = Object.entries(required).filter(([, v]) => v === false).map(([k]) => k);
      const missingInformational = Object.entries(informational).filter(([, v]) => v === false).map(([k]) => k);
      const status = failedRequired.length === 0 ? "ok" : "degraded";
      const elapsed = Date.now() - started;

      if (status === "degraded") {
        console.warn(`[HEALTH] Property data pipeline DEGRADED — failed required checks: ${failedRequired.join(", ")}`);
      }

      return res.status(status === "ok" ? 200 : 503).json({
        status,
        mode: "live-check",
        required,
        informational,
        failedChecks: failedRequired,
        missingInformational,
        elapsed_ms: elapsed,
        sample: { address: data.address, city: data.city, state: data.state, sqft: data.sqft, bedrooms: data.bedrooms, bathrooms: data.bathrooms, propertyType: data.propertyType, annualTax: data.annualTax },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[HEALTH] Property lookup health check failed:", err.message);
      return res.status(503).json({
        status: "error",
        mode: "live-check",
        message: err.message,
        elapsed_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    }
  });
  // ─── Comps distance pipeline health check ────────────────────────────────────
  // Default (no ?force=true): key-presence check only — no API calls, no quota consumed.
  // Used by automated monitors (UptimeRobot etc.).
  // Pass ?force=true to run a full live geocoding check for manual diagnostics.
  app.get("/api/health/comps", async (req, res) => {
    const force = req.query.force === "true";
    const started = Date.now();

    const rentCastKeyPresent = !!process.env.RENTCAST_API_KEY;
    const hasDataKeyPresent  = !!process.env.HASDATA_API_KEY;

    if (!force) {
      const allKeysPresent = rentCastKeyPresent && hasDataKeyPresent;
      return res.status(allKeysPresent ? 200 : 503).json({
        status: allKeysPresent ? "ok" : "error",
        mode: "key-check",
        checks: {
          rentcast_api_key: rentCastKeyPresent,
          hasdata_api_key:  hasDataKeyPresent,
        },
        message: allKeysPresent
          ? "API keys present. Use ?force=true for a full live geocoding check."
          : "One or more API keys not configured.",
        elapsed_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    }

    // Full live check — only runs when ?force=true is explicitly passed.
    if (!rentCastKeyPresent) {
      return res.status(503).json({
        status: "error",
        mode: "live-check",
        message: "RENTCAST_API_KEY not configured — geocoding unavailable",
        elapsed_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const TEST_ADDRESS = "3127 Snapfinger Ct";
      const TEST_CITY = "Decatur";
      const TEST_STATE = "GA";
      const TEST_ZIP = "30034";

      const { RentCastAPIService } = await import("./services/rentcast-api.service");
      const rentCast = new RentCastAPIService();
      const geoResult = await rentCast.getPropertyByAddress(TEST_ADDRESS, TEST_CITY, TEST_STATE, TEST_ZIP);

      const checks: Record<string, boolean> = {
        rentcast_api_key:    rentCastKeyPresent,
        hasdata_api_key:     hasDataKeyPresent,
        geocoding_succeeded: !!geoResult,
        latitude_returned:   !!(geoResult?.latitude != null),
        longitude_returned:  !!(geoResult?.longitude != null),
      };

      const failedChecks = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k);
      const status = failedChecks.length === 0 ? "ok" : "degraded";
      const elapsed = Date.now() - started;

      if (status === "degraded") {
        console.warn(`[HEALTH] Comps distance pipeline DEGRADED — failed: ${failedChecks.join(", ")}`);
      }

      return res.status(status === "ok" ? 200 : 503).json({
        status,
        mode: "live-check",
        checks,
        failedChecks,
        elapsed_ms: elapsed,
        sample: geoResult ? {
          address:   geoResult.address,
          city:      geoResult.city,
          state:     geoResult.state,
          latitude:  geoResult.latitude,
          longitude: geoResult.longitude,
        } : null,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[HEALTH] Comps distance health check failed:", err.message);
      return res.status(503).json({
        status: "error",
        mode: "live-check",
        message: err.message,
        elapsed_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────────

  // Authentication Routes - Using authService for centralized logic
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = await authService.registerUser(req.body);

      if (!result.success) {
        return res.status(400).json({ error: result.error || result.message });
      }

      // Trigger outbound webhooks and CAPI for user signup (fire and forget)
      if (result.user) {
        const fullName = (req.body.fullName || '').trim();
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const firstName = nameParts.length > 1 ? nameParts[0] : '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (nameParts[0] || '');

        const phone = (req.body.phone || '').trim();

        const subscriptionType = result.isComped ? 'comped' : 'free';

        // Fire Meta CAPI CompleteRegistration for free signups
        sendMetaCapiEvent(
          'CompleteRegistration',
          {
            email: result.user.email,
            firstName,
            lastName,
            clientIp: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '',
            clientUserAgent: req.headers['user-agent'] || '',
          },
          { contentName: 'free_signup' },
          req.body.metaEventId || undefined,
        ).catch(err => console.error('[CAPI] register error:', err));

        outboundWebhookService.triggerWebhooks('user_signup', {
          userId: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName,
          lastName,
          fullName,
          phone,
          companyName: (req.body.companyName || '').trim(),
          city: (req.body.city || '').trim(),
          state: (req.body.state || '').trim(),
          street: (req.body.street || '').trim(),
          zipCode: (req.body.zipCode || '').trim(),
          subscriptionType,
          subscriptionStatus: result.user.subscriptionStatus || 'free',
          isComped: result.isComped,
          createdAt: new Date().toISOString(),
          workflowTrigger: 'free_signup',
          previousPlan: null,
          currentPlan: 'free',
          contactType: getCrmContactType('free'),
          emailVerified: false,
          isNewSignup: true,
          isUpgrade: false,
          signupSource: req.body.signupSource || null,
          signupRef: req.body.signupRef || null,
        }).catch(err => console.error('[Webhook] user_signup trigger error:', err));
      }

      // For comp users, log them in automatically
      if (result.isComped && result.user) {
        const user = await authService.getUserById(result.user.id);
        if (user) {
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error('[Comp Login Error]', loginErr);
              return res.json({
                id: result.user!.id,
                username: result.user!.username,
                email: result.user!.email,
                message: "Registration successful! Your complimentary access is ready. Please log in.",
                requiresVerification: false,
                isComped: true,
                user: result.user,
              });
            }

            return res.json({
              _sessionToken: getSignedSessionToken(req),
              id: result.user!.id,
              username: result.user!.username,
              email: result.user!.email,
              message: result.message,
              requiresVerification: false,
              isComped: true,
              user: result.user,
            });
          });
          return;
        }
      }

      res.json({
        id: result.user?.id,
        username: result.user?.username,
        email: result.user?.email,
        message: result.message,
        requiresVerification: result.requiresVerification,
        isComped: result.isComped,
      });
    } catch (error: any) {
      console.error('[Registration Route Error]', error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("user-local", async (err: any, user: User | false, info: { message: string }) => {
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
        // Explicitly save session to ensure cookie is set before response
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[Login] Session save failed:', saveErr);
            return res.status(500).json({ error: "Login failed" });
          }
          res.json({
            _sessionToken: getSignedSessionToken(req),
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            referralCode: user.referralCode,
          });
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
      
      if (user.role !== 'admin' && user.role !== 'developer' && user.role !== 'auditor') {
        console.log('[Admin Login] Non-admin/developer/auditor user attempted login:', user.email, user.role);
        return res.status(403).json({ error: "Access denied. Admin, developer, or auditor privileges required." });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('[Admin Login] Session creation failed:', err);
          return res.status(500).json({ error: "Login failed" });
        }
        // Explicitly save session to ensure cookie is set before response
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[Admin Login] Session save failed:', saveErr);
            return res.status(500).json({ error: "Login failed" });
          }
          console.log('[Admin Login] Success for:', user.email, 'Session ID:', req.sessionID);
          console.log('[Admin Login] Cookie settings:', {
            sameSite: req.session.cookie.sameSite,
            secure: req.session.cookie.secure,
            httpOnly: req.session.cookie.httpOnly,
            domain: req.session.cookie.domain,
            path: req.session.cookie.path
          });
          res.json({
            _sessionToken: getSignedSessionToken(req),
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          });
        });
      });
    })(req, res, next);
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const sessionUser = req.user as any;
    if (sessionUser.userType === 'lender') {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // If session is a contractor-only session (no linked member), look up the member account
    if (sessionUser.userType === 'contractor') {
      const contractorEmail = sessionUser.email;
      if (contractorEmail) {
        const [linkedMember] = await db.select()
          .from(users)
          .where(sql`LOWER(${users.email}) = LOWER(${contractorEmail})`)
          .limit(1);
        if (linkedMember) {
          const [profile] = await db.select()
            .from(userProfiles)
            .where(eq(userProfiles.userId, linkedMember.id))
            .limit(1);
          return res.json({
            id: linkedMember.id,
            username: linkedMember.username,
            email: linkedMember.email,
            role: linkedMember.role,
            subscriptionStatus: linkedMember.subscriptionStatus,
            subscriptionPlan: linkedMember.subscriptionPlan,
            stripeSubscriptionId: linkedMember.stripeSubscriptionId,
            referralCode: linkedMember.referralCode,
            pendingPlan: linkedMember.pendingPlan,
            createdAt: linkedMember.createdAt,
            termsAcceptedAt: linkedMember.termsAcceptedAt,
            termsVersion: linkedMember.termsVersion,
            privacyVersion: linkedMember.privacyVersion,
            isContractor: true,
            profile: profile ? {
              fullName: profile.fullName || "",
              creditScoreRange: profile.creditScoreRange || "",
              state: profile.state || "",
              street: profile.street || "",
              city: profile.city || "",
              zipCode: profile.zipCode || "",
              phone: profile.phone || "",
            } : null,
          });
        }
      }
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as User;
    
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    let isContractor = false;
    if (user.email) {
      const [contractorMatch] = await db
        .select({ id: contractors.id })
        .from(contractors)
        .where(sql`LOWER(${contractors.email}) = LOWER(${user.email})`)
        .limit(1);
      isContractor = !!contractorMatch;
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      stripeSubscriptionId: user.stripeSubscriptionId,
      referralCode: user.referralCode,
      pendingPlan: user.pendingPlan,
      createdAt: user.createdAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion,
      reportLogoUrl: user.reportLogoUrl || null,
      reportCompanyName: user.reportCompanyName || null,
      isContractor,
      isEmailVerified: user.isEmailVerified ?? false,
      profile: userProfile ? {
        fullName: userProfile.fullName || "",
        creditScoreRange: userProfile.creditScoreRange || "",
        state: userProfile.state || "",
        street: userProfile.street || "",
        city: userProfile.city || "",
        zipCode: userProfile.zipCode || "",
        phone: userProfile.phone || "",
      } : null,
    });
  });

  // ─── User-facing resend verification email ───────────────────────────────────
  app.post("/api/auth/resend-verification", ensureAuthenticated, async (req, res) => {
    try {
      const sessionUser = req.user as User;
      const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.isEmailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }
      const verificationToken = crypto.randomBytes(32).toString('base64url');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.update(users)
        .set({ verificationToken, verificationExpiry })
        .where(eq(users.id, user.id));
      const [resendProfile] = await db.select({ fullName: userProfiles.fullName }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      const firstName = (resendProfile?.fullName || '').trim().split(/\s+/)[0] || user.username;
      const emailSent = await emailService.sendVerificationEmail(user.email, firstName, verificationToken);
      res.json({ message: emailSent ? "Verification email sent" : "Failed to send email", emailSent });
    } catch (error) {
      console.error('[Resend Verification] Error:', error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // ─── Report Branding (logo & company name for PDF reports) ───────────────────
  app.patch("/api/user/report-branding", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const currentUser = req.user as User;
    // Base64 for 2MB binary: 2 * 1024 * 1024 * (4/3) ≈ 2,796,203 chars + ~30 char data URL prefix
    const MAX_BASE64_LOGO_CHARS = 2_830_000;
    const schema = z.object({
      reportLogoUrl: z.string().nullable().optional()
        .refine(
          (val) => {
            if (!val) return true;
            // Allow HTTPS URLs only (no http:// to avoid mixed-content issues)
            if (val.startsWith('https://')) return true;
            // Allow PNG and JPG base64 data URLs only, with 2MB size enforcement
            if (val.startsWith('data:image/png;base64,') || val.startsWith('data:image/jpeg;base64,')) {
              return val.length <= MAX_BASE64_LOGO_CHARS;
            }
            return false;
          },
          { message: "Logo must be a valid HTTPS image URL or a PNG/JPG base64 data URL under 2MB" }
        ),
      reportCompanyName: z.string().max(100).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" });
    }
    const { reportLogoUrl, reportCompanyName } = parsed.data;
    const updates: Record<string, any> = {};
    if (reportLogoUrl !== undefined) updates.reportLogoUrl = reportLogoUrl || null;
    if (reportCompanyName !== undefined) updates.reportCompanyName = reportCompanyName || null;
    await db.update(users).set(updates).where(eq(users.id, currentUser.id));
    res.json({ success: true });
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

  // Update user home address (for transactional funding form pre-fill)
  app.patch("/api/user/profile/address", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const currentUser = req.user as User;
    const { street, city, state, zipCode, phone } = req.body;
    
    // Basic validation - at least one field should be provided
    if (!street && !city && !state && !zipCode && !phone) {
      return res.status(400).json({ error: "At least one address field is required" });
    }
    
    try {
      const [existingProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, currentUser.id))
        .limit(1);
        
      if (existingProfile) {
        await db
          .update(userProfiles)
          .set({ 
            street: street !== undefined ? (street || null) : existingProfile.street,
            city: city !== undefined ? (city || null) : existingProfile.city,
            state: state !== undefined ? (state || null) : existingProfile.state,
            zipCode: zipCode !== undefined ? (zipCode || null) : existingProfile.zipCode,
            phone: phone !== undefined ? (phone || null) : existingProfile.phone,
            updatedAt: new Date()
          })
          .where(eq(userProfiles.userId, currentUser.id));
      } else {
        // Create a new profile with the address, using username as fallback for fullName
        await db.insert(userProfiles).values({
          userId: currentUser.id,
          fullName: currentUser.username || "User",
          street: street || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
          phone: phone || null,
        });
      }
      
      res.json({ message: "Address updated successfully" });
    } catch (error) {
      console.error('Address update error:', error);
      res.status(500).json({ error: "Failed to update address" });
    }
  });

  // Get investor information from user profile (for auto-fill in deal analysis)
  app.get("/api/profile/investor-info", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as User;
    
    try {
      const [profile] = await db
        .select({
          isNewInvestor: userProfiles.isNewInvestor,
          projectsLast12Months: userProfiles.projectsLast12Months,
          projectsLast36Months: userProfiles.projectsLast36Months,
          investorCreditScore: userProfiles.investorCreditScore,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);
      
      if (!profile) {
        return res.json({ 
          hasSavedInfo: false,
          investorInfo: null 
        });
      }
      
      // Check if any investor info fields are populated
      const hasSavedInfo = profile.isNewInvestor !== null || 
                          profile.investorCreditScore !== null ||
                          profile.projectsLast12Months !== null ||
                          profile.projectsLast36Months !== null;
      
      res.json({
        hasSavedInfo,
        investorInfo: hasSavedInfo ? {
          isNewInvestor: profile.isNewInvestor,
          projectsLast12Months: profile.projectsLast12Months,
          projectsLast36Months: profile.projectsLast36Months,
          creditScore: profile.investorCreditScore,
        } : null
      });
    } catch (error) {
      console.error('Get investor info error:', error);
      res.status(500).json({ error: "Failed to get investor information" });
    }
  });

  // Save investor information to user profile (subscribers only)
  app.put("/api/profile/investor-info", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as User;
    
    // Check if user is a subscriber (active or in cancelling grace period)
    if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'cancelling') {
      return res.status(403).json({ error: "Active subscription required to save investor information" });
    }
    
    const { isNewInvestor, projectsLast12Months, projectsLast36Months, creditScore } = req.body;
    
    try {
      const [existingProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);
      
      const investorData = {
        isNewInvestor: isNewInvestor ?? null,
        projectsLast12Months: projectsLast12Months ?? null,
        projectsLast36Months: projectsLast36Months ?? null,
        investorCreditScore: creditScore ?? null,
        updatedAt: new Date(),
      };
      
      if (existingProfile) {
        await db
          .update(userProfiles)
          .set(investorData)
          .where(eq(userProfiles.userId, user.id));
      } else {
        await db.insert(userProfiles).values({
          userId: user.id,
          fullName: user.username || "",
          ...investorData,
        });
      }
      
      res.json({ message: "Investor information saved successfully" });
    } catch (error) {
      console.error('Save investor info error:', error);
      res.status(500).json({ error: "Failed to save investor information" });
    }
  });

  // Get wholesale fee preference from user profile
  app.get("/api/profile/wholesale-fee", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as User;
    
    try {
      const [profile] = await db
        .select({
          defaultWholesaleFee: userProfiles.defaultWholesaleFee,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);
      
      res.json({
        hasSavedFee: profile?.defaultWholesaleFee != null,
        defaultWholesaleFee: profile?.defaultWholesaleFee ?? null,
      });
    } catch (error) {
      console.error('Get wholesale fee error:', error);
      res.status(500).json({ error: "Failed to get wholesale fee preference" });
    }
  });

  // Save wholesale fee preference to user profile
  app.put("/api/profile/wholesale-fee", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as User;
    const { defaultWholesaleFee } = req.body;
    
    // Validate the wholesale fee is a positive number
    if (defaultWholesaleFee !== null && (typeof defaultWholesaleFee !== 'number' || defaultWholesaleFee < 0)) {
      return res.status(400).json({ error: "Invalid wholesale fee value" });
    }
    
    try {
      const [existingProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);
      
      if (existingProfile) {
        await db
          .update(userProfiles)
          .set({ 
            defaultWholesaleFee: defaultWholesaleFee,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, user.id));
      } else {
        await db.insert(userProfiles).values({
          userId: user.id,
          fullName: user.username || "",
          defaultWholesaleFee: defaultWholesaleFee,
        });
      }
      
      res.json({ message: "Wholesale fee preference saved successfully" });
    } catch (error) {
      console.error('Save wholesale fee error:', error);
      res.status(500).json({ error: "Failed to save wholesale fee preference" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      // Fully destroy the session to ensure complete logout
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        // Clear the session cookie
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
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

  // Check all integrations status (admin and developer)
  app.get("/api/admin/integrations/status", ensureAdminOrDeveloper, async (req, res) => {
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
  // Developer Integration Portal Routes
  // ============================================

  // Get all CRM integration configs
  app.get("/api/integrations/configs", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const configs = await storage.getAllIntegrationConfigs();
      // Don't expose full credentials in list view
      const safeConfigs = configs.map(c => ({
        ...c,
        credentials: c.credentials ? { configured: true } : null
      }));
      res.json(safeConfigs);
    } catch (error) {
      console.error('Get integration configs error:', error);
      res.status(500).json({ error: "Failed to get integration configs" });
    }
  });

  // Get single integration config
  app.get("/api/integrations/configs/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const config = await storage.getIntegrationConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ error: "Integration config not found" });
      }
      // Don't expose sensitive credential values
      res.json({
        ...config,
        credentials: config.credentials ? { configured: true } : null
      });
    } catch (error) {
      console.error('Get integration config error:', error);
      res.status(500).json({ error: "Failed to get integration config" });
    }
  });

  // Create new integration config
  app.post("/api/integrations/configs", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { provider, name, credentials, settings } = req.body;
      const userId = (req.user as User).id;
      
      // Validate required fields
      if (!provider || !name) {
        return res.status(400).json({ error: "Provider and name are required" });
      }
      
      const config = await storage.createIntegrationConfig({
        provider,
        name,
        credentials,
        settings,
        createdBy: userId,
        isActive: false
      });
      
      // Never expose credentials in response
      res.json({
        ...config,
        credentials: config.credentials ? { configured: true } : null
      });
    } catch (error) {
      console.error('Create integration config error:', error);
      res.status(500).json({ error: "Failed to create integration config" });
    }
  });

  // Update integration config
  app.patch("/api/integrations/configs/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { name, credentials, settings, isActive } = req.body;
      const updated = await storage.updateIntegrationConfig(req.params.id, {
        name,
        credentials,
        settings,
        isActive
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Integration config not found" });
      }
      
      res.json({
        ...updated,
        credentials: updated.credentials ? { configured: true } : null
      });
    } catch (error) {
      console.error('Update integration config error:', error);
      res.status(500).json({ error: "Failed to update integration config" });
    }
  });

  // Delete integration config
  app.delete("/api/integrations/configs/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      await storage.deleteIntegrationConfig(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete integration config error:', error);
      res.status(500).json({ error: "Failed to delete integration config" });
    }
  });

  // Event Triggers
  app.get("/api/integrations/configs/:id/triggers", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const triggers = await storage.getIntegrationEventTriggers(req.params.id);
      res.json(triggers);
    } catch (error) {
      console.error('Get event triggers error:', error);
      res.status(500).json({ error: "Failed to get event triggers" });
    }
  });

  app.post("/api/integrations/configs/:id/triggers", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { eventType, targetModule, settings } = req.body;
      const trigger = await storage.createIntegrationEventTrigger({
        integrationId: req.params.id,
        eventType,
        targetModule,
        settings,
        isEnabled: true
      });
      res.json(trigger);
    } catch (error) {
      console.error('Create event trigger error:', error);
      res.status(500).json({ error: "Failed to create event trigger" });
    }
  });

  app.patch("/api/integrations/triggers/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { isEnabled, targetModule, settings } = req.body;
      const updated = await storage.updateIntegrationEventTrigger(req.params.id, {
        isEnabled,
        targetModule,
        settings
      });
      res.json(updated);
    } catch (error) {
      console.error('Update event trigger error:', error);
      res.status(500).json({ error: "Failed to update event trigger" });
    }
  });

  app.delete("/api/integrations/triggers/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      await storage.deleteIntegrationEventTrigger(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete event trigger error:', error);
      res.status(500).json({ error: "Failed to delete event trigger" });
    }
  });

  // Field Mappings
  app.get("/api/integrations/configs/:id/mappings", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const eventType = req.query.eventType as string | undefined;
      const mappings = await storage.getIntegrationFieldMappings(req.params.id, eventType);
      res.json(mappings);
    } catch (error) {
      console.error('Get field mappings error:', error);
      res.status(500).json({ error: "Failed to get field mappings" });
    }
  });

  app.post("/api/integrations/configs/:id/mappings", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { eventType, sourceField, targetField, transformType, isRequired } = req.body;
      const mapping = await storage.createIntegrationFieldMapping({
        integrationId: req.params.id,
        eventType,
        sourceField,
        targetField,
        transformType,
        isRequired
      });
      res.json(mapping);
    } catch (error) {
      console.error('Create field mapping error:', error);
      res.status(500).json({ error: "Failed to create field mapping" });
    }
  });

  app.patch("/api/integrations/mappings/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { sourceField, targetField, transformType, isRequired } = req.body;
      const updated = await storage.updateIntegrationFieldMapping(req.params.id, {
        sourceField,
        targetField,
        transformType,
        isRequired
      });
      res.json(updated);
    } catch (error) {
      console.error('Update field mapping error:', error);
      res.status(500).json({ error: "Failed to update field mapping" });
    }
  });

  app.delete("/api/integrations/mappings/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      await storage.deleteIntegrationFieldMapping(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete field mapping error:', error);
      res.status(500).json({ error: "Failed to delete field mapping" });
    }
  });

  // Bulk upload field mappings from CSV/JSON
  app.post("/api/integrations/configs/:id/mappings/bulk", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { mappings } = req.body;
      
      if (!Array.isArray(mappings) || mappings.length === 0) {
        return res.status(400).json({ error: "Mappings array is required and must not be empty" });
      }

      const results = {
        created: 0,
        errors: [] as string[]
      };

      for (const mapping of mappings) {
        try {
          const { eventType, sourceField, targetField, transformType, isRequired } = mapping;
          
          if (!eventType || !sourceField || !targetField) {
            results.errors.push(`Missing required field for mapping: eventType=${eventType}, sourceField=${sourceField}, targetField=${targetField}`);
            continue;
          }

          await storage.createIntegrationFieldMapping({
            integrationId: req.params.id,
            eventType,
            sourceField,
            targetField,
            transformType: transformType || null,
            isRequired: isRequired === true || isRequired === 'true'
          });
          results.created++;
        } catch (err) {
          results.errors.push(`Failed to create mapping for ${mapping.sourceField} -> ${mapping.targetField}: ${err}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Bulk create field mappings error:', error);
      res.status(500).json({ error: "Failed to bulk create field mappings" });
    }
  });

  // Webhooks
  app.get("/api/integrations/webhooks", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const integrationId = req.query.integrationId as string | undefined;
      const webhooks = await storage.getIntegrationWebhooks(integrationId);
      res.json(webhooks);
    } catch (error) {
      console.error('Get webhooks error:', error);
      res.status(500).json({ error: "Failed to get webhooks" });
    }
  });

  app.post("/api/integrations/webhooks", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { integrationId, name, allowedActions } = req.body;
      const webhook = await storage.createIntegrationWebhook({
        integrationId,
        name,
        allowedActions,
        isActive: true
      });
      res.json(webhook);
    } catch (error) {
      console.error('Create webhook error:', error);
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.patch("/api/integrations/webhooks/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { name, isActive, allowedActions } = req.body;
      const updated = await storage.updateIntegrationWebhook(req.params.id, {
        name,
        isActive,
        allowedActions
      });
      res.json(updated);
    } catch (error) {
      console.error('Update webhook error:', error);
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  app.delete("/api/integrations/webhooks/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      await storage.deleteIntegrationWebhook(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete webhook error:', error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // Outbound Webhooks
  app.get("/api/integrations/outbound-webhooks", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const integrationId = req.query.integrationId as string | undefined;
      const webhooks = await storage.getOutboundWebhooks(integrationId);
      res.json(webhooks);
    } catch (error) {
      console.error('Get outbound webhooks error:', error);
      res.status(500).json({ error: "Failed to fetch outbound webhooks" });
    }
  });

  app.post("/api/integrations/outbound-webhooks", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const webhook = await storage.createOutboundWebhook({
        ...req.body,
        createdBy: (req.user as User).id
      });
      res.json(webhook);
    } catch (error) {
      console.error('Create outbound webhook error:', error);
      res.status(500).json({ error: "Failed to create outbound webhook" });
    }
  });

  app.patch("/api/integrations/outbound-webhooks/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const updated = await storage.updateOutboundWebhook(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Update outbound webhook error:', error);
      res.status(500).json({ error: "Failed to update outbound webhook" });
    }
  });

  app.delete("/api/integrations/outbound-webhooks/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      await storage.deleteOutboundWebhook(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete outbound webhook error:', error);
      res.status(500).json({ error: "Failed to delete outbound webhook" });
    }
  });

  // Test outbound webhook - sends a test payload
  app.post("/api/integrations/outbound-webhooks/:id/test", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const webhook = await storage.getOutboundWebhook(req.params.id);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      const testPayload = req.body.testData || {
        event: 'test_event',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from RE Data Metrix',
          source: 'developer_portal'
        }
      };

      // Send test request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(webhook.headers as Record<string, string> || {})
      };

      const response = await fetch(webhook.targetUrl, {
        method: webhook.httpMethod,
        headers,
        body: JSON.stringify(testPayload)
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      // Record result
      await storage.recordOutboundWebhookResult(webhook.id, response.ok);

      // Log the sync
      await storage.createIntegrationSyncLog({
        integrationId: webhook.integrationId,
        eventType: 'test_event',
        status: response.ok ? 'success' : 'failed',
        direction: 'outbound',
        requestData: testPayload,
        responseData: { status: response.status, body: responseData },
        errorMessage: response.ok ? null : `HTTP ${response.status}`
      });

      res.json({
        success: response.ok,
        status: response.status,
        response: responseData
      });
    } catch (error) {
      console.error('Test outbound webhook error:', error);
      res.status(500).json({ error: "Failed to test webhook", details: String(error) });
    }
  });

  // Inbound webhook endpoint (public - authenticated via secret token)
  app.post("/api/webhooks/inbound/:endpoint", async (req, res) => {
    try {
      const { endpoint } = req.params;
      const authHeader = req.headers.authorization;
      
      const webhook = await storage.getIntegrationWebhookByEndpoint(endpoint);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      
      if (!webhook.isActive) {
        return res.status(403).json({ error: "Webhook is disabled" });
      }
      
      // Validate secret token
      const providedToken = authHeader?.replace('Bearer ', '');
      if (providedToken !== webhook.secretToken) {
        return res.status(401).json({ error: "Invalid authentication" });
      }
      
      // Record the call
      await storage.recordWebhookCall(endpoint);
      
      // Log the incoming request
      await storage.createIntegrationSyncLog({
        integrationId: webhook.integrationId,
        eventType: 'inbound_webhook',
        status: 'success',
        direction: 'inbound',
        requestData: req.body,
        responseData: { received: true }
      });
      
      // TODO: Process the webhook payload based on allowedActions
      
      res.json({ success: true, message: "Webhook received" });
    } catch (error) {
      console.error('Inbound webhook error:', error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Sync Logs
  app.get("/api/integrations/sync-logs", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { integrationId, eventType, status, limit } = req.query;
      const logs = await storage.getIntegrationSyncLogs({
        integrationId: integrationId as string,
        eventType: eventType as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(logs);
    } catch (error) {
      console.error('Get sync logs error:', error);
      res.status(500).json({ error: "Failed to get sync logs" });
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
        .filter(price => price.recurring && (price.product as any)?.active !== false && (price.metadata?.plan_type || (price.product as any)?.metadata?.plan_type))
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
    companyName: z.string().optional().nullable(),
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
          companyName: validatedData.companyName || null,
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
        phone_number_collection: { enabled: true },
        billing_address_collection: 'required',
        success_url: `${baseUrl}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout?canceled=true`,
        metadata: {
          pendingRegistrationId: pending.id,
          ...(req.body.metaEventId && { meta_event_id: req.body.metaEventId }),
        },
      };

      // Apply discount if provided
      if (validatedData.discountCode) {
        const normalizedCode = validatedData.discountCode.toUpperCase();
        const discount = await storage.getDiscountCodeByCode(normalizedCode);
        
        if (discount) {
          if (discount.stripeCouponId) {
            sessionParams.discounts = [{ coupon: discount.stripeCouponId }];
            console.log(`[CHECKOUT/START] Discount code ${normalizedCode} applied with Stripe coupon ${discount.stripeCouponId}`);
          } else {
            // Discount code exists but no Stripe coupon - return error
            console.warn(`[CHECKOUT/START] Discount code ${normalizedCode} has no Stripe coupon ID configured`);
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
      if (error.type === 'StripeInvalidRequestError' && error.message?.includes('product is not active')) {
        return res.status(400).json({ error: "This subscription plan is temporarily unavailable. Please try again later or contact support." });
      }
      res.status(500).json({ error: "Failed to start checkout" });
    }
  });

  // Handle 100% discount checkout - bypass Stripe entirely
  app.post("/api/subscription/checkout/free-with-discount", async (req, res) => {
    try {
      const { username, email, password, fullName, companyName: reqCompanyName, discountCode, selectedPlan, codeType, promoCodeId, phone: reqPhone, street: reqStreet, city: reqCity, state: reqState, zipCode: reqZipCode } = req.body;

      if (!username || !email || !password || !fullName || !discountCode || !selectedPlan) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (!reqPhone || String(reqPhone).trim().length < 7) {
        return res.status(400).json({ error: "A valid phone number is required" });
      }

      const normalizedCode = discountCode.toUpperCase();
      let subscriptionEndDate = new Date();
      let codeId: string;
      let isPromoCode = codeType === 'promo';

      // Check if email is already in use
      const existingEmail = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);

      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }

      // Check if username is already in use
      const existingUsername = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.username}) = LOWER(${username})`)
        .limit(1);

      if (existingUsername.length > 0) {
        return res.status(400).json({ error: "Username already taken" });
      }

      let discountDuration: string | null = null;
      let discountDurationMonths: number | null = null;
      let discountPartnerName: string | null = null;

      if (isPromoCode || promoCodeId) {
        // Handle promo code (from promo_codes table)
        const promoCode = await storage.getPromoCodeByCode(normalizedCode);
        
        if (!promoCode) {
          return res.status(400).json({ error: "Invalid promo code" });
        }

        if (!promoCode.isActive) {
          return res.status(400).json({ error: "This promo code is no longer active" });
        }

        const now = new Date();
        if (promoCode.startsAt && now < promoCode.startsAt) {
          return res.status(400).json({ error: "This promo code is not yet active" });
        }
        if (promoCode.expiresAt && now > promoCode.expiresAt) {
          return res.status(400).json({ error: "This promo code has expired" });
        }

        if (promoCode.maxRedemptions && promoCode.currentRedemptions >= promoCode.maxRedemptions) {
          return res.status(400).json({ error: "This promo code has reached its maximum uses" });
        }

        // Promo codes give free access for durationMonths
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + promoCode.durationMonths);
        codeId = promoCode.id;
        isPromoCode = true;
        discountDuration = 'repeating';
        discountDurationMonths = promoCode.durationMonths ?? null;
        discountPartnerName = promoCode.name ?? null;
      } else {
        // Handle regular discount code (from discount_codes table)
        const discount = await storage.getDiscountCodeByCode(normalizedCode);
        
        if (!discount) {
          return res.status(400).json({ error: "Invalid discount code" });
        }

        // Verify it's a 100% discount
        if (Number(discount.percentOff) !== 100) {
          return res.status(400).json({ error: "This endpoint is only for 100% discount codes" });
        }

        if (!discount.isActive) {
          return res.status(400).json({ error: "This discount code is no longer active" });
        }

        const now = new Date();
        if (discount.startAt && now < discount.startAt) {
          return res.status(400).json({ error: "This discount code is not yet active" });
        }
        if (discount.endAt && now > discount.endAt) {
          return res.status(400).json({ error: "This discount code has expired" });
        }

        if (discount.maxRedemptions && discount.currentRedemptions >= discount.maxRedemptions) {
          return res.status(400).json({ error: "This discount code has reached its maximum uses" });
        }

        // Calculate subscription end date based on selected plan
        if (selectedPlan === 'annual') {
          subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        } else {
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        }
        codeId = discount.id;
        discountDuration = discount.stripeDuration ?? null;
        discountDurationMonths = discount.stripeDurationInMonths ?? null;
        discountPartnerName = discount.partnerName ?? discount.displayName ?? null;
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create the user with premium access
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email,
          password: passwordHash,
          role: 'user',
          subscriptionStatus: 'active',
          subscriptionPlan: selectedPlan,
          isEmailVerified: false,
        })
        .returning();

      await storage.insertSubscriptionEvent({
        userId: newUser.id,
        eventType: selectedPlan === 'annual' ? 'new_annual' : 'new_monthly',
        previousPlan: null,
        currentPlan: selectedPlan,
        previousStatus: null,
        currentStatus: 'active',
        triggeredBy: 'discount_code',
      }).catch(err => console.error('[SubEvent] discount-code signup insert error:', err));

      // Create user profile
      await db.insert(userProfiles).values({
        userId: newUser.id,
        fullName: fullName.trim(),
        companyName: (reqCompanyName || '').trim() || null,
        phone: (reqPhone || '').trim() || null,
        street: (reqStreet || '').trim() || null,
        city: (reqCity || '').trim() || null,
        state: (reqState || '').trim() || null,
        zipCode: (reqZipCode || '').trim() || null,
      });

      // Increment redemption count based on code type
      if (isPromoCode) {
        await db
          .update(promoCodes)
          .set({ 
            currentRedemptions: sql`${promoCodes.currentRedemptions} + 1`
          })
          .where(eq(promoCodes.id, codeId));
        
        // Also create a promo redemption record
        await db
          .insert(promoRedemptions)
          .values({
            promoCodeId: codeId,
            userId: newUser.id,
            activatedAt: new Date(),
            expiresAt: subscriptionEndDate,
            status: 'active',
          });
        
        console.log(`[FREE-CHECKOUT] User ${newUser.id} created with promo code ${normalizedCode} (${(subscriptionEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)} months free)`);
      } else {
        await db
          .update(discountCodes)
          .set({ 
            currentRedemptions: sql`${discountCodes.currentRedemptions} + 1`
          })
          .where(eq(discountCodes.id, codeId));
        
        console.log(`[FREE-CHECKOUT] User ${newUser.id} created with 100% discount code ${normalizedCode}`);
      }

      // Trigger webhooks for discount code signup (fire and forget) - do this before any early returns
      const nameParts = fullName.trim().split(/\s+/);
      const firstNamePart = nameParts[0] || '';
      const lastNamePart = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const discountWebhookPayload = {
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username,
        firstName: firstNamePart,
        lastName: lastNamePart,
        fullName: fullName.trim(),
        phone: (reqPhone || '').trim(),
        companyName: (reqCompanyName || '').trim(),
        subscriptionType: selectedPlan,
        subscriptionStatus: 'active',
        stripeCustomerId: '',
        stripeSubscriptionId: '',
        isComped: false,
        createdAt: new Date().toISOString(),
        workflowTrigger: selectedPlan === 'annual' ? 'annual_signup' : 'monthly_signup',
        previousPlan: null,
        currentPlan: selectedPlan,
        contactType: getCrmContactType(selectedPlan),
        emailVerified: true,
        discountCode: normalizedCode,
        isPromoCode: isPromoCode,
        accessExpiryDate: subscriptionEndDate ? subscriptionEndDate.toISOString() : null,
        discountDuration: discountDuration,
        discountDurationMonths: discountDurationMonths,
        discountPartnerName: discountPartnerName,
        isNewSignup: true,
        isUpgrade: false,
        isDowngrade: false,
      };

      outboundWebhookService.triggerWebhooks('user_signup', discountWebhookPayload)
        .catch(err => console.error('[Webhook] user_signup trigger error (discount signup):', err));

      outboundWebhookService.triggerWebhooks('subscription_completed', discountWebhookPayload)
        .catch(err => console.error('[Webhook] subscription_completed trigger error (discount signup):', err));

      // Fire Meta CAPI events for discount-code paid signup
      const discountCapiUserData = {
        email: newUser.email,
        firstName: firstNamePart,
        lastName: lastNamePart,
        clientIp: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '',
        clientUserAgent: req.headers['user-agent'] || '',
      };
      const discountPlanValue = selectedPlan === 'annual' ? 250 : 25;
      sendMetaCapiEvent('CompleteRegistration', discountCapiUserData, { contentName: 'paid_signup' })
        .catch(err => console.error('[CAPI] CompleteRegistration (discount) error:', err));
      sendMetaCapiEvent('Subscribe', discountCapiUserData, { value: discountPlanValue, currency: 'USD', contentName: selectedPlan })
        .catch(err => console.error('[CAPI] Subscribe (discount) error:', err));

      // Check if email verification is required
      if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
        const verificationToken = crypto.randomBytes(32).toString('base64url');
        const verificationExpiry = new Date();
        verificationExpiry.setHours(verificationExpiry.getHours() + 24);

        await db
          .update(users)
          .set({ verificationToken, verificationExpiry })
          .where(eq(users.id, newUser.id));

        await emailService.sendVerificationEmail(email, firstNamePart || username, verificationToken);

        return res.json({
          success: true,
          requiresVerification: true,
          message: "Account created! Please check your email to verify your account.",
        });
      }

      // No verification required - log in the user via passport
      const userForSession = { 
        id: newUser.id, 
        role: newUser.role,
        userType: 'user'
      };
      
      req.login(userForSession as any, (err) => {
        if (err) {
          console.error('[FREE-CHECKOUT] Login error:', err);
          return res.status(500).json({ error: "Failed to log in after registration" });
        }
        
        console.log('[FREE-CHECKOUT] User logged in successfully:', newUser.id);
        
        res.json({
          _sessionToken: getSignedSessionToken(req),
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            subscriptionStatus: newUser.subscriptionStatus,
          },
        });
      });
    } catch (error: any) {
      console.error('Free checkout with discount error:', error);
      res.status(500).json({ error: "Failed to complete registration" });
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
        // Retrieve Stripe session first so we have metaEventId and plan for both webhooks and CAPI
        const stripe = await getUncachableStripeClient();
        let metaEventId: string | undefined;
        let plan: string | undefined;
        let value: number | undefined;
        let subscriptionId: string | undefined;
        try {
          const stripeSession = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['subscription'],
          });
          metaEventId = stripeSession.metadata?.meta_event_id || undefined;
          const subscription = stripeSession.subscription as any;
          if (subscription) {
            const priceInterval = subscription.items?.data?.[0]?.price?.recurring?.interval;
            plan = priceInterval === 'year' ? 'annual' : 'monthly';
            value = plan === 'annual' ? 250 : 25;
            subscriptionId = subscription.id;
          }
        } catch (_) {}

        // Trigger webhooks and CAPI for paid signup (fire and forget) if this is a new user (not already processed)
        if (result.userId && !result.alreadyProcessed) {
          try {
            const [completedUser] = await db.select().from(users).where(eq(users.id, result.userId)).limit(1);
            if (completedUser) {
              const [completedProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, completedUser.id)).limit(1);
              const completedFullName = (completedProfile?.fullName || '').trim();
              const completedNameParts = completedFullName.split(/\s+/);
              const completedFirstName = completedNameParts[0] || '';
              const completedLastName = completedNameParts.length > 1 ? completedNameParts.slice(1).join(' ') : '';

              const completedPlan = completedUser.subscriptionPlan || 'monthly';
              const completedWebhookPayload = {
                userId: completedUser.id,
                email: completedUser.email,
                username: completedUser.username,
                firstName: completedFirstName,
                lastName: completedLastName,
                fullName: completedFullName,
                phone: completedProfile?.phone || '',
                companyName: completedProfile?.companyName || '',
                subscriptionType: completedPlan,
                subscriptionStatus: completedUser.subscriptionStatus || 'active',
                stripeCustomerId: completedUser.stripeCustomerId || '',
                stripeSubscriptionId: completedUser.stripeSubscriptionId || '',
                isComped: false,
                createdAt: new Date().toISOString(),
                workflowTrigger: completedPlan === 'annual' ? 'annual_signup' : 'monthly_signup',
                previousPlan: null,
                currentPlan: completedPlan,
                contactType: getCrmContactType(completedPlan),
                emailVerified: true,
                isNewSignup: true,
                isUpgrade: false,
                isDowngrade: false,
              };

              outboundWebhookService.triggerWebhooks('user_signup', completedWebhookPayload)
                .catch(err => console.error('[Webhook] user_signup trigger error (paid signup complete):', err));

              outboundWebhookService.triggerWebhooks('subscription_completed', completedWebhookPayload)
                .catch(err => console.error('[Webhook] subscription_completed trigger error (paid signup complete):', err));

              const capiClientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
              const capiUserAgent = req.headers['user-agent'] || '';
              const capiUserData = {
                email: completedUser.email,
                firstName: completedFirstName,
                lastName: completedLastName,
                clientIp: capiClientIp,
                clientUserAgent: capiUserAgent,
              };

              // CompleteRegistration (deduplicates with browser pixel via shared metaEventId)
              sendMetaCapiEvent('CompleteRegistration', capiUserData, { contentName: 'paid_signup' }, metaEventId)
                .catch(err => console.error('[CAPI] CompleteRegistration (paid) error:', err));

              // Subscribe event
              sendMetaCapiEvent('Subscribe', capiUserData, { value: value ?? 25, currency: 'USD', contentName: completedPlan })
                .catch(err => console.error('[CAPI] Subscribe error:', err));
            }
          } catch (webhookErr) {
            console.error('[Webhook/CAPI] Error preparing paid signup events:', webhookErr);
          }
        }

        res.json({ ...result, metaEventId, plan, value, subscriptionId });
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

      // Check if user already has an active PAID subscription (has Stripe subscription OR is comped/trial)
      // Free users with 'active' status but no stripeSubscriptionId should be allowed to upgrade
      const hasPaidSubscription = user.stripeSubscriptionId || ['comped', 'referral_trial'].includes(user.subscriptionStatus);
      if (hasPaidSubscription) {
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
        phone_number_collection: { enabled: true },
        billing_address_collection: 'required',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout?canceled=true`,
        metadata: {
          userId: user.id,
          ...(req.body.metaEventId && { meta_event_id: req.body.metaEventId }),
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

  // Validate discount code (uses database-stored codes AND promo codes)
  app.post("/api/subscription/validate-discount", async (req, res) => {
    try {
      const { code, plan } = req.body;

      if (!code) {
        return res.status(400).json({ valid: false, message: "Discount code is required" });
      }

      const upperCode = code.toUpperCase();
      
      // First, look up in the discount_codes table
      const discount = await storage.getDiscountCodeByCode(upperCode);
      
      if (discount) {
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
          codeType: 'discount',
          percentOff: discount.percentOff ? Number(discount.percentOff) : undefined,
          amountOff: discount.amountOff ? Number(discount.amountOff) : undefined,
          message,
        });
      }
      
      // Not found in discount_codes, try promo_codes table
      const promoCode = await storage.getPromoCodeByCode(upperCode);
      
      if (promoCode) {
        // Check if the promo code is active
        if (!promoCode.isActive) {
          return res.json({
            valid: false,
            message: "This promo code is no longer active.",
          });
        }
        
        // Check date validity
        const now = new Date();
        if (promoCode.startsAt && now < promoCode.startsAt) {
          return res.json({
            valid: false,
            message: "This promo code is not yet active.",
          });
        }
        if (promoCode.expiresAt && now > promoCode.expiresAt) {
          return res.json({
            valid: false,
            message: "This promo code has expired.",
          });
        }
        
        // Check redemption limit
        if (promoCode.maxRedemptions && promoCode.currentRedemptions >= promoCode.maxRedemptions) {
          return res.json({
            valid: false,
            message: "This promo code has reached its maximum number of uses.",
          });
        }
        
        // Promo codes give 100% off (free access for durationMonths)
        const message = `${promoCode.name} - ${promoCode.durationMonths} months free access!`;

        return res.json({
          valid: true,
          promoCodeId: promoCode.id,
          codeType: 'promo',
          percentOff: 100, // Promo codes are always 100% off
          durationMonths: promoCode.durationMonths,
          message,
        });
      }
      
      // Not found in either table
      return res.json({
        valid: false,
        message: "Invalid discount code. Please check and try again.",
      });
    } catch (error) {
      console.error('Discount validation error:', error);
      res.status(500).json({ valid: false, message: "Unable to validate discount code" });
    }
  });

  app.post("/api/subscription/cancel", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'cancelling') {
        return res.status(400).json({ 
          error: "No active subscription to cancel" 
        });
      }

      if (user.subscriptionStatus === 'cancelling') {
        return res.status(400).json({
          error: "Your subscription is already scheduled for cancellation at the end of your billing period.",
        });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ 
          error: "No Stripe subscription found" 
        });
      }

      const { choice } = req.body as { choice?: 'downgrade' | 'cancel' };
      if (!choice || (choice !== 'downgrade' && choice !== 'cancel')) {
        return res.status(400).json({ error: "Invalid choice. Must be 'downgrade' or 'cancel'." });
      }

      const stripe = await getUncachableStripeClient();

      // Cancel at end of billing period — capture result for cancelAt timestamp
      const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      console.log(`[STRIPE] Subscription ${user.stripeSubscriptionId} set to cancel at period end (choice: ${choice})`);

      const now = new Date();
      const previousPlan = user.subscriptionPlan || 'monthly';
      const cancelAt = updatedSubscription.cancel_at
        ? new Date(updatedSubscription.cancel_at * 1000).toISOString()
        : null;

      // Fetch profile once for both branches
      const [cancelProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      const cancelFullName = (cancelProfile?.fullName || '').trim();
      const cancelNameParts = cancelFullName.split(/\s+/);
      const cancelFirstName = cancelNameParts[0] || user.username;
      const cancelLastName = cancelNameParts.length > 1 ? cancelNameParts.slice(1).join(' ') : '';

      if (choice === 'downgrade') {
        // Downgrade to free at period end: keep access (status='cancelling') until Stripe
        // fires customer.subscription.deleted. The webhook reads pendingCancellationChoice
        // to know it should set status='free' without a downgradedAt (data preserved indefinitely).
        await db.update(users).set({
          subscriptionStatus: 'cancelling',
          pendingCancellationChoice: 'downgrade',
        }).where(eq(users.id, user.id));

        await storage.insertSubscriptionEvent({
          userId: user.id,
          eventType: 'downgrade_to_free',
          previousPlan,
          currentPlan: previousPlan,
          previousStatus: user.subscriptionStatus,
          currentStatus: 'cancelling',
          triggeredBy: 'stripe',
        }).catch(err => console.error('[SubEvent] cancel/downgrade insert error:', err));

        console.log(`[CANCEL] User ${user.email} set to cancelling (downgrade) — access until period end`);

        outboundWebhookService.triggerWebhooks('subscription_cancelling', {
          userId: user.id,
          email: user.email,
          username: user.username,
          firstName: cancelFirstName,
          lastName: cancelLastName,
          previousPlan,
          cancellationChoice: 'downgrade',
          workflowTrigger: previousPlan === 'annual' ? 'cancelling_annual_to_free' : 'cancelling_monthly_to_free',
          isDowngrade: true,
          cancelAt,
        }).catch(err => console.error('[Webhook] subscription_cancelling trigger error (downgrade):', err));

        try {
          await emailService.sendDowngradeToFreeEmail(user.email, cancelFirstName);
        } catch (emailErr) {
          console.error('[CANCEL] Failed to send downgrade confirmation email:', emailErr);
        }

        res.json({
          success: true,
          message: "Your subscription has been cancelled. You will retain full access until the end of your current billing period, then your account will move to the free plan.",
        });
      } else {
        // Cancel completely at period end: keep access until period end, then at webhook
        // fire set status='free' and downgradedAt=now to start 30-day deletion clock.
        await db.update(users).set({
          subscriptionStatus: 'cancelling',
          pendingCancellationChoice: 'cancel',
        }).where(eq(users.id, user.id));

        await storage.insertSubscriptionEvent({
          userId: user.id,
          eventType: 'cancel',
          previousPlan,
          currentPlan: previousPlan,
          previousStatus: user.subscriptionStatus,
          currentStatus: 'cancelling',
          triggeredBy: 'stripe',
        }).catch(err => console.error('[SubEvent] cancel insert error:', err));

        console.log(`[CANCEL] User ${user.email} set to cancelling (full cancel) — access until period end`);

        outboundWebhookService.triggerWebhooks('subscription_cancelling', {
          userId: user.id,
          email: user.email,
          username: user.username,
          firstName: cancelFirstName,
          lastName: cancelLastName,
          previousPlan,
          cancellationChoice: 'cancel',
          workflowTrigger: previousPlan === 'annual' ? 'cancelling_annual_to_free' : 'cancelling_monthly_to_free',
          isDowngrade: false,
          cancelAt,
        }).catch(err => console.error('[Webhook] subscription_cancelling trigger error (cancel):', err));

        try {
          await emailService.sendCancellationConfirmationEmail(user.email, cancelFirstName);
        } catch (emailErr) {
          console.error('[CANCEL] Failed to send cancellation confirmation email:', emailErr);
        }

        res.json({
          success: true,
          message: "Your account has been cancelled. You will retain full access until the end of your current billing period, after which your saved data will be permanently deleted in 30 days.",
        });
      }
    } catch (error) {
      console.error('Subscription cancel error:', error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Downgrade annual → monthly (immediate plan switch via Stripe proration)
  app.post("/api/subscription/downgrade-to-monthly", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      if (user.subscriptionStatus !== 'active') {
        return res.status(400).json({ error: "No active subscription to downgrade." });
      }

      if (user.subscriptionPlan !== 'annual') {
        return res.status(400).json({ error: "Only annual subscribers can downgrade to monthly." });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No Stripe subscription found." });
      }

      const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
      if (!monthlyPriceId) {
        return res.status(500).json({ error: "Monthly price not configured." });
      }

      const stripe = await getUncachableStripeClient();

      // Retrieve current subscription to get the item ID
      const existingSub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const itemId = existingSub.items.data[0]?.id;
      if (!itemId) {
        return res.status(500).json({ error: "Could not read subscription items from Stripe." });
      }

      // Switch the subscription to the monthly price, prorating at period boundary
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        items: [{ id: itemId, price: monthlyPriceId }],
        proration_behavior: 'always_invoice',
      });

      // Update the user record
      await db.update(users).set({ subscriptionPlan: 'monthly' }).where(eq(users.id, user.id));

      await storage.insertSubscriptionEvent({
        userId: user.id,
        eventType: 'downgrade_annual_to_monthly',
        previousPlan: 'annual',
        currentPlan: 'monthly',
        previousStatus: user.subscriptionStatus,
        currentStatus: user.subscriptionStatus,
        triggeredBy: 'stripe',
      }).catch(err => console.error('[SubEvent] annual→monthly downgrade insert error:', err));

      console.log(`[DOWNGRADE] User ${user.email} downgraded annual → monthly`);

      // Fire webhook
      try {
        const [dlProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        const dlFullName = (dlProfile?.fullName || user.username || '').trim();
        const dlNameParts = dlFullName.split(/\s+/);
        const dlFirstName = dlNameParts[0] || '';
        const dlLastName = dlNameParts.length > 1 ? dlNameParts.slice(1).join(' ') : '';

        outboundWebhookService.triggerWebhooks('subscription_completed', {
          userId: user.id,
          email: user.email,
          username: user.username,
          firstName: dlFirstName,
          lastName: dlLastName,
          fullName: dlFullName,
          phone: dlProfile?.phone || '',
          companyName: dlProfile?.companyName || '',
          subscriptionType: 'monthly',
          subscriptionStatus: 'active',
          stripeCustomerId: user.stripeCustomerId || '',
          stripeSubscriptionId: user.stripeSubscriptionId,
          createdAt: new Date().toISOString(),
          workflowTrigger: 'downgrade_annual_to_monthly',
          previousPlan: 'annual',
          currentPlan: 'monthly',
          contactType: getCrmContactType('monthly'),
          emailVerified: true,
          isNewSignup: false,
          isUpgrade: false,
          isDowngrade: true,
        }).catch(err => console.error('[Webhook] subscription_completed trigger error (annual→monthly downgrade):', err));
      } catch (webhookErr) {
        console.error('[Webhook] Error preparing annual→monthly downgrade webhook:', webhookErr);
      }

      res.json({
        success: true,
        message: "Your subscription has been downgraded to monthly.",
        plan: 'monthly',
      });
    } catch (error) {
      console.error('Downgrade to monthly error:', error);
      res.status(500).json({ error: "Failed to downgrade subscription." });
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
      const baseUrl = process.env.VITE_APP_URL || 
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');

      // Obtain the portal configuration that disables the cancel button.
      // This call throws if the configuration cannot be obtained — we fail
      // closed here rather than exposing a portal with cancel enabled.
      const portalConfigId = await getOrCreateNoCancelPortalConfig(stripe);

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/portal/profile`,
        configuration: portalConfigId,
      });

      console.log(`[STRIPE] Billing portal session created for user ${user.id} (no-cancel config: ${portalConfigId})`);

      res.json({
        success: true,
        url: session.url,
      });
    } catch (error: any) {
      console.error('Manage billing error:', error?.message || error);
      // Surface the Stripe error message if available
      const stripeMessage = error?.raw?.message || error?.message;
      res.status(500).json({ 
        error: "Failed to open billing portal",
        detail: stripeMessage || undefined,
      });
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
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
            plan: (subscription.items.data[0]?.price.product as any)?.metadata?.plan_type || 'unknown',
          };
        } catch (error) {
          console.error('Error fetching subscription details:', error);
        }
      }

      res.json({
        status: user.subscriptionStatus,
        isActive: ['active', 'cancelling', 'comped', 'referral_trial'].includes(user.subscriptionStatus),
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
      const sessionUser = req.user as User;
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['subscription'],
      });

      // Fetch fresh user from DB — session data may be stale (e.g. stripeCustomerId was
      // created during checkout but session hasn't been refreshed yet)
      const [freshUser] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
      const user = freshUser || sessionUser;

      // Verify the session belongs to this user
      if (session.customer !== user.stripeCustomerId) {
        // If the session metadata has this userId, trust that instead
        const sessionUserId = (session.metadata as any)?.userId;
        if (sessionUserId !== user.id) {
          return res.status(403).json({ error: "Session does not belong to this user" });
        }
        // Update stripeCustomerId in DB if it's missing
        if (!user.stripeCustomerId && session.customer) {
          await db.update(users).set({ stripeCustomerId: session.customer as string }).where(eq(users.id, user.id));
        }
      }

      const subscription = session.subscription as any;
      
      if (subscription && subscription.status === 'active') {
        const priceInterval = subscription.items?.data?.[0]?.price?.recurring?.interval;
        const subscriptionPlan = priceInterval === 'year' ? 'annual' : 'monthly';

        // Capture the user's current plan BEFORE the DB update for webhook enrichment
        const previousPlan = user.subscriptionPlan || 'free';

        await db
          .update(users)
          .set({ 
            subscriptionStatus: 'active',
            stripeSubscriptionId: subscription.id,
            subscriptionPlan,
          })
          .where(eq(users.id, user.id));

        const stripeUpgradeEventType =
          previousPlan === 'free' && subscriptionPlan === 'monthly' ? 'upgrade_free_to_monthly' :
          previousPlan === 'free' && subscriptionPlan === 'annual' ? 'upgrade_free_to_annual' :
          previousPlan === 'monthly' && subscriptionPlan === 'annual' ? 'upgrade_monthly_to_annual' :
          'upgrade_free_to_monthly';

        await storage.insertSubscriptionEvent({
          userId: user.id,
          eventType: stripeUpgradeEventType,
          previousPlan,
          currentPlan: subscriptionPlan,
          previousStatus: user.subscriptionStatus,
          currentStatus: 'active',
          triggeredBy: 'stripe',
        }).catch(err => console.error('[SubEvent] stripe upgrade insert error:', err));

        console.log(`[STRIPE] User ${user.id} subscription activated: ${subscription.id} (plan: ${subscriptionPlan})`);

        // Sync Stripe-collected phone + billing address into user_profiles for upgrade flow
        const stripePhone = session.customer_details?.phone || null;
        const stripeAddr = session.customer_details?.address || null;
        if (stripePhone || stripeAddr) {
          const profileUpdates: Record<string, string | null> = {};
          if (stripePhone) profileUpdates.phone = stripePhone;
          if (stripeAddr?.line1) profileUpdates.street = stripeAddr.line1;
          if (stripeAddr?.city) profileUpdates.city = stripeAddr.city;
          if (stripeAddr?.state) profileUpdates.state = stripeAddr.state;
          if (stripeAddr?.postal_code) profileUpdates.zipCode = stripeAddr.postal_code;
          if (Object.keys(profileUpdates).length > 0) {
            await db
              .update(userProfiles)
              .set(profileUpdates)
              .where(eq(userProfiles.userId, user.id));
          }
        }

        // Trigger subscription_completed webhook for upgrade flow
        const upgradeWorkflowTrigger =
          previousPlan === 'free' && subscriptionPlan === 'monthly' ? 'upgrade_free_to_monthly' as const :
          previousPlan === 'free' && subscriptionPlan === 'annual' ? 'upgrade_free_to_annual' as const :
          previousPlan === 'monthly' && subscriptionPlan === 'annual' ? 'upgrade_monthly_to_annual' as const :
          (() => {
            console.warn(`[Webhook] Unexpected upgrade path: ${previousPlan} → ${subscriptionPlan}, defaulting to upgrade_free_to_monthly`);
            return 'upgrade_free_to_monthly' as const;
          })();

        try {
          const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
          const upgradeName = (profile?.fullName || user.username || '').trim();
          const upgradeNameParts = upgradeName.split(/\s+/);
          const upgradeFirstName = upgradeNameParts[0] || '';
          const upgradeLastName = upgradeNameParts.length > 1 ? upgradeNameParts.slice(1).join(' ') : '';

          outboundWebhookService.triggerWebhooks('subscription_completed', {
            userId: user.id,
            email: user.email,
            username: user.username,
            firstName: upgradeFirstName,
            lastName: upgradeLastName,
            fullName: upgradeName,
            phone: profile?.phone || '',
            companyName: profile?.companyName || '',
            subscriptionType: subscriptionPlan,
            subscriptionStatus: 'active',
            stripeCustomerId: user.stripeCustomerId || '',
            stripeSubscriptionId: subscription.id,
            createdAt: new Date().toISOString(),
            workflowTrigger: upgradeWorkflowTrigger,
            previousPlan,
            currentPlan: subscriptionPlan,
            contactType: getCrmContactType(subscriptionPlan),
            emailVerified: true,
            isNewSignup: false,
            isUpgrade: true,
            isDowngrade: false,
          }).catch(err => console.error('[Webhook] subscription_completed trigger error (upgrade):', err));
        } catch (webhookErr) {
          console.error('[Webhook] Error preparing upgrade webhook:', webhookErr);
        }

        res.json({
          success: true,
          message: "Subscription activated successfully!",
          subscriptionId: subscription.id,
          plan: subscriptionPlan,
          value: subscriptionPlan === 'annual' ? 250 : 25,
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
      const result = await authService.verifyEmail(token);

      if (!result.success) {
        return res.status(400).json({ error: result.error || result.message });
      }

      // Auto-login the user after successful verification so the location
      // prompt can immediately save city/state via authenticated endpoints.
      if (result.userObject && !req.isAuthenticated()) {
        await new Promise<void>((resolve, reject) => {
          req.login(result.userObject, (err) => {
            if (err) {
              console.error('[VerifyEmail] Auto-login failed (non-fatal):', err);
            }
            resolve();
          });
        });
      }

      // Fire outbound webhook on first-time email verification only.
      // result.userObject is only set on the actual verification path,
      // not on the "already verified" branch, so this won't double-fire.
      if (result.userObject) {
        outboundWebhookService.triggerWebhooks('email_verified', {
          userId: result.userObject.id,
          email: result.userObject.email,
          username: result.userObject.username,
          emailVerified: true,
          subscriptionStatus: result.userObject.subscriptionStatus,
          subscriptionPlan: result.userObject.subscriptionPlan,
        }).catch(err => console.error('[Webhook] email_verified trigger error:', err));
      }

      res.json({
        message: result.message,
        username: result.username,
        hasSubscription: result.hasSubscription,
        isComped: result.isComped,
      });
    } catch (error) {
      console.error('Email verification route error:', error);
      res.status(500).json({ error: "Email verification failed" });
    }
  });

  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await authService.requestPasswordReset(email);

      if (!result.success) {
        return res.status(500).json({ error: result.error || result.message });
      }

      res.json({ message: result.message });
    } catch (error) {
      console.error('[Password Reset Route] Error:', error);
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

      const result = await authService.resetPassword(token, password);

      if (!result.success) {
        return res.status(400).json({ error: result.error || result.message });
      }

      res.json({ message: result.message });
    } catch (error) {
      console.error('[Password Reset Route] Error:', error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Lender Authentication Routes - Admin only for creating invites
  app.post("/api/lenders/invite", ensureAdmin, async (req, res) => {
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
          _sessionToken: getSignedSessionToken(req),
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

  app.get("/api/lenders/me", ensureLenderOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      
      // If the user is an admin, return a synthetic lender profile for portal preview
      if (user.role === 'admin' && user.userType !== 'lender') {
        return res.json({
          id: 0,
          email: user.email,
          companyName: "Admin Preview Mode",
          contactName: user.username || "Admin User",
          phone: "",
          website: "",
          referralLink: "",
          referralAmount: null,
          referralType: "$",
          companyDescription: "",
          isAdminPreview: true,
        });
      }
      
      // Regular lender - return their actual data
      const lender = user;
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
        isAdminPreview: false,
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
          _sessionToken: getSignedSessionToken(req),
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
      // Fully destroy the session to ensure complete logout
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Lender session destroy error:", destroyErr);
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.post("/api/lenders/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [lender] = await db
        .select()
        .from(lenders)
        .where(sql`LOWER(${lenders.email}) = LOWER(${email})`)
        .limit(1);

      if (!lender) {
        return res.json({ 
          message: "If an account exists with this email, a password reset link will be sent." 
        });
      }

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

      const emailSent = await emailService.sendLenderPasswordResetEmail(
        lender.email,
        lender.companyName,
        resetToken
      );

      res.json({ 
        message: "If an account exists with this email, a password reset link will be sent." 
      });
    } catch (error) {
      console.error('Lender password reset request error:', error);
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
      console.error('Token validation error:', error);
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
  app.get("/api/loan-products", ensureLenderOrAdmin, async (req, res) => {
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
      
      if (!product) {
        return res.status(404).json({ error: "Loan product not found" });
      }

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
  app.get("/api/loan-products/template/bridge", ensureLenderOrAdmin, async (req, res) => {
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
  app.get("/api/loan-products/template/dscr", ensureLenderOrAdmin, async (req, res) => {
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

  // Get transactional funding lenders (public endpoint for wholesale calculator)
  app.get("/api/loan-products/transactional-funding", async (req, res) => {
    try {
      // Get all active transactional funding products with their lender info
      const results = await db
        .select({
          productId: loanProducts.id,
          lenderId: loanProducts.lenderId,
          points: loanProducts.points,
          flatFee: loanProducts.transactionalFlatFee,
          fees: loanProducts.fees,
          referralLink: loanProducts.referralLink,
          companyName: lenders.companyName,
        })
        .from(loanProducts)
        .innerJoin(lenders, eq(loanProducts.lenderId, lenders.id))
        .where(
          and(
            eq(loanProducts.loanType, 'transactional-funding'),
            eq(loanProducts.isActive, true),
            eq(lenders.archived, false)
          )
        )
        .limit(2);

      const transactionalLenders = results.map(r => ({
        id: r.lenderId,
        productId: r.productId,
        companyName: r.companyName,
        flatFee: parseFloat(r.flatFee || r.fees || '0'),
        points: parseFloat(r.points || '0'),
        referralLink: r.referralLink,
      }));

      res.json(transactionalLenders);
    } catch (error) {
      console.error('Get transactional funding lenders error:', error);
      res.status(500).json({ error: "Failed to get transactional funding lenders" });
    }
  });

  // Legacy combined template (kept for backwards compatibility)
  app.get("/api/loan-products/template", ensureLenderOrAdmin, async (req, res) => {
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

  // Admin Lender Management Routes (GET is accessible by developers for viewing)
  app.get("/api/admin/lenders", ensureAdminOrDeveloper, async (req, res) => {
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

  app.get("/api/admin/lenders/:id", ensureAdminOrDeveloper, async (req, res) => {
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
  app.get("/api/admin/reports/dashboard-stats", ensureAdminReadAccess, async (req, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/admin/reports/lender-referrals", ensureAdminReadAccess, async (req, res) => {
    try {
      const referrals = await storage.getAllLenderReferralsForAdmin();
      res.json(referrals);
    } catch (error) {
      console.error('Lender referrals report error:', error);
      res.status(500).json({ error: "Failed to fetch lender referrals" });
    }
  });

  app.get("/api/admin/reports/users", ensureAdminReadAccess, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Users report error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/reports/affiliate-clicks", ensureAdminReadAccess, async (req, res) => {
    try {
      const clicks = await storage.getAffiliateClicksForAdmin();
      res.json(clicks);
    } catch (error) {
      console.error('Affiliate clicks report error:', error);
      res.status(500).json({ error: "Failed to fetch affiliate clicks" });
    }
  });

  app.get("/api/admin/reports/affiliate-stats", ensureAdminReadAccess, async (req, res) => {
    try {
      const stats = await storage.getAffiliateClickStats();
      res.json(stats);
    } catch (error) {
      console.error('Affiliate stats error:', error);
      res.status(500).json({ error: "Failed to fetch affiliate stats" });
    }
  });

  app.get("/api/admin/reports/deal-stats", ensureAdminReadAccess, async (req, res) => {
    try {
      const stats = await storage.getDealAnalysisStats();
      res.json(stats);
    } catch (error) {
      console.error('Deal stats error:', error);
      res.status(500).json({ error: "Failed to fetch deal stats" });
    }
  });

  app.get("/api/admin/reports/deals", ensureAdminReadAccess, async (req, res) => {
    try {
      const deals = await storage.getAllDealsForAdmin();
      res.json(deals);
    } catch (error) {
      console.error('Deals report error:', error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  app.get("/api/admin/reports/lender-performance", ensureAdminReadAccess, async (req, res) => {
    try {
      const stats = await storage.getLenderPerformanceStats();
      res.json(stats);
    } catch (error) {
      console.error('Lender performance error:', error);
      res.status(500).json({ error: "Failed to fetch lender performance stats" });
    }
  });

  app.get("/api/admin/reports/platform-usage", ensureAdminReadAccess, async (req, res) => {
    try {
      const stats = await storage.getPlatformUsageStats();
      res.json(stats);
    } catch (error) {
      console.error('Platform usage error:', error);
      res.status(500).json({ error: "Failed to fetch platform usage stats" });
    }
  });

  app.get("/api/admin/reports/subscriptions", ensureAdminReadAccess, async (req, res) => {
    try {
      const stats = await storage.getSubscriptionStats();
      res.json(stats);
    } catch (error) {
      console.error('Subscription stats error:', error);
      res.status(500).json({ error: "Failed to fetch subscription stats" });
    }
  });

  app.get("/api/admin/reports/weekly-signups", ensureAdminReadAccess, async (req, res) => {
    try {
      const startDateRaw = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDateRaw = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const startDate = startDateRaw ? new Date(startDateRaw) : undefined;
      const endDate = endDateRaw ? new Date(endDateRaw) : undefined;
      if (startDate && isNaN(startDate.getTime())) {
        return res.status(400).json({ error: "Invalid startDate" });
      }
      if (endDate && isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid endDate" });
      }
      const rows = await storage.getWeeklySignupReport(startDate, endDate);
      res.json(rows);
    } catch (error) {
      console.error('Weekly signups report error:', error);
      res.status(500).json({ error: "Failed to fetch weekly signup report" });
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
      subscriptionPlan: user.subscriptionPlan,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      isEmailVerified: user.isEmailVerified,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion,
      archiveReason: (user as any).archiveReason ?? null,
      signupSource: (user as any).signupSource ?? null,
      signupRef: (user as any).signupRef ?? null,
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
      
      const [adminProfile] = await db.select({ fullName: userProfiles.fullName }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      const adminFirstName = (adminProfile?.fullName || '').trim().split(/\s+/)[0] || user.username;
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        adminFirstName,
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
  app.get("/api/admin/users", ensureAdminReadAccess, async (req, res) => {
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
          ...sanitizeUserForAdmin(user as any),
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

  app.get("/api/admin/users/stats", ensureAdminReadAccess, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      const stats = {
        total: allUsers.length,
        bySubscription: {
          active: allUsers.filter(u => u.subscriptionStatus === 'active').length,
          free: allUsers.filter(u => u.subscriptionStatus === 'free').length,
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

  app.get("/api/admin/users/export.csv", ensureAdminReadAccess, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();

      const rows = await Promise.all(allUsers.map(async (user) => {
        const dealsCount = await db.select({ count: count() }).from(savedDeals).where(eq(savedDeals.userId, user.id));
        const lendersCount = await db.select({ count: count() }).from(savedLenders).where(eq(savedLenders.userId, user.id));
        const referrals = await db.select({ count: count() }).from(users).where(eq(users.referredBy, user.id));
        const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);

        let referredByUsername = "";
        if (user.referredBy) {
          const referrer = await db.select({ username: users.username }).from(users).where(eq(users.id, user.referredBy)).limit(1);
          referredByUsername = referrer[0]?.username || "";
        }

        const sanitized = sanitizeUserForAdmin(user as any);

        return {
          fullName:        profile[0]?.fullName || "",
          username:        sanitized.username || "",
          email:           sanitized.email || "",
          phone:           profile[0]?.phone || "",
          city:            profile[0]?.city || "",
          state:           profile[0]?.state || "",
          subscriptionStatus: sanitized.subscriptionStatus || "",
          subscriptionPlan:   sanitized.subscriptionPlan || "",
          role:            sanitized.role || "",
          emailVerified:   sanitized.isEmailVerified ? "Yes" : "No",
          signupDate:      sanitized.createdAt ? new Date(sanitized.createdAt).toLocaleDateString("en-US") : "",
          termsAcceptedAt: sanitized.termsAcceptedAt ? new Date(sanitized.termsAcceptedAt).toLocaleDateString("en-US") : "",
          referralCode:    sanitized.referralCode || "",
          referredByUsername,
          dealsAnalyzed:   Number(dealsCount[0]?.count || 0),
          lendersSaved:    Number(lendersCount[0]?.count || 0),
          referralsMade:   Number(referrals[0]?.count || 0),
        };
      }));

      const headers = [
        "Full Name", "Username", "Email", "Phone", "City", "State",
        "Account Status", "Plan", "Role", "Email Verified", "Signup Date",
        "Terms Accepted", "Referral Code", "Referred By",
        "Deals Analyzed", "Lenders Saved", "Referrals Made",
      ];

      const escape = (val: any) => {
        const str = String(val ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      };

      const csvLines = [
        headers.join(","),
        ...rows.map(r => [
          r.fullName, r.username, r.email, r.phone, r.city, r.state,
          r.subscriptionStatus, r.subscriptionPlan, r.role, r.emailVerified,
          r.signupDate, r.termsAcceptedAt, r.referralCode, r.referredByUsername,
          r.dealsAnalyzed, r.lendersSaved, r.referralsMade,
        ].map(escape).join(",")),
      ];

      const filename = `redatametrix-users-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csvLines.join("\n"));
    } catch (error) {
      console.error("User CSV export error:", error);
      res.status(500).json({ error: "Failed to export users" });
    }
  });

  app.patch("/api/admin/users/:id/subscription", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { subscriptionStatus, subscriptionPlan, archiveReason } = req.body;
      
      if (!['active', 'cancelling', 'free', 'comped', 'referral_trial', 'archived', 'suspended'].includes(subscriptionStatus)) {
        return res.status(400).json({ error: "Invalid subscription status" });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const previousStatus = existingUser.subscriptionStatus;
      
      const updateFields: Record<string, any> = { subscriptionStatus };
      if (subscriptionStatus === 'active' && subscriptionPlan) {
        updateFields.subscriptionPlan = subscriptionPlan;
      } else if (subscriptionStatus !== 'active') {
        updateFields.subscriptionPlan = null;
      }

      if (subscriptionStatus === 'archived' || subscriptionStatus === 'suspended') {
        updateFields.archiveReason = archiveReason || null;
      } else {
        updateFields.archiveReason = null;
      }
      
      const [updated] = await db.update(users)
        .set(updateFields)
        .where(eq(users.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.insertSubscriptionEvent({
        userId: id,
        eventType: 'admin_override',
        previousPlan: existingUser.subscriptionPlan ?? null,
        currentPlan: updated.subscriptionPlan ?? null,
        previousStatus,
        currentStatus: subscriptionStatus,
        triggeredBy: 'admin',
      }).catch(err => console.error('[SubEvent] admin override insert error:', err));

      const wasLocked = previousStatus === 'archived' || previousStatus === 'suspended';
      const isNowLocked = subscriptionStatus === 'archived' || subscriptionStatus === 'suspended';

      if (subscriptionStatus === 'archived') {
        outboundWebhookService.triggerWebhooks('user_archived', {
          userId: id,
          email: updated.email,
          username: updated.username,
          archiveReason: archiveReason || null,
        }).catch(err => console.error('[Webhook] user_archived error:', err));
      } else if (subscriptionStatus === 'suspended') {
        outboundWebhookService.triggerWebhooks('user_suspended', {
          userId: id,
          email: updated.email,
          username: updated.username,
        }).catch(err => console.error('[Webhook] user_suspended error:', err));
      } else if (wasLocked && !isNowLocked) {
        outboundWebhookService.triggerWebhooks('user_restored', {
          userId: id,
          email: updated.email,
          username: updated.username,
          newStatus: subscriptionStatus,
        }).catch(err => console.error('[Webhook] user_restored error:', err));
      }
      
      // Return sanitized user data (no sensitive fields)
      res.json({ message: "Subscription updated successfully", user: sanitizeUserForAdmin(updated) });
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Update user role - admin only
  app.patch("/api/admin/users/:id/role", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['user', 'admin', 'developer', 'auditor'].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'user', 'admin', 'developer', or 'auditor'" });
      }
      
      // Prevent changing own role (safety check)
      const currentUser = req.user as User;
      if (currentUser.id === id) {
        return res.status(400).json({ error: "Cannot change your own role" });
      }
      
      const [updated] = await db.update(users)
        .set({ role })
        .where(eq(users.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ message: "Role updated successfully", user: sanitizeUserForAdmin(updated) });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Create developer account - admin only
  app.post("/api/admin/users/developer", ensureAdmin, async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      if (!email || !password || !username) {
        return res.status(400).json({ error: "Email, password, and username are required" });
      }
      
      // Check if email or username already exists
      const [existingByEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      
      const [existingByUsername] = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (existingByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create the developer user
      const newUser = await storage.createUser({
        email,
        username,
        password: hashedPassword,
        role: 'developer',
        subscriptionStatus: 'free',
      });

      await storage.insertSubscriptionEvent({
        userId: newUser.id,
        eventType: 'downgrade_to_free',
        previousPlan: null,
        currentPlan: null,
        previousStatus: null,
        currentStatus: 'free',
        triggeredBy: 'admin',
      }).catch(err => console.error('[SubEvent] admin developer create insert error:', err));
      
      res.status(201).json({ 
        message: "Developer account created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role,
        }
      });
    } catch (error) {
      console.error('Create developer account error:', error);
      res.status(500).json({ error: "Failed to create developer account" });
    }
  });

  // Update user email - admin only
  app.patch("/api/admin/users/:id/email", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const emailSchema = z.string().email("Invalid email address");
      const parsed = emailSchema.safeParse(email.trim().toLowerCase());
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid email address format" });
      }
      const normalizedEmail = parsed.data;

      const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check uniqueness (allow same email as the current user)
      if (normalizedEmail !== targetUser.email.toLowerCase()) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
          .limit(1);
        if (existing) {
          return res.status(400).json({ error: "This email address is already in use by another account" });
        }
      }

      // If the email is unchanged, bail early
      if (normalizedEmail === targetUser.email.toLowerCase()) {
        return res.status(400).json({ error: "The new email is the same as the current email" });
      }

      const verificationToken = crypto.randomBytes(32).toString('base64url');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [updated] = await db.update(users)
        .set({
          email: normalizedEmail,
          isEmailVerified: false,
          verificationToken,
          verificationExpiry,
        })
        .where(eq(users.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      // Send verification email to the new address
      const [emailProfile] = await db.select({ fullName: userProfiles.fullName }).from(userProfiles).where(eq(userProfiles.userId, id)).limit(1);
      const firstName = (emailProfile?.fullName || '').trim().split(/\s+/)[0] || updated.username;
      const emailSent = await emailService.sendVerificationEmail(normalizedEmail, firstName, verificationToken);

      console.log(`[ADMIN] Email updated for user ${id}: ${targetUser.email} -> ${normalizedEmail}, emailSent: ${emailSent}`);

      res.json({
        message: "Email updated and verification link sent.",
        emailSent,
        user: sanitizeUserForAdmin(updated),
      });
    } catch (error) {
      console.error('Update user email error:', error);
      res.status(500).json({ error: "Failed to update user email" });
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
      
      const [resendProfile] = await db.select({ fullName: userProfiles.fullName }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      const resendFirstName = (resendProfile?.fullName || '').trim().split(/\s+/)[0] || user.username;
      const emailSent = await emailService.sendVerificationEmail(user.email, resendFirstName, verificationToken);
      
      res.json({ 
        message: emailSent ? "Verification email sent successfully" : "Failed to send email",
        emailSent 
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // Bulk send custom email to selected users (Admin)
  app.post("/api/admin/users/send-email", ensureAdmin, async (req, res) => {
    try {
      const { userIds, subject, body } = req.body as { userIds?: string[]; subject?: string; body?: string };

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "userIds is required and must be a non-empty array" });
      }
      if (!subject || typeof subject !== "string" || !subject.trim()) {
        return res.status(400).json({ error: "subject is required" });
      }
      if (!body || typeof body !== "string" || !body.trim()) {
        return res.status(400).json({ error: "body is required" });
      }

      const recipients = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          fullName: userProfiles.fullName,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(inArray(users.id, userIds));

      const escapeHtml = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      const applyMerge = (template: string, ctx: { firstName: string; fullName: string; email: string; username: string }) =>
        template
          .replace(/\{\{\s*firstName\s*\}\}/gi, ctx.firstName)
          .replace(/\{\{\s*fullName\s*\}\}/gi, ctx.fullName)
          .replace(/\{\{\s*email\s*\}\}/gi, ctx.email)
          .replace(/\{\{\s*username\s*\}\}/gi, ctx.username);

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      await Promise.all(recipients.map(async (r) => {
        try {
          const fullName = (r.fullName || '').trim();
          const derivedFirst = fullName.split(/\s+/)[0] || '';
          const firstName = derivedFirst || 'there';
          const ctx = {
            firstName,
            fullName: fullName || r.username || '',
            email: r.email,
            username: r.username || '',
          };

          const renderedSubject = applyMerge(subject, ctx);
          const renderedBodyText = applyMerge(body, ctx);
          const renderedBodyHtml = escapeHtml(renderedBodyText).replace(/\r?\n/g, '<br>');

          const html = `<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">${renderedBodyHtml}</body></html>`;

          const ok = await emailService.sendCustomEmail(r.email, renderedSubject, html, 'marketing');
          if (ok) {
            sent++;
          } else {
            failed++;
            errors.push(`${r.email}: SMTP send failed`);
          }
        } catch (err: any) {
          failed++;
          errors.push(`${r.email}: ${err?.message || 'Unknown error'}`);
        }
      }));

      const missing = userIds.length - recipients.length;
      if (missing > 0) {
        failed += missing;
        errors.push(`${missing} user ID(s) not found`);
      }

      res.json({ sent, failed, errors });
    } catch (error: any) {
      console.error('Bulk send email error:', error);
      res.status(500).json({ error: error?.message || "Failed to send bulk emails" });
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
          message: "This user has referral activity recorded. Use 'free' or 'archived' status instead."
        });
      }
      
      // Prevent deleting admin users
      if (user.role === 'admin') {
        return res.status(400).json({ error: "Cannot delete admin users" });
      }

      // Block deletion if user has an active Stripe subscription
      if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'cancelling') {
        return res.status(400).json({
          error: "Cannot delete a user with an active Stripe subscription. Cancel their subscription in Stripe first.",
        });
      }

      // Fire user_deleted webhook before deleting
      await outboundWebhookService.triggerWebhooks('user_deleted', {
        userId: id,
        email: user.email,
        username: user.username,
        archiveReason: (user as any).archiveReason || null,
      }).catch(err => console.error('[Webhook] user_deleted error:', err));
      
      // Delete related records first (cascade)
      await db.delete(userProfiles).where(eq(userProfiles.userId, id));
      await db.delete(userInvestmentPreferences).where(eq(userInvestmentPreferences.userId, id));
      await db.delete(userUsageCounters).where(eq(userUsageCounters.userId, id));
      await db.delete(savedDeals).where(eq(savedDeals.userId, id));
      await db.delete(savedLenders).where(eq(savedLenders.userId, id));
      await db.delete(lenderReferrals).where(eq(lenderReferrals.userId, id));
      await db.delete(affiliateClicks).where(eq(affiliateClicks.userId, id));
      await db.delete(applyClicks).where(eq(applyClicks.userId, id));
      await db.delete(dealAnalyses).where(eq(dealAnalyses.userId, id));
      await db.delete(discountCodeUses).where(eq(discountCodeUses.userId, id));
      await db.delete(lenderInquiries).where(eq(lenderInquiries.userId, id));
      await db.delete(featureFeedback).where(eq(featureFeedback.userId, id));
      await db.delete(promoRedemptions).where(eq(promoRedemptions.userId, id));
      await db.delete(promoWaitlist).where(eq(promoWaitlist.userId, id));
      await db.delete(contractorDocuments).where(eq(contractorDocuments.userId, id));
      await db.delete(userSubmissions).where(eq(userSubmissions.userId, id));
      await db.delete(apiUsageLogs).where(eq(apiUsageLogs.userId, id));
      await db.delete(sentSignupFollowups).where(eq(sentSignupFollowups.userId, id));
      // Clear created_by references (set to null to preserve records created by this user)
      await db.update(demoTokens).set({ createdBy: null }).where(eq(demoTokens.createdBy, id));
      await db.update(discountCodes).set({ createdBy: null }).where(eq(discountCodes.createdBy, id));
      await db.update(promoCodes).set({ createdBy: null }).where(eq(promoCodes.createdBy, id));
      await db.update(integrationConfigs).set({ createdBy: null }).where(eq(integrationConfigs.createdBy, id));
      await db.update(outboundWebhooks).set({ createdBy: null }).where(eq(outboundWebhooks.createdBy, id));
      // Clear comp invite references (set to null instead of deleting the invites)
      await db.update(compInvites).set({ invitedBy: null }).where(eq(compInvites.invitedBy, id));
      await db.update(compInvites).set({ acceptedBy: null }).where(eq(compInvites.acceptedBy, id));
      // Clear auditor invite references
      await db.update(auditorInvites).set({ invitedBy: null }).where(eq(auditorInvites.invitedBy, id));
      await db.update(auditorInvites).set({ acceptedBy: null }).where(eq(auditorInvites.acceptedBy, id));
      // Clean up pending registrations for this email
      await db.delete(pendingRegistrations).where(sql`LOWER(${pendingRegistrations.email}) = LOWER(${user.email})`);
      
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
          message: "User has related records that couldn't be deleted. Try updating their status to 'free' instead."
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

  app.get("/api/admin/comp-invites", ensureAdminReadAccess, async (req, res) => {
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
  // Admin Auditor Invites Routes
  // =====================

  app.post("/api/admin/auditor-invites", ensureAdmin, async (req, res) => {
    try {
      const { email, companyName, expiresInDays } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const adminId = (req.user as User).id;
      const result = await storage.createAuditorInvite(email, adminId, companyName, expiresInDays || 30);
      
      const emailSent = await emailService.sendAuditorInviteEmail(result.email, result.inviteCode, companyName || null, result.expiresAt);
      
      res.json({ 
        ...result, 
        emailSent,
        message: emailSent ? "Auditor invitation sent successfully" : "Invitation created but email failed to send"
      });
    } catch (error) {
      console.error('Create auditor invite error:', error);
      res.status(500).json({ error: "Failed to create auditor invite" });
    }
  });

  app.get("/api/admin/auditor-invites", ensureAdminReadAccess, async (req, res) => {
    try {
      const invites = await storage.getAllAuditorInvites();
      res.json(invites);
    } catch (error) {
      console.error('Get auditor invites error:', error);
      res.status(500).json({ error: "Failed to fetch auditor invites" });
    }
  });

  app.post("/api/admin/auditor-invites/:id/resend", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.resendAuditorInvite(id);
      
      if (!result) {
        return res.status(404).json({ error: "Auditor invite not found" });
      }
      
      const emailSent = await emailService.sendAuditorInviteEmail(result.email, result.inviteCode, null, result.expiresAt);
      
      res.json({ 
        ...result, 
        emailSent,
        message: emailSent ? "Invitation resent successfully" : "Invitation updated but email failed to send"
      });
    } catch (error) {
      console.error('Resend auditor invite error:', error);
      res.status(500).json({ error: "Failed to resend auditor invite" });
    }
  });

  app.delete("/api/admin/auditor-invites/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAuditorInvite(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Auditor invite not found" });
      }
      
      res.json({ success: true, message: "Auditor invite deleted" });
    } catch (error) {
      console.error('Delete auditor invite error:', error);
      res.status(500).json({ error: "Failed to delete auditor invite" });
    }
  });

  // =====================
  // Admin Demo Access Links Routes
  // =====================

  // Get all demo tokens
  app.get("/api/admin/demo-links", ensureAdminReadAccess, async (req, res) => {
    try {
      const tokens = await storage.getAllDemoTokens();
      res.json(tokens);
    } catch (error) {
      console.error('Get demo tokens error:', error);
      res.status(500).json({ error: "Failed to fetch demo links" });
    }
  });

  // Create a new demo token
  app.post("/api/admin/demo-links", ensureAdmin, async (req, res) => {
    try {
      const { contactName, contactEmail, notes, expiresInDays, sendEmail } = req.body;
      const adminId = (req.user as User).id;
      
      // Default to 30 days if not specified
      const days = expiresInDays || 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      
      const demoToken = await storage.createDemoToken({
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        notes: notes || null,
        status: 'active',
        expiresAt,
        createdBy: adminId,
      });
      
      // Generate the full demo URL
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000';
      const demoUrl = `${baseUrl}/demo/${demoToken.token}`;
      
      // Optionally send email with the demo link
      let emailSent = false;
      if (sendEmail && contactEmail) {
        emailSent = await emailService.sendDemoAccessEmail(
          contactEmail,
          contactName || null,
          demoUrl,
          expiresAt
        );
      }
      
      res.json({ 
        ...demoToken,
        demoUrl,
        emailSent,
        message: emailSent 
          ? "Demo access link created and emailed successfully"
          : "Demo access link created successfully"
      });
    } catch (error) {
      console.error('Create demo token error:', error);
      res.status(500).json({ error: "Failed to create demo link" });
    }
  });

  // Update a demo token (extend expiration, update notes)
  app.patch("/api/admin/demo-links/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { contactName, contactEmail, notes, expiresAt } = req.body;
      
      const updateData: any = {};
      if (contactName !== undefined) updateData.contactName = contactName;
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
      if (notes !== undefined) updateData.notes = notes;
      if (expiresAt) updateData.expiresAt = new Date(expiresAt);
      
      const updated = await storage.updateDemoToken(id, updateData);
      
      if (!updated) {
        return res.status(404).json({ error: "Demo link not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Update demo token error:', error);
      res.status(500).json({ error: "Failed to update demo link" });
    }
  });

  // Revoke a demo token
  app.post("/api/admin/demo-links/:id/revoke", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const revoked = await storage.revokeDemoToken(id);
      
      if (!revoked) {
        return res.status(404).json({ error: "Demo link not found" });
      }
      
      res.json({ ...revoked, message: "Demo link revoked successfully" });
    } catch (error) {
      console.error('Revoke demo token error:', error);
      res.status(500).json({ error: "Failed to revoke demo link" });
    }
  });

  // =====================
  // Admin Promo Codes Routes
  // =====================

  // Get all promo codes with stats
  app.get("/api/admin/promo-codes", ensureAdminReadAccess, async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const codes = await promoService.getAllPromoCodes();
      res.json(codes);
    } catch (error) {
      console.error('Get promo codes error:', error);
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  // Create a new promo code
  app.post("/api/admin/promo-codes", ensureAdmin, async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const user = req.user as User;
      
      const promoCode = await promoService.createPromoCode({
        ...req.body,
        createdBy: user.id
      });
      
      res.status(201).json(promoCode);
    } catch (error: any) {
      console.error('Create promo code error:', error);
      if (error.message?.includes('duplicate')) {
        return res.status(400).json({ error: "A promo code with this code already exists" });
      }
      res.status(500).json({ error: "Failed to create promo code" });
    }
  });

  // Update a promo code
  app.patch("/api/admin/promo-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const { id } = req.params;
      
      const updated = await promoService.updatePromoCode(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Update promo code error:', error);
      res.status(500).json({ error: "Failed to update promo code" });
    }
  });

  // Get waitlist for a promo code
  app.get("/api/admin/promo-codes/:id/waitlist", ensureAdminReadAccess, async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const { id } = req.params;
      
      const waitlist = await promoService.getWaitlist(id);
      res.json(waitlist);
    } catch (error) {
      console.error('Get promo waitlist error:', error);
      res.status(500).json({ error: "Failed to fetch waitlist" });
    }
  });

  // Notify next person on waitlist
  app.post("/api/admin/promo-codes/:id/notify-next", ensureAdmin, async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const { id } = req.params;
      
      const next = await promoService.notifyNextOnWaitlist(id);
      
      if (!next) {
        return res.status(404).json({ error: "No one on waitlist" });
      }
      
      // TODO: Send notification email to next.email
      
      res.json({ success: true, notified: next });
    } catch (error) {
      console.error('Notify next on waitlist error:', error);
      res.status(500).json({ error: "Failed to notify next person" });
    }
  });

  // Get API usage stats (admin)
  app.get("/api/admin/api-usage", ensureAdminReadAccess, async (req, res) => {
    try {
      const { apiUsageService } = await import("./services/api-usage.service");
      const { startDate, endDate, limit } = req.query;
      
      const [totalStats, userStats, recentLogs] = await Promise.all([
        apiUsageService.getTotalCosts(
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        ),
        apiUsageService.getAllUsersStats(
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
          limit ? parseInt(limit as string) : 100
        ),
        apiUsageService.getRecentLogs(50)
      ]);
      
      res.json({ totalStats, userStats, recentLogs });
    } catch (error) {
      console.error('Get API usage error:', error);
      res.status(500).json({ error: "Failed to fetch API usage stats" });
    }
  });

  // Get API usage for a specific user
  app.get("/api/admin/api-usage/user/:userId", ensureAdminReadAccess, async (req, res) => {
    try {
      const { apiUsageService } = await import("./services/api-usage.service");
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      
      const [stats, logs] = await Promise.all([
        apiUsageService.getUserStats(
          userId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        ),
        apiUsageService.getUserLogs(userId, 50)
      ]);
      
      res.json({ stats, logs });
    } catch (error) {
      console.error('Get user API usage error:', error);
      res.status(500).json({ error: "Failed to fetch user API usage" });
    }
  });

  // =====================
  // User Promo Code Routes
  // =====================

  // Validate a promo code (public - for checking before redeeming)
  app.get("/api/promo/validate/:code", async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const { code } = req.params;
      
      const result = await promoService.validatePromoCode(code);
      res.json(result);
    } catch (error) {
      console.error('Validate promo code error:', error);
      res.status(500).json({ error: "Failed to validate promo code" });
    }
  });

  // Redeem a promo code (requires authentication)
  app.post("/api/promo/redeem", ensureAuthenticated, async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const user = req.user as User;
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Promo code is required" });
      }
      
      const result = await promoService.redeemPromoCode(user.id, code);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          addedToWaitlist: result.addedToWaitlist,
          waitlistPosition: result.waitlistPosition
        });
      }
      
      res.json({ 
        success: true, 
        redemption: result.redemption,
        message: "Promo code redeemed successfully! Your free access has been activated."
      });
    } catch (error) {
      console.error('Redeem promo code error:', error);
      res.status(500).json({ error: "Failed to redeem promo code" });
    }
  });

  // Get current user's active promo
  app.get("/api/promo/my-status", ensureAuthenticated, async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const user = req.user as User;
      
      const activePromo = await promoService.getUserActivePromo(user.id);
      
      res.json({ 
        hasActivePromo: !!activePromo,
        promo: activePromo
      });
    } catch (error) {
      console.error('Get user promo status error:', error);
      res.status(500).json({ error: "Failed to fetch promo status" });
    }
  });

  // Join waitlist (requires authentication)
  app.post("/api/promo/waitlist", ensureAuthenticated, async (req, res) => {
    try {
      const { promoService } = await import("./services/promo.service");
      const user = req.user as User;
      const { promoCodeId } = req.body;
      
      if (!promoCodeId) {
        return res.status(400).json({ error: "Promo code ID is required" });
      }
      
      const result = await promoService.addToWaitlist(promoCodeId, user.email, user.id, user.username);
      
      res.json({ 
        success: true, 
        position: result.position,
        message: `You've been added to the waitlist at position ${result.position}.`
      });
    } catch (error) {
      console.error('Join waitlist error:', error);
      res.status(500).json({ error: "Failed to join waitlist" });
    }
  });

  // =====================
  // Webinar Registration Routes
  // =====================

  // WEBINAR_ENABLED = false — registration endpoint deactivated, returns 410 Gone
  app.post("/api/webinar/register", async (_req, res) => {
    return res.status(410).json({ error: "Webinar registration is no longer available." });
  });
  app.post("/api/webinar/register/__disabled__", async (req, res) => {
    try {
      const { name, email, phone, webinarId, source, referralSource, webinarDate } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: "Name is required" });
      }
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email is required" });
      }
      
      // Default webinar date to next upcoming webinar (Feb 27, 2026 at 12pm EST)
      let defaultWebinarDate = new Date('2026-02-27T12:00:00-05:00');
      if (webinarDate && typeof webinarDate === 'string') {
        const parsed = new Date(webinarDate);
        if (!isNaN(parsed.getTime())) {
          defaultWebinarDate = parsed;
        }
      }
      
      // Check if already registered
      const existing = await storage.getWebinarRegistrationByEmail(email, webinarId || 'soft-launch-2026');
      if (existing) {
        return res.json({ 
          success: true, 
          message: "You're already registered! Check your email for the meeting link.",
          alreadyRegistered: true,
          registrationId: existing.id
        });
      }
      
      // Validate referral source if provided
      let validatedReferral = null;
      if (referralSource) {
        const partner = await storage.getReferralPartnerBySlug(referralSource);
        if (partner && partner.isActive) {
          validatedReferral = partner.slug;
        }
      }
      
      const registration = await storage.createWebinarRegistration({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        webinarId: webinarId || 'soft-launch-2026',
        webinarDate: defaultWebinarDate,
        source: source || null,
        referralSource: validatedReferral
      });
      
      // Trigger outbound webhooks for webinar registration (fire and forget)
      outboundWebhookService.triggerWebhooks('webinar_registration', {
        registrationId: registration.id,
        name: registration.name,
        email: registration.email,
        phone: registration.phone,
        webinarId: registration.webinarId,
        webinarDate: registration.webinarDate?.toISOString(),
        source: registration.source,
        referralSource: registration.referralSource,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('[Webhook] webinar_registration trigger error:', err));
      
      // Trigger CRM integration event if configured
      try {
        const integrations = await storage.getAllIntegrationConfigs();
        for (const integration of integrations) {
          if (integration.isActive) {
            const triggers = await storage.getIntegrationEventTriggers(integration.id);
            const webinarTrigger = triggers.find(t => t.eventType === 'webinar_registration' && t.isEnabled);
            if (webinarTrigger) {
              await storage.createIntegrationSyncLog({
                integrationId: integration.id,
                eventType: 'webinar_registration',
                status: 'pending',
                direction: 'outbound',
                requestData: {
                  name: registration.name,
                  email: registration.email,
                  phone: registration.phone,
                  webinarId: registration.webinarId,
                  source: registration.source,
                  registeredAt: registration.registeredAt
                }
              });
            }
          }
        }
      } catch (crmError) {
        console.error('CRM integration trigger error:', crmError);
        // Don't fail the registration if CRM sync fails
      }
      
      // Send confirmation email with calendar invite and RSVP buttons
      try {
        await emailService.sendWebinarConfirmationEmail(registration.email, registration.name, registration.id);
        console.log(`✓ Webinar confirmation email sent to ${registration.email}`);
      } catch (emailError) {
        console.error('Webinar confirmation email error:', emailError);
        // Don't fail the registration if email fails
      }
      
      res.json({ 
        success: true, 
        message: "Registration successful! Check your email for confirmation and calendar invite.",
        registration 
      });
    } catch (error) {
      console.error('Webinar registration error:', error);
      res.status(500).json({ error: "Failed to register for webinar" });
    }
  });

  // Get webinar registrations (admin only)
  app.get("/api/admin/webinar-registrations", ensureAdminReadAccess, async (req, res) => {
    try {
      const { webinarId } = req.query;
      const registrations = await storage.getWebinarRegistrations(webinarId as string);
      res.json(registrations);
    } catch (error) {
      console.error('Get webinar registrations error:', error);
      res.status(500).json({ error: "Failed to fetch webinar registrations" });
    }
  });

  // Delete a webinar registration (admin only)
  app.delete("/api/admin/webinar-registrations/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { notify, email, name } = req.query;
      
      const deleted = await storage.deleteWebinarRegistration(id);
      if (deleted) {
        // Send notification email if requested
        if (notify === 'true' && email && name) {
          try {
            await emailService.sendWebinarRemovalNotification(email as string, name as string);
            console.log(`✓ Webinar removal notification sent to ${email}`);
          } catch (emailError) {
            console.error('Failed to send removal notification:', emailError);
            // Don't fail the deletion if email fails
          }
        }
        res.json({ success: true, message: notify === 'true' ? "Registration deleted and notification sent" : "Registration deleted" });
      } else {
        res.status(404).json({ error: "Registration not found" });
      }
    } catch (error) {
      console.error('Delete webinar registration error:', error);
      res.status(500).json({ error: "Failed to delete registration" });
    }
  });

  // Send confirmation emails to existing registrants (admin only)
  app.post("/api/admin/webinar-registrations/send-confirmations", ensureAdmin, async (req, res) => {
    try {
      const { webinarId, registrantIds } = req.body;
      const registrations = await storage.getWebinarRegistrations(webinarId || 'soft-launch-2026');
      
      // Filter by specific IDs if provided, otherwise send to all
      const targetRegistrations = registrantIds?.length 
        ? registrations.filter(r => registrantIds.includes(r.id))
        : registrations;
      
      const results = {
        total: targetRegistrations.length,
        sent: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (const registration of targetRegistrations) {
        try {
          const success = await emailService.sendWebinarConfirmationEmail(
            registration.email,
            registration.name,
            registration.id
          );
          if (success) {
            results.sent++;
            console.log(`✓ Confirmation sent to ${registration.email}`);
          } else {
            results.failed++;
            results.errors.push(`Failed to send to ${registration.email}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error sending to ${registration.email}: ${error}`);
        }
      }
      
      res.json({
        success: true,
        message: `Sent ${results.sent} of ${results.total} confirmation emails`,
        results
      });
    } catch (error) {
      console.error('Send confirmations error:', error);
      res.status(500).json({ error: "Failed to send confirmation emails" });
    }
  });

  // RSVP endpoint for webinar attendees
  app.get("/api/webinar/rsvp/:registrationId", async (req, res) => {
    try {
      const { registrationId } = req.params;
      const { response } = req.query;
      
      if (!response || !['confirmed', 'declined'].includes(response as string)) {
        return res.status(400).json({ error: "Invalid response. Must be 'confirmed' or 'declined'" });
      }
      
      // Get the registration
      const registration = await storage.getWebinarRegistrationById(registrationId);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }
      
      // Update RSVP status
      await storage.updateWebinarRegistrationRsvp(registrationId, response as string);
      
      // Redirect to a confirmation page
      const status = response === 'confirmed' ? 'confirmed' : 'declined';
      res.redirect(`/webinar/rsvp/${registrationId}/thank-you?status=${status}`);
    } catch (error) {
      console.error('RSVP update error:', error);
      res.status(500).json({ error: "Failed to update RSVP" });
    }
  });

  // Get RSVP status for confirmation page
  app.get("/api/webinar/rsvp/:registrationId/status", async (req, res) => {
    try {
      const { registrationId } = req.params;
      
      const registration = await storage.getWebinarRegistrationById(registrationId);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }
      
      res.json({
        name: registration.name,
        email: registration.email,
        rsvpStatus: registration.rsvpStatus || 'pending',
        rsvpUpdatedAt: registration.rsvpUpdatedAt
      });
    } catch (error) {
      console.error('Get RSVP status error:', error);
      res.status(500).json({ error: "Failed to get RSVP status" });
    }
  });

  // Admin endpoint to get RSVP statistics
  app.get("/api/admin/webinar-registrations/rsvp-stats", ensureAdminReadAccess, async (req, res) => {
    try {
      const registrations = await storage.getWebinarRegistrations();
      const stats = {
        total: registrations.length,
        confirmed: registrations.filter(r => r.rsvpStatus === 'confirmed').length,
        declined: registrations.filter(r => r.rsvpStatus === 'declined').length,
        pending: registrations.filter(r => !r.rsvpStatus || r.rsvpStatus === 'pending').length,
      };
      res.json(stats);
    } catch (error) {
      console.error('Get RSVP stats error:', error);
      res.status(500).json({ error: "Failed to get RSVP stats" });
    }
  });

  // Admin endpoint to manually trigger day-before reminders
  app.post("/api/admin/webinar-registrations/send-day-before-reminders", ensureAdmin, async (req, res) => {
    try {
      const { webinarReminderService } = await import('./services/webinar-reminder.service');
      const results = await webinarReminderService.triggerDayBeforeReminders();
      res.json({
        success: true,
        message: `Sent ${results.sent} of ${results.total} day-before reminder emails`,
        results
      });
    } catch (error) {
      console.error('Send day-before reminders error:', error);
      res.status(500).json({ error: "Failed to send day-before reminders" });
    }
  });

  // Admin endpoint to manually trigger final reminders
  app.post("/api/admin/webinar-registrations/send-final-reminders", ensureAdmin, async (req, res) => {
    try {
      const { webinarReminderService } = await import('./services/webinar-reminder.service');
      const results = await webinarReminderService.triggerFinalReminders();
      res.json({
        success: true,
        message: `Sent ${results.sent} of ${results.total} final reminder emails`,
        results
      });
    } catch (error) {
      console.error('Send final reminders error:', error);
      res.status(500).json({ error: "Failed to send final reminders" });
    }
  });

  // Update attendance status for a registration (admin only)
  app.patch("/api/admin/webinar-registrations/:id/attendance", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { attended } = req.body;
      
      if (attended !== null && typeof attended !== 'boolean') {
        return res.status(400).json({ error: "attended must be a boolean or null" });
      }
      
      const result = await storage.updateWebinarRegistrationAttendance(id, attended);
      if (result) {
        res.json({ success: true, registration: result });
      } else {
        res.status(404).json({ error: "Registration not found" });
      }
    } catch (error) {
      console.error('Update attendance error:', error);
      res.status(500).json({ error: "Failed to update attendance" });
    }
  });

  // Update subscription level for a registration (admin only)
  app.patch("/api/admin/webinar-registrations/:id/subscription", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { subscriptionLevel } = req.body;
      
      if (!subscriptionLevel || typeof subscriptionLevel !== 'string') {
        return res.status(400).json({ error: "subscriptionLevel must be a string" });
      }
      
      const result = await storage.updateWebinarRegistrationSubscription(id, subscriptionLevel);
      if (result) {
        res.json({ success: true, registration: result });
      } else {
        res.status(404).json({ error: "Registration not found" });
      }
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Bulk update webinar date for registrations (admin only)
  app.patch("/api/admin/webinar-registrations/bulk-webinar-date", ensureAdmin, async (req, res) => {
    try {
      const { ids, webinarDate } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      
      if (!webinarDate) {
        return res.status(400).json({ error: "webinarDate is required" });
      }
      
      await storage.bulkUpdateWebinarDate(ids, new Date(webinarDate));
      res.json({ success: true, message: `Updated ${ids.length} registrations` });
    } catch (error) {
      console.error('Bulk update webinar date error:', error);
      res.status(500).json({ error: "Failed to update webinar dates" });
    }
  });

  // Sync webinar registrations with user account subscriptions (admin only)
  app.post("/api/admin/webinar-registrations/sync-subscriptions", ensureAdmin, async (req, res) => {
    try {
      const result = await storage.syncWebinarRegistrationSubscriptions();
      res.json({ 
        success: true, 
        synced: result.synced,
        total: result.results.length,
        withAccounts: result.results.filter(r => r.hasAccount).length,
        results: result.results
      });
    } catch (error) {
      console.error('Sync subscriptions error:', error);
      res.status(500).json({ error: "Failed to sync subscriptions" });
    }
  });

  // Zoho OAuth and Meeting Integration Routes
  const { zohoOAuthService } = await import("./services/zoho-oauth.service");
  const { zohoMeetingService } = await import("./services/zoho-meeting.service");

  // Check Zoho connection status
  app.get("/api/zoho/status", ensureAdmin, async (req, res) => {
    try {
      const isConnected = await zohoOAuthService.isConnected();
      res.json({ connected: isConnected });
    } catch (error) {
      console.error('Zoho status check error:', error);
      res.json({ connected: false });
    }
  });

  // Get list of recent webinars from Zoho
  app.get("/api/zoho/webinars", ensureAdmin, async (req, res) => {
    try {
      const isConnected = await zohoOAuthService.isConnected();
      if (!isConnected) {
        return res.status(401).json({ error: "Zoho is not connected" });
      }
      
      // Fetch both webinars and meetings
      const [webinars, meetings] = await Promise.all([
        zohoMeetingService.getRecentWebinars().catch(() => []),
        zohoMeetingService.getRecentMeetings().catch(() => [])
      ]);
      
      // Combine and format
      const allSessions = [
        ...webinars.map(w => ({ ...w, type: 'webinar' as const })),
        ...meetings.map(m => ({ ...m, type: 'meeting' as const }))
      ].sort((a, b) => {
        // Sort by startTime descending (most recent first)
        const dateA = new Date(a.startTime || 0).getTime();
        const dateB = new Date(b.startTime || 0).getTime();
        return dateB - dateA;
      });
      
      res.json({ sessions: allSessions });
    } catch (error) {
      console.error('Zoho webinars fetch error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch webinars" });
    }
  });

  // Get Zoho authorization URL
  app.get("/api/zoho/authorize", ensureAdmin, async (req, res) => {
    try {
      const user = req.user as User;
      if (!user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }
      // Generate CSRF state token bound to this admin user
      const state = zohoOAuthService.generateState(user.id);
      const authUrl = zohoOAuthService.getAuthorizationUrl(state);
      res.json({ authUrl });
    } catch (error) {
      console.error('Zoho authorize error:', error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  // Handle Zoho OAuth callback
  app.get("/api/zoho/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).send("Missing authorization code");
      }

      if (!state || typeof state !== 'string') {
        return res.status(400).send("Missing state parameter - possible CSRF attack");
      }

      // Validate the state parameter (CSRF protection)
      const userId = zohoOAuthService.validateState(state);
      if (!userId) {
        return res.status(400).send("Invalid or expired state parameter - please try connecting again");
      }

      await zohoOAuthService.exchangeCodeForTokens(code);
      
      // Redirect back to admin panel with success message
      res.redirect("/admin/webinar-registrations?zoho=connected");
    } catch (error) {
      console.error('Zoho callback error:', error);
      res.redirect("/admin/webinar-registrations?zoho=error");
    }
  });

  // Disconnect Zoho
  app.post("/api/zoho/disconnect", ensureAdmin, async (req, res) => {
    try {
      await zohoOAuthService.disconnect();
      res.json({ success: true });
    } catch (error) {
      console.error('Zoho disconnect error:', error);
      res.status(500).json({ error: "Failed to disconnect Zoho" });
    }
  });

  // Sync attendance from Zoho Meeting
  app.post("/api/admin/webinar-registrations/sync-zoho-attendance", ensureAdmin, async (req, res) => {
    try {
      const { meetingKey } = req.body;
      
      if (!meetingKey) {
        return res.status(400).json({ error: "meetingKey is required" });
      }

      // Get all webinar registrations
      const registrations = await storage.getWebinarRegistrations();
      const regData = registrations.map(r => ({ id: r.id, email: r.email }));

      // Sync with Zoho - now also returns meeting date
      const syncResult = await zohoMeetingService.syncAttendanceWithRegistrations(meetingKey, regData);

      // Update attendance and webinar date in database
      let updated = 0;
      let datesUpdated = 0;
      for (const regId of syncResult.attendees) {
        await storage.updateWebinarRegistrationAttendance(regId, true);
        updated++;
        
        // Also update the webinar date if we got it from Zoho
        if (syncResult.meetingDate) {
          await storage.updateWebinarRegistrationWebinarDate(regId, syncResult.meetingDate);
          datesUpdated++;
        }
      }

      const dateMessage = syncResult.meetingDate 
        ? ` Updated webinar date to ${syncResult.meetingDate.toLocaleDateString()}.`
        : '';

      res.json({
        success: true,
        matched: syncResult.matched,
        updated,
        datesUpdated,
        notFound: syncResult.notFound.length,
        unregisteredAttendees: syncResult.unmatched,
        meetingDate: syncResult.meetingDate?.toISOString() || null,
        message: `Synced ${updated} attendees from Zoho Meeting.${dateMessage}`
      });
    } catch (error: any) {
      console.error('Zoho sync attendance error:', error);
      res.status(500).json({ error: error.message || "Failed to sync attendance from Zoho" });
    }
  });

  // ==================== MARKETING PIXELS API ====================
  
  // Validation schemas
  const marketingPixelPlatformSchema = z.enum(['meta', 'linkedin', 'google', 'tiktok', 'twitter']);
  const updateMarketingPixelSchema = z.object({
    pixelId: z.string().min(1).optional(),
    isEnabled: z.boolean().optional(),
    capiAccessToken: z.string().optional().nullable(),
  });
  
  // Get all marketing pixels
  app.get("/api/admin/marketing-pixels", ensureAdminReadAccess, async (req, res) => {
    try {
      const pixels = await storage.getAllMarketingPixels();
      res.json(pixels);
    } catch (error) {
      console.error('Get marketing pixels error:', error);
      res.status(500).json({ error: "Failed to fetch marketing pixels" });
    }
  });

  // Get enabled marketing pixels (public - for loading on frontend)
  // capiAccessToken is stripped — it's a server secret and must never reach the browser
  app.get("/api/marketing-pixels", async (req, res) => {
    try {
      const pixels = await storage.getEnabledMarketingPixels();
      const safe = pixels.map(({ capiAccessToken: _omit, ...p }) => p);
      res.json(safe);
    } catch (error) {
      console.error('Get enabled marketing pixels error:', error);
      res.status(500).json({ error: "Failed to fetch marketing pixels" });
    }
  });

  // Create marketing pixel
  app.post("/api/admin/marketing-pixels", ensureAdmin, async (req, res) => {
    try {
      // Validate request body with Zod
      const createSchema = insertMarketingPixelSchema.extend({
        platform: marketingPixelPlatformSchema,
        pixelId: z.string().min(1, "Pixel ID is required"),
      });
      
      const validation = createSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      
      const { platform, pixelId, isEnabled } = validation.data;

      // Check if platform already exists
      const existing = await storage.getMarketingPixelByPlatform(platform);
      if (existing) {
        return res.status(400).json({ error: `A pixel for ${platform} already exists. Update or delete it first.` });
      }

      const pixel = await storage.createMarketingPixel({
        platform,
        pixelId,
        isEnabled: isEnabled ?? true,
      });

      res.json(pixel);
    } catch (error) {
      console.error('Create marketing pixel error:', error);
      res.status(500).json({ error: "Failed to create marketing pixel" });
    }
  });

  // Update marketing pixel
  app.patch("/api/admin/marketing-pixels/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate id is a valid UUID
      if (!id || typeof id !== 'string' || id.length === 0) {
        return res.status(400).json({ error: "Invalid pixel ID" });
      }
      
      // Validate request body with Zod
      const validation = updateMarketingPixelSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      
      const { pixelId, isEnabled, capiAccessToken } = validation.data;

      const pixel = await storage.updateMarketingPixel(id, {
        ...(pixelId !== undefined && { pixelId }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(capiAccessToken !== undefined && { capiAccessToken }),
      });

      if (!pixel) {
        return res.status(404).json({ error: "Pixel not found" });
      }

      res.json(pixel);
    } catch (error) {
      console.error('Update marketing pixel error:', error);
      res.status(500).json({ error: "Failed to update marketing pixel" });
    }
  });

  // Delete marketing pixel
  app.delete("/api/admin/marketing-pixels/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate id
      if (!id || typeof id !== 'string' || id.length === 0) {
        return res.status(400).json({ error: "Invalid pixel ID" });
      }

      const deleted = await storage.deleteMarketingPixel(id);

      if (!deleted) {
        return res.status(404).json({ error: "Pixel not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete marketing pixel error:', error);
      res.status(500).json({ error: "Failed to delete marketing pixel" });
    }
  });

  // Send post-webinar emails (promo codes to attendees, next date to non-attendees)
  app.post("/api/admin/webinar-registrations/send-post-webinar-emails", ensureAdmin, async (req, res) => {
    try {
      const { promoCode, nextWebinarDate, facebookGroupUrl } = req.body;
      
      if (!promoCode) {
        return res.status(400).json({ error: "promoCode is required for attendees" });
      }
      
      if (!nextWebinarDate) {
        return res.status(400).json({ error: "nextWebinarDate is required for non-attendees" });
      }
      
      const allRegistrations = await storage.getWebinarRegistrationsNeedingPostWebinarEmail();
      
      const results = {
        attendees: { total: 0, sent: 0, failed: 0 },
        nonAttendees: { total: 0, sent: 0, failed: 0 }
      };
      
      for (const reg of allRegistrations) {
        if (reg.attended) {
          results.attendees.total++;
          try {
            const success = await emailService.sendWebinarThankYouEmail(
              reg.email,
              reg.name,
              promoCode,
              facebookGroupUrl || 'https://www.facebook.com/groups/1455681056068763/'
            );
            if (success) {
              results.attendees.sent++;
              await storage.updateWebinarRegistrationPostEmailSent(reg.id);
            } else {
              results.attendees.failed++;
            }
          } catch (error) {
            results.attendees.failed++;
            console.error(`Failed to send promo email to ${reg.email}:`, error);
          }
        } else {
          results.nonAttendees.total++;
          try {
            const success = await emailService.sendMissedWebinarEmail(
              reg.email,
              reg.name,
              nextWebinarDate
            );
            if (success) {
              results.nonAttendees.sent++;
              await storage.updateWebinarRegistrationPostEmailSent(reg.id);
            } else {
              results.nonAttendees.failed++;
            }
          } catch (error) {
            results.nonAttendees.failed++;
            console.error(`Failed to send next date email to ${reg.email}:`, error);
          }
        }
      }
      
      res.json({
        success: true,
        message: `Sent ${results.attendees.sent} promo emails to attendees and ${results.nonAttendees.sent} next date emails to non-attendees`,
        results
      });
    } catch (error) {
      console.error('Send post-webinar emails error:', error);
      res.status(500).json({ error: "Failed to send post-webinar emails" });
    }
  });

  // Admin endpoint to send reminder emails to no-shows only
  app.post("/api/admin/webinar-registrations/send-noshow-emails", ensureAdmin, async (req, res) => {
    try {
      const { nextWebinarDate } = req.body;
      
      if (!nextWebinarDate) {
        return res.status(400).json({ error: "nextWebinarDate is required" });
      }
      
      // Get all registrations marked as "not attended"
      const allRegistrations = await storage.getWebinarRegistrations();
      const noShows = allRegistrations.filter(reg => reg.attended === false);
      
      if (noShows.length === 0) {
        return res.json({
          success: true,
          message: "No no-show registrations found to email",
          sent: 0,
          failed: 0
        });
      }
      
      let sent = 0;
      let failed = 0;
      
      for (const reg of noShows) {
        try {
          const success = await emailService.sendMissedWebinarEmail(
            reg.email,
            reg.name,
            nextWebinarDate
          );
          if (success) {
            sent++;
            console.log(`Sent no-show reminder email to ${reg.email}`);
          } else {
            failed++;
            console.error(`Failed to send no-show email to ${reg.email}`);
          }
        } catch (error) {
          failed++;
          console.error(`Error sending no-show email to ${reg.email}:`, error);
        }
      }
      
      res.json({
        success: true,
        message: `Sent ${sent} reminder emails to no-shows (${failed} failed)`,
        sent,
        failed,
        total: noShows.length
      });
    } catch (error) {
      console.error('Send no-show emails error:', error);
      res.status(500).json({ error: "Failed to send no-show emails" });
    }
  });

  // Admin endpoint to batch update webinar dates
  app.post("/api/admin/webinar-registrations/set-webinar-date", ensureAdmin, async (req, res) => {
    try {
      const { webinarDate } = req.body;
      
      if (!webinarDate || typeof webinarDate !== 'string') {
        return res.status(400).json({ error: "webinarDate is required as ISO string" });
      }
      
      // Validate the date is parseable and valid
      const parsedDate = new Date(webinarDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use ISO 8601 format." });
      }
      
      // Update all registrations that don't have a webinar date
      const allRegistrations = await storage.getWebinarRegistrations();
      let updated = 0;
      
      for (const reg of allRegistrations) {
        if (!reg.webinarDate) {
          await storage.updateWebinarRegistrationWebinarDate(reg.id, parsedDate);
          updated++;
        }
      }
      
      res.json({
        success: true,
        message: `Updated ${updated} registrations with webinar date`,
        updated
      });
    } catch (error) {
      console.error('Set webinar date error:', error);
      res.status(500).json({ error: "Failed to set webinar dates" });
    }
  });

  // Admin endpoint to reset attendance for future webinars (fix incorrectly marked registrations)
  app.post("/api/admin/webinar-registrations/reset-future-attendance", ensureAdmin, async (req, res) => {
    try {
      const allRegistrations = await storage.getWebinarRegistrations();
      const now = new Date();
      let reset = 0;
      
      for (const reg of allRegistrations) {
        // If webinar is in the future and attendance is set (not null), reset it
        if (reg.webinarDate && new Date(reg.webinarDate) > now && reg.attended !== null) {
          await storage.updateWebinarRegistrationAttendance(reg.id, null);
          reset++;
        }
      }
      
      res.json({
        success: true,
        message: `Reset attendance for ${reset} future webinar registrations`,
        reset
      });
    } catch (error) {
      console.error('Reset future attendance error:', error);
      res.status(500).json({ error: "Failed to reset future attendance" });
    }
  });

  // Admin endpoint to preview attendees who haven't signed up (for follow-up emails)
  app.get("/api/admin/webinar-registrations/attended-not-signed-up", ensureAdminReadAccess, async (req, res) => {
    try {
      const allRegistrations = await storage.getWebinarRegistrations();
      console.log('[attended-not-signed-up] Total registrations:', allRegistrations.length);
      
      const attendees = allRegistrations.filter(reg => reg.attended === true);
      console.log('[attended-not-signed-up] Attended count:', attendees.length);
      
      const recipients: { name: string; email: string }[] = [];
      const alreadySignedUp: { name: string; email: string; reason: string }[] = [];
      
      for (const reg of attendees) {
        console.log('[attended-not-signed-up] Checking:', reg.email, 'subscriptionLevel:', reg.subscriptionLevel);
        
        // Check if they have a subscription level set (comped, free, etc.) - means they signed up
        if (reg.subscriptionLevel) {
          alreadySignedUp.push({ name: reg.name, email: reg.email, reason: `subscription: ${reg.subscriptionLevel}` });
          continue;
        }
        
        // Also check if they have a user account
        const existingUser = await storage.getUserByEmail(reg.email);
        if (existingUser) {
          alreadySignedUp.push({ name: reg.name, email: reg.email, reason: 'has user account' });
        } else {
          recipients.push({ name: reg.name, email: reg.email });
        }
      }
      
      console.log('[attended-not-signed-up] Recipients:', recipients.length, 'AlreadySignedUp:', alreadySignedUp.length);
      
      res.json({
        recipients,
        alreadySignedUp,
        totalAttended: attendees.length
      });
    } catch (error) {
      console.error('Preview attended-not-signed-up error:', error);
      res.status(500).json({ error: "Failed to get preview" });
    }
  });

  // Admin endpoint to send follow-up emails to attendees who haven't signed up
  app.post("/api/admin/webinar-registrations/send-attended-not-signed-up-emails", ensureAdmin, async (req, res) => {
    try {
      const { promoCode } = req.body;
      
      if (!promoCode) {
        return res.status(400).json({ error: "promoCode is required" });
      }
      
      // Get all registrations marked as attended
      const allRegistrations = await storage.getWebinarRegistrations();
      const attendees = allRegistrations.filter(reg => reg.attended === true);
      
      if (attendees.length === 0) {
        return res.json({
          success: true,
          message: "No attended registrations found",
          sent: 0,
          failed: 0,
          skipped: 0
        });
      }
      
      let sent = 0;
      let failed = 0;
      let skipped = 0;
      
      for (const reg of attendees) {
        try {
          // Check if they have a subscription level set (comped, free, etc.) - means they signed up
          if (reg.subscriptionLevel) {
            skipped++;
            continue;
          }
          
          // Check if user has signed up (exists in users table)
          const existingUser = await storage.getUserByEmail(reg.email);
          
          if (existingUser) {
            // User already signed up, skip
            skipped++;
            continue;
          }
          
          const success = await emailService.sendAttendedNotSignedUpEmail(
            reg.email,
            reg.name,
            promoCode
          );
          if (success) {
            sent++;
            console.log(`Sent attended-not-signed-up email to ${reg.email}`);
          } else {
            failed++;
            console.error(`Failed to send attended-not-signed-up email to ${reg.email}`);
          }
        } catch (error) {
          failed++;
          console.error(`Error sending attended-not-signed-up email to ${reg.email}:`, error);
        }
      }
      
      res.json({
        success: true,
        message: `Sent ${sent} follow-up emails to attendees who haven't signed up (${skipped} already signed up, ${failed} failed)`,
        sent,
        failed,
        skipped,
        total: attendees.length
      });
    } catch (error) {
      console.error('Send attended-not-signed-up emails error:', error);
      res.status(500).json({ error: "Failed to send follow-up emails" });
    }
  });

  // Admin endpoint to send thank you emails to webinar attendees
  app.post("/api/admin/webinar-attendees/send-thank-you", ensureAdmin, async (req, res) => {
    try {
      const { attendees, promoCode, facebookGroupUrl } = req.body;
      
      if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
        return res.status(400).json({ error: "Attendees list is required" });
      }
      
      if (!promoCode) {
        return res.status(400).json({ error: "Promo code is required" });
      }
      
      if (!facebookGroupUrl) {
        return res.status(400).json({ error: "Facebook group URL is required" });
      }
      
      const results = {
        total: attendees.length,
        sent: 0,
        failed: 0,
        details: [] as { email: string; name: string; success: boolean; error?: string }[]
      };
      
      for (const attendee of attendees) {
        const { name, email } = attendee;
        if (!name || !email) {
          results.failed++;
          results.details.push({ email: email || 'unknown', name: name || 'unknown', success: false, error: 'Missing name or email' });
          continue;
        }
        
        try {
          const success = await emailService.sendWebinarThankYouEmail(email, name, promoCode, facebookGroupUrl);
          if (success) {
            results.sent++;
            results.details.push({ email, name, success: true });
          } else {
            results.failed++;
            results.details.push({ email, name, success: false, error: 'Email service returned false' });
          }
        } catch (error) {
          results.failed++;
          results.details.push({ email, name, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      res.json({
        success: true,
        message: `Sent ${results.sent} of ${results.total} thank you emails`,
        results
      });
    } catch (error) {
      console.error('Send thank you emails error:', error);
      res.status(500).json({ error: "Failed to send thank you emails" });
    }
  });

  // =====================
  // Admin Referral Partners Routes
  // =====================

  // Get all referral partners
  app.get("/api/admin/referral-partners", ensureAdminReadAccess, async (req, res) => {
    try {
      const partners = await storage.getReferralPartners();
      res.json(partners);
    } catch (error) {
      console.error('Get referral partners error:', error);
      res.status(500).json({ error: "Failed to fetch referral partners" });
    }
  });

  // Get referral stats for webinar signups
  app.get("/api/admin/referral-stats", ensureAdminReadAccess, async (req, res) => {
    try {
      const stats = await storage.getReferralStats();
      res.json(stats);
    } catch (error) {
      console.error('Get referral stats error:', error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  // Create a new referral partner
  app.post("/api/admin/referral-partners", ensureAdmin, async (req, res) => {
    try {
      const { name, slug, email, promoCode } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }
      
      // Check if slug already exists
      const existing = await storage.getReferralPartnerBySlug(slug);
      if (existing) {
        return res.status(400).json({ error: "A partner with this slug already exists" });
      }
      
      const partner = await storage.createReferralPartner({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        email: email?.trim() || null,
        promoCode: promoCode?.trim() || null,
        isActive: true
      });
      
      res.status(201).json(partner);
    } catch (error) {
      console.error('Create referral partner error:', error);
      res.status(500).json({ error: "Failed to create referral partner" });
    }
  });

  // Update a referral partner
  app.patch("/api/admin/referral-partners/:id", ensureAdmin, async (req, res) => {
    try {
      const partnerId = parseInt(req.params.id);
      const { name, slug, email, promoCode, isActive } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (slug !== undefined) updateData.slug = slug.toLowerCase().trim();
      if (email !== undefined) updateData.email = email?.trim() || null;
      if (promoCode !== undefined) updateData.promoCode = promoCode?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      await storage.updateReferralPartner(partnerId, updateData);
      res.json({ success: true });
    } catch (error) {
      console.error('Update referral partner error:', error);
      res.status(500).json({ error: "Failed to update referral partner" });
    }
  });

  // Delete a referral partner
  app.delete("/api/admin/referral-partners/:id", ensureAdmin, async (req, res) => {
    try {
      const partnerId = parseInt(req.params.id);
      await storage.deleteReferralPartner(partnerId);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete referral partner error:', error);
      res.status(500).json({ error: "Failed to delete referral partner" });
    }
  });

  // =====================
  // Admin Discount Codes Routes
  // =====================

  // Get all discount codes with usage stats
  app.get("/api/admin/discount-codes", ensureAdminReadAccess, async (req, res) => {
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
  app.get("/api/admin/discount-codes/stats", ensureAdminReadAccess, async (req, res) => {
    try {
      const stats = await storage.getDiscountCodeStats();
      res.json(stats);
    } catch (error) {
      console.error('Get discount code stats error:', error);
      res.status(500).json({ error: "Failed to fetch discount code stats" });
    }
  });

  // Get single discount code
  app.get("/api/admin/discount-codes/:id", ensureAdminReadAccess, async (req, res) => {
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
  app.get("/api/admin/discount-codes/:id/usage", ensureAdminReadAccess, async (req, res) => {
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
      const { code, displayName, partnerName, description, planApplicability, percentOff, amountOff, maxRedemptions, startAt, endAt, isActive, stripeDuration, stripeDurationInMonths } = req.body;
      
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
      
      const validDuration = ['once', 'repeating', 'forever'].includes(stripeDuration) ? stripeDuration : 'repeating';
      let resolvedMonths: number | null = null;
      if (validDuration === 'repeating') {
        const rawMonths = stripeDurationInMonths !== undefined && stripeDurationInMonths !== null && stripeDurationInMonths !== '' ? Number(stripeDurationInMonths) : 12;
        if (!Number.isFinite(rawMonths) || rawMonths <= 0 || !Number.isInteger(rawMonths)) {
          return res.status(400).json({ error: "Duration in months must be a positive integer" });
        }
        resolvedMonths = rawMonths;
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
        stripeDuration: validDuration,
        stripeDurationInMonths: resolvedMonths,
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
      
      const { code, displayName, partnerName, description, planApplicability, percentOff, amountOff, maxRedemptions, startAt, endAt, isActive, stripeDuration, stripeDurationInMonths } = req.body;
      
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
      if (stripeDuration !== undefined) {
        const validDur = ['once', 'repeating', 'forever'].includes(stripeDuration) ? stripeDuration : 'repeating';
        let resolvedPatchMonths: number | null = null;
        if (validDur === 'repeating') {
          const rawM = stripeDurationInMonths !== undefined && stripeDurationInMonths !== null && stripeDurationInMonths !== '' ? Number(stripeDurationInMonths) : 12;
          if (!Number.isFinite(rawM) || rawM <= 0 || !Number.isInteger(rawM)) {
            return res.status(400).json({ error: "Duration in months must be a positive integer" });
          }
          resolvedPatchMonths = rawM;
        }
        updateData.stripeDuration = validDur;
        updateData.stripeDurationInMonths = resolvedPatchMonths;
      }
      
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

  // Delete discount code (also deletes Stripe coupon if synced)
  app.delete("/api/admin/discount-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: "Invalid discount code ID" });
      }
      
      // Get the discount code first to check for Stripe coupon
      const discountCode = await storage.getDiscountCode(id);
      if (!discountCode) {
        return res.status(404).json({ error: "Discount code not found" });
      }
      
      // Delete Stripe coupon if one exists
      if (discountCode.stripeCouponId) {
        try {
          const stripe = await getUncachableStripeClient();
          await stripe.coupons.del(discountCode.stripeCouponId);
          console.log(`[STRIPE] Deleted coupon ${discountCode.stripeCouponId} for discount code ${discountCode.code}`);
        } catch (stripeError: any) {
          // Log but don't fail if Stripe coupon already deleted or not found
          console.warn(`[STRIPE] Could not delete coupon ${discountCode.stripeCouponId}: ${stripeError.message}`);
        }
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
      const duration = discountCode.stripeDuration || 'repeating';
      const couponParams: any = {
        id: discountCode.code, // Use code as coupon ID for easy reference
        name: `${discountCode.code} - ${discountCode.displayName}`,
        duration,
      };
      if (duration === 'repeating') {
        couponParams.duration_in_months = discountCode.stripeDurationInMonths ?? 12;
      }
      
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

  // Affiliate Management Routes (Partner Tools)
  // List all affiliates (admin and developer)
  app.get("/api/admin/affiliates", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const affiliates = await storage.getAllAffiliates();
      res.json(affiliates);
    } catch (error) {
      console.error('Get all affiliates error:', error);
      res.status(500).json({ error: "Failed to fetch affiliates" });
    }
  });

  // List active affiliates (public, for Resources page and Tool Finder)
  app.get("/api/affiliates", async (req, res) => {
    try {
      // Only return active affiliates to the public
      const affiliates = await storage.getActiveAffiliates();
      res.json(affiliates);
    } catch (error) {
      console.error('Get affiliates error:', error);
      res.status(500).json({ error: "Failed to fetch affiliates" });
    }
  });

  // Get affiliate by slug (public, for detail page)
  app.get("/api/affiliates/by-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const affiliate = await storage.getAffiliateBySlug(slug);
      
      if (!affiliate || !affiliate.isActive) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      // Return public affiliate info (exclude sensitive fields)
      const { loginUsername, loginPassword, portalUrl, reportToken, notificationEmail, contactEmail, ...publicInfo } = affiliate;
      const isAdmin = (req.session as any)?.userId && (await storage.getUser((req.session as any).userId))?.role === "admin";
      res.json(isAdmin ? { ...publicInfo, contactEmail } : publicInfo);
    } catch (error) {
      console.error('Get affiliate by slug error:', error);
      res.status(500).json({ error: "Failed to fetch affiliate" });
    }
  });

  // List affiliate categories (public, for Tool Finder)
  app.get("/api/affiliate-categories", async (req, res) => {
    try {
      const categories = await storage.getAllAffiliateCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get affiliate categories error:', error);
      res.status(500).json({ error: "Failed to fetch affiliate categories" });
    }
  });

  // Create affiliate (admin and developer) - with Zod validation
  const createAffiliateSchema = insertAffiliateSchema.extend({
    benefits: z.array(z.string()).default([]),
    categories: z.array(z.string()).min(1, "At least one category is required"),
  });
  
  app.post("/api/admin/affiliates", ensureAdminOrDeveloper, async (req, res) => {
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
        portalUrl: data.portalUrl || null,
        categories: data.categories,
        iconName: data.iconName || 'Building2',
        referralFee: data.referralFee || null,
        referralFeeType: data.referralFeeType || null,
        costFrom: data.costFrom || null,
        costTo: data.costTo || null,
        hasFreeTrial: data.hasFreeTrial ?? false,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        loginUsername: data.loginUsername || null,
        loginPassword: data.loginPassword || null,
        notes: data.notes || null,
        slug: data.slug || null,
        videoUrl: data.videoUrl || null,
        detailedDescription: data.detailedDescription || null,
        exclusiveBenefits: data.exclusiveBenefits || [],
        logoUrl: data.logoUrl || null,
        notificationEmail: data.notificationEmail || null,
      });
      
      res.status(201).json(affiliate);
    } catch (error) {
      console.error('Create affiliate error:', error);
      res.status(500).json({ error: "Failed to create affiliate" });
    }
  });

  // Update affiliate (admin and developer) - with Zod validation
  const updateAffiliateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    benefits: z.array(z.string()).optional(),
    referralLink: z.string().min(1).optional(),
    portalUrl: z.string().nullable().optional(),
    categories: z.array(z.string()).min(1, "At least one category is required").optional(),
    iconName: z.string().optional(),
    referralFee: z.string().nullable().optional(),
    referralFeeType: z.string().nullable().optional(),
    costFrom: z.string().nullable().optional(),
    costTo: z.string().nullable().optional(),
    hasFreeTrial: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
    loginUsername: z.string().nullable().optional(),
    loginPassword: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    detailedDescription: z.string().nullable().optional(),
    exclusiveBenefits: z.array(z.string()).optional(),
    logoUrl: z.string().nullable().optional(),
    notificationEmail: z.string().nullable().optional(),
  });
  
  app.put("/api/admin/affiliates/:id", ensureAdminOrDeveloper, async (req, res) => {
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
      if (data.portalUrl !== undefined) updateData.portalUrl = data.portalUrl;
      if (data.categories !== undefined) updateData.categories = data.categories;
      if (data.iconName !== undefined) updateData.iconName = data.iconName;
      if (data.referralFee !== undefined) updateData.referralFee = data.referralFee;
      if (data.referralFeeType !== undefined) updateData.referralFeeType = data.referralFeeType;
      if (data.costFrom !== undefined) updateData.costFrom = data.costFrom;
      if (data.costTo !== undefined) updateData.costTo = data.costTo;
      if (data.hasFreeTrial !== undefined) updateData.hasFreeTrial = data.hasFreeTrial;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.loginUsername !== undefined) updateData.loginUsername = data.loginUsername;
      if (data.loginPassword !== undefined) updateData.loginPassword = data.loginPassword;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
      if (data.detailedDescription !== undefined) updateData.detailedDescription = data.detailedDescription;
      if (data.exclusiveBenefits !== undefined) updateData.exclusiveBenefits = data.exclusiveBenefits;
      if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
      if (data.notificationEmail !== undefined) updateData.notificationEmail = data.notificationEmail;
      
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

  // Toggle affiliate status (admin and developer)
  app.patch("/api/admin/affiliates/:id/status", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }
      
      const updated = await storage.updateAffiliate(id, { isActive });
      
      if (!updated) {
        return res.status(404).json({ error: "Affiliate not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Toggle affiliate status error:', error);
      res.status(500).json({ error: "Failed to update affiliate status" });
    }
  });

  // Delete affiliate (admin and developer)
  app.delete("/api/admin/affiliates/:id", ensureAdminOrDeveloper, async (req, res) => {
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

  // List affiliate categories (admin and developer)
  app.get("/api/admin/affiliate-categories", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const categories = await storage.getAllAffiliateCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get affiliate categories error:', error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Create/update affiliate category (admin and developer) - with Zod validation
  const upsertCategorySchema = z.object({
    id: z.string().min(1, "ID is required"),
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    sortOrder: z.number().optional(),
  });
  
  app.post("/api/admin/affiliate-categories", ensureAdminOrDeveloper, async (req, res) => {
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

  // Delete affiliate category (admin and developer)
  app.delete("/api/admin/affiliate-categories/:id", ensureAdminOrDeveloper, async (req, res) => {
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

  // =====================================
  // Service Regions and Contractors API
  // =====================================
  
  // Public: Get service regions by state
  app.get("/api/service-regions", async (req, res) => {
    try {
      const { state } = req.query;
      if (state && typeof state === 'string') {
        const regions = await storage.getServiceRegionsByState(state.toUpperCase());
        return res.json(regions);
      }
      const regions = await storage.getAllServiceRegions();
      res.json(regions);
    } catch (error) {
      console.error('Get service regions error:', error);
      res.status(500).json({ error: "Failed to fetch service regions" });
    }
  });

  // Public: Search contractors by region
  app.get("/api/contractors/search", async (req, res) => {
    try {
      const { regionId } = req.query;
      if (!regionId || typeof regionId !== 'string') {
        return res.status(400).json({ error: "regionId is required" });
      }
      const contractors = await storage.getContractorsByRegion(regionId);
      res.json(contractors);
    } catch (error) {
      console.error('Search contractors error:', error);
      res.status(500).json({ error: "Failed to search contractors" });
    }
  });

  // =====================================
  // Contractor Invitation Routes
  // =====================================

  // Admin: Send contractor invitation
  app.post("/api/contractors/invite", ensureAdmin, async (req, res) => {
    try {
      const { email, companyName } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      if (!companyName) {
        return res.status(400).json({ error: "Company name is required" });
      }

      const result = await storage.createContractorInvite(email, companyName);
      
      // Send email with invitation link
      const protocol = req.protocol || "https";
      const host = req.get("host") || "localhost:5000";
      const inviteUrl = `${protocol}://${host}/contractor-signup/${result.token}`;
      
      const emailSent = await emailService.sendContractorInvitation(email, companyName, inviteUrl);
      
      res.json({
        message: result.isNewInvite ? "Invitation sent successfully" : "Invitation resent successfully",
        token: result.token,
        inviteUrl: inviteUrl,
        isNewInvite: result.isNewInvite,
        emailSent
      });
    } catch (error) {
      console.error('Contractor invite error:', error);
      res.status(500).json({ error: "Failed to send contractor invitation" });
    }
  });

  // Public: Validate contractor invite token
  app.get("/api/contractors/validate-invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const contractor = await storage.validateContractorInvite(token);

      if (!contractor) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }

      res.json({
        valid: true,
        contractorId: contractor.id,
        email: contractor.email,
        companyName: contractor.companyName,
      });
    } catch (error) {
      console.error('Validate contractor invite error:', error);
      res.status(500).json({ error: "Validation failed" });
    }
  });

  // Public: Accept contractor invite and complete profile
  app.post("/api/contractors/accept-invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { 
        password, 
        name, 
        companyName, 
        phone, 
        website, 
        description, 
        specialties, 
        licenseNumber, 
        licenseNumbers,
        licensedStates,
        isInsured, 
        isBonded,
        serviceRegionIds 
      } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      if (!name) {
        return res.status(400).json({ error: "Contact name is required" });
      }

      if (!serviceRegionIds || !Array.isArray(serviceRegionIds) || serviceRegionIds.length === 0) {
        return res.status(400).json({ error: "At least one service region is required" });
      }

      const contractor = await storage.validateContractorInvite(token);
      if (!contractor) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }

      const updatedContractor = await storage.completeContractorSignup(contractor.id, {
        password,
        name,
        companyName,
        phone,
        website,
        description,
        specialties: specialties || [],
        licenseNumber,
        licenseNumbers: licenseNumbers || {},
        licensedStates: licensedStates || [],
        isInsured: isInsured || false,
        isBonded: isBonded || false,
        serviceRegionIds
      });

      let memberAccountCreated = false;
      try {
        const existingUser = await db.select().from(users).where(eq(users.email, contractor.email)).limit(1);
        if (existingUser.length === 0) {
          const hashedPw = await hashPassword(password);
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let referralCode = '';
          for (let i = 0; i < 8; i++) {
            referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const username = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'contractor';
          let uniqueUsername = username;
          let attempt = 0;
          while (true) {
            const [existing] = await db.select().from(users).where(eq(users.username, uniqueUsername)).limit(1);
            if (!existing) break;
            attempt++;
            uniqueUsername = `${username}${attempt}`;
          }

          const [newUser] = await db.insert(users).values({
            username: uniqueUsername,
            email: contractor.email,
            password: hashedPw,
            role: 'user',
            subscriptionStatus: 'free',
            referralCode,
            isEmailVerified: true,
            termsAcceptedAt: new Date(),
            termsVersion: '1.0',
            privacyVersion: '1.0',
          }).returning();

          await storage.insertSubscriptionEvent({
            userId: newUser.id,
            eventType: 'downgrade_to_free',
            previousPlan: null,
            currentPlan: null,
            previousStatus: null,
            currentStatus: 'free',
            triggeredBy: 'system',
          }).catch(err => console.error('[SubEvent] contractor signup insert error:', err));

          await db.insert(userProfiles).values({
            userId: newUser.id,
            fullName: name,
          });

          memberAccountCreated = true;
          console.log(`[Contractor Signup] Free member account created for contractor ${contractor.email} (user ID: ${newUser.id})`);
        } else {
          console.log(`[Contractor Signup] Member account already exists for ${contractor.email}, skipping creation`);
        }
      } catch (memberError) {
        console.error('[Contractor Signup] Failed to create member account (non-fatal):', memberError);
      }

      res.json({
        message: "Contractor profile created successfully",
        contractor: {
          id: updatedContractor.id,
          name: updatedContractor.name,
          companyName: updatedContractor.companyName,
          email: updatedContractor.email
        },
        memberAccountCreated,
      });
    } catch (error) {
      console.error('Accept contractor invite error:', error);
      res.status(500).json({ error: "Failed to complete signup" });
    }
  });

  // Admin: List all service regions
  app.get("/api/admin/service-regions", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const regions = await storage.getAllServiceRegions();
      res.json(regions);
    } catch (error) {
      console.error('Get all service regions error:', error);
      res.status(500).json({ error: "Failed to fetch service regions" });
    }
  });

  // Admin: Create service region
  app.post("/api/admin/service-regions", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const validationResult = insertServiceRegionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      const region = await storage.createServiceRegion(validationResult.data);
      res.status(201).json(region);
    } catch (error) {
      console.error('Create service region error:', error);
      res.status(500).json({ error: "Failed to create service region" });
    }
  });

  // Admin: Update service region
  app.put("/api/admin/service-regions/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateServiceRegion(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Service region not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error('Update service region error:', error);
      res.status(500).json({ error: "Failed to update service region" });
    }
  });

  // Admin: Delete service region
  app.delete("/api/admin/service-regions/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteServiceRegion(id);
      if (!deleted) {
        return res.status(404).json({ error: "Service region not found" });
      }
      res.json({ success: true, message: "Service region deleted" });
    } catch (error) {
      console.error('Delete service region error:', error);
      res.status(500).json({ error: "Failed to delete service region" });
    }
  });

  // Admin: List all contractors
  app.get("/api/admin/contractors", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const contractors = await storage.getAllContractors();
      // Also get service regions for each contractor
      const contractorsWithRegions = await Promise.all(
        contractors.map(async (contractor) => {
          const regions = await storage.getContractorServiceRegions(contractor.id);
          return { ...contractor, serviceRegions: regions };
        })
      );
      res.json(contractorsWithRegions);
    } catch (error) {
      console.error('Get all contractors error:', error);
      res.status(500).json({ error: "Failed to fetch contractors" });
    }
  });

  // Admin: Get single contractor
  app.get("/api/admin/contractors/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { id } = req.params;
      const contractor = await storage.getContractorById(id);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor not found" });
      }
      const regions = await storage.getContractorServiceRegions(id);
      res.json({ ...contractor, serviceRegions: regions });
    } catch (error) {
      console.error('Get contractor error:', error);
      res.status(500).json({ error: "Failed to fetch contractor" });
    }
  });

  // Admin: Create contractor
  app.post("/api/admin/contractors", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { serviceRegionIds, ...contractorData } = req.body;
      const validationResult = insertContractorSchema.safeParse(contractorData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      const contractor = await storage.createContractor(validationResult.data);
      
      // Set service regions if provided
      if (serviceRegionIds && Array.isArray(serviceRegionIds)) {
        await storage.setContractorServiceRegions(contractor.id, serviceRegionIds);
      }
      
      const regions = await storage.getContractorServiceRegions(contractor.id);
      res.status(201).json({ ...contractor, serviceRegions: regions });
    } catch (error) {
      console.error('Create contractor error:', error);
      res.status(500).json({ error: "Failed to create contractor" });
    }
  });

  // Admin: Update contractor
  app.put("/api/admin/contractors/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { id } = req.params;
      const { serviceRegionIds, ...contractorData } = req.body;
      
      const updated = await storage.updateContractor(id, contractorData);
      if (!updated) {
        return res.status(404).json({ error: "Contractor not found" });
      }
      
      // Update service regions if provided
      if (serviceRegionIds && Array.isArray(serviceRegionIds)) {
        await storage.setContractorServiceRegions(id, serviceRegionIds);
      }
      
      const regions = await storage.getContractorServiceRegions(id);
      res.json({ ...updated, serviceRegions: regions });
    } catch (error) {
      console.error('Update contractor error:', error);
      res.status(500).json({ error: "Failed to update contractor" });
    }
  });

  // Admin: Delete contractor
  app.delete("/api/admin/contractors/:id", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteContractor(id);
      if (!deleted) {
        return res.status(404).json({ error: "Contractor not found" });
      }
      res.json({ success: true, message: "Contractor deleted" });
    } catch (error) {
      console.error('Delete contractor error:', error);
      res.status(500).json({ error: "Failed to delete contractor" });
    }
  });

  // ==========================================
  // Contractor Portal Routes
  // ==========================================

  app.post("/api/contractors/login", (req, res, next) => {
    passport.authenticate("contractor-local", async (err: any, contractor: any | false, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!contractor) {
        return res.status(401).json({ error: info.message || "Invalid credentials" });
      }

      // Check if there's a linked member account (same email)
      const [linkedMember] = await db.select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${contractor.email})`)
        .limit(1);

      if (linkedMember) {
        // Log in as the member user so all member API routes work automatically
        // The /api/auth/me endpoint already sets isContractor: true for linked accounts
        req.login(linkedMember, (err) => {
          if (err) {
            return res.status(500).json({ error: "Login failed" });
          }
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('[Contractor Login] Session save failed:', saveErr);
              return res.status(500).json({ error: "Login failed" });
            }
            res.json({
              _sessionToken: getSignedSessionToken(req),
              contractor: {
                id: contractor.id,
                email: contractor.email,
                name: contractor.name,
                companyName: contractor.companyName,
                agreementSignedAt: contractor.agreementSignedAt,
              },
              linkedMember: true,
            });
          });
        });
      } else {
        // No linked member account - log in as contractor only
        req.login(contractor, (err) => {
          if (err) {
            return res.status(500).json({ error: "Login failed" });
          }
          res.json({
            _sessionToken: getSignedSessionToken(req),
            contractor: {
              id: contractor.id,
              email: contractor.email,
              name: contractor.name,
              companyName: contractor.companyName,
              agreementSignedAt: contractor.agreementSignedAt,
            },
            linkedMember: false,
          });
        });
      }
    })(req, res, next);
  });

  app.post("/api/contractors/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Contractor session destroy error:", destroyErr);
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/contractors/me", ensureContractorAuthenticated, async (req, res) => {
    try {
      // Use linkedContractor from middleware if member session, otherwise use req.user
      const contractor = (req as any).linkedContractor || req.user as any;
      const regions = await storage.getContractorServiceRegions(contractor.id);
      res.json({
        id: contractor.id,
        name: contractor.name,
        companyName: contractor.companyName,
        email: contractor.email,
        phone: contractor.phone,
        website: contractor.website,
        description: contractor.description,
        specialties: contractor.specialties,
        licenseNumber: contractor.licenseNumber,
        licenseNumbers: contractor.licenseNumbers,
        licensedStates: contractor.licensedStates,
        isInsured: contractor.isInsured,
        isBonded: contractor.isBonded,
        referralLink: contractor.referralLink,
        generatedReferralCode: contractor.generatedReferralCode,
        referralClickCount: contractor.referralClickCount,
        isActive: contractor.isActive,
        agreementSignedAt: contractor.agreementSignedAt,
        agreementSignerName: contractor.agreementSignerName,
        agreementSignerTitle: contractor.agreementSignerTitle,
        agreementVersion: contractor.agreementVersion,
        serviceRegions: regions,
      });
    } catch (error) {
      console.error('Get contractor me error:', error);
      res.status(500).json({ error: "Failed to fetch contractor data" });
    }
  });

  app.patch("/api/contractors/profile", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        description: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        licenseNumber: z.string().optional(),
        licenseNumbers: z.record(z.string()).optional(),
        licensedStates: z.array(z.string()).optional(),
        isInsured: z.boolean().optional(),
        isBonded: z.boolean().optional(),
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const updates: Record<string, any> = {};
      const data = parsed.data;
      if (data.name !== undefined) updates.name = data.name;
      if (data.companyName !== undefined) updates.companyName = data.companyName;
      if (data.phone !== undefined) updates.phone = data.phone;
      if (data.website !== undefined) updates.website = data.website;
      if (data.description !== undefined) updates.description = data.description;
      if (data.specialties !== undefined) updates.specialties = data.specialties;
      if (data.licenseNumber !== undefined) updates.licenseNumber = data.licenseNumber;
      if (data.licenseNumbers !== undefined) updates.licenseNumbers = data.licenseNumbers;
      if (data.licensedStates !== undefined) updates.licensedStates = data.licensedStates;
      if (data.isInsured !== undefined) updates.isInsured = data.isInsured;
      if (data.isBonded !== undefined) updates.isBonded = data.isBonded;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      updates.updatedAt = new Date();

      await db.update(contractors).set(updates).where(eq(contractors.id, contractor.id));

      const [updated] = await db.select().from(contractors).where(eq(contractors.id, contractor.id)).limit(1);
      res.json({
        id: updated.id,
        name: updated.name,
        companyName: updated.companyName,
        phone: updated.phone,
        website: updated.website,
        description: updated.description,
        specialties: updated.specialties,
        licenseNumber: updated.licenseNumber,
        licenseNumbers: updated.licenseNumbers,
        licensedStates: updated.licensedStates,
        isInsured: updated.isInsured,
        isBonded: updated.isBonded,
      });
    } catch (error) {
      console.error('Update contractor profile error:', error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/contractors/sign-agreement", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;

      const signatureSchema = z.object({
        signerName: z.string().min(1, "Full name is required"),
        signerTitle: z.string().min(1, "Title is required"),
        companyName: z.string().min(1, "Company name is required"),
      });

      const parsed = signatureSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid signature data", details: parsed.error.errors });
      }

      const forwardedFor = req.headers['x-forwarded-for'];
      const clientIp = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown';

      const [updated] = await db.update(contractors)
        .set({
          agreementSignedAt: new Date(),
          agreementSignerName: parsed.data.signerName,
          agreementSignerTitle: parsed.data.signerTitle,
          agreementVersion: "1.0",
          agreementSignerIp: clientIp,
          companyName: parsed.data.companyName,
          updatedAt: new Date(),
        })
        .where(eq(contractors.id, contractor.id))
        .returning();

      res.json({
        success: true,
        agreementSignedAt: updated.agreementSignedAt,
        agreementVersion: updated.agreementVersion,
      });
    } catch (error) {
      console.error('Sign agreement error:', error);
      res.status(500).json({ error: "Failed to sign agreement" });
    }
  });

  app.put("/api/contractors/profile", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;

      const profileSchema = z.object({
        name: z.string().min(1).optional(),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        description: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        licenseNumber: z.string().optional(),
        licenseNumbers: z.record(z.string(), z.string()).optional(),
        licensedStates: z.array(z.string()).optional(),
        isInsured: z.boolean().optional(),
        isBonded: z.boolean().optional(),
        serviceRegionIds: z.array(z.string()).optional(),
      });

      const parsed = profileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid profile data", details: parsed.error.errors });
      }

      const { serviceRegionIds, ...profileData } = parsed.data;

      const updated = await storage.updateContractor(contractor.id, profileData);

      if (serviceRegionIds && Array.isArray(serviceRegionIds)) {
        await storage.setContractorServiceRegions(contractor.id, serviceRegionIds);
      }

      const regions = await storage.getContractorServiceRegions(contractor.id);
      res.json({ ...updated, serviceRegions: regions });
    } catch (error) {
      console.error('Update contractor profile error:', error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/contractors/generate-referral-code", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;

      const [existingContractor] = await db.select().from(contractors).where(eq(contractors.id, contractor.id)).limit(1);
      if (!existingContractor) {
        return res.status(404).json({ error: "Contractor not found" });
      }

      if (existingContractor.generatedReferralCode) {
        return res.json({
          code: existingContractor.generatedReferralCode,
          clickCount: existingContractor.referralClickCount || 0
        });
      }

      return res.status(400).json({ error: "Referral code is generated automatically during signup" });
    } catch (error) {
      console.error("Error with contractor referral code:", error);
      res.status(500).json({ error: "Failed to retrieve referral code" });
    }
  });

  app.get("/api/contractors/referral-stats", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;
      const [contractorData] = await db.select().from(contractors).where(eq(contractors.id, contractor.id)).limit(1);

      if (!contractorData) {
        return res.status(404).json({ error: "Contractor not found" });
      }

      const docs = await db.select({
        id: contractorDocuments.id,
        userId: contractorDocuments.userId,
        fileName: contractorDocuments.fileName,
        description: contractorDocuments.description,
        createdAt: contractorDocuments.createdAt,
      }).from(contractorDocuments)
        .where(eq(contractorDocuments.contractorId, contractor.id))
        .orderBy(desc(contractorDocuments.createdAt));

      const assignedUserIds = docs.filter(d => d.userId).map(d => d.userId!);
      let assignedUsers: Array<{ id: string; email: string; username: string }> = [];
      if (assignedUserIds.length > 0) {
        assignedUsers = await db.select({
          id: users.id,
          email: users.email,
          username: users.username,
        }).from(users).where(inArray(users.id, assignedUserIds));
      }

      const referredSignups = await db.select({ count: count() }).from(users)
        .where(eq(users.referredBy, `contractor:${contractor.id}`));

      res.json({
        code: contractorData.generatedReferralCode || null,
        clickCount: contractorData.referralClickCount || 0,
        signupCount: Number(referredSignups[0]?.count || 0),
        documentsCount: docs.length,
        assignedUsersCount: assignedUsers.length,
        assignedUsers,
      });
    } catch (error) {
      console.error("Error fetching contractor referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  // Contractor password reset routes
  app.post("/api/contractors/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [contractor] = await db
        .select()
        .from(contractors)
        .where(sql`LOWER(${contractors.email}) = LOWER(${email})`)
        .limit(1);

      if (!contractor) {
        return res.json({ 
          message: "If an account exists with this email, a password reset link will be sent." 
        });
      }

      const resetToken = generateVerificationToken();
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1);

      await db
        .update(contractors)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
        })
        .where(eq(contractors.id, contractor.id));

      await emailService.sendContractorPasswordResetEmail(
        contractor.email,
        contractor.name,
        resetToken
      );

      res.json({ 
        message: "If an account exists with this email, a password reset link will be sent." 
      });
    } catch (error) {
      console.error('Contractor password reset request error:', error);
      res.status(500).json({ error: "Password reset request failed" });
    }
  });

  app.get("/api/contractors/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [contractor] = await db
        .select()
        .from(contractors)
        .where(eq(contractors.passwordResetToken, token))
        .limit(1);

      if (!contractor) {
        return res.status(400).json({ valid: false, error: "Invalid reset token" });
      }
      
      if (contractor.passwordResetExpiry && new Date() > contractor.passwordResetExpiry) {
        return res.status(400).json({ valid: false, error: "Reset token has expired" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error('Contractor token validation error:', error);
      res.status(500).json({ valid: false, error: "Token validation failed" });
    }
  });

  app.post("/api/contractors/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      const [contractor] = await db
        .select()
        .from(contractors)
        .where(eq(contractors.passwordResetToken, token))
        .limit(1);

      if (!contractor) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      if (contractor.passwordResetExpiry && new Date() > contractor.passwordResetExpiry) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const hashedPassword = await hashPassword(password);

      await db
        .update(contractors)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
        })
        .where(eq(contractors.id, contractor.id));

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error('Contractor password reset error:', error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Contractor referral link redirect (public)
  app.get("/api/contractor-ref/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const [contractor] = await db.select().from(contractors)
        .where(eq(contractors.generatedReferralCode, code.toUpperCase()))
        .limit(1);

      if (!contractor) {
        return res.status(404).json({ error: "Invalid referral code" });
      }

      await db.update(contractors)
        .set({ referralClickCount: (contractor.referralClickCount || 0) + 1 })
        .where(eq(contractors.id, contractor.id));

      const protocol = req.protocol || "https";
      const host = req.get("host") || "localhost:5000";
      const baseUrl = `${protocol}://${host}`;
      const destination = contractor.referralLink || `${baseUrl}/register?ref=contractor&code=${code}`;
      res.redirect(destination);
    } catch (error) {
      console.error('Contractor referral redirect error:', error);
      res.status(500).json({ error: "Failed to process referral" });
    }
  });

  // Contractor document management
  app.get("/api/contractors/documents", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;
      const docs = await db.select().from(contractorDocuments)
        .where(eq(contractorDocuments.contractorId, contractor.id))
        .orderBy(desc(contractorDocuments.createdAt));

      const userIds = docs.filter(d => d.userId).map(d => d.userId!);
      let usersMap: Record<string, { email: string; username: string }> = {};
      if (userIds.length > 0) {
        const userRows = await db.select({
          id: users.id,
          email: users.email,
          username: users.username,
        }).from(users).where(inArray(users.id, userIds));
        usersMap = Object.fromEntries(userRows.map(u => [u.id, { email: u.email, username: u.username }]));
      }

      const result = docs.map(d => ({
        id: d.id,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        description: d.description,
        createdAt: d.createdAt,
        userId: d.userId,
        assignedUser: d.userId ? usersMap[d.userId] || null : null,
      }));

      res.json(result);
    } catch (error) {
      console.error('Get contractor documents error:', error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/contractors/documents", ensureContractorAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return res.status(400).json({ error: "File size exceeds 10MB limit" });
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: "File type not allowed. Accepted: PDF, DOC, DOCX, JPG, PNG" });
      }

      const fileData = file.buffer.toString('base64');
      const { description, userId } = req.body;

      if (userId) {
        const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
          return res.status(400).json({ error: "Assigned user not found" });
        }
      }

      const [doc] = await db.insert(contractorDocuments).values({
        contractorId: contractor.id,
        userId: userId || null,
        fileName: file.originalname,
        fileData,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: description || null,
      }).returning();

      res.status(201).json({
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        description: doc.description,
        userId: doc.userId,
        createdAt: doc.createdAt,
      });
    } catch (error) {
      console.error('Upload contractor document error:', error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/contractors/documents/:docId/download", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;
      const { docId } = req.params;

      const [doc] = await db.select().from(contractorDocuments)
        .where(and(
          eq(contractorDocuments.id, docId),
          eq(contractorDocuments.contractorId, contractor.id)
        ))
        .limit(1);

      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      const buffer = Buffer.from(doc.fileData, 'base64');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
    } catch (error) {
      console.error('Download contractor document error:', error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  app.delete("/api/contractors/documents/:docId", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;
      const { docId } = req.params;

      const [doc] = await db.select({ id: contractorDocuments.id }).from(contractorDocuments)
        .where(and(
          eq(contractorDocuments.id, docId),
          eq(contractorDocuments.contractorId, contractor.id)
        ))
        .limit(1);

      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      await db.delete(contractorDocuments).where(eq(contractorDocuments.id, docId));
      res.json({ success: true, message: "Document deleted" });
    } catch (error) {
      console.error('Delete contractor document error:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.patch("/api/contractors/documents/:docId/assign", ensureContractorAuthenticated, async (req, res) => {
    try {
      const contractor = (req as any).linkedContractor || req.user as any;
      const { docId } = req.params;
      const { userId } = req.body;

      const [doc] = await db.select({ id: contractorDocuments.id }).from(contractorDocuments)
        .where(and(
          eq(contractorDocuments.id, docId),
          eq(contractorDocuments.contractorId, contractor.id)
        ))
        .limit(1);

      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (userId) {
        const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
          return res.status(400).json({ error: "User not found" });
        }
      }

      await db.update(contractorDocuments)
        .set({ userId: userId || null })
        .where(eq(contractorDocuments.id, docId));

      res.json({ success: true, message: userId ? "Document assigned to user" : "Document unassigned" });
    } catch (error) {
      console.error('Assign contractor document error:', error);
      res.status(500).json({ error: "Failed to assign document" });
    }
  });

  // Contractor: search users by email for document assignment
  app.get("/api/contractors/search-users", ensureContractorAuthenticated, async (req, res) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== 'string' || email.length < 3) {
        return res.json([]);
      }

      const matchedUsers = await db.select({
        id: users.id,
        email: users.email,
        username: users.username,
      }).from(users)
        .where(sql`LOWER(${users.email}) LIKE LOWER(${'%' + email + '%'})`)
        .limit(10);

      res.json(matchedUsers);
    } catch (error) {
      console.error('Search users for contractor error:', error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Site Settings endpoints
  app.get("/api/admin/settings/:key", ensureAdminReadAccess, async (req, res) => {
    try {
      const value = await storage.getSiteSetting(req.params.key);
      res.json({ key: req.params.key, value });
    } catch (error) {
      console.error('Get site setting error:', error);
      res.status(500).json({ error: "Failed to get setting" });
    }
  });

  app.post("/api/admin/settings", ensureAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: "Key and value are required" });
      }
      const setting = await storage.setSiteSetting(key, String(value));
      res.json(setting);
    } catch (error) {
      console.error('Set site setting error:', error);
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  // Public endpoint to check demo mode
  app.get("/api/settings/demo-mode", async (req, res) => {
    try {
      const value = await storage.getSiteSetting("demo_mode");
      res.json({ enabled: value === "true" });
    } catch (error) {
      res.json({ enabled: false });
    }
  });

  // Public Demo Token Validation
  app.post("/api/demo/validate", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ valid: false, error: "Token is required" });
      }
      
      const demoToken = await storage.getDemoTokenByToken(token);
      
      if (!demoToken) {
        return res.status(404).json({ valid: false, error: "Invalid demo link" });
      }
      
      if (demoToken.status === 'revoked') {
        return res.status(403).json({ valid: false, error: "This demo link has been revoked" });
      }
      
      if (new Date() > new Date(demoToken.expiresAt)) {
        return res.status(403).json({ valid: false, error: "This demo link has expired" });
      }
      
      // Record usage
      await storage.recordDemoTokenUsage(token);
      
      // Set a demo session cookie
      res.cookie('demo_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      res.json({ 
        valid: true,
        contactName: demoToken.contactName,
        expiresAt: demoToken.expiresAt,
      });
    } catch (error) {
      console.error('Demo token validation error:', error);
      res.status(500).json({ valid: false, error: "Failed to validate demo link" });
    }
  });

  // Check current demo session status
  app.get("/api/demo/session", async (req, res) => {
    try {
      const token = req.cookies?.demo_token;
      
      if (!token) {
        return res.json({ active: false });
      }
      
      const demoToken = await storage.getDemoTokenByToken(token);
      
      if (!demoToken || demoToken.status === 'revoked' || new Date() > new Date(demoToken.expiresAt)) {
        // Clear invalid cookie
        res.clearCookie('demo_token');
        return res.json({ active: false });
      }
      
      res.json({ 
        active: true,
        contactName: demoToken.contactName,
        expiresAt: demoToken.expiresAt,
      });
    } catch (error) {
      console.error('Demo session check error:', error);
      res.json({ active: false });
    }
  });

  // End demo session
  app.post("/api/demo/logout", async (req, res) => {
    res.clearCookie('demo_token');
    res.json({ success: true });
  });

  // Training Videos endpoints
  app.get("/api/training-videos", async (req, res) => {
    try {
      const videos = await storage.getActiveTrainingVideos();
      res.json(videos);
    } catch (error) {
      console.error('Get training videos error:', error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/admin/training-videos", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const videos = await storage.getAllTrainingVideos();
      res.json(videos);
    } catch (error) {
      console.error('Get all training videos error:', error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  const trainingVideoSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    youtubeUrl: z.string().url("Must be a valid URL"),
    thumbnailUrl: z.string().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
  });

  app.post("/api/admin/training-videos", ensureAdmin, async (req, res) => {
    try {
      const validationResult = trainingVideoSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      const video = await storage.createTrainingVideo(validationResult.data);
      res.json(video);
    } catch (error) {
      console.error('Create training video error:', error);
      res.status(500).json({ error: "Failed to create video" });
    }
  });

  app.put("/api/admin/training-videos/:id", ensureAdmin, async (req, res) => {
    try {
      const validationResult = trainingVideoSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        });
      }
      const video = await storage.updateTrainingVideo(req.params.id, validationResult.data);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error('Update training video error:', error);
      res.status(500).json({ error: "Failed to update video" });
    }
  });

  app.delete("/api/admin/training-videos/:id", ensureAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteTrainingVideo(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json({ success: true, message: "Video deleted" });
    } catch (error) {
      console.error('Delete training video error:', error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // Data health check endpoint (admin and developer) - returns counts of key data
  app.get("/api/admin/data-health", ensureAdminOrDeveloper, async (req, res) => {
    try {
      const allAffiliates = await storage.getAllAffiliates();
      const allCategories = await storage.getAllAffiliateCategories();
      const allLenders = await storage.getAllLenders();
      const allProducts = await storage.getAllActiveLoanProducts();
      const allVideos = await storage.getAllTrainingVideos();
      
      const activeAffiliates = allAffiliates.filter(a => a.isActive);
      
      const health = {
        affiliates: allAffiliates.length,
        activeAffiliates: activeAffiliates.length,
        affiliateCategories: allCategories.length,
        lenders: allLenders.length,
        loanProducts: allProducts.length,
        trainingVideos: allVideos.length,
        hasIssues: allAffiliates.length === 0 || allCategories.length === 0 || allLenders.length === 0 || allProducts.length === 0,
        missingData: [] as string[]
      };
      
      if (allAffiliates.length === 0) health.missingData.push('affiliates');
      if (allCategories.length === 0) health.missingData.push('affiliateCategories');
      if (allLenders.length === 0) health.missingData.push('lenders');
      if (allProducts.length === 0) health.missingData.push('loanProducts');
      
      res.json(health);
    } catch (error) {
      console.error('Data health check error:', error);
      res.status(500).json({ error: "Failed to check data health" });
    }
  });

  // Seed database endpoint (admin only) - populates baseline data with transaction support
  app.post("/api/admin/seed-database", ensureAdmin, async (req, res) => {
    try {
      const results = {
        affiliateCategories: { added: 0, skipped: 0 },
        affiliates: { added: 0, skipped: 0 },
        lenders: { added: 0, skipped: 0, id: '' },
        loanProducts: { added: 0, skipped: 0 },
        trainingVideos: { added: 0, skipped: 0 }
      };

      // Fetch existing data for duplicate detection using natural keys
      const existingCategories = await storage.getAllAffiliateCategories();
      const existingCategoryNames = new Set(existingCategories.map(c => c.name.toLowerCase()));
      
      const existingAffiliates = await storage.getAllAffiliates();
      const existingAffiliateNames = new Set(existingAffiliates.map(a => a.name.toLowerCase()));
      
      const existingLenders = await storage.getAllLenders();
      const existingLenderEmails = new Set(existingLenders.map((l: any) => l.email?.toLowerCase()));
      
      const existingProducts = await storage.getAllActiveLoanProducts();
      const existingProductKeys = new Set(existingProducts.map(p => `${p.lenderId}:${p.productName.toLowerCase()}`));

      // Seed affiliate categories first (natural key: name)
      for (const category of seedAffiliateCategories) {
        if (existingCategoryNames.has(category.name.toLowerCase())) {
          results.affiliateCategories.skipped++;
        } else {
          await storage.upsertAffiliateCategory(category);
          results.affiliateCategories.added++;
        }
      }

      // Seed affiliates (natural key: name)
      for (const affiliate of seedAffiliates) {
        if (existingAffiliateNames.has(affiliate.name.toLowerCase())) {
          results.affiliates.skipped++;
        } else {
          await db.insert(affiliates).values({
            id: affiliate.id,
            name: affiliate.name,
            description: affiliate.description,
            benefits: affiliate.benefits,
            referralLink: affiliate.referralLink,
            categories: affiliate.categories,
            features: affiliate.features || [],
            iconName: affiliate.iconName,
            isActive: affiliate.isActive,
            sortOrder: affiliate.sortOrder,
            contactEmail: affiliate.contactEmail || null,
          }).onConflictDoNothing();
          results.affiliates.added++;
        }
      }

      // Seed lenders (natural key: email) - must insert before loan products
      let insertedLenderId: string | null = null;
      for (const lender of seedLenders) {
        if (existingLenderEmails.has(lender.email.toLowerCase())) {
          // Find the existing lender ID to use for loan products
          const existingLender = existingLenders.find((l: any) => l.email?.toLowerCase() === lender.email.toLowerCase());
          if (existingLender) {
            insertedLenderId = existingLender.id;
          }
          results.lenders.skipped++;
        } else {
          const [newLender] = await db.insert(lenders).values({
            companyName: lender.companyName,
            email: lender.email,
            password: await hashPassword('TempPassword123!'),
            contactName: lender.contactName,
            phone: lender.phone || null,
            website: lender.website || null,
            companyDescription: lender.companyDescription || null,
            referralLink: lender.referralLink || null,
            referralAmount: lender.referralAmount || "0",
            referralType: lender.referralType || "%",
            isPreferred: lender.isPreferred,
            inviteAccepted: lender.inviteAccepted,
            archived: false,
          }).onConflictDoNothing().returning();
          if (newLender) {
            insertedLenderId = newLender.id;
            results.lenders.added++;
          }
        }
        results.lenders.id = insertedLenderId || '';
      }

      // Seed loan products (natural key: lenderId + productName)
      // Only seed if we have a valid lender ID
      if (insertedLenderId) {
        for (const product of seedLoanProducts) {
          const productKey = `${insertedLenderId}:${product.productName.toLowerCase()}`;
          if (existingProductKeys.has(productKey)) {
            results.loanProducts.skipped++;
          } else {
            await db.insert(loanProducts).values({
              id: product.id,
              lenderId: insertedLenderId, // Use actual lender ID
              productName: product.productName,
              loanType: product.loanType,
              newInvestorOk: product.newInvestorOk,
              minCreditScore: product.minCreditScore || null,
              maxLtvBuy: product.maxLtvBuy || null,
              maxLendRehab: product.maxLendRehab || null,
              interestRate: product.interestRate || null,
              interestDeferred: product.interestDeferred,
              drawnFundsOnly: product.drawnFundsOnly,
              points: product.points || null,
              pointsDeferred: product.pointsDeferred,
              maxLoanArv: product.maxLoanArv || null,
              appraisalRequired: product.appraisalRequired,
              estimatedAppraisalCost: product.estimatedAppraisalCost || null,
              fees: product.fees || null,
              costPerDraw: product.costPerDraw || null,
              isActive: product.isActive,
              timeToClose: product.timeToClose || null,
              cashOutOk: product.cashOutOk,
              cashOutMaxLtv: product.cashOutMaxLtv || null,
              referralLink: product.referralLink || null,
              loanTermYears: product.loanTermYears || null,
              minDscrRequired: product.minDscrRequired || null,
              isLtcWeighted: product.isLtcWeighted,
              maxLtcPercent: product.maxLtcPercent || null,
            }).onConflictDoNothing();
            results.loanProducts.added++;
          }
        }
      }

      // Seed training videos (natural key: title)
      const existingVideos = await db.select().from(trainingVideos);
      const existingVideoTitles = new Set(existingVideos.map(v => v.title.toLowerCase()));
      
      for (const video of seedTrainingVideos) {
        if (existingVideoTitles.has(video.title.toLowerCase())) {
          results.trainingVideos.skipped++;
        } else {
          await db.insert(trainingVideos).values({
            id: video.id,
            title: video.title,
            description: video.description,
            youtubeUrl: video.youtubeUrl,
            thumbnailUrl: video.thumbnailUrl || null,
            isFeatured: video.isFeatured,
            isActive: video.isActive,
            sortOrder: video.sortOrder,
          }).onConflictDoNothing();
          results.trainingVideos.added++;
        }
      }

      const totalAdded = results.affiliateCategories.added + results.affiliates.added + 
                         results.lenders.added + results.loanProducts.added + results.trainingVideos.added;
      const totalSkipped = results.affiliateCategories.skipped + results.affiliates.skipped + 
                           results.lenders.skipped + results.loanProducts.skipped + results.trainingVideos.skipped;

      res.json({
        success: true,
        message: `Seeding complete: ${totalAdded} records added, ${totalSkipped} already existed`,
        results
      });
    } catch (error) {
      console.error('Seed database error:', error);
      res.status(500).json({ error: "Failed to seed database", details: String(error) });
    }
  });

  // Note: Sync endpoints were removed. Production data is protected by point-in-time restore.
  // Seed database endpoint above is only for initial population of empty databases.

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

  // Validate auditor invite code (public - for registration page)
  app.get("/api/auditor-invites/validate/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const invite = await storage.getAuditorInviteByCode(code.toUpperCase());
      
      if (!invite) {
        return res.json({ valid: false, reason: "Invalid code" });
      }
      
      if (invite.status !== 'pending') {
        return res.json({ valid: false, reason: "Code has already been used" });
      }
      
      if (new Date() > invite.expiresAt) {
        return res.json({ valid: false, reason: "Code has expired" });
      }
      
      res.json({ valid: true, email: invite.email, companyName: invite.companyName });
    } catch (error) {
      console.error('Validate auditor code error:', error);
      res.status(500).json({ error: "Failed to validate code" });
    }
  });

  // Track affiliate click (available to logged in users and guests)
  app.post("/api/affiliate-clicks", async (req, res) => {
    try {
      const { affiliateId, affiliateName, category, source } = req.body;
      
      if (!affiliateId || !affiliateName || !category) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const userId = req.isAuthenticated() ? (req.user as User).id : null;
      const referrer = req.get('referer') || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      const userAgent = req.get('user-agent') || null;
      
      await storage.trackAffiliateClick({
        userId,
        affiliateId,
        affiliateName,
        category,
        source: source || 'website',
        referrer: referrer ?? undefined,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      });

      // Send notification email to affiliate if configured
      const affiliate = await storage.getAffiliateById(affiliateId);
      if (affiliate?.notificationEmail) {
        try {
          await emailService.sendAffiliateClickNotification(
            affiliate.notificationEmail,
            affiliate.name,
            source || 'website',
            referrer
          );
        } catch (emailError) {
          console.error('Failed to send affiliate click notification:', emailError);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Track affiliate click error:', error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // Redirect route for affiliate links - /go/[slug]
  app.get("/go/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const affiliate = await storage.getAffiliateBySlug(slug);
      
      if (!affiliate || !affiliate.isActive) {
        return res.status(404).send("Affiliate not found");
      }

      const userId = req.isAuthenticated() ? (req.user as User).id : null;
      const referrer = req.get('referer') || null;
      const ipAddress = req.ip || req.socket.remoteAddress || null;
      const userAgent = req.get('user-agent') || null;

      // Track the click
      await storage.trackAffiliateClick({
        userId,
        affiliateId: affiliate.id,
        affiliateName: affiliate.name,
        category: affiliate.categories[0] || 'general',
        source: 'redirect',
        referrer: referrer ?? undefined,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      });

      // Send notification email if configured
      if (affiliate.notificationEmail) {
        try {
          await emailService.sendAffiliateClickNotification(
            affiliate.notificationEmail,
            affiliate.name,
            'redirect',
            referrer
          );
        } catch (emailError) {
          console.error('Failed to send affiliate click notification:', emailError);
        }
      }

      // Redirect to the affiliate's referral link
      res.redirect(affiliate.referralLink);
    } catch (error) {
      console.error('Affiliate redirect error:', error);
      res.status(500).send("Error processing redirect");
    }
  });

  // Public affiliate report page (accessed via secure token)
  app.get("/api/affiliate-report/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const affiliate = await storage.getAffiliateByReportToken(token);
      
      if (!affiliate) {
        return res.status(404).json({ error: "Report not found" });
      }

      const clicks = await storage.getAffiliateClicksForAffiliate(affiliate.id);
      
      // Calculate stats
      const totalClicks = clicks.length;
      const last30Days = clicks.filter(c => 
        c.createdAt && new Date(c.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      const last7Days = clicks.filter(c => 
        c.createdAt && new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      // Group by source
      const bySource: Record<string, number> = {};
      clicks.forEach(c => {
        const source = c.source || 'unknown';
        bySource[source] = (bySource[source] || 0) + 1;
      });

      res.json({
        affiliateName: affiliate.name,
        totalClicks,
        last30Days,
        last7Days,
        bySource,
        recentClicks: clicks.slice(0, 50).map(c => ({
          date: c.createdAt,
          source: c.source,
          referrer: c.referrer,
        })),
      });
    } catch (error) {
      console.error('Affiliate report error:', error);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // Admin: Generate report token for affiliate
  app.post("/api/admin/affiliates/:id/generate-report-token", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const token = await storage.generateAffiliateReportToken(id);
      res.json({ token, reportUrl: `/affiliate-report/${token}` });
    } catch (error) {
      console.error('Generate report token error:', error);
      res.status(500).json({ error: "Failed to generate report token" });
    }
  });

  // Lender Company Info Routes
  app.post("/api/lender-company-info", ensureLenderOrAdmin, async (req, res) => {
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
      const data = insertPropertySchema.parse({...req.body, userId}) as any;

      const dealAnalysis = await storage.createDealAnalysis(data);
      
      // Trigger outbound webhooks for deal analysis created (fire and forget)
      const user = req.user as User;
      outboundWebhookService.triggerWebhooks('deal_analysis_created', {
        dealId: dealAnalysis.id,
        userId: user.id,
        email: user.email,
        propertyAddress: req.body.address,
        propertyType: req.body.propertyType,
        analysisType: req.body.analysisType,
        purchasePrice: req.body.purchasePrice,
        arv: req.body.arv,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('[Webhook] deal_analysis_created trigger error:', err));
      
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
      const user = req.user as User;
      if (user.subscriptionStatus === 'free') {
        return res.status(403).json({ error: "Upgrade to access your deal analyses", upgradeRequired: true });
      }
      const deals = await storage.getDealAnalysesByUser(user.id);
      res.json(deals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deal analyses" });
    }
  });

  app.get("/api/deal-analyses/:dealId", ensureAuthenticated, async (req, res) => {
    try {
      const { dealId } = req.params;
      const user = req.user as User;
      const userId = user.id;

      if (user.subscriptionStatus === 'free') {
        return res.status(403).json({ error: "Upgrade to access your deal analyses", upgradeRequired: true });
      }

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
      // Granular Closing Costs (Buy) components — flat dollar amounts
      attorneyFees: z.number().optional(),
      titleExam: z.number().optional(),
      titleInsurance: z.number().optional(),
      transferFee: z.number().optional(),
      // Granular Carrying Costs components — project-period totals (already multiplied by projectLength where applicable)
      insurance: z.number().optional(),
      utilities: z.number().optional(),
      hoaMonthly: z.number().optional(),
      taxes: z.number().optional(),
      other: z.number().optional(),
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
      drawnFundsOnly: z.boolean().optional(),
      maxLendBuy: z.number().optional(), // Max % Lend on Purchase
      maxLendRehab: z.number().optional(), // Max % Lend on Rehab
      maxLoanToArv: z.number(),
      appraisalRequired: z.boolean().optional(),
      appraisalFee: z.number().optional(),
      drawFees: z.number().optional(),
      loanDocPrepFees: z.number().optional(),
    }).optional(),
    numberOfDraws: z.number().default(3),
    excludeProductIds: z.array(z.string()).optional(),
    investorProfile: z.object({
      creditScoreRange: z.enum(['below-600', '600-649', '650-699', '700-749', '750+']).optional(),
      isNewInvestor: z.boolean().optional(),
    }).optional(),
  });

  app.post("/api/deal-analysis/results", async (req, res) => {
    try {
      const validatedData = dealAnalysisResultsSchema.parse(req.body);
      const { dealInputs, criteriaSelection, userLoan, numberOfDraws, excludeProductIds, investorProfile } = validatedData;
      
      // Check if user is authenticated and is a subscriber
      // isSubscriber = admin role OR subscriptionStatus is active/referral_trial/comped
      const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
      const user = req.user as any;
      const isSubscriber = isAuthenticated && (
        user?.role === 'admin' || 
        ['active', 'cancelling', 'referral_trial', 'comped'].includes(user?.subscriptionStatus)
      );

      const { purchasePrice, rehabBudget, arv, projectLength, closingCostsBuy, carryingCosts, sellPrice, closingCostsSell, commission } = dealInputs;
      // Granular cost components (defaulted to 0 when client omits them)
      const attorneyFees = dealInputs.attorneyFees || 0;
      const titleExam = dealInputs.titleExam || 0;
      const titleInsurance = dealInputs.titleInsurance || 0;
      const transferFee = dealInputs.transferFee || 0;
      const insuranceTotal = dealInputs.insurance || 0;
      const utilitiesTotal = dealInputs.utilities || 0;
      const hoaMonthlyTotal = dealInputs.hoaMonthly || 0;
      const taxesTotal = dealInputs.taxes || 0;
      const otherCarryingTotal = dealInputs.other || 0;
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
        console.log('[USER LOAN DEBUG] Received userLoan:', JSON.stringify(userLoan, null, 2));
        
        // Get user loan LTV parameters (with sensible defaults)
        const userMaxLtvBuy = userLoan.maxLendBuy || 80; // Default 80% if not specified
        const userMaxLendRehab = userLoan.maxLendRehab || 100; // Default 100% if not specified
        const userMaxLoanArv = userLoan.maxLoanToArv || 70; // Default 70% if not specified
        
        console.log('[USER LOAN DEBUG] LTV params:', { userMaxLtvBuy, userMaxLendRehab, userMaxLoanArv });
        
        // Calculate loan components based on user's entered terms
        const purchaseLoanAmount = Math.round(purchasePrice * (userMaxLtvBuy / 100) * 100) / 100;
        const rehabLoanAmount = Math.round(rehabBudget * (userMaxLendRehab / 100) * 100) / 100;
        const totalLoanDesired = purchaseLoanAmount + rehabLoanAmount;
        
        // Calculate ARV cap
        const maxFromArv = Math.round(arv * (userMaxLoanArv / 100) * 100) / 100;
        
        // Final loan amount is the lesser of desired vs ARV cap
        const loanAmount = Math.min(totalLoanDesired, maxFromArv);
        
        // Calculate down payment using component breakdown (same as lender calculation)
        const userBuyDownPayment = Math.round(purchasePrice * (1 - userMaxLtvBuy / 100) * 100) / 100;
        const userRehabDownPayment = Math.round(rehabBudget * (1 - userMaxLendRehab / 100) * 100) / 100;
        const userArvAdjustment = Math.round(Math.max(0, totalLoanDesired - maxFromArv) * 100) / 100;
        const downPayment = Math.round((userBuyDownPayment + userRehabDownPayment + userArvAdjustment) * 100) / 100;
        
        console.log('[USER LOAN DEBUG] Down payment breakdown:', {
          purchasePrice, rehabBudget, arv,
          purchaseLoanAmount, rehabLoanAmount, totalLoanDesired, maxFromArv, loanAmount,
          userBuyDownPayment, userRehabDownPayment, userArvAdjustment, downPayment
        });
        
        const pointsCost = loanAmount * (userLoan.points / 100);
        const drawSchedule = calculateDrawSchedule(projectLength, numberOfDraws);
        const buyInterest = calculateBuyLoanInterest(purchaseLoanAmount, userLoan.interestRate, projectLength, userLoan.interestDeferred || false);
        const rehabInterest = calculateRehabLoanInterest(rehabLoanAmount, userLoan.interestRate, projectLength, userLoan.drawnFundsOnly || false, drawSchedule);
        console.log('[DRAWN FUNDS DEBUG][user-loan] drawnFundsOnly:', userLoan.drawnFundsOnly || false, 'rehabInterest:', rehabInterest, 'buyInterest:', buyInterest, 'rehabLoanAmount:', rehabLoanAmount, 'purchaseLoanAmount:', purchaseLoanAmount, 'rate:', userLoan.interestRate, 'months:', projectLength);
        const interestCost = buyInterest + rehabInterest;
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
          // Down payment component breakdown for debugging/display
          buyDownPayment: userBuyDownPayment,
          rehabDownPayment: userRehabDownPayment,
          arvAdjustment: userArvAdjustment,
          baseClosingCosts: closingCostsBuy,
          pointsCost: upfrontPointsCost,
          totalPointsCost: pointsCost,
          pointsDeferred: userLoan.pointsDeferred || false,
          appraisalCost,
          docPrepFee: docPrepFees,
          lenderFees: drawFeesCost,
          totalClosingCostsBuy: totalClosingCostsBuyUser + drawFeesCost,
          carryingCosts: userLoanCarryingCosts,
          // Granular Closing Costs (Buy) components
          attorneyFees,
          titleExam,
          titleInsurance,
          transferFee,
          // Granular Carrying Costs components (project-period totals)
          insurance: insuranceTotal,
          utilities: utilitiesTotal,
          hoaMonthly: hoaMonthlyTotal,
          taxes: taxesTotal,
          other: otherCarryingTotal,
          total: outOfPocket,
        };
        
        userLoanColumn = {
          type: 'user-loan' as const,
          interestRate: userLoan.interestRate,
          points: userLoan.points,
          interestDeferred: userLoan.interestDeferred || false,
          pointsDeferred: userLoan.pointsDeferred || false,
          drawnFundsOnly: userLoan.drawnFundsOnly || false,
          maxLtvBuy: userMaxLtvBuy,
          maxLendRehab: userMaxLendRehab,
          maxLoanArv: userMaxLoanArv,
          totalLoanAmount: loanAmount,
          purchaseLoanAmount: purchaseLoanAmount,
          rehabLoanAmount: rehabLoanAmount,
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

      // For non-subscribers, check monthly loan analysis quota (2/month for free users)
      if (!isSubscriber) {
        if (isAuthenticated && user) {
          const usageResult = await storage.incrementUserLoanAnalysis(user.id);
          if (!usageResult.canAnalyze) {
            res.json({
              cashSaleColumn,
              userLoanColumn,
              lenderColumns: [],
              criteriaUsed: criteriaSelection,
              numberOfDraws,
              allRankedProducts: 0,
              code: 'LOAN_ANALYSIS_QUOTA_EXCEEDED',
            });
            return;
          }
          // canAnalyze is true — fall through to full lender response below
        } else {
          // Unauthenticated visitor — no lender columns
          res.json({
            cashSaleColumn,
            userLoanColumn,
            lenderColumns: [],
            criteriaUsed: criteriaSelection,
            numberOfDraws,
            allRankedProducts: 0,
          });
          return;
        }
      }

      // Get active loan products and filter (only for subscribers)
      const allProducts = await storage.getAllActiveLoanProducts();
      const allLenders = await storage.getAllLenders();
      
      // Create lender lookup map
      const lenderMap = new Map<string, any>();
      allLenders.forEach(lender => {
        lenderMap.set(lender.id || lender.lenderId, lender);
      });

      // Convert investor credit score range to effective numeric score (midpoint approach)
      const creditScoreRangeToEffective = (range: string | null | undefined): number | null => {
        if (!range) return null;
        switch (range) {
          case 'below-600': return 575;
          case '600-649': return 624;
          case '650-699': return 674;
          case '700-749': return 724;
          case '750+': return 750;
          default: return null;
        }
      };
      const effectiveCreditScore = creditScoreRangeToEffective(investorProfile?.creditScoreRange);
      const investorIsNew = investorProfile?.isNewInvestor;

      // Filter products (exclude specified, only bridge/hard money for now)
      let filteredProducts = allProducts.filter(p => {
        if (excludeProductIds?.includes(p.id)) return false;
        if (p.loanType !== 'bridge') return false;
        // Credit score filter: hide products whose minimum exceeds the investor's effective score
        if (effectiveCreditScore !== null && p.minCreditScore !== null && p.minCreditScore !== undefined && p.minCreditScore > effectiveCreditScore) return false;
        // New investor filter: hide products not open to new investors when investor is new
        if (investorIsNew === true && !p.newInvestorOk) return false;
        return true;
      });

      // Calculate columns for each lender product
      const lenderColumns = filteredProducts.map(product => {
        const maxLtvBuy = parseFloat(String(product.maxLtvBuy || 0));
        const maxLendRehab = parseFloat(String(product.maxLendRehab ?? 100)); // Default 100% rehab coverage, but preserve explicit 0
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
        const drawSchedule = calculateDrawSchedule(projectLength, numberOfDraws);
        const buyInterest = calculateBuyLoanInterest(purchaseLoanAmount, interestRate, projectLength, product.interestDeferred || false);
        const rehabInterest = calculateRehabLoanInterest(rehabLoanAmount, interestRate, projectLength, product.drawnFundsOnly || false, drawSchedule);
        console.log('[DRAWN FUNDS DEBUG][lender]', product.productName, 'drawnFundsOnly:', product.drawnFundsOnly || false, 'rehabInterest:', rehabInterest, 'buyInterest:', buyInterest, 'rehabLoanAmount:', rehabLoanAmount, 'purchaseLoanAmount:', purchaseLoanAmount, 'rate:', interestRate, 'months:', projectLength);
        const interestCost = buyInterest + rehabInterest;
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
        const buyDownPayment = Math.round(purchasePrice * (1 - maxLtvBuy / 100) * 100) / 100;
        const rehabDownPayment = Math.round(rehabBudget * (1 - maxLendRehab / 100) * 100) / 100;
        const arvAdjustment = Math.round(Math.max(0, totalLoanDesired - maxFromArv) * 100) / 100;
        // Also check LTC adjustment if applicable
        const ltcAdjustment = (isLtcWeighted && maxLtcPercent) ? Math.round(Math.max(0, totalLoanDesired - maxFromLtc) * 100) / 100 : 0;
        // Final down payment is the sum of components, taking the larger of ARV or LTC adjustment
        const capAdjustment = Math.max(arvAdjustment, ltcAdjustment);
        const downPaymentLender = Math.round((buyDownPayment + rehabDownPayment + capAdjustment) * 100) / 100;
        
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
        // Lender fees (draw fees) separated from doc prep fees for clarity
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
          docPrepFee: fees, // Lender's doc prep / admin fees from product.fees
          lenderFees: drawFeesCost, // Draw fees only
          totalClosingCostsBuy: totalClosingCostsBuyLender + drawFeesCost,
          carryingCosts: lenderCarryingCosts,
          // Granular Closing Costs (Buy) components
          attorneyFees,
          titleExam,
          titleInsurance,
          transferFee,
          // Granular Carrying Costs components (project-period totals)
          insurance: insuranceTotal,
          utilities: utilitiesTotal,
          hoaMonthly: hoaMonthlyTotal,
          taxes: taxesTotal,
          other: otherCarryingTotal,
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
          referralLink: product.referralLink || lender?.referralLink || null,
          interestRate,
          maxLtvBuy,
          maxLendRehab,
          points,
          interestDeferred: product.interestDeferred || false,
          pointsDeferred: product.pointsDeferred || false,
          drawnFundsOnly: product.drawnFundsOnly || false,
          isLtcWeighted,
          maxLtcPercent,
          isLtcAdjusted,
          effectiveBuyPercent,
          totalLoanAmount: loanAmount,
          purchaseLoanAmount: purchaseLoanAmount,
          rehabLoanAmount: rehabLoanAmount,
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
          isPreferred: lender?.isPreferred || false,
        };
      });

      // Sort by criteria - preferred lenders first, then by user's selected criteria
      const sortedLenderColumns = lenderColumns.sort((a, b) => {
        // Preferred lenders always come first
        if (a.isPreferred !== b.isPreferred) {
          return b.isPreferred ? 1 : -1;
        }
        
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
      const { state, creditScoreRange, isNewInvestor } = req.query;

      // Convert investor credit score range to effective numeric score (midpoint approach)
      const creditScoreRangeToEffective = (range: string | null | undefined): number | null => {
        if (!range) return null;
        switch (range) {
          case 'below-600': return 575;
          case '600-649': return 624;
          case '650-699': return 674;
          case '700-749': return 724;
          case '750+': return 750;
          default: return null;
        }
      };
      const effectiveCreditScore = creditScoreRangeToEffective(typeof creditScoreRange === 'string' ? creditScoreRange : null);
      const investorIsNew = isNewInvestor === 'true';
      
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
      // Also apply credit score and new investor eligibility filters when provided
      const dscrProducts = allProducts.filter(p => {
        if (p.loanType !== 'dscr-purchase' && p.loanType !== 'dscr-refi') return false;
        if (effectiveCreditScore !== null && p.minCreditScore !== null && p.minCreditScore !== undefined && p.minCreditScore > effectiveCreditScore) return false;
        if (investorIsNew && !p.newInvestorOk) return false;
        return true;
      });
      
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

  // Get user property lookup usage (for freemium limits)
  app.get("/api/user/usage", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Paid subscribers, admins, and auditors have unlimited access
      const isPaidSubscriber = user.role === 'admin' || user.role === 'auditor' || 
        ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus);
      
      if (isPaidSubscriber) {
        return res.json({
          isSubscriber: true,
          isPaidSubscriber: true,
          propertyLookupCount: 0,
          remainingLookups: -1,
          wholesaleCalcCount: 0,
          remainingWholesaleCalcs: -1,
          pdfDownloadCount: 0,
          remainingPdfDownloads: -1,
          arvHelperCount: 0,
          remainingArvHelpers: -1,
          loanAnalysisCount: 0,
          remainingLoanAnalyses: -1,
          savedDealCount: 0,
          remainingSavedDeals: -1,
          savedLenderCount: 0,
          remainingSavedLenders: -1,
          dscrCount: 0,
          remainingDscrCalcs: -1,
          maxOfferCount: 0,
          remainingMaxOfferCalcs: -1,
          periodEnd: null
        });
      }
      
      const usage = await storage.getUserUsageCounter(user.id);
      const FREE_PDF_LIMIT = 2;
      const FREE_ARV_LIMIT = 2;
      const pdfCount = usage?.pdfDownloadCount || 0;
      const arvCount = usage?.arvHelperCount || 0;
      
      res.json({
        isSubscriber: false,
        isPaidSubscriber: false,
        propertyLookupCount: usage?.propertyLookupCount || 0,
        remainingLookups: usage?.remainingLookups ?? 2,
        wholesaleCalcCount: usage?.wholesaleCalcCount || 0,
        remainingWholesaleCalcs: usage?.remainingWholesaleCalcs ?? 2,
        pdfDownloadCount: pdfCount,
        remainingPdfDownloads: Math.max(0, FREE_PDF_LIMIT - pdfCount),
        arvHelperCount: arvCount,
        remainingArvHelpers: Math.max(0, FREE_ARV_LIMIT - arvCount),
        loanAnalysisCount: usage?.loanAnalysisCount || 0,
        remainingLoanAnalyses: usage?.remainingLoanAnalyses ?? 2,
        savedDealCount: usage?.savedDealCount || 0,
        remainingSavedDeals: usage?.remainingSavedDeals ?? 2,
        savedLenderCount: usage?.savedLenderCount || 0,
        remainingSavedLenders: usage?.remainingSavedLenders ?? 2,
        dscrCount: usage?.dscrCount || 0,
        remainingDscrCalcs: usage?.remainingDscrCalcs ?? 2,
        maxOfferCount: usage?.maxOfferCount || 0,
        remainingMaxOfferCalcs: usage?.remainingMaxOfferCalcs ?? 2,
        periodEnd: usage?.periodEnd || null
      });
    } catch (error) {
      console.error("Usage check error:", error);
      res.status(500).json({ error: "Failed to check usage" });
    }
  });

  // Wholesale Calculator Usage - increment counter for free users
  app.post("/api/user/wholesale-calc", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Subscribers, admins, and auditors have unlimited calculations
      const isSubscriber = user.role === 'admin' || user.role === 'auditor' || 
        ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus);
      
      if (isSubscriber) {
        return res.json({
          canCalculate: true,
          wholesaleCalcCount: 0,
          remainingWholesaleCalcs: -1 // unlimited
        });
      }
      
      // Build property key for de-duplication
      const { address, city, state, zip } = req.body || {};
      let propertyKey: string | undefined;
      if (address || city || state || zip) {
        const normAddr = (address || '').trim().toLowerCase();
        const normCity = (city || '').trim().toLowerCase();
        const normState = (state || '').trim().toLowerCase();
        const normZip = (zip || '').trim().toLowerCase();
        if (normCity || normState) {
          propertyKey = `${normAddr}|${normCity}|${normState}|${normZip}`;
        }
      }

      const isBlankWholesaleKey = !propertyKey || propertyKey.replace(/\|/g, '').trim() === '';
      const effectiveWholesaleKey = isBlankWholesaleKey ? undefined : propertyKey;

      // Check and increment usage for free users
      const usageResult = await storage.incrementUserWholesaleCalc(user.id, effectiveWholesaleKey);
      
      if (!usageResult.canCalculate) {
        return res.status(403).json({ 
          error: "You've reached your free monthly limit of 2 wholesale calculations. Upgrade to continue using the Wholesale Max Offer Calculator.",
          code: "WHOLESALE_CALC_LIMIT_REACHED",
          remainingWholesaleCalcs: 0
        });
      }
      
      res.json({
        canCalculate: true,
        wholesaleCalcCount: usageResult.wholesaleCalcCount,
        remainingWholesaleCalcs: usageResult.remainingWholesaleCalcs
      });
    } catch (error) {
      console.error("Wholesale calc usage error:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  // DSCR Calculator Usage - increment counter for free users
  app.post("/api/user/dscr-calc", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      const isSubscriber = user.role === 'admin' || user.role === 'auditor' ||
        ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus);

      if (isSubscriber) {
        return res.json({
          canUse: true,
          dscrCount: 0,
          remainingDscrCalcs: -1
        });
      }

      const { address, city, state, zip } = req.body || {};
      let propertyKey: string | undefined;
      if (address || city || state || zip) {
        const normAddr = (address || '').trim().toLowerCase();
        const normCity = (city || '').trim().toLowerCase();
        const normState = (state || '').trim().toLowerCase();
        const normZip = (zip || '').trim().toLowerCase();
        if (normCity || normState) {
          propertyKey = `${normAddr}|${normCity}|${normState}|${normZip}`;
        }
      }

      const isBlankDscrKey = !propertyKey || propertyKey.replace(/\|/g, '').trim() === '';
      const effectiveDscrKey = isBlankDscrKey ? undefined : propertyKey;

      const usageResult = await storage.incrementUserDscrCalc(user.id, effectiveDscrKey);

      if (!usageResult.canUse) {
        return res.status(403).json({
          error: "You've reached your free monthly limit of 2 DSCR calculations. Upgrade to continue.",
          code: "DSCR_CALC_LIMIT_REACHED",
          remainingDscrCalcs: 0
        });
      }

      res.json({
        canUse: true,
        dscrCount: usageResult.dscrCount,
        remainingDscrCalcs: usageResult.remainingDscrCalcs
      });
    } catch (error) {
      console.error("DSCR calc usage error:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  // Max Offer Calculator Usage - increment counter for free users
  app.post("/api/user/max-offer-calc", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      const isSubscriber = user.role === 'admin' || user.role === 'auditor' ||
        ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus);

      if (isSubscriber) {
        return res.json({
          canUse: true,
          maxOfferCount: 0,
          remainingMaxOfferCalcs: -1
        });
      }

      const { address, city, state, zip } = req.body || {};
      let propertyKey: string | undefined;
      if (address || city || state || zip) {
        const normAddr = (address || '').trim().toLowerCase();
        const normCity = (city || '').trim().toLowerCase();
        const normState = (state || '').trim().toLowerCase();
        const normZip = (zip || '').trim().toLowerCase();
        if (normCity || normState) {
          propertyKey = `${normAddr}|${normCity}|${normState}|${normZip}`;
        }
      }

      const isBlankMaxOfferKey = !propertyKey || propertyKey.replace(/\|/g, '').trim() === '';
      const effectiveMaxOfferKey = isBlankMaxOfferKey ? undefined : propertyKey;

      const usageResult = await storage.incrementUserMaxOfferCalc(user.id, effectiveMaxOfferKey);

      if (!usageResult.canUse) {
        return res.status(403).json({
          error: "You've reached your free monthly limit of 2 Max Offer calculations. Upgrade to continue.",
          code: "MAX_OFFER_CALC_LIMIT_REACHED",
          remainingMaxOfferCalcs: 0
        });
      }

      res.json({
        canUse: true,
        maxOfferCount: usageResult.maxOfferCount,
        remainingMaxOfferCalcs: usageResult.remainingMaxOfferCalcs
      });
    } catch (error) {
      console.error("Max offer calc usage error:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  // PDF Download Usage - check and increment counter for free users
  app.post("/api/user/pdf-download", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const FREE_PDF_LIMIT = 2;
      
      // Paid subscribers, admins, and auditors have unlimited downloads
      const isPaidSubscriber = user.role === 'admin' || user.role === 'auditor' || 
        ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus);
      
      if (isPaidSubscriber) {
        return res.json({
          canDownload: true,
          pdfDownloadCount: 0,
          remainingPdfDownloads: -1 // unlimited
        });
      }
      
      // Check and increment usage for free users
      const usageResult = await storage.incrementUserPdfDownload(user.id);
      
      if (!usageResult.canDownload) {
        return res.status(403).json({ 
          error: "You've reached your free monthly limit of 2 PDF downloads. Upgrade to continue downloading PDFs.",
          code: "PDF_DOWNLOAD_LIMIT_REACHED",
          remainingPdfDownloads: 0
        });
      }
      
      res.json({
        canDownload: true,
        pdfDownloadCount: usageResult.pdfDownloadCount,
        remainingPdfDownloads: usageResult.remainingPdfDownloads
      });
    } catch (error) {
      console.error("PDF download usage error:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  // Free account self-cancellation
  app.post("/api/user/cancel-free-account", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      if (user.subscriptionStatus !== 'free') {
        return res.status(400).json({ error: "Only free accounts can use this cancellation route." });
      }

      const { reason, otherReason } = req.body;
      const effectiveReason = reason === 'Other' ? (otherReason || 'Other') : (reason || null);

      const [updated] = await db.update(users)
        .set({ subscriptionStatus: 'archived', archiveReason: effectiveReason })
        .where(eq(users.id, user.id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "User not found." });
      }

      outboundWebhookService.triggerWebhooks('user_archived', {
        userId: user.id,
        email: updated.email,
        username: updated.username,
        archiveReason: effectiveReason,
      }).catch(err => console.error('[Webhook] user_archived (free cancel) error:', err));

      const firstName = (updated.fullName || updated.username || '').split(' ')[0] || 'there';
      emailService.sendFreeAccountCancellationEmail(updated.email, firstName)
        .catch(err => console.error('[Email] sendFreeAccountCancellationEmail error:', err));

      return res.json({ success: true });
    } catch (error) {
      console.error("Free account cancellation error:", error);
      return res.status(500).json({ error: "Failed to cancel account." });
    }
  });

  // Comparable Sales Search Route (for ARV help)
  app.post("/api/comps/search", ensureAuthenticated, async (req, res) => {
    try {
      const { address, city, state, zipCode, bedrooms, bathrooms, sqft, propertyType, subjectLat, subjectLng, radiusMiles, saleDateRangeDays, anchorMedian } = req.body;

      // Validate required fields
      if (!city || !state || !sqft) {
        return res.status(400).json({ 
          error: "City, state, and square footage are required for comp search" 
        });
      }

      // Check if user is authenticated and has access
      const user = req.user as User | undefined;
      
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check subscription status - paid subscribers get unlimited access
      const isPaidSubscriber = user.role === 'admin' || user.role === 'auditor' || 
        ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus);
      
      // For free users, check ARV helper usage
      const normalizedAddress = (address || '').trim().toLowerCase();
      const normalizedCity = (city || '').trim().toLowerCase();
      const normalizedState = (state || '').trim().toUpperCase();
      const normalizedZip = (zipCode || '').trim();

      const propertyKey = normalizedCity && normalizedState
        ? `${normalizedAddress}|${normalizedCity}|${normalizedState}|${normalizedZip}`
        : null;

      let usageResult = null;
      if (!isPaidSubscriber) {
        usageResult = await storage.incrementUserArvHelper(user.id, propertyKey ?? undefined);
        if (!usageResult.canUse) {
          return res.status(403).json({ 
            error: "You've used your 2 free ARV searches this month. Upgrade to get unlimited access.",
            code: "ARV_QUOTA_EXCEEDED",
            remainingArvHelpers: 0,
            arvHelperCount: usageResult.arvHelperCount
          });
        }
      }

      // Use Hybrid Comps Service - queries both RentCast and HasData for maximum coverage
      const { HybridCompsService } = await import("./services/hybrid-comps.service");
      const hybridService = new HybridCompsService();

      console.log(`[Comps Search] Subject property type: "${propertyType}" - Using dual-API strategy`);

      // Resolve subject coordinates — try geocoding fallback when lat/lng are not provided
      let resolvedLat: number | undefined = subjectLat != null ? subjectLat : undefined;
      let resolvedLng: number | undefined = subjectLng != null ? subjectLng : undefined;

      if ((resolvedLat == null || resolvedLng == null) && address && city && state) {
        try {
          console.log(`[Comps Search] Subject coordinates missing — attempting geocoding fallback for: ${address}, ${city}, ${state} ${zipCode || ''}`);
          const { RentCastAPIService } = await import("./services/rentcast-api.service");
          const rentCastGeo = new RentCastAPIService();
          const geoResult = await rentCastGeo.getPropertyByAddress(address, city, state, zipCode || '');
          if (geoResult?.latitude != null && geoResult?.longitude != null) {
            resolvedLat = geoResult.latitude;
            resolvedLng = geoResult.longitude;
            console.log(`[Comps Search] Geocoding fallback succeeded: lat=${resolvedLat}, lng=${resolvedLng}`);
          } else {
            console.log(`[Comps Search] Geocoding fallback returned no coordinates — proceeding without distance filtering`);
          }
        } catch (geoErr: any) {
          console.log(`[Comps Search] Geocoding fallback failed (${geoErr?.message}) — proceeding without distance filtering`);
        }
      }

      // ── Comp cache check (before external API calls) ──
      const compNormalizedAddr = normalizePropertyAddress({
        street: address || '',
        city: city || '',
        state: state || '',
        zip: zipCode || '',
      });
      const requestedRadius = radiusMiles || 3;
      const requestedDateRange = saleDateRangeDays || 180;
      const compCacheKey = buildCompCacheKey(compNormalizedAddr, requestedRadius, requestedDateRange, bedrooms, bathrooms, sqft);

      const compCached = await storage.getCompCache(compCacheKey);
      if (compCached) {
        console.log(`[Comp Cache] HIT key=${compCacheKey} hits=${compCached.hitCount}`);
        await storage.incrementCompCacheHit(compCacheKey);

        // Compute median $/sqft from clean (non-flagged) cached comps so the
        // frontend can carry a consensus anchor across radius changes.
        const cleanComps = (compCached.comps as any[]).filter((c: any) =>
          !c.outlierFlag && !c.distressedFlag && !c.borderlineFlag && c.pricePerSqft > 0
        );
        const sortedPpsf = cleanComps
          .map((c: any) => c.pricePerSqft)
          .sort((a: number, b: number) => a - b);
        const mid = Math.floor(sortedPpsf.length / 2);
        const medianFromCache = sortedPpsf.length > 0
          ? (sortedPpsf.length % 2 !== 0
              ? sortedPpsf[mid]
              : (sortedPpsf[mid - 1] + sortedPpsf[mid]) / 2)
          : null;

        // Cache hits are keyed off (normalizedAddr, requestedRadius, requestedDateRange).
        // Writes use actualRadiusMiles (post-expansion) as the radius portion of the
        // key, so a HIT here means the cached row's actualRadiusMiles equals the
        // current requestedRadius. Derive expansion flags from the CURRENT request
        // rather than echoing the (potentially stale) flags stored on the row —
        // the row may have been written by a different originating request that did
        // expand, but from the current caller's perspective no expansion occurred.
        const cachedActualRadius = Number(compCached.actualRadiusMiles);
        const effectiveRadius = isNaN(cachedActualRadius) ? requestedRadius : cachedActualRadius;
        const cachedActualDateRangeDays =
          (compCached as any).actualDateRangeDays ?? requestedDateRange;
        const effectiveDateRangeDays =
          typeof cachedActualDateRangeDays === "number" && !isNaN(cachedActualDateRangeDays)
            ? cachedActualDateRangeDays
            : requestedDateRange;
        const cacheSuitableCount = (compCached.comps as any[]).filter((c: any) =>
          !c.outlierFlag && !c.distressedFlag && !c.borderlineFlag
        ).length;
        const cacheResponseBody = {
          comps: compCached.comps,
          radiusExpanded: effectiveRadius > requestedRadius,
          actualRadiusMiles: effectiveRadius,
          dateRangeExpanded: effectiveDateRangeDays > requestedDateRange,
          actualDateRangeDays: effectiveDateRangeDays,
          searchCriteria: { city, state, zipCode, bedrooms, bathrooms, sqft },
          searchStats: {
            rentCastCount: 0,
            hasDataCount: 0,
            mergedCount: 0,
            totalBeforeDedupe: 0,
            finalCount: (compCached.comps as any[]).length,
            suitableCount: cacheSuitableCount,
            medianPricePerSqft: medianFromCache,
          },
          _fromCache: true,
        };
        return res.json(cacheResponseBody);
      }

      const result = await hybridService.searchComps({
        address: address || '',
        city,
        state,
        zipCode: zipCode || '',
        bedrooms: bedrooms || 3,
        bathrooms: bathrooms || 2,
        sqft: sqft || 1500,
        propertyType: propertyType || undefined,
        subjectLat: resolvedLat,
        subjectLng: resolvedLng,
        radiusMiles: radiusMiles || undefined,
        saleDateRangeDays: saleDateRangeDays || undefined,
        maxResults: 20,
        anchorMedian: anchorMedian ?? undefined,
      });

      // ── Write comp result to cache (24h TTL, keyed by actual radius post-expansion) ──
      // Skip caching empty results: a 0-comp row would short-circuit future
      // expansion attempts for 24h. If the area genuinely has no comps right
      // now, we'd rather pay the API cost again next time than freeze a
      // wrong-looking "no expansion attempted" response.
      try {
        if (compNormalizedAddr && result.comps.length > 0) {
          const actualCacheKey = buildCompCacheKey(compNormalizedAddr, result.actualRadiusMiles, requestedDateRange, bedrooms, bathrooms, sqft);
          const twentyFourHoursOut = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await storage.setCompCache({
            cacheKey: actualCacheKey,
            normalizedAddress: compNormalizedAddr,
            radiusMiles: String(requestedRadius),
            dateRangeDays: requestedDateRange,
            comps: result.comps as any,
            radiusExpanded: result.radiusExpanded,
            actualRadiusMiles: String(result.actualRadiusMiles),
            dateRangeExpanded: result.dateRangeExpanded,
            actualDateRangeDays: result.actualDateRangeDays,
            fetchedAt: new Date(),
            expiresAt: twentyFourHoursOut,
          });
          console.log(`[Comp Cache] SET key=${actualCacheKey} comps=${result.comps.length} ttl=24h`);
          // Also write an alias keyed by requestedRadius so future clicks on
          // the same radius button hit cache immediately without re-expanding.
          if (result.actualRadiusMiles !== requestedRadius) {
            const requestedCacheKey = buildCompCacheKey(compNormalizedAddr, requestedRadius, requestedDateRange, bedrooms, bathrooms, sqft);
            await storage.setCompCache({
              cacheKey: requestedCacheKey,
              normalizedAddress: compNormalizedAddr,
              radiusMiles: String(requestedRadius),
              dateRangeDays: requestedDateRange,
              comps: result.comps as any,
              radiusExpanded: result.radiusExpanded,
              actualRadiusMiles: String(result.actualRadiusMiles),
              dateRangeExpanded: result.dateRangeExpanded,
              actualDateRangeDays: result.actualDateRangeDays,
              fetchedAt: new Date(),
              expiresAt: twentyFourHoursOut,
            });
            console.log(`[Comp Cache] SET alias key=${requestedCacheKey} -> actual=${result.actualRadiusMiles}mi comps=${result.comps.length} ttl=24h`);
          }
        } else if (compNormalizedAddr) {
          console.log(`[Comp Cache] SKIP (0 comps) addr=${compNormalizedAddr} radius=${result.actualRadiusMiles} days=${requestedDateRange}`);
        }
      } catch (compCacheWriteErr: any) {
        console.warn(`[Comp Cache] Write failed (non-fatal): ${compCacheWriteErr.message}`);
      }

      if (result.comps.length > 0) {
        return res.json({
          comps: result.comps,
          radiusExpanded: result.radiusExpanded,
          actualRadiusMiles: result.actualRadiusMiles,
          dateRangeExpanded: result.dateRangeExpanded,
          actualDateRangeDays: result.actualDateRangeDays,
          searchCriteria: {
            city,
            state,
            zipCode,
            bedrooms,
            bathrooms,
            sqft,
          },
          searchStats: result.searchStats,
        });
      }

      return res.json({
        comps: [],
        radiusExpanded: result.radiusExpanded,
        actualRadiusMiles: result.actualRadiusMiles,
        dateRangeExpanded: result.dateRangeExpanded,
        actualDateRangeDays: result.actualDateRangeDays,
        message: "No comparable sales found in this area. Try expanding your search manually.",
        searchStats: result.searchStats,
      });

    } catch (error: any) {
      console.error("Comps search error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to search for comparable sales" 
      });
    }
  });

  // Search for Pending Properties (for ARV Helper)
  app.post("/api/comps/search-pending", async (req, res) => {
    try {
      const { city, state, zipCode, bedrooms, bathrooms, sqft, propertyType, subjectLat, subjectLng } = req.body;
      
      // Validate required fields
      if (!city || !state || !sqft) {
        return res.status(400).json({ 
          error: "City, state, and square footage are required" 
        });
      }

      // Check authentication
      const user = req.user as User | undefined;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Use HasData (Zillow) for pending properties search
      const { HasDataAPIService } = await import("./services/hasdata-api.service");
      const hasDataService = new HasDataAPIService();

      console.log(`[Pending Search] Searching for pending properties`);
      
      const pendingProperties = await hasDataService.searchPendingProperties({
        address: '',
        city,
        state,
        zipCode: zipCode || '',
        bedrooms: bedrooms || 3,
        bathrooms: bathrooms || 2,
        sqft: sqft || 1500,
        propertyType: propertyType || undefined,
        subjectLat: subjectLat || undefined,
        subjectLng: subjectLng || undefined,
        maxResults: 10,
      });

      return res.json({
        pendingProperties,
        count: pendingProperties.length,
      });

    } catch (error: any) {
      console.error("Pending properties search error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to search for pending properties" 
      });
    }
  });

  // Fetch Comp from Zillow URL - allows users to manually add a comp via Zillow link
  app.post("/api/comps/fetch-from-url", async (req, res) => {
    try {
      const { url, subjectLat, subjectLng } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "Zillow URL is required" });
      }
      
      if (!url.includes('zillow.com')) {
        return res.status(400).json({ 
          error: "Please provide a valid Zillow property URL" 
        });
      }

      // Check authentication
      const user = req.user as User | undefined;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log(`[Comp From URL] Fetching from: ${url}`);
      
      const hasDataService = new HasDataAPIService();
      const propertyData = await hasDataService.getPropertyByUrl(url);
      
      if (!propertyData || !propertyData.address) {
        return res.status(400).json({ 
          error: "Could not fetch property data from this URL. Please check the link and try again." 
        });
      }

      // Get price - prioritize: listPrice (for active/pending) > lastSalePrice (for sold) > estimatedValue (fallback)
      // For active/pending listings, listPrice is the actual asking price
      // For sold properties, lastSalePrice is the recorded sale price
      // estimatedValue (Zestimate) is only used as last resort
      let salePrice = propertyData.listPrice || propertyData.lastSalePrice;
      let saleDate = propertyData.lastSaleDate;
      
      // If we have a list price but no sale date, this is an active/pending listing
      if (propertyData.listPrice && !propertyData.lastSaleDate) {
        saleDate = new Date().toISOString().split('T')[0]; // Use today's date
      }
      
      // Fall back to estimated value only if no list price or sale price available
      if (!salePrice && propertyData.estimatedValue) {
        salePrice = propertyData.estimatedValue;
        saleDate = new Date().toISOString().split('T')[0]; // Use today's date
        console.log(`[Comp From URL] Warning: Using Zestimate ($${salePrice}) as no list/sale price available`);
      }

      if (!salePrice) {
        return res.status(400).json({ 
          error: "Could not determine property sale price from this URL." 
        });
      }
      
      console.log(`[Comp From URL] Price sources - listPrice: $${propertyData.listPrice}, lastSalePrice: $${propertyData.lastSalePrice}, estimatedValue: $${propertyData.estimatedValue}, using: $${salePrice}`);

      const sqft = propertyData.sqft || 1500;
      const pricePerSqft = Math.round(salePrice / sqft);

      // Calculate distance from subject if coordinates provided
      let distanceFromSubject: number | undefined;
      if (subjectLat && subjectLng && propertyData.latitude && propertyData.longitude) {
        const lat1 = subjectLat;
        const lon1 = subjectLng;
        const lat2 = propertyData.latitude;
        const lon2 = propertyData.longitude;
        const R = 3958.8; // Radius of Earth in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanceFromSubject = Math.round(R * c * 100) / 100; // Round to 2 decimals
      }

      // Build comp object in the same format as search results
      const comp = {
        address: propertyData.address || '',
        city: propertyData.city || '',
        state: propertyData.state || '',
        zipCode: propertyData.zipCode || '',
        salePrice,
        saleDate: saleDate || new Date().toISOString().split('T')[0],
        bedrooms: propertyData.bedrooms || 3,
        bathrooms: propertyData.bathrooms || 2,
        sqft,
        pricePerSqft,
        yearBuilt: propertyData.yearBuilt,
        lotSize: propertyData.lotSize,
        propertyType: propertyData.propertyType || 'Single Family',
        imageUrl: propertyData.imageUrl,
        distanceFromSubject,
        listingUrl: url,
        isManuallyAdded: true, // Flag to identify user-added comps
      };

      console.log(`[Comp From URL] Successfully fetched: ${comp.address} - $${comp.salePrice?.toLocaleString()}`);

      return res.json({ comp });
    } catch (error: any) {
      console.error("[Comp From URL] Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to fetch property data from URL" 
      });
    }
  });

  // Google Street View proxy — keeps the API key server-side
  app.get("/api/property/street-view", ensureAuthenticated, async (req, res) => {
    const address = req.query.address as string | undefined;
    if (!address) {
      return res.status(400).json({ error: "address query parameter is required" });
    }

    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleMapsApiKey) {
      return res.status(503).json({ error: "Street View not configured" });
    }

    try {
      // Pre-check Street View coverage via the (free) metadata endpoint so we can
      // return a real 404 instead of streaming Google's generic gray "Sorry, we
      // have no imagery here" panorama (which the Static API returns with HTTP 200
      // when there's no panorama at the requested location). The client's <img>
      // onError handler then falls back to /images/property-placeholder.svg.
      const metadataParams = new URLSearchParams({
        location: address,
        key: googleMapsApiKey,
      });
      const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?${metadataParams.toString()}`;
      try {
        const metadataRes = await fetch(metadataUrl);
        const metadata: any = await metadataRes.json().catch(() => null);
        if (!metadata || metadata.status !== 'OK') {
          console.log(`[Street View Proxy] No imagery for "${address}" (metadata status: ${metadata?.status ?? 'unknown'})`);
          return res.status(404).json({ error: "No street view available", status: metadata?.status });
        }
      } catch (metaErr: any) {
        // If metadata lookup itself fails (network/transient), fall through and
        // attempt the image fetch — better to risk a placeholder than to error
        // out for a real coverage area.
        console.warn(`[Street View Proxy] Metadata pre-check failed (continuing): ${metaErr.message}`);
      }

      const params = new URLSearchParams({
        location: address,
        size: "640x480",
        key: googleMapsApiKey,
      });
      const googleUrl = `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
      const googleRes = await fetch(googleUrl);
      if (!googleRes.ok) {
        return res.status(googleRes.status).json({ error: "Street View fetch failed" });
      }
      const contentType = googleRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = await googleRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (svError: any) {
      console.error("[Street View Proxy] Error:", svError.message);
      res.status(500).json({ error: "Failed to fetch Street View image" });
    }
  });

  // Google Static Maps proxy — keeps the API key server-side. Used by the
  // Comp Report PDF to render a small map showing the subject property
  // (red "S" pin) alongside the selected comps (numbered blue pins). Auto-
  // fits the viewport to the markers (no explicit zoom/center).
  //
  // Query params:
  //   subjectLat, subjectLng   numeric, preferred
  //   subjectAddress           free-form, used as fallback for the subject
  //                            pin if lat/lng are missing
  //   comps                    JSON array of { lat, lng, address }
  //
  // Returns the Google PNG inline (image/*) or a JSON error.
  //
  // NOTE: This route is intentionally PUBLIC (no auth check). Browsers can
  // legitimately fire this URL via an <img> tag without a session cookie
  // (e.g., iframed dev preview with SameSite=Lax cookies), and routing it
  // through `ensureAuthenticated` crashes the process on miss. To protect
  // the Google Maps quota we apply a simple in-memory IP rate limit:
  // 100 requests per hour per IP. The limiter state is kept local to this
  // route's closure (no shared rate-limit library exists in the codebase).
  const COMP_MAP_LIMIT = 100;
  const COMP_MAP_WINDOW_MS = 60 * 60 * 1000;
  const compMapRateLimit = new Map<string, { count: number; resetAt: number }>();
  // Returns true when the request is allowed; false when over the limit.
  // Opportunistically prunes expired entries when the map grows large so
  // it can't accumulate forever.
  const checkCompMapRateLimit = (ip: string): boolean => {
    const now = Date.now();
    if (compMapRateLimit.size > 10000) {
      for (const [key, entry] of compMapRateLimit) {
        if (now >= entry.resetAt) compMapRateLimit.delete(key);
      }
    }
    const entry = compMapRateLimit.get(ip);
    if (!entry || now >= entry.resetAt) {
      compMapRateLimit.set(ip, { count: 1, resetAt: now + COMP_MAP_WINDOW_MS });
      return true;
    }
    if (entry.count >= COMP_MAP_LIMIT) return false;
    entry.count += 1;
    return true;
  };

  app.get("/api/property/comp-map", async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkCompMapRateLimit(clientIp)) {
      return res.status(429).json({ error: "Too many requests" });
    }
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleMapsApiKey) {
      return res.status(503).json({ error: "Static map not configured" });
    }

    const subjectLatRaw = req.query.subjectLat as string | undefined;
    const subjectLngRaw = req.query.subjectLng as string | undefined;
    const subjectAddress = req.query.subjectAddress as string | undefined;
    const compsRaw = req.query.comps as string | undefined;

    type CompMarker = { lat?: number | string; lng?: number | string; address?: string };
    let comps: CompMarker[] = [];
    if (compsRaw) {
      try {
        const parsed = JSON.parse(compsRaw);
        if (Array.isArray(parsed)) comps = parsed;
      } catch {
        return res.status(400).json({ error: "comps must be a JSON array" });
      }
    }

    // Dynamic map size based on the number of comps the client is rendering,
    // so the comp report PDF stays one page regardless of how many rows the
    // table consumes above the map. Client passes ?compCount=<n>.
    //   1-3 comps -> 800x380
    //   4 comps   -> 800x320
    //   5 comps   -> 800x260
    //   6+ comps  -> 800x200 (default)
    const compCountRaw = req.query.compCount as string | undefined;
    const compCount = compCountRaw != null ? parseInt(compCountRaw, 10) : NaN;
    let mapSize = "800x200";
    if (Number.isInteger(compCount) && compCount > 0) {
      if (compCount <= 3) mapSize = "800x380";
      else if (compCount === 4) mapSize = "800x320";
      else if (compCount === 5) mapSize = "800x260";
    }
    const params = new URLSearchParams();
    params.set("size", mapSize);

    // Subject pin (red, label "S"). Prefer lat/lng; fall back to a free-
    // form address that Google can geocode server-side.
    const subjectLat = subjectLatRaw != null ? Number(subjectLatRaw) : NaN;
    const subjectLng = subjectLngRaw != null ? Number(subjectLngRaw) : NaN;
    let hasSubjectMarker = false;
    if (Number.isFinite(subjectLat) && Number.isFinite(subjectLng)) {
      params.append("markers", `color:red|label:S|${subjectLat},${subjectLng}`);
      hasSubjectMarker = true;
    } else if (subjectAddress) {
      params.append("markers", `color:red|label:S|${subjectAddress}`);
      hasSubjectMarker = true;
    }

    // Comp pins (blue). The Static Maps API only allows a single character
    // (A–Z or 0–9) for marker labels, so comps 1–9 get a numeric label and
    // any beyond that get an unlabeled blue marker.
    let compMarkerCount = 0;
    comps.forEach((comp, idx) => {
      const lat = typeof comp.lat === "number" ? comp.lat : Number(comp.lat);
      const lng = typeof comp.lng === "number" ? comp.lng : Number(comp.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const compNum = idx + 1;
      const label = compNum <= 9 ? `|label:${compNum}` : "";
      params.append("markers", `color:blue${label}|${lat},${lng}`);
      compMarkerCount += 1;
    });

    if (!hasSubjectMarker && compMarkerCount === 0) {
      return res.status(400).json({ error: "No usable subject or comp coordinates" });
    }

    params.set("key", googleMapsApiKey);

    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
      // TEMP DEBUG LOG — remove once map issue is diagnosed
      const keyTail = googleMapsApiKey.slice(-4);
      const redactedUrl = googleUrl.replace(googleMapsApiKey, `***${keyTail}`);
      const ts = new Date().toISOString();
      appendFileSync("/tmp/comp-map-debug.log", `\n[${ts}] GET -> ${redactedUrl}\n`);
      const googleRes = await fetch(googleUrl);
      appendFileSync("/tmp/comp-map-debug.log", `[${ts}] Google responded ${googleRes.status} ${googleRes.statusText} content-type=${googleRes.headers.get("content-type")}\n`);
      if (!googleRes.ok) {
        const errBody = await googleRes.text();
        appendFileSync("/tmp/comp-map-debug.log", `[${ts}] Google error body: ${errBody.slice(0, 500)}\n`);
        return res.status(googleRes.status).json({ error: "Static map fetch failed" });
      }
      const contentType = googleRes.headers.get("content-type") || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = await googleRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (mapError: any) {
      console.error("[Comp Map Proxy] Error:", mapError.message);
      res.status(500).json({ error: "Failed to fetch comp map" });
    }
  });

  // Property Lookup Route
  app.post("/api/property/lookup", ensureAuthenticated, async (req, res) => {
    try {
      const { url, forceRefresh } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "Property URL is required" });
      }
      
      if (!url.includes('zillow.com') && !url.includes('redfin.com')) {
        return res.status(400).json({ 
          error: "Please provide a valid Zillow or Redfin property URL" 
        });
      }
      
      // ── Property cache check (before quota to avoid burning free-user slots on cached results) ──
      const zpidFromUrl = extractZpidFromUrl(url);
      const normalizedAddrFromUrl = normalizePropertyAddress(url);

      if (!forceRefresh) {
        let cachedEntry = null;
        // Primary lookup: by zpid (unambiguous, survives URL slug changes)
        if (zpidFromUrl) {
          cachedEntry = await storage.getPropertyCacheByZpid(zpidFromUrl, 'property_details');
          if (cachedEntry) console.log(`[Property Cache] HIT zpid=${zpidFromUrl}`);
        }
        // Fallback lookup: by normalized address derived from URL slug
        if (!cachedEntry && normalizedAddrFromUrl) {
          cachedEntry = await storage.getPropertyCache(normalizedAddrFromUrl, 'property_details');
          if (cachedEntry) console.log(`[Property Cache] HIT addr=${normalizedAddrFromUrl}`);
        }
        if (cachedEntry) {
          return res.json({ ...(cachedEntry.payload as object), _fromCache: true });
        }
      }

      // Cache miss — now check and gate free-user quota
      const user = req.user as User | undefined;
      let usageResult: { canLookup: boolean; remainingLookups: number } | null = null;
      
      if (user) {
        const isSubscriber = user.role === 'admin' || user.role === 'auditor' || 
          ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus);
        
        if (!isSubscriber) {
          // Check and increment usage for free users
          usageResult = await storage.incrementUserPropertyLookup(user.id);
          
          if (!usageResult.canLookup) {
            return res.status(403).json({ 
              error: "You've reached your free monthly limit of 2 property lookups. Upgrade to continue using automated lookups, or enter property information manually.",
              code: "LOOKUP_LIMIT_REACHED",
              remainingLookups: 0
            });
          }
        }
      }
      
      // Bug 2 fix: bypass CachedPropertyAPIService (broken after schema migration) —
      // use HasDataAPIService directly. Route-level 7-day cache (above) handles caching.
      const hasDataDirectService = new HasDataAPIService();
      let propertyData = null;
      let rentCastFallbackService: ReturnType<typeof PropertyAPIFactory.getService> | null = null;
      try {
        propertyData = await hasDataDirectService.getPropertyByUrl(url);
      } catch (primaryError: any) {
        console.log(`[Property Lookup] Primary lookup (HasData) failed: ${primaryError.message}. Trying RentCast fallback...`);
        try {
          rentCastFallbackService = PropertyAPIFactory.getService("rentcast");
          propertyData = await rentCastFallbackService.getPropertyByUrl(url);
          if (propertyData) {
            console.log(`[Property Lookup] RentCast fallback succeeded for URL: ${url}`);
          }
        } catch (fallbackError: any) {
          console.error(`[Property Lookup] RentCast fallback also failed: ${fallbackError.message}`);
          throw primaryError;
        }
        if (!propertyData) {
          throw primaryError;
        }
      }

      if (!propertyData) {
        return res.status(404).json({ 
          error: "Property not found. Please check the URL and try again." 
        });
      }
      
      // Fetch supplemental data from HasData/Zillow (image, rent Zestimate, HOA)
      // HasDataAPIService does not implement fetchSupplementalDataFromUrl — this block
      // is preserved in case a future service adds it, but currently evaluates to false.
      if ('fetchSupplementalDataFromUrl' in hasDataDirectService) {
        try {
          const supplementalData = await (hasDataDirectService as any).fetchSupplementalDataFromUrl(url);
          
          // Merge in image if not already present
          if (!propertyData.imageUrl && supplementalData?.imageUrl) {
            propertyData.imageUrl = supplementalData.imageUrl;
          }
          
          // Store both rent estimates for transparency
          const rentCastEstimate = propertyData.estimatedRent;
          const zillowRentEstimate = supplementalData?.rentZestimate;
          
          // Add both estimates to the response
          propertyData.rentCastEstimate = rentCastEstimate || null;
          propertyData.zillowRentEstimate = zillowRentEstimate || null;
          
          // Use the higher of the two estimates and indicate the source
          if (rentCastEstimate && zillowRentEstimate) {
            if (zillowRentEstimate >= rentCastEstimate) {
              propertyData.estimatedRent = zillowRentEstimate;
              propertyData.estimatedRentSource = "Zillow";
              console.log(`[Property Lookup] Using Zillow rentZestimate: $${zillowRentEstimate} (higher than RentCast: $${rentCastEstimate})`);
            } else {
              propertyData.estimatedRent = rentCastEstimate;
              propertyData.estimatedRentSource = "RentCast";
              console.log(`[Property Lookup] Using RentCast estimate: $${rentCastEstimate} (higher than Zillow: $${zillowRentEstimate})`);
            }
          } else if (zillowRentEstimate) {
            propertyData.estimatedRent = zillowRentEstimate;
            propertyData.estimatedRentSource = "Zillow";
            console.log(`[Property Lookup] Using Zillow rentZestimate: $${zillowRentEstimate} (RentCast unavailable)`);
          } else if (rentCastEstimate) {
            propertyData.estimatedRentSource = "RentCast";
            console.log(`[Property Lookup] Using RentCast estimate: $${rentCastEstimate} (Zillow unavailable)`);
          }
          
          // Use Zillow's HOA if RentCast didn't return one
          if (!propertyData.hoaFees && supplementalData?.monthlyHoaFee) {
            console.log(`[Property Lookup] Using Zillow monthlyHoaFee: ${supplementalData.monthlyHoaFee}`);
            propertyData.hoaFees = supplementalData.monthlyHoaFee;
          }
          
          // Use Zillow's annual tax if RentCast didn't return one
          if (!propertyData.annualTax && supplementalData?.annualTax) {
            console.log(`[Property Lookup] Using Zillow annualTax: $${supplementalData.annualTax} (RentCast unavailable)`);
            propertyData.annualTax = supplementalData.annualTax;
          }
        } catch (supplementalError) {
          console.log("Could not fetch supplemental property data:", supplementalError);
        }
      } else if ('fetchPropertyImageFromUrl' in hasDataDirectService) {
        // Fallback to just image fetch if supplemental not available
        try {
          const imageUrl = await (hasDataDirectService as any).fetchPropertyImageFromUrl(url);
          if (imageUrl) {
            propertyData.imageUrl = imageUrl;
          }
        } catch (imageError) {
          console.log("Could not fetch property image:", imageError);
        }
      }
      
      // FALLBACK: If RentCast was used as the primary data source and we have no image,
      // skip the HasData supplemental image fetch — HasData already failed on the primary
      // lookup so retrying it for the image would add 90+ seconds of timeouts for no gain.
      // The placeholder image is used immediately instead.
      if (rentCastFallbackService && !propertyData.imageUrl) {
        console.log(`[Property Lookup] HasData already failed — skipping supplemental image fetch, using placeholder`);
      }

      // FALLBACK: If we still don't have tax data, fetch from RentCast using address
      if (!propertyData.annualTax && propertyData.address && propertyData.city && propertyData.state && propertyData.zipCode) {
        try {
          console.log(`[Property Lookup] Tax data missing from HasData, fetching from RentCast...`);
          const rentCastService = PropertyAPIFactory.getService("rentcast");
          const rentCastData = await rentCastService.getPropertyByAddress(
            propertyData.address,
            propertyData.city,
            propertyData.state,
            propertyData.zipCode
          );
          
          if (rentCastData?.annualTax) {
            console.log(`[Property Lookup] Got tax data from RentCast: $${rentCastData.annualTax}`);
            propertyData.annualTax = rentCastData.annualTax;
          }
          if (rentCastData?.taxAssessedValue && !propertyData.taxAssessedValue) {
            console.log(`[Property Lookup] Got tax assessed value from RentCast: $${rentCastData.taxAssessedValue}`);
            propertyData.taxAssessedValue = rentCastData.taxAssessedValue;
          }
        } catch (rentCastError) {
          console.log("[Property Lookup] Could not fetch tax data from RentCast:", rentCastError);
        }
      }

      // ── estimatedValue priority chain ──
      // Step 1: Zestimate (from HasData — already in estimatedValue if non-null)
      if (propertyData.estimatedValue && propertyData.estimatedValue > 0) {
        propertyData.estimatedValueSource = 'zestimate';
        console.log(`[Property Lookup] estimatedValue source=zestimate value=$${propertyData.estimatedValue}`);
      } else {
        // Step 2: RentCast AVM — called whenever Zestimate is absent, regardless of listPrice
        let avmSucceeded = false;
        if (propertyData.address && propertyData.city && propertyData.state && propertyData.zipCode) {
          try {
            console.log(`[Property Lookup] Zestimate absent — fetching from RentCast AVM...`);
            const rcAVMService = PropertyAPIFactory.getService("rentcast");
            if (rcAVMService.getValueEstimateByAddress) {
              const fullAddress = `${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.zipCode}`;
              const avmValue = await rcAVMService.getValueEstimateByAddress(fullAddress);
              if (avmValue) {
                console.log(`[Property Lookup] estimatedValue source=rentcast_avm value=$${avmValue}`);
                propertyData.estimatedValue = avmValue;
                propertyData.estimatedValueSource = 'rentcast_avm';
                avmSucceeded = true;
              }
            }
          } catch (avmValueError) {
            console.log("[Property Lookup] Could not fetch AVM value from RentCast:", avmValueError);
          }
        }
        // Step 3: Last resort — list price (seller's ask, not an independent valuation)
        if (!avmSucceeded && propertyData.listPrice && propertyData.listPrice > 0) {
          console.log(`[Property Lookup] estimatedValue source=list_price value=$${propertyData.listPrice} (Zestimate absent, RentCast AVM unavailable)`);
          propertyData.estimatedValue = propertyData.listPrice;
          propertyData.estimatedValueSource = 'list_price';
        }
      }

      // FALLBACK: If we still don't have an estimated rent, fetch from RentCast long-term rent AVM
      if (!propertyData.estimatedRent && propertyData.address && propertyData.city && propertyData.state && propertyData.zipCode) {
        try {
          console.log(`[Property Lookup] Estimated rent missing, fetching from RentCast long-term rent AVM...`);
          const rcRentService = PropertyAPIFactory.getService("rentcast");
          if (rcRentService.getRentEstimateByAddress) {
            const fullAddress = `${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.zipCode}`;
            const avmRent = await rcRentService.getRentEstimateByAddress(fullAddress);
            if (avmRent) {
              console.log(`[Property Lookup] Got estimated rent from RentCast AVM: $${avmRent}/mo`);
              propertyData.estimatedRent = avmRent;
              propertyData.estimatedRentSource = "RentCast";
            }
          }
        } catch (avmRentError) {
          console.log("[Property Lookup] Could not fetch AVM rent from RentCast:", avmRentError);
        }
      }

      // FALLBACK: If we still have no property image, use Google Street View (server-proxied)
      // The key is kept server-side; clients receive an internal proxy URL.
      if (!propertyData.imageUrl && (propertyData.address?.trim()?.length ?? 0) > 0 && (propertyData.city?.trim()?.length ?? 0) > 0 && (propertyData.state?.trim()?.length ?? 0) > 0) {
        if (process.env.GOOGLE_MAPS_API_KEY) {
          const streetAddress = [
            propertyData.address,
            propertyData.city,
            propertyData.state,
            propertyData.zipCode
          ].filter(Boolean).join(', ');
          propertyData.imageUrl = `/api/property/street-view?address=${encodeURIComponent(streetAddress)}`;
          console.log(`[Property Lookup] Using Google Street View proxy image for: ${streetAddress}`);
        } else {
          console.log(`[Property Lookup] GOOGLE_MAPS_API_KEY not set — skipping Street View fallback`);
        }
      }

      // ── Write to property cache (7-day TTL) ──
      try {
        const cacheAddr = normalizedAddrFromUrl || normalizePropertyAddress({
          street: propertyData.address || '',
          city: propertyData.city || '',
          state: propertyData.state || '',
          zip: propertyData.zipCode || '',
        });
        if (cacheAddr) {
          const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await storage.setPropertyCache({
            normalizedAddress: cacheAddr,
            cacheType: 'property_details',
            zpid: zpidFromUrl ?? undefined,
            street: propertyData.address || undefined,
            city: propertyData.city || undefined,
            state: propertyData.state || undefined,
            postalCode: propertyData.zipCode || undefined,
            payload: propertyData as any,
            fetchedAt: new Date(),
            expiresAt: sevenDaysOut,
          });
          console.log(`[Property Cache] SET addr=${cacheAddr} zpid=${zpidFromUrl ?? 'none'} ttl=7d`);
        }
      } catch (cacheWriteErr: any) {
        console.warn(`[Property Cache] Write failed (non-fatal): ${cacheWriteErr.message}`);
      }

      // Include remaining lookups info for free users
      const response: any = { ...propertyData };
      if (usageResult) {
        response._usageInfo = {
          remainingLookups: usageResult.remainingLookups,
          isFreeTier: true
        };
      }
      
      res.json(response);
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
          // Count unique properties (addresses) instead of total analyses
          totalDeals: sql<number>`count(distinct ${savedDeals.propertyAddress})::int`,
          draftDeals: sql<number>`count(*) filter (where ${savedDeals.status} = 'draft')::int`,
          finalDeals: sql<number>`count(*) filter (where ${savedDeals.status} = 'final')::int`,
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
        draftDeals: dealStats?.draftDeals ?? 0,
        finalDeals: dealStats?.finalDeals ?? 0,
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
  
  // Create/save a deal (auto-save from Step 5) - subscribers only
  app.post("/api/member/deals", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const user = req.user as User;
      
      // Paid subscribers can save unlimited deals; free users get up to 2/month
      const isSubscriber = ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus) || 
                           user.role === 'admin' || user.role === 'developer' || user.role === 'auditor';
      if (!isSubscriber) {
        const usageResult = await storage.incrementUserSavedDeal(userId);
        if (!usageResult.canSave) {
          return res.status(403).json({ error: "You've reached your free limit of 2 saved deals this month", code: 'SAVED_DEAL_QUOTA_EXCEEDED' });
        }
      }
      
      const { dealSnapshot, resultsSnapshot, propertyAddress, arv, roi, profit, dscr, status = 'draft', notes, lendersPresented } = req.body;
      
      // Check for duplicate within last 5 minutes (same user + same address)
      if (propertyAddress) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const [existingDeal] = await db
          .select()
          .from(savedDeals)
          .where(and(
            eq(savedDeals.userId, userId),
            eq(savedDeals.propertyAddress, propertyAddress),
            gt(savedDeals.createdAt, fiveMinutesAgo)
          ))
          .orderBy(desc(savedDeals.createdAt))
          .limit(1);
        
        if (existingDeal) {
          // Update existing deal instead of creating duplicate
          const [updatedDeal] = await db
            .update(savedDeals)
            .set({
              dealSnapshot,
              resultsSnapshot,
              arv: arv?.toString(),
              roi: roi?.toString(),
              profit: profit?.toString(),
              dscr: dscr?.toString(),
              lendersPresented,
              updatedAt: new Date(),
            })
            .where(eq(savedDeals.id, existingDeal.id))
            .returning();
          
          return res.json({ ...updatedDeal, isUpdate: true });
        }
      }
      
      // Create new deal
      const [newDeal] = await db
        .insert(savedDeals)
        .values({
          userId,
          dealSnapshot,
          resultsSnapshot,
          propertyAddress,
          arv: arv?.toString(),
          roi: roi?.toString(),
          profit: profit?.toString(),
          dscr: dscr?.toString(),
          status,
          notes,
          lendersPresented,
        })
        .returning();

      // Increment automated/manual deal analysis counter on the user record
      try {
        const propertyDataSource = (dealSnapshot as any)?.propertyDataSource;
        const isAutomated = propertyDataSource !== "manual";
        if (isAutomated) {
          await storage.incrementDealAnalysisAuto(userId);
        } else {
          await storage.incrementDealAnalysisManual(userId);
        }
        const updatedCounts = await storage.getUserDealAnalysisCounts(userId);

        outboundWebhookService.triggerWebhooks('deal_analysis_counted', {
          userId: user.id,
          email: user.email,
          dealAnalysisAuto: updatedCounts.dealAnalysisAuto,
          dealAnalysisManual: updatedCounts.dealAnalysisManual,
          isAutomated: isAutomated,
          propertyDataSource: propertyDataSource,
          createdAt: new Date().toISOString()
        }).catch(err => console.error('[Webhook] deal_analysis_counted trigger error:', err));
      } catch (counterErr) {
        console.error('[deal_analysis_counted] increment error:', counterErr);
      }

      res.status(201).json(newDeal);
    } catch (error) {
      console.error("Error saving deal:", error);
      res.status(500).json({ error: "Failed to save deal" });
    }
  });
  
  // Get member deals
  app.get("/api/member/deals", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id;

      const statusFilter = req.query.status as string | undefined;
      const includeHidden = req.query.includeHidden === "true";
      
      // Build query - filter out hidden deals by default
      const whereConditions = includeHidden
        ? eq(savedDeals.userId, userId)
        : and(eq(savedDeals.userId, userId), or(eq(savedDeals.isHidden, false), sql`${savedDeals.isHidden} IS NULL`));
      
      const deals = await db
        .select()
        .from(savedDeals)
        .where(whereConditions)
        .orderBy(desc(savedDeals.createdAt));
      
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
  
  // Get single deal by ID
  app.get("/api/member/deals/:dealId", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id;
      const { dealId } = req.params;
      
      const [deal] = await db
        .select()
        .from(savedDeals)
        .where(and(eq(savedDeals.id, dealId), eq(savedDeals.userId, userId)));
      
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      res.json(deal);
    } catch (error) {
      console.error("Error fetching deal:", error);
      res.status(500).json({ error: "Failed to fetch deal" });
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
      
      // Parse date strings into Date objects for timestamp fields
      const dateFields = [
        'underContractDate', 'estimatedClosingDate', 'actualClosingDate',
        'purchaseDate', 'sellDate', 'wonDate', 'lostDate'
      ];
      const parsedUpdates = { ...updates };
      for (const field of dateFields) {
        if (parsedUpdates[field] && typeof parsedUpdates[field] === 'string') {
          parsedUpdates[field] = new Date(parsedUpdates[field]);
        }
      }
      
      const [updatedDeal] = await db
        .update(savedDeals)
        .set({
          ...parsedUpdates,
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
  
  // Archive all deals for a property
  app.post("/api/member/deals/archive-property", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { propertyAddress, status, lostDate } = req.body;
      
      if (!propertyAddress) {
        return res.status(400).json({ error: "Property address is required" });
      }
      
      const updatedDeals = await db
        .update(savedDeals)
        .set({
          status: status || "lost",
          lostDate: lostDate ? new Date(lostDate) : new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(savedDeals.userId, userId),
          eq(savedDeals.propertyAddress, propertyAddress)
        ))
        .returning();
      
      res.json({ 
        message: `${updatedDeals.length} deals archived for ${propertyAddress}`,
        count: updatedDeals.length 
      });
    } catch (error) {
      console.error("Error archiving property deals:", error);
      res.status(500).json({ error: "Failed to archive property deals" });
    }
  });
  
  // Soft delete (hide) other analyses for a property when marking one as the active deal
  app.post("/api/member/deals/:dealId/hide-other-analyses", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { dealId } = req.params;
      
      // Get the deal being marked
      const [targetDeal] = await db
        .select()
        .from(savedDeals)
        .where(and(eq(savedDeals.id, dealId), eq(savedDeals.userId, userId)));
      
      if (!targetDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      if (!targetDeal.propertyAddress) {
        return res.status(400).json({ error: "Deal has no property address" });
      }
      
      // Hide all other deals for this property address (soft delete)
      const hiddenDeals = await db
        .update(savedDeals)
        .set({
          isHidden: true,
          updatedAt: new Date(),
        })
        .where(and(
          eq(savedDeals.userId, userId),
          eq(savedDeals.propertyAddress, targetDeal.propertyAddress),
          ne(savedDeals.id, dealId)
        ))
        .returning();
      
      res.json({ 
        message: `${hiddenDeals.length} other analyses hidden for ${targetDeal.propertyAddress}`,
        count: hiddenDeals.length 
      });
    } catch (error) {
      console.error("Error hiding other analyses:", error);
      res.status(500).json({ error: "Failed to hide other analyses" });
    }
  });
  
  // Recover (unhide) a hidden analysis
  app.post("/api/member/deals/:dealId/unhide", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { dealId } = req.params;
      
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
          isHidden: false,
          updatedAt: new Date(),
        })
        .where(eq(savedDeals.id, dealId))
        .returning();
      
      res.json({ 
        message: "Analysis recovered successfully",
        deal: updatedDeal 
      });
    } catch (error) {
      console.error("Error recovering hidden analysis:", error);
      res.status(500).json({ error: "Failed to recover analysis" });
    }
  });

  // Stop reminders for a deal
  app.post("/api/member/deals/:dealId/stop-reminders", ensureAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const { dealId } = req.params;
      
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
          stopAutomatedReminders: true,
          updatedAt: new Date(),
        })
        .where(eq(savedDeals.id, dealId))
        .returning();
      
      res.json({ 
        message: "Reminders stopped for this deal",
        deal: updatedDeal 
      });
    } catch (error) {
      console.error("Error stopping deal reminders:", error);
      res.status(500).json({ error: "Failed to stop reminders" });
    }
  });
  
  // Get saved lenders
  app.get("/api/member/saved-lenders", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const userId = user.id;

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

      // Check saved lender quota for free users (paid subscribers have unlimited saves)
      const isPaidSubscriber = user.role === 'admin' || user.role === 'auditor' || user.role === 'developer' ||
        ['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus);
      if (!isPaidSubscriber) {
        const usageResult = await storage.incrementUserSavedLender(userId);
        if (!usageResult.canSave) {
          return res.status(403).json({ error: "You've reached your free limit of 2 saved lenders this month", code: 'SAVED_LENDER_QUOTA_EXCEEDED' });
        }
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
      const user = req.user as User;
      const userId = user.id;
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
  app.get("/api/lender/saved-by", ensureLenderOrAdmin, async (req, res) => {
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
  
  // Track Apply Now button clicks (for referral analytics)
  app.post("/api/track-apply-click", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      const clickSchema = z.object({
        lenderId: z.string(),
        loanProductId: z.string().optional(),
        propertyAddress: z.string().optional(),
        arv: z.number().optional(),
        buyPrice: z.number().optional(),
        rehabCost: z.number().optional(),
        estProfit: z.number().optional(),
        loanTerms: z.object({
          interestRate: z.string().optional(),
          maxLtvBuy: z.string().optional(),
          points: z.string().optional(),
          timeToClose: z.string().optional(),
        }).optional(),
        productName: z.string().optional(),
        loanType: z.string().optional(),
        referralLink: z.string().nullable().optional(),
        source: z.enum(['referral_link', 'direct']).default('direct'),
      });
      
      const data = clickSchema.parse(req.body);
      
      // Get user profile for investor info
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1)
        .then(rows => rows[0]);
      
      const investorName = profile?.fullName || user.username || "Unknown Investor";
      const investorEmail = user.email;
      const investorPhone = profile?.phone || undefined;
      
      // Store the click in the database
      await db
        .insert(applyClicks)
        .values({
          lenderId: data.lenderId,
          loanProductId: data.loanProductId,
          userId: user.id,
          propertyAddress: data.propertyAddress,
          arv: data.arv?.toString(),
          buyPrice: data.buyPrice?.toString(),
          rehabCost: data.rehabCost?.toString(),
          estProfit: data.estProfit?.toString(),
          loanTerms: data.loanTerms,
          investorName,
          investorEmail,
          investorPhone,
          productName: data.productName,
          loanType: data.loanType,
          referralLink: data.referralLink,
          source: data.source,
        });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking apply click:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to track click" });
    }
  });
  
  // Get apply clicks (for lender portal)
  app.get("/api/lender/apply-clicks", ensureLenderOrAdmin, async (req, res) => {
    try {
      let lenderId: string;
      
      if ((req.user as any).role === "admin") {
        const previewLenderId = req.query.lenderId as string;
        if (!previewLenderId) {
          return res.status(400).json({ error: "Lender ID required for admin preview" });
        }
        lenderId = previewLenderId;
      } else {
        lenderId = (req.user as any).id;
      }
      
      const clicks = await db
        .select({
          id: applyClicks.id,
          propertyAddress: applyClicks.propertyAddress,
          arv: applyClicks.arv,
          buyPrice: applyClicks.buyPrice,
          rehabCost: applyClicks.rehabCost,
          estProfit: applyClicks.estProfit,
          loanTerms: applyClicks.loanTerms,
          investorName: applyClicks.investorName,
          investorEmail: applyClicks.investorEmail,
          investorPhone: applyClicks.investorPhone,
          productName: applyClicks.productName,
          loanType: applyClicks.loanType,
          referralLink: applyClicks.referralLink,
          source: applyClicks.source,
          createdAt: applyClicks.createdAt,
        })
        .from(applyClicks)
        .where(eq(applyClicks.lenderId, lenderId))
        .orderBy(desc(applyClicks.createdAt));
      
      res.json(clicks);
    } catch (error) {
      console.error("Error fetching apply clicks:", error);
      res.status(500).json({ error: "Failed to fetch apply clicks" });
    }
  });
  
  // Get lender inquiries (for lender portal)
  app.get("/api/lender/inquiries", ensureLenderOrAdmin, async (req, res) => {
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
  app.get("/api/lender/inquiries/count", ensureLenderOrAdmin, async (req, res) => {
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

  // Generate referral code for lender
  app.post("/api/lender/generate-referral-code", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lender = req.user as any;
      
      // Check if lender already has a code
      const [existingLender] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.id, lender.id));
      
      if (!existingLender) {
        return res.status(404).json({ error: "Lender not found" });
      }
      
      if (existingLender.generatedReferralCode) {
        return res.json({ 
          code: existingLender.generatedReferralCode,
          clickCount: existingLender.referralClickCount || 0
        });
      }
      
      // Generate a unique code based on company name or fallback to random
      let baseCode = '';
      if (existingLender.companyName && existingLender.companyName.trim()) {
        baseCode = existingLender.companyName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 20);
      }
      
      // Fallback to random alphanumeric if company name is empty
      if (!baseCode) {
        baseCode = 'lender-' + Math.random().toString(36).substring(2, 10);
      }
      
      let code = baseCode;
      let suffix = 1;
      
      // Ensure uniqueness with limit to prevent infinite loop
      const maxAttempts = 100;
      while (suffix <= maxAttempts) {
        const [existing] = await db
          .select()
          .from(lenders)
          .where(eq(lenders.generatedReferralCode, code));
        
        if (!existing) break;
        code = `${baseCode}-${suffix}`;
        suffix++;
      }
      
      if (suffix > maxAttempts) {
        return res.status(500).json({ error: "Could not generate unique referral code" });
      }
      
      // Update lender with generated code
      await db
        .update(lenders)
        .set({ generatedReferralCode: code })
        .where(eq(lenders.id, lender.id));
      
      res.json({ code, clickCount: 0 });
    } catch (error) {
      console.error("Error generating referral code:", error);
      res.status(500).json({ error: "Failed to generate referral code" });
    }
  });
  
  // Get lender's referral code and stats
  app.get("/api/lender/referral-stats", ensureLenderAuthenticated, async (req, res) => {
    try {
      const lender = req.user as any;
      
      const [lenderData] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.id, lender.id));
      
      if (!lenderData) {
        return res.status(404).json({ error: "Lender not found" });
      }
      
      res.json({
        code: lenderData.generatedReferralCode || null,
        clickCount: lenderData.referralClickCount || 0
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });
  
  // Public route: Track click and redirect to lender's referral link
  app.get("/apply/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      // Find lender by generated code
      const [lender] = await db
        .select()
        .from(lenders)
        .where(eq(lenders.generatedReferralCode, code));
      
      if (!lender) {
        return res.status(404).send("Lender not found");
      }
      
      // Increment click count
      await db
        .update(lenders)
        .set({ referralClickCount: sql`COALESCE(referral_click_count, 0) + 1` })
        .where(eq(lenders.id, lender.id));
      
      // Redirect to lender's referral link or website
      const destination = lender.referralLink || lender.website || '/lenders';
      res.redirect(destination);
    } catch (error) {
      console.error("Error processing referral click:", error);
      res.status(500).send("Error processing request");
    }
  });

  app.post("/api/admin/lender-broadcast", ensureAdmin, async (req, res) => {
    try {
      const { subject, bodyHtml, excludedEmails } = req.body;
      if (!subject || !bodyHtml) {
        return res.status(400).json({ error: "Subject and body are required" });
      }

      const excluded: string[] = Array.isArray(excludedEmails) ? excludedEmails : [];

      const adminUser = req.user as User;
      console.log(`[LENDER BROADCAST] Admin ${adminUser.email} sending broadcast: "${subject}" (excluding ${excluded.length})`);

      const allLenders = await storage.getAllLenders();
      const activeLenders = allLenders.filter((l: any) => !l.archived && !excluded.includes(l.email));

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const lender of activeLenders) {
        try {
          const success = await emailService.sendLenderBroadcastEmail(
            lender.email,
            lender.contactName || lender.companyName,
            lender.companyName,
            subject,
            bodyHtml
          );
          if (success) {
            sent++;
          } else {
            failed++;
            errors.push(`Failed to send to ${lender.companyName}`);
          }
        } catch (err: any) {
          failed++;
          errors.push(`Error sending to ${lender.companyName}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        totalLenders: activeLenders.length,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Error sending lender broadcast:", error);
      res.status(500).json({ error: "Failed to send broadcast" });
    }
  });

  app.get("/api/admin/lender-broadcast/preview", ensureAdminReadAccess, async (req, res) => {
    try {
      const allLenders = await storage.getAllLenders();
      const activeLenders = allLenders.filter((l: any) => !l.archived);

      res.json({
        recipientCount: activeLenders.length,
        recipients: activeLenders.map((l: any) => ({
          companyName: l.companyName,
          contactName: l.contactName,
          email: l.email,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching broadcast preview:", error);
      res.status(500).json({ error: "Failed to fetch preview" });
    }
  });

  // Feature Feedback endpoints
  app.post("/api/feature-feedback", async (req, res) => {
    try {
      const { featureName, priorities, comments, email } = req.body;

      if (!featureName) {
        return res.status(400).json({ error: "Feature name is required" });
      }

      const user = req.user as User | undefined;

      const [feedback] = await db
        .insert(featureFeedback)
        .values({
          userId: user?.id || null,
          featureName,
          priorities: priorities || [],
          comments: comments || null,
          email: email || user?.email || null,
        })
        .returning();

      console.log(`[FEEDBACK] New feedback for "${featureName}" from ${user?.email || email || 'anonymous'}`);
      res.json({ success: true, id: feedback.id });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/admin/feature-feedback", ensureAdminReadAccess, async (req, res) => {
    try {
      const { feature, sort } = req.query;
      
      let query = db
        .select({
          id: featureFeedback.id,
          userId: featureFeedback.userId,
          featureName: featureFeedback.featureName,
          priorities: featureFeedback.priorities,
          comments: featureFeedback.comments,
          email: featureFeedback.email,
          createdAt: featureFeedback.createdAt,
          username: users.username,
          userEmail: users.email,
        })
        .from(featureFeedback)
        .leftJoin(users, eq(featureFeedback.userId, users.id));

      if (feature && typeof feature === 'string') {
        query = query.where(eq(featureFeedback.featureName, feature)) as any;
      }

      const sortOrder = sort === 'oldest' ? asc(featureFeedback.createdAt) : desc(featureFeedback.createdAt);
      const results = await (query as any).orderBy(sortOrder);

      res.json({ feedback: results });
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.delete("/api/admin/feature-feedback/:id", ensureAdminReadAccess, async (req, res) => {
    try {
      await db
        .delete(featureFeedback)
        .where(eq(featureFeedback.id, req.params.id));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ error: "Failed to delete feedback" });
    }
  });

  // ── Email Sender Aliases & Category Settings ────────────────────────────────

  app.get("/api/admin/email-senders", ensureAdminReadAccess, async (req, res) => {
    try {
      const aliases = await db.select().from(emailSenderAliases).orderBy(asc(emailSenderAliases.id));
      const categories = await db.select().from(emailCategorySettings);
      res.json({ aliases, categories });
    } catch (error) {
      console.error("Error fetching email senders:", error);
      res.status(500).json({ error: "Failed to fetch email senders" });
    }
  });

  app.post("/api/admin/email-senders", ensureAdmin, async (req, res) => {
    try {
      const parsed = insertEmailSenderAliasSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const [alias] = await db.insert(emailSenderAliases).values(parsed.data).returning();
      res.json(alias);
    } catch (error) {
      console.error("Error creating email sender alias:", error);
      res.status(500).json({ error: "Failed to create email sender alias" });
    }
  });

  app.delete("/api/admin/email-senders/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [alias] = await db.select().from(emailSenderAliases).where(eq(emailSenderAliases.id, id));
      if (!alias) return res.status(404).json({ error: "Alias not found" });
      if (alias.isDefault) return res.status(400).json({ error: "Cannot delete the default sender. Set another as default first." });
      // Check if assigned to any category
      const assignments = await db.select().from(emailCategorySettings).where(eq(emailCategorySettings.aliasId, id));
      if (assignments.length > 0) {
        return res.status(400).json({ error: "Cannot delete: this address is assigned to one or more email categories. Reassign them first." });
      }
      await db.delete(emailSenderAliases).where(eq(emailSenderAliases.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email sender alias:", error);
      res.status(500).json({ error: "Failed to delete email sender alias" });
    }
  });

  app.patch("/api/admin/email-senders/:id/default", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Clear all defaults, then set new one
      await db.update(emailSenderAliases).set({ isDefault: false });
      const [alias] = await db.update(emailSenderAliases).set({ isDefault: true }).where(eq(emailSenderAliases.id, id)).returning();
      if (!alias) return res.status(404).json({ error: "Alias not found" });
      res.json(alias);
    } catch (error) {
      console.error("Error setting default email sender:", error);
      res.status(500).json({ error: "Failed to set default email sender" });
    }
  });

  app.patch("/api/admin/email-category/:category", ensureAdmin, async (req, res) => {
    try {
      const { category } = req.params;
      const validCategories = ['transactional', 'support', 'webinar', 'marketing', 'lender'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }
      const aliasId = req.body.aliasId ? parseInt(req.body.aliasId) : null;
      // Upsert
      const existing = await db.select().from(emailCategorySettings).where(eq(emailCategorySettings.category, category));
      if (existing.length > 0) {
        const [updated] = await db.update(emailCategorySettings)
          .set({ aliasId, updatedAt: new Date() })
          .where(eq(emailCategorySettings.category, category))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(emailCategorySettings).values({ category, aliasId }).returning();
        res.json(created);
      }
    } catch (error) {
      console.error("Error updating email category:", error);
      res.status(500).json({ error: "Failed to update email category" });
    }
  });

  // ── Reporting Snapshots ──────────────────────────────────────────────────────

  app.get("/api/admin/reporting/snapshots", ensureAdmin, async (req, res) => {
    try {
      const snapshots = await storage.getRecentReportingSnapshots(12);
      res.json(snapshots);
    } catch (error) {
      console.error("Get reporting snapshots error:", error);
      res.status(500).json({ error: "Failed to fetch reporting snapshots" });
    }
  });

  app.get("/api/admin/reporting/snapshots/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const snapshot = await storage.getReportingSnapshot(id);
      if (!snapshot) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      res.json(snapshot);
    } catch (error) {
      console.error("Get reporting snapshot error:", error);
      res.status(500).json({ error: "Failed to fetch reporting snapshot" });
    }
  });

  app.post("/api/admin/reporting/snapshots", ensureAdmin, async (req, res) => {
    try {
      const data = insertReportingSnapshotSchema.parse(req.body);
      const existing = await storage.getReportingSnapshotByWeek(data.weekStart as string);
      if (existing) {
        return res.status(409).json({
          error: "A snapshot for this week already exists",
          existingId: existing.id,
        });
      }
      const snapshot = await storage.createReportingSnapshot(data);
      res.status(201).json(snapshot);
    } catch (error) {
      console.error("Create reporting snapshot error:", error);
      res.status(500).json({ error: "Failed to create reporting snapshot" });
    }
  });

  app.put("/api/admin/reporting/snapshots/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertReportingSnapshotSchema.partial().parse(req.body);
      const snapshot = await storage.updateReportingSnapshot(id, data);
      if (!snapshot) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      res.json(snapshot);
    } catch (error) {
      console.error("Update reporting snapshot error:", error);
      res.status(500).json({ error: "Failed to update reporting snapshot" });
    }
  });

  app.delete("/api/admin/reporting/snapshots/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteReportingSnapshot(id);
      if (!deleted) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      res.json({ message: "Snapshot deleted successfully" });
    } catch (error) {
      console.error("Delete reporting snapshot error:", error);
      res.status(500).json({ error: "Failed to delete reporting snapshot" });
    }
  });

  // ── User Submissions (feedback & issue reports) ─────────────────────────────

  app.post("/api/user-submissions", async (req, res) => {
    try {
      const user = req.user as User | undefined;
      const { type, title, description, email } = req.body;

      if (!type || !['issue', 'feature'].includes(type)) {
        return res.status(400).json({ error: "Type must be 'issue' or 'feature'" });
      }
      if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
      if (!description?.trim()) return res.status(400).json({ error: "Description is required" });

      const resolvedEmail = user?.email ?? email ?? null;

      const [submission] = await db.insert(userSubmissions).values({
        userId: user?.id ?? null,
        userEmail: resolvedEmail,
        type,
        title: title.trim(),
        description: description.trim(),
      }).returning();

      res.json(submission);

      // Fire emails asynchronously — don't block the response
      const submitterName = (user as any)?.profile?.fullName
        || (user as any)?.username
        || resolvedEmail?.split('@')[0]
        || 'there';

      if (resolvedEmail) {
        emailService.sendUserSubmissionConfirmation(
          resolvedEmail,
          submitterName,
          type as 'issue' | 'feature',
          title.trim(),
          description.trim()
        ).catch(err => console.error('Failed to send submission confirmation:', err));
      }

      emailService.sendUserSubmissionAdminAlert(
        resolvedEmail ?? 'Anonymous',
        type as 'issue' | 'feature',
        title.trim(),
        description.trim()
      ).catch(err => console.error('Failed to send admin alert:', err));
    } catch (error) {
      console.error("Error saving user submission:", error);
      res.status(500).json({ error: "Failed to save submission" });
    }
  });

  app.get("/api/admin/user-submissions", ensureAdminReadAccess, async (req, res) => {
    try {
      const rows = await db
        .select({
          id: userSubmissions.id,
          type: userSubmissions.type,
          title: userSubmissions.title,
          description: userSubmissions.description,
          status: userSubmissions.status,
          createdAt: userSubmissions.createdAt,
          userEmail: userSubmissions.userEmail,
          userId: userSubmissions.userId,
          submitterEmail: users.email,
        })
        .from(userSubmissions)
        .leftJoin(users, eq(userSubmissions.userId, users.id))
        .orderBy(desc(userSubmissions.createdAt));

      // Prefer linked user's email over stored email
      const result = rows.map(r => ({
        ...r,
        resolvedEmail: r.submitterEmail ?? r.userEmail ?? 'Anonymous',
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching user submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.patch("/api/admin/user-submissions/:id/status", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['open', 'resolved'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'open' or 'resolved'" });
      }
      const [updated] = await db
        .update(userSubmissions)
        .set({ status })
        .where(eq(userSubmissions.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: "Submission not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating submission status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Create HTTP server
  const server = createServer(app);
  return server;
}
