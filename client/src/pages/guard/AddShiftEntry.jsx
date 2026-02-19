import { useEffect, useState } from "react";
import { createShiftEntry } from "../../api/payPeriodApi";
import api from "../../api/axios";
import { getUserRoleFromToken } from "../../utils/auth";
import "../../styles/addShift.css";
import "../../styles/ui-feedback.css";



export default function AddShiftEntry() {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const role = getUserRoleFromToken();

      // 🔑 GUARD: can add shifts at ANY location
      // GUARD & SUPERVISOR: can add shifts at ANY location
if (role === "GUARD" || role === "SUPERVISOR") {
  const res = await api.get("/locations");
  setLocations(res.data || []);
  return;
}


      // 🔑 SUPERVISOR: only their assigned location
      const res = await api.get("/locations/my");
      const locs = res.data || [];
      setLocations(locs);

      if (locs.length === 1) {
        setLocationId(locs[0]._id);
      }
    } catch {
      setError("Failed to load locations");
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setError("");
    setSuccess("");

    if (!locationId || !startDateTime || !endDateTime) {
      setError("All fields are required");
      return;
    }

    try {
      await createShiftEntry({
        locationId,
        startDateTime,
        endDateTime
      });

      setSuccess("Shift entry added");
      setStartDateTime("");
      setEndDateTime("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add shift");
    }
  };

  return (
    <div className="schedule-wrapper">
      <h2 className="schedule-title" style={{"color":"green"}}>Add Shift</h2>

      <p className="info-text" style={{ marginBottom: "15px" }}>
        ⚠️ Only shifts with a <strong>start date inside the current pay period</strong>
        will appear in the Pay Period screen.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Location
          <select
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
          >
            <option value="">Select location</option>
            {locations.map(l => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Start Date & Time
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={e => setStartDateTime(e.target.value)}
          />
        </label>

        <label>
          End Date & Time
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={e => setEndDateTime(e.target.value)}
          />
        </label>

        <button className="btn-primary" type="submit">
          Add Shift
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      {showConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm Shift Entry</h3>
            <p>
              You are about to add a shift.
              <br />
              Please confirm the details are correct.
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={confirmSubmit}
              >
                Confirm Add Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
