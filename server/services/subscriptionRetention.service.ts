import { db } from '../db';
import { users, userProfiles, savedDeals as savedDealsTable, savedLenders as savedLendersTable } from '@shared/schema';
import { eq, and, lte, isNotNull, isNull, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { emailService } from './email.service';

class SubscriptionRetentionService {
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    console.log('[Retention] Starting subscription retention service...');
    this.runChecks();

    this.checkInterval = setInterval(() => {
      this.runChecks();
    }, 60 * 60 * 1000);

    console.log('[Retention] Subscription retention service started — checking every hour');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[Retention] Subscription retention service stopped');
    }
  }

  private async runChecks() {
    try {
      await this.sendDay5PreDowngradeWarnings();
      await this.sendDay10ResubscribeCTAs();
      await this.sendDay23FinalDeletionWarnings();
      await this.runDay30DataDeletion();
    } catch (err) {
      console.error('[Retention] Error during retention checks:', err);
    }
  }

  /**
   * Day 5 after first payment failure: send pre-downgrade warning to users who
   * still have an active subscription but whose payment has been failing for 5+ days.
   */
  private async sendDay5PreDowngradeWarnings() {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.paymentFailedAt),
          lte(users.paymentFailedAt, fiveDaysAgo),
          sql`${users.paymentFailedAt} > ${sixDaysAgo}`,
          or(
            eq(users.subscriptionStatus, 'active'),
            eq(users.subscriptionStatus, 'referral_trial'),
            eq(users.subscriptionStatus, 'comped'),
          ),
        )
      );

    for (const user of candidates) {
      try {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        const firstName = ((profile?.fullName || '').trim().split(/\s+/)[0] || user.username);
        await emailService.sendPreDowngradeWarningEmail(user.email, firstName);
        console.log(`[Retention] Sent Day 5 pre-downgrade warning to ${user.email}`);
      } catch (err) {
        console.error(`[Retention] Failed to send Day 5 warning to ${user.email}:`, err);
      }
    }
  }

  /**
   * Day 10 after downgrade: send resubscribe CTA.
   */
  private async sendDay10ResubscribeCTAs() {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.downgradedAt),
          lte(users.downgradedAt, tenDaysAgo),
          sql`${users.downgradedAt} > ${elevenDaysAgo}`,
          eq(users.subscriptionStatus, 'canceled'),
        )
      );

    for (const user of candidates) {
      try {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        const firstName = ((profile?.fullName || '').trim().split(/\s+/)[0] || user.username);
        const daysUntilDeletion = 20;
        await emailService.sendResubscribeCTAEmail(user.email, firstName, daysUntilDeletion);
        console.log(`[Retention] Sent Day 10 resubscribe CTA to ${user.email}`);
      } catch (err) {
        console.error(`[Retention] Failed to send Day 10 CTA to ${user.email}:`, err);
      }
    }
  }

  /**
   * Day 23 after downgrade: send final deletion warning (7 days left).
   */
  private async sendDay23FinalDeletionWarnings() {
    const twentyThreeDaysAgo = new Date(Date.now() - 23 * 24 * 60 * 60 * 1000);
    const twentyFourDaysAgo = new Date(Date.now() - 24 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.downgradedAt),
          lte(users.downgradedAt, twentyThreeDaysAgo),
          sql`${users.downgradedAt} > ${twentyFourDaysAgo}`,
          eq(users.subscriptionStatus, 'canceled'),
        )
      );

    for (const user of candidates) {
      try {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        const firstName = ((profile?.fullName || '').trim().split(/\s+/)[0] || user.username);
        await emailService.sendFinalDataDeletionWarningEmail(user.email, firstName);
        console.log(`[Retention] Sent Day 23 final deletion warning to ${user.email}`);
      } catch (err) {
        console.error(`[Retention] Failed to send Day 23 warning to ${user.email}:`, err);
      }
    }
  }

  /**
   * Day 30 after downgrade: delete saved deals and lenders for users who
   * are still canceled and have been downgraded 30+ days ago.
   */
  private async runDay30DataDeletion() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.downgradedAt),
          lte(users.downgradedAt, thirtyDaysAgo),
          eq(users.subscriptionStatus, 'canceled'),
        )
      );

    for (const user of candidates) {
      try {
        const savedDealCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(savedDealsTable)
          .where(eq(savedDealsTable.userId, user.id));

        const savedLenderCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(savedLendersTable)
          .where(eq(savedLendersTable.userId, user.id));

        const nDeals = Number(savedDealCount[0]?.count ?? 0);
        const nLenders = Number(savedLenderCount[0]?.count ?? 0);

        if (nDeals > 0 || nLenders > 0) {
          await db.delete(savedDealsTable).where(eq(savedDealsTable.userId, user.id));
          await db.delete(savedLendersTable).where(eq(savedLendersTable.userId, user.id));
          console.log(`[Retention] Day 30: deleted ${nDeals} deals and ${nLenders} saved lenders for ${user.email}`);
        }

        // Null out downgradedAt so this user doesn't get processed again
        await db.update(users).set({ downgradedAt: null }).where(eq(users.id, user.id));
      } catch (err) {
        console.error(`[Retention] Failed Day 30 deletion for ${user.email}:`, err);
      }
    }
  }
}

export const subscriptionRetentionService = new SubscriptionRetentionService();
