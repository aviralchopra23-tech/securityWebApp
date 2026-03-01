const express = require("express");
const router = express.Router();

const {
  createAnnouncement,
  getAnnouncementsForUser,
  getUnreadAnnouncementCount,
  markAnnouncementsRead,
} = require("../controllers/announcementController");

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

/**
 * CREATE ANNOUNCEMENT
 * OWNER, SUPERVISOR
 */
router.post(
  "/",
  protect,
  allowRoles("OWNER", "SUPERVISOR"),
  createAnnouncement
);

/**
 * GET ANNOUNCEMENTS
 * OWNER, SUPERVISOR, GUARD
 */
router.get(
  "/unread-count",
  protect,
  allowRoles("OWNER", "SUPERVISOR", "GUARD"),
  getUnreadAnnouncementCount
);

router.post(
  "/mark-read",
  protect,
  allowRoles("OWNER", "SUPERVISOR", "GUARD"),
  markAnnouncementsRead
);

router.get(
  "/",
  protect,
  allowRoles("OWNER", "SUPERVISOR", "GUARD"),
  getAnnouncementsForUser
);

module.exports = router;
