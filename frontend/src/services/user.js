import axios from "axios";
import userApi from "../api/user";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const userService = {
  getAllUsers: async (config = {}) => {
    const response = await axios.get(userApi.getAllUsers, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getUserById: async (id, config = {}) => {
    const response = await axios.get(userApi.getUserById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  createUser: async (userData, config = {}) => {
    const response = await axios.post(userApi.createUser, userData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateUser: async (id, userData, config = {}) => {
    const response = await axios.put(userApi.updateUser(id), userData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  deleteUser: async (id, config = {}) => {
    const response = await axios.delete(userApi.deleteUser(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default userService;
