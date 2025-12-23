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

interface SourceConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (source: InputSource, shouldClose: boolean) => void;
  initialSource: InputSource | null;
}

const SourceConfigDialog: React.FC<SourceConfigDialogProps> = ({
  open,
  onClose,
  onSave,
  initialSource,
}) => {
  const [sourceType, setSourceType] = useState<'File' | 'Database' | 'Self'>('File');
  const [sourceData, setSourceData] = useState<Partial<InputSource>>({});

  useEffect(() => {
    if (initialSource) {
      setSourceType(initialSource.sourceType);
      setSourceData(initialSource);
    } else {
      setSourceType('File');
      setSourceData({});
    }
  }, [initialSource, open]);

  const handleSave = (shouldClose: boolean = true) => {
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
      headers: sourceData.headers,
      dataTypes: sourceData.dataTypes,
      previewData: sourceData.previewData,
    };
    onSave(source, shouldClose);

    // If not closing, reset the form for a new entry
    if (!shouldClose) {
      setSourceData({});
      setSourceType('File');
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
            onChange={setSourceData}
          />
        ) : (
          <DatabaseSourceConfig
            data={sourceData}
            onChange={setSourceData}
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
