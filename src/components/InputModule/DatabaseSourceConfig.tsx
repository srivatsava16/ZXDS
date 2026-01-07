import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  TextField,
  IconButton,
  Tooltip,
  Button,
  InputAdornment,
  Collapse,
} from '@mui/material';
import { MenuBook, Search, ExpandMore, ExpandLess } from '@mui/icons-material';
import type { InputSource } from './InputModule';
import FilterBuilder from './FilterBuilder';
import HeaderSelector from '../shared/HeaderSelector';
import DataDictionaryDialog from './DataDictionaryDialog';
import { type RequestInputsResponse, type Top10RecordsRequest, type Top10RecordsResponse, getTop10Records } from '../../services/api';

interface DatabaseSourceConfigProps {
  data: Partial<InputSource>;
  onChange: (data: Partial<InputSource>) => void;
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
}

// Preconfigured database tables
const DATABASE_TABLES = [
  { name: 'Permission', description: 'Permission based customer data' },
  { name: 'Non_Permission', description: 'Non-permission based customer data' },
  { name: 'Transunion', description: 'Transunion credit bureau data' },
  { name: 'Axiom', description: 'Axiom credit bureau data' },
  { name: 'Experian', description: 'Experian credit bureau data' },
  { name: 'Green_Profile', description: 'Green profile data' },
  { name: 'Orange_Profile', description: 'Orange profile data' },
  { name: 'Arcamax_Profile', description: 'Arcamax profile data' },
  { name: 'Publisher_Data', description: 'Publisher data' },
  { name: 'Green_Publisher_Data', description: 'Green publisher data' },
  { name: 'Orange_Publisher_Data', description: 'Orange publisher data' },
  { name: 'Arcamax_Publisher_Data', description: 'Arcamax publisher data' },
  { name: 'Best_Postal', description: 'Best postal data' },
  { name: 'All_Postal', description: 'All postal data' },
  { name: 'Phone_Numbers_Data', description: 'Phone numbers data' },
  { name: 'Zips_Radius_Data', description: 'ZIP radius data' },
  { name: 'Shahash_Data', description: 'Shahash data' },
  { name: 'Liveintent_Data', description: 'Liveintent data' },
  { name: 'DNS_Suppression_Data', description: 'DNS suppression data' },
  { name: 'Bacon_SBI_Policies_Data', description: 'Bacon SBI policies data' },
];

// Field descriptions mapping
const FIELD_DESCRIPTIONS: Record<string, string> = {
  MA1566: 'Cibil score greater than 700',
  EMAIL_ID: 'Customer email address',
  PROFILE_ID: 'Unique customer profile identifier',
  LIST_ID: 'Marketing list identifier',
  CREDIT_SCORE: 'Customer credit score',
  INCOME: 'Annual income',
  AGE: 'Customer age',
  ZIP_CODE: 'Zip code',
};

