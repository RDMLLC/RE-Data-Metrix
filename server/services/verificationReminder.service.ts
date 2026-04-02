import { db } from '../db';
import { users, userProfiles, sentSignupFollowups } from '@shared/schema';
import { eq, and, lte, gte, isNull, sql, isNotNull } from 'drizzle-orm';
import { emailService } from './email.service';

const EMAIL_TYPE_24H = 'verification_reminder_24h';
const EMAIL_TYPE_96H = 'verification_reminder_96h';

class VerificationReminderService {
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    console.log('Starting verification reminder service...');
    this.runAllChecks();

    this.checkInterval = setInterval(() => {
      this.runAllChecks();
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

  private async runAllChecks() {
    await Promise.allSettled([
      this.checkAndSendReminders(),
      this.checkAndSendSecondReminders(),
    ]);
  }

  private async markReminderSent(userId: string, emailType: string): Promise<void> {
    await db.insert(sentSignupFollowups).values({
      userId,
      emailType,
    }).onConflictDoNothing();
  }

  private getFirstName(fullName: string | null | undefined, username: string | null | undefined): string {
    const name = (fullName || '').trim().split(/\s+/)[0];
    return name || username || 'there';
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
            eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPE_24H}`)
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

        const firstName = this.getFirstName(user.fullName, user.username);
        console.log(`[VERIFY REMINDER] Sending reminder to ${user.email}`);

        const sent = await emailService.sendVerificationReminderEmail(
          user.email,
          firstName,
          user.verificationToken
        );

        if (sent) {
          await this.markReminderSent(user.id, EMAIL_TYPE_24H);
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

  async checkAndSendSecondReminders() {
    try {
      console.log('[VERIFY REMINDER] Checking for unverified users needing 96h second reminder...');

      const now = new Date();
      // Second reminder: 72–96h after signup, still unverified
      const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
      const ninetySevenHoursAgo = new Date(now.getTime() - 97 * 60 * 60 * 1000);

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
            eq(sentSignupFollowups.emailType, sql`${EMAIL_TYPE_96H}`)
          )
        )
        .where(and(
          eq(users.isEmailVerified, false),
          isNotNull(users.verificationToken),
          lte(users.createdAt, seventyTwoHoursAgo),
          gte(users.createdAt, ninetySevenHoursAgo),
          isNull(sentSignupFollowups.id)
        ));

      console.log(`[VERIFY REMINDER] Found ${eligibleUsers.length} users needing 96h second reminder`);

      let sentCount = 0;

      for (const user of eligibleUsers) {
        if (!user.verificationToken) continue;

        const firstName = this.getFirstName(user.fullName, user.username);
        console.log(`[VERIFY REMINDER] Sending 96h second reminder to ${user.email}`);

        const sent = await emailService.sendVerificationReminderEmail(
          user.email,
          firstName,
          user.verificationToken,
          "Still haven't confirmed? Your RE Data Metrix account is waiting."
        );

        if (sent) {
          await this.markReminderSent(user.id, EMAIL_TYPE_96H);
          sentCount++;
          console.log(`[VERIFY REMINDER] 96h second reminder sent to ${user.email}`);
        } else {
          console.error(`[VERIFY REMINDER] Failed to send 96h second reminder to ${user.email}`);
        }
      }

      if (sentCount > 0) {
        console.log(`[VERIFY REMINDER] Sent ${sentCount} second reminder emails this cycle`);
      }
    } catch (error) {
      console.error('[VERIFY REMINDER] Error checking 96h reminders:', error);
    }
  }
}

export const verificationReminderService = new VerificationReminderService();
