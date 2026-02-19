const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const {
  createSchedule,
  getMyScheduleGuard,
  getMyScheduleSupervisor
} = require("../controllers/scheduleController");

// CREATE schedule (Supervisor only)
router.post("/", protect, allowRoles("SUPERVISOR"), createSchedule);

// VIEW schedules
router.get(
  "/my",
  protect,
  allowRoles("GUARD"),
  getMyScheduleGuard
);

router.get(
  "/location",
  protect,
  allowRoles("SUPERVISOR"),
  getMyScheduleSupervisor
);

module.exports = router;
