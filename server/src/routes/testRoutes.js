const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

router.get("/owner", protect, allowRoles("OWNER"), (req, res) => {
  res.json({ message: "Owner access granted" });
});

router.get("/supervisor", protect, allowRoles("SUPERVISOR"), (req, res) => {
  res.json({ message: "Supervisor access granted" });
});

router.get("/guard", protect, allowRoles("GUARD"), (req, res) => {
  res.json({ message: "Guard access granted" });
});

module.exports = router;
