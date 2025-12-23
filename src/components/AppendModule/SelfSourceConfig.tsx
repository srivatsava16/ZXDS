import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';

interface Condition {
  id: string;
  fields: string[];
  operator: string;
  valueToCompare: string;
  logicalOperator: 'AND' | 'OR';
}

interface AssignmentSet {
  id: string;
  generateColumn: string;
  valueToAssign: string;
  conditions: Condition[];
}

interface SelfSourceConfigProps {
  data: Partial<InputSource>;
  onChange: (data: Partial<InputSource>) => void;
  availableInputSources: InputSource[];
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_or_equal', label: 'Greater or Equal' },
  { value: 'less_or_equal', label: 'Less or Equal' },
  { value: 'is_null', label: 'Is Null' },
  { value: 'is_not_null', label: 'Is Not Null' },
  { value: 'between', label: 'Between' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
];

const SelfSourceConfig: React.FC<SelfSourceConfigProps> = ({
  data,
  onChange,
  availableInputSources,
}) => {
  // Initialize assignment sets
  const [assignmentSets, setAssignmentSets] = useState<AssignmentSet[]>([
    {
      id: '1',
      generateColumn: '',
      valueToAssign: '',
      conditions: [],
    },
  ]);

  // Input sources - not preselected, users must select manually
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');

  // Tiering On - multi-select dropdown
  const [tieringOnFields, setTieringOnFields] = useState<string[]>([]);
  const [tieringOnSearch, setTieringOnSearch] = useState('');

  // Current condition being built
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string>('1');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>('equals');
  const [valueToCompare, setValueToCompare] = useState<string>('');
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>('AND');

  // Search states
  const [fieldsSearch, setFieldsSearch] = useState('');

  // Get all fields from selected input sources
  const getAllFields = (): string[] => {
    const fieldsSet = new Set<string>();
    const selectedSources = availableInputSources.filter(src =>
      selectedInputSources.includes(src.sourceName)
    );
    selectedSources.forEach(src => {
      if (src.headers) {
        src.headers.forEach(field => fieldsSet.add(field));
      }
    });
    return Array.from(fieldsSet);
  };

  const allFields = getAllFields();

  // Filtered lists
  const filteredInputSources = availableInputSources.filter(source =>
    source.sourceName.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  const filteredFields = allFields.filter(field =>
    field.toLowerCase().includes(fieldsSearch.toLowerCase())
  );

  const filteredTieringOnFields = allFields.filter(field =>
    field.toLowerCase().includes(tieringOnSearch.toLowerCase())
  );

  // Update parent component data
  useEffect(() => {
    // Convert assignment sets to a format that can be stored
    const selfConfig = {
      sourceName: 'Self Append Source',
      sourceType: 'Self' as const,
      subSourceType: 'Self',
      headers: assignmentSets.map(set => set.generateColumn).filter(col => col !== ''),
      selfConfig: assignmentSets,
      selectedInputSources,
    };

    onChange(selfConfig as any);
  }, [assignmentSets, selectedInputSources]);

  const handleAddCondition = () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field');
      return;
    }
    if (!valueToCompare && selectedOperator !== 'is_empty' && selectedOperator !== 'is_not_empty' && selectedOperator !== 'is_null' && selectedOperator !== 'is_not_null') {
      alert('Please enter a value to compare');
      return;
    }

    const newCondition: Condition = {
      id: Date.now().toString(),
      fields: selectedFields,
      operator: selectedOperator,
      valueToCompare,
      logicalOperator,
    };

    setAssignmentSets(assignmentSets.map(set =>
      set.id === currentAssignmentId
        ? { ...set, conditions: [...set.conditions, newCondition] }
        : set
    ));

    // Reset condition form
    setSelectedFields([]);
    setValueToCompare('');
    setLogicalOperator('AND');
  };

  const handleDeleteCondition = (assignmentId: string, conditionId: string) => {
    setAssignmentSets(assignmentSets.map(set =>
      set.id === assignmentId
        ? { ...set, conditions: set.conditions.filter(c => c.id !== conditionId) }
        : set
    ));
  };

  const handleAddAssignmentSet = () => {
    const newSet: AssignmentSet = {
      id: Date.now().toString(),
      generateColumn: '',
      valueToAssign: '',
      conditions: [],
    };
    setAssignmentSets([...assignmentSets, newSet]);
    setCurrentAssignmentId(newSet.id);
  };

  const handleDeleteAssignmentSet = (id: string) => {
    if (assignmentSets.length === 1) {
      alert('At least one assignment set is required');
      return;
    }
    if (window.confirm('Are you sure you want to delete this assignment set?')) {
      setAssignmentSets(assignmentSets.filter(set => set.id !== id));
      if (currentAssignmentId === id) {
        setCurrentAssignmentId(assignmentSets[0].id);
      }
    }
  };

