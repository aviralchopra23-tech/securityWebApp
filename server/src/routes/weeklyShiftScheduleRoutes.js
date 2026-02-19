const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const {
  getAvailableGuardsForSupervisor,
  createShiftSchedule,
  getActiveShiftSchedule
} = require("../controllers/weeklyShiftScheduleController");

// Supervisor: fetch guards for their location
router.get(
  "/available-guards",
  protect,
  allowRoles("SUPERVISOR"),
  getAvailableGuardsForSupervisor
);

// Supervisor: create weekly schedule
router.post(
  "/",
  protect,
  allowRoles("SUPERVISOR"),
  createShiftSchedule
);

// Guard + Supervisor: view active schedule
router.get(
  "/active",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  getActiveShiftSchedule
);

module.exports = router;
