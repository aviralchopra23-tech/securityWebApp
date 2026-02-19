const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { assignGuardToLocation } = require("../controllers/guardController");
const { getGuardsForSupervisor } = require("../controllers/guardController");


router.post("/assign-location", protect, allowRoles("OWNER"), assignGuardToLocation);
router.get("/my-location", protect, allowRoles("SUPERVISOR"), getGuardsForSupervisor);


// OWNER ONLY
module.exports = router;
