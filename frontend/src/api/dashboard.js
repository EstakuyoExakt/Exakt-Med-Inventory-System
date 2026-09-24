const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/dashboard`;

const dashboardApi = {
  getPharmacistDashboard: (facilityId) =>
    facilityId
      ? `${API_URL}/pharmacist?facilityId=${facilityId}`
      : `${API_URL}/pharmacist`,
  getProcurementDashboard: (facilityId) =>
    facilityId
      ? `${API_URL}/procurement?facilityId=${facilityId}`
      : `${API_URL}/procurement`,
  getSummary: (facilityId) =>
    facilityId
      ? `${API_URL}/summary?facilityId=${facilityId}`
      : `${API_URL}/summary`,
};

export default dashboardApi;
