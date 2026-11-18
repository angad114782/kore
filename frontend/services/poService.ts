import { apiFetch } from "./api";
import { PurchaseOrder } from "../types";

export const poService = {
  async listPOs(query: { q?: string; page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (query.q) params.append("q", query.q);
    if (query.page) params.append("page", query.page.toString());
    if (query.limit) params.append("limit", query.limit.toString());
    
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/purchase-orders${queryString}`);
  },

  async createPO(data: Partial<PurchaseOrder>) {
    return apiFetch("/purchase-orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** Email a PO. `pdf` / `csv` are files generated in the browser. */
  async sendEmail(id: string, payload: { to: string[]; pdf?: Blob; csv?: Blob }) {
    const form = new FormData();
    form.append("to", JSON.stringify(payload.to));
    if (payload.pdf) form.append("pdf", payload.pdf, "po.pdf");
    if (payload.csv) form.append("csv", payload.csv, "po.csv");
    return apiFetch(`/purchase-orders/${id}/send-email`, { method: "POST", body: form });
  },

  async getPOById(id: string) {
    return apiFetch(`/purchase-orders/${id}`);
  },

  async updatePO(id: string, data: Partial<PurchaseOrder>) {
    return apiFetch(`/purchase-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
