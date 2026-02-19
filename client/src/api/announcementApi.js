import API from "./axios";

/**
 * CREATE ANNOUNCEMENT
 * OWNER, SUPERVISOR
 */
export const createAnnouncement = (payload) => {
  return API.post("/announcements", payload);
};

/**
 * GET ANNOUNCEMENTS (ROLE-AWARE)
 * OWNER, SUPERVISOR, GUARD
 */
export const getAnnouncements = () => {
  return API.get("/announcements");
};
