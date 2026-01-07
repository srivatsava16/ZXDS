import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Chip,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Paper,
  IconButton,
  Divider,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Close,
  Save,
  DragIndicator,
  AccountTree,
  Add,
  Edit,
  Delete,
  ExpandMore,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FieldMapping {
  id: string;
  fieldName: string;
  alias?: string;
  type?: 'text' | 'number' | 'date' | 'boolean';
  required?: boolean;
  selectedSources: string[];
  selectedColumns: string[];
}

interface InputSource {
  id: string;
  sourceName: string;
  sourceType: string;
  headers?: string[];
  fileName?: string;
  database?: string;
  schema?: string;
  table?: string;
  isVersioned?: boolean;
  versionConfig?: {
    selectedSources: string[];
    combineAs: 'merge' | 'union' | 'intersect';
    fieldMappings: FieldMapping[];
  };
}

interface InputVersionModalProps {
  open: boolean;
  onClose: () => void;
  availableSources: InputSource[];
  editingVersion?: InputSource | null;
  onSave: (versionData: {
    name: string;
    selectedSources: string[];
    headers: string[];
    orderedHeaders: string[];
    combineAs: 'merge' | 'union' | 'intersect';
    fieldMappings: FieldMapping[];
  }) => void;
}

interface SortableHeaderItemProps {
  id: string;
  header: string;
}

const SortableHeaderItem: React.FC<SortableHeaderItemProps> = ({ id, header }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        },
        backgroundColor: 'white',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <DragIndicator sx={{ color: 'text.secondary', fontSize: '1rem' }} />
      <Typography variant="body2">{header}</Typography>
    </Paper>
  );
};

