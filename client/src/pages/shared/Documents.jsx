import "../../styles/documents.css";
import { useEffect, useMemo, useState } from "react";
import {
  deleteDocumentById,
  getMyDocuments,
  uploadMyDocuments,
} from "../../api/documentsApi";

export default function Documents() {
  const [documentType, setDocumentType] = useState("PASSPORT");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

  const loadUploadedDocuments = async () => {
    const data = await getMyDocuments();
    setUploadedDocuments(Array.isArray(data?.documents) ? data.documents : []);
  };

  const handleFileChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    setFiles(nextFiles);
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (files.length === 0) {
      setMessage("Please select at least one document to upload.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const payloadFiles = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  name: file.name,
                  size: file.size,
                  mimeType: file.type || "application/octet-stream",
                  dataUrl: String(reader.result || ""),
                });
              };
              reader.onerror = () => reject(new Error(`Failed reading file: ${file.name}`));
              reader.readAsDataURL(file);
            })
        )
      );

      await uploadMyDocuments({
        documentType,
        note,
        files: payloadFiles,
      });

      await loadUploadedDocuments();
      setFiles([]);
      setNote("");
      setMessage("Documents uploaded successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Upload failed.";
      setMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDocument = async (documentId) => {
    try {
      await deleteDocumentById(documentId);
      setUploadedDocuments((prev) => prev.filter((doc) => doc._id !== documentId));
      setMessage("Document removed.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to remove document.";
      setMessage(msg);
    }
  };

  const openDocument = (doc) => {
    try {
      const dataUrl = String(doc?.dataUrl || "");
      if (!dataUrl.startsWith("data:")) {
        setMessage("Document preview is unavailable.");
        return;
      }

      const parts = dataUrl.split(",");
      if (parts.length < 2) {
        setMessage("Document preview is unavailable.");
        return;
      }

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
        setMessage("Popup blocked. Please allow popups for this site to view documents in a new tab.");
        return;
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
    } catch (err) {
      console.error(err);
      setMessage("Failed to open document.");
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadUploadedDocuments();
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Failed to load documents.";
        setMessage(msg);
      }
    };

    load();

    return undefined;
  }, []);

  return (
    <section className="documents-page" aria-label="Documents workspace">
      <div className="documents-shell">
        <div className="documents-header-block">
          <h2 className="documents-title">Documents</h2>
          <p className="documents-subtitle">Upload and manage your work documents.</p>
        </div>

        <div className="documents-content-grid">
          <form className="documents-form" onSubmit={handleSubmit}>
            <div className="documents-field">
              <label className="documents-label" htmlFor="doc-type">
                Document Type
              </label>
              <select
                id="doc-type"
                className="documents-input"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="PASSPORT">Passport</option>
                <option value="WORK_PERMIT">Work Permit</option>
                <option value="STUDY_PERMIT">Study Permit</option>
                <option value="SIN">SIN</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="documents-field">
              <label className="documents-label" htmlFor="doc-note">
                Note (Optional)
              </label>
              <textarea
                id="doc-note"
                className="documents-input documents-textarea"
                placeholder="Add context for this upload"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="documents-field">
              <label className="documents-label" htmlFor="doc-files">
                Select Files
              </label>
              <input
                id="doc-files"
                className="documents-input documents-file"
                type="file"
                onChange={handleFileChange}
                multiple
                disabled={isSubmitting}
              />
            </div>

            <div className="documents-meta">
              <span>{files.length} file(s) selected</span>
              <span>{(totalSize / (1024 * 1024)).toFixed(2)} MB total</span>
            </div>

            {files.length > 0 && (
              <ul className="documents-file-list" aria-label="Selected files">
                {files.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`} className="documents-file-item">
                    <span>{file.name}</span>
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
            )}

            <button type="submit" className="documents-btn" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload Documents"}
            </button>

            {message && <p className="documents-message">{message}</p>}
          </form>

          <aside className="documents-summary-card">
            <h3 className="documents-summary-title">Upload Summary</h3>
            <div className="documents-summary-item">
              <span className="documents-summary-label">Type</span>
              <span className="documents-summary-value">{documentType.replace("_", " ")}</span>
            </div>
            <div className="documents-summary-item">
              <span className="documents-summary-label">Files Selected</span>
              <span className="documents-summary-value">{files.length}</span>
            </div>
            <div className="documents-summary-item">
              <span className="documents-summary-label">Total Size</span>
              <span className="documents-summary-value">{(totalSize / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <p className="documents-summary-tip">
              Tip: Upload clear files and add notes only when extra context is required.
            </p>
          </aside>
        </div>

        <section className="documents-uploaded" aria-label="Uploaded documents">
          <h3 className="documents-uploaded-title">Uploaded Documents</h3>

          {uploadedDocuments.length === 0 ? (
            <p className="documents-empty">No uploaded documents yet.</p>
          ) : (
            <ul className="documents-uploaded-list">
              {uploadedDocuments.map((doc) => (
                <li key={doc._id} className="documents-uploaded-item">
                  <div className="documents-uploaded-main">
                    <p className="documents-uploaded-name">{doc.originalName}</p>
                    <p className="documents-uploaded-meta">
                      {doc.documentType} • {(Number(doc.sizeBytes || 0) / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleString()}
                    </p>
                    {doc.note ? <p className="documents-uploaded-note">{doc.note}</p> : null}
                  </div>

                  <div className="documents-uploaded-actions">
                    <button
                      type="button"
                      className="documents-action-link"
                      onClick={() => openDocument(doc)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="documents-action-remove"
                      onClick={() => handleRemoveDocument(doc._id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
