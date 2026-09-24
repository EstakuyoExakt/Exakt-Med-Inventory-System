import axios from "axios";
import dashboardApi from "../api/dashboard";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const dashboardService = {
  getPharmacistDashboard: async (facilityId, config = {}) => {
    const response = await axios.get(
      dashboardApi.getPharmacistDashboard(facilityId),
      {
        ...config,
        headers: getAuthHeaders(config),
      }
    );
    return response.data;
  },

  getProcurementDashboard: async (facilityId, config = {}) => {
    const response = await axios.get(
      dashboardApi.getProcurementDashboard(facilityId),
      {
        ...config,
        headers: getAuthHeaders(config),
      }
    );
    return response.data;
  },

  getSummary: async (facilityId, config = {}) => {
    const response = await axios.get(dashboardApi.getSummary(facilityId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default dashboardService;
