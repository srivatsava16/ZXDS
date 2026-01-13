import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  OutlinedInput,
  IconButton,
  Divider,
} from '@mui/material';
import { Close, Save } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';

interface MatchVersionModalProps {
  open: boolean;
  onClose: () => void;
  version: any | null;
  availableInputSources: InputSource[];
  availableMatchSources: Array<{ id: string; name: string }>;
  onSave: (updatedVersion: any) => void;
}

const MatchVersionModal: React.FC<MatchVersionModalProps> = ({
  open,
  onClose,
  version,
  availableInputSources,
  availableMatchSources,
  onSave,
}) => {
  const [versionName, setVersionName] = useState('');
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedMatchSources, setSelectedMatchSources] = useState<string[]>([]);

  useEffect(() => {
    if (version && open) {
      setVersionName(version.sourceName || version.versionLabel || '');
      setSelectedInputSources(version.baseInputSources || []);
      setSelectedMatchSources(version.operationSources || []);
    }
  }, [version, open]);

  const handleSave = () => {
    if (!versionName.trim()) {
      alert('Please enter a version name');
      return;
    }
    if (selectedInputSources.length === 0) {
      alert('Please select at least one input source');
      return;
    }
    if (selectedMatchSources.length === 0) {
      alert('Please select at least one match source');
      return;
    }

    const updatedVersion = {
      ...version,
      sourceName: versionName.trim(),
      versionLabel: versionName.trim(),
      baseInputSources: selectedInputSources,
      operationSources: selectedMatchSources,
    };

    onSave(updatedVersion);
  };

  const getSourceName = (id: string): string => {
    const inputSource = availableInputSources.find(s => s.id === id);
    if (inputSource) return inputSource.sourceName;

    const matchSource = availableMatchSources.find(s => s.id === id);
    if (matchSource) return matchSource.name;

    return id;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2.5,
          backgroundColor: '#F8FAFB',
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#2D3748' }}>
            Edit Match Version
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Modify the configuration of this match version
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3, px: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Version Name */}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Version Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Enter version name..."
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                },
              }}
            />
          </Box>

          {/* Input Sources Selection */}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Select Input Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedInputSources}
                onChange={(e) => setSelectedInputSources(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={getSourceName(value)}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                {availableInputSources.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedInputSources.indexOf(source.id) > -1} />
                    <ListItemText primary={source.sourceName} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Match Sources Selection */}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Select Match Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedMatchSources}
                onChange={(e) => setSelectedMatchSources(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={getSourceName(value)}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                {availableMatchSources.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedMatchSources.indexOf(source.id) > -1} />
                    <ListItemText primary={source.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          startIcon={<Close />}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<Save />}
          disabled={!versionName.trim() || selectedInputSources.length === 0 || selectedMatchSources.length === 0}
          sx={{ textTransform: 'none', boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)' }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchVersionModal;
