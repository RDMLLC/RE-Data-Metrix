// Stripe Service - Handles Stripe API operations for RE Data Metrix
import { getUncachableStripeClient } from './stripeClient';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Price IDs - these will be populated after running the seed script
// In production, these would come from environment variables or database
const PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || '',
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || '',
};

export class StripeService {
  // Create customer in Stripe
  async createCustomer(email: string, userId: string, name?: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  // Get or create customer
  async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
    // Check if we already have a customer ID stored
    const result = await db.execute(
      sql`SELECT stripe_customer_id FROM users WHERE id = ${userId}`
    );
    
    const existingCustomerId = (result.rows[0] as any)?.stripe_customer_id;
    if (existingCustomerId) {
      return existingCustomerId;
    }

    // Create new customer
    const customer = await this.createCustomer(email, userId, name);
    
    // Store customer ID
    await db.execute(
      sql`UPDATE users SET stripe_customer_id = ${customer.id} WHERE id = ${userId}`
    );
    
    return customer.id;
  }

  // Create checkout session for subscription
  async createCheckoutSession(
    customerId: string, 
    priceId: string, 
    successUrl: string, 
    cancelUrl: string,
    promotionCode?: string
  ) {
    const stripe = await getUncachableStripeClient();
    
    const sessionParams: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      phone_number_collection: { enabled: true },
      billing_address_collection: 'required',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: !promotionCode, // Allow manual entry if no code provided
    };

    // If a specific promotion code is provided, apply it
    if (promotionCode) {
      try {
        // Look up the promotion code
        const promotionCodes = await stripe.promotionCodes.list({
          code: promotionCode,
          active: true,
          limit: 1,
        });
        
        if (promotionCodes.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: promotionCodes.data[0].id }];
        }
      } catch (error) {
        console.error('Error applying promotion code:', error);
        // Continue without the promotion code
      }
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  // Create customer portal session for managing subscription
  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  // Cancel subscription at period end
  async cancelSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Get subscription from synced database
  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  // Get subscription by customer ID
  async getSubscriptionByCustomerId(customerId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions 
          WHERE customer = ${customerId} 
          AND status IN ('active', 'trialing', 'past_due')
          ORDER BY created DESC
          LIMIT 1`
    );
    return result.rows[0] || null;
  }

  // Get products with prices
  async getProductsWithPrices() {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  // Get price IDs for subscription plans
  getPriceId(plan: 'monthly' | 'annual'): string {
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      throw new Error(`Price ID not configured for ${plan} plan. Please run the seed script.`);
    }
    return priceId;
  }

  // Check if user has active subscription
  async checkUserSubscriptionStatus(userId: string): Promise<{
    isActive: boolean;
    status: string;
    subscriptionId?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }> {
    // Get user's Stripe customer ID
    const userResult = await db.execute(
      sql`SELECT stripe_customer_id, stripe_subscription_id FROM users WHERE id = ${userId}`
    );
    
    const user = userResult.rows[0] as any;
    if (!user?.stripe_customer_id) {
      return { isActive: false, status: 'no_customer' };
    }

    // Check for active subscription
    const subscription = await this.getSubscriptionByCustomerId(user.stripe_customer_id);
    
    if (!subscription) {
      return { isActive: false, status: 'no_subscription' };
    }

    const sub = subscription as any;
    return {
      isActive: ['active', 'trialing'].includes(sub.status),
      status: sub.status,
      subscriptionId: sub.id,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }
}

export const stripeService = new StripeService();
