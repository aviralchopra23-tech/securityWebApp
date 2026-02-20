import { useEffect, useState } from "react";
import { getShiftsForPayPeriod } from "../../api/payPeriodApi";
import api from "../../api/axios";

// Page-specific styles
import "../../styles/dashboard.css"; // .home-dashboard, metrics cards, progress bars, daily-bar-chart

// Helper functions
const calculateShiftHours = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return ms > 0 ? ms / (1000 * 60 * 60) : 0;
};

const getTotalHours = (shifts) =>
  shifts.reduce(
    (sum, s) => sum + calculateShiftHours(s.startDateTime, s.endDateTime),
    0
  );

const buildPayPeriodBars = (shifts, startDate) => {
  const start = new Date(startDate);
  const bars = Array.from({ length: 15 }, (_, i) => ({ dayIndex: i + 1, hours: 0 }));

  shifts.forEach((shift) => {
    if (!shift.startDateTime) return;
    const shiftDate = new Date(shift.startDateTime);
    const diffDays = Math.floor((shiftDate - start) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 15) {
      bars[diffDays].hours += calculateShiftHours(shift.startDateTime, shift.endDateTime);
    }
  });

  return bars;
};

export default function SupervisorHome() {
  const [payPeriod, setPayPeriod] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const today = new Date().toISOString();
        const data = await getShiftsForPayPeriod(today);
        setPayPeriod({ start: data.payPeriodStart, end: data.payPeriodEnd });
        setShifts(data.shifts || []);
      } catch (err) {
        console.error("Failed to load pay period shifts:", err);
      }
    };

    const loadUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUserName(res.data.firstName);
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    };

    loadDashboard();
    loadUser();
  }, []);

  const totalHours = getTotalHours(shifts);
  const percent = Math.min((totalHours / 80) * 100, 100);
  const dailyBars = payPeriod && buildPayPeriodBars(shifts, payPeriod.start);
  const maxDailyHours = dailyBars && Math.max(...dailyBars.map((d) => d.hours), 8);

  return (
    <div className="home-dashboard">
      {/* HEADER */}
      <div className="home-header">
        <h2>Dashboard</h2>
        {userName && (
          <p className="home-subtitle welcome-text">
            Welcome, <strong>{userName}</strong>
          </p>
        )}
        <p className="home-subtitle">
          Supervisor pay period overview and hours summary
        </p>
      </div>

      {/* METRICS */}
      {payPeriod && (
        <>
          <div className="metrics-row">
            <div className="metric-card">
              <span className="metric-label">Pay Period</span>
              <span className="metric-value">
                {new Date(payPeriod.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
                {new Date(payPeriod.end).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Total Hours</span>
              <span className="metric-value">{totalHours.toFixed(2)} hrs</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
          </div>

          {/* DAILY HOURS BAR CHART */}
          <div className="dashboard-section">
            <h4>Bi-Weekly Hours Breakdown</h4>
            <div className="daily-bar-chart">
              {dailyBars.map((day) => {
                const height = (day.hours / maxDailyHours) * 100 || 0;
                return (
                  <div
                    key={day.dayIndex}
                    className="daily-bar-wrapper"
                    data-tooltip={`Day ${day.dayIndex}: ${day.hours.toFixed(2)} hrs`}
                  >
                    <div className="daily-bar" style={{ height: `${height}%` }} />
                    <span className="daily-bar-label">D{day.dayIndex}</span>
                  </div>
                );
              })}
            </div>
            <div className="section-footer">
              {totalHours.toFixed(2)} hrs logged •{" "}
              {new Date(payPeriod.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
              {new Date(payPeriod.end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}