import { useEffect, useState } from "react";
import {
  getGuards,
  createGuard,
  updateUser,
  deleteUser,
  getLocations
} from "../../api/ownerApi";
import "../../styles/ownerGuards.css";

export default function OwnerGuards() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [guards, setGuards] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createWarning, setCreateWarning] = useState("");
  const [editWarning, setEditWarning] = useState("");

  const [newGuard, setNewGuard] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    assignedLocationIds: []
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });
  const [editLocations, setEditLocations] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [g, l] = await Promise.all([getGuards(), getLocations()]);
      setGuards(g);
      setLocations(l);
    } catch {
      setError("Failed to load guards or locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleLocation = (id) => {
    setNewGuard((prev) => ({
      ...prev,
      assignedLocationIds: prev.assignedLocationIds.includes(id)
        ? prev.assignedLocationIds.filter((x) => x !== id)
        : [...prev.assignedLocationIds, id]
    }));
  };

  const handleCreate = async () => {
    const firstName = newGuard.firstName.trim();
    const lastName = newGuard.lastName.trim();
    const email = newGuard.email.trim();
    const password = newGuard.password.trim();

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
      await createGuard({
        ...newGuard,
        firstName,
        lastName,
        email,
        password
      });
      setNewGuard({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        assignedLocationIds: []
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Create failed");
    }
  };

  const startEdit = (g) => {
    setEditingId(g._id);
    setEditWarning("");
    setEditForm({
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      password: ""
    });
    setEditLocations(g.assignedLocationIds || []);
  };

  const toggleEditLocation = (id) => {
    setEditLocations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditWarning("");
    setEditForm({ firstName: "", lastName: "", email: "", password: "" });
    setEditLocations([]);
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

    const payload = {
      firstName,
      lastName,
      email,
      assignedLocationIds: editLocations,
    };

    if (trimmedPassword) payload.password = trimmedPassword;

    await updateUser(id, payload);
    cancelEdit();
    loadData();
  };

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

  if (loading) return <p>Loading guards...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="guards-page">
      <h3 className="guards-title">Guards</h3>

      {/* CREATE */}
      <h4 className="section-title">Create Guard</h4>
      <div className="form-row">
        <input
          placeholder="First Name"
          value={newGuard.firstName}
          onChange={(e) => {
            setCreateWarning("");
            setNewGuard({ ...newGuard, firstName: e.target.value });
          }}
        />
        <input
          placeholder="Last Name"
          value={newGuard.lastName}
          onChange={(e) => {
            setCreateWarning("");
            setNewGuard({ ...newGuard, lastName: e.target.value });
          }}
        />
        <input
          placeholder="Email"
          value={newGuard.email}
          onChange={(e) => {
            setCreateWarning("");
            setNewGuard({ ...newGuard, email: e.target.value });
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={newGuard.password}
          onChange={(e) => {
            setCreateWarning("");
            setNewGuard({ ...newGuard, password: e.target.value });
          }}
        />
      </div>

      {createWarning && <p className="validation-warning">{createWarning}</p>}

      <div className="checkbox-group">
        <strong>Assign Locations:</strong>
        {locations.map((l) => (
          <label key={l._id} className="checkbox-item">
            <input
              type="checkbox"
              checked={newGuard.assignedLocationIds.includes(l._id)}
              onChange={() => toggleLocation(l._id)}
            />
            {l.name}
          </label>
        ))}
      </div>

      <div className="action-group">
        <button className="btn-create" onClick={handleCreate}>Create</button>
      </div>

      <hr />

      {/* LIST */}
      <ul className="guard-list">
        {guards.map((g) => (
          <li key={g._id} className={editingId === g._id ? "guard-item guard-item-editing" : "guard-item"}>
            {editingId === g._id ? (
              <div className="edit-block-single">
                <div className="form-row">
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
                </div>

                {editWarning && <p className="validation-warning">{editWarning}</p>}

                <div className="edit-locations">
                  <strong>Edit Assigned Locations:</strong>
                  {locations.map((l) => (
                    <label key={l._id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={editLocations.includes(l._id)}
                        onChange={() => toggleEditLocation(l._id)}
                      />
                      {l.name}
                    </label>
                  ))}
                </div>

                <div className="action-group edit-actions">
                  <button className="btn-save" onClick={() => saveEdit(g._id)}>Save</button>
                  <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="guard-info">
                  {g.firstName} {g.lastName} ({g.email})
                </div>
                <div className="action-group">
                  <button className="btn-edit" onClick={() => startEdit(g)}>Edit</button>
                  <button className="btn-delete" onClick={() => setDeleteTarget(g)}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {deleteTarget && (
        <div className="guards-modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete guard confirmation">
          <div className="guards-modal">
            <h4>Delete Guard</h4>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>?
            </p>
            <p className="guards-modal-subtext">This action cannot be undone.</p>
            <div className="guards-modal-actions">
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