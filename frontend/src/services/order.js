import axios from "axios";
import orderApi from "../api/order";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const orderService = {
  createOrder: async (orderData, config = {}) => {
    const response = await axios.post(orderApi.createOrder, orderData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getAllOrders: async (config = {}) => {
    const response = await axios.get(orderApi.getAllOrders, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getOrderById: async (id, config = {}) => {
    const response = await axios.get(orderApi.getOrderById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateOrderStatus: async (id, status, config = {}) => {
    const response = await axios.patch(
      orderApi.updateOrderStatus(id),
      null,
      {
        ...config,
        params: { status },
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default orderService;
