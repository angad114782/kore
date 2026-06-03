import { apiFetch } from "./api";

export interface ActivityLogEntry {
  _id: string;
  userId: string | null;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const activityLogService = {
  async list(query: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const params = new URLSearchParams();
    if (query.page)      params.append("page",       String(query.page));
    if (query.limit)     params.append("limit",      String(query.limit));
    if (query.action)    params.append("action",     query.action);
    if (query.entityType)params.append("entityType", query.entityType);
    if (query.userId)    params.append("userId",     query.userId);
    if (query.startDate) params.append("startDate",  query.startDate);
    if (query.endDate)   params.append("endDate",    query.endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/activity-logs${qs}`);
  },
};
