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
  FormGroup,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import { Close, Save } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import type { RequestInputsResponse } from '../../services/api';
import { validateUniqueSourceName } from '../../utils/sourceValidation';

interface MatchVersionModalProps {
  open: boolean;
  onClose: () => void;
  version: any | null;
  availableInputSources: InputSource[];
  availableMatchSources: Array<{ id: string; name: string; fields?: string[] }>;
  apiSources?: RequestInputsResponse | null;
  allExistingSources?: InputSource[];
  onSave: (updatedVersion: any) => void;
}

const MatchVersionModal: React.FC<MatchVersionModalProps> = ({
  open,
  onClose,
  version,
  availableInputSources,
  availableMatchSources,
  apiSources = null,
  allExistingSources = [],
  onSave,
}) => {
  const [versionName, setVersionName] = useState('');
  const [versionNameError, setVersionNameError] = useState('');
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedMatchSources, setSelectedMatchSources] = useState<string[]>([]);
  const [selectedMatchKeys, setSelectedMatchKeys] = useState<string[]>([]);
  const [selectedAddFields, setSelectedAddFields] = useState<string[]>([]);
  const [expand, setExpand] = useState<boolean>(false);
  const [matchType, setMatchType] = useState<'full' | 'any'>('full');

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
      console.log('[MatchVersionModal] Loading version data:', {
        version,
        operationFields: version?.operationFields,
        addFields: version?.addFields,
        expand: version?.expand,
        matchType: version?.matchType,
        configJsonMatchKeys: version?.configJson?.match_keys,
        configJsonAddFields: version?.configJson?.add_fields,
        configJsonExpand: version?.configJson?.expand,
        configJsonMatchType: version?.configJson?.match_type
      });

      setVersionName(version?.sourceName || version?.versionLabel || '');
      setSelectedInputSources(version?.baseInputSources || []);
      setSelectedMatchSources(version?.operationSources || []);

      // Match Keys are fields from INPUT sources (stored in operationFields or configJson.match_keys)
      const matchKeys = version?.operationFields || version?.configJson?.match_keys || [];
      setSelectedMatchKeys(matchKeys);

      // Add Fields are fields from MATCH sources (stored in addFields or configJson.add_fields)
      let addFields = version?.addFields || version?.configJson?.add_fields || [];
      if (addFields?.length === 0 && version?.configJson?.match_sources?.length > 0) {
        addFields = version?.configJson?.match_sources?.[0]?.fields || [];
      }

      // Load expand and matchType settings
      // If expand is not explicitly set, infer it from whether addFields exist
      const hasAddFields = addFields && addFields.length > 0;
      const expandValue = version?.expand !== undefined ? version.expand : hasAddFields;
      const matchTypeValue = version?.matchType || version?.configJson?.match_type || 'any';

      console.log('[MatchVersionModal] Setting state:', {
        matchKeys,
        addFields,
        expand: expandValue,
        matchType: matchTypeValue,
        matchKeysFrom: version?.operationFields ? 'operationFields' : 'configJson.match_keys',
        addFieldsFrom: version?.addFields ? 'addFields' : version?.configJson?.add_fields ? 'configJson.add_fields' : 'match_sources[0].fields',
        expandInferred: version?.expand === undefined ? 'inferred from addFields' : 'explicit'
      });

      setSelectedAddFields(addFields);
      setExpand(expandValue);
      setMatchType(matchTypeValue);
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
      moduleName: 'Match Version',
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
    if (selectedMatchSources?.length === 0) {
      alert('Please select at least one match source');
      return;
    }

    // Validation: If expand is checked, Add Fields are mandatory
    if (expand && (!selectedAddFields || selectedAddFields?.length === 0)) {
      alert('Please select at least one Add Field when Expand is enabled');
      return;
    }

    const updatedVersion = {
      ...version,
      versionName: versionName?.trim(),     // Used in payload transformation
      sourceName: versionName?.trim(),      // Source name
      versionLabel: versionName?.trim(),    // Display label
      baseInputSources: selectedInputSources,
      operationSources: selectedMatchSources,
      operationFields: selectedMatchKeys,  // Match Keys from INPUT sources
      addFields: expand ? selectedAddFields : undefined,        // Add Fields from MATCH sources (only when expand is true)
      expand: expand,
      matchType: matchType,
    };

    // Update configJson to include match_keys, add_fields, expand, and match_type
    if (updatedVersion?.configJson) {
      updatedVersion.configJson = {
        ...updatedVersion?.configJson,
        match_keys: selectedMatchKeys || [],
        match_type: matchType,
        expand: expand
      };

      // Only include add_fields if expand is true and fields are selected
      if (expand && selectedAddFields && selectedAddFields?.length > 0) {
        updatedVersion.configJson.add_fields = selectedAddFields;
      } else {
        // Remove add_fields if expand is false or none selected
        delete updatedVersion?.configJson?.add_fields;
      }
    }

    console.log('[MatchVersionModal] Saving updated version:', updatedVersion);
    onSave(updatedVersion);
  };

  const getSourceName = (id: string): string => {
    const inputSource = availableInputSources?.find(s => s?.id === id);
    if (inputSource) return inputSource?.sourceName;

    const matchSource = availableMatchSources?.find(s => s?.id === id);
    if (matchSource) return matchSource?.name;

    return id;
  };

  // Get available Match Keys from selected input sources
  const getAvailableMatchKeys = (): string[] => {
    if (!selectedInputSources || selectedInputSources?.length === 0) {
      return [];
    }

    const headersSet = new Set<string>();

    selectedInputSources?.forEach(sourceId => {
      const source = availableInputSources?.find(s => s?.id === sourceId);
      if (source?.headers) {
        source?.headers?.forEach((header: string) => {
          if (header) {
            headersSet?.add(header);
          }
        });
      }
    });

    return Array?.from(headersSet)?.sort();
  };

  // Get available Add Fields from selected match sources
  const getAvailableAddFields = (): string[] => {
    if (!selectedMatchSources || selectedMatchSources?.length === 0) return [];

    const selectedSources = availableMatchSources?.filter(src => selectedMatchSources?.includes(src?.id));
    if (!selectedSources || selectedSources?.length === 0) return [];

    // If only one source, return all its fields
    if (selectedSources?.length === 1) {
      return (selectedSources?.[0] as any)?.fields || [];
    }

    // If multiple sources, return common fields (intersection)
    const firstSourceFields = (selectedSources?.[0] as any)?.fields || [];
    return firstSourceFields?.filter((field: string) =>
      selectedSources?.slice(1)?.every(src => {
        const srcFields = (src as any)?.fields || [];
        return srcFields?.includes(field);
      })
    );
  };

  const availableMatchKeys = getAvailableMatchKeys();
  const availableAddFields = getAvailableAddFields();

  // Clear invalid match keys when input sources change
  useEffect(() => {
    if (open && selectedMatchKeys?.length > 0) {
      // Get current available fields based on selected input sources
      const headersSet = new Set<string>();
      selectedInputSources?.forEach(sourceId => {
        const source = availableInputSources?.find(s => s?.id === sourceId);
        if (source?.headers) {
          source?.headers?.forEach((header: string) => {
            if (header) {
              headersSet?.add(header);
            }
          });
        }
      });
      const availableFields = Array?.from(headersSet);

      const validKeys = selectedMatchKeys?.filter(key => availableFields?.includes(key));
      if (validKeys?.length !== selectedMatchKeys?.length) {
        setSelectedMatchKeys(validKeys);
      }
    }
  }, [selectedInputSources, open, availableInputSources, selectedMatchKeys]);

  // Clear invalid add fields when match sources change
  useEffect(() => {
    if (open && selectedAddFields?.length > 0) {
      const currentAvailableAddFields = getAvailableAddFields();
      const validFields = selectedAddFields?.filter(field => currentAvailableAddFields?.includes(field));
      if (validFields?.length !== selectedAddFields?.length) {
        setSelectedAddFields(validFields);
      }
    }
  }, [selectedMatchSources, open, availableMatchSources, selectedAddFields]);

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
                onChange={(e) => setSelectedInputSources(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
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
                {filteredAvailableInputSources?.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedInputSources?.indexOf(source.id) > -1} />
                    <ListItemText primary={source.sourceName} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Match Keys Selection (fields to match on from input sources) */}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Match Keys
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedMatchKeys?.filter(key => getAvailableMatchKeys()?.includes(key)) || []}
                onChange={(e) => setSelectedMatchKeys(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                input={<OutlinedInput />}
                disabled={!getAvailableMatchKeys() || getAvailableMatchKeys()?.length === 0}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected || selected?.length === 0) {
                    return <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.875rem' }}>
                      {getAvailableMatchKeys()?.length === 0 ? 'Select input sources first' : 'Select fields...'}
                    </Typography>;
                  }
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected?.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  );
                }}
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
                {getAvailableMatchKeys()?.map((key) => (
                  <MenuItem key={key} value={key}>
                    <Checkbox checked={selectedMatchKeys?.indexOf(key) > -1} />
                    <ListItemText primary={key} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Fields from input sources to match on
            </Typography>
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
                {availableMatchSources?.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedMatchSources?.indexOf(source.id) > -1} />
                    <ListItemText primary={source.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Match Options: Expand and Match Type */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Match Options
              </Typography>

              {/* Separator */}
              <Box sx={{ width: '1px', height: '20px', backgroundColor: 'divider', mx: 0.5 }} />

              {/* Expand Checkbox - Disabled when Full Match is selected */}
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={expand || false}
                      onChange={(e) => {
                        setExpand(e.target.checked);
                        if (e.target.checked && matchType === 'full') {
                          setMatchType('any');
                        }
                      }}
                      disabled={matchType === 'full'}
                      sx={{
                        padding: '2px',
                        '& .MuiSvgIcon-root': { fontSize: 18 }
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: matchType === 'full' ? 'text.disabled' : '#2D3748'
                      }}
                    >
                      Expand
                    </Typography>
                  }
                  sx={{ margin: 0 }}
                  disabled={matchType === 'full'}
                />
              </FormGroup>

              {/* Full Match / Any Match Radio Buttons - Disabled when Expand is enabled */}
              <FormControl component="fieldset" sx={{ minWidth: 'auto' }}>
                <RadioGroup
                  row
                  value={matchType || 'any'}
                  onChange={(e) => {
                    const newMatchType = e.target.value as 'full' | 'any';
                    setMatchType(newMatchType);
                    if (newMatchType === 'full') {
                      setExpand(false);
                    }
                  }}
                  sx={{ gap: 1 }}
                >
                  <FormControlLabel
                    value="full"
                    control={
                      <Radio
                        size="small"
                        disabled={expand || false}
                        sx={{
                          padding: '2px',
                          '& .MuiSvgIcon-root': { fontSize: 18 }
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: expand ? 'text.disabled' : '#2D3748'
                        }}
                      >
                        Full Match
                      </Typography>
                    }
                    sx={{ margin: 0 }}
                    disabled={expand || false}
                  />
                  <FormControlLabel
                    value="any"
                    control={
                      <Radio
                        size="small"
                        disabled={expand || false}
                        sx={{
                          padding: '2px',
                          '& .MuiSvgIcon-root': { fontSize: 18 }
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: expand ? 'text.disabled' : '#2D3748'
                        }}
                      >
                        Any Match
                      </Typography>
                    }
                    sx={{ margin: 0 }}
                    disabled={expand || false}
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          </Box>

          {/* Add Fields Selection - Only shown when expand is checked */}
          {expand && (
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                Add Fields {expand && <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>}
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  value={selectedAddFields?.filter(field => availableAddFields?.includes(field)) || []}
                  onChange={(e) => setSelectedAddFields(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                  input={<OutlinedInput />}
                  disabled={!availableAddFields || availableAddFields?.length === 0}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected || selected?.length === 0) {
                      return <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.875rem' }}>
                        {availableAddFields?.length === 0 ? 'No common fields available' : 'Select fields...'}
                      </Typography>;
                    }
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected?.map((value) => (
                          <Chip
                            key={value}
                            label={value}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    );
                  }}
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
                  {availableAddFields?.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={selectedAddFields?.indexOf(field) > -1} />
                      <ListItemText primary={field} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Fields from match sources to add to output
              </Typography>
            </Box>
          )}

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
          disabled={!versionName?.trim() || selectedInputSources?.length === 0 || selectedMatchSources?.length === 0}
          sx={{ textTransform: 'none', boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)' }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MatchVersionModal;
