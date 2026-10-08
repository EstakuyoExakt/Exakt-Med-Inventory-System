const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/batches`;

const batchApi = {
  receiveBatch: `${API_URL}`,
  receiveBatchesBulk: `${API_URL}/bulk`,
  getBatchById: (id) => `${API_URL}/${id}`,
  getBatchesPaginated: ({
    facilityId,
    search,
    status,
    sku,
    expiryFilter,
    page = 0,
    size = 10,
    sortBy = "receivedAt",
    sortDir = "DESC",
  }) => {
    let url = `${API_URL}/paginated?facilityId=${facilityId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    if (status && status !== "ALL") url += `&status=${encodeURIComponent(status)}`;
    if (sku && sku !== "ALL") url += `&sku=${encodeURIComponent(sku)}`;
    if (expiryFilter && expiryFilter !== "ALL") url += `&expiryFilter=${encodeURIComponent(expiryFilter)}`;
    return url;
  },
  getBatchSummary: (facilityId) => `${API_URL}/summary?facilityId=${facilityId}`,
  getDistinctBatchSkus: (facilityId) => `${API_URL}/skus?facilityId=${facilityId}`,
  updateBatchStatus: (id) => `${API_URL}/${id}/status`,
  getBatchesBySku: (skuId, facilityId) => {
    return `${API_URL}/sku/${skuId}?facilityId=${facilityId}`;
  },
  processExpiredBatches: (facilityId, skuId) => {
    return `${API_URL}/process-expired?facilityId=${facilityId}&skuId=${skuId}`;
  },
};

export default batchApi;
