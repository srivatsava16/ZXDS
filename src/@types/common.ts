/**
 * Common type definitions used across the application
 */

// Common configuration interfaces
export interface BaseConfig {
  id: string;
  inputSources: string[];
}

// Module-specific configs
export interface AppendConfig extends BaseConfig {
  appendOnFields: string[];
  appendSources: string[];
  appendFields: string[];
}

export interface MatchConfig extends BaseConfig {
  matchOnFields: string[];
  matchSources: string[];
  matchFields: string[];
}

export interface SuppressConfig extends BaseConfig {
  suppressOnFields: string[];
  suppressSources: string[];
}

export interface OutputConfig extends BaseConfig {
  outputFields: string[];
  destinations: OutputDestination[];
  combineSources: boolean;
  combineSourcesList?: string[];
  priorityOrder?: string[];
  fieldPriority?: Record<string, string[]>;
  limitation: boolean;
  limitCount?: number;
  random: boolean;
}

export interface StatsConfig {
  id: string;
  inputSources: string[];
  countOnField: string;
  distinct: boolean;
  breakdownFields: string[];
}

export interface OutputDestination {
  id: string;
  type: 'SFTP' | 'S3' | 'NFS';
  source: string;
  filePath: string;
  fileName: string;
  fileFormat: 'CSV' | 'TXT' | 'XLSX' | 'JSON' | 'Parquet';
  splitOutput: boolean;
  splitBy?: string;
  delimiter?: string;
}

// Schedule related types
export type ScheduleType = 'adhoc' | 'recurring';
export type RecurrenceUnit = 'hours' | 'days' | 'weeks' | 'months';
export type EmailNotification = 'none' | 'on-completion' | 'on-failure' | 'always';

export interface ScheduleConfig {
  type: ScheduleType;
  recurrence?: {
    unit: RecurrenceUnit;
    interval: number;
    startDate: string;
    endDate?: string;
  };
  emailNotification: EmailNotification;
  emailRecipients?: string[];
}

// Field mapping types
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'none';
}

// Versioned source types
export interface VersionedSource {
  id: string;
  sourceName: string;
  sourceType: 'Version';
  isVersioned: true;
  versionNumber: number;
  versionLabel: string;
  sourceModule: 'Match' | 'Append' | 'Suppress';
  baseInputSources: string[];
  operationSources: string[];
  operationFields?: string[];
  headers?: string[];
  dataTypes?: Record<string, string>;
  configJson?: any;
}

// Filter types
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_null'
  | 'is_not_null'
  | 'in'
  | 'not_in';

export type FilterLogic = 'AND' | 'OR';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | string[];
}

export interface FilterGroup {
  id: string;
  logic: FilterLogic;
  conditions: FilterCondition[];
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form validation types
export type ValidationRule =
  | 'required'
  | 'email'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'custom';

export interface ValidationError {
  field: string;
  message: string;
  rule: ValidationRule;
}

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Status types
export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type UserStatus = 'active' | 'inactive' | 'suspended';

// Common prop types for components
export interface DialogProps {
  open: boolean;
  onClose: () => void;
}

export interface FormDialogProps<T> extends DialogProps {
  onSave: (data: T) => void;
  editingItem?: T | null;
}

export interface TableActionProps<T> {
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
}
