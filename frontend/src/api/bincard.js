const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/bincard`;

const bincardApi = {
  getSkuBinCard: (skuId, facilityId, startDate, endDate) => {
    let url = `${API_URL}/sku/${skuId}?facilityId=${facilityId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },
  getFacilitySkus: (facilityId) => `${API_URL}/facility/${facilityId}/skus`,
};

export default bincardApi;
