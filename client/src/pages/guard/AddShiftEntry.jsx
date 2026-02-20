// src/pages/guard/AddShiftEntry.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { getUserRoleFromToken } from "../../utils/auth";
import usePayPeriodStatus from "../../hooks/usePayPeriodStatus";
import { calculateCurrentPayPeriod } from "../../api/payPeriodApi";

import "../../styles/addShift.css";
import "../../styles/ui-feedback.css";

export default function AddShiftEntry({ onShiftAdded }) {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const role = getUserRoleFromToken();

  const {
    prevUnsubmitted,
    prevPayPeriod,
    currentSubmitted,
    loading: statusLoading,
    error: statusError,
    refreshStatus,
  } = usePayPeriodStatus();

  const canAddShift = role === "GUARD" || role === "SUPERVISOR";
  const isDisabled = !canAddShift;

  useEffect(() => {
    async function loadLocations() {
      setLoadingLocations(true);
      setError("");

      try {
        // If this endpoint is OWNER-only, you must expose a guard-friendly endpoint.
        const res = await api.get("/locations");
        const list = Array.isArray(res.data) ? res.data : [];
        setLocations(list);

        if (list.length === 1) setLocationId(list[0]._id);
      } catch (err) {
        console.error("Failed to load locations:", err);
        setError(err.response?.data?.message || err.message || "Failed to load locations");
      } finally {
        setLoadingLocations(false);
      }
    }

    loadLocations();
  }, []);

  const selectedLocationName =
    locations.find((l) => String(l._id) === String(locationId))?.name || "";

  // determine whether we should show the previous-paywarning message
  const showPrevWarning = useMemo(() => {
    if (!canAddShift || !prevUnsubmitted || !prevPayPeriod || !startDateTime) return false;
    const start = new Date(startDateTime);
    if (isNaN(start.getTime())) return false;
    const { payPeriodStart: shiftPPStart } = calculateCurrentPayPeriod(start);
    // warning only when shift falls in a newer period than the pending one
    return shiftPPStart.getTime() > prevPayPeriod.payPeriodEnd.getTime();
  }, [canAddShift, prevUnsubmitted, prevPayPeriod, startDateTime]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!canAddShift) {
      setError("Only GUARD or SUPERVISOR users can add shift entries.");
      return;
    }

    if (!locationId || !startDateTime || !endDateTime) {
      setError("All fields are required");
      return;
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Invalid date/time");
      return;
    }

    if (start >= end) {
      setError("Start time must be before end time");
      return;
    }

    // if there's a pending previous pay period, only allow shifts that fall
    // within or before that period.  (Once the period is submitted the server
    // will update status and we can proceed normally.)
    if (prevUnsubmitted && prevPayPeriod) {
      // determine which pay period the proposed start belongs to
      const { payPeriodStart: shiftPPStart } = calculateCurrentPayPeriod(start);
      if (shiftPPStart.getTime() > prevPayPeriod.payPeriodEnd.getTime()) {
        setError(
          `⚠ You must submit the previous pay period (${prevPayPeriod.payPeriodStart.toLocaleDateString()} – ${prevPayPeriod.payPeriodEnd.toLocaleDateString()}) before adding shifts for a new period.`
        );
        return;
      }
    }

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setError("");
    setSuccess("");

    try {
      // datetime-local is local time; toISOString converts to UTC instant
      const startIso = new Date(startDateTime).toISOString();
      const endIso = new Date(endDateTime).toISOString();

      await api.post("/guards/shifts", {
        locationId,
        startDateTime: startIso,
        endDateTime: endIso,
      });

      setSuccess("✅ Shift entry added successfully");
      setStartDateTime("");
      setEndDateTime("");

      refreshStatus();
      if (onShiftAdded) onShiftAdded();
    } catch (err) {
      console.error("Create shift error:", err);
      const data = err?.response?.data || {};
      let msg =
        data.message ||
        data.error ||
        err?.message ||
        "Failed to add shift";

      // backend may send pendingPayPeriod to allow nicer formatting
      if (data.pendingPayPeriod) {
        const start = new Date(data.pendingPayPeriod.payPeriodStart).toLocaleDateString();
        const end = new Date(data.pendingPayPeriod.payPeriodEnd).toLocaleDateString();
        msg = `⚠ Submit pay period ${start} – ${end} before adding shifts for a new period.`;
      }

      if (err.response?.status === 403) {
        // pay period lock should be treated as a warning rather than generic error
        msg = msg || "⚠ Please submit the previous pay period before adding shifts for a new one.";
      }

      setError(msg);
    }
  };

  if (statusLoading || loadingLocations) return <p>Loading...</p>;
  if (statusError) return <p className="error-text">{statusError}</p>;

  return (
    <div className="schedule-wrapper">
      <h2 className="schedule-title" style={{ color: "#4e0505" }}>
        Add Shift
      </h2>

      {!canAddShift && (
        <p className="error-text">
          ⛔ You are logged in as <strong>{role}</strong>. Only{" "}
          <strong>GUARD</strong> or <strong>SUPERVISOR</strong> can add shifts.
        </p>
      )}

      {canAddShift && showPrevWarning && (
        <p className="error-text">
          ⚠ You have unsubmitted shifts for the previous pay period (
          <strong>
            {prevPayPeriod.payPeriodStart.toLocaleDateString()} –{' '}
            {prevPayPeriod.payPeriodEnd.toLocaleDateString()}
          </strong>
          ). You may add or correct any entries within that range, but you must
          submit it before adding shifts for a new period.
        </p>
      )}

      {currentSubmitted && (
        <p className="success-text">
          ✅ Current pay period is submitted. (You can still add missing shifts
          for an older unsubmitted pay period if needed.)
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <label>
          Location
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={isDisabled}
          >
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Start Date &amp; Time
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => {
              setStartDateTime(e.target.value);
              setError(""); // clear previous warning/error when user modifies date
            }}
            disabled={isDisabled}
          />
        </label>

        <label>
          End Date &amp; Time
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => {
              setEndDateTime(e.target.value);
              setError(""); // clear on change, avoiding stale message
            }}
            disabled={isDisabled}
          />
        </label>

        <button className="btn-primary" type="submit" disabled={isDisabled}>
          Add Shift
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      {showConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm Shift Entry</h3>
            <p>Please confirm the details are correct:</p>

            <ul>
              <li>
                <strong>Location:</strong> {selectedLocationName || "(not selected)"}
              </li>
              <li>
                <strong>Start:</strong>{" "}
                {startDateTime ? new Date(startDateTime).toLocaleString() : "-"}
              </li>
              <li>
                <strong>End:</strong>{" "}
                {endDateTime ? new Date(endDateTime).toLocaleString() : "-"}
              </li>
            </ul>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={confirmSubmit}>
                Confirm Add Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}