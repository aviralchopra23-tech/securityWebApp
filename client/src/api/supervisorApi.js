import api from "./axios";

// SUPERVISOR ONLY
// Guards available for the supervisor's assigned location
export const getGuardsForSupervisorLocation = async () => {
  const res = await api.get("/weekly-schedules/available-guards");
  return res.data;
};
