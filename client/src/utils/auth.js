const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

export const getUserRoleFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return payload.role;
};

/* ======================================================
   SAFE ADDITION — READ USER NAME FROM JWT
   (Same trust level as role, no new logic)
====================================================== */

export const getUserNameFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Adjust field names ONLY if your backend uses different ones
  return payload.name || payload.fullName || payload.firstName || null;
};

export const getRoleFromTokenString = (token) => {
  const payload = decodeJwtPayload(token);
  return payload?.role || null;
};

export const getUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return payload.id || null;
};