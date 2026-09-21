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

  getAllOrders: async (facilityId, statusOrConfig = null, config = {}) => {
    if (!facilityId) {
      throw new Error("Facility ID is required to fetch orders.");
    }
    let status = null;
    let actualConfig = config;

    if (statusOrConfig && typeof statusOrConfig === "object") {
      actualConfig = statusOrConfig;
    } else if (typeof statusOrConfig === "string") {
      status = statusOrConfig;
    }

    const response = await axios.get(
      orderApi.getAllOrders(facilityId, status),
      {
        ...actualConfig,
        headers: getAuthHeaders(actualConfig),
      },
    );
    return response.data;
  },

  getOrderById: async (id, config = {}) => {
    const response = await axios.get(orderApi.getOrderById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateOrderStatus: async (id, status, notes = null, config = {}) => {
    const params = { status };
    if (notes) {
      params.notes = notes;
    }
    const response = await axios.patch(orderApi.updateOrderStatus(id), null, {
      ...config,
      params,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default orderService;
