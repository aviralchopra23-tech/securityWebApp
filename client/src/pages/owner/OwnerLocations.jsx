import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../../api/ownerApi";
import "../../styles/ownerLocations.css";

export default function OwnerLocations() {
  const [locations, setLocations] = useState([]);
  const [locForm, setLocForm] = useState({ name: "", address: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", address: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  const loadLocations = async () => {
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (err) {
      console.error("Failed to load locations:", err);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    try {
      await createLocation(locForm);
      setLocForm({ name: "", address: "" });
      loadLocations();
    } catch (err) {
      console.error("Failed to create location:", err);
    }
  };

  const startEdit = (location) => {
    setEditingId(location._id);
    setEditForm({ name: location.name, address: location.address });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", address: "" });
  };

  const saveEdit = async (id) => {
    try {
      await updateLocation(id, editForm);
      setEditingId(null);
      loadLocations();
    } catch (err) {
      console.error("Failed to update location:", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id || isDeleting) return;

    setIsDeleting(true);
    const id = deleteTarget._id;

    setLocations((prev) => prev.filter((l) => l._id !== id));
    try {
      await deleteLocation(id);
      setDeleteTarget(null);
    } catch {
      alert("Delete failed. Reloading locations.");
      loadLocations();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="locations-page">
      <h3 className="locations-title">Locations</h3>

      {/* CREATE FORM */}
      <form className="location-form" onSubmit={handleCreateLocation}>
        <input
          placeholder="Location name"
          value={locForm.name}
          onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
          required
        />
        <input
          placeholder="Address"
          value={locForm.address}
          onChange={(e) =>
            setLocForm({ ...locForm, address: e.target.value })
          }
          required
        />
        <button type="submit">Create</button>
      </form>

      {/* LOCATION LIST */}
      <ul className="location-list">
        {locations.map((l) => (
          <li key={l._id} className="location-item">
            {editingId === l._id ? (
              <div className="edit-form">
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="Location name"
                  required
                />
                <input
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  placeholder="Address"
                  required
                />
                <div className="edit-buttons">
                  <button
                    type="button"
                    className="location-btn-save"
                    onClick={() => saveEdit(l._id)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="location-btn-cancel"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="location-info"
                  onClick={() => navigate(`/owner/locations/${l._id}`)}
                >
                  {l.name}
                  <span className="location-sub">
                    Supervisor:{" "}
                    {l.supervisorId
                      ? `${l.supervisorId.firstName} ${l.supervisorId.lastName}`
                      : "Not assigned"}
                  </span>
                </div>
                <div className="location-actions">
                  <button type="button" className="btn-edit" onClick={() => startEdit(l)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => setDeleteTarget(l)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {deleteTarget && (
        <div className="location-modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete location confirmation">
          <div className="location-modal">
            <h4>Delete Location</h4>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <p className="location-modal-subtext">This action cannot be undone.</p>
            <div className="location-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button type="button" className="btn-delete" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
