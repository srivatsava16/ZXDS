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
  Autocomplete,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Search, ExpandMore, ExpandLess, CheckBox, CheckBoxOutlineBlank, MenuBook, Close } from '@mui/icons-material';
import type { InputSource } from './InputModule';
import FilterBuilder from './FilterBuilder';
import { type RequestInputsResponse, type Top10RecordsRequest, type Top10RecordsResponse, getTop10Records } from '../../services/api';
import { getReservedNamesFromAPI } from '../../utils/sourceValidation';

interface DatabaseSourceConfigProps {
  data: Partial<InputSource>;
  onChange: (data: Partial<InputSource>) => void;
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  sourceNameError?: string;
  allExistingSources?: InputSource[]; // For auto-generating unique source names
}

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
  sourcesLoading = false,
  sourceNameError = '',
  allExistingSources = []
}) => {
  /**
   * Generates a unique source name by checking against reserved names and existing sources
   * If baseName conflicts, appends _1, _2, _3, etc. until unique
   */
  const generateUniqueSourceName = (baseName: string): string => {
    if (!baseName || !baseName?.trim()) {
      return baseName;
    }

    const trimmedBase = baseName?.trim();

    // Get reserved names from API (file sources and table names)
    const reservedNames = getReservedNamesFromAPI(apiSources);

    // Get existing source names (excluding current source being edited)
    const existingSourceNames = allExistingSources
      .filter(source => data.id ? source.id !== data.id : true)
      .map(source => source.sourceName?.trim().toLowerCase());

    // Check if base name is unique
    const isNameTaken = (name: string): boolean => {
      const nameLower = name?.toLowerCase();
      return reservedNames?.includes(nameLower) || existingSourceNames?.includes(nameLower);
    };

    // If base name is unique, return it
    if (!isNameTaken(trimmedBase)) {
      return trimmedBase;
    }

    // Otherwise, append _1, _2, _3, etc. until unique
    let counter = 1;
    let uniqueName = `${trimmedBase}_${counter}`;

    while (isNameTaken(uniqueName)) {
      counter++;
      uniqueName = `${trimmedBase}_${counter}`;
    }

    return uniqueName;
  };

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
  const [customTableError, setCustomTableError] = useState<string>(''); // Error message for custom table
  const [dictionaryDialogOpen, setDictionaryDialogOpen] = useState<boolean>(false);

  // Use API preconfigured tables or fallback to defaults
  const availableTables = apiSources?.dbSource?.preconfiguredTables?.input || [];
  const currentTables = availableTables?.length > 0 
    ? availableTables?.map(table => ({
        name: table.tableName,
        description: table.description,
        tableId: table.tableId,
        columns: table.columns
      }))
    : [];

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
        return schemas?.map((schema: any) => schema?.name);
      }
    }
    return [];
  };

  // Helper function to get schema ID by name
  const getSchemaId = (schemaName: string): number | undefined => {
    if (apiSources?.fileSource?.dataBase && selectedDatabase) {
      const schemas = apiSources?.fileSource?.dataBase?.[selectedDatabase];
      if (schemas && Array.isArray(schemas)) {
        const schema = schemas?.find((s: any) => s?.name === schemaName);
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
          const parts = sourceName?.split('.');
          
          if (parts?.length >= 4) {
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
        if (data.headers && data.headers?.length > 0) {
          // For saved data, headers contains the selected headers (user's choice)
          // We need to restore them as both available and selected for backward compatibility
          // For new API structure, we could have separate fields but need to maintain compatibility
          const savedHeaders = data.headers;
          const savedSelectedHeaders = data.selectedHeaders || data.headers;
          
          setAllAvailableHeaders(savedHeaders);
          setSelectedHeaders(savedSelectedHeaders);
          
          // Create fields from headers and dataTypes
          const restoredFields = savedHeaders?.map(header => ({
            name: header,
            type: data.dataTypes?.[header] || 'String',
            description: FIELD_DESCRIPTIONS[header] || `${header} field`
          }));
          setFields(restoredFields);
        }
        
        // Restore preview data if available
        if (data.previewData && data.previewData?.length > 0) {
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
          const tableObj = availableTables?.find(table => table.tableId === data.tableSourceId);

          if (tableObj) {
            console.log('[DatabaseSourceConfig] Found table by ID:', tableObj.tableName);
            setSelectedTable(tableObj.tableName);
            setSelectedTableId(tableObj.tableId);
          } else {
            console.warn('[DatabaseSourceConfig] Table not found by ID, trying by name');
            // Fallback to name-based lookup
            const tableNameToRestore = data.originalTableName || data.table || '';
            const tableByName = availableTables?.find(table => table.tableName === tableNameToRestore);

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
            const tableObj = availableTables?.find(table => table.tableName === tableNameToRestore);

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
        if (data.headers && data.headers?.length > 0) {
          // For saved data, headers contains the selected headers (user's choice)
          // We need to restore them as both available and selected for backward compatibility
          const savedHeaders = data.headers;
          const savedSelectedHeaders = data.selectedHeaders || data.headers;
          
          setAllAvailableHeaders(savedHeaders);
          setSelectedHeaders(savedSelectedHeaders);
          
          const restoredFields = savedHeaders?.map(header => ({
            name: header,
            type: data.dataTypes?.[header] || 'String',
            description: FIELD_DESCRIPTIONS[header] || `${header} field`
          }));
          setFields(restoredFields);
        }
        
        if (data.previewData && data.previewData?.length > 0) {
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
      
      if (!availableDbs?.includes(selectedDatabase)) {
        setSelectedDatabase(availableDbs?.length > 0 ? availableDbs[0] : '');
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
      const schemaExists = availableSchemas?.some((schemaName: string) => {
        const schemaId = getSchemaId(schemaName);
        return schemaName === selectedSchema || (schemaId !== undefined && schemaId.toString() === selectedSchema);
      });
      
      if (!schemaExists && availableSchemas?.length > 0) {
        const firstSchemaName = availableSchemas[0];
        const firstSchemaId = getSchemaId(firstSchemaName);
        setSelectedSchema(firstSchemaId !== undefined ? firstSchemaId.toString() : firstSchemaName);
      }
    }
  }, [selectedDatabase, selectedSchema, apiSources, isRestoringData]);

  // Auto-trigger Get Sample Recods in edit mode when preview data is not available
  useEffect(() => {
    // Only proceed after restoration is complete
    if (isRestoringData) {
      return;
    }

    // Check if we're in edit mode (data exists with id and required fields)
    const isEditMode = data && data.id && Object.keys(data).length > 0;

    // Check if preview data is not available
    const hasNoPreviewData = !data?.previewData || data.previewData?.length === 0;

    // Check if we have a table selected
    const hasTableSelected = (selectedTable && tableSelectionType === 'preconfigured') ||
                              (customTableName && tableSelectionType === 'custom');

    // Auto-trigger if all conditions are met and not already loading/showing
    if (isEditMode && hasNoPreviewData && hasTableSelected && !isLoadingRecords && !showTop10) {
      console.log('[DatabaseSourceConfig] Auto-triggering Get Sample Recods in edit mode');
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
      if (availableDbs?.length > 0) {
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
      if (availableSchemas?.length > 0) {
        const firstSchemaName = availableSchemas[0];
        const firstSchemaId = getSchemaId(firstSchemaName);
        setSelectedSchema(firstSchemaId !== undefined ? firstSchemaId.toString() : firstSchemaName);
      }
    }
  }, [selectedDatabase, selectedSource, apiSources, data, isRestoringData]);

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);

    // Find and store the tableId for this table
    const selectedTableObj = currentTables?.find(table => table.name === tableName);
    const tableId = selectedTableObj?.tableId;

    console.log('[DatabaseSourceConfig] Table selection changed:', {
      tableName,
      foundTable: !!selectedTableObj,
      tableId,
      currentTablesCount: currentTables?.length,
      currentTablesPreview: currentTables?.slice(0, 3).map(t => ({ name: t.name, id: t.tableId })),
      availableTablesCount: availableTables?.length,
      selectedTableObj: selectedTableObj
    });

    setSelectedTableId(tableId);

    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);

    // Clear fields and headers when table name changes
    // Fields will only be set after Get Sample Recods is called
    setFields([]);
    setAllAvailableHeaders([]);
    setSelectedHeaders([]);

    // Reset filter query and config when table changes
    setFilterQuery('');

    // Auto-generate unique source name from table name
    const autoSourceName = generateUniqueSourceName(tableName);
    setTableSourceName(autoSourceName);

    // Build updated data, only include tableSourceId if it's defined
    // Don't spread old data to avoid keeping stale fields
    const updatedData: any = {
      sourceType: 'Database',
      sourceName: autoSourceName,
      subSourceType: 'Database',
      headers: [], // Will be populated after Get Sample Recods
      selectedHeaders: [], // Will be populated after Get Sample Recods
      dataTypes: {}, // Will be populated after Get Sample Recods
      filterQuery: '', // Reset filter when table changes
      filterJson: null, // Reset filter config
      previewData: [], // Will be populated after Get Sample Recods
      originalTableName: tableName, // Store original table name for restoration
      database: undefined,
      schema: undefined,
      table: tableName,
      customTableMetadata: undefined,
    };

    // Only add tableSourceId if it's defined (not undefined)
    if (tableId !== undefined) {
      updatedData.tableSourceId = tableId;
      console.log('[DatabaseSourceConfig] ✅ Adding tableSourceId to updatedData:', tableId);
    } else {
      console.warn('[DatabaseSourceConfig] ⚠️ tableId is undefined, not adding to updatedData. Check if API provided tableId in preconfiguredTables.');
    }

    console.log('[DatabaseSourceConfig] Calling onChange with data:', {
      sourceName: updatedData.sourceName,
      tableSourceId: updatedData.tableSourceId,
      originalTableName: updatedData.originalTableName,
      hasTableSourceId: 'tableSourceId' in updatedData
    });

    onChange(updatedData);
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

    // Clear any previous errors
    setCustomTableError('');
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

      // Handle multiple response formats:
      // 1. New format: { separator: string, data: object[] }
      // 2. Legacy format: { columns: string[], data: object[] }
      // 3. Plain array: object[] (fallback)
      let columns: string[];
      let responseData: Record<string, any>[];

      if (response && typeof response === 'object' && !Array.isArray(response) && 'data' in response && Array.isArray(response.data)) {
        // New format: { separator: string, data: object[] } or { data: object[] }
        responseData = response.data;

        if (responseData?.length === 0) {
          const errorMsg = 'No data found in the table. Please check the table name.';
          if (tableSelectionType === 'custom') {
            setCustomTableError(errorMsg);
          } else {
            alert(errorMsg);
          }
          setIsLoadingRecords(false);
          return;
        }

        // Extract columns from first data object
        columns = Object.keys(responseData[0]);
      } else if (response && typeof response === 'object' && !Array.isArray(response) && 'columns' in response && 'data' in response) {
        // Legacy format: { columns: string[], data: object[] }
        if (!response.columns || !Array.isArray(response.columns) || response.columns?.length === 0) {
          const errorMsg = 'Invalid response format: missing columns.';
          if (tableSelectionType === 'custom') {
            setCustomTableError(errorMsg);
          } else {
            alert(errorMsg);
          }
          setIsLoadingRecords(false);
          return;
        }
        columns = response.columns;
        responseData = response.data;
      } else if (Array.isArray(response)) {
        // Plain array fallback: object[]
        if (response?.length === 0) {
          const errorMsg = 'No data found in the table. Please check the table name.';
          if (tableSelectionType === 'custom') {
            setCustomTableError(errorMsg);
          } else {
            alert(errorMsg);
          }
          setIsLoadingRecords(false);
          return;
        }
        columns = Object.keys(response[0]);
        responseData = response;
      } else {
        // Invalid format
        const errorMsg = 'Received invalid data from server. Please try again.';
        if (tableSelectionType === 'custom') {
          setCustomTableError(errorMsg);
        } else {
          alert(errorMsg);
        }
        setIsLoadingRecords(false);
        return;
      }

      // Extract actual column names from the data (uppercase format)
      const actualColumns = responseData?.length > 0 ? Object.keys(responseData[0]) : columns?.map(col => col?.toUpperCase());
      
      // Create fields based on actual data columns
      const responseFields = actualColumns?.map(column => ({
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
      const hasExistingSelection = data.selectedHeaders && Array.isArray(data.selectedHeaders) && data.selectedHeaders?.length > 0;

      let finalSelectedHeaders: string[];
      if (isEditMode && hasExistingSelection) {
        // In edit mode, validate and preserve existing selection
        const isSelectionValid = data.selectedHeaders!.every(header => actualColumns?.includes(header));
        finalSelectedHeaders = isSelectionValid ? data.selectedHeaders! : actualColumns;
      } else {
        // New mode - select all headers
        finalSelectedHeaders = actualColumns;
      }

      setSelectedHeaders(finalSelectedHeaders);

      // Auto-generate unique source name if not already set
      let autoSourceName = tableSourceName;
      if (!autoSourceName) {
        if (tableSelectionType === 'preconfigured') {
          autoSourceName = generateUniqueSourceName(selectedTable);
        } else {
          // For custom table, use just the table name (not the full path)
          autoSourceName = customTableName;
        }
        setTableSourceName(autoSourceName);
      }

      // Update parent component data
      const updatedDataFromTop10: any = {
        ...data,
        sourceName: autoSourceName,
        subSourceType: tableSelectionType === 'preconfigured' ? 'Database' : 'Custom Database',
        headers: actualColumns, // All available headers
        selectedHeaders: finalSelectedHeaders, // Preserve selection in edit mode
        dataTypes: actualColumns?.reduce((acc, col) => ({ ...acc, [col]: 'String' }), {}),
        previewData: responseData,
        filterQuery,
      };

      // Add tableId for preconfigured tables - only if tableSourceId is defined
      if (tableSelectionType === 'preconfigured') {
        updatedDataFromTop10.originalTableName = selectedTable;
        if (selectedTableId !== undefined) {
          updatedDataFromTop10.tableSourceId = selectedTableId;
          console.log('[DatabaseSourceConfig - handleGetTop10Records] ✅ Adding tableSourceId:', selectedTableId);
        } else {
          console.warn('[DatabaseSourceConfig - handleGetTop10Records] ⚠️ selectedTableId is undefined for preconfigured table:', selectedTable);
        }
      }

      // Add metadata for custom table restoration
      if (tableSelectionType === 'custom') {
        updatedDataFromTop10.customTableMetadata = {
          source: selectedSource,
          database: selectedDatabase,
          schema: selectedSchema, // Already contains ID from handleSchemaChange
          tableName: customTableName,
          tableSourceName: autoSourceName
        };
      }

      console.log('[DatabaseSourceConfig - handleGetTop10Records] Final updatedData:', {
        hasTableSourceId: 'tableSourceId' in updatedDataFromTop10,
        tableSourceId: updatedDataFromTop10.tableSourceId,
        tableSelectionType,
        selectedTableId
      });

      onChange(updatedDataFromTop10);
    } catch (error) {
      // Show error for all table types (preconfigured and custom)
      let errorMsg = 'Failed to fetch table data. Please check your table configuration.';

      // Try to extract error message from the error object
      if (error && typeof error === 'object') {
        if ((error as any)?.response?.data?.message) {
          errorMsg = (error as any)?.response?.data?.message;
        } else if ((error as any)?.message) {
          errorMsg = (error as any)?.message;
        }
      }

      setCustomTableError(errorMsg);

      // Reset state on error
      setFields([]);
      setTop10Records([]);
      setShowTop10(false);
      setSearchTerm('');
      setAllAvailableHeaders([]);
      setSelectedHeaders([]);
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
    setCustomTableError(''); // Clear error when source changes
    // Reset filter query and config when source changes
    setFilterQuery('');
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
    setCustomTableError(''); // Clear error when database changes
    // Reset filter query and config when database changes
    setFilterQuery('');
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
    setCustomTableError(''); // Clear error when schema changes
    // Reset filter query and config when schema changes
    setFilterQuery('');
  };

  const handleCustomTableNameChange = (tableName: string) => {
    setCustomTableName(tableName);
    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);
    setCustomTableError(''); // Clear error when user modifies table name

    // Clear fields and headers when table name changes
    // Fields will only be set after Get Sample Recods is called
    setFields([]);
    setAllAvailableHeaders([]);
    setSelectedHeaders([]);

    // Reset filter query and config when custom table name changes
    setFilterQuery('');

    // Don't spread old data to avoid keeping stale fields
    onChange({
      sourceType: 'Database',
      sourceName: tableName?.trim() ? (tableSourceName || tableName) : '',
      subSourceType: 'Custom Database',
      headers: [],
      selectedHeaders: [],
      dataTypes: {},
      previewData: [],
      filterQuery: '', // Reset filter when table changes
      filterJson: null, // Reset filter config
      database: selectedDatabase,
      schema: selectedSchema,
      table: tableName,
      originalTableName: undefined,
      tableSourceId: undefined,
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
    setAllAvailableHeaders([]);
    setSelectedHeaders([]);
    setTop10Records([]);
    setShowTop10(false);
    setIsLoadingRecords(false);
    setCustomTableError(''); // Clear error when table selection type changes
    // Reset filter query and config when table selection type changes
    setFilterQuery('');

    // Clear data - explicitly clear ALL fields, don't spread old data
    onChange({
      sourceType: 'Database',
      sourceName: '',
      subSourceType: type === 'preconfigured' ? 'Database' : 'Custom Database',
      headers: [],
      selectedHeaders: [],
      dataTypes: {},
      previewData: [],
      filterQuery: '',
      filterJson: null,
      database: undefined,
      schema: undefined,
      table: undefined,
      originalTableName: undefined,
      tableSourceId: undefined,
      customTableMetadata: undefined,
    });
  };

  // Get all dictionary data from API (not filtered by table)
  const getAllDictionaryData = () => {
    if (!apiSources?.dbSource?.dataDictionary) {
      return [];
    }

    // Dictionary data structure from API:
    // { "TABLE_NAME": [ { field_name, description, field_values[], data_type } ] }
    const dictionaryData = apiSources.dbSource.dataDictionary;

    // Flatten all dictionary entries from all tables into a single array
    const allEntries: Array<{ tableName: string; field: any }> = [];

    Object.keys(dictionaryData).forEach((tableName) => {
      const tableFields = dictionaryData[tableName];
      if (Array.isArray(tableFields)) {
        tableFields?.forEach((field) => {
          allEntries?.push({
            tableName,
            field,
          });
        });
      }
    });

    return allEntries;
  };

  const handleOpenDictionary = () => {
    setDictionaryDialogOpen(true);
  };

  const handleCloseDictionary = () => {
    setDictionaryDialogOpen(false);
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
                    table.name?.toLowerCase().includes(tableSearch?.toLowerCase()) ||
                    table.description?.toLowerCase().includes(tableSearch?.toLowerCase())
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
                {isLoadingRecords ? 'Loading...' : 'Get Sample Recods'}
              </Button>
              <Tooltip title="View Table Dictionary" arrow>
                <span>
                  <IconButton
                    size="small"
                    disabled={!apiSources?.dbSource?.dataDictionary}
                    onClick={handleOpenDictionary}
                    sx={{
                      color: apiSources?.dbSource?.dataDictionary ? 'primary.main' : 'action.disabled',
                      border: '1px solid',
                      borderColor: apiSources?.dbSource?.dataDictionary ? 'primary.main' : 'action.disabled',
                      borderRadius: '4px',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        borderColor: 'primary.dark',
                      },
                    }}
                  >
                    <MenuBook fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          {/* Top 10 Records Preview - Inline */}
          {showTop10 && top10Records?.length > 0 && (
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
                        if (!searchTerm?.trim()) return true;
                        const searchLower = searchTerm?.toLowerCase();
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

          {/* Header Selection - Only show after Get Sample Recods is fetched or in edit mode */}
          {allAvailableHeaders?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Select Headers
                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.8rem', ml: 1 }}>
                    ({selectedHeaders?.length} of {allAvailableHeaders?.length} selected)
                  </Typography>
                </Typography>
              </Box>
              <Autocomplete
                multiple
                options={['__SELECT_ALL__', ...allAvailableHeaders]}
                value={selectedHeaders}
                onChange={(event, newValue) => {
                  // Check if "Select All" was clicked
                  if (newValue?.includes('__SELECT_ALL__')) {
                    // Toggle: if all are selected, deselect all; otherwise select all
                    if (selectedHeaders?.length === allAvailableHeaders?.length) {
                      handleHeaderSelectionChange([]);
                    } else {
                      handleHeaderSelectionChange(allAvailableHeaders);
                    }
                  } else {
                    handleHeaderSelectionChange(newValue);
                  }
                }}
                disableCloseOnSelect
                getOptionLabel={(option) => option === '__SELECT_ALL__' ? 'Select All' : option}
                renderOption={(props, option, { selected }) => {
                  if (option === '__SELECT_ALL__') {
                    const allSelected = selectedHeaders?.length === allAvailableHeaders?.length;
                    const someSelected = selectedHeaders?.length > 0 && selectedHeaders?.length < allAvailableHeaders?.length;
                    return (
                      <li {...props} style={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                        <Checkbox
                          icon={<CheckBoxOutlineBlank fontSize="small" />}
                          checkedIcon={<CheckBox fontSize="small" />}
                          indeterminateIcon={<CheckBox fontSize="small" />}
                          style={{ marginRight: 8 }}
                          checked={allSelected}
                          indeterminate={someSelected}
                        />
                        Select All
                      </li>
                    );
                  }
                  return (
                    <li {...props}>
                      <Checkbox
                        icon={<CheckBoxOutlineBlank fontSize="small" />}
                        checkedIcon={<CheckBox fontSize="small" />}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {option}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={selectedHeaders?.length === 0 ? "Select headers..." : ""}
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value?.slice(0, 3).map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '& .MuiChip-deleteIcon': {
                          color: 'rgba(255, 255, 255, 0.7)',
                          '&:hover': {
                            color: 'white',
                          },
                        },
                      }}
                    />
                  )).concat(
                    value?.length > 3
                      ? [
                          <Chip
                            key="more"
                            label={`+${value?.length - 3} more`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.75rem',
                              backgroundColor: 'text.secondary',
                              color: 'white',
                            }}
                          />
                        ]
                      : []
                  )
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
              {selectedHeaders?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                    Selected headers will be included in the data source. Unselected headers will be excluded from processing.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Filters Module for Preconfigured Table - Only show after Get Sample Recods is fetched or in edit mode */}
          {fields?.length > 0 && selectedHeaders?.length > 0 && (
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
                    filterJson: config,
                  });
                }}
                initialConfig={data.filterJson}
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

          {/* Table Source Name - Only shown after Get Sample Recods is clicked, appears after Filters */}
          {allAvailableHeaders?.length > 0 && (
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
                error={!!sourceNameError}
                helperText={sourceNameError || 'Provide a unique name to identify this source within the request'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
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
              {SNOWFLAKE_SOURCES?.map((source) => (
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
                  ?.filter((db) => db?.toLowerCase().includes(databaseSearch?.toLowerCase()))
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
                  error={!!customTableError}
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
                  {isLoadingRecords ? 'Loading...' : 'Get Sample Recods'}
                </Button>
              </Box>

              {/* Inline Error Message */}
              {customTableError && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'error.main',
                    mt: 0.5,
                    display: 'block',
                    fontSize: '0.75rem'
                  }}
                >
                  {customTableError}
                </Typography>
              )}
            </Box>
          )}


          {/* Header Selection for Custom Table */}
          {allAvailableHeaders?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Select Headers
                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.8rem', ml: 1 }}>
                    ({selectedHeaders?.length} of {allAvailableHeaders?.length} selected)
                  </Typography>
                </Typography>
              </Box>
              <Autocomplete
                multiple
                options={['__SELECT_ALL__', ...allAvailableHeaders]}
                value={selectedHeaders}
                onChange={(event, newValue) => {
                  // Check if "Select All" was clicked
                  if (newValue?.includes('__SELECT_ALL__')) {
                    // Toggle: if all are selected, deselect all; otherwise select all
                    if (selectedHeaders?.length === allAvailableHeaders?.length) {
                      handleHeaderSelectionChange([]);
                    } else {
                      handleHeaderSelectionChange(allAvailableHeaders);
                    }
                  } else {
                    handleHeaderSelectionChange(newValue);
                  }
                }}
                disableCloseOnSelect
                getOptionLabel={(option) => option === '__SELECT_ALL__' ? 'Select All' : option}
                renderOption={(props, option, { selected }) => {
                  if (option === '__SELECT_ALL__') {
                    const allSelected = selectedHeaders?.length === allAvailableHeaders?.length;
                    const someSelected = selectedHeaders?.length > 0 && selectedHeaders?.length < allAvailableHeaders?.length;
                    return (
                      <li {...props} style={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                        <Checkbox
                          icon={<CheckBoxOutlineBlank fontSize="small" />}
                          checkedIcon={<CheckBox fontSize="small" />}
                          indeterminateIcon={<CheckBox fontSize="small" />}
                          style={{ marginRight: 8 }}
                          checked={allSelected}
                          indeterminate={someSelected}
                        />
                        Select All
                      </li>
                    );
                  }
                  return (
                    <li {...props}>
                      <Checkbox
                        icon={<CheckBoxOutlineBlank fontSize="small" />}
                        checkedIcon={<CheckBox fontSize="small" />}
                        style={{ marginRight: 8 }}
                        checked={selected}
                      />
                      {option}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={(selectedHeaders?.length > 0 ? selectedHeaders : (data.headers || [])).length === 0 ? "Select headers..." : ""}
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value?.slice(0, 3).map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '& .MuiChip-deleteIcon': {
                          color: 'rgba(255, 255, 255, 0.7)',
                          '&:hover': {
                            color: 'white',
                          },
                        },
                      }}
                    />
                  )).concat(
                    value?.length > 3
                      ? [
                          <Chip
                            key="more"
                            label={`+${value?.length - 3} more`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.75rem',
                              backgroundColor: 'text.secondary',
                              color: 'white',
                            }}
                          />
                        ]
                      : []
                  )
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
              {(selectedHeaders?.length > 0 ? selectedHeaders : (data.headers || [])).length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                    Selected headers will be included in the data source. Unselected headers will be excluded from processing.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Top 10 Records Preview - Inline for Custom Table */}
          {showTop10 && top10Records?.length > 0 && (
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
                        if (!searchTerm?.trim()) return true;
                        const searchLower = searchTerm?.toLowerCase();
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
          {fields?.length > 0 && selectedHeaders?.length > 0 && (
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
                    filterJson: config,
                  });
                }}
                initialConfig={data.filterJson}
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
          {customTableName && fields?.length > 0 && (
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
                error={!!sourceNameError}
                helperText={sourceNameError || `Provide a unique name to identify this source within the request (Auto-generated from table name: ${customTableName})`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Table Dictionary Dialog */}
      <Dialog
        open={dictionaryDialogOpen}
        onClose={handleCloseDictionary}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D3748' }}>
              Data Dictionary
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              All available table fields and metadata
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseDictionary}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, pb: 2 }}>
          {getAllDictionaryData().length > 0 ? (
            <TableContainer
              component={Paper}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                boxShadow: 'none',
                maxHeight: 600,
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        backgroundColor: '#F8FAFB',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: '#2D3748',
                        py: 1.5,
                      }}
                    >
                      Table Name
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#F8FAFB',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: '#2D3748',
                        py: 1.5,
                      }}
                    >
                      Field Name
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#F8FAFB',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: '#2D3748',
                        py: 1.5,
                      }}
                    >
                      Description
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#F8FAFB',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: '#2D3748',
                        py: 1.5,
                      }}
                    >
                      Sample Values
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#F8FAFB',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: '#2D3748',
                        py: 1.5,
                      }}
                    >
                      Data Type
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getAllDictionaryData().map((entry: any, index: number) => {
                    const { tableName, field } = entry;

                    // Handle both field_name and fieldName (for backward compatibility)
                    const fieldName = field.field_name || field.fieldName || '--';
                    const description = field.description || '--';

                    // Handle field_values (array) or availableValues (string)
                    let sampleValues = '--';
                    if (field.field_values && Array.isArray(field.field_values)) {
                      // Take first 3 unique values
                      const uniqueValues = [...new Set(field.field_values)].slice(0, 3);
                      sampleValues = uniqueValues?.join(', ');
                      if (field.field_values?.length > 3) {
                        sampleValues += ', ...';
                      }
                    } else if (field.availableValues) {
                      sampleValues = field.availableValues;
                    }

                    const dataType = field.data_type || field.dataType || '--';

                    return (
                      <TableRow key={index} hover>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#2D3748' }}>
                            {tableName}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#2D3748' }}>
                            {fieldName}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                            {description}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.8rem',
                              color: 'text.secondary',
                              fontFamily: 'monospace',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={sampleValues}
                          >
                            {sampleValues}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Chip
                            label={dataType}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#E6F2FF',
                              color: '#0066CC',
                              border: '1px solid #B3D9FF',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box
              sx={{
                py: 6,
                textAlign: 'center',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: '#F8FAFB',
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No dictionary data available.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={handleCloseDictionary}
            variant="contained"
            sx={{
              textTransform: 'none',
              borderRadius: 1,
              px: 3,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default DatabaseSourceConfig;
