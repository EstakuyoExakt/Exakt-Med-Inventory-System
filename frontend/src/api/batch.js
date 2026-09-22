const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/batches`;

const batchApi = {
  receiveBatch: `${API_URL}`,
  receiveBatchesBulk: `${API_URL}/bulk`,
  getBatchesByFacility: (facilityId, status) => {
    let url = `${API_URL}?facilityId=${facilityId}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return url;
  },
  getBatchById: (id) => `${API_URL}/${id}`,
  updateBatchStatus: (id) => `${API_URL}/${id}/status`,
};

export default batchApi;
