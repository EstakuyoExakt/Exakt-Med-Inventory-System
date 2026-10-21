import axios from "axios";
import auditLogApi from "../api/auditLog";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const auditLogService = {
  getAuditLogs: async (
    facilityId,
    module = "",
    severity = "",
    search = "",
    config = {},
  ) => {
    if (!facilityId) {
      throw new Error("Facility ID is strictly required to fetch audit logs.");
    }
    const response = await axios.get(
      auditLogApi.getAuditLogs(facilityId, module, severity, search),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default auditLogService;
