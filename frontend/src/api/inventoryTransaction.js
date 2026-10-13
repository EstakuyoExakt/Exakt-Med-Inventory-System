const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/inventory-transactions`;
const SKU_API_URL = `${BASE_URL}/api/skus`;

const inventoryTransactionApi = {
  // Ledger (Bin Card) endpoints
  getLedger: (skuId, facilityId, startDate, endDate) => {
    let url = `${API_URL}/ledger?facilityId=${facilityId}&skuId=${skuId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  // Backward compatibility alias for Bin Card
  getSkuBinCard: (skuId, facilityId, startDate, endDate) => {
    let url = `${API_URL}/ledger?facilityId=${facilityId}&skuId=${skuId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  getFacilitySkus: (facilityId) => `${API_URL}/skus?facilityId=${facilityId}`,

  // Transaction list endpoints
  getTransactionsByFacility: (facilityId, types = []) => {
    let url = `${API_URL}?facilityId=${facilityId}`;
    if (types && types.length > 0) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    return url;
  },

  getTransactionsBySku: (skuId, types = []) => {
    let url = `${API_URL}/sku/${skuId}`;
    if (types && types.length > 0) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `?types=${encodeURIComponent(typeParams)}`;
    }
    return url;
  },

  // Stock Adjustment endpoints
  adjustStock: (id) => `${SKU_API_URL}/${id}/adjust-stock`,

  getAdjustmentLogsByFacility: (facilityId) => {
    return `${API_URL}?facilityId=${facilityId}&types=ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE`;
  },

  getAdjustmentLogsBySku: (skuId) => {
    return `${API_URL}/sku/${skuId}?types=ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE`;
  },
};

export default inventoryTransactionApi;
