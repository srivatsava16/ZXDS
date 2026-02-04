import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Alert,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import FileSourceConfig from '../InputModule/FileSourceConfig';
import DatabaseSourceConfig from '../InputModule/DatabaseSourceConfig';
import { type RequestInputsResponse } from '../../services/api';
import { validateUniqueSourceName } from '../../utils/sourceValidation';

interface SuppressSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (source: InputSource) => void;
  existingSources?: InputSource[];
  allExistingSources?: InputSource[]; // All sources from all modules for validation
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  editingSource?: InputSource | null;
  tableDictionary?: any; // Table dictionary data from dictionary.php API
}

const SuppressSourceDialog: React.FC<SuppressSourceDialogProps> = ({
  open,
  onClose,
  onSave,
  existingSources = [],
  allExistingSources = [],
  apiSources = null,
  sourcesLoading = false,
  editingSource = null,
  tableDictionary = null,
}) => {
  const [sourceType, setSourceType] = useState<'File' | 'Database'>('File');
  const [sourceData, setSourceData] = useState<Partial<InputSource>>({});
  const [sourceNameError, setSourceNameError] = useState('');
  const [validationError, setValidationError] = useState('');

  // Load editing source data when in edit mode
  useEffect(() => {
    if (editingSource && open) {
      // Only set source type if it's one of the supported dialog types
      if (editingSource.sourceType === 'File' || editingSource.sourceType === 'Database' || editingSource.sourceType === 'Self') {
        setSourceType((editingSource.sourceType === 'Self' ? 'File' : editingSource.sourceType) as 'File' | 'Database');
      }
      setSourceData(editingSource);
      setSourceNameError('');
    } else if (open) {
      // Reset for new source
      setSourceType('File');
      setSourceData({});
      setSourceNameError('');
    }
  }, [editingSource, open]);

  // Validation function for source name (uses centralized validation)
  const validateSourceName = (name: string): string => {
    const sourcesToCheck = allExistingSources?.length > 0 ? allExistingSources : existingSources;

    return validateUniqueSourceName({
      sourceName: name,
      allExistingSources: sourcesToCheck,
      editingSourceId: editingSource?.id,
      moduleName: 'Suppress',
      apiSources: apiSources
    });
  };

  // Reset dependent data when source type changes
  const handleSourceTypeChange = (newSourceType: 'File' | 'Database') => {
    // Only reset if actually changing (not initializing)
    if (newSourceType !== sourceType && Object.keys(sourceData).length > 0) {
      // Clear all dependent data when source type changes
      setSourceData({});
      setSourceNameError('');
      setValidationError('');
    }
    setSourceType(newSourceType);
  };

  const handleSave = () => {
    // Clear previous validation errors
    setValidationError('');

    // Validate source name
    const nameError = validateSourceName(sourceData.sourceName || '');
    setSourceNameError(nameError);

    if (nameError) {
      return;
    }

    // Validation: For File type sources, headers must be extracted
    if (sourceType === 'File') {
      if (!sourceData.headers || sourceData.headers?.length === 0) {
        setValidationError('Please fetch top 10 records to extract headers before adding this suppress source.');
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
      id: editingSource?.id || Date.now().toString(),
      sourceType,
      sourceName: sourceData.sourceName || '',
      subSourceType: sourceData.subSourceType || '',
      fileSource: sourceData.fileSource,
      fileSourceId: sourceData.fileSourceId,
      filePath: sourceData.filePath,
      fileName: sourceData.fileName,
      delimiter: sourceData.delimiter,
      hasHeader: sourceData.hasHeader,
      headers: sourceData.selectedHeaders || sourceData.headers || [],
      selectedHeaders: sourceData.selectedHeaders || sourceData.headers || [],
      dataTypes: sourceData.dataTypes,
      previewData: sourceData.previewData,
      filterQuery: sourceData.filterQuery,
      filterJson: sourceData.filterJson,
      // Database specific fields
      database: sourceData.database,
      schema: sourceData.schema,
      table: sourceData.table,
      originalTableName: sourceData.originalTableName,
      tableSourceId: sourceData.tableSourceId, // Store tableId for sourceOption in payload
      customTableMetadata: sourceData.customTableMetadata
    };

    onSave(source);
    onClose();
    setSourceData({});
    setSourceNameError('');
  };

  const handleClose = () => {
    onClose();
    setSourceData({});
    setSourceType('File');
    setSourceNameError('');
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#F87171' }}>
          {editingSource ? 'Edit Custom Suppress Source' : 'Add Custom Suppress Source'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
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
          <FormControl component="fieldset">
            <FormLabel
              component="legend"
              sx={{ fontWeight: 600, color: 'text.primary', mb: 1, fontSize: '0.9rem' }}
            >
              Source Type
            </FormLabel>
            <RadioGroup
              row
              value={sourceType}
              onChange={(e) => handleSourceTypeChange(e.target.value as 'File' | 'Database')}
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
          />
        ) : (
          <DatabaseSourceConfig
            data={sourceData}
            onChange={setSourceData}
            apiSources={apiSources}
            sourcesLoading={sourcesLoading}
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
          onClick={handleClose}
          sx={{ px: 2, textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          sx={{
            px: 2,
            textTransform: 'none',
            backgroundColor: '#F87171',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#EF4444',
            },
          }}
        >
          Add Source
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuppressSourceDialog;
