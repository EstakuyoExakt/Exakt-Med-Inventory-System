import axios from "axios";
import bincardApi from "../api/bincard";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const bincardService = {
  getSkuBinCard: async (skuId, facilityId, startDate, endDate, config = {}) => {
    const response = await axios.get(
      bincardApi.getSkuBinCard(skuId, facilityId, startDate, endDate),
      {
        ...config,
        headers: getAuthHeaders(config),
      }
    );
    return response.data;
  },

  getFacilitySkus: async (facilityId, config = {}) => {
    const response = await axios.get(bincardApi.getFacilitySkus(facilityId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default bincardService;
