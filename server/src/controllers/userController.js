const User = require("../models/User");
const Location = require("../models/Location");
const bcrypt = require("bcryptjs");

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

// ================= GET SUPERVISORS =================
exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({ role: "SUPERVISOR" })
      .select("firstName lastName email assignedLocationId");

    res.json(supervisors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= GET GUARDS =================
exports.getGuards = async (req, res) => {
  try {
    const guards = await User.find({ role: "GUARD" })
      .select("firstName lastName email assignedLocationIds");

    res.json(guards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= UPDATE USER =================
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, assignedLocationIds, password } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const normalizedEmail = normalizeEmail(email);
    if (email !== undefined && !normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.email = email !== undefined ? normalizedEmail : user.email;

    const trimmedPassword = typeof password === "string" ? password.trim() : "";
    if (trimmedPassword) {
      user.password = await bcrypt.hash(trimmedPassword, 10);
    }

    if (user.role === "GUARD" && Array.isArray(assignedLocationIds)) {
      user.assignedLocationIds = assignedLocationIds;
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= DELETE USER =================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If supervisor, clear their location assignment
    if (user.role === "SUPERVISOR" && user.assignedLocationId) {
      await Location.findByIdAndUpdate(user.assignedLocationId, { supervisorId: null });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= CREATE SUPERVISOR =================
exports.createSupervisor = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!firstName || !lastName || !normalizedEmail || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const supervisor = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "SUPERVISOR",
      assignedLocationId: null
    });

    res.status(201).json(supervisor);
  } catch (err) {
    console.error("Create supervisor error:", err);
    res.status(500).json({ message: "Failed to create supervisor" });
  }
};

// ================= CREATE GUARD =================
exports.createGuard = async (req, res) => {
  try {
    const { firstName, lastName, email, password, assignedLocationIds = [] } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!firstName || !lastName || !normalizedEmail || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const guard = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "GUARD",
      assignedLocationIds
    });

    res.status(201).json(guard);
  } catch (err) {
    console.error("Create guard error:", err);
    res.status(500).json({ message: "Failed to create guard" });
  }
};

// ================= ASSIGN SUPERVISOR TO LOCATION =================
exports.assignSupervisor = async (req, res) => {
  try {
    const { supervisorId, locationId } = req.body;

    if (!supervisorId || !locationId) {
      return res.status(400).json({ message: "Supervisor ID and Location ID are required" });
    }

    const supervisor = await User.findById(supervisorId);
    const location = await Location.findById(locationId);

    if (!supervisor || supervisor.role !== "SUPERVISOR") {
      return res.status(400).json({ message: "Invalid supervisor" });
    }

    if (!location) return res.status(400).json({ message: "Invalid location" });

    // Remove previous supervisor from location if any
    if (location.supervisorId) {
      const prevSupervisor = await User.findById(location.supervisorId);
      if (prevSupervisor) {
        prevSupervisor.assignedLocationId = null;
        await prevSupervisor.save();
      }
    }

    // Remove supervisor from previous location if assigned
    if (supervisor.assignedLocationId) {
      const prevLocation = await Location.findById(supervisor.assignedLocationId);
      if (prevLocation) {
        prevLocation.supervisorId = null;
        await prevLocation.save();
      }
    }

    // Assign supervisor to new location
    supervisor.assignedLocationId = location._id;
    location.supervisorId = supervisor._id;

    await supervisor.save();
    await location.save();

    res.json({ message: "Supervisor assigned successfully" });
  } catch (err) {
    console.error("Assign supervisor error:", err);
    res.status(500).json({ message: "Failed to assign supervisor" });
  }
};