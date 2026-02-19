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

export default function SupervisorDashboard() {
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
    loadPeople();
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

  const handleSubmit = async () => {
    setMessage("");

    if (!validFrom || !validTill) {
      setMessage("Please select Valid From and Valid Till");
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
      setMessage("Failed to save schedule");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Supervisor Weekly Shift Schedule</h2>
      <button onClick={logout}>Logout</button>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <div>
          <label>Valid From: </label>
          <input
            type="date"
            value={validFrom}
            onChange={e => setValidFrom(e.target.value)}
          />
        </div>
        <div>
          <label>Valid Till: </label>
          <input
            type="date"
            value={validTill}
            onChange={e => setValidTill(e.target.value)}
          />
        </div>
      </div>

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
