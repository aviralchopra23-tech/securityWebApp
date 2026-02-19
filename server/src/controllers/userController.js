const User = require("../models/User");

// GET all supervisors (OWNER only)
exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({ role: "SUPERVISOR" })
      .select("firstName lastName email assignedLocationId");

    res.json(supervisors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET all guards (OWNER only)
exports.getGuards = async (req, res) => {
  try {
    const guards = await User.find({ role: "GUARD" })
      .select("firstName lastName email assignedLocationIds");

    res.json(guards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE user (OWNER only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, assignedLocationIds } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.email = email ?? user.email;

    // ✅ ONLY GUARDS can have multiple locations
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


// DELETE user (OWNER only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const bcrypt = require("bcryptjs");

exports.createSupervisor = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const supervisor = await User.create({
      firstName,
      lastName,
      email,
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

exports.createGuard = async (req, res) => {
  try {
    const { firstName, lastName, email, password, assignedLocationIds = [] } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const guard = await User.create({
      firstName,
      lastName,
      email,
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
