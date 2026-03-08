import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGuards, getSupervisors } from "../../api/ownerApi";
import "../../styles/ownerDocs.css";

const normalizeLocation = (loc) => {
  if (!loc) return null;
  return {
    id: String(loc._id || loc.id || ""),
    name: String(loc.name || "Unknown Location"),
  };
};

const normalizePerson = (user, role) => {
  const firstName = String(user?.firstName || "").trim();
  const lastName = String(user?.lastName || "").trim();

  const supervisorLocation = normalizeLocation(user?.assignedLocationId);
  const guardLocations = Array.isArray(user?.assignedLocationIds)
    ? user.assignedLocationIds.map(normalizeLocation).filter(Boolean)
    : [];

  const locations = role === "SUPERVISOR"
    ? (supervisorLocation ? [supervisorLocation] : [])
    : guardLocations;

  return {
    id: String(user?._id || ""),
    role,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || "Unnamed User",
    locations,
  };
};

const getInitials = (fullName) => {
  const parts = String(fullName || "")
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

export default function OwnerDocs() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [nameQuery, setNameQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [supervisors, guards] = await Promise.all([
          getSupervisors(),
          getGuards(),
        ]);

        const merged = [
          ...(Array.isArray(supervisors)
            ? supervisors.map((user) => normalizePerson(user, "SUPERVISOR"))
            : []),
          ...(Array.isArray(guards)
            ? guards.map((user) => normalizePerson(user, "GUARD"))
            : []),
        ].sort((a, b) => a.fullName.localeCompare(b.fullName));

        setRows(merged);
      } catch (err) {
        console.error("Failed to load docs users", err);
        const msg = err?.response?.data?.message || err?.message || "Failed to load user docs.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const locationOptions = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      row.locations.forEach((loc) => {
        if (!map.has(loc.id)) {
          map.set(loc.id, loc.name);
        }
      });
    });

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedName = nameQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesName = !normalizedName || row.fullName.toLowerCase().includes(normalizedName);
      if (!matchesName) return false;

      if (locationFilter === "all") return true;
      if (locationFilter === "unassigned") return row.locations.length === 0;

      return row.locations.some((loc) => loc.id === locationFilter);
    });
  }, [rows, nameQuery, locationFilter]);

  return (
    <section className="owner-docs-page">
      <div className="owner-docs-header">
        <h2 className="owner-docs-title">Docs</h2>
      </div>

      <div className="owner-docs-filters" role="group" aria-label="Docs filters">
        <label className="owner-docs-field">
          <span>Name</span>
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Search by first or last name"
          />
        </label>

        <label className="owner-docs-field">
          <span>Location</span>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="all">All locations</option>
            <option value="unassigned">Unassigned</option>
            {locationOptions.map((loc) => (
              <option key={loc.value} value={loc.value}>{loc.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="owner-docs-info">Loading...</p>}
      {error && <p className="owner-docs-error">{error}</p>}

      {!loading && !error && (
        <div className="owner-docs-list-shell">
          <div className="owner-docs-list-head">
            <span>Name</span>
            <span>Assigned Location</span>
          </div>

          {filteredRows.length === 0 ? (
            <p className="owner-docs-empty">No users match this filter.</p>
          ) : (
            <ul className="owner-docs-list" aria-label="Users with assigned locations">
              {filteredRows.map((row) => (
                <li
                  key={row.id}
                  className="owner-docs-row clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/owner/docs/${row.id}`, { state: { userName: row.fullName } })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/owner/docs/${row.id}`, { state: { userName: row.fullName } });
                    }
                  }}
                >
                  <div className="owner-docs-name-cell">
                    <span className="owner-docs-avatar" aria-hidden="true">
                      {getInitials(row.fullName)}
                    </span>
                    <span className="owner-docs-name">{row.fullName}</span>
                  </div>
                  <div className="owner-docs-location-list">
                    {row.locations.length > 0 ? (
                      row.locations.map((loc) => (
                        <span key={`${row.id}-${loc.id}`} className="owner-docs-location-chip">
                          {loc.name}
                        </span>
                      ))
                    ) : (
                      <span className="owner-docs-location-chip unassigned">Unassigned</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
