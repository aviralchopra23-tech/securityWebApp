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

      {/* LIST */}
      <ul className="guard-list">
        {guards.map((g) => (
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