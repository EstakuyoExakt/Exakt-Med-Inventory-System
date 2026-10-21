const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/dispensed-logs`;

const dispensedLogApi = {
  getAll: (facilityId = null, status = null) => {
    const params = new URLSearchParams();
    if (facilityId) params.append("facilityId", facilityId);
    if (status && status !== "ALL") params.append("status", status);
    const queryString = params.toString();
    return queryString ? `${API_URL}?${queryString}` : API_URL;
  },
  getById: (id) => `${API_URL}/${id}`,
  markAsReceived: (id) => `${API_URL}/${id}/receive`,
};

export default dispensedLogApi;
