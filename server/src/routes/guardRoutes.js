// src/routes/guardRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const guardController = require("../controllers/guardController");

const {
  createShiftEntry,
  getShiftsForPayPeriod,
  updateShiftEntry,
  deleteShiftEntry,
  submitPayPeriod,
  getCurrentPayPeriodStatus,

  // optional
  assignGuardToLocation,
  getGuardsForSupervisor,
} = guardController;

const assertFn = (name, fn) => {
  if (typeof fn !== "function") {
    throw new TypeError(`[guardRoutes] ${name} must be a function, got: ${typeof fn}`);
  }
};

assertFn("protect", protect);
assertFn("allowRoles", allowRoles);
assertFn("createShiftEntry", createShiftEntry);
assertFn("getShiftsForPayPeriod", getShiftsForPayPeriod);
assertFn("updateShiftEntry", updateShiftEntry);
assertFn("deleteShiftEntry", deleteShiftEntry);
assertFn("submitPayPeriod", submitPayPeriod);
assertFn("getCurrentPayPeriodStatus", getCurrentPayPeriodStatus);

/* ================= SHIFT ROUTES ================= */

// Create a new shift (GUARD or SUPERVISOR)
router.post("/shifts", protect, allowRoles("GUARD", "SUPERVISOR"), createShiftEntry);

// Get shifts for a pay period (GUARD or SUPERVISOR)
router.get("/shifts", protect, allowRoles("GUARD", "SUPERVISOR"), getShiftsForPayPeriod);

// Update shift (GUARD or SUPERVISOR only — ownership enforced in controller)
router.put("/shifts/:id", protect, allowRoles("GUARD", "SUPERVISOR"), updateShiftEntry);
// legacy
router.put("/payperiod/shifts/:id", protect, allowRoles("GUARD", "SUPERVISOR"), updateShiftEntry);

// Delete shift (GUARD or SUPERVISOR only — ownership enforced in controller)
router.delete("/shifts/:id", protect, allowRoles("GUARD", "SUPERVISOR"), deleteShiftEntry);
// legacy
router.delete("/payperiod/shifts/:id", protect, allowRoles("GUARD", "SUPERVISOR"), deleteShiftEntry);

/* ================= PAY PERIOD ROUTES ================= */

router.post("/submit", protect, allowRoles("GUARD", "SUPERVISOR"), submitPayPeriod);
router.get("/status", protect, allowRoles("GUARD", "SUPERVISOR"), getCurrentPayPeriodStatus);

/* ================= OWNER / SUPERVISOR HELPERS ================= */

if (typeof assignGuardToLocation === "function") {
  router.post("/assign-location", protect, allowRoles("OWNER"), assignGuardToLocation);
} else {
  console.warn("[guardRoutes] assignGuardToLocation not implemented - /assign-location not registered");
}

if (typeof getGuardsForSupervisor === "function") {
  router.get("/my-location", protect, allowRoles("SUPERVISOR"), getGuardsForSupervisor);
} else {
  console.warn("[guardRoutes] getGuardsForSupervisor not implemented - /my-location not registered");
}

module.exports = router;