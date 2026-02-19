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
  const [guards, setGuards] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    email: ""
  });
  const [editLocations, setEditLocations] = useState([]);

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
    try {
      await createGuard(newGuard);
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
    setEditForm({
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email
    });
    setEditLocations(g.assignedLocationIds || []);
  };

  const toggleEditLocation = (id) => {
    setEditLocations((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ firstName: "", lastName: "", email: "" });
    setEditLocations([]);
  };

  const saveEdit = async (id) => {
    await updateUser(id, {
      ...editForm,
      assignedLocationIds: editLocations
    });
    cancelEdit();
    loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this guard?")) return;
    await deleteUser(id);
    loadData();
  };

  if (loading) return <p>Loading guards...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="guards-page">
      <h3 className="guards-title">Guards</h3>

      {/* CREATE */}
      <h4 className="section-title">Create Guard</h4>
      <div className="form-row">
        <input placeholder="First Name" value={newGuard.firstName}
          onChange={(e) => setNewGuard({ ...newGuard, firstName: e.target.value })} />
        <input placeholder="Last Name" value={newGuard.lastName}
          onChange={(e) => setNewGuard({ ...newGuard, lastName: e.target.value })} />
        <input placeholder="Email" value={newGuard.email}
          onChange={(e) => setNewGuard({ ...newGuard, email: e.target.value })} />
        <input type="password" placeholder="Password" value={newGuard.password}
          onChange={(e) => setNewGuard({ ...newGuard, password: e.target.value })} />
      </div>

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

      <button className="primary-btn" onClick={handleCreate}>Create</button>

      <hr />

      {/* LIST */}
      <ul className="guard-list">
        {guards.map((g) => (
          <li key={g._id} className="guard-item">
            {editingId === g._id ? (
              <div className="edit-block">
                <div className="form-row">
                  <input value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                  <input value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                  <input value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>

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

                <div className="action-group">
                  <button className="btn-save" onClick={() => saveEdit(g._id)}>Save</button>
                  <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="guard-info">
                  {g.firstName} {g.lastName} — {g.email}
                </div>
                <div className="action-group">
                  <button className="btn-edit" onClick={() => startEdit(g)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(g._id)}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
