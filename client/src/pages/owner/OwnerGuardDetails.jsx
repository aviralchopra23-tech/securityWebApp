import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGuardById, getLocations, updateUser } from "../../api/ownerApi";
import "../../styles/ownerGuardDetails.css";

export default function OwnerGuardDetails() {
  const { guardId } = useParams();
  const navigate = useNavigate();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    personalEmail: "",
    email: "",
    phoneNumber: "",
    licenseNumber: "",
    homeAddress: "",
    emergencyContactName: "",
    dateOfBirth: "",
    dateJoined: "",
    payRate: "",
    password: "",
    assignedLocationIds: [],
  });

  const fillForm = (g) => {
    setForm({
      firstName: g.firstName || "",
      lastName: g.lastName || "",
      personalEmail: g.personalEmail || "",
      email: g.email || "",
      phoneNumber: g.phoneNumber || "",
      licenseNumber: g.licenseNumber || "",
      homeAddress: g.homeAddress || "",
      emergencyContactName: g.emergencyContactName || "",
      dateOfBirth: g.dateOfBirth ? String(g.dateOfBirth).slice(0, 10) : "",
      dateJoined: g.dateJoined ? String(g.dateJoined).slice(0, 10) : "",
      payRate: g.payRate ?? "",
      password: "",
      assignedLocationIds: (g.assignedLocationIds || []).map((l) =>
        typeof l === "object" ? l._id : l
      ),
    });
  };

  const loadGuard = async () => {
    try {
      setLoading(true);
      const [res, locationData] = await Promise.all([
        getGuardById(guardId),
        getLocations(),
      ]);
      setData(res);
      setLocations(locationData);
      fillForm(res);
      setError("");
    } catch {
      setError("Failed to load guard details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuard();
  }, [guardId]);

  const updateField = (key, value) => {
    setWarning("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleLocation = (id) => {
    setWarning("");
    setForm((prev) => ({
      ...prev,
      assignedLocationIds: prev.assignedLocationIds.includes(id)
        ? prev.assignedLocationIds.filter((x) => x !== id)
        : [...prev.assignedLocationIds, id],
    }));
  };

  const handleSave = async () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const appEmail = form.email.trim();
    const personalEmail = form.personalEmail.trim();
    const phoneNumber = form.phoneNumber.trim();

    if (!firstName || !lastName || !appEmail) {
      setWarning("First name, last name, and app email are required.");
      return;
    }

    if (!emailRegex.test(appEmail)) {
      setWarning("Enter a valid app email address.");
      return;
    }

    if (personalEmail && !emailRegex.test(personalEmail)) {
      setWarning("Enter a valid personal email address.");
      return;
    }

    if (personalEmail && personalEmail.toLowerCase() === appEmail.toLowerCase()) {
      setWarning("Personal email and app login email must be different.");
      return;
    }

    if (phoneNumber && phoneNumber.replace(/\D/g, "").length < 10) {
      setWarning("Phone number must contain at least 10 digits.");
      return;
    }

    const payload = {
      firstName,
      lastName,
      email: appEmail,
      assignedLocationIds: form.assignedLocationIds,
    };

    if (personalEmail) payload.personalEmail = personalEmail;
    if (phoneNumber) payload.phoneNumber = phoneNumber;
    if (form.licenseNumber.trim()) payload.licenseNumber = form.licenseNumber.trim();
    if (form.homeAddress.trim()) payload.homeAddress = form.homeAddress.trim();
    if (form.emergencyContactName.trim()) payload.emergencyContactName = form.emergencyContactName.trim();
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.dateJoined) payload.dateJoined = form.dateJoined;

    if (form.payRate !== "") {
      const payRate = Number(form.payRate);
      if (!Number.isFinite(payRate) || payRate < 0) {
        setWarning("Pay rate must be a valid non-negative number.");
        return;
      }
      payload.payRate = payRate;
    }

    const trimmedPassword = form.password.trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      setWarning("New password must be at least 6 characters.");
      return;
    }

    if (trimmedPassword) payload.password = trimmedPassword;

    try {
      setIsSaving(true);
      await updateUser(guardId, payload);
      await loadGuard();
      setIsEditing(false);
      setWarning("");
    } catch (err) {
      setWarning(err.response?.data?.message || "Failed to update guard.");
    } finally {
      setIsSaving(false);
    }
  };

  const getAssignedLocationLabel = () => {
    const names = (data?.assignedLocationIds || [])
      .map((l) => (typeof l === "object" ? l.name : ""))
      .filter(Boolean);
    return names.length ? names.join(", ") : "Not assigned";
  };

  if (loading) return <p>Loading guard details...</p>;
  if (error || !data) return <p>{error || "Guard not found."}</p>;

  return (
    <div className="guard-details-page">
      <div className="details-header-row">
        <button type="button" className="btn-back" onClick={() => navigate("/owner/users/guards")}>Back</button>
        {!isEditing ? (
          <button type="button" className="btn-edit" onClick={() => setIsEditing(true)}>Edit</button>
        ) : (
          <div className="edit-actions">
            <button type="button" className="btn-save" disabled={isSaving} onClick={handleSave}>{isSaving ? "Saving..." : "Save"}</button>
            <button type="button" className="btn-cancel" onClick={() => { fillForm(data); setIsEditing(false); setWarning(""); }}>Cancel</button>
          </div>
        )}
      </div>

      <div className="details-card">
        <div className="photo-wrap">
          {data.profilePhotoDataUrl ? (
            <img src={data.profilePhotoDataUrl} alt={`${data.firstName} ${data.lastName}`} />
          ) : (
            <div className="no-photo">No Photo</div>
          )}
        </div>

        <div className="details-grid">
          <div className="field"><span>Name</span><strong>{data.firstName} {data.lastName}</strong></div>
          <div className="field"><span>Assigned Locations</span><strong>{getAssignedLocationLabel()}</strong></div>
          <div className="field"><span>Personal Email</span><strong>{data.personalEmail || "N/A"}</strong></div>
          <div className="field"><span>App Email</span><strong>{data.email}</strong></div>
          <div className="field"><span>Phone</span><strong>{data.phoneNumber || "N/A"}</strong></div>
          <div className="field"><span>License</span><strong>{data.licenseNumber || "N/A"}</strong></div>
          <div className="field"><span>Home Address</span><strong>{data.homeAddress || "N/A"}</strong></div>
          <div className="field"><span>Emergency Contact</span><strong>{data.emergencyContactName || "N/A"}</strong></div>
          <div className="field"><span>Date of Birth</span><strong>{data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : "N/A"}</strong></div>
          <div className="field"><span>Date Joined</span><strong>{data.dateJoined ? String(data.dateJoined).slice(0, 10) : "N/A"}</strong></div>
          <div className="field"><span>Pay Rate</span><strong>{data.payRate ?? "N/A"}</strong></div>
        </div>
      </div>

      {isEditing && (
        <div className="edit-card">
          <div className="edit-grid">
            <label><span>First Name</span><input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} /></label>
            <label><span>Last Name</span><input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} /></label>
            <label><span>Personal Email</span><input value={form.personalEmail} onChange={(e) => updateField("personalEmail", e.target.value)} /></label>
            <label><span>App Email</span><input value={form.email} onChange={(e) => updateField("email", e.target.value)} /></label>
            <label><span>Phone</span><input value={form.phoneNumber} onChange={(e) => updateField("phoneNumber", e.target.value)} /></label>
            <label><span>License</span><input value={form.licenseNumber} onChange={(e) => updateField("licenseNumber", e.target.value)} /></label>
            <label className="span-2"><span>Home Address</span><input value={form.homeAddress} onChange={(e) => updateField("homeAddress", e.target.value)} /></label>
            <label><span>Emergency Contact</span><input value={form.emergencyContactName} onChange={(e) => updateField("emergencyContactName", e.target.value)} /></label>
            <label><span>Date of Birth</span><input type="date" value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} /></label>
            <label><span>Date Joined</span><input type="date" value={form.dateJoined} onChange={(e) => updateField("dateJoined", e.target.value)} /></label>
            <label><span>Pay Rate</span><input type="number" min="0" step="0.01" value={form.payRate} onChange={(e) => updateField("payRate", e.target.value)} /></label>
            <label><span>New Password (optional)</span><input type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} /></label>
          </div>

          <div className="location-box">
            <strong>Edit Assigned Locations</strong>
            <div className="location-list">
              {locations.map((l) => (
                <label key={l._id} className="location-chip">
                  <input
                    type="checkbox"
                    checked={form.assignedLocationIds.includes(l._id)}
                    onChange={() => toggleLocation(l._id)}
                  />
                  <span>{l.name}</span>
                </label>
              ))}
            </div>
          </div>

          {warning && <p className="validation-warning">{warning}</p>}
        </div>
      )}
    </div>
  );
}
