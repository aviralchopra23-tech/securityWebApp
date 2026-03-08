import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getGuards,
  deleteUser
} from "../../api/ownerApi";
import "../../styles/ownerGuards.css";

export default function OwnerGuards() {
  const navigate = useNavigate();

  const [guards, setGuards] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const g = await getGuards();
      setGuards(g);
    } catch {
      setError("Failed to load guards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatAssignedLocations = (assignedLocationIds) => {
    const names = (assignedLocationIds || [])
      .map((l) => (typeof l === "object" ? l.name : ""))
      .filter(Boolean);

    return names.length ? names.join(", ") : "Not assigned";
  };

  const locationOptions = guards
    .flatMap((g) => g.assignedLocationIds || [])
    .filter((loc) => loc && typeof loc === "object" && loc._id && loc.name)
    .reduce((acc, loc) => {
      if (!acc.some((item) => item._id === loc._id)) {
        acc.push({ _id: loc._id, name: loc.name });
      }
      return acc;
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredGuards = selectedLocationId === "ALL"
    ? guards
    : guards.filter((g) =>
      (g.assignedLocationIds || []).some(
        (loc) => typeof loc === "object" && loc._id === selectedLocationId
      )
    );

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
      <div className="guards-header-row">
        <h3 className="guards-title">Guards</h3>
        <button className="btn-create" onClick={() => navigate("create")}>Create Guard</button>
      </div>

      <div className="guards-filter-row">
        <label htmlFor="guard-location-filter" className="guards-filter-label">Filter by location</label>
        <select
          id="guard-location-filter"
          className="guards-filter-select"
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
        >
          <option value="ALL">All locations</option>
          {locationOptions.map((loc) => (
            <option key={loc._id} value={loc._id}>{loc.name}</option>
          ))}
        </select>
      </div>

      {/* LIST */}
      <ul className="guard-list">
        {filteredGuards.map((g) => (
          <li
            key={g._id}
            className="guard-item"
            onClick={() => navigate(`/owner/users/guards/${g._id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/owner/users/guards/${g._id}`);
              }
            }}
          >
            <div className="guard-info">
              <div className="guard-primary">{g.firstName} {g.lastName}</div>
              <div className="guard-location-line">{formatAssignedLocations(g.assignedLocationIds)}</div>
            </div>
            <div className="action-group">
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(g);
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!filteredGuards.length && (
        <p className="guards-empty">No guards found for this location.</p>
      )}

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