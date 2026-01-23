import { useState, useEffect, useRef, useMemo } from 'react';
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
  Divider,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import FilterBuilder from '../InputModule/FilterBuilder';

interface AssignmentSet {
  value_to_assign: string;
  filter_sql: string;
  filter_config?: any; // Filter configuration for restoring in edit mode
}

interface SelfConfig {
  input_source_names: string[];
  generated_column: string;
  generated_datatype: string;
  assignment_sets: AssignmentSet[];
  tiering_on: string;
}

interface SelfSourceConfigProps {
  data: Partial<InputSource>;
  onChange: (data: Partial<InputSource>) => void;
  availableInputSources: InputSource[];
  appendConfigs?: any[]; // Append configurations to determine appended fields for each source
}

const DATA_TYPES = [
  { value: 'STRING', label: 'String' },
  { value: 'INTEGER', label: 'Integer' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'DateTime' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'VARCHAR', label: 'VarChar' },
  { value: 'TEXT', label: 'Text' },
];

const SelfSourceConfig: React.FC<SelfSourceConfigProps> = ({
  data,
  onChange,
  availableInputSources,
  appendConfigs = [],
}) => {
  // Track initialization to prevent infinite loops
  const isInitializing = useRef(true);
  const prevDataStringRef = useRef('');
  const isManuallyEdited = useRef(false); // Track if user manually edited source name

  // Source name
  const [sourceName, setSourceName] = useState<string>(data.sourceName || '');

  // Generated column config
  const [generatedColumn, setGeneratedColumn] = useState<string>('');
  const [generatedDatatype, setGeneratedDatatype] = useState<string>('STRING');

  // Input sources - store source NAMES not IDs
  const [inputSourceNames, setInputSourceNames] = useState<string[]>([]);
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');

  // Assignment sets - multiple conditions
  const [assignmentSets, setAssignmentSets] = useState<AssignmentSet[]>([
    { value_to_assign: '', filter_sql: '', filter_config: null }
  ]);

  // Tiering On - multi-select dropdown (will be comma-separated string)
  const [tieringOnFields, setTieringOnFields] = useState<string[]>([]);
  const [tieringOnSearch, setTieringOnSearch] = useState('');

  // Get all fields from selected input sources - memoized to prevent recalculation on every render
  const allFields = useMemo(() => {
    console.log('[SelfSourceConfig] Calculating allFields');
    console.log('  inputSourceNames:', inputSourceNames);
    console.log('  availableInputSources count:', availableInputSources.length);
    console.log('  appendConfigs count:', appendConfigs?.length || 0);

    const fieldsSet = new Set<string>();
    const selectedSources = availableInputSources.filter(src =>
      inputSourceNames.includes(src.sourceName)
    );

    console.log('  selectedSources count:', selectedSources.length);

    selectedSources.forEach(src => {
      // Always use the full headers array to show ALL available fields
      // Don't use selectedHeaders here - we want all fields to be available in filters
      const headersToUse = src.headers;

      console.log(`  Source "${src.sourceName}":`, {
        hasHeaders: !!headersToUse,
        isArray: Array.isArray(headersToUse),
        headersCount: headersToUse?.length || 0,
        headers: headersToUse
      });

      if (headersToUse && Array.isArray(headersToUse)) {
        headersToUse.forEach(field => fieldsSet.add(field));
      }

      // IMPORTANT: Add appended fields from configurations
      // Check if any append config targets this source
      if (appendConfigs && appendConfigs.length > 0) {
        console.log(`  Checking ${appendConfigs.length} append configs for "${src.sourceName}"`);
        appendConfigs.forEach((config, idx) => {
          console.log(`    Config ${idx + 1}:`, {
            id: config.id,
            inputSources: config.inputSources,
            appendFields: config.appendFields,
            appendOnFields: config.appendOnFields,
            fullConfig: config
          });

          // Check if this config targets the current source (by ID or by name)
          const matchesById = config.inputSources && config.inputSources.includes(src.id);
          const matchesByName = config.inputSources && config.inputSources.includes(src.sourceName);

          if (matchesById || matchesByName) {
            console.log(`  ✓ Found append config for "${src.sourceName}":`, {
              appendFields: config.appendFields
            });
            // Add the appended fields from this config
            if (config.appendFields && Array.isArray(config.appendFields)) {
              config.appendFields.forEach((field: string) => fieldsSet.add(field));
              console.log(`    Added ${config.appendFields.length} appended fields:`, config.appendFields);
            }
          } else {
            console.log(`  ✗ Config does not target "${src.sourceName}"`);
          }
        });
      }
    });

    const result = Array.from(fieldsSet);
    console.log('  Final allFields (including appended):', result);
    return result;
  }, [inputSourceNames, availableInputSources, appendConfigs]);


  // Filtered lists
  const filteredInputSources = availableInputSources.filter(source =>
    source.sourceName.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  // Log available sources for debugging
  useEffect(() => {
    console.log('[SelfSourceConfig] Available Input Sources:', availableInputSources.map(src => ({
      id: src.id,
      sourceName: src.sourceName,
      sourceType: src.sourceType,
      isVersioned: src.isVersioned,
      headersCount: src.headers?.length || 0,
      headers: src.headers
    })));
  }, [availableInputSources]);

  const filteredTieringOnFields = allFields.filter(field =>
    field.toLowerCase().includes(tieringOnSearch.toLowerCase())
  );

  // Initialize state from data prop (for edit mode)
  useEffect(() => {
    if (data.sourceName) {
      setSourceName(data.sourceName);
    }

    if (data.selfConfig) {
      if (data.selfConfig.input_source_names) {
        setInputSourceNames(data.selfConfig.input_source_names);
      }

      if (data.selfConfig.generated_column) {
        setGeneratedColumn(data.selfConfig.generated_column);
      }

      if (data.selfConfig.generated_datatype) {
        setGeneratedDatatype(data.selfConfig.generated_datatype);
      }

      if (data.selfConfig.assignment_sets && data.selfConfig.assignment_sets.length > 0) {
        setAssignmentSets(data.selfConfig.assignment_sets);
      }

      if (data.selfConfig.tiering_on) {
        const tieringFields = data.selfConfig.tiering_on.split(',').map(f => f.trim()).filter(f => f);
        setTieringOnFields(tieringFields);
      }
    }

    // Mark initialization as complete after a short delay
    setTimeout(() => {
      isInitializing.current = false;
    }, 100);
  }, []); // Only on mount

  // Auto-generate source name when generated column or input sources change
  useEffect(() => {
    // Skip during initialization
    if (isInitializing.current) {
      return;
    }

    // Skip if user has manually edited the source name
    if (isManuallyEdited.current) {
      return;
    }

    // Skip if already in edit mode with existing source name
    if (data.sourceName && data.id) {
      return;
    }

    // Auto-generate source name when both conditions are met
    if (generatedColumn && inputSourceNames.length > 0) {
      const autoSourceName = `Self_${generatedColumn}`;
      setSourceName(autoSourceName);
    }
  }, [generatedColumn, inputSourceNames, data.sourceName, data.id]);

  // Update parent component when local state changes
  useEffect(() => {
    // Skip during initialization
    if (isInitializing.current) {
      return;
    }

    // Build the selfConfig object matching backend format
    const selfConfig: SelfConfig = {
      input_source_names: inputSourceNames,
      generated_column: generatedColumn,
      generated_datatype: generatedDatatype,
      assignment_sets: assignmentSets,
      tiering_on: tieringOnFields.join(','),
    };

    const updatedData = {
      sourceName: sourceName || 'Self Append Source',
      sourceType: 'Self' as const,
      subSourceType: 'Self',
      headers: generatedColumn ? [generatedColumn] : [],
      selfConfig,
      isSelfSource: true,
    };

    // Check if data actually changed to prevent unnecessary updates
    const currentDataString = JSON.stringify(updatedData);
    if (currentDataString !== prevDataStringRef.current) {
      prevDataStringRef.current = currentDataString;
      onChange(updatedData as any);
    }
  }, [sourceName, inputSourceNames, generatedColumn, generatedDatatype, assignmentSets, tieringOnFields, onChange]);

  // Handle adding new assignment set
  const handleAddAssignmentSet = () => {
    setAssignmentSets([...assignmentSets, { value_to_assign: '', filter_sql: '', filter_config: null }]);
  };

  // Handle removing assignment set
  const handleRemoveAssignmentSet = (index: number) => {
    if (assignmentSets.length > 1) {
      setAssignmentSets(assignmentSets.filter((_, i) => i !== index));
    }
  };

  // Handle updating assignment set
  const handleUpdateAssignmentSet = (index: number, field: keyof AssignmentSet, value: string) => {
    const updated = [...assignmentSets];
    updated[index] = { ...updated[index], [field]: value };
    setAssignmentSets(updated);
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
            value={inputSourceNames}
            onChange={(e) => {
              const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
              if (value.includes('select-all')) {
                if (inputSourceNames.length === filteredInputSources.length) {
                  setInputSourceNames([]);
                } else {
                  setInputSourceNames(filteredInputSources.map(s => s.sourceName));
                }
              } else {
                setInputSourceNames(value);
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
                checked={filteredInputSources.length > 0 && inputSourceNames.length === filteredInputSources.length}
                indeterminate={inputSourceNames.length > 0 && inputSourceNames.length < filteredInputSources.length}
                size="small"
              />
              <ListItemText primary="Select All" />
            </MenuItem>
            {filteredInputSources.map((source) => (
              <MenuItem key={source.id} value={source.sourceName}>
                <Checkbox checked={inputSourceNames.indexOf(source.sourceName) > -1} size="small" />
                <ListItemText primary={source.sourceName} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Generated Column Configuration */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
          Generated Column Configuration
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Generated Column Name"
            placeholder="e.g., customer_tier"
            value={generatedColumn}
            onChange={(e) => setGeneratedColumn(e.target.value)}
            required
          />
          <FormControl fullWidth size="small">
            <InputLabel>Data Type</InputLabel>
            <Select
              value={generatedDatatype}
              onChange={(e) => setGeneratedDatatype(e.target.value)}
              label="Data Type"
              required
            >
              {DATA_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Assignment Sets */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
            Assignment Sets (Conditions)
            <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={handleAddAssignmentSet}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              px: 1.5,
              py: 0.5,
            }}
          >
            Add Condition
          </Button>
        </Box>

        {assignmentSets.map((set, index) => (
          <Paper
            key={index}
            sx={{
              p: 2.5,
              mb: 2,
              backgroundColor: 'white',
              border: '2px solid',
              borderColor: '#3B82F6',
              borderRadius: 2,
              position: 'relative',
            }}
          >
            {/* Header with delete button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2D3748', fontSize: '0.95rem' }}>
                Condition #{index + 1}
              </Typography>
              {assignmentSets.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() => handleRemoveAssignmentSet(index)}
                  sx={{
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Value to Assign */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Value to Assign"
                placeholder="e.g., Platinum, Gold, etc."
                value={set.value_to_assign}
                onChange={(e) => handleUpdateAssignmentSet(index, 'value_to_assign', e.target.value)}
                required
              />
            </Box>

            {/* Filter SQL - Show only if fields are available */}
            {allFields.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block', color: '#2D3748' }}>
                  Filter Condition (SQL)
                </Typography>
                <FilterBuilder
                  headers={allFields}
                  initialValue={set.filter_sql}
                  initialConfig={set.filter_config}
                  onFilterChange={(query) => {
                    handleUpdateAssignmentSet(index, 'filter_sql', query);
                  }}
                  onConfigChange={(config) => {
                    handleUpdateAssignmentSet(index, 'filter_config', config as any);
                  }}
                />
              </Box>
            )}
          </Paper>
        ))}

        {allFields.length === 0 && inputSourceNames.length > 0 && (
          <Typography variant="caption" sx={{ color: 'warning.main', fontStyle: 'italic', display: 'block', mt: 1 }}>
            ⚠️ Selected input sources have no headers. Please ensure input sources are properly configured.
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Tiering On Multi-Select - SIMPLIFIED VERSION */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
          Tiering On (Fields used for logic)
        </Typography>

        {/* Debug info for troubleshooting */}
        {inputSourceNames.length > 0 && allFields.length === 0 && (
          <Box sx={{ mb: 1.5, p: 1.5, backgroundColor: '#FEF3C7', borderRadius: 1, border: '1px solid #F59E0B' }}>
            <Typography variant="caption" sx={{ color: '#92400E', fontWeight: 600, display: 'block', mb: 0.5 }}>
              ⚠️ No fields available from selected input sources
            </Typography>
            <Typography variant="caption" sx={{ color: '#92400E', fontSize: '0.7rem' }}>
              The selected input sources don't have headers configured. Please ensure your input sources are properly configured with columns/headers.
            </Typography>
          </Box>
        )}

        <FormControl fullWidth size="small">
          <Select
            multiple
            value={tieringOnFields}
            onChange={(e) => {
              const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
              setTieringOnFields(value);
            }}
            onClose={() => setTieringOnSearch('')}
            input={<OutlinedInput />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.length === 0 ? (
                  <Typography variant="body2" sx={{ color: allFields.length === 0 ? 'error.main' : 'text.secondary', fontSize: '0.875rem' }}>
                    {allFields.length === 0 ? 'No fields available - check input sources' : 'Select tiering fields...'}
                  </Typography>
                ) : (
                  selected.map((value) => (
                    <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                  ))
                )}
              </Box>
            )}
            displayEmpty
            disabled={allFields.length === 0}
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 300,
                  '& .MuiMenuItem-root': {
                    minHeight: 36
                  }
                }
              },
              autoFocus: false,
              disableAutoFocusItem: true
            }}
          >
            {allFields.length === 0 ? (
              <MenuItem disabled>
                <em>{inputSourceNames.length === 0 ? 'Select input sources first' : 'No fields available'}</em>
              </MenuItem>
            ) : [
              <MenuItem key="header" disabled>
                <em>Select tiering fields ({allFields.length} available)</em>
              </MenuItem>,
              ...allFields.map((field) => (
                <MenuItem
                  key={field}
                  value={field}
                >
                  <Checkbox
                    checked={tieringOnFields.indexOf(field) > -1}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <ListItemText primary={field} />
                </MenuItem>
              ))
            ]}
          </Select>
        </FormControl>

        {allFields.length > 0 ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
            Select fields that are used in the filter conditions above. You can select multiple fields.
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ color: 'warning.main', fontSize: '0.75rem', mt: 0.5, display: 'block', fontStyle: 'italic' }}>
            {inputSourceNames.length === 0
              ? 'Please select input sources first to see available fields'
              : 'No fields available from selected input sources - they may not be configured properly'}
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Source Name - Auto-generated, always shown at the end */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
          Source Name
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Auto-generated based on generated column"
          value={sourceName}
          onChange={(e) => {
            setSourceName(e.target.value);
            isManuallyEdited.current = true; // Mark as manually edited
          }}
          required
          helperText="Source name will be auto-generated from the generated column name"
          sx={{
            '& .MuiFormHelperText-root': {
              fontSize: '0.7rem',
              mt: 0.5
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default SelfSourceConfig;
