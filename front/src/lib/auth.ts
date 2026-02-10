import { apiFetch } from "@/lib/api";

const TOKEN_KEY = "vencimentos_token";
const REFRESH_KEY = "vencimentos_refresh_token";
const ROLE_KEY = "vencimentos_role";
const USER_KEY = "vencimentos_user_id";
const USER_EMAIL_KEY = "vencimentos_user_email";
const TENANT_KEY = "vencimentos_tenant_id";

type LoginResponse = {
  data: {
    user: { id: string; email: string; role: string; tenantId: string | null };
    tokens: { accessToken: string; refreshToken: string };
  };
};

export const login = async (email: string, password: string) => {
  const response = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(TOKEN_KEY, response.data.tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, response.data.tokens.refreshToken);
  localStorage.setItem(ROLE_KEY, response.data.user.role);
  localStorage.setItem(USER_KEY, response.data.user.id);
  localStorage.setItem(USER_EMAIL_KEY, response.data.user.email);
  if (response.data.user.tenantId) {
    localStorage.setItem(TENANT_KEY, response.data.user.tenantId);
  } else {
    localStorage.removeItem(TENANT_KEY);
  }
  return response.data.user;
};

type RegisterResponse = {
  data: {
    user: { id: string; email: string; role: string; tenantId: string };
    tenant: { id: string; name: string; status: string };
    tokens: { accessToken: string; refreshToken: string };
  };
};

export const registerTenant = async (payload: {
  name: string;
  email: string;
  password: string;
  companyName: string;
  cnpj?: string;
}) => {
  const response = await apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  localStorage.setItem(TOKEN_KEY, response.data.tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, response.data.tokens.refreshToken);
  localStorage.setItem(ROLE_KEY, response.data.user.role);
  localStorage.setItem(USER_KEY, response.data.user.id);
  localStorage.setItem(USER_EMAIL_KEY, response.data.user.email);
  localStorage.setItem(TENANT_KEY, response.data.user.tenantId);
  return response.data;
};

export const isAuthenticated = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(localStorage.getItem(TOKEN_KEY));
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(TENANT_KEY);
};

export const isAdmin = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(ROLE_KEY) === "SAAS_ADMIN";
};

export const getUserId = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(USER_KEY) || "";
};

export const getUserEmail = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(USER_EMAIL_KEY) || "";
};

export const getRole = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(ROLE_KEY) || "";
};

export const getTenantId = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(TENANT_KEY) || "";
};
