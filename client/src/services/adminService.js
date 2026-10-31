import api from "./api.js";

function getData(response, expectedKey) {
  const result = response.data;
  if (result?.success !== true || (expectedKey && !result.data?.[expectedKey])) {
    throw new Error(result?.message || "The server returned an unexpected response.");
  }
  return result.data;
}

export async function fetchAdminDashboard(signal) {
  return getData(await api.get("/admin/dashboard", { signal }), "stats");
}

export async function fetchAdminCollection(resource, params, signal) {
  const response = await api.get(`/admin/${resource}`, { params, signal });
  const data = getData(response, resource);
  if (!Array.isArray(data[resource]) || !data.pagination) {
    throw new Error("The server returned an unexpected list response.");
  }
  return data;
}

export async function updateAdminUserStatus(id, isActive) {
  return getData(
    await api.patch(`/admin/users/${id}/status`, { isActive }),
    "user",
  );
}

export async function deleteAdminProject(id) {
  const response = await api.delete(`/admin/projects/${id}`);
  if (response.data?.success !== true) {
    throw new Error(response.data?.message || "The project could not be removed.");
  }
}
