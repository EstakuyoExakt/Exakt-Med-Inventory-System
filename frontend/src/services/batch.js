import axios from "axios";
import batchApi from "../api/batch";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const batchService = {
  getBatchesPaginated: async (params, config = {}) => {
    if (!params?.facilityId) {
      throw new Error("Facility ID is required to fetch batches.");
    }
    const response = await axios.get(batchApi.getBatchesPaginated(params), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getBatchSummary: async (facilityId, config = {}) => {
    if (!facilityId) return null;
    const response = await axios.get(batchApi.getBatchSummary(facilityId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getDistinctBatchSkus: async (facilityId, config = {}) => {
    if (!facilityId) return [];
    const response = await axios.get(batchApi.getDistinctBatchSkus(facilityId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getBatchById: async (id, config = {}) => {
    const response = await axios.get(batchApi.getBatchById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  receiveBatch: async (batchData, config = {}) => {
    const response = await axios.post(batchApi.receiveBatch, batchData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  receiveBatchesBulk: async (batchesList, config = {}) => {
    const response = await axios.post(
      batchApi.receiveBatchesBulk,
      batchesList,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  updateBatchStatus: async (id, status, notes = null, config = {}) => {
    let url =
      batchApi.updateBatchStatus(id) + `?status=${encodeURIComponent(status)}`;
    if (notes) {
      url += `&notes=${encodeURIComponent(notes)}`;
    }
    const response = await axios.patch(url, null, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getBatchesBySku: async (skuId, facilityId, config = {}) => {
    if (!skuId || !facilityId) return [];
    const response = await axios.get(
      batchApi.getBatchesBySku(skuId, facilityId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  processExpiredBatches: async (facilityId, skuId, config = {}) => {
    if (!facilityId) {
      throw new Error("Facility ID is required to process expired batches.");
    }
    if (!skuId) {
      throw new Error("SKU ID is required to process expired batches.");
    }
    const response = await axios.post(
      batchApi.processExpiredBatches(facilityId, skuId),
      null,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default batchService;
