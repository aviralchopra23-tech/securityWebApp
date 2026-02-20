// src/api/payPeriodApi.js
import api from "./axios";

/* ============================
   Get Shifts for a Pay Period
   GET /api/guards/shifts?date=ISO
   Backend resolves pay period from that date
   and may force previous if pending (Option 1).
============================= */
export const getShiftsForPayPeriod = async ({ date } = {}) => {
  try {
    const queryDate = date ? new Date(date) : new Date();

    const res = await api.get(
      `/guards/shifts?date=${encodeURIComponent(queryDate.toISOString())}`
    );

    return {
      ...res.data,
      payPeriodStart: res.data?.payPeriodStart
        ? new Date(res.data.payPeriodStart)
        : null,
      payPeriodEnd: res.data?.payPeriodEnd ? new Date(res.data.payPeriodEnd) : null,
    };
  } catch (err) {
    console.error("Error fetching shifts:", err);
    throw err.response?.data || err;
  }
};

/* ============================
   Create Shift Entry
   POST /api/guards/shifts
============================= */
export const createShiftEntry = async ({
  locationId,
  startDateTime,
  endDateTime,
}) => {
  try {
    const res = await api.post("/guards/shifts", {
      locationId,
      startDateTime,
      endDateTime,
    });
    return res.data;
  } catch (err) {
    console.error("Error creating shift:", err);
    throw err.response?.data || err;
  }
};

/* ============================
   Update/Delete Shift Entry
   PUT/DELETE /api/guards/shifts/:id
============================= */
export const updateShiftEntry = async (
  shiftId,
  { locationId, startDateTime, endDateTime }
) => {
  try {
    const res = await api.put(`/guards/shifts/${shiftId}`, {
      locationId,
      startDateTime,
      endDateTime,
    });
    return res.data;
  } catch (err) {
    console.error("Error updating shift:", err);
    throw err.response?.data || err;
  }
};

export const deleteShiftEntry = async (shiftId) => {
  try {
    const res = await api.delete(`/guards/shifts/${shiftId}`);
    return res.data;
  } catch (err) {
    console.error("Error deleting shift:", err);
    throw err.response?.data || err;
  }
};

/* ============================
   Submit Pay Period (Option 1)
   Backend decides which pay period to submit.
   POST /api/guards/submit
============================= */
export const submitPayPeriod = async ({ paycheckCollectionLocationId } = {}) => {
  try {
    if (!paycheckCollectionLocationId) {
      throw { message: "paycheckCollectionLocationId is required" };
    }
    const res = await api.post("/guards/submit", { paycheckCollectionLocationId });
    return res.data;
  } catch (err) {
    console.error("Error submitting pay period:", err);
    throw err.response?.data || err;
  }
};

/* ============================
   Get Pay Period Status
   GET /api/guards/status
============================= */
export const getCurrentPayPeriodStatus = async () => {
  try {
    const res = await api.get("/guards/status");

    const normalizePP = (pp) =>
      pp
        ? {
            payPeriodStart: new Date(pp.payPeriodStart),
            payPeriodEnd: new Date(pp.payPeriodEnd),
          }
        : null;

    const normalizedCurrent = normalizePP(res.data?.currentPayPeriod);
    return {
      ...res.data,
      currentPayPeriod: normalizedCurrent,
      activePayPeriod: normalizePP(res.data?.activePayPeriod),
      prevPayPeriod: normalizedCurrent ? getPrevPayPeriod(normalizedCurrent) : null,
    };
  } catch (err) {
    console.error("Error fetching pay period status:", err);
    throw err.response?.data || err;
  }
};

/* ============================
   OWNER helpers (UI only)
   GET /api/payperiod/report
============================= */
export const getOwnerPayPeriodReport = async () => {
  try {
    const res = await api.get("/payperiod/report");
    return res.data;
  } catch (err) {
    console.error("Error fetching owner pay period report:", err);
    throw err.response?.data || err;
  }
};

/* ============================
   Client Fallback: Calculate Pay Period (UI-only)
   Pay periods:
   - 1st–15th
   - 16th–end of month
   Uses local Date object. Backend remains source of truth.
============================= */
// helper used by other UI components, not a backend call
// If you pass a `refDate` it will return the period that contains that date.
// Used for client-side fallbacks and calculations only.
export const calculateCurrentPayPeriod = (refDate = new Date()) => {
  const d = new Date(refDate);

  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const day = d.getDate();

  let payPeriodStart;
  let payPeriodEnd;

  if (day <= 15) {
    payPeriodStart = new Date(year, month, 1, 0, 0, 0, 0);
    payPeriodEnd = new Date(year, month, 15, 23, 59, 59, 999);
  } else {
    payPeriodStart = new Date(year, month, 16, 0, 0, 0, 0);
    payPeriodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  }

  return { payPeriodStart, payPeriodEnd };
};

// given a pay period object returned from backend/hook, calculate the previous
// pay period for UI logic (e.g. when an unsubmitted prior period exists).  We
// just take `current.payPeriodStart` minus one millisecond and re-use the
// existing calculation function to produce the correct half‑month interval.
export const getPrevPayPeriod = (current) => {
  if (!current?.payPeriodStart) return null;
  const before = new Date(current.payPeriodStart).getTime() - 1;
  return calculateCurrentPayPeriod(new Date(before));
};