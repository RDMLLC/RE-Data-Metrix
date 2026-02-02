import { zohoOAuthService } from "./zoho-oauth.service";

interface ZohoParticipant {
  email: string;
  joinTime: number;
  leaveTime: number;
  duration: number;
  role: string;
  inAndOutTime: string;
  source: string;
  memberId: string;
  participantAvatar?: string;
}

interface ParticipantResponse {
  participantsCount: number;
  participants: ZohoParticipant[];
}

interface ZohoMeeting {
  meetingKey: string;
  topic: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
}

interface MeetingsResponse {
  meetings: ZohoMeeting[];
  totalCount: number;
}

// Zoho data center configurations
const ZOHO_DATA_CENTERS: Record<string, { meetingApi: string; accountsApi: string }> = {
  'US': { meetingApi: 'https://meeting.zoho.com/api/v2', accountsApi: 'https://accounts.zoho.com' },
  'EU': { meetingApi: 'https://meeting.zoho.eu/api/v2', accountsApi: 'https://accounts.zoho.eu' },
  'IN': { meetingApi: 'https://meeting.zoho.in/api/v2', accountsApi: 'https://accounts.zoho.in' },
  'AU': { meetingApi: 'https://meeting.zoho.com.au/api/v2', accountsApi: 'https://accounts.zoho.com.au' },
  'JP': { meetingApi: 'https://meeting.zoho.jp/api/v2', accountsApi: 'https://accounts.zoho.jp' },
};

export function getZohoDataCenter(): string {
  return process.env.ZOHO_DATA_CENTER || 'US';
}

export function getZohoMeetingApiUrl(): string {
  const dc = getZohoDataCenter();
  return ZOHO_DATA_CENTERS[dc]?.meetingApi || ZOHO_DATA_CENTERS['US'].meetingApi;
}

export function getZohoAccountsApiUrl(): string {
  const dc = getZohoDataCenter();
  return ZOHO_DATA_CENTERS[dc]?.accountsApi || ZOHO_DATA_CENTERS['US'].accountsApi;
}

export class ZohoMeetingService {
  private zsoid: string;
  private baseUrl: string;

  constructor() {
    this.zsoid = process.env.ZOHO_ZSOID || "";
    this.baseUrl = getZohoMeetingApiUrl();
    console.log(`Zoho Meeting Service initialized with data center: ${getZohoDataCenter()}, API URL: ${this.baseUrl}`);
  }

