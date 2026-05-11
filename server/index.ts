import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import compression from "compression";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runPrerender, registerPrerenderRoutes } from "./prerender";
import { pool, db } from "./db";
import { affiliates, serviceRegions, discountCodes, users } from "@shared/schema";
import { eq, count, sql } from "drizzle-orm";
import passport from "./auth";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, isStripeConfigured, getStripeSecretKey } from './services/stripeClient';
import { WebhookHandlers } from './services/webhookHandlers';
import { closingRemindersService } from './services/closingReminders.service';
import { webinarReminderService } from './services/webinar-reminder.service';
import { signupFollowupService } from './services/signupFollowup.service';
import { verificationReminderService } from './services/verificationReminder.service';
import { subscriptionRetentionService } from './services/subscriptionRetention.service';
import { storage } from './storage';

async function runCacheCleanup() {
  try {
    const [propDeleted, compDeleted] = await Promise.all([
      storage.deleteExpiredPropertyCache(),
      storage.deleteExpiredCompCache(),
    ]);
    console.log(`[cache-cleanup] Deleted ${propDeleted} property cache rows, ${compDeleted} comp cache rows`);
  } catch (err: any) {
    console.error('[cache-cleanup] Error during cache cleanup (non-fatal):', err.message);
  }
}

const app = express();

app.use(compression({
  filter: (req, res) => {
    if (req.path.endsWith('.mp4')) return false;
    return compression.filter(req, res);
  }
}));

// Serve static assets (videos, images) from attached_assets folder
app.use('/static-assets', express.static(path.resolve(process.cwd(), 'attached_assets')));

app.set('trust proxy', 1);

// Initialize Stripe schema and sync data
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set - Stripe integration disabled');
    return;
  }

  const stripeConfigured = await isStripeConfigured();
  if (!stripeConfigured) {
    console.warn('Stripe not configured - skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    if (!domain) {
      console.warn('REPLIT_DOMAINS not set - skipping webhook setup');
    } else if (domain !== 'redatametrix.com') {
      console.log(`Skipping webhook registration for non-production domain: ${domain}`);
    } else {
      const webhookBaseUrl = `https://${domain}`;
      const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`,
        {
          enabled_events: ['*'],
          description: 'Managed webhook for Stripe sync',
        }
      );
      console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => {
        console.log('Stripe data synced');
      })
      .catch((err: any) => {
        // Handle stale customer IDs that were deleted from Stripe but still exist in sync cache
        if (err?.code === 'resource_missing' && err?.message?.includes('No such customer')) {
          console.warn(`[Stripe Sync] Skipping deleted customer: ${err?.param || 'unknown'} - This customer was deleted from Stripe but still exists in the sync cache. The sync will continue for other records.`);
        } else {
          console.error('Error syncing Stripe data:', err);
        }
      });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

// Seed FREEMONTH discount code if it doesn't exist
async function runStartupMigrations() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_cancellation_choice text`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamp`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deal_analysis_auto INTEGER NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deal_analysis_manual INTEGER NOT NULL DEFAULT 0`);
    // Remove duplicate (user_id, email_type) rows before creating the unique index, keeping the earliest sent record
    await db.execute(sql`
      DELETE FROM sent_signup_followups
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, email_type) id
        FROM sent_signup_followups
        ORDER BY user_id, email_type, sent_at ASC NULLS LAST
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS sent_signup_followups_user_email_type_unique ON sent_signup_followups (user_id, email_type)`);
    await db.execute(sql`ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS stripe_duration text DEFAULT 'repeating'`);
    await db.execute(sql`ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS stripe_duration_in_months integer DEFAULT 12`);
    // Ensure FREEMONTH always stays 'once' regardless of column default
    await db.execute(sql`UPDATE discount_codes SET stripe_duration = 'once', stripe_duration_in_months = NULL WHERE code = 'FREEMONTH'`);
    console.log('[Migrations] pending_cancellation_choice, email_verified_at, stripe_duration, stripe_duration_in_months columns ensured');
  } catch (err) {
    console.error('[Migrations] Startup migration error (non-fatal):', err);
  }
}

