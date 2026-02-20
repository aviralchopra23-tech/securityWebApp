const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./src/config/db");

// Routes
const authRoutes = require("./src/routes/authRoutes");
const testRoutes = require("./src/routes/testRoutes");
const locationRoutes = require("./src/routes/locationRoutes");
const guardRoutes = require("./src/routes/guardRoutes");
const weeklyShiftScheduleRoutes = require("./src/routes/weeklyShiftScheduleRoutes");
const announcementRoutes = require("./src/routes/announcementRoutes");
const userRoutes = require("./src/routes/userRoutes");
const payPeriodRoutes = require("./src/routes/payPeriodRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Root endpoint
app.get("/", (req, res) => res.send("API running"));

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/guards", guardRoutes); // ✅ shifts live under /api/guards/shifts
app.use("/api/weekly-schedules", weeklyShiftScheduleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/payperiod", payPeriodRoutes);

/* ================= GLOBAL ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }

  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  res.status(err.statusCode || 500).json({
    message: err.message || "Server Error",
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));