  const handleUpdateAssignmentSet = (id: string, field: 'generateColumn' | 'valueToAssign', value: string) => {
    setAssignmentSets(assignmentSets.map(set =>
      set.id === id ? { ...set, [field]: value } : set
    ));
  };

  return (
    <Box>
      {/* Input Sources Multi-Select */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
          Input Sources
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            multiple
            value={selectedInputSources}
            onChange={(e) => {
              const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
              if (value.includes('select-all')) {
                if (selectedInputSources.length === filteredInputSources.length) {
                  setSelectedInputSources([]);
                } else {
                  setSelectedInputSources(filteredInputSources.map(s => s.sourceName));
                }
              } else {
                setSelectedInputSources(value);
              }
            }}
            onClose={() => setInputSourcesSearch('')}
            input={<OutlinedInput />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                ))}
              </Box>
            )}
            displayEmpty
            MenuProps={{ PaperProps: { sx: { maxHeight: 300 } }, autoFocus: false }}
          >
            <MenuItem disabled value="">
              <em>Select input sources...</em>
            </MenuItem>
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
              />
            </MenuItem>
            <MenuItem value="select-all" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
              <Checkbox
                checked={filteredInputSources.length > 0 && selectedInputSources.length === filteredInputSources.length}
                indeterminate={selectedInputSources.length > 0 && selectedInputSources.length < filteredInputSources.length}
                size="small"
              />
              <ListItemText primary="Select All" />
            </MenuItem>
            {filteredInputSources.map((source) => (
              <MenuItem key={source.id} value={source.sourceName}>
                <Checkbox checked={selectedInputSources.indexOf(source.sourceName) > -1} size="small" />
                <ListItemText primary={source.sourceName} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Assignment Sets */}
      {assignmentSets.map((assignmentSet, index) => (
        <Paper
          key={assignmentSet.id}
          sx={{
            p: 2.5,
            mb: 2.5,
            backgroundColor: currentAssignmentId === assignmentSet.id ? '#F0F9FF' : 'white',
            border: '2px solid',
            borderColor: currentAssignmentId === assignmentSet.id ? '#3B82F6' : 'divider',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => setCurrentAssignmentId(assignmentSet.id)}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2D3748', fontSize: '0.95rem' }}>
              Assignment Set {index + 1}
            </Typography>
            {assignmentSets.length > 1 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAssignmentSet(assignmentSet.id);
                }}
                sx={{ color: 'error.main' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Generate Column & Value to Assign */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
            <TextField
              fullWidth
              size="small"
              label="Generate Column"
              placeholder="Enter column name..."
              value={assignmentSet.generateColumn}
              onChange={(e) => handleUpdateAssignmentSet(assignmentSet.id, 'generateColumn', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              required
              sx={{ backgroundColor: 'white' }}
            />
            <TextField
              fullWidth
              size="small"
              label="Value to Assign"
              placeholder="Enter value..."
              value={assignmentSet.valueToAssign}
              onChange={(e) => handleUpdateAssignmentSet(assignmentSet.id, 'valueToAssign', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              required
              sx={{ backgroundColor: 'white' }}
            />
          </Box>

          {/* Condition Builder - Only show for active assignment set */}
          {currentAssignmentId === assignmentSet.id && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.85rem' }}>
                Conditions
              </Typography>

              {/* Condition Builder Form */}
              <Box sx={{ p: 2, backgroundColor: '#F8FAFB', borderRadius: 2, mb: 2 }}>
                {/* Fields Dropdown */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: '#6B7280', fontSize: '0.75rem' }}>
                    Fields
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      multiple
                      value={selectedFields}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                        if (value.includes('select-all-fields')) {
                          if (selectedFields.length === filteredFields.length) {
                            setSelectedFields([]);
                          } else {
                            setSelectedFields(filteredFields);
                          }
                        } else {
                          setSelectedFields(value);
                        }
                      }}
                      onClose={() => setFieldsSearch('')}
                      onClick={(e) => e.stopPropagation()}
                      input={<OutlinedInput />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                          ))}
                        </Box>
                      )}
                      displayEmpty
                      MenuProps={{ PaperProps: { sx: { maxHeight: 250 } }, autoFocus: false }}
                      sx={{ backgroundColor: 'white' }}
                    >
                      <MenuItem disabled value="">
                        <em>Select fields...</em>
                      </MenuItem>
                      <MenuItem
                        disableRipple
                        disableTouchRipple
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, borderBottom: '1px solid #ddd', '&:hover': { backgroundColor: 'white' }, cursor: 'default' }}
                      >
                        <TextField
                          size="small"
                          placeholder="Search..."
                          fullWidth
                          value={fieldsSearch}
                          onChange={(e) => setFieldsSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </MenuItem>
                      <MenuItem value="select-all-fields" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                        <Checkbox
                          checked={filteredFields.length > 0 && selectedFields.length === filteredFields.length}
                          indeterminate={selectedFields.length > 0 && selectedFields.length < filteredFields.length}
                          size="small"
                        />
                        <ListItemText primary="Select All" />
                      </MenuItem>
                      {filteredFields.map((field) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={selectedFields.indexOf(field) > -1} size="small" />
                          <ListItemText primary={field} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Operator & Value Row */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: '#6B7280', fontSize: '0.75rem' }}>
                      Operator
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={selectedOperator}
                        onChange={(e) => setSelectedOperator(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ backgroundColor: 'white' }}
                      >
                        {OPERATORS.map((op) => (
                          <MenuItem key={op.value} value={op.value}>
                            {op.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: '#6B7280', fontSize: '0.75rem' }}>
                      Value to Compare
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Enter value..."
                      value={valueToCompare}
                      onChange={(e) => setValueToCompare(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={selectedOperator === 'is_empty' || selectedOperator === 'is_not_empty' || selectedOperator === 'is_null' || selectedOperator === 'is_not_null'}
                      sx={{ backgroundColor: 'white' }}
                    />
                  </Box>
                </Box>

                {/* AND/OR Toggle & Add Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: '#6B7280', fontSize: '0.75rem' }}>
                      Logical Operator
                    </Typography>
                    <ToggleButtonGroup
                      value={logicalOperator}
                      exclusive
                      onChange={(e, value) => {
                        if (value !== null) {
                          setLogicalOperator(value);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                      fullWidth
                      sx={{ backgroundColor: 'white' }}
                    >
                      <ToggleButton value="AND" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                        AND
                      </ToggleButton>
                      <ToggleButton value="OR" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                        OR
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <Box sx={{ alignSelf: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Add />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddCondition();
                      }}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        px: 2,
                        boxShadow: '0 2px 8px rgba(41, 102, 149, 0.3)',
                      }}
                    >
                      Add Condition
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Conditions Table */}
              {assignmentSet.conditions.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2D3748', fontSize: '0.85rem' }}>
                    Added Conditions ({assignmentSet.conditions.length})
                  </Typography>
                  <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', py: 0.75 }}>Fields</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', py: 0.75 }}>Operator</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', py: 0.75 }}>Value</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', py: 0.75 }}>Logic</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.7rem', py: 0.75 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {assignmentSet.conditions.map((condition) => (
                          <TableRow key={condition.id} hover>
                            <TableCell sx={{ py: 0.75 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {condition.fields.map((field) => (
                                  <Chip key={field} label={field} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>
                              {OPERATORS.find(op => op.value === condition.operator)?.label}
                            </TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>
                              {condition.valueToCompare || '-'}
                            </TableCell>
                            <TableCell sx={{ py: 0.75 }}>
                              <Chip
                                label={condition.logicalOperator}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  backgroundColor: condition.logicalOperator === 'AND' ? '#DBEAFE' : '#FEF3C7',
                                  color: condition.logicalOperator === 'AND' ? '#1E40AF' : '#92400E',
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.75 }}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCondition(assignmentSet.id, condition.id);
                                }}
                                sx={{ color: 'error.main' }}
                              >
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
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
        </Paper>
      ))}

      {/* Add Assignment Set Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleAddAssignmentSet}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            px: 3,
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            },
          }}
        >
          Add Assignment Set
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Tiering On Multi-Select - Placed at the end */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
          Tiering On
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            multiple
            value={tieringOnFields}
            onChange={(e) => {
              const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
              if (value.includes('select-all-tiering')) {
                if (tieringOnFields.length === filteredTieringOnFields.length) {
                  setTieringOnFields([]);
                } else {
                  setTieringOnFields(filteredTieringOnFields);
                }
              } else {
                setTieringOnFields(value);
              }
            }}
            onClose={() => setTieringOnSearch('')}
            input={<OutlinedInput />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Select tiering fields...
                  </Typography>
                ) : (
                  selected.map((value) => (
                    <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                  ))
                )}
              </Box>
            )}
            displayEmpty
            MenuProps={{ PaperProps: { sx: { maxHeight: 300 } }, autoFocus: false }}
          >
            <MenuItem disabled value="">
              <em>Select tiering fields...</em>
            </MenuItem>
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
                placeholder="Search fields..."
                fullWidth
                value={tieringOnSearch}
                onChange={(e) => setTieringOnSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </MenuItem>
            <MenuItem value="select-all-tiering" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
              <Checkbox
                checked={filteredTieringOnFields.length > 0 && tieringOnFields.length === filteredTieringOnFields.length}
                indeterminate={tieringOnFields.length > 0 && tieringOnFields.length < filteredTieringOnFields.length}
                size="small"
              />
              <ListItemText primary="Select All" />
            </MenuItem>
            {filteredTieringOnFields.map((field) => (
              <MenuItem key={field} value={field}>
                <Checkbox checked={tieringOnFields.indexOf(field) > -1} size="small" />
                <ListItemText primary={field} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
          Select fields to use for tiering logic
        </Typography>
      </Box>
    </Box>
  );
};

export default SelfSourceConfig;
