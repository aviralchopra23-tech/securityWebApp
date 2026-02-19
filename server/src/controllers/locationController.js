const Location = require("../models/Location");
const User = require("../models/User");

// CREATE location
exports.createLocation = async (req, res) => {
  try {
    const { name, address } = req.body;

    const location = await Location.create({ name, address });

    res.status(201).json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ASSIGN supervisor to location
exports.assignSupervisor = async (req, res) => {
  try {
    const { locationId, supervisorId } = req.body;

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // 🔒 ENFORCE ONE SUPERVISOR PER LOCATION
    if (location.supervisorId) {
      return res.status(400).json({
        message: "Already there is a supervisor assigned to this location"
      });
    }

    const supervisor = await User.findById(supervisorId);
    if (!supervisor || supervisor.role !== "SUPERVISOR") {
      return res.status(400).json({ message: "Invalid supervisor" });
    }

    // 🔒 Supervisor can only have ONE location
    if (supervisor.assignedLocationId) {
      return res.status(400).json({
        message: "Supervisor is already assigned to another location"
      });
    }

    location.supervisorId = supervisorId;
    supervisor.assignedLocationId = locationId;

    await location.save();
    await supervisor.save();

    res.json({ message: "Supervisor assigned successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET all locations
exports.getLocations = async (req, res) => {
  const locations = await Location.find().populate("supervisorId", "firstName lastName email");
  res.json(locations);
};

// GET single location details (OWNER only)
exports.getLocationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch location + supervisor
    const location = await Location.findById(id)
      .populate("supervisorId", "firstName lastName email");

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // Fetch guards assigned to this location
    const guards = await User.find({
      role: "GUARD",
      assignedLocationIds: id
    }).select("firstName lastName email");

    res.json({
      location,
      guards
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE location (OWNER only)
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    location.name = name ?? location.name;
    location.address = address ?? location.address;

    await location.save();

    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE location (OWNER only)
// DELETE location (OWNER only)
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // 1️⃣ Unassign supervisor from this location
    if (location.supervisorId) {
      await User.findByIdAndUpdate(
        location.supervisorId,
        { $unset: { assignedLocationId: "" } }
      );
    }

    // 2️⃣ Remove this location from guards
    await User.updateMany(
      { assignedLocationIds: id },
      { $pull: { assignedLocationIds: id } }
    );

    // 3️⃣ Delete the location itself
    await location.deleteOne();

    res.json({ message: "Location deleted successfully" });
  } catch (err) {
    console.error("Delete location failed:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.getMyLocations = async (req, res) => {
  try {
    const { id, role } = req.user;

    // SUPERVISOR: exactly one location, resolved from Location collection
    if (role === "SUPERVISOR") {
      const location = await Location.findOne({
        supervisorId: id
      });

      return res.json(location ? [location] : []);
    }

    // GUARD: multiple assigned locations
    if (role === "GUARD") {
      const guard = await User.findById(id).populate(
        "assignedLocationIds",
        "name"
      );

      return res.json(guard.assignedLocationIds || []);
    }

    return res.status(403).json({ message: "Access denied" });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};
