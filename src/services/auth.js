import axios from "axios";
import authApi from "../api/auth";

const authService = {
  login: async (credentials) => {
    const response = await axios.post(authApi.login, credentials);
    return response.data;
  },
};

export default authService;