// Mock Data Dictionary with table-specific fields
const generateDataDictionary = (tableName: string, apiDataDictionary?: Record<string, any[]>) => {
  // If API data dictionary is available, use it
  if (apiDataDictionary && apiDataDictionary[tableName]) {
    return apiDataDictionary[tableName];
  }

  // Fallback to local mock data if API data is not available
  // Base fields common to all tables
  const baseFields = [
    { fieldName: 'PROFILE_ID', description: 'Unique customer profile identifier', availableValues: 'Alphanumeric, 10-15 characters' },
    { fieldName: 'EMAIL_ID', description: 'Customer email address', availableValues: 'Valid email format' },
    { fieldName: 'EMAIL_MD5', description: 'MD5 hash of email address', availableValues: '32-character hexadecimal string' },
    { fieldName: 'FIRST_NAME', description: 'Customer first name', availableValues: 'Text, 1-50 characters' },
    { fieldName: 'LAST_NAME', description: 'Customer last name', availableValues: 'Text, 1-50 characters' },
    { fieldName: 'PHONE_NUMBER', description: 'Customer contact number', availableValues: '10 digit phone number' },
    { fieldName: 'DATE_OF_BIRTH', description: 'Customer date of birth', availableValues: 'Date format: YYYY-MM-DD' },
    { fieldName: 'AGE', description: 'Customer age in years', availableValues: '18-100' },
    { fieldName: 'GENDER', description: 'Customer gender', availableValues: 'M, F, O' },
    { fieldName: 'ADDRESS_LINE1', description: 'Primary address line', availableValues: 'Text, 1-100 characters' },
    { fieldName: 'CITY', description: 'City of residence', availableValues: 'Text, 1-50 characters' },
    { fieldName: 'STATE', description: 'State of residence', availableValues: '2-letter state code' },
    { fieldName: 'ZIP_CODE', description: 'Postal zip code', availableValues: '5 or 9 digit zip code' },
    { fieldName: 'COUNTRY', description: 'Country of residence', availableValues: 'US, CA, UK, etc.' },
  ];

  // Table-specific fields
  const tableSpecificFields: Record<string, any[]> = {
    'permission11': [
      ...baseFields,
      // Permission-specific fields
      { fieldName: 'OPT_IN_EMAIL', description: 'Email opt-in permission status', availableValues: 'Y, N' },
      { fieldName: 'OPT_IN_SMS', description: 'SMS opt-in permission status', availableValues: 'Y, N' },
      { fieldName: 'OPT_IN_PHONE', description: 'Phone opt-in permission status', availableValues: 'Y, N' },
      { fieldName: 'OPT_IN_MAIL', description: 'Mail opt-in permission status', availableValues: 'Y, N' },
      { fieldName: 'PERMISSION_DATE', description: 'Date permissions were granted', availableValues: 'Date format: YYYY-MM-DD' },
      { fieldName: 'CONSENT_VERSION', description: 'Version of consent agreement', availableValues: 'Numeric, 1-99' },
      { fieldName: 'PERMISSION_SOURCE', description: 'Source of permission data', availableValues: 'Web, Mobile, Store, Partner, Other' },
      { fieldName: 'DOUBLE_OPT_IN', description: 'Double opt-in confirmation status', availableValues: 'Y, N' },
      { fieldName: 'UNSUBSCRIBE_DATE', description: 'Date of unsubscription if applicable', availableValues: 'Date format: YYYY-MM-DD or NULL' },
      { fieldName: 'SUPPRESSION_FLAG', description: 'Customer suppression status', availableValues: 'Y, N' },
      { fieldName: 'MARKETING_ALLOWED', description: 'Marketing communications allowed', availableValues: 'Y, N' },
      { fieldName: 'PROMOTIONAL_ALLOWED', description: 'Promotional offers allowed', availableValues: 'Y, N' },
      { fieldName: 'THIRD_PARTY_SHARING', description: 'Third party data sharing consent', availableValues: 'Y, N' },
      { fieldName: 'LIST_ID', description: 'Permission marketing list identifier', availableValues: 'Alphanumeric, 5-20 characters' },
      { fieldName: 'CAMPAIGN_ID', description: 'Permission campaign identifier', availableValues: 'Alphanumeric, 5-20 characters' },
    ],
    'nonPermission11': [
      ...baseFields,
      // Non-permission specific fields  
      { fieldName: 'CREDIT_SCORE', description: 'Customer credit score', availableValues: '300-850' },
      { fieldName: 'INCOME', description: 'Annual income in USD', availableValues: '0-999999999' },
      { fieldName: 'EMPLOYMENT_STATUS', description: 'Current employment status', availableValues: 'Employed, Unemployed, Self-Employed, Retired' },
      { fieldName: 'MARITAL_STATUS', description: 'Customer marital status', availableValues: 'Single, Married, Divorced, Widowed' },
      { fieldName: 'EDUCATION_LEVEL', description: 'Highest education level', availableValues: 'High School, Bachelor, Master, PhD, Other' },
      { fieldName: 'ACCOUNT_STATUS', description: 'Current account status', availableValues: 'Active, Inactive, Closed, Suspended' },
      { fieldName: 'ACCOUNT_BALANCE', description: 'Current account balance', availableValues: '-999999999 to 999999999' },
      { fieldName: 'CREDIT_LIMIT', description: 'Credit limit for account', availableValues: '0-999999' },
      { fieldName: 'LAST_PAYMENT_DATE', description: 'Date of last payment', availableValues: 'Date format: YYYY-MM-DD' },
      { fieldName: 'RISK_SCORE', description: 'Customer risk assessment score', availableValues: '0-100' },
      { fieldName: 'LIFETIME_VALUE', description: 'Customer lifetime value', availableValues: '0-9999999' },
      { fieldName: 'TOTAL_PURCHASES', description: 'Total number of purchases', availableValues: '0-99999' },
      { fieldName: 'TOTAL_SPENT', description: 'Total amount spent', availableValues: '0-9999999' },
      { fieldName: 'FIRST_PURCHASE_DATE', description: 'Date of first purchase', availableValues: 'Date format: YYYY-MM-DD' },
      { fieldName: 'LAST_PURCHASE_DATE', description: 'Date of last purchase', availableValues: 'Date format: YYYY-MM-DD' },
      { fieldName: 'MA1566', description: 'Cibil score greater than 700', availableValues: 'Y, N' },
      { fieldName: 'MA1567', description: 'Has active credit card', availableValues: 'Y, N' },
      { fieldName: 'MA1568', description: 'Has mortgage loan', availableValues: 'Y, N' },
      { fieldName: 'MA1569', description: 'Has auto loan', availableValues: 'Y, N' },
      { fieldName: 'MA1570', description: 'Has student loan', availableValues: 'Y, N' },
      { fieldName: 'MA1571', description: 'Has personal loan', availableValues: 'Y, N' },
      { fieldName: 'MA1572', description: 'Number of credit inquiries', availableValues: '0-99' },
      { fieldName: 'MA1573', description: 'Number of open accounts', availableValues: '0-99' },
      { fieldName: 'MA1574', description: 'Number of closed accounts', availableValues: '0-999' },
      { fieldName: 'MA1575', description: 'Total credit limit across accounts', availableValues: '0-9999999' },
      { fieldName: 'MA1576', description: 'Total outstanding balance', availableValues: '0-9999999' },
      { fieldName: 'MA1577', description: 'Credit utilization ratio', availableValues: '0-100 (percentage)' },
      { fieldName: 'MA1578', description: 'Months since oldest account', availableValues: '0-999' },
      { fieldName: 'MA1579', description: 'Number of delinquencies', availableValues: '0-99' },
      { fieldName: 'MA1580', description: 'Number of bankruptcies', availableValues: '0-9' },
      { fieldName: 'MA1581', description: 'Has foreclosure history', availableValues: 'Y, N' },
      { fieldName: 'MA1582', description: 'Has repossession history', availableValues: 'Y, N' },
      { fieldName: 'MA1583', description: 'Has collection accounts', availableValues: 'Y, N' },
      { fieldName: 'HOUSEHOLD_SIZE', description: 'Number of people in household', availableValues: '1-20' },
      { fieldName: 'NUMBER_OF_CHILDREN', description: 'Number of children', availableValues: '0-20' },
      { fieldName: 'HAS_PETS', description: 'Has pets in household', availableValues: 'Y, N' },
      { fieldName: 'VEHICLE_MAKE', description: 'Primary vehicle make', availableValues: 'Text, 0-50 characters' },
      { fieldName: 'VEHICLE_MODEL', description: 'Primary vehicle model', availableValues: 'Text, 0-50 characters' },
      { fieldName: 'VEHICLE_YEAR', description: 'Primary vehicle year', availableValues: '1900-2099' },
    ]
  };

  // Return table-specific fields or base fields if table not found
  return tableSpecificFields[tableName] || baseFields;
};

// Snowflake accounts (sources)
const SNOWFLAKE_SOURCES = [
  { id: 'zetaglobal', name: 'ZetaGlobal' },
  { id: 'hubreader', name: 'Hub Reader' },
];

// Mock databases for each source (fallback)
const DATABASES_BY_SOURCE: Record<string, string[]> = {
  zetaglobal: ['ZETA_PROD_DB', 'ZETA_DEV_DB', 'ZETA_ANALYTICS_DB'],
  hubreader: ['HUB_MAIN_DB', 'HUB_REPORTING_DB', 'HUB_ARCHIVE_DB'],
};

// Mock schemas for each database (fallback)
const SCHEMAS_BY_DATABASE: Record<string, string[]> = {
  ZETA_PROD_DB: ['PUBLIC', 'CUSTOMER', 'SALES', 'MARKETING'],
  ZETA_DEV_DB: ['PUBLIC', 'TESTING', 'STAGING'],
  ZETA_ANALYTICS_DB: ['PUBLIC', 'ANALYTICS', 'REPORTS'],
  HUB_MAIN_DB: ['PUBLIC', 'CORE', 'TRANSACTIONS'],
  HUB_REPORTING_DB: ['PUBLIC', 'REPORTS', 'DASHBOARDS'],
  HUB_ARCHIVE_DB: ['PUBLIC', 'HISTORICAL', 'ARCHIVE'],
};

