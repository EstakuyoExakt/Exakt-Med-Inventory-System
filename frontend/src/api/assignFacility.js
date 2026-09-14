const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/assign/facilities`;

const assignFacilityApi = {
  assignUsersToFacility: (facilityId) => `${API_URL}/${facilityId}`,
  unassignUsersFromFacility: (facilityId) => `${API_URL}/${facilityId}`,
  getAllAssignments: `${API_URL}`,
  getAssignmentById: (id) => `${API_URL}/${id}`,
  getMyAssignedFacilities: `${API_URL}/my-facilities`,
  getUsersByFacilityId: (facilityId) => `${API_URL}/${facilityId}/users`,
};

export default assignFacilityApi;
