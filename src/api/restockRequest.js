const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/restock-requests`;

const restockRequestApi = {
  createRequest: `${API_URL}`,
  getAllRequests: (facilityId, pendingOnly = false) => {
    let url = `${API_URL}?pendingOnly=${Boolean(pendingOnly)}`;
    if (facilityId) url += `&facilityId=${facilityId}`;
    return url;
  },
  getRequestById: (id) => `${API_URL}/${id}`,
};

export default restockRequestApi;
