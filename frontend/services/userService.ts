import { apiFetch } from "./api";

export const userService = {
  createUser: async (userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    permissions?: string[];
  }) => {
    const response = await apiFetch("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return response.data;
  },

  listUsers: async (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page.toString());
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.search) query.append("search", params.search);
    if (params.role) query.append("role", params.role);

    const response = await apiFetch(`/users?${query.toString()}`);
    return response; // { data: items[], meta: {} }
  },

  updateUser: async (
    userId: string,
    userData: Partial<{
      name: string;
      email: string;
      role: string;
      phone: string | null;
      permissions: string[];
      isActive: boolean;
    }>,
  ) => {
    const response = await apiFetch(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(userData),
    });
    return response.data;
  },

  deleteUser: async (userId: string) => {
    await apiFetch(`/users/${userId}`, {
      method: "DELETE",
    });
  },

  // Profile methods for current user
  getProfile: async () => {
    const response = await apiFetch("/users/me", {
      method: "GET",
    });
    return response.data;
  },

  updateProfile: async (userData: { name: string; email: string }) => {
    const response = await apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify(userData),
    });
    return response.data;
  },

  changePassword: async (passwordData: {
    oldPassword: string;
    newPassword: string;
  }) => {
    const response = await apiFetch("/users/me/password", {
      method: "PATCH",
      body: JSON.stringify(passwordData),
    });
    return response.data;
  },

  logoutAllSessions: async () => {
    const response = await apiFetch("/users/me/logout-all", {
      method: "POST",
    });
    return response.data;
  },

  adminResetPassword: async (userId: string, newPassword: string) => {
    const response = await apiFetch(`/users/${userId}/reset-password`, {
      method: "PATCH",
      body: JSON.stringify({ newPassword }),
    });
    return response.data;
  },
};

export const roleService = {
  list: async (): Promise<
    { name: string; label: string; base: boolean; id?: string }[]
  > => {
    const res = await apiFetch("/roles");
    return res.data || [];
  },
  create: async (
    label: string,
  ): Promise<{ name: string; label: string; base: boolean; id: string }> => {
    const res = await apiFetch("/roles", {
      method: "POST",
      body: JSON.stringify({ label }),
    });
    return res.data;
  },
  remove: async (name: string): Promise<void> => {
    await apiFetch(`/roles/${name}`, { method: "DELETE" });
  },
};

export interface PermissionModule {
  id: string;
  label: string;
  page: string | null;
  actions: { key: string; label: string }[];
}
export interface PermissionCatalog {
  pages: { key: string; label: string }[];
  modules: PermissionModule[];
}

export const permissionService = {
  // Pages and add-on permissions that can be assigned — defined on the server, not here.
  list: async (): Promise<PermissionCatalog> => {
    const res = await apiFetch("/roles/permissions");
    return res.data || { pages: [], modules: [] };
  },
};
