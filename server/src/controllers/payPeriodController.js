const GuardShiftEntry = require("../models/GuardShiftEntry");
const PayPeriodSubmission = require("../models/PayPeriodSubmission");
const User = require("../models/User");

/* ================================
   Pay Period Helpers
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

const resolvePayPeriod = date => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  if (day <= 15) {
    return {
      start: startOfDay(new Date(year, month, 1)),
      end: endOfDay(new Date(year, month, 15))
    };
  }

  return {
    start: startOfDay(new Date(year, month, 16)),
    end: endOfDay(new Date(year, month + 1, 0))
  };
};

const diffHours = (start, end) =>
  (end.getTime() - start.getTime()) / (1000 * 60 * 60);

/* ================================
   GUARD / SUPERVISOR
   Create Shift Entry
================================ */

exports.createShiftEntry = async (req, res) => {
  try {
    const { id, role } = req.user;

    if (!["GUARD", "SUPERVISOR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { locationId, startDateTime, endDateTime } = req.body;

    const start = new Date(startDateTime);
    let end = new Date(endDateTime);

    if (start > new Date()) {
      return res.status(400).json({
        message: "Future shifts cannot be entered"
      });
    }

    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    const { start: ppStart, end: ppEnd } = resolvePayPeriod(start);

    const alreadySubmitted = await PayPeriodSubmission.findOne({
      userId: id,
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd
    });

    if (alreadySubmitted) {
      return res.status(400).json({
        message: "Pay period already submitted. Shifts are locked."
      });
    }

    const entry = await GuardShiftEntry.create({
      userId: id,
      roleAtEntry: role,
      locationId,
      startDateTime: start,
      endDateTime: end,
      payPeriodStart: ppStart,
      payPeriodEnd: ppEnd
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   GUARD / SUPERVISOR
   UPDATE Shift Entry
================================ */

exports.updateShiftEntry = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;
    const { locationId, startDateTime, endDateTime } = req.body;

    if (!["GUARD", "SUPERVISOR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const shift = await GuardShiftEntry.findById(id);
    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    if (shift.userId.toString() !== userId) {
      return res.status(403).json({ message: "Not your shift" });
    }

    if (shift.isLocked) {
      return res.status(400).json({ message: "Shift is locked" });
    }

    const start = new Date(startDateTime);
    let end = new Date(endDateTime);

    if (start > new Date()) {
      return res.status(400).json({ message: "Future shifts not allowed" });
    }

    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    const { start: ppStart, end: ppEnd } = resolvePayPeriod(start);

    if (
      ppStart.getTime() !== shift.payPeriodStart.getTime() ||
      ppEnd.getTime() !== shift.payPeriodEnd.getTime()
    ) {
      return res.status(400).json({
        message: "Cannot move shift to a different pay period"
      });
    }

    shift.locationId = locationId;
    shift.startDateTime = start;
    shift.endDateTime = end;

    await shift.save();
    res.json(shift);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   GUARD / SUPERVISOR
   DELETE Shift Entry
================================ */

exports.deleteShiftEntry = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;

    if (!["GUARD", "SUPERVISOR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const shift = await GuardShiftEntry.findById(id);
    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    if (shift.userId.toString() !== userId) {
      return res.status(403).json({ message: "Not your shift" });
    }

    if (shift.isLocked) {
      return res.status(400).json({ message: "Shift is locked" });
    }

    await shift.deleteOne();
    res.json({ message: "Shift deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   GUARD / SUPERVISOR
   Get Shifts For Pay Period
================================ */

exports.getShiftsForPayPeriod = async (req, res) => {
  try {
    const { id } = req.user;
    const { date } = req.query;

    const { start, end } = resolvePayPeriod(new Date(date));

    const shifts = await GuardShiftEntry.find({
      userId: id,
      payPeriodStart: start,
      payPeriodEnd: end
    }).populate("locationId", "name");

    res.json({ payPeriodStart: start, payPeriodEnd: end, shifts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   GUARD / SUPERVISOR
   Submit Pay Period
================================ */

exports.submitPayPeriod = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { payPeriodStart, payPeriodEnd, paycheckCollectionLocationId } = req.body;

    const shifts = await GuardShiftEntry.find({
      userId: id,
      payPeriodStart,
      payPeriodEnd,
      isLocked: false
    });

    if (!shifts.length) {
      return res.status(400).json({ message: "No shifts to submit" });
    }

    const submittedShifts = [];
    let totalHours = 0;

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
      payPeriodStart,
      payPeriodEnd,
      shifts: submittedShifts,
      totalHours,
      paycheckCollectionLocationId
    });

    await GuardShiftEntry.updateMany(
      { userId: id, payPeriodStart, payPeriodEnd },
      { $set: { isLocked: true } }
    );

    res.json({ message: "Pay period submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================================
   OWNER
   Pay Period Reports
================================ */

exports.getOwnerPayPeriodReport = async (req, res) => {
  try {
    const submissions = await PayPeriodSubmission.find()
      .populate("userId", "firstName lastName role")
      .populate("paycheckCollectionLocationId", "name");

    const users = await User.find({ role: { $in: ["GUARD", "SUPERVISOR"] } });

    res.json({
      submitted: submissions,
      pendingUsers: users.filter(
        u =>
          !submissions.some(s => s.userId._id.toString() === u._id.toString())
      )
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
