const express = require("express");
const router = express.Router();

const {
  createAnnouncement,
  getAnnouncementsForUser,
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
  "/",
  protect,
  allowRoles("OWNER", "SUPERVISOR", "GUARD"),
  getAnnouncementsForUser
);

module.exports = router;
