import axios from "axios";
import skuApi from "../api/sku";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const skuService = {
  createSku: async (skuData, config = {}) => {
    const response = await axios.post(skuApi.createSku, skuData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getAllSkus: async (facilityId = null, config = {}) => {
    const response = await axios.get(skuApi.getAllSkus(facilityId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  searchSku: async (search = "", facilityId = null, config = {}) => {
    const response = await axios.get(skuApi.searchSku(search, facilityId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  searchSkus: async (search = "", facilityId = null, config = {}) => {
    const response = await axios.get(skuApi.searchSkus(search, facilityId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getSkuById: async (id, config = {}) => {
    const response = await axios.get(skuApi.getSkuById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateSku: async (id, skuData, config = {}) => {
    const response = await axios.put(skuApi.updateSku(id), skuData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  deleteSku: async (id, config = {}) => {
    const response = await axios.delete(skuApi.deleteSku(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  adjustStock: async (id, adjustmentData, config = {}) => {
    const response = await axios.patch(skuApi.adjustStock(id), adjustmentData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getReorderNeededSkus: async (facilityId = null, search = "", config = {}) => {
    const response = await axios.get(
      skuApi.getReorderNeededSkus(facilityId, search),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default skuService;
