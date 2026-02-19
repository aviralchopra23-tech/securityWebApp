const User = require("../models/User");
const Location = require("../models/Location");

// Assign guard to a location
exports.assignGuardToLocation = async (req, res) => {
  try {
    const { guardId, locationId } = req.body;

    const guard = await User.findById(guardId);
    if (!guard || guard.role !== "GUARD") {
      return res.status(400).json({ message: "Invalid guard" });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // Prevent duplicates
    if (guard.assignedLocationIds.includes(locationId)) {
      return res.status(400).json({ message: "Guard already assigned to this location" });
    }

    guard.assignedLocationIds.push(locationId);
    await guard.save();

    res.json({ message: "Guard assigned to location" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.getGuardsForSupervisor = async (req, res) => {
  try {
    const locationId = req.user.locationId;
    if (!locationId) return res.status(400).json({ message: "Supervisor has no assigned location" });

    const people = await User.find({
      $or: [
        { role: "GUARD", assignedLocationIds: locationId },
        { role: "SUPERVISOR", assignedLocationId: locationId }
      ]
    }).select("_id firstName lastName role");

    res.json(people);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
