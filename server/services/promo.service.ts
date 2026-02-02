import { db } from "../db";
import { 
  promoCodes, 
  promoRedemptions, 
  promoWaitlist, 
  users,
  type PromoCode,
  type PromoRedemption,
  type PromoWaitlist
} from "@shared/schema";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { addMonths } from "date-fns";

export interface PromoValidationResult {
  valid: boolean;
  promoCode?: PromoCode;
  error?: string;
  waitlistAvailable?: boolean;
  waitlistPosition?: number;
}

export interface PromoRedemptionResult {
  success: boolean;
  redemption?: PromoRedemption;
  error?: string;
  addedToWaitlist?: boolean;
  waitlistPosition?: number;
}

export class PromoService {
  /**
   * Validate a promo code without redeeming it
   */
  async validatePromoCode(code: string): Promise<PromoValidationResult> {
    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code.toUpperCase().trim()));

    if (!promoCode) {
      return { valid: false, error: "Invalid promo code" };
    }

    if (!promoCode.isActive) {
      return { valid: false, error: "This promo code is no longer active" };
    }

    const now = new Date();
    if (promoCode.startsAt && promoCode.startsAt > now) {
      return { valid: false, error: "This promo code is not yet active" };
    }

    if (promoCode.expiresAt && promoCode.expiresAt < now) {
      return { valid: false, error: "This promo code has expired" };
    }

    // Check if cap has been reached
    if (promoCode.maxRedemptions !== null && 
        promoCode.currentRedemptions >= promoCode.maxRedemptions) {
      // Count current waitlist
      const [waitlistCount] = await db
        .select({ count: count() })
        .from(promoWaitlist)
        .where(and(
          eq(promoWaitlist.promoCodeId, promoCode.id),
          eq(promoWaitlist.status, 'waiting')
        ));

      return { 
        valid: false, 
        error: "Maximum redemptions reached for this promo code",
        waitlistAvailable: true,
        waitlistPosition: (waitlistCount?.count || 0) + 1
      };
    }

    return { valid: true, promoCode };
  }

  /**
   * Check if a user has already redeemed a promo code
   */
  async hasUserRedeemedCode(userId: string, promoCodeId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(promoRedemptions)
      .where(and(
        eq(promoRedemptions.userId, userId),
        eq(promoRedemptions.promoCodeId, promoCodeId)
      ));
    return !!existing;
  }

  /**
   * Redeem a promo code for a user
   * Returns success if redeemed, or adds to waitlist if cap reached
   */
  async redeemPromoCode(userId: string, code: string): Promise<PromoRedemptionResult> {
    const validation = await this.validatePromoCode(code);

    if (!validation.valid && !validation.waitlistAvailable) {
      return { success: false, error: validation.error };
    }

    const promoCode = validation.promoCode;

    // If cap was reached, check if we should add to waitlist
    if (!promoCode) {
      // Need to get the promo code for waitlist
      const [pc] = await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, code.toUpperCase().trim()));

      if (pc && validation.waitlistAvailable) {
        // Get user email
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (user) {
          const waitlistResult = await this.addToWaitlist(pc.id, user.email, userId, user.username);
          return {
            success: false,
            addedToWaitlist: true,
            waitlistPosition: waitlistResult.position,
            error: "Maximum redemptions reached. You've been added to the waitlist."
          };
        }
      }
      return { success: false, error: validation.error };
    }

    // Check if user already redeemed
    const alreadyRedeemed = await this.hasUserRedeemedCode(userId, promoCode.id);
    if (alreadyRedeemed) {
      return { success: false, error: "You have already redeemed this promo code" };
    }

    // Double-check cap hasn't been reached (race condition protection)
    if (promoCode.maxRedemptions !== null && 
        promoCode.currentRedemptions >= promoCode.maxRedemptions) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user) {
        const waitlistResult = await this.addToWaitlist(promoCode.id, user.email, userId, user.username);
        return {
          success: false,
          addedToWaitlist: true,
          waitlistPosition: waitlistResult.position,
          error: "Maximum redemptions reached. You've been added to the waitlist."
        };
      }
      return { success: false, error: "Maximum redemptions reached for this promo code" };
    }

    // Calculate expiry date based on activation time
    const activatedAt = new Date();
    const expiresAt = addMonths(activatedAt, promoCode.durationMonths);

    // Create redemption
    const [redemption] = await db.insert(promoRedemptions).values({
      promoCodeId: promoCode.id,
      userId,
      activatedAt,
      expiresAt,
      status: 'active'
    }).returning();

    // Increment redemption count
    await db.update(promoCodes)
      .set({ 
        currentRedemptions: sql`${promoCodes.currentRedemptions} + 1`,
        updatedAt: new Date()
      })
      .where(eq(promoCodes.id, promoCode.id));

    // Update user subscription status
    await db.update(users)
      .set({
        subscriptionStatus: 'active',
        subscriptionPlan: 'promo'
      })
      .where(eq(users.id, userId));

    return { success: true, redemption };
  }

  /**
   * Add a user to the waitlist for a promo code
   */
  async addToWaitlist(
    promoCodeId: string, 
    email: string, 
    userId?: string, 
    name?: string
  ): Promise<{ success: boolean; position: number }> {
    // Check if already on waitlist
    const existing = await db
      .select()
      .from(promoWaitlist)
      .where(and(
        eq(promoWaitlist.promoCodeId, promoCodeId),
        eq(promoWaitlist.email, email.toLowerCase()),
        eq(promoWaitlist.status, 'waiting')
      ));

    if (existing.length > 0) {
      return { success: true, position: existing[0].position };
    }

    // Get next position
    const [maxPos] = await db
      .select({ maxPosition: sql<number>`COALESCE(MAX(position), 0)` })
      .from(promoWaitlist)
      .where(eq(promoWaitlist.promoCodeId, promoCodeId));

    const nextPosition = (maxPos?.maxPosition || 0) + 1;

    await db.insert(promoWaitlist).values({
      promoCodeId,
      userId: userId || null,
      email: email.toLowerCase(),
      name,
      position: nextPosition,
      status: 'waiting'
    });

    return { success: true, position: nextPosition };
  }

  /**
   * Get waitlist entries for a promo code
   */
  async getWaitlist(promoCodeId: string): Promise<PromoWaitlist[]> {
    return db
      .select()
      .from(promoWaitlist)
      .where(eq(promoWaitlist.promoCodeId, promoCodeId))
      .orderBy(promoWaitlist.position);
  }

  /**
   * Create a new promo code
   */
  async createPromoCode(data: {
    code: string;
    name: string;
    description?: string;
    type?: string;
    durationMonths?: number;
    maxRedemptions?: number;
    startsAt?: Date;
    expiresAt?: Date;
    createdBy?: string;
  }): Promise<PromoCode> {
    const [promoCode] = await db.insert(promoCodes).values({
      code: data.code.toUpperCase().trim(),
      name: data.name,
      description: data.description,
      type: data.type || 'subscription',
      durationMonths: data.durationMonths || 6,
      maxRedemptions: data.maxRedemptions,
      isActive: true,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
      createdBy: data.createdBy
    }).returning();

    return promoCode;
  }

  /**
   * Get all promo codes with stats
   */
  async getAllPromoCodes(): Promise<(PromoCode & { waitlistCount: number })[]> {
    const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    
    const result = await Promise.all(codes.map(async (code) => {
      const [waitlistCount] = await db
        .select({ count: count() })
        .from(promoWaitlist)
        .where(and(
          eq(promoWaitlist.promoCodeId, code.id),
          eq(promoWaitlist.status, 'waiting')
        ));
      
      return {
        ...code,
        waitlistCount: waitlistCount?.count || 0
      };
    }));

    return result;
  }

  /**
   * Get a user's active promo redemption
   */
  async getUserActivePromo(userId: string): Promise<(PromoRedemption & { promoCode: PromoCode }) | null> {
    const [redemption] = await db
      .select()
      .from(promoRedemptions)
      .where(and(
        eq(promoRedemptions.userId, userId),
        eq(promoRedemptions.status, 'active')
      ))
      .orderBy(desc(promoRedemptions.activatedAt));

    if (!redemption) return null;

    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, redemption.promoCodeId));

    if (!promoCode) return null;

    // Check if expired
    if (redemption.expiresAt < new Date()) {
      await db.update(promoRedemptions)
        .set({ status: 'expired' })
        .where(eq(promoRedemptions.id, redemption.id));
      
      // Update user subscription if no other active subscriptions
      await db.update(users)
        .set({ subscriptionStatus: 'free' })
        .where(eq(users.id, userId));

      return null;
    }

    return { ...redemption, promoCode };
  }

  /**
   * Check if user has active promo subscription
   */
  async isUserPromoSubscriber(userId: string): Promise<boolean> {
    const activePromo = await this.getUserActivePromo(userId);
    return activePromo !== null;
  }

  /**
   * Update promo code settings
   */
  async updatePromoCode(id: string, data: Partial<{
    name: string;
    description: string;
    maxRedemptions: number | null;
    isActive: boolean;
    expiresAt: Date | null;
  }>): Promise<PromoCode | null> {
    const [updated] = await db.update(promoCodes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promoCodes.id, id))
      .returning();
    return updated || null;
  }

  /**
   * Notify next person on waitlist (to be called when cap is increased)
   */
  async notifyNextOnWaitlist(promoCodeId: string): Promise<PromoWaitlist | null> {
    const [next] = await db
      .select()
      .from(promoWaitlist)
      .where(and(
        eq(promoWaitlist.promoCodeId, promoCodeId),
        eq(promoWaitlist.status, 'waiting')
      ))
      .orderBy(promoWaitlist.position)
      .limit(1);

    if (!next) return null;

    await db.update(promoWaitlist)
      .set({ 
        status: 'notified',
        notifiedAt: new Date()
      })
      .where(eq(promoWaitlist.id, next.id));

    return next;
  }

  /**
   * Convert waitlist entry to redemption (when user claims their spot)
   */
  async convertWaitlistToRedemption(waitlistId: string): Promise<PromoRedemptionResult> {
    const [waitlistEntry] = await db
      .select()
      .from(promoWaitlist)
      .where(eq(promoWaitlist.id, waitlistId));

    if (!waitlistEntry) {
      return { success: false, error: "Waitlist entry not found" };
    }

    if (waitlistEntry.status !== 'notified') {
      return { success: false, error: "This waitlist entry is not ready for conversion" };
    }

    if (!waitlistEntry.userId) {
      return { success: false, error: "User must be registered to convert waitlist entry" };
    }

    // Get promo code
    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, waitlistEntry.promoCodeId));

    if (!promoCode) {
      return { success: false, error: "Promo code not found" };
    }

    // Create redemption
    const activatedAt = new Date();
    const expiresAt = addMonths(activatedAt, promoCode.durationMonths);

    const [redemption] = await db.insert(promoRedemptions).values({
      promoCodeId: promoCode.id,
      userId: waitlistEntry.userId,
      activatedAt,
      expiresAt,
      status: 'active'
    }).returning();

    // Update waitlist entry
    await db.update(promoWaitlist)
      .set({ 
        status: 'converted',
        convertedAt: new Date()
      })
      .where(eq(promoWaitlist.id, waitlistId));

    // Update user subscription
    await db.update(users)
      .set({
        subscriptionStatus: 'active',
        subscriptionPlan: 'promo'
      })
      .where(eq(users.id, waitlistEntry.userId));

    return { success: true, redemption };
  }
}

export const promoService = new PromoService();
