import "../../styles/documents.css";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Documents() {
  const [documentType, setDocumentType] = useState("PASSPORT");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const uploadedUrlsRef = useRef([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

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

    // Placeholder until backend upload endpoint is added.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const now = Date.now();
    const nextDocuments = files.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${now}-${index}`,
      name: file.name,
      size: file.size,
      type: documentType,
      note,
      uploadedAt: new Date().toLocaleString(),
      url: URL.createObjectURL(file),
    }));

    uploadedUrlsRef.current.push(...nextDocuments.map((doc) => doc.url));

    setUploadedDocuments((prev) => [...nextDocuments, ...prev]);
    setFiles([]);
    setNote("");

    setIsSubmitting(false);
    setMessage("Documents uploaded successfully.");
  };

  const handleRemoveDocument = (documentId) => {
    setUploadedDocuments((prev) => {
      const target = prev.find((doc) => doc.id === documentId);
      if (target?.url) {
        URL.revokeObjectURL(target.url);
        uploadedUrlsRef.current = uploadedUrlsRef.current.filter((url) => url !== target.url);
      }
      return prev.filter((doc) => doc.id !== documentId);
    });
  };

  useEffect(() => {
    return () => {
      uploadedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      uploadedUrlsRef.current = [];
    };
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
                <li key={doc.id} className="documents-uploaded-item">
                  <div className="documents-uploaded-main">
                    <p className="documents-uploaded-name">{doc.name}</p>
                    <p className="documents-uploaded-meta">
                      {doc.type} • {(doc.size / 1024).toFixed(1)} KB • {doc.uploadedAt}
                    </p>
                    {doc.note ? <p className="documents-uploaded-note">{doc.note}</p> : null}
                  </div>

                  <div className="documents-uploaded-actions">
                    <a
                      className="documents-action-link"
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      className="documents-action-remove"
                      onClick={() => handleRemoveDocument(doc.id)}
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
