const mongoose = require("mongoose");

const userDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    roleAtUpload: {
      type: String,
      enum: ["GUARD", "SUPERVISOR"],
      required: true,
    },
    documentType: {
      type: String,
      enum: ["PASSPORT", "WORK_PERMIT", "STUDY_PERMIT", "SIN", "OTHER"],
      required: true,
    },
    note: {
      type: String,
      default: "",
      maxlength: 600,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    dataUrl: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

userDocumentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("UserDocument", userDocumentSchema);
