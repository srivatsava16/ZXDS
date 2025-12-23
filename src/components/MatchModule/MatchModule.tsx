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
} from '@mui/material';
import { Add, Delete, Edit, AccountTree, HistoryEdu } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import MatchSourceDialog from './MatchSourceDialog';
import FieldMappingDialog, { type FieldMapping } from '../AppendModule/FieldMappingDialog';

interface MatchConfig {
  id: string;
  inputSources: string[];
  matchOnFields: string[];
  matchSources: string[];
  expand: boolean;
  matchType: 'full' | 'any';
  addFields?: string[]; // Fields to add when expand is true
}

interface MatchModuleProps {
  availableInputSources: InputSource[];
  onCreateVersionedSource?: (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[]
  ) => void;
  initialConfigs?: MatchConfig[];
}

// Predefined match sources
const PREDEFINED_SOURCES = [
  { id: 'master_customer_db', name: 'Master Customer Database' },
  { id: 'crm_database', name: 'CRM Database' },
  { id: 'product_catalog', name: 'Product Catalog' },
];

const MatchModule: React.FC<MatchModuleProps> = ({ availableInputSources, onCreateVersionedSource, initialConfigs }) => {
  const [configs, setConfigs] = useState<MatchConfig[]>([]);
  const [customMatchSources, setCustomMatchSources] = useState<InputSource[]>([]);
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
  const [selectedMatchOnFields, setSelectedMatchOnFields] = useState<string[]>([]);
  const [selectedMatchSources, setSelectedMatchSources] = useState<string[]>([]);
  const [selectedAddFields, setSelectedAddFields] = useState<string[]>([]);

  // Match options state
  const [expand, setExpand] = useState<boolean>(false);
  const [matchType, setMatchType] = useState<'full' | 'any'>('full');

  // Search states for each dropdown
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [matchOnFieldsSearch, setMatchOnFieldsSearch] = useState('');
  const [matchSourcesSearch, setMatchSourcesSearch] = useState('');
  const [addFieldsSearch, setAddFieldsSearch] = useState('');

  // Get common or all fields based on input source selection
  const getMatchOnFields = (sourceIds: string[]): string[] => {
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

  // Get union of all fields from selected match sources
  const getAddFieldsFromMatchSources = (matchSourceIds: string[]): string[] => {
    const fieldsSet = new Set<string>();

    matchSourceIds.forEach(id => {
      // Check if it's a custom match source
      const customSource = customMatchSources.find(src => src.id === id);
      if (customSource && customSource.headers) {
        customSource.headers.forEach(field => fieldsSet.add(field));
      } else {
        // Check if it's a versioned source
        const versionedSource = availableInputSources.find(src => src.id === id);
        if (versionedSource && versionedSource.headers) {
          versionedSource.headers.forEach(field => fieldsSet.add(field));
        } else {
          // For predefined sources, use mock fields
          // In a real app, these would come from the actual database schema
          const mockFields = ['ID', 'NAME', 'EMAIL', 'PHONE', 'ADDRESS', 'CITY', 'STATE', 'ZIP'];
          mockFields.forEach(field => fieldsSet.add(field));
        }
      }
    });

    return Array.from(fieldsSet);
  };

  const handleAddOrUpdateConfig = () => {
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedMatchOnFields.length === 0) {
      alert('Please select at least one Match On field');
      return;
    }
    if (selectedMatchSources.length === 0) {
      alert('Please select at least one Match Source');
      return;
    }

    if (editingConfigId) {
      // Update existing config
      setConfigs(configs.map(config =>
        config.id === editingConfigId
          ? {
              ...config,
              inputSources: selectedInputSources,
              matchOnFields: selectedMatchOnFields,
              matchSources: selectedMatchSources,
              expand: expand,
              matchType: matchType,
              addFields: expand ? selectedAddFields : undefined,
            }
          : config
      ));
      setEditingConfigId(null);
    } else {
      // Add new config
      const newConfig: MatchConfig = {
        id: Date.now().toString(),
        inputSources: selectedInputSources,
        matchOnFields: selectedMatchOnFields,
        matchSources: selectedMatchSources,
        expand: expand,
        matchType: matchType,
        addFields: expand ? selectedAddFields : undefined,
      };
      setConfigs([...configs, newConfig]);
    }

    // Reset form
    setSelectedInputSources([]);
    setSelectedMatchOnFields([]);
    setSelectedMatchSources([]);
    setSelectedAddFields([]);
    setExpand(false);
    setMatchType('full');
  };

  const handleEditConfig = (config: MatchConfig) => {
    setEditingConfigId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedMatchOnFields(config.matchOnFields);
    setSelectedMatchSources(config.matchSources);
    setSelectedAddFields(config.addFields || []);
    setExpand(config.expand);
    setMatchType(config.matchType);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setSelectedInputSources([]);
    setSelectedMatchOnFields([]);
    setSelectedMatchSources([]);
    setSelectedAddFields([]);
    setExpand(false);
    setMatchType('full');
  };

  const handleDeleteConfig = (id: string) => {
    if (window.confirm('Are you sure you want to delete this match configuration?')) {
      setConfigs(configs.filter(c => c.id !== id));
      if (editingConfigId === id) {
        handleCancelEdit();
      }
    }
  };

  const handleAddCustomSource = (source: InputSource) => {
    setCustomMatchSources([...customMatchSources, { ...source, id: Date.now().toString() }]);
  };

  const handleCreateVersion = () => {
    // Validation
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source before creating versions');
      return;
    }
    if (selectedMatchSources.length === 0) {
      alert('Please select at least one Match Source before creating versions');
      return;
    }

    // Create versioned sources (n × m combinations)
    if (onCreateVersionedSource) {
      onCreateVersionedSource(
        'Match',
        selectedInputSources,
        selectedMatchSources,
        selectedMatchOnFields
      );
    }
  };

  const getSourceName = (id: string): string => {
    const inputSource = availableInputSources.find(src => src.id === id);
    if (inputSource) return inputSource.sourceName;

    const predefined = PREDEFINED_SOURCES.find(src => src.id === id);
    if (predefined) return predefined.name;

    const customSource = customMatchSources.find(src => src.id === id);
    if (customSource) return customSource.sourceName;

    return id;
  };

  const matchOnFields = getMatchOnFields(selectedInputSources);

  // Extract versioned sources from availableInputSources
  const versionedSources = availableInputSources.filter(src =>
    (src as any).isVersioned === true
  );

  const allMatchSources = [
    ...PREDEFINED_SOURCES.map(src => ({ id: src.id, name: src.name })),
    ...customMatchSources.map(src => ({ id: src.id, name: src.sourceName })),
    ...versionedSources.map(src => ({ id: src.id, name: src.sourceName })),
  ];
  const availableAddFields = getAddFieldsFromMatchSources(selectedMatchSources);

  // Filtered lists based on search queries
  const filteredInputSources = availableInputSources.filter(source =>
    source.sourceName.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  const filteredMatchOnFields = matchOnFields.filter(field =>
    field.toLowerCase().includes(matchOnFieldsSearch.toLowerCase())
  );

  const filteredMatchSources = allMatchSources.filter(source =>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
            {editingConfigId ? 'Edit Match Configuration' : 'Create Match Configuration'}
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
            <Tooltip title="Create Version from Selected Inputs & Sources" arrow>
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
              value={selectedInputSources}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-match-input-sources')) {
                  if (selectedInputSources.length === filteredInputSources.length) {
                    setSelectedInputSources([]);
                    setSelectedMatchOnFields([]);
                  } else {
                    setSelectedInputSources(filteredInputSources.map(s => s.id));
                  }
                } else {
                  setSelectedInputSources(value);
                  setSelectedMatchOnFields([]);
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
                  checked={filteredInputSources.length > 0 && selectedInputSources.length === filteredInputSources.length}
                  indeterminate={selectedInputSources.length > 0 && selectedInputSources.length < filteredInputSources.length}
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
                  <Checkbox checked={selectedInputSources.indexOf(source.id) > -1} size="small" />
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
              key={`match-on-fields-${[...selectedInputSources].sort().join('-') || 'none'}`}
              multiple
              value={selectedMatchOnFields.filter(field => matchOnFields.includes(field))}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-match-keys')) {
                  if (selectedMatchOnFields.length === filteredMatchOnFields.length) {
                    setSelectedMatchOnFields([]);
                  } else {
                    setSelectedMatchOnFields(filteredMatchOnFields);
                  }
                } else {
                  setSelectedMatchOnFields(value);
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
                    checked={filteredMatchOnFields.length > 0 && selectedMatchOnFields.length === filteredMatchOnFields.length}
                    indeterminate={selectedMatchOnFields.length > 0 && selectedMatchOnFields.length < filteredMatchOnFields.length}
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
                  <Checkbox checked={selectedMatchOnFields.indexOf(field) > -1} size="small" />
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
                      checked={expand}
                      onChange={(e) => setExpand(e.target.checked)}
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
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as 'full' | 'any')}
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
              value={selectedMatchSources}
              onChange={(e) => {
                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                if (value.includes('select-all-match-sources')) {
                  if (selectedMatchSources.length === filteredMatchSources.length) {
                    setSelectedMatchSources([]);
                  } else {
                    setSelectedMatchSources(filteredMatchSources.map(s => s.id));
                  }
                } else {
                  setSelectedMatchSources(value);
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
                  checked={filteredMatchSources.length > 0 && selectedMatchSources.length === filteredMatchSources.length}
                  indeterminate={selectedMatchSources.length > 0 && selectedMatchSources.length < filteredMatchSources.length}
                  size="small"
                />
                <ListItemText primary="Select All" />
              </MenuItem>
              {filteredMatchSources.length === 0 && (
                <MenuItem disabled>
                  <em>No items match your search</em>
                </MenuItem>
              )}
              {filteredMatchSources.map((source) => (
                <MenuItem key={source.id} value={source.id}>
                  <Checkbox checked={selectedMatchSources.indexOf(source.id) > -1} size="small" />
                  <ListItemText primary={source.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Step 4: Add Fields (shown when expand is checked) */}
        {expand && (
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
                value={selectedAddFields}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  if (value.includes('select-all-match-add-fields')) {
                    if (selectedAddFields.length === filteredAddFields.length) {
                      setSelectedAddFields([]);
                    } else {
                      setSelectedAddFields(filteredAddFields);
                    }
                  } else {
                    setSelectedAddFields(value);
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
                      checked={filteredAddFields.length > 0 && selectedAddFields.length === filteredAddFields.length}
                      indeterminate={selectedAddFields.length > 0 && selectedAddFields.length < filteredAddFields.length}
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
                    <Checkbox checked={selectedAddFields.indexOf(field) > -1} size="small" />
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
            onClick={handleAddOrUpdateConfig}
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
              Configured Match Operations
            </Typography>
            <Chip
              label={`${configs.length} configuration${configs.length !== 1 ? 's' : ''}`}
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
                {configs.map((config) => (
                  <TableRow
                    key={config.id}
                    hover
                    sx={{
                      backgroundColor: editingConfigId === config.id ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                      '&:hover': {
                        backgroundColor: editingConfigId === config.id ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)',
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

      {/* Custom Match Source Dialog */}
      <MatchSourceDialog
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
          ...selectedMatchSources.map(srcId => {
            const predefined = PREDEFINED_SOURCES.find(s => s.id === srcId);
            if (predefined) {
              return { id: srcId, name: predefined.name, type: 'append' as const };
            }
            const custom = customMatchSources.find(s => s.id === srcId);
            return { id: srcId, name: custom?.sourceName || srcId, type: 'append' as const };
          }),
        ]}
        initialMappings={fieldMappings}
      />
    </Box>
  );
};

export default MatchModule;
