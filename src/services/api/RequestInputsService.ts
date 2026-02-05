import ApiService from './ApiService';

export interface RequestInputsResponse {
  fileSource: {
    sftpSources: Array<{
      id: number;
      name: string;
      host?: string;
      port?: string;
      path?: string;
      username?: string;
      password?: string;
    }>;
    nfsSources: Array<{
      id: number;
      name: string;
      hostserver?: string;
      mountpath?: string;
    }>;
    awsSources: Array<{
      id: number;
      name: string;
      bucketname?: string;
      region?: string;
      path?: string;
      accesskey?: string;
    }>;
    dataBase?: Record<string, Array<{id: number; name: string}>>;
  };
  outputDestination?: {
    sftpDestinations: Array<{
      id: number;
      name: string;
      path?: string;
    }>;
    nfsDestinations: Array<{
      id: number;
      name: string;
      path?: string;
    }>;
    awsDestinations: Array<{
      id: number;
      name: string;
      bucket?: string;
    }>;
  };
  dbSource: {
    preconfiguredTables: {
      input: Array<{
        tableName: string;
        tableId: number;
        description: string;
        columns: Array<{
          name: string;
          type: string;
        }>;
      }>;
      suppress: Array<{
        tableName: string;
        tableId: number;
        description: string;
        columns: Array<{
          name: string;
          type: string;
        }>;
      }>;
      match: Array<{
        tableName: string;
        tableId: number;
        description: string;
        columns: Array<{
          name: string;
          type: string;
        }>;
      }>;
      append: Array<{
        tableName: string;
        tableId: number;
        description: string;
        columns: Array<{
          name: string;
          type: string;
        }>;
      }>;
      output: string[]; // Legacy support - keep for backward compatibility
    };
    dataDictionary: Record<string, Array<{
      fieldName: string;
      description: string;
      availableValues: string;
    }>>;
  };
}

export interface Top10RecordsRequest {
  sourceType: string;
  // File source properties
  fileSource?: string;
  inputFilePath?: string;
  sourceOption?: number;
  // Database source properties
  tableName?: string;
  tableType?: string;
  database?: string;
  schema?: string;
  source?: string;
  [key: string]: unknown;
}

// API can return multiple formats:
// 1. New format: { separator?: string, data: Record<string, any>[] }
// 2. Legacy format: { columns: string[], data: Record<string, any>[] }
// 3. Plain array: Record<string, any>[] (fallback)
export interface Top10RecordsResponse {
  columns?: string[];
  data: Record<string, any>[];
  separator?: string;
  content?: string; // Raw delimited text content for preview
}

export async function getRequestInputs(): Promise<RequestInputsResponse> {
  try {
    const response = await ApiService.fetchData<RequestInputsResponse>({
      url: '/requestinputs.php',
      method: 'get',
    });
    return ApiService.transform<RequestInputsResponse>(response);
  } catch (error) {
    // Throw error instead of returning mock data
    throw error;
  }
}

// Note: getRequestStats and RequestStatsResponse have been moved to ReportsService.ts

