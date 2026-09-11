import axios from "axios";
import assignFacilityApi from "../api/assignFacility";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const normalizeUserIds = (data) => {
  if (Array.isArray(data)) {
    return { userIds: data };
  }
  return data;
};

const assignFacilityService = {
  assignUsersToFacility: async (facilityId, requestData, config = {}) => {
    const payload = normalizeUserIds(requestData);
    const response = await axios.post(
      assignFacilityApi.assignUsersToFacility(facilityId),
      payload,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  unassignUsersFromFacility: async (facilityId, requestData, config = {}) => {
    const payload = normalizeUserIds(requestData);
    const response = await axios.delete(
      assignFacilityApi.unassignUsersFromFacility(facilityId),
      {
        ...config,
        data: payload,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getAllAssignments: async (config = {}) => {
    const response = await axios.get(assignFacilityApi.getAllAssignments, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getAssignmentById: async (id, config = {}) => {
    const response = await axios.get(assignFacilityApi.getAssignmentById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default assignFacilityService;
