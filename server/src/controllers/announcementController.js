const Announcement = require("../models/Announcement");
const AnnouncementLocation = require("../models/AnnouncementLocation");
const AnnouncementRead = require("../models/AnnouncementRead");
const Location = require("../models/Location");

const resolveVisibleAnnouncements = async ({ role, userId, assignedLocationIds }) => {
  if (role === "OWNER") {
    return Announcement.find({ createdByRole: "OWNER" })
      .sort({ createdAt: -1 })
      .lean();
  }

  let locationIds = [];

  if (role === "SUPERVISOR") {
    const location = await Location.findOne({ supervisorId: userId }).select("_id");
    if (location) {
      locationIds = [location._id];
    }
  }

  if (role === "GUARD") {
    locationIds = assignedLocationIds || [];
  }

  const mappedAnnouncementIds =
    locationIds.length > 0
      ? await AnnouncementLocation.find({
          locationId: { $in: locationIds },
        }).distinct("announcementId")
      : [];

  return Announcement.find({
    $or: [{ locationScope: "ALL" }, { _id: { $in: mappedAnnouncementIds } }],
  })
    .sort({ createdAt: -1 })
    .lean();
};

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

      const location = await Location.findOne({ supervisorId: userId }).select("_id");
      if (!location) {
        return res
          .status(400)
          .json({ message: "Supervisor is not assigned to any location" });
      }

      locationIds = [location._id];
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

    const announcements = await resolveVisibleAnnouncements({
      role,
      userId,
      assignedLocationIds,
    });

    res.json(announcements);
  } catch (error) {
    console.error("Fetch announcements error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUnreadAnnouncementCount = async (req, res) => {
  try {
    const { role, id: userId, assignedLocationIds } = req.user;

    const announcements = await resolveVisibleAnnouncements({
      role,
      userId,
      assignedLocationIds,
    });

    const visibleAnnouncementIds = announcements
      .filter(
        (announcement) =>
          String(announcement.createdByUserId) !== String(userId)
      )
      .map((announcement) => announcement._id);

    if (visibleAnnouncementIds.length === 0) {
      return res.json({ unreadCount: 0 });
    }

    const readAnnouncementIds = await AnnouncementRead.find({
      userId,
      announcementId: { $in: visibleAnnouncementIds },
    }).distinct("announcementId");

    const readSet = new Set(readAnnouncementIds.map((id) => String(id)));
    const unreadCount = visibleAnnouncementIds.reduce(
      (count, announcementId) =>
        readSet.has(String(announcementId)) ? count : count + 1,
      0
    );

    res.json({ unreadCount });
  } catch (error) {
    console.error("Unread announcements error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markAnnouncementsRead = async (req, res) => {
  try {
    const { role, id: userId, assignedLocationIds } = req.user;

    const announcements = await resolveVisibleAnnouncements({
      role,
      userId,
      assignedLocationIds,
    });

    const unreadCandidateIds = announcements
      .filter(
        (announcement) =>
          String(announcement.createdByUserId) !== String(userId)
      )
      .map((announcement) => announcement._id);

    if (unreadCandidateIds.length === 0) {
      return res.json({ markedCount: 0, unreadCount: 0 });
    }

    const alreadyReadIds = await AnnouncementRead.find({
      userId,
      announcementId: { $in: unreadCandidateIds },
    }).distinct("announcementId");

    const alreadyReadSet = new Set(alreadyReadIds.map((id) => String(id)));
    const toInsert = unreadCandidateIds
      .filter((announcementId) => !alreadyReadSet.has(String(announcementId)))
      .map((announcementId) => ({
        announcementId,
        userId,
        readAt: new Date(),
      }));

    if (toInsert.length > 0) {
      await AnnouncementRead.insertMany(toInsert, { ordered: false });
    }

    res.json({ markedCount: toInsert.length, unreadCount: 0 });
  } catch (error) {
    console.error("Mark announcements read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
