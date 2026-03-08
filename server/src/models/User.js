// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    personalEmail: { type: String, lowercase: true, trim: true, default: "" },
    phoneNumber: { type: String, trim: true, default: "" },
    licenseNumber: { type: String, trim: true, default: "" },
    profilePhotoDataUrl: { type: String, default: "" },
    homeAddress: { type: String, trim: true, default: "" },
    emergencyContactName: { type: String, trim: true, default: "" },
    dateOfBirth: { type: Date, default: null },
    dateJoined: { type: Date, default: null },
    password: { type: String, required: true },

    role: { type: String, enum: ["OWNER", "SUPERVISOR", "GUARD"], required: true },

    // Supervisor → exactly one location
    assignedLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },

    // Guard → multiple locations
    assignedLocationIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Location" }
    ],

    payRate: { type: Number, default: null, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);