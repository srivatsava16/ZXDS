import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { InputSource } from './InputModule';
import FileSourceConfig from './FileSourceConfig';
import DatabaseSourceConfig from './DatabaseSourceConfig';
import { type RequestInputsResponse } from '../../services/api';
import { validateUniqueSourceName } from '../../utils/sourceValidation';

interface SourceConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (source: InputSource, shouldClose: boolean) => void;
  initialSource: InputSource | null;
  existingSources?: InputSource[];
  allExistingSources?: InputSource[]; // All sources from all modules for validation
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  tableDictionary?: any; // Table dictionary data from dictionary.php API
}

const SourceConfigDialog: React.FC<SourceConfigDialogProps> = ({
  open,
  onClose,
  onSave,
  initialSource,
  existingSources = [],
  allExistingSources = [],
  apiSources = null,
  sourcesLoading = false,
  tableDictionary = null,
}) => {
  const [sourceType, setSourceType] = useState<'File' | 'Database' | 'Self'>('File');
  const [sourceData, setSourceData] = useState<Partial<InputSource>>({});
  const [sourceNameError, setSourceNameError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [customHeadersError, setCustomHeadersError] = useState(''); // Track custom headers validation errors

  // Track the initial sourceType from edit mode to avoid clearing on first load
  const initialSourceTypeRef = useRef<'File' | 'Database' | 'Self' | null>(null);
  const prevSourceTypeRef = useRef<'File' | 'Database' | 'Self'>('File');
  const isLoadingInitialDataRef = useRef<boolean>(false);

  useEffect(() => {
    console.log('[EDIT-SOURCE] SourceConfigDialog useEffect triggered');
    console.log('[EDIT-SOURCE] open:', open);
    console.log('[EDIT-SOURCE] initialSource:', initialSource);
    console.log('[subSourceType] apiSources available:', !!apiSources);
    console.log('[subSourceType] apiSources.fileSource available:', !!apiSources?.fileSource);

    if (initialSource) {
      console.log('[EDIT-SOURCE] Loading initialSource data');
      console.log('[EDIT-SOURCE] initialSource.fileSourceId:', (initialSource as any)?.fileSourceId);
      console.log('[EDIT-SOURCE] initialSource.dataSourceId:', (initialSource as any)?.dataSourceId);
      console.log('[EDIT-SOURCE] initialSource.subSourceType:', (initialSource as any)?.subSourceType);
      console.log('[EDIT-SOURCE] initialSource.headers:', initialSource?.headers);
      console.log('[EDIT-SOURCE] initialSource.selectedHeaders:', (initialSource as any)?.selectedHeaders);

      isLoadingInitialDataRef.current = true; // Set flag before loading

      // Check if this is API format (sourceType: "F") and transform it
      let sourceToLoad = initialSource;
      if ((initialSource as any).sourceType === 'F') {
        console.log('[EDIT-SOURCE] Transforming from API format');
        console.log('[subSourceType] About to transform, apiSources:', apiSources);
        sourceToLoad = transformFileSourceFromAPI(initialSource) as InputSource;
        console.log('[subSourceType] After transform, sourceToLoad.subSourceType:', (sourceToLoad as any)?.subSourceType);
      }

      console.log('[EDIT-SOURCE] sourceToLoad.sourceType:', sourceToLoad?.sourceType);
      console.log('[EDIT-SOURCE] sourceToLoad:', sourceToLoad);

      // Only set source type if it's one of the supported dialog types
      if (sourceToLoad.sourceType === 'File' || sourceToLoad.sourceType === 'Database') {
        setSourceType(sourceToLoad.sourceType);
        prevSourceTypeRef.current = sourceToLoad.sourceType;
        initialSourceTypeRef.current = sourceToLoad.sourceType; // Track initial type
      }
      setSourceData(sourceToLoad);
      setSourceNameError('');
      setCustomHeadersError(''); // Clear custom headers error

      // Clear flag after a short delay to ensure all state updates are processed
      setTimeout(() => {
        isLoadingInitialDataRef.current = false;
      }, 100);
    } else {
      console.log('[EDIT-SOURCE] No initialSource, resetting');
      setSourceType('File');
      setSourceData({});
      setSourceNameError('');
      setCustomHeadersError(''); // Clear custom headers error
      prevSourceTypeRef.current = 'File';
      initialSourceTypeRef.current = null;
      isLoadingInitialDataRef.current = false;
    }
  }, [initialSource, open]);

  // Reset sourceData when sourceType changes (but not during initial load)
  useEffect(() => {
    // Skip clearing if we're loading initial data
    if (isLoadingInitialDataRef.current) {
      prevSourceTypeRef.current = sourceType;
      return;
    }

    // Skip clearing if this is the initial sourceType being set from initialSource
    if (initialSourceTypeRef.current !== null && initialSourceTypeRef.current === sourceType) {
      // This is the initial load, reset the ref and don't clear
      initialSourceTypeRef.current = null;
      prevSourceTypeRef.current = sourceType;
      return;
    }

    // Only clear if sourceType actually changed (user clicked a different radio button)
    if (prevSourceTypeRef.current !== sourceType && Object.keys(sourceData).length > 0) {
      setSourceData({}); // Clear all data including source name
      setSourceNameError('');
      setCustomHeadersError(''); // Clear custom headers error
    }

    prevSourceTypeRef.current = sourceType;
  }, [sourceType]); // Only depend on sourceType, not sourceData

  // Validation function for source name (uses centralized validation)
  const validateSourceName = (name: string): string => {
    const sourcesToCheck = allExistingSources?.length > 0 ? allExistingSources : existingSources;

    return validateUniqueSourceName({
      sourceName: name,
      allExistingSources: sourcesToCheck,
      editingSourceId: initialSource?.id,
      moduleName: 'Input',
      apiSources: apiSources
    });
  };

  // Helper function to get file format from filename
  const getFileFormat = (fileName: string | undefined): string => {
    if (!fileName) return 'CSV';
    const extension = fileName?.split('.').pop()?.toUpperCase();
    return extension || 'CSV';
  };

  // Helper function to determine subSourceType from fileSourceId
  const getSubSourceTypeFromFileSourceId = (fileSourceId: number | string | undefined): string => {
    if (!fileSourceId || !apiSources?.fileSource) {
      console.log('[subSourceType] getSubSourceTypeFromFileSourceId - no fileSourceId or apiSources, returning SFTP');
      return 'SFTP'; // Default fallback
    }

    console.log('[subSourceType] getSubSourceTypeFromFileSourceId - looking up fileSourceId:', fileSourceId);
    const numericId = Number(fileSourceId);

    // Check SFTP sources
    const sftpSource = apiSources?.fileSource?.sftpSources?.find((s: any) => s?.id === numericId);
    if (sftpSource) {
      console.log('[subSourceType] Found in sftpSources, type: SFTP');
      return 'SFTP';
    }

    // Check NFS sources
    const nfsSource = apiSources?.fileSource?.nfsSources?.find((s: any) => s?.id === numericId);
    if (nfsSource) {
      console.log('[subSourceType] Found in nfsSources, type: NFS');
      return 'NFS';
    }

    // Check AWS S3 sources
    const awsSource = apiSources?.fileSource?.awsSources?.find((s: any) => s?.id === numericId);
    if (awsSource) {
      console.log('[subSourceType] Found in awsSources, type: S3');
      return 'S3';
    }

    console.log('[subSourceType] Source not found in any category, defaulting to SFTP');
    return 'SFTP';
  };

  // Helper function to transform File source from API format to UI format (for edit mode)
  const transformFileSourceFromAPI = (apiSource: any) => {
    console.log('[subSourceType] transformFileSourceFromAPI called');
    console.log('[subSourceType] apiSource:', apiSource);
    console.log('[subSourceType] apiSource.dataSourceId:', apiSource?.dataSourceId);
    console.log('[subSourceType] apiSource.subSourceType:', apiSource?.subSourceType);

    // Ensure both fileName and filePath are set, using either as fallback
    const filePathValue = apiSource.filePath || apiSource.fileName || '';
    const fileNameValue = apiSource.fileName || apiSource.filePath || '';

    // Check if this is already in UI format
    if (apiSource.sourceType === 'File' || !apiSource.sourceType || apiSource.sourceType !== 'F') {
      console.log('[subSourceType] Already in UI format, returning as-is');
      // Already in UI format, but ensure fileName/filePath are both set
      return {
        ...apiSource,
        filePath: filePathValue,
        fileName: fileNameValue
      };
    }

    // Parse selectedColumns string back to array
    const selectedColumnsFromAPI = apiSource.selectedColumns
      ? apiSource.selectedColumns?.split(',').map((col: string) => col?.trim()).filter((col: string) => col?.length > 0)
      : apiSource.columns || [];

    // Determine subSourceType: use provided value, or derive from fileSourceId
    let subSourceType = apiSource?.subSourceType;
    if (!subSourceType || subSourceType?.trim() === '') {
      console.log('[subSourceType] transformFileSourceFromAPI - subSourceType missing, deriving from dataSourceId:', apiSource?.dataSourceId);
      console.log('[subSourceType] apiSources at transform time:', apiSources);
      subSourceType = getSubSourceTypeFromFileSourceId(apiSource?.dataSourceId);
      console.log('[subSourceType] Derived subSourceType:', subSourceType);
    } else {
      console.log('[subSourceType] transformFileSourceFromAPI - using existing subSourceType:', subSourceType);
    }

    const transformedSource = {
      id: apiSource.id || Date.now().toString(),
      sourceType: 'File',
      sourceName: apiSource.sourceName,
      filePath: filePathValue,
      fileName: fileNameValue, // Ensure fileName is always populated
      delimiter: apiSource.delimiter,
      hasHeader: apiSource.isHeader === 1,
      headers: apiSource.columns || [],
      selectedHeaders: selectedColumnsFromAPI, // Use as-is (already in correct format - custom names if custom headers exist)
      previewData: [], // Cannot be restored from API format
      fileSourceId: apiSource.dataSourceId,
      filterQuery: apiSource.filters || '',
      //extras
      filterJson: apiSource?.filterJson || null, // Use as-is (field names already in correct format)
      customHeaders: apiSource?.customHeaders || '',
      subSourceType: subSourceType
    };

    console.log('[subSourceType] transformedSource.subSourceType:', transformedSource.subSourceType);
    console.log('[subSourceType] transformedSource.fileSourceId:', transformedSource.fileSourceId);

    return transformedSource;
  };

  // Helper function to transform File source to API format
  const transformFileSourceToAPI = (source: any) => {
    const headers = source.headers || [];
    const selectedHeaders = source.selectedHeaders || source.headers || [];

    // Determine columnSelectionType: "A" if all headers selected, "S" if subset
    const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

    // Determine inputType: "P" for preconfigured (has fileSourceId), "I" for manual
    const inputType = 'I' ;


    return {
      sourceName: source.sourceName,
      sourceType: 'F', // File -> "F"
      
      dataSourceId: source.fileSourceId || null,
      filePath: source.fileName || source.filePath || '', // Use fileName as filePath
      delimiter: source.delimiter || ',',
      fileFormat: getFileFormat(source.fileName),
      isHeader: source.hasHeader ? 1 : 0,
      columnSelectionType: columnSelectionType,
      columns: headers,
      selectedColumns: selectedHeaders?.join(','), // Send as-is (custom names if custom headers exist, original names otherwise)
      inputType: inputType,
      filters: source.filterQuery || '',
      //extras
      customHeaders : source.customHeaders || '',
      filterJson: source.filterJson || null, // Send as-is (field names are custom if custom headers exist)
      subSourceType: source.subSourceType
    };
  };

  const handleSave = (shouldClose: boolean = true) => {
    // Clear previous validation errors
    setValidationError('');

    // Validate source name
    const nameError = validateSourceName(sourceData.sourceName || '');
    setSourceNameError(nameError);

    if (nameError) {
      return;
    }

    // Validation: Check for custom headers errors
    if (customHeadersError) {
      setValidationError(`Custom Headers Error: ${customHeadersError}`);
      return;
    }

    // Validation: For File type sources, headers must be extracted
    if (sourceType === 'File') {
      if (!sourceData.headers || sourceData.headers?.length === 0) {
        setValidationError('Please fetch top 10 records to extract headers before adding this input source.');
        return;
      }
    }

    // Validation: For Database type sources, headers must be extracted
    if (sourceType === 'Database') {
      if (!sourceData.headers || sourceData.headers?.length === 0) {
        setValidationError('Please click "Get Sample Recods" to fetch and verify the database source before saving.');
        return;
      }
    }


    const source: InputSource = {
      id: initialSource?.id || Date.now().toString(),
      sourceType,
      sourceName: sourceData.sourceName || '',
      subSourceType: sourceData.subSourceType || '',
      filePath: sourceData.filePath,
      fileName: sourceData.fileName,
      delimiter: sourceData.delimiter,
      hasHeader: sourceData.hasHeader,
      customHeaders: sourceData.customHeaders, // Add customHeaders field
      headers: sourceData.headers || [], // Keep full list of headers to preserve dropdown options
      selectedHeaders: sourceData.selectedHeaders || sourceData.headers || [], // User's selected subset
      dataTypes: sourceData.dataTypes,
      previewData: sourceData.previewData,
      fileSource: sourceData.fileSource,
      fileSourceId: sourceData.fileSourceId,
      filterQuery: sourceData.filterQuery,
      filterJson: sourceData.filterJson,
      database: sourceData.database,
      schema: sourceData.schema,
      table: sourceData.table,
      customTableMetadata: sourceData.customTableMetadata,
      originalTableName: sourceData.originalTableName, // Save original table name for restoration
      tableSourceId: sourceData.tableSourceId // Save table ID for sourceOption in payload
    };

    console.log('[SourceConfigDialog - handleSave] Creating source object:', {
      sourceType,
      sourceName: source.sourceName,
      subSourceType: source.subSourceType,
      hasTableSourceId: 'tableSourceId' in sourceData,
      tableSourceId: sourceData.tableSourceId,
      originalTableName: sourceData.originalTableName
    });


    // DON'T transform File source to API format yet - keep it in UI format for local state
    // The transformation to API format should happen only when submitting to the actual backend
    // This ensures Stats module and other components can access headers/selectedHeaders

    // Store the API transformation function for reference, but save UI format
    if (sourceType === 'File') {
      const apiFormat = transformFileSourceToAPI(source);

      // Store the API format on the source for later use during submission
      source.apiFormat = apiFormat;
    }


    onSave(source, shouldClose); // Save UI format, not API format

    // If not closing, reset the form for a new entry
    if (!shouldClose) {
      setSourceData({});
      setSourceType('File');
      setSourceNameError('');
      setCustomHeadersError(''); // Clear custom headers error
    }
  };

  const handleAddAndContinue = () => {
    handleSave(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2.5,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {initialSource ? 'Edit Input Source' : 'Add Input Source'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2, px: 2.5 }}>
        {/* Validation Error Alert */}
        {validationError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationError('')}>
            {validationError}
          </Alert>
        )}

        {/* Source Type Selection */}
        <Box sx={{ mb: 2 }}>
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormLabel
              component="legend"
              sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem', mb: 1 }}
            >
              Source Type
            </FormLabel>
            <RadioGroup
              row
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as 'File' | 'Database')}
            >
              <FormControlLabel
                value="File"
                control={<Radio size="small" />}
                label="File"
                sx={{ mr: 3 }}
              />
              <FormControlLabel
                value="Database"
                control={<Radio size="small" />}
                label="Database"
              />
            </RadioGroup>
          </FormControl>
        </Box>

        {/* Source Configuration based on type */}
        {sourceType === 'File' ? (
          <FileSourceConfig
            data={sourceData}
            onChange={(data) => {
              setSourceData(data);
              // Clear source name error when user starts typing
              if (sourceNameError && data.sourceName) {
                const error = validateSourceName(data.sourceName);
                setSourceNameError(error);
              }
            }}
            sourceNameError={sourceNameError}
            apiSources={apiSources}
            sourcesLoading={sourcesLoading}
            onValidationError={setCustomHeadersError} // Track custom headers validation errors
          />
        ) : (
          <DatabaseSourceConfig
            data={sourceData}
            onChange={(data) => {
              setSourceData(data);
              // Clear source name error when user starts typing
              if (sourceNameError && data.sourceName) {
                const error = validateSourceName(data.sourceName);
                setSourceNameError(error);
              }
            }}
            apiSources={apiSources}
            sourcesLoading={sourcesLoading}
            sourceNameError={sourceNameError}
            allExistingSources={allExistingSources?.length > 0 ? allExistingSources : existingSources}
            tableDictionary={tableDictionary}
          />
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          sx={{ px: 2, textTransform: 'none' }}
        >
          Close
        </Button>
        {!initialSource && (
          <Button
            variant="contained"
            size="small"
            onClick={handleAddAndContinue}
            sx={{ px: 2, textTransform: 'none' }}
          >
            Add & Continue
          </Button>
        )}
        <Button
          variant="contained"
          size="small"
          color="success"
          onClick={() => handleSave()}
          sx={{ px: 2, textTransform: 'none', color: '#fff' }}
        >
          {initialSource ? 'Update' : 'Add & Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SourceConfigDialog;
