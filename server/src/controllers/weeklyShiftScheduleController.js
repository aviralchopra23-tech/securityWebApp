const WeeklyShiftSchedule = require("../models/WeeklyShiftSchedule");
const User = require("../models/User");

const DAY_INDEX = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
  SAT: 5,
  SUN: 6
};

const toDateTime = (baseDate, dayKey, time) => {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(baseDate);
  date.setDate(date.getDate() + DAY_INDEX[dayKey]);
  date.setHours(h, m, 0, 0);
  return date;
};

const hasGuardOverlap = (shifts, baseDate) => {
  const byGuard = {};

  // Group shifts by guard
  for (const s of shifts) {
    if (!byGuard[s.userId]) {
      byGuard[s.userId] = [];
    }

    let start = toDateTime(baseDate, s.day, s.startTime);
    let end = toDateTime(baseDate, s.day, s.endTime);

    // Overnight shift
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    byGuard[s.userId].push({ start, end });
  }

  // Check overlaps per guard
  for (const guardId of Object.keys(byGuard)) {
    const ranges = byGuard[guardId].sort(
      (a, b) => a.start - b.start
    );

    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].start < ranges[i - 1].end) {
        return true;
      }
    }
  }

  return false;
};

/**
 * SUPERVISOR creates full weekly schedule
 */
exports.createShiftSchedule = async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role !== "SUPERVISOR") {
      return res.status(403).json({ message: "Access denied" });
    }

    let { validFrom, validTill, shifts } = req.body;

    // Normalize dates
    validFrom = new Date(validFrom);
    validFrom.setHours(0, 0, 0, 0);

    validTill = new Date(validTill);
    validTill.setHours(23, 59, 59, 999);

    const supervisor = await User.findById(id);

    const locationId = supervisor.assignedLocationId;
    if (!locationId) {
      return res.status(400).json({
        message: "Supervisor has no assigned location"
      });
    }

    // 🔴 Guard double-booking validation
    if (hasGuardOverlap(shifts, validFrom)) {
      return res.status(400).json({
        message: "Guard double-booking detected. A guard cannot work overlapping shifts."
      });
    }


    const schedule = await WeeklyShiftSchedule.create({
      locationId,
      validFrom,
      validTill,
      shifts,
      createdBy: supervisor._id
    });

    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * SUPERVISOR fetches guards for their location
 */
exports.getAvailableGuardsForSupervisor = async (req, res) => {
  try {
    if (req.user.role !== "SUPERVISOR") {
      return res.status(403).json({ message: "Access denied" });
    }

    const supervisor = await User.findById(req.user.id);
    const locationId = supervisor.assignedLocationId;

    if (!locationId) {
      return res.status(400).json({ message: "Supervisor has no location assigned" });
    }

    const guards = await User.find({
      assignedLocationIds: locationId,
      role: "GUARD"
    }).select("_id firstName lastName role");

    // Supervisor is also schedulable
    const supervisorSelf = {
      _id: supervisor._id,
      firstName: supervisor.firstName,
      lastName: supervisor.lastName,
      role: "SUPERVISOR"
    };

    res.json([...guards, supervisorSelf]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GUARD + SUPERVISOR view active schedule
 */
exports.getActiveShiftSchedule = async (req, res) => {
  try {
    const { id, role } = req.user;

    let locationId;

    if (role === "SUPERVISOR") {
      const supervisor = await User.findById(id);
      locationId = supervisor.assignedLocationId;
    } else {
      const guard = await User.findById(id);
      locationId = guard.assignedLocationIds?.[0];
    }

    if (!locationId) {
      return res.status(400).json({ message: "No location assigned" });
    }

    const today = new Date();

    // 1️⃣ Try to find ACTIVE schedule
    let schedule = await WeeklyShiftSchedule.findOne({
      locationId,
      validFrom: { $lte: today },
      validTill: { $gte: today }
    }).populate("shifts.userId", "firstName lastName role");

    // 2️⃣ If none, find NEXT upcoming schedule
    if (!schedule) {
      schedule = await WeeklyShiftSchedule.findOne({
        locationId,
        validFrom: { $gt: today }
      })
        .sort({ validFrom: 1 }) // earliest future schedule
        .populate("shifts.userId", "firstName lastName role");
    }

    res.json(schedule); // may still be null
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch schedule" });
  }
};
