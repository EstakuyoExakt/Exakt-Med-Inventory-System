const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/audit-logs`;

const auditLogApi = {
  getAuditLogs: (facilityId, module = "", severity = "", search = "") => {
    const params = new URLSearchParams();
    params.append("facilityId", facilityId);
    if (module && module !== "All Modules") params.append("module", module);
    if (severity && severity !== "All Severities") params.append("severity", severity);
    if (search && search.trim()) params.append("search", search.trim());
    return `${API_URL}?${params.toString()}`;
  },
};

export default auditLogApi;
