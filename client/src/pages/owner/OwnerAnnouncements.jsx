import { useEffect, useState } from "react";
import { getAnnouncements, createAnnouncement } from "../../api/announcementApi";
import API from "../../api/axios";
import "../../styles/ownerAnnouncements.css";


export default function OwnerAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scope, setScope] = useState("ALL"); // ALL | SPECIFIC
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all locations (Owner already has access)
  const fetchLocations = async () => {
    try {
      const res = await API.get("/locations");
      setLocations(res.data);
    } catch (err) {
      console.error("Failed to load locations", err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await getAnnouncements();
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Failed to load announcements", err);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!title || !message) return;

    if (scope === "SPECIFIC" && selectedLocations.length === 0) {
      alert("Please select at least one location");
      return;
    }

    try {
      setLoading(true);

      await createAnnouncement({
        title,
        message,
        locationScope: scope,
        locationIds: scope === "SPECIFIC" ? selectedLocations : [],
      });

      setTitle("");
      setMessage("");
      setScope("ALL");
      setSelectedLocations([]);

      fetchAnnouncements();
    } catch (err) {
      console.error("Create announcement failed", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLocation = (locationId) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  return (
    <div className="owner-content">
      <h2>Announcements</h2>

      {/* CREATE ANNOUNCEMENT */}
      <div className="owner-card">
        <h3>Create Announcement</h3>

        <input
          className="owner-input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="owner-input"
          rows="4"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {/* SCOPE SELECTOR */}
        <div className="owner-scope">
          <label>
            <input
              type="radio"
              checked={scope === "ALL"}
              onChange={() => setScope("ALL")}
            />
            {" "}All Locations
          </label>

          <label style={{ marginLeft: "20px" }}>
            <input
              type="radio"
              checked={scope === "SPECIFIC"}
              onChange={() => setScope("SPECIFIC")}
            />
            {" "}Specific Locations
          </label>
        </div>

        {/* LOCATION MULTI-SELECT */}
        {scope === "SPECIFIC" && (
          <div className="owner-locations">

            {locations.map((loc) => (
              <label key={loc._id} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(loc._id)}
                  onChange={() => toggleLocation(loc._id)}
                />
                {" "}{loc.name}
              </label>
            ))}
          </div>
        )}

        <button
          className="owner-btn"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Posting..." : "Post Announcement"}
        </button>
      </div>

      {/* ANNOUNCEMENTS LIST */}
      {announcements.map((a) => (
        <div key={a._id} className="owner-card">
          <h3>📢 {a.title}</h3>
          <p>{a.message}</p>

          <div className="owner-meta">
            <span>👤 {a.createdByRole}</span>
            <span>🕒 {new Date(a.createdAt).toLocaleString()}</span>
            <span>
              📍 {a.locationScope === "ALL" ? "All Locations" : "Specific Locations"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
