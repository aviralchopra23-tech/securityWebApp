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
      setSubmitted(data?.submitted || []);
      setPendingUsers(data?.pendingUsers || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load pay period reports");
    }
  };

  return (
    <div className="schedule-wrapper owner-no-divider">
      <h2 className="schedule-title">Pay Period Reports</h2>

      {error && <p className="error-text">{error}</p>}

      <div className="report-grid">
        {/* ================= LEFT: SUBMITTED ================= */}
        <div>
          <h3 className="day-title">Submitted Pay Periods</h3>

          {submitted.length === 0 ? (
            <p className="no-shifts">No submissions yet.</p>
          ) : (
            <div className="submitted-scroll">
              {submitted.map((s) => (
                <div key={s._id} className="day-card">
                  <p>
                    <strong>User:</strong>{" "}
                    {s.userId
                      ? `${s.userId.firstName} ${s.userId.lastName} (${s.userId.role})`
                      : "Deleted User"}
                  </p>

                  <p>
                    <strong>Period:</strong>{" "}
                    {s.payPeriodStart
                      ? new Date(s.payPeriodStart).toLocaleDateString()
                      : "N/A"}{" "}
                    →{" "}
                    {s.payPeriodEnd
                      ? new Date(s.payPeriodEnd).toLocaleDateString()
                      : "N/A"}
                  </p>

                  <p>
                    <strong>Total Hours:</strong>{" "}
                    {typeof s.totalHours === "number"
                      ? s.totalHours.toFixed(2)
                      : "0.00"}
                  </p>

                  <p>
                    <strong>Paycheck Collection:</strong>{" "}
                    {s.paycheckCollectionLocationId?.name || "N/A"}
                  </p>

                  <details>
                    <summary>View Shifts</summary>

                    {s.shifts && s.shifts.length > 0 ? (
                      s.shifts.map((sh, idx) => (
                        <div key={idx} className="shift-row">
                          <span className="time-badge">
                            {sh.date
                              ? new Date(sh.date).toLocaleDateString()
                              : "N/A"}{" "}
                            {sh.startTime || "--:--"} →{" "}
                            {sh.endTime || "--:--"}
                          </span>
                          <span className="guard-name">
                            {typeof sh.hoursWorked === "number"
                              ? sh.hoursWorked.toFixed(2)
                              : "0.00"}{" "}
                            hrs
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="no-shifts">No shift data.</p>
                    )}
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= RIGHT: PENDING ================= */}
        <div>
          <h3 className="day-title">Pending Submissions</h3>

          {pendingUsers.length === 0 ? (
            <p className="no-shifts">No pending users.</p>
          ) : (
            <div className="pending-card">
              {pendingUsers.map((u) => (
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