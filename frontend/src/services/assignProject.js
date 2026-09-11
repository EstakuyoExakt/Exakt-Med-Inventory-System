import axios from "axios";
import assignProjectApi from "../api/assignProject";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const normalizeUserIds = (data) => {
  if (Array.isArray(data)) {
    return { userIds: data };
  }
  return data;
};

const assignProjectService = {
  assignAdminsToProject: async (projectId, requestData, config = {}) => {
    const payload = normalizeUserIds(requestData);
    const response = await axios.post(
      assignProjectApi.assignAdminsToProject(projectId),
      payload,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  unassignAdminsFromProject: async (projectId, requestData, config = {}) => {
    const payload = normalizeUserIds(requestData);
    const response = await axios.delete(
      assignProjectApi.unassignAdminsFromProject(projectId),
      {
        ...config,
        data: payload,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getAllAssignments: async (config = {}) => {
    const response = await axios.get(assignProjectApi.getAllAssignments, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getAssignmentById: async (id, config = {}) => {
    const response = await axios.get(assignProjectApi.getAssignmentById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default assignProjectService;
