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
  { value: 'TIMESTAMP', label: 'Timestamp' },
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
    const fieldsSet = new Set<string>();
    const selectedSources = availableInputSources?.filter(src =>
      inputSourceNames?.includes(src?.sourceName)
    );


    selectedSources?.forEach(src => {
      // Always use the full headers array to show ALL available fields
      // Don't use selectedHeaders here - we want all fields to be available in filters
      const headersToUse = src?.headers;

      if (headersToUse && Array.isArray(headersToUse)) {
        headersToUse?.forEach(field => fieldsSet?.add(field));
      }

      // IMPORTANT: Add appended fields from configurations
      // Check if any append config targets this source
      if (appendConfigs && appendConfigs?.length > 0) {
        appendConfigs?.forEach((config, idx) => {

          // Check if this config targets the current source (by ID or by name)
          const matchesById = config?.inputSources && config?.inputSources?.includes(src?.id);
          const matchesByName = config?.inputSources && config?.inputSources?.includes(src?.sourceName);

          if (matchesById || matchesByName) {
            // Add the appended fields from this config
            if (config?.appendFields && Array.isArray(config?.appendFields)) {
              config?.appendFields?.forEach((field: string) => fieldsSet?.add(field));
            }
          }
        });
      }
    });

    const result = Array.from(fieldsSet);
    return result;
  }, [inputSourceNames, availableInputSources, appendConfigs]);


  // Filtered lists
  const filteredInputSources = availableInputSources?.filter(source =>
    source?.sourceName?.toLowerCase()?.includes(inputSourcesSearch?.toLowerCase())
  );


  // Initialize state from data prop (for edit mode)
  useEffect(() => {
    if (data?.sourceName) {
      setSourceName(data?.sourceName);
    }

    if (data?.selfConfig) {
      if (data?.selfConfig?.input_source_names) {
        setInputSourceNames(data?.selfConfig?.input_source_names);
      }

      if (data?.selfConfig?.generated_column) {
        setGeneratedColumn(data?.selfConfig?.generated_column);
      }

      if (data?.selfConfig?.generated_datatype) {
        setGeneratedDatatype(data?.selfConfig?.generated_datatype);
      }

      if (data?.selfConfig?.assignment_sets && data?.selfConfig?.assignment_sets?.length > 0) {
        setAssignmentSets(data?.selfConfig?.assignment_sets);
      }

      if (data?.selfConfig?.tiering_on) {
        const tieringFields = data?.selfConfig?.tiering_on?.split(',')?.map(f => f?.trim())?.filter(f => f);
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
    if (isInitializing?.current) {
      return;
    }

    // Skip if user has manually edited the source name
    if (isManuallyEdited?.current) {
      return;
    }

    // Skip if already in edit mode with existing source name
    if (data?.sourceName && data?.id) {
      return;
    }

    // Auto-generate source name when both conditions are met
    if (generatedColumn && inputSourceNames?.length > 0) {
      const autoSourceName = `Self_${generatedColumn}`;
      setSourceName(autoSourceName);
    }
  }, [generatedColumn, inputSourceNames, data?.sourceName, data?.id]);

  // Update parent component when local state changes
  useEffect(() => {
    // Skip during initialization
    if (isInitializing?.current) {
      return;
    }
    // Build the selfConfig object matching backend format
    const selfConfig: SelfConfig = {
      input_source_names: inputSourceNames,
      generated_column: generatedColumn,
      generated_datatype: generatedDatatype,
      assignment_sets: assignmentSets,
      tiering_on: tieringOnFields?.join(','),
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
    const currentDataString = JSON?.stringify(updatedData);
    if (currentDataString !== prevDataStringRef?.current) {
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
    if (assignmentSets?.length > 1) {
      setAssignmentSets(assignmentSets?.filter((_, i) => i !== index));
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
      {/* Input Sources Multi-Select - Compact */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2D3748', fontSize: '0.85rem' }}>
          Input Sources
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            multiple
            value={inputSourceNames}
            onChange={(e) => {
              const value = typeof e?.target?.value === 'string' ? e?.target?.value?.split(',') : e?.target?.value;
              if (value?.includes('select-all')) {
                if (inputSourceNames?.length === filteredInputSources?.length) {
                  setInputSourceNames([]);
                } else {
                  setInputSourceNames(filteredInputSources?.map(s => s?.sourceName));
                }
              } else {
                setInputSourceNames(value);
              }
            }}
            onClose={() => setInputSourcesSearch('')}
            input={<OutlinedInput sx={{ fontSize: '0.875rem' }} />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected?.map((value) => (
                  <Chip key={value} label={value} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                ))}
              </Box>
            )}
            displayEmpty
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 280,
                  '& .MuiMenuItem-root': {
                    minHeight: 32,
                    fontSize: '0.85rem',
                    py: 0.5
                  }
                }
              },
              autoFocus: false
            }}
          >
            <MenuItem disabled value="" sx={{ fontSize: '0.8rem' }}>
              <em>Select input sources...</em>
            </MenuItem>
            <MenuItem
              disableRipple
              disableTouchRipple
              onKeyDown={(e) => e?.stopPropagation()}
              sx={{
                position: 'sticky',
                top: 0,
                backgroundColor: 'white',
                zIndex: 1,
                borderBottom: '1px solid #ddd',
                '&:hover': { backgroundColor: 'white' },
                cursor: 'default',
                py: 0.5
              }}
            >
              <TextField
                size="small"
                placeholder="Search..."
                fullWidth
                value={inputSourcesSearch}
                onChange={(e) => setInputSourcesSearch(e?.target?.value)}
                onClick={(e) => e?.stopPropagation()}
                onKeyDown={(e) => e?.stopPropagation()}
                sx={{
                  '& .MuiInputBase-root': {
                    fontSize: '0.85rem',
                    py: 0.25
                  }
                }}
              />
            </MenuItem>
            <MenuItem value="select-all" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd', fontSize: '0.85rem' }}>
              <Checkbox
                checked={filteredInputSources?.length > 0 && inputSourceNames?.length === filteredInputSources?.length}
                indeterminate={inputSourceNames?.length > 0 && inputSourceNames?.length < filteredInputSources?.length}
                size="small"
                sx={{ p: 0.25, mr: 0.75 }}
              />
              <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: '0.85rem' }} />
            </MenuItem>
            {filteredInputSources?.map((source) => (
              <MenuItem key={source?.id} value={source?.sourceName}>
                <Checkbox checked={inputSourceNames?.indexOf(source?.sourceName) > -1} size="small" sx={{ p: 0.25, mr: 0.75 }} />
                <ListItemText primary={source?.sourceName} primaryTypographyProps={{ fontSize: '0.85rem' }} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Generated Column Configuration - Compact */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2D3748', fontSize: '0.85rem' }}>
          Generated Column Configuration
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="Generated Column Name"
            placeholder="e.g., customer_tier"
            value={generatedColumn}
            onChange={(e) => setGeneratedColumn(e?.target?.value)}
            required
            sx={{
              '& .MuiInputBase-root': { fontSize: '0.875rem' },
              '& .MuiInputLabel-root': { fontSize: '0.875rem' }
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: '0.875rem' }}>Data Type</InputLabel>
            <Select
              value={generatedDatatype}
              onChange={(e) => setGeneratedDatatype(e?.target?.value)}
              label="Data Type"
              required
              sx={{ fontSize: '0.875rem' }}
            >
              {DATA_TYPES?.map((type) => (
                <MenuItem key={type?.value} value={type?.value} sx={{ fontSize: '0.875rem' }}>
                  {type?.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Assignment Sets - Compact */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem' }}>
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
              fontSize: '0.7rem',
              px: 1.25,
              py: 0.375,
              minHeight: 'unset',
              height: '28px'
            }}
          >
            Add Condition
          </Button>
        </Box>

        {assignmentSets?.map((set, index) => (
          <Paper
            key={index}
            sx={{
              p: 1.5,
              mb: 1.5,
              backgroundColor: '#F8FAFB',
              border: '1px solid',
              borderColor: '#CBD5E0',
              borderRadius: 1.5,
              position: 'relative',
            }}
          >
            {/* Header with delete button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.8rem' }}>
                Condition #{index + 1}
              </Typography>
              {assignmentSets?.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() => handleRemoveAssignmentSet(index)}
                  sx={{
                    color: 'error.main',
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    },
                  }}
                >
                  <Delete sx={{ fontSize: '1rem' }} />
                </IconButton>
              )}
            </Box>

            {/* Value to Assign */}
            <Box sx={{ mb: 1.25 }}>
              <TextField
                fullWidth
                size="small"
                label="Value to Assign"
                placeholder="e.g., Platinum, Gold, etc."
                value={set?.value_to_assign}
                onChange={(e) => handleUpdateAssignmentSet(index, 'value_to_assign', e?.target?.value)}
                required
                sx={{
                  '& .MuiInputBase-root': { fontSize: '0.875rem', py: 0.5 },
                  '& .MuiInputLabel-root': { fontSize: '0.875rem' }
                }}
              />
            </Box>

            {/* Filter SQL - Show only if fields are available */}
            {allFields?.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.75, display: 'block', color: '#2D3748', fontSize: '0.75rem' }}>
                  Filter Condition (SQL)
                </Typography>
                <FilterBuilder
                  headers={allFields}
                  initialValue={set?.filter_sql}
                  initialConfig={set?.filter_config}
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

        {allFields?.length === 0 && inputSourceNames?.length > 0 && (
          <Typography variant="caption" sx={{ color: 'warning.main', fontStyle: 'italic', display: 'block', mt: 0.75, fontSize: '0.75rem' }}>
            ⚠️ Selected input sources have no headers. Please ensure input sources are properly configured.
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Tiering On Multi-Select - Compact */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2D3748', fontSize: '0.85rem' }}>
          Tiering On (Fields used for logic)
        </Typography>

        {/* Warning message - more compact */}
        {inputSourceNames?.length > 0 && allFields?.length === 0 && (
          <Box sx={{ mb: 1, p: 1, backgroundColor: '#FEF3C7', borderRadius: 1, border: '1px solid #F59E0B' }}>
            <Typography variant="caption" sx={{ color: '#92400E', fontWeight: 600, display: 'block', fontSize: '0.7rem', mb: 0.25 }}>
              ⚠️ No fields available from selected input sources
            </Typography>
            <Typography variant="caption" sx={{ color: '#92400E', fontSize: '0.65rem' }}>
              The selected input sources don't have headers configured. Please ensure your input sources are properly configured with columns/headers.
            </Typography>
          </Box>
        )}

        <FormControl fullWidth size="small">
          <Select
            multiple
            value={tieringOnFields}
            onChange={(e) => {
              const value = typeof e?.target?.value === 'string' ? e?.target?.value?.split(',') : e?.target?.value;
              setTieringOnFields(value);
            }}
            onClose={() => setTieringOnSearch('')}
            input={<OutlinedInput sx={{ fontSize: '0.875rem' }} />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected?.length === 0 ? (
                  <Typography variant="body2" sx={{ color: allFields?.length === 0 ? 'error.main' : 'text.secondary', fontSize: '0.8rem' }}>
                    {allFields?.length === 0 ? 'No fields available - check input sources' : 'Select tiering fields...'}
                  </Typography>
                ) : (
                  selected?.map((value) => (
                    <Chip key={value} label={value} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                  ))
                )}
              </Box>
            )}
            displayEmpty
            disabled={allFields?.length === 0}
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 280,
                  '& .MuiMenuItem-root': {
                    minHeight: 32,
                    fontSize: '0.85rem',
                    py: 0.5
                  }
                }
              },
              autoFocus: false,
              disableAutoFocusItem: true
            }}
          >
            {allFields?.length === 0 ? (
              <MenuItem disabled>
                <em>{inputSourceNames?.length === 0 ? 'Select input sources first' : 'No fields available'}</em>
              </MenuItem>
            ) : [
              <MenuItem key="header" disabled sx={{ fontSize: '0.8rem' }}>
                <em>Select tiering fields ({allFields?.length} available)</em>
              </MenuItem>,
              ...(allFields || []).map((field) => (
                <MenuItem
                  key={field}
                  value={field}
                >
                  <Checkbox
                    checked={tieringOnFields?.indexOf(field) > -1}
                    size="small"
                    sx={{ mr: 0.75, p: 0.25 }}
                  />
                  <ListItemText primary={field} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                </MenuItem>
              ))
            ]}
          </Select>
        </FormControl>

        {allFields?.length > 0 ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
            Select fields that are used in the filter conditions above. You can select multiple fields.
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ color: 'warning.main', fontSize: '0.7rem', mt: 0.5, display: 'block', fontStyle: 'italic' }}>
            {inputSourceNames?.length === 0
              ? 'Please select input sources first to see available fields'
              : 'No fields available from selected input sources - they may not be configured properly'}
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Source Name - Auto-generated, always shown at the end */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#2D3748', fontSize: '0.85rem' }}>
          Source Name
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Auto-generated based on generated column"
          value={sourceName}
          onChange={(e) => {
            setSourceName(e?.target?.value || '');
            isManuallyEdited.current = true; // Mark as manually edited
          }}
          required
          helperText="Source name will be auto-generated from the generated column name"
          sx={{
            '& .MuiInputBase-root': { fontSize: '0.875rem', py: 0.5 },
            '& .MuiInputLabel-root': { fontSize: '0.875rem' },
            '& .MuiFormHelperText-root': {
              fontSize: '0.65rem',
              mt: 0.5
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default SelfSourceConfig;
