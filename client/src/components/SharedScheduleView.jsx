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

const GUARD_COLOR_PALETTE = [
  "#b91c1c",
  "#c2410c",
  "#a16207",
  "#0f766e",
  "#0369a1",
  "#1d4ed8",
  "#6d28d9",
  "#be185d",
  "#047857",
  "#7c2d12"
];

function getStableGuardColor(guard) {
  const key = guard?._id || `${guard?.firstName || ""} ${guard?.lastName || ""}`.trim() || "unknown";
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return GUARD_COLOR_PALETTE[hash % GUARD_COLOR_PALETTE.length];
}

export default function SharedScheduleView({
  variant = "",
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
      <div className={`schedule-container ${variant ? `schedule-${variant}` : ""}`.trim()}>
        <div className="schedule-card">
          <div className="schedule-header">
            <h2 className="scheduleTitle">Schedule</h2>
            {(canEdit || canCreate) && (
              <button className="btn-action schedule-top-action" onClick={() => navigate(editPath)}>
                {canEdit ? "Edit Schedule" : createButtonLabel}
              </button>
            )}
          </div>
          <p className="no-schedule-message">{emptyMessage}</p>
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
    <div className={`schedule-container ${variant ? `schedule-${variant}` : ""}`.trim()}>
      <div className="schedule-card">
        <div className="schedule-header">
          <h2 className="scheduleTitle">Schedule</h2>
          {(canEdit || canCreate) && (
            <button className="btn-action schedule-top-action" onClick={() => navigate(editPath)}>
              {canEdit ? "Edit Schedule" : createButtonLabel}
            </button>
          )}
        </div>
        <p className="schedule-subtitle">
          <strong>Valid:</strong>{" "}
          {new Date(schedule.validFrom).toLocaleDateString()} →{" "}
          {new Date(schedule.validTill).toLocaleDateString()}
        </p>

        <div className="days-container">
          {DAYS.map((d) => (
            <div key={d.key} className="day-card">
              <h3 className="day-title">{d.label}</h3>
              {shiftsByDay[d.key].length === 0 ? (
                <p className="no-shifts">No shifts assigned.</p>
              ) : (
                shiftsByDay[d.key].map((shift, idx) => (
                  <div key={idx} className="shift-row" style={{ borderLeftColor: getStableGuardColor(shift.userId) }}>
                    <div className="shift-time">
                      {shift.startTime} → {shift.endTime}
                    </div>
                    <div className="shift-guard" style={{ color: getStableGuardColor(shift.userId) }}>
                      {shift.userId?.firstName} {shift.userId?.lastName}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}