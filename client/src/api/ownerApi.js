import api from "./axios";

// =====================
// LOCATIONS
// =====================

export const getLocations = async () => {
  const res = await api.get("/locations");
  return res.data;
};

export const createLocation = async (data) => {
  const res = await api.post("/locations", data);
  return res.data;
};

// Updated assignSupervisor endpoint
export const assignSupervisor = async (data) => {
  const res = await api.post("/users/assign-supervisor", data);
  return res.data;
};

export const getLocationDetails = async (locationId) => {
  const res = await api.get(`/locations/${locationId}/details`);
  return res.data;
};

export const updateLocation = async (id, data) => {
  const res = await api.put(`/locations/${id}`, data);
  return res.data;
};

export const deleteLocation = async (id) => {
  const res = await api.delete(`/locations/${id}`);
  return res.data;
};

// =====================
// USERS (OWNER ONLY)
// =====================

export const getSupervisors = async () => {
  const res = await api.get("/users/supervisors");
  return res.data;
};

export const getSupervisorById = async (id) => {
  const res = await api.get(`/users/supervisors/${id}`);
  return res.data;
};

export const getGuards = async () => {
  const res = await api.get("/users/guards");
  return res.data;
};

export const getGuardById = async (id) => {
  const res = await api.get(`/users/guards/${id}`);
  return res.data;
};

export const createSupervisor = async (data) => {
  const res = await api.post("/users/supervisors", data);
  return res.data;
};

export const updateUser = async (id, data) => {
  const res = await api.put(`/users/${id}`, data);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

export const createGuard = async (data) => {
  const res = await api.post("/users/guards", data);
  return res.data;
};