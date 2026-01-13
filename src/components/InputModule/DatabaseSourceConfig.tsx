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
import { Search, ExpandMore, ExpandLess } from '@mui/icons-material';
import type { InputSource } from './InputModule';
import FilterBuilder from './FilterBuilder';
import HeaderSelector from '../shared/HeaderSelector';
import { type RequestInputsResponse, type Top10RecordsRequest, type Top10RecordsResponse, getTop10Records } from '../../services/api';

interface DatabaseSourceConfigProps {
  data: Partial<InputSource>;
  onChange: (data: Partial<InputSource>) => void;
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
}

// Preconfigured database tables
const DATABASE_TABLES = [
  { name: 'Permission', description: 'Permission based customer data', tableId: undefined },
  { name: 'Non_Permission', description: 'Non-permission based customer data', tableId: undefined },
  { name: 'Transunion', description: 'Transunion credit bureau data', tableId: undefined },
  { name: 'Axiom', description: 'Axiom credit bureau data', tableId: undefined },
  { name: 'Experian', description: 'Experian credit bureau data', tableId: undefined },
  { name: 'Green_Profile', description: 'Green profile data', tableId: undefined },
  { name: 'Orange_Profile', description: 'Orange profile data', tableId: undefined },
  { name: 'Arcamax_Profile', description: 'Arcamax profile data', tableId: undefined },
  { name: 'Publisher_Data', description: 'Publisher data', tableId: undefined },
  { name: 'Green_Publisher_Data', description: 'Green publisher data', tableId: undefined },
  { name: 'Orange_Publisher_Data', description: 'Orange publisher data', tableId: undefined },
  { name: 'Arcamax_Publisher_Data', description: 'Arcamax publisher data', tableId: undefined },
  { name: 'Best_Postal', description: 'Best postal data', tableId: undefined },
  { name: 'All_Postal', description: 'All postal data', tableId: undefined },
  { name: 'Phone_Numbers_Data', description: 'Phone numbers data', tableId: undefined },
  { name: 'Zips_Radius_Data', description: 'ZIP radius data', tableId: undefined },
  { name: 'Shahash_Data', description: 'Shahash data', tableId: undefined },
  { name: 'Liveintent_Data', description: 'Liveintent data', tableId: undefined },
  { name: 'DNS_Suppression_Data', description: 'DNS suppression data', tableId: undefined },
  { name: 'Bacon_SBI_Policies_Data', description: 'Bacon SBI policies data', tableId: undefined },
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


// Snowflake accounts (sources)
const SNOWFLAKE_SOURCES = [
  { id: 'zetaglobal', name: 'ZetaGlobal' },
  { id: 'hubreader', name: 'Hub Reader' },
];

// Note: All data should come from API - no mock fallbacks

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
  const [selectedTableId, setSelectedTableId] = useState<number | undefined>(undefined);
  const [fields, setFields] = useState<any[]>([]);
  const [allAvailableHeaders, setAllAvailableHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [filterQuery, setFilterQuery] = useState<string>(data.filterQuery || '');
  const prevDataLengthRef = useRef(Object.keys(data).length);
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

  // Get databases from API only - no fallbacks
  const getAvailableDatabases = () => {
    if (apiSources?.fileSource?.dataBase && typeof apiSources?.fileSource?.dataBase === 'object') {
      const apiDatabases = Object.keys(apiSources?.fileSource?.dataBase);
      return apiDatabases;
    }
    return [];
  };

  // Get schemas for selected database from API only - no fallbacks
  const getAvailableSchemas = () => {
    if (apiSources?.fileSource?.dataBase && selectedDatabase) {
      const schemas = apiSources?.fileSource?.dataBase?.[selectedDatabase];
      if (schemas && Array.isArray(schemas)) {
        return schemas.map((schema: any) => schema?.name);
      }
    }
    return [];
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
      setIsRestoringData(true); // Set restoration flag
      
      // Check if this is custom database data
      if (data.subSourceType === 'Custom Database') {
        setTableSelectionType('custom');
        
        // Use metadata if available (newer saves), otherwise parse source name (backward compatibility)
        if (data.customTableMetadata) {
          const metadata = data.customTableMetadata;
          
          // Set all values from metadata
          setSelectedSource(metadata.source || '');
          setSelectedDatabase(metadata.database || '');
          setSelectedSchema(metadata.schema || ''); // Should already be ID
          setCustomTableName(metadata.tableName || '');
          setTableSourceName(metadata.tableSourceName || '');
        } else {
          // Parse source name to extract components (backward compatibility)
          const sourceName = data.sourceName || '';
          const parts = sourceName.split('.');
          
          if (parts.length >= 4) {
            setSelectedSource(parts[0] || '');
            setSelectedDatabase(parts[1] || '');
            setSelectedSchema(parts[2] || '');
            setCustomTableName(parts[3] || '');

            // Always set Table Source Name to the saved sourceName in edit mode
            setTableSourceName(sourceName);
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

        // Priority 1: Try to restore by tableId (most reliable)
        if (data.tableSourceId) {
          console.log('[DatabaseSourceConfig] Restoring by tableId:', data.tableSourceId);

          // Find the table by tableId
          const tableObj = availableTables.find(table => table.tableId === data.tableSourceId);

          if (tableObj) {
            console.log('[DatabaseSourceConfig] Found table by ID:', tableObj.tableName);
            setSelectedTable(tableObj.tableName);
            setSelectedTableId(tableObj.tableId);
          } else {
            console.warn('[DatabaseSourceConfig] Table not found by ID, trying by name');
            // Fallback to name-based lookup
            const tableNameToRestore = data.originalTableName || data.table || '';
            const tableByName = availableTables.find(table => table.tableName === tableNameToRestore);

            if (tableByName) {
              setSelectedTable(tableByName.tableName);
              setSelectedTableId(tableByName.tableId);
            } else {
              setSelectedTable('');
              setSelectedTableId(undefined);
            }
          }
        } else {
          // Priority 2: No tableId available, restore by table name
          console.log('[DatabaseSourceConfig] Restoring by table name');
          const tableNameToRestore = data.originalTableName || data.table || '';

          if (tableNameToRestore) {
            const tableObj = availableTables.find(table => table.tableName === tableNameToRestore);

            if (tableObj) {
              setSelectedTable(tableObj.tableName);
              setSelectedTableId(tableObj.tableId);
            } else {
              setSelectedTable('');
              setSelectedTableId(undefined);
            }
          } else {
            setSelectedTable('');
            setSelectedTableId(undefined);
          }
        }

        // Always set the Table Source Name to the saved sourceName in edit mode
        // This is the user's custom name for the source (can be different from table name)
        if (data.sourceName) {
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
  }, [data]); // Watch entire data object to ensure all changes trigger restoration

  // Validate database selection whenever source changes or available databases change
  useEffect(() => {
    // Don't validate during restoration to avoid clearing restored values
    if (isRestoringData) {
      return;
    }
    
    if (selectedSource && selectedDatabase) {
      const availableDbs = getAvailableDatabases();
      
      if (!availableDbs.includes(selectedDatabase)) {
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
      
      // Check if the restored schema exists in current API data
      const schemaExists = availableSchemas.some((schemaName: string) => {
        const schemaId = getSchemaId(schemaName);
        return schemaName === selectedSchema || (schemaId !== undefined && schemaId.toString() === selectedSchema);
      });
      
      if (!schemaExists && availableSchemas.length > 0) {
        const firstSchemaName = availableSchemas[0];
        const firstSchemaId = getSchemaId(firstSchemaName);
        setSelectedSchema(firstSchemaId !== undefined ? firstSchemaId.toString() : firstSchemaName);
      }
    }
  }, [selectedDatabase, selectedSchema, apiSources, isRestoringData]);

  // Auto-trigger Get Top 10 Records in edit mode when preview data is not available
  useEffect(() => {
    // Only proceed after restoration is complete
    if (isRestoringData) {
      return;
    }

    // Check if we're in edit mode (data exists with id and required fields)
    const isEditMode = data && data.id && Object.keys(data).length > 0;

    // Check if preview data is not available
    const hasNoPreviewData = !data?.previewData || data.previewData.length === 0;

    // Check if we have a table selected
    const hasTableSelected = (selectedTable && tableSelectionType === 'preconfigured') ||
                              (customTableName && tableSelectionType === 'custom');

    // Auto-trigger if all conditions are met and not already loading/showing
    if (isEditMode && hasNoPreviewData && hasTableSelected && !isLoadingRecords && !showTop10) {
      console.log('[DatabaseSourceConfig] Auto-triggering Get Top 10 Records in edit mode');
      handleGetTop10Records();
    }
  }, [isRestoringData, data, selectedTable, customTableName, tableSelectionType, isLoadingRecords, showTop10]);

  // Initialize database and schema when component mounts and no data is being restored
  useEffect(() => {
    // Don't initialize during restoration
    if (isRestoringData) {
      return;
    }
    
    if (selectedSource && !selectedDatabase && (!data || Object.keys(data).length === 0)) {
      const availableDbs = getAvailableDatabases();
      if (availableDbs.length > 0) {
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
        const firstSchemaName = availableSchemas[0];
        const firstSchemaId = getSchemaId(firstSchemaName);
        setSelectedSchema(firstSchemaId !== undefined ? firstSchemaId.toString() : firstSchemaName);
      }
    }
  }, [selectedDatabase, selectedSource, apiSources, data, isRestoringData]);

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);

    // Find and store the tableId for this table
    const selectedTableObj = currentTables.find(table => table.name === tableName);
    setSelectedTableId(selectedTableObj?.tableId);

    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);

    // Clear fields and headers when table name changes
    // Fields will only be set after Get Top 10 Records is called
    setFields([]);
    setAllAvailableHeaders([]);
    setSelectedHeaders([]);

    // Auto-generate source name from table name
    const autoSourceName = tableName;
    setTableSourceName(autoSourceName);

    onChange({
      ...data,
      sourceName: autoSourceName,
      subSourceType: 'Database',
      headers: [], // Will be populated after Get Top 10 Records
      selectedHeaders: [], // Will be populated after Get Top 10 Records
      dataTypes: {}, // Will be populated after Get Top 10 Records
      filterQuery,
      previewData: [], // Will be populated after Get Top 10 Records
      originalTableName: tableName, // Store original table name for restoration
      tableSourceId: selectedTableObj?.tableId, // Store tableId for proper restoration and API calls
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
        tableSourceId: selectedTableId, // Preserve tableId
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
      return;
    }

    setIsLoadingRecords(true);
    
    try {
      // Construct the API payload based on table type
      const payload: Top10RecordsRequest = {
        sourceType: 'db',
        tableName: tableSelectionType === 'preconfigured' ? selectedTable : customTableName,
        tableType: tableSelectionType,
        ...(tableSelectionType === 'preconfigured' && selectedTableId && {
          sourceOption: selectedTableId
        })
      };

      // Add database and schema information for custom tables
      if (tableSelectionType === 'custom') {
        // selectedSchema should already contain the ID from handleSchemaChange

        if (!selectedSchema) {
          setIsLoadingRecords(false);
          return;
        }

        payload.database = selectedDatabase;
        payload.schema = selectedSchema; // Already contains ID
        payload.source = selectedSource;
      }

      console.log('[DatabaseSourceConfig] Fetching Top 10 Records with payload:', payload);

      // Make the API call
      const response: Top10RecordsResponse | any[] = await getTop10Records(payload);

      // Handle both response formats:
      // 1. Expected format: { columns: string[], data: object[] }
      // 2. Actual format from API: object[] (plain array)
      let columns: string[];
      let responseData: Record<string, any>[];

      if (Array.isArray(response)) {
        // Response is a plain array - extract columns from first object
        if (response.length === 0) {
          alert('No data found in the table. Please check the table name.');
          setIsLoadingRecords(false);
          return;
        }
        columns = Object.keys(response[0]);
        responseData = response;
      } else if (response && response.columns && response.data) {
        // Response has the expected format
        columns = response.columns;
        responseData = response.data;
      } else {
        // Invalid format
        alert('Received invalid data from server. Please try again.');
        setIsLoadingRecords(false);
        return;
      }

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

      // Check if we're in edit mode and should preserve existing selection
      const isEditMode = data && data.id && Object.keys(data).length > 0;
      const hasExistingSelection = data.selectedHeaders && Array.isArray(data.selectedHeaders) && data.selectedHeaders.length > 0;

      let finalSelectedHeaders: string[];
      if (isEditMode && hasExistingSelection) {
        // In edit mode, validate and preserve existing selection
        const isSelectionValid = data.selectedHeaders!.every(header => actualColumns.includes(header));
        finalSelectedHeaders = isSelectionValid ? data.selectedHeaders! : actualColumns;
      } else {
        // New mode - select all headers
        finalSelectedHeaders = actualColumns;
      }

      setSelectedHeaders(finalSelectedHeaders);

      // Auto-generate source name if not already set
      let autoSourceName = tableSourceName;
      if (!autoSourceName) {
        if (tableSelectionType === 'preconfigured') {
          autoSourceName = selectedTable;
        } else {
          // For custom table, use just the table name (not the full path)
          autoSourceName = customTableName;
        }
        setTableSourceName(autoSourceName);
      }

      // Update parent component data
      onChange({
        ...data,
        sourceName: autoSourceName,
        subSourceType: tableSelectionType === 'preconfigured' ? 'Database' : 'Custom Database',
        headers: actualColumns, // All available headers
        selectedHeaders: finalSelectedHeaders, // Preserve selection in edit mode
        dataTypes: actualColumns.reduce((acc, col) => ({ ...acc, [col]: 'String' }), {}),
        previewData: responseData,
        filterQuery,
        // Add tableId for preconfigured tables
        ...(tableSelectionType === 'preconfigured' && {
          originalTableName: selectedTable,
          tableSourceId: selectedTableId
        }),
        // Add metadata for custom table restoration
        ...(tableSelectionType === 'custom' && {
          customTableMetadata: {
            source: selectedSource,
            database: selectedDatabase,
            schema: selectedSchema, // Already contains ID from handleSchemaChange
            tableName: customTableName,
            tableSourceName: autoSourceName
          }
        })
      });
    } catch (error) {

      // Only show mock data fallback for preconfigured tables
      if (tableSelectionType === 'preconfigured') {
        // Mock data fallback for preconfigured database tables
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

        // Process mock response
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

        // Check if we're in edit mode and should preserve existing selection
        const isEditMode = data && data.id && Object.keys(data).length > 0;
        const hasExistingSelection = data.selectedHeaders && Array.isArray(data.selectedHeaders) && data.selectedHeaders.length > 0;

        let finalSelectedHeaders: string[];
        if (isEditMode && hasExistingSelection) {
          const isSelectionValid = data.selectedHeaders!.every(header => actualColumns.includes(header));
          finalSelectedHeaders = isSelectionValid ? data.selectedHeaders! : actualColumns;
        } else {
          finalSelectedHeaders = actualColumns;
        }

        setSelectedHeaders(finalSelectedHeaders);

        // Auto-generate source name if not already set
        let autoSourceName = tableSourceName;
        if (!autoSourceName) {
          autoSourceName = selectedTable;
          setTableSourceName(autoSourceName);
        }

        // Update parent component data with mock data
        onChange({
          ...data,
          sourceName: autoSourceName,
          subSourceType: 'Database',
          headers: actualColumns,
          selectedHeaders: finalSelectedHeaders,
          dataTypes: actualColumns.reduce((acc, col) => ({ ...acc, [col]: 'String' }), {}),
          previewData: responseData,
          filterQuery,
        });
      } else {
        // For custom tables, show error
        alert('Please enter a valid file name');

        // Reset state on error
        setFields([]);
        setTop10Records([]);
        setShowTop10(false);
        setSearchTerm('');
        setAllAvailableHeaders([]);
        setSelectedHeaders([]);
      }
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

  const handleSchemaChange = (schemaValue: string) => {
    // Schema value is already the ID (or name as fallback) from the dropdown

    setSelectedSchema(schemaValue);

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
      sourceName: tableName.trim() ? (tableSourceName || tableName) : '',
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

          {/* Header Selection - Only show after Get Top 10 Records is fetched or in edit mode */}
          {((showTop10 && top10Records.length > 0) || (data && data.subSourceType === 'Database' && data.sourceName)) && allAvailableHeaders.length > 0 && (
            <HeaderSelector
              availableHeaders={allAvailableHeaders}
              selectedHeaders={selectedHeaders}
              onHeadersChange={handleHeaderSelectionChange}
              disabled={false}
            />
          )}

          {/* Filters Module for Preconfigured Table - Only show after Get Top 10 Records is fetched or in edit mode */}
          {((showTop10 && top10Records.length > 0) || (data && data.subSourceType === 'Database' && data.sourceName)) && fields.length > 0 && selectedHeaders.length > 0 && (
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

          {/* Table Source Name - Only shown after Get Top 10 Records is clicked, appears after Filters */}
          {((showTop10 && top10Records.length > 0) || (data && data.subSourceType === 'Database' && data.sourceName)) && (
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
                {getAvailableSchemas()?.map((schema: string) => {
                  const schemaId = getSchemaId(schema);
                  const menuValue = schemaId !== undefined ? schemaId.toString() : schema;
                  return (
                    <MenuItem key={schema} value={menuValue}>
                      <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                        {schema}
                      </Typography>
                    </MenuItem>
                  );
                })}
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
                Provide a unique name to identify this source within the request (Auto-generated from table name: {customTableName})
              </Typography>
            </Box>
          )}
        </Box>
      )}

    </Box>
  );
};

export default DatabaseSourceConfig;
