// src/pages/guard/GuardAnnouncements.jsx
import { useEffect, useState } from "react";
import { getAnnouncements, createAnnouncement } from "../../api/announcementApi";
import "../../styles/guardAnnouncements.css"; // reuse your CSS

// React Icons
import { FaUser, FaClock, FaMapMarkerAlt, FaBullhorn } from "react-icons/fa";

export default function GuardAnnouncements({ canCreate }) {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await getAnnouncements();
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Failed to load announcements", err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!title || !message) return;

    try {
      setLoading(true);
      await createAnnouncement({
        title,
        message,
        locationScope: "SPECIFIC",
      });
      setTitle("");
      setMessage("");
      fetchAnnouncements();
    } catch (err) {
      console.error("Create announcement failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guard-content">
      <h2>
        Announcements
      </h2>

      {canCreate && (
        <div className="guard-card">
          <h3>Create Announcement</h3>

          <input
            className="guard-input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="guard-input"
            placeholder="Message"
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* Dummy Scope row */}
          <div className="guard-scope">
            <span>Scope:</span>
            <span>Specific Location</span>
          </div>

          <button
            className="guard-btn"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      )}

      {announcements.length === 0 && (
        <p style={{ opacity: 0.7 }}>No announcements available.</p>
      )}

      {announcements.map((a) => (
        <div key={a._id} className="guard-card">
          <h3>
            <FaBullhorn style={{ marginRight: "6px" }} /> {a.title}
          </h3>
          <p>{a.message}</p>

          <div className="guard-meta">
            <span>
              <FaUser /> {a.createdByRole}
            </span>
            <span>
              <FaClock /> {new Date(a.createdAt).toLocaleString()}
            </span>
            <span>
              <FaMapMarkerAlt />{" "}
              {a.locationScope === "ALL" ? "All Locations" : "Specific Location"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}