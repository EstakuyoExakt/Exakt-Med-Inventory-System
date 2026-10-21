const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/facilities`;

const facilityApi = {
  createFacility: `${API_URL}`,
  getFacilitiesByProjectId: (projectId) => `${API_URL}?projectId=${projectId}`,
  updateFacility: (id) => `${API_URL}/${id}`,
  deleteFacility: (id) => `${API_URL}/${id}`,
};

export default facilityApi;
