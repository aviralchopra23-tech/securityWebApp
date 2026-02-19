import { useEffect, useState } from "react";
import { getAnnouncements, createAnnouncement } from "../../api/announcementApi";

export default function Announcements({ canCreate }) {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await getAnnouncements();
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Failed to load announcements");
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
        locationScope: "SPECIFIC", // supervisor enforced by backend
      });

      setTitle("");
      setMessage("");
      fetchAnnouncements();
    } catch (err) {
      console.error("Create announcement failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="schedule-container">
      <h2>📢 Announcements</h2>

      {canCreate && (
        <div className="schedule-card">
          <h3>Create Announcement</h3>

          <input
            className="schedule-input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="schedule-input"
            placeholder="Message"
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            className="primary-btn"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      )}

      {announcements.map((a) => (
        <div key={a._id} className="schedule-card">
          <h3>📢 {a.title}</h3>
          <p>{a.message}</p>

          <div className="schedule-meta">
            <span>👤 {a.createdByRole}</span>
            <span>
              🕒 {new Date(a.createdAt).toLocaleString()}
            </span>
            <span>
              📍 {a.locationScope === "ALL" ? "All Locations" : "Specific Location"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
