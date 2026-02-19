const Announcement = require("../models/Announcement");
const AnnouncementLocation = require("../models/AnnouncementLocation");
const Location = require("../models/Location");

/**
 * CREATE ANNOUNCEMENT
 * OWNER:
 *  - ALL locations
 *  - SPECIFIC locations (selected)
 *
 * SUPERVISOR:
 *  - SPECIFIC only
 *  - Restricted to their assigned location
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, locationScope } = req.body;
    let { locationIds } = req.body;

    const { id: userId, role } = req.user;
    console.log("JWT USER PAYLOAD:", req.user);



    // Basic validation
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    // Supervisor restrictions
    if (role === "SUPERVISOR") {
      if (locationScope !== "SPECIFIC") {
        return res
          .status(403)
          .json({ message: "Supervisor cannot target all locations" });
      }

      // Force supervisor location
      // Supervisor restrictions
      if (role === "SUPERVISOR") {
        if (locationScope !== "SPECIFIC") {
          return res
            .status(403)
            .json({ message: "Supervisor cannot target all locations" });
        }

        // 🔐 Resolve supervisor location from DB
        const location = await Location.findOne({ supervisorId: userId }).select("_id");

        if (!location) {
          return res
            .status(400)
            .json({ message: "Supervisor is not assigned to any location" });
        }

        locationIds = [location._id];
      }


    }

    // Owner validation
    if (role === "OWNER") {
      if (locationScope === "SPECIFIC" && (!locationIds || locationIds.length === 0)) {
        return res
          .status(400)
          .json({ message: "At least one location must be selected" });
      }
    }

    // Create announcement
    const announcement = await Announcement.create({
      title,
      message,
      createdByUserId: userId,
      createdByRole: role,
      locationScope,
    });

    // Save location mappings if needed
    if (locationScope === "SPECIFIC") {
      const locationDocs = locationIds.map((locationId) => ({
        announcementId: announcement._id,
        locationId,
      }));

      await AnnouncementLocation.insertMany(locationDocs);
    }

    res.status(201).json({
      message: "Announcement created successfully",
      announcementId: announcement._id,
    });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET ANNOUNCEMENTS FOR USER
 * OWNER:
 *  - Sees all
 *
 * SUPERVISOR / GUARD:
 *  - ALL scope
 *  - OR announcements mapped to their location
 */
exports.getAnnouncementsForUser = async (req, res) => {
  try {
    const { role, id: userId, assignedLocationIds } = req.user;

    // OWNER sees everything
    if (role === "OWNER") {
      const announcements = await Announcement.find({
        createdByRole: "OWNER",
      })
        .sort({ createdAt: -1 })
        .lean();

      return res.json(announcements);
    }


    let locationIds = [];

    // SUPERVISOR → resolve location from DB
    if (role === "SUPERVISOR") {
      const location = await Location.findOne({ supervisorId: userId }).select("_id");

      if (!location) {
        return res.json([]);
      }

      locationIds = [location._id];
    }

    // GUARD → use assigned locations from JWT
    if (role === "GUARD") {
      locationIds = assignedLocationIds || [];
    }

    // Find announcements mapped to these locations
    const mappedAnnouncementIds = await AnnouncementLocation.find({
      locationId: { $in: locationIds },
    }).distinct("announcementId");

    const announcements = await Announcement.find({
      $or: [
        { locationScope: "ALL" },
        { _id: { $in: mappedAnnouncementIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(announcements);
  } catch (error) {
    console.error("Fetch announcements error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
