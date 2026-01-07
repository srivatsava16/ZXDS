import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import BaseService from './BaseService';

const ApiService = {
    fetchData<Response = unknown, Request = Record<string, unknown>>(
        param: AxiosRequestConfig<Request>
    ) {
        return new Promise<AxiosResponse<Response>>((resolve, reject) => {
            BaseService(param)
                .then((response: AxiosResponse<Response>) => {
                    resolve(response);
                })
                .catch((errors: AxiosError) => {
                    reject(errors);
                });
        });
    },
    
    transform<T>(response: any): T {
        if (response?.data) {
            return response?.data as T;
        }
        return response as T;
    },
};

export default ApiService;