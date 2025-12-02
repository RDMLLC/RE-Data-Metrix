/**
 * Zoho Billing Service
 * Handles OAuth authentication and subscription management
 */

interface ZohoTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface ZohoHostedPage {
  hostedpage_id: string;
  status: string;
  url: string;
  action: string;
  expiring_time: string;
}

interface ZohoCustomer {
  customer_id: string;
  display_name: string;
  email: string;
}

interface ZohoSubscription {
  subscription_id: string;
  status: string;
  plan: {
    plan_code: string;
    name: string;
  };
  current_term_starts_at: string;
  current_term_ends_at: string;
}

class ZohoBillingService {
  private baseUrl = 'https://www.zohoapis.com/billing/v1';
  private accountsUrl = 'https://accounts.zoho.com/oauth/v2';
  
  private get clientId(): string {
    return process.env.ZOHO_CLIENT_ID || '';
  }
  
  private get clientSecret(): string {
    return process.env.ZOHO_CLIENT_SECRET || '';
  }
  
  private get organizationId(): string {
    return process.env.ZOHO_ORGANIZATION_ID || '';
  }
  
  private get refreshToken(): string {
    return process.env.ZOHO_REFRESH_TOKEN || '';
  }
  
  private get redirectUri(): string {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
    return `https://${domain}/api/zoho/callback`;
  }

  /**
   * Check if Zoho integration is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Check if Zoho integration is fully ready (has refresh token)
   */
  isReady(): boolean {
    return this.isConfigured() && !!this.refreshToken && !!this.organizationId;
  }

  /**
   * Get the OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    // Zoho Subscriptions/Billing API scopes
    // Using full scope for all Subscriptions operations
    const scopes = 'ZohoSubscriptions.fullaccess.all';

    const params = new URLSearchParams({
      scope: scopes,
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      access_type: 'offline',
      prompt: 'consent'
    });

    console.log('[Zoho OAuth] Authorization URL:', `${this.accountsUrl}/auth?${params.toString()}`);
    console.log('[Zoho OAuth] Redirect URI:', this.redirectUri);

    return `${this.accountsUrl}/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<ZohoTokens> {
    const params = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code'
    });

    const response = await fetch(`${this.accountsUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get a fresh access token using the refresh token
   */
  async getAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('Zoho refresh token not configured');
    }

    const params = new URLSearchParams({
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token'
    });

    const response = await fetch(`${this.accountsUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Get list of organizations to find the Organization ID
   */
  async getOrganizations(accessToken: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/organizations`, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get organizations: ${error}`);
    }

    const data = await response.json();
    return data.organizations || [];
  }

  /**
   * Make an authenticated API request to Zoho Billing
   */
  private async apiRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'X-com-zoho-subscriptions-organizationid': this.organizationId,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoho API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Create or get a customer in Zoho Billing
   */
  async findOrCreateCustomer(email: string, displayName: string): Promise<ZohoCustomer> {
    // First try to find existing customer
    const searchResult = await this.apiRequest<any>(`/customers?email=${encodeURIComponent(email)}`);
    
    if (searchResult.customers && searchResult.customers.length > 0) {
      return searchResult.customers[0];
    }

    // Create new customer
    const createResult = await this.apiRequest<any>('/customers', 'POST', {
      display_name: displayName,
      email: email
    });

    return createResult.customer;
  }

  /**
   * Create a hosted page for new subscription
   */
  async createSubscriptionHostedPage(
    customerId: string,
    planCode: string,
    couponCode?: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<ZohoHostedPage> {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
    
    const payload: any = {
      customer_id: customerId,
      plan: {
        plan_code: planCode
      },
      redirect_url: successUrl || `https://${domain}/checkout/success`,
    };

    if (couponCode) {
      payload.coupon_code = couponCode;
    }

    const result = await this.apiRequest<any>('/hostedpages/newsubscription', 'POST', payload);
    return result.hostedpage;
  }

  /**
   * Create a hosted page to update payment method
   */
  async createUpdateCardHostedPage(subscriptionId: string): Promise<ZohoHostedPage> {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
    
    const result = await this.apiRequest<any>('/hostedpages/updatecard', 'POST', {
      subscription_id: subscriptionId,
      redirect_url: `https://${domain}/portal/profile?cardUpdated=true`
    });

    return result.hostedpage;
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<ZohoSubscription> {
    const result = await this.apiRequest<any>(`/subscriptions/${subscriptionId}`);
    return result.subscription;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtEnd: boolean = true): Promise<void> {
    await this.apiRequest<any>(`/subscriptions/${subscriptionId}/cancel`, 'POST', {
      cancel_at_end: cancelAtEnd
    });
  }

  /**
   * Get available plans
   */
  async getPlans(): Promise<any[]> {
    const result = await this.apiRequest<any>('/plans');
    return result.plans || [];
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }
}

export const zohoBillingService = new ZohoBillingService();
