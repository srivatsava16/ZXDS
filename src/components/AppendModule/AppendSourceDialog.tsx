import { useState } from 'react';
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
  Paper,
  Alert,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import SimpleFileSourceConfig from './SimpleFileSourceConfig';
import DatabaseSourceConfig from '../InputModule/DatabaseSourceConfig';
import SelfSourceConfig from './SelfSourceConfig';

interface AppendSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (source: InputSource) => void;
  availableInputSources?: InputSource[];
}

const AppendSourceDialog: React.FC<AppendSourceDialogProps> = ({
  open,
  onClose,
  onSave,
  availableInputSources = [],
}) => {
  const [sourceType, setSourceType] = useState<'File' | 'Database' | 'Self'>('File');
  const [sourceData, setSourceData] = useState<Partial<InputSource>>({});

  const handleSave = () => {
    if (!sourceData.sourceName || !sourceData.headers || sourceData.headers.length === 0) {
      alert('Please complete the source configuration');
      return;
    }

    const source: InputSource = {
      id: Date.now().toString(),
      sourceType,
      sourceName: sourceData.sourceName || '',
      subSourceType: sourceData.subSourceType || '',
      fileSource: sourceData.fileSource,
      filePath: sourceData.filePath,
      fileName: sourceData.fileName,
      delimiter: sourceData.delimiter,
      hasHeader: sourceData.hasHeader,
      headers: sourceData.headers,
      dataTypes: sourceData.dataTypes,
      previewData: sourceData.previewData,
    };

    onSave(source);
    onClose();
    setSourceData({});
  };

  const handleClose = () => {
    onClose();
    setSourceData({});
    setSourceType('File');
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
          Add Custom Append Source
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
          <SimpleFileSourceConfig
            data={sourceData}
            onChange={setSourceData}
          />
        ) : sourceType === 'Database' ? (
          <DatabaseSourceConfig
            data={sourceData}
            onChange={setSourceData}
          />
        ) : (
          <SelfSourceConfig
            data={sourceData}
            onChange={setSourceData}
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
