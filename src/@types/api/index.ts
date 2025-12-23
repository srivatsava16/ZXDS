// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

// User Types
export interface User {
  id?: string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  businessUnit?: string
  division?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

// Business Unit Types
export interface BusinessUnit {
  id?: string
  name?: string
  description?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

// Division Types
export interface Division {
  id?: string
  name?: string
  description?: string
  businessUnitId?: string
  businessUnit?: BusinessUnit
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

// Role Types
export interface Role {
  id?: string
  name?: string
  description?: string
  permissions?: Permission[]
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

// Permission Types
export interface Permission {
  id?: string
  name?: string
  resource?: string
  action?: string
  description?: string
}

// Auth Types
export interface LoginCredentials {
  username?: string
  password?: string
}

export interface LoginResponse {
  token?: string
  refreshToken?: string
  user?: User
}

// Data Stream Types
export interface DataStream {
  id?: string
  name?: string
  description?: string
  type?: string
  status?: 'active' | 'inactive' | 'pending'
  configuration?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

// Universal Pull Types
export interface UniversalPullRequest {
  id?: string
  requestId?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  parameters?: Record<string, any>
  results?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

// Report Types
export interface Report {
  id?: string
  name?: string
  type?: string
  parameters?: Record<string, any>
  data?: any[]
  createdAt?: string
  updatedAt?: string
}

// System Settings Types
export interface SystemSetting {
  id?: string
  key?: string
  value?: string
  category?: string
  description?: string
  isEditable?: boolean
  updatedAt?: string
}