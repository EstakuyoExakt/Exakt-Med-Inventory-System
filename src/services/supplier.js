import axios from "axios";
import supplierApi from "../api/supplier";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const supplierService = {
  getAllSuppliers: async (facilityId, config = {}) => {
    const response = await axios.get(supplierApi.getAllSuppliers(facilityId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getSupplierById: async (id, config = {}) => {
    const response = await axios.get(supplierApi.getSupplierById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  createSupplier: async (supplierData, config = {}) => {
    const response = await axios.post(supplierApi.createSupplier, supplierData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateSupplier: async (id, supplierData, config = {}) => {
    const response = await axios.put(supplierApi.updateSupplier(id), supplierData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  deleteSupplier: async (id, config = {}) => {
    const response = await axios.delete(supplierApi.deleteSupplier(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default supplierService;
