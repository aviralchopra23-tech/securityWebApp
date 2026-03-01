import { useEffect, useState } from "react";
import { getShiftsForPayPeriod } from "../../api/payPeriodApi";
import api from "../../api/axios";

/* ================================
   DISPLAY-ONLY HELPERS
================================ */

const calculateShiftHours = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return ms > 0 ? ms / (1000 * 60 * 60) : 0;
};

const getTotalHours = (shifts) =>
  shifts.reduce(
    (sum, s) => sum + calculateShiftHours(s.startDateTime, s.endDateTime),
    0
  );

const getDaysRemaining = (endDate) => {
  const today = new Date();
  const end = new Date(endDate);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.ceil((startOfEnd - startOfToday) / (1000 * 60 * 60 * 24));
  return diff;
};

const getLastShiftDate = (shifts) => {
  if (!Array.isArray(shifts) || shifts.length === 0) return null;

  return shifts.reduce((latest, shift) => {
    const shiftDate = shift?.startDateTime ? new Date(shift.startDateTime) : null;
    if (!shiftDate || Number.isNaN(shiftDate.getTime())) return latest;
    if (!latest) return shiftDate;
    return shiftDate > latest ? shiftDate : latest;
  }, null);
};

export default function GuardHome() {
  const [payPeriod, setPayPeriod] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const today = new Date().toISOString();
        const data = await getShiftsForPayPeriod(today);

        setPayPeriod({
          start: data.payPeriodStart,
          end: data.payPeriodEnd
        });

        setShifts(data.shifts || []);
      } catch {
        // non-critical dashboard failure
      }
    };

    const loadUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUserName(res.data.firstName);
      } catch {
        // identity failure should NOT break dashboard
      }
    };

    loadDashboard();
    loadUser();
  }, []);

  const totalHours = getTotalHours(shifts);
  const percent = Math.min((totalHours / 80) * 100, 100);
  const daysRemaining = payPeriod ? getDaysRemaining(payPeriod.end) : 0;
  const lastShiftDate = getLastShiftDate(shifts);
  const isReadyToSubmit = shifts.length > 0 && daysRemaining <= 0;
  const healthStatus =
    shifts.length === 0
      ? "Needs entries"
      : isReadyToSubmit
        ? "Ready to submit"
        : "In progress";
  const nextStepText =
    shifts.length === 0
      ? "Add your first shift entry for this pay period."
      : isReadyToSubmit
        ? "Review entries and submit your pay period."
        : "Keep adding shifts before the pay period closes.";

  return (
    <div className="home-dashboard">
      {/* HEADER */}
      <div className="home-header">
        {/* Dashboard heading removed */}
        {userName && (
          <p className="home-subtitle welcome-text">
            Welcome, <strong>{userName}</strong>
          </p>
        )}

        <p className="home-subtitle">
          Current pay period status and hours summary
        </p>
      </div>

      {payPeriod && (
        <>
          {/* METRICS */}
          <div className="metrics-row">
            <div className="metric-card">
              <span className="metric-label">Pay Period</span>
              <span className="metric-value">
                {new Date(payPeriod.start).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric"
                })}{" "}
                –{" "}
                {new Date(payPeriod.end).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Total Hours</span>
              <span className="metric-value">
                {totalHours.toFixed(2)} hrs
              </span>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* PAY PERIOD HEALTH */}
          <div className="dashboard-section">
            <h4 className="section-title">
              Pay Period Health
            </h4>

            <div className="health-grid">
              <div className="health-item">
                <span className="health-label">Days Remaining</span>
                <span className="health-value">{daysRemaining < 0 ? 0 : daysRemaining}</span>
              </div>

              <div className="health-item">
                <span className="health-label">Shifts Logged</span>
                <span className="health-value">{shifts.length}</span>
              </div>

              <div className="health-item">
                <span className="health-label">Last Shift Entry</span>
                <span className="health-value health-date">
                  {lastShiftDate
                    ? lastShiftDate.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No entries"}
                </span>
              </div>

              <div className="health-item">
                <span className="health-label">Submission Status</span>
                <span className="health-value">{healthStatus}</span>
              </div>
            </div>

            <div className="section-footer">
              {nextStepText}
            </div>
          </div>

        </>
      )}
    </div>
  );
}