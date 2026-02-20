// src/controllers/guardController.js
const mongoose = require("mongoose");
const { DateTime } = require("luxon");

const GuardShiftEntry = require("../models/GuardShiftEntry");
const PayPeriodSubmission = require("../models/PayPeriodSubmission");

const TZ = process.env.BUSINESS_TZ || "America/Toronto";

/* ================= TIME / PAY PERIOD HELPERS ================= */

// Convert a JS Date/ISO into Luxon DateTime in business TZ
const asTZ = (dateLike) =>
  DateTime.fromJSDate(new Date(dateLike), { zone: "utc" }).setZone(TZ);

// Start of day in business TZ, returned as JS Date (UTC instant)
const startOfDayTZ = (dateLike) => asTZ(dateLike).startOf("day").toUTC().toJSDate();

// End of day in business TZ, returned as JS Date (UTC instant)
const endOfDayTZ = (dateLike) => asTZ(dateLike).endOf("day").toUTC().toJSDate();

// Next midnight boundary in business TZ from a JS Date (UTC instant)
const nextMidnightTZ = (dateLike) =>
  asTZ(dateLike).plus({ days: 1 }).startOf("day").toUTC().toJSDate();

const diffHours = (start, end) =>
  (end.getTime() - start.getTime()) / (1000 * 60 * 60);

/**
 * Resolve pay period from a date in BUSINESS TZ:
 * 1–15 → 1st–15th
 * 16–end → 16th–last day
 *
 * Returns JS Dates that represent exact instants in UTC.
 */
const resolvePayPeriod = (dateLike) => {
  const d = asTZ(dateLike); // business tz
  const year = d.year;
  const month = d.month; // 1-12

  if (d.day <= 15) {
    const start = DateTime.fromObject({ year, month, day: 1 }, { zone: TZ })
      .startOf("day")
      .toUTC()
      .toJSDate();

    const end = DateTime.fromObject({ year, month, day: 15 }, { zone: TZ })
      .endOf("day")
      .toUTC()
      .toJSDate();

    return { start, end };
  }

  const start = DateTime.fromObject({ year, month, day: 16 }, { zone: TZ })
    .startOf("day")
    .toUTC()
    .toJSDate();

  const end = DateTime.fromObject({ year, month }, { zone: TZ })
    .endOf("month")
    .endOf("day")
    .toUTC()
    .toJSDate();

  return { start, end };
};

/**
 * Disallow shifts that span across pay periods.
 */
const shiftCrossesPayPeriod = (start, end) => {
  const s = resolvePayPeriod(start);
  const e = resolvePayPeriod(end);
  return (
    s.start.getTime() !== e.start.getTime() ||
    s.end.getTime() !== e.end.getTime()
  );
};

/* ================= OPTION 1 HELPERS ================= */

const isPayPeriodSubmitted = async (userId, ppStart, ppEnd, session) => {
  const q = PayPeriodSubmission.findOne({
    userId,
    payPeriodStart: ppStart,
    payPeriodEnd: ppEnd,
  });
  if (session) q.session(session);
  return !!(await q);
};

// ✅ Pending definition hardened: unsubmitted AND has ANY shifts in that period (locked or unlocked)
const hasAnyShiftsInPeriod = async (userId, ppStart, ppEnd, session) => {
  const q = GuardShiftEntry.countDocuments({
    userId,
    payPeriodStart: ppStart,
    payPeriodEnd: ppEnd,
  });
  if (session) q.session(session);
  const count = await q;
  return count > 0;
};

const isPrevPending = async (userId, prevStart, prevEnd, session) => {
  const submitted = await isPayPeriodSubmitted(userId, prevStart, prevEnd, session);
  if (submitted) return false;
  const hasShifts = await hasAnyShiftsInPeriod(userId, prevStart, prevEnd, session);
  return hasShifts;
};

const getPrevPeriodLockInfo = async (userId, session) => {
  const today = new Date();
  const { start: currentStart } = resolvePayPeriod(today);
  const { start: prevStart, end: prevEnd } = resolvePayPeriod(
    new Date(currentStart.getTime() - 1)
  );

  const prevPending = await isPrevPending(userId, prevStart, prevEnd, session);
  return { prevPending, prevStart, prevEnd };
};

