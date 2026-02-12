import { storage } from '../storage';
import { emailService } from './email.service';

class WebinarReminderService {
  private checkInterval: NodeJS.Timeout | null = null;
  
  // Webinar date: February 27, 2026 at 12:00 PM EST (17:00 UTC)
  private readonly webinarDate = new Date('2026-02-27T17:00:00Z');
  private readonly dayBeforeReminderTime = new Date('2026-02-26T17:00:00Z'); // Feb 26, 12:00 PM EST
  private readonly finalReminderTime = new Date('2026-02-27T16:30:00Z'); // Feb 27, 11:30 AM EST

  start() {
    console.log('Starting webinar reminder service...');
    console.log(`Day-before reminder scheduled for: ${this.dayBeforeReminderTime.toISOString()}`);
    console.log(`Final reminder scheduled for: ${this.finalReminderTime.toISOString()}`);
    
    // Check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkAndSendReminders();
    }, 5 * 60 * 1000);
    
    // Also check immediately on startup
    this.checkAndSendReminders();
    
    console.log('Webinar reminder service started - checking every 5 minutes');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Webinar reminder service stopped');
    }
  }

  private async checkAndSendReminders() {
    const now = new Date();
    
    // Check if it's time to send day-before reminders
    // Send if we're past the scheduled time and within a reasonable window (2 hours)
    if (now >= this.dayBeforeReminderTime && now <= new Date(this.dayBeforeReminderTime.getTime() + 2 * 60 * 60 * 1000)) {
      console.log('[WEBINAR REMINDER] Checking for day-before reminders to send...');
      await this.sendDayBeforeReminders();
    }
    
    // Check if it's time to send final reminders
    // Send if we're past the scheduled time and within a reasonable window (30 minutes)
    if (now >= this.finalReminderTime && now <= new Date(this.finalReminderTime.getTime() + 30 * 60 * 1000)) {
      console.log('[WEBINAR REMINDER] Checking for final reminders to send...');
      await this.sendFinalReminders();
    }
  }

  private async sendDayBeforeReminders() {
    try {
      const registrations = await storage.getWebinarRegistrationsNeedingEmail('dayBefore');
      console.log(`[WEBINAR REMINDER] Found ${registrations.length} registrations needing day-before reminder`);
      
      for (const registration of registrations) {
        try {
          const success = await emailService.sendWebinarDayBeforeReminder(
            registration.email,
            registration.name,
            registration.id
          );
          
          if (success) {
            await storage.updateWebinarRegistrationEmailSent(registration.id, 'dayBefore');
            console.log(`[WEBINAR REMINDER] Day-before reminder sent to ${registration.email}`);
          } else {
            console.error(`[WEBINAR REMINDER] Failed to send day-before reminder to ${registration.email}`);
          }
        } catch (error) {
          console.error(`[WEBINAR REMINDER] Error sending day-before reminder to ${registration.email}:`, error);
        }
      }
    } catch (error) {
      console.error('[WEBINAR REMINDER] Error in sendDayBeforeReminders:', error);
    }
  }

  private async sendFinalReminders() {
    try {
      const registrations = await storage.getWebinarRegistrationsNeedingEmail('final');
      console.log(`[WEBINAR REMINDER] Found ${registrations.length} registrations needing final reminder`);
      
      // Only send to those who haven't declined
      const activeRegistrations = registrations.filter(r => r.rsvpStatus !== 'declined');
      console.log(`[WEBINAR REMINDER] ${activeRegistrations.length} active registrations (excluding declined)`);
      
      for (const registration of activeRegistrations) {
        try {
          const success = await emailService.sendWebinarFinalReminder(
            registration.email,
            registration.name
          );
          
          if (success) {
            await storage.updateWebinarRegistrationEmailSent(registration.id, 'final');
            console.log(`[WEBINAR REMINDER] Final reminder sent to ${registration.email}`);
          } else {
            console.error(`[WEBINAR REMINDER] Failed to send final reminder to ${registration.email}`);
          }
        } catch (error) {
          console.error(`[WEBINAR REMINDER] Error sending final reminder to ${registration.email}:`, error);
        }
      }
    } catch (error) {
      console.error('[WEBINAR REMINDER] Error in sendFinalReminders:', error);
    }
  }

  // Manual trigger for admin to send reminders immediately (useful for testing)
  async triggerDayBeforeReminders(): Promise<{ sent: number; failed: number; total: number }> {
    const registrations = await storage.getWebinarRegistrationsNeedingEmail('dayBefore');
    let sent = 0;
    let failed = 0;
    
    for (const registration of registrations) {
      try {
        const success = await emailService.sendWebinarDayBeforeReminder(
          registration.email,
          registration.name,
          registration.id
        );
        
        if (success) {
          await storage.updateWebinarRegistrationEmailSent(registration.id, 'dayBefore');
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }
    
    return { sent, failed, total: registrations.length };
  }

  async triggerFinalReminders(): Promise<{ sent: number; failed: number; total: number }> {
    const registrations = await storage.getWebinarRegistrationsNeedingEmail('final');
    const activeRegistrations = registrations.filter(r => r.rsvpStatus !== 'declined');
    let sent = 0;
    let failed = 0;
    
    for (const registration of activeRegistrations) {
      try {
        const success = await emailService.sendWebinarFinalReminder(
          registration.email,
          registration.name
        );
        
        if (success) {
          await storage.updateWebinarRegistrationEmailSent(registration.id, 'final');
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }
    
    return { sent, failed, total: activeRegistrations.length };
  }
}

export const webinarReminderService = new WebinarReminderService();
