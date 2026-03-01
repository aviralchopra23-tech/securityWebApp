import { useEffect, useMemo, useState } from "react";
import { getGuardsForSupervisorLocation } from "../../api/supervisorApi";
import { createWeeklySchedule, getActiveSchedule } from "../../api/weeklyScheduleApi";
import { useNavigate } from "react-router-dom";

import "../../styles/editSchedule.css";

const DAYS = [
  { key: "MON", label: "MONDAY" },
  { key: "TUE", label: "TUESDAY" },
  { key: "WED", label: "WEDNESDAY" },
  { key: "THU", label: "THURSDAY" },
  { key: "FRI", label: "FRIDAY" },
  { key: "SAT", label: "SATURDAY" },
  { key: "SUN", label: "SUNDAY" },
];

export default function EditSupervisorSchedule() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [validFrom, setValidFrom] = useState("");
  const [validTill, setValidTill] = useState("");
  const [message, setMessage] = useState("");
  const [dayShifts, setDayShifts] = useState(() => {
    const obj = {};
    DAYS.forEach((d) => (obj[d.key] = []));
    return obj;
  });
  const [editingExisting, setEditingExisting] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      try {
        const data = await getGuardsForSupervisorLocation();
        setPeople(data);
      } catch {
        setMessage("Failed to load guards");
      }

      // if editing existing schedule, prepopulate fields
      try {
        const sched = await getActiveSchedule();
        if (sched) {
          // ISO date strings (yyyy-mm-dd)
          const from = sched.validFrom?.slice(0, 10);
          const till = sched.validTill?.slice(0, 10);
          if (from) setValidFrom(from);
          if (till) setValidTill(till);

          // build dayShifts object
          const obj = {};
          DAYS.forEach(d => (obj[d.key] = []));
          (sched.shifts || []).forEach(s => {
            if (obj[s.day]) {
              obj[s.day].push({
                startTime: s.startTime || "",
                endTime: s.endTime || "",
                userId: s.userId?._id || ""
              });
            }
          });
          setDayShifts(obj);
        }
      } catch (e) {
        // ignore if no schedule or error
      }
    };
    loadInit();
  }, []);

  const personOptions = useMemo(() => people, [people]);

  const addShift = (dayKey) => {
    setDayShifts((prev) => ({
      ...prev,
      [dayKey]: [...prev[dayKey], { startTime: "", endTime: "", userId: "" }],
    }));
  };

  const removeShift = (dayKey, index) => {
    setDayShifts((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].filter((_, i) => i !== index),
    }));
  };

  const updateShift = (dayKey, index, field, value) => {
    setDayShifts((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const validateShifts = () => {
    for (const [day, list] of Object.entries(dayShifts)) {
      for (const s of list) {
        const anyFilled = s.startTime || s.endTime || s.userId;
        const allFilled = s.startTime && s.endTime && s.userId;

        if (anyFilled && !allFilled) return `Incomplete shift on ${day}.`;
        if (allFilled && s.startTime === s.endTime) return `Start and End cannot be the same on ${day}.`;
      }
    }
    return null;
  };

  const canonicalRange = useMemo(() => {
    if (!validFrom) return null;
    const d = new Date(validFrom);
    const dow = d.getDay();
    const offset = (dow + 6) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }, [validFrom]);

  const handleSubmit = async () => {
    setMessage("");

    if (!validFrom) {
      setMessage("Please select Valid From");
      return;
    }

    // optionally ensure validFrom is Monday
    const dow = new Date(validFrom).getDay();
    if (dow !== 1) {
      setMessage("Valid From was adjusted to the week start date automatically.");
      // we will still proceed because server will normalize
    }

    const shifts = Object.entries(dayShifts).flatMap(([day, list]) =>
      list.filter((s) => s.startTime && s.endTime && s.userId).map((s) => ({ day, ...s }))
    );

    if (shifts.length === 0) {
      setMessage("Please add at least one complete shift.");
      return;
    }

    const validationError = validateShifts();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      // server will canonicalize the date range; we supply what user chose for
      // convenience but the backend ultimately uses a Monday‑to‑Sunday window
      const saved = await createWeeklySchedule({ validFrom, validTill, shifts });
      // navigate back and hand the saved document over so the list can update
      navigate("/supervisor/schedule", { state: { savedSchedule: saved } });
    } catch (e) {
      setMessage(e?.response?.data?.message || "Failed to save schedule");
    }
  };

  return (
    <div className="edit-schedule-container">
      <div className="edit-schedule-card">
        <h2 className="edit-title">Edit Weekly Schedule</h2>

        <div className="date-row">
          <div className="date-field">
            <label>Valid From</label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => {
                if (editingExisting) return; // prevent change when editing
                const d = e.target.value;
                setValidFrom(d);
                // auto compute till = from +6 days
                if (d) {
                  const dObj = new Date(d);
                  dObj.setDate(dObj.getDate() + 6);
                  const iso = dObj.toISOString().slice(0, 10);
                  setValidTill(iso);
                }
              }}
              disabled={editingExisting}
            />
          </div>
          <div className="date-field">
            <label>Valid Till</label>
            <input
              type="date"
              value={validTill}
              onChange={(e) => setValidTill(e.target.value)}
              disabled
            />
          </div>
        </div>
        {DAYS.map((d) => (
          <div key={d.key} className="day-card">
            <div className="day-header">
              <h3>{d.label}</h3>
              <button className="btn-add" onClick={() => addShift(d.key)}>
                + Add Shift
              </button>
            </div>

            <div className="shift-list">
              {dayShifts[d.key].length === 0 && <p className="no-shifts">No shifts added for this day.</p>}
              {dayShifts[d.key].map((shift, idx) => (
                <div key={idx} className="shift-row">
                  <div className="shift-input">
                    <label>Start</label>
                    <input type="time" value={shift.startTime} onChange={(e) => updateShift(d.key, idx, "startTime", e.target.value)} />
                  </div>
                  <div className="shift-input">
                    <label>End</label>
                    <input type="time" value={shift.endTime} onChange={(e) => updateShift(d.key, idx, "endTime", e.target.value)} />
                  </div>
                  <div className="shift-input">
                    <label>Guard</label>
                    <select value={shift.userId} onChange={(e) => updateShift(d.key, idx, "userId", e.target.value)}>
                      <option value="">-- Select --</option>
                      {personOptions.map((p) => (
                        <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn-remove"
                    onClick={() => removeShift(d.key, idx)}
                    aria-label="Remove shift"
                    title="Remove shift"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="btn-save" onClick={handleSubmit}>Save Schedule</button>
        {message && <p className="error-text">{message}</p>}
      </div>
    </div>
  );
}