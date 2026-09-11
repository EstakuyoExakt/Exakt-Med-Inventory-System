const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/projects`;

const projectApi = {
  createProject: `${API_URL}`,
  getAllProjects: `${API_URL}`,
  getProjectById: (id) => `${API_URL}/${id}`,
  updateProject: (id) => `${API_URL}/${id}`,
  deleteProject: (id) => `${API_URL}/${id}`,
};

export default projectApi;
