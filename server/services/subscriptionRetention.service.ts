import { db } from '../db';
import { users, userProfiles, savedDeals as savedDealsTable, savedLenders as savedLendersTable, sentSignupFollowups } from '@shared/schema';
import { eq, and, lte, isNotNull, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { emailService } from './email.service';

const EMAIL_TYPE_DAY5 = 'retention_day5';
const EMAIL_TYPE_DAY10 = 'retention_day10';
const EMAIL_TYPE_DAY23 = 'retention_day23';

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

  private async markEmailSent(userId: string, emailType: string): Promise<void> {
    await db.insert(sentSignupFollowups).values({ userId, emailType }).onConflictDoNothing();
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
   * Each user receives this email at most once (idempotent via sentSignupFollowups).
   */
  private async sendDay5PreDowngradeWarnings() {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select()
      .from(users)
      .leftJoin(sentSignupFollowups, and(
        eq(sentSignupFollowups.userId, users.id),
        eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPE_DAY5}`),
      ))
      .where(
        and(
          isNotNull(users.paymentFailedAt),
          lte(users.paymentFailedAt, fiveDaysAgo),
          isNull(sentSignupFollowups.id),
        )
      );

    for (const row of candidates) {
      const user = row.users;
      if (!['active', 'cancelling', 'referral_trial', 'comped'].includes(user.subscriptionStatus)) continue;
      try {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        const firstName = ((profile?.fullName || '').trim().split(/\s+/)[0] || user.username);
        const sent = await emailService.sendPreDowngradeWarningEmail(user.email, firstName);
        if (sent) {
          await this.markEmailSent(user.id, EMAIL_TYPE_DAY5);
          console.log(`[Retention] Sent Day 5 pre-downgrade warning to ${user.email}`);
        }
      } catch (err) {
        console.error(`[Retention] Failed to send Day 5 warning to ${user.email}:`, err);
      }
    }
  }

  /**
   * Day 10 after downgrade: send resubscribe CTA (idempotent).
   */
  private async sendDay10ResubscribeCTAs() {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select()
      .from(users)
      .leftJoin(sentSignupFollowups, and(
        eq(sentSignupFollowups.userId, users.id),
        eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPE_DAY10}`),
      ))
      .where(
        and(
          isNotNull(users.downgradedAt),
          lte(users.downgradedAt, tenDaysAgo),
          eq(users.subscriptionStatus, 'free'),
          isNull(sentSignupFollowups.id),
        )
      );

    for (const row of candidates) {
      const user = row.users;
      try {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        const firstName = ((profile?.fullName || '').trim().split(/\s+/)[0] || user.username);
        const downgradedMs = user.downgradedAt ? user.downgradedAt.getTime() : Date.now();
        const daysSinceDowngrade = Math.floor((Date.now() - downgradedMs) / (24 * 60 * 60 * 1000));
        const daysUntilDeletion = Math.max(0, 30 - daysSinceDowngrade);
        const sent = await emailService.sendResubscribeCTAEmail(user.email, firstName, daysUntilDeletion);
        if (sent) {
          await this.markEmailSent(user.id, EMAIL_TYPE_DAY10);
          console.log(`[Retention] Sent Day 10 resubscribe CTA to ${user.email}`);
        }
      } catch (err) {
        console.error(`[Retention] Failed to send Day 10 CTA to ${user.email}:`, err);
      }
    }
  }

  /**
   * Day 23 after downgrade: send final deletion warning (7 days left, idempotent).
   */
  private async sendDay23FinalDeletionWarnings() {
    const twentyThreeDaysAgo = new Date(Date.now() - 23 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select()
      .from(users)
      .leftJoin(sentSignupFollowups, and(
        eq(sentSignupFollowups.userId, users.id),
        eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPE_DAY23}`),
      ))
      .where(
        and(
          isNotNull(users.downgradedAt),
          lte(users.downgradedAt, twentyThreeDaysAgo),
          eq(users.subscriptionStatus, 'free'),
          isNull(sentSignupFollowups.id),
        )
      );

    for (const row of candidates) {
      const user = row.users;
      try {
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        const firstName = ((profile?.fullName || '').trim().split(/\s+/)[0] || user.username);
        const sent = await emailService.sendFinalDataDeletionWarningEmail(user.email, firstName);
        if (sent) {
          await this.markEmailSent(user.id, EMAIL_TYPE_DAY23);
          console.log(`[Retention] Sent Day 23 final deletion warning to ${user.email}`);
        }
      } catch (err) {
        console.error(`[Retention] Failed to send Day 23 warning to ${user.email}:`, err);
      }
    }
  }

  /**
   * Day 30 after downgrade: delete saved deals and lenders for users who
   * are still on the free plan and have been downgraded 30+ days ago.
   * Clears downgradedAt so this user won't be processed again.
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
          eq(users.subscriptionStatus, 'free'),
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

        // Null out downgradedAt so this user isn't processed again
        await db.update(users).set({ downgradedAt: null }).where(eq(users.id, user.id));
      } catch (err) {
        console.error(`[Retention] Failed Day 30 deletion for ${user.email}:`, err);
      }
    }
  }
}

export const subscriptionRetentionService = new SubscriptionRetentionService();
