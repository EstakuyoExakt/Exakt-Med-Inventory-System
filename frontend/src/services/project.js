import axios from "axios";
import projectApi from "../api/project";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const projectService = {
  getAllProjects: async (config = {}) => {
    const response = await axios.get(projectApi.getAllProjects, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getProjectById: async (id, config = {}) => {
    const response = await axios.get(projectApi.getProjectById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  createProject: async (projectData, config = {}) => {
    const response = await axios.post(projectApi.createProject, projectData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateProject: async (id, projectData, config = {}) => {
    const response = await axios.put(projectApi.updateProject(id), projectData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  deleteProject: async (id, config = {}) => {
    const response = await axios.delete(projectApi.deleteProject(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default projectService;
