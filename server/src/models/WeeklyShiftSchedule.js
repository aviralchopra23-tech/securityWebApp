const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  day: {
    type: String,
    required: true
  },
  startTime: String,
  endTime: String
});

const weeklyShiftScheduleSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true
    },
    validFrom: {
      type: Date,
      required: true
    },
    validTill: {
      type: Date,
      required: true
    },
    shifts: [shiftSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "WeeklyShiftSchedule",
  weeklyShiftScheduleSchema
);
