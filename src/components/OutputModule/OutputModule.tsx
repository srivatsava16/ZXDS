import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  OutlinedInput,
  FormControl,
  ListItemText,
  FormControlLabel,
  TextField,
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
import { Add, Delete, Edit, AccountTree, Visibility } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';
import type { RequestInputsResponse } from '../../services/api';
import DraggableOutputSources from './DraggableOutputSources';
import OutputDestinationDialog, { type OutputDestination } from './OutputDestinationDialog';
import FieldMappingDialog, { type FieldMapping } from '../AppendModule/FieldMappingDialog';
import { generateId } from '../../utils/idGenerator';
import { useNotification } from '../../contexts/NotificationContext';
import { transformOutputConfigurationsToAPI, type OutputAPIPayload } from './outputTransformers';

export interface OutputConfig {
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
  destinations: string[]; // Legacy: destination names for backward compatibility
  destinationId?: number; // Destination ID from API
  destinationName?: string; // Destination name for display
  destinationType?: string; // SFTP, NFS, AWS S3
  isCustomDestination?: boolean; // true = user-created, false/undefined = preconfigured
  fieldMappings?: FieldMapping[];
}

interface AppendConfig {
  id: string;
  inputSources: string[];
  appendFields?: string[];
}

interface OutputModuleProps {
  availableInputSources?: InputSource[];
  onOutputChange?: (outputSource: string) => void;
  initialConfigs?: OutputConfig[];
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
  onConfigurationsChange?: (configurations: OutputConfig[]) => void;
  onTransformedDataChange?: (transformedData: OutputAPIPayload | null) => void;
  appendConfigurations?: AppendConfig[]; // To track appended fields
}

