const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdByRole: {
      type: String,
      enum: ["OWNER", "SUPERVISOR"],
      required: true,
    },

    locationScope: {
      type: String,
      enum: ["ALL", "SPECIFIC"],
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: false, // announcements are immutable once created
    },
  }
);

module.exports = mongoose.model("Announcement", AnnouncementSchema);
