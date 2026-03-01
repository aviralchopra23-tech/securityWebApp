// src/pages/supervisor/SupervisorAnnouncements.jsx
import { useEffect, useState } from "react";
import { getAnnouncements, createAnnouncement } from "../../api/announcementApi";
import "../../styles/supervisorAnnouncements.css";

import { FaUser, FaClock, FaMapMarkerAlt } from "react-icons/fa";

export default function SupervisorAnnouncements({ canCreate }) {
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
    <div className="supervisor-content">
      <h2>Announcements</h2>

      {canCreate && (
        <div className="supervisor-card create-card">
          <h3>Create Announcement</h3>
          <input
            className="supervisor-input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="supervisor-input"
            rows="4"
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="supervisor-scope">
            <span>Scope:</span>
            <span>Specific Location</span>
          </div>
          <button
            className="supervisor-btn"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      )}

      {announcements.map((a) => (
        <div key={a._id} className="supervisor-card">
          <h3>{a.title}</h3>
          <p>{a.message}</p>
          <div className="supervisor-meta">
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