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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
} from '@mui/material';
import { Add, Delete, Edit, AccountTree, Visibility } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import AppendSourceDialog from './AppendSourceDialog';
import DraggableAppendSources from './DraggableAppendSources';
import AddColumnDialog from './AddColumnDialog';
import FieldMappingDialog, { type FieldMapping } from './FieldMappingDialog';
import AppendVersionModal from './AppendVersionModal';

// Extracted modules
import type { AppendConfig, AppendModuleProps } from './types';
import { getPredefinedSources } from './utils/appendHelpers';
import { useAppendConfig } from './hooks/useAppendConfig';

export type { AppendConfig };

const AppendModule: React.FC<AppendModuleProps> = ({
  availableInputSources,
  onCreateVersionedSource,
  initialConfigs,
  apiSources,
  sourcesLoading = false,
  versionedSources = [],
  getSourceNameById,
  onUpdateVersionName,
  onUpdateVersion,
  sharedCustomSources = [],
  onAddSharedCustomSource,
  onEditSharedCustomSource,
  onDeleteSharedCustomSource,
  onConfigurationsChange
}) => {
  // Use custom hooks for state management
  const {
    configs,
    editingConfigId,
    selectedInputSources,
    selectedAppendOnFields,
    selectedAppendSources,
    selectedAppendFields,
    setConfigs,
    setSelectedInputSources,
    setSelectedAppendOnFields,
    setSelectedAppendSources,
    setSelectedAppendFields,
    handleAddOrUpdateConfig,
    handleEditConfig,
    handleCancelEdit,
    handleDeleteConfig,
  } = useAppendConfig(initialConfigs);

  // Use shared custom sources from props instead of local state
  const [editingSource, setEditingSource] = useState<InputSource | null>(null);
  const [viewingSource, setViewingSource] = useState<InputSource | null>(null);

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
      const updatedSource = { ...source, id: editingSource.id };
      onEditSharedCustomSource(updatedSource);
    }
    setEditingSource(null);
  };

  // Note: handleDeleteCustomSource is available but not currently wired to UI
  // Uncomment when delete UI is implemented
  // const handleDeleteCustomSource = (id: string) => {
  //   if (onDeleteSharedCustomSource) {
  //     onDeleteSharedCustomSource(id);
  //   }
  // };

  // Use shared custom sources from props
  const customAppendSources = sharedCustomSources;

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [addedCustomColumns, setAddedCustomColumns] = useState<any[]>([]);

  // Get predefined sources from API or use fallback
  const PREDEFINED_SOURCES = getPredefinedSources(apiSources);

  // Load initial configurations if provided (for edit mode)
  useEffect(() => {
    if (initialConfigs && initialConfigs?.length > 0) {
      setConfigs(initialConfigs);
    }
  }, [initialConfigs, setConfigs]);

  // Notify parent component when configurations change (for dependency validation)
  useEffect(() => {
    if (onConfigurationsChange) {
      onConfigurationsChange(configs);
    }
  }, [configs, onConfigurationsChange]);

  // Search states for each dropdown
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [appendOnFieldsSearch, setAppendOnFieldsSearch] = useState('');
  const [appendSourcesSearch, setAppendSourcesSearch] = useState('');
  const [appendFieldsSearch, setAppendFieldsSearch] = useState('');

  // Get common or all fields based on input source selection, with field mappings applied
  const getAppendOnFields = (sourceIds: string[]): string[] => {
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) return [];

    const selectedSources = availableInputSources.filter(src => sourceIds.includes(src.id));

    if (selectedSources.length === 0) return [];

    // Build a map of original field -> mapped field name (or original if no mapping)
    const fieldsMap = new Map<string, string>();

    selectedSources.forEach(source => {
      const headers = source?.selectedHeaders || source?.headers || [];

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

    // If multiple sources, return common fields (intersection) - considering mapped names
    // Group fields by their display name (mapped or original)
    const fieldNameOccurrences = new Map<string, number>();

    fieldsMap.forEach((displayName) => {
      fieldNameOccurrences.set(displayName, (fieldNameOccurrences.get(displayName) || 0) + 1);
    });

    // Return fields that appear in all sources
    const commonFields: string[] = [];
    fieldNameOccurrences.forEach((count, fieldName) => {
      if (count === selectedSources.length) {
        commonFields.push(fieldName);
      }
    });

    return commonFields;
  };

  // Get common fields (intersection) from all append sources
  const getAppendFields = (appendSourceIds: string[]): string[] => {
    if (appendSourceIds.length === 0) return [];

    // Helper function to get fields from a source
    const getFieldsFromSource = (sourceId: string): string[] => {
      const predefined = PREDEFINED_SOURCES.find(src => src.id === sourceId);
      if (predefined) {
        return predefined.fields;
      }

      const customSource = customAppendSources.find(src => src.id === sourceId);
      if (customSource?.selectedHeaders || customSource?.headers) {
        return customSource.selectedHeaders || customSource.headers || [];
      }

      const versionedSource = availableInputSources.find(src => src.id === sourceId);
      if (versionedSource?.selectedHeaders || versionedSource?.headers) {
        return versionedSource.selectedHeaders || versionedSource.headers || [];
      }

      return [];
    };

    // Get fields from the first source
    const firstSourceFields = getFieldsFromSource(appendSourceIds[0]);

    // If only one source, return all its fields
    if (appendSourceIds.length === 1) {
      return firstSourceFields;
    }

    // For multiple sources, return only common fields (intersection)
    const commonFields = firstSourceFields.filter(field => {
      // Check if this field exists in all other sources
      return appendSourceIds.slice(1).every(sourceId => {
        const sourceFields = getFieldsFromSource(sourceId);
        return sourceFields.includes(field);
      });
    });

    return commonFields;
  };

  // Handle reordering of append sources via drag-and-drop
  const handleReorderAppendSources = (newOrder: string[]) => {
    setSelectedAppendSources(newOrder);
  };

  // Version menu state
  const [versionMenuAnchorEl, setVersionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const versionMenuOpen = Boolean(versionMenuAnchorEl);

  const handleCreateVersion = () => {
    // Close menu first
    setVersionMenuAnchorEl(null);
    
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
        selectedAppendOnFields,
        fieldMappings
      );
    }
  };

  const handleVersionMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setVersionMenuAnchorEl(event.currentTarget);
  };

  const handleVersionMenuClose = () => {
    setVersionMenuAnchorEl(null);
  };

  // Combine configurations and versions for unified display
  const combinedItems = [
    ...configs.map(config => ({ type: 'config' as const, data: config })),
    ...versionedSources.map(version => ({ type: 'version' as const, data: version }))
  ];



  const handleAddColumns = (columns: any[]) => {
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
  const localVersionedSources = availableInputSources.filter(src =>
    src.isVersioned === true
  );

  // Extract regular input sources (non-versioned)
  const regularInputSources = availableInputSources.filter(src =>
    !src.isVersioned
  );

  const allAppendSources = [
    ...PREDEFINED_SOURCES.map(src => ({ id: src?.id, name: src?.name })),
    ...customAppendSources.map(src => ({ id: src?.id, name: src?.sourceName })),
    ...localVersionedSources.map(src => ({ id: src?.id, name: src?.sourceName })),
    ...regularInputSources.map(src => ({ id: src?.id, name: src?.sourceName })),
  ];

  // Filtered lists based on search queries
  const filteredInputSources = availableInputSources.filter(source =>
    source?.sourceName?.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  // Debug logging
  if (editingConfigId) {
    console.log('[AppendModule] Dropdown state:', {
      editingConfigId,
      selectedInputSources,
      availableInputSourcesCount: availableInputSources.length,
      availableInputSourcesIds: availableInputSources.map(s => ({ id: s.id, name: s.sourceName })),
      filteredInputSourcesCount: filteredInputSources.length
    });
  }

  const filteredAppendOnFields = appendOnFields.filter(field =>
    field.toLowerCase().includes(appendOnFieldsSearch.toLowerCase())
  );

  const filteredAppendSources = allAppendSources.filter(source =>
    source?.name && typeof source.name === 'string' && 
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
            <Tooltip title="Version Actions" arrow>
              <IconButton
                size="small"
                onClick={handleVersionMenuOpen}
                sx={{
                  color: '#296695',
                  border: '2px solid #296695',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(41, 102, 149, 0.08)',
                    borderColor: '#1e4d6f',
                  },
                }}
              >
                <AccountTree fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={versionMenuAnchorEl}
              open={versionMenuOpen}
              onClose={handleVersionMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
            >
              <MenuItem 
                onClick={handleCreateVersion}
                disabled={!onCreateVersionedSource}
              >
                <AccountTree sx={{ fontSize: 16, mr: 1 }} />
                Create Version
              </MenuItem>
            </Menu>
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
                {filteredAppendSources.map((source) => {
                  const isCustomSource = customAppendSources.some(cs => cs.id === source.id);
                  return (
                    <MenuItem key={source.id} value={source.id}>
                      <Checkbox checked={selectedAppendSources.indexOf(source.id) > -1} size="small" />
                      <ListItemText primary={source.name} />
                      {isCustomSource && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details" arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                const customSource = customAppendSources.find(cs => cs.id === source.id);
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
                                const customSource = customAppendSources.find(cs => cs.id === source.id);
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
              onClick={() => handleAddOrUpdateConfig(fieldMappings)}
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

      {/* Configurations and Versions List */}
      {combinedItems.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
              Configured Append Operations & Versions
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={`${configs.length} configuration${configs.length !== 1 ? 's' : ''}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
              {versionedSources.length > 0 && (
                <Chip
                  label={`${versionedSources.length} version${versionedSources.length !== 1 ? 's' : ''}`}
                  size="small"
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>
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
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Append On Fields</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Append Sources</TableCell>
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
                      backgroundColor: !isVersion && editingConfigId === config?.id ? 'rgba(41, 102, 149, 0.04)' :
                                       isVersion ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                      '&:hover': {
                        backgroundColor: !isVersion && editingConfigId === config?.id ? 'rgba(41, 102, 149, 0.08)' :
                                         isVersion ? 'rgba(16, 185, 129, 0.06)' : 'rgba(41, 102, 149, 0.04)',
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

                    {/* Append On Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {isVersion ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      ) : config && config.appendOnFields && config.appendOnFields.length > 0 ? (
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
                      {isVersion ? (
                        version?.operationSources && version.operationSources.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${version.operationSources.length} source${version.operationSources.length !== 1 ? 's' : ''}`}
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
                              {version.operationSources.slice(0, 2).map((id: string) => getSourceName(id)).join(', ')}
                              {version.operationSources.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            --
                          </Typography>
                        )
                      ) : config && config.appendSources && config.appendSources.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Append Sources (Priority Order):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.appendSources.map((id: string, idx: number) => `${idx + 1}. ${getSourceName(id)}`).join(', ')}
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
                              {config.appendSources.slice(0, 2).map((id: string) => getSourceName(id)).join(', ')}
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
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Custom Append Source Dialog */}
      <AppendSourceDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSource(null);
        }}
        onSave={editingSource ? handleEditCustomSource : handleAddCustomSource}
        availableInputSources={availableInputSources}
        allExistingSources={[...availableInputSources, ...(sharedCustomSources || [])]}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        editingSource={editingSource}
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
        onSave={setFieldMappings}
        availableSources={(() => {
          // Only include input sources from Input module (regular + versioned)
          // Do NOT include append sources, predefined sources, or custom append sources
          const sources = availableInputSources.map(src => {
            // Get regular headers
            const regularHeaders = src.headers || [];

            // Extract nested fields from configJson.added_fields if they exist
            const nestedFieldNames: string[] = [];
            if ((src as any).configJson?.added_fields) {
              const addedFields = (src as any).configJson.added_fields;
              addedFields.forEach((sourceFields: any) => {
                // Only include nested fields for this specific source
                if (sourceFields.source_name === src.sourceName && sourceFields.fields) {
                  sourceFields.fields.forEach((field: any) => {
                    nestedFieldNames.push(field.field_name);
                  });
                }
              });
            }

            // Combine regular headers with nested field names
            const allHeaders = [...regularHeaders, ...nestedFieldNames];

            return {
              id: src.id,
              name: src.sourceName,
              type: 'input' as const,
              headers: allHeaders
            };
          });

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
              Append Source Details
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
              {viewingSource?.database && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewingSource.database}
                  </Typography>
                </Box>
              )}
              {viewingSource?.schema && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Schema
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewingSource.schema}
                  </Typography>
                </Box>
              )}
              {viewingSource?.table && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Table
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewingSource.table}
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
                        label={getSourceName(sourceId)}
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
                        label={getSourceName(sourceId)}
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
      <AppendVersionModal
        open={versionEditDialogOpen}
        onClose={() => {
          setVersionEditDialogOpen(false);
          setEditingVersion(null);
        }}
        version={editingVersion}
        availableInputSources={availableInputSources}
        availableAppendSources={[...PREDEFINED_SOURCES, ...customAppendSources.map(s => ({ id: s.id, name: s.sourceName }))]}
        onSave={handleSaveVersion}
      />

    </Box>
  );
};

export default AppendModule;
