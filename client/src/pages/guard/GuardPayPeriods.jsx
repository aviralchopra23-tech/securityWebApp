// src/pages/guard/GuardPayPeriods.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getShiftsForPayPeriod,
  submitPayPeriod,
  updateShiftEntry,
  deleteShiftEntry
} from "../../api/payPeriodApi";
import api from "../../api/axios";
import usePayPeriodStatus from "../../hooks/usePayPeriodStatus";
import "../../styles/GuardSchedule.css";

export default function GuardPayPeriods() {
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [editingShift, setEditingShift] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const effectivePayPeriod = useMemo(() => {
    if (!activePayPeriod?.payPeriodStart || !activePayPeriod?.payPeriodEnd) return null;
    return activePayPeriod;
  }, [activePayPeriod]);

  const displayedSubmitted = useMemo(() => {
    if (!effectivePayPeriod || !currentPayPeriod) return false;
    const samePeriod =
      effectivePayPeriod.payPeriodStart.getTime() ===
        new Date(currentPayPeriod.payPeriodStart).getTime() &&
      effectivePayPeriod.payPeriodEnd.getTime() ===
        new Date(currentPayPeriod.payPeriodEnd).getTime();
    return samePeriod && Boolean(currentSubmitted);
  }, [effectivePayPeriod, currentPayPeriod, currentSubmitted]);

  const isDisabled = displayedSubmitted;
  const canSubmit = prevUnsubmitted && shifts.length > 0;

  const toDateTimeLocal = (dateStr) => {
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!effectivePayPeriod) return;
    const loadData = async () => {
      setError(""); setSuccess("");
      try {
        const data = await getShiftsForPayPeriod({ date: effectivePayPeriod.payPeriodStart });
        setShifts(data.shifts || []);
        const locRes = await api.get("/locations");
        setLocations(Array.isArray(locRes.data) ? locRes.data : []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || err.message || "Failed to load pay period data");
      }
    };
    loadData();
  }, [effectivePayPeriod]);

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    try {
      await submitPayPeriod();
      setSuccess("✅ Pay period submitted successfully.");
      setShowSubmitConfirm(false);
      await refreshStatus();
      setShifts([]);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Submission failed");
    }
  };

  const handleUpdateShift = async () => {
    if (!editingShift) return;
    setError(""); setSuccess("");
    if (new Date(editingShift.startDateTime) >= new Date(editingShift.endDateTime)) {
      setError("Start time must be before end time"); return;
    }
    try {
      await updateShiftEntry(editingShift._id, {
        locationId: editingShift.locationId?._id || editingShift.locationId,
        startDateTime: editingShift.startDateTime,
        endDateTime: editingShift.endDateTime
      });
      setShifts(prev => prev.map(s => s._id === editingShift._id ? { ...s, ...editingShift } : s));
      setEditingShift(null);
      setSuccess("✅ Shift updated successfully");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Update failed");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setError(""); setSuccess("");
    try {
      await deleteShiftEntry(deleteTarget._id);
      setShifts(prev => prev.filter(s => s._id !== deleteTarget._id));
      setDeleteTarget(null);
      setSuccess("✅ Shift deleted successfully");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Delete failed");
    }
  };

  const formatShiftLine = (shift) => {
    const date = new Date(shift.startDateTime).toLocaleDateString();
    const start = new Date(shift.startDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const end = new Date(shift.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${date} ${start}–${end} — ${shift.locationId?.name || ""}`;
  };

  if (loading || !effectivePayPeriod) return <p>Loading...</p>;
  if (statusError) return <p className="errorText">{statusError}</p>;

  const ppStartLabel = new Date(effectivePayPeriod.payPeriodStart).toLocaleDateString();
  const ppEndLabel = new Date(effectivePayPeriod.payPeriodEnd).toLocaleDateString();

  return (
    <div className="schedulePage pay-period-page">
      <div className="scheduleWrapper">
        <h2 className="scheduleTitle">
          Pay Period
        </h2>

        {prevUnsubmitted && prevPayPeriod && (
          <p className="errorText warning-text">
            ⚠ You have unsubmitted shifts for the previous pay period (
            <strong>{prevPayPeriod.payPeriodStart.toLocaleDateString()} – {prevPayPeriod.payPeriodEnd.toLocaleDateString()}</strong>).
          </p>
        )}

        <p className="scheduleInfo"><strong>Period:</strong> {ppStartLabel} → {ppEndLabel}</p>

        {shifts.length === 0 ? (
          <div className="noShifts">No shifts entered for this period.</div>
        ) : shifts.map(s => (
          <div key={s._id} className="shiftRow">
            <span className="timeBadge">{formatShiftLine(s)}</span>
            {!isDisabled && (
              <div className="shiftActions">
                <button className="btnSecondary" onClick={() => setEditingShift({ ...s, startDateTime: toDateTimeLocal(s.startDateTime), endDateTime: toDateTimeLocal(s.endDateTime) })}>Edit</button>
                <button className="btnDanger" onClick={() => setDeleteTarget(s)}>Delete</button>
              </div>
            )}
          </div>
        ))}

        <button className="btnPrimary submit" onClick={() => setShowSubmitConfirm(true)} disabled={!canSubmit}>
          Submit Pay Period
        </button>

        {displayedSubmitted && <p className="successText">🔒 This pay period has been submitted and is locked.</p>}
        {error && <p className="errorText">{error}</p>}
        {success && <p className="successText">{success}</p>}

        {showSubmitConfirm && (
          <div className="modalBackdrop">
            <div className="modal">
              <h3>Confirm Pay Period Submission</h3>
              <p><strong>Pay Period:</strong> {ppStartLabel} → {ppEndLabel}</p>
              <hr />
              <strong>Shifts:</strong>
              <ul className="confirmDetails">{shifts.map(s => <li key={s._id}>{formatShiftLine(s)}</li>)}</ul>
              <p className="warning-text">⚠ Submitting will lock all shifts for this pay period.</p>
              <div className="modalActions">
                <button className="btnSecondary" onClick={() => setShowSubmitConfirm(false)}>Cancel</button>
                <button className="btnPrimary" onClick={handleSubmit}>Confirm & Submit</button>
              </div>
            </div>
          </div>
        )}

        {editingShift && (
          <div className="modalBackdrop">
            <div className="modal">
              <h3>Edit Shift</h3>
              <label>
                Location
                <select
                  value={editingShift.locationId?._id || editingShift.locationId}
                  onChange={(e) => setEditingShift({ ...editingShift, locationId: { ...(editingShift.locationId || {}), _id: e.target.value }})}
                >
                  {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </label>
              <label>
                Start
                <input type="datetime-local" value={editingShift.startDateTime} onChange={e => setEditingShift({ ...editingShift, startDateTime: e.target.value })} />
              </label>
              <label>
                End
                <input type="datetime-local" value={editingShift.endDateTime} onChange={e => setEditingShift({ ...editingShift, endDateTime: e.target.value })} />
              </label>
              <div className="modalActions">
                <button className="btnSecondary" onClick={() => setEditingShift(null)}>Cancel</button>
                <button className="btnPrimary" onClick={handleUpdateShift}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="modalBackdrop">
            <div className="modal">
              <h3>Delete Shift</h3>
              <p>Are you sure you want to delete this shift?</p>
              <div className="modalActions">
                <button className="btnSecondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btnDanger" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}