// Enforce business rule when an earlier pay period is still pending.
// The original implementation blocked *all* non-prev‑period shifts when a previous
// pay period had any unsubmitted shifts.  That prevented adding retroactive
// When a previous pay period has not yet been submitted we need to lock
// down the ability to add or modify shifts beyond that interval.  This helper
// is called from create/update/delete endpoints and will return `blocked:true`
// (and send an error response) if the shift's pay period starts after the
// pending period end.  Older periods (including the pending one) remain
// writable so users can continue fixing missing entries.
const enforcePrevPeriodOnlyIfPending = async (res, userId, shiftStartDate, session) => {
  // determine the pay period containing the shift
  const { start: shiftPPStart } = resolvePayPeriod(shiftStartDate);
  // compute the immediately preceding pay period boundaries
  const { start: prevStart, end: prevEnd } = resolvePayPeriod(
    new Date(shiftPPStart.getTime() - 1)
  );

  console.log("enforce check", { userId, shiftStartDate, shiftPPStart, prevStart, prevEnd });
  const prevPending = await isPrevPending(userId, prevStart, prevEnd, session);
  console.log("prevPending?", prevPending);
  if (!prevPending) {
    return { prevPending: false };
  }

  // block if the shift belongs to a later period than the pending one
  if (shiftPPStart.getTime() > prevEnd.getTime()) {
    console.log("blocking new shift: shiftPPStart > prevEnd");
    // status 403 to clearly indicate a forbidden action (pay period lock)
    res.status(403).json({
      message: "Please submit previous pay period before adding shifts for new pay period.",
      pendingPayPeriod: { payPeriodStart: prevStart, payPeriodEnd: prevEnd },
    });
    return { prevPending: true, blocked: true };
  }

  // allowed: shift is within or before the pending period
  return { prevPending: true, blocked: false, prevStart, prevEnd };
};

/* ================= LOCATION SCOPE HELPERS ================= */

const normalizeIdArray = (arr) => (Array.isArray(arr) ? arr.map(String) : []);

const assertLocationAllowedForActor = (req, res, locationId) => {
  const role = req.user?.role;
  const loc = String(locationId);

  const assignedMany = normalizeIdArray(req.user?.assignedLocationIds);
  const assignedSingle = req.user?.assignedLocationId ? String(req.user.assignedLocationId) : null;

  // GUARD: must be in assignedLocationIds
  if (role === "GUARD") {
    if (!assignedMany.includes(loc)) {
      res.status(403).json({ message: "Not assigned to this location" });
      return false;
    }
  }

  // SUPERVISOR: no location restriction; managers may add shifts anywhere.
  // (Guards remain limited to their assigned location(s).)

  return true;
};

/* ================= CREATE SHIFT ================= */

const sendError = (res, err) => {
  console.error(err);
  if (res && typeof res.status === "function" && typeof res.json === "function") {
    return res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Server Error" });
  }
};

