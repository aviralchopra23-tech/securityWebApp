import { useEffect, useState } from "react";
import {
  getSupervisors,
  createSupervisor,
  updateUser,
  deleteUser,
  getLocations,
  assignSupervisor
} from "../../api/ownerApi";
import "../../styles/ownerSupervisors.css";

export default function OwnerSupervisors() {
  const [supervisors, setSupervisors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newSupervisor, setNewSupervisor] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });

  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [supData, locData] = await Promise.all([getSupervisors(), getLocations()]);
      setSupervisors(supData);
      setLocations(locData);
    } catch (err) {
      console.error(err);
      setError("Failed to load supervisors or locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CREATE supervisor
  const handleCreateSupervisor = async () => {
    try {
      await createSupervisor(newSupervisor);
      alert("Supervisor created successfully");
      setNewSupervisor({ firstName: "", lastName: "", email: "", password: "" });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Create failed");
    }
  };

  // ASSIGN supervisor
  const handleAssignSupervisor = async () => {
    if (!selectedSupervisor || !selectedLocation) {
      alert("Please select both supervisor and location");
      return;
    }

    try {
      await assignSupervisor({
        supervisorId: selectedSupervisor,
        locationId: selectedLocation
      });
      alert("Supervisor assigned successfully");
      setSelectedSupervisor("");
      setSelectedLocation("");
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Assignment failed");
    }
  };

  // EDIT supervisor
  const startEdit = (s) => {
    setEditingId(s._id);
    setEditForm({ firstName: s.firstName, lastName: s.lastName, email: s.email });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ firstName: "", lastName: "", email: "" });
  };

  const saveEdit = async (id) => {
    try {
      await updateUser(id, editForm);
      cancelEdit();
      loadData();
    } catch {
      alert("Update failed");
    }
  };

  // DELETE supervisor
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this supervisor?")) return;

    try {
      await deleteUser(id);
      loadData();
    } catch {
      alert("Delete failed");
    }
  };

  if (loading) return <p>Loading supervisors...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="supervisors-page">
      <h3 className="supervisors-title">Supervisors</h3>

      {/* CREATE SUPERVISOR */}
      <h4 className="section-title">Create Supervisor</h4>
      <div className="form-row stacked-buttons">
        <input
          placeholder="First Name"
          value={newSupervisor.firstName}
          onChange={(e) => setNewSupervisor({ ...newSupervisor, firstName: e.target.value })}
        />
        <input
          placeholder="Last Name"
          value={newSupervisor.lastName}
          onChange={(e) => setNewSupervisor({ ...newSupervisor, lastName: e.target.value })}
        />
        <input
          placeholder="Email"
          value={newSupervisor.email}
          onChange={(e) => setNewSupervisor({ ...newSupervisor, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={newSupervisor.password}
          onChange={(e) => setNewSupervisor({ ...newSupervisor, password: e.target.value })}
        />
        <div className="button-wrapper">
          <button className="btn-create" onClick={handleCreateSupervisor}>
            Create
          </button>
        </div>
      </div>

      {/* ASSIGN SUPERVISOR */}
      <h4 className="section-title">Assign Supervisor</h4>
<div className="form-row assign-form">
  <select
    value={selectedSupervisor}
    onChange={(e) => setSelectedSupervisor(e.target.value)}
  >
    <option value="">Select Supervisor</option>
    {supervisors.map((s) => (
      <option key={s._id} value={s._id}>
        {s.firstName} {s.lastName}
      </option>
    ))}
  </select>

        <select
    value={selectedLocation}
    onChange={(e) => setSelectedLocation(e.target.value)}
  >
    <option value="">Select Location</option>
    {locations.map((l) => (
      <option key={l._id} value={l._id}>
        {l.name}
      </option>
    ))}
  </select>

  <button className="btn-assign" onClick={handleAssignSupervisor}>
    Assign
  </button>
</div>

      {/* LIST OF SUPERVISORS */}
      <h4 className="section-title">Supervisor List</h4>
      <ul className="supervisor-list">
        {supervisors.map((s) => (
          <li key={s._id} className="supervisor-item">
            {editingId === s._id ? (
              <div className="edit-row">
                <input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
                <input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
                <button className="btn-save" onClick={() => saveEdit(s._id)}>
                  Save
                </button>
                <button className="btn-cancel" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="supervisor-info">
                  {s.firstName} {s.lastName} — {s.email}
                  {s.assignedLocationId && <span className="assigned-badge">Assigned</span>}
                </div>
                <div className="action-group">
                  <button className="btn-edit" onClick={() => startEdit(s)}>
                    Edit
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(s._id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}