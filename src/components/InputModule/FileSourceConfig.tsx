import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Select,
  MenuItem,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Collapse,
  Chip,
} from '@mui/material';
import { Close, Search, ExpandMore, ExpandLess, Edit } from '@mui/icons-material';
import type { InputSource } from './InputModule';
import FilterBuilder from './FilterBuilder';
import HeaderSelector from '../shared/HeaderSelector';
import {  type RequestInputsResponse, type Top10RecordsRequest, type Top10RecordsResponse, getTop10Records } from '../../services/api';

interface FileSourceConfigProps {
  data: Partial<InputSource>;
  onChange: (data: Partial<InputSource>) => void;
  sourceNameError?: string;
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
}

// Default fallback sources if API fails
const DEFAULT_SOURCES = {
  sftpSources: [{id: 1, name: 'BO3 SFTP'}, {id: 2, name: 'ZXDS SFTP'}, {id: 3, name: 'DC SFTP'}],
  awsSources: [{id: 4, name: 'ZXDS AWS'}, {id: 5, name: 'DC AWS'}],
  nfsSources: [{id: 6, name: 'NFS Server 1'}, {id: 7, name: 'NFS Server 2'}, {id: 8, name: 'NFS Server 3'}]
};
const DELIMITERS = [
  { label: 'Comma (,)', value: ',' },
  { label: 'Pipe (|)', value: '|' },
  { label: 'Semicolon (;)', value: ';' },
  { label: 'Custom', value: 'custom' },
];

