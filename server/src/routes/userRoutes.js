const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const {
  getSupervisors,
  getGuards,
  updateUser,
  deleteUser,
  createSupervisor,
  createGuard,
  assignSupervisor  // ✅ add assign route
} = require("../controllers/userController");

// ================= USERS MANAGEMENT (OWNER ONLY) =================

// List supervisors
router.get("/supervisors", protect, allowRoles("OWNER"), getSupervisors);

// List guards
router.get("/guards", protect, allowRoles("OWNER"), getGuards);

// Update user (guard or supervisor)
router.put("/:id", protect, allowRoles("OWNER"), updateUser);

// Delete user (guard or supervisor)
router.delete("/:id", protect, allowRoles("OWNER"), deleteUser);

// Create supervisor
router.post("/supervisors", protect, allowRoles("OWNER"), createSupervisor);

// Create guard
router.post("/guards", protect, allowRoles("OWNER"), createGuard);

// Assign supervisor to location
router.post("/assign-supervisor", protect, allowRoles("OWNER"), assignSupervisor);

module.exports = router;