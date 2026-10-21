const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/lib-locations`;

const libLocationApi = {
  createLocation: `${API_URL}`,
  getAllLocations: (params = {}) => {
    const query = new URLSearchParams();
    if (params.facilityId) query.append("facilityId", params.facilityId);
    if (params.activeOnly !== undefined && params.activeOnly !== null) {
      query.append("activeOnly", params.activeOnly);
    }
    if (params.storageType) query.append("storageType", params.storageType);
    const queryString = query.toString();
    return queryString ? `${API_URL}?${queryString}` : `${API_URL}`;
  },
  getLocationById: (id) => `${API_URL}/${id}`,
  updateLocation: (id) => `${API_URL}/${id}`,
  deleteLocation: (id) => `${API_URL}/${id}`,
  suggestCode: (storageType, facilityId) => {
    const query = new URLSearchParams();
    if (storageType) query.append("storageType", storageType);
    if (facilityId) query.append("facilityId", facilityId);
    return `${API_URL}/suggest-code?${query.toString()}`;
  },
};

export default libLocationApi;
