import { useEffect, useState } from "react";
import { getOwnerPayPeriodReport } from "../../api/payPeriodApi";
import "../../styles/ownerPayPeriodReports.css";


export default function OwnerPayPeriodReports() {
  const [submitted, setSubmitted] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await getOwnerPayPeriodReport();
      setSubmitted(data.submitted || []);
      setPendingUsers(data.pendingUsers || []);
    } catch {
      setError("Failed to load pay period reports");
    }
  };

  return (
  <div className="schedule-wrapper owner-no-divider">
    <h2 className="schedule-title">Pay Period Reports</h2>

    {error && <p className="error-text">{error}</p>}

    {/* ================= GRID ================= */}
    <div className="report-grid">

      {/* ===== LEFT: SUBMITTED ===== */}
      <div>
        <h3 className="day-title">Submitted Pay Periods</h3>

        {submitted.length === 0 ? (
          <p className="no-shifts">No submissions yet.</p>
        ) : (
          <div className="submitted-scroll">
          {submitted.map((s, i) => (
            <div key={i} className="day-card">
              <p>
                <strong>User:</strong>{" "}
                {s.userId.firstName} {s.userId.lastName} ({s.userId.role})
              </p>

              <p>
                <strong>Period:</strong>{" "}
                {new Date(s.payPeriodStart).toLocaleDateString()} →{" "}
                {new Date(s.payPeriodEnd).toLocaleDateString()}
              </p>

              <p>
                <strong>Total Hours:</strong> {s.totalHours.toFixed(2)}
              </p>

              <p>
                <strong>Paycheck Collection:</strong>{" "}
                {s.paycheckCollectionLocationId?.name}
              </p>

              <details>
                <summary>View Shifts</summary>
                {s.shifts.map((sh, idx) => (
                  <div key={idx} className="shift-row">
                    <span className="time-badge">
                      {new Date(sh.date).toLocaleDateString()}{" "}
                      {sh.startTime} → {sh.endTime}
                    </span>
                    <span className="guard-name">
                      {sh.hoursWorked.toFixed(2)} hrs
                    </span>
                  </div>
                ))}
              </details>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* ===== RIGHT: PENDING ===== */}
      <div>
        <h3 className="day-title">Pending Submissions</h3>

        {pendingUsers.length === 0 ? (
          <p className="no-shifts">No pending users.</p>
        ) : (
          <div className="pending-card">
            {pendingUsers.map(u => (
              <div key={u._id} className="pending-user">
                {u.firstName} {u.lastName} ({u.role})
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  </div>
);
}