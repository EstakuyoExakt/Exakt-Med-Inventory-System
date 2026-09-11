const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/assign/projects`;

const assignProjectApi = {
  assignAdminsToProject: (projectId) => `${API_URL}/${projectId}`,
  unassignAdminsFromProject: (projectId) => `${API_URL}/${projectId}`,
  getAllAssignments: `${API_URL}`,
  getAssignmentById: (id) => `${API_URL}/${id}`,
};

export default assignProjectApi;
