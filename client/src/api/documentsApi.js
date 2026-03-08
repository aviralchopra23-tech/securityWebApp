import api from "./axios";

export const uploadMyDocuments = async (payload) => {
  const res = await api.post("/documents", payload);
  return res.data;
};

export const getMyDocuments = async () => {
  const res = await api.get("/documents/my");
  return res.data;
};

export const getDocumentsForUser = async (userId) => {
  const res = await api.get(`/documents/user/${userId}`);
  return res.data;
};

export const deleteDocumentById = async (documentId) => {
  const res = await api.delete(`/documents/${documentId}`);
  return res.data;
};
