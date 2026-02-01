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

export class ZohoMeetingService {
  private zsoid: string;
  private baseUrl = "https://meeting.zoho.com/api/v2";

  constructor() {
    this.zsoid = process.env.ZOHO_ZSOID || "";
  }

  async getParticipants(meetingKey: string): Promise<ZohoParticipant[]> {
    const accessToken = await zohoOAuthService.getValidAccessToken();
    
    if (!accessToken) {
      throw new Error("Zoho is not connected. Please authorize first.");
    }

    const url = `${this.baseUrl}/${this.zsoid}/participant/${meetingKey}.json`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Zoho Meeting API error:", error);
      throw new Error(`Failed to fetch participants: ${response.status} - ${error}`);
    }

    const data: ParticipantResponse = await response.json();
    return data.participants || [];
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
