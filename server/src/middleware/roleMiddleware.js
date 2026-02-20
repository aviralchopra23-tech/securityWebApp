// src/middleware/roleMiddleware.js
const allowRoles = (...roles) => {
  const allowed = roles.map((r) => String(r).toUpperCase());
  return (req, res, next) => {
    const role = String(req.user?.role || "").toUpperCase();
    if (!req.user || !allowed.includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = { allowRoles };