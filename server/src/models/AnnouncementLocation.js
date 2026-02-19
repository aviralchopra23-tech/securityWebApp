const mongoose = require("mongoose");

const AnnouncementLocationSchema = new mongoose.Schema(
  {
    announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true,
      index: true,
    },

    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Prevent duplicate location mappings for same announcement
AnnouncementLocationSchema.index(
  { announcementId: 1, locationId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "AnnouncementLocation",
  AnnouncementLocationSchema
);
