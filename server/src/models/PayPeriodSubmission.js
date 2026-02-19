const mongoose = require("mongoose");

const submittedShiftSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true
    },

    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true
    },

    startTime: {
      type: String, // "HH:mm"
      required: true
    },

    endTime: {
      type: String, // "HH:mm"
      required: true
    },

    hoursWorked: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const payPeriodSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    roleAtSubmission: {
      type: String,
      enum: ["GUARD", "SUPERVISOR"],
      required: true
    },

    payPeriodStart: {
      type: Date,
      required: true
    },

    payPeriodEnd: {
      type: Date,
      required: true
    },

    shifts: {
      type: [submittedShiftSchema],
      required: true
    },

    totalHours: {
      type: Number,
      required: true
    },

    paycheckCollectionLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true
    },

    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Prevent duplicate submissions per user per pay period
payPeriodSubmissionSchema.index(
  { userId: 1, payPeriodStart: 1, payPeriodEnd: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "PayPeriodSubmission",
  payPeriodSubmissionSchema
);
