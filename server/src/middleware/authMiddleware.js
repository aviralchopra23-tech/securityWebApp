// src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Not authorized" });

    const role = String(user.role || "").toUpperCase();

    req.user = {
      id: user._id.toString(),
      role,
      assignedLocationId: user.assignedLocationId ? user.assignedLocationId.toString() : null,
      assignedLocationIds: Array.isArray(user.assignedLocationIds)
        ? user.assignedLocationIds.map((x) => x.toString())
        : [],
    };

    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = { protect };