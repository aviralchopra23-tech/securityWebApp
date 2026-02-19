import api from "./axios";

export const createWeeklySchedule = async (data) => {
  const res = await api.post("/weekly-schedules", data);
  return res.data;
};

export const getActiveSchedule = async () => {
  const res = await api.get("/weekly-schedules/active");
  return res.data;
};
