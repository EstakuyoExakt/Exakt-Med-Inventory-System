const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/auth`;

const authApi = {
  login: `${API_URL}/login`,
};

export default authApi;
