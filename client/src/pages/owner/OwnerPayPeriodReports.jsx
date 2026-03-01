import { useEffect, useState } from "react";
import { getOwnerPayPeriodReport } from "../../api/payPeriodApi";
import "../../styles/ownerPayPeriodReports.css";

// Displays a dashboard split into three logical sections:
//   • previous pay periods (closed history, each with its submissions)
//   • current pay period (may be before-submission window, open, or already
//     receiving submissions; pending users listed separately)
//   • upcoming pay period (just the date range, used for messaging)
//
// The component polls the server once a minute so that the display flips
// automatically when the system clock crosses a 1st/16th boundary or when
// guards submit their time sheets.  All date calculations are performed on the
// backend; the client merely converts received ISO strings into `Date`
// objects and renders accordingly.

export default function OwnerPayPeriodReports() {
  const [report, setReport] = useState({ previous: [], current: null, next: null });
  const [error, setError] = useState("");
  const [expandedSubmissionKey, setExpandedSubmissionKey] = useState(null);
  const [expandedPreviousPeriodKey, setExpandedPreviousPeriodKey] = useState(null);

  useEffect(() => {
    loadReports();
    // refresh every minute in case date crosses a boundary or submissions arrive
    const timer = setInterval(loadReports, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const loadReports = async () => {
    try {
      const data = await getOwnerPayPeriodReport();
      setReport(data);
    } catch (err) {
      console.error("Owner report error:", err);
      const msg =
        err?.message || err?.response?.data?.message ||
        "Failed to load pay period reports";
      setError(msg);
    }
  };

  const formatShiftDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
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
    setExpandedSubmissionKey((prev) =>
      prev === submissionKey ? null : submissionKey
    );
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
          report.previous.map((p, idx) => (
            <div key={idx} className="period-group">
              {(() => {
                const periodKey = `previous-${p.start?.toISOString?.() || idx}-${p.end?.toISOString?.() || ""}`;
                const isPeriodExpanded = expandedPreviousPeriodKey === periodKey;
                return (
                  <>
                    <button
                      type="button"
                      className="period-toggle"
                      onClick={() => togglePreviousPeriod(periodKey)}
                    >
                      {p.start.toLocaleDateString()} → {p.end.toLocaleDateString()}
                    </button>

                    {isPeriodExpanded && (
                      p.submissions.length === 0 ? (
                        <p className="no-shifts">No submissions</p>
                      ) : (
                        <div className="submitted-scroll">
                          {p.submissions.map((s) => (
                    <div key={s._id} className="day-card">
                      {(() => {
                        const submissionKey = `prev-${p.start?.toISOString?.() || idx}-${s._id}`;
                        const isExpanded = expandedSubmissionKey === submissionKey;
                        return (
                          <>
                      <p>
                        <strong>User:</strong> {s.userId
                          ? `${s.userId.firstName} ${s.userId.lastName} (${s.userId.role})`
                          : "Deleted User"}
                      </p>
                      <p>
                        <strong>Total Hours:</strong>{" "}
                        {typeof s.totalHours === "number"
                          ? s.totalHours.toFixed(2)
                          : "0.00"}
                      </p>
                      <p>
                        <strong>Paycheck Collection Location:</strong>{" "}
                        {s.paycheckCollectionLocationId?.name || "Not provided"}
                      </p>
                      <button
                        type="button"
                        className="details-toggle"
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
                                {typeof sh.hoursWorked === "number"
                                  ? sh.hoursWorked.toFixed(2)
                                  : "0.00"}{" "}
                                hrs • {formatShiftLocation(sh.locationId)}
                              </span>
                            </div>
                          ))
                          ) : (
                            <p className="no-shifts">No shift data.</p>
                          )}
                        </div>
                      )}
                          </>
                        );
                      })()}
                    </div>
                          ))}
                        </div>
                      )
                    )}
                  </>
                );
              })()}
            </div>
          ))
        )}
      </div>

      {/* latest closed period (review + pending) */}
      <div className="period-section">
        <h3 className="day-title">Latest Closed Pay Period</h3>
        {report.current ? (
          <>
            <p className="period-label">
              {report.current.start.toLocaleDateString()} → {report.current.end.toLocaleDateString()}
            </p>

            {report.current.submissions.length > 0 && (
              <div className="submitted-scroll">
                {report.current.submissions.map((s) => (
                  <div key={s._id} className="day-card">
                    {(() => {
                      const submissionKey = `current-${s._id}`;
                      const isExpanded = expandedSubmissionKey === submissionKey;
                      return (
                        <>
                    <p>
                      <strong>User:</strong> {s.userId
                        ? `${s.userId.firstName} ${s.userId.lastName} (${s.userId.role})`
                        : "Deleted User"}
                    </p>
                    <p>
                      <strong>Total Hours:</strong>{" "}
                      {typeof s.totalHours === "number"
                        ? s.totalHours.toFixed(2)
                        : "0.00"}
                    </p>
                    <p>
                      <strong>Paycheck Collection Location:</strong>{" "}
                      {s.paycheckCollectionLocationId?.name || "Not provided"}
                    </p>
                    <button
                      type="button"
                      className="details-toggle"
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
                              {typeof sh.hoursWorked === "number"
                                ? sh.hoursWorked.toFixed(2)
                                : "0.00"}{" "}
                              hrs • {formatShiftLocation(sh.locationId)}
                            </span>
                          </div>
                        ))
                        ) : (
                          <p className="no-shifts">No shift data.</p>
                        )}
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            {report.current.pending.length > 0 ? (
              <div className="pending-card">
                {report.current.pending.map((u) => (
                  <div key={u._id} className="pending-user">
                    {u.firstName} {u.lastName} ({u.role})
                  </div>
                ))}
              </div>
            ) : (
              <p>All users have submitted</p>
            )}
          </>
        ) : (
          <p>Loading current period...</p>
        )}
      </div>
    </div>
  );
}