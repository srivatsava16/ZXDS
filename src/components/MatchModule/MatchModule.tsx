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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormGroup,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add, Delete, Edit, AccountTree, Visibility } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import MatchSourceDialog from './MatchSourceDialog';
import DraggableMatchSources from './DraggableMatchSources';
import FieldMappingDialog, { type FieldMapping } from '../AppendModule/FieldMappingDialog';
import MatchVersionModal from './MatchVersionModal';

// Extracted modules
import type { MatchConfig, MatchModuleProps } from './types';
import { getPredefinedSources, getMatchOnFields, getAddFieldsFromMatchSources } from './utils/matchHelpers';
import { useMatchConfig } from './hooks/useMatchConfig';
import MatchConfigHeader from './components/MatchConfigHeader';
import ViewSourceDialog from './components/ViewSourceDialog';

export type { MatchConfig };

const MatchModule: React.FC<MatchModuleProps> = ({
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
  appendConfigurations = [],
  moduleFieldMappings = [],
  onModuleFieldMappingsChange
}) => {
  // Use custom hooks for state management
  const matchConfig = useMatchConfig(initialConfigs);

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
  const customSources = {
    customMatchSources: sharedCustomSources,
    editingSource,
    viewingSource,
    setEditingSource,
    setViewingSource,
    handleAddCustomSource,
    handleEditCustomSource,
    handleDeleteCustomSource
  };

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  // Use module-level field mappings from props instead of local state
  const fieldMappings = moduleFieldMappings;
  const setFieldMappings = (mappings: any[]) => {
    if (onModuleFieldMappingsChange) {
      onModuleFieldMappingsChange(mappings);
    }
  };

  // Wrapper functions to handle fieldMappings state along with hook state
  const handleEditConfigWithMappings = (config: MatchConfig) => {
    matchConfig.handleEditConfig(config);
    // Don't load config's field mappings - field mappings are module-level, not config-level
    // All configs/versions use the same module-level field mappings
  };

  const handleCancelEditWithMappings = () => {
    matchConfig.handleCancelEdit();
    // Don't reset field mappings - they are module-level and persist across all configs
  };

  // Get predefined sources from API or use fallback
  const predefinedSources = getPredefinedSources(apiSources);

  // Helper function to get all fields for a match source
  const getMatchSourceFields = (sourceId: string): string[] => {
    // Check if it's a predefined match source (from API)
    if (sourceId.startsWith('match_')) {
      const tableId = parseInt(sourceId.replace('match_', ''));
      const matchTable = apiSources?.dbSource?.preconfiguredTables?.match?.find(
        table => table.tableId === tableId
      );
      if (matchTable?.columns) {
        return matchTable.columns.map(col => col.name);
      }
      return [];
    }

    // Check custom match sources
    const customSource = customSources.customMatchSources.find((src: any) => src.id === sourceId);
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

  // Helper function to check if a source contains all selected match on fields
  const sourceHasAllMatchOnFields = (sourceId: string): boolean => {
    // If no match on fields are selected, all sources are enabled
    if (matchConfig.selectedMatchOnFields.length === 0) {
      return true;
    }

    // Always enable sources that are selected as input sources
    if (matchConfig.selectedInputSources.includes(sourceId)) {
      return true;
    }

    // Get the fields for this source
    const sourceFields = getMatchSourceFields(sourceId);

    // If source has no fields (couldn't retrieve from API or custom sources), disable it
    if (sourceFields.length === 0) {
      return false;
    }

    // Check if all selected match on fields exist in the source fields (case-insensitive)
    return matchConfig.selectedMatchOnFields.every(matchKey =>
      sourceFields.some(field => field.toLowerCase() === matchKey.toLowerCase())
    );
  };

  // Load initial configurations if provided (for edit mode)
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      matchConfig.setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Notify parent component when configurations change (for dependency validation)
  useEffect(() => {
    if (onConfigurationsChange) {
      onConfigurationsChange(matchConfig.configs);
    }
  }, [matchConfig.configs, onConfigurationsChange]);

  // Auto-deselect match sources that don't have all selected match on fields
  useEffect(() => {
    if (matchConfig.selectedMatchOnFields.length > 0 && matchConfig.selectedMatchSources.length > 0) {
      // Filter out sources that don't have all match on fields, but keep selected input sources
      const validSources = matchConfig.selectedMatchSources.filter(sourceId => {
        // Always keep selected input sources
        if (matchConfig.selectedInputSources.includes(sourceId)) {
          return true;
        }

        // For other sources, check if they have all match on fields
        const sourceFields = getMatchSourceFields(sourceId);
        return matchConfig.selectedMatchOnFields.every(matchKey =>
          sourceFields.some(field => field.toLowerCase() === matchKey.toLowerCase())
        );
      });

      // Update if any sources were filtered out
      if (validSources.length !== matchConfig.selectedMatchSources.length) {
        matchConfig.setSelectedMatchSources(validSources);
        // Also clear add fields since sources changed
        matchConfig.setSelectedAddFields([]);
      }
    }
  }, [matchConfig.selectedMatchOnFields]); // Only run when match on fields change

  // Search states for each dropdown
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [matchOnFieldsSearch, setMatchOnFieldsSearch] = useState('');
  const [matchSourcesSearch, setMatchSourcesSearch] = useState('');
  const [addFieldsSearch, setAddFieldsSearch] = useState('');

  // Handle reordering of match sources via drag-and-drop
  const handleReorderMatchSources = (newOrder: string[]) => {
    matchConfig.setSelectedMatchSources(newOrder);
  };

  // Handle deletion of match source from priority list
  const handleDeleteMatchSource = (id: string) => {
    const updatedSelection = matchConfig.selectedMatchSources.filter(sourceId => sourceId !== id);
    matchConfig.setSelectedMatchSources(updatedSelection);
  };

  const handleCreateVersion = () => {
    // Validation
    if (matchConfig.selectedInputSources.length === 0) {
      alert('Please select at least one Input Source before creating versions');
      return;
    }
    if (matchConfig.selectedMatchSources.length === 0) {
      alert('Please select at least one Match Source before creating versions');
      return;
    }

    // Create versioned sources (n × m combinations)
    if (onCreateVersionedSource) {
      onCreateVersionedSource(
        'Match',
        matchConfig.selectedInputSources,
        matchConfig.selectedMatchSources,
        matchConfig.selectedMatchOnFields,
        matchConfig.selectedAddFields  // Pass Add Fields for Match module
      );
    }
  };

  // Combine configurations and versions for unified display
  // Sort by creation time to show items in the order they were created
  const combinedItems = [
    ...matchConfig.configs.map(config => ({ type: 'config' as const, data: config, createdAt: config.createdAt || 0 })),
    ...versionedSources.map(version => ({ type: 'version' as const, data: version, createdAt: version.createdAt || 0 }))
  ].sort((a, b) => a.createdAt - b.createdAt);

  const getSourceName = (id: string): string => {
    const inputSource = availableInputSources.find(src => src.id === id);
    if (inputSource) return inputSource.sourceName;

    const predefined = [...predefinedSources].find(src => src.id === id);
    if (predefined) return predefined.name;

    const customSource = customSources.customMatchSources.find(src => src.id === id);
    if (customSource) return customSource.sourceName;

    return id;
  };

  const matchOnFields = getMatchOnFields(matchConfig.selectedInputSources, availableInputSources, fieldMappings, appendConfigurations);

  // Extract versioned sources from availableInputSources
  const localVersionedSources = availableInputSources.filter(src =>
    src.isVersioned === true
  );

  // Extract regular input sources (non-versioned)
  const regularInputSources = availableInputSources.filter(src =>
    !src.isVersioned
  );

  const allMatchSources = [
    ...predefinedSources.map(src => ({ id: src.id, name: src.name })),
    ...customSources.customMatchSources.map(src => ({ id: src.id, name: src.sourceName })),
    ...localVersionedSources.map(src => ({ id: src.id, name: src.sourceName })),
    ...regularInputSources.map(src => ({ id: src.id, name: src.sourceName })),
  ];
  const availableAddFields = getAddFieldsFromMatchSources(
    matchConfig.selectedMatchSources,
    customSources.customMatchSources,
    availableInputSources,
    apiSources
  );

  // Filtered lists based on search queries
  const filteredInputSources = availableInputSources.filter(source =>
    source?.sourceName?.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  const filteredMatchOnFields = matchOnFields.filter(field =>
    field.toLowerCase().includes(matchOnFieldsSearch.toLowerCase())
  );

  const filteredMatchSources = allMatchSources.filter(source =>
    source?.name && typeof source.name === 'string' && 
    source.name.toLowerCase().includes(matchSourcesSearch.toLowerCase())
  );

  const filteredAddFields = availableAddFields.filter(field =>
    field.toLowerCase().includes(addFieldsSearch.toLowerCase())
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
          Match Module is not available yet
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
      <MatchConfigHeader
        editingConfigId={matchConfig.editingConfigId}
        fieldMappings={fieldMappings}
        onFieldMappingClick={() => {
          console.log('🔍 [DEBUG - Match Module] Step 0: Configure Field Mapping button clicked, current fieldMappings =', fieldMappings);
          setFieldMappingDialogOpen(true);
        }}
        onAddCustomSourceClick={() => setDialogOpen(true)}
        onCreateVersion={handleCreateVersion}
        canCreateVersion={!!onCreateVersionedSource}
      />

      {/* Original header for reference - can be removed
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
            {matchConfig.editingConfigId ? 'Edit Match Configuration' : 'Create Match Configuration'}
          </Typography>
          {matchConfig.editingConfigId && (
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
              console.log('🔍 [DEBUG - Match Module] Step 0: Configure Field Mapping button clicked, current fieldMappings =', fieldMappings);
              setFieldMappingDialogOpen(true);
            }}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem',
              px: 2,
              py: 0.5,
              fontWeight: 600,
              borderColor: '#F59E0B',
              color: '#F59E0B',
              '&:hover': {
                borderColor: '#D97706',
                backgroundColor: 'rgba(245, 158, 11, 0.04)',
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
                  height: '18px !important',
                  fontSize: '0.65rem',
                  backgroundColor: '#FCD34D',
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
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                backgroundColor: '#FDE68A',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#FCD34D',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                },
              }}
            >
              Add Custom Match Source
            </Button>
            <Tooltip title="Create Version" arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={handleCreateVersion}
                  disabled={!onCreateVersionedSource}
                  sx={{
                    color: '#F59E0B',
                    border: '2px solid #F59E0B',
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                      borderColor: '#D97706',
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
                backgroundColor: '#FDE68A',
                color: '#fff',
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
              value={matchConfig.selectedInputSources}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-match-input-sources')) {
                  if (matchConfig.selectedInputSources.length === filteredInputSources.length) {
                    matchConfig.setSelectedInputSources([]);
                    matchConfig.setSelectedMatchOnFields([]);
                  } else {
                    matchConfig.setSelectedInputSources(filteredInputSources.map(s => s.id));
                  }
                } else {
                  matchConfig.setSelectedInputSources(value);
                  matchConfig.setSelectedMatchOnFields([]);
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
              MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              <MenuItem disabled value="">
                <em>Select Input Sources</em>
              </MenuItem>
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
              {/* Select All Option */}
              <MenuItem
                value="select-all-match-input-sources"
                sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
              >
                <Checkbox
                  checked={filteredInputSources.length > 0 && matchConfig.selectedInputSources.length === filteredInputSources.length}
                  indeterminate={matchConfig.selectedInputSources.length > 0 && matchConfig.selectedInputSources.length < filteredInputSources.length}
                  size="small"
                />
                <ListItemText primary="Select All" />
              </MenuItem>
              {filteredInputSources.length === 0 && (
                <MenuItem disabled>
                  <em>No items match your search</em>
                </MenuItem>
              )}
              {filteredInputSources.map((source) => (
                <MenuItem key={source.id} value={source.id}>
                  <Checkbox checked={matchConfig.selectedInputSources.indexOf(source.id) > -1} size="small" />
                  <ListItemText primary={source.sourceName} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Step 2: Match On Fields */}
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
                backgroundColor: '#FDE68A',
                color: '#fff',
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
              key={`match-on-fields-${[...matchConfig.selectedInputSources].sort().join('-') || 'none'}`}
              multiple
              value={matchConfig.selectedMatchOnFields.filter(field => matchOnFields.includes(field))}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-match-keys')) {
                  if (matchConfig.selectedMatchOnFields.length === filteredMatchOnFields.length) {
                    matchConfig.setSelectedMatchOnFields([]);
                  } else {
                    matchConfig.setSelectedMatchOnFields(filteredMatchOnFields);
                  }
                } else {
                  matchConfig.setSelectedMatchOnFields(value);
                }
              }}
              onClose={() => setMatchOnFieldsSearch('')}
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
                          sx={{
                            maxWidth: '150px !important',
                              minWidth: '50px',
                            height: '20px !important',
                            fontSize: '0.7rem',
                            overflow: 'hidden !important',
                            flexShrink: '0 !important',
                            backgroundColor: '#FCD34D',
                            color: '#fff',
                            '& .MuiChip-label': {
                              display: 'block !important',
                              color: '#fff',
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
              disabled={matchOnFields.length === 0}
              displayEmpty
              MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              <MenuItem disabled value="">
                <em>
                  {matchOnFields.length === 0
                    ? 'Select input sources first'
                    : 'Select Match On Fields'}
                </em>
              </MenuItem>
              {/* Search TextField */}
              {matchOnFields.length > 0 && (
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
                    value={matchOnFieldsSearch}
                    onChange={(e) => setMatchOnFieldsSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  />
                </MenuItem>
              )}
              {/* Select All Option */}
              {filteredMatchOnFields.length > 0 && (
                <MenuItem
                  value="select-all-match-keys"
                  sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                >
                  <Checkbox
                    checked={filteredMatchOnFields.length > 0 && matchConfig.selectedMatchOnFields.length === filteredMatchOnFields.length}
                    indeterminate={matchConfig.selectedMatchOnFields.length > 0 && matchConfig.selectedMatchOnFields.length < filteredMatchOnFields.length}
                    size="small"
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
              )}
              {filteredMatchOnFields.length === 0 && matchOnFields.length > 0 && (
                <MenuItem disabled>
                  <em>No items match your search</em>
                </MenuItem>
              )}
              {filteredMatchOnFields.map((field) => (
                <MenuItem key={field} value={field}>
                  <Checkbox checked={matchConfig.selectedMatchOnFields.indexOf(field) > -1} size="small" />
                  <ListItemText primary={field} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Step 3: Match Sources */}
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
          {/* Header with Match Sources label and Options - All in one row */}
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label={'3'}
                size="small"
                sx={{
                  backgroundColor: '#FCD34D',
                  color: 'white',
                  fontWeight: 700,
                  width: 24,
                  height: '24px !important',
                }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                Match Sources
              </Typography>
              <Typography component="span" sx={{ color: 'error.main', fontSize: '0.9rem' }}>
                *
              </Typography>

              {/* Separator */}
              <Box sx={{ width: '1px', height: '20px', backgroundColor: 'divider', mx: 0.5 }} />

              {/* Options inline with label */}
              {/* Expand Checkbox - Hidden when Full Match is selected */}
              {matchConfig.matchType !== 'full' && (
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={matchConfig.expand}
                        onChange={(e) => matchConfig.setExpand(e.target.checked)}
                        sx={{
                          padding: '2px',
                          '& .MuiSvgIcon-root': { fontSize: 18 }
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#2D3748' }}>
                        Expand
                      </Typography>
                    }
                    sx={{ margin: 0 }}
                  />
                </FormGroup>
              )}

              {/* Full Match / Any Match Radio Buttons - Hidden when Expand is enabled */}
              {!matchConfig.expand && (
                <FormControl component="fieldset" sx={{ minWidth: 'auto' }}>
                  <RadioGroup
                    row
                    value={matchConfig.matchType}
                    onChange={(e) => matchConfig.setMatchType(e.target.value as 'full' | 'any')}
                    sx={{ gap: 1 }}
                  >
                    <FormControlLabel
                      value="full"
                      control={
                        <Radio
                          size="small"
                          sx={{
                            padding: '2px',
                            '& .MuiSvgIcon-root': { fontSize: 18 }
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#2D3748' }}>
                          Full Match
                        </Typography>
                      }
                      sx={{ margin: 0 }}
                    />
                    <FormControlLabel
                      value="any"
                      control={
                        <Radio
                          size="small"
                          sx={{
                            padding: '2px',
                            '& .MuiSvgIcon-root': { fontSize: 18 }
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#2D3748' }}>
                          Any Match
                        </Typography>
                      }
                      sx={{ margin: 0 }}
                    />
                  </RadioGroup>
                </FormControl>
              )}
            </Box>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              multiple
              value={matchConfig.selectedMatchSources}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-match-sources')) {
                  // Only select sources that have all match on fields (enabled sources)
                  const enabledSources = filteredMatchSources.filter(s => sourceHasAllMatchOnFields(s.id));
                  if (matchConfig.selectedMatchSources.length === enabledSources.length) {
                    matchConfig.setSelectedMatchSources([]);
                  } else {
                    matchConfig.setSelectedMatchSources(enabledSources.map(s => s.id));
                  }
                } else {
                  matchConfig.setSelectedMatchSources(value);
                }
              }}
              onClose={() => setMatchSourcesSearch('')}
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
                          sx={{
                            maxWidth: '150px !important',
                              minWidth: '50px',
                            height: '20px !important',
                            fontSize: '0.7rem',
                            overflow: 'hidden !important',
                            flexShrink: '0 !important',
                            backgroundColor: '#FCD34D',
                            color: '#fff',
                            '& .MuiChip-label': {
                              display: 'block !important',
                              color: '#fff',
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
              MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              <MenuItem disabled value="">
                <em>Select Match Sources</em>
              </MenuItem>
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
                  value={matchSourcesSearch}
                  onChange={(e) => setMatchSourcesSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                />
              </MenuItem>
              {/* Select All Option */}
              {(() => {
                // Only count enabled sources for Select All
                const enabledSources = filteredMatchSources.filter(s => sourceHasAllMatchOnFields(s.id));
                return enabledSources.length > 0 ? (
                  <MenuItem
                    value="select-all-match-sources"
                    sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                  >
                    <Checkbox
                      checked={
                        enabledSources.length > 0 &&
                        enabledSources.every(src => matchConfig.selectedMatchSources.includes(src.id))
                      }
                      indeterminate={
                        enabledSources.some(src => matchConfig.selectedMatchSources.includes(src.id)) &&
                        !enabledSources.every(src => matchConfig.selectedMatchSources.includes(src.id))
                      }
                      size="small"
                    />
                    <ListItemText primary="Select All (Enabled)" />
                  </MenuItem>
                ) : null;
              })()}
              {filteredMatchSources.length === 0 && (
                <MenuItem disabled>
                  <em>No items match your search</em>
                </MenuItem>
              )}
              {filteredMatchSources.map((source) => {
                const isCustomSource = customSources.customMatchSources.some(cs => cs.id === source.id);
                const hasAllMatchOnFields = sourceHasAllMatchOnFields(source.id);
                const isDisabled = !hasAllMatchOnFields;
                const sourceFields = getMatchSourceFields(source.id);

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
                      checked={matchConfig.selectedMatchSources.indexOf(source.id) > -1}
                      size="small"
                      disabled={isDisabled}
                    />
                    <ListItemText
                      primary={source.name}
                      secondary={isDisabled ? 'Missing required match on fields' : undefined}
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
                                      backgroundColor: matchConfig.selectedMatchOnFields.includes(field) ? '#F59E0B20' : '#E5E7EB',
                                      color: matchConfig.selectedMatchOnFields.includes(field) ? '#F59E0B' : '#374151',
                                      border: matchConfig.selectedMatchOnFields.includes(field) ? '1px solid #F59E0B' : '1px solid transparent',
                                      fontSize: '0.65rem',
                                      height: '20px',
                                      fontWeight: matchConfig.selectedMatchOnFields.includes(field) ? 600 : 400,
                                    }}
                                  />
                                ))}
                              </Box>
                              {matchConfig.selectedMatchOnFields.length > 0 && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: '#9CA3AF' }}>
                                  Orange = Match on fields present
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
                            color: isDisabled ? '#9CA3AF' : '#F59E0B',
                            padding: '4px',
                            pointerEvents: 'auto', // Ensure icon can be clicked even when parent is disabled
                            '&:hover': {
                              backgroundColor: isDisabled ? 'rgba(156, 163, 175, 0.08)' : 'rgba(245, 158, 11, 0.08)',
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
            </Select>

            {/* Draggable Priority Order for selected sources */}
            {matchConfig.selectedMatchSources.length > 0 && (
              <DraggableMatchSources
                selectedSources={matchConfig.selectedMatchSources}
                onReorder={handleReorderMatchSources}
                onDelete={handleDeleteMatchSource}
                getSourceName={getSourceName}
              />
            )}
          </FormControl>
        </Box>

        {/* Step 4: Add Fields (shown when matchConfig.expand is checked) */}
        {matchConfig.expand && (
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
                  backgroundColor: '#FCD34D',
                  color: 'white',
                  fontWeight: 700,
                  mr: 1,
                  width: 24,
                  height: '24px !important',
                }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                Add Fields
              </Typography>
            </Box>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={matchConfig.selectedAddFields}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  if (value.includes('select-all-match-add-fields')) {
                    if (matchConfig.selectedAddFields.length === filteredAddFields.length) {
                      matchConfig.setSelectedAddFields([]);
                    } else {
                      matchConfig.setSelectedAddFields(filteredAddFields);
                    }
                  } else {
                    matchConfig.setSelectedAddFields(value);
                  }
                }}
                onClose={() => setAddFieldsSearch('')}
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
                            sx={{
                              maxWidth: '150px !important',
                              minWidth: '50px',
                              height: '20px !important',
                              fontSize: '0.7rem',
                              overflow: 'hidden !important',
                              flexShrink: '0 !important',
                              backgroundColor: '#FCD34D',
                              color: '#fff',
                              '& .MuiChip-label': {
                                display: 'block !important',
                                color: '#fff',
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
                disabled={availableAddFields.length === 0}
                displayEmpty
                MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                <MenuItem disabled value="">
                  <em>
                    {availableAddFields.length === 0
                      ? 'Select match sources first'
                      : 'Select Fields to Add'}
                  </em>
                </MenuItem>
                {/* Search TextField */}
                {availableAddFields.length > 0 && (
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
                      value={addFieldsSearch}
                      onChange={(e) => setAddFieldsSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    />
                  </MenuItem>
                )}
                {/* Select All Option */}
                {filteredAddFields.length > 0 && (
                  <MenuItem
                    value="select-all-match-add-fields"
                    sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                  >
                    <Checkbox
                      checked={filteredAddFields.length > 0 && matchConfig.selectedAddFields.length === filteredAddFields.length}
                      indeterminate={matchConfig.selectedAddFields.length > 0 && matchConfig.selectedAddFields.length < filteredAddFields.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                )}
                {filteredAddFields.length === 0 && availableAddFields.length > 0 && (
                  <MenuItem disabled>
                    <em>No items match your search</em>
                  </MenuItem>
                )}
                {filteredAddFields.map((field) => (
                  <MenuItem key={field} value={field}>
                    <Checkbox checked={matchConfig.selectedAddFields.indexOf(field) > -1} size="small" />
                    <ListItemText primary={field} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

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
              matchConfig.handleAddOrUpdateConfig(fieldMappings, allMatchSources, apiSources);
              // Don't reset fieldMappings - they are module-level, not config-level
              // All configs/versions in this module should use the same field mappings
            }}
            sx={{
              width: 48,
              height: '48px !important',
              backgroundColor: '#FDE68A',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
              '&:hover': {
                backgroundColor: '#FCD34D',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
              },
            }}
          >
            <Add sx={{ fontSize: 28 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Cancel Edit Button (shown when editing) */}
      {matchConfig.editingConfigId && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="outlined"
            onClick={handleCancelEditWithMappings}
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
              Configured Match Operations & Versions
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={`${matchConfig.configs.length} configuration${matchConfig.configs.length !== 1 ? 's' : ''}`}
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
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Match Keys</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Match Sources</TableCell>
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
                      backgroundColor: !isVersion && matchConfig.editingConfigId === config?.id ? 'rgba(245, 158, 11, 0.04)' :
                                       isVersion ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                      '&:hover': {
                        backgroundColor: !isVersion && matchConfig.editingConfigId === config?.id ? 'rgba(245, 158, 11, 0.08)' :
                                         isVersion ? 'rgba(16, 185, 129, 0.06)' : 'rgba(245, 158, 11, 0.04)',
                      },
                    }}
                  >
                    {/* Type Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Chip
                        label={isVersion ? 'Version' : 'Config'}
                        size="small"
                        color={isVersion ? 'success' : 'primary'}
                        sx={{ fontWeight: 600, height: '22px !important', fontSize: '0.7rem' }}
                      />
                    </TableCell>

                    {/* Name / Details Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      {isVersion ? (
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
                          Configuration #{matchConfig.configs.indexOf(config!) + 1}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Input Sources Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      {isVersion ? (
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

                    {/* Match On Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      {isVersion ? (
                        version?.operationFields && version.operationFields.length > 0 ? (
                          <Tooltip
                            title={
                              <Box sx={{ maxWidth: 400 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Match On Fields ({version.operationFields.length}):
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
                                  backgroundColor: '#F59E0B20',
                                  color: '#F59E0B',
                                  border: '1px solid #F59E0B40',
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
                      ) : config && config.matchOnFields && config.matchOnFields.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Match On Fields ({config.matchOnFields.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.matchOnFields.join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                            <Chip
                              label={`${config.matchOnFields.length} field${config.matchOnFields.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#F59E0B20',
                                color: '#F59E0B',
                                border: '1px solid #F59E0B40',
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
                              {config.matchOnFields.join(', ')}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Match Sources Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5, maxWidth: 250 }}>
                      {isVersion ? (
                        version?.operationSources && version.operationSources.length > 0 ? (
                          <Tooltip
                            title={
                              <Box sx={{ maxWidth: 400 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Match Sources ({version.operationSources.length}):
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
                                  backgroundColor: '#F59E0B20',
                                  color: '#F59E0B',
                                  border: '1px solid #F59E0B40',
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
                      ) : config && config.matchSources && config.matchSources.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Match Sources ({config.matchSources.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.matchSources.map((id: string) => getSourceName(id)).join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                            <Chip
                              label={`${config.matchSources.length} source${config.matchSources.length !== 1 ? 's' : ''}`}
                              size="small"
                              sx={{
                                backgroundColor: '#F59E0B20',
                                color: '#F59E0B',
                                border: '1px solid #F59E0B40',
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
                              {config.matchSources.map((id: string) => getSourceName(id)).join(', ')}
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
                            onClick={() => matchConfig.handleDeleteConfig(config!.id)}
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

      {/* Custom Match Sources List */}
      {customSources.customMatchSources.length > 0 && (
        <Box sx={{ mt: 4, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
              Configured Custom Match Sources
            </Typography>
            <Chip
              label={`${customSources.customMatchSources.length} custom source${customSources.customMatchSources.length !== 1 ? 's' : ''}`}
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
                {customSources.customMatchSources.map((customSource: any) => (
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
                              customSources.setEditingSource(customSource);
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

      {/* Custom Match Source Dialog */}
      <MatchSourceDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          customSources.setEditingSource(null);
        }}
        onSave={customSources.editingSource ? customSources.handleEditCustomSource : customSources.handleAddCustomSource}
        existingSources={customSources.customMatchSources}
        allExistingSources={[...availableInputSources, ...sharedCustomSources]}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        editingSource={customSources.editingSource}
      />

      {/* Field Mapping Dialog */}
      <FieldMappingDialog
        open={fieldMappingDialogOpen}
        onClose={() => setFieldMappingDialogOpen(false)}
        onSave={(mappings) => {
          console.log('🔍 [DEBUG - Match Module] Step 5: Received mappings from dialog =', mappings);
          setFieldMappings(mappings);
        }}
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
          // 3. Custom sources created in Suppress module (Step 3 - panel3)
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
            // Custom sources from Suppress module (panel3) - include nested fields
            ...sharedCustomSources
              .filter(src => {
                const createdBy = src.createdByModuleId;
                return createdBy && (createdBy === 'panel3' || createdBy.startsWith('panel3_'));
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
      {customSources.viewingSource && (
        <Dialog
          open={true}
          onClose={() => customSources.setViewingSource(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#296695' }}>
              Match Source Details
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Source Name
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {customSources.viewingSource.sourceName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Source Type
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {customSources.viewingSource.sourceType}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Sub Source Type
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {customSources.viewingSource.subSourceType}
                </Typography>
              </Box>
              {customSources.viewingSource.fileName && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    File Name
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {customSources.viewingSource.fileName}
                  </Typography>
                </Box>
              )}
              {customSources.viewingSource?.database && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {customSources.viewingSource.database}
                  </Typography>
                </Box>
              )}
              {customSources.viewingSource?.schema && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Schema
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {customSources.viewingSource.schema}
                  </Typography>
                </Box>
              )}
              {customSources.viewingSource?.table && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Table
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {customSources.viewingSource.table}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Columns ({customSources.viewingSource.headers?.length || 0})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {customSources.viewingSource.headers && customSources.viewingSource.headers.length > 0 ? (
                    customSources.viewingSource.headers.map((header, index) => (
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
            <Button onClick={() => customSources.setViewingSource(null)} variant="outlined">
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
      <MatchVersionModal
        open={versionEditDialogOpen}
        onClose={() => {
          setVersionEditDialogOpen(false);
          setEditingVersion(null);
        }}
        version={editingVersion}
        availableInputSources={availableInputSources}
        availableMatchSources={[...predefinedSources.map(s => ({ id: s.id, name: s.name })), ...customSources.customMatchSources.map(s => ({ id: s.id, name: s.sourceName }))]}
        apiSources={apiSources}
        allExistingSources={[...availableInputSources, ...sharedCustomSources]}
        onSave={handleSaveVersion}
      />
    </Box>
  );
};

export default MatchModule;
