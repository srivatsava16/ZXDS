import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  FormControl,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Paper,
  TextField,
} from '@mui/material';
import { Add, Delete, Edit, AccountTree, HistoryEdu } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import SuppressSourceDialog from './SuppressSourceDialog';
import FieldMappingDialog, { type FieldMapping } from '../AppendModule/FieldMappingDialog';

interface SuppressConfig {
  id: string;
  inputSources: string[];
  suppressOnFields: string[];
  suppressSources: string[];
}

interface SuppressModuleProps {
  availableInputSources: InputSource[];
  onCreateVersionedSource?: (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[]
  ) => void;
  initialConfigs?: SuppressConfig[];
}

// Predefined suppress sources
const PREDEFINED_SOURCES = [
  { id: 'global_suppression_list', name: 'Global Suppression List' },
  { id: 'unsubscribe_list', name: 'Unsubscribe List' },
  { id: 'bounce_list', name: 'Bounce List' },
  { id: 'complaint_list', name: 'Complaint List' },
];

const SuppressModule: React.FC<SuppressModuleProps> = ({ availableInputSources, onCreateVersionedSource, initialConfigs }) => {
  const [configs, setConfigs] = useState<SuppressConfig[]>([]);
  const [customSuppressSources, setCustomSuppressSources] = useState<InputSource[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  // Load initial configurations if provided (for edit mode)
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Current working config state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedSuppressOnFields, setSelectedSuppressOnFields] = useState<string[]>([]);
  const [selectedSuppressSources, setSelectedSuppressSources] = useState<string[]>([]);

  // Search states for each dropdown
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [suppressOnFieldsSearch, setSuppressOnFieldsSearch] = useState('');
  const [suppressSourcesSearch, setSuppressSourcesSearch] = useState('');

  // Get common or all fields based on input source selection
  const getSuppressOnFields = (sourceIds: string[]): string[] => {
    // Always include Decile1 and Decile2 for demo purposes
    const demoFields = ['Decile1', 'Decile2'];

    if (sourceIds.length === 0) return demoFields;

    const selectedSources = availableInputSources.filter(src => sourceIds.includes(src.id));
    if (selectedSources.length === 0) return demoFields;

    // If only one source selected, return all its fields
    if (selectedSources.length === 1) {
      const headers = selectedSources[0].headers || [];
      // Merge headers with demo fields, ensuring no duplicates
      return [...new Set([...demoFields, ...headers])];
    }

    // If multiple sources, return common fields (intersection)
    const firstSourceHeaders = selectedSources[0].headers || [];
    const commonHeaders = firstSourceHeaders.filter(header =>
      selectedSources.every(src => src.headers?.includes(header))
    );
    // Merge common headers with demo fields, ensuring no duplicates
    return [...new Set([...demoFields, ...commonHeaders])];
  };

  const handleAddOrUpdateConfig = () => {
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedSuppressOnFields.length === 0) {
      alert('Please select at least one Suppress On field');
      return;
    }
    if (selectedSuppressSources.length === 0) {
      alert('Please select at least one Suppress Source');
      return;
    }

    if (editingConfigId) {
      // Update existing config
      setConfigs(configs.map(config =>
        config.id === editingConfigId
          ? {
              ...config,
              inputSources: selectedInputSources,
              suppressOnFields: selectedSuppressOnFields,
              suppressSources: selectedSuppressSources,
            }
          : config
      ));
      setEditingConfigId(null);
    } else {
      // Add new config
      const newConfig: SuppressConfig = {
        id: Date.now().toString(),
        inputSources: selectedInputSources,
        suppressOnFields: selectedSuppressOnFields,
        suppressSources: selectedSuppressSources,
      };
      setConfigs([...configs, newConfig]);
    }

    // Reset form
    setSelectedInputSources([]);
    setSelectedSuppressOnFields([]);
    setSelectedSuppressSources([]);
  };

  const handleEditConfig = (config: SuppressConfig) => {
    setEditingConfigId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedSuppressOnFields(config.suppressOnFields);
    setSelectedSuppressSources(config.suppressSources);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setSelectedInputSources([]);
    setSelectedSuppressOnFields([]);
    setSelectedSuppressSources([]);
  };

  const handleDeleteConfig = (id: string) => {
    if (window.confirm('Are you sure you want to delete this suppress configuration?')) {
      setConfigs(configs.filter(c => c.id !== id));
      if (editingConfigId === id) {
        handleCancelEdit();
      }
    }
  };

  const handleAddCustomSource = (source: InputSource) => {
    setCustomSuppressSources([...customSuppressSources, { ...source, id: Date.now().toString() }]);
  };

  const handleCreateVersion = () => {
    // Validation
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source before creating versions');
      return;
    }
    if (selectedSuppressSources.length === 0) {
      alert('Please select at least one Suppress Source before creating versions');
      return;
    }

    // Create versioned sources (n × m combinations)
    if (onCreateVersionedSource) {
      onCreateVersionedSource(
        'Suppress',
        selectedInputSources,
        selectedSuppressSources,
        selectedSuppressOnFields
      );
    }
  };

  const getSourceName = (id: string): string => {
    const inputSource = availableInputSources.find(src => src.id === id);
    if (inputSource) return inputSource.sourceName;

    const predefined = PREDEFINED_SOURCES.find(src => src.id === id);
    if (predefined) return predefined.name;

    const customSource = customSuppressSources.find(src => src.id === id);
    if (customSource) return customSource.sourceName;

    return id;
  };

  const suppressOnFields = getSuppressOnFields(selectedInputSources);

  // Extract versioned sources from availableInputSources
  const versionedSources = availableInputSources.filter(src =>
    (src as any).isVersioned === true
  );

  const allSuppressSources = [
    ...PREDEFINED_SOURCES.map(src => ({ id: src.id, name: src.name })),
    ...customSuppressSources.map(src => ({ id: src.id, name: src.sourceName })),
    ...versionedSources.map(src => ({ id: src.id, name: src.sourceName })),
  ];

  // Filtered lists based on search queries
  const filteredInputSources = availableInputSources.filter(source =>
    source.sourceName.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  const filteredSuppressOnFields = suppressOnFields.filter(field =>
    field.toLowerCase().includes(suppressOnFieldsSearch.toLowerCase())
  );

  const filteredSuppressSources = allSuppressSources.filter(source =>
    source.name.toLowerCase().includes(suppressSourcesSearch.toLowerCase())
  );

  if (availableInputSources.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: '#F8FAFB',
          borderRadius: 3,
          border: '1px dashed',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
          Suppress Module is not available yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please configure at least one Input Source first in the Input Module
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
            {editingConfigId ? 'Edit Suppress Configuration' : 'Create Suppress Configuration'}
          </Typography>
          {editingConfigId && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Editing existing configuration - make changes and click Update
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AccountTree />}
            onClick={() => setFieldMappingDialogOpen(true)}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem',
              px: 2,
              py: 0.5,
              fontWeight: 600,
              borderColor: '#F87171',
              color: '#F87171',
              '&:hover': {
                borderColor: '#DC2626',
                backgroundColor: 'rgba(248, 113, 113, 0.04)',
              },
            }}
          >
            Field Mapping
            {fieldMappings.length > 0 && (
              <Chip
                label={fieldMappings.length}
                size="small"
                sx={{
                  ml: 1,
                  height: 18,
                  fontSize: '0.65rem',
                  backgroundColor: '#FCA5A5',
                  color: 'white',
                  fontWeight: 700,
                }}
              />
            )}
          </Button>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setDialogOpen(true)}
              sx={{
                textTransform: 'none',
                fontSize: '0.875rem',
                px: 2,
                py: 0.5,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                backgroundColor: '#FCA5A5',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#F87171',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                },
              }}
            >
              Add Custom Suppress Source
            </Button>
            <Tooltip title="Create Version from Selected Inputs & Sources" arrow>
              <IconButton
                size="small"
                onClick={handleCreateVersion}
                disabled={!onCreateVersionedSource}
                sx={{
                  color: '#EF4444',
                  border: '2px solid #EF4444',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderColor: '#DC2626',
                  },
                  '&.Mui-disabled': {
                    borderColor: '#E5E7EB',
                    color: '#9CA3AF',
                  },
                }}
              >
                <AccountTree fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* All Three Steps in One Row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', mb: 3 }}>
        {/* Step 1: Input Sources */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            backgroundColor: 'white',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Chip
              label={'1'}
              size="small"
              sx={{
                backgroundColor: '#FCA5A5',
                color: '#fff',
                fontWeight: 700,
                mr: 1,
                width: 24,
                height: 24,
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
              Input Sources
            </Typography>
            <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
              *
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              multiple
              value={selectedInputSources}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-input-sources')) {
                  if (selectedInputSources.length === filteredInputSources.length) {
                    setSelectedInputSources([]);
                    setSelectedSuppressOnFields([]);
                  } else {
                    setSelectedInputSources(filteredInputSources.map(s => s.id));
                  }
                } else {
                  setSelectedInputSources(value);
                  setSelectedSuppressOnFields([]);
                }
              }}
              onClose={() => setInputSourcesSearch('')}
              input={<OutlinedInput />}
              renderValue={(selected) => {
                if (selected.length === 0) {
                  return (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Select
                    </Typography>
                  );
                }
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={getSourceName(value)}
                        size="small"
                        color="primary"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                );
              }}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 400 },
                },
                autoFocus: false,
              }}
            >
              {/* Search TextField */}
              <MenuItem
                disableRipple
                disableTouchRipple
                onKeyDown={(e) => e.stopPropagation()}
                sx={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: 'white',
                  zIndex: 1,
                  borderBottom: '1px solid #ddd',
                  '&:hover': { backgroundColor: 'white' },
                  cursor: 'default',
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search..."
                  fullWidth
                  value={inputSourcesSearch}
                  onChange={(e) => setInputSourcesSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                />
              </MenuItem>
              <MenuItem disabled value="">
                <em>Select Input Sources</em>
              </MenuItem>
              {/* Select All Option */}
              {filteredInputSources.length > 0 && (
                <MenuItem
                  value="select-all-input-sources"
                  sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                >
                  <Checkbox
                    checked={
                      filteredInputSources.length > 0 &&
                      filteredInputSources.every(src => selectedInputSources.includes(src.id))
                    }
                    indeterminate={
                      filteredInputSources.some(src => selectedInputSources.includes(src.id)) &&
                      !filteredInputSources.every(src => selectedInputSources.includes(src.id))
                    }
                    size="small"
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
              )}
              {filteredInputSources.map((source) => (
                <MenuItem key={source.id} value={source.id}>
                  <Checkbox checked={selectedInputSources.indexOf(source.id) > -1} size="small" />
                  <ListItemText primary={source.sourceName} />
                </MenuItem>
              ))}
              {filteredInputSources.length === 0 && (
                <MenuItem disabled>
                  <em>No sources match your search</em>
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>

        {/* Step 2: Suppress On Fields */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            backgroundColor: 'white',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Chip
              label={'2'}
              size="small"
              sx={{
                backgroundColor: '#FCA5A5',
                color: '#fff',
                fontWeight: 700,
                mr: 1,
                width: 24,
                height: 24,
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
              Suppress On Fields
            </Typography>
            <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
              *
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              key={`suppress-on-fields-${[...selectedInputSources].sort().join('-') || 'none'}`}
              multiple
              value={selectedSuppressOnFields.filter(field => suppressOnFields.includes(field))}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-suppress-fields')) {
                  if (selectedSuppressOnFields.length === filteredSuppressOnFields.length) {
                    setSelectedSuppressOnFields([]);
                  } else {
                    setSelectedSuppressOnFields(filteredSuppressOnFields);
                  }
                } else {
                  setSelectedSuppressOnFields(value);
                }
              }}
              onClose={() => setSuppressOnFieldsSearch('')}
              input={<OutlinedInput />}
              renderValue={(selected) => {
                if (selected.length === 0) {
                  return (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Select
                    </Typography>
                  );
                }
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: '#F87171',
                          color: '#fff',
                          '& .MuiChip-label': {
                            color: '#fff'
                          }
                        }}
                      />
                    ))}
                  </Box>
                );
              }}
              disabled={suppressOnFields.length === 0}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 400 },
                },
                autoFocus: false,
              }}
            >
              {/* Search TextField */}
              <MenuItem
                disableRipple
                disableTouchRipple
                onKeyDown={(e) => e.stopPropagation()}
                sx={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: 'white',
                  zIndex: 1,
                  borderBottom: '1px solid #ddd',
                  '&:hover': { backgroundColor: 'white' },
                  cursor: 'default',
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search..."
                  fullWidth
                  value={suppressOnFieldsSearch}
                  onChange={(e) => setSuppressOnFieldsSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                />
              </MenuItem>
              <MenuItem disabled value="">
                <em>
                  {suppressOnFields.length === 0
                    ? 'Select input sources first'
                    : 'Select Suppress On Fields'}
                </em>
              </MenuItem>
              {/* Select All Option */}
              {filteredSuppressOnFields.length > 0 && (
                <MenuItem
                  value="select-all-suppress-fields"
                  sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                >
                  <Checkbox
                    checked={
                      filteredSuppressOnFields.length > 0 &&
                      filteredSuppressOnFields.every(field => selectedSuppressOnFields.includes(field))
                    }
                    indeterminate={
                      filteredSuppressOnFields.some(field => selectedSuppressOnFields.includes(field)) &&
                      !filteredSuppressOnFields.every(field => selectedSuppressOnFields.includes(field))
                    }
                    size="small"
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
              )}
              {filteredSuppressOnFields.map((field) => (
                <MenuItem key={field} value={field}>
                  <Checkbox checked={selectedSuppressOnFields.indexOf(field) > -1} size="small" />
                  <ListItemText primary={field} />
                </MenuItem>
              ))}
              {filteredSuppressOnFields.length === 0 && suppressOnFields.length > 0 && (
                <MenuItem disabled>
                  <em>No fields match your search</em>
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>

        {/* Step 3: Suppress Sources */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            backgroundColor: 'white',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Chip
              label={'3'}
              size="small"
              sx={{
                backgroundColor: '#FCA5A5',
                color: '#fff',
                fontWeight: 700,
                mr: 1,
                width: 24,
                height: 24,
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
              Suppress Sources
            </Typography>
            <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
              *
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              multiple
              value={selectedSuppressSources}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-suppress-sources')) {
                  if (selectedSuppressSources.length === filteredSuppressSources.length) {
                    setSelectedSuppressSources([]);
                  } else {
                    setSelectedSuppressSources(filteredSuppressSources.map(s => s.id));
                  }
                } else {
                  setSelectedSuppressSources(value);
                }
              }}
              onClose={() => setSuppressSourcesSearch('')}
              input={<OutlinedInput />}
              renderValue={(selected) => {
                if (selected.length === 0) {
                  return (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Select
                    </Typography>
                  );
                }
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={getSourceName(value)}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: '#F87171',
                          color: '#fff',
                          '& .MuiChip-label': {
                            color: '#fff'
                          }
                        }}
                      />
                    ))}
                  </Box>
                );
              }}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { maxHeight: 400 },
                },
                autoFocus: false,
              }}
            >
              {/* Search TextField */}
              <MenuItem
                disableRipple
                disableTouchRipple
                onKeyDown={(e) => e.stopPropagation()}
                sx={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: 'white',
                  zIndex: 1,
                  borderBottom: '1px solid #ddd',
                  '&:hover': { backgroundColor: 'white' },
                  cursor: 'default',
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search..."
                  fullWidth
                  value={suppressSourcesSearch}
                  onChange={(e) => setSuppressSourcesSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                />
              </MenuItem>
              <MenuItem disabled value="">
                <em>Select Suppress Sources</em>
              </MenuItem>
              {/* Select All Option */}
              {filteredSuppressSources.length > 0 && (
                <MenuItem
                  value="select-all-suppress-sources"
                  sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                >
                  <Checkbox
                    checked={
                      filteredSuppressSources.length > 0 &&
                      filteredSuppressSources.every(src => selectedSuppressSources.includes(src.id))
                    }
                    indeterminate={
                      filteredSuppressSources.some(src => selectedSuppressSources.includes(src.id)) &&
                      !filteredSuppressSources.every(src => selectedSuppressSources.includes(src.id))
                    }
                    size="small"
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
              )}
              {filteredSuppressSources.map((source) => (
                <MenuItem key={source.id} value={source.id}>
                  <Checkbox checked={selectedSuppressSources.indexOf(source.id) > -1} size="small" />
                  <ListItemText primary={source.name} />
                </MenuItem>
              ))}
              {filteredSuppressSources.length === 0 && (
                <MenuItem disabled>
                  <em>No sources match your search</em>
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>

        {/* Add Button */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconButton
            onClick={handleAddOrUpdateConfig}
            sx={{
              width: 48,
              height: 48,
              backgroundColor: '#FCA5A5',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
              '&:hover': {
                backgroundColor: '#F87171',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
              },
            }}
          >
            <Add sx={{ fontSize: 28 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Cancel Edit Button (shown when editing) */}
      {editingConfigId && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="outlined"
            onClick={handleCancelEdit}
            sx={{
              textTransform: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              px: 2.5,
              py: 0.75,
            }}
          >
            Cancel Edit
          </Button>
        </Box>
      )}

      {/* Configurations List */}
      {configs.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
              Configured Suppress Operations
            </Typography>
            <Chip
              label={`${configs.length} configuration${configs.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                fontWeight: 600,
                backgroundColor: '#FCA5A5',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#F87171',
                }
              }}
            />
          </Box>
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Input Sources</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Suppress On Fields</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Suppress Sources</TableCell>
                  <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.map((config) => (
                  <TableRow
                    key={config.id}
                    hover
                    sx={{
                      backgroundColor: editingConfigId === config.id ? 'rgba(248, 113, 113, 0.04)' : 'transparent',
                      '&:hover': {
                        backgroundColor: editingConfigId === config.id ? 'rgba(248, 113, 113, 0.08)' : 'rgba(248, 113, 113, 0.04)',
                      },
                    }}
                  >
                    {/* Input Sources Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.inputSources.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Input Sources ({config.inputSources.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.inputSources.map(id => getSourceName(id)).join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.inputSources.length} source${config.inputSources.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#29669520',
                                color: '#296695',
                                border: '1px solid #29669540',
                                fontWeight: 600,
                                height: 20,
                                fontSize: '0.65rem',
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: '0.7rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {config.inputSources.slice(0, 2).map(id => getSourceName(id)).join(', ')}
                              {config.inputSources.length > 2 ? '' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Suppress On Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.suppressOnFields.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Suppress On Fields ({config.suppressOnFields.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.suppressOnFields.join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.suppressOnFields.length} field${config.suppressOnFields.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#F8717120',
                                color: '#F87171',
                                border: '1px solid #F8717140',
                                fontWeight: 600,
                                height: 20,
                                fontSize: '0.65rem',
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: '0.7rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {config.suppressOnFields.slice(0, 2).join(', ')}
                              {config.suppressOnFields.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Suppress Sources Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.suppressSources.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Suppress Sources ({config.suppressSources.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.suppressSources.map(id => getSourceName(id)).join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.suppressSources.length} source${config.suppressSources.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#F8717120',
                                color: '#F87171',
                                border: '1px solid #F8717140',
                                fontWeight: 600,
                                height: 20,
                                fontSize: '0.65rem',
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: '0.7rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {config.suppressSources.slice(0, 2).map(id => getSourceName(id)).join(', ')}
                              {config.suppressSources.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditConfig(config)}
                          sx={{
                            color: 'info.main',
                            padding: '3px',
                            '&:hover': {
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            },
                          }}
                          title="Edit"
                        >
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteConfig(config.id)}
                          sx={{
                            color: '#F87171',
                            padding: '3px',
                            '&:hover': {
                              backgroundColor: 'rgba(248, 113, 113, 0.12)',
                            },
                          }}
                          title="Delete"
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Custom Suppress Source Dialog */}
      <SuppressSourceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAddCustomSource}
      />

      {/* Field Mapping Dialog */}
      <FieldMappingDialog
        open={fieldMappingDialogOpen}
        onClose={() => setFieldMappingDialogOpen(false)}
        onSave={(mappings) => setFieldMappings(mappings)}
        availableSources={[
          ...availableInputSources
            .filter(src => selectedInputSources.includes(src.id))
            .map(src => ({ id: src.id, name: src.sourceName, type: 'input' as const })),
          ...selectedSuppressSources.map(srcId => {
            const predefined = PREDEFINED_SOURCES.find(s => s.id === srcId);
            if (predefined) {
              return { id: srcId, name: predefined.name, type: 'append' as const };
            }
            const custom = customSuppressSources.find(s => s.id === srcId);
            return { id: srcId, name: custom?.sourceName || srcId, type: 'append' as const };
          }),
        ]}
        initialMappings={fieldMappings}
      />
    </Box>
  );
};

export default SuppressModule;
