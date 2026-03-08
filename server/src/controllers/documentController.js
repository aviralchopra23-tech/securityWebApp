const mongoose = require("mongoose");
const UserDocument = require("../models/UserDocument");
const User = require("../models/User");

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 8;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "PASSPORT",
  "WORK_PERMIT",
  "STUDY_PERMIT",
  "SIN",
  "OTHER",
]);

const mapDocument = (doc) => ({
  _id: doc._id,
  userId: doc.userId,
  roleAtUpload: doc.roleAtUpload,
  documentType: doc.documentType,
  note: doc.note || "",
  originalName: doc.originalName,
  mimeType: doc.mimeType,
  sizeBytes: doc.sizeBytes,
  dataUrl: doc.dataUrl,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const validateIncomingFile = (file) => {
  if (!file || typeof file !== "object") return "Invalid file payload.";

  const name = String(file.name || "").trim();
  const mimeType = String(file.mimeType || "").trim();
  const sizeBytes = Number(file.size || 0);
  const dataUrl = String(file.dataUrl || "");

  if (!name) return "Each file must include name.";
  if (!mimeType) return "Each file must include mimeType.";
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "Each file must include valid size.";
  if (sizeBytes > MAX_FILE_SIZE_BYTES) return "A file exceeds the 4MB size limit.";
  if (!dataUrl.startsWith("data:")) return "Invalid file content format.";

  return null;
};

exports.uploadDocuments = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const role = String(req.user.role || "").toUpperCase();
    if (!["GUARD", "SUPERVISOR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const documentType = String(req.body?.documentType || "").trim();
    const note = String(req.body?.note || "").trim();
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

    if (!documentType) {
      return res.status(400).json({ message: "documentType is required." });
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
      return res.status(400).json({ message: "Invalid documentType." });
    }

    if (files.length === 0) {
      return res.status(400).json({ message: "At least one file is required." });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return res.status(400).json({ message: "Too many files in one upload." });
    }

    for (const file of files) {
      const validationError = validateIncomingFile(file);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
    }

    const docs = files.map((file) => ({
      userId: req.user.id,
      roleAtUpload: role,
      documentType,
      note,
      originalName: String(file.name).trim(),
      mimeType: String(file.mimeType).trim(),
      sizeBytes: Number(file.size),
      dataUrl: String(file.dataUrl),
    }));

    const created = await UserDocument.insertMany(docs);

    return res.status(201).json({
      message: "Documents uploaded successfully.",
      documents: created.map(mapDocument),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to upload documents." });
  }
};

exports.getMyDocuments = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const docs = await UserDocument.find({ userId: req.user.id }).sort({ createdAt: -1 });

    return res.json({ documents: docs.map(mapDocument) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch documents." });
  }
};

exports.getDocumentsForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId." });
    }

    const user = await User.findById(userId).select("firstName lastName role assignedLocationId assignedLocationIds");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const docs = await UserDocument.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      user,
      documents: docs.map(mapDocument),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch user documents." });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document id." });
    }

    const doc = await UserDocument.findById(id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }

    const isOwner = String(req.user.role || "").toUpperCase() === "OWNER";
    const isDocOwner = String(doc.userId) === String(req.user.id);

    if (!isOwner && !isDocOwner) {
      return res.status(403).json({ message: "Access denied." });
    }

    await doc.deleteOne();
    return res.json({ message: "Document deleted." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete document." });
  }
};
