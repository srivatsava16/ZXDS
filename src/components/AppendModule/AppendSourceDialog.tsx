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
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import FileSourceConfig from '../InputModule/FileSourceConfig';
import DatabaseSourceConfig from '../InputModule/DatabaseSourceConfig';
import SelfSourceConfig from './SelfSourceConfig';
import { type RequestInputsResponse } from '../../services/api';
import { validateUniqueSourceName } from '../../utils/sourceValidation';

interface AppendSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (source: InputSource) => void;
  availableInputSources?: InputSource[];
  allExistingSources?: InputSource[]; // All sources from all modules for validation
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  editingSource?: InputSource | null;
}

const AppendSourceDialog: React.FC<AppendSourceDialogProps> = ({
  open,
  onClose,
  onSave,
  availableInputSources = [],
  allExistingSources = [],
  apiSources = null,
  sourcesLoading = false,
  editingSource = null,
}) => {
  const [sourceType, setSourceType] = useState<'File' | 'Database' | 'Self'>('File');
  const [sourceData, setSourceData] = useState<Partial<InputSource>>({});
  const [sourceNameError, setSourceNameError] = useState('');

  // Load editing source data when in edit mode
  useEffect(() => {
    if (editingSource && open) {
      // Only set source type if it's one of the supported dialog types
      if (editingSource.sourceType === 'File' || editingSource.sourceType === 'Database' || editingSource.sourceType === 'Self') {
        setSourceType(editingSource.sourceType);
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
    const sourcesToCheck = allExistingSources.length > 0 ? allExistingSources : availableInputSources;

    return validateUniqueSourceName({
      sourceName: name,
      allExistingSources: sourcesToCheck,
      editingSourceId: editingSource?.id,
      moduleName: 'Append'
    });
  };

  const handleSave = () => {
    // Validate source name
    const nameError = validateSourceName(sourceData.sourceName || '');
    setSourceNameError(nameError);

    if (nameError) {
      return;
    }

    // Validation: For File type sources, headers must be extracted
    if (sourceType === 'File') {
      if (!sourceData.headers || sourceData.headers.length === 0) {
        alert('Please fetch top 10 records to extract headers before adding this append source.');
        return;
      }
    }

    // Validation: For Database type sources, ensure basic configuration
    if (sourceType === 'Database') {
      if (!sourceData.sourceName) {
        alert('Please complete the database source configuration.');
        return;
      }
    }

    // Validation: For Self type sources, ensure required fields
    if (sourceType === 'Self') {
      if (!sourceData.sourceName) {
        alert('Please provide a source name.');
        return;
      }
      if (!sourceData.selfConfig?.input_source_names || sourceData.selfConfig.input_source_names.length === 0) {
        alert('Please select at least one input source.');
        return;
      }
      if (!sourceData.selfConfig?.generated_column) {
        alert('Please provide a generated column name.');
        return;
      }
      if (!sourceData.selfConfig?.assignment_sets || sourceData.selfConfig.assignment_sets.length === 0) {
        alert('Please add at least one assignment condition.');
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
      headers: sourceData.headers || [], // Always keep ALL available columns
      selectedHeaders: sourceData.selectedHeaders || sourceData.headers || [], // Selected subset
      dataTypes: sourceData.dataTypes,
      previewData: sourceData.previewData,
      filterQuery: sourceData.filterQuery,
      filterConfig: sourceData.filterConfig,
      // Database specific fields
      database: sourceData.database,
      schema: sourceData.schema,
      table: sourceData.table,
      originalTableName: sourceData.originalTableName,
      customTableMetadata: sourceData.customTableMetadata,
      // Self source specific fields
      selfConfig: sourceData.selfConfig,
      isSelfSource: sourceData.isSelfSource
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
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.25rem', color: 'primary.main' }}>
          {editingSource ? 'Edit Custom Append Source' : 'Add Custom Append Source'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2, px: 2.5 }}>
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
              onChange={(e) => setSourceType(e.target.value as 'File' | 'Database' | 'Self')}
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
                sx={{ mr: 3 }}
              />
              <FormControlLabel
                value="Self"
                control={<Radio size="small" />}
                label="Self"
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
        ) : sourceType === 'Database' ? (
          <DatabaseSourceConfig
            data={sourceData}
            onChange={setSourceData}
            apiSources={apiSources}
            sourcesLoading={sourcesLoading}
          />
        ) : (
          <SelfSourceConfig
            data={sourceData}
            onChange={(data) => {
              setSourceData(data);
              // Clear source name error when user starts typing
              if (sourceNameError && data.sourceName) {
                const error = validateSourceName(data.sourceName);
                setSourceNameError(error);
              }
            }}
            availableInputSources={availableInputSources}
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
          color="success"
          onClick={handleSave}
          sx={{ px: 2, textTransform: 'none', color: '#fff' }}
        >
          Add Source
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppendSourceDialog;
