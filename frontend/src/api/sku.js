const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/skus`;

const skuApi = {
  createSku: `${API_URL}`,
  getSkusPaginated: ({
    facilityId,
    search,
    status,
    stockFilter,
    page = 0,
    size = 10,
    sortBy = "brandName",
    sortDir = "ASC",
  }) => {
    let url = `${API_URL}/paginated?facilityId=${facilityId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    const filterValue = status || stockFilter;
    if (filterValue && filterValue !== "ALL") url += `&status=${encodeURIComponent(filterValue)}`;
    return url;
  },
  getSkuSummary: (facilityId) => `${API_URL}/summary?facilityId=${facilityId}`,
  getDropdownSkus: (facilityId) => `${API_URL}/dropdown?facilityId=${facilityId}`,
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
