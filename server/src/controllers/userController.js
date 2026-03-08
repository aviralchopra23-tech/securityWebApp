const User = require("../models/User");
const Location = require("../models/Location");
const bcrypt = require("bcryptjs");

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizePhone = (value) =>
  typeof value === "string" ? value.replace(/\s+/g, "").trim() : "";

const normalizeImageDataUrl = (value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return "";
  const isImageDataUrl = /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(trimmed);
  if (!isImageDataUrl) return undefined;
  if (trimmed.length > 2_000_000) return undefined;
  return trimmed;
};

const normalizeDateInput = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

const countPhoneDigits = (value) => String(value || "").replace(/\D/g, "").length;

// ================= GET SUPERVISORS =================
exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({ role: "SUPERVISOR" })
      .select("firstName lastName assignedLocationId")
      .populate("assignedLocationId", "name");

    res.json(supervisors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= GET SUPERVISOR BY ID =================
exports.getSupervisorById = async (req, res) => {
  try {
    const { id } = req.params;
    const supervisor = await User.findOne({ _id: id, role: "SUPERVISOR" })
      .select("firstName lastName email personalEmail phoneNumber licenseNumber profilePhotoDataUrl homeAddress emergencyContactName dateOfBirth dateJoined payRate assignedLocationId")
      .populate("assignedLocationId", "name");

    if (!supervisor) {
      return res.status(404).json({ message: "Supervisor not found" });
    }

    res.json(supervisor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= GET GUARDS =================
exports.getGuards = async (req, res) => {
  try {
    const guards = await User.find({ role: "GUARD" })
      .select("firstName lastName assignedLocationIds")
      .populate("assignedLocationIds", "name");

    res.json(guards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= GET GUARD BY ID =================
exports.getGuardById = async (req, res) => {
  try {
    const { id } = req.params;
    const guard = await User.findOne({ _id: id, role: "GUARD" })
      .select("firstName lastName email personalEmail phoneNumber licenseNumber profilePhotoDataUrl homeAddress emergencyContactName dateOfBirth dateJoined payRate assignedLocationIds")
      .populate("assignedLocationIds", "name");

    if (!guard) {
      return res.status(404).json({ message: "Guard not found" });
    }

    res.json(guard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= UPDATE USER =================
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      personalEmail,
      phoneNumber,
      licenseNumber,
      profilePhotoDataUrl,
      homeAddress,
      emergencyContactName,
      dateOfBirth,
      dateJoined,
      payRate,
      assignedLocationIds,
      password,
    } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const normalizedEmail = normalizeEmail(email);
    if (email !== undefined && !normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedPersonalEmail = normalizeEmail(personalEmail);
    if (personalEmail !== undefined && !normalizedPersonalEmail) {
      return res.status(400).json({ message: "Personal email is required" });
    }

    const normalizedPhoneNumber = normalizePhone(phoneNumber);
    if (phoneNumber !== undefined && countPhoneDigits(normalizedPhoneNumber) < 10) {
      return res.status(400).json({ message: "Phone number must be at least 10 digits" });
    }

    const normalizedImage = normalizeImageDataUrl(profilePhotoDataUrl);
    if (profilePhotoDataUrl !== undefined && normalizedImage === undefined) {
      return res.status(400).json({ message: "Invalid profile photo format" });
    }

    const parsedDob = normalizeDateInput(dateOfBirth);
    if (dateOfBirth !== undefined && parsedDob === undefined) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    const parsedDateJoined = normalizeDateInput(dateJoined);
    if (dateJoined !== undefined && parsedDateJoined === undefined) {
      return res.status(400).json({ message: "Invalid date joined" });
    }

    const normalizedPayRate = payRate === undefined || payRate === ""
      ? undefined
      : Number(payRate);
    if (normalizedPayRate !== undefined && (!Number.isFinite(normalizedPayRate) || normalizedPayRate < 0)) {
      return res.status(400).json({ message: "Invalid pay rate" });
    }

    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.email = email !== undefined ? normalizedEmail : user.email;
    user.personalEmail = personalEmail !== undefined ? normalizedPersonalEmail : user.personalEmail;
    user.phoneNumber = phoneNumber !== undefined ? normalizedPhoneNumber : user.phoneNumber;
    user.licenseNumber = licenseNumber !== undefined ? String(licenseNumber).trim() : user.licenseNumber;
    user.profilePhotoDataUrl = profilePhotoDataUrl !== undefined ? normalizedImage : user.profilePhotoDataUrl;
    user.homeAddress = homeAddress !== undefined ? String(homeAddress).trim() : user.homeAddress;
    user.emergencyContactName = emergencyContactName !== undefined ? String(emergencyContactName).trim() : user.emergencyContactName;
    user.dateOfBirth = dateOfBirth !== undefined ? parsedDob : user.dateOfBirth;
    user.dateJoined = dateJoined !== undefined ? parsedDateJoined : user.dateJoined;
    user.payRate = normalizedPayRate !== undefined ? normalizedPayRate : user.payRate;

    const trimmedPassword = typeof password === "string" ? password.trim() : "";
    if (trimmedPassword) {
      user.password = await bcrypt.hash(trimmedPassword, 10);
    }

    if (user.role === "GUARD" && Array.isArray(assignedLocationIds)) {
      user.assignedLocationIds = assignedLocationIds;
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ================= DELETE USER =================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If supervisor, clear their location assignment
    if (user.role === "SUPERVISOR" && user.assignedLocationId) {
      await Location.findByIdAndUpdate(user.assignedLocationId, { supervisorId: null });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= CREATE SUPERVISOR =================
exports.createSupervisor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      personalEmail,
      phoneNumber,
      licenseNumber,
      profilePhotoDataUrl,
      homeAddress,
      emergencyContactName,
      dateOfBirth,
      dateJoined,
      payRate,
      password,
    } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPersonalEmail = normalizeEmail(personalEmail);
    const normalizedPhoneNumber = normalizePhone(phoneNumber);
    const normalizedLicenseNumber = typeof licenseNumber === "string" ? licenseNumber.trim() : "";
    const normalizedHomeAddress = typeof homeAddress === "string" ? homeAddress.trim() : "";
    const normalizedEmergencyContactName = typeof emergencyContactName === "string" ? emergencyContactName.trim() : "";
    const normalizedImage = normalizeImageDataUrl(profilePhotoDataUrl);
    const parsedDob = normalizeDateInput(dateOfBirth);
    const parsedDateJoined = normalizeDateInput(dateJoined);
    const normalizedPayRate = Number(payRate);

    if (
      !firstName ||
      !lastName ||
      !normalizedEmail ||
      !normalizedPersonalEmail ||
      !normalizedPhoneNumber ||
      !normalizedLicenseNumber ||
      !normalizedHomeAddress ||
      !normalizedEmergencyContactName ||
      !dateOfBirth ||
      !dateJoined ||
      payRate === undefined ||
      payRate === "" ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (countPhoneDigits(normalizedPhoneNumber) < 10) {
      return res.status(400).json({ message: "Phone number must be at least 10 digits" });
    }

    if (normalizedPersonalEmail === normalizedEmail) {
      return res.status(400).json({ message: "Personal email and app login email must be different" });
    }

    if (normalizedImage === undefined) {
      return res.status(400).json({ message: "Invalid profile photo format" });
    }

    if (!parsedDob) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    if (!parsedDateJoined) {
      return res.status(400).json({ message: "Invalid date joined" });
    }

    if (!Number.isFinite(normalizedPayRate) || normalizedPayRate < 0) {
      return res.status(400).json({ message: "Invalid pay rate" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const supervisor = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      personalEmail: normalizedPersonalEmail,
      phoneNumber: normalizedPhoneNumber,
      licenseNumber: normalizedLicenseNumber,
      profilePhotoDataUrl: normalizedImage,
      homeAddress: normalizedHomeAddress,
      emergencyContactName: normalizedEmergencyContactName,
      dateOfBirth: parsedDob,
      dateJoined: parsedDateJoined,
      payRate: normalizedPayRate,
      password: hashedPassword,
      role: "SUPERVISOR",
      assignedLocationId: null
    });

    res.status(201).json(supervisor);
  } catch (err) {
    console.error("Create supervisor error:", err);
    res.status(500).json({ message: "Failed to create supervisor" });
  }
};

// ================= CREATE GUARD =================
exports.createGuard = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      personalEmail,
      phoneNumber,
      licenseNumber,
      profilePhotoDataUrl,
      homeAddress,
      emergencyContactName,
      dateOfBirth,
      dateJoined,
      payRate,
      password,
      assignedLocationIds = [],
    } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPersonalEmail = normalizeEmail(personalEmail);
    const normalizedPhoneNumber = normalizePhone(phoneNumber);
    const normalizedLicenseNumber = typeof licenseNumber === "string" ? licenseNumber.trim() : "";
    const normalizedHomeAddress = typeof homeAddress === "string" ? homeAddress.trim() : "";
    const normalizedEmergencyContactName = typeof emergencyContactName === "string" ? emergencyContactName.trim() : "";
    const normalizedImage = normalizeImageDataUrl(profilePhotoDataUrl);
    const parsedDob = normalizeDateInput(dateOfBirth);
    const parsedDateJoined = normalizeDateInput(dateJoined);
    const normalizedPayRate = Number(payRate);

    if (
      !firstName ||
      !lastName ||
      !normalizedEmail ||
      !normalizedPersonalEmail ||
      !normalizedPhoneNumber ||
      !normalizedLicenseNumber ||
      !normalizedHomeAddress ||
      !normalizedEmergencyContactName ||
      !dateOfBirth ||
      !dateJoined ||
      payRate === undefined ||
      payRate === "" ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (countPhoneDigits(normalizedPhoneNumber) < 10) {
      return res.status(400).json({ message: "Phone number must be at least 10 digits" });
    }

    if (normalizedPersonalEmail === normalizedEmail) {
      return res.status(400).json({ message: "Personal email and app login email must be different" });
    }

    if (normalizedImage === undefined) {
      return res.status(400).json({ message: "Invalid profile photo format" });
    }

    if (!parsedDob) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    if (!parsedDateJoined) {
      return res.status(400).json({ message: "Invalid date joined" });
    }

    if (!Number.isFinite(normalizedPayRate) || normalizedPayRate < 0) {
      return res.status(400).json({ message: "Invalid pay rate" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const guard = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      personalEmail: normalizedPersonalEmail,
      phoneNumber: normalizedPhoneNumber,
      licenseNumber: normalizedLicenseNumber,
      profilePhotoDataUrl: normalizedImage,
      homeAddress: normalizedHomeAddress,
      emergencyContactName: normalizedEmergencyContactName,
      dateOfBirth: parsedDob,
      dateJoined: parsedDateJoined,
      payRate: normalizedPayRate,
      password: hashedPassword,
      role: "GUARD",
      assignedLocationIds
    });

    res.status(201).json(guard);
  } catch (err) {
    console.error("Create guard error:", err);
    res.status(500).json({ message: "Failed to create guard" });
  }
};

// ================= ASSIGN SUPERVISOR TO LOCATION =================
exports.assignSupervisor = async (req, res) => {
  try {
    const { supervisorId, locationId } = req.body;

    if (!supervisorId || !locationId) {
      return res.status(400).json({ message: "Supervisor ID and Location ID are required" });
    }

    const supervisor = await User.findById(supervisorId);
    const location = await Location.findById(locationId);

    if (!supervisor || supervisor.role !== "SUPERVISOR") {
      return res.status(400).json({ message: "Invalid supervisor" });
    }

    if (!location) return res.status(400).json({ message: "Invalid location" });

    // Remove previous supervisor from location if any
    if (location.supervisorId) {
      const prevSupervisor = await User.findById(location.supervisorId);
      if (prevSupervisor) {
        prevSupervisor.assignedLocationId = null;
        await prevSupervisor.save();
      }
    }

    // Remove supervisor from previous location if assigned
    if (supervisor.assignedLocationId) {
      const prevLocation = await Location.findById(supervisor.assignedLocationId);
      if (prevLocation) {
        prevLocation.supervisorId = null;
        await prevLocation.save();
      }
    }

    // Assign supervisor to new location
    supervisor.assignedLocationId = location._id;
    location.supervisorId = supervisor._id;

    await supervisor.save();
    await location.save();

    res.json({ message: "Supervisor assigned successfully" });
  } catch (err) {
    console.error("Assign supervisor error:", err);
    res.status(500).json({ message: "Failed to assign supervisor" });
  }
};