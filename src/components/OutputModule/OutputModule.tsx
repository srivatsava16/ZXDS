import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  OutlinedInput,
  FormControl,
  InputLabel,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Divider,
  Checkbox,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Paper,
  Button,
} from '@mui/material';
import { Add, Delete, Edit, AccountTree } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import DraggableOutputSources from './DraggableOutputSources';
import OutputDestinationDialog, { type OutputDestination } from './OutputDestinationDialog';
import FieldMappingDialog, { type FieldMapping } from '../AppendModule/FieldMappingDialog';

const DEFAULT_OUTPUT_DESTINATIONS = ['DC SFTP', 'ZXDS S3', 'AWS S3', 'NFS'];

interface OutputConfig {
  id: string;
  inputSources: string[];
  outputFields: string[];
  combineSources: boolean;
  combineSourcesList?: string[];
  priorityOrder?: string[];
  fieldPriority?: string[];
  limitation: boolean;
  limitCount?: number;
  random: boolean;
  destinations: string[];
}

interface OutputModuleProps {
  availableInputSources?: InputSource[];
  onOutputChange?: (outputSource: string) => void;
  scheduleType?: 'adhoc' | 'recurrence';
  onScheduleTypeChange?: (type: 'adhoc' | 'recurrence') => void;
  notificationWhen?: string;
  onNotificationWhenChange?: (value: string) => void;
  recipientEmail?: string;
  onRecipientEmailChange?: (value: string) => void;
  recurrence?: string;
  onRecurrenceChange?: (value: string) => void;
  startDate?: string;
  onStartDateChange?: (value: string) => void;
  endDate?: string;
  onEndDateChange?: (value: string) => void;
  initialConfigs?: OutputConfig[];
}

