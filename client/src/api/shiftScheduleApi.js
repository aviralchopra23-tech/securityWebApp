import API from "./axios";

/* Supervisor creates schedule */
export const createShiftSchedule = async (payload) => {
  const res = await API.post("/weekly-schedules", payload);
  return res.data;
};

// Guard + Supervisor: get active weekly schedule
export const getActiveShiftSchedule = async () => {
  const res = await API.get("/weekly-schedules/active"); // ✅ FIXED
  return res.data;
};
