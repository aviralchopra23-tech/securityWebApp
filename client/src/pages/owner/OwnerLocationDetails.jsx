import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLocationDetails } from "../../api/ownerApi";
import "../../styles/ownerLocationDetails.css";

export default function OwnerLocationDetails() {
  const { locationId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const res = await getLocationDetails(locationId);
        setData(res);
      } catch (err) {
        console.error("Failed to load location details", err);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [locationId]);

  if (loading) return <p className="owner-loading">Loading location details…</p>;
  if (!data) return <p className="owner-error">Unable to load location</p>;

  const { location, guards } = data;

  return (
    <div className="owner-location-wrapper">
      {/* ================= HEADER ================= */}
      <div className="owner-location-header">
        <h2>{location.name}</h2>
      </div>

      {/* ================= DETAILS ================= */}
      <div className="owner-location-section">
        <div className="detail-row">
          <span className="detail-label">Address</span>
          <span className="detail-value">{location.address}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Supervisor</span>
          <span className="detail-value">
            {location.supervisorId
              ? `${location.supervisorId.firstName} ${location.supervisorId.lastName} (${location.supervisorId.email})`
              : "Not assigned"}
          </span>
        </div>
      </div>

      {/* ================= GUARDS ================= */}
      <div className="owner-location-section">
        <h3>Assigned Guards</h3>

        {guards.length === 0 ? (
          <p className="muted-text">No guards assigned to this location.</p>
        ) : (
          <ul className="guard-list">
            {guards.map((g) => (
              <li key={g._id} className="guard-list-item">
                <span className="guard-name">
                  {g.firstName} {g.lastName}
                </span>
                <span className="guard-email">{g.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
