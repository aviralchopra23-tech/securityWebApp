const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const {
  createLocation,
  assignSupervisor,
  getLocations,
  getLocationDetails,
  updateLocation,
  deleteLocation
} = require("../controllers/locationController");

const { getMyLocations } = require("../controllers/locationController");

// Guard & Supervisor
router.get("/my", protect, allowRoles("GUARD", "SUPERVISOR"), getMyLocations);

// OWNER ONLY
router.post("/", protect, allowRoles("OWNER"), createLocation);
router.post("/assign-supervisor", protect, allowRoles("OWNER"), assignSupervisor);
router.get(
  "/",
  protect,
  allowRoles("OWNER", "SUPERVISOR", "GUARD"),
  getLocations
);

router.get("/:id/details", protect, allowRoles("OWNER"), getLocationDetails);
router.put("/:id", protect, allowRoles("OWNER"), updateLocation);
router.delete("/:id", protect, allowRoles("OWNER"), deleteLocation);

module.exports = router;
