const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const {
  uploadDocuments,
  getMyDocuments,
  getDocumentsForUser,
  deleteDocument,
} = require("../controllers/documentController");

const router = express.Router();

router.post("/", protect, allowRoles("GUARD", "SUPERVISOR"), uploadDocuments);
router.get("/my", protect, allowRoles("GUARD", "SUPERVISOR"), getMyDocuments);
router.get("/user/:userId", protect, allowRoles("OWNER"), getDocumentsForUser);
router.delete("/:id", protect, allowRoles("OWNER", "GUARD", "SUPERVISOR"), deleteDocument);

module.exports = router;
