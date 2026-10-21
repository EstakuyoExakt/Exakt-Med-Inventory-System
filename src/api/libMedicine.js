const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/medicines`;

const libMedicineApi = {
  searchMedicines: (params = "") => (params ? `${API_URL}?${params}` : API_URL),
  searchDropdown: (search = "", limit = 50) => {
    const query = new URLSearchParams();
    if (search) query.append("search", search);
    if (limit) query.append("limit", limit);
    const qs = query.toString();
    return qs ? `${API_URL}/search?${qs}` : `${API_URL}/search`;
  },
  getMedicineById: (id) => `${API_URL}/${id}`,
};

export default libMedicineApi;