const FileSourceConfig: React.FC<FileSourceConfigProps> = ({ 
  data, 
  onChange, 
  sourceNameError, 
  apiSources = null,
  sourcesLoading = false 
}) => {
  
  const [fileSource, setFileSource] = useState<string>(data.subSourceType || 'SFTP');
  // Initialize selectedSource - will be properly set in useEffect when data/apiSources are available
  const [selectedSource, setSelectedSource] = useState<string>('');

  // Track if we've properly initialized the selectedSource from props
  const [isSourceInitialized, setIsSourceInitialized] = useState<boolean>(false);
  // Initialize filePath and fileName with fallback to each other
  const [filePath, setFilePath] = useState<string>(data.filePath || data.fileName || '');
  const [fileName, setFileName] = useState<string>(data.fileName || data.filePath || '');
  const [delimiter, setDelimiter] = useState<string>(data.delimiter || ',');
  const [hasHeader, setHasHeader] = useState<boolean>(data.hasHeader ?? true);
  const [previewData, setPreviewData] = useState<any[]>(data.previewData || []);
  const [headers, setHeaders] = useState<string[]>(data.headers || []);
  const [allAvailableHeaders, setAllAvailableHeaders] = useState<string[]>(data.headers || []);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(data.headers || []);
  const [headersFetched, setHeadersFetched] = useState<boolean>(false); // Track if we've fetched headers from data source
  const [dataTypes, setDataTypes] = useState<Record<string, string>>(data.dataTypes || {});
  const [filterQuery, setFilterQuery] = useState<string>(data.filterQuery || '');
  const [filterConfig, setFilterConfig] = useState<any>(data.filterConfig || null);
  const [customHeader, setCustomHeader] = useState<string>('');
  const [customDelimiter, setCustomDelimiter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedColumn, setSelectedColumn] = useState<string>('all');
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(true);
  
  // Custom Headers Modal State
  const [customHeadersModalOpen, setCustomHeadersModalOpen] = useState<boolean>(false);
  const [customHeadersInput, setCustomHeadersInput] = useState<string>(data.customHeaders || '');
  
  const prevDataLengthRef = useRef(Object.keys(data).length);

  // Initialize edit mode data - ensure custom headers are properly set
  useEffect(() => {
    if (data.customHeaders) {
      setCustomHeadersInput(data.customHeaders);
    }
    if (data.hasHeader !== undefined) {
      setHasHeader(data.hasHeader);
    }
  }, [data.customHeaders, data.hasHeader]);

  // Use API sources or fallback to defaults
  const currentSources = apiSources?.fileSource || DEFAULT_SOURCES;

  // Helper function to get source ID by name (if needed for API calls)
  const getSourceId = (sourceName: string): number | undefined => {
    const allSources = [
      ...currentSources.sftpSources,
      ...currentSources.awsSources,
      ...currentSources.nfsSources
    ];
    const source = allSources.find(s => (s?.name || s) === sourceName);
    return source?.id;
  };

  // Helper function to get source name by ID (for edit mode restoration)
  const getSourceName = (sourceId: number): string => {
    const allSources = [
      ...currentSources.sftpSources,
      ...currentSources.awsSources,
      ...currentSources.nfsSources
    ];
    const source = allSources.find(s => s?.id === sourceId);
    return source?.name || '';
  };

  // Reset form when data prop is cleared (for Add & Continue functionality)
  // Only reset when data transitions from non-empty to empty
  useEffect(() => {
    const currentDataLength = Object.keys(data).length;
    const wasNonEmpty = prevDataLengthRef.current > 0;
    const isNowEmpty = currentDataLength === 0;

    // Only reset when transitioning from non-empty to empty (Add & Continue scenario)
    if (wasNonEmpty && isNowEmpty) {
      setFileSource('SFTP');
      setSelectedSource('');
      setFilePath('');
      setFileName('');
      setDelimiter(',');
      setHasHeader(true);
      setPreviewData([]);
      setHeaders([]);
      setAllAvailableHeaders([]);
      setSelectedHeaders([]);
      setDataTypes({});
      setFilterQuery('');
      setFilterConfig(null);
      setCustomHeader('');
      setCustomDelimiter('');
      setSelectedColumn('all');
      setIsLoadingRecords(false);
      setHeadersFetched(false); // Reset headers fetched flag
      setIsSourceInitialized(false); // Reset source initialization flag
    }

    prevDataLengthRef.current = currentDataLength;
  }, [data]);

  // Sync local state with incoming data prop changes (for edit mode)
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFileSource(data.subSourceType || 'SFTP');

      // Only initialize selectedSource once to avoid resetting user selections
      if (!isSourceInitialized) {
        // Restore selected source by ID if available, fallback to name
        if (data.fileSourceId) {
          const sourceName = getSourceName(data.fileSourceId);
          setSelectedSource(sourceName || data.fileSource || '');
        } else if (data.fileSource) {
          setSelectedSource(data.fileSource);
        } else {
          setSelectedSource('');
        }
        setIsSourceInitialized(true);
      }

      // Ensure both fileName and filePath are set, using either as fallback
      const filePathValue = data.filePath || data.fileName || '';
      const fileNameValue = data.fileName || data.filePath || ''; // Use filePath as fallback
      setFilePath(filePathValue);
      setFileName(fileNameValue);
      setDelimiter(data.delimiter || ',');
      setHasHeader(data.hasHeader ?? true);
      setPreviewData(data.previewData || []);
      // Always restore the full headers list to maintain dropdown options
      setHeaders(data.headers || []);
      // Always set allAvailableHeaders to the full headers list from data
      // This ensures all headers are visible in edit mode
      setAllAvailableHeaders(data.headers || []);

      // Restore selectedHeaders from data.selectedHeaders if available, otherwise use all headers
      if (data.selectedHeaders && data.selectedHeaders.length > 0) {
        setSelectedHeaders(data.selectedHeaders);
      } else {
        // Fallback to all headers if no specific selection is stored
        setSelectedHeaders(data.headers || []);
      }
      setDataTypes(data.dataTypes || {});
      setFilterQuery(data.filterQuery || '');
      setFilterConfig(data.filterConfig || null);
    }
  }, [data]); // Remove currentSources dependency to prevent re-sync when API sources load

  // Separate useEffect to handle restoration when API sources become available
  useEffect(() => {
    // Re-attempt restoration if apiSources became available and we have a fileSourceId but selectedSource is empty
    if (data && data.fileSourceId && !selectedSource && apiSources && isSourceInitialized) {
      const sourceName = getSourceName(data.fileSourceId);
      if (sourceName) {

        setSelectedSource(sourceName);
      } else {

        // Fallback to the fileSource name if ID lookup fails
        if (data.fileSource) {

          setSelectedSource(data.fileSource);
        }
      }
    }
  }, [apiSources]); // Only trigger when API sources load

  // Reset initialization flag when data changes (for new dialogs)
  useEffect(() => {
    if (!data || Object.keys(data).length === 0) {
      setIsSourceInitialized(false);
    }
  }, [data]);

  // Auto-fetch preview data in edit mode if not already loaded
  useEffect(() => {
    // Skip if:
    // 1. Already loading records
    // 2. Preview data already exists
    // 3. Source not initialized yet (still loading/restoring)
    if (isLoadingRecords || (previewData && previewData.length > 0) || !isSourceInitialized) {
      return;
    }

    // Check if we're in edit mode with valid data
    const isEditMode = data && data.id && Object.keys(data).length > 0;

    if (!isEditMode) {
      return;
    }

    // Check if we have the necessary fields to fetch preview
    const canFetchPreview = fileName && selectedSource;

    if (canFetchPreview) {

      // Small delay to ensure all restoration state is settled
      const timer = setTimeout(() => {
        handleGetTop10Records();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [
    isLoadingRecords,
    previewData,
    isSourceInitialized,
    data.id,
    fileName,
    selectedSource
  ]);

  const handleFileSourceChange = (value: string) => {
    setFileSource(value);
    setSelectedSource('');
    setHeadersFetched(false); // Reset headers fetched flag for new source
    setIsSourceInitialized(true); // Mark as initialized since we're making a user selection
    updateParentData({ subSourceType: value, fileSource: '', fileSourceId: undefined });
  };

  const handleGetTop10Records = async () => {
    if (!fileName || !selectedSource) {

      return;
    }

    setIsLoadingRecords(true);
    
    try {
      // Get the source ID instead of using the name
      const sourceId = getSourceId(selectedSource);
      if (!sourceId) {

        setIsLoadingRecords(false);
        return;
      }

      // Construct the API payload
      const payload: Top10RecordsRequest = {
        fileSource: fileSource,
        inputFilePath: fileName,
        sourceOption: sourceId, // Send ID as number
        sourceType: 'file'
      };

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
          alert('No data found in the file. Please check the file format.');
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

      // Validate that we have data
      if (!Array.isArray(columns) || columns.length === 0) {

        alert('No columns found in the file. Please check the file format.');
        setIsLoadingRecords(false);
        return;
      }

      if (!Array.isArray(responseData)) {

        alert('Invalid data format received. Please try again.');
        setIsLoadingRecords(false);
        return;
      }

      setPreviewData(responseData);
      setHeaders(columns);
      setAllAvailableHeaders(columns);
      setSelectedHeaders(columns); // Initially select all headers
      setHeadersFetched(true);

      // Initialize data types for all columns (default to 'String')
      const initialDataTypes: Record<string, string> = {};
      columns.forEach(header => {
        initialDataTypes[header] = 'String';
      });
      setDataTypes(initialDataTypes);

      // Auto-populate source name from filename (without extension)
      const autoSourceName = fileName.split('/').pop()?.split('\\').pop()?.replace(/\.[^/.]+$/, '') || '';

      updateParentData({
        previewData: responseData,
        headers: columns, // Save full headers initially
        selectedHeaders: columns, // Initially all headers are selected
        dataTypes: initialDataTypes,
        sourceName: autoSourceName,
      });

    } catch (error: any) {


      // Provide more specific error message
      let errorMessage = 'Failed to load data. ';
      if (error?.message) {
        errorMessage += error.message;
      } else if (error?.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += 'Please check the file name and source, then try again.';
      }

      alert(errorMessage);

      // Reset state on error
      setPreviewData([]);
      setHeaders([]);
      setAllAvailableHeaders([]);
      setSelectedHeaders([]);
      setHeadersFetched(false);
      setDataTypes({});
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleHeaderChange = (value: boolean) => {
    setHasHeader(value);
    if (!value) {
      // Open custom headers modal when "No" is selected
      setCustomHeadersModalOpen(true);
    } else {
      // Clear custom headers when "Yes" is selected and update parent
      updateParentData({ hasHeader: value, customHeaders: '' });
    }
  };

  const handleSaveCustomHeaders = () => {
    // Update parent data with custom headers
    updateParentData({
      hasHeader: false,
      customHeaders: customHeadersInput.trim()
    });
    
    setCustomHeadersModalOpen(false);
  };

  const handleCancelCustomHeaders = () => {
    // Reset to Yes when canceled
    setHasHeader(true);
    setCustomHeadersInput('');
    setCustomHeadersModalOpen(false);
    updateParentData({ hasHeader: true, customHeaders: '' });
  };

  const handleEditCustomHeaders = () => {
    // Set current custom headers in input and open modal
    const currentHeaders = data.customHeaders || customHeadersInput || '';
    setCustomHeadersInput(currentHeaders);
    setCustomHeadersModalOpen(true);
  };

  const handleHeaderSelectionChange = (newSelectedHeaders: string[]) => {
    
    setSelectedHeaders(newSelectedHeaders);
    // Don't update headers state - keep it as the original full list for data processing
    // Only selectedHeaders should track user selection for the HeaderSelector component
    
    // Update data types to only include selected headers
    const updatedDataTypes: Record<string, string> = {};
    newSelectedHeaders.forEach(header => {
      updatedDataTypes[header] = dataTypes[header] || 'String';
    });
    setDataTypes(updatedDataTypes);
    
    updateParentData({ 
      selectedHeaders: newSelectedHeaders, // Only save selection, keep headers as full list
      dataTypes: updatedDataTypes 
    });
  };

  const updateParentData = (updates: Partial<InputSource>) => {
    const finalData = {
      ...data,
      subSourceType: fileSource,
      fileSource: updates.fileSource !== undefined ? updates.fileSource : data.fileSource,
      fileSourceId: updates.fileSourceId !== undefined ? updates.fileSourceId : data.fileSourceId,
      filePath,
      fileName,
      delimiter,
      hasHeader,
      // Don't force headers to be selectedHeaders - let the caller decide
      headers: selectedHeaders || [],
      dataTypes,
      previewData,
      selectedHeaders,
      filterQuery,
      filterConfig,
      ...updates, // Apply updates last to ensure they override local state
    };
    
    
    onChange(finalData);
  };

  return (
    <Box>
      {/* File Source Selection */}
      <Box sx={{ mb: 2 }}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel sx={{ fontWeight: 600, color: 'text.primary', mb: 1, fontSize: '0.9rem' }}>
            File Source <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
          </FormLabel>
          <RadioGroup
            row
            value={fileSource}
            onChange={(e) => handleFileSourceChange(e.target.value)}
          >
            <FormControlLabel value="SFTP" control={<Radio size="small" />} label="SFTP" sx={{ mr: 2 }} />
            <FormControlLabel value="NFS" control={<Radio size="small" />} label="NFS" sx={{ mr: 2 }} />
            <FormControlLabel value="AWS S3" control={<Radio size="small" />} label="AWS S3" sx={{ mr: 2 }} />
            <FormControlLabel value="Desktop" control={<Radio size="small" />} label="Desktop" />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Preconfigured Source Dropdown for SFTP, AWS, and NFS */}
      {(fileSource === 'SFTP' || fileSource === 'AWS S3' || fileSource === 'NFS') && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
            Select Preconfigured Source
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedSource}
            onChange={(e) => {
              const sourceName = e.target.value;
              setSelectedSource(sourceName);
              const sourceId = getSourceId(sourceName);
              updateParentData({ 
                fileSource: sourceName,
                fileSourceId: sourceId
              });
            }}
            displayEmpty
            disabled={sourcesLoading}
          >
            <MenuItem value="" disabled>
              <em>Select a preconfigured source...</em>
            </MenuItem>
            {!sourcesLoading && (fileSource === 'SFTP' ? currentSources.sftpSources : 
              fileSource === 'AWS S3' ? currentSources.awsSources : 
              currentSources.nfsSources).map((source) => {
                const sourceName = typeof source === 'string' ? source : source?.name;
                const sourceKey = typeof source === 'string' ? source : source?.id;
                return (
                  <MenuItem key={sourceKey} value={sourceName}>
                    {sourceName}
                  </MenuItem>
                );
              })}
          </Select>
        </Box>
      )}

      {/* Input FilePath/Name and Get Top 10 Records */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
          {fileSource === 'Desktop' ? 'Upload File' : 'Input FilePath/Name'} <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {fileSource === 'Desktop' ? (
            <>
              <Button
                variant="outlined"
                component="label"
                size="small"
                sx={{
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  flex: '0 0 75%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {fileName || 'Choose File...'}
                <input
                  type="file"
                  hidden
                  accept=".csv,.txt,.tsv,.dat"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFileName(file.name);
                      setFilePath(file.name);
                      updateParentData({ fileName: file.name, filePath: file.name });
                    }
                  }}
                />
              </Button>
            </>
          ) : (
            <TextField
              size="small"
              placeholder="/data/input/data.csv or C:\Data\Input\data.csv"
              value={fileName}
              onChange={(e) => {
                const newValue = e.target.value;
                setFileName(newValue);
                setFilePath(newValue);
                updateParentData({ fileName: newValue, filePath: newValue });
              }}
              sx={{ flex: '0 0 75%' }}
            />
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={handleGetTop10Records}
            disabled={!fileName || !selectedSource || isLoadingRecords}
            sx={{
              textTransform: 'none',
              flex: '1',
              whiteSpace: 'nowrap'
            }}
          >
            {isLoadingRecords ? 'Loading...' : 'Get Top 10 Records'}
          </Button>
        </Box>
      </Box>

      {/* Header Selection */}
      {allAvailableHeaders.length > 0 && (
        <>
          <HeaderSelector
            availableHeaders={allAvailableHeaders}
            selectedHeaders={selectedHeaders}
            onHeadersChange={handleHeaderSelectionChange}
            disabled={false}
          />
        </>
      )}

      {/* Preview Data Table */}
      {previewData.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 2 }}>
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Column Selection Dropdown */}
              <Select
                size="small"
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                sx={{
                  minWidth: 150,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              >
                <MenuItem value="all">All Columns</MenuItem>
                {selectedHeaders.map((header) => (
                  <MenuItem key={header} value={header}>
                    {header}
                  </MenuItem>
                ))}
              </Select>
              {/* Search Box */}
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
                  width: 250,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
            </Box>
          </Box>
          <Collapse in={isPreviewExpanded}>
            <TableContainer
            component={Paper}
            sx={{
              maxHeight: 350,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflowX: 'auto', // Enable horizontal scroll
            }}
          >
            <Table stickyHeader size="small" sx={{ minWidth: (selectedColumn === 'all' ? selectedHeaders.length : 1) * 120 }}>
              <TableHead>
                <TableRow>
                  {(selectedColumn === 'all' ? selectedHeaders : [selectedColumn]).map((header) => (
                    <TableCell key={header} sx={{ backgroundColor: '#F8FAFB', fontWeight: 600, py: 1, whiteSpace: 'nowrap' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {header}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData
                  .filter((row) => {
                    // Filter rows based on search term
                    if (!searchTerm.trim()) return true;
                    const searchLower = searchTerm.toLowerCase();
                    const columnsToSearch = selectedColumn === 'all' ? selectedHeaders : [selectedColumn];
                    return columnsToSearch.some((header) =>
                      String(row[header] || '').toLowerCase().includes(searchLower)
                    );
                  })
                  .map((row, idx) => (
                    <TableRow key={idx} hover>
                      {(selectedColumn === 'all' ? selectedHeaders : [selectedColumn]).map((header) => (
                        <TableCell key={header} sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {row[header]}
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

      {/* Delimiter Selection */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
          Delimiter (Auto-detected, can be changed)
        </Typography>
        <RadioGroup
          row
          value={delimiter}
          onChange={(e) => {
            const newValue = e.target.value;
            setDelimiter(newValue);
            if (newValue !== 'custom') {
              setCustomDelimiter('');
              updateParentData({ delimiter: newValue });
            }
          }}
        >
          {DELIMITERS.map((d) => (
            <FormControlLabel
              key={d.value}
              value={d.value}
              control={<Radio size="small" />}
              label={d.label}
              sx={{ mr: 2 }}
            />
          ))}
        </RadioGroup>

        {/* Custom Delimiter Input */}
        {delimiter === 'custom' && (
          <Box sx={{ mt: 1.5 }}>
            <TextField
              size="small"
              placeholder="Enter custom delimiter (e.g., ~, ^, etc.)"
              value={customDelimiter}
              onChange={(e) => {
                const value = e.target.value;
                setCustomDelimiter(value);
                updateParentData({ delimiter: value });
              }}
              sx={{
                width: '300px',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
              helperText="Enter any single or multi-character delimiter"
            />
          </Box>
        )}
      </Box>

      {/* Header Yes/No */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
          Header
        </Typography>
        <RadioGroup
          row
          value={hasHeader ? 'yes' : 'no'}
          onChange={(e) => handleHeaderChange(e.target.value === 'yes')}
        >
          <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" sx={{ mr: 2 }} />
          <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
        </RadioGroup>
      </Box>

      {/* Custom Headers Modal */}
      <Dialog
        open={customHeadersModalOpen}
        onClose={handleCancelCustomHeaders}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Custom Header Names</Typography>
            <IconButton onClick={handleCancelCustomHeaders} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Enter custom header names separated by commas. These will be used as column headers for your data.
          </Typography>
          <TextField
            fullWidth
            label="Header Names (comma-separated)"
            placeholder="e.g., Name, Email, Phone, Address"
            value={customHeadersInput}
            onChange={(e) => setCustomHeadersInput(e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          {customHeadersInput && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Preview Headers:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {customHeadersInput
                  .split(',')
                  .map(header => header.trim())
                  .filter(header => header.length > 0)
                  .map((header, index) => (
                    <Chip key={index} label={header} size="small" />
                  ))
                }
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCustomHeaders}>Cancel</Button>
          <Button 
            onClick={handleSaveCustomHeaders} 
            variant="contained"
            disabled={!customHeadersInput.trim()}
          >
            Save Headers
          </Button>
        </DialogActions>
      </Dialog>

      {/* Show current custom headers with edit option */}
      {(!hasHeader || !data.hasHeader) && (data.customHeaders || customHeadersInput) && (
        <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Custom Headers Configured</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {data.customHeaders || customHeadersInput}
              </Typography>
            </Box>
            <Button 
              size="small" 
              onClick={handleEditCustomHeaders}
              startIcon={<Edit />}
            >
              Edit Headers
            </Button>
          </Box>
        </Box>
      )}

      {/* Filter Builder - Show only when headers are available */}
      {allAvailableHeaders.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <FilterBuilder 
            headers={allAvailableHeaders} 
            initialValue={data.filterQuery}
            initialConfig={data.filterConfig}
            onFilterChange={(query) => {
              setFilterQuery(query);
              updateParentData({ filterQuery: query });
            }}
            onConfigChange={(config) => {
              setFilterConfig(config);
              updateParentData({ filterConfig: config });
            }}
          />
        </Box>
      )}

      {/* Source Name */}
      {allAvailableHeaders.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
            Source Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter a name for this source"
            value={data.sourceName || ''}
            onChange={(e) => {
              updateParentData({ sourceName: e.target.value });
            }}
            error={!!sourceNameError}
            helperText={sourceNameError}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
              },
            }}
          />
        </Box>
      )}

    </Box>
  );
};

export default FileSourceConfig;
