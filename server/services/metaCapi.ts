import crypto from 'crypto';
import { storage } from '../storage';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  clientUserAgent?: string;
}

export interface CapiCustomData {
  value?: number;
  currency?: string;
  contentName?: string;
}

export async function sendMetaCapiEvent(
  eventName: string,
  userData: CapiUserData,
  customData?: CapiCustomData,
  eventId?: string,
): Promise<void> {
  try {
    const metaPixel = await storage.getMarketingPixelByPlatform('meta');
    if (!metaPixel || !metaPixel.isEnabled || !metaPixel.capiAccessToken) {
      return;
    }

    const hashedUserData: Record<string, string> = {};
    if (userData.email) hashedUserData.em = sha256(userData.email);
    if (userData.phone) hashedUserData.ph = sha256(userData.phone);
    if (userData.firstName) hashedUserData.fn = sha256(userData.firstName);
    if (userData.lastName) hashedUserData.ln = sha256(userData.lastName);
    if (userData.clientIp) hashedUserData.client_ip_address = userData.clientIp;
    if (userData.clientUserAgent) hashedUserData.client_user_agent = userData.clientUserAgent;

    const eventPayload: Record<string, any> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId ?? crypto.randomUUID(),
      action_source: 'website',
      user_data: hashedUserData,
    };

    if (customData) {
      eventPayload.custom_data = {
        ...(customData.value !== undefined && { value: customData.value }),
        currency: customData.currency ?? 'USD',
        ...(customData.contentName && { content_name: customData.contentName }),
      };
    }

    const url = `https://graph.facebook.com/v19.0/${metaPixel.pixelId}/events?access_token=${metaPixel.capiAccessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [eventPayload] }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[Meta CAPI] ${eventName} failed (${response.status}):`, body);
    } else {
      console.log(`[Meta CAPI] ${eventName} sent (event_id: ${eventPayload.event_id})`);
    }
  } catch (err) {
    console.error('[Meta CAPI] Unexpected error:', err);
  }
}