const createShiftEntry = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const { id: userId, role } = req.user;
    const { locationId, startDateTime, endDateTime } = req.body;

    if (!["GUARD", "SUPERVISOR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!locationId || !startDateTime || !endDateTime) {
      return res.status(400).json({
        message: "locationId, startDateTime, and endDateTime are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ message: "Invalid locationId" });
    }

    if (!assertLocationAllowedForActor(req, res, locationId)) return;

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (start >= end) {
      return res.status(400).json({ message: "Start time must be before end time" });
    }

    if (shiftCrossesPayPeriod(start, end)) {
      return res.status(400).json({
        message: "Shift cannot cross pay periods. Please split this shift into separate entries.",
      });
    }

    const now = new Date();

    // Supervisor: past only
    if (role === "SUPERVISOR" && end > now) {
      return res.status(400).json({ message: "Supervisors can only add past shifts." });
    }

    // Option 1 enforcement on CREATE (403 for blocked periods)
    const lockCheck = await enforcePrevPeriodOnlyIfPending(res, userId, start);
    if (lockCheck.blocked) return;

    const { start: ppStart, end: ppEnd } = resolvePayPeriod(start);

    const alreadySubmitted = await PayPeriodSubmission.findOne({
      userId,
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd,
    });

    if (alreadySubmitted) {
      return res.status(400).json({ message: "Pay period submitted. Shifts are locked." });
    }

    const entry = await GuardShiftEntry.create({
      userId,
      roleAtEntry: role,
      locationId,
      startDateTime: start,
      endDateTime: end,
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd,
    });

    return res.status(201).json(entry);
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================= GET SHIFTS ================= */

const getShiftsForPayPeriod = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const { id: userId } = req.user;

    const { start, end, date } = req.query;

    let ppStart;
    let ppEnd;

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid start/end query params" });
      }

      // Normalize to business TZ day boundaries
      ppStart = startOfDayTZ(startDate);
      ppEnd = endOfDayTZ(endDate);

      // Optional stricter validation: ensure query matches a real pay period
      const resolved = resolvePayPeriod(startDate);
      const matches =
        resolved.start.getTime() === ppStart.getTime() &&
        resolved.end.getTime() === ppEnd.getTime();
      if (!matches) {
        return res.status(400).json({
          message: "start/end must match an exact pay period boundary (1–15 or 16–end).",
        });
      }
    } else {
      const ref = date ? new Date(date) : new Date();
      if (isNaN(ref.getTime())) {
        return res.status(400).json({ message: "Invalid date query param" });
      }
      const resolved = resolvePayPeriod(ref);
      ppStart = resolved.start;
      ppEnd = resolved.end;
    }

    // Option 1: force previous if pending
    const { prevPending, prevStart, prevEnd } = await getPrevPeriodLockInfo(userId);
    if (prevPending) {
      ppStart = prevStart;
      ppEnd = prevEnd;
    }

    const shifts = await GuardShiftEntry.find({
      userId,
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd,
    }).populate("locationId", "name");

    return res.json({
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd,
      shifts,
      forcedToPrevious: !!prevPending,
    });
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================= UPDATE SHIFT ================= */

const updateShiftEntry = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const { id: requesterId, role } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid shift id" });
    }

    const shift = await GuardShiftEntry.findById(id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    if (shift.isLocked) {
      return res.status(400).json({ message: "Shift is locked and cannot be edited." });
    }

    // ownership check (GUARD/SUPERVISOR can only edit own)
    if (shift.userId.toString() !== requesterId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { locationId, startDateTime, endDateTime } = req.body;

    // compute proposed values first
    const proposedLocationId = locationId !== undefined ? locationId : shift.locationId;
    const proposedStart = startDateTime !== undefined ? new Date(startDateTime) : new Date(shift.startDateTime);
    const proposedEnd = endDateTime !== undefined ? new Date(endDateTime) : new Date(shift.endDateTime);

    if (locationId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(400).json({ message: "Invalid locationId" });
      }
      if (!assertLocationAllowedForActor(req, res, locationId)) return;
    }

    if (isNaN(proposedStart.getTime())) return res.status(400).json({ message: "Invalid startDateTime" });
    if (isNaN(proposedEnd.getTime())) return res.status(400).json({ message: "Invalid endDateTime" });

    if (proposedStart >= proposedEnd) {
      return res.status(400).json({ message: "Start time must be before end time" });
    }

    if (shiftCrossesPayPeriod(proposedStart, proposedEnd)) {
      return res.status(400).json({
        message: "Shift cannot cross pay periods. Please split this shift into separate entries.",
      });
    }

    const now = new Date();
    if (role === "SUPERVISOR" && proposedEnd > now) {
      return res.status(400).json({ message: "Supervisors can only add/edit past shifts." });
    }

    // Option 1 enforcement based on proposedStart (prevents bypass by moving start into current)
    const lockCheck = await enforcePrevPeriodOnlyIfPending(res, shift.userId, proposedStart);
    if (lockCheck.blocked) return;

    const { start: ppStart, end: ppEnd } = resolvePayPeriod(proposedStart);

    const submitted = await PayPeriodSubmission.findOne({
      userId: shift.userId,
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd,
    });
    if (submitted) {
      return res.status(400).json({ message: "Pay period submitted. Shifts are locked." });
    }

    // commit changes
    shift.locationId = proposedLocationId;
    shift.startDateTime = proposedStart;
    shift.endDateTime = proposedEnd;
    shift.payPeriodStart = ppStart;
    shift.payPeriodEnd = ppEnd;

    const saved = await shift.save();
    return res.json(saved);
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================= DELETE SHIFT ================= */

const deleteShiftEntry = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const { id: requesterId } = req.user;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid shift id" });
    }

    const shift = await GuardShiftEntry.findById(id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    if (shift.isLocked) {
      return res.status(400).json({ message: "Shift is locked and cannot be deleted." });
    }

    if (shift.userId.toString() !== requesterId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Option 1 enforcement
    const lockCheck = await enforcePrevPeriodOnlyIfPending(res, shift.userId, shift.startDateTime);
    if (lockCheck.blocked) return;

    const submitted = await PayPeriodSubmission.findOne({
      userId: shift.userId,
      payPeriodStart: shift.payPeriodStart,
      payPeriodEnd: shift.payPeriodEnd,
    });
    if (submitted) {
      return res.status(400).json({ message: "Pay period submitted. Shifts are locked." });
    }

    await shift.deleteOne();
    return res.json({ message: "Shift deleted successfully" });
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================= SUBMIT PAY PERIOD ================= */

const submitPayPeriod = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const { id: userId, role } = req.user;
    const { paycheckCollectionLocationId } = req.body;

    if (!paycheckCollectionLocationId) {
      return res.status(400).json({ message: "paycheckCollectionLocationId required" });
    }
    if (!mongoose.Types.ObjectId.isValid(paycheckCollectionLocationId)) {
      return res.status(400).json({ message: "Invalid paycheckCollectionLocationId" });
    }

    await session.withTransaction(async () => {
      const today = new Date();
      const { start: currentStart, end: currentEnd } = resolvePayPeriod(today);
      const { start: prevStart, end: prevEnd } = resolvePayPeriod(
        new Date(currentStart.getTime() - 1)
      );

      const prevPending = await isPrevPending(userId, prevStart, prevEnd, session);
      const ppStart = prevPending ? prevStart : currentStart;
      const ppEnd = prevPending ? prevEnd : currentEnd;

      const alreadySubmitted = await isPayPeriodSubmitted(userId, ppStart, ppEnd, session);
      if (alreadySubmitted) {
        res.status(400).json({ message: "Pay period already submitted." });
        return;
      }

      const shifts = await GuardShiftEntry.find({
        userId,
        payPeriodStart: ppStart,
        payPeriodEnd: ppEnd,
        isLocked: false,
      }).session(session);

      if (!shifts.length) {
        res.status(400).json({ message: "No shifts to submit" });
        return;
      }

      const periodStart = new Date(ppStart);
      const periodEnd = new Date(ppEnd);

      let totalHours = 0;
      const submittedShifts = [];
      const usedShiftIds = [];

      for (const shift of shifts) {
        usedShiftIds.push(shift._id);

        const start = new Date(shift.startDateTime);
        const end = new Date(shift.endDateTime);

        // strict integrity: must fall within period boundaries
        if (start < periodStart || end > periodEnd) {
          throw new Error(
            "One or more shifts fall outside the pay period. Please split/correct shifts before submitting."
          );
        }

        let curStart = start;
        const finalEnd = end;

        // ✅ Correct midnight-based segmentation in business TZ
        while (curStart < finalEnd) {
          const boundary = nextMidnightTZ(curStart); // next day 00:00 in Toronto (as UTC instant)
          const segEnd = new Date(
            Math.min(finalEnd.getTime(), boundary.getTime(), periodEnd.getTime())
          );

          if (segEnd <= curStart) break;

          const hours = diffHours(curStart, segEnd);
          totalHours += hours;

          submittedShifts.push({
            date: startOfDayTZ(curStart),
            locationId: shift.locationId,
            startTime: curStart,
            endTime: segEnd,
            hoursWorked: hours,
          });

          curStart = segEnd;
        }
      }

      await PayPeriodSubmission.create(
        [
          {
            userId,
            roleAtSubmission: role,
            payPeriodStart: ppStart,
            payPeriodEnd: ppEnd,
            shifts: submittedShifts,
            totalHours,
            paycheckCollectionLocationId,
          },
        ],
        { session }
      );

      // lock exactly the shifts included (safer than period-wide lock if data ever drifts)
      await GuardShiftEntry.updateMany(
        { _id: { $in: usedShiftIds } },
        { $set: { isLocked: true } },
        { session }
      );

      res.json({
        message: "Pay period submitted successfully",
        submittedPayPeriod: { payPeriodStart: ppStart, payPeriodEnd: ppEnd },
      });
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Pay period already submitted." });
    }
    return sendError(res, err);
  } finally {
    session.endSession();
  }
};

/* ================= STATUS ================= */

const getCurrentPayPeriodStatus = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const { id: userId } = req.user;
    const today = new Date();

    const { start: currentStart, end: currentEnd } = resolvePayPeriod(today);
    const { start: prevStart, end: prevEnd } = resolvePayPeriod(
      new Date(currentStart.getTime() - 1)
    );

    const prevPending = await isPrevPending(userId, prevStart, prevEnd);
    const currentSubmitted = await isPayPeriodSubmitted(userId, currentStart, currentEnd);

    // determine which pay period should drive the UI
    let activeStart, activeEnd;
    let activeIsPrevious = false;

    if (prevPending) {
      // still fixing previous interval
      activeStart = prevStart;
      activeEnd = prevEnd;
      activeIsPrevious = true;
    } else if (currentSubmitted) {
      // current period just submitted – advance to next period immediately
      const { start: nextStart, end: nextEnd } = resolvePayPeriod(
        new Date(currentEnd.getTime() + 1)
      );
      activeStart = nextStart;
      activeEnd = nextEnd;
      activeIsPrevious = false;
    } else {
      // normal case: show current period
      activeStart = currentStart;
      activeEnd = currentEnd;
      activeIsPrevious = false;
    }

    return res.json({
      prevUnsubmitted: !!prevPending,
      currentSubmitted: !!currentSubmitted,

      currentPayPeriod: { payPeriodStart: currentStart, payPeriodEnd: currentEnd },

      activePayPeriod: { payPeriodStart: activeStart, payPeriodEnd: activeEnd },
      activeIsPrevious,
    });
  } catch (err) {
    return sendError(res, err);
  }
};

module.exports = {
  resolvePayPeriod,
  createShiftEntry,
  getShiftsForPayPeriod,
  updateShiftEntry,
  deleteShiftEntry,
  submitPayPeriod,
  getCurrentPayPeriodStatus,
};

 