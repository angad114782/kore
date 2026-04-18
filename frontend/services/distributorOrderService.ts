import axios from "axios";
import { Order, OrderStatus } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5005/api";
const API_URL = `${API_BASE_URL}/orders`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("kore_token");
  if (!token) throw new Error("No token found");
  return { Authorization: `Bearer ${token}` };
};

class DistributorOrderService {
  private mapOrder(o: any): Order {
    return { ...o, id: o._id || o.id };
  }

  async getOrdersByDistributor(
    distributorId: string,
    params: { page?: number; limit?: number; q?: string; status?: string; startDate?: string; endDate?: string; sortBy?: string; sortDesc?: boolean } = {}
  ): Promise<{ items: Order[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.q) query.append("q", params.q);
    if (params.status) query.append("status", params.status);
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);
    if (params.sortBy) query.append("sortBy", params.sortBy);
    if (params.sortDesc !== undefined) query.append("sortDesc", params.sortDesc.toString());
    query.append("_t", Date.now().toString()); // Cache buster for real-time sync

    const res = await axios.get(`${API_URL}/my-orders?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return {
      items: (res.data.data || []).map((o: any) => this.mapOrder(o)),
      meta: res.data.meta,
    };
  }

  async getAllOrders(
    params: { page?: number; limit?: number; q?: string; status?: string; startDate?: string; endDate?: string; sortBy?: string; sortDesc?: boolean } = {}
  ): Promise<{ items: Order[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.q) query.append("q", params.q);
    if (params.status) query.append("status", params.status);
    if (params.startDate) query.append("startDate", params.startDate);
    if (params.endDate) query.append("endDate", params.endDate);
    if (params.sortBy) query.append("sortBy", params.sortBy);
    if (params.sortDesc !== undefined) query.append("sortDesc", params.sortDesc.toString());
    query.append("_t", Date.now().toString()); // Cache buster for real-time sync

    const res = await axios.get(`${API_URL}?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return {
      items: (res.data.data || []).map((o: any) => this.mapOrder(o)),
      meta: res.data.meta,
    };
  }

  async placeOrder(order: Partial<Order>): Promise<Order> {
    const res = await axios.post(API_URL, order, {
      headers: getAuthHeaders(),
    });
    return this.mapOrder(res.data.data);
  }

  async getOrderById(orderId: string): Promise<Order | undefined> {
    const res = await this.getAllOrders({ limit: 1000 }); // Fetch a large batch or implement single fetch
    return res.items.find((o) => o.id === orderId);
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    options: { allocatedItems?: any[], files?: Record<string, File>, receiverName?: string, receiverMobile?: string } = {}
  ): Promise<Order | undefined> {
    const formData = new FormData();
    formData.append("status", status);
    
    if (options.allocatedItems) {
      formData.append("allocatedItems", JSON.stringify(options.allocatedItems));
    }
    
    if (options.receiverName) formData.append("receiverName", options.receiverName);
    if (options.receiverMobile) formData.append("receiverMobile", options.receiverMobile);

    if (options.files) {
      Object.entries(options.files).forEach(([key, file]) => {
        formData.append(key, file);
      });
    }

    const res = await axios.patch(
      `${API_URL}/${orderId}/status`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return this.mapOrder(res.data.data);
  }

  async markAsReceived(
    orderId: string,
    data: { receivingNote: File, receiverName: string, receiverMobile: string }
  ): Promise<Order | undefined> {
    const formData = new FormData();
    formData.append("status", OrderStatus.RECEIVED);
    formData.append("receivingNote", data.receivingNote);
    formData.append("receiverName", data.receiverName);
    formData.append("receiverMobile", data.receiverMobile);

    const res = await axios.patch(
      `${API_URL}/${orderId}/status`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return this.mapOrder(res.data.data);
  }

  async processReturn(orderId: string, variantId: string, cartons: number): Promise<Order | undefined> {
    const res = await axios.post(
      `${API_URL}/return`,
      { orderId, variantId, cartons },
      { headers: getAuthHeaders() }
    );
    return this.mapOrder(res.data.data);
  }
}

export const distributorOrderService = new DistributorOrderService();
