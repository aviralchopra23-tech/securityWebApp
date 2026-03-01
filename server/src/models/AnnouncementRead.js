const mongoose = require("mongoose");

const AnnouncementReadSchema = new mongoose.Schema(
  {
    announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

AnnouncementReadSchema.index({ announcementId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("AnnouncementRead", AnnouncementReadSchema);