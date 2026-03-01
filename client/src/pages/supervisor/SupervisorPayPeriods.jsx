import { useEffect, useState, useMemo } from "react";
import { getShiftsForPayPeriod, submitPayPeriod, updateShiftEntry, deleteShiftEntry } from "../../api/payPeriodApi";
import api from "../../api/axios";
import usePayPeriodStatus from "../../hooks/usePayPeriodStatus";
import { getUserRoleFromToken } from "../../utils/auth";
import "../../styles/schedule.css";

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

  const displayedSubmitted = useMemo(() => {
    if (!activePayPeriod || !currentPayPeriod) return false;
    return new Date(activePayPeriod.payPeriodStart).getTime() === new Date(currentPayPeriod.payPeriodStart).getTime()
        && new Date(activePayPeriod.payPeriodEnd).getTime() === new Date(currentPayPeriod.payPeriodEnd).getTime()
        && Boolean(currentSubmitted);
  }, [activePayPeriod, currentPayPeriod, currentSubmitted]);

  const canSubmit = prevUnsubmitted && shifts.length > 0;
  const isSubmitDisabled = !canSubmit;
  const isEditDisabled = displayedSubmitted;
  const userRole = getUserRoleFromToken();

  const totalHours = shifts.reduce((sum, s) => {
    const start = new Date(s.startDateTime);
    const end = new Date(s.endDateTime);
    return sum + (end > start ? (end - start) / (1000 * 60 * 60) : 0);
  }, 0);

  const toDateTimeLocal = dateStr => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!activePayPeriod) return;

    const loadData = async () => {
      try {
        const data = await getShiftsForPayPeriod({ start: activePayPeriod.payPeriodStart, end: activePayPeriod.payPeriodEnd });
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
    setError(""); setSuccess("");
    if (!collectionLocation) { setError("Please select a paycheck collection location."); return; }
    try {
      await submitPayPeriod({ date: new Date(), paycheckCollectionLocationId: collectionLocation });
      setSuccess("Pay period submitted successfully.");
      refreshStatus();
      setShowSubmitConfirm(false); setCollectionLocation("");
    } catch (err) {
      console.error("submit error", err);
      setError(err.response?.data?.message || err.message || "Submission failed");
    }
  };

  const handleUpdateShift = async () => {
    if (!editingShift) return;
    if (new Date(editingShift.startDateTime) >= new Date(editingShift.endDateTime)) {
      setError("Start time must be before end time"); return;
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
    <div className="schedulePage">
      <div className="scheduleWrapper">
        <h2 className="scheduleTitle">
          My Pay Period {currentSubmitted && <span className="status-badge submitted">Submitted</span>}
        </h2>

        {prevUnsubmitted && prevPayPeriod && (
          <p className="errorText warning-text">
            ⚠ You have unsubmitted shifts for the previous pay period (
            <strong>{prevPayPeriod.payPeriodStart.toLocaleDateString()} – {prevPayPeriod.payPeriodEnd.toLocaleDateString()}</strong>).
            Adding or editing shifts in the current period will be blocked until the prior period is submitted.
          </p>
        )}

        <p className="scheduleInfo"><strong>Period:</strong>{" "}{activePayPeriod?.payPeriodStart ? new Date(activePayPeriod.payPeriodStart).toLocaleDateString() : "N/A"} →{" "}{activePayPeriod?.payPeriodEnd ? new Date(activePayPeriod.payPeriodEnd).toLocaleDateString() : "N/A"}</p>
        <p className="scheduleInfo"><strong>Total hours:</strong> <span className="status-badge pending">{totalHours.toFixed(2)} hrs</span></p>

        {shifts.length === 0 ? (
          <div className="noShifts">No shifts entered for this period.</div>
        ) : shifts.map(s => (
          <div key={s._id} className="shiftRow">
            <span className="timeBadge">{formatShiftLine(s)}</span>
            {!isEditDisabled && (
              <div className="shiftActions">
                <button className="btnSecondary" onClick={() =>
                  setEditingShift({
                    ...s,
                    startDateTime: toDateTimeLocal(s.startDateTime),
                    endDateTime: toDateTimeLocal(s.endDateTime)
                  })
                }>Edit</button>
                <button className="btnDanger" onClick={() => setDeleteTarget(s)}>Delete</button>
              </div>
            )}
          </div>
        ))}

        <div className="inputGroupConnected">
          <label>Paycheck Collection Location</label>
          <select value={collectionLocation} onChange={e => setCollectionLocation(e.target.value)} disabled={isSubmitDisabled}>
            <option value="">Select location</option>
            {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>

        <button className="btnPrimary submit" onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitDisabled || shifts.length === 0}>
          Submit Pay Period
        </button>

        {displayedSubmitted && <p className="successText">🔒 This pay period has been submitted and is locked.</p>}
        {error && <p className="errorText">{error}</p>}
        {success && <p className="successText">{success}</p>}

        {/* MODALS */}
        {showSubmitConfirm && (
          <div className="modalBackdrop">
            <div className="modal">
              <h3>Confirm Pay Period Submission</h3>
              <p><strong>Pay Period:</strong> {new Date(currentPayPeriod.payPeriodStart).toLocaleDateString()} → {new Date(currentPayPeriod.payPeriodEnd).toLocaleDateString()}</p>
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
                  {locations.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </label>
              <label>
                Start
                <input type="datetime-local" value={editingShift.startDateTime} onChange={(e) => setEditingShift({ ...editingShift, startDateTime: e.target.value })}/>
              </label>
              <label>
                End
                <input type="datetime-local" value={editingShift.endDateTime} onChange={(e) => setEditingShift({ ...editingShift, endDateTime: e.target.value })}/>
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