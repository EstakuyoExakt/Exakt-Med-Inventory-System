const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/orders`;

const orderApi = {
  createOrder: `${API_URL}`,
  getAllOrders: (facilityId) => `${API_URL}?facilityId=${facilityId}`,
  getOrderById: (id) => `${API_URL}/${id}`,
  updateOrderStatus: (id) => `${API_URL}/${id}/status`,
};

export default orderApi;
