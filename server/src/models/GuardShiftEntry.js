const mongoose = require("mongoose");

const guardShiftEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    roleAtEntry: {
      type: String,
      enum: ["GUARD", "SUPERVISOR"],
      required: true
    },

    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true
    },

    // Shift timing (single entry, even if overnight)
    startDateTime: {
      type: Date,
      required: true
    },
    endDateTime: {
      type: Date,
      required: true
    },

    // Derived at creation time
    payPeriodStart: {
      type: Date,
      required: true
    },
    payPeriodEnd: {
      type: Date,
      required: true
    },

    // Locking handled via submission
    isLocked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "GuardShiftEntry",
  guardShiftEntrySchema
);
