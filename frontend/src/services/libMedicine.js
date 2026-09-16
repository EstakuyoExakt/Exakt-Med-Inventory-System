import axios from "axios";
import libMedicineApi from "../api/libMedicine";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const libMedicineService = {
  searchMedicines: async (params = {}, config = {}) => {
    let queryString = "";
    if (typeof params === "string") {
      queryString = new URLSearchParams({ search: params }).toString();
    } else if (params instanceof URLSearchParams) {
      queryString = params.toString();
    } else {
      queryString = new URLSearchParams(params).toString();
    }
    const response = await axios.get(libMedicineApi.searchMedicines(queryString), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  searchDropdown: async (search = "", limit = 50, config = {}) => {
    const response = await axios.get(
      libMedicineApi.searchDropdown(search, limit),
      {
        ...config,
        headers: getAuthHeaders(config),
      }
    );
    return response.data;
  },

  getMedicineById: async (id, config = {}) => {
    const response = await axios.get(libMedicineApi.getMedicineById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default libMedicineService;
