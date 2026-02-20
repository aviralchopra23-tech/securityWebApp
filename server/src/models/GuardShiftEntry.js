// src/models/GuardShiftEntry.js
const mongoose = require("mongoose");

const guardShiftEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roleAtEntry: { type: String, enum: ["GUARD", "SUPERVISOR"], required: true },

    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },

    startDateTime: { type: Date, required: true, index: true },
    endDateTime: { type: Date, required: true },

    payPeriodStart: { type: Date, required: true, index: true },
    payPeriodEnd: { type: Date, required: true, index: true },

    isLocked: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Model-level safety checks only (do NOT compute pay periods here)
// Using thrown errors instead of callback in order to avoid conflicts with
// newer Mongoose hook signatures (which may not supply a `next` argument).
guardShiftEntrySchema.pre("validate", function () {
  // synchronous code; any thrown error will bubble and abort validation
  if (!this.startDateTime || !this.endDateTime) {
    throw new Error("startDateTime and endDateTime are required");
  }

  const s = new Date(this.startDateTime);
  const e = new Date(this.endDateTime);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    throw new Error("Invalid startDateTime/endDateTime");
  }

  if (s >= e) {
    throw new Error("startDateTime must be before endDateTime");
  }

  if (!this.payPeriodStart || !this.payPeriodEnd) {
    throw new Error("payPeriodStart and payPeriodEnd are required");
  }

  const ps = new Date(this.payPeriodStart);
  const pe = new Date(this.payPeriodEnd);

  if (isNaN(ps.getTime()) || isNaN(pe.getTime())) {
    throw new Error("Invalid payPeriodStart/payPeriodEnd");
  }

  if (ps > pe) {
    throw new Error("payPeriodStart must be <= payPeriodEnd");
  }
});

// Helpful compound indexes
guardShiftEntrySchema.index({ userId: 1, payPeriodStart: 1, payPeriodEnd: 1 });
guardShiftEntrySchema.index({ userId: 1, startDateTime: 1 });

module.exports = mongoose.model("GuardShiftEntry", guardShiftEntrySchema);