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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add, Delete, Edit, AccountTree, Visibility } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import type { RequestInputsResponse } from '../../services/api';
import SuppressSourceDialog from './SuppressSourceDialog';
import FieldMappingDialog, { type FieldMapping } from '../AppendModule/FieldMappingDialog';
import SuppressVersionModal from './SuppressVersionModal';

export interface SuppressConfig {
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
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  versionedSources?: any[]; // Versioned sources for display
  getSourceNameById?: (sourceId: string) => string; // Helper function to get source names
  onUpdateVersionName?: (versionId: string, newName: string) => void;
  onUpdateVersion?: (versionId: string, updatedVersion: any) => void; // Update full version configuration
  onConfigurationsChange?: (configs: SuppressConfig[]) => void; // Callback to report configuration changes
  // Shared custom sources across all modules
  sharedCustomSources?: InputSource[];
  onAddSharedCustomSource?: (source: InputSource, moduleId?: string) => void;
  onEditSharedCustomSource?: (source: InputSource) => void;
  onDeleteSharedCustomSource?: (id: string) => void;
}

// Get predefined suppress sources from API or fallback to default
const getPredefinedSources = (apiSources?: RequestInputsResponse | null) => {
  const suppressSources = apiSources?.dbSource?.preconfiguredTables?.suppress || [];
  return suppressSources
    .filter(table => table && typeof table === 'object' && table.tableName) // Ensure it's a valid table object
    .map((table) => ({
      id: `suppress_${table.tableId}`,
      name: table.tableName,
      description: table.description
    }));
};

