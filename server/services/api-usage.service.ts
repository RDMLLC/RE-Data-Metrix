import { db } from "../db";
import { apiUsageLogs, users, type ApiUsageLog } from "@shared/schema";
import { eq, and, sql, desc, gte, lte, count, sum } from "drizzle-orm";

// API cost rates in cents
export const API_COSTS = {
  rentcast: {
    property_details: 2, // $0.02 per property lookup
    comparable_sales: 3, // $0.03 per comps search
    value_estimate: 2,   // $0.02 per value estimate
    rent_estimate: 2,    // $0.02 per rent estimate
  },
  hasdata: {
    property_images: 1,  // $0.01 per image fetch (approximate)
  }
} as const;

export interface ApiUsageStats {
  totalCalls: number;
  totalCostCents: number;
  byProvider: Record<string, { calls: number; costCents: number }>;
  byEndpoint: Record<string, { calls: number; costCents: number }>;
}

export interface UserApiUsageStats extends ApiUsageStats {
  userId: string;
  username?: string;
  email?: string;
}

export class ApiUsageService {
  /**
   * Log an API call
   */
  async logApiCall(data: {
    userId?: string;
    endpoint: string;
    apiProvider: string;
    apiEndpoint?: string;
    requestPayload?: object;
    responseStatus?: number;
    costCents: number;
    durationMs?: number;
    success?: boolean;
    errorMessage?: string;
  }): Promise<ApiUsageLog> {
    const [log] = await db.insert(apiUsageLogs).values({
      userId: data.userId || null,
      endpoint: data.endpoint,
      apiProvider: data.apiProvider,
      apiEndpoint: data.apiEndpoint || null,
      requestPayload: data.requestPayload || null,
      responseStatus: data.responseStatus || null,
      costCents: data.costCents,
      durationMs: data.durationMs || null,
      success: data.success ?? true,
      errorMessage: data.errorMessage || null,
    }).returning();

    return log;
  }

  /**
   * Get API usage stats for a specific user
   */
  async getUserStats(
    userId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<ApiUsageStats> {
    const conditions = [eq(apiUsageLogs.userId, userId)];
    if (startDate) conditions.push(gte(apiUsageLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(apiUsageLogs.createdAt, endDate));

    const results = await db
      .select({
        apiProvider: apiUsageLogs.apiProvider,
        endpoint: apiUsageLogs.endpoint,
        calls: count(),
        costCents: sql<number>`COALESCE(SUM(cost_cents), 0)`,
      })
      .from(apiUsageLogs)
      .where(and(...conditions))
      .groupBy(apiUsageLogs.apiProvider, apiUsageLogs.endpoint);

    const stats: ApiUsageStats = {
      totalCalls: 0,
      totalCostCents: 0,
      byProvider: {},
      byEndpoint: {},
    };

    for (const row of results) {
      stats.totalCalls += Number(row.calls);
      stats.totalCostCents += Number(row.costCents);

      if (!stats.byProvider[row.apiProvider]) {
        stats.byProvider[row.apiProvider] = { calls: 0, costCents: 0 };
      }
      stats.byProvider[row.apiProvider].calls += Number(row.calls);
      stats.byProvider[row.apiProvider].costCents += Number(row.costCents);

      if (!stats.byEndpoint[row.endpoint]) {
        stats.byEndpoint[row.endpoint] = { calls: 0, costCents: 0 };
      }
      stats.byEndpoint[row.endpoint].calls += Number(row.calls);
      stats.byEndpoint[row.endpoint].costCents += Number(row.costCents);
    }

    return stats;
  }

  /**
   * Get API usage stats for all users (admin view)
   */
  async getAllUsersStats(
    startDate?: Date, 
    endDate?: Date,
    limit = 100
  ): Promise<UserApiUsageStats[]> {
    const results = await db
      .select({
        userId: apiUsageLogs.userId,
        username: users.username,
        email: users.email,
        totalCalls: count(),
        totalCostCents: sql<number>`COALESCE(SUM(cost_cents), 0)`,
      })
      .from(apiUsageLogs)
      .leftJoin(users, eq(apiUsageLogs.userId, users.id))
      .where(
        and(
          startDate ? gte(apiUsageLogs.createdAt, startDate) : undefined,
          endDate ? lte(apiUsageLogs.createdAt, endDate) : undefined
        )
      )
      .groupBy(apiUsageLogs.userId, users.username, users.email)
      .orderBy(desc(sql`SUM(cost_cents)`))
      .limit(limit);

    return results.map(row => ({
      userId: row.userId || 'anonymous',
      username: row.username || undefined,
      email: row.email || undefined,
      totalCalls: Number(row.totalCalls),
      totalCostCents: Number(row.totalCostCents),
      byProvider: {},
      byEndpoint: {},
    }));
  }

  /**
   * Get total API costs for a date range
   */
  async getTotalCosts(startDate?: Date, endDate?: Date): Promise<{
    totalCalls: number;
    totalCostCents: number;
    byProvider: Record<string, { calls: number; costCents: number }>;
  }> {
    const results = await db
      .select({
        apiProvider: apiUsageLogs.apiProvider,
        calls: count(),
        costCents: sql<number>`COALESCE(SUM(cost_cents), 0)`,
      })
      .from(apiUsageLogs)
      .where(
        and(
          startDate ? gte(apiUsageLogs.createdAt, startDate) : undefined,
          endDate ? lte(apiUsageLogs.createdAt, endDate) : undefined
        )
      )
      .groupBy(apiUsageLogs.apiProvider);

    const summary = {
      totalCalls: 0,
      totalCostCents: 0,
      byProvider: {} as Record<string, { calls: number; costCents: number }>,
    };

    for (const row of results) {
      summary.totalCalls += Number(row.calls);
      summary.totalCostCents += Number(row.costCents);
      summary.byProvider[row.apiProvider] = {
        calls: Number(row.calls),
        costCents: Number(row.costCents),
      };
    }

    return summary;
  }

  /**
   * Get recent API logs (for admin debugging)
   */
  async getRecentLogs(limit = 50): Promise<ApiUsageLog[]> {
    return db
      .select()
      .from(apiUsageLogs)
      .orderBy(desc(apiUsageLogs.createdAt))
      .limit(limit);
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(userId: string, limit = 50): Promise<ApiUsageLog[]> {
    return db
      .select()
      .from(apiUsageLogs)
      .where(eq(apiUsageLogs.userId, userId))
      .orderBy(desc(apiUsageLogs.createdAt))
      .limit(limit);
  }
}

export const apiUsageService = new ApiUsageService();
