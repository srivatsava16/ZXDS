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
  Menu,
} from '@mui/material';
import { Add, Delete, Edit, AccountTree, Visibility, List } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import MatchSourceDialog from './MatchSourceDialog';
import FieldMappingDialog, { type FieldMapping } from '../AppendModule/FieldMappingDialog';
import VersionsModal from '../shared/VersionsModal';

// Extracted modules
import type { MatchConfig, MatchModuleProps } from './types';
import { getPredefinedSources, getMatchOnFields, getAddFieldsFromMatchSources } from './utils/matchHelpers';
import { useMatchConfig } from './hooks/useMatchConfig';
import { useCustomSources } from './hooks/useCustomSources';
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
  onUpdateVersionName
}) => {
  // Use custom hooks for state management
  const matchConfig = useMatchConfig(initialConfigs);
  const customSources = useCustomSources();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);

  // Get predefined sources from API or use fallback
  const predefinedSources = getPredefinedSources(apiSources);

  // Load initial configurations if provided (for edit mode)
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      matchConfig.setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Search states for each dropdown
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [matchOnFieldsSearch, setMatchOnFieldsSearch] = useState('');
  const [matchSourcesSearch, setMatchSourcesSearch] = useState('');
  const [addFieldsSearch, setAddFieldsSearch] = useState('');

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
        matchConfig.selectedMatchOnFields
      );
    }
  };

  const handleViewVersions = () => {
    setVersionsModalOpen(true);
  };

  const getSourceName = (id: string): string => {
    const inputSource = availableInputSources.find(src => src.id === id);
    if (inputSource) return inputSource.sourceName;

    const predefined = [...predefinedSources].find(src => src.id === id);
    if (predefined) return predefined.name;

    const customSource = customSources.customMatchSources.find(src => src.id === id);
    if (customSource) return customSource.sourceName;

    return id;
  };

  const matchOnFields = getMatchOnFields(matchConfig.selectedInputSources, availableInputSources);

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
    availableInputSources
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
        onFieldMappingClick={() => setFieldMappingDialogOpen(true)}
        onAddCustomSourceClick={() => setDialogOpen(true)}
        onCreateVersion={handleCreateVersion}
        onViewVersions={handleViewVersions}
        canCreateVersion={!!onCreateVersionedSource}
      />

      {/* Original header for reference - can be removed
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
            {matchConfig.editingConfigId ? 'Edit Match Configuration' : 'Create Match Configuration'}
          </Typography>
          {matchConfig.editingConfigId && (
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
                  height: 18,
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
            <Tooltip title="Version Actions" arrow>
              <IconButton
                size="small"
                onClick={handleVersionMenuOpen}
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
              <MenuItem 
                onClick={handleViewVersions}
                disabled={!versionedSources || versionedSources.length === 0}
              >
                <List sx={{ fontSize: 16, mr: 1 }} />
                View Versions
              </MenuItem>
            </Menu>
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: '#FCD34D',
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
                  height: 24,
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
              {/* Expand Checkbox */}
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

              {/* Full Match / Any Match Radio Buttons */}
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
            </Box>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              multiple
              value={matchConfig.selectedMatchSources}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-match-sources')) {
                  if (matchConfig.selectedMatchSources.length === filteredMatchSources.length) {
                    matchConfig.setSelectedMatchSources([]);
                  } else {
                    matchConfig.setSelectedMatchSources(filteredMatchSources.map(s => s.id));
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={getSourceName(value)}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: '#FCD34D',
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
              <MenuItem
                value="select-all-match-sources"
                sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
              >
                <Checkbox
                  checked={filteredMatchSources.length > 0 && matchConfig.selectedMatchSources.length === filteredMatchSources.length}
                  indeterminate={matchConfig.selectedMatchSources.length > 0 && matchConfig.selectedMatchSources.length < filteredMatchSources.length}
                  size="small"
                />
                <ListItemText primary="Select All" />
              </MenuItem>
              {filteredMatchSources.length === 0 && (
                <MenuItem disabled>
                  <em>No items match your search</em>
                </MenuItem>
              )}
              {filteredMatchSources.map((source) => {
                const isCustomSource = customSources.customMatchSources.some(cs => cs.id === source.id);
                return (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={matchConfig.selectedMatchSources.indexOf(source.id) > -1} size="small" />
                    <ListItemText primary={source.name} />
                    {isCustomSource && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              const customSource = customSources.customMatchSources.find(cs => cs.id === source.id);
                              if (customSource) {
                                customSources.setViewingSource(customSource);
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
                              const customSource = customSources.customMatchSources.find(cs => cs.id === source.id);
                              if (customSource) {
                                customSources.setEditingSource(customSource);
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
            </Select>
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
                  height: 24,
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            backgroundColor: '#FCD34D',
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
            onClick={matchConfig.handleAddOrUpdateConfig}
            sx={{
              width: 48,
              height: 48,
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
            onClick={matchConfig.handleCancelEdit}
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
      {matchConfig.configs.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
              Configured Match Operations
            </Typography>
            <Chip
              label={`${matchConfig.configs.length} configuration${matchConfig.configs.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                fontWeight: 600,
                backgroundColor: '#FDE68A',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#FCD34D',
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
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Match Keys</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Match Sources</TableCell>
                  <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Expand</TableCell>
                  <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Add Fields</TableCell>
                  <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Match Type</TableCell>
                  <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matchConfig.configs.map((config) => (
                  <TableRow
                    key={config.id}
                    hover
                    sx={{
                      backgroundColor: matchConfig.editingConfigId === config.id ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                      '&:hover': {
                        backgroundColor: matchConfig.editingConfigId === config.id ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)',
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

                    {/* Match On Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.matchOnFields.length > 0 ? (
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.matchOnFields.length} field${config.matchOnFields.length !== 1 ? 's' : ''}`}
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
                              {config.matchOnFields.slice(0, 2).join(', ')}
                              {config.matchOnFields.length > 2 ? '...' : ''}
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
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.matchSources.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Match Sources ({config.matchSources.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.matchSources.map(id => getSourceName(id)).join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.matchSources.length} source${config.matchSources.length !== 1 ? 's' : ''}`}
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
                              {config.matchSources.slice(0, 2).map(id => getSourceName(id)).join(', ')}
                              {config.matchSources.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Expand Column */}
                    <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                      <Chip
                        label={config.expand ? 'Yes' : 'No'}
                        size="small"
                        sx={{
                          backgroundColor: config.expand ? '#10B98120' : '#EF444420',
                          color: config.expand ? '#10B981' : '#EF4444',
                          border: `1px solid ${config.expand ? '#10B98140' : '#EF444440'}`,
                          fontWeight: 600,
                          height: 20,
                          fontSize: '0.65rem',
                          minWidth: 40,
                        }}
                      />
                    </TableCell>

                    {/* Add Fields Column */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {config.expand && config.addFields && config.addFields.length > 0 ? (
                        <Tooltip
                          title={
                            <Box sx={{ maxWidth: 400 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Add Fields ({config.addFields.length}):
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {config.addFields.join(', ')}
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${config.addFields.length} field${config.addFields.length !== 1 ? 's' : ''}`}
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
                              {config.addFields.slice(0, 2).join(', ')}
                              {config.addFields.length > 2 ? '...' : ''}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          --
                        </Typography>
                      )}
                    </TableCell>

                    {/* Match Type Column */}
                    <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                      <Chip
                        label={config.matchType === 'full' ? 'Full Match' : 'Any Match'}
                        size="small"
                        sx={{
                          backgroundColor: '#FCD34D20',
                          color: '#F59E0B',
                          border: '1px solid #FCD34D40',
                          fontWeight: 600,
                          height: 20,
                          fontSize: '0.65rem',
                          minWidth: 80,
                        }}
                      />
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => matchConfig.handleEditConfig(config)}
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
                          onClick={() => matchConfig.handleDeleteConfig(config.id)}
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

      {/* Custom Match Source Dialog */}
      <MatchSourceDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          customSources.setEditingSource(null);
        }}
        onSave={customSources.editingSource ? customSources.handleEditCustomSource : customSources.handleAddCustomSource}
        existingSources={customSources.customMatchSources}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        editingSource={customSources.editingSource}
      />

      {/* Field Mapping Dialog */}
      <FieldMappingDialog
        open={fieldMappingDialogOpen}
        onClose={() => setFieldMappingDialogOpen(false)}
        onSave={(mappings) => setFieldMappings(mappings)}
        availableSources={[
          ...availableInputSources
            .filter(src => matchConfig.selectedInputSources.includes(src.id))
            .map(src => ({ id: src.id, name: src.sourceName, type: 'input' as const })),
          ...matchConfig.selectedMatchSources.map(srcId => {
            const predefined = [...predefinedSources].find(s => s.id === srcId);
            if (predefined) {
              return { id: srcId, name: predefined.name, type: 'append' as const };
            }
            const custom = customSources.customMatchSources.find(s => s.id === srcId);
            return { id: srcId, name: custom?.sourceName || srcId, type: 'append' as const };
          }),
        ]}
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

      {/* Versions Modal */}
      <VersionsModal
        open={versionsModalOpen}
        onClose={() => setVersionsModalOpen(false)}
        versionedSources={versionedSources}
        getSourceNameById={getSourceNameById || (() => 'Unknown')}
        moduleType="Match"
        onUpdateVersionName={onUpdateVersionName}
      />
    </Box>
  );
};

export default MatchModule;
