import { useEffect, useState } from "react";
import {
  getShiftsForPayPeriod,
  submitPayPeriod,
  updateShiftEntry,
  deleteShiftEntry
} from "../../api/payPeriodApi";
import api from "../../api/axios";
import "../../styles/ui-feedback.css";
import "../../styles/schedule.css";
import "../../styles/ui-buttons.css";

export default function GuardPayPeriods() {
  const [payPeriod, setPayPeriod] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [collectionLocation, setCollectionLocation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [editingShift, setEditingShift] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  /* ================================
     LOAD PAY PERIOD DATA
  ================================ */

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toISOString();
        const data = await getShiftsForPayPeriod(today);

        setPayPeriod({
          start: data.payPeriodStart,
          end: data.payPeriodEnd
        });

        setShifts(data.shifts || []);

        // derive submission state from backend
        const anyLocked = data.shifts?.some(s => s.isLocked);
        setSubmitted(anyLocked);

        const locRes = await api.get("/locations");
        setLocations(locRes.data || []);
      } catch {
        setError("Failed to load pay period data");
      }
    };

    loadData();
  }, []);

  /* ================================
     SUBMIT PAY PERIOD
  ================================ */

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!collectionLocation) {
      setError("Select a paycheck collection location");
      return;
    }

    try {
      await submitPayPeriod({
        payPeriodStart: payPeriod.start,
        payPeriodEnd: payPeriod.end,
        paycheckCollectionLocationId: collectionLocation
      });

      setSuccess("Pay period submitted successfully");
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed");
    }
  };

  /* ================================
     UPDATE SHIFT
  ================================ */

  const handleUpdateShift = async () => {
    try {
      await updateShiftEntry(editingShift._id, {
        locationId: editingShift.locationId._id,
        startDateTime: editingShift.startDateTime,
        endDateTime: editingShift.endDateTime
      });

      setEditingShift(null);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  /* ================================
     DELETE SHIFT
  ================================ */

  const confirmDelete = async () => {
    try {
      await deleteShiftEntry(showDeleteConfirm._id);
      setShowDeleteConfirm(null);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  /* ================================
     UI HELPERS (DISPLAY ONLY)
  ================================ */

  const formatShiftLine = shift => {
    const date = new Date(shift.startDateTime).toLocaleDateString();
    const start = new Date(shift.startDateTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    const end = new Date(shift.endDateTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    return `${date} ${start}–${end} — ${shift.locationId?.name}`;
  };

  if (!payPeriod) return null;

  return (
    <div className="schedule-wrapper">
      <h2 className="schedule-title">
        Pay Period{" "}
        {submitted ? (
          <span className="status-badge submitted">Submitted</span>
        ) : (
          <span className="status-badge open">Open</span>
        )}
      </h2>

      <p className="schedule-subtitle">
        <strong>Period:</strong>{" "}
        {new Date(payPeriod.start).toLocaleDateString()} →{" "}
        {new Date(payPeriod.end).toLocaleDateString()}
      </p>

      {shifts.length === 0 ? (
        <p className="no-shifts">No shifts entered for this period.</p>
      ) : (
        shifts.map(s => (
          <div key={s._id} className="shift-row">
            <div className="shift-main">
              <span className="shift-label mobile-only">Time</span>
              <span className="time-badge">
                {new Date(s.startDateTime).toLocaleString()} →{" "}
                {new Date(s.endDateTime).toLocaleString()}
              </span>

              <span className="shift-label mobile-only">Location</span>
              <span className="guard-name">{s.locationId?.name}</span>
            </div>

            {!submitted && (
              <div className="shift-actions">
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setEditingShift({
                      ...s,
                      startDateTime: s.startDateTime.slice(0, 16),
                      endDateTime: s.endDateTime.slice(0, 16)
                    })
                  }
                >
                  Edit
                </button>

                <button
                  className="btn-danger"
                  onClick={() => setShowDeleteConfirm(s)}
                >
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
            disabled={submitted}
          >
            <option value="">Select location</option>
            {locations.map(l => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        className="btn-primary"
        id="btn-primarypay"
        onClick={() => setShowSubmitConfirm(true)}
        disabled={submitted}
      >
        Submit Pay Period
      </button>

      {submitted && (
        <p className="info-text">
          🔒 This pay period has been submitted and is locked.
        </p>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      {/* ================= EDIT MODAL ================= */}

      {editingShift && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Edit Shift</h3>

            <label>
              Location
              <select
                value={editingShift.locationId._id}
                onChange={e =>
                  setEditingShift({
                    ...editingShift,
                    locationId: {
                      ...editingShift.locationId,
                      _id: e.target.value
                    }
                  })
                }
              >
                {locations.map(l => (
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
                onChange={e =>
                  setEditingShift({
                    ...editingShift,
                    startDateTime: e.target.value
                  })
                }
              />
            </label>

            <label>
              End
              <input
                type="datetime-local"
                value={editingShift.endDateTime}
                onChange={e =>
                  setEditingShift({
                    ...editingShift,
                    endDateTime: e.target.value
                  })
                }
              />
            </label>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setEditingShift(null)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateShift}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRM ================= */}

      {showDeleteConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Delete Shift</h3>
            <p>Are you sure you want to delete this shift?</p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBMIT CONFIRM ================= */}

      {showSubmitConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm Pay Period Submission</h3>

            <p>
              <strong>Pay Period:</strong>{" "}
              {new Date(payPeriod.start).toLocaleDateString()} →{" "}
              {new Date(payPeriod.end).toLocaleDateString()}
            </p>

            <hr />

            <strong>Shifts:</strong>
            <ul className="confirm-shift-list">
              {shifts.map(s => (
                <li key={s._id}>{formatShiftLine(s)}</li>
              ))}
            </ul>

            <p className="warning-text">
              ⚠ Submitting will lock all shifts for this pay period.
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowSubmitConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="btn-primary"
                onClick={async () => {
                  setShowSubmitConfirm(false);
                  await handleSubmit();
                }}
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
