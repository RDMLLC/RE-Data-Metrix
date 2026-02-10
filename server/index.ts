import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool, db } from "./db";
import { affiliates } from "@shared/schema";
import { eq } from "drizzle-orm";
import passport from "./auth";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, isStripeConfigured } from './services/stripeClient';
import { WebhookHandlers } from './services/webhookHandlers';
import { closingRemindersService } from './services/closingReminders.service';
import { webinarReminderService } from './services/webinar-reminder.service';

const app = express();

// Serve static assets (videos, images) from attached_assets folder
app.use('/static-assets', express.static(path.resolve(process.cwd(), 'attached_assets')));

// Trust proxy for secure cookies behind Replit's HTTPS proxy
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

// In Replit's environment, we need 'none' for cross-origin webview, but it requires secure: true
// Replit provides HTTPS even in development, so we can use secure: true
const isReplit = !!process.env.REPLIT_DOMAINS;
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      // Use 'none' for Replit webview (cross-origin iframe), 'lax' otherwise
      sameSite: isReplit ? 'none' : 'lax',
      // Secure must be true when sameSite is 'none', and Replit provides HTTPS
      secure: isReplit || isProduction,
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
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

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
  // Initialize Stripe before registering routes
  await initStripe();
  
  const server = await registerRoutes(app);

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
      'MotivatedLeads': 'jacob@freedomleads.com',
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
    
    // Start the closing reminders service
    closingRemindersService.start();
    
    // Start the webinar reminder service
    webinarReminderService.start();
  });
})();
