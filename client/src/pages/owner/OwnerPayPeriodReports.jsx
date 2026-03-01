import { useEffect, useState } from "react";
import { getOwnerPayPeriodReport } from "../../api/payPeriodApi";
import "../../styles/ownerPayPeriodReports.css";

export default function OwnerPayPeriodReports() {
  const [report, setReport] = useState({ previous: [], current: null, next: null });
  const [error, setError] = useState("");
  const [expandedSubmissionKey, setExpandedSubmissionKey] = useState(null);
  const [expandedPreviousPeriodKey, setExpandedPreviousPeriodKey] = useState(null);

  useEffect(() => {
    loadReports();
    const timer = setInterval(loadReports, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const loadReports = async () => {
    try {
      const data = await getOwnerPayPeriodReport();
      setReport(data);
    } catch (err) {
      console.error("Owner report error:", err);
      const msg = err?.message || err?.response?.data?.message || "Failed to load pay period reports";
      setError(msg);
    }
  };

  const formatShiftDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? "N/A"
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatDisplayDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? "N/A"
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatShiftTime = (value) => {
    if (!value) return "--:--";
    if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return String(value);
  };

  const formatShiftLocation = (locationValue) => {
    if (!locationValue) return "No location";
    if (typeof locationValue === "object") {
      return locationValue.name || locationValue._id || "No location";
    }
    return String(locationValue);
  };

  const toggleSubmissionDetails = (submissionKey) => {
    setExpandedSubmissionKey((prev) => (prev === submissionKey ? null : submissionKey));
  };

  const togglePreviousPeriod = (periodKey) => {
    setExpandedPreviousPeriodKey((prev) => (prev === periodKey ? null : periodKey));
  };

  return (
    <div className="schedule-wrapper owner-no-divider">
      <h2 className="schedule-title">Pay Period Dashboard</h2>

      {error && <p className="error-text">{error}</p>}

      {/* previous periods */}
      <div className="period-section">
        <h3 className="day-title">Previous Pay Periods</h3>
        {report.previous.length === 0 ? (
          <p className="no-shifts">No previous pay periods.</p>
        ) : (
          report.previous.map((p, idx) => {
            const periodKey = `previous-${p.start?.toISOString?.() || idx}-${p.end?.toISOString?.() || ""}`;
            const isPeriodExpanded = expandedPreviousPeriodKey === periodKey;
            return (
              <div key={idx} className="period-group">
                <button
                  type="button"
                  className="period-toggle"
                  onClick={() => togglePreviousPeriod(periodKey)}
                >
                  {formatDisplayDate(p.start)} → {formatDisplayDate(p.end)}
                </button>

                {isPeriodExpanded && (
                  p.submissions.length === 0 ? (
                    <p className="no-shifts">No submissions</p>
                  ) : (
                    <div className="submitted-scroll">
                      {p.submissions.map((s) => {
                        const submissionKey = `prev-${p.start?.toISOString?.() || idx}-${s._id}`;
                        const isExpanded = expandedSubmissionKey === submissionKey;
                        return (
                          <div key={s._id} className="day-card">
                            <p>
                              <strong>User:</strong>{" "}
                              {s.userId ? `${s.userId.firstName} ${s.userId.lastName} (${s.userId.role})` : "Deleted User"}
                            </p>
                            <p>
                              <strong>Total Hours:</strong>{" "}
                              {typeof s.totalHours === "number" ? s.totalHours.toFixed(2) : "0.00"}
                            </p>
                            <p>
                              <strong>Paycheck Collection Location:</strong>{" "}
                              {s.paycheckCollectionLocationId?.name || "Not provided"}
                            </p>
                            <button
                              type="button"
                              className={`details-toggle ${isExpanded ? "expanded" : ""}`}
                              onClick={() => toggleSubmissionDetails(submissionKey)}
                            >
                              {isExpanded ? "Hide Shifts" : "View Shifts"}
                            </button>
                            {isExpanded && (
                              <div className="details-content">
                                {s.shifts && s.shifts.length > 0 ? (
                                  s.shifts.map((sh, idx2) => (
                                    <div key={idx2} className="shift-row">
                                      <span className="time-badge">
                                        {formatShiftDate(sh.date)} {formatShiftTime(sh.startTime)} → {formatShiftTime(sh.endTime)}
                                      </span>
                                      <span className="guard-name">
                                        {typeof sh.hoursWorked === "number" ? sh.hoursWorked.toFixed(2) : "0.00"} hrs • {formatShiftLocation(sh.locationId)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="no-shifts">No shift data.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      {/* latest closed period */}
      <div className="period-section">
        <h3 className="day-title">Latest Closed Pay Period</h3>
        {report.current ? (
          <>
            <p className="period-label">
              {formatDisplayDate(report.current.start)} → {formatDisplayDate(report.current.end)}
            </p>

            <div className="latest-closed-layout">
              <div className="latest-submissions-column">
                {report.current.submissions.length > 0 ? (
                  <div className="submitted-scroll latest-submitted-scroll">
                    {report.current.submissions.map((s) => {
                      const submissionKey = `current-${s._id}`;
                      const isExpanded = expandedSubmissionKey === submissionKey;
                      return (
                        <div key={s._id} className="day-card">
                          <p>
                            <strong>User:</strong>{" "}
                            {s.userId ? `${s.userId.firstName} ${s.userId.lastName} (${s.userId.role})` : "Deleted User"}
                          </p>
                          <p>
                            <strong>Total Hours:</strong>{" "}
                            {typeof s.totalHours === "number" ? s.totalHours.toFixed(2) : "0.00"}
                          </p>
                          <p>
                            <strong>Paycheck Collection Location:</strong>{" "}
                            {s.paycheckCollectionLocationId?.name || "Not provided"}
                          </p>
                          <button
                            type="button"
                            className={`details-toggle ${isExpanded ? "expanded" : ""}`}
                            onClick={() => toggleSubmissionDetails(submissionKey)}
                          >
                            {isExpanded ? "Hide Shifts" : "View Shifts"}
                          </button>
                          {isExpanded && (
                            <div className="details-content">
                              {s.shifts && s.shifts.length > 0 ? (
                                s.shifts.map((sh, idx2) => (
                                  <div key={idx2} className="shift-row">
                                    <span className="time-badge">
                                      {formatShiftDate(sh.date)} {formatShiftTime(sh.startTime)} → {formatShiftTime(sh.endTime)}
                                    </span>
                                    <span className="guard-name">
                                      {typeof sh.hoursWorked === "number" ? sh.hoursWorked.toFixed(2) : "0.00"} hrs • {formatShiftLocation(sh.locationId)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="no-shifts">No shift data.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-shifts">No submissions</p>
                )}
              </div>

              <div className="latest-pending-column">
                <div className="pending-card latest-pending-card">
                  {report.current.pending.length > 0 ? (
                    report.current.pending.map((u) => (
                      <div key={u._id} className="pending-user">
                        {u.firstName} {u.lastName} ({u.role})
                      </div>
                    ))
                  ) : (
                    <p className="no-shifts">All users have submitted</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p>Loading current period...</p>
        )}
      </div>
    </div>
  );
}