async function seedFreeMonthDiscount() {
  try {
    const [existing] = await db.select().from(discountCodes).where(eq(discountCodes.code, 'FREEMONTH'));
    if (existing) return;

    const secretKey = await getStripeSecretKey().catch(() => null);
    if (!secretKey) {
      console.warn('[SEED] Stripe not configured — skipping FREEMONTH coupon creation');
      return;
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });

    let couponId = 'FREEMONTH';
    try {
      await stripe.coupons.create({
        id: 'FREEMONTH',
        name: 'Free Month Promotion',
        amount_off: 2500,
        currency: 'usd',
        duration: 'once',
      });
      console.log('[SEED] Created Stripe coupon FREEMONTH');
    } catch (err: any) {
      if (err?.code === 'resource_already_exists') {
        console.log('[SEED] Stripe coupon FREEMONTH already exists, reusing');
      } else {
        throw err;
      }
    }

    await db.insert(discountCodes).values({
      code: 'FREEMONTH',
      displayName: 'Free Month Promotion',
      description: 'Pay for 9 months, get 12. Limited time offer.',
      planApplicability: 'annual',
      amountOff: '25.00',
      stripeCouponId: couponId,
      isActive: true,
      stripeDuration: 'once',
      stripeDurationInMonths: null,
    });
    console.log('[SEED] Inserted FREEMONTH discount code into database');
  } catch (err) {
    console.error('[SEED] Failed to seed FREEMONTH discount code:', err);
  }
}

// Register Stripe webhook route BEFORE express.json() - CRITICAL
app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

const PgSession = connectPgSimple(session);

if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET must be set. Did you forget to add it to your environment?");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set for session storage.");
  process.exit(1);
}

let sessionStore: InstanceType<typeof PgSession>;
try {
  sessionStore = new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  });

  sessionStore.on('error', (error) => {
    console.error('Session store error:', error);
  });
} catch (error) {
  console.error('Failed to initialize session store:', error);
  process.exit(1);
}

