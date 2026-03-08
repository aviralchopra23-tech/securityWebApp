import { Link, useLocation, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getDocumentsForUser } from "../../api/documentsApi";
import "../../styles/ownerUserDocuments.css";

const formatSize = (bytes) => `${(Number(bytes || 0) / 1024).toFixed(1)} KB`;
const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
};

export default function OwnerUserDocuments() {
  const { userId } = useParams();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMessage, setViewMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getDocumentsForUser(userId);
        setDocuments(Array.isArray(data?.documents) ? data.documents : []);
        setUser(data?.user || null);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Failed to load documents.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const pageTitle = useMemo(() => {
    const stateName = location.state?.userName;
    if (stateName) return stateName;
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || "User";
  }, [location.state, user]);

  const openDocument = (doc) => {
    try {
      setViewMessage("");
      const dataUrl = String(doc?.dataUrl || "");
      if (!dataUrl.startsWith("data:")) return;

      const parts = dataUrl.split(",");
      if (parts.length < 2) return;

      const meta = parts[0] || "";
      const base64 = parts[1] || "";
      const mimeMatch = /data:(.*?);base64/.exec(meta);
      const mimeType = mimeMatch?.[1] || doc?.mimeType || "application/octet-stream";

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");

      if (!opened) {
        URL.revokeObjectURL(blobUrl);
        setViewMessage("Popup blocked. Please allow popups for this site to view documents in a new tab.");
        return;
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
    } catch (err) {
      console.error(err);
      setViewMessage("Failed to open document.");
    }
  };

  return (
    <section className="owner-user-docs-page">
      <div className="owner-user-docs-header">
        <div>
          <h2 className="owner-user-docs-title">{pageTitle}</h2>
          <p className="owner-user-docs-subtitle">
            {loading ? "Loading documents..." : `${documents.length} file(s)`}
          </p>
        </div>
        <Link to="/owner/docs" className="owner-user-docs-back">
          Back to Docs
        </Link>
      </div>

      {loading && <p className="owner-user-docs-info">Loading...</p>}
      {error && <p className="owner-user-docs-error">{error}</p>}
      {viewMessage && <p className="owner-user-docs-info">{viewMessage}</p>}

      {!loading && !error && (
        documents.length === 0 ? (
          <p className="owner-user-docs-info">No uploaded documents for this user.</p>
        ) : (
          <ul className="owner-user-docs-list">
            {documents.map((doc) => (
              <li key={doc._id} className="owner-user-docs-item">
                <div className="owner-user-docs-main">
                  <p className="owner-user-docs-name">{doc.originalName}</p>
                  <p className="owner-user-docs-meta">
                    {doc.documentType} • {formatSize(doc.sizeBytes)} • {formatDate(doc.createdAt)}
                  </p>
                  {doc.note ? <p className="owner-user-docs-note">{doc.note}</p> : null}
                </div>

                <button
                  type="button"
                  className="owner-user-docs-view"
                  onClick={() => openDocument(doc)}
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
