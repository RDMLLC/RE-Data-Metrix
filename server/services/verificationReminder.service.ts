import { db } from '../db';
import { users, userProfiles, sentSignupFollowups } from '@shared/schema';
import { eq, and, lte, isNull, sql, isNotNull } from 'drizzle-orm';
import { emailService } from './email.service';

const EMAIL_TYPE = 'verification_reminder_24h';

class VerificationReminderService {
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    console.log('Starting verification reminder service...');
    this.checkAndSendReminders();

    this.checkInterval = setInterval(() => {
      this.checkAndSendReminders();
    }, 6 * 60 * 60 * 1000);

    console.log('Verification reminder service started - checking every 6 hours');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Verification reminder service stopped');
    }
  }

  private async markReminderSent(userId: string): Promise<void> {
    await db.insert(sentSignupFollowups).values({
      userId,
      emailType: EMAIL_TYPE,
    }).onConflictDoNothing();
  }

  async checkAndSendReminders() {
    try {
      console.log('[VERIFY REMINDER] Checking for unverified users needing reminder...');

      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const eligibleUsers = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          verificationToken: users.verificationToken,
          fullName: userProfiles.fullName,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .leftJoin(
          sentSignupFollowups,
          and(
            eq(sentSignupFollowups.userId, users.id),
            eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPE}`)
          )
        )
        .where(and(
          eq(users.isEmailVerified, false),
          isNotNull(users.verificationToken),
          lte(users.createdAt, cutoffDate),
          isNull(sentSignupFollowups.id)
        ));

      console.log(`[VERIFY REMINDER] Found ${eligibleUsers.length} users needing reminder`);

      let sentCount = 0;

      for (const user of eligibleUsers) {
        if (!user.verificationToken) continue;

        const firstName = (user.fullName || '').trim().split(/\s+/)[0] || user.username;
        console.log(`[VERIFY REMINDER] Sending reminder to ${user.email}`);

        const sent = await emailService.sendVerificationReminderEmail(
          user.email,
          firstName,
          user.verificationToken
        );

        if (sent) {
          await this.markReminderSent(user.id);
          sentCount++;
          console.log(`[VERIFY REMINDER] Reminder sent to ${user.email}`);
        } else {
          console.error(`[VERIFY REMINDER] Failed to send reminder to ${user.email}`);
        }
      }

      if (sentCount > 0) {
        console.log(`[VERIFY REMINDER] Sent ${sentCount} reminder emails this cycle`);
      }
    } catch (error) {
      console.error('[VERIFY REMINDER] Error checking reminders:', error);
    }
  }
}

export const verificationReminderService = new VerificationReminderService();
