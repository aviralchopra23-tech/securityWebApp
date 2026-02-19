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
   createGuard   // ✅ ADD THIS
} = require("../controllers/userController");


// OWNER ONLY — USERS MANAGEMENT

// List supervisors
router.get(
  "/supervisors",
  protect,
  allowRoles("OWNER"),
  getSupervisors
);

// List guards
router.get(
  "/guards",
  protect,
  allowRoles("OWNER"),
  getGuards
);

// Update user (guard or supervisor)
router.put(
  "/:id",
  protect,
  allowRoles("OWNER"),
  updateUser
);

// Delete user (guard or supervisor)
router.delete(
  "/:id",
  protect,
  allowRoles("OWNER"),
  deleteUser
);

router.post(
  "/supervisors",
  protect,
  allowRoles("OWNER"),
  createSupervisor
);

router.post(
  "/guards",
  protect,
  allowRoles("OWNER"),
  createGuard
);



module.exports = router;
