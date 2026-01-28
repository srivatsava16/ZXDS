import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Paper,
  Typography,
  Autocomplete,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import { Add, Delete, Close } from '@mui/icons-material';

interface FilterCondition {
  id: string;
  field: string;
  dataType: string;
  operator: string;
  value: string;
  value2?: string; // For BETWEEN operator
}

interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  logicalOperator: 'AND' | 'OR'; // Operator within the group (between conditions)
  groupOperator?: 'AND' | 'OR'; // Operator to connect this group with the next group
}

interface FilterBuilderProps {
  headers: string[];
  onFilterChange?: (query: string) => void;
  onConfigChange?: (config: FilterGroup[]) => void; // New prop to emit config changes
  showDataType?: boolean;
  initialValue?: string; // For edit mode - existing filter query
  initialConfig?: FilterGroup[]; // For edit mode - existing filter configuration
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

const OPERATORS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater or Equal' },
  { value: '<=', label: 'Less or Equal' },
  { value: 'IS NULL', label: 'Is Null' },
  { value: 'IS NOT NULL', label: 'Is Not Null' },
  { value: 'BETWEEN', label: 'Between' },
  { value: 'LIKE', label: 'Contains' },
  { value: 'NOT LIKE', label: 'Not Contains' },
  { value: 'IN', label: 'In' },
  { value: 'NOT IN', label: 'Not In' },
];

