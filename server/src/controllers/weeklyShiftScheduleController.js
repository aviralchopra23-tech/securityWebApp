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

    // Normalize input dates to local midnight boundaries
    validFrom = new Date(validFrom);
    validFrom.setHours(0, 0, 0, 0);

    validTill = new Date(validTill);
    validTill.setHours(23, 59, 59, 999);

    // derive canonical week window (start = Monday of the week of validFrom,
    // end = start + 6 days).  this ensures the day‑index math in hasGuardOverlap
    // works correctly regardless of which date the supervisor picks.
    const dayOfWeek = validFrom.getDay(); // 0=Sun, 1=Mon, …
    const offsetToMonday = (dayOfWeek + 6) % 7; // number of days to subtract to get Monday
    const weekStart = new Date(validFrom);
    weekStart.setDate(validFrom.getDate() - offsetToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // override the provided range with the canonical week
    validFrom = weekStart;
    validTill = weekEnd;

    const supervisor = await User.findById(id);

    const locationId = supervisor.assignedLocationId;
    if (!locationId) {
      return res.status(400).json({ message: "Supervisor has no assigned location" });
    }

    // 🔴 Guard double-booking validation (use weekStart for reference)
    if (hasGuardOverlap(shifts, weekStart)) {
      return res.status(400).json({
        message: "Guard double-booking detected. A guard cannot work overlapping shifts."
      });
    }

    // ensure only one schedule exists per logical week by deleting any
    // overlapping documents.  earlier versions of the code produced long-
    // running ranges (see DB) so we clean those up here as well.
    await WeeklyShiftSchedule.deleteMany({
      locationId,
      validFrom: { $lte: validTill },
      validTill: { $gte: validFrom }
    });

    // insert fresh schedule (no need to look for existing once we removed
    // overlaps)
    let schedule = await WeeklyShiftSchedule.create({
      locationId,
      validFrom,
      validTill,
      shifts,
      createdBy: supervisor._id
    });

    // ensure user info is populated so client can display names immediately
    await schedule.populate("shifts.userId", "firstName lastName role");

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

    // 1️⃣ Try to find ACTIVE schedule.  We sort so the document with the
    // most recent start date wins; this guarantees that, in the presence of
    // overlapping relics, the schedule you most-recently created/edited is
    // returned rather than an arbitrary older one.
    let schedule = await WeeklyShiftSchedule.findOne({
      locationId,
      validFrom: { $lte: today },
      validTill: { $gte: today }
    })
      .sort({ validFrom: -1, updatedAt: -1 }) // later start first
      .populate("shifts.userId", "firstName lastName role");

    // 2️⃣ If none, find NEXT upcoming schedule
    if (!schedule) {
      schedule = await WeeklyShiftSchedule.findOne({
        locationId,
        validFrom: { $gt: today }
      })
        .sort({ validFrom: 1 }) // earliest future schedule
        .populate("shifts.userId", "firstName lastName role");
    }

    // 3️⃣ still nothing? fall back to the most recently modified schedule for
    // this location.  this makes the UI more tolerant of clock skew or
    // badly‑dated docs (e.g. server clock stuck in the past).
    if (!schedule) {
      schedule = await WeeklyShiftSchedule.findOne({ locationId })
        .sort({ updatedAt: -1 }) // newest schedule anywhere
        .populate("shifts.userId", "firstName lastName role");
    }

    res.json(schedule); // may still be null
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch schedule" });
  }
};
