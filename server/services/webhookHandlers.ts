import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { completeCheckoutSession } from './checkoutService';
import { outboundWebhookService } from './outbound-webhook.service';
import { sendMetaCapiEvent } from './metaCapi';
import { db } from '../db';
import { users, userProfiles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

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
          const result = await completeCheckoutSession(session.id);
          
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

                  const webhookPayload = {
                    userId: user.id,
                    email: user.email,
                    username: user.username,
                    firstName,
                    lastName,
                    fullName,
                    phone: profile?.phone || '',
                    subscriptionType: user.subscriptionPlan || 'monthly',
                    subscriptionStatus: user.subscriptionStatus || 'active',
                    stripeCustomerId: user.stripeCustomerId || '',
                    stripeSubscriptionId: user.stripeSubscriptionId || '',
                    createdAt: new Date().toISOString()
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
          } else {
            console.error(`[WEBHOOK] Failed to complete checkout for session ${session.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`[WEBHOOK] Error processing checkout.session.completed:`, error);
        }
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
