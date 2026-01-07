// Application Constants
export const APP_CONFIG = {
  name: 'ZXDS',
  version: '1.0.0',
  description: 'ZXDS Data Management System',
  apiTimeout: 30000, // 30 seconds
  tokenRefreshInterval: 15 * 60 * 1000, // 15 minutes
} as const

// API Constants
export const REQUEST_HEADER_AUTH_KEY = 'Authorization';
export const TOKEN_TYPE = 'Bearer ';

// Route Constants
export const ROUTES = {
  // Auth Routes
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Public Routes
  HOME: '/',
  DATA_STREAMS: '/data-streams',
  UNIVERSAL_PULL: '/universal-pull',
  UNIVERSAL_PULL_REQUEST: '/universal-pull-request',
  UNIVERSAL_PULL_REQUEST_VIEW: '/universal-pull-request-view',
  ZIP_RADIUS_SEARCH: '/zip-radius-search',
  REPORTS: '/reports',
  REQUEST_CREATION: '/request-creation',

  // Admin Routes
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  
  // User Management
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_CREATE: '/admin/users/create',
  ADMIN_USER_MANAGE: '/admin/users/manage',
  ADMIN_USER_EDIT: '/admin/users/edit',
  
  // Role Management
  ADMIN_ROLES: '/admin/roles',
  ADMIN_ROLE_CREATE: '/admin/roles/create',
  ADMIN_ROLE_MANAGE: '/admin/roles/manage',
  ADMIN_ROLE_EDIT: '/admin/roles/edit',
  
  // Business Unit Management
  ADMIN_BUSINESS_UNITS: '/admin/business-units',
  ADMIN_BUSINESS_UNIT_CREATE: '/admin/business-units/create',
  ADMIN_BUSINESS_UNIT_MANAGE: '/admin/business-units/manage',
  ADMIN_BUSINESS_UNIT_EDIT: '/admin/business-units/edit',
  
  // Division Management
  ADMIN_DIVISIONS: '/admin/divisions',
  ADMIN_DIVISION_CREATE: '/admin/divisions/create',
  ADMIN_DIVISION_MANAGE: '/admin/divisions/manage',
  ADMIN_DIVISION_EDIT: '/admin/divisions/edit',
  
  // System Settings
  ADMIN_SYSTEM_SETTINGS: '/admin/system-settings',
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  
  // Users
  USERS: '/users',
  USER_BY_ID: (id: string) => `/users/${id}`,
  USER_PROFILE: '/users/profile',
  
  // Roles
  ROLES: '/roles',
  ROLE_BY_ID: (id: string) => `/roles/${id}`,
  
  // Business Units
  BUSINESS_UNITS: '/business-units',
  BUSINESS_UNIT_BY_ID: (id: string) => `/business-units/${id}`,
  
  // Divisions
  DIVISIONS: '/divisions',
  DIVISION_BY_ID: (id: string) => `/divisions/${id}`,
  DIVISIONS_BY_BUSINESS_UNIT: (businessUnitId: string) => `/business-units/${businessUnitId}/divisions`,
  
  // Data Streams
  DATA_STREAMS: '/data-streams',
  DATA_STREAM_BY_ID: (id: string) => `/data-streams/${id}`,
  
  // Universal Pull
  UNIVERSAL_PULL_REQUESTS: '/universal-pull-requests',
  UNIVERSAL_PULL_REQUEST_BY_ID: (id: string) => `/universal-pull-requests/${id}`,
  
  // Reports
  REPORTS: '/reports',
  REPORT_BY_ID: (id: string) => `/reports/${id}`,
  REPORT_GENERATE: '/reports/generate',
  
  // System Settings
  SYSTEM_SETTINGS: '/system-settings',
  SYSTEM_SETTING_BY_KEY: (key: string) => `/system-settings/${key}`,
} as const

// Theme Constants
export const THEME_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#8b5cf6',
  orange: '#f59e0b',
  red: '#ef4444',
} as const

// Status Constants
export const STATUS_TYPES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

// Role Constants
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest',
} as const

// Permission Constants
export const PERMISSIONS = {
  // User Permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Role Permissions
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  
  // Business Unit Permissions
  BUSINESS_UNIT_CREATE: 'business-unit:create',
  BUSINESS_UNIT_READ: 'business-unit:read',
  BUSINESS_UNIT_UPDATE: 'business-unit:update',
  BUSINESS_UNIT_DELETE: 'business-unit:delete',
  
  // Division Permissions
  DIVISION_CREATE: 'division:create',
  DIVISION_READ: 'division:read',
  DIVISION_UPDATE: 'division:update',
  DIVISION_DELETE: 'division:delete',
  
  // System Permissions
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_LOGS: 'system:logs',
} as const

// Validation Constants
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PATTERN: /^\+?[\d\s\-\(\)]+$/,
} as const

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const