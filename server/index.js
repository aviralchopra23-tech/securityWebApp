const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const testRoutes = require("./src/routes/testRoutes");
const locationRoutes = require("./src/routes/locationRoutes");
const guardRoutes = require("./src/routes/guardRoutes");
const weeklyShiftScheduleRoutes = require("./src/routes/weeklyShiftScheduleRoutes");
const announcementRoutes = require("./src/routes/announcementRoutes");
const payPeriodRoutes = require("./src/routes/payPeriodRoutes");


const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("API running"));

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/guards", guardRoutes);
app.use("/api/weekly-schedules", weeklyShiftScheduleRoutes);

// ✅ FIXED PATH
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/announcements", announcementRoutes);
app.use("/api/pay-periods", payPeriodRoutes);



app.listen(process.env.PORT || 5000, () => {
  console.log("Server started");
});
