import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

// ===== TENANTS =====

export const fetchMetrics = () =>
  axios.get(`${API_URL}/super-admin/metrics`, authHeaders()).then(r => r.data);

export const fetchTenants = (params) =>
  axios.get(`${API_URL}/super-admin/tenants`, { ...authHeaders(), params }).then(r => r.data);

export const fetchTenantDetails = (id) =>
  axios.get(`${API_URL}/super-admin/tenants/${id}`, authHeaders()).then(r => r.data);

export const createTenant = (data) =>
  axios.post(`${API_URL}/super-admin/tenants`, data, authHeaders()).then(r => r.data);

export const updateTenant = (id, data) =>
  axios.put(`${API_URL}/super-admin/tenants/${id}`, data, authHeaders()).then(r => r.data);

export const toggleTenantStatus = (id) =>
  axios.patch(`${API_URL}/super-admin/tenants/${id}/toggle-status`, {}, authHeaders()).then(r => r.data);

export const fetchTenantModules = (id) =>
  axios.get(`${API_URL}/super-admin/tenants/${id}/modules`, authHeaders()).then(r => r.data);

export const fetchTenantUsers = (id) =>
  axios.get(`${API_URL}/super-admin/tenants/${id}/users`, authHeaders()).then(r => r.data);

export const impersonateTenant = (id) =>
  axios.post(`${API_URL}/super-admin/tenants/${id}/impersonate`, {}, authHeaders()).then(r => r.data);

// ===== PLANOS =====

export const fetchPlans = () =>
  axios.get(`${API_URL}/super-admin/plans`, authHeaders()).then(r => {
    const data = r.data;
    return Array.isArray(data) ? data : data.plans || data.data || [];
  });

export const createPlan = (data) =>
  axios.post(`${API_URL}/super-admin/plans`, data, authHeaders()).then(r => r.data);

export const updatePlanApi = (id, data) =>
  axios.put(`${API_URL}/super-admin/plans/${id}`, data, authHeaders()).then(r => r.data);

// ===== ASSINATURAS =====

export const fetchSubscriptions = (params) =>
  axios.get(`${API_URL}/super-admin/subscriptions`, { ...authHeaders(), params }).then(r => {
    const data = r.data;
    return Array.isArray(data) ? data : data.subscriptions || data.data || [];
  });

export const changePlan = (tenantId, data) =>
  axios.put(`${API_URL}/super-admin/subscriptions/${tenantId}/change-plan`, data, authHeaders()).then(r => r.data);
