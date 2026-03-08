// models used throughout this controller
//
// design notes:
// * pay periods are implicitly defined as first‑half (1–15) or second‑half
//   (16–end) of each month.  rather than storing a separate "active" flag, we
//   resolve the appropriate interval on every request using `resolvePayPeriod()`
//   which simply branches on the day-of-month.  this keeps the system
//   stateless: on the 1st/16th the current window automatically rolls forward.
// * submissions are stored in `PayPeriodSubmission` with a compound unique
//   index (userId, payPeriodStart, payPeriodEnd) so there is exactly one record
//   per user/period.  the owner dashboard reconstructs status by querying this
//   collection.
// * a lightweight `PayPeriod` model exists for cases where metadata is needed
//   or when you want to pre‑seed upcoming periods; it is **not required** for
//   the core open/close logic.
// * scheduled jobs (cron) are only necessary for ancillary tasks such as
//   reminders, archiving, or seeding the PayPeriod collection; they are NOT
//   needed to move a pay period from upcoming→open→closed.

const GuardShiftEntry = require("../models/GuardShiftEntry");
const PayPeriodSubmission = require("../models/PayPeriodSubmission");
const PayPeriod = require("../models/PayPeriod");
const User = require("../models/User");
const { DateTime } = require("luxon");

const TZ = process.env.BUSINESS_TZ || "America/Toronto";

// helper to safely send an error response when `next` may not be available
const sendError = (res, err) => {
  console.error(err);
  if (res && typeof res.status === "function" && typeof res.json === "function") {
    return res.status(err.statusCode || 500).json({ message: err.message || "Server Error" });
  }
};

/* ================================
   Helper Functions
================================ */

const asTZ = (dateLike) =>
  DateTime.fromJSDate(new Date(dateLike), { zone: "utc" }).setZone(TZ);

const startOfDay = (dateLike) => asTZ(dateLike).startOf("day").toUTC().toJSDate();

const endOfDay = (dateLike) => asTZ(dateLike).endOf("day").toUTC().toJSDate();

