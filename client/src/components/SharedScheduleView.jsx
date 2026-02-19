import { useEffect, useState } from "react";
import { getActiveSchedule } from "../api/weeklyScheduleApi";
import { useNavigate } from "react-router-dom";
import "../styles/supervisor.css";
import "../styles/ui-feedback.css";
import "../styles/schedule.css";
import "../styles/ui-buttons.css";

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
  editPath = ""
}) {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await getActiveSchedule();
        setSchedule(data);
      } catch {
        setError("Failed to load schedule");
      }
    };
    loadSchedule();
  }, []);

  if (!schedule) {
    return (
      <div className="schedule-wrapper">
        <h2 className="schedule-title">Schedule</h2>
        <p className="schedule-subtitle">
          No active or upcoming schedule found.
        </p>

        {canCreate && (
          <button
            className="btn-primary"
            onClick={() => navigate(editPath)}
          >
            Create Schedule
          </button>
        )}

        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  const shiftsByDay = {};
  DAYS.forEach(d => (shiftsByDay[d.key] = []));

  schedule.shifts.forEach(shift => {
    if (shiftsByDay[shift.day]) {
      shiftsByDay[shift.day].push(shift);
    }
  });

  Object.values(shiftsByDay).forEach(list =>
    list.sort((a, b) => a.startTime.localeCompare(b.startTime))
  );

  return (
    <div className="schedule-wrapper">
      <h2 className="schedule-title">Current Schedule</h2>

      <p className="schedule-subtitle">
        <strong>Valid:</strong>{" "}
        {new Date(schedule.validFrom).toLocaleDateString()} →{" "}
        {new Date(schedule.validTill).toLocaleDateString()}
      </p>

      {DAYS.map(d => (
        <div key={d.key} className="day-card compact">
          <h3 className="day-title">{d.label}</h3>

          {shiftsByDay[d.key].length === 0 ? (
            <p className="no-shifts">No shifts assigned.</p>
          ) : (
            shiftsByDay[d.key].map((shift, idx) => (
              <div
                key={idx}
                className={`shift-row compact-row guard-${shift.userId?._id?.slice(-1) || "x"}`}
              >
                <div className="shift-input">
                  {shift.startTime} → {shift.endTime}
                </div>

                <div className="shift-input guard-input">
                  {shift.userId?.firstName} {shift.userId?.lastName}
                </div>
              </div>
            ))
          )}
        </div>
      ))}

      {canEdit && (
        <button
          className="btn-secondary"
          style={{ width: "180px" }}
          onClick={() => navigate(editPath)}
        >
          Edit Schedule
        </button>
      )}
    </div>
  );
}
