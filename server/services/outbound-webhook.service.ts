import { storage } from "../storage";

interface WebhookPayload {
  eventType: string;
  timestamp: string;
  data: Record<string, any>;
}

export class OutboundWebhookService {
  async triggerWebhooks(eventType: string, data: Record<string, any>): Promise<void> {
    const webhooks = await storage.getOutboundWebhooks();
    
    const matchingWebhooks = webhooks.filter(webhook => 
      webhook.isActive && webhook.eventTypes && webhook.eventTypes.includes(eventType)
    );

    if (matchingWebhooks.length === 0) {
      console.log(`[OutboundWebhook] No webhooks configured for event: ${eventType}`);
      return;
    }

    console.log(`[OutboundWebhook] Triggering ${matchingWebhooks.length} webhook(s) for event: ${eventType}`);

    const payload: WebhookPayload = {
      eventType,
      timestamp: new Date().toISOString(),
      data
    };

    await Promise.allSettled(
      matchingWebhooks.map(webhook => this.sendWebhook(webhook, payload))
    );
  }

  private async sendWebhook(webhook: any, payload: WebhookPayload): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let statusCode: number | null = null;
    let responseText = "";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "RE-Data-Metrix-Webhook/1.0"
      };

      if (webhook.headers) {
        Object.assign(headers, webhook.headers);
      }

      const method = webhook.httpMethod || "POST";
      const fetchOptions: RequestInit = { method, headers };
      
      // Only include body for methods that support it (not GET/HEAD)
      if (!["GET", "HEAD"].includes(method.toUpperCase())) {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(webhook.targetUrl, {
        ...fetchOptions,
        signal: AbortSignal.timeout(8000)
      });

      statusCode = response.status;
      success = response.ok;
      responseText = await response.text().catch(() => "");

      await storage.recordOutboundWebhookResult(webhook.id, success);

      console.log(`[OutboundWebhook] ${webhook.name}: ${success ? 'Success' : 'Failed'} (${statusCode}) - ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`[OutboundWebhook] ${webhook.name}: Error -`, error);
      
      await storage.recordOutboundWebhookResult(webhook.id, false);

      responseText = error instanceof Error ? error.message : "Unknown error";
    }

    await storage.createIntegrationSyncLog({
      integrationId: webhook.integrationId,
      eventType: payload.eventType,
      direction: "outbound",
      status: success ? "success" : "error",
      requestData: payload,
      responseData: { statusCode, response: responseText.slice(0, 1000) },
      errorMessage: success ? null : responseText
    });
  }

  async testWebhook(webhookId: string): Promise<{ success: boolean; status: number; message: string }> {
    const webhook = await storage.getOutboundWebhook(webhookId);

    if (!webhook) {
      return { success: false, status: 0, message: "Webhook not found" };
    }

    const testPayload: WebhookPayload = {
      eventType: "test_event",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from RE Data Metrix",
        webhookId: webhook.id,
        webhookName: webhook.name,
        workflowTrigger: "free_signup",
        previousPlan: null,
        currentPlan: "free",
        isNewSignup: true,
        isUpgrade: false,
      }
    };

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "RE-Data-Metrix-Webhook/1.0"
      };

      if (webhook.headers) {
        Object.assign(headers, webhook.headers as Record<string, string>);
      }

      const method = webhook.httpMethod || "POST";
      const fetchOptions: RequestInit = { method, headers };
      
      // Only include body for methods that support it (not GET/HEAD)
      if (!["GET", "HEAD"].includes(method.toUpperCase())) {
        fetchOptions.body = JSON.stringify(testPayload);
      }

      const response = await fetch(webhook.targetUrl, fetchOptions);

      const responseText = await response.text().catch(() => "");

      await storage.recordOutboundWebhookResult(webhook.id, response.ok);

      await storage.createIntegrationSyncLog({
        integrationId: webhook.integrationId,
        eventType: "test_event",
        direction: "outbound",
        status: response.ok ? "success" : "error",
        requestData: testPayload,
        responseData: { status: response.status, body: responseText.slice(0, 1000) },
        errorMessage: response.ok ? null : `HTTP ${response.status}`
      });

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? "Webhook test successful" : `Failed with status ${response.status}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      
      await storage.recordOutboundWebhookResult(webhook.id, false);

      await storage.createIntegrationSyncLog({
        integrationId: webhook.integrationId,
        eventType: "test_event",
        direction: "outbound",
        status: "error",
        requestData: testPayload,
        responseData: null,
        errorMessage: message
      });

      return { success: false, status: 0, message };
    }
  }
}

export const outboundWebhookService = new OutboundWebhookService();
