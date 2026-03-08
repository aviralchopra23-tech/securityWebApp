import { useEffect, useMemo, useState } from "react";
import { getOwnerPayPeriodReport } from "../../api/payPeriodApi";
import "../../styles/ownerPayPeriodReports.css";

export default function OwnerPayPeriodReports() {
  const [report, setReport] = useState({ previous: [], current: null, next: null });
  const [error, setError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
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

  const getShiftLocationKey = (locationValue) => {
    if (!locationValue) return "no-location";
    if (typeof locationValue === "object") {
      return String(locationValue._id || locationValue.name || "no-location");
    }
    return String(locationValue);
  };

  const locationOptions = useMemo(() => {
    const optionsMap = new Map();

    const addFromSubmissions = (submissions = []) => {
      submissions.forEach((submission) => {
        (submission.shifts || []).forEach((shift) => {
          const key = getShiftLocationKey(shift.locationId);
          const label = formatShiftLocation(shift.locationId);
          if (!optionsMap.has(key)) {
            optionsMap.set(key, label);
          }
        });
      });
    };

    (report.previous || []).forEach((period) => addFromSubmissions(period.submissions || []));
    addFromSubmissions(report.current?.submissions || []);

    return Array.from(optionsMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [report]);

  const submissionMatchesLocation = (submission) => {
    if (selectedLocation === "all") return true;
    return (submission.shifts || []).some(
      (shift) => getShiftLocationKey(shift.locationId) === selectedLocation
    );
  };

  const filterSubmissionShifts = (submission) => {
    if (selectedLocation === "all") return submission.shifts || [];
    return (submission.shifts || []).filter(
      (shift) => getShiftLocationKey(shift.locationId) === selectedLocation
    );
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

      <div className="owner-filter-row">
        <label htmlFor="owner-location-filter" className="owner-filter-label">Location</label>
        <select
          id="owner-location-filter"
          className="owner-filter-select"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="all">All locations</option>
          {locationOptions.map((loc) => (
            <option key={loc.value} value={loc.value}>{loc.label}</option>
          ))}
        </select>
      </div>

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
            const filteredSubmissions = (p.submissions || []).filter(submissionMatchesLocation);
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
                  ) : filteredSubmissions.length === 0 ? (
                    <p className="no-shifts">No submissions for selected location.</p>
                  ) : (
                    <div className="submitted-scroll">
                      {filteredSubmissions.map((s) => {
                        const submissionKey = `prev-${p.start?.toISOString?.() || idx}-${s._id}`;
                        const isExpanded = expandedSubmissionKey === submissionKey;
                        const visibleShifts = filterSubmissionShifts(s);
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
                            <button
                              type="button"
                              className={`details-toggle ${isExpanded ? "expanded" : ""}`}
                              onClick={() => toggleSubmissionDetails(submissionKey)}
                            >
                              {isExpanded ? "Hide Shifts" : "View Shifts"}
                            </button>
                            {isExpanded && (
                              <div className="details-content">
                                {visibleShifts.length > 0 ? (
                                  visibleShifts.map((sh, idx2) => (
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
                {(report.current.submissions || []).filter(submissionMatchesLocation).length > 0 ? (
                  <div className="submitted-scroll latest-submitted-scroll">
                    {(report.current.submissions || []).filter(submissionMatchesLocation).map((s) => {
                      const submissionKey = `current-${s._id}`;
                      const isExpanded = expandedSubmissionKey === submissionKey;
                      const visibleShifts = filterSubmissionShifts(s);
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
                          <button
                            type="button"
                            className={`details-toggle ${isExpanded ? "expanded" : ""}`}
                            onClick={() => toggleSubmissionDetails(submissionKey)}
                          >
                            {isExpanded ? "Hide Shifts" : "View Shifts"}
                          </button>
                          {isExpanded && (
                            <div className="details-content">
                              {visibleShifts.length > 0 ? (
                                visibleShifts.map((sh, idx2) => (
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
                  <p className="no-shifts">No submissions for selected location.</p>
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