// Returns { start, end } for 1–15 or 16–end-of-month
const resolvePayPeriod = (dateLike) => {
  const d = asTZ(dateLike);
  const year = d.year;
  const month = d.month;

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

const diffHours = (start, end) => (end.getTime() - start.getTime()) / (1000 * 60 * 60);

/* ================================
   Create Shift Entry
================================ */
exports.createShiftEntry = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    if (!["GUARD", "SUPERVISOR"].includes(role))
      return res.status(403).json({ message: "Access denied" });

    const { locationId, startDateTime, endDateTime } = req.body;
    const start = new Date(startDateTime);
    let end = new Date(endDateTime);
    if (end <= start) end.setDate(end.getDate() + 1);

    const { start: ppStart, end: ppEnd } = resolvePayPeriod(start);

    const prevDate = new Date(ppStart);
    prevDate.setDate(prevDate.getDate() - 1);
    const { start: prevStart, end: prevEnd } = resolvePayPeriod(prevDate);

    const prevSubmitted = await PayPeriodSubmission.findOne({ userId: id, payPeriodStart: prevStart, payPeriodEnd: prevEnd });
    if (!prevSubmitted && prevStart < ppStart)
      return res.status(400).json({ message: "Submit previous pay period before adding new shifts." });

    const currentSubmitted = await PayPeriodSubmission.findOne({ userId: id, payPeriodStart: ppStart, payPeriodEnd: ppEnd });
    if (currentSubmitted) return res.status(400).json({ message: "Shifts for this pay period are locked." });

    const entry = await GuardShiftEntry.create({
      userId: id,
      roleAtEntry: role,
      locationId,
      startDateTime: start,
      endDateTime: end,
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd,
      isLocked: false
    });

    res.status(201).json(entry);
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================================
   Update Shift Entry
================================ */
exports.updateShiftEntry = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;
    const { locationId, startDateTime, endDateTime } = req.body;

    if (!["GUARD", "SUPERVISOR"].includes(role)) return res.status(403).json({ message: "Access denied" });

    const shift = await GuardShiftEntry.findById(id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (shift.userId.toString() !== userId) return res.status(403).json({ message: "Not your shift" });
    if (shift.isLocked) return res.status(400).json({ message: "Shift is locked" });

    const start = new Date(startDateTime);
    let end = new Date(endDateTime);
    if (end <= start) end.setDate(end.getDate() + 1);

    const { start: ppStart, end: ppEnd } = resolvePayPeriod(start);
    if (ppStart.getTime() !== shift.payPeriodStart.getTime() || ppEnd.getTime() !== shift.payPeriodEnd.getTime())
      return res.status(400).json({ message: "Cannot move shift to a different pay period" });

    shift.locationId = locationId;
    shift.startDateTime = start;
    shift.endDateTime = end;
    await shift.save();

    res.json(shift);
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================================
   Delete Shift Entry
================================ */
exports.deleteShiftEntry = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;

    if (!["GUARD", "SUPERVISOR"].includes(role)) return res.status(403).json({ message: "Access denied" });

    const shift = await GuardShiftEntry.findById(id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (shift.userId.toString() !== userId) return res.status(403).json({ message: "Not your shift" });
    if (shift.isLocked) return res.status(400).json({ message: "Shift is locked" });

    await shift.deleteOne();
    res.json({ message: "Shift deleted" });
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================================
   Get Shifts For Pay Period
================================ */
exports.getShiftsForPayPeriod = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { date } = req.query;

    const { start, end } = resolvePayPeriod(date);
    const shifts = await GuardShiftEntry.find({ userId: id, payPeriodStart: start, payPeriodEnd: end })
      .populate("locationId", "name");

    const submitted = await PayPeriodSubmission.findOne({ userId: id, payPeriodStart: start, payPeriodEnd: end });

    res.json({ payPeriodStart: start, payPeriodEnd: end, shifts, submitted: !!submitted });
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================================
   Submit Pay Period
================================ */
exports.submitPayPeriod = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { paycheckCollectionLocationId, payPeriodStart, payPeriodEnd } = req.body;

    const ppStart = payPeriodStart ? new Date(payPeriodStart) : resolvePayPeriod(new Date()).start;
    const ppEnd = payPeriodEnd ? new Date(payPeriodEnd) : resolvePayPeriod(new Date()).end;

    const prevDate = new Date(ppStart);
    prevDate.setDate(prevDate.getDate() - 1);
    const { start: prevStart, end: prevEnd } = resolvePayPeriod(prevDate);
    const prevSubmitted = await PayPeriodSubmission.findOne({ userId: id, payPeriodStart: prevStart, payPeriodEnd: prevEnd });
    if (!prevSubmitted && prevStart < ppStart)
      return res.status(400).json({ message: "Submit previous pay period first." });

    const shifts = await GuardShiftEntry.find({ userId: id, payPeriodStart: ppStart, payPeriodEnd: ppEnd, isLocked: false });
    if (!shifts.length) return res.status(400).json({ message: "No shifts to submit" });

    let totalHours = 0;
    const submittedShifts = [];

    shifts.forEach(shift => {
      let curStart = new Date(shift.startDateTime);
      const finalEnd = new Date(shift.endDateTime);

      while (curStart < finalEnd) {
        const dayEnd = endOfDay(curStart);
        const segEnd = finalEnd < dayEnd ? finalEnd : dayEnd;
        const hours = diffHours(curStart, segEnd);
        totalHours += hours;

        submittedShifts.push({
          date: startOfDay(curStart),
          locationId: shift.locationId,
          startTime: curStart.toTimeString().slice(0, 5),
          endTime: segEnd.toTimeString().slice(0, 5),
          hoursWorked: hours
        });

        curStart = new Date(segEnd.getTime() + 1000);
      }
    });

    await PayPeriodSubmission.create({
      userId: id,
      roleAtSubmission: role,
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd,
      shifts: submittedShifts,
      totalHours,
      paycheckCollectionLocationId
    });

    await GuardShiftEntry.updateMany({ userId: id, payPeriodStart: ppStart, payPeriodEnd: ppEnd }, { $set: { isLocked: true } });

    res.json({ message: "Pay period submitted successfully" });
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================================
   Current Pay Period Status
================================ */
exports.getCurrentPayPeriodStatus = async (req, res, next) => {
  try {
    const { id } = req.user;
    const today = new Date();
    const { start: currentStart, end: currentEnd } = resolvePayPeriod(today);

    const prevDate = new Date(currentStart);
    prevDate.setDate(prevDate.getDate() - 1);
    const { start: prevStart, end: prevEnd } = resolvePayPeriod(prevDate);

    const prevSubmitted = await PayPeriodSubmission.findOne({ userId: id, payPeriodStart: prevStart, payPeriodEnd: prevEnd });
    const currentSubmitted = await PayPeriodSubmission.findOne({ userId: id, payPeriodStart: currentStart, payPeriodEnd: currentEnd });
    const prevPending = prevStart < currentStart && !prevSubmitted;

    res.json({
      prevUnsubmitted: prevPending,
      currentSubmitted: !!currentSubmitted,
      currentPayPeriod: { start: currentStart, end: currentEnd }
    });
  } catch (err) {
    return sendError(res, err);
  }
};

/* ================================
   Owner Pay Period Report
================================ */
exports.getOwnerPayPeriodReport = async (req, res, next) => {
  try {
    // compute live + latest-closed period boundaries dynamically
    const today = new Date();
    const { start: liveStart, end: liveEnd } = resolvePayPeriod(today);

    // latest closed period is always the one immediately before the live period
    const prevDate = new Date(liveStart);
    prevDate.setDate(prevDate.getDate() - 1);
    const { start: reviewStart, end: reviewEnd } = resolvePayPeriod(prevDate);

    const nextDate = new Date(liveEnd);
    nextDate.setDate(nextDate.getDate() + 1);
    const { start: nextStart, end: nextEnd } = resolvePayPeriod(nextDate);

    const users = await User.find({ role: { $in: ["GUARD", "SUPERVISOR"] } });

    // fetch submissions for latest closed period (owner review period)
    const reviewSubs = await PayPeriodSubmission.find({
      payPeriodStart: reviewStart,
      payPeriodEnd: reviewEnd,
    })
        .populate("userId", "firstName lastName role assignedLocationId assignedLocationIds")
        .populate("shifts.locationId", "name")
        .populate("paycheckCollectionLocationId", "name");

    // build map of latest-closed submissions for quick lookup (skip deleted users)
    const submittedReviewIds = new Set(
      reviewSubs
        .map((s) => (s.userId ? s.userId._id.toString() : null))
        .filter(Boolean)
    );

    const pendingReview = users.filter((u) => !submittedReviewIds.has(u._id.toString()));

    // assemble older closed-period history (exclude latest closed review period)
    const previous = [];

    // Prefer explicit PayPeriod collection only when it actually has rows.
    const closedPeriods = await PayPeriod.find({ start: { $lt: reviewStart } }).sort({ start: -1 });

    if (closedPeriods.length > 0) {
      for (const p of closedPeriods) {
        const subs = await PayPeriodSubmission.find({
          payPeriodStart: p.start,
          payPeriodEnd: p.end,
        })
          .populate("userId", "firstName lastName role assignedLocationId assignedLocationIds")
          .populate("shifts.locationId", "name")
          .populate("paycheckCollectionLocationId", "name");
        previous.push({ start: p.start, end: p.end, submissions: subs });
      }
    } else {
      // fallback: derive from submission history when PayPeriod collection is empty
      const olderSubs = await PayPeriodSubmission.find({ payPeriodEnd: { $lt: reviewStart } })
        .populate("userId", "firstName lastName role assignedLocationId assignedLocationIds")
        .populate("shifts.locationId", "name")
        .populate("paycheckCollectionLocationId", "name")
        .sort({ payPeriodStart: -1 });

      const periodMap = new Map();
      olderSubs.forEach((s) => {
        const key = s.payPeriodStart.toISOString() + "_" + s.payPeriodEnd.toISOString();
        if (!periodMap.has(key)) {
          periodMap.set(key, { start: s.payPeriodStart, end: s.payPeriodEnd, submissions: [] });
        }
        periodMap.get(key).submissions.push(s);
      });
      periodMap.forEach((v) => previous.push(v));
    }

    res.json({
      previous,
      current: {
        start: reviewStart,
        end: reviewEnd,
        submissions: reviewSubs,
        pending: pendingReview,
      },
      // next section in UI continues to show the following period for planning
      next: { start: nextStart, end: nextEnd },
      live: { start: liveStart, end: liveEnd },
    });
  } catch (err) {
    return sendError(res, err);
  }
};