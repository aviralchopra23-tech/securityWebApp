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

/**
 * GET UNREAD ANNOUNCEMENT COUNT
 * OWNER, SUPERVISOR, GUARD
 */
export const getUnreadAnnouncementCount = () => {
  return API.get("/announcements/unread-count");
};

/**
 * MARK VISIBLE ANNOUNCEMENTS AS READ
 * OWNER, SUPERVISOR, GUARD
 */
export const markAnnouncementsRead = () => {
  return API.post("/announcements/mark-read");
};
