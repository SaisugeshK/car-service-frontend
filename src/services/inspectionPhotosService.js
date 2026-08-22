import api from '../api/axios';

// Phase 33/34 — real backend now exists (InspectionPhotoController). Multipart upload, not JSON.
export const inspectionPhotosService = {
  getByJobCard: (jobCardId) => api.get(`/inspection-items/${jobCardId}/photos`).then((res) => res.data),
  upload: (jobCardId, category, file) => {
    const form = new FormData();
    form.append('category', category);
    form.append('file', file);
    return api.post(`/inspection-items/${jobCardId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
  remove: (photoId) => api.delete(`/inspection-items/photos/${photoId}`).then((res) => res.data),
  // The backend serves photos on the same authenticated /api/** surface as everything else — a
  // bare <img src> can't carry the Bearer header, so callers fetch the bytes as a blob (axios
  // attaches the header) and render from an object URL. See AuthedPhoto in JobCardDetail.jsx.
  getPhotoBlob: (photoId) => api.get(`/inspection-items/photos/${photoId}`, { responseType: 'blob' }).then((res) => res.data),
};
export default inspectionPhotosService;