export async function getTop10Records(payload: Top10RecordsRequest | FormData): Promise<Top10RecordsResponse> {
  try {
    // Check if payload is FormData (for file uploads)
    const isFormData = payload instanceof FormData;

    const response = await ApiService.fetchData<Top10RecordsResponse, any>({
      url: '/requesttop10records.php',
      method: 'post',
      data: payload as any,
      // Set appropriate headers for multipart/form-data
      ...(isFormData && {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    });
    return ApiService.transform<Top10RecordsResponse>(response);
  } catch (error) {
    throw error;
  }
}

export interface SaveRequestPayload {
  requestName: string;
  inputSources: any[];
  appendConfigs?: any[];
  suppressConfigs?: any[];
  matchConfigs?: any[];
  outputConfig?: any;
  statsConfigs?: any[];
  scheduleConfig?: any;
  [key: string]: any;
}

export interface SaveRequestResponse {
  success: boolean;
  message: string;
  requestId?: string;
}

// Interface for submitting request to submitRequest1.php
export interface SubmitRequestPayload {
  requestDetails: {
    requestName: string;
    createdBy: string;
    updatedBy: string;
    requestType: 'A' | 'S'; // A – Adhoc, S – Schedule Later
    sendNotificationOn: 'S' | 'E'; // S – Standard, E – Error Only
    recipientEmail: string;
    scheduledDateTime?: string; // Include when requestType is 'S'
  };
  inputSources: any[];
  workflow?: Array<{
    stepOrder: number;
    actionType: string;
    saveAsVersion: number;
    versionName: string;
    internalStepOrder: number;
    configJson: {
      operation: string;
      input_sources: Array<{
        source_name: string;
        columns: string[];
      }>;
      added_fields: Array<{
        source_name: string;
        fields: Array<{
          field_name: string;
          data_type: string;
          default_value: string | number;
        }>;
      }>;
      field_mappings: Array<{
        field_name: string;
        source_mappings: string;
      }>;
      merge_keys: string[];
      priority_order: string[];
    };
  }>;
  stats?: Array<{
    input_sources: Array<{
      source_name: string;
      columns: string[];
    }>;
    generate_counts_on: string[];
    is_distinct: boolean;
    breakdown_by: string[];
  }>;
  output?: Array<{
    input_sources: Array<{
      source_name: string;
      columns: string[];
      priority: number;
    }>;
    output_fields: string[];
    combine_sources: boolean;
    field_priority: string[];
    limitations: {
      limit_records: number | null;
      shuffle_records: boolean;
    };
    destination:
      | {
          // Preconfigured source
          data_source_id: number;
        }
      | {
          // Custom SFTP destination
          destinationName: string;
          type: 'sftp';
          host: string;
          port: string;
          path: string;
          username: string;
          password: string;
        }
      | {
          // Custom AWS S3 destination
          destinationName: string;
          type: 'aws';
          bucketname: string;
          region: string;
          path: string;
          accesskey: string;
        }
      | {
          // Custom NFS destination
          destinationName: string;
          type: 'nfs';
          hostserver: string;
          mountpath: string;
        };
    field_mappings: Array<{
      field_name: string;
      source_mappings: string;
    }>;
  }>;

  [key: string]: any; // Add index signature for additional properties
}

export interface SubmitRequestResponse {
  success: boolean;
  message: string;
  requestId?: string;
}

export async function submitRequest(payload: SubmitRequestPayload): Promise<SubmitRequestResponse> {
  try {
    const response = await ApiService.fetchData<SubmitRequestResponse>({
      url: '/submitRequest.php',
      method: 'post',
      data: payload
    });
    return ApiService.transform<SubmitRequestResponse>(response);
  } catch (error: any) {
    // Return error response - do NOT redirect on API errors
    console.error('Error submitting request:', error);
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Failed to submit request. Please check your connection and try again.',
    };
  }
}

export async function updateRequest(payload: SubmitRequestPayload): Promise<SubmitRequestResponse> {
  try {
    const response = await ApiService.fetchData<SubmitRequestResponse>({
      url: '/updateRequest.php',
      method: 'post',
      data: payload
    });
    return ApiService.transform<SubmitRequestResponse>(response);
  } catch (error: any) {
    // Return error response - do NOT redirect on API errors
    console.error('Error updating request:', error);
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Failed to update request. Please check your connection and try again.',
    };
  }
}

export interface EditRequestPayload {
  requestId: number;
}

export interface EditRequestResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export async function getEditRequest(requestId: number): Promise<EditRequestResponse> {
  try {
    const response = await ApiService.fetchData<EditRequestResponse>({
      url: '/editRequest.php',
      method: 'post',
      data: { requestId }
    });
    return ApiService.transform<EditRequestResponse>(response);
  } catch (error) {
    throw error;
  }
}

// Table Dictionary Interfaces
export interface TableDictionaryField {
  field_name: string;
  description: string;
  field_values: string[];
  data_type: string;
}

export interface TableDictionaryResponse {
  success: boolean;
  dictionary: Record<string, TableDictionaryField[]>;
  total_tables: number;
}

export async function getTableDictionary(): Promise<TableDictionaryResponse> {
  try {
    const response = await ApiService.fetchData<TableDictionaryResponse>({
      url: '/dictionary.php',
      method: 'get',
    });
    return ApiService.transform<TableDictionaryResponse>(response);
  } catch (error) {
    throw error;
  }
}