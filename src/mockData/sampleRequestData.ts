// Comprehensive sample request data for demo purposes
// This data is used to pre-populate the Edit view for request ID 999

import type { InputSource } from '../components/InputModule/InputModule';

export interface SampleRequestData {
  requestId: number;
  requestName: string;
  inputSources: InputSource[];
  appendConfigs: any[];
  suppressConfigs: any[];
  matchConfigs: any[];
  statsConfigs: any[];
  outputConfigs: any[];
  scheduleConfig: any;
}

// Sample Input Sources (4-5 sources with mixed file/database types)
const sampleInputSources: InputSource[] = [
  {
    id: 'input_1',
    sourceType: 'File',
    sourceName: 'Customer_Email_List',
    subSourceType: 'SFTP',
    fileSource: 'ZXDS SFTP',
    filePath: '/data/customers/',
    fileName: 'customer_emails_2024.csv',
    delimiter: ',',
    hasHeader: true,
    headers: ['EMAIL_ID', 'PROFILE_ID', 'LIST_ID', 'EMAIL_MD5', 'FNAME', 'LNAME', 'STATE', 'ZIP'],
    dataTypes: {
      EMAIL_ID: 'String',
      PROFILE_ID: 'String',
      LIST_ID: 'String',
      EMAIL_MD5: 'String',
      FNAME: 'String',
      LNAME: 'String',
      STATE: 'String',
      ZIP: 'String',
    },
  },
  {
    id: 'input_2',
    sourceType: 'Database',
    sourceName: 'Permission_Database',
    subSourceType: 'Database',
    headers: ['EMAIL_ID', 'PROFILE_ID', 'EMAIL_MD5', 'PERMISSION_DATE', 'OPT_IN_EMAIL', 'OPT_IN_SMS', 'Decile1', 'Decile2'],
    dataTypes: {
      EMAIL_ID: 'String',
      PROFILE_ID: 'String',
      EMAIL_MD5: 'String',
      PERMISSION_DATE: 'String',
      OPT_IN_EMAIL: 'String',
      OPT_IN_SMS: 'String',
      Decile1: 'Integer',
      Decile2: 'Integer',
    },
  },
  {
    id: 'input_3',
    sourceType: 'File',
    sourceName: 'Transaction_Data',
    subSourceType: 'AWS S3',
    fileSource: 'ZXDS AWS',
    filePath: '/data/transactions/',
    fileName: 'transactions_q1_2024.csv',
    delimiter: '|',
    hasHeader: true,
    headers: ['PROFILE_ID', 'TRANSACTION_ID', 'AMOUNT', 'DATE', 'PRODUCT_ID', 'EMAIL_MD5'],
    dataTypes: {
      PROFILE_ID: 'String',
      TRANSACTION_ID: 'String',
      AMOUNT: 'Float',
      DATE: 'String',
      PRODUCT_ID: 'String',
      EMAIL_MD5: 'String',
    },
  },
  {
    id: 'input_4',
    sourceType: 'Database',
    sourceName: 'Transunion_Credit_Data',
    subSourceType: 'Database',
    headers: ['PROFILE_ID', 'CREDIT_SCORE', 'INCOME', 'MA1566', 'ZIP_CODE', 'Decile1', 'Decile2'],
    dataTypes: {
      PROFILE_ID: 'String',
      CREDIT_SCORE: 'Integer',
      INCOME: 'Float',
      MA1566: 'Integer',
      ZIP_CODE: 'String',
      Decile1: 'Integer',
      Decile2: 'Integer',
    },
  },
  {
    id: 'input_5',
    sourceType: 'File',
    sourceName: 'Mobile_App_Users',
    subSourceType: 'SFTP',
    fileSource: 'BO3 SFTP',
    filePath: '/mobile/users/',
    fileName: 'app_users_active.csv',
    delimiter: ',',
    hasHeader: true,
    headers: ['EMAIL_ID', 'USER_ID', 'LAST_LOGIN', 'APP_VERSION', 'DEVICE_TYPE', 'EMAIL_MD5'],
    dataTypes: {
      EMAIL_ID: 'String',
      USER_ID: 'String',
      LAST_LOGIN: 'String',
      APP_VERSION: 'String',
      DEVICE_TYPE: 'String',
      EMAIL_MD5: 'String',
    },
  },
];

// Sample Append Configurations (3-4 append operations)
const sampleAppendConfigs = [
  {
    id: 'append_1',
    inputSources: ['input_1'],
    appendOnFields: ['EMAIL_ID', 'EMAIL_MD5'],
    appendSources: ['input_2'],
    appendFields: ['PERMISSION_DATE', 'OPT_IN_EMAIL', 'OPT_IN_SMS', 'Decile1'],
  },
  {
    id: 'append_2',
    inputSources: ['input_1', 'input_2'],
    appendOnFields: ['PROFILE_ID'],
    appendSources: ['input_3'],
    appendFields: ['TRANSACTION_ID', 'AMOUNT', 'DATE', 'PRODUCT_ID'],
  },
  {
    id: 'append_3',
    inputSources: ['input_1'],
    appendOnFields: ['PROFILE_ID', 'Decile2'],
    appendSources: ['input_4'],
    appendFields: ['CREDIT_SCORE', 'INCOME', 'MA1566'],
  },
  {
    id: 'append_4',
    inputSources: ['input_1'],
    appendOnFields: ['EMAIL_ID', 'EMAIL_MD5'],
    appendSources: ['input_5'],
    appendFields: ['LAST_LOGIN', 'APP_VERSION', 'DEVICE_TYPE'],
  },
];

