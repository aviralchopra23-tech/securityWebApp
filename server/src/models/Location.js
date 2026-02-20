// src/models/Location.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    address: { type: String, required: true, trim: true },

    // Exactly ONE supervisor per location
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);