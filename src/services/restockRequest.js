import axios from "axios";
import restockRequestApi from "../api/restockRequest";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const restockRequestService = {
  createRestockRequest: async (requestData, config = {}) => {
    const response = await axios.post(
      restockRequestApi.createRequest,
      requestData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getAllRestockRequests: async (
    facilityId = null,
    pendingOnly = false,
    config = {},
  ) => {
    const response = await axios.get(
      restockRequestApi.getAllRequests(facilityId, pendingOnly),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getRestockRequestById: async (id, config = {}) => {
    const response = await axios.get(restockRequestApi.getRequestById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default restockRequestService;