// Sample Suppress Configurations (3-4 suppress operations)
const sampleSuppressConfigs = [
  {
    id: 'suppress_1',
    inputSources: ['input_1'],
    suppressOnFields: ['EMAIL_ID', 'EMAIL_MD5'],
    suppressSources: ['global_suppression_list'],
  },
  {
    id: 'suppress_2',
    inputSources: ['input_1', 'input_2'],
    suppressOnFields: ['EMAIL_ID', 'Decile1'],
    suppressSources: ['unsubscribe_list'],
  },
  {
    id: 'suppress_3',
    inputSources: ['input_1'],
    suppressOnFields: ['EMAIL_MD5', 'PROFILE_ID'],
    suppressSources: ['bounce_list'],
  },
  {
    id: 'suppress_4',
    inputSources: ['input_1', 'input_5'],
    suppressOnFields: ['EMAIL_ID', 'Decile2'],
    suppressSources: ['complaint_list'],
  },
];

// Sample Match Configurations (3-4 match operations)
const sampleMatchConfigs = [
  {
    id: 'match_1',
    inputSources: ['input_1'],
    matchOnFields: ['EMAIL_ID', 'EMAIL_MD5', 'Decile1'],
    matchSources: ['master_customer_db'],
    expand: true,
    matchType: 'full',
    addFields: ['CUSTOMER_SEGMENT', 'LIFETIME_VALUE', 'LAST_PURCHASE_DATE'],
  },
  {
    id: 'match_2',
    inputSources: ['input_1', 'input_2'],
    matchOnFields: ['PROFILE_ID', 'Decile2'],
    matchSources: ['crm_database'],
    expand: false,
    matchType: 'any',
    addFields: [],
  },
  {
    id: 'match_3',
    inputSources: ['input_3'],
    matchOnFields: ['PROFILE_ID', 'EMAIL_MD5'],
    matchSources: ['product_catalog'],
    expand: true,
    matchType: 'full',
    addFields: ['PRODUCT_NAME', 'PRODUCT_CATEGORY', 'PRICE'],
  },
  {
    id: 'match_4',
    inputSources: ['input_1', 'input_5'],
    matchOnFields: ['EMAIL_ID', 'Decile1', 'Decile2'],
    matchSources: ['master_customer_db'],
    expand: false,
    matchType: 'full',
    addFields: [],
  },
];

// Sample Stats Configurations (2-3 stats)
const sampleStatsConfigs = [
  {
    id: 'stats_1',
    inputSources: ['input_1', 'input_2'],
    countsOn: ['EMAIL_ID', 'PROFILE_ID', 'Decile1'],
    isDistinct: true,
    breakdownBy: ['STATE', 'ZIP'],
  },
  {
    id: 'stats_2',
    inputSources: ['input_3'],
    countsOn: ['TRANSACTION_ID', 'PROFILE_ID'],
    isDistinct: false,
    breakdownBy: ['PRODUCT_ID', 'DATE'],
  },
  {
    id: 'stats_3',
    inputSources: ['input_1', 'input_4'],
    countsOn: ['PROFILE_ID', 'Decile2'],
    isDistinct: true,
    breakdownBy: ['CREDIT_SCORE', 'INCOME', 'MA1566'],
  },
];

// Sample Output Configurations (multiple output destinations)
const sampleOutputConfigs = [
  {
    id: 'output_1',
    inputSources: ['input_1', 'input_2'],
    outputFields: ['EMAIL_ID', 'PROFILE_ID', 'EMAIL_MD5', 'FNAME', 'LNAME', 'STATE', 'ZIP', 'Decile1', 'Decile2'],
    outputDestination: 'SFTP',
    outputFormat: 'CSV',
    outputPath: '/output/customer_master/',
    outputFileName: 'customer_master_enriched.csv',
    combine: false,
    limitRecords: 50000,
    shuffleRecords: true,
  },
  {
    id: 'output_2',
    inputSources: ['input_3'],
    outputFields: ['PROFILE_ID', 'TRANSACTION_ID', 'AMOUNT', 'DATE', 'PRODUCT_ID', 'EMAIL_MD5'],
    outputDestination: 'AWS S3',
    outputFormat: 'Parquet',
    outputPath: '/output/transactions/',
    outputFileName: 'transactions_processed.parquet',
    combine: true,
    limitRecords: 100000,
    shuffleRecords: false,
  },
  {
    id: 'output_3',
    inputSources: ['input_1', 'input_4'],
    outputFields: ['PROFILE_ID', 'EMAIL_ID', 'CREDIT_SCORE', 'INCOME', 'MA1566', 'Decile1', 'Decile2'],
    outputDestination: 'NFS',
    outputFormat: 'Excel',
    outputPath: '/output/credit_analysis/',
    outputFileName: 'credit_analysis_report.xlsx',
    combine: false,
    limitRecords: 25000,
    shuffleRecords: false,
  },
];

// Sample Schedule Configuration
const sampleScheduleConfig = {
  scheduleType: 'recurrence',
  recurrencePattern: 'daily',
  recurrenceTime: '08:00',
  emailNotification: 'on_completion',
  notificationEmails: ['ranjith.ranga@example.com', 'data-team@example.com'],
  startDate: '2024-12-15',
  endDate: '2025-03-15',
};

// Export complete sample data
export const comprehensiveSampleData: SampleRequestData = {
  requestId: 999,
  requestName: 'Comprehensive Demo Request - Q1 2025',
  inputSources: sampleInputSources,
  appendConfigs: sampleAppendConfigs,
  suppressConfigs: sampleSuppressConfigs,
  matchConfigs: sampleMatchConfigs,
  statsConfigs: sampleStatsConfigs,
  outputConfigs: sampleOutputConfigs,
  scheduleConfig: sampleScheduleConfig,
};
