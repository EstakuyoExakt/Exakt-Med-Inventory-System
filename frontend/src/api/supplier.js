const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/suppliers`;

const supplierApi = {
  createSupplier: `${API_URL}`,
  getAllSuppliers: (facilityId) =>
    facilityId ? `${API_URL}?facilityId=${facilityId}` : `${API_URL}`,
  getSupplierById: (id) => `${API_URL}/${id}`,
  updateSupplier: (id) => `${API_URL}/${id}`,
  deleteSupplier: (id) => `${API_URL}/${id}`,
};

export default supplierApi;
