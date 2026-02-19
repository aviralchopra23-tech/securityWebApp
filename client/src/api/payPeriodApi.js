import api from "./axios";

/* ================================
   GUARD / SUPERVISOR
================================ */

// Create a past shift entry
export const createShiftEntry = async (data) => {
  const res = await api.post("/pay-periods/shifts", data);
  return res.data;
};

// Get shifts for a pay period (pass any date inside the period)
export const getShiftsForPayPeriod = async (date) => {
  const res = await api.get("/pay-periods/shifts", {
    params: { date }
  });
  return res.data;
};

// ✅ UPDATE an existing shift entry
export const updateShiftEntry = async (shiftId, data) => {
  const res = await api.put(`/pay-periods/shifts/${shiftId}`, data);
  return res.data;
};

// ✅ DELETE a shift entry
export const deleteShiftEntry = async (shiftId) => {
  const res = await api.delete(`/pay-periods/shifts/${shiftId}`);
  return res.data;
};

// Submit a pay period
export const submitPayPeriod = async (data) => {
  const res = await api.post("/pay-periods/submit", data);
  return res.data;
};

/* ================================
   OWNER
================================ */

// Owner: view submitted & pending pay periods
export const getOwnerPayPeriodReport = async () => {
  const res = await api.get("/pay-periods/reports");
  return res.data;
};
