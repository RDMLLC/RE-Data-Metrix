import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { completeCheckoutSession } from './checkoutService';
import { outboundWebhookService } from './outbound-webhook.service';
import { sendMetaCapiEvent } from './metaCapi';
import { emailService } from './email.service';
import { db } from '../db';
import { users, userProfiles, sentSignupFollowups } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import Stripe from 'stripe';

const RETENTION_EMAIL_TYPES = ['retention_day5', 'retention_day10', 'retention_day23'];

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    const stripe = await getUncachableStripeClient();
    let event: Stripe.Event;
    
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        event = JSON.parse(payload.toString());
      }
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw err;
    }

    console.log(`Received webhook ${event.id}: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.mode === 'subscription' && session.payment_status === 'paid') {
        try {
          const result = await completeCheckoutSession(session.id, { allowFallback: false });

          if (!result.success && result.error === 'NO_PENDING') {
            console.log(`[WEBHOOK] No pending registration for session ${session.id} — browser redirect will handle account creation. No email sent.`);
          }
          
          if (result.success) {
            console.log(`[WEBHOOK] Checkout completed for session ${session.id}: ${result.message}`);

            if (result.userId) {
              try {
                const [user] = await db.select().from(users).where(eq(users.id, result.userId)).limit(1);
                if (user) {
                  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
                  const fullName = (profile?.fullName || session.customer_details?.name || '').trim();
                  const nameParts = fullName.split(/\s+/);
                  const firstName = nameParts[0] || '';
                  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

                  const webhookPlan = user.subscriptionPlan || 'monthly';
                  const webhookPayload = {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    firstName,
                    lastName,
                    fullName,
                    phone: profile?.phone || '',
                    subscriptionType: webhookPlan,
                    subscriptionStatus: user.subscriptionStatus || 'active',
                    stripeCustomerId: user.stripeCustomerId || '',
                    stripeSubscriptionId: user.stripeSubscriptionId || '',
                    createdAt: new Date().toISOString(),
                    workflowTrigger: webhookPlan === 'annual' ? 'annual_signup' : 'monthly_signup',
                    previousPlan: null,
                    currentPlan: webhookPlan,
                    isNewSignup: true,
                    isUpgrade: false,
                  };

                  if (!result.alreadyProcessed) {
                    outboundWebhookService.triggerWebhooks('subscription_completed', webhookPayload)
                      .catch(err => console.error('[Webhook] subscription_completed trigger error:', err));

                    outboundWebhookService.triggerWebhooks('user_signup', {
                      ...webhookPayload,
                      isComped: false,
                    }).catch(err => console.error('[Webhook] user_signup trigger error (paid signup):', err));

                    // Meta CAPI: fire CompleteRegistration + Subscribe for paid signups
                    const metaEventId = (session as any).metadata?.meta_event_id || undefined;
                    const subAmount = typeof (session as any).amount_total === 'number'
                      ? (session as any).amount_total / 100
                      : undefined;

                    sendMetaCapiEvent(
                      'CompleteRegistration',
                      {
                        email: user.email,
                        firstName,
                        lastName,
                        clientIp: session.customer_details?.address?.city ? undefined : undefined,
                      },
                      { contentName: 'paid_signup', value: subAmount },
                      metaEventId,
                    ).catch(err => console.error('[CAPI] CompleteRegistration (paid) error:', err));

                    sendMetaCapiEvent(
                      'Subscribe',
                      {
                        email: user.email,
                        firstName,
                        lastName,
                      },
                      { value: subAmount, contentName: user.subscriptionPlan || 'monthly' },
                      metaEventId ? `sub_${metaEventId}` : undefined,
                    ).catch(err => console.error('[CAPI] Subscribe error:', err));
                  } else {
                    console.log(`[WEBHOOK] Skipping webhooks for session ${session.id} - already processed by frontend or upgrade flow`);
                  }
                }
              } catch (err) {
                console.error('[Webhook] Error fetching user for subscription webhook:', err);
              }
            }
          } else if (result.error !== 'NO_PENDING') {
            console.error(`[WEBHOOK] Failed to complete checkout for session ${session.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`[WEBHOOK] Error processing checkout.session.completed:`, error);
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const attemptCount = invoice.attempt_count ?? 1;

      if (customerId) {
        try {
          const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
          if (user && (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'comped' || user.subscriptionStatus === 'referral_trial')) {
            // Only record paymentFailedAt on the first failure
            if (!user.paymentFailedAt) {
              await db.update(users).set({ paymentFailedAt: new Date() }).where(eq(users.id, user.id));
              console.log(`[WEBHOOK] Recorded first payment failure for user ${user.email}`);
            }

            // Send payment failed email on first attempt only
            if (attemptCount <= 1) {
              try {
                const stripe = await getUncachableStripeClient();
                let billingPortalUrl = `${process.env.VITE_APP_URL || 'https://redatametrix.com'}/settings`;
                try {
                  const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: `${process.env.VITE_APP_URL || 'https://redatametrix.com'}/settings`,
                  });
                  billingPortalUrl = portalSession.url;
                } catch (portalErr) {
                  console.warn('[WEBHOOK] Could not create billing portal session:', portalErr);
                }

                const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
                const fullName = (profile?.fullName || '').trim();
                const firstName = fullName.split(/\s+/)[0] || user.username;

                await emailService.sendPaymentFailedEmail(user.email, firstName, billingPortalUrl);
                console.log(`[WEBHOOK] Sent payment failed email to ${user.email}`);
              } catch (emailErr) {
                console.error('[WEBHOOK] Failed to send payment failed email:', emailErr);
              }
            }
          }
        } catch (err) {
          console.error('[WEBHOOK] Error handling invoice.payment_failed:', err);
        }
      }
    }

    // When a payment succeeds, clear paymentFailedAt and retention email markers
    // so users who fix billing (or resubscribe after a churn cycle) get the full lifecycle again
    if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        try {
          const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
          if (user && user.paymentFailedAt) {
            await db.update(users).set({ paymentFailedAt: null }).where(eq(users.id, user.id));
            // Also clear retention email markers so future churn cycles get fresh emails
            await db.delete(sentSignupFollowups).where(
              and(
                eq(sentSignupFollowups.userId, user.id),
                inArray(sentSignupFollowups.emailType, RETENTION_EMAIL_TYPES),
              )
            );
            console.log(`[WEBHOOK] Cleared paymentFailedAt and retention markers for ${user.email} — payment recovered`);
          }
        } catch (err) {
          console.error('[WEBHOOK] Error clearing paymentFailedAt on payment success:', err);
        }
      }
    }

    // Safety net: if cancel_at_period_end was set to true externally (Stripe dashboard,
    // API, or an old portal session), ensure our DB reflects the cancelling state so
    // the period-end deletion webhook can complete the transition correctly.
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const previousAttributes = (event.data as any).previous_attributes as Record<string, any> | undefined;

      const cancelAtPeriodEnd = subscription.cancel_at_period_end;
      const previousCancelAtPeriodEnd = previousAttributes?.cancel_at_period_end;

      // Only act when cancel_at_period_end just flipped from false → true
      if (cancelAtPeriodEnd === true && previousCancelAtPeriodEnd === false) {
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
        const subscriptionId = subscription.id;

        try {
          let userRows = customerId
            ? await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1)
            : [];
          if (!userRows.length) {
            userRows = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId)).limit(1);
          }
          const [user] = userRows;

          if (user && user.subscriptionStatus !== 'cancelling') {
            await db.update(users).set({
              subscriptionStatus: 'cancelling',
              pendingCancellationChoice: 'cancel',
            }).where(eq(users.id, user.id));
            console.log(`[WEBHOOK] External cancellation detected for ${user.email} — set status='cancelling', choice='cancel'`);
          } else if (user) {
            console.log(`[WEBHOOK] subscription.updated cancel_at_period_end=true for ${user.email} — already 'cancelling', no action needed`);
          }
        } catch (err) {
          console.error('[WEBHOOK] Error handling customer.subscription.updated (cancel fallback):', err);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
      const subscriptionId = subscription.id;

      try {
        // Try by customer ID first, then fall back to subscription ID
        let userRows = customerId
          ? await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1)
          : [];
        if (!userRows.length) {
          userRows = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId)).limit(1);
        }
        const [user] = userRows;

        if (user && user.subscriptionStatus === 'cancelling') {
          // Grace-period path: the in-app cancel API set status='cancelling' and stored the
          // user's choice in pendingCancellationChoice. Now that the billing period has
          // ended and Stripe has confirmed deletion, complete the transition.
          const now = new Date();
          const choice = user.pendingCancellationChoice;

          if (choice === 'downgrade') {
            // Downgrade to free: data preserved indefinitely, no deletion clock.
            await db.update(users).set({
              subscriptionStatus: 'free',
              subscriptionPlan: null,
              stripeSubscriptionId: null,
              pendingCancellationChoice: null,
              downgradedAt: null,
              paymentFailedAt: null,
            }).where(eq(users.id, user.id));
            console.log(`[WEBHOOK] User ${user.email} fully downgraded to free (downgrade choice) — data preserved`);
          } else {
            // 'cancel' choice or unknown: set to free and start 30-day deletion clock from now.
            await db.update(users).set({
              subscriptionStatus: 'free',
              subscriptionPlan: null,
              stripeSubscriptionId: null,
              pendingCancellationChoice: null,
              downgradedAt: now,
              paymentFailedAt: null,
            }).where(eq(users.id, user.id));
            console.log(`[WEBHOOK] User ${user.email} fully cancelled — downgradedAt set to ${now.toISOString()} (30-day deletion clock started)`);
          }
        } else if (user && user.subscriptionStatus === 'free') {
          // Idempotency guard: status is already 'free' (e.g. legacy cancel path or
          // double webhook). Clear stripeSubscriptionId and any stale pendingCancellationChoice.
          await db.update(users).set({
            stripeSubscriptionId: null,
            pendingCancellationChoice: null,
          }).where(eq(users.id, user.id));
          console.log(`[WEBHOOK] Cleared stripeSubscriptionId for ${user.email} — status was already 'free'`);
        } else if (user && user.subscriptionStatus !== 'archived') {
          // Subscription was deleted by Stripe externally (e.g. payment failure leading
          // to eventual deletion). Process normally.
          const now = new Date();
          await db.update(users).set({
            subscriptionStatus: 'free',
            subscriptionPlan: null,
            stripeSubscriptionId: null,
            pendingCancellationChoice: null,
            downgradedAt: now,
            paymentFailedAt: null,
          }).where(eq(users.id, user.id));

          console.log(`[WEBHOOK] Downgraded user ${user.email} to free after subscription deleted externally`);

          try {
            const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
            const fullName = (profile?.fullName || '').trim();
            const firstName = fullName.split(/\s+/)[0] || user.username;
            await emailService.sendAccountDowngradedEmail(user.email, firstName);
            console.log(`[WEBHOOK] Sent account downgraded email to ${user.email}`);
          } catch (emailErr) {
            console.error('[WEBHOOK] Failed to send account downgraded email:', emailErr);
          }

          outboundWebhookService.triggerWebhooks('subscription_cancelled', {
            userId: user.id,
            email: user.email,
            username: user.username,
            stripeCustomerId: customerId ?? '',
            stripeSubscriptionId: subscriptionId,
            cancelledAt: now.toISOString(),
          }).catch(err => console.error('[Webhook] subscription_cancelled trigger error:', err));
        }
      } catch (err) {
        console.error('[WEBHOOK] Error handling customer.subscription.deleted:', err);
      }
    }

    try {
      await sync.processWebhook(payload, signature, uuid);
    } catch (syncError: any) {
      if (syncError.message?.includes('Unhandled webhook event')) {
        console.log(`[WEBHOOK] Stripe sync: ${syncError.message}`);
      } else {
        console.error('[WEBHOOK] Stripe sync error:', syncError);
      }
    }
  }
}
