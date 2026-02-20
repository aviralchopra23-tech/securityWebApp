export const getUserRoleFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.role;
};

/* ======================================================
   SAFE ADDITION — READ USER NAME FROM JWT
   (Same trust level as role, no new logic)
====================================================== */

export const getUserNameFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = JSON.parse(atob(token.split(".")[1]));

  // Adjust field names ONLY if your backend uses different ones
  return payload.name || payload.fullName || payload.firstName || null;
};