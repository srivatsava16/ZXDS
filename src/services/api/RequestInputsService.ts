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

// API can return either format:
// 1. { columns: string[], data: Record<string, any>[] }
// 2. Record<string, any>[] (plain array)
export interface Top10RecordsResponse {
  columns: string[];
  data: Record<string, any>[];
}

export async function getRequestInputs(): Promise<RequestInputsResponse> {
  try {
    const response = await ApiService.fetchData<RequestInputsResponse>({
      url: '/requestinputs.php',
      method: 'get',
    });
    return ApiService.transform<RequestInputsResponse>(response);
  } catch (error) {
    // Return fallback mock data on error
    return getMockRequestInputs();
  }
}

export async function getTop10Records(payload: Top10RecordsRequest): Promise<Top10RecordsResponse> {
  try {
    const response = await ApiService.fetchData<Top10RecordsResponse>({
      url: '/requesttop10records.php',
      method: 'post',
      data: payload,
    });
    return ApiService.transform<Top10RecordsResponse>(response);
  } catch (error) {
    throw error;
  }
}

// Mock data fallback function
function getMockRequestInputs(): any {
  return {
    fileSource: {
      sftpSources: [
        {
          id: 1,
          name: 'BO31 SFTP',
          host: 'sftp.bo31.example.com',
          port: '22',
          path: '/data/input',
          username: 'bo31_user',
          password: '***'
        },
        {
          id: 3,
          name: 'ZXDS4 SFTP',
          host: 'sftp.zxds.example.com',
          port: '22',
          path: '/zxds/data',
          username: 'zxds_user',
          password: '***'
        },
        {
          id: 9,
          name: 'DC3 SFTP',
          host: 'sftp.dc3.example.com',
          port: '22',
          path: '/dc/files',
          username: 'dc3_user',
          password: '***'
        }
      ],
      nfsSources: [
        {
          id: 2,
          name: 'Test NFS1',
          hostserver: 'nfs1.example.com',
          mountpath: '/mnt/nfs1/data'
        },
        {
          id: 4,
          name: 'Backup NFS4',
          hostserver: 'nfs4.example.com',
          mountpath: '/mnt/backup/files'
        },
        {
          id: 10,
          name: 'Archive NFS10',
          hostserver: 'nfs10.example.com',
          mountpath: '/mnt/archive/data'
        }
      ],
      awsSources: [
        {
          id: 5,
          name: 'ZXDS AWS',
          bucketname: 'zxds-data-bucket',
          region: 'us-east-1',
          path: '/input-data',
          accesskey: 'AKIA***'
        },
        {
          id: 6,
          name: 'DC AWS',
          bucketname: 'dc-storage-bucket',
          region: 'us-west-2',
          path: '/dc-files',
          accesskey: 'AKIA***'
        }
      ],
      dataBase: {
        SALES_DB: [
          { id: 7, name: 'PUBLIC' },
          { id: 8, name: 'ANALYTICS' }
        ],
        MARKETING_DB: [
          { id: 11, name: 'CAMPAIGNS' },
          { id: 12, name: 'LEADS' }
        ]
      }
    },

    outputDestination: {
      sftpDestinations: [
        { id: 1, name: 'DC SFTP', path: '/exports/dc' },
        { id: 2, name: 'ZXDS SFTP', path: '/exports/zxds' },
        { id: 3, name: 'BO3 SFTP', path: '/exports/bo3' }
      ],
      nfsDestinations: [
        { id: 4, name: 'NFS Server 1', path: '/mnt/exports/nfs1' },
        { id: 5, name: 'NFS Server 2', path: '/mnt/exports/nfs2' }
      ],
      awsDestinations: [
        { id: 6, name: 'ZXDS S3', bucket: 'zxds-exports' },
        { id: 7, name: 'AWS S3 Primary', bucket: 'aws-primary-exports' },
        { id: 8, name: 'AWS S3 Secondary', bucket: 'aws-secondary-exports' }
      ]
    },

    dbSource: {
      preconfiguredTables: { 
        input: [
          {
            tableName: 'ZXDS_ALLCHANNEL_Q1_2026_UNIVERSE_PERMISSIONED_DND',
            tableId: 2,
            description: 'THIS TABLE CONTAINS THE PERMISSIONED UNIVERSE DATA.',
            columns: [
              { name: 'MD5', type: 'STRING' },
              { name: 'EMAIL', type: 'STRING' },
              { name: 'CHANNEL', type: 'STRING' }
            ]
          },
          {
            tableName: 'ZXDS_ALLCHANNEL_Q2_2026_UNIVERSE_PERMISSIONED_DND',
            tableId: 3,
            description: 'THIS TABLE CONTAINS THE Q2 PERMISSIONED UNIVERSE DATA.',
            columns: [
              { name: 'ID', type: 'INTEGER' },
              { name: 'DEVICE', type: 'STRING' }
            ]
          }
        ],
        suppress: [
          {
            tableName: 'DNS_SUPPRESSION_LIST',
            tableId: 5,
            description: 'DNS suppression list containing opted-out email addresses',
            columns: [
              { name: 'EMAIL_MD5', type: 'STRING' },
              { name: 'SUPPRESSION_DATE', type: 'DATE' },
              { name: 'REASON', type: 'STRING' }
            ]
          },
          {
            tableName: 'GLOBAL_SUPPRESSION_LIST',
            tableId: 6,
            description: 'Global suppression list for all marketing campaigns',
            columns: [
              { name: 'EMAIL_ADDRESS_MD5', type: 'STRING' },
              { name: 'PROFILE_ID', type: 'INTEGER' },
              { name: 'SUPPRESSION_TYPE', type: 'STRING' }
            ]
          }
        ],
        match: [
          {
            tableName: 'CUSTOMER_MASTER_MATCH',
            tableId: 7,
            description: 'Master customer database for exact matching',
            columns: [
              { name: 'CUSTOMER_ID', type: 'INTEGER' },
              { name: 'EMAIL_MD5', type: 'STRING' },
              { name: 'FIRST_NAME', type: 'STRING' },
              { name: 'LAST_NAME', type: 'STRING' }
            ]
          },
          {
            tableName: 'FUZZY_MATCH_REFERENCE',
            tableId: 8,
            description: 'Reference table for fuzzy matching algorithms',
            columns: [
              { name: 'REFERENCE_ID', type: 'INTEGER' },
              { name: 'NORMALIZED_NAME', type: 'STRING' },
              { name: 'MATCH_SCORE', type: 'FLOAT' }
            ]
          }
        ],
        append: [
          {
            tableName: 'PROFILE',
            tableId: 1,
            description: 'THIS TABLE CONTAINS THE PROFILE DETAILS FOR ALL THE CHANNELS',
            columns: [
              { name: 'PROFILE_ID', type: 'INTEGER' },
              { name: 'EMAIL_ADDRESS_MD5', type: 'STRING' },
              { name: 'COUNTRY', type: 'STRING' }
            ]
          },
          {
            tableName: 'ZXDS_ALLCHANNEL_Q1_2026_UNIVERSE_PERMISSIONED_DND',
            tableId: 2,
            description: 'THIS TABLE CONTAINS THE PERMISSIONED UNIVERSE DATA.',
            columns: [
              { name: 'MD5', type: 'STRING' },
              { name: 'EMAIL', type: 'STRING' },
              { name: 'CHANNEL', type: 'STRING' }
            ]
          },
          {
            tableName: 'ZXDS_Q1_2026_UNIVERSE_NON_PERMISSIONED_DND',
            tableId: 3,
            description: 'THIS TABLE CONTAINS THE NON PERMISSIONED UNIVERSE DATA.',
            columns: [
              { name: 'EMAIL_ADDRESS_MD5', type: 'STRING' },
              { name: 'PROFILE_ID', type: 'INTEGER' }
            ]
          },
          {
            tableName: 'EMAIL_BEST_POSTAL_Q1_2026_CASS_DND',
            tableId: 4,
            description: 'THIS TABLE CONTAINS BEST POSTAL DATA',
            columns: [
              { name: 'EMAIL_MD5', type: 'STRING' },
              { name: 'POSTAL_ZIP', type: 'STRING' },
              { name: 'PERMISSIONED', type: 'BOOLEAN' }
            ]
          }
        ],
        output: [
          'SFTP Export',
          'Email Export',
          'S3 Export',
          'Database Export'
        ]
      },
      dataDictionary: {
        permission11: [
          {
            fieldName: 'MARKETING_ALLOWED',
            description: 'Marketing communications allowed',
            availableValues: 'Y, N'
          },
          {
            fieldName: 'SUPPRESSION_FLAG',
            description: 'Customer suppression status',
            availableValues: 'Y, N'
          }
        ],
        nonPermission11: [
          {
            fieldName: 'PROFILE_ID',
            description: 'Unique customer profile identifier',
            availableValues: 'Alphanumeric, 10-15 characters'
          },
          {
            fieldName: 'EMAIL_ID',
            description: 'Customer email address',
            availableValues: 'Valid email format'
          },
          {
            fieldName: 'EMAIL_MD5',
            description: 'MD5 hash of email address',
            availableValues: '32-character hexadecimal string'
          }
        ]
      }
    }
  };
}

export async function checkRequestName(requestName: string): Promise<boolean> {
  try {
    const response = await ApiService.fetchData<{ exists: boolean }>({
      url: '/checkRequestName.php',
      method: 'post',
      data: { requestName: requestName.trim() }
    });
    return response?.data?.exists ;
  } catch (error) {
    // For development - simulate some existing names
    return false;
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
  } catch (error) {
    // Return mock success response for development
    return {
      success: true,
      message: 'Request submitted successfully',
      requestId: `submit_${Date.now()}`
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