import { useEffect, useState } from "react";
import { getActiveSchedule } from "../api/weeklyScheduleApi";
import { useNavigate, useLocation } from "react-router-dom";

// Styles
import "../styles/schedule-bw.css";

const DAYS = [
  { key: "MON", label: "Monday" },
  { key: "TUE", label: "Tuesday" },
  { key: "WED", label: "Wednesday" },
  { key: "THU", label: "Thursday" },
  { key: "FRI", label: "Friday" },
  { key: "SAT", label: "Saturday" },
  { key: "SUN", label: "Sunday" }
];

export default function SharedScheduleView({
  canCreate = false,
  canEdit = false,
  editPath = "",
  emptyMessage = "No active or upcoming schedule found.",
  createButtonLabel = "Create Schedule"
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");

  // Highlight today's day
  const todayKey = DAYS[new Date().getDay() - 1]?.key || "MON";

  // load function extracted so we can refresh manually
  const loadSchedule = async (savedSchedule) => {
    setError("");
    try {
      const data = await getActiveSchedule();

      // if we have a saved schedule from navigation, only override it
      // when the fetched document seems newer.  this guards against the
      // case where the server clock is wrong and returns an old record.
      if (
        savedSchedule &&
        data &&
        new Date(data.updatedAt) < new Date(savedSchedule.updatedAt)
      ) {
        // keep the saved version
        return;
      }

      setSchedule(data);
    } catch {
      setError("Failed to load schedule");
    }
  };

  useEffect(() => {
    const saved = location.state?.savedSchedule;
    if (saved) {
      setSchedule(saved);
      window.history.replaceState({}, document.title);
    }
    // fetch a fresh copy but compare against the saved snapshot if present
    loadSchedule(saved);
  }, [location.state]);

  if (!schedule) {
    return (
      <div className="schedule-container">
        <div className="schedule-card">
          <h2 className="scheduleTitle">Schedule</h2>
          <p className="no-schedule-message">{emptyMessage}</p>
          {canCreate && (
            <button className="btn-action" onClick={() => navigate(editPath)}>
              {createButtonLabel}
            </button>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    );
  }

  // Organize shifts by day
  const shiftsByDay = DAYS.reduce((acc, d) => ({ ...acc, [d.key]: [] }), {});
  schedule.shifts.forEach((shift) => {
    if (shift.day && shiftsByDay[shift.day]) shiftsByDay[shift.day].push(shift);
  });
  Object.values(shiftsByDay).forEach((list) =>
    list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
  );

  return (
    <div className="schedule-container">
      <div className="schedule-card">
        <h2 className="scheduleTitle">Current Schedule</h2>
        <p className="schedule-subtitle">
          <strong>Valid:</strong>{" "}
          {new Date(schedule.validFrom).toLocaleDateString()} →{" "}
          {new Date(schedule.validTill).toLocaleDateString()}
        </p>

        <div className="days-container">
          {DAYS.map((d) => (
            <div
              key={d.key}
              className={`day-card ${d.key === todayKey ? "today" : ""}`}
            >
              <h3 className="day-title">{d.label}</h3>
              {shiftsByDay[d.key].length === 0 ? (
                <p className="no-shifts">No shifts assigned.</p>
              ) : (
                shiftsByDay[d.key].map((shift, idx) => (
                  <div
                    key={idx}
                    className={`shift-row guard-${
                      shift.userId?._id?.slice(-1) || "x"
                    }`}
                  >
                    <div className="shift-time">
                      {shift.startTime} → {shift.endTime}
                    </div>
                    <div className="shift-guard">
                      {shift.userId?.firstName} {shift.userId?.lastName}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>

        {(canEdit || canCreate) && (
          <button className="btn-action" onClick={() => navigate(editPath)}>
            {canEdit ? "Edit Schedule" : createButtonLabel}
          </button>
        )}
      </div>
    </div>
  );
}