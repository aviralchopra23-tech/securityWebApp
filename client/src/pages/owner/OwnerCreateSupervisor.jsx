import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { assignSupervisor, createSupervisor, getLocations } from "../../api/ownerApi";
import "../../styles/ownerCreateSupervisor.css";

export default function OwnerCreateSupervisor() {
  const navigate = useNavigate();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    licenseNumber: "",
    personalEmail: "",
    homeAddress: "",
    emergencyContactName: "",
    dateOfBirth: "",
    dateJoined: "",
    payRate: "",
    email: "",
    password: "",
    assignedLocationId: "",
  });

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const data = await getLocations();
        setLocations(data);
      } catch {
        setWarning("Failed to load locations.");
      }
    };
    loadLocations();
  }, []);

  const updateField = (key, value) => {
    setWarning("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      licenseNumber: form.licenseNumber.trim(),
      personalEmail: form.personalEmail.trim(),
      homeAddress: form.homeAddress.trim(),
      emergencyContactName: form.emergencyContactName.trim(),
      dateOfBirth: form.dateOfBirth,
      dateJoined: form.dateJoined,
      email: form.email.trim(),
      password: form.password.trim(),
      payRate: Number(form.payRate),
      assignedLocationId: form.assignedLocationId,
    };

    if (
      !payload.firstName ||
      !payload.lastName ||
      !payload.phoneNumber ||
      !payload.licenseNumber ||
      !payload.personalEmail ||
      !payload.homeAddress ||
      !payload.emergencyContactName ||
      !payload.dateOfBirth ||
      !payload.dateJoined ||
      !payload.email ||
      !payload.password ||
      form.payRate === ""
    ) {
      setWarning("All fields are required.");
      return;
    }

    if (!emailRegex.test(payload.personalEmail) || !emailRegex.test(payload.email)) {
      setWarning("Enter valid personal and app login email addresses.");
      return;
    }

    if (payload.personalEmail.toLowerCase() === payload.email.toLowerCase()) {
      setWarning("Personal email and app login email must be different.");
      return;
    }

    if (payload.phoneNumber.replace(/\D/g, "").length < 10) {
      setWarning("Phone number must contain at least 10 digits.");
      return;
    }

    if (!Number.isFinite(payload.payRate) || payload.payRate < 0) {
      setWarning("Pay rate must be a valid non-negative number.");
      return;
    }

    if (payload.password.length < 6) {
      setWarning("Password must be at least 6 characters.");
      return;
    }

    if (!profilePhotoFile) {
      setWarning("Profile photo is required.");
      return;
    }

    if (!profilePhotoFile.type.startsWith("image/")) {
      setWarning("Please select a valid image file.");
      return;
    }

    if (profilePhotoFile.size > 1024 * 1024) {
      setWarning("Profile photo must be 1MB or smaller.");
      return;
    }

    setIsSubmitting(true);
    setWarning("");

    try {
      const profilePhotoDataUrl = await fileToDataUrl(profilePhotoFile);
      const created = await createSupervisor({ ...payload, profilePhotoDataUrl });
      if (payload.assignedLocationId) {
        await assignSupervisor({
          supervisorId: created._id,
          locationId: payload.assignedLocationId,
        });
      }
      navigate("/owner/users/supervisors");
    } catch (err) {
      setWarning(err.response?.data?.message || "Failed to create supervisor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-supervisor-page">
      <div className="create-supervisor-header">
        <h3>Create Supervisor</h3>
        <button type="button" className="btn-cancel" onClick={() => navigate("/owner/users/supervisors")}>Back</button>
      </div>

      <form className="create-supervisor-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field-group">
            <span>First Name</span>
            <input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
          </label>

          <label className="field-group">
            <span>Last Name</span>
            <input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
          </label>

          <label className="field-group">
            <span>Phone</span>
            <input value={form.phoneNumber} onChange={(e) => updateField("phoneNumber", e.target.value)} />
          </label>

          <label className="field-group">
            <span>License</span>
            <input value={form.licenseNumber} onChange={(e) => updateField("licenseNumber", e.target.value)} />
          </label>

          <label className="field-group">
            <span>Email Address (Personal)</span>
            <input value={form.personalEmail} onChange={(e) => updateField("personalEmail", e.target.value)} />
          </label>

          <label className="field-group field-span-2">
            <span>Home Address</span>
            <input value={form.homeAddress} onChange={(e) => updateField("homeAddress", e.target.value)} />
          </label>

          <label className="field-group">
            <span>Emergency Contact</span>
            <input value={form.emergencyContactName} onChange={(e) => updateField("emergencyContactName", e.target.value)} />
          </label>

          <label className="field-group">
            <span>Date of Birth</span>
            <input type="date" value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
          </label>

          <label className="field-group">
            <span>Date Joined</span>
            <input type="date" value={form.dateJoined} onChange={(e) => updateField("dateJoined", e.target.value)} />
          </label>

          <label className="field-group">
            <span>Pay Rate</span>
            <input type="number" min="0" step="0.01" value={form.payRate} onChange={(e) => updateField("payRate", e.target.value)} />
          </label>

          <label className="field-group">
            <span>App Email</span>
            <input value={form.email} onChange={(e) => updateField("email", e.target.value)} />
          </label>

          <label className="field-group">
            <span>App Password</span>
            <input type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} />
          </label>

          <label className="field-group">
            <span>Assign Location (optional)</span>
            <select value={form.assignedLocationId} onChange={(e) => updateField("assignedLocationId", e.target.value)}>
              <option value="">Unassigned</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>
          </label>

          <label className="field-group field-span-2">
            <span>Profile Photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setWarning("");
                setProfilePhotoFile(e.target.files?.[0] || null);
              }}
            />
          </label>
        </div>

        {warning && <p className="validation-warning">{warning}</p>}

        <div className="create-supervisor-actions">
          <button type="submit" className="btn-create" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Supervisor"}
          </button>
        </div>
      </form>
    </div>
  );
}
