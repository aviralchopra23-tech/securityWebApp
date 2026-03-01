// src/models/PayPeriod.js
const mongoose = require("mongoose");

const payPeriodSchema = new mongoose.Schema(
  {
    // half‑month boundaries; start will always be the 1st or 16th of a
    // month, and end will be the corresponding 15th or last day.
    start: { type: Date, required: true, unique: true, index: true },
    end: { type: Date, required: true, index: true },

    // metadata that an owner might want to attach to a pay period
    published: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// ensure no overlapping/duplicate periods
payPeriodSchema.index({ start: 1, end: 1 }, { unique: true });

module.exports = mongoose.model("PayPeriod", payPeriodSchema);
