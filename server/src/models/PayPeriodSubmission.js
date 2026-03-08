// src/models/PayPeriodSubmission.js
const mongoose = require("mongoose");

// Stored snapshot segments inside submission
const submittedShiftSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    hoursWorked: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const payPeriodSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roleAtSubmission: { type: String, enum: ["GUARD", "SUPERVISOR"], required: true },

    payPeriodStart: { type: Date, required: true, index: true },
    payPeriodEnd: { type: Date, required: true, index: true },

    shifts: {
      type: [submittedShiftSchema],
      required: true,
      validate: {
        validator: function (shifts) {
          return Array.isArray(shifts) && shifts.length > 0;
        },
        message: "Submission must include at least one shift",
      },
    },

    totalHours: { type: Number, required: true, min: 0 },

    paycheckCollectionLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: false,
    },

    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicates
payPeriodSubmissionSchema.index(
  { userId: 1, payPeriodStart: 1, payPeriodEnd: 1 },
  { unique: true }
);

// Integrity: recompute hours from start/end to prevent tampering
// modern Mongoose no longer passes `next` to pre hooks; we can throw
// errors or return normally.  This avoids the "next is not a function"
// crash that was observed under newer mongoose versions.
payPeriodSubmissionSchema.pre("validate", function () {
  // synchronous validation logic
  if (!this.payPeriodStart || !this.payPeriodEnd) {
    throw new Error("payPeriodStart and payPeriodEnd are required");
  }

  const ppStart = new Date(this.payPeriodStart);
  const ppEnd = new Date(this.payPeriodEnd);

  if (isNaN(ppStart.getTime()) || isNaN(ppEnd.getTime())) {
    throw new Error("Invalid payPeriodStart/payPeriodEnd");
  }

  if (ppStart.getTime() > ppEnd.getTime()) {
    throw new Error("payPeriodStart must be <= payPeriodEnd");
  }

  if (!Array.isArray(this.shifts) || this.shifts.length === 0) {
    throw new Error("Submission must include at least one shift");
  }

  let calculatedHours = 0;

  for (const s of this.shifts) {
    const st = new Date(s.startTime);
    const et = new Date(s.endTime);

    if (isNaN(st.getTime()) || isNaN(et.getTime())) {
      throw new Error("Invalid startTime/endTime in submitted shifts");
    }

    if (et.getTime() <= st.getTime()) {
      throw new Error("Submitted shift endTime must be after startTime");
    }

    // must be within pay period boundaries (inclusive)
    if (st.getTime() < ppStart.getTime() || et.getTime() > ppEnd.getTime()) {
      throw new Error("Submitted shifts must fall within the submitted pay period");
    }

    const hours = (et.getTime() - st.getTime()) / (1000 * 60 * 60);
    if (!Number.isFinite(hours) || hours < 0) {
      throw new Error("Invalid computed hours for submitted shift");
    }

    // overwrite hoursWorked deterministically
    s.hoursWorked = hours;

    calculatedHours += hours;
  }

  this.totalHours = calculatedHours;
});
payPeriodSubmissionSchema.virtual("payPeriodLabel").get(function () {
  const start = this.payPeriodStart.toISOString().slice(0, 10);
  const end = this.payPeriodEnd.toISOString().slice(0, 10);
  return `${start} - ${end}`;
});

module.exports = mongoose.model("PayPeriodSubmission", payPeriodSubmissionSchema);