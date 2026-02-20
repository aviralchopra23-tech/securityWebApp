import { useEffect, useState, useMemo } from "react";
import { getShiftsForPayPeriod, submitPayPeriod, updateShiftEntry, deleteShiftEntry } from "../../api/payPeriodApi";
import api from "../../api/axios";
import usePayPeriodStatus, { advancePayPeriod } from "../../hooks/usePayPeriodStatus";
import { getUserRoleFromToken } from "../../utils/auth";
import "../../styles/schedule.css";
import "../../styles/ui-buttons.css";
import "../../styles/ui-feedback.css";

export default function SupervisorPayPeriods() {
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [collectionLocation, setCollectionLocation] = useState("");
  const [editingShift, setEditingShift] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { prevUnsubmitted, prevPayPeriod, currentPayPeriod, activePayPeriod, currentSubmitted, loading, refreshStatus } = usePayPeriodStatus();

  // button should be enabled when there are unsubmitted shifts in the
  // *previous* pay period.  The hook sets prevUnsubmitted only when the
  // date rolls into a new period (1st or 16th) and stays true until the
  // supervisor submits it.  There is no need to look at hasStarted.
  const displayedSubmitted = useMemo(() => {
    if (!activePayPeriod || !currentPayPeriod) return false;
    const sameStart =
      new Date(activePayPeriod.payPeriodStart).getTime() ===
      new Date(currentPayPeriod.payPeriodStart).getTime();
    const sameEnd =
      new Date(activePayPeriod.payPeriodEnd).getTime() ===
      new Date(currentPayPeriod.payPeriodEnd).getTime();
    return sameStart && sameEnd && Boolean(currentSubmitted);
  }, [activePayPeriod, currentPayPeriod, currentSubmitted]);

  const canSubmit = prevUnsubmitted && shifts.length > 0;
  const isSubmitDisabled = !canSubmit;
  const isEditDisabled = displayedSubmitted;
  const userRole = getUserRoleFromToken();

  const totalHours = shifts.reduce((sum, s) => {
    const start = new Date(s.startDateTime);
    const end = new Date(s.endDateTime);
    const hrs = end > start ? (end - start) / (1000 * 60 * 60) : 0;
    return sum + hrs;
  }, 0);

  const toDateTimeLocal = dateStr => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  // Load shifts & locations
  useEffect(() => {
    if (!activePayPeriod) return;

    const loadData = async () => {
      try {
        const data = await getShiftsForPayPeriod({
          start: activePayPeriod.payPeriodStart,
          end: activePayPeriod.payPeriodEnd
        });
        setShifts(data.shifts || []);
        const locRes = await api.get("/locations");
        setLocations(locRes.data || []);
      } catch (err) {
        console.error("Error loading pay period data:", err);
        setError(err.response?.data?.message || err.message || "Failed to load pay period data");
        setShifts([]);
      }
    };
    loadData();
  }, [activePayPeriod]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!collectionLocation) {
      setError("Please select a paycheck collection location.");
      return;
    }

    try {
      await submitPayPeriod({
        date: new Date(),
        paycheckCollectionLocationId: collectionLocation
      });
      setSuccess("Pay period submitted successfully.");
      refreshStatus();
      setShowSubmitConfirm(false);
      setCollectionLocation("");
    } catch (err) {
      console.error("submit error", err);
      const msg = err.response?.data?.message || err.message || "Submission failed";
      setError(msg);
      // leave modal open so user sees error
    }
  };

  const handleUpdateShift = async () => {
    if (!editingShift) return;
    if (new Date(editingShift.startDateTime) >= new Date(editingShift.endDateTime)) {
      setError("Start time must be before end time");
      return;
    }

    try {
      await updateShiftEntry(editingShift._id, {
        locationId: editingShift.locationId._id,
        startDateTime: editingShift.startDateTime,
        endDateTime: editingShift.endDateTime
      });

      setShifts(prev => prev.map(s => (s._id === editingShift._id ? editingShift : s)));
      setEditingShift(null);
      setSuccess("Shift updated successfully");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Update failed");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteShiftEntry(deleteTarget._id);
      setShifts(prev => prev.filter(s => s._id !== deleteTarget._id));
      setDeleteTarget(null);
      setSuccess("Shift deleted successfully");
    } catch (err) {
      console.error("delete error", err);
      const msg = err.response?.data?.message || err.message || "Delete failed";
      setError(msg);
      // if backend says not found, remove stale shift from list
      if (err.response?.status === 404) {
        setShifts(prev => prev.filter(s => s._id !== deleteTarget._id));
        setDeleteTarget(null);
      }
    }
  };

  const formatShiftLine = shift => {
    if (!shift.startDateTime || !shift.endDateTime) return "";
    const date = new Date(shift.startDateTime).toLocaleDateString();
    const start = new Date(shift.startDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const end = new Date(shift.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${date} ${start}–${end} — ${shift.locationId?.name || ""}`;
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="schedule-wrapper">
      <h2 className="schedule-title">
        My Pay Period {currentSubmitted && <span className="status-badge submitted">Submitted</span>}
      </h2>


      {prevUnsubmitted && prevPayPeriod && (
        <p className="error-text">
          ⚠ You have unsubmitted shifts for the previous pay period (
          <strong>
            {prevPayPeriod.payPeriodStart.toLocaleDateString()} –{' '}
            {prevPayPeriod.payPeriodEnd.toLocaleDateString()}
          </strong>
          ). Adding or editing shifts in the current period will be blocked until the prior period is submitted.
        </p>
      )}

      <p className="schedule-subtitle">
        <strong>Period:</strong>{" "}
        {activePayPeriod?.payPeriodStart ? new Date(activePayPeriod.payPeriodStart).toLocaleDateString() : "N/A"} →{" "}
        {activePayPeriod?.payPeriodEnd ? new Date(activePayPeriod.payPeriodEnd).toLocaleDateString() : "N/A"}
      </p>
      <p className="schedule-subtitle">
        <strong>Total hours:</strong> {totalHours.toFixed(2)}
      </p>

      {shifts.length === 0 ? (
        <p className="no-shifts">No shifts entered for this period.</p>
      ) : (
        shifts.map(s => (
          <div key={s._id} className="shift-row">
            <span className="time-badge">{formatShiftLine(s)}</span>
            {!isEditDisabled && (
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

      <div style={{ marginTop: "20px" }}>
        <label>
          Paycheck Collection Location
          <select
            value={collectionLocation}
            onChange={e => setCollectionLocation(e.target.value)}
            disabled={isSubmitDisabled}
          >
            <option value="">Select location</option>
            {locations.map(l => (
              <option key={l._id} value={l._id}>{l.name}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        className="btn-primary"
        onClick={() => setShowSubmitConfirm(true)}
        disabled={isSubmitDisabled || shifts.length === 0}
      >
        Submit Pay Period
      </button>

      {displayedSubmitted && <p className="info-text">🔒 This pay period has been submitted and is locked.</p>}
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      {/* ================= SUBMIT CONFIRM MODAL ================= */}
      {showSubmitConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm Pay Period Submission</h3>
            {error && <p className="error-text">{error}</p>}
            <p>
              <strong>Pay Period:</strong> {new Date(currentPayPeriod.payPeriodStart).toLocaleDateString()} → {new Date(currentPayPeriod.payPeriodEnd).toLocaleDateString()}
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