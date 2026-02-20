// src/pages/guard/GuardPayPeriods.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getShiftsForPayPeriod,
  submitPayPeriod,
  updateShiftEntry,
  deleteShiftEntry,
  calculateCurrentPayPeriod,
  getPrevPayPeriod
} from "../../api/payPeriodApi";
import api from "../../api/axios";
import usePayPeriodStatus, { advancePayPeriod } from "../../hooks/usePayPeriodStatus";

import "../../styles/schedule.css";
import "../../styles/ui-buttons.css";
import "../../styles/ui-feedback.css";

export default function GuardPayPeriods() {
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [collectionLocation, setCollectionLocation] = useState("");

  const [editingShift, setEditingShift] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ FIX: correct names from hook
  const {
    prevUnsubmitted,
    prevPayPeriod,
    currentSubmitted,
    currentPayPeriod,
    activePayPeriod,
    loading,
    error: statusError,
    refreshStatus
  } = usePayPeriodStatus();

  // Work from the *active* pay period returned by the status hook.  The
  // backend now advances activePayPeriod to the next interval immediately
  // after a submission, so the UI will jump forward as well.
  const effectivePayPeriod = useMemo(() => {
    if (!activePayPeriod?.payPeriodStart || !activePayPeriod?.payPeriodEnd) return null;
    return activePayPeriod;
  }, [activePayPeriod]);

  // Is the period we are showing already submitted?  This is true only when
  // the active period matches the backend's "current" period *and*
  // `currentSubmitted` is true.  After a submission the active period moves
  // forward, so displayedSubmitted becomes false automatically.
  const displayedSubmitted = useMemo(() => {
    if (!effectivePayPeriod) return false;
    if (!currentPayPeriod) return false;
    const samePeriod =
      effectivePayPeriod.payPeriodStart.getTime() ===
        new Date(currentPayPeriod.payPeriodStart).getTime() &&
      effectivePayPeriod.payPeriodEnd.getTime() ===
        new Date(currentPayPeriod.payPeriodEnd).getTime();
    return samePeriod && Boolean(currentSubmitted);
  }, [effectivePayPeriod, currentPayPeriod, currentSubmitted]);

  /**
   * Disable editing + submission only if displayed pay period is submitted.
   * (Option 1: never block user just because there exists an unsubmitted previous period;
   * instead we switch UI to that previous period.)
   */
  // Disable editing/submission once the displayed period has been submitted.
  const isDisabled = displayedSubmitted;

  // A previous pay period is editable/submit-able only when it has become
  // "pending" (i.e. the date moved into the next interval).
  const canSubmit = prevUnsubmitted && shifts.length > 0;

  /* ================================
     Helper: convert to datetime-local
  ================================= */
  const toDateTimeLocal = (dateStr) => {
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  /* ================================
     Load Shifts & Locations
  ================================= */
  useEffect(() => {
    if (!effectivePayPeriod) return;

    const loadData = async () => {
      setError("");
      setSuccess("");

      try {
        // ✅ FIX: call function with correct signature
        // Backend resolves pay period based on date; use effectivePayPeriod.start as date anchor
        const data = await getShiftsForPayPeriod({
          date: effectivePayPeriod.payPeriodStart
        });

        setShifts(data.shifts || []);

        const locRes = await api.get("/locations");
        setLocations(Array.isArray(locRes.data) ? locRes.data : []);
      } catch (err) {
        console.error("Failed to load pay period data:", err);
        setError(err.response?.data?.message || err.message || "Failed to load pay period data");
      }
    };

    loadData();
  }, [effectivePayPeriod]);

  /* ================================
     Submit Pay Period (Option 1)
  ================================= */
  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!collectionLocation) {
      setError("Please select a paycheck collection location.");
      return;
    }

    try {
      /**
       * ✅ IMPORTANT:
       * Our fixed submitPayPeriod() now submits PREVIOUS by default.
       * But in this screen, we already decided which pay period is being shown:
       * - If prevUnsubmitted -> showing previous -> submit previous (default works)
       * - Else showing current -> submit current (we pass target: "current")
       */
      const target = prevUnsubmitted ? "previous" : "current";

      await submitPayPeriod({
        paycheckCollectionLocationId: collectionLocation,
        date: new Date(), // reference date for calculating current/previous
        target
      });

      setSuccess("✅ Pay period submitted successfully.");
      setShowSubmitConfirm(false);
      setCollectionLocation("");

      // Refresh status and reload shifts
      await refreshStatus();

      // Reload shifts after submit (they will now be locked / empty if submitted)
      const data = await getShiftsForPayPeriod({
        date: effectivePayPeriod?.payPeriodStart || new Date()
      });
      setShifts(data.shifts || []);
    } catch (err) {
      console.error("Submission failed:", err);
      const msg = err.response?.data?.message || err.message || "Submission failed";
      setError(msg);
      // keep modal open while showing the error
    }
  };

  /* ================================
     Update Shift
  ================================= */
  const handleUpdateShift = async () => {
    if (!editingShift) return;
    setError("");
    setSuccess("");

    if (new Date(editingShift.startDateTime) >= new Date(editingShift.endDateTime)) {
      setError("Start time must be before end time");
      return;
    }

    try {
      await updateShiftEntry(editingShift._id, {
        locationId: editingShift.locationId?._id || editingShift.locationId,
        startDateTime: editingShift.startDateTime,
        endDateTime: editingShift.endDateTime
      });

      // Update list locally (simple optimistic update)
      setShifts((prev) =>
        prev.map((s) => (s._id === editingShift._id ? { ...s, ...editingShift } : s))
      );

      setEditingShift(null);
      setSuccess("✅ Shift updated successfully");
    } catch (err) {
      console.error("Update failed:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Update failed (check that backend has PUT /payperiod/shifts/:id)"
      );
    }
  };

  /* ================================
     Delete Shift
  ================================= */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setError("");
    setSuccess("");

    try {
      await deleteShiftEntry(deleteTarget._id);
      setShifts((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      setDeleteTarget(null);
      setSuccess("✅ Shift deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Delete failed (check that backend has DELETE /payperiod/shifts/:id)"
      );
    }
  };

  /* ================================
     Format shift for display
  ================================= */
  const formatShiftLine = (shift) => {
    const date = new Date(shift.startDateTime).toLocaleDateString();
    const start = new Date(shift.startDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const end = new Date(shift.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${date} ${start}–${end} — ${shift.locationId?.name || ""}`;
  };

  if (loading || !effectivePayPeriod) return <p>Loading...</p>;
  if (statusError) return <p className="error-text">{statusError}</p>;

  const ppStartLabel = new Date(effectivePayPeriod.payPeriodStart).toLocaleDateString();
  const ppEndLabel = new Date(effectivePayPeriod.payPeriodEnd).toLocaleDateString();

  return (
    <div className="schedule-wrapper">
      <h2 className="schedule-title">
        Pay Period{" "}
        {displayedSubmitted && <span className="status-badge submitted">Submitted</span>}
        {!displayedSubmitted && <span className="status-badge">Open</span>}
      </h2>

      {/* ✅ Option 1: explain what user is seeing */}
      {prevUnsubmitted && prevPayPeriod && (
        <p className="error-text">
          ⚠ You have unsubmitted shifts for the previous pay period (
          <strong>
            {prevPayPeriod.payPeriodStart.toLocaleDateString()} –{' '}
            {prevPayPeriod.payPeriodEnd.toLocaleDateString()}
          </strong>
          ). You may only add or modify entries up through that range; attempts to add
          new shifts in the current or later pay period will be rejected until the
          prior period is submitted.
        </p>
      )}

      <p className="schedule-subtitle">
        <strong>Period:</strong> {ppStartLabel} → {ppEndLabel}
      </p>

      {shifts.length === 0 ? (
        <p className="no-shifts">No shifts entered for this period.</p>
      ) : (
        shifts.map((s) => (
          <div key={s._id} className="shift-row">
            <span className="time-badge">
              {new Date(s.startDateTime).toLocaleString()} → {new Date(s.endDateTime).toLocaleString()}
            </span>
            <span className="guard-name">{s.locationId?.name || ""}</span>

            {!isDisabled && (
              <div className="shift-actions">
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setEditingShift({
                      ...s,
                      startDateTime: toDateTimeLocal(s.startDateTime),
                      endDateTime: toDateTimeLocal(s.endDateTime)
                    })
                  }
                >
                  Edit
                </button>
                <button className="btn-danger" onClick={() => setDeleteTarget(s)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* Paycheck Collection Location */}
      <div style={{ marginTop: "20px" }}>
        <label>
          Paycheck Collection Location
          <select
            value={collectionLocation}
            onChange={(e) => setCollectionLocation(e.target.value)}
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
      </div>

      {/* Submit Button */}
      <button
        className="btn-primary"
        onClick={() => setShowSubmitConfirm(true)}
        disabled={!canSubmit}
      >
        Submit Pay Period
      </button>

      {displayedSubmitted && (
        <p className="info-text">🔒 This pay period has been submitted and is locked.</p>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      {/* ================= SUBMIT CONFIRM MODAL ================= */}
      {showSubmitConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm Pay Period Submission</h3>
            {error && <p className="error-text">{error}</p>}
            <p>
              <strong>Pay Period:</strong> {ppStartLabel} → {ppEndLabel}
            </p>
            <hr />
            <strong>Shifts:</strong>
            <ul className="confirm-shift-list">
              {shifts.map((s) => (
                <li key={s._id}>{formatShiftLine(s)}</li>
              ))}
            </ul>
            <p className="warning-text">⚠ Submitting will lock all shifts for this pay period.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSubmitConfirm(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT SHIFT MODAL ================= */}
      {editingShift && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Edit Shift</h3>

            <label>
              Location
              <select
                value={editingShift.locationId?._id || editingShift.locationId}
                onChange={(e) =>
                  setEditingShift({
                    ...editingShift,
                    locationId: { ...(editingShift.locationId || {}), _id: e.target.value }
                  })
                }
              >
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Start
              <input
                type="datetime-local"
                value={editingShift.startDateTime}
                onChange={(e) => setEditingShift({ ...editingShift, startDateTime: e.target.value })}
              />
            </label>

            <label>
              End
              <input
                type="datetime-local"
                value={editingShift.endDateTime}
                onChange={(e) => setEditingShift({ ...editingShift, endDateTime: e.target.value })}
              />
            </label>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingShift(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateShift}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Delete Shift</h3>
            <p>Are you sure you want to delete this shift?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}