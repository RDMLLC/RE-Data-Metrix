import { db } from '../db';
import { savedDeals, users, userProfiles, sentReminders } from '@shared/schema';
import { eq, and, lte, gte, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { emailService } from './email.service';

interface DealWithUser {
  deal: {
    id: string;
    userId: string;
    propertyAddress: string | null;
    estimatedClosingDate: Date | null;
    stopAutomatedReminders: boolean | null;
    status: string;
  };
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string | null;
  };
}

class ClosingRemindersService {
  private reminderDays = [7, 5, 3, 1, 0];
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    console.log('Starting closing reminders service...');
    this.checkAndSendReminders();
    
    this.checkInterval = setInterval(() => {
      this.checkAndSendReminders();
    }, 60 * 60 * 1000);
    
    console.log('Closing reminders service started - checking every hour');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Closing reminders service stopped');
    }
  }

  private async hasReminderBeenSent(dealId: string, daysUntilClosing: number, dateStr: string): Promise<boolean> {
    const existing = await db
      .select({ id: sentReminders.id })
      .from(sentReminders)
      .where(and(
        eq(sentReminders.dealId, dealId),
        eq(sentReminders.daysUntilClosing, daysUntilClosing),
        eq(sentReminders.sentDate, dateStr)
      ))
      .limit(1);
    return existing.length > 0;
  }

  private async markReminderSent(dealId: string, daysUntilClosing: number, dateStr: string): Promise<boolean> {
    try {
      await db.insert(sentReminders).values({
        dealId,
        daysUntilClosing,
        sentDate: dateStr,
      }).onConflictDoNothing();
      return true;
    } catch {
      return false;
    }
  }

  async checkAndSendReminders() {
    try {
      console.log('[CLOSING REMINDERS] Checking for deals needing reminders...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 8);
      
      const dealsWithClosing = await db
        .select({
          deal: {
            id: savedDeals.id,
            userId: savedDeals.userId,
            propertyAddress: savedDeals.propertyAddress,
            estimatedClosingDate: savedDeals.estimatedClosingDate,
            stopAutomatedReminders: savedDeals.stopAutomatedReminders,
            status: savedDeals.status,
          },
          user: {
            id: users.id,
            email: users.email,
            username: users.username,
            fullName: userProfiles.fullName,
          },
        })
        .from(savedDeals)
        .innerJoin(users, eq(savedDeals.userId, users.id))
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(and(
          eq(savedDeals.status, 'under_contract'),
          isNotNull(savedDeals.estimatedClosingDate),
          gte(savedDeals.estimatedClosingDate, today),
          lte(savedDeals.estimatedClosingDate, maxDate)
        )) as DealWithUser[];
      
      console.log(`[CLOSING REMINDERS] Found ${dealsWithClosing.length} deals with upcoming closings`);
      
      for (const { deal, user } of dealsWithClosing) {
        if (deal.stopAutomatedReminders) {
          console.log(`[CLOSING REMINDERS] Skipping ${deal.id} - reminders stopped`);
          continue;
        }
        
        if (!deal.estimatedClosingDate || !deal.propertyAddress) {
          continue;
        }
        
        const closingDate = new Date(deal.estimatedClosingDate);
        closingDate.setHours(0, 0, 0, 0);
        
        const diffTime = closingDate.getTime() - today.getTime();
        const daysUntilClosing = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (this.reminderDays.includes(daysUntilClosing)) {
          const alreadySent = await this.hasReminderBeenSent(deal.id, daysUntilClosing, todayStr);
          
          if (alreadySent) {
            console.log(`[CLOSING REMINDERS] Already sent ${daysUntilClosing}-day reminder for ${deal.id}`);
            continue;
          }
          
          console.log(`[CLOSING REMINDERS] Sending ${daysUntilClosing}-day reminder for ${deal.propertyAddress}`);
          
          const reminderFirstName = (user.fullName || '').trim().split(/\s+/)[0] || user.username;
          const sent = await emailService.sendClosingReminderEmail(
            user.email,
            reminderFirstName,
            deal.propertyAddress,
            closingDate,
            daysUntilClosing,
            deal.id
          );
          
          if (sent) {
            await this.markReminderSent(deal.id, daysUntilClosing, todayStr);
            console.log(`[CLOSING REMINDERS] Reminder sent successfully for ${deal.propertyAddress}`);
          }
        }
      }
      
      this.cleanupOldReminders();
      
    } catch (error) {
      console.error('[CLOSING REMINDERS] Error checking reminders:', error);
    }
  }

  private async cleanupOldReminders() {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const cutoffDate = threeDaysAgo.toISOString().split('T')[0];
      
      await db.delete(sentReminders).where(
        sql`${sentReminders.sentDate} < ${cutoffDate}`
      );
    } catch (error) {
      console.error('[CLOSING REMINDERS] Error cleaning up old reminders:', error);
    }
  }
}

export const closingRemindersService = new ClosingRemindersService();
