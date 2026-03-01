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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [supervisors, setSupervisors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createWarning, setCreateWarning] = useState("");
  const [assignWarning, setAssignWarning] = useState("");
  const [editWarning, setEditWarning] = useState("");

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
    email: "",
    password: ""
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    const firstName = newSupervisor.firstName.trim();
    const lastName = newSupervisor.lastName.trim();
    const email = newSupervisor.email.trim();
    const password = newSupervisor.password.trim();

    if (!firstName || !lastName || !email || !password) {
      setCreateWarning("First name, last name, email, and password are required.");
      return;
    }

    if (!emailRegex.test(email)) {
      setCreateWarning("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setCreateWarning("Password must be at least 6 characters.");
      return;
    }

    setCreateWarning("");

    try {
      await createSupervisor({
        ...newSupervisor,
        firstName,
        lastName,
        email,
        password
      });
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
      setAssignWarning("Please select both supervisor and location.");
      return;
    }

    setAssignWarning("");

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
    setEditWarning("");
    setEditForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, password: "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditWarning("");
    setEditForm({ firstName: "", lastName: "", email: "", password: "" });
  };

  const saveEdit = async (id) => {
    const firstName = editForm.firstName.trim();
    const lastName = editForm.lastName.trim();
    const email = editForm.email.trim();

    if (!firstName || !lastName || !email) {
      setEditWarning("First name, last name, and email are required.");
      return;
    }

    if (!emailRegex.test(email)) {
      setEditWarning("Enter a valid email address.");
      return;
    }

    const trimmedPassword = (editForm.password || "").trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      setEditWarning("New password must be at least 6 characters.");
      return;
    }

    setEditWarning("");

    try {
      const payload = {
        firstName,
        lastName,
        email,
      };

      if (trimmedPassword) payload.password = trimmedPassword;

      await updateUser(id, payload);
      cancelEdit();
      loadData();
    } catch {
      alert("Update failed");
    }
  };

  // DELETE supervisor
  const handleDelete = async () => {
    if (!deleteTarget?._id || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteUser(deleteTarget._id);
      setDeleteTarget(null);
      loadData();
    } catch {
      alert("Delete failed");
    } finally {
      setIsDeleting(false);
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
          onChange={(e) => {
            setCreateWarning("");
            setNewSupervisor({ ...newSupervisor, firstName: e.target.value });
          }}
        />
        <input
          placeholder="Last Name"
          value={newSupervisor.lastName}
          onChange={(e) => {
            setCreateWarning("");
            setNewSupervisor({ ...newSupervisor, lastName: e.target.value });
          }}
        />
        <input
          placeholder="Email"
          value={newSupervisor.email}
          onChange={(e) => {
            setCreateWarning("");
            setNewSupervisor({ ...newSupervisor, email: e.target.value });
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={newSupervisor.password}
          onChange={(e) => {
            setCreateWarning("");
            setNewSupervisor({ ...newSupervisor, password: e.target.value });
          }}
        />
        <div className="button-wrapper">
          <button className="btn-create" onClick={handleCreateSupervisor}>
            Create
          </button>
        </div>
      </div>

      {createWarning && <p className="validation-warning">{createWarning}</p>}

      {/* ASSIGN SUPERVISOR */}
      <h4 className="section-title">Assign Supervisor</h4>
<div className="form-row assign-form">
  <select
    value={selectedSupervisor}
    onChange={(e) => {
      setAssignWarning("");
      setSelectedSupervisor(e.target.value);
    }}
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
    onChange={(e) => {
      setAssignWarning("");
      setSelectedLocation(e.target.value);
    }}
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

      {assignWarning && <p className="validation-warning">{assignWarning}</p>}

      {/* LIST OF SUPERVISORS */}
      <h4 className="section-title">Supervisor List</h4>
      <ul className="supervisor-list">
        {supervisors.map((s) => (
          <li key={s._id} className="supervisor-item">
            {editingId === s._id ? (
              <div className="edit-row">
                <input
                  value={editForm.firstName}
                  onChange={(e) => {
                    setEditWarning("");
                    setEditForm({ ...editForm, firstName: e.target.value });
                  }}
                />
                <input
                  value={editForm.lastName}
                  onChange={(e) => {
                    setEditWarning("");
                    setEditForm({ ...editForm, lastName: e.target.value });
                  }}
                />
                <input
                  value={editForm.email}
                  onChange={(e) => {
                    setEditWarning("");
                    setEditForm({ ...editForm, email: e.target.value });
                  }}
                />
                <input
                  type="password"
                  placeholder="New Password (optional)"
                  value={editForm.password}
                  onChange={(e) => {
                    setEditWarning("");
                    setEditForm({ ...editForm, password: e.target.value });
                  }}
                />
                {editWarning && <p className="validation-warning edit-warning">{editWarning}</p>}
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
                  <button className="btn-delete" onClick={() => setDeleteTarget(s)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {deleteTarget && (
        <div className="supervisors-modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete supervisor confirmation">
          <div className="supervisors-modal">
            <h4>Delete Supervisor</h4>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>?
            </p>
            <p className="supervisors-modal-subtext">This action cannot be undone.</p>
            <div className="supervisors-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

