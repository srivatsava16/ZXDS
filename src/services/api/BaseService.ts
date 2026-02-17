import axios from 'axios';
import { REQUEST_HEADER_AUTH_KEY, TOKEN_TYPE } from '../../constants';
import { store } from '../../store';

const unauthorizedCode = [401];

// Debug: Log the base URL being used
const baseURL = import.meta.env.MODE === "qa" ? "http://alaska.zti9.com/zxPlatformQAAPIs" 
  : import.meta.env.MODE === "uat" ? "http://alaska.zti9.com/zxPlatformUATAPIs" 
  : 'http://alaska.zti9.com/zxPlatformDevAPIs';
console.log('🔧 BaseService - Mode:', import.meta.env.MODE);
console.log('🔧 BaseService - Using baseURL:', baseURL);

const BaseService = axios.create({
    timeout: 60000,
    baseURL: baseURL,
    withCredentials: false,
});

BaseService.interceptors.request.use(
    config => {
        // Get auth token from Redux store
        const state = store?.getState();
        const accessToken = state?.auth?.token;

        if (accessToken) {
            config.headers[REQUEST_HEADER_AUTH_KEY] = `${TOKEN_TYPE}${accessToken}`;
        }

        // Add any additional headers
        config.params = { ...config?.params };

        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

BaseService.interceptors.response.use(
    response => response,
    error => {
        const { response } = error;
        
        // Handle unauthorized responses
        if (response && unauthorizedCode?.includes(error?.response?.status)) {
            // You can dispatch a logout action here if needed
        }

        return Promise.reject(error);
    }
);

export default BaseService;