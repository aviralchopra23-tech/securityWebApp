const GuardShiftEntry = require("../models/GuardShiftEntry");
const PayPeriodSubmission = require("../models/PayPeriodSubmission");
const User = require("../models/User");

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

const startOfDay = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = d => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// Returns { start, end } for 1–15 or 16–end-of-month
const resolvePayPeriod = date => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  if (day <= 15) {
    return { start: startOfDay(new Date(year, month, 1)), end: endOfDay(new Date(year, month, 15)) };
  } else {
    return { start: startOfDay(new Date(year, month, 16)), end: endOfDay(new Date(year, month + 1, 0)) };
  }
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
    const submissions = await PayPeriodSubmission.find()
      .populate("userId", "firstName lastName role")
      .populate("paycheckCollectionLocationId", "name");

    const users = await User.find({ role: { $in: ["GUARD", "SUPERVISOR"] } });

    res.json({
      submitted: submissions,
      pendingUsers: users.filter(u =>
  !submissions.some(s =>
    s.userId?._id?.toString() === u._id.toString()
  )
)
    });
  } catch (err) {
    return sendError(res, err);
  }
};