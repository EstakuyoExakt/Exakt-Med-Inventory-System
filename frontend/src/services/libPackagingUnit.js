import axios from "axios";
import libPackagingUnitApi from "../api/libPackagingUnit";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const libPackagingUnitService = {
  getAll: async (category, config = {}) => {
    const response = await axios.get(libPackagingUnitApi.getAll(category), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default libPackagingUnitService;