const SuppressModule: React.FC<SuppressModuleProps> = ({
  availableInputSources,
  onCreateVersionedSource,
  initialConfigs,
  apiSources,
  sourcesLoading = false,
  versionedSources = [],
  getSourceNameById,
  onUpdateVersionName,
  onUpdateVersion,
  onConfigurationsChange,
  sharedCustomSources = [],
  onAddSharedCustomSource,
  onEditSharedCustomSource,
  onDeleteSharedCustomSource
}) => {
  const [configs, setConfigs] = useState<SuppressConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [viewingSource, setViewingSource] = useState<InputSource | null>(null);
  const [editingSource, setEditingSource] = useState<InputSource | null>(null);

  // Version edit states
  const [editingVersion, setEditingVersion] = useState<any | null>(null);
  const [viewingVersion, setViewingVersion] = useState<any | null>(null);
  const [versionEditDialogOpen, setVersionEditDialogOpen] = useState(false);
  const [versionViewDialogOpen, setVersionViewDialogOpen] = useState(false);

  // Handlers for viewing and editing versions
  const handleViewVersion = (version: any) => {
    setViewingVersion(version);
    setVersionViewDialogOpen(true);
  };

  const handleEditVersion = (version: any) => {
    setEditingVersion(version);
    setVersionEditDialogOpen(true);
  };

  const handleSaveVersion = (updatedVersion: any) => {
    if (onUpdateVersion) {
      onUpdateVersion(updatedVersion.id, updatedVersion);
    }
    setVersionEditDialogOpen(false);
    setEditingVersion(null);
  };

  // Handlers for custom sources using shared state
  const handleAddCustomSource = (source: InputSource) => {
    if (onAddSharedCustomSource) {
      onAddSharedCustomSource(source);
    }
  };

  const handleEditCustomSource = (source: InputSource) => {
    if (onEditSharedCustomSource && editingSource) {
      onEditSharedCustomSource({ ...source, id: editingSource.id });
    }
    setEditingSource(null);
  };

  const handleDeleteCustomSource = (id: string) => {
    if (onDeleteSharedCustomSource) {
      onDeleteSharedCustomSource(id);
    }
  };

  // Use shared custom sources from props
  const customSuppressSources = sharedCustomSources;

  // Get predefined sources from API or use fallback
  const predefinedSources = getPredefinedSources(apiSources);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  // Load initial configurations if provided (for edit mode)
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Notify parent component when configurations change
  useEffect(() => {
    if (onConfigurationsChange) {
      onConfigurationsChange(configs);
    }
  }, [configs, onConfigurationsChange]);

  // Current working config state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedSuppressOnFields, setSelectedSuppressOnFields] = useState<string[]>([]);
  const [selectedSuppressSources, setSelectedSuppressSources] = useState<string[]>([]);

  // Search states for each dropdown
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [suppressOnFieldsSearch, setSuppressOnFieldsSearch] = useState('');
  const [suppressSourcesSearch, setSuppressSourcesSearch] = useState('');

  // Get common or all fields based on input source selection, with field mappings applied
  const getSuppressOnFields = (sourceIds: string[]): string[] => {
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) return [];

    const selectedSources = availableInputSources.filter(src => sourceIds.includes(src.id));
    if (selectedSources.length === 0) return [];

    // Build a map of original field -> mapped field name (or original if no mapping)
    const fieldsMap = new Map<string, string>();

    selectedSources.forEach(source => {
      const headers = source.selectedHeaders || source.headers || [];

      headers.forEach(field => {
        const sourceFieldKey = `${source.id}::${field}`;

        // Check if this field has a mapping
        const mapping = fieldMappings.find(m => {
          return m.selectedColumns.some(col => {
            const [colSourceId, colFieldName] = col.split('::');
            return colSourceId === source.id && colFieldName === field;
          });
        });

        if (mapping) {
          // Use the mapped field name
          fieldsMap.set(sourceFieldKey, mapping.fieldName);
        } else {
          // Use the original field name
          fieldsMap.set(sourceFieldKey, field);
        }
      });
    });

    // If only one source selected, return all its fields (mapped or original)
    if (selectedSources.length === 1) {
      return Array.from(fieldsMap.values());
    }

    // If multiple sources, return common fields (intersection) - considering mapped names (case-insensitive)
    // Group fields by their display name (mapped or original), using lowercase for comparison
    const fieldNameOccurrences = new Map<string, number>();
    const fieldNameCasing = new Map<string, string>(); // Track original casing

    fieldsMap.forEach((displayName) => {
      const displayNameLower = displayName.toLowerCase();
      fieldNameOccurrences.set(displayNameLower, (fieldNameOccurrences.get(displayNameLower) || 0) + 1);

      // Preserve the casing from the first occurrence
      if (!fieldNameCasing.has(displayNameLower)) {
        fieldNameCasing.set(displayNameLower, displayName);
      }
    });

    // Return fields that appear in all sources (case-insensitive), preserving original casing
    const commonFields: string[] = [];
    fieldNameOccurrences.forEach((count, fieldNameLower) => {
      if (count === selectedSources.length) {
        commonFields.push(fieldNameCasing.get(fieldNameLower) || fieldNameLower);
      }
    });

    return commonFields;
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

    const predefined = predefinedSources.find(src => src.id === id);
    if (predefined) return predefined.name;

    const customSource = customSuppressSources.find(src => src.id === id);
    if (customSource) return customSource.sourceName;

    return id;
  };

  const suppressOnFields = getSuppressOnFields(selectedInputSources);

  // Extract versioned sources from availableInputSources
  const localVersionedSources = availableInputSources.filter(src =>
    (src as any).isVersioned === true
  );

  // Extract regular input sources (non-versioned)
  const regularInputSources = availableInputSources.filter(src =>
    !(src as any).isVersioned
  );

  const allSuppressSources = [
    ...predefinedSources.map(src => ({ id: src.id, name: src.name })),
    ...customSuppressSources.map(src => ({ id: src.id, name: src.sourceName })),
    ...localVersionedSources.map(src => ({ id: src.id, name: src.sourceName })),
    ...regularInputSources.map(src => ({ id: src.id, name: src.sourceName })),
  ];

  // Filtered lists based on search queries
  const filteredInputSources = availableInputSources.filter(source =>
    source?.sourceName?.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  const filteredSuppressOnFields = suppressOnFields.filter(field =>
    field.toLowerCase().includes(suppressOnFieldsSearch.toLowerCase())
  );

  const filteredSuppressSources = allSuppressSources.filter(source =>
    source?.name && typeof source.name === 'string' && 
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
            <Tooltip title="Create Version" arrow>
              <span>
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
                    '&:disabled': {
                      color: 'rgba(239, 68, 68, 0.4)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                    },
                  }}
                >
                  <AccountTree fontSize="small" />
                </IconButton>
              </span>
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
              {filteredSuppressSources.map((source) => {
                const isCustomSource = customSuppressSources.some(cs => cs.id === source.id);
                return (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedSuppressSources.indexOf(source.id) > -1} size="small" />
                    <ListItemText primary={source.name} />
                    {isCustomSource && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              const customSource = customSuppressSources.find(cs => cs.id === source.id);
                              if (customSource) {
                                setViewingSource(customSource);
                              }
                            }}
                            sx={{
                              color: '#296695',
                              '&:hover': {
                                backgroundColor: 'rgba(41, 102, 149, 0.08)',
                              },
                            }}
                          >
                            <Visibility fontSize="small" sx={{ fontSize: '0.8rem' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Source" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              const customSource = customSuppressSources.find(cs => cs.id === source.id);
                              if (customSource) {
                                setEditingSource(customSource);
                                setDialogOpen(true);
                              }
                            }}
                            sx={{
                              color: '#10B981',
                              '&:hover': {
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                              },
                            }}
                          >
                            <Edit fontSize="small" sx={{ fontSize: '0.8rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </MenuItem>
                );
              })}
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
      {(() => {
        // Combine configurations and versions for unified display
        const combinedItems = [
          ...configs.map(config => ({ type: 'config' as const, data: config })),
          ...versionedSources.map(version => ({ type: 'version' as const, data: version }))
        ];

        return combinedItems.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                Configured Suppress Operations
              </Typography>
              <Chip
                label={`${combinedItems.length} item${combinedItems.length !== 1 ? 's' : ''}`}
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
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Name / Details</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Input Sources</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Suppress On Fields</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Suppress Sources</TableCell>
                  <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {combinedItems.map((item) => {
                  const isVersion = item.type === 'version';
                  const config = item.type === 'config' ? item.data : null;
                  const version = item.type === 'version' ? item.data : null;

                  return (
                  <TableRow
                    key={isVersion ? version?.id : config?.id}
                    hover
                    sx={{
                      backgroundColor: !isVersion && editingConfigId === config?.id ? 'rgba(248, 113, 113, 0.04)' :
                                       isVersion ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                      '&:hover': {
                        backgroundColor: !isVersion && editingConfigId === config?.id ? 'rgba(248, 113, 113, 0.08)' :
                                         isVersion ? 'rgba(16, 185, 129, 0.06)' : 'rgba(248, 113, 113, 0.04)',
                      },
                    }}
                  >
                    {/* Type Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Chip
                        label={isVersion ? 'Version' : 'Config'}
                        size="small"
                        color={isVersion ? 'success' : 'primary'}
                        sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
                      />
                    </TableCell>

                    {/* Name / Details Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {isVersion ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                          {version?.versionLabel || version?.sourceName || '--'}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Configuration #{configs.indexOf(config!) + 1}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Input Sources Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {isVersion ? (
                        version?.baseInputSources && version.baseInputSources.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${version.baseInputSources.length} source${version.baseInputSources.length !== 1 ? 's' : ''}`}
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
                              {version.baseInputSources.slice(0, 2).map((id: string) => getSourceName(id)).join(', ')}
                              {version.baseInputSources.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            --
                          </Typography>
                        )
                      ) : config && config.inputSources && config.inputSources.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Input Sources ({config.inputSources.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.inputSources.map((id: string) => getSourceName(id)).join(', ')}
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
                              {config.inputSources.slice(0, 2).map((id: string) => getSourceName(id)).join(', ')}
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

                    {/* Suppress On Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {isVersion ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      ) : config && config.suppressOnFields && config.suppressOnFields.length > 0 ? (
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
                      {isVersion ? (
                        version?.operationSources && version.operationSources.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${version.operationSources.length} source${version.operationSources.length !== 1 ? 's' : ''}`}
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
                              {version.operationSources.slice(0, 2).map((id: string) => getSourceName(id)).join(', ')}
                              {version.operationSources.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            --
                          </Typography>
                        )
                      ) : config && config.suppressSources && config.suppressSources.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Suppress Sources ({config.suppressSources.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.suppressSources.map((id: string) => getSourceName(id)).join(', ')}
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
                              {config.suppressSources.slice(0, 2).map((id: string) => getSourceName(id)).join(', ')}
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
                      {isVersion ? (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="View Details" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleViewVersion(version)}
                              sx={{
                                color: '#296695',
                                padding: '3px',
                                '&:hover': {
                                  backgroundColor: 'rgba(41, 102, 149, 0.12)',
                                },
                              }}
                            >
                              <Visibility sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleEditVersion(version)}
                              sx={{
                                color: 'info.main',
                                padding: '3px',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                },
                              }}
                            >
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditConfig(config!)}
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
                            onClick={() => handleDeleteConfig(config!.id)}
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
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        );
      })()}

      {/* Custom Suppress Source Dialog */}
      <SuppressSourceDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSource(null);
        }}
        onSave={editingSource ? handleEditCustomSource : handleAddCustomSource}
        existingSources={customSuppressSources}
        allExistingSources={[...availableInputSources, ...sharedCustomSources]}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        editingSource={editingSource}
      />

      {/* Field Mapping Dialog */}
      <FieldMappingDialog
        open={fieldMappingDialogOpen}
        onClose={() => setFieldMappingDialogOpen(false)}
        onSave={setFieldMappings}
        availableSources={(() => {
          // Helper function to extract all headers including nested fields
          const getAllHeaders = (src: any) => {
            const regularHeaders = src.headers || [];
            const nestedFieldNames: string[] = [];

            // Extract nested fields from configJson.added_fields if they exist
            if (src.configJson?.added_fields) {
              const addedFields = src.configJson.added_fields;
              addedFields.forEach((sourceFields: any) => {
                if (sourceFields.source_name === src.sourceName && sourceFields.fields) {
                  sourceFields.fields.forEach((field: any) => {
                    nestedFieldNames.push(field.field_name);
                  });
                }
              });
            }

            return [...regularHeaders, ...nestedFieldNames];
          };

          // Include sources from earlier workflow steps:
          // 1. All input sources from Input module (Step 1)
          // 2. Custom sources created in Append module (Step 2 - panel2)
          const sources = [
            // All input sources (regular + versioned) - include nested fields
            ...availableInputSources.map(src => ({
              id: src.id,
              name: src.sourceName,
              type: 'input' as const,
              headers: getAllHeaders(src)
            })),
            // Custom sources from Append module (panel2) - include nested fields
            ...sharedCustomSources
              .filter(src => {
                const createdBy = src.createdByModuleId;
                return createdBy && (createdBy === 'panel2' || createdBy.startsWith('panel2_'));
              })
              .map(src => ({
                id: src.id,
                name: src.sourceName,
                type: 'append' as const,
                headers: getAllHeaders(src)
              })),
          ];

          return sources;
        })()}
        initialMappings={fieldMappings}
      />

      {/* View Source Details Dialog */}
      {viewingSource && (
        <Dialog
          open={true}
          onClose={() => setViewingSource(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#296695' }}>
              Suppress Source Details
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Source Name
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewingSource.sourceName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Source Type
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewingSource.sourceType}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Sub Source Type
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewingSource.subSourceType}
                </Typography>
              </Box>
              {viewingSource.fileName && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    File Name
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewingSource.fileName}
                  </Typography>
                </Box>
              )}
              {(viewingSource as any).database && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(viewingSource as any).database}
                  </Typography>
                </Box>
              )}
              {(viewingSource as any).schema && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Schema
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(viewingSource as any).schema}
                  </Typography>
                </Box>
              )}
              {(viewingSource as any).table && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Table
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(viewingSource as any).table}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Columns ({viewingSource.headers?.length || 0})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {viewingSource.headers && viewingSource.headers.length > 0 ? (
                    viewingSource.headers.map((header, index) => (
                      <Chip
                        key={index}
                        label={header}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No columns available
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
            <Button onClick={() => setViewingSource(null)} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* View Version Details Dialog */}
      {viewingVersion && (
        <Dialog
          open={versionViewDialogOpen}
          onClose={() => {
            setVersionViewDialogOpen(false);
            setViewingVersion(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#10B981' }}>
              Version Details
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Version Name
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {viewingVersion.sourceName || viewingVersion.versionLabel}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Module
                </Typography>
                <Chip
                  label={viewingVersion.sourceModule}
                  size="small"
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Input Sources ({viewingVersion.baseInputSources?.length || 0})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {viewingVersion.baseInputSources && viewingVersion.baseInputSources.length > 0 ? (
                    viewingVersion.baseInputSources.map((sourceId: string) => (
                      <Chip
                        key={sourceId}
                        label={getSourceNameById?.(sourceId) || sourceId}
                        size="small"
                        color="primary"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No input sources
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {viewingVersion.sourceModule} Sources ({viewingVersion.operationSources?.length || 0})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {viewingVersion.operationSources && viewingVersion.operationSources.length > 0 ? (
                    viewingVersion.operationSources.map((sourceId: string) => (
                      <Chip
                        key={sourceId}
                        label={getSourceNameById?.(sourceId) || sourceId}
                        size="small"
                        color="success"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No operation sources
                    </Typography>
                  )}
                </Box>
              </Box>
              {viewingVersion.headers && viewingVersion.headers.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Headers ({viewingVersion.headers.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 200, overflowY: 'auto' }}>
                    {viewingVersion.headers.map((header: string, index: number) => (
                      <Chip
                        key={index}
                        label={header}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
            <Button onClick={() => {
              setVersionViewDialogOpen(false);
              setViewingVersion(null);
            }} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Edit Version Modal */}
      <SuppressVersionModal
        open={versionEditDialogOpen}
        onClose={() => {
          setVersionEditDialogOpen(false);
          setEditingVersion(null);
        }}
        version={editingVersion}
        availableInputSources={availableInputSources}
        availableSuppressSources={[...predefinedSources.map(s => ({ id: s.id, name: s.name })), ...sharedCustomSources.map(s => ({ id: s.id, name: s.sourceName }))]}
        onSave={handleSaveVersion}
      />
    </Box>
  );
};

export default SuppressModule;
