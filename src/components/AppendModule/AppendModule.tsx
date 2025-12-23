import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
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
  TextField,
} from '@mui/material';
import { Add, Delete, Edit, AccountTree, HistoryEdu } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import AppendSourceDialog from './AppendSourceDialog';
import DraggableAppendSources from './DraggableAppendSources';
import AddColumnDialog from './AddColumnDialog';
import FieldMappingDialog, { type FieldMapping } from './FieldMappingDialog';

interface AppendConfig {
  id: string;
  inputSources: string[];
  appendOnFields: string[];
  appendSources: string[];
  appendFields: string[];
}

interface AppendModuleProps {
  availableInputSources: InputSource[];
  onCreateVersionedSource?: (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[]
  ) => void;
  initialConfigs?: AppendConfig[];
}

// Predefined append sources
const PREDEFINED_SOURCES = [
  { id: 'postal_table', name: 'Postal Table', fields: ['ZIP', 'CITY', 'STATE', 'COUNTY', 'COUNTRY'] },
  { id: 'best_postal_table', name: 'Best Postal Match Table', fields: ['ZIP_CODE', 'CITY_NAME', 'STATE_CODE', 'LATITUDE', 'LONGITUDE'] },
];

const AppendModule: React.FC<AppendModuleProps> = ({ availableInputSources, onCreateVersionedSource, initialConfigs }) => {
  const [configs, setConfigs] = useState<AppendConfig[]>([]);
  const [customAppendSources, setCustomAppendSources] = useState<InputSource[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [addedCustomColumns, setAddedCustomColumns] = useState<any[]>([]);

  // Load initial configurations if provided (for edit mode)
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Current working config state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedAppendOnFields, setSelectedAppendOnFields] = useState<string[]>([]);
  const [selectedAppendSources, setSelectedAppendSources] = useState<string[]>([]);
  const [selectedAppendFields, setSelectedAppendFields] = useState<string[]>([]);

  // Search states for each dropdown
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [appendOnFieldsSearch, setAppendOnFieldsSearch] = useState('');
  const [appendSourcesSearch, setAppendSourcesSearch] = useState('');
  const [appendFieldsSearch, setAppendFieldsSearch] = useState('');

  // Get common or all fields based on input source selection
  const getAppendOnFields = (sourceIds: string[]): string[] => {
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

  // Get union of all append fields
  const getAppendFields = (appendSourceIds: string[]): string[] => {
    const fieldsSet = new Set<string>();

    appendSourceIds.forEach(id => {
      const predefined = PREDEFINED_SOURCES.find(src => src.id === id);
      if (predefined) {
        predefined.fields.forEach(field => fieldsSet.add(field));
      } else {
        const customSource = customAppendSources.find(src => src.id === id);
        if (customSource && customSource.headers) {
          customSource.headers.forEach(field => fieldsSet.add(field));
        } else {
          // Check if it's a versioned source
          const versionedSource = availableInputSources.find(src => src.id === id);
          if (versionedSource && versionedSource.headers) {
            versionedSource.headers.forEach(field => fieldsSet.add(field));
          }
        }
      }
    });

    return Array.from(fieldsSet);
  };

  // Handle reordering of append sources via drag-and-drop
  const handleReorderAppendSources = (newOrder: string[]) => {
    setSelectedAppendSources(newOrder);
  };

  const handleAddOrUpdateConfig = () => {
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedAppendOnFields.length === 0) {
      alert('Please select at least one Append On field');
      return;
    }
    if (selectedAppendSources.length === 0) {
      alert('Please select at least one Append Source');
      return;
    }
    if (selectedAppendFields.length === 0) {
      alert('Please select at least one Append Field');
      return;
    }

    if (editingConfigId) {
      // Update existing config
      setConfigs(configs.map(config =>
        config.id === editingConfigId
          ? {
              ...config,
              inputSources: selectedInputSources,
              appendOnFields: selectedAppendOnFields,
              appendSources: selectedAppendSources,
              appendFields: selectedAppendFields,
            }
          : config
      ));
      setEditingConfigId(null);
    } else {
      // Add new config
      const newConfig: AppendConfig = {
        id: Date.now().toString(),
        inputSources: selectedInputSources,
        appendOnFields: selectedAppendOnFields,
        appendSources: selectedAppendSources,
        appendFields: selectedAppendFields,
      };
      setConfigs([...configs, newConfig]);
    }

    // Reset form
    setSelectedInputSources([]);
    setSelectedAppendOnFields([]);
    setSelectedAppendSources([]);
    setSelectedAppendFields([]);
  };

  const handleEditConfig = (config: AppendConfig) => {
    setEditingConfigId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedAppendOnFields(config.appendOnFields);
    setSelectedAppendSources(config.appendSources);
    setSelectedAppendFields(config.appendFields);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setSelectedInputSources([]);
    setSelectedAppendOnFields([]);
    setSelectedAppendSources([]);
    setSelectedAppendFields([]);
  };

  const handleDeleteConfig = (id: string) => {
    if (window.confirm('Are you sure you want to delete this append configuration?')) {
      setConfigs(configs.filter(c => c.id !== id));
      if (editingConfigId === id) {
        handleCancelEdit();
      }
    }
  };

  const handleAddCustomSource = (source: InputSource) => {
    const newSource = { ...source, id: Date.now().toString() };
    setCustomAppendSources(prev => [...prev, newSource]);
  };

  const handleCreateVersion = () => {
    // Validation
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source before creating versions');
      return;
    }
    if (selectedAppendSources.length === 0) {
      alert('Please select at least one Append Source before creating versions');
      return;
    }

    // Create versioned sources (n × m combinations)
    if (onCreateVersionedSource) {
      onCreateVersionedSource(
        'Append',
        selectedInputSources,
        selectedAppendSources,
        selectedAppendOnFields
      );
    }
  };

  const handleAddColumns = (columns: any[]) => {
    console.log('New columns added:', columns);
    setAddedCustomColumns(columns);
  };

  const getSourceName = (id: string): string => {
    const inputSource = availableInputSources.find(src => src.id === id);
    if (inputSource) return inputSource.sourceName;

    const predefined = PREDEFINED_SOURCES.find(src => src.id === id);
    if (predefined) return predefined.name;

    const customSource = customAppendSources.find(src => src.id === id);
    if (customSource) return customSource.sourceName;

    return id;
  };

  const appendOnFields = getAppendOnFields(selectedInputSources);
  const availableAppendFields = getAppendFields(selectedAppendSources);

  // Extract versioned sources from availableInputSources
  const versionedSources = availableInputSources.filter(src =>
    (src as any).isVersioned === true
  );

  const allAppendSources = [
    ...PREDEFINED_SOURCES.map(src => ({ id: src.id, name: src.name })),
    ...customAppendSources.map(src => ({ id: src.id, name: src.sourceName })),
    ...versionedSources.map(src => ({ id: src.id, name: src.sourceName })),
  ];

  // Filtered lists based on search queries
  const filteredInputSources = availableInputSources.filter(source =>
    source.sourceName.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  const filteredAppendOnFields = appendOnFields.filter(field =>
    field.toLowerCase().includes(appendOnFieldsSearch.toLowerCase())
  );

  const filteredAppendSources = allAppendSources.filter(source =>
    source.name.toLowerCase().includes(appendSourcesSearch.toLowerCase())
  );

  const filteredAppendFields = availableAppendFields.filter(field =>
    field.toLowerCase().includes(appendFieldsSearch.toLowerCase())
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
          Append Module is not available yet
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
            {editingConfigId ? 'Edit Append Configuration' : 'Create Append Configuration'}
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
              borderColor: '#296695',
              color: '#296695',
              '&:hover': {
                borderColor: '#1e4d6f',
                backgroundColor: 'rgba(41, 102, 149, 0.04)',
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
                  backgroundColor: '#10B981',
                  color: 'white',
                  fontWeight: 700,
                }}
              />
            )}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => setAddColumnDialogOpen(true)}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem',
              px: 2,
              py: 0.5,
              fontWeight: 600,
              borderColor: '#296695',
              color: '#296695',
              '&:hover': {
                borderColor: '#1e4d6f',
                backgroundColor: 'rgba(41, 102, 149, 0.04)',
              },
            }}
          >
            Add Field
            {addedCustomColumns.length > 0 && (
              <Chip
                label={addedCustomColumns.length}
                size="small"
                sx={{
                  ml: 1,
                  height: 18,
                  fontSize: '0.65rem',
                  backgroundColor: '#296695',
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
                boxShadow: '0 2px 8px rgba(41, 102, 149, 0.3)',
                backgroundColor: '#296695',
                '&:hover': {
                  backgroundColor: '#1e4d6f',
                  boxShadow: '0 4px 12px rgba(41, 102, 149, 0.4)',
                },
              }}
            >
              Add Append Source
            </Button>
            <Tooltip title="Create Version from Selected Inputs & Sources" arrow>
              <IconButton
                size="small"
                onClick={handleCreateVersion}
                disabled={!onCreateVersionedSource}
                sx={{
                  color: '#296695',
                  border: '2px solid #296695',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(41, 102, 149, 0.08)',
                    borderColor: '#1e4d6f',
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

      {/* All Four Steps in One Row */}
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
                  backgroundColor: '#296695',
                  color: 'white',
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
                  if (value.includes('select-all-input-sources-append')) {
                    if (selectedInputSources.length === filteredInputSources.length) {
                      setSelectedInputSources([]);
                      setSelectedAppendOnFields([]);
                    } else {
                      setSelectedInputSources(filteredInputSources.map(s => s.id));
                    }
                  } else {
                    setSelectedInputSources(value);
                    setSelectedAppendOnFields([]);
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
                    value="select-all-input-sources-append"
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

          {/* Step 2: Append On Fields */}
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
                  backgroundColor: '#296695',
                  color: 'white',
                  fontWeight: 700,
                  mr: 1,
                  width: 24,
                  height: 24,
                }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                Match Keys
              </Typography>
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                *
              </Typography>
            </Box>
            <FormControl fullWidth size="small">
              <Select
                key={`append-on-fields-${[...selectedInputSources].sort().join('-') || 'none'}`}
                multiple
                value={selectedAppendOnFields.filter(field => appendOnFields.includes(field))}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  if (value.includes('select-all-append-on-fields')) {
                    if (selectedAppendOnFields.length === filteredAppendOnFields.length) {
                      setSelectedAppendOnFields([]);
                    } else {
                      setSelectedAppendOnFields(filteredAppendOnFields);
                    }
                  } else {
                    setSelectedAppendOnFields(value);
                  }
                }}
                onClose={() => setAppendOnFieldsSearch('')}
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
                          color="info"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  );
                }}
                disabled={appendOnFields.length === 0}
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
                    value={appendOnFieldsSearch}
                    onChange={(e) => setAppendOnFieldsSearch(e.target.value)}
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
                    {appendOnFields.length === 0
                      ? 'Select input sources first'
                      : 'Select Append On Fields'}
                  </em>
                </MenuItem>
                {/* Select All Option */}
                {filteredAppendOnFields.length > 0 && (
                  <MenuItem
                    value="select-all-append-on-fields"
                    sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                  >
                    <Checkbox
                      checked={
                        filteredAppendOnFields.length > 0 &&
                        filteredAppendOnFields.every(field => selectedAppendOnFields.includes(field))
                      }
                      indeterminate={
                        filteredAppendOnFields.some(field => selectedAppendOnFields.includes(field)) &&
                        !filteredAppendOnFields.every(field => selectedAppendOnFields.includes(field))
                      }
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                )}
                {filteredAppendOnFields.map((field) => (
                  <MenuItem key={field} value={field}>
                    <Checkbox checked={selectedAppendOnFields.indexOf(field) > -1} size="small" />
                    <ListItemText primary={field} />
                  </MenuItem>
                ))}
                {filteredAppendOnFields.length === 0 && appendOnFields.length > 0 && (
                  <MenuItem disabled>
                    <em>No fields match your search</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>

          {/* Step 3: Append Sources */}
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
                  backgroundColor: '#296695',
                  color: 'white',
                  fontWeight: 700,
                  mr: 1,
                  width: 24,
                  height: 24,
                }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                Append Sources
              </Typography>
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                *
              </Typography>
            </Box>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedAppendSources}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  if (value.includes('select-all-append-sources')) {
                    if (selectedAppendSources.length === filteredAppendSources.length) {
                      setSelectedAppendSources([]);
                      setSelectedAppendFields([]);
                    } else {
                      setSelectedAppendSources(filteredAppendSources.map(s => s.id));
                    }
                  } else {
                    setSelectedAppendSources(value);
                    setSelectedAppendFields([]);
                  }
                }}
                onClose={() => setAppendSourcesSearch('')}
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
                          color="success"
                          sx={{ height: 20, fontSize: '0.7rem', color: '#fff' }}
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
                    value={appendSourcesSearch}
                    onChange={(e) => setAppendSourcesSearch(e.target.value)}
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
                  <em>Select Append Sources</em>
                </MenuItem>
                {/* Select All Option */}
                {filteredAppendSources.length > 0 && (
                  <MenuItem
                    value="select-all-append-sources"
                    sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                  >
                    <Checkbox
                      checked={
                        filteredAppendSources.length > 0 &&
                        filteredAppendSources.every(src => selectedAppendSources.includes(src.id))
                      }
                      indeterminate={
                        filteredAppendSources.some(src => selectedAppendSources.includes(src.id)) &&
                        !filteredAppendSources.every(src => selectedAppendSources.includes(src.id))
                      }
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                )}
                {filteredAppendSources.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedAppendSources.indexOf(source.id) > -1} size="small" />
                    <ListItemText primary={source.name} />
                  </MenuItem>
                ))}
                {filteredAppendSources.length === 0 && (
                  <MenuItem disabled>
                    <em>No sources match your search</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* Draggable Priority Order for selected sources */}
            {selectedAppendSources.length > 0 && (
              <DraggableAppendSources
                selectedSources={selectedAppendSources}
                allSources={allAppendSources}
                onReorder={handleReorderAppendSources}
                getSourceName={getSourceName}
              />
            )}
          </Box>

          {/* Step 4: Append Fields */}
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
                label={'4'}
                size="small"
                sx={{
                  backgroundColor: '#296695',
                  color: 'white',
                  fontWeight: 700,
                  mr: 1,
                  width: 24,
                  height: 24,
                }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                Fields to Append
              </Typography>
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                *
              </Typography>
            </Box>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedAppendFields}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  if (value.includes('select-all-append-fields')) {
                    if (selectedAppendFields.length === filteredAppendFields.length) {
                      setSelectedAppendFields([]);
                    } else {
                      setSelectedAppendFields(filteredAppendFields);
                    }
                  } else {
                    setSelectedAppendFields(value);
                  }
                }}
                onClose={() => setAppendFieldsSearch('')}
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
                          color="warning"
                          sx={{ height: 20, fontSize: '0.7rem', color: '#fff' }}
                        />
                      ))}
                    </Box>
                  );
                }}
                disabled={availableAppendFields.length === 0}
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
                    value={appendFieldsSearch}
                    onChange={(e) => setAppendFieldsSearch(e.target.value)}
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
                    {availableAppendFields.length === 0
                      ? 'Select append sources first'
                      : 'Select Append Fields'}
                  </em>
                </MenuItem>
                {/* Select All Option */}
                {filteredAppendFields.length > 0 && (
                  <MenuItem
                    value="select-all-append-fields"
                    sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                  >
                    <Checkbox
                      checked={
                        filteredAppendFields.length > 0 &&
                        filteredAppendFields.every(field => selectedAppendFields.includes(field))
                      }
                      indeterminate={
                        filteredAppendFields.some(field => selectedAppendFields.includes(field)) &&
                        !filteredAppendFields.every(field => selectedAppendFields.includes(field))
                      }
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                )}
                {filteredAppendFields.map((field) => (
                  <MenuItem key={field} value={field}>
                    <Checkbox checked={selectedAppendFields.indexOf(field) > -1} size="small" />
                    <ListItemText primary={field} />
                  </MenuItem>
                ))}
                {filteredAppendFields.length === 0 && availableAppendFields.length > 0 && (
                  <MenuItem disabled>
                    <em>No fields match your search</em>
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
                backgroundColor: '#10B981',
                color: 'white',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                '&:hover': {
                  backgroundColor: '#059669',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
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
              Configured Append Operations
            </Typography>
            <Chip
              label={`${configs.length} configuration${configs.length !== 1 ? 's' : ''}`}
              size="small"
              color="primary"
              sx={{ fontWeight: 600 }}
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
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Append On Fields</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Append Sources</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Append Fields</TableCell>
                  <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.map((config) => (
                  <TableRow
                    key={config.id}
                    hover
                    sx={{
                      backgroundColor: editingConfigId === config.id ? 'rgba(41, 102, 149, 0.04)' : 'transparent',
                      '&:hover': {
                        backgroundColor: editingConfigId === config.id ? 'rgba(41, 102, 149, 0.08)' : 'rgba(41, 102, 149, 0.04)',
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
                              {config.inputSources.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Append On Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.appendOnFields.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Append On Fields ({config.appendOnFields.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.appendOnFields.join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.appendOnFields.length} field${config.appendOnFields.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#0EA5E920',
                                color: '#0EA5E9',
                                border: '1px solid #0EA5E940',
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
                              {config.appendOnFields.slice(0, 2).join(', ')}
                              {config.appendOnFields.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Append Sources Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.appendSources.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Append Sources (Priority Order):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.appendSources.map((id, idx) => `${idx + 1}. ${getSourceName(id)}`).join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.appendSources.length} source${config.appendSources.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#10B98120',
                                color: '#10B981',
                                border: '1px solid #10B98140',
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
                              {config.appendSources.slice(0, 2).map(id => getSourceName(id)).join(', ')}
                              {config.appendSources.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Append Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.appendFields.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Append Fields ({config.appendFields.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.appendFields.join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.appendFields.length} field${config.appendFields.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#F59E0B20',
                                color: '#F59E0B',
                                border: '1px solid #F59E0B40',
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
                              {config.appendFields.slice(0, 2).join(', ')}
                              {config.appendFields.length > 2 ? '...' : ''}
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
                            color: 'error.main',
                            padding: '3px',
                            '&:hover': {
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
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

      {/* Custom Append Source Dialog */}
      <AppendSourceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAddCustomSource}
        availableInputSources={availableInputSources}
      />

      {/* Add Field Dialog */}
      <AddColumnDialog
        open={addColumnDialogOpen}
        onClose={() => setAddColumnDialogOpen(false)}
        selectedInputSources={availableInputSources.filter(src => selectedInputSources.includes(src.id))}
        onSave={handleAddColumns}
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
          ...selectedAppendSources.map(srcId => {
            const predefined = PREDEFINED_SOURCES.find(s => s.id === srcId);
            if (predefined) {
              return { id: srcId, name: predefined.name, type: 'append' as const };
            }
            const custom = customAppendSources.find(s => s.id === srcId);
            return { id: srcId, name: custom?.sourceName || srcId, type: 'append' as const };
          }),
        ]}
        initialMappings={fieldMappings}
      />
    </Box>
  );
};

export default AppendModule;
