import { useEffect, useRef, useState } from "react";
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
  const [locationImage, setLocationImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", address: "" });
  const [editLocationImage, setEditLocationImage] = useState(null);
  const [removeEditImage, setRemoveEditImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const imageInputRef = useRef(null);

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

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    try {
      let imageDataUrl;
      if (locationImage) {
        imageDataUrl = await fileToDataUrl(locationImage);
      }

      await createLocation({
        ...locForm,
        ...(imageDataUrl ? { imageDataUrl } : {}),
      });
      setLocForm({ name: "", address: "" });
      setLocationImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      loadLocations();
    } catch (err) {
      console.error("Failed to create location:", err);
      alert(err?.response?.data?.message || "Failed to create location.");
    }
  };

  const handleLocationImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setLocationImage(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      setLocationImage(null);
      return;
    }

    if (file.size > 1024 * 1024) {
      alert("Image must be 1MB or smaller.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      setLocationImage(null);
      return;
    }

    setLocationImage(file);
  };

  const startEdit = (location) => {
    setEditingId(location._id);
    setEditForm({ name: location.name, address: location.address });
    setEditLocationImage(null);
    setRemoveEditImage(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", address: "" });
    setEditLocationImage(null);
    setRemoveEditImage(false);
  };

  const saveEdit = async (id) => {
    try {
      const payload = { ...editForm };
      if (editLocationImage) {
        payload.imageDataUrl = await fileToDataUrl(editLocationImage);
      } else if (removeEditImage) {
        payload.imageDataUrl = "";
      }

      await updateLocation(id, payload);
      setEditingId(null);
      setEditLocationImage(null);
      setRemoveEditImage(false);
      loadLocations();
    } catch (err) {
      console.error("Failed to update location:", err);
      alert(err?.response?.data?.message || "Failed to update location.");
    }
  };

  const handleEditLocationImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setEditLocationImage(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      e.target.value = "";
      setEditLocationImage(null);
      return;
    }

    if (file.size > 1024 * 1024) {
      alert("Image must be 1MB or smaller.");
      e.target.value = "";
      setEditLocationImage(null);
      return;
    }

    setRemoveEditImage(false);
    setEditLocationImage(file);
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
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          aria-label="Location image"
          className="location-image-input"
          onChange={handleLocationImageChange}
        />
        <button type="submit">Create</button>
      </form>

      {locationImage && (
        <p className="location-image-selected">
          Selected image: <strong>{locationImage.name}</strong>
        </p>
      )}

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
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Edit location image"
                  className="location-image-input"
                  onChange={handleEditLocationImageChange}
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
                  {(l.imageDataUrl || editLocationImage) && (
                    <button
                      type="button"
                      className="location-btn-remove-image"
                      onClick={() => {
                        setEditLocationImage(null);
                        setRemoveEditImage(true);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {editingId === l._id && (
                  <p className="location-image-selected edit-image-selected">
                    {editLocationImage && (
                      <>
                        Selected image: <strong>{editLocationImage.name}</strong>
                      </>
                    )}
                    {!editLocationImage && removeEditImage && (
                      <strong>Image will be removed when you save.</strong>
                    )}
                    {!editLocationImage && !removeEditImage && l.imageDataUrl && (
                      <>
                        Current image exists. Choose a new image or click <strong>Remove Image</strong>.
                      </>
                    )}
                  </p>
                )}
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
