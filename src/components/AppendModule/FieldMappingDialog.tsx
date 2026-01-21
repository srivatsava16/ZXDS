import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';
import { Close, Add, Edit, Delete } from '@mui/icons-material';
import { validateMappingFieldName } from '../../utils/sourceValidation';

export interface FieldMapping {
  id: string;
  fieldName: string;
  selectedSources: string[];
  selectedColumns: string[];
}

interface FieldMappingDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (mappings: FieldMapping[]) => void;
  availableSources: Array<{ id: string; name: string; type: 'input' | 'append'; headers?: string[] }>;
  initialMappings: FieldMapping[];
}

const FieldMappingDialog: React.FC<FieldMappingDialogProps> = ({
  open,
  onClose,
  onSave,
  availableSources,
  initialMappings,
}) => {
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings);
  const [fieldName, setFieldName] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');

  // Get available columns from selected sources with table names
  const getAvailableColumnsWithTables = (): Array<{ value: string; label: string; tableName: string }> => {
    const columnsWithTables: Array<{ value: string; label: string; tableName: string }> = [];

    selectedSources.forEach(sourceId => {
      const source = availableSources.find(s => s.id === sourceId);
      if (!source) return;

      // Use actual headers if provided, otherwise use mock data
      let fields: string[] = [];

      if (source.headers && source.headers.length > 0) {
        // Use actual headers from the source
        fields = source.headers;
      } else if (source.type === 'input') {
        // Fallback to mock data for input sources
        fields = ['EMAIL_ID', 'PROFILE_ID', 'FIRST_NAME', 'LAST_NAME', 'ZIP_CODE'];
      } else if (source.type === 'append') {
        // Fallback to mock data for append sources
        fields = ['CITY', 'STATE', 'COUNTY', 'LATITUDE', 'LONGITUDE'];
      }

      fields.forEach(field => {
        const uniqueValue = `${sourceId}::${field}`;
        columnsWithTables.push({
          value: uniqueValue,
          label: `${field} → ${source.name}`,
          tableName: source.name,
        });
      });
    });

    return columnsWithTables;
  };

  const availableColumns = getAvailableColumnsWithTables();

  // Filter columns based on search query
  const filteredColumns = availableColumns.filter(column =>
    column.label.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
    column.tableName.toLowerCase().includes(columnSearchQuery.toLowerCase())
  );

  const handleAddMapping = () => {
    if (!fieldName.trim()) {
      alert('Please enter a field name');
      return;
    }
    if (selectedSources.length === 0) {
      alert('Please select at least one source');
      return;
    }
    if (selectedColumns.length === 0) {
      alert('Please select at least one column');
      return;
    }

    // Validate for duplicate field mapping names (case-insensitive)
    const validationError = validateMappingFieldName(
      fieldName,
      mappings,
      editingId,
      'Field mapping'
    );

    if (validationError) {
      alert(validationError);
      return;
    }

    if (editingId) {
      // Update existing mapping
      setMappings(mappings.map(m =>
        m.id === editingId
          ? { ...m, fieldName, selectedSources, selectedColumns }
          : m
      ));
      setEditingId(null);
    } else {
      // Add new mapping
      const newMapping: FieldMapping = {
        id: Date.now().toString(),
        fieldName,
        selectedSources,
        selectedColumns,
      };
      setMappings([...mappings, newMapping]);
    }

    // Reset form
    setFieldName('');
    setSelectedSources([]);
    setSelectedColumns([]);
    setColumnSearchQuery('');
  };

  const handleEditMapping = (mapping: FieldMapping) => {
    setEditingId(mapping.id);
    setFieldName(mapping.fieldName);
    setSelectedSources(mapping.selectedSources);
    setSelectedColumns(mapping.selectedColumns);
  };

  const handleDeleteMapping = (id: string) => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      setMappings(mappings.filter(m => m.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setFieldName('');
        setSelectedSources([]);
        setSelectedColumns([]);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFieldName('');
    setSelectedSources([]);
    setSelectedColumns([]);
    setColumnSearchQuery('');
  };

  const handleSave = () => {
    onSave(mappings);
    onClose();
  };

  const handleClose = () => {
    // Reset form but keep mappings
    setEditingId(null);
    setFieldName('');
    setSelectedSources([]);
    setSelectedColumns([]);
    setColumnSearchQuery('');
    onClose();
  };

  const getSourceName = (id: string): string => {
    return availableSources.find(s => s.id === id)?.name || id;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
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
            Field Mapping Configuration
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {editingId ? 'Edit existing mapping' : 'Create new field mappings'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2, px: 2.5 }}>
        {/* Mapping Form */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: '#FAFBFC',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#2D3748' }}>
            {editingId ? 'Edit Mapping' : 'Add New Mapping'}
          </Typography>

          {/* Field Name Input */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Field Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Enter target field name..."
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Box>

          {/* Input Source Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Select Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedSources}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  if (value.includes('select-all-mapping-sources')) {
                    if (selectedSources.length === availableSources.length) {
                      setSelectedSources([]);
                      setSelectedColumns([]);
                    } else {
                      setSelectedSources(availableSources.map(s => s.id));
                    }
                  } else {
                    setSelectedSources(value);
                    setSelectedColumns([]); // Reset columns when sources change
                  }
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
                displayEmpty
                sx={{
                  backgroundColor: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                <MenuItem disabled value="">
                  <em>Select sources...</em>
                </MenuItem>
                {/* Select All Option */}
                <MenuItem
                  value="select-all-mapping-sources"
                  sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                >
                  <Checkbox
                    checked={selectedSources.length === availableSources.length && availableSources.length > 0}
                    indeterminate={selectedSources.length > 0 && selectedSources.length < availableSources.length}
                    size="small"
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
                {availableSources.map((source) => (
                  <MenuItem key={source.id} value={source.id}>
                    <Checkbox checked={selectedSources.indexOf(source.id) > -1} size="small" />
                    <ListItemText
                      primary={source.name}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Column Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Select Columns <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedColumns}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  if (value.includes('select-all-mapping-columns')) {
                    if (selectedColumns.length === filteredColumns.length) {
                      setSelectedColumns([]);
                    } else {
                      setSelectedColumns(filteredColumns.map(c => c.value));
                    }
                  } else {
                    setSelectedColumns(value);
                  }
                }}
                onClose={() => setColumnSearchQuery('')}
                input={<OutlinedInput />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const column = availableColumns.find(col => col.value === value);
                      return (
                        <Chip
                          key={value}
                          label={column?.label || value}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      );
                    })}
                  </Box>
                )}
                disabled={selectedSources.length === 0}
                displayEmpty
                sx={{
                  backgroundColor: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 400,
                    },
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
                    '&:hover': {
                      backgroundColor: 'white',
                    },
                    cursor: 'default',
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Search columns..."
                    fullWidth
                    value={columnSearchQuery}
                    onChange={(e) => setColumnSearchQuery(e.target.value)}
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
                  <em>{selectedSources.length === 0 ? 'Select sources first' : 'Select columns...'}</em>
                </MenuItem>
                {/* Select All Option */}
                {filteredColumns.length > 0 && (
                  <MenuItem
                    value="select-all-mapping-columns"
                    sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}
                  >
                    <Checkbox
                      checked={
                        filteredColumns.length > 0 &&
                        filteredColumns.every(col => selectedColumns.includes(col.value))
                      }
                      indeterminate={
                        filteredColumns.some(col => selectedColumns.includes(col.value)) &&
                        !filteredColumns.every(col => selectedColumns.includes(col.value))
                      }
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                )}
                {filteredColumns.map((column) => (
                  <MenuItem key={column.value} value={column.value}>
                    <Checkbox checked={selectedColumns.indexOf(column.value) > -1} size="small" />
                    <ListItemText
                      primary={column.label}
                      primaryTypographyProps={{ fontSize: '0.85rem' }}
                    />
                  </MenuItem>
                ))}
                {filteredColumns.length === 0 && selectedSources.length > 0 && (
                  <MenuItem disabled>
                    <em>No columns match your search</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {editingId && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleCancelEdit}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={editingId ? <Edit /> : <Add />}
              onClick={handleAddMapping}
              sx={{
                textTransform: 'none',
                fontSize: '0.85rem',
                backgroundColor: '#10B981',
                '&:hover': {
                  backgroundColor: '#059669',
                },
              }}
            >
              {editingId ? 'Update Mapping' : 'Add Mapping'}
            </Button>
          </Box>
        </Paper>

        {/* Mappings Table */}
        {mappings.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748' }}>
                Configured Mappings
              </Typography>
              <Chip
                label={`${mappings.length} mapping${mappings.length !== 1 ? 's' : ''}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              />
            </Box>
            <TableContainer
              component={Paper}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                maxHeight: 300,
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                    <TableCell sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem', width: '25%' }}>
                      Field Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem', width: '35%' }}>
                      Selected Sources
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem', width: '30%' }}>
                      Selected Columns
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem', width: '10%' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow
                      key={mapping.id}
                      hover
                      sx={{
                        backgroundColor: editingId === mapping.id ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                      }}
                    >
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'primary.main' }}>
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
                            // Extract field name from the value (format: sourceId::fieldName)
                            const fieldName = columnValue.includes('::') ? columnValue.split('::')[1] : columnValue;
                            // Try to find the label from available columns
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
                      <TableCell align="center" sx={{ py: 1 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditMapping(mapping)}
                            sx={{
                              color: 'info.main',
                              padding: '2px',
                              '&:hover': {
                                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                              },
                            }}
                          >
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteMapping(mapping.id)}
                            sx={{
                              color: 'error.main',
                              padding: '2px',
                              '&:hover': {
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              },
                            }}
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

        {mappings.length === 0 && (
          <Paper
            sx={{
              p: 3,
              textAlign: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No field mappings configured yet. Add your first mapping above.
            </Typography>
          </Paper>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClose}
          sx={{
            px: 2.5,
            textTransform: 'none',
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          sx={{
            px: 2.5,
            textTransform: 'none',
            backgroundColor: '#296695',
            '&:hover': {
              backgroundColor: '#1e4d6f',
            },
          }}
        >
          Save Mappings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldMappingDialog;
