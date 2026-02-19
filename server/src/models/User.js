const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["OWNER", "SUPERVISOR", "GUARD"],
      required: true
    },

    // Supervisor → exactly one location
    assignedLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null
    },

    // Guard → multiple locations
    assignedLocationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location"
      }
    ],

    // Pay info (OWNER only can see)
    payRate: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
