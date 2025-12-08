import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { completeCheckoutSession } from './checkoutService';
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
