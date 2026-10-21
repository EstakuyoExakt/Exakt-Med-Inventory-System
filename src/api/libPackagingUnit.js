const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/lib-packaging-units`;

const libPackagingUnitApi = {
  getAll: (category) => (category ? `${API_URL}?category=${encodeURIComponent(category)}` : API_URL),
};

export default libPackagingUnitApi;