const InputVersionModal: React.FC<InputVersionModalProps> = ({
  open,
  onClose,
  availableSources,
  editingVersion,
  onSave,
}) => {
  const [versionName, setVersionName] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [orderedHeaders, setOrderedHeaders] = useState<string[]>([]);
  const [combineAs, setCombineAs] = useState<'merge' | 'union' | 'intersect'>('merge');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [error, setError] = useState('');

  // Field mapping form state
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [mappingFieldName, setMappingFieldName] = useState('');
  const [mappingSelectedSources, setMappingSelectedSources] = useState<string[]>([]);
  const [mappingSelectedColumns, setMappingSelectedColumns] = useState<string[]>([]);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Prefill form when editing existing version
  useEffect(() => {
    if (open && editingVersion && editingVersion.versionConfig) {
      const config = editingVersion.versionConfig;
      setVersionName(editingVersion.sourceName);
      setSelectedSources(config.selectedSources);
      setCombineAs(config.combineAs);
      setFieldMappings(config.fieldMappings || []);
      setSelectedHeaders(editingVersion.headers || []);
      setOrderedHeaders(editingVersion.headers || []);
    }
  }, [open, editingVersion]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (!editingVersion) {
        // Only reset if not editing
        setVersionName('');
        setSelectedSources([]);
        setAvailableHeaders([]);
        setSelectedHeaders([]);
        setOrderedHeaders([]);
        setCombineAs('merge');
        setFieldMappings([]);
        setError('');
        // Reset field mapping form
        setEditingMappingId(null);
        setMappingFieldName('');
        setMappingSelectedSources([]);
        setMappingSelectedColumns([]);
        setColumnSearchQuery('');
      }
    }
  }, [open, editingVersion]);

  // Update available headers when sources change
  useEffect(() => {
    if (selectedSources.length > 0) {
      const sources = availableSources.filter(s => selectedSources.includes(s.id));
      const headersSet = new Set<string>();
      
      if (combineAs === 'intersect') {
        // For intersect, find common headers
        if (sources.length > 0) {
          const firstSourceHeaders = sources[0].headers || [];
          firstSourceHeaders.forEach(header => {
            if (sources.every(source => source.headers?.includes(header))) {
              headersSet.add(header);
            }
          });
        }
      } else {
        // For merge and union, get all unique headers
        sources.forEach(source => {
          if (source.headers) {
            source.headers.forEach(header => headersSet.add(header));
          }
        });
      }
      
      const headers = Array.from(headersSet).sort();
      setAvailableHeaders(headers);
      setSelectedHeaders(headers); // Auto-select all available headers
      setOrderedHeaders(headers);
    } else {
      setAvailableHeaders([]);
      setSelectedHeaders([]);
      setOrderedHeaders([]);
    }
  }, [selectedSources, combineAs, availableSources]);

  const handleSourcesChange = (event: any) => {
    const value = typeof event.target.value === 'string' 
      ? [event.target.value] 
      : event.target.value;
    setSelectedSources(value as string[]);
    setError('');
  };

  const handleHeadersChange = (event: any) => {
    const value = typeof event.target.value === 'string' 
      ? [event.target.value] 
      : event.target.value;
    setSelectedHeaders(value as string[]);
    
    // Update ordered headers to only include selected ones
    const newOrderedHeaders = orderedHeaders.filter((h: string) => (value as string[]).includes(h));
    const newHeaders = (value as string[]).filter((h: string) => !newOrderedHeaders.includes(h));
    setOrderedHeaders([...newOrderedHeaders, ...newHeaders]);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setOrderedHeaders((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getAvailableColumns = () => {
    const columns: Array<{ value: string; label: string }> = [];
    
    if (mappingSelectedSources.length > 0) {
      mappingSelectedSources.forEach(sourceId => {
        const source = availableSources.find(s => s.id === sourceId);
        if (source?.headers) {
          source.headers.forEach(header => {
            columns.push({
              value: `${sourceId}::${header}`,
              label: `${source.sourceName} → ${header}`
            });
          });
        }
      });
    }
    
    return columns.filter(col =>
      col.label.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
      col.value.toLowerCase().includes(columnSearchQuery.toLowerCase())
    );
  };

  const getSourceName = (sourceId: string): string => {
    const source = availableSources.find(s => s.id === sourceId);
    return source?.sourceName || sourceId;
  };

  const handleAddMapping = () => {
    if (!mappingFieldName.trim()) {
      alert('Please enter a field name');
      return;
    }
    if (mappingSelectedSources.length === 0) {
      alert('Please select at least one source');
      return;
    }
    if (mappingSelectedColumns.length === 0) {
      alert('Please select at least one column');
      return;
    }

    if (editingMappingId) {
      // Update existing mapping
      setFieldMappings(fieldMappings.map(m =>
        m.id === editingMappingId
          ? { ...m, fieldName: mappingFieldName, selectedSources: mappingSelectedSources, selectedColumns: mappingSelectedColumns }
          : m
      ));
      setEditingMappingId(null);
    } else {
      // Add new mapping
      const newMapping: FieldMapping = {
        id: Date.now().toString(),
        fieldName: mappingFieldName,
        selectedSources: mappingSelectedSources,
        selectedColumns: mappingSelectedColumns,
      };
      setFieldMappings([...fieldMappings, newMapping]);
    }

    // Reset form
    setMappingFieldName('');
    setMappingSelectedSources([]);
    setMappingSelectedColumns([]);
    setColumnSearchQuery('');
  };

  const handleEditMapping = (mapping: FieldMapping) => {
    setEditingMappingId(mapping.id);
    setMappingFieldName(mapping.fieldName);
    setMappingSelectedSources(mapping.selectedSources);
    setMappingSelectedColumns(mapping.selectedColumns);
  };

  const handleDeleteMapping = (id: string) => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      setFieldMappings(fieldMappings.filter(m => m.id !== id));
    }
  };

  const handleSave = () => {
    if (!versionName.trim()) {
      setError('Please enter a version name');
      return;
    }
    
    if (selectedSources.length < 1) {
      setError('Please select at least 1 input source');
      return;
    }

    if (selectedHeaders.length === 0) {
      setError('Please select at least one header');
      return;
    }

    onSave({
      name: versionName,
      selectedSources,
      headers: selectedHeaders,
      orderedHeaders: orderedHeaders.filter(h => selectedHeaders.includes(h)),
      combineAs,
      fieldMappings,
    });

    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const availableColumns = getAvailableColumns();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, minHeight: '60vh' } }}
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
            {editingVersion ? 'Edit Input Version' : 'Create Input Version'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {editingVersion ? 'Modify the configuration of this input version' : 'Configure and combine input sources into a new version'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3, px: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Row 1: Version Name and Input Sources */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {/* Version Name */}
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                Version Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                label=""
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                fullWidth
                size="small"
                placeholder="Enter name for this version"
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
                  value={selectedSources}
                  onChange={handleSourcesChange}
                  input={<OutlinedInput />}
                  displayEmpty
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const source = availableSources.find(s => s.id === value);
                        return (
                          <Chip
                            key={value}
                            label={source?.sourceName || value}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        );
                      })}
                    </Box>
                  )}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.15)',
                    },
                  }}
                >
                  {availableSources.map((source) => (
                    <MenuItem key={source.id} value={source.id}>
                      <Checkbox checked={selectedSources.indexOf(source.id) > -1} />
                      <ListItemText 
                        primary={source.sourceName}
                        secondary={`${source.sourceType} - ${source.headers?.length || 0} columns`}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Headers Selection */}
          {availableHeaders.length > 0 && (
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                Select Headers
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  value={selectedHeaders}
                  onChange={handleHeadersChange}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
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
                  )}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.15)',
                    },
                  }}
                >
                  {availableHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      <Checkbox checked={selectedHeaders.indexOf(header) > -1} />
                      <ListItemText primary={header} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Field Mapping Accordion */}
          <Accordion disabled={selectedSources.length === 0}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="field-mapping-content"
              id="field-mapping-header"
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Field Mapping Configuration
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
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Mapping Form */}
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: '#FAFBFC',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#2D3748' }}>
                    {editingMappingId ? 'Edit Mapping' : 'Add New Mapping'}
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                    {/* Field Name Input */}
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Field Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Enter target field name..."
                        value={mappingFieldName}
                        onChange={(e) => setMappingFieldName(e.target.value)}
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                          },
                        }}
                      />
                    </Box>

                    {/* Sources Selection */}
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Select Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          multiple
                          value={mappingSelectedSources}
                          onChange={(e) => {
                            const value = typeof e.target.value === 'string' ? [e.target.value] : e.target.value;
                            setMappingSelectedSources(value);
                            setMappingSelectedColumns([]); // Reset columns when sources change
                          }}
                          input={<OutlinedInput />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip
                                  key={value}
                                  label={getSourceName(value)}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          )}
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(0, 0, 0, 0.15)',
                            },
                          }}
                        >
                          {availableSources.filter(s => selectedSources.includes(s.id)).map((source) => (
                            <MenuItem key={source.id} value={source.id}>
                              <Checkbox checked={mappingSelectedSources.indexOf(source.id) > -1} />
                              <ListItemText 
                                primary={source.sourceName}
                                secondary={`${source.sourceType} - ${source.headers?.length || 0} columns`}
                              />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>

                  {/* Columns Selection */}
                  {mappingSelectedSources.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Select Columns <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          multiple
                          value={mappingSelectedColumns}
                          onChange={(e) => {
                            const value = typeof e.target.value === 'string' ? [e.target.value] : e.target.value;
                            setMappingSelectedColumns(value);
                          }}
                          input={<OutlinedInput />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.slice(0, 3).map((value) => {
                                const fieldName = value.includes('::') ? value.split('::')[1] : value;
                                const column = availableColumns.find(col => col.value === value);
                                return (
                                  <Chip
                                    key={value}
                                    label={column?.label || fieldName}
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                );
                              })}
                              {selected.length > 3 && (
                                <Chip
                                  label={`+${selected.length - 3}`}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    backgroundColor: '#F59E0B20',
                                    color: '#F59E0B',
                                  }}
                                />
                              )}
                            </Box>
                          )}
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(0, 0, 0, 0.15)',
                            },
                          }}
                        >
                          {availableColumns.map((column) => (
                            <MenuItem key={column.value} value={column.value}>
                              <Checkbox checked={mappingSelectedColumns.indexOf(column.value) > -1} />
                              <ListItemText primary={column.label} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* Add/Save Mapping Button */}
                  <Button
                    variant="contained"
                    onClick={handleAddMapping}
                    disabled={!mappingFieldName.trim() || mappingSelectedSources.length === 0 || mappingSelectedColumns.length === 0}
                    startIcon={editingMappingId ? <Save /> : <Add />}
                    size="small"
                    sx={{
                      textTransform: 'none',
                      backgroundColor: editingMappingId ? '#F59E0B' : '#10B981',
                      '&:hover': {
                        backgroundColor: editingMappingId ? '#D97706' : '#059669',
                      },
                    }}
                  >
                    {editingMappingId ? 'Update Mapping' : 'Add Mapping'}
                  </Button>
                </Paper>

                {/* Current Mappings */}
                {fieldMappings.length > 0 && (
                  <Paper sx={{ p: 2, backgroundColor: '#F9FAFB', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#2D3748' }}>
                      Current Mappings ({fieldMappings.length})
                    </Typography>
                    
                    <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead sx={{ backgroundColor: '#F8FAFB' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Field Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Sources</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Columns</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5, width: 100 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fieldMappings.map((mapping) => (
                            <TableRow key={mapping.id} sx={{ '&:hover': { backgroundColor: '#F8FAFB' } }}>
                              <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {mapping.fieldName}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {mapping.selectedSources.map(sourceId => (
                                    <Chip
                                      key={sourceId}
                                      label={getSourceName(sourceId)}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: '#29669520',
                                        color: '#296695',
                                      }}
                                    />
                                  ))}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {mapping.selectedColumns.slice(0, 3).map(columnValue => {
                                    const fieldName = columnValue.includes('::') ? columnValue.split('::')[1] : columnValue;
                                    const column = availableColumns.find(col => col.value === columnValue);
                                    return (
                                      <Chip
                                        key={columnValue}
                                        label={column?.label || fieldName}
                                        size="small"
                                        sx={{
                                          height: 18,
                                          fontSize: '0.65rem',
                                          backgroundColor: '#10B98120',
                                          color: '#10B981',
                                        }}
                                      />
                                    );
                                  })}
                                  {mapping.selectedColumns.length > 3 && (
                                    <Chip
                                      label={`+${mapping.selectedColumns.length - 3}`}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: '#F59E0B20',
                                        color: '#F59E0B',
                                      }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditMapping(mapping)}
                                    sx={{ color: '#6366F1' }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteMapping(mapping.id)}
                                    sx={{ color: '#EF4444' }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Paper>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Fields Reordering */}
          {orderedHeaders.filter(h => selectedHeaders.includes(h)).length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Field Order (Drag to reorder)
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: '#F8FAFB', maxHeight: 200, overflowY: 'auto' }}>
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={orderedHeaders.filter(h => selectedHeaders.includes(h))}
                    strategy={verticalListSortingStrategy}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {orderedHeaders
                        .filter(h => selectedHeaders.includes(h))
                        .map((header) => (
                          <SortableHeaderItem
                            key={header}
                            id={header}
                            header={header}
                          />
                        ))}
                    </Box>
                  </SortableContext>
                </DndContext>
              </Paper>
            </Box>
          )}

          {/* Combine As Radio Buttons - Moved to the end */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.85rem' }}>
              Combine As <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <RadioGroup
              row
              value={combineAs}
              onChange={(e) => setCombineAs(e.target.value as any)}
              sx={{ gap: 2 }}
            >
              <FormControlLabel 
                value="merge" 
                control={<Radio size="small" />} 
                label={<Typography variant="body2">Merge</Typography>}
              />
              <FormControlLabel 
                value="union" 
                control={<Radio size="small" />} 
                label={<Typography variant="body2">Union</Typography>}
              />
              <FormControlLabel 
                value="intersect" 
                control={<Radio size="small" />} 
                label={<Typography variant="body2">Intersect</Typography>}
              />
            </RadioGroup>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          startIcon={<Close />}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<Save />}
          disabled={!versionName.trim() || selectedSources.length < 1 || selectedHeaders.length === 0}
          sx={{ textTransform: 'none', boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)' }}
        >
          {editingVersion ? 'Save Changes' : 'Create Version'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InputVersionModal;