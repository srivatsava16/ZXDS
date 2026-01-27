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
  moduleId,
  availableInputSources,
  onCreateVersionedSource,
  initialConfigs,
  apiSources,
  sourcesLoading = false,
  versionedSources = [],
  getSourceNameById,
  onUpdateVersionName,
  onUpdateVersion,
  onDeleteVersion,
  sharedCustomSources = [],
  onAddSharedCustomSource,
  onEditSharedCustomSource,
  onDeleteSharedCustomSource,
  onConfigurationsChange,
  moduleFieldMappings = [],
  onModuleFieldMappingsChange
}) => {
  // Debug logging
  useEffect(() => {
    console.log('[AppendModule] Received props:', {
      availableInputSourcesCount: availableInputSources.length,
      availableInputSources: availableInputSources.map(src => ({
        id: src.id,
        sourceName: src.sourceName,
        isVersioned: src.isVersioned,
        headersCount: src.headers?.length || 0
      })),
      versionedSourcesCount: versionedSources.length
    });
  }, [availableInputSources, versionedSources]);
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
  } = useAppendConfig(initialConfigs, moduleId);

  // Note: Field mappings are now managed at module level, not config level
  const handleEditConfigWithMappings = (config: AppendConfig) => {
    handleEditConfig(config);
    console.log('🔍 [DEBUG - Append Module] Loading config for edit (field mappings are module-level)');
  };

  const handleCancelEditWithMappings = () => {
    handleCancelEdit();
    console.log('🔍 [DEBUG - Append Module] Canceled edit');
  };

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

  // Use shared custom sources from props, excluding Self-type sources
  // Self-type sources are only for internal use within the specific module that created them
  const customAppendSources = sharedCustomSources.filter(source => source.sourceType !== 'Self');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  // Field mappings are now managed at module level via props (moduleFieldMappings)
  const [addedCustomColumns, setAddedCustomColumns] = useState<any[]>([]);

  // Get predefined sources from API or use fallback
  const PREDEFINED_SOURCES = getPredefinedSources(apiSources);

  // Helper function to get all fields for a source
  const getSourceFields = (sourceId: string): string[] => {
    // Check predefined sources
    const predefined = PREDEFINED_SOURCES.find(src => src.id === sourceId);
    if (predefined) {
      return predefined.fields || [];
    }

    // Check custom append sources
    const customSource = customAppendSources.find(src => src.id === sourceId);
    if (customSource) {
      return customSource.selectedHeaders || customSource.headers || [];
    }

    // Check versioned sources and regular input sources
    const versionedSource = availableInputSources.find(src => src.id === sourceId);
    if (versionedSource) {
      return versionedSource.selectedHeaders || versionedSource.headers || [];
    }

    return [];
  };

  // Helper function to check if a source contains all selected match keys
  const sourceHasAllMatchKeys = (sourceId: string): boolean => {
    // If no match keys are selected, all sources are enabled
    if (selectedAppendOnFields.length === 0) {
      return true;
    }

    // Always enable sources that are selected as input sources
    if (selectedInputSources.includes(sourceId)) {
      return true;
    }

    // Get the fields for this source
    const sourceFields = getSourceFields(sourceId);

    // Check if all selected match keys exist in the source fields (case-insensitive)
    return selectedAppendOnFields.every(matchKey =>
      sourceFields.some(field => field.toLowerCase() === matchKey.toLowerCase())
    );
  };

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

  // Auto-deselect append sources that don't have all selected match keys
  useEffect(() => {
    if (selectedAppendOnFields.length > 0 && selectedAppendSources.length > 0) {
      // Filter out sources that don't have all match keys, but keep selected input sources
      const validSources = selectedAppendSources.filter(sourceId => {
        // Always keep selected input sources
        if (selectedInputSources.includes(sourceId)) {
          return true;
        }

        // For other sources, check if they have all match keys
        const sourceFields = getSourceFields(sourceId);
        return selectedAppendOnFields.every(matchKey =>
          sourceFields.some(field => field.toLowerCase() === matchKey.toLowerCase())
        );
      });

      // Update if any sources were filtered out
      if (validSources.length !== selectedAppendSources.length) {
        setSelectedAppendSources(validSources);
        // Also clear append fields since sources changed
        setSelectedAppendFields([]);
      }
    }
  }, [selectedAppendOnFields]); // Only run when match keys change

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
        const mapping = moduleFieldMappings.find(m => {
          return m.selectedColumns.some((col: string) => {
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

  // Handle deletion of append source from priority list
  const handleDeleteAppendSource = (id: string) => {
    const updatedSelection = selectedAppendSources.filter(sourceId => sourceId !== id);
    setSelectedAppendSources(updatedSelection);
    if (updatedSelection.length === 0) {
      setSelectedAppendFields([]);
    }
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
    if (selectedAppendOnFields.length === 0) {
      alert('Please select at least one Match Key field before creating versions');
      return;
    }
    if (selectedAppendFields.length === 0) {
      alert('Please select at least one Field to Append before creating versions');
      return;
    }

    // Create versioned sources (n × m combinations)
    if (onCreateVersionedSource) {
      onCreateVersionedSource(
        'Append',
        selectedInputSources,
        selectedAppendSources,
        selectedAppendOnFields,  // Match Keys
        moduleFieldMappings,  // Module-level field mappings
        selectedAppendFields  // Fields to Append
      );
    }
  };

  // Filter self-append sources from shared custom sources
  const selfAppendSources = sharedCustomSources.filter(source => source.sourceType === 'Self');

  // Combine configurations, versions, and self-append sources for unified display
  // Sort by creation time to show items in the order they were created
  const combinedItems = [
    ...configs.map(config => ({ type: 'config' as const, data: config, createdAt: config.createdAt || 0 })),
    ...versionedSources.map(version => ({ type: 'version' as const, data: version, createdAt: version.createdAt || 0 })),
    ...selfAppendSources.map(selfSource => ({ type: 'self' as const, data: selfSource, createdAt: (selfSource as any).createdAt || 0 }))
  ].sort((a, b) => a.createdAt - b.createdAt);



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
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block !important', mt: 0.5 }}>
              Editing existing configuration - make changes and click Update
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AccountTree />}
            onClick={() => {
              console.log('🔍 [DEBUG - Append Module] Step 0: Configure Field Mapping button clicked, current moduleFieldMappings =', moduleFieldMappings);
              setFieldMappingDialogOpen(true);
            }}
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
            {moduleFieldMappings.length > 0 && (
              <Chip
                label={moduleFieldMappings.length}
                size="small"
                sx={{
                  ml: 1,
                  height: '18px !important',
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
              onClick={() => {
                console.log('[AppendModule] Opening Add Custom Append Source dialog, availableInputSources:',
                  availableInputSources.map(src => ({
                    id: src.id,
                    sourceName: src.sourceName,
                    isVersioned: src.isVersioned,
                    headersCount: src.headers?.length || 0,
                    headers: src.headers
                  }))
                );
                setDialogOpen(true);
              }}
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
            <Tooltip title="Create Version" arrow>
              <span>
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
                  }}
                >
                  <AccountTree fontSize="small" />
                </IconButton>
              </span>
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
                  height: '24px !important',
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5, alignItems: 'center' }}>
                      {selected.map((value) => (
                        <Tooltip key={value} title={getSourceName(value)} arrow>
                          <Chip
                            label={getSourceName(value)}
                            size="small"
                            color="primary"
                            sx={{
                              maxWidth: '150px !important',
                              minWidth: '50px',
                              height: '20px !important',
                              fontSize: '0.7rem',
                              overflow: 'hidden !important',
                              flexShrink: '0 !important',
                              '& .MuiChip-label': {
                                display: 'block !important',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                                paddingLeft: '8px !important',
                                paddingRight: '8px !important',
                                textAlign: 'left !important',
                                direction: 'ltr !important',
                              }
                            }}
                          />
                        </Tooltip>
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
                  height: '24px !important',
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5, alignItems: 'center' }}>
                      {selected.map((value) => (
                        <Tooltip key={value} title={value} arrow>
                          <Chip
                            label={value}
                            size="small"
                            color="info"
                            sx={{
                              maxWidth: '150px !important',
                              minWidth: '50px',
                              height: '20px !important',
                              fontSize: '0.7rem',
                              overflow: 'hidden !important',
                              flexShrink: '0 !important',
                              '& .MuiChip-label': {
                                display: 'block !important',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                                paddingLeft: '8px !important',
                                paddingRight: '8px !important',
                                textAlign: 'left !important',
                                direction: 'ltr !important',
                              }
                            }}
                          />
                        </Tooltip>
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
                  height: '24px !important',
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
                    // Only select sources that have all match keys (enabled sources)
                    const enabledSources = filteredAppendSources.filter(s => sourceHasAllMatchKeys(s.id));
                    if (selectedAppendSources.length === enabledSources.length) {
                      setSelectedAppendSources([]);
                      setSelectedAppendFields([]);
                    } else {
                      setSelectedAppendSources(enabledSources.map(s => s.id));
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5, alignItems: 'center' }}>
                      {selected.map((value) => (
                        <Tooltip key={value} title={getSourceName(value)} arrow>
                          <Chip
                            label={getSourceName(value)}
                            size="small"
                            color="success"
                            sx={{
                              maxWidth: '150px !important',
                              minWidth: '50px',
                              height: '20px !important',
                              fontSize: '0.7rem',
                              color: '#fff',
                              overflow: 'hidden !important',
                              flexShrink: '0 !important',
                              '& .MuiChip-label': {
                                display: 'block !important',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                                paddingLeft: '8px !important',
                                paddingRight: '8px !important',
                                textAlign: 'left !important',
                                direction: 'ltr !important',
                              }
                            }}
                          />
                        </Tooltip>
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
                {filteredAppendSources.length > 0 && (() => {
                  // Only count enabled sources for Select All
                  const enabledSources = filteredAppendSources.filter(s => sourceHasAllMatchKeys(s.id));
                  return enabledSources.length > 0 ? (
                    <MenuItem
                      value="select-all-append-sources"
                      sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                    >
                      <Checkbox
                        checked={
                          enabledSources.length > 0 &&
                          enabledSources.every(src => selectedAppendSources.includes(src.id))
                        }
                        indeterminate={
                          enabledSources.some(src => selectedAppendSources.includes(src.id)) &&
                          !enabledSources.every(src => selectedAppendSources.includes(src.id))
                        }
                        size="small"
                      />
                      <ListItemText primary="Select All (Enabled)" />
                    </MenuItem>
                  ) : null;
                })()}
                {filteredAppendSources.map((source) => {
                  const isCustomSource = customAppendSources.some(cs => cs.id === source.id);
                  const hasAllMatchKeys = sourceHasAllMatchKeys(source.id);
                  const isDisabled = !hasAllMatchKeys;
                  const sourceFields = getSourceFields(source.id);

                  return (
                    <MenuItem
                      key={source.id}
                      value={source.id}
                      disabled={isDisabled}
                      sx={isDisabled ? {
                        opacity: 0.5,
                        cursor: 'not-allowed',
                        '&:hover': {
                          backgroundColor: 'transparent'
                        }
                      } : {}}
                    >
                      <Checkbox
                        checked={selectedAppendSources.indexOf(source.id) > -1}
                        size="small"
                        disabled={isDisabled}
                      />
                      <ListItemText
                        primary={source.name}
                        secondary={isDisabled ? 'Missing required match keys' : undefined}
                        secondaryTypographyProps={{ sx: { fontSize: '0.65rem', color: 'error.main' } }}
                      />
                      {/* View Fields Icon */}
                      <Box
                        sx={{
                          pointerEvents: 'auto', // Allow interaction even when MenuItem is disabled
                        }}
                      >
                        <Tooltip
                          title={
                            sourceFields.length > 0 ? (
                              <Box sx={{ maxWidth: 400 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Available Fields ({sourceFields.length}):
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 300, overflowY: 'auto' }}>
                                  {sourceFields.map((field, idx) => (
                                    <Chip
                                      key={idx}
                                      label={field}
                                      size="small"
                                      sx={{
                                        backgroundColor: selectedAppendOnFields.includes(field) ? '#10B98120' : '#E5E7EB',
                                        color: selectedAppendOnFields.includes(field) ? '#10B981' : '#374151',
                                        border: selectedAppendOnFields.includes(field) ? '1px solid #10B981' : '1px solid transparent',
                                        fontSize: '0.65rem',
                                        height: '20px',
                                        fontWeight: selectedAppendOnFields.includes(field) ? 600 : 400,
                                      }}
                                    />
                                  ))}
                                </Box>
                                {selectedAppendOnFields.length > 0 && (
                                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: '#9CA3AF' }}>
                                    Green = Match keys present
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              'No fields available'
                            )
                          }
                          arrow
                          placement="left"
                          enterDelay={200}
                          PopperProps={{
                            sx: {
                              '& .MuiTooltip-tooltip': {
                                maxWidth: 450,
                              }
                            }
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              color: isDisabled ? '#9CA3AF' : '#296695',
                              padding: '4px',
                              pointerEvents: 'auto', // Ensure icon can be clicked even when parent is disabled
                              '&:hover': {
                                backgroundColor: isDisabled ? 'rgba(156, 163, 175, 0.08)' : 'rgba(41, 102, 149, 0.08)',
                              },
                            }}
                          >
                            <Visibility sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
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
                onDelete={handleDeleteAppendSource}
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
                  height: '24px !important',
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5, alignItems: 'center' }}>
                      {selected.map((value) => (
                        <Tooltip key={value} title={value} arrow>
                          <Chip
                            label={value}
                            size="small"
                            color="warning"
                            sx={{
                              maxWidth: '150px !important',
                              minWidth: '50px',
                              height: '20px !important',
                              fontSize: '0.7rem',
                              color: '#fff',
                              overflow: 'hidden !important',
                              flexShrink: '0 !important',
                              '& .MuiChip-label': {
                                display: 'block !important',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                                paddingLeft: '8px !important',
                                paddingRight: '8px !important',
                                textAlign: 'left !important',
                                direction: 'ltr !important',
                              }
                            }}
                          />
                        </Tooltip>
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
              onClick={() => {
                console.log('🔍 [DEBUG - Append Module] Step 6: Add/Update config button clicked (field mappings are module-level)');
                handleAddOrUpdateConfig();
              }}
              sx={{
                width: 48,
                height: '48px !important',
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
              {selfAppendSources.length > 0 && (
                <Chip
                  label={`${selfAppendSources.length} self source${selfAppendSources.length !== 1 ? 's' : ''}`}
                  size="small"
                  color="secondary"
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
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Match Keys</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Append Sources</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Fields to Append</TableCell>
                  <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {combinedItems.map((item) => {
                  const isVersion = item.type === 'version';
                  const isSelf = item.type === 'self';
                  const config = item.type === 'config' ? item.data : null;
                  const version = item.type === 'version' ? item.data : null;
                  const selfSource = item.type === 'self' ? item.data : null;

                  return (
                  <TableRow
                    key={isSelf ? selfSource?.id : isVersion ? version?.id : config?.id}
                    hover
                    sx={{
                      backgroundColor: isSelf ? 'rgba(156, 39, 176, 0.02)' :
                                       !isVersion && editingConfigId === config?.id ? 'rgba(41, 102, 149, 0.04)' :
                                       isVersion ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                      '&:hover': {
                        backgroundColor: isSelf ? 'rgba(156, 39, 176, 0.06)' :
                                         !isVersion && editingConfigId === config?.id ? 'rgba(41, 102, 149, 0.08)' :
                                         isVersion ? 'rgba(16, 185, 129, 0.06)' : 'rgba(41, 102, 149, 0.04)',
                      },
                    }}
                  >
                    {/* Type Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Chip
                        label={isSelf ? 'Self' : isVersion ? 'Version' : 'Config'}
                        size="small"
                        color={isSelf ? 'secondary' : isVersion ? 'success' : 'primary'}
                        sx={{ fontWeight: 600, height: '22px !important', fontSize: '0.7rem' }}
                      />
                    </TableCell>

                    {/* Name / Details Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      {isSelf ? (
                        <Tooltip title={selfSource?.sourceName || '--'} arrow placement="top">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {selfSource?.sourceName || '--'}
                          </Typography>
                        </Tooltip>
                      ) : isVersion ? (
                        <Tooltip title={version?.versionLabel || version?.sourceName || '--'} arrow placement="top">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {version?.versionLabel || version?.sourceName || '--'}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Configuration #{configs.indexOf(config!) + 1}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Input Sources Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      {isSelf ? (
                        selfSource?.selfConfig?.input_source_names && selfSource.selfConfig.input_source_names.length > 0 ? (
                          <Tooltip
                            title={
                              <Box sx={{ maxWidth: 400 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Input Sources ({selfSource.selfConfig.input_source_names.length}):
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  {selfSource.selfConfig.input_source_names.join(', ')}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                              <Chip
                                label={`${selfSource.selfConfig.input_source_names.length} source${selfSource.selfConfig.input_source_names.length !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                  backgroundColor: '#9C27B020',
                                  color: '#9C27B0',
                                  border: '1px solid #9C27B040',
                                  fontWeight: 600,
                                  height: '20px !important',
                                  fontSize: '0.65rem',
                                  flexShrink: 0,
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
                                  minWidth: 0,
                                }}
                              >
                                {selfSource.selfConfig.input_source_names.join(', ')}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            --
                          </Typography>
                        )
                      ) : isVersion ? (
                        version?.baseInputSources && version.baseInputSources.length > 0 ? (
                          <Tooltip
                            title={
                              <Box sx={{ maxWidth: 400 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Input Sources ({version.baseInputSources.length}):
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  {version.baseInputSources.map((id: string) => getSourceName(id)).join(', ')}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                              <Chip
                                label={`${version.baseInputSources.length} source${version.baseInputSources.length !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                  backgroundColor: '#29669520',
                                  color: '#296695',
                                  border: '1px solid #29669540',
                                  fontWeight: 600,
                                  height: '20px !important',
                                  fontSize: '0.65rem',
                                  flexShrink: 0,
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
                                  minWidth: 0,
                                }}
                              >
                                {version.baseInputSources.map((id: string) => getSourceName(id)).join(', ')}
                              </Typography>
                            </Box>
                          </Tooltip>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                            <Chip
                              label={`${config.inputSources.length} source${config.inputSources.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#29669520',
                                color: '#296695',
                                border: '1px solid #29669540',
                                fontWeight: 600,
                                height: '20px !important',
                                fontSize: '0.65rem',
                                flexShrink: 0,
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
                                minWidth: 0,
                              }}
                            >
                              {config.inputSources.map((id: string) => getSourceName(id)).join(', ')}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Match Keys Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      {isSelf ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      ) : isVersion ? (
                        version?.operationFields && version.operationFields.length > 0 ? (
                          <Tooltip
                            title={
                              <Box sx={{ maxWidth: 400 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Match Keys ({version.operationFields.length}):
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  {version.operationFields.join(', ')}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                              <Chip
                                label={`${version.operationFields.length} field${version.operationFields.length !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                  backgroundColor: '#0EA5E920',
                                  color: '#0EA5E9',
                                  border: '1px solid #0EA5E940',
                                  fontWeight: 600,
                                  height: '20px !important',
                                  fontSize: '0.65rem',
                                  flexShrink: 0,
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
                                  minWidth: 0,
                                }}
                              >
                                {version.operationFields.join(', ')}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            --
                          </Typography>
                        )
                      ) : config && config.appendOnFields && config.appendOnFields.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Match Keys ({config.appendOnFields.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.appendOnFields.join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                            <Chip
                              label={`${config.appendOnFields.length} field${config.appendOnFields.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#0EA5E920',
                                color: '#0EA5E9',
                                border: '1px solid #0EA5E940',
                                fontWeight: 600,
                                height: '20px !important',
                                fontSize: '0.65rem',
                                flexShrink: 0,
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
                                minWidth: 0,
                              }}
                            >
                              {config.appendOnFields.join(', ')}
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
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      {isSelf ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      ) : isVersion ? (
                        version?.operationSources && version.operationSources.length > 0 ? (
                          <Tooltip
                            title={
                              <Box sx={{ maxWidth: 400 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Append Sources ({version.operationSources.length}):
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  {version.operationSources.map((id: string) => getSourceName(id)).join(', ')}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                              <Chip
                                label={`${version.operationSources.length} source${version.operationSources.length !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                  backgroundColor: '#10B98120',
                                  color: '#10B981',
                                  border: '1px solid #10B98140',
                                  fontWeight: 600,
                                  height: '20px !important',
                                  fontSize: '0.65rem',
                                  flexShrink: 0,
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
                                  minWidth: 0,
                                }}
                              >
                                {version.operationSources.map((id: string) => getSourceName(id)).join(', ')}
                              </Typography>
                            </Box>
                          </Tooltip>
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
                                Append Sources ({config.appendSources.length} - Priority Order):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.appendSources.map((id: string, idx: number) => `${idx + 1}. ${getSourceName(id)}`).join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                            <Chip
                              label={`${config.appendSources.length} source${config.appendSources.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#10B98120',
                                color: '#10B981',
                                border: '1px solid #10B98140',
                                fontWeight: 600,
                                height: '20px !important',
                                fontSize: '0.65rem',
                                flexShrink: 0,
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
                                minWidth: 0,
                              }}
                            >
                              {config.appendSources.map((id: string) => getSourceName(id)).join(', ')}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Fields to Append Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {isSelf ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      ) : isVersion ? (
                        version?.appendFields && version.appendFields.length > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${version.appendFields.length} field${version.appendFields.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#F59E0B20',
                                color: '#F59E0B',
                                border: '1px solid #F59E0B40',
                                fontWeight: 600,
                                height: '20px !important',
                                fontSize: '0.65rem',
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: '0.7rem',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                              }}
                            >
                              {version.appendFields.slice(0, 2).join(', ')}
                              {version.appendFields.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            --
                          </Typography>
                        )
                      ) : config && config.appendFields && config.appendFields.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block !important', mb: 0.5 }}>
                                Fields to Append ({config.appendFields.length}):
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
                                height: '20px !important',
                                fontSize: '0.65rem',
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: '0.7rem',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
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
                      {isSelf ? (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Edit" arrow>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingSource(selfSource);
                                setDialogOpen(true);
                              }}
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
                          <Tooltip title="Delete" arrow>
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the self append source "${selfSource?.sourceName}"?`)) {
                                  if (onDeleteSharedCustomSource && selfSource?.id) {
                                    onDeleteSharedCustomSource(selfSource.id);
                                  }
                                }
                              }}
                              sx={{
                                color: 'error.main',
                                padding: '3px',
                                '&:hover': {
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                },
                              }}
                            >
                              <Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : isVersion ? (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
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
                          <Tooltip title="Delete" arrow>
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete version "${version?.versionLabel || version?.sourceName}"? This action cannot be undone.`)) {
                                  // Call delete handler if available
                                  if (onDeleteVersion) {
                                    onDeleteVersion(version.id);
                                  }
                                }
                              }}
                              sx={{
                                color: 'error.main',
                                padding: '3px',
                                '&:hover': {
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                },
                              }}
                            >
                              <Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditConfigWithMappings(config!)}
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

      {/* Custom Append Sources List */}
      {customAppendSources.length > 0 && (
        <Box sx={{ mt: 4, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
              Configured Custom Append Sources
            </Typography>
            <Chip
              label={`${customAppendSources.length} custom source${customAppendSources.length !== 1 ? 's' : ''}`}
              size="small"
              color="secondary"
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
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Source Name</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Fields</TableCell>
                  <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customAppendSources.map((customSource) => (
                  <TableRow
                    key={customSource.id}
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(156, 39, 176, 0.04)',
                      },
                    }}
                  >
                    {/* Source Name Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Tooltip title={customSource.sourceName} arrow placement="top">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 250,
                          }}
                        >
                          {customSource.sourceName}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    {/* Type Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Chip
                        label={customSource.sourceType}
                        size="small"
                        color="secondary"
                        sx={{ fontWeight: 600, height: '22px !important', fontSize: '0.7rem' }}
                      />
                    </TableCell>

                    {/* Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {customSource.selectedHeaders && customSource.selectedHeaders.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Fields ({customSource.selectedHeaders.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {customSource.selectedHeaders.join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Chip
                            label={`${customSource.selectedHeaders.length} field${customSource.selectedHeaders.length !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                              backgroundColor: '#9C27B020',
                              color: '#9C27B0',
                              border: '1px solid #9C27B040',
                              fontWeight: 600,
                              height: '20px !important',
                              fontSize: '0.65rem',
                            }}
                          />
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
                        <Tooltip title="Edit Source" arrow>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingSource(customSource);
                              setDialogOpen(true);
                            }}
                            sx={{
                              color: 'warning.main',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 152, 0, 0.08)',
                              },
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Source" arrow>
                          <IconButton
                            size="small"
                            onClick={() => onDeleteSharedCustomSource?.(customSource.id)}
                            sx={{
                              color: 'error.main',
                              '&:hover': {
                                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                              },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
        appendConfigs={configs}
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
        onSave={(mappings) => {
          console.log('🔍 [DEBUG - Append Module] Step 5: Received mappings from dialog =', mappings);
          if (onModuleFieldMappingsChange) {
            onModuleFieldMappingsChange(mappings);
          }
        }}
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
        initialMappings={moduleFieldMappings}
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
        availableAppendSources={[
          ...PREDEFINED_SOURCES.map(s => ({ id: s.id, name: s.name, fields: s.fields })),
          ...customAppendSources.map(s => ({ id: s.id, name: s.sourceName, fields: s.selectedHeaders || s.headers || [] })),
          ...availableInputSources.filter(src => src.isVersioned).map(s => ({ id: s.id, name: s.sourceName, fields: s.selectedHeaders || s.headers || [] }))
        ]}
        apiSources={apiSources}
        allExistingSources={[...availableInputSources, ...(sharedCustomSources || [])]}
        onSave={handleSaveVersion}
      />

    </Box>
  );
};

export default AppendModule;
