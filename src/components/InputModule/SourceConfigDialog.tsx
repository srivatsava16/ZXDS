import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { InputSource } from './InputModule';
import FileSourceConfig from './FileSourceConfig';
import DatabaseSourceConfig from './DatabaseSourceConfig';
import { type RequestInputsResponse } from '../../services/api';

interface SourceConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (source: InputSource, shouldClose: boolean) => void;
  initialSource: InputSource | null;
  existingSources?: InputSource[];
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
}

const SourceConfigDialog: React.FC<SourceConfigDialogProps> = ({
  open,
  onClose,
  onSave,
  initialSource,
  existingSources = [],
  apiSources = null,
  sourcesLoading = false,
}) => {
  const [sourceType, setSourceType] = useState<'File' | 'Database' | 'Self'>('File');
  const [sourceData, setSourceData] = useState<Partial<InputSource>>({});
  const [sourceNameError, setSourceNameError] = useState('');

  useEffect(() => {
    if (initialSource) {
      // Only set source type if it's one of the supported dialog types
      if (initialSource.sourceType === 'File' || initialSource.sourceType === 'Database') {
        setSourceType(initialSource.sourceType);
      }
      setSourceData(initialSource);
      setSourceNameError('');
    } else {
      setSourceType('File');
      setSourceData({});
      setSourceNameError('');
    }
  }, [initialSource, open]);

  // Reset sourceData when sourceType changes (only when not in edit mode)
  useEffect(() => {
    // Don't reset if we're in edit mode (initialSource exists) or during initial load
    if (!initialSource && sourceData && Object.keys(sourceData).length > 0) {
      setSourceData({ sourceName: sourceData.sourceName }); // Keep only the source name
      setSourceNameError('');
    }
  }, [sourceType, initialSource]);

  // Validation function for source name
  const validateSourceName = (name: string): string => {
    if (!name.trim()) {
      return 'Source Name is required';
    }
    
    // Check for duplicates (case-insensitive)
    const existingNames = existingSources
      .filter(source => source.id !== initialSource?.id) // Exclude current source when editing
      .map(source => source.sourceName.trim().toLowerCase());
    
    if (existingNames.includes(name.trim().toLowerCase())) {
      return 'Source Name must be unique';
    }
    
    return '';
  };

  const handleSave = (shouldClose: boolean = true) => {
    // Validate source name
    const nameError = validateSourceName(sourceData.sourceName || '');
    setSourceNameError(nameError);
    
    if (nameError) {
      return;
    }

    // Validation: For File type sources, headers must be extracted
    if (sourceType === 'File') {
      if (!sourceData.headers || sourceData.headers.length === 0) {
        alert('Please fetch top 10 records to extract headers before adding this input source.');
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
      headers: sourceData.selectedHeaders || sourceData.headers || [], // Use selected headers as primary headers for output
      selectedHeaders: sourceData.selectedHeaders || sourceData.headers || [], // User's selected subset
      dataTypes: sourceData.dataTypes,
      previewData: sourceData.previewData,
      fileSource: sourceData.fileSource,
      fileSourceId: sourceData.fileSourceId,
      filterQuery: sourceData.filterQuery,
      filterConfig: sourceData.filterConfig,
      database: sourceData.database,
      schema: sourceData.schema,
      table: sourceData.table,
      customTableMetadata: sourceData.customTableMetadata,
      originalTableName: sourceData.originalTableName // Save original table name for restoration
    };

    onSave(source, shouldClose);

    // If not closing, reset the form for a new entry
    if (!shouldClose) {
      setSourceData({});
      setSourceType('File');
      setSourceNameError('');
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
          />
        ) : (
          <DatabaseSourceConfig
            data={sourceData}
            onChange={setSourceData}
            apiSources={apiSources}
            sourcesLoading={sourcesLoading}
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
