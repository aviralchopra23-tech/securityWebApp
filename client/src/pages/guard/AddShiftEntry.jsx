import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { getUserRoleFromToken } from "../../utils/auth";
import usePayPeriodStatus from "../../hooks/usePayPeriodStatus";
import { calculateCurrentPayPeriod } from "../../api/payPeriodApi";

import styles from "../../styles/AddShift.module.css";

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
  const { prevUnsubmitted, prevPayPeriod, currentSubmitted, loading: statusLoading, error: statusError, refreshStatus } = usePayPeriodStatus();
  const canAddShift = role === "GUARD" || role === "SUPERVISOR";
  const isDisabled = !canAddShift;

  useEffect(() => {
    async function loadLocations() {
      setLoadingLocations(true);
      setError("");
      try {
        const res = await api.get("/locations");
        const list = Array.isArray(res.data) ? res.data : [];
        setLocations(list);
        if (list.length === 1) setLocationId(list[0]._id);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || err.message || "Failed to load locations");
      } finally {
        setLoadingLocations(false);
      }
    }
    loadLocations();
  }, []);

  const selectedLocationName = locations.find((l) => String(l._id) === String(locationId))?.name || "";

  const showPrevWarning = useMemo(() => {
    if (!canAddShift || !prevUnsubmitted || !prevPayPeriod || !startDateTime) return false;
    const start = new Date(startDateTime);
    if (isNaN(start.getTime())) return false;
    const { payPeriodStart: shiftPPStart } = calculateCurrentPayPeriod(start);
    return shiftPPStart.getTime() > prevPayPeriod.payPeriodEnd.getTime();
  }, [canAddShift, prevUnsubmitted, prevPayPeriod, startDateTime]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!canAddShift) { setError("Only GUARD or SUPERVISOR users can add shift entries."); return; }
    if (!locationId || !startDateTime || !endDateTime) { setError("All fields are required"); return; }

    const start = new Date(startDateTime); 
    const end = new Date(endDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) { setError("Invalid date/time"); return; }
    if (start >= end) { setError("Start time must be before end time"); return; }

    if (prevUnsubmitted && prevPayPeriod) {
      const { payPeriodStart: shiftPPStart } = calculateCurrentPayPeriod(start);
      if (shiftPPStart.getTime() > prevPayPeriod.payPeriodEnd.getTime()) {
        setError(`⚠ Submit previous pay period (${prevPayPeriod.payPeriodStart.toLocaleDateString()} – ${prevPayPeriod.payPeriodEnd.toLocaleDateString()}) before adding shifts for a new period.`);
        return;
      }
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false); setError(""); setSuccess("");
    try {
      const startIso = new Date(startDateTime).toISOString();
      const endIso = new Date(endDateTime).toISOString();
      await api.post("/guards/shifts", { locationId, startDateTime: startIso, endDateTime: endIso });
      setSuccess("✅ Shift entry added successfully");
      setStartDateTime(""); setEndDateTime("");
      refreshStatus(); if (onShiftAdded) onShiftAdded();
    } catch (err) {
      console.error(err);
      const data = err?.response?.data || {};
      let msg = data.message || data.error || err?.message || "Failed to add shift";
      if (data.pendingPayPeriod) {
        const start = new Date(data.pendingPayPeriod.payPeriodStart).toLocaleDateString();
        const end = new Date(data.pendingPayPeriod.payPeriodEnd).toLocaleDateString();
        msg = `⚠ Submit pay period ${start} – ${end} before adding shifts for a new period.`;
      }
      if (err.response?.status === 403) {
        msg = msg || "⚠ Please submit the previous pay period before adding shifts for a new one.";
      }
      setError(msg);
    }
  };

  if (statusLoading || loadingLocations) return <p>Loading...</p>;
  if (statusError) return <p className={styles.errorText}>{statusError}</p>;

  return (
    <div className={styles.schedulePage}>
      <div className={styles.scheduleWrapper}>
        <h2 className={styles.scheduleTitle}>Shift Entry</h2>

        {showPrevWarning && <p className={styles.scheduleInfo}>You have unsubmitted shifts for the previous pay period. Ensure submissions are complete before adding new shifts.</p>}
        {currentSubmitted && <p className={styles.scheduleInfo}>Current pay period submitted. You may add missing shifts for older periods if needed.</p>}

        <form onSubmit={handleSubmit}>

          <div className={styles.inputGroupConnected}>
            <label htmlFor="location">Location</label>
            <select 
              id="location"
              value={locationId} 
              onChange={(e) => setLocationId(e.target.value)} 
              disabled={isDisabled}
            >
              <option value="" disabled>Select a location</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroupConnected}>
            <label htmlFor="start">Start Date & Time</label>
            <input 
              id="start"
              type="datetime-local" 
              value={startDateTime} 
              onChange={(e) => { setStartDateTime(e.target.value); setError(""); }} 
              disabled={isDisabled} 
            />
          </div>

          <div className={styles.inputGroupConnected}>
            <label htmlFor="end">End Date & Time</label>
            <input 
              id="end"
              type="datetime-local" 
              value={endDateTime} 
              onChange={(e) => { setEndDateTime(e.target.value); setError(""); }} 
              disabled={isDisabled} 
            />
          </div>

          <button className={styles.btnPrimary} type="submit" disabled={isDisabled}>Add Shift</button>
        </form>

        {error && <p className={styles.errorText}>{error}</p>}
        {success && <p className={styles.successText}>{success}</p>}

        {showConfirm && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modal}>
              <h3>Confirm Shift Entry</h3>
              <div className={styles.confirmDetails}>
                <div><strong>Location:</strong> {selectedLocationName || "(not selected)"}</div>
                <div><strong>Start:</strong> {startDateTime ? new Date(startDateTime).toLocaleString() : "-"}</div>
                <div><strong>End:</strong> {endDateTime ? new Date(endDateTime).toLocaleString() : "-"}</div>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className={styles.btnPrimary} onClick={confirmSubmit}>Confirm Add Shift</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}