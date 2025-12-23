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
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import SimpleFileSourceConfig from '../AppendModule/SimpleFileSourceConfig';
import DatabaseSourceConfig from '../InputModule/DatabaseSourceConfig';

interface MatchSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (source: InputSource) => void;
}

const MatchSourceDialog: React.FC<MatchSourceDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [sourceType, setSourceType] = useState<'File' | 'Database'>('File');
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
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#F59E0B' }}>
          Add Custom Match Source
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
          <SimpleFileSourceConfig
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
            backgroundColor: '#FDE68A',
            color: '#F59E0B',
            '&:hover': {
              backgroundColor: '#FCD34D',
            }
          }}
        >
          Add Source
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchSourceDialog;
