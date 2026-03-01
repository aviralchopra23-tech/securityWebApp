// src/routes/payPeriodRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const {
  createShiftEntry,
  getShiftsForPayPeriod,
  submitPayPeriod,
  getCurrentPayPeriodStatus
} = require("../controllers/guardController");

// report endpoint lives in payPeriodController
const { getOwnerPayPeriodReport } = require("../controllers/payPeriodController");

/* ================= PAY PERIOD ROUTES ================= */

/**
 * POST /api/payperiod/shifts
 * Create a new shift (GUARD or SUPERVISOR)
 */
router.post(
  "/shifts",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  createShiftEntry
);

/**
 * GET /api/payperiod/shifts
 * Get shifts for selected pay period
 */
router.get(
  "/shifts",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  getShiftsForPayPeriod
);

/**
 * POST /api/payperiod/submit
 * Submit a pay period
 */
router.post(
  "/submit",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  submitPayPeriod
);

/**
 * GET /api/payperiod/status
 * Get current pay period submission status
 */
router.get(
  "/status",
  protect,
  allowRoles("GUARD", "SUPERVISOR"),
  getCurrentPayPeriodStatus
);

/**
 * GET /api/payperiod/report
 * Owner-only dashboard data.  Response has the form:
 * {
 *   previous: [
 *     { start, end, submissions: [ ... ] },   // closed periods, newest first
 *     ...
 *   ],
 *   current: { start, end, submissions: [...], pending: [...] },
 *   next: { start, end }                      // upcoming period
 * }
 * Dates are serialized as ISO strings; client typically converts them to Date
 * objects.  The endpoint computes the appropriate intervals dynamically, so
 * no cron job is required to flip a period from upcoming → open → closed.
 */
router.get(
  "/report",
  protect,
  allowRoles("OWNER"),
  getOwnerPayPeriodReport
);

module.exports = router;