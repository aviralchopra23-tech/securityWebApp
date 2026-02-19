import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation
} from "../../api/ownerApi";
import "../../styles/ownerLocations.css";

export default function OwnerLocations() {
  const [locations, setLocations] = useState([]);
  const [locForm, setLocForm] = useState({ name: "", address: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", address: "" });

  const navigate = useNavigate();

  const loadLocations = async () => {
    const data = await getLocations();
    setLocations(data);
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    await createLocation(locForm);
    setLocForm({ name: "", address: "" });
    loadLocations();
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
    await updateLocation(id, editForm);
    setEditingId(null);
    loadLocations();
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this location?");
    if (!ok) return;

    setLocations((prev) => prev.filter((l) => l._id !== id));

    try {
      await deleteLocation(id);
    } catch {
      alert("Delete failed. Reloading locations.");
      loadLocations();
    }
  };

  return (
    <div className="locations-page">
      <h3 className="locations-title">Locations</h3>

      {/* CREATE */}
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
          onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
          required
        />
        <button>Create</button>
      </form>

      {/* LIST */}
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
                />
                <input
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                />
                <button className="btn-save" onClick={() => saveEdit(l._id)}>
                  Save
                </button>
                <button className="btn-cancel" onClick={cancelEdit}>
                  Cancel
                </button>
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
                  <button className="btn-edit" onClick={() => startEdit(l)}>
                    Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(l._id)}
                  >
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
