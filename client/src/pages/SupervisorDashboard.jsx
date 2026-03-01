import { useEffect, useMemo, useState } from "react";
import { logout } from "../utils/logout";
import { getGuardsForSupervisorLocation } from "../api/supervisorApi";
import { createWeeklySchedule } from "../api/weeklyScheduleApi";

const DAYS = [
  { key: "MON", label: "MONDAY" },
  { key: "TUE", label: "TUESDAY" },
  { key: "WED", label: "WEDNESDAY" },
  { key: "THU", label: "THURSDAY" },
  { key: "FRI", label: "FRIDAY" },
  { key: "SAT", label: "SATURDAY" },
  { key: "SUN", label: "SUNDAY" }
];

const SHIFT_ROWS = [
  { startTime: "00:00", endTime: "08:00" },
  { startTime: "08:00", endTime: "16:00" },
  { startTime: "16:00", endTime: "00:00" }
];

import { useLocation } from "react-router-dom";

export default function SupervisorDashboard() {
  const location = useLocation();
  const [people, setPeople] = useState([]);
  const [validFrom, setValidFrom] = useState("");
  const [validTill, setValidTill] = useState("");
  const [message, setMessage] = useState("");

  // grid[dayKey][shiftIndex] = userId
  const [grid, setGrid] = useState(() => {
    const obj = {};
    DAYS.forEach(d => {
      obj[d.key] = Array(SHIFT_ROWS.length).fill("");
    });
    return obj;
  });

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const data = await getGuardsForSupervisorLocation();
        setPeople(data);
      } catch (err) {
        console.error("LOAD GUARDS ERROR:", err.response?.data || err.message);
        setMessage(err.response?.data?.message || "Failed to load guards");
      }
    };

    // also load the active schedule so the form reflects whatever is current
    const loadSchedule = async () => {
      try {
        const sched = await getActiveSchedule();
        if (sched) {
          const from = sched.validFrom?.slice(0, 10);
          if (from) setValidFrom(from);
          const till = sched.validTill?.slice(0, 10);
          if (till) setValidTill(till);

          // map shifts into the grid structure
          const gridObj = {};
          DAYS.forEach(d => {
            gridObj[d.key] = Array(SHIFT_ROWS.length).fill("");
          });
          (sched.shifts || []).forEach((s) => {
            const dayKey = s.day;
            // find index by matching startTime/endTime pattern
            const idx = SHIFT_ROWS.findIndex(r => r.startTime === s.startTime && r.endTime === s.endTime);
            if (idx !== -1 && dayKey && gridObj[dayKey]) {
              gridObj[dayKey][idx] = s.userId?._id || "";
            }
          });
          setGrid(gridObj);
        }
      } catch (e) {
        // ignore failures; user can still create
      }
    };

    loadPeople();
    loadSchedule();
  }, []);

  const personOptions = useMemo(() => people, [people]);

  const setCell = (dayKey, shiftIndex, userId) => {
    setGrid(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].map((v, i) =>
        i === shiftIndex ? userId : v
      )
    }));
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
      setMessage("Please select a Valid From date");
      return;
    }

    const shifts = [];

    DAYS.forEach(d => {
      SHIFT_ROWS.forEach((s, idx) => {
        const userId = grid[d.key][idx];
        if (userId) {
          shifts.push({
            day: d.key,
            startTime: s.startTime,
            endTime: s.endTime,
            userId
          });
        }
      });
    });

    if (shifts.length === 0) {
      setMessage("Please assign at least one shift");
      return;
    }

    try {
      await createWeeklySchedule({ validFrom, validTill, shifts });
      setMessage("Schedule saved successfully");
    } catch (e) {
      console.error("Schedule save error:", e.response?.data || e.message || e);
      setMessage(e.response?.data?.message || "Failed to save schedule");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {/* if we navigated here after saving, location.state.savedSchedule may exist */}
      <h2>Supervisor Weekly Shift Schedule</h2>
      <button onClick={logout}>Logout</button>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <div>
          <label>Valid From (Monday): </label>
          <input
            type="date"
            value={validFrom}
            onChange={e => {
              const d = e.target.value;
              setValidFrom(d);
              if (d) {
                const dObj = new Date(d);
                dObj.setDate(dObj.getDate() + 6);
                setValidTill(dObj.toISOString().slice(0, 10));
              }
            }}
          />
        </div>
        <div>
          <label>Valid Till: </label>
          <input
            type="date"
            value={validTill}
            readOnly
          />
        </div>
      </div>
      {canonicalRange && (
        <p style={{ marginTop: 8, fontStyle: "italic" }}>
          Actual week: {canonicalRange.start.toLocaleDateString()} → {canonicalRange.end.toLocaleDateString()}
        </p>
      )}

      <table
        border="1"
        cellPadding="10"
        style={{ marginTop: 16, width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>SHIFT</th>
            {DAYS.map(d => (
              <th key={d.key}>{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHIFT_ROWS.map((shift, shiftIndex) => (
            <tr key={`${shift.startTime}-${shift.endTime}`}>
              <td style={{ fontWeight: "bold" }}>
                {shift.startTime} - {shift.endTime}
              </td>

              {DAYS.map(d => (
                <td key={d.key}>
                  <select
                    value={grid[d.key][shiftIndex]}
                    onChange={e =>
                      setCell(d.key, shiftIndex, e.target.value)
                    }
                    style={{ width: "100%" }}
                  >
                    <option value="">-- Select --</option>
                    {personOptions.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.firstName} {p.lastName} ({p.role})
                      </option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16 }}>
        <button onClick={handleSubmit}>Save Schedule</button>
        {message && <p style={{ marginTop: 10 }}>{message}</p>}
      </div>
    </div>
  );
}