  async getParticipants(meetingKey: string): Promise<ZohoParticipant[]> {
    const accessToken = await zohoOAuthService.getValidAccessToken();
    
    if (!accessToken) {
      throw new Error("Zoho is not connected. Please authorize first.");
    }

    // Check if this is a URL-format key (like edef-zym-pkw) or numeric key
    // URL-format keys contain dashes and letters, numeric keys are just numbers
    const isUrlFormat = /[a-zA-Z-]/.test(meetingKey);
    let numericKey = meetingKey;
    
    if (isUrlFormat) {
      console.log("Detected URL-format key, searching for numeric webinar key...");
      // Try to find the webinar by URL key
      const webinar = await this.findWebinarByUrlKey(meetingKey);
      if (webinar) {
        numericKey = webinar.meetingKey;
        console.log(`Found webinar with numeric key: ${numericKey}`);
      } else {
        console.log("Could not find webinar by URL key, trying URL key directly...");
      }
    }

    // Try webinar attendee endpoint first (since this is for webinars)
    // Then fall back to meeting participant endpoint
    const webinarUrl = `${this.baseUrl}/${this.zsoid}/attendee/${numericKey}.json?index=1&count=100`;
    const meetingUrl = `${this.baseUrl}/${this.zsoid}/participant/${numericKey}.json?index=1&count=100`;
    
    console.log("Trying webinar attendee endpoint:", webinarUrl);
    
    // Try webinar endpoint first
    let response = await fetch(webinarUrl, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    // If webinar endpoint fails, try meeting endpoint
    if (!response.ok) {
      console.log("Webinar endpoint failed, trying meeting participant endpoint:", meetingUrl);
      response = await fetch(meetingUrl, {
        method: "GET",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error("Zoho Meeting API error:", error);
      
      // Check if it's an HTML error (wrong endpoint) vs JSON error
      if (error.includes("<html") || error.includes("<!DOCTYPE")) {
        throw new Error(`Zoho API returned HTML instead of JSON. This may indicate an incorrect ZSOID (${this.zsoid}) or meeting key format. Please verify your Zoho organization ID. The meeting key "${meetingKey}" may need to be a numeric webinar key from your Zoho Meeting dashboard.`);
      }
      
      // Parse JSON error for better message
      try {
        const errorJson = JSON.parse(error);
        if (errorJson.error?.message) {
          throw new Error(`Zoho API error: ${errorJson.error.message}`);
        }
      } catch (parseErr) {
        // Not JSON, use raw error
      }
      
      throw new Error(`Failed to fetch participants: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // Handle both webinar (attendeeData) and meeting (participants) response formats
    if (data.attendeeData) {
      // Webinar format - map to participant format
      return data.attendeeData.map((a: any) => ({
        email: a.email,
        joinTime: 0,
        leaveTime: 0,
        duration: 0,
        role: "attendee",
        inAndOutTime: "",
        source: "webinar",
        memberId: "",
      }));
    }
    
    return data.participants || [];
  }

  async findWebinarByUrlKey(urlKey: string): Promise<ZohoMeeting | null> {
    try {
      // Get list of webinars and find one matching the URL key
      const webinars = await this.getRecentWebinars();
      console.log(`Searching ${webinars.length} webinars for URL key: ${urlKey}`);
      
      // Also try meetings
      const meetings = await this.getRecentMeetings();
      console.log(`Searching ${meetings.length} meetings for URL key: ${urlKey}`);
      
      // Search both lists for a match (the meetingKey or topic might contain the URL key)
      const allSessions = [...webinars, ...meetings];
      for (const session of allSessions) {
        // Log session details for debugging
        console.log(`Session: key=${session.meetingKey}, topic=${session.topic}`);
        // Check if the URL key appears in the topic or matches directly
        if (session.topic?.toLowerCase().includes(urlKey.toLowerCase())) {
          return session;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error finding webinar by URL key:", error);
      return null;
    }
  }

  async getMeetingByUrlKey(urlKey: string): Promise<ZohoMeeting | null> {
    // The URL key (like edef-zym-pkw) may need to be looked up in the sessions list
    // to find the actual numeric meeting key
    try {
      const meetings = await this.getRecentMeetings();
      // Try to find a meeting that matches the URL key pattern
      const meeting = meetings.find(m => 
        m.meetingKey === urlKey || 
        m.meetingKey.toLowerCase() === urlKey.toLowerCase()
      );
      return meeting || null;
    } catch (error) {
      console.error("Error looking up meeting by URL key:", error);
      return null;
    }
  }

  async getRecentMeetings(): Promise<ZohoMeeting[]> {
    const accessToken = await zohoOAuthService.getValidAccessToken();
    
    if (!accessToken) {
      throw new Error("Zoho is not connected. Please authorize first.");
    }

    const url = `${this.baseUrl}/${this.zsoid}/sessions.json?fromIndex=1&toIndex=20`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Zoho Meeting API error:", error);
      throw new Error(`Failed to fetch meetings: ${response.status} - ${error}`);
    }

    const data: MeetingsResponse = await response.json();
    return data.meetings || [];
  }

  async getRecentWebinars(): Promise<ZohoMeeting[]> {
    const accessToken = await zohoOAuthService.getValidAccessToken();
    
    if (!accessToken) {
      throw new Error("Zoho is not connected. Please authorize first.");
    }

    // List webinars endpoint
    const url = `${this.baseUrl}/${this.zsoid}/webinar.json?fromIndex=1&limit=20`;
    
    console.log("Fetching webinars from:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Zoho Webinar API error:", error);
      // Don't throw - return empty array as fallback
      return [];
    }

    const data = await response.json();
    console.log("Webinars response:", JSON.stringify(data).substring(0, 500));
    
    // Webinar list response format may differ
    return data.webinars || data.sessions || [];
  }

  extractMeetingKeyFromUrl(url: string): string | null {
    const match = url.match(/meet\.zoho\.com\/([a-z]+-[a-z]+-[a-z]+)/i);
    return match ? match[1] : null;
  }

  async syncAttendanceWithRegistrations(
    meetingKey: string,
    registrations: Array<{ id: string; email: string }>
  ): Promise<{
    matched: number;
    unmatched: number;
    attendees: string[];
    notFound: string[];
  }> {
    const participants = await this.getParticipants(meetingKey);
    
    const participantEmails = new Set(
      participants.map((p) => p.email.toLowerCase())
    );

    const attendees: string[] = [];
    const notFound: string[] = [];

    for (const reg of registrations) {
      if (participantEmails.has(reg.email.toLowerCase())) {
        attendees.push(reg.id);
      } else {
        notFound.push(reg.id);
      }
    }

    const unmatchedParticipants = participants.filter(
      (p) => !registrations.some((r) => r.email.toLowerCase() === p.email.toLowerCase())
    );

    return {
      matched: attendees.length,
      unmatched: unmatchedParticipants.length,
      attendees,
      notFound,
    };
  }
}

export const zohoMeetingService = new ZohoMeetingService();