const OutputModule: React.FC<OutputModuleProps> = ({
  availableInputSources = [],
  scheduleType = 'adhoc',
  onScheduleTypeChange,
  notificationWhen = 'standard',
  onNotificationWhenChange,
  recipientEmail = '',
  onRecipientEmailChange,
  recurrence = '',
  onRecurrenceChange,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
  initialConfigs,
}) => {
  const [configs, setConfigs] = useState<OutputConfig[]>([]);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [customDestinations, setCustomDestinations] = useState<OutputDestination[]>([]);
  const [destinationDialogOpen, setDestinationDialogOpen] = useState(false);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // Load initial configurations if provided (for edit mode)
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Current working config state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedOutputFields, setSelectedOutputFields] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [combineSources, setCombineSources] = useState<boolean>(false);
  const [combineSourcesList, setCombineSourcesList] = useState<string[]>([]);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [fieldPriority, setFieldPriority] = useState<string[]>([]);
  const [limitation, setLimitation] = useState<boolean>(false);
  const [limitCount, setLimitCount] = useState<number | undefined>(undefined);
  const [random, setRandom] = useState<boolean>(false);

  // Search states
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [outputFieldsSearch, setOutputFieldsSearch] = useState('');
  const [outputDestinationsSearch, setOutputDestinationsSearch] = useState('');

  // Get all unique output fields from selected input sources
  const getOutputFields = (sourceIds: string[]): string[] => {
    const fieldsSet = new Set<string>();

    sourceIds.forEach(id => {
      const source = availableInputSources.find(src => src.id === id);
      if (source && source.headers) {
        source.headers.forEach(field => fieldsSet.add(field));
      }
    });

    return Array.from(fieldsSet);
  };

  const availableOutputFields = getOutputFields(selectedInputSources);

  // Get all available destinations (default + custom)
  const allOutputDestinations = [
    ...DEFAULT_OUTPUT_DESTINATIONS,
    ...customDestinations.map(dest => dest.name),
  ];

  // Filtered lists based on search queries
  const filteredInputSources = availableInputSources.filter(source =>
    source.sourceName.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  const filteredOutputFields = availableOutputFields.filter(field =>
    field.toLowerCase().includes(outputFieldsSearch.toLowerCase())
  );

  const filteredOutputDestinations = allOutputDestinations.filter(dest =>
    dest.toLowerCase().includes(outputDestinationsSearch.toLowerCase())
  );

  // When Combine Sources is selected, initialize combine sources list
  useEffect(() => {
    if (combineSources && combineSourcesList.length === 0 && selectedInputSources.length > 0) {
      setCombineSourcesList(selectedInputSources);
      setPriorityOrder(selectedInputSources);
    } else if (!combineSources) {
      setCombineSourcesList([]);
      setPriorityOrder([]);
      setFieldPriority([]);
    }
  }, [combineSources, selectedInputSources]);

  const handleAddDestination = (destination: OutputDestination) => {
    setCustomDestinations([...customDestinations, destination]);
  };

  const handleReorderPriority = (newOrder: string[]) => {
    setPriorityOrder(newOrder);
  };

  const handleAddOrUpdateConfig = () => {
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedOutputFields.length === 0) {
      alert('Please select at least one Output Field');
      return;
    }
    if (selectedDestinations.length === 0) {
      alert('Please select at least one Output Destination');
      return;
    }

    if (editingConfigId) {
      // Update existing config
      setConfigs(configs.map(config =>
        config.id === editingConfigId
          ? {
              ...config,
              inputSources: selectedInputSources,
              outputFields: selectedOutputFields,
              destinations: selectedDestinations,
              combineSources,
              combineSourcesList,
              priorityOrder,
              fieldPriority,
              limitation,
              limitCount,
              random,
            }
          : config
      ));
      setEditingConfigId(null);
    } else {
      // Add new config
      const newConfig: OutputConfig = {
        id: Date.now().toString(),
        inputSources: selectedInputSources,
        outputFields: selectedOutputFields,
        destinations: selectedDestinations,
        combineSources,
        combineSourcesList,
        priorityOrder,
        fieldPriority,
        limitation,
        limitCount,
        random,
      };
      setConfigs([...configs, newConfig]);
    }

    // Reset form
    setSelectedInputSources([]);
    setSelectedOutputFields([]);
    setSelectedDestinations([]);
    setCombineSources(false);
    setCombineSourcesList([]);
    setPriorityOrder([]);
    setFieldPriority([]);
    setLimitation(false);
    setLimitCount(undefined);
    setRandom(false);
  };

  const handleEditConfig = (config: OutputConfig) => {
    setEditingConfigId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedOutputFields(config.outputFields);
    setSelectedDestinations(config.destinations);
    setCombineSources(config.combineSources);
    setCombineSourcesList(config.combineSourcesList || []);
    setPriorityOrder(config.priorityOrder || []);
    setFieldPriority(config.fieldPriority || []);
    setLimitation(config.limitation);
    setLimitCount(config.limitCount);
    setRandom(config.random);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setSelectedInputSources([]);
    setSelectedOutputFields([]);
    setSelectedDestinations([]);
    setCombineSources(false);
    setCombineSourcesList([]);
    setPriorityOrder([]);
    setFieldPriority([]);
    setLimitation(false);
    setLimitCount(undefined);
    setRandom(false);
  };

  const handleDeleteConfig = (id: string) => {
    if (window.confirm('Are you sure you want to delete this output configuration?')) {
      setConfigs(configs.filter(c => c.id !== id));
      if (editingConfigId === id) {
        handleCancelEdit();
      }
    }
  };

  const getSourceName = (id: string): string => {
    const source = availableInputSources.find(src => src.id === id);
    return source ? source.sourceName : id;
  };

  return (
    <Box
      sx={{
        backgroundColor: '#F8FAFB',
        borderRadius: 3,
        p: 3,
      }}
    >
      {/* Output Destination Configuration Section */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
              {editingConfigId ? 'Edit Output Configuration' : 'Create Output Configuration'}
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
                borderColor: '#3B82F6',
                color: '#3B82F6',
                '&:hover': {
                  borderColor: '#2563EB',
                  backgroundColor: 'rgba(59, 130, 246, 0.04)',
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
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    fontWeight: 700,
                  }}
                />
              )}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setDestinationDialogOpen(true)}
              sx={{
                textTransform: 'none',
                fontSize: '0.875rem',
                px: 2,
                py: 0.5,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                backgroundColor: '#3B82F6',
                '&:hover': {
                  backgroundColor: '#2563EB',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                },
              }}
            >
              Add Output Destination
            </Button>
          </Box>
        </Box>

        {availableInputSources.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: 'white',
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Output Configuration is not available yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please configure at least one Input Source first in the Input Module
            </Typography>
          </Box>
        ) : (
          <>
            {/* Configuration Form - Single Row Layout */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch', mb: 2 }}>
              {/* Step 1: Input Sources */}
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={'1'}
                    size="small"
                    sx={{
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      fontWeight: 700,
                      mr: 0.75,
                      width: 24,
                      height: 24,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
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
                          setSelectedOutputFields([]);
                        } else {
                          setSelectedInputSources(filteredInputSources.map(src => src.id));
                        }
                      } else {
                        setSelectedInputSources(value);
                        setSelectedOutputFields([]);
                      }
                    }}
                    onClose={() => setInputSourcesSearch('')}
                    input={<OutlinedInput />}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Select
                          </Typography>
                        );
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, py: 0.4 }}>
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={getSourceName(value)}
                              size="small"
                              color="primary"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          ))}
                        </Box>
                      );
                    }}
                    displayEmpty
                    MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                    sx={{
                      backgroundColor: 'white',
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
                    <MenuItem
                      value="select-all-input-sources"
                      sx={{
                        backgroundColor: '#f0f0f0',
                        fontWeight: 600,
                        borderBottom: '1px solid #ddd',
                      }}
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

              {/* Step 2: Output Fields */}
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={'2'}
                    size="small"
                    sx={{
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      fontWeight: 700,
                      mr: 0.75,
                      width: 24,
                      height: 24,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                    Output Fields
                  </Typography>
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                    *
                  </Typography>
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    value={selectedOutputFields}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                      if (value.includes('select-all-output-fields')) {
                        if (selectedOutputFields.length === filteredOutputFields.length) {
                          setSelectedOutputFields([]);
                        } else {
                          setSelectedOutputFields(filteredOutputFields);
                        }
                      } else {
                        setSelectedOutputFields(value);
                      }
                    }}
                    onClose={() => setOutputFieldsSearch('')}
                    input={<OutlinedInput />}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Select
                          </Typography>
                        );
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, py: 0.4 }}>
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={value}
                              size="small"
                              color="info"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          ))}
                        </Box>
                      );
                    }}
                    disabled={availableOutputFields.length === 0}
                    displayEmpty
                    MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                      },
                    }}
                  >
                    <MenuItem disabled value="">
                      <em>
                        {availableOutputFields.length === 0
                          ? 'Select input sources first'
                          : 'Select Output Fields'}
                      </em>
                    </MenuItem>
                    {/* Search TextField */}
                    {availableOutputFields.length > 0 && (
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
                          value={outputFieldsSearch}
                          onChange={(e) => setOutputFieldsSearch(e.target.value)}
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
                    {filteredOutputFields.length > 0 && (
                      <MenuItem
                        value="select-all-output-fields"
                        sx={{
                          backgroundColor: '#f0f0f0',
                          fontWeight: 600,
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        <Checkbox
                          checked={filteredOutputFields.length > 0 && selectedOutputFields.length === filteredOutputFields.length}
                          indeterminate={selectedOutputFields.length > 0 && selectedOutputFields.length < filteredOutputFields.length}
                          size="small"
                        />
                        <ListItemText primary="Select All" />
                      </MenuItem>
                    )}
                    {filteredOutputFields.length === 0 && availableOutputFields.length > 0 && (
                      <MenuItem disabled>
                        <em>No items match your search</em>
                      </MenuItem>
                    )}
                    {filteredOutputFields.map((field) => (
                      <MenuItem key={field} value={field}>
                        <Checkbox checked={selectedOutputFields.indexOf(field) > -1} size="small" />
                        <ListItemText primary={field} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Step 3: Combine Sources - CHECKBOX + Dropdown */}
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={'3'}
                    size="small"
                    sx={{
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      fontWeight: 700,
                      mr: 0.75,
                      width: 24,
                      height: 24,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                    Combine Sources
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={combineSources}
                      onChange={(e) => setCombineSources(e.target.checked)}
                      disabled={selectedInputSources.length < 2}
                      size="small"
                      sx={{
                        color: '#3B82F6',
                        '&.Mui-checked': {
                          color: '#3B82F6',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#2D3748' }}>
                      {selectedInputSources.length < 2
                        ? 'Select 2+ sources'
                        : 'Enable'}
                    </Typography>
                  }
                  sx={{ mb: combineSources ? 1 : 0 }}
                />
                {combineSources && (
                  <FormControl fullWidth size="small">
                    <Select
                      multiple
                      value={combineSourcesList}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                        if (value.includes('select-all-combine-sources')) {
                          if (combineSourcesList.length === selectedInputSources.length) {
                            setCombineSourcesList([]);
                          } else {
                            setCombineSourcesList(selectedInputSources);
                          }
                        } else {
                          setCombineSourcesList(value);
                        }
                      }}
                      input={<OutlinedInput />}
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Select
                            </Typography>
                          );
                        }
                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, py: 0.3 }}>
                            {selected.map((value) => (
                              <Chip
                                key={value}
                                label={getSourceName(value)}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.6rem',
                                  backgroundColor: '#10B981',
                                  color: '#fff',
                                }}
                              />
                            ))}
                          </Box>
                        );
                      }}
                      displayEmpty
                      sx={{
                        backgroundColor: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 0, 0, 0.15)',
                        },
                      }}
                    >
                      <MenuItem disabled value="">
                        <em style={{ fontSize: '0.75rem' }}>Select Sources</em>
                      </MenuItem>
                      <MenuItem
                        value="select-all-combine-sources"
                        sx={{
                          backgroundColor: '#f0f0f0',
                          fontWeight: 600,
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        <Checkbox
                          checked={selectedInputSources.length > 0 && combineSourcesList.length === selectedInputSources.length}
                          indeterminate={combineSourcesList.length > 0 && combineSourcesList.length < selectedInputSources.length}
                          size="small"
                        />
                        <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: '0.75rem' }} />
                      </MenuItem>
                      {selectedInputSources.map((sourceId) => (
                        <MenuItem key={sourceId} value={sourceId}>
                          <Checkbox checked={combineSourcesList.indexOf(sourceId) > -1} size="small" />
                          <ListItemText primary={getSourceName(sourceId)} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>

              {/* Priority Order - Show when Combine Sources is enabled */}
              {combineSources && priorityOrder.length > 0 && (
                <Box
                  sx={{
                    flex: 1,
                    p: 1.5,
                    backgroundColor: 'white',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'rgba(0, 0, 0, 0.08)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#2D3748' }}>
                      Priority Order
                    </Typography>
                  </Box>
                  <DraggableOutputSources
                    selectedSources={priorityOrder}
                    allSources={availableInputSources.map(src => ({ id: src.id, name: src.sourceName }))}
                    onReorder={handleReorderPriority}
                    getSourceName={getSourceName}
                  />
                </Box>
              )}

              {/* Field Priority - Show when Combine Sources is enabled */}
              {combineSources && (
                <Box
                  sx={{
                    flex: 1,
                    p: 1.5,
                    backgroundColor: 'white',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'rgba(0, 0, 0, 0.08)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#2D3748' }}>
                      Field Priority
                    </Typography>
                  </Box>
                  <FormControl fullWidth size="small">
                    <Select
                      multiple
                      value={fieldPriority}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                        if (value.includes('select-all-field-priority')) {
                          if (fieldPriority.length === availableOutputFields.length) {
                            setFieldPriority([]);
                          } else {
                            setFieldPriority(availableOutputFields);
                          }
                        } else {
                          setFieldPriority(value);
                        }
                      }}
                      input={<OutlinedInput />}
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Select
                            </Typography>
                          );
                        }
                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, py: 0.3 }}>
                            {selected.map((value, index) => (
                              <Chip
                                key={value}
                                label={`${index + 1}. ${value}`}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.6rem',
                                  backgroundColor: '#8B5CF6',
                                  color: '#fff',
                                }}
                              />
                            ))}
                          </Box>
                        );
                      }}
                      disabled={availableOutputFields.length === 0}
                      displayEmpty
                      sx={{
                        backgroundColor: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 0, 0, 0.15)',
                        },
                      }}
                    >
                      <MenuItem disabled value="">
                        <em style={{ fontSize: '0.75rem' }}>
                          {availableOutputFields.length === 0
                            ? 'No fields'
                            : 'Select Fields'}
                        </em>
                      </MenuItem>
                      {availableOutputFields.length > 0 && (
                        <MenuItem
                          value="select-all-field-priority"
                          sx={{
                            backgroundColor: '#f0f0f0',
                            fontWeight: 600,
                            borderBottom: '1px solid #ddd',
                          }}
                        >
                          <Checkbox
                            checked={availableOutputFields.length > 0 && fieldPriority.length === availableOutputFields.length}
                            indeterminate={fieldPriority.length > 0 && fieldPriority.length < availableOutputFields.length}
                            size="small"
                          />
                          <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: '0.75rem' }} />
                        </MenuItem>
                      )}
                      {availableOutputFields.map((field) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={fieldPriority.indexOf(field) > -1} size="small" />
                          <ListItemText primary={field} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* Output Limitations - Always shown */}
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#2D3748' }}>
                    Limitations
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={limitation}
                        onChange={(e) => setLimitation(e.target.checked)}
                        size="small"
                        sx={{
                          color: '#3B82F6',
                          '&.Mui-checked': {
                            color: '#3B82F6',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#2D3748', fontWeight: 600 }}>
                        LIMIT RECORDS TO
                      </Typography>
                    }
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Count"
                    value={limitCount || ''}
                    onChange={(e) => setLimitCount(e.target.value ? parseInt(e.target.value) : undefined)}
                    disabled={!limitation}
                    InputProps={{
                      inputProps: { min: 1 },
                    }}
                    InputLabelProps={{
                      sx: { fontSize: '0.7rem' }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={random}
                        onChange={(e) => setRandom(e.target.checked)}
                        disabled={!limitation}
                        size="small"
                        sx={{
                          color: '#3B82F6',
                          '&.Mui-checked': {
                            color: '#3B82F6',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#2D3748', fontWeight: 600 }}>
                        Shuffle Records
                      </Typography>
                    }
                  />
                </Box>
              </Box>

              {/* Step 4: Output Destination - Always shown */}
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={'4'}
                    size="small"
                    sx={{
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      fontWeight: 700,
                      mr: 0.75,
                      width: 24,
                      height: 24,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                    Output Destination
                  </Typography>
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                    *
                  </Typography>
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    value={selectedDestinations}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                      if (value.includes('select-all-destinations')) {
                        if (selectedDestinations.length === filteredOutputDestinations.length) {
                          setSelectedDestinations([]);
                        } else {
                          setSelectedDestinations(filteredOutputDestinations);
                        }
                      } else {
                        setSelectedDestinations(value);
                      }
                    }}
                    onClose={() => setOutputDestinationsSearch('')}
                    input={<OutlinedInput />}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Select
                          </Typography>
                        );
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, py: 0.4 }}>
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={value}
                              size="small"
                              color="success"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          ))}
                        </Box>
                      );
                    }}
                    displayEmpty
                    MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                      },
                    }}
                  >
                    <MenuItem disabled value="">
                      <em>Select Output Destinations</em>
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
                        value={outputDestinationsSearch}
                        onChange={(e) => setOutputDestinationsSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f5f5f5',
                          },
                        }}
                      />
                    </MenuItem>
                    <MenuItem
                      value="select-all-destinations"
                      sx={{
                        backgroundColor: '#f0f0f0',
                        fontWeight: 600,
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      <Checkbox
                        checked={filteredOutputDestinations.length > 0 && selectedDestinations.length === filteredOutputDestinations.length}
                        indeterminate={selectedDestinations.length > 0 && selectedDestinations.length < filteredOutputDestinations.length}
                        size="small"
                      />
                      <ListItemText primary="Select All" />
                    </MenuItem>
                    {filteredOutputDestinations.length === 0 && (
                      <MenuItem disabled>
                        <em>No items match your search</em>
                      </MenuItem>
                    )}
                    {filteredOutputDestinations.map((dest) => (
                      <MenuItem key={dest} value={dest}>
                        <Checkbox checked={selectedDestinations.indexOf(dest) > -1} size="small" />
                        <ListItemText primary={dest} />
                      </MenuItem>
                    ))}
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
                    width: 44,
                    height: 44,
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                    '&:hover': {
                      backgroundColor: '#2563EB',
                      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                    },
                  }}
                >
                  <Add sx={{ fontSize: 26 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Cancel Edit Button (shown when editing) */}
            {editingConfigId && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Box
                  component="span"
                  onClick={handleCancelEdit}
                  sx={{
                    px: 2,
                    py: 0.6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'primary.main',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.04)',
                    },
                  }}
                >
                  Cancel Edit
                </Box>
              </Box>
            )}

            {/* Configurations List */}
            {configs.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                    Configured Output Destinations
                  </Typography>
                  <Chip
                    label={`${configs.length} configuration${configs.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{
                      backgroundColor: '#3B82F620',
                      color: '#3B82F6',
                      fontWeight: 600,
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
                        <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Output Fields</TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Destinations</TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Combine Sources</TableCell>
                        <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Priority Order</TableCell>
                        <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configs.map((config) => (
                        <TableRow
                          key={config.id}
                          hover
                          sx={{
                            backgroundColor: editingConfigId === config.id ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                            '&:hover': {
                              backgroundColor: editingConfigId === config.id ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)',
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

                          {/* Output Fields Column */}
                          <TableCell sx={{ py: 0.75, px: 1.5 }}>
                            {config.outputFields.length > 0 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ maxWidth: 400 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                      Output Fields ({config.outputFields.length}):
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                      {config.outputFields.join(', ')}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip
                                    label={`${config.outputFields.length} field${config.outputFields.length !== 1 ? 's' : ''}`}
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
                                    {config.outputFields.slice(0, 2).join(', ')}
                                    {config.outputFields.length > 2 ? '...' : ''}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                --
                              </Typography>
                            )}
                          </TableCell>

                          {/* Destinations Column */}
                          <TableCell sx={{ py: 0.75, px: 1.5 }}>
                            {config.destinations.length > 0 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ maxWidth: 400 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                      Output Destinations ({config.destinations.length}):
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                      {config.destinations.join(', ')}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip
                                    label={`${config.destinations.length} destination${config.destinations.length !== 1 ? 's' : ''}`}
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
                                    {config.destinations.slice(0, 2).join(', ')}
                                    {config.destinations.length > 2 ? '...' : ''}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                --
                              </Typography>
                            )}
                          </TableCell>

                          {/* Combine Sources Column */}
                          <TableCell sx={{ py: 0.75, px: 1.5 }}>
                            <Chip
                              label={config.combineSources ? 'Yes' : 'No'}
                              size="small"
                              color={config.combineSources ? 'success' : 'default'}
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          </TableCell>

                          {/* Priority Order Column */}
                          <TableCell sx={{ py: 0.75, px: 1.5 }}>
                            {config.combineSources && config.priorityOrder && config.priorityOrder.length > 0 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ maxWidth: 400 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                      Priority Order:
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                      {config.priorityOrder.map((id, idx) => `${idx + 1}. ${getSourceName(id)}`).join(', ')}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontSize: '0.7rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    cursor: 'help',
                                  }}
                                >
                                  {config.priorityOrder.slice(0, 2).map((id, idx) => `${idx + 1}. ${getSourceName(id)}`).join(', ')}
                                  {config.priorityOrder.length > 2 ? '...' : ''}
                                </Typography>
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
          </>
        )}
      </Box>

      {/* Output Destination Dialog */}
      <OutputDestinationDialog
        open={destinationDialogOpen}
        onClose={() => setDestinationDialogOpen(false)}
        onSave={handleAddDestination}
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
        ]}
        initialMappings={fieldMappings}
      />
    </Box>
  );
};

export default OutputModule;