const DatabaseSourceConfig: React.FC<DatabaseSourceConfigProps> = ({ 
  data, 
  onChange, 
  apiSources = null,
  sourcesLoading = false 
}) => {
  const [tableSelectionType, setTableSelectionType] = useState<'preconfigured' | 'custom'>(() => {
    // Determine initial table selection type based on data
    if (data && data.subSourceType === 'Custom Database') {
      return 'custom';
    }
    return 'preconfigured';
  });
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [fields, setFields] = useState<any[]>([]);
  const [allAvailableHeaders, setAllAvailableHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [filterQuery, setFilterQuery] = useState<string>(data.filterQuery || '');
  const prevDataLengthRef = useRef(Object.keys(data).length);
  const [dataDictionaryOpen, setDataDictionaryOpen] = useState(false);
  const [top10Records, setTop10Records] = useState<any[]>([]);
  const [showTop10, setShowTop10] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(true);

  // Custom Table state
  const [selectedSource, setSelectedSource] = useState<string>('hubreader');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [customTableName, setCustomTableName] = useState<string>('');
  const [tableSourceName, setTableSourceName] = useState<string>('');
  const [databaseSearch, setDatabaseSearch] = useState<string>('');
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [isRestoringData, setIsRestoringData] = useState<boolean>(false);

  // Use API preconfigured tables or fallback to defaults
  const availableTables = apiSources?.dbSource?.preconfiguredTables?.input || [];
  const currentTables = availableTables.length > 0 
    ? availableTables.map(table => ({
        name: table.tableName,
        description: table.description,
        tableId: table.tableId,
        columns: table.columns
      }))
    : DATABASE_TABLES;

  // Get databases from API or fallback to mock data
  const getAvailableDatabases = () => {
    if (apiSources?.fileSource?.dataBase && typeof apiSources?.fileSource?.dataBase === 'object') {
      const apiDatabases = Object.keys(apiSources?.fileSource?.dataBase);
      console.log('Using API databases:', apiDatabases);
      return apiDatabases;
    }
    const mockDatabases = DATABASES_BY_SOURCE[selectedSource] || [];
    console.log('Using mock databases for source', selectedSource, ':', mockDatabases);
    return mockDatabases;
  };

  // Get schemas for selected database from API or fallback to mock data
  const getAvailableSchemas = () => {
    if (apiSources?.fileSource?.dataBase && selectedDatabase) {
      const schemas = apiSources?.fileSource?.dataBase?.[selectedDatabase];
      if (schemas && Array.isArray(schemas)) {
        return schemas.map((schema: any) => schema?.name);
      }
    }
    return SCHEMAS_BY_DATABASE[selectedDatabase] || [];
  };

  // Helper function to get schema ID by name
  const getSchemaId = (schemaName: string): number | undefined => {
    if (apiSources?.fileSource?.dataBase && selectedDatabase) {
      const schemas = apiSources?.fileSource?.dataBase?.[selectedDatabase];
      if (schemas && Array.isArray(schemas)) {
        const schema = schemas.find((s: any) => s?.name === schemaName);
        return schema?.id;
      }
    }
    return undefined;
  };

  // Reset form when data prop is cleared (for Add & Continue functionality)
  // Only reset when data transitions from non-empty to empty
  useEffect(() => {
    const currentDataLength = Object.keys(data).length;
    const wasNonEmpty = prevDataLengthRef.current > 0;
    const isNowEmpty = currentDataLength === 0;

    // Only reset when transitioning from non-empty to empty (Add & Continue scenario)
    if (wasNonEmpty && isNowEmpty) {
      setTableSelectionType('preconfigured');
      setSelectedTable('');
      setTableSearch('');
      setFields([]);
      setAllAvailableHeaders([]);
      setSelectedHeaders([]);
      setFilterQuery('');
      setSelectedSource('');
      setSelectedDatabase('');
      setSelectedSchema('');
      setCustomTableName('');
      setTableSourceName('');
      setDatabaseSearch('');
      setTop10Records([]);
      setShowTop10(false);
      setIsLoadingRecords(false);
    }

    prevDataLengthRef.current = currentDataLength;
  }, [data]);

  // Sync local state with incoming data prop changes (for edit mode)
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      console.log('Restoring data:', data);
      setIsRestoringData(true); // Set restoration flag
      
      // Check if this is custom database data
      if (data.subSourceType === 'Custom Database') {
        setTableSelectionType('custom');
        
        // Use metadata if available (newer saves), otherwise parse source name (backward compatibility)
        if (data.customTableMetadata) {
          const metadata = data.customTableMetadata;
          console.log('Restoring from metadata:', metadata);
          
          // Set all values from metadata
          setSelectedSource(metadata.source || '');
          setSelectedDatabase(metadata.database || '');
          setSelectedSchema(metadata.schema || ''); // Should already be ID
          console.log('Restored schema from metadata:', metadata.schema);
          setCustomTableName(metadata.tableName || '');
          setTableSourceName(metadata.tableSourceName || '');
        } else {
          // Parse source name to extract components (backward compatibility)
          const sourceName = data.sourceName || '';
          const parts = sourceName.split('.');
          console.log('Restoring from sourceName parsing:', sourceName, 'parts:', parts);
          
          if (parts.length >= 4) {
            setSelectedSource(parts[0] || '');
            setSelectedDatabase(parts[1] || '');
            setSelectedSchema(parts[2] || '');
            setCustomTableName(parts[3] || '');
            
            // Set table source name if it's different from auto-generated
            const autoGenerated = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}`;
            if (sourceName !== autoGenerated) {
              setTableSourceName(sourceName);
            } else {
              setTableSourceName('');
            }
          } else {
            // Fallback if source name format is different
            setCustomTableName(sourceName);
            setTableSourceName(sourceName);
          }
        }
        
        // Restore other custom table specific data
        if (data.headers && data.headers.length > 0) {
          // For saved data, headers contains the selected headers (user's choice)
          // We need to restore them as both available and selected for backward compatibility
          // For new API structure, we could have separate fields but need to maintain compatibility
          const savedHeaders = data.headers;
          const savedSelectedHeaders = data.selectedHeaders || data.headers;
          
          setAllAvailableHeaders(savedHeaders);
          setSelectedHeaders(savedSelectedHeaders);
          
          // Create fields from headers and dataTypes
          const restoredFields = savedHeaders.map(header => ({
            name: header,
            type: data.dataTypes?.[header] || 'String',
            description: FIELD_DESCRIPTIONS[header] || `${header} field`
          }));
          setFields(restoredFields);
        }
        
        // Restore preview data if available
        if (data.previewData && data.previewData.length > 0) {
          setTop10Records(data.previewData);
          setShowTop10(true);
        }
      } else {
        // Handle preconfigured table restoration
        setTableSelectionType('preconfigured');
        
        // Use originalTableName if available, fallback to sourceName
        const tableNameToRestore = data.originalTableName || data.sourceName || '';
        
        // Validate that the table exists in available options before setting
        const tableExists = availableTables.some(table => table.tableName === tableNameToRestore);
        if (tableExists) {
          setSelectedTable(tableNameToRestore);
        } else {
          console.warn('Restored table not found in available options:', tableNameToRestore);
          setSelectedTable(''); // Clear invalid table selection
        }
        
        // Set the custom source name if it's different from the table name
        if (data.sourceName && data.sourceName !== tableNameToRestore) {
          setTableSourceName(data.sourceName);
        } else {
          setTableSourceName('');
        }
        
        // Restore other preconfigured table data
        if (data.headers && data.headers.length > 0) {
          // For saved data, headers contains the selected headers (user's choice)
          // We need to restore them as both available and selected for backward compatibility
          const savedHeaders = data.headers;
          const savedSelectedHeaders = data.selectedHeaders || data.headers;
          
          setAllAvailableHeaders(savedHeaders);
          setSelectedHeaders(savedSelectedHeaders);
          
          const restoredFields = savedHeaders.map(header => ({
            name: header,
            type: data.dataTypes?.[header] || 'String',
            description: FIELD_DESCRIPTIONS[header] || `${header} field`
          }));
          setFields(restoredFields);
        }
        
        if (data.previewData && data.previewData.length > 0) {
          setTop10Records(data.previewData);
          setShowTop10(true);
        }
      }
      
      // Restore filter query
      setFilterQuery(data.filterQuery || '');
      
      // Clear restoration flag after a short delay to allow all state updates
      setTimeout(() => {
        setIsRestoringData(false);
      }, 100);
    } else {
      setIsRestoringData(false);
    }
  }, [data.id, data.sourceName, data.subSourceType, data.filterQuery, data.customTableMetadata]); // Only trigger when key edit-mode fields change

  // Validate database selection whenever source changes or available databases change
  useEffect(() => {
    // Don't validate during restoration to avoid clearing restored values
    if (isRestoringData) {
      console.log('Skipping database validation during restoration');
      return;
    }
    
    if (selectedSource && selectedDatabase) {
      const availableDbs = getAvailableDatabases();
      console.log('Validating database:', selectedDatabase, 'against available:', availableDbs);
      
      if (!availableDbs.includes(selectedDatabase)) {
        console.warn('Selected database not in available options. Resetting to first available or empty.');
        setSelectedDatabase(availableDbs.length > 0 ? availableDbs[0] : '');
      }
    }
  }, [selectedSource, apiSources, isRestoringData]); // Include restoration flag in dependencies

  // Validate schema selection after restoration completes
  useEffect(() => {
    // Only validate after restoration is complete and we have a selected schema
    if (isRestoringData || !selectedSchema) {
      return;
    }
    
    if (selectedDatabase && selectedSchema) {
      const availableSchemas = getAvailableSchemas();
      console.log('Validating restored schema:', selectedSchema, 'against available:', availableSchemas);
      
      // Check if the restored schema exists in current API data
      const schemaExists = availableSchemas.some((schemaName: string) => {
        const schemaId = getSchemaId(schemaName);
        return schemaName === selectedSchema || (schemaId !== undefined && schemaId.toString() === selectedSchema);
      });
      
      if (!schemaExists && availableSchemas.length > 0) {
        console.warn('Restored schema not found in current API data. Using first available schema.');
        const firstSchemaName = availableSchemas[0];
        const firstSchemaId = getSchemaId(firstSchemaName);
        setSelectedSchema(firstSchemaId !== undefined ? firstSchemaId.toString() : firstSchemaName);
      }
    }
  }, [selectedDatabase, selectedSchema, apiSources, isRestoringData]);

  // Initialize database and schema when component mounts and no data is being restored
  useEffect(() => {
    // Don't initialize during restoration
    if (isRestoringData) {
      return;
    }
    
    if (selectedSource && !selectedDatabase && (!data || Object.keys(data).length === 0)) {
      const availableDbs = getAvailableDatabases();
      if (availableDbs.length > 0) {
        console.log('Initializing with first available database:', availableDbs[0]);
        setSelectedDatabase(availableDbs[0]);
      }
    }
  }, [selectedSource, apiSources, data, isRestoringData]);

  // Initialize schema when database is selected
  useEffect(() => {
    // Don't initialize during restoration
    if (isRestoringData) {
      return;
    }
    
    if (selectedDatabase && !selectedSchema && (!data || Object.keys(data).length === 0)) {
      const availableSchemas = getAvailableSchemas();
      if (availableSchemas.length > 0) {
        console.log('Initializing with first available schema:', availableSchemas[0]);
        const firstSchemaName = availableSchemas[0];
        const firstSchemaId = getSchemaId(firstSchemaName);
        setSelectedSchema(firstSchemaId !== undefined ? firstSchemaId.toString() : firstSchemaName);
        console.log('Auto-initialized schema - name:', firstSchemaName, 'id:', firstSchemaId);
      }
    }
  }, [selectedDatabase, selectedSource, apiSources, data, isRestoringData]);

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);

    // Find the selected table from API data
    const selectedTableData = availableTables.find(table => table.tableName === tableName);
    
    let fieldsToUse = [];
    
    if (selectedTableData && selectedTableData.columns) {
      // Use API columns data
      fieldsToUse = selectedTableData.columns.map(col => ({
        name: col.name,
        type: col.type,
        description: FIELD_DESCRIPTIONS[col.name] || `${col.name} field`
      }));
    } else {
      // Use API fields
      fieldsToUse = [
        { name: 'EMAIL_ID', type: 'String', description: FIELD_DESCRIPTIONS.EMAIL_ID || 'Email ID' },
        { name: 'PROFILE_ID', type: 'String', description: FIELD_DESCRIPTIONS.PROFILE_ID || 'Profile ID' },
        { name: 'EMAIL_MD5', type: 'String', description: 'MD5 hash of email' },
        { name: 'AGE', type: 'Integer', description: FIELD_DESCRIPTIONS.AGE || 'Age' },
        { name: 'DECILE', type: 'Integer', description: 'Decile value' },
        { name: 'Decile1', type: 'Integer', description: 'Decile1 value' },
        { name: 'Decile2', type: 'Integer', description: 'Decile2 value' },
        { name: 'FNAME', type: 'String', description: 'First name' },
        { name: 'LNAME', type: 'String', description: 'Last name' },
        { name: 'STATE', type: 'String', description: 'State' },
        { name: 'ZIP', type: 'String', description: 'ZIP code' },
        { name: 'NAME', type: 'String', description: 'Full name' },
        { name: 'SHAHASH', type: 'String', description: 'SHA hash' },
        { name: 'CassAddressPlusSuite', type: 'String', description: 'CASS address with suite' },
        { name: 'CassZIP', type: 'String', description: 'CASS ZIP code' },
        { name: 'PHONE_NUMBER', type: 'String', description: 'Phone number' },
        { name: 'MA3784', type: 'String', description: 'MA3784 field' },
        { name: 'MA1696', type: 'String', description: 'MA1696 field' },
        { name: 'MA3786', type: 'String', description: 'MA3786 field' },
        { name: 'MA2800', type: 'String', description: 'MA2800 field' },
        { name: 'MA3791', type: 'String', description: 'MA3791 field' },
        { name: 'MA2806', type: 'String', description: 'MA2806 field' },
        { name: 'MA3781', type: 'String', description: 'MA3781 field' },
        { name: 'MA3799', type: 'String', description: 'MA3799 field' },
        { name: 'MA2642', type: 'String', description: 'MA2642 field' },
        { name: 'MA2795', type: 'String', description: 'MA2795 field' },
        { name: 'MA2796', type: 'String', description: 'MA2796 field' },
        { name: 'MA2797', type: 'String', description: 'MA2797 field' },
        { name: 'MA2798', type: 'String', description: 'MA2798 field' },
        { name: 'MA2799', type: 'String', description: 'MA2799 field' },
        { name: 'MA2929', type: 'String', description: 'MA2929 field' },
        { name: 'z202', type: 'String', description: 'z202 field' },
        { name: 'MA1628', type: 'String', description: 'MA1628 field' },
        { name: 'z594', type: 'String', description: 'z594 field' },
        { name: 'z83', type: 'String', description: 'z83 field' },
        { name: 'z84', type: 'String', description: 'z84 field' },
        { name: 'z85', type: 'String', description: 'z85 field' },
        { name: 'z653', type: 'String', description: 'z653 field' },
        { name: 'z86', type: 'String', description: 'z86 field' },
        { name: 'z87', type: 'String', description: 'z87 field' },
        { name: 'z241', type: 'String', description: 'z241 field' },
        { name: 'z61', type: 'String', description: 'z61 field' },
        { name: 'PARTNER_SOUCRE', type: 'String', description: 'Partner source' },
        { name: 'SOURCE_ZIP', type: 'String', description: 'Source ZIP code' },
        { name: 'TARGET_ZIP', type: 'String', description: 'Target ZIP code' },
        { name: 'DISTANCE', type: 'Float', description: 'Distance' },
        { name: 'DISTANCE_IN_MILES', type: 'Float', description: 'Distance in miles' },
        { name: 'LIST_ID', type: 'String', description: FIELD_DESCRIPTIONS.LIST_ID || 'List ID' },
        { name: 'MA1566', type: 'Integer', description: FIELD_DESCRIPTIONS.MA1566 || 'MA1566' },
        { name: 'CREDIT_SCORE', type: 'Integer', description: FIELD_DESCRIPTIONS.CREDIT_SCORE || 'Credit score' },
        { name: 'INCOME', type: 'Float', description: FIELD_DESCRIPTIONS.INCOME || 'Income' },
        { name: 'ZIP_CODE', type: 'String', description: FIELD_DESCRIPTIONS.ZIP_CODE || 'ZIP code' },
      ];
    }

    setFields(fieldsToUse);
    
    const headers = fieldsToUse.map(f => f.name);
    setAllAvailableHeaders(headers);
    setSelectedHeaders(headers); // Initially select all headers

    onChange({
      ...data,
      sourceName: tableSourceName || tableName, // Use tableSourceName if provided, fallback to tableName
      subSourceType: 'Database',
      headers: headers, // All available headers from table
      selectedHeaders: headers, // Initially all headers are selected
      dataTypes: fieldsToUse.reduce((acc, f) => ({ ...acc, [f.name]: f.type }), {}),
      filterQuery,
      originalTableName: tableName, // Store original table name for restoration
    });
  };

  const handleTableSourceNameChange = (name: string) => {
    setTableSourceName(name);
    if (selectedTable) {
      // Preconfigured table
      onChange({
        ...data,
        sourceName: name,
        filterQuery,
        originalTableName: selectedTable, // Preserve original table name
      });
    } else if (customTableName) {
      // Custom table
      onChange({
        ...data,
        sourceName: name,
        filterQuery,
        customTableMetadata: {
          source: selectedSource,
          database: selectedDatabase,
          schema: selectedSchema, // Already contains ID from handleSchemaChange
          tableName: customTableName,
          tableSourceName: name
        }
      });
    }
  };

  const handleGetTop10Records = async () => {
    if (!selectedTable && !customTableName) {
      console.warn('Please select a table before fetching records');
      return;
    }

    setIsLoadingRecords(true);
    
    try {
      // Construct the API payload based on table type
      const payload: Top10RecordsRequest = {
        sourceType: 'db',
        tableName: tableSelectionType === 'preconfigured' ? selectedTable : customTableName,
        tableType: tableSelectionType
      };

      // Add database and schema information for custom tables
      if (tableSelectionType === 'custom') {
        // selectedSchema should already contain the ID from handleSchemaChange
        console.log('getTop10Records - using selectedSchema:', selectedSchema, 'type:', typeof selectedSchema);
        
        if (!selectedSchema) {
          console.warn('selectedSchema is empty');
          setIsLoadingRecords(false);
          return;
        }
        
        payload.database = selectedDatabase;
        payload.schema = selectedSchema; // Already contains ID
        payload.source = selectedSource;
      }

      // Make the API call
      const response: Top10RecordsResponse = await getTop10Records(payload);
      
      // Process the response
      const { columns, data: responseData } = response;
      
      // Extract actual column names from the data (uppercase format)
      const actualColumns = responseData.length > 0 ? Object.keys(responseData[0]) : columns.map(col => col.toUpperCase());
      
      // Create fields based on actual data columns
      const responseFields = actualColumns.map(column => ({
        name: column,
        type: typeof responseData[0]?.[column] === 'number' ? 'Number' : 'String',
        description: FIELD_DESCRIPTIONS[column] || `${column} field`
      }));

      setFields(responseFields);
      setTop10Records(responseData);
      setShowTop10(true);
      setSearchTerm(''); // Reset search when loading new data
      
      setAllAvailableHeaders(actualColumns);
      setSelectedHeaders(actualColumns); // Initially select all headers

      // Update parent component data
      onChange({
        ...data,
        sourceName: tableSourceName || (tableSelectionType === 'preconfigured' ? selectedTable : `${selectedSource}.${selectedDatabase}.${selectedSchema}.${customTableName}`),
        subSourceType: tableSelectionType === 'preconfigured' ? 'Database' : 'Custom Database',
        headers: actualColumns, // All available headers
        selectedHeaders: actualColumns, // Initially all headers are selected
        dataTypes: actualColumns.reduce((acc, col) => ({ ...acc, [col]: 'String' }), {}),
        previewData: responseData,
        filterQuery,
        // Add metadata for custom table restoration
        ...(tableSelectionType === 'custom' && {
          customTableMetadata: {
            source: selectedSource,
            database: selectedDatabase,
            schema: selectedSchema, // Already contains ID from handleSchemaChange
            tableName: customTableName,
            tableSourceName: tableSourceName
          }
        })
      });
    } catch (error) {
      console.error('Error fetching top 10 records:', error);
      
      // Show mock data if API fails - simulating API response structure
      const mockResponse = {
        columns: ['email_id', 'profile_id', 'list_id', 'email_md5', 'ma1566', 'credit_score', 'income', 'age', 'zip_code', 'first_name', 'last_name', 'phone_number', 'state', 'city', 'account_status', 'employment_status', 'account_balance'],
        data: [
          { EMAIL_ID: 'john.doe@example.com', PROFILE_ID: 'P12345', LIST_ID: 'L001', EMAIL_MD5: '5c5e3e9f8f9c2d6b8e3a1f7c9d4e2b1a', MA1566: 1, CREDIT_SCORE: 750, INCOME: 85000, AGE: 32, ZIP_CODE: '10001', FIRST_NAME: 'John', LAST_NAME: 'Doe', PHONE_NUMBER: '5551234567', STATE: 'NY', CITY: 'New York', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 15000 },
          { EMAIL_ID: 'jane.smith@example.com', PROFILE_ID: 'P12346', LIST_ID: 'L002', EMAIL_MD5: '8f7d6e5c4b3a2e1f9d8c7b6a5e4d3c2b', MA1566: 1, CREDIT_SCORE: 720, INCOME: 72000, AGE: 28, ZIP_CODE: '10002', FIRST_NAME: 'Jane', LAST_NAME: 'Smith', PHONE_NUMBER: '5551234568', STATE: 'CA', CITY: 'Los Angeles', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 12500 },
          { EMAIL_ID: 'bob.johnson@example.com', PROFILE_ID: 'P12347', LIST_ID: 'L003', EMAIL_MD5: '3a2b1c9d8e7f6a5b4c3d2e1f9a8b7c6d', MA1566: 0, CREDIT_SCORE: 680, INCOME: 65000, AGE: 45, ZIP_CODE: '10003', FIRST_NAME: 'Bob', LAST_NAME: 'Johnson', PHONE_NUMBER: '5551234569', STATE: 'TX', CITY: 'Houston', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Self-Employed', ACCOUNT_BALANCE: 8900 },
          { EMAIL_ID: 'alice.williams@example.com', PROFILE_ID: 'P12348', LIST_ID: 'L004', EMAIL_MD5: '7c6d5e4f3a2b1c9d8e7f6a5b4c3d2e1f', MA1566: 1, CREDIT_SCORE: 785, INCOME: 95000, AGE: 38, ZIP_CODE: '10004', FIRST_NAME: 'Alice', LAST_NAME: 'Williams', PHONE_NUMBER: '5551234570', STATE: 'FL', CITY: 'Miami', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 22000 },
          { EMAIL_ID: 'charlie.brown@example.com', PROFILE_ID: 'P12349', LIST_ID: 'L005', EMAIL_MD5: '2e1f9a8b7c6d5e4f3a2b1c9d8e7f6a5b', MA1566: 1, CREDIT_SCORE: 710, INCOME: 78000, AGE: 41, ZIP_CODE: '10005', FIRST_NAME: 'Charlie', LAST_NAME: 'Brown', PHONE_NUMBER: '5551234571', STATE: 'IL', CITY: 'Chicago', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 16500 },
          { EMAIL_ID: 'david.miller@example.com', PROFILE_ID: 'P12350', LIST_ID: 'L006', EMAIL_MD5: '6a5b4c3d2e1f9a8b7c6d5e4f3a2b1c9d', MA1566: 0, CREDIT_SCORE: 665, INCOME: 58000, AGE: 29, ZIP_CODE: '10006', FIRST_NAME: 'David', LAST_NAME: 'Miller', PHONE_NUMBER: '5551234572', STATE: 'WA', CITY: 'Seattle', ACCOUNT_STATUS: 'Inactive', EMPLOYMENT_STATUS: 'Unemployed', ACCOUNT_BALANCE: 3200 },
          { EMAIL_ID: 'emma.davis@example.com', PROFILE_ID: 'P12351', LIST_ID: 'L007', EMAIL_MD5: '1c9d8e7f6a5b4c3d2e1f9a8b7c6d5e4f', MA1566: 1, CREDIT_SCORE: 740, INCOME: 88000, AGE: 35, ZIP_CODE: '10007', FIRST_NAME: 'Emma', LAST_NAME: 'Davis', PHONE_NUMBER: '5551234573', STATE: 'MA', CITY: 'Boston', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 19000 },
          { EMAIL_ID: 'frank.garcia@example.com', PROFILE_ID: 'P12352', LIST_ID: 'L008', EMAIL_MD5: '9a8b7c6d5e4f3a2b1c9d8e7f6a5b4c3d', MA1566: 1, CREDIT_SCORE: 795, INCOME: 105000, AGE: 42, ZIP_CODE: '10008', FIRST_NAME: 'Frank', LAST_NAME: 'Garcia', PHONE_NUMBER: '5551234574', STATE: 'CO', CITY: 'Denver', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 28000 },
          { EMAIL_ID: 'grace.martinez@example.com', PROFILE_ID: 'P12353', LIST_ID: 'L009', EMAIL_MD5: '4c3d2e1f9a8b7c6d5e4f3a2b1c9d8e7f', MA1566: 0, CREDIT_SCORE: 690, INCOME: 62000, AGE: 31, ZIP_CODE: '10009', FIRST_NAME: 'Grace', LAST_NAME: 'Martinez', PHONE_NUMBER: '5551234575', STATE: 'AZ', CITY: 'Phoenix', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 9500 },
          { EMAIL_ID: 'henry.rodriguez@example.com', PROFILE_ID: 'P12354', LIST_ID: 'L010', EMAIL_MD5: '8e7f6a5b4c3d2e1f9a8b7c6d5e4f3a2b', MA1566: 1, CREDIT_SCORE: 730, INCOME: 82000, AGE: 39, ZIP_CODE: '10010', FIRST_NAME: 'Henry', LAST_NAME: 'Rodriguez', PHONE_NUMBER: '5551234576', STATE: 'NV', CITY: 'Las Vegas', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Self-Employed', ACCOUNT_BALANCE: 17500 },
        ]
      };

      // Process mock response the same way as real API response
      const { columns, data: responseData } = mockResponse;
      const actualColumns = responseData.length > 0 ? Object.keys(responseData[0]) : columns.map(col => col.toUpperCase());
      
      const mockFields = actualColumns.map(column => ({
        name: column,
        type: 'String',
        description: FIELD_DESCRIPTIONS[column] || `${column} field`
      }));

      setFields(mockFields);
      setTop10Records(responseData);
      setShowTop10(true);
      setSearchTerm('');
      
      setAllAvailableHeaders(actualColumns);
      setSelectedHeaders(actualColumns); // Initially select all headers

      // Update parent component data with mock data
      onChange({
        ...data,
        sourceName: tableSourceName || (tableSelectionType === 'preconfigured' ? selectedTable : `${selectedSource}.${selectedDatabase}.${selectedSchema}.${customTableName}`),
        subSourceType: tableSelectionType === 'preconfigured' ? 'Database' : 'Custom Database',
        headers: actualColumns, // All available headers
        selectedHeaders: actualColumns, // Initially all headers are selected
        dataTypes: actualColumns.reduce((acc, col) => ({ ...acc, [col]: 'String' }), {}),
        previewData: responseData,
        filterQuery,
        // Add metadata for custom table restoration (mock data scenario)
        ...(tableSelectionType === 'custom' && {
          customTableMetadata: {
            source: selectedSource,
            database: selectedDatabase,
            schema: selectedSchema, // Already contains ID from handleSchemaChange
            tableName: customTableName,
            tableSourceName: tableSourceName
          }
        })
      });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleHeaderSelectionChange = (newSelectedHeaders: string[]) => {
    setSelectedHeaders(newSelectedHeaders);
    
    // Update parent data with selected headers while preserving all available headers
    onChange({
      ...data,
      selectedHeaders: newSelectedHeaders, // Save user's selection
      // headers field should remain unchanged to preserve full list
    });
  };

  const handleSourceChange = (sourceId: string) => {
    setSelectedSource(sourceId);
    setSelectedDatabase('');
    setSelectedSchema('');
    setCustomTableName('');
    setDatabaseSearch('');
    setFields([]);
    setAllAvailableHeaders([]);
    setSelectedHeaders([]);
    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);
  };

  const handleDatabaseChange = (database: string) => {
    setSelectedDatabase(database);
    setSelectedSchema('');
    setCustomTableName('');
    setFields([]);
    setAllAvailableHeaders([]);
    setSelectedHeaders([]);
    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);
  };

  const handleSchemaChange = (schema: string) => {
    // Save the schema ID instead of the name
    const schemaId = getSchemaId(schema);
    console.log('handleSchemaChange - schema:', schema, 'schemaId:', schemaId, 'selectedDatabase:', selectedDatabase);
    console.log('Available schemas from API:', apiSources?.fileSource?.dataBase?.[selectedDatabase]);
    
    if (schemaId !== undefined) {
      setSelectedSchema(schemaId.toString());
      console.log('Setting selectedSchema to ID:', schemaId.toString());
    } else {
      console.warn('Could not find schema ID for:', schema, '- using name as fallback');
      setSelectedSchema(schema);
    }
    
    setCustomTableName('');
    setFields([]);
    setAllAvailableHeaders([]);
    setSelectedHeaders([]);
    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);
  };

  const handleCustomTableNameChange = (tableName: string) => {
    setCustomTableName(tableName);
    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);
    
    // Clear fields and headers when table name changes
    // Fields will only be set after Get Top 10 Records is called
    setFields([]);
    setAllAvailableHeaders([]);
    setSelectedHeaders([]);

    onChange({
      ...data,
      sourceName: tableName.trim() ? (tableSourceName || `${selectedSource}.${selectedDatabase}.${selectedSchema}.${tableName}`) : '',
      subSourceType: 'Custom Database',
      headers: [],
      dataTypes: {},
      filterQuery,
      customTableMetadata: {
        source: selectedSource,
        database: selectedDatabase,
        schema: selectedSchema, // Already contains ID from handleSchemaChange
        tableName: tableName,
        tableSourceName: tableSourceName
      }
    });
  };

  const handleTableSelectionTypeChange = (type: 'preconfigured' | 'custom') => {
    setTableSelectionType(type);

    // Reset both preconfigured and custom states
    setSelectedTable('');
    setTableSearch('');
    setSelectedSource('hubreader'); // Keep hubreader as default for custom table
    setSelectedDatabase('');
    setSelectedSchema('');
    setCustomTableName('');
    setTableSourceName('');
    setDatabaseSearch('');
    setFields([]);
    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);

    // Clear data
    onChange({
      ...data,
      sourceName: '',
      subSourceType: type === 'preconfigured' ? 'Database' : 'Custom Database',
      headers: [],
      dataTypes: {},
      filterQuery,
    });
  };

  return (
    <Box>
      {/* Table Selection Type */}
      <Box sx={{ mb: 2.5 }}>
        <FormControl component="fieldset">
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', mb: 1.5, color: '#2D3748' }}>
            Table Selection
          </Typography>
          <RadioGroup
            row
            value={tableSelectionType}
            onChange={(e) => handleTableSelectionTypeChange(e.target.value as 'preconfigured' | 'custom')}
          >
            <FormControlLabel
              value="preconfigured"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Preconfigured Table</Typography>}
              sx={{ mr: 3 }}
            />
            <FormControlLabel
              value="custom"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Custom Table</Typography>}
            />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Preconfigured Table Selection */}
      {tableSelectionType === 'preconfigured' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
              Select Preconfigured Table <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Select
                size="small"
                value={selectedTable}
                onChange={(e) => handleTableChange(e.target.value)}
                onClose={() => setTableSearch('')}
                displayEmpty
                disabled={sourcesLoading}
                sx={{ flex: 1 }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
              >
                <MenuItem value="">
                  <em>{sourcesLoading ? 'Loading tables...' : 'Select Database Table'}</em>
                </MenuItem>
                {!sourcesLoading && (
                  <MenuItem
                    disableRipple
                    disableTouchRipple
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'white',
                      zIndex: 1,
                      borderBottom: '1px solid #ddd',
                      '&:hover': { backgroundColor: 'white' },
                      cursor: 'default',
                    }}
                  >
                    <TextField
                      size="small"
                      placeholder="Search database tables..."
                      fullWidth
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </MenuItem>
                )}
                {!sourcesLoading && currentTables
                  .filter((table) =>
                    table.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
                    table.description.toLowerCase().includes(tableSearch.toLowerCase())
                  )
                  .map((table) => (
                    <MenuItem key={table.name} value={table.name}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {table.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {table.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
              <Button
                variant="outlined"
                size="small"
                onClick={handleGetTop10Records}
                disabled={!selectedTable || isLoadingRecords}
                sx={{
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  minWidth: '160px',
                }}
              >
                {isLoadingRecords ? 'Loading...' : 'Get Top 10 Records'}
              </Button>
              <Tooltip title="Data Dictionary" placement="top">
                <IconButton
                  size="medium"
                  onClick={() => setDataDictionaryOpen(true)}
                  sx={{
                    color: '#296695',
                    backgroundColor: 'rgba(41, 102, 149, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(41, 102, 149, 0.2)',
                      transform: 'scale(1.05)',
                    },
                    padding: '10px',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: '0 2px 4px rgba(41, 102, 149, 0.15)',
                  }}
                >
                  <MenuBook sx={{ fontSize: 26 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Top 10 Records Preview - Inline */}
          {showTop10 && top10Records.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Top 10 Records Preview
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    sx={{ p: 0.5 }}
                  >
                    {isPreviewExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <TextField
                  size="small"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: '300px',
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                    },
                  }}
                />
              </Box>
              <Collapse in={isPreviewExpanded}>
                <TableContainer
                component={Paper}
                sx={{
                  maxHeight: 350,
                  overflowX: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Table stickyHeader size="small" sx={{ minWidth: Object.keys(top10Records[0] || {}).length * 120 }}>
                  <TableHead>
                    <TableRow>
                      {Object.keys(top10Records[0] || {}).map((header) => (
                        <TableCell key={header} sx={{ backgroundColor: '#F8FAFB', fontWeight: 600, py: 1, whiteSpace: 'nowrap' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {header}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {top10Records
                      .filter((row) => {
                        if (!searchTerm.trim()) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return Object.values(row).some((value) =>
                          String(value || '').toLowerCase().includes(searchLower)
                        );
                      })
                      .map((row, idx) => (
                        <TableRow key={idx} hover>
                          {Object.keys(row).map((key) => (
                            <TableCell key={key} sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {row[key]}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </Collapse>
            </Box>
          )}

          {/* Header Selection */}
          {allAvailableHeaders.length > 0 && (
            <HeaderSelector
              availableHeaders={allAvailableHeaders}
              selectedHeaders={selectedHeaders}
              onHeadersChange={handleHeaderSelectionChange}
              disabled={false}
            />
          )}

          {/* Filters Module for Preconfigured Table */}
          {fields.length > 0 && selectedHeaders.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <FilterBuilder 
                headers={selectedHeaders} 
                onFilterChange={(query) => {
                  setFilterQuery(query);
                  onChange({
                    ...data,
                    filterQuery: query,
                  });
                }} 
                onConfigChange={(config) => {
                  onChange({
                    ...data,
                    filterConfig: config,
                  });
                }}
                initialConfig={data.filterConfig}
                showDataType={false} 
              />
              {/* Display current filter query if in edit mode and has saved filter */}
              {data.filterQuery && (
                <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Saved Filter Query:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {data.filterQuery}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                    Note: Use the filter builder above to modify this query
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Table Source Name - Only shown when a table is selected, appears after Filters */}
          {selectedTable && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Table Source Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Enter unique source name for this table"
                value={tableSourceName}
                onChange={(e) => handleTableSourceNameChange(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
                Provide a unique name to identify this source within the request
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Custom Table Selection */}
      {tableSelectionType === 'custom' && (
        <Box>
          
          {/* Sources Dropdown */}
          {/* <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
              Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <Select
              fullWidth
              size="small"
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              displayEmpty
              disabled
            >
              <MenuItem value="">
                <em>Select Snowflake Account</em>
              </MenuItem>
              {SNOWFLAKE_SOURCES.map((source) => (
                <MenuItem key={source.id} value={source.id}>
                  <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                    {source.name}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </Box> */}

          {/* Database Dropdown */}
          {selectedSource && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Database <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <Select
                fullWidth
                size="small"
                value={selectedDatabase}
                onChange={(e) => {
                  console.log('Database changed to:', e.target.value);
                  handleDatabaseChange(e.target.value);
                }}
                onClose={() => setDatabaseSearch('')}
                displayEmpty
                MenuProps={{ PaperProps: { sx: { maxHeight: 300 } }, autoFocus: false }}
              >
                <MenuItem value="">
                  <em>Select Database</em>
                </MenuItem>
                <MenuItem
                  disableRipple
                  disableTouchRipple
                  onKeyDown={(e) => e.stopPropagation()}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'white',
                    zIndex: 1,
                    borderBottom: '1px solid #ddd',
                    '&:hover': { backgroundColor: 'white' },
                    cursor: 'default',
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Search databases..."
                    fullWidth
                    value={databaseSearch}
                    onChange={(e) => setDatabaseSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </MenuItem>
                {getAvailableDatabases()
                  ?.filter((db) => db.toLowerCase().includes(databaseSearch.toLowerCase()))
                  .map((db) => (
                    <MenuItem key={db} value={db}>
                      <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                        {db}
                      </Typography>
                    </MenuItem>
                  ))}
              </Select>
            </Box>
          )}

          {/* Schema Dropdown */}
          {selectedDatabase && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Schema <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <Select
                fullWidth
                size="small"
                value={selectedSchema}
                onChange={(e) => handleSchemaChange(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select Schema</em>
                </MenuItem>
                {getAvailableSchemas()?.map((schema: string) => (
                  <MenuItem key={schema} value={schema}>
                    <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                      {schema}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          {/* Table Name TextField */}
          {selectedSchema && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Table Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Enter table name"
                  value={customTableName}
                  onChange={(e) => handleCustomTableNameChange(e.target.value)}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGetTop10Records}
                  disabled={!customTableName || !selectedSource || !selectedDatabase || !selectedSchema || isLoadingRecords}
                  sx={{
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    minWidth: '160px',
                  }}
                >
                  {isLoadingRecords ? 'Loading...' : 'Get Top 10 Records'}
                </Button>
                <Tooltip title="Data Dictionary" placement="top">
                  <IconButton
                    size="medium"
                    onClick={() => setDataDictionaryOpen(true)}
                    disabled={!customTableName || !fields.length}
                    sx={{
                      color: '#296695',
                      backgroundColor: 'rgba(41, 102, 149, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.2)',
                        transform: 'scale(1.05)',
                      },
                      '&:disabled': {
                        backgroundColor: 'rgba(0, 0, 0, 0.12)',
                        color: 'rgba(0, 0, 0, 0.26)',
                      },
                      padding: '10px',
                      transition: 'all 0.2s ease-in-out',
                      boxShadow: '0 2px 4px rgba(41, 102, 149, 0.15)',
                    }}
                  >
                    <MenuBook sx={{ fontSize: 26 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}


          {/* Header Selection for Custom Table */}
          {(allAvailableHeaders.length > 0 || (data && data.headers && data.headers.length > 0 && data.subSourceType === 'Custom Database')) && (
            <HeaderSelector
              availableHeaders={allAvailableHeaders.length > 0 ? allAvailableHeaders : (data.headers || [])}
              selectedHeaders={selectedHeaders.length > 0 ? selectedHeaders : (data.headers || [])}
              onHeadersChange={handleHeaderSelectionChange}
              disabled={false}
            />
          )}

          {/* Top 10 Records Preview - Inline for Custom Table */}
          {showTop10 && top10Records.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Top 10 Records Preview
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    sx={{ p: 0.5 }}
                  >
                    {isPreviewExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <TextField
                  size="small"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: '300px',
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                    },
                  }}
                />
              </Box>
              <Collapse in={isPreviewExpanded}>
                <TableContainer
                component={Paper}
                sx={{
                  maxHeight: 350,
                  overflowX: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Table stickyHeader size="small" sx={{ minWidth: Object.keys(top10Records[0] || {}).length * 120 }}>
                  <TableHead>
                    <TableRow>
                      {Object.keys(top10Records[0] || {}).map((header) => (
                        <TableCell key={header} sx={{ backgroundColor: '#F8FAFB', fontWeight: 600, py: 1, whiteSpace: 'nowrap' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {header}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {top10Records
                      .filter((row) => {
                        if (!searchTerm.trim()) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return Object.values(row).some((value) =>
                          String(value || '').toLowerCase().includes(searchLower)
                        );
                      })
                      .map((row, idx) => (
                        <TableRow key={idx} hover>
                          {Object.keys(row).map((key) => (
                            <TableCell key={key} sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {row[key]}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </Collapse>
            </Box>
          )}

          {/* Filters Module for Custom Table */}
          {fields.length > 0 && selectedHeaders.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <FilterBuilder 
                headers={selectedHeaders} 
                onFilterChange={(query) => {
                  setFilterQuery(query);
                  onChange({
                    ...data,
                    filterQuery: query,
                  });
                }} 
                onConfigChange={(config) => {
                  onChange({
                    ...data,
                    filterConfig: config,
                  });
                }}
                initialConfig={data.filterConfig}
                showDataType={false} 
              />
              {/* Display current filter query if in edit mode and has saved filter */}
              {data.filterQuery && (
                <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Saved Filter Query:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {data.filterQuery}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                    Note: Use the filter builder above to modify this query
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Source Name for Custom Table */}
          {customTableName && (fields.length > 0 || (data && data.subSourceType === 'Custom Database')) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Source Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Enter unique source name for this table"
                value={tableSourceName}
                onChange={(e) => handleTableSourceNameChange(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
                Provide a unique name to identify this source within the request (Auto-generated: {selectedSource}.{selectedDatabase}.{selectedSchema}.{customTableName})
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Data Dictionary Dialog */}
      <DataDictionaryDialog
        open={dataDictionaryOpen}
        onClose={() => setDataDictionaryOpen(false)}
        tableName={selectedTable || customTableName || 'All Database Tables'}
        fields={(selectedTable || customTableName) ? generateDataDictionary(selectedTable || customTableName, apiSources?.dbSource?.dataDictionary) : []}
        showAllTables={!selectedTable && !customTableName}
        allTables={!selectedTable && !customTableName ? currentTables.map(table => {
          const apiFields = apiSources?.dbSource?.dataDictionary?.[table.name];
          return {
            name: table.name,
            description: table.description,
            fields: apiFields || generateDataDictionary(table.name, apiSources?.dbSource?.dataDictionary)
          };
        }) : []}
      />
    </Box>
  );
};

export default DatabaseSourceConfig;
