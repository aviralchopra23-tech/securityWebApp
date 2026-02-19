const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const {
  createShiftEntry,
  getShiftsForPayPeriod,
  submitPayPeriod,
  getOwnerPayPeriodReport,
  updateShiftEntry,
  deleteShiftEntry
} = require("../controllers/payPeriodController");

/* ================================
   GUARD + SUPERVISOR
================================ */

// Create a past shift entry
router.post(
  "/shifts",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  createShiftEntry
);

// Get shifts for a specific pay period
router.get(
  "/shifts",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  getShiftsForPayPeriod
);

// ✅ UPDATE shift
router.put(
  "/shifts/:id",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  updateShiftEntry
);

// ✅ DELETE shift
router.delete(
  "/shifts/:id",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  deleteShiftEntry
);

// Submit a pay period (locks shifts)
router.post(
  "/submit",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  submitPayPeriod
);

/* ================================
   OWNER
================================ */

router.get(
  "/reports",
  protect,
  allowRoles("OWNER"),
  getOwnerPayPeriodReport
);

module.exports = router;
