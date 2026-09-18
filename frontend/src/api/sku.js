const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/skus`;

const skuApi = {
  createSku: `${API_URL}`,
  getAllSkus: (facilityId) =>
    facilityId ? `${API_URL}?facilityId=${facilityId}` : `${API_URL}`,
  searchSku: (search = "", facilityId = null) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (facilityId) params.append("facilityId", facilityId);
    const qs = params.toString();
    return qs ? `${API_URL}/search?${qs}` : `${API_URL}/search`;
  },
  searchSkus: (search = "", facilityId = null) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (facilityId) params.append("facilityId", facilityId);
    const qs = params.toString();
    return qs ? `${API_URL}/search?${qs}` : `${API_URL}/search`;
  },
  getSkuById: (id) => `${API_URL}/${id}`,
  updateSku: (id) => `${API_URL}/${id}`,
  deleteSku: (id) => `${API_URL}/${id}`,
};

export default skuApi;
