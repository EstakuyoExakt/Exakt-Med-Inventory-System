const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/skus`;

const skuApi = {
  createSku: `${API_URL}`,
  getAllSkus: (facilityId) => `${API_URL}?facilityId=${facilityId}`,
  searchSku: (search = "", facilityId) => {
    const params = new URLSearchParams();
    params.append("facilityId", facilityId);
    if (search) params.append("search", search);
    return `${API_URL}/search?${params.toString()}`;
  },
  searchSkus: (search = "", facilityId) => {
    const params = new URLSearchParams();
    params.append("facilityId", facilityId);
    if (search) params.append("search", search);
    return `${API_URL}/search?${params.toString()}`;
  },
  getSkuById: (id) => `${API_URL}/${id}`,
  updateSku: (id) => `${API_URL}/${id}`,
  deleteSku: (id) => `${API_URL}/${id}`,
  adjustStock: (id) => `${API_URL}/${id}/adjust-stock`,
  getReorderNeededSkus: (facilityId, search = "") => {
    const params = new URLSearchParams();
    params.append("facilityId", facilityId);
    if (search) params.append("search", search);
    return `${API_URL}/reorder-needed?${params.toString()}`;
  },
  getAdjustmentLogsBySku: (id) => `${API_URL}/${id}/adjustments`,
  getAdjustmentLogsByFacility: (facilityId) => `${API_URL}/adjustments?facilityId=${facilityId}`,
};

export default skuApi;
