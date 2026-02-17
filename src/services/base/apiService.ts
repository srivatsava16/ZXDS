import type { ApiResponse } from '../../@types/api'

export class BaseApiService {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = import.meta.env?.VITE_API_BASE_URL || (import.meta.env.DEV || import.meta.env.MODE === 'qa' || import.meta.env.MODE === 'production' ? '/zxPlatformQAAPIs' : 'http://alaska.zti9.com/zxPlatformQAAPIs')) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private getHeaders(): Record<string, string> {
    const token = localStorage?.getItem('authToken')
    return {
      ...this.defaultHeaders,
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const config: RequestInit = {
        headers: this.getHeaders(),
        ...options,
      }

      const response = await fetch(url, config)
      const data = await response?.json()

      if (!response?.ok) {
        throw new Error(data?.message || `HTTP error! status: ${response?.status}`)
      }

      return data
    } catch (error) {
      throw error
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Upload file with form data
  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = localStorage?.getItem('authToken')
    const headers: Record<string, string> = {}

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    })
  }
}

export const apiService = new BaseApiService()