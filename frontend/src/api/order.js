const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/orders`;

const orderApi = {
  createOrder: `${API_URL}`,
  getAllOrders: (facilityId, status) => {
    let url = `${API_URL}?facilityId=${facilityId}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return url;
  },
  getOrderById: (id) => `${API_URL}/${id}`,
  updateOrderStatus: (id) => `${API_URL}/${id}/status`,
};

export default orderApi;
