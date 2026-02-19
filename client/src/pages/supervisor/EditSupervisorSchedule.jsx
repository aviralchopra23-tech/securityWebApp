import { useEffect, useMemo, useState } from "react";
import { getGuardsForSupervisorLocation } from "../../api/supervisorApi";
import { createWeeklySchedule } from "../../api/weeklyScheduleApi";
import { useNavigate } from "react-router-dom";
import "../../styles/supervisor.css";

const DAYS = [
  { key: "MON", label: "MONDAY" },
  { key: "TUE", label: "TUESDAY" },
  { key: "WED", label: "WEDNESDAY" },
  { key: "THU", label: "THURSDAY" },
  { key: "FRI", label: "FRIDAY" },
  { key: "SAT", label: "SATURDAY" },
  { key: "SUN", label: "SUNDAY" }
];

export default function EditSupervisorSchedule() {
  const navigate = useNavigate();

  const [people, setPeople] = useState([]);
  const [validFrom, setValidFrom] = useState("");
  const [validTill, setValidTill] = useState("");
  const [message, setMessage] = useState("");

  // dayShifts[dayKey] = [{ startTime, endTime, userId }]
  const [dayShifts, setDayShifts] = useState(() => {
    const obj = {};
    DAYS.forEach(d => (obj[d.key] = []));
    return obj;
  });

  /* ================= LOAD GUARDS ================= */
  useEffect(() => {
    const loadPeople = async () => {
      try {
        const data = await getGuardsForSupervisorLocation();
        setPeople(data);
      } catch {
        setMessage("Failed to load guards");
      }
    };
    loadPeople();
  }, []);

  const personOptions = useMemo(() => people, [people]);

  /* ================= SHIFT ACTIONS ================= */
  const addShift = (dayKey) => {
    setDayShifts(prev => ({
      ...prev,
      [dayKey]: [...prev[dayKey], { startTime: "", endTime: "", userId: "" }]
    }));
  };

  const removeShift = (dayKey, index) => {
    setDayShifts(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].filter((_, i) => i !== index)
    }));
  };

  const updateShift = (dayKey, index, field, value) => {
    setDayShifts(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    }));
  };

  /* ================= SAVE ================= */
  const handleSubmit = async () => {
    setMessage("");

    if (!validFrom || !validTill) {
      setMessage("Please select Valid From and Valid Till");
      return;
    }

    const shifts = [];
    Object.entries(dayShifts).forEach(([day, list]) => {
      list.forEach(s => {
        if (s.startTime && s.endTime && s.userId) {
          shifts.push({
            day,
            startTime: s.startTime,
            endTime: s.endTime,
            userId: s.userId
          });
        }
      });
    });

    if (shifts.length === 0) {
      setMessage("Please add at least one complete shift.");
      return;
    }

    // Validation
    for (const [day, list] of Object.entries(dayShifts)) {
      for (const s of list) {
        const anyFilled = s.startTime || s.endTime || s.userId;
        const allFilled = s.startTime && s.endTime && s.userId;

        if (anyFilled && !allFilled) {
          setMessage(`Incomplete shift on ${day}.`);
          return;
        }

        if (allFilled && s.startTime === s.endTime) {
          setMessage(`Start and End cannot be the same on ${day}.`);
          return;
        }
      }
    }

    try {
      await createWeeklySchedule({
        validFrom,
        validTill,
        shifts
      });
      navigate("/supervisor/schedule");
    } catch (e) {
      setMessage(e?.response?.data?.message || "Failed to save schedule");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="edit-schedule-wrapper">
      <h2 className="edit-title">Edit Weekly Schedule</h2>

      {/* Date Range */}
      <div className="date-row">
        <div className="date-field">
          <label>Valid From</label>
          <input
            type="date"
            value={validFrom}
            onChange={e => setValidFrom(e.target.value)}
          />
        </div>

        <div className="date-field">
          <label>Valid Till</label>
          <input
            type="date"
            value={validTill}
            onChange={e => setValidTill(e.target.value)}
          />
        </div>
      </div>

      {/* Days */}
      {DAYS.map(d => (
        <div key={d.key} className="edit-day-card">
          <div className="edit-day-header">
            <h3>{d.label}</h3>
            <button className="btn-add" onClick={() => addShift(d.key)}>
              + Add Shift
            </button>
          </div>

          {dayShifts[d.key].length === 0 && (
            <p className="no-shifts">No shifts added for this day.</p>
          )}

          {dayShifts[d.key].map((shift, idx) => (
            <div key={idx} className="shift-edit-row">
              <div>
                <label>Start</label>
                <input
                  type="time"
                  value={shift.startTime}
                  onChange={e =>
                    updateShift(d.key, idx, "startTime", e.target.value)
                  }
                />
              </div>

              <div>
                <label>End</label>
                <input
                  type="time"
                  value={shift.endTime}
                  onChange={e =>
                    updateShift(d.key, idx, "endTime", e.target.value)
                  }
                />
              </div>

              <div>
                <label>Guard</label>
                <select
                  value={shift.userId}
                  onChange={e =>
                    updateShift(d.key, idx, "userId", e.target.value)
                  }
                >
                  <option value="">-- Select --</option>
                  {personOptions.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn-remove"
                onClick={() => removeShift(d.key, idx)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ))}

      <button className="btn-save" onClick={handleSubmit}>
        Save Schedule
      </button>

      {message && <p className="error-text">{message}</p>}
    </div>
  );
}