app.use((req, _res, next) => {
  const sessionToken = req.headers['x-session-token'] as string | undefined;
  if (sessionToken && (!req.headers.cookie || !req.headers.cookie.includes('connect.sid'))) {
    const cookieStr = `connect.sid=${encodeURIComponent(sessionToken)}`;
    req.headers.cookie = req.headers.cookie
      ? `${req.headers.cookie}; ${cookieStr}`
      : cookieStr;
  }
  next();
});

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// JSON middleware for all other routes (AFTER webhook route)
app.use(express.json({
  limit: '5mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await runStartupMigrations();

  const server = await registerRoutes(app);

  // One-time fix: ensure admin@redatametrix.com has admin role
  try {
    await db.update(users)
      .set({ role: 'admin' })
      .where(sql`LOWER(${users.email}) = 'admin@redatametrix.com' AND ${users.role} != 'admin'`);
  } catch (e) {
    console.error('Admin role fix error:', e);
  }

  // Data fixes: correct affiliate data on startup
  try {
    const { sql } = await import('drizzle-orm');
    await db.update(affiliates)
      .set({ name: 'DealMachine', logoUrl: null })
      .where(eq(affiliates.name, 'Deal Machine'));
    await db.update(affiliates)
      .set({ logoUrl: null })
      .where(sql`${affiliates.slug} = 'deal-machine' AND (${affiliates.logoUrl} LIKE '%dealmachine.com/?%' OR ${affiliates.logoUrl} LIKE '%dealmachine.com/logo%')`);

    const emailMap: Record<string, string> = {
      'FreedomLeads': 'jacob@freedomleads.com',
      'Propstream': 'partners@propstream.com',
      'Padsplit': 'support@padsplit.zendesk.com',
      'DealMachine': 'promoter@firstpromoter.com',
      'Rehab Valuator': 'support@rehabvaluator.com',
      'DealCheck': 'affiliates@dealcheck.io',
      'Flipster': 'jerrynorton@flippingmastery.com',
      'FreedomSoft': 'support@freedomsoft.com',
      'REsimpli': 'tyler@resimpli.com',
      'BatchLeads': 'affiliate@getbatch.co',
      'Carrot': 'partners@carrot.com',
    };
    for (const [name, email] of Object.entries(emailMap)) {
      await db.update(affiliates)
        .set({ contactEmail: email })
        .where(sql`${affiliates.name} = ${name} AND ${affiliates.contactEmail} IS NULL`);
    }
  } catch (e) {
    console.error('Data fix error:', e);
  }

  try {
    const [{ count: regionCount }] = await db.select({ count: count() }).from(serviceRegions);
    if (Number(regionCount) === 0) {
      console.log('Seeding service regions...');
      const regions: { state: string; name: string; keyCities: string[]; sortOrder: number }[] = [
        { state: 'GA', name: 'Atlanta Metro', keyCities: ['Atlanta', 'Marietta', 'Alpharetta', 'Roswell', 'Sandy Springs', 'Johns Creek', 'Duluth', 'Lawrenceville', 'Decatur', 'Smyrna', 'Kennesaw'], sortOrder: 1 },
        { state: 'GA', name: 'North Georgia Mountains', keyCities: ['Blue Ridge', 'Dahlonega', 'Helen', 'Ellijay', 'Blairsville', 'Clayton', 'Hiawassee'], sortOrder: 2 },
        { state: 'GA', name: 'Athens Area', keyCities: ['Athens', 'Watkinsville', 'Winterville', 'Bogart'], sortOrder: 3 },
        { state: 'GA', name: 'Augusta Area', keyCities: ['Augusta', 'Evans', 'Martinez', 'Grovetown'], sortOrder: 4 },
        { state: 'GA', name: 'Macon Area', keyCities: ['Macon', 'Warner Robins', 'Byron', 'Forsyth'], sortOrder: 5 },
        { state: 'GA', name: 'Savannah Area', keyCities: ['Savannah', 'Pooler', 'Richmond Hill', 'Hinesville'], sortOrder: 6 },
        { state: 'GA', name: 'Columbus Area', keyCities: ['Columbus', 'Phenix City', 'Fort Moore'], sortOrder: 7 },
        { state: 'GA', name: 'Valdosta Area', keyCities: ['Valdosta', 'Lowndes County', 'Moultrie'], sortOrder: 8 },
        { state: 'GA', name: 'Brunswick/Golden Isles', keyCities: ['Brunswick', 'St. Simons Island', 'Jekyll Island'], sortOrder: 9 },
        { state: 'GA', name: 'Gainesville/Lake Lanier', keyCities: ['Gainesville', 'Flowery Branch', 'Buford', 'Cumming'], sortOrder: 10 },
        { state: 'GA', name: 'South Metro Atlanta', keyCities: ['McDonough', 'Stockbridge', 'Griffin', 'Newnan', 'Peachtree City', 'Fayetteville'], sortOrder: 11 },
        { state: 'GA', name: 'Northwest Georgia', keyCities: ['Rome', 'Dalton', 'Cartersville', 'Calhoun'], sortOrder: 12 },
        { state: 'GA', name: 'Middle Georgia', keyCities: ['Dublin', 'Milledgeville', 'Sandersville', 'Vidalia'], sortOrder: 13 },
        { state: 'GA', name: 'Southwest Georgia', keyCities: ['Albany', 'Americus', 'Cordele', 'Tifton'], sortOrder: 14 },
        { state: 'GA', name: 'Albany Area', keyCities: ['Albany', 'Leesburg', 'Dawson'], sortOrder: 15 },
        { state: 'AL', name: 'Birmingham Metro', keyCities: ['Birmingham', 'Hoover', 'Vestavia Hills', 'Homewood', 'Mountain Brook', 'Trussville', 'Pelham'], sortOrder: 1 },
        { state: 'AL', name: 'Huntsville Metro', keyCities: ['Huntsville', 'Madison', 'Decatur', 'Athens'], sortOrder: 2 },
        { state: 'AL', name: 'Montgomery Metro', keyCities: ['Montgomery', 'Prattville', 'Millbrook', 'Wetumpka'], sortOrder: 3 },
        { state: 'AL', name: 'Mobile Metro', keyCities: ['Mobile', 'Prichard', 'Saraland', 'Chickasaw'], sortOrder: 4 },
        { state: 'AL', name: 'Tuscaloosa Metro', keyCities: ['Tuscaloosa', 'Northport', 'Holt'], sortOrder: 5 },
        { state: 'AL', name: 'Auburn-Opelika', keyCities: ['Auburn', 'Opelika', 'Phenix City'], sortOrder: 6 },
        { state: 'AL', name: 'Florence-Muscle Shoals', keyCities: ['Florence', 'Muscle Shoals', 'Sheffield', 'Tuscumbia'], sortOrder: 7 },
        { state: 'AL', name: 'Dothan/Wiregrass', keyCities: ['Dothan', 'Enterprise', 'Ozark', 'Daleville'], sortOrder: 8 },
        { state: 'AL', name: 'Gadsden Area', keyCities: ['Gadsden', 'Attalla', 'Rainbow City', 'Albertville'], sortOrder: 9 },
        { state: 'AL', name: 'Anniston-Oxford', keyCities: ['Anniston', 'Oxford', 'Jacksonville', 'Heflin'], sortOrder: 10 },
        { state: 'AL', name: 'Gulf Coast/Baldwin County', keyCities: ['Gulf Shores', 'Orange Beach', 'Fairhope', 'Daphne', 'Foley'], sortOrder: 11 },
        { state: 'AL', name: 'North Alabama', keyCities: ['Cullman', 'Hartselle', 'Moulton', 'Scottsboro'], sortOrder: 12 },
        { state: 'AL', name: 'Central Alabama', keyCities: ['Selma', 'Clanton', 'Alexander City', 'Talladega'], sortOrder: 13 },
        { state: 'AL', name: 'East Alabama', keyCities: ['Valley', 'Lanett', 'Roanoke', 'Dadeville'], sortOrder: 14 },
        { state: 'AL', name: 'West Alabama', keyCities: ['Demopolis', 'Livingston', 'Greensboro', 'Eutaw'], sortOrder: 15 },
        { state: 'FL', name: 'Miami-Dade/South Beach', keyCities: ['Miami', 'Miami Beach', 'Hialeah', 'Coral Gables', 'Doral', 'Homestead', 'Kendall', 'North Miami'], sortOrder: 1 },
        { state: 'FL', name: 'Fort Lauderdale/Broward', keyCities: ['Fort Lauderdale', 'Hollywood', 'Pembroke Pines', 'Coral Springs', 'Plantation', 'Davie', 'Sunrise', 'Deerfield Beach'], sortOrder: 2 },
        { state: 'FL', name: 'West Palm Beach/Palm Beach County', keyCities: ['West Palm Beach', 'Boca Raton', 'Boynton Beach', 'Delray Beach', 'Jupiter', 'Palm Beach Gardens', 'Lake Worth', 'Wellington'], sortOrder: 3 },
        { state: 'FL', name: 'Florida Keys/Monroe County', keyCities: ['Key West', 'Key Largo', 'Marathon', 'Islamorada', 'Big Pine Key'], sortOrder: 4 },
        { state: 'FL', name: 'Naples/Southwest Florida', keyCities: ['Naples', 'Marco Island', 'Bonita Springs', 'Estero', 'Immokalee'], sortOrder: 5 },
        { state: 'FL', name: 'Fort Myers/Cape Coral', keyCities: ['Fort Myers', 'Cape Coral', 'Lehigh Acres', 'North Fort Myers', 'Sanibel'], sortOrder: 6 },
        { state: 'FL', name: 'Sarasota/Bradenton', keyCities: ['Sarasota', 'Bradenton', 'North Port', 'Venice', 'Palmetto', 'Lakewood Ranch'], sortOrder: 7 },
        { state: 'FL', name: 'Tampa Metro', keyCities: ['Tampa', 'Brandon', 'Temple Terrace', 'Plant City', 'Riverview', 'Wesley Chapel', 'Land O Lakes'], sortOrder: 8 },
        { state: 'FL', name: 'St. Petersburg/Clearwater', keyCities: ['St. Petersburg', 'Clearwater', 'Largo', 'Dunedin', 'Pinellas Park', 'Tarpon Springs'], sortOrder: 9 },
        { state: 'FL', name: 'Nature Coast (Citrus/Hernando)', keyCities: ['Spring Hill', 'Brooksville', 'Crystal River', 'Homosassa', 'Inverness', 'Weeki Wachee'], sortOrder: 10 },
        { state: 'FL', name: 'Lakeland/Polk County', keyCities: ['Lakeland', 'Winter Haven', 'Bartow', 'Haines City', 'Lake Wales', 'Auburndale'], sortOrder: 11 },
        { state: 'FL', name: 'Orlando Metro', keyCities: ['Orlando', 'Winter Park', 'Altamonte Springs', 'Sanford', 'Oviedo', 'Lake Mary', 'Apopka'], sortOrder: 12 },
        { state: 'FL', name: 'Kissimmee/Osceola', keyCities: ['Kissimmee', 'St. Cloud', 'Celebration', 'Poinciana'], sortOrder: 13 },
        { state: 'FL', name: 'Space Coast/Brevard', keyCities: ['Melbourne', 'Palm Bay', 'Titusville', 'Cocoa', 'Cocoa Beach', 'Merritt Island', 'Rockledge'], sortOrder: 14 },
        { state: 'FL', name: 'Daytona Beach/Volusia', keyCities: ['Daytona Beach', 'Ormond Beach', 'Port Orange', 'DeLand', 'New Smyrna Beach', 'Deltona'], sortOrder: 15 },
        { state: 'FL', name: 'Treasure Coast (Stuart/Port St. Lucie)', keyCities: ['Port St. Lucie', 'Stuart', 'Fort Pierce', 'Vero Beach', 'Sebastian', 'Jensen Beach'], sortOrder: 16 },
        { state: 'FL', name: 'The Villages/Sumter County', keyCities: ['The Villages', 'Wildwood', 'Bushnell', 'Coleman', 'Lady Lake', 'Leesburg'], sortOrder: 17 },
        { state: 'FL', name: 'Ocala/Marion County', keyCities: ['Ocala', 'Belleview', 'Dunnellon', 'Silver Springs'], sortOrder: 18 },
        { state: 'FL', name: 'Gainesville Area', keyCities: ['Gainesville', 'Alachua', 'Newberry', 'High Springs'], sortOrder: 19 },
        { state: 'FL', name: 'Jacksonville Metro', keyCities: ['Jacksonville', 'Jacksonville Beach', 'Orange Park', 'St. Augustine', 'Fernandina Beach', 'Ponte Vedra Beach'], sortOrder: 20 },
        { state: 'FL', name: 'Tallahassee Area', keyCities: ['Tallahassee', 'Quincy', 'Monticello', 'Crawfordville'], sortOrder: 21 },
        { state: 'FL', name: 'Panama City/Emerald Coast', keyCities: ['Panama City', 'Panama City Beach', 'Destin', 'Fort Walton Beach', 'Crestview', 'Defuniak Springs'], sortOrder: 22 },
        { state: 'FL', name: 'Pensacola/Northwest Florida', keyCities: ['Pensacola', 'Pensacola Beach', 'Milton', 'Gulf Breeze', 'Pace', 'Navarre'], sortOrder: 23 },
      ];
      for (const region of regions) {
        await db.insert(serviceRegions).values(region);
      }
      console.log(`Seeded ${regions.length} service regions`);
    }
  } catch (e) {
    console.error('Service regions seed error:', e);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    await runPrerender().catch(err => {
      console.error('[prerender] Non-fatal error during prerender:', err);
    });
    registerPrerenderRoutes(app);

    // Explicit streaming route for large video assets — must come before serveStatic
    // so Express sets the correct headers and supports range requests for MP4 playback.
    app.get("/assets/*.mp4", (req: Request, res: Response) => {
      const filePath = path.join(process.cwd(), "dist/public", req.path);
      res.sendFile(filePath, {
        headers: {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000",
        },
      }, (err) => {
        if (err) {
          console.error(`[static] Failed to serve video ${req.path}:`, err);
          if (!res.headersSent) res.status(404).end();
        }
      });
    });

    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start background services
    closingRemindersService.start();
    webinarReminderService.start();
    signupFollowupService.start();
    verificationReminderService.start();
    subscriptionRetentionService.start();

    // Cache cleanup — run once at boot then every 24 hours
    runCacheCleanup();
    setInterval(runCacheCleanup, 24 * 60 * 60 * 1000);

    // Initialize Stripe after server is already listening so health checks pass immediately
    initStripe().catch((err) => {
      console.error('Stripe initialization error (non-fatal):', err);
    });

    // Seed FREEMONTH discount code (no-op if already exists)
    seedFreeMonthDiscount().catch((err) => {
      console.error('FREEMONTH seed error (non-fatal):', err);
    });
  });
})();
