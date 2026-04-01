import { db } from '../db';
import { users, userProfiles, sentSignupFollowups, savedDeals } from '@shared/schema';
import { eq, and, lte, gte, isNull, sql, notExists } from 'drizzle-orm';
import { emailService } from './email.service';

const EMAIL_TYPES = {
  DAY_1: 'day_1_activation',
  DAY_7: 'day_7_followup',
  TWO_WEEK: 'two_week_feature_poll',
} as const;

class SignupFollowupService {
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    console.log('Starting signup followup email service...');
    this.runAllChecks();

    this.checkInterval = setInterval(() => {
      this.runAllChecks();
    }, 6 * 60 * 60 * 1000);

    console.log('Signup followup service started - checking every 6 hours');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Signup followup service stopped');
    }
  }

  private async runAllChecks() {
    await Promise.allSettled([
      this.checkAndSendDay1Emails(),
      this.checkAndSendDay7Emails(),
      this.checkAndSendFollowups(),
    ]);
  }

  private async markEmailSent(userId: string, emailType: string): Promise<boolean> {
    try {
      await db.insert(sentSignupFollowups).values({
        userId,
        emailType,
      }).onConflictDoNothing();
      return true;
    } catch {
      return false;
    }
  }

  private getFirstName(fullName: string | null | undefined, username: string | null | undefined): string {
    const name = (fullName || '').trim().split(/\s+/)[0];
    return name || username || 'there';
  }

  async checkAndSendDay1Emails() {
    try {
      console.log('[SIGNUP FOLLOWUP] Checking for Day 1 activation emails...');

      const now = new Date();
      // Send within 24 hours of registration (using createdAt as proxy for verification time).
      // Lower bound: 1h (allow time to verify); upper bound: 48h safety net for missed checks.
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const eligibleUsers = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          fullName: userProfiles.fullName,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .leftJoin(
          sentSignupFollowups,
          and(
            eq(sentSignupFollowups.userId, users.id),
            eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPES.DAY_1}`)
          )
        )
        .where(and(
          eq(users.isEmailVerified, true),
          lte(users.createdAt, oneHourAgo),
          gte(users.createdAt, twoDaysAgo),
          isNull(sentSignupFollowups.id),
          notExists(
            db.select({ id: savedDeals.id })
              .from(savedDeals)
              .where(eq(savedDeals.userId, users.id))
          )
        ));

      console.log(`[SIGNUP FOLLOWUP] Found ${eligibleUsers.length} users for Day 1 email`);

      let sentCount = 0;
      for (const user of eligibleUsers) {
        const firstName = this.getFirstName(user.fullName, user.username);
        console.log(`[SIGNUP FOLLOWUP] Sending Day 1 activation email to ${user.email}`);

        const sent = await emailService.sendDay1ActivationEmail(user.email, firstName);
        if (sent) {
          await this.markEmailSent(user.id, EMAIL_TYPES.DAY_1);
          sentCount++;
          console.log(`[SIGNUP FOLLOWUP] Day 1 email sent to ${user.email}`);
        }
      }

      if (sentCount > 0) {
        console.log(`[SIGNUP FOLLOWUP] Sent ${sentCount} Day 1 activation emails this cycle`);
      }
    } catch (error) {
      console.error('[SIGNUP FOLLOWUP] Error sending Day 1 emails:', error);
    }
  }

  async checkAndSendDay7Emails() {
    try {
      console.log('[SIGNUP FOLLOWUP] Checking for Day 7 followup emails...');

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const eligibleUsers = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          fullName: userProfiles.fullName,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .leftJoin(
          sentSignupFollowups,
          and(
            eq(sentSignupFollowups.userId, users.id),
            eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPES.DAY_7}`)
          )
        )
        .where(and(
          eq(users.isEmailVerified, true),
          lte(users.createdAt, sevenDaysAgo),
          gte(users.createdAt, fourteenDaysAgo),
          isNull(sentSignupFollowups.id),
          notExists(
            db.select({ id: savedDeals.id })
              .from(savedDeals)
              .where(eq(savedDeals.userId, users.id))
          )
        ));

      console.log(`[SIGNUP FOLLOWUP] Found ${eligibleUsers.length} users for Day 7 email`);

      let sentCount = 0;
      for (const user of eligibleUsers) {
        const firstName = this.getFirstName(user.fullName, user.username);
        console.log(`[SIGNUP FOLLOWUP] Sending Day 7 followup email to ${user.email}`);

        const sent = await emailService.sendDay7FollowupEmail(user.email, firstName);
        if (sent) {
          await this.markEmailSent(user.id, EMAIL_TYPES.DAY_7);
          sentCount++;
          console.log(`[SIGNUP FOLLOWUP] Day 7 email sent to ${user.email}`);
        }
      }

      if (sentCount > 0) {
        console.log(`[SIGNUP FOLLOWUP] Sent ${sentCount} Day 7 followup emails this cycle`);
      }
    } catch (error) {
      console.error('[SIGNUP FOLLOWUP] Error sending Day 7 emails:', error);
    }
  }

  async checkAndSendFollowups() {
    try {
      console.log('[SIGNUP FOLLOWUP] Checking for two-week followup emails...');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14);

      const eligibleUsers = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          fullName: userProfiles.fullName,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .leftJoin(
          sentSignupFollowups,
          and(
            eq(sentSignupFollowups.userId, users.id),
            eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPES.TWO_WEEK}`)
          )
        )
        .where(and(
          eq(users.isEmailVerified, true),
          lte(users.createdAt, cutoffDate),
          isNull(sentSignupFollowups.id)
        ));

      console.log(`[SIGNUP FOLLOWUP] Found ${eligibleUsers.length} users needing two-week followup`);

      let sentCount = 0;

      for (const user of eligibleUsers) {
        const firstName = this.getFirstName(user.fullName, user.username);
        console.log(`[SIGNUP FOLLOWUP] Sending two-week followup to ${user.email}`);

        const sent = await emailService.sendTwoWeekFollowupEmail(user.email, firstName);

        if (sent) {
          await this.markEmailSent(user.id, EMAIL_TYPES.TWO_WEEK);
          sentCount++;
          console.log(`[SIGNUP FOLLOWUP] Two-week followup sent to ${user.email}`);
        }
      }

      if (sentCount > 0) {
        console.log(`[SIGNUP FOLLOWUP] Sent ${sentCount} two-week followup emails this cycle`);
      }

    } catch (error) {
      console.error('[SIGNUP FOLLOWUP] Error checking followups:', error);
    }
  }
}

export const signupFollowupService = new SignupFollowupService();
