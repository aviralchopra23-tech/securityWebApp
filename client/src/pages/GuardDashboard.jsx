import { useEffect, useState } from "react";
import { getActiveShiftSchedule } from "../api/shiftScheduleApi";


export default function GuardDashboard() {
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
  const loadSchedule = async () => {
    try {
      const data = await getActiveShiftSchedule();
      setSchedule(data);
    } catch (err) {
      console.error("Failed to load schedule", err);
    }
  };

  loadSchedule();
}, []);


  return (
    <div>
      <h2>Weekly Schedule</h2>

      {!schedule && <p>No active schedule right now.</p>}

      {schedule && (
        <table border="1">
          <thead>
            <tr>
              <th>Day</th>
              <th>Guard</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {schedule.shifts.map((s, i) => (
              <tr key={i}>
                <td>{s.day}</td>
                <td>
                  {s.userId.firstName} {s.userId.lastName}
                </td>
                <td>
                  {s.startTime} - {s.endTime}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
