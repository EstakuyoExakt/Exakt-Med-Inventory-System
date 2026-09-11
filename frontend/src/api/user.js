const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/user`;

const userApi = {
  createUser: `${API_URL}`,
  getAllUsers: `${API_URL}`,
  getUserById: (id) => `${API_URL}/${id}`,
  updateUser: (id) => `${API_URL}/${id}`,
  deleteUser: (id) => `${API_URL}/${id}`,
};

export default userApi;
