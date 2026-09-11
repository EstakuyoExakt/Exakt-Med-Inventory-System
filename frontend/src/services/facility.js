import axios from "axios";
import facilityApi from "../api/facility";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const facilityService = {
  getAllFacilities: async (config = {}) => {
    const response = await axios.get(facilityApi.getAllFacilities, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getFacilityById: async (id, config = {}) => {
    const response = await axios.get(facilityApi.getFacilityById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  createFacility: async (facilityData, config = {}) => {
    const response = await axios.post(facilityApi.createFacility, facilityData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateFacility: async (id, facilityData, config = {}) => {
    const response = await axios.put(facilityApi.updateFacility(id), facilityData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  deleteFacility: async (id, config = {}) => {
    const response = await axios.delete(facilityApi.deleteFacility(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default facilityService;