const FilterBuilder: React.FC<FilterBuilderProps> = ({ 
  headers, 
  onFilterChange, 
  onConfigChange, 
  showDataType = true, 
  initialValue, 
  initialConfig 
}) => {
  const [groups, setGroups] = useState<FilterGroup[]>(initialConfig || [
    {
      id: Date.now().toString(),
      conditions: [
        {
          id: `${Date.now()}-1`,
          field: '',
          dataType: 'STRING',
          operator: '=',
          value: '',
        },
      ],
      logicalOperator: 'AND',
      groupOperator: 'OR', // Default operator between groups
    },
  ]);
  
  // Add state to track existing filter for display purposes
  const [existingFilter, setExistingFilter] = useState<string>(initialValue || '');
  const [showExistingFilter, setShowExistingFilter] = useState<boolean>(!!initialValue);

  // Handle initial query when component mounts with existing filter
  useEffect(() => {
    if (initialValue && onFilterChange) {
      onFilterChange(initialValue);
    } else if (initialConfig && onFilterChange && !initialValue) {
      // If we have initialConfig but no initialValue, generate SQL from config
      const generatedQuery = buildQuery(initialConfig);
      if (generatedQuery) {
        onFilterChange(generatedQuery);
      }
    }
  }, [initialValue, initialConfig]); // Removed onFilterChange from dependencies to prevent infinite loop

  const buildQuery = (groups: FilterGroup[]): string => {
    // Check if we have any actual conditions
    const hasActiveConditions = groups?.some(group => 
      group.conditions?.some(cond => cond.field && cond.operator && (cond.value || cond.operator?.includes('NULL')))
    );
    
    // If no active conditions but we have an existing filter, return the existing filter
    if (!hasActiveConditions && existingFilter && showExistingFilter) {
      return existingFilter;
    }
    
    if (groups?.length === 0 || !hasActiveConditions) return '';

    const groupQueries = groups?.map((group, index) => {
      const conditionQueries = group.conditions
        .filter((cond) => cond.field && cond.operator)
        .map((cond) => {
          if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') {
            return `(${cond.field} ${cond.operator})`;
          }
          if (cond.operator === 'BETWEEN') {
            return `(${cond.field} BETWEEN '${cond.value}' AND '${cond.value2 || ''}')`;
          }
          if (cond.operator === 'LIKE' || cond.operator === 'NOT LIKE') {
            return `(${cond.field} ${cond.operator} '%${cond.value}%')`;
          }
          return `(${cond.field} ${cond.operator} '${cond.value}')`;
        });

      if (conditionQueries?.length === 0) return { query: '', operator: group.groupOperator || 'OR' };
      const query = conditionQueries?.length === 1
        ? conditionQueries[0]
        : `(${conditionQueries?.join(` ${group.logicalOperator} `)})`;

      return { query, operator: group.groupOperator || 'OR' };
    });

    const validQueries = groupQueries?.filter((q) => q.query !== '');
    if (validQueries?.length === 0) return '';
    if (validQueries?.length === 1) return validQueries[0].query;

    // Build query with progressive nested parentheses
    let result = validQueries[0].query;
    
    for (let i = 1; i < validQueries?.length; i++) {
      const currentOperator = validQueries[i - 1].operator;
      result = `(${result} ${currentOperator} ${validQueries[i].query})`;
    }
    
    return result;
  };

  const handleAddCondition = (groupId: string) => {
    setGroups((prevGroups) => {
      const newGroups = prevGroups?.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: [
                ...group.conditions,
                {
                  id: `${Date.now()}-${group.conditions?.length}`,
                  field: '',
                  dataType: 'STRING',
                  operator: '=',
                  value: '',
                },
              ],
            }
          : group
      );

      const query = buildQuery(newGroups);
      if (onFilterChange) {
        onFilterChange(query);
      }
      if (onConfigChange) {
        onConfigChange(newGroups);
      }

      return newGroups;
    });
  };

  const handleRemoveCondition = (groupId: string, conditionId: string) => {
    setGroups((prevGroups) => {
      const newGroups = prevGroups?.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions?.filter((cond) => cond.id !== conditionId),
            }
          : group
      );

      const query = buildQuery(newGroups);
      if (onFilterChange) {
        onFilterChange(query);
      }
      if (onConfigChange) {
        onConfigChange(newGroups);
      }

      return newGroups;
    });
  };

  const handleAddGroup = () => {
    setGroups((prevGroups) => {
      const newGroups = [
        ...prevGroups,
        {
          id: Date.now().toString(),
          conditions: [
            {
              id: `${Date.now()}-1`,
              field: '',
              dataType: 'STRING',
              operator: '=',
              value: '',
            },
          ],
          logicalOperator: 'AND' as 'AND' | 'OR',
          groupOperator: 'OR' as 'AND' | 'OR', // Default operator for new groups
        },
      ];

      const query = buildQuery(newGroups);
      if (onFilterChange) {
        onFilterChange(query);
      }
      if (onConfigChange) {
        onConfigChange(newGroups);
      }

      return newGroups;
    });
  };

  const handleRemoveGroup = (groupId: string) => {
    if (groups?.length > 1) {
      setGroups((prevGroups) => {
        const newGroups = prevGroups?.filter((group) => group.id !== groupId);

        const query = buildQuery(newGroups);
        if (onFilterChange) {
          onFilterChange(query);
        }
        if (onConfigChange) {
          onConfigChange(newGroups);
        }

        return newGroups;
      });
    }
  };

  const handleConditionChange = (
    groupId: string,
    conditionId: string,
    field: keyof FilterCondition,
    value: string
  ) => {
    setGroups((prevGroups) => {
      const newGroups = prevGroups?.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions?.map((cond) =>
                cond.id === conditionId ? { ...cond, [field]: value } : cond
              ),
            }
          : group
      );

      const query = buildQuery(newGroups);
      if (onFilterChange) {
        onFilterChange(query);
      }
      if (onConfigChange) {
        onConfigChange(newGroups);
      }

      return newGroups;
    });
  };

  const handleLogicalOperatorChange = (groupId: string, operator: 'AND' | 'OR') => {
    setGroups((prevGroups) => {
      const newGroups = prevGroups?.map((group) =>
        group.id === groupId ? { ...group, logicalOperator: operator } : group
      );

      const query = buildQuery(newGroups);
      if (onFilterChange) {
        onFilterChange(query);
      }
      if (onConfigChange) {
        onConfigChange(newGroups);
      }

      return newGroups;
    });
  };

  const handleGroupOperatorChange = (groupId: string, operator: 'AND' | 'OR') => {
    setGroups((prevGroups) => {
      const newGroups = prevGroups?.map((group) =>
        group.id === groupId ? { ...group, groupOperator: operator } : group
      );

      const query = buildQuery(newGroups);
      if (onFilterChange) {
        onFilterChange(query);
      }
      if (onConfigChange) {
        onConfigChange(newGroups);
      }

      return newGroups;
    });
  };

  const query = buildQuery(groups);

  return (
    <Box>
      
      {/* Filter Builder - Always Visible */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Filters
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={handleAddGroup}
          sx={{ textTransform: 'none', fontSize: '0.8rem' }}
        >
          Add Group
        </Button>
      </Box>

      {groups?.map((group, groupIndex) => (
        <Box key={group.id}>
          <Paper
            sx={{
              p: 2,
              mb: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              backgroundColor: '#FAFBFC',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Group {groupIndex + 1}
              </Typography>
              {groups?.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() => handleRemoveGroup(group.id)}
                  sx={{ color: 'error.main' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>

            {group.conditions?.map((condition, condIndex) => (
              <Box key={condition.id}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    mb: 1.5,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Field Dropdown with Search */}
                  <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
                    <Autocomplete
                      size="small"
                      options={headers}
                      value={condition.field || null}
                      onChange={(_, newValue) =>
                        handleConditionChange(group.id, condition.id, 'field', newValue || '')
                      }
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Select field..." />
                      )}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        },
                      }}
                    />
                  </FormControl>

                  {/* Data Type Dropdown - Only shown for file sources */}
                  {showDataType && (
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <Select
                        value={condition.dataType}
                        onChange={(e) =>
                          handleConditionChange(group.id, condition.id, 'dataType', e.target.value)
                        }
                        displayEmpty
                        sx={{ backgroundColor: 'white' }}
                      >
                        {DATA_TYPES?.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {/* Operator Dropdown */}
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select
                      value={condition.operator}
                      onChange={(e) =>
                        handleConditionChange(group.id, condition.id, 'operator', e.target.value)
                      }
                      sx={{ backgroundColor: 'white' }}
                    >
                      {OPERATORS?.map((op) => (
                        <MenuItem key={op.value} value={op.value}>
                          {op.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Value Input (hide for IS NULL / IS NOT NULL) */}
                  {condition.operator !== 'IS NULL' && condition.operator !== 'IS NOT NULL' && (
                    <>
                      <TextField
                        size="small"
                        placeholder={condition.operator === 'BETWEEN' ? 'Value 1' : 'Enter value'}
                        value={condition.value}
                        onChange={(e) =>
                          handleConditionChange(group.id, condition.id, 'value', e.target.value)
                        }
                        sx={{
                          minWidth: 180,
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'white',
                          },
                        }}
                      />
                      {condition.operator === 'BETWEEN' && (
                        <TextField
                          size="small"
                          placeholder="Value 2"
                          value={condition.value2 || ''}
                          onChange={(e) =>
                            handleConditionChange(group.id, condition.id, 'value2', e.target.value)
                          }
                          sx={{
                            minWidth: 180,
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'white',
                            },
                          }}
                        />
                      )}
                    </>
                  )}

                  {/* Logical Operator (AND/OR) */}
                  {condIndex < group.conditions?.length - 1 && (
                    <Select
                      size="small"
                      value={group.logicalOperator}
                      onChange={(e) =>
                        handleLogicalOperatorChange(group.id, e.target.value as 'AND' | 'OR')
                      }
                      sx={{ minWidth: 80, backgroundColor: 'white' }}
                    >
                      <MenuItem value="AND">AND</MenuItem>
                      <MenuItem value="OR">OR</MenuItem>
                    </Select>
                  )}

                  {/* Delete Condition Button */}
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveCondition(group.id, condition.id)}
                    disabled={group.conditions?.length === 1}
                    sx={{
                      color: group.conditions?.length === 1 ? 'action.disabled' : 'error.main',
                    }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}

            <Button
              variant="text"
              size="small"
              startIcon={<Add />}
              onClick={() => handleAddCondition(group.id)}
              sx={{ textTransform: 'none', fontSize: '0.75rem', mt: 0.5 }}
            >
              Add Condition
            </Button>
          </Paper>

          {/* Group Operator Selector - Show between groups */}
          {groupIndex < groups?.length - 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mb: 2,
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '1px',
                  backgroundColor: 'divider',
                  zIndex: 0,
                }}
              />
              <ToggleButtonGroup
                value={group.groupOperator || 'OR'}
                exclusive
                onChange={(_, newOperator) => {
                  if (newOperator !== null) {
                    handleGroupOperatorChange(group.id, newOperator as 'AND' | 'OR');
                  }
                }}
                size="small"
                sx={{
                  backgroundColor: 'white',
                  zIndex: 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  '& .MuiToggleButton-root': {
                    px: 2.5,
                    py: 0.5,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  },
                }}
              >
                <ToggleButton value="AND">AND</ToggleButton>
                <ToggleButton value="OR">OR</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
        </Box>
      ))}

      {/* Query Display */}
      {query && (
        <Paper
          sx={{
            p: 2,
            backgroundColor: '#2D3748',
            color: '#F7FAFC',
            borderRadius: 2,
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#A0AEC0' }}>
            Generated Query:
          </Typography>
          {query}
        </Paper>
      )}

    </Box>
  );
};

export default FilterBuilder;
