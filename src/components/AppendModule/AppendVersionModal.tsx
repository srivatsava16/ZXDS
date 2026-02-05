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
import type { RequestInputsResponse } from '../../services/api';
import { validateUniqueSourceName } from '../../utils/sourceValidation';

interface AppendVersionModalProps {
  open: boolean;
  onClose: () => void;
  version: any | null;
  availableInputSources: InputSource[];
  availableAppendSources: Array<{ id: string; name: string }>;
  apiSources?: RequestInputsResponse | null;
  allExistingSources?: InputSource[];
  onSave: (updatedVersion: any) => void;
}

const AppendVersionModal: React.FC<AppendVersionModalProps> = ({
  open,
  onClose,
  version,
  availableInputSources,
  availableAppendSources,
  apiSources = null,
  allExistingSources = [],
  onSave,
}) => {
  const [versionName, setVersionName] = useState('');
  const [versionNameError, setVersionNameError] = useState('');
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedAppendSources, setSelectedAppendSources] = useState<string[]>([]);
  const [selectedMatchKeys, setSelectedMatchKeys] = useState<string[]>([]);
  const [selectedAppendFields, setSelectedAppendFields] = useState<string[]>([]);

  // Filter out the currently editing version from available input sources
  const filteredAvailableInputSources = availableInputSources?.filter(source => {
    // If we're editing a version, exclude it from the dropdown
    if (version && version.id) {
      return source.id !== version.id;
    }
    return true;
  });

  useEffect(() => {
    if (version && open) {

      setVersionName(version.sourceName || version.versionLabel || '');
      setSelectedInputSources(version.baseInputSources || []);
      setSelectedAppendSources(version.operationSources || []);

      const matchKeys = version.operationFields || version.configJson?.match_keys || [];

      // Get append fields from version property, or from first append source's fields array
      let appendFields = version.appendFields || [];
      if (appendFields.length === 0 && version.configJson?.append_sources?.length > 0) {
        appendFields = version.configJson.append_sources[0]?.fields || [];
      }

      setSelectedMatchKeys(matchKeys);
      setSelectedAppendFields(appendFields);
    }
  }, [version, open]);

  const handleSave = () => {
    if (!versionName?.trim()) {
      setVersionNameError('Please enter a version name');
      return;
    }

    // Validate version name against API reserved names and existing sources
    const sourcesToCheck = allExistingSources?.length > 0 ? allExistingSources : availableInputSources;
    const validationError = validateUniqueSourceName({
      sourceName: versionName?.trim(),
      allExistingSources: sourcesToCheck,
      editingSourceId: version?.id,
      moduleName: 'Append Version',
      apiSources: apiSources
    });

    if (validationError) {
      setVersionNameError(validationError);
      return;
    }

    if (selectedInputSources?.length === 0) {
      alert('Please select at least one input source');
      return;
    }
    if (selectedAppendSources?.length === 0) {
      alert('Please select at least one append source');
      return;
    }
    if (selectedMatchKeys?.length === 0) {
      alert('Please select at least one Match Key');
      return;
    }
    if (selectedAppendFields?.length === 0) {
      alert('Please select at least one Field to Append');
      return;
    }

    const updatedVersion = {
      ...version,
      versionName: versionName?.trim(),     // Used in payload transformation
      sourceName: versionName?.trim(),      // Source name
      versionLabel: versionName?.trim(),    // Display label
      baseInputSources: selectedInputSources,
      operationSources: selectedAppendSources,
      operationFields: selectedMatchKeys,
      appendFields: selectedAppendFields,
      configJson: {
        ...version?.configJson,
        match_keys: selectedMatchKeys,
        // append_fields will be set within each append_sources.fields by handleUpdateVersion
      },
    };

    onSave(updatedVersion);
  };

  const getSourceName = (id: string): string => {
    const inputSource = availableInputSources?.find(s => s.id === id);
    if (inputSource) return inputSource.sourceName;

    const appendSource = availableAppendSources?.find(s => s.id === id);
    if (appendSource) return appendSource.name;

    return id;
  };

  // Get available Match Keys from selected input sources
  const getAvailableMatchKeys = (): string[] => {
    if (selectedInputSources?.length === 0) return [];

    const selectedSources = availableInputSources?.filter(src => selectedInputSources?.includes(src.id));
    if (selectedSources?.length === 0) return [];

    // If only one source, return all its fields
    if (selectedSources?.length === 1) {
      return selectedSources[0].selectedHeaders || selectedSources[0].headers || [];
    }

    // If multiple sources, return common fields (intersection)
    const firstSourceFields = selectedSources[0].selectedHeaders || selectedSources[0].headers || [];
    return firstSourceFields?.filter(field =>
      selectedSources?.slice(1).every(src => {
        const srcFields = src.selectedHeaders || src.headers || [];
        return srcFields?.includes(field);
      })
    );
  };

  // Get available Fields to Append from selected append sources
  const getAvailableAppendFields = (): string[] => {
    if (selectedAppendSources?.length === 0) return [];

    const selectedSources = availableAppendSources?.filter(src => selectedAppendSources?.includes(src.id));
    if (selectedSources?.length === 0) return [];

    // If only one source, return all its fields
    if (selectedSources?.length === 1) {
      return (selectedSources[0] as any).fields || [];
    }

    // If multiple sources, return common fields (intersection)
    const firstSourceFields = (selectedSources[0] as any).fields || [];
    return firstSourceFields?.filter((field: string) =>
      selectedSources?.slice(1).every(src => {
        const srcFields = (src as any).fields || [];
        return srcFields?.includes(field);
      })
    );
  };

  const availableMatchKeys = getAvailableMatchKeys();
  const availableAppendFields = getAvailableAppendFields();

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
            Edit Append Version
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Modify the configuration of this append version
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
              onChange={(e) => {
                setVersionName(e.target.value);
                setVersionNameError(''); // Clear error when user types
              }}
              placeholder="Enter version name..."
              error={!!versionNameError}
              helperText={versionNameError}
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
                onChange={(e) => {
                  setSelectedInputSources(typeof e.target.value === 'string' ? [e.target.value] : e.target.value);
                  // Reset match keys when input sources change
                  setSelectedMatchKeys([]);
                }}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected?.map((value) => (
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
                {filteredAvailableInputSources?.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedInputSources?.indexOf(source.id) > -1} />
                    <ListItemText primary={source.sourceName} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

             {/* Match Keys Selection */}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Select Match Keys <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedMatchKeys}
                onChange={(e) => setSelectedMatchKeys(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected?.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                )}
                disabled={availableMatchKeys?.length === 0}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 400,
                      maxWidth: '400px'
                    }
                  },
                  autoFocus: false
                }}
              >
                {availableMatchKeys?.length === 0 ? (
                  <MenuItem disabled>
                    <em>Select input sources first</em>
                  </MenuItem>
                ) : (
                  availableMatchKeys?.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={selectedMatchKeys?.indexOf(field) > -1} />
                      <ListItemText primary={field} />
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Box>

          {/* Append Sources Selection */}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Select Append Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedAppendSources}
                onChange={(e) => {
                  setSelectedAppendSources(typeof e.target.value === 'string' ? [e.target.value] : e.target.value);
                  // Reset append fields when append sources change
                  setSelectedAppendFields([]);
                }}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected?.map((value) => (
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
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 400,
                      maxWidth: '400px'
                    }
                  },
                  autoFocus: false
                }}
              >
                {availableAppendSources?.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedAppendSources?.indexOf(source.id) > -1} />
                    <ListItemText primary={source.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

       

          {/* Fields to Append Selection */}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Select Fields to Append <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedAppendFields}
                onChange={(e) => setSelectedAppendFields(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected?.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                )}
                disabled={availableAppendFields?.length === 0}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 400,
                      maxWidth: '400px'
                    }
                  },
                  autoFocus: false
                }}
              >
                {availableAppendFields?.length === 0 ? (
                  <MenuItem disabled>
                    <em>Select append sources first</em>
                  </MenuItem>
                ) : (
                  availableAppendFields?.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={selectedAppendFields?.indexOf(field) > -1} />
                      <ListItemText primary={field} />
                    </MenuItem>
                  ))
                )}
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
          disabled={
            !versionName?.trim() ||
            selectedInputSources?.length === 0 ||
            selectedAppendSources?.length === 0 ||
            selectedMatchKeys?.length === 0 ||
            selectedAppendFields?.length === 0
          }
          sx={{ textTransform: 'none', boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)' }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppendVersionModal;
