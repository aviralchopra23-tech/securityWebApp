import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSupervisors,
  deleteUser,
} from "../../api/ownerApi";
import "../../styles/ownerSupervisors.css";

export default function OwnerSupervisors() {
  const navigate = useNavigate();

  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const supData = await getSupervisors();
      setSupervisors(supData);
    } catch (err) {
      console.error(err);
      setError("Failed to load supervisors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      <div className="supervisors-header-row">
        <h3 className="supervisors-title">Supervisors</h3>
        <button className="btn-create" onClick={() => navigate("create")}>Create Supervisor</button>
      </div>

      {/* LIST OF SUPERVISORS */}
      <h4 className="section-title">Supervisor List</h4>
      <ul className="supervisor-list">
        {supervisors.map((s) => (
          <li
            key={s._id}
            className="supervisor-item clickable-supervisor"
            onClick={() => navigate(`/owner/users/supervisors/${s._id}`)}
          >
            <div className="supervisor-info">
              {s.firstName} {s.lastName}
              {s.assignedLocationId?.name && (
                <span className="assigned-badge">Location: {s.assignedLocationId.name}</span>
              )}
            </div>
            <div className="action-group">
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(s);
                }}
              >
                Delete
              </button>
            </div>
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

