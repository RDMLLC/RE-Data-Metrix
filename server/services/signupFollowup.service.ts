import { db } from '../db';
import { users, sentSignupFollowups } from '@shared/schema';
import { eq, and, lte, isNull, sql } from 'drizzle-orm';
import { emailService } from './email.service';

class SignupFollowupService {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly FOLLOWUP_DAYS = 14;
  private readonly EMAIL_TYPE = 'two_week_feature_poll';

  start() {
    console.log('Starting signup followup email service...');
    this.checkAndSendFollowups();

    this.checkInterval = setInterval(() => {
      this.checkAndSendFollowups();
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

  private async markFollowupSent(userId: string): Promise<boolean> {
    try {
      await db.insert(sentSignupFollowups).values({
        userId,
        emailType: this.EMAIL_TYPE,
      }).onConflictDoNothing();
      return true;
    } catch {
      return false;
    }
  }

  async checkAndSendFollowups() {
    try {
      console.log('[SIGNUP FOLLOWUP] Checking for users needing followup emails...');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.FOLLOWUP_DAYS);

      const eligibleUsers = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
        })
        .from(users)
        .leftJoin(
          sentSignupFollowups,
          and(
            eq(sentSignupFollowups.userId, users.id),
            eq(sentSignupFollowups.emailType, sql`${this.EMAIL_TYPE}`)
          )
        )
        .where(and(
          eq(users.isEmailVerified, true),
          lte(users.createdAt, cutoffDate),
          isNull(sentSignupFollowups.id)
        ));

      console.log(`[SIGNUP FOLLOWUP] Found ${eligibleUsers.length} users needing followup`);

      let sentCount = 0;

      for (const user of eligibleUsers) {
        console.log(`[SIGNUP FOLLOWUP] Sending two-week followup to ${user.email}`);

        const sent = await emailService.sendTwoWeekFollowupEmail(
          user.email,
          user.username
        );

        if (sent) {
          await this.markFollowupSent(user.id);
          sentCount++;
          console.log(`[SIGNUP FOLLOWUP] Followup sent successfully to ${user.email}`);
        }
      }

      if (sentCount > 0) {
        console.log(`[SIGNUP FOLLOWUP] Sent ${sentCount} followup emails this cycle`);
      }

    } catch (error) {
      console.error('[SIGNUP FOLLOWUP] Error checking followups:', error);
    }
  }
}

export const signupFollowupService = new SignupFollowupService();
