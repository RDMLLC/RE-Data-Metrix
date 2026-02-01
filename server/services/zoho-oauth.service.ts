import { db } from "../db";
import { zohoTokens } from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";

const ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// Store pending OAuth states (in-memory, keyed by state string -> userId)
const pendingOAuthStates = new Map<string, { userId: string; expiresAt: number }>();

export class ZohoOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID || "";
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET || "";
    this.redirectUri = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/api/zoho/callback`;
  }

  generateState(userId: string): string {
    const state = crypto.randomBytes(32).toString('hex');
    // Store state with 10-minute expiry
    pendingOAuthStates.set(state, {
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return state;
  }

  validateState(state: string): string | null {
    const pending = pendingOAuthStates.get(state);
    if (!pending) {
      return null;
    }
    // Remove the state (single use)
    pendingOAuthStates.delete(state);
    // Check expiry
    if (Date.now() > pending.expiresAt) {
      return null;
    }
    return pending.userId;
  }

  getAuthorizationUrl(state: string): string {
    const scopes = "ZohoMeeting.meeting.READ";
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch(ZOHO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data: TokenResponse = await response.json();
    
    if (!data.refresh_token) {
      throw new Error("No refresh token received. Make sure access_type=offline and prompt=consent are set.");
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    // Clear any existing tokens and insert the new one (upsert strategy)
    await db.delete(zohoTokens);
    await db.insert(zohoTokens).values({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  async getValidAccessToken(): Promise<string | null> {
    const [latestToken] = await db
      .select()
      .from(zohoTokens)
      .orderBy(desc(zohoTokens.createdAt))
      .limit(1);

    if (!latestToken) {
      return null;
    }

    const now = new Date();
    const bufferTime = 5 * 60 * 1000;

    if (new Date(latestToken.expiresAt).getTime() - bufferTime > now.getTime()) {
      return latestToken.accessToken;
    }

    return await this.refreshAccessToken(latestToken.refreshToken, latestToken.id);
  }

  private async refreshAccessToken(refreshToken: string, tokenId: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(ZOHO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data: TokenResponse = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await db
      .update(zohoTokens)
      .set({
        accessToken: data.access_token,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(zohoTokens.id, tokenId));

    return data.access_token;
  }

  async isConnected(): Promise<boolean> {
    const token = await this.getValidAccessToken();
    return token !== null;
  }

  async disconnect(): Promise<void> {
    await db.delete(zohoTokens);
  }
}

export const zohoOAuthService = new ZohoOAuthService();