const OutputModule: React.FC<OutputModuleProps> = ({
  availableInputSources = [],
  initialConfigs,
  apiSources,
  sourcesLoading = false,
  onConfigurationsChange,
  onTransformedDataChange,
  appendConfigurations = [],
}) => {
  const { showAlert } = useNotification();
  const [configs, setConfigs] = useState<OutputConfig[]>([]);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [customDestinations, setCustomDestinations] = useState<OutputDestination[]>([]);
  const [destinationDialogOpen, setDestinationDialogOpen] = useState(false);
  const [destinationDialogMode, setDestinationDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingDestination, setEditingDestination] = useState<OutputDestination | null>(null);
  const [fieldMappingDialogOpen, setFieldMappingDialogOpen] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // Load initial configurations if provided (for edit mode)
  useEffect(() => {
    console.log('=== OutputModule: Loading initial configs ===', initialConfigs);
    if (initialConfigs && initialConfigs?.length > 0) {
      setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Notify parent component whenever configurations change
  useEffect(() => {
    console.log('=== OutputModule: Configs changed ===', configs);
    if (onConfigurationsChange) {
      console.log('=== OutputModule: Calling onConfigurationsChange ===');
      onConfigurationsChange(configs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs]);

  // Memoize transformed data to prevent infinite loops
  const transformedData = useMemo(() => {
    console.log('=== OutputModule: Transforming data ===');
    console.log('configs:', configs);
    console.log('availableInputSources:', availableInputSources);
    console.log('customDestinations:', customDestinations);
    console.log('fieldMappings:', fieldMappings);

    const result = transformOutputConfigurationsToAPI(
      configs,
      availableInputSources,
      customDestinations,
      fieldMappings,  // Pass module-level field mappings
      apiSources  // Pass API sources for destination details
    );

    console.log('=== OutputModule: Transform result ===', result);
    return result;
  }, [configs, availableInputSources, customDestinations, fieldMappings, apiSources]);

  // Track previous transformed data to prevent infinite loops
  const prevTransformedDataRef = useRef<string>('');

  // Notify parent component of transformed data changes (with deep equality check)
  useEffect(() => {
    console.log('=== OutputModule: transformedData changed effect ===');
    if (onTransformedDataChange) {
      // Use JSON.stringify to compare deep equality
      const currentDataString = JSON.stringify(transformedData);

      console.log('=== OutputModule: Comparing transformed data ===');
      console.log('Current:', currentDataString);
      console.log('Previous:', prevTransformedDataRef.current);
      console.log('Are they equal?', currentDataString === prevTransformedDataRef.current);

      // Only call callback if data actually changed
      if (currentDataString !== prevTransformedDataRef.current) {
        console.log('=== OutputModule: Calling onTransformedDataChange ===');
        prevTransformedDataRef.current = currentDataString;
        onTransformedDataChange(transformedData);
      } else {
        console.log('=== OutputModule: Skipping onTransformedDataChange (data unchanged) ===');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformedData]);

  // Current working config state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedOutputFields, setSelectedOutputFields] = useState<string[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<number | null>(null);
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

  // Helper function to get all fields for a source (original + appended fields)
  const getSourceFieldsWithAppends = useMemo(() => {
    return (source: InputSource): string[] => {
      // Start with original headers
      const originalHeaders = source?.selectedHeaders || source?.headers || [];
      const allFields = new Set<string>();

      // Add original headers, filtering out null/undefined values
      originalHeaders?.forEach((header: string) => {
        if (header && typeof header === 'string') {
          allFields.add(header);
        }
      });

      // Find all append configurations where this source is an input source
      appendConfigurations?.forEach(config => {
        // Check if this source is one of the input sources for this append config
        const isInputSource = config?.inputSources?.some(inputSourceId => {
          const inputSource = availableInputSources?.find(s => s?.id === inputSourceId);
          return inputSource?.sourceName === source?.sourceName || inputSource?.id === source?.id;
        });

        // If this source is used in the append config, add the appended fields
        if (isInputSource && config?.appendFields) {
          config.appendFields?.forEach(field => {
            if (field && typeof field === 'string') {
              allFields.add(field);
            }
          });
        }
      });

      return Array.from(allFields);
    };
  }, [appendConfigurations, availableInputSources]);

  // Memoize available output fields to prevent infinite re-renders
  // IMPORTANT: Show only COMMON fields (intersection) when multiple sources are selected
  const availableOutputFields = useMemo(() => {
    console.log('=== OutputModule: Computing availableOutputFields ===');
    console.log('selectedInputSources:', selectedInputSources);

    if (selectedInputSources?.length === 0) {
      console.log('=== OutputModule: No input sources selected ===');
      return [];
    }

    if (selectedInputSources?.length === 1) {
      console.log('=== OutputModule: Single source selected ===');
      // Single source: show all its fields (with mappings applied, including appended fields)
      const fieldsMap = new Map<string, string>();
      const sourceId = selectedInputSources[0];
      console.log('Source ID:', sourceId);
      const source = availableInputSources?.find(src => src.id === sourceId);
      console.log('Found source:', source);

      if (source) {
        const allFields = getSourceFieldsWithAppends(source); // Include appended fields
        console.log('All fields (including appends):', allFields);

        if (!allFields || allFields.length === 0) {
          console.warn('=== OutputModule: Source has no fields ===');
          return [];
        }

        allFields?.forEach(field => {
          const mapping = fieldMappings?.find(m => {
            return m.selectedColumns?.some(col => {
              const [colSourceId, colFieldName] = col?.split('::');
              return colSourceId === sourceId && colFieldName === field;
            });
          });

          if (mapping) {
            fieldsMap.set(field, mapping.fieldName);
          } else {
            fieldsMap.set(field, field);
          }
        });
      } else {
        console.error('=== OutputModule: Source not found for ID:', sourceId);
        return [];
      }

      const result = Array.from(new Set(fieldsMap.values()));

      // Filter out any null/undefined values
      const safeResult = result.filter((field): field is string => {
        if (!field || typeof field !== 'string') {
          console.warn('=== OutputModule: Filtered out invalid field in single source:', field);
          return false;
        }
        return true;
      });

      console.log('=== OutputModule: Final available fields ===', safeResult);
      return safeResult;
    }

    // Multiple sources: show only COMMON fields (intersection, including appended fields)
    const allSourceFieldSets: Set<string>[] = [];

    selectedInputSources?.forEach(id => {
      const source = availableInputSources?.find(src => src.id === id);
      if (source) {
        const sourceFields = new Set<string>();
        const allFields = getSourceFieldsWithAppends(source); // Include appended fields

        allFields?.forEach(field => {
          const mapping = fieldMappings?.find(m => {
            return m.selectedColumns?.some(col => {
              const [colSourceId, colFieldName] = col?.split('::');
              return colSourceId === id && colFieldName === field;
            });
          });

          // Use mapped field name if exists, otherwise use original
          const displayFieldName = mapping ? mapping.fieldName : field;
          sourceFields.add(displayFieldName?.toLowerCase()); // Case-insensitive comparison
        });

        allSourceFieldSets?.push(sourceFields);
      }
    });

    if (allSourceFieldSets?.length === 0) {
      console.log('=== OutputModule: No source field sets found ===');
      return [];
    }

    console.log('=== OutputModule: allSourceFieldSets ===', allSourceFieldSets);

    // Safety check for first set
    if (!allSourceFieldSets[0]) {
      console.error('=== OutputModule: First source field set is undefined ===');
      return [];
    }

    // Find intersection of all field sets (fields common to ALL selected sources)
    const intersection = Array.from(allSourceFieldSets[0]).filter(field => {
      // Check if this field exists in ALL other source field sets
      return allSourceFieldSets?.every(fieldSet => fieldSet.has(field));
    });

    console.log('=== OutputModule: Field intersection ===', intersection);

    // Get the original casing from the first source (including appended fields)
    const firstSource = availableInputSources?.find(src => src.id === selectedInputSources[0]);
    const resultFields = intersection?.map(fieldLower => {
      // Find the original field name with proper casing from first source
      if (firstSource) {
        const allFirstSourceFields = getSourceFieldsWithAppends(firstSource); // Include appended fields
        const originalField = allFirstSourceFields?.find(h => h?.toLowerCase() === fieldLower);
        if (originalField) {
          // Check if there's a mapping for this field
          const mapping = fieldMappings?.find(m => {
            return m.selectedColumns?.some(col => {
              const [, colFieldName] = col?.split('::');
              return colFieldName?.toLowerCase() === fieldLower;
            });
          });
          return mapping ? mapping.fieldName : originalField;
        }
      }
      return fieldLower;
    });

    // Filter out any null/undefined values to ensure array contains only valid strings
    const safeResultFields = resultFields?.filter((field): field is string => {
      if (!field || typeof field !== 'string') {
        console.warn('=== OutputModule: Filtered out invalid field:', field);
        return false;
      }
      return true;
    }) || [];

    console.log('=== OutputModule: Final resultFields ===', safeResultFields);
    return safeResultFields;
  }, [selectedInputSources, availableInputSources, fieldMappings, getSourceFieldsWithAppends]);

  // Memoize flattened destinations to prevent infinite re-renders
  const allOutputDestinations = useMemo(() => {
    const destinations: Array<{ id: number; name: string; type: string; path?: string; bucket?: string; isCustom: boolean }> = [];

    if (apiSources?.fileSource) {
      // Add SFTP sources as destinations (preconfigured)
      if (apiSources.fileSource.sftpSources) {
        apiSources.fileSource.sftpSources?.forEach(source => {
          destinations?.push({
            id: source.id,
            name: source.name,
            type: 'SFTP',
            isCustom: false
          });
        });
      }

      // Add NFS sources as destinations (preconfigured)
      if (apiSources.fileSource.nfsSources) {
        apiSources.fileSource.nfsSources?.forEach(source => {
          destinations?.push({
            id: source.id,
            name: source.name,
            type: 'NFS',
            isCustom: false
          });
        });
      }

      // Add AWS S3 sources as destinations (preconfigured)
      if (apiSources.fileSource.awsSources) {
        apiSources.fileSource.awsSources?.forEach(source => {
          destinations?.push({
            id: source.id,
            name: source.name,
            type: 'AWS S3',
            isCustom: false
          });
        });
      }
    }

    // Add custom destinations (user-created)
    customDestinations?.forEach(dest => {
      destinations?.push({
        id: parseInt(dest.id),
        name: dest.name,
        type: dest.type,
        path: dest.path,
        bucket: dest.bucket,
        isCustom: true
      });
    });

    return destinations;
  }, [apiSources, customDestinations]);

  // Memoize filtered lists to prevent infinite re-renders
  const filteredInputSources = useMemo(() => {
    console.log('=== OutputModule: Computing filteredInputSources ===');
    if (!availableInputSources || !Array.isArray(availableInputSources)) {
      return [];
    }
    return availableInputSources?.filter(source =>
      source?.sourceName?.toLowerCase()?.includes(inputSourcesSearch?.toLowerCase() || '')
    );
  }, [availableInputSources, inputSourcesSearch]);

  const filteredOutputFields = useMemo(() => {
    console.log('=== OutputModule: Computing filteredOutputFields ===');
    console.log('availableOutputFields:', availableOutputFields);
    console.log('outputFieldsSearch:', outputFieldsSearch);

    if (!availableOutputFields || !Array.isArray(availableOutputFields)) {
      console.log('=== OutputModule: availableOutputFields is not an array ===');
      return [];
    }

    const result = availableOutputFields?.filter(field => {
      // Safety check: ensure field is a string
      if (!field || typeof field !== 'string') {
        console.warn('=== OutputModule: Invalid field in availableOutputFields:', field);
        return false;
      }
      return field?.toLowerCase().includes(outputFieldsSearch?.toLowerCase() || '');
    });

    console.log('=== OutputModule: filteredOutputFields result ===', result);
    return result;
  }, [availableOutputFields, outputFieldsSearch]);

  const filteredOutputDestinations = useMemo(() => {
    console.log('=== OutputModule: Computing filteredOutputDestinations ===');
    if (!allOutputDestinations || !Array.isArray(allOutputDestinations)) {
      return [];
    }
    return allOutputDestinations?.filter(dest =>
      dest?.name?.toLowerCase()?.includes(outputDestinationsSearch?.toLowerCase() || '')
    );
  }, [allOutputDestinations, outputDestinationsSearch]);

  // When Combine Sources is selected, initialize combine sources list
  useEffect(() => {
    if (combineSources && combineSourcesList?.length === 0 && selectedInputSources?.length > 0) {
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

  const handleUpdateDestination = (destination: OutputDestination) => {
    setCustomDestinations(customDestinations?.map(dest =>
      dest.id === destination.id ? destination : dest
    ));
  };

  const handleViewDestination = (destination: OutputDestination, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingDestination(destination);
    setDestinationDialogMode('view');
    setDestinationDialogOpen(true);
  };

  const handleEditDestination = (destination: OutputDestination, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingDestination(destination);
    setDestinationDialogMode('edit');
    setDestinationDialogOpen(true);
  };

  const handleDeleteDestination = (destination: OutputDestination, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the destination "${destination.name}"?`)) {
      setCustomDestinations(customDestinations?.filter(dest => dest.id !== destination.id));
      // If any config uses this destination, clear it
      setConfigs(configs?.map(config => {
        if (config.destinationId === parseInt(destination.id)) {
          return {
            ...config,
            destinationId: undefined,
            destinationName: undefined,
            destinationType: undefined,
            isCustomDestination: undefined,
          };
        }
        return config;
      }));
    }
  };

  const handleOpenAddDestinationDialog = () => {
    setEditingDestination(null);
    setDestinationDialogMode('add');
    setDestinationDialogOpen(true);
  };

  const handleCloseDestinationDialog = () => {
    setDestinationDialogOpen(false);
    setEditingDestination(null);
    setDestinationDialogMode('add');
  };

  const handleReorderPriority = (newOrder: string[]) => {
    setPriorityOrder(newOrder);
  };

  const handleAddOrUpdateConfig = () => {
    console.log('=== OutputModule: handleAddOrUpdateConfig called ===');

    if (selectedInputSources?.length === 0) {
      showAlert('Please select at least one Input Source', 'warning');
      return;
    }
    if (selectedOutputFields?.length === 0) {
      showAlert('Please select at least one Output Field', 'warning');
      return;
    }
    if (!selectedDestinationId) {
      showAlert('Please select an Output Destination', 'warning');
      return;
    }

    // Get destination details
    const selectedDest = allOutputDestinations?.find(d => d.id === selectedDestinationId);
    if (!selectedDest) {
      showAlert('Invalid destination selected', 'error');
      return;
    }

    console.log('=== OutputModule: Selected destination ===', selectedDest);
    console.log('=== OutputModule: Current configs ===', configs);

    if (editingConfigId) {
      console.log('=== OutputModule: Updating existing config ===', editingConfigId);
      // Update existing config (without field mappings - they're module-level)
      setConfigs(configs?.map(config =>
        config.id === editingConfigId
          ? {
              ...config,
              inputSources: selectedInputSources,
              outputFields: selectedOutputFields,
              destinations: [selectedDest.name],
              destinationId: selectedDest.id,
              destinationName: selectedDest.name,
              destinationType: selectedDest.type,
              isCustomDestination: selectedDest.isCustom,
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
      console.log('=== OutputModule: Adding new config ===');
      // Add new config (without field mappings - they're module-level)
      const newConfig: OutputConfig = {
        id: generateId(),
        inputSources: selectedInputSources,
        outputFields: selectedOutputFields,
        destinations: [selectedDest.name],
        destinationId: selectedDest.id,
        destinationName: selectedDest.name,
        destinationType: selectedDest.type,
        isCustomDestination: selectedDest.isCustom,
        combineSources,
        combineSourcesList,
        priorityOrder,
        fieldPriority,
        limitation,
        limitCount,
        random,
      };
      console.log('=== OutputModule: New config object ===', newConfig);
      const newConfigs = [...configs, newConfig];
      console.log('=== OutputModule: Setting new configs array ===', newConfigs);
      setConfigs(newConfigs);
    }

    // Reset form (but NOT field mappings - they're shared across all configs)
    setSelectedInputSources([]);
    setSelectedOutputFields([]);
    setSelectedDestinationId(null);
    setCombineSources(false);
    setCombineSourcesList([]);
    setPriorityOrder([]);
    setFieldPriority([]);
    setLimitation(false);
    setLimitCount(undefined);
    setRandom(false);
  };

  const handleEditConfig = (config: OutputConfig) => {
    setEditingConfigId(config?.id);
    setSelectedInputSources(config?.inputSources);
    setSelectedOutputFields(config?.outputFields);

    // Handle destination ID - look it up from name if needed
    let destinationId = config?.destinationId || null;
    if (!destinationId && config?.destinationName) {
      // Look up destination ID from name
      const destination = allOutputDestinations?.find(d => d.name === config.destinationName);
      if (destination) {
        destinationId = destination.id;
      }
    }
    setSelectedDestinationId(destinationId);

    setCombineSources(config?.combineSources);
    setCombineSourcesList(config?.combineSourcesList || []);
    setPriorityOrder(config?.priorityOrder || []);
    setFieldPriority(config?.fieldPriority || []);
    setLimitation(config?.limitation);
    setLimitCount(config?.limitCount);
    setRandom(config?.random);
    // Note: Field mappings are NOT loaded from config - they're shared at module level
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setSelectedInputSources([]);
    setSelectedOutputFields([]);
    setSelectedDestinationId(null);
    setCombineSources(false);
    setCombineSourcesList([]);
    setPriorityOrder([]);
    setFieldPriority([]);
    setLimitation(false);
    setLimitCount(undefined);
    setRandom(false);
    // Note: Field mappings are NOT reset - they're shared at module level
  };

  const handleDeleteConfig = (id: string) => {
    if (window.confirm('Are you sure you want to delete this output configuration?')) {
      setConfigs(configs?.filter(c => c.id !== id));
      if (editingConfigId === id) {
        handleCancelEdit();
      }
    }
  };

  const getSourceName = (id: string): string => {
    console.log('=== OutputModule: getSourceName called for ID:', id);
    const source = availableInputSources?.find(src => src.id === id);
    console.log('=== OutputModule: Found source:', source);
    return source ? source?.sourceName : id;
  };

  console.log('=== OutputModule: RENDER START ===');
  console.log('configs:', configs);
  console.log('availableInputSources:', availableInputSources);
  console.log('selectedInputSources:', selectedInputSources);

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
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block !important', mt: 0.5 }}>
                Editing existing configuration - make changes and click Update
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Tooltip
              title="Field mappings are shared across all output configurations"
              placement="top"
              arrow
            >
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
                {fieldMappings?.length > 0 && (
                  <Chip
                    label={fieldMappings?.length}
                    size="small"
                    sx={{
                      ml: 1,
                      height: '18px !important',
                      fontSize: '0.65rem',
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  />
                )}
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={handleOpenAddDestinationDialog}
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

        {availableInputSources?.length === 0 ? (
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
                      height: '24px !important',
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
                      const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                      if (value?.includes('select-all-input-sources')) {
                        if (selectedInputSources?.length === filteredInputSources?.length) {
                          setSelectedInputSources([]);
                          setSelectedOutputFields([]);
                        } else {
                          setSelectedInputSources(filteredInputSources?.map(src => src.id));
                        }
                      } else {
                        setSelectedInputSources(value);
                        setSelectedOutputFields([]);
                      }
                    }}
                    onClose={() => setInputSourcesSearch('')}
                    input={<OutlinedInput />}
                    renderValue={(selected) => {
                      if (selected?.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Select
                          </Typography>
                        );
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, py: 0.4 }}>
                          {selected?.map((value) => (
                            <Tooltip key={value} title={getSourceName(value)} arrow>
                              <Chip
                                label={getSourceName(value)}
                                size="small"
                                color="primary"
                                sx={{
                                  maxWidth: '150px !important',
                              minWidth: '50px',
                                  height: '18px !important',
                                  fontSize: '0.65rem',
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
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 400,
                          maxWidth: '400px'
                        }
                      },
                      autoFocus: false
                    }}
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
                        checked={filteredInputSources?.length > 0 && selectedInputSources?.length === filteredInputSources?.length}
                        indeterminate={selectedInputSources?.length > 0 && selectedInputSources?.length < filteredInputSources?.length}
                        size="small"
                      />
                      <ListItemText primary="Select All" />
                    </MenuItem>
                    {filteredInputSources?.length === 0 && (
                      <MenuItem disabled>
                        <em>No items match your search</em>
                      </MenuItem>
                    )}
                    {filteredInputSources?.map((source) => (
                      <MenuItem key={source?.id} value={source?.id}>
                        <Checkbox checked={selectedInputSources?.indexOf(source?.id) > -1} size="small" />
                        <ListItemText primary={source?.sourceName} />
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
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip
                      label={'2'}
                      size="small"
                      sx={{
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        fontWeight: 700,
                        mr: 0.75,
                        width: 24,
                        height: '24px !important',
                      }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#2D3748', overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' }}>
                      Output Fields
                    </Typography>
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                      *
                    </Typography>
                  </Box>
                  {/* Combine Sources Checkbox - Show when 2+ input sources selected */}
                  {selectedInputSources?.length > 1 && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={combineSources}
                          onChange={(e) => setCombineSources(e.target.checked)}
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
                        <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#2D3748', fontWeight: 500 }}>
                          Combine Sources
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  )}
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    value={selectedOutputFields}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                      if (value?.includes('select-all-output-fields')) {
                        if (selectedOutputFields?.length === filteredOutputFields?.length) {
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
                      if (selected?.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Select
                          </Typography>
                        );
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, py: 0.4 }}>
                          {selected?.map((value) => (
                            <Tooltip key={value} title={value} arrow>
                              <Chip
                                label={value}
                                size="small"
                                color="info"
                                sx={{
                                  maxWidth: '150px !important',
                              minWidth: '50px',
                                  height: '18px !important',
                                  fontSize: '0.65rem',
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
                    disabled={availableOutputFields?.length === 0}
                    displayEmpty
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 400,
                          maxWidth: '400px'
                        }
                      },
                      autoFocus: false
                    }}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                      },
                    }}
                  >
                    <MenuItem disabled value="">
                      <em>
                        {availableOutputFields?.length === 0
                          ? 'Select input sources first'
                          : 'Select Output Fields'}
                      </em>
                    </MenuItem>
                    {/* Search TextField */}
                    {availableOutputFields?.length > 0 && (
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
                    {filteredOutputFields?.length > 0 && (
                      <MenuItem
                        value="select-all-output-fields"
                        sx={{
                          backgroundColor: '#f0f0f0',
                          fontWeight: 600,
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        <Checkbox
                          checked={filteredOutputFields?.length > 0 && selectedOutputFields?.length === filteredOutputFields?.length}
                          indeterminate={selectedOutputFields?.length > 0 && selectedOutputFields?.length < filteredOutputFields?.length}
                          size="small"
                        />
                        <ListItemText primary="Select All" />
                      </MenuItem>
                    )}
                    {filteredOutputFields?.length === 0 && availableOutputFields?.length > 0 && (
                      <MenuItem disabled>
                        <em>No items match your search</em>
                      </MenuItem>
                    )}
                    {filteredOutputFields?.map((field) => (
                      <MenuItem key={field} value={field}>
                        <Checkbox checked={selectedOutputFields?.indexOf(field) > -1} size="small" />
                        <ListItemText primary={field} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Priority Order - Show as separate section when Combine Sources is enabled */}
              {combineSources && selectedInputSources?.length > 1 && priorityOrder?.length > 0 && (
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
                    allSources={availableInputSources?.map(src => ({ id: src.id, name: src.sourceName }))}
                    onReorder={handleReorderPriority}
                    getSourceName={getSourceName}
                  />
                </Box>
              )}

              {/* Field Priority Order - Show as separate section when Combine Sources is enabled */}
              {combineSources && selectedInputSources?.length > 1 && (
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
                      Field Priority Order
                    </Typography>
                  </Box>
                  <FormControl fullWidth size="small">
                    <Select
                      multiple
                      value={fieldPriority}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                        if (value?.includes('select-all-field-priority')) {
                          if (fieldPriority?.length === availableOutputFields?.length) {
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
                        if (selected?.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Select
                            </Typography>
                          );
                        }
                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, py: 0.3, alignItems: 'center' }}>
                            {selected?.map((value, index) => (
                              <Tooltip key={value} title={`${index + 1}. ${value}`} arrow>
                                <Chip
                                  label={`${index + 1}. ${value}`}
                                  size="small"
                                  sx={{
                                    maxWidth: '150px !important',
                                    minWidth: '50px',
                                    height: '16px !important',
                                    fontSize: '0.6rem',
                                    overflow: 'hidden !important',
                                    flexShrink: '0 !important',
                                    backgroundColor: '#8B5CF6',
                                    color: '#fff',
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
                      disabled={availableOutputFields?.length === 0}
                      displayEmpty
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            maxHeight: 400,
                            maxWidth: '400px'
                          }
                        },
                        autoFocus: false
                      }}
                      sx={{
                        backgroundColor: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 0, 0, 0.15)',
                        },
                      }}
                    >
                      <MenuItem disabled value="">
                        <em style={{ fontSize: '0.75rem' }}>
                          {availableOutputFields?.length === 0
                            ? 'No fields'
                            : 'Select Fields'}
                        </em>
                      </MenuItem>
                      {availableOutputFields?.length > 0 && (
                        <MenuItem
                          value="select-all-field-priority"
                          sx={{
                            backgroundColor: '#f0f0f0',
                            fontWeight: 600,
                            borderBottom: '1px solid #ddd',
                          }}
                        >
                          <Checkbox
                            checked={availableOutputFields?.length > 0 && fieldPriority?.length === availableOutputFields?.length}
                            indeterminate={fieldPriority?.length > 0 && fieldPriority?.length < availableOutputFields?.length}
                            size="small"
                          />
                          <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: '0.75rem' }} />
                        </MenuItem>
                      )}
                      {availableOutputFields?.map((field) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={fieldPriority?.indexOf(field) > -1} size="small" />
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

              {/* Step 3: Output Destination - Always shown */}
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
                      height: '24px !important',
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
                    value={selectedDestinationId || ''}
                    onChange={(e) => setSelectedDestinationId(Number(e.target.value))}
                    displayEmpty
                    disabled={sourcesLoading}
                    onClose={() => setOutputDestinationsSearch('')}
                    input={<OutlinedInput />}
                    renderValue={(selected) => {
                      if (!selected) {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Select Destination...
                          </Typography>
                        );
                      }
                      const dest = allOutputDestinations?.find(d => d.id === selected);
                      return dest ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{dest.name}</Typography>
                          <Chip
                            label={dest.type}
                            size="small"
                            sx={{
                              height: '18px !important',
                              fontSize: '0.6rem',
                              backgroundColor: dest.type === 'SFTP' ? '#3B82F620' : dest.type === 'NFS' ? '#10B98120' : '#F59E0B20',
                              color: dest.type === 'SFTP' ? '#3B82F6' : dest.type === 'NFS' ? '#10B981' : '#F59E0B',
                              fontWeight: 600
                            }}
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Select Destination...
                        </Typography>
                      );
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 400,
                          maxWidth: '400px'
                        }
                      },
                      autoFocus: false
                    }}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(0, 0, 0, 0.15)',
                      },
                    }}
                  >
                    <MenuItem disabled value="">
                      <em>Select Output Destination</em>
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
                        placeholder="Search destinations..."
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
                    {filteredOutputDestinations?.length === 0 && (
                      <MenuItem disabled>
                        <em>No destinations match your search</em>
                      </MenuItem>
                    )}
                    {filteredOutputDestinations?.map((dest) => {
                      // Find the custom destination object if this is a custom destination
                      const customDest = dest.isCustom ? customDestinations?.find(d => d.id === dest.id.toString()) : null;

                      return (
                        <MenuItem key={dest.id} value={dest.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                {dest.name}
                              </Typography>
                              <Chip
                                label={dest.type}
                                size="small"
                                sx={{
                                  height: '18px !important',
                                  fontSize: '0.6rem',
                                  backgroundColor: dest.type === 'SFTP' ? '#3B82F620' : dest.type === 'NFS' ? '#10B98120' : '#F59E0B20',
                                  color: dest.type === 'SFTP' ? '#3B82F6' : dest.type === 'NFS' ? '#10B981' : '#F59E0B',
                                  fontWeight: 600
                                }}
                              />
                              {dest.path && (
                                <Chip
                                  label={dest.path}
                                  size="small"
                                  sx={{
                                    height: '18px !important',
                                    fontSize: '0.55rem',
                                    backgroundColor: '#E5E7EB',
                                    color: '#6B7280',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                              {dest.bucket && (
                                <Chip
                                  label={dest.bucket}
                                  size="small"
                                  sx={{
                                    height: '18px !important',
                                    fontSize: '0.55rem',
                                    backgroundColor: '#E5E7EB',
                                    color: '#6B7280',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                            </Box>

                            {/* Show action buttons only for custom destinations */}
                            {dest.isCustom && customDest && (
                              <Box sx={{ display: 'flex', gap: 0.3, ml: 1 }} onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="View Details" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleViewDestination(customDest, e)}
                                    sx={{
                                      padding: '2px',
                                      color: '#3B82F6',
                                      '&:hover': {
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                      },
                                    }}
                                  >
                                    <Visibility sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleEditDestination(customDest, e)}
                                    sx={{
                                      padding: '2px',
                                      color: '#10B981',
                                      '&:hover': {
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                      },
                                    }}
                                  >
                                    <Edit sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete" placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleDeleteDestination(customDest, e)}
                                    sx={{
                                      padding: '2px',
                                      color: '#EF4444',
                                      '&:hover': {
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      },
                                    }}
                                  >
                                    <Delete sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })}
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
                    height: '44px !important',
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
            {configs?.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                    Configured Output Destinations
                  </Typography>
                  <Chip
                    label={`${configs?.length} configuration${configs?.length !== 1 ? 's' : ''}`}
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
                      {configs?.map((config) => (
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
                            {config?.inputSources?.length > 0 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ maxWidth: 400 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block !important', mb: 0.5 }}>
                                      Input Sources ({config?.inputSources?.length}):
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                      {config?.inputSources?.map(id => getSourceName(id))?.join(', ')}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip
                                    label={`${config?.inputSources?.length} source${config?.inputSources?.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#29669520',
                                      color: '#296695',
                                      border: '1px solid #29669540',
                                      fontWeight: 600,
                                      height: '20px !important',
                                      fontSize: '0.65rem',
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: '0.7rem',
                                      overflow: 'hidden !important',
                                      textOverflow: 'ellipsis !important',
                                      whiteSpace: 'nowrap !important',
                                    }}
                                  >
                                    {config?.inputSources?.slice(0, 2)?.map(id => getSourceName(id))?.join(', ')}
                                    {config?.inputSources?.length > 2 ? '...' : ''}
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
                            {config.outputFields?.length > 0 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ maxWidth: 400 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block !important', mb: 0.5 }}>
                                      Output Fields ({config.outputFields?.length}):
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                      {config.outputFields?.join(', ')}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip
                                    label={`${config.outputFields?.length} field${config.outputFields?.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#0EA5E920',
                                      color: '#0EA5E9',
                                      border: '1px solid #0EA5E940',
                                      fontWeight: 600,
                                      height: '20px !important',
                                      fontSize: '0.65rem',
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: '0.7rem',
                                      overflow: 'hidden !important',
                                      textOverflow: 'ellipsis !important',
                                      whiteSpace: 'nowrap !important',
                                    }}
                                  >
                                    {config.outputFields?.slice(0, 2).join(', ')}
                                    {config.outputFields?.length > 2 ? '...' : ''}
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
                            {config.destinations?.length > 0 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ maxWidth: 400 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block !important', mb: 0.5 }}>
                                      Output Destinations ({config.destinations?.length}):
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                      {config.destinations?.join(', ')}
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip
                                    label={`${config.destinations?.length} destination${config.destinations?.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#10B98120',
                                      color: '#10B981',
                                      border: '1px solid #10B98140',
                                      fontWeight: 600,
                                      height: '20px !important',
                                      fontSize: '0.65rem',
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: '0.7rem',
                                      overflow: 'hidden !important',
                                      textOverflow: 'ellipsis !important',
                                      whiteSpace: 'nowrap !important',
                                    }}
                                  >
                                    {config.destinations?.slice(0, 2).join(', ')}
                                    {config.destinations?.length > 2 ? '...' : ''}
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
                              sx={{ height: '20px !important', fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          </TableCell>

                          {/* Priority Order Column */}
                          <TableCell sx={{ py: 0.75, px: 1.5 }}>
                            {config.combineSources && config.priorityOrder && config.priorityOrder?.length > 0 ? (
                              <Tooltip
                                title={
                                  <Box sx={{ maxWidth: 400 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block !important', mb: 0.5 }}>
                                      Priority Order:
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                      {config.priorityOrder?.map((id, idx) => `${idx + 1}. ${getSourceName(id)}`).join(', ')}
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
                                    overflow: 'hidden !important',
                                    textOverflow: 'ellipsis !important',
                                    whiteSpace: 'nowrap !important',
                                    cursor: 'help',
                                  }}
                                >
                                  {config.priorityOrder?.slice(0, 2).map((id, idx) => `${idx + 1}. ${getSourceName(id)}`).join(', ')}
                                  {config.priorityOrder?.length > 2 ? '...' : ''}
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
        onClose={handleCloseDestinationDialog}
        onSave={handleAddDestination}
        onUpdate={handleUpdateDestination}
        mode={destinationDialogMode}
        editingDestination={editingDestination}
      />

      {/* Field Mapping Dialog */}
      <FieldMappingDialog
        open={fieldMappingDialogOpen}
        onClose={() => setFieldMappingDialogOpen(false)}
        onSave={(mappings) => setFieldMappings(mappings)}
        availableSources={
          availableInputSources?.map(src => ({
            id: src.id,
            name: src.sourceName,
            type: 'input' as const,
            headers: src.headers || []
          }))
        }
        initialMappings={fieldMappings}
      />
    </Box>
  );
};

export default OutputModule;

// Re-export transformation utilities and types
export { transformOutputToAPIFormat, transformOutputConfigurationsToAPI } from './outputTransformers';
export type { OutputAPIPayload } from './outputTransformers';
