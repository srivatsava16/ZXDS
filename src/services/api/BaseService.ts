import axios from 'axios';
import { REQUEST_HEADER_AUTH_KEY, TOKEN_TYPE } from '../../constants';
import { store } from '../../store';

const unauthorizedCode = [401];

const BaseService = axios.create({
    timeout: 60000,
    baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://zds-cust-api-01.bo3.e-dialog.com/zxPlatformDevAPIs'),
    withCredentials: true,
});

BaseService.interceptors.request.use(
    config => {
        // Get auth token from Redux store
        const state = store.getState();
        const accessToken = state.auth.token;

        if (accessToken) {
            config.headers[REQUEST_HEADER_AUTH_KEY] = `${TOKEN_TYPE}${accessToken}`;
        }

        // Add any additional headers
        config.params = { ...config.params };

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
        if (response && unauthorizedCode.includes(error?.response?.status)) {
            // You can dispatch a logout action here if needed
            console.warn('Unauthorized access detected');
        }

        return Promise.reject(error);
    }
);

export default BaseService;