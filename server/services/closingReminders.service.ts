import { db } from '../db';
import { savedDeals, users } from '@shared/schema';
import { eq, and, lte, gte, isNull, isNotNull } from 'drizzle-orm';
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
  };
}

class ClosingRemindersService {
  private reminderDays = [7, 5, 3, 1, 0];
  private checkInterval: NodeJS.Timeout | null = null;
  private sentReminders: Set<string> = new Set();

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

  private getReminderKey(dealId: string, daysUntilClosing: number): string {
    const today = new Date().toISOString().split('T')[0];
    return `${dealId}-${daysUntilClosing}-${today}`;
  }

  async checkAndSendReminders() {
    try {
      console.log('[CLOSING REMINDERS] Checking for deals needing reminders...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
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
          },
        })
        .from(savedDeals)
        .innerJoin(users, eq(savedDeals.userId, users.id))
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
          const reminderKey = this.getReminderKey(deal.id, daysUntilClosing);
          
          if (this.sentReminders.has(reminderKey)) {
            console.log(`[CLOSING REMINDERS] Already sent ${daysUntilClosing}-day reminder for ${deal.id}`);
            continue;
          }
          
          console.log(`[CLOSING REMINDERS] Sending ${daysUntilClosing}-day reminder for ${deal.propertyAddress}`);
          
          const sent = await emailService.sendClosingReminderEmail(
            user.email,
            user.username,
            deal.propertyAddress,
            closingDate,
            daysUntilClosing,
            deal.id
          );
          
          if (sent) {
            this.sentReminders.add(reminderKey);
            console.log(`[CLOSING REMINDERS] Reminder sent successfully for ${deal.propertyAddress}`);
          }
        }
      }
      
      this.cleanupOldReminders();
      
    } catch (error) {
      console.error('[CLOSING REMINDERS] Error checking reminders:', error);
    }
  }

  private cleanupOldReminders() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const keysToDelete: string[] = [];
    this.sentReminders.forEach((key) => {
      if (!key.endsWith(today) && !key.endsWith(yesterdayStr)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.sentReminders.delete(key));
  }
}

export const closingRemindersService = new ClosingRemindersService();
