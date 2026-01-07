import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  Paper,
  Stack,
  Chip,
  IconButton,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Switch,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Save,
  Close,
  AccountTree,
  Add,
  Delete,
  Edit,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import InputModule from '../../../components/InputModule/InputModule';
import AppendModule from '../../../components/AppendModule/AppendModule';
import SuppressModule from '../../../components/SuppressModule/SuppressModule';
import MatchModule from '../../../components/MatchModule/MatchModule';
import OutputModule from '../../../components/OutputModule/OutputModule';
import ScheduleModule from '../../../components/ScheduleModule/ScheduleModule';
import type { InputSource } from '../../../components/InputModule/InputModule';
import { comprehensiveSampleData } from '../../../mockData/sampleRequestData';
import { checkRequestName, submitRequest, type SubmitRequestPayload } from '../../../services/api';

// Extracted modules
import type { StatsConfiguration, VersionedSource } from './types';
import { createModuleDefinitions } from './utils/moduleDefinitions';
import { validateModuleMove } from './utils/moduleHelpers';
import { validateRequestName } from './utils/requestValidators';
import SortableAccordionItem from './components/SortableAccordionItem';
import SortableStep from './components/SortableStep';

// Custom hooks
import { useDataLoading } from './hooks/useDataLoading';

const RequestCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId?: string }>();

  // View and UI state
  const [viewMode, setViewMode] = useState<'accordion' | 'stepper'>('accordion');
  const [activeStep, setActiveStep] = useState(0);
  const [expanded, setExpanded] = useState<string[]>(['panel1']); // Array to support multiple open accordions

  // Form data state
  const [inputSources, setInputSources] = useState<InputSource[]>([]);
  const [requestName, setRequestName] = useState('');

  // Validation states
  const [requestNameError, setRequestNameError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Custom hooks for data loading
  const { apiSources, sourcesLoading } = useDataLoading();

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Stats Component state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedCountsOn, setSelectedCountsOn] = useState<string[]>([]);
  const [isDistinct, setIsDistinct] = useState(false);
  const [selectedBreakdownBy, setSelectedBreakdownBy] = useState<string[]>([]);
  const [statsConfigurations, setStatsConfigurations] = useState<StatsConfiguration[]>([]);
  const [editingStatsId, setEditingStatsId] = useState<string | null>(null);

  // Stats search states
  const [statsInputSourcesSearch, setStatsInputSourcesSearch] = useState('');
  const [statsCountsOnSearch, setStatsCountsOnSearch] = useState('');
  const [statsBreakdownBySearch, setStatsBreakdownBySearch] = useState('');

  // Clear selected fields when input sources change
  useEffect(() => {
    setSelectedCountsOn([]);
    setSelectedBreakdownBy([]);
  }, [selectedInputSources]);

  // Schedule Component state
  const [scheduleType, setScheduleType] = useState<'adhoc' | 'scheduled_at'>('adhoc');
  const [notificationWhen, setNotificationWhen] = useState('standard');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Versioned Sources State
  const [versionedSources, setVersionedSources] = useState<VersionedSource[]>([]);
  const [versionCounters, setVersionCounters] = useState({
    Input: 0,
    Match: 0,
    Append: 0,
    Suppress: 0
  });

  // Initial configs for modules (for edit mode)
  const [initialAppendConfigs, setInitialAppendConfigs] = useState<any[]>([]);
  const [initialSuppressConfigs, setInitialSuppressConfigs] = useState<any[]>([]);
  const [initialMatchConfigs, setInitialMatchConfigs] = useState<any[]>([]);
  const [initialOutputConfigs, setInitialOutputConfigs] = useState<any[]>([]);

  // Current output configurations
  const [outputConfigurations, setOutputConfigurations] = useState<any[]>([]);
  
  // Current suppress configurations
  const [suppressConfigurations, setSuppressConfigurations] = useState<any[]>([]);

  // Load sample data when in edit mode for demo request (ID 999)
  useEffect(() => {
    if (requestId === '999') {
      // Load comprehensive sample data
      setRequestName(comprehensiveSampleData?.requestName || '');
      setInputSources(comprehensiveSampleData?.inputSources || []);
      
      // Clear validation errors when loading sample data
      setRequestNameError('');

      // Load append configurations
      if (comprehensiveSampleData.appendConfigs?.length > 0) {
        setInitialAppendConfigs(comprehensiveSampleData.appendConfigs);
      }

      // Load suppress configurations
      if (comprehensiveSampleData.suppressConfigs?.length > 0) {
        setInitialSuppressConfigs(comprehensiveSampleData.suppressConfigs);
      }

      // Load match configurations
      if (comprehensiveSampleData.matchConfigs?.length > 0) {
        setInitialMatchConfigs(comprehensiveSampleData.matchConfigs);
      }

      // Load output configurations
      if (comprehensiveSampleData.outputConfigs?.length > 0) {
        setInitialOutputConfigs(comprehensiveSampleData.outputConfigs);
      }

      // Load stats configurations
      if (comprehensiveSampleData.statsConfigs?.length > 0) {
        setStatsConfigurations(comprehensiveSampleData.statsConfigs as StatsConfiguration[]);
      }

      // Load schedule configuration
      if (comprehensiveSampleData.scheduleConfig) {
        const schedConfig = comprehensiveSampleData.scheduleConfig;
        setScheduleType(schedConfig.scheduleType || 'adhoc');
        setScheduledDateTime(schedConfig.scheduledDateTime || '');
        setNotificationWhen(schedConfig.emailNotification || 'standard');
        setStartDate(schedConfig.startDate || '');
        setEndDate(schedConfig.endDate || '');
        if (schedConfig.notificationEmails?.length > 0) {
          setRecipientEmail(schedConfig.notificationEmails?.join(', ') || '');
        }
      }
    }
  }, [requestId]);

  const handleUpdateVersionCounter = (module: 'Input' | 'Match' | 'Append' | 'Suppress', increment: number) => {
    setVersionCounters(prev => ({
      ...prev,
      [module]: prev[module] + increment
    }));
  };

  const handleUpdateVersionName = (versionId: string, newName: string) => {
    // Update versioned sources
    setVersionedSources(prev => prev.map(version => 
      version?.id === versionId ? { ...version, versionLabel: newName, sourceName: newName } : version
    ));
    
    // Update input sources if the version exists there
    setInputSources(prev => prev.map(source => 
      source?.id === versionId ? { ...source, sourceName: newName } : source
    ));
  };


  // Helper to get source name by ID
  const getSourceNameById = (sourceId: string): string => {
    // Check in regular input sources
    const inputSource = inputSources.find(s => s?.id === sourceId);
    if (inputSource) return inputSource?.sourceName;

    // Check in versioned sources
    const versionedSource = versionedSources.find(s => s?.id === sourceId);
    if (versionedSource) return versionedSource?.sourceName;

    return sourceId; // fallback
  };

  // Handler to create versioned source from Match/Append/Suppress modules
  const handleCreateVersionedSource = (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    moduleId: string,
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[]
  ) => {
    // Validation: Must have at least one input source and one operation source
    if (baseInputSources.length === 0) {
      alert('Please select at least one Input Source before creating versions.');
      return;
    }
    if (operationSources.length === 0) {
      alert('Please select at least one Operation Source before creating versions.');
      return;
    }

    // Generate n × m combinations
    const newVersions: VersionedSource[] = [];

    // For each input source
    baseInputSources.forEach(inputSourceId => {
      const inputSource = allAvailableInputSources.find(s => s.id === inputSourceId);
      if (!inputSource) return;

      // For each operation source
      operationSources.forEach(operationSourceId => {
        const operationSourceName = getSourceNameById(operationSourceId);

        // Build distinct version name with module prefix
        const moduleVersionCount = versionCounters[sourceModule] + 1;
        let versionName: string;
        if (inputSource.isVersioned) {
          // Input is already versioned, append the operation module
          versionName = `${inputSource.sourceName}_${sourceModule}_v${moduleVersionCount}`;
        } else {
          // Input is a regular source
          versionName = `${sourceModule}_${inputSource.sourceName}_${operationSourceName}_v${moduleVersionCount}`;
        }

        // Get headers from input source
        const combinedHeaders = inputSource.headers || [];

        // Create the versioned source
        const versionedSource: VersionedSource = {
          id: `versioned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isVersioned: true,
          versionNumber: versionedSources.length + newVersions.length + 1,
          versionLabel: versionName,
          sourceName: versionName,
          sourceModule,
          createdByModuleId: moduleId,
          baseInputSources: [inputSourceId],
          operationSources: [operationSourceId],
          operationFields,
          combinedHeaders,
          sourceType: 'Self',
          subSourceType: 'Versioned',
          headers: combinedHeaders,
        };

        newVersions.push(versionedSource);
      });
    });

    // Update version counter for this module
    setVersionCounters(prev => ({
      ...prev,
      [sourceModule]: prev[sourceModule] + newVersions.length
    }));

    // Add all new versions to the list
    setVersionedSources(prev => [...prev, ...newVersions]);

    // Show success message
    const versionNames = newVersions.map(v => v.versionLabel).join(', ');
    const summary = `${newVersions.length} versioned source(s) created:\n\n${versionNames}\n\nThey are now available in all subsequent module dropdowns.`;
    alert(summary);
  };

  // Combine regular input sources with versioned sources for child modules
  const allAvailableInputSources: InputSource[] = [...inputSources, ...versionedSources];

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded((prevExpanded) => {
      if (isExpanded) {
        // Add panel to expanded array if not already present
        return prevExpanded.includes(panel) ? prevExpanded : [...prevExpanded, panel];
      } else {
        // Remove panel from expanded array
        return prevExpanded.filter((p) => p !== panel);
      }
    });
  };

  // Validation functions

  const handleNext = () => {
    // Validation for Step 1 (Input Module)
    if (activeStep === 0) {
      const nameError = validateRequestName(requestName);

      setRequestNameError(nameError || '');

      if (nameError) {
        return;
      }
      
      if (inputSources.length === 0) {
        return;
      }
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepClick = (step: number) => {
    setActiveStep(step);
  };

  // Transform input sources to the required API format
  const transformInputSourcesToAPIFormat = (sources: InputSource[]) => {
    return sources.map((source, index) => {
      // Determine sourceId: use fileSourceId for preconfigured sources, or parsed ID, or fallback to index+1
      const sourceId = source?.fileSourceId || parseInt(source?.id || '0') || (index + 1);
      
      // Determine inputType based on source context
      // P – Primary / Workflow Input (first input sources)
      // A – Append Source (sources used in append operations)
      // S – Suppress Source (sources used in suppress operations) 
      // M – Match Source (sources used in match operations)
      let inputType = 'P'; // Default to Primary for regular input sources
      
      // Determine if limited column selection is being used
      const isLimitedColumnSelection = source?.selectedHeaders && 
                                      source?.headers && 
                                      source?.selectedHeaders?.length < source?.headers?.length;
      
      // Get filePath
      const filePath = source?.filePath || source?.fileName || '';
      
      // Get filters - check filterQuery and extract from filterConfig if needed
      let filters = source?.filterQuery || '';
      
      // If filterQuery is empty but filterConfig exists, try to extract filter from config
      if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
        try {
          // Extract filter information from filterConfig array
          const filterGroup = source?.filterConfig[0];
          if (filterGroup && filterGroup?.conditions && Array.isArray(filterGroup?.conditions)) {
            const filterParts: string[] = [];
            
            filterGroup?.conditions?.forEach((condition: any) => {
              if (condition?.field && condition?.operator && condition?.value) {
                let conditionStr = '';
                if (condition?.operator === 'BETWEEN' && condition?.value2) {
                  conditionStr = `(${condition?.field} BETWEEN '${condition?.value}' AND '${condition?.value2}')`;
                } else {
                  conditionStr = `(${condition?.field} ${condition?.operator} '${condition?.value}')`;
                }
                filterParts.push(conditionStr);
              }
            });
            
            if (filterParts.length > 0) {
              const logicalOp = filterGroup?.logicalOperator || 'AND';
              // Join conditions with logical operator - no extra outer parentheses
              filters = filterParts.join(` ${logicalOp} `);
            }
          }
        } catch (error) {
          console.error('Error extracting filter from filterConfig:', error);
        }
      }
      
      // Dynamic file format detection from extension
      const getFileFormat = () => {
        const fileName = source?.fileName || filePath || '';
        if (!fileName) return 'CSV'; // default fallback
        
        // Extract extension and convert to uppercase
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return 'CSV'; // no extension found
        
        const extension = fileName.substring(lastDotIndex + 1).toUpperCase();
        
        // Handle special cases for compressed files
        if (extension === 'GZ' || extension === 'GZIP') return 'GZIP';
        
        // Return the extension as-is for any other format
        return extension;
      };
      
      // Build result object based on source type
      let result: any = {
        sourceName: source?.sourceName || 'Unknown Source',
        sourceType: source?.sourceType === 'File' ? 'F' : 
                    source?.sourceType === 'Database' ? 'T' : 
                    source?.sourceType === 'Version' ? 'V' : 'F',
        columnSelectionType: isLimitedColumnSelection ? 'L' : 'A',
        columns: source?.selectedHeaders || source?.headers || [],
        selectedColumns: (source?.selectedHeaders || source?.headers || []).join(','),
        inputType,
        filters,
        isSelfSource: source?.sourceType === 'Self' ? 1 : 0
      };

      // Add sourceId for non-database sources only
      if (source?.sourceType !== 'Database') {
        result.sourceId = sourceId;
      }

      // Add source type specific fields
      if (source?.sourceType === 'Database') {        
        // Try different possible property names for database fields
        const dbName = source?.database || source?.customTableMetadata?.database || '';
        const tableName = source?.table || source?.customTableMetadata?.tableName || '';
        const schema = source?.schema || source?.customTableMetadata?.schema || ''; // Already contains ID
        
        // Only include database fields if they have values
        if (dbName) result.dbName = dbName;
        if (tableName) result.tableName = tableName;
        if (schema) result.schema = schema;
        
        result.isCustomTable = (!source?.originalTableName || source?.customTableMetadata) ? 1 : 0;
      } else if (source?.sourceType === 'File') {
        result.filePath = filePath;
        result.delimiter = source?.delimiter || ',';
        result.fileFormat = getFileFormat();
        result.isHeader = source?.hasHeader ? 1 : 0;
        
        // Include customHeaders only if source has custom headers
        if (source?.customHeaders) {
          result.customHeaders = source.customHeaders;
        }
      }

      // Add version-specific fields
      if (source.sourceType === 'Version') {
        result.versionName = source.sourceName;
      }

      return result;
    });
  };

  const handleCancel = () => {
    navigate('/reports');
  };

  const handleSave = async () => {
    // Clear previous messages
    setSaveSuccess('');
    setSaveError('');
    
    // Validate all fields before saving
    const nameError = validateRequestName(requestName);

    setRequestNameError(nameError || '');
    
    if (nameError) {
      return;
    }
    
    // if (inputSources.length === 0) {
    //   setSaveError('Please add at least one input source before saving.');
    //   return;
    // }
    
    try {
      setSaveLoading(true);

      // Step 1: Check for duplicate request name
      const nameExists = await checkRequestName(requestName);

      if (nameExists) {
        setRequestNameError('Request name already exists. Please choose a different name.');
        setSaveLoading(false);
        return;
      }

      // Step 2: If name is unique, proceed with submit

      // Prepare the payload for submitRequest1.php
      const requestDetails: any = {
        requestName: requestName,
        createdBy: 'system',  // TODO: Integrate with actual authentication
        updatedBy: 'system',  // TODO: Integrate with actual authentication
        requestType: scheduleType === 'adhoc' ? 'A' : 'S', // A – Adhoc, S – Schedule Later
        sendNotificationOn: notificationWhen === 'standard' ? 'S' : 'E', // S – Standard, E – Error Only
        recipientEmail: recipientEmail || ''
      };

      // Include scheduledDateTime when requestType is 'S' (Schedule Later)
      if (scheduleType === 'scheduled_at' && scheduledDateTime) {
        requestDetails.scheduledDateTime = scheduledDateTime;
      }

      // Transform input sources to API format
      const transformedInputSources = transformInputSourcesToAPIFormat(inputSources);

      // Transform stats data to API format - include all saved configurations
      const transformStatsToAPIFormat = () => {
        // Transform all saved stats configurations
        return statsConfigurations.map(config => {
          // Map input sources to the required format with source_id
          const statsInputSources = config.inputSources
            .map((sourceName, index) => {
              const source = allAvailableInputSources?.find(s => s?.sourceName === sourceName);
              if (!source) return null;
              
              // Use the same sourceId logic as the main transformation function
              const sourceId = source?.fileSourceId || parseInt(source?.id || '0') || (index + 1);
              
              // Determine if using all columns or limited columns
              const isAllColumns = !source?.selectedHeaders || source?.selectedHeaders?.length === (source?.headers || [])?.length;
              
              return {
                source_id: sourceId,
                columns: isAllColumns ? "all" as const : "limited" as const
              };
            })
            .filter((item): item is { source_id: number; columns: "all" | "limited" } => item !== null);

          return {
            input_sources: statsInputSources,
            generate_counts_on: config.countsOn,
            is_distinct: config.isDistinct,
            breakdown_by: config.breakdownBy
          };
        });
      };

      // Transform output configurations to API format
      const transformOutputToAPIFormat = () => {
        if (!outputConfigurations.length) return null;
        
        // For simplicity, we'll transform the first output configuration
        // In a more complex scenario, you might want to handle multiple configurations
        const outputConfig = outputConfigurations[0];
        
        // Map input sources to the required format with priority
        const outputInputSources = (outputConfig.inputSources as string[])
          .map((sourceName: string, index: number) => {
            // Try multiple matching strategies
            let source = allAvailableInputSources.find(s => s.sourceName === sourceName);

            // If not found by sourceName, try by id
            if (!source) {
              source = allAvailableInputSources.find(s => s.id === sourceName);
            }

            // If still not found, log all available sources for debugging
            if (!source) {
              console.warn(`Source "${sourceName}" not found in available sources:`,
                allAvailableInputSources.map(s => s.sourceName));
              return null;
            }

            // Use the same sourceId logic as the main transformation function
            const sourceId = source?.fileSourceId || parseInt(source?.id || '0') || (index + 1);

            // Determine if using all columns or limited columns
            const isAllColumns = !source?.selectedHeaders || source?.selectedHeaders?.length === (source?.headers || [])?.length;

            const mappedSource = {
              source_id: sourceId,
              columns: isAllColumns ? "all" as const : "limited" as const,
              priority: index + 1 // Set priority based on order
            };

            return mappedSource;
          })
          .filter((item: any): item is { source_id: number; columns: "all" | "limited"; priority: number } => item !== null);

        // Build the output object based on the required format
        const outputPayload: any = {
          input_sources: outputInputSources,
          output_fields: outputConfig?.outputFields || [],
          combine_sources: outputConfig?.combineSources || false,
          field_priority: outputConfig?.fieldPriority || [],
          limitations: {
            limit_records: outputConfig?.limitCount || null,
            shuffle_records: outputConfig?.random || false
          }
        };

        // Add destination information if available
        if (outputConfig?.destinations && outputConfig?.destinations?.length > 0) {
          const firstDestination = outputConfig?.destinations[0];
          
          // Map destination names to appropriate configuration
          let destinationConfig: any = {
            data_source_id: 3, // Default - would need proper mapping in production
            path: "/exports/combined",
            filename: "output.csv",
            format: "CSV",
            compression: "GZIP"
          };

          // Customize based on destination type/name
          if (firstDestination?.includes('SFTP')) {
            destinationConfig = {
              ...destinationConfig,
              data_source_id: 1,
              path: "/sftp/exports",
              format: "CSV"
            };
          } else if (firstDestination?.includes('S3')) {
            destinationConfig = {
              ...destinationConfig,
              data_source_id: 2,
              path: "/s3-bucket/exports",
              format: "Parquet"
            };
          } else if (firstDestination?.includes('NFS')) {
            destinationConfig = {
              ...destinationConfig,
              data_source_id: 3,
              path: "/nfs/exports",
              format: "Excel"
            };
          }

          outputPayload.destination = destinationConfig;
        }

        return outputPayload;
      };

      // Transform suppress configurations to API format
      const transformSuppressToAPIFormat = () => {
        if (!suppressConfigurations.length) {
          return null;
        }

        const suppressPayload = suppressConfigurations.map(config => ({
          input_sources: config?.inputSources?.map((sourceId: string) => {
            const source = allAvailableInputSources.find(s => s?.id === sourceId);

            if (!source) {
              console.warn(`Source ${sourceId} not found in available sources`);
              return null;
            }

            return {
              source_id: parseInt(source?.id || '0', 10),
              columns: "all"
            };
          }).filter(Boolean), // Remove any null entries
          suppress_on_fields: config?.suppressOnFields || [],
          suppress_sources: (config?.suppressSources || []).map((sourceId: string) => {
            // For suppress sources, convert string IDs to integers
            if (sourceId.startsWith('suppress_')) {
              return parseInt(sourceId.replace('suppress_', ''), 10);
            }
            return parseInt(sourceId, 10);
          })
        }));

        return suppressPayload;
      };

      const submitPayload: SubmitRequestPayload = {
        requestDetails,
        inputSources: transformedInputSources,
        ...(statsConfigurations.length > 0 && {
          stats: transformStatsToAPIFormat()
        }),
        ...(outputConfigurations.length > 0 && {
          output: transformOutputToAPIFormat()
        }),
        ...(suppressConfigurations.length > 0 && {
          suppress: transformSuppressToAPIFormat()
        })
      };

      const submitResponse = await submitRequest(submitPayload);
      
      if (!submitResponse.success) {
                setSaveError(submitResponse.message || 'Failed to submit request. Please try again.');
}
      
    } catch (error) {
      console.error('Error submitting request:', error);
      setSaveError('An error occurred while submitting the request. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddInputSource = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    // Trigger the add source dialog from InputModule
    const addButton = document.querySelector('[data-add-input-source]') as HTMLButtonElement;
    if (addButton) {
      addButton.click();
    }
  };

  const handleCreateInputVersion = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    // Trigger the create version dialog from InputModule
    const versionButton = document.querySelector('[data-create-input-version]') as HTMLButtonElement;
    if (versionButton) {
      versionButton.click();
    }
  };

  // Add Stats Configuration handler
  const handleAddStatsConfiguration = () => {
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedCountsOn.length === 0) {
      alert('Please select at least one field for Generate Counts On');
      return;
    }
    if (selectedBreakdownBy.length === 0) {
      alert('Please select at least one field for Breakdown By');
      return;
    }

    if (editingStatsId) {
      // Update existing configuration
      setStatsConfigurations(statsConfigurations.map(config =>
        config.id === editingStatsId
          ? { ...config, inputSources: selectedInputSources, countsOn: selectedCountsOn, isDistinct, breakdownBy: selectedBreakdownBy }
          : config
      ));
      setEditingStatsId(null);
    } else {
      // Add new configuration
      const newConfiguration: StatsConfiguration = {
        id: Date.now().toString(),
        inputSources: selectedInputSources,
        countsOn: selectedCountsOn,
        isDistinct,
        breakdownBy: selectedBreakdownBy,
      };
      setStatsConfigurations([...statsConfigurations, newConfiguration]);
    }

    // Reset selections
    setSelectedInputSources([]);
    setSelectedCountsOn([]);
    setIsDistinct(false);
    setSelectedBreakdownBy([]);
  };

  const handleEditStatsConfiguration = (config: StatsConfiguration) => {
    setEditingStatsId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedCountsOn(config.countsOn);
    setIsDistinct(config.isDistinct);
    setSelectedBreakdownBy(config.breakdownBy);
  };

  const handleDeleteStatsConfiguration = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      setStatsConfigurations(statsConfigurations.filter(c => c.id !== id));
      if (editingStatsId === id) {
        setEditingStatsId(null);
        setSelectedInputSources([]);
        setSelectedCountsOn([]);
        setIsDistinct(false);
        setSelectedBreakdownBy([]);
      }
    }
  };

  // Define modules in initial order (using extracted definitions)
  const [modules, setModules] = useState(createModuleDefinitions());
  const [moduleCounter, setModuleCounter] = useState({ Append: 1, Suppression: 1, Match: 1 });

  // Handle duplication of modules (panels 2, 3, 4)
  const handleDuplicateModule = (moduleId: string) => {
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) return;

    const originalModule = modules[moduleIndex];
    let newTitle: string;
    let newId: string;

    // Determine module type and generate new details
    if (originalModule?.title?.includes('Append')) {
      const newCount = moduleCounter.Append + 1;
      newTitle = `Append Module ${newCount}`;
      newId = `panel2_${newCount}`;
      setModuleCounter(prev => ({ ...prev, Append: newCount }));
    } else if (originalModule?.title?.includes('Suppression')) {
      const newCount = moduleCounter.Suppression + 1;
      newTitle = `Suppression Module ${newCount}`;
      newId = `panel3_${newCount}`;
      setModuleCounter(prev => ({ ...prev, Suppression: newCount }));
    } else if (originalModule?.title?.includes('Match')) {
      const newCount = moduleCounter.Match + 1;
      newTitle = `Match Module ${newCount}`;
      newId = `panel4_${newCount}`;
      setModuleCounter(prev => ({ ...prev, Match: newCount }));
    } else {
      return; // Not a duplicatable module
    }

    // Create duplicated module with default data only
    const duplicatedModule = {
      ...originalModule,
      id: newId,
      title: newTitle,
      description: originalModule.description,
    };

    // Insert the duplicated module right after the original
    const newModules = [...modules];
    newModules.splice(moduleIndex + 1, 0, duplicatedModule);
    setModules(newModules);

    // Automatically expand the new module
    setExpanded(prev => [...prev, newId]);
  };

  const handleDeleteModule = (moduleId: string) => {
    // Only allow deleting duplicated modules (those with underscore in ID)
    if (!moduleId.includes('_')) {
      return;
    }

    // Remove the module from the modules array
    const newModules = modules.filter(module => module.id !== moduleId);
    setModules(newModules);

    // Remove from expanded state if it was expanded
    setExpanded(prev => prev.filter(id => id !== moduleId));
  };

  // Handle drag end for draggable modules (panels 2, 3, 4)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setModules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Only allow dragging within the draggable modules
        const isDraggableModule = (moduleId: string) => {
          return moduleId.startsWith('panel2') || moduleId.startsWith('panel3') || moduleId.startsWith('panel4');
        };

        if (isDraggableModule(active.id as string) && isDraggableModule(over.id as string)) {
          // Validate the move before executing
          const validation = validateModuleMove(oldIndex, newIndex, modules, versionedSources);

          if (!validation.canMove) {
            // Show error message with better formatting
            const errorMessage = `🚫 Module Reordering Not Allowed\n\n${validation.error}\n\n💡 Tip: You can edit or delete the dependent versions first, then reorder the modules.`;
            alert(errorMessage);
            return items; // Return unchanged items
          }
          
          return arrayMove(items, oldIndex, newIndex);
        }
        return items;
      });
    }
  };

  // Get draggable module IDs (Append, Suppression, Match modules including duplicates)
  const draggableIds = modules.filter(m => 
    m.id.startsWith('panel2') || m.id.startsWith('panel3') || m.id.startsWith('panel4')
  ).map(m => m.id);

  // Render module content based on module ID (not index)
  const renderModuleContent = (moduleId: string) => {
    if (moduleId === 'panel1') {
      return (
        <InputModule 
          hideButton={true} 
          onSourcesChange={setInputSources} 
          initialSources={inputSources}
          apiSources={apiSources}
          sourcesLoading={sourcesLoading}
          versionCounters={versionCounters}
          onUpdateVersionCounter={handleUpdateVersionCounter}
        />
      );
    } else if (moduleId === 'panel2' || moduleId.startsWith('panel2_')) {
      // For duplicated Append modules, only pass initial configs to the original module
      const initialConfigs = moduleId === 'panel2' ? initialAppendConfigs : [];
      return <AppendModule 
        availableInputSources={allAvailableInputSources} 
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields) => 
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields)
        }
        initialConfigs={initialConfigs}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={versionedSources.filter(v => v.sourceModule === 'Append' && v.createdByModuleId === moduleId)}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
      />;
    } else if (moduleId === 'panel3' || moduleId.startsWith('panel3_')) {
      // For duplicated Suppression modules, only pass initial configs to the original module
      const initialConfigs = moduleId === 'panel3' ? initialSuppressConfigs : [];
      return <SuppressModule 
        availableInputSources={allAvailableInputSources} 
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields) => 
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields)
        }
        initialConfigs={initialConfigs}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={versionedSources.filter(v => v.sourceModule === 'Suppress' && v.createdByModuleId === moduleId)}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
        onConfigurationsChange={setSuppressConfigurations}
      />;
    } else if (moduleId === 'panel4' || moduleId.startsWith('panel4_')) {
      // For duplicated Match modules, only pass initial configs to the original module
      const initialConfigs = moduleId === 'panel4' ? initialMatchConfigs : [];
      return <MatchModule 
        availableInputSources={allAvailableInputSources} 
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields) => 
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields)
        }
        initialConfigs={initialConfigs}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={versionedSources.filter(v => v.sourceModule === 'Match' && v.createdByModuleId === moduleId)}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
      />;
    } else if (moduleId === 'panel5') {
      // Stats Module Content - Redesigned to match other modules

      // Check if input sources are available
      if (allAvailableInputSources.length === 0) {
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
              Stats Module is not available yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please configure at least one Input Source first in the Input Module
            </Typography>
          </Box>
        );
      }

      // Function to get headers from selected input sources
      const getHeadersFromSelectedSources = (): string[] => {
        const uniqueHeaders = new Set<string>();
        
        selectedInputSources.forEach(sourceName => {
          const source = allAvailableInputSources.find(s => s.sourceName === sourceName);
          if (source) {
            // Use selectedHeaders if available (user's column selection), otherwise fallback to headers
            const headersToUse = source.selectedHeaders || source.headers || [];
            headersToUse.forEach(header => uniqueHeaders.add(header));
          }
        });
        
        return Array.from(uniqueHeaders).sort();
      };

      // Get available headers from selected sources only
      const availableHeaders = getHeadersFromSelectedSources();

      // Filtered lists for Stats Module
      const filteredStatsInputSources = allAvailableInputSources.filter(source =>
        source?.sourceName?.toLowerCase().includes(statsInputSourcesSearch.toLowerCase())
      );

      const filteredStatsCountsOn = availableHeaders.filter(field =>
        field.toLowerCase().includes(statsCountsOnSearch.toLowerCase())
      );

      const filteredStatsBreakdownBy = availableHeaders.filter(field =>
        field.toLowerCase().includes(statsBreakdownBySearch.toLowerCase())
      );

      return (
        <Box>
          {/* Header Section */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                {editingStatsId ? 'Edit Stats Configuration' : 'Create Stats Configuration'}
              </Typography>
              {editingStatsId && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Editing existing configuration - make changes and click Update
                </Typography>
              )}
            </Box>
          </Box>

          {/* Configuration Form - Horizontal Layout */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'stretch',
              mb: 2.5,
            }}
          >
            {/* Step 1: Input Sources */}
            <Box
              sx={{
                flex: 1,
                p: 2,
                backgroundColor: 'white',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Chip
                  label={'1'}
                  size="small"
                  sx={{
                    backgroundColor: '#8B5CF6',
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
              <FormControl size="small" fullWidth>
                <Select
                  multiple
                  value={selectedInputSources}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    // Check if "select-all" was clicked
                    if (value.includes('select-all')) {
                      // Toggle select all
                      if (selectedInputSources.length === filteredStatsInputSources.length) {
                        setSelectedInputSources([]);
                      } else {
                        setSelectedInputSources(filteredStatsInputSources.map(s => s.sourceName));
                      }
                    } else {
                      setSelectedInputSources(value);
                    }
                  }}
                  onClose={() => setStatsInputSourcesSearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                      ))}
                    </Box>
                  )}
                  displayEmpty
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem disabled value="">
                    <em>Select sources...</em>
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
                      value={statsInputSourcesSearch}
                      onChange={(e) => setStatsInputSourcesSearch(e.target.value)}
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
                  <MenuItem value="select-all" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                    <Checkbox
                      checked={filteredStatsInputSources.length > 0 && selectedInputSources.length === filteredStatsInputSources.length}
                      indeterminate={selectedInputSources.length > 0 && selectedInputSources.length < filteredStatsInputSources.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsInputSources.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsInputSources.map((source) => (
                    <MenuItem key={source.id} value={source.sourceName}>
                      <Checkbox checked={selectedInputSources.indexOf(source.sourceName) > -1} size="small" />
                      <ListItemText primary={source.sourceName} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Step 2: Generate Counts On */}
            <Box
              sx={{
                flex: 1,
                p: 2,
                backgroundColor: 'white',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={'2'}
                  size="small"
                  sx={{
                    backgroundColor: '#8B5CF6',
                    color: '#fff',
                    fontWeight: 700,
                    width: 24,
                    height: 24,
                  }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                  Generate Counts On
                </Typography>
                <Typography component="span" sx={{ color: 'error.main', fontSize: '0.9rem' }}>
                  *
                </Typography>

                {/* Separator */}
                <Box sx={{ width: '1px', height: '20px', backgroundColor: 'divider', mx: 0.5 }} />

                {/* Distinct Checkbox inline with label */}
                <FormControlLabel
                  control={<Checkbox checked={isDistinct} onChange={(e) => setIsDistinct(e.target.checked)} size="small" sx={{ padding: '2px', '& .MuiSvgIcon-root': { fontSize: 18 } }} />}
                  label={<Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#2D3748' }}>Distinct</Typography>}
                  sx={{ m: 0, whiteSpace: 'nowrap' }}
                />
              </Box>
              <FormControl size="small" fullWidth>
                <Select
                  multiple
                  value={selectedCountsOn}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    // Check if "select-all" was clicked
                    if (value.includes('select-all-counts')) {
                      // Toggle select all
                      if (selectedCountsOn.length === filteredStatsCountsOn.length) {
                        setSelectedCountsOn([]);
                      } else {
                        setSelectedCountsOn(filteredStatsCountsOn);
                      }
                    } else {
                      setSelectedCountsOn(value);
                    }
                  }}
                  onClose={() => setStatsCountsOnSearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                      ))}
                    </Box>
                  )}
                  displayEmpty
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem disabled value="">
                    <em>Select fields...</em>
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
                      value={statsCountsOnSearch}
                      onChange={(e) => setStatsCountsOnSearch(e.target.value)}
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
                  <MenuItem value="select-all-counts" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                    <Checkbox
                      checked={filteredStatsCountsOn.length > 0 && selectedCountsOn.length === filteredStatsCountsOn.length}
                      indeterminate={selectedCountsOn.length > 0 && selectedCountsOn.length < filteredStatsCountsOn.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsCountsOn.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsCountsOn.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={selectedCountsOn.indexOf(field) > -1} size="small" />
                      <ListItemText primary={field} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Step 3: Breakdown By */}
            <Box
              sx={{
                flex: 1,
                p: 2,
                backgroundColor: 'white',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Chip
                  label={'3'}
                  size="small"
                  sx={{
                    backgroundColor: '#8B5CF6',
                    color: '#fff',
                    fontWeight: 700,
                    mr: 1,
                    width: 24,
                    height: 24,
                  }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                  Breakdown By
                </Typography>
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                  *
                </Typography>
              </Box>
              <FormControl size="small" fullWidth>
                <Select
                  multiple
                  value={selectedBreakdownBy}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    // Check if "select-all" was clicked
                    if (value.includes('select-all-breakdown')) {
                      // Toggle select all
                      if (selectedBreakdownBy.length === filteredStatsBreakdownBy.length) {
                        setSelectedBreakdownBy([]);
                      } else {
                        setSelectedBreakdownBy(filteredStatsBreakdownBy);
                      }
                    } else {
                      setSelectedBreakdownBy(value);
                    }
                  }}
                  onClose={() => setStatsBreakdownBySearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                      ))}
                    </Box>
                  )}
                  displayEmpty
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem disabled value="">
                    <em>Select fields...</em>
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
                      value={statsBreakdownBySearch}
                      onChange={(e) => setStatsBreakdownBySearch(e.target.value)}
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
                  <MenuItem value="select-all-breakdown" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                    <Checkbox
                      checked={filteredStatsBreakdownBy.length > 0 && selectedBreakdownBy.length === filteredStatsBreakdownBy.length}
                      indeterminate={selectedBreakdownBy.length > 0 && selectedBreakdownBy.length < filteredStatsBreakdownBy.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsBreakdownBy.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsBreakdownBy.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={selectedBreakdownBy.indexOf(field) > -1} size="small" />
                      <ListItemText primary={field} />
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
                onClick={handleAddStatsConfiguration}
                sx={{
                  width: 48,
                  height: 48,
                  backgroundColor: '#8B5CF6',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                  '&:hover': {
                    backgroundColor: '#7C3AED',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                  },
                }}
              >
                <Add sx={{ fontSize: 28 }} />
              </IconButton>
            </Box>
          </Box>

          {/* Cancel Edit Button (shown when editing) */}
          {editingStatsId && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditingStatsId(null);
                  setSelectedInputSources([]);
                  setSelectedCountsOn([]);
                  setIsDistinct(false);
                  setSelectedBreakdownBy([]);
                }}
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

          {/* Configurations Table */}
          {statsConfigurations.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                  Stats Configurations
                </Typography>
                <Chip
                  label={`${statsConfigurations.length} configuration${statsConfigurations.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    '&:hover': {
                      backgroundColor: '#7C3AED',
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
                      <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Counts On</TableCell>
                      <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Is Distinct</TableCell>
                      <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Breakdown By</TableCell>
                      <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statsConfigurations.map((config) => (
                      <TableRow
                        key={config.id}
                        hover
                        sx={{
                          backgroundColor: editingStatsId === config.id ? 'rgba(139, 92, 246, 0.04)' : 'transparent',
                          '&:hover': {
                            backgroundColor: editingStatsId === config.id ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)',
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
                                    {config.inputSources.join(', ')}
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
                                    backgroundColor: '#8B5CF620',
                                    color: '#8B5CF6',
                                    border: '1px solid #8B5CF640',
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
                                  {config.inputSources.slice(0, 2).join(', ')}
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

                        {/* Counts On Column */}
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          {config.countsOn.length > 0 ? (
                            <Tooltip
                              title={
                                <Box sx={{ maxWidth: 400 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Counts On ({config.countsOn.length}):
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {config.countsOn.join(', ')}
                                  </Typography>
                                </Box>
                              }
                              arrow
                              placement="top"
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={`${config.countsOn.length} field${config.countsOn.length !== 1 ? 's' : ''}`}
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
                                  {config.countsOn.slice(0, 2).join(', ')}
                                  {config.countsOn.length > 2 ? '...' : ''}
                                </Typography>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              --
                            </Typography>
                          )}
                        </TableCell>

                        {/* Is Distinct Column */}
                        <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                          <Chip
                            label={config.isDistinct ? 'Yes' : 'No'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              backgroundColor: config.isDistinct ? '#10B98120' : '#6B728020',
                              color: config.isDistinct ? '#10B981' : '#6B7280',
                              border: config.isDistinct ? '1px solid #10B98140' : '1px solid #6B728040',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>

                        {/* Breakdown By Column */}
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          {config.breakdownBy.length > 0 ? (
                            <Tooltip
                              title={
                                <Box sx={{ maxWidth: 400 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Breakdown By ({config.breakdownBy.length}):
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {config.breakdownBy.join(', ')}
                                  </Typography>
                                </Box>
                              }
                              arrow
                              placement="top"
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={`${config.breakdownBy.length} field${config.breakdownBy.length !== 1 ? 's' : ''}`}
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
                                  {config.breakdownBy.slice(0, 2).join(', ')}
                                  {config.breakdownBy.length > 2 ? '...' : ''}
                                </Typography>
                              </Box>
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
                              onClick={() => handleEditStatsConfiguration(config)}
                              sx={{
                                color: 'info.main',
                                '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
                              }}
                              title="Edit"
                            >
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteStatsConfiguration(config.id)}
                              sx={{
                                color: 'error.main',
                                '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
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
        </Box>
      );
    } else if (moduleId === 'panel6') {
      return (
        <OutputModule
          availableInputSources={allAvailableInputSources}
          initialConfigs={initialOutputConfigs}
          apiSources={apiSources}
          onConfigurationsChange={setOutputConfigurations}
        />
      );
    } else if (moduleId === 'panel7') {
      return (
        <ScheduleModule
          scheduleType={scheduleType}
          onScheduleTypeChange={setScheduleType}
          notificationWhen={notificationWhen}
          onNotificationWhenChange={setNotificationWhen}
          recipientEmail={recipientEmail}
          onRecipientEmailChange={setRecipientEmail}
          scheduledDateTime={scheduledDateTime}
          onScheduledDateTimeChange={setScheduledDateTime}
        />
      );
    }
    return null;
  };

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#2D3748',
                mb: 0.5,
              }}
            >
              Create New Request
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Configure all modules for your processing request
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* View Mode Toggle - Simplified */}
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
              Step View
            </Typography>
            <Switch
              checked={viewMode === 'stepper'}
              onChange={(e) => setViewMode(e.target.checked ? 'stepper' : 'accordion')}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#296695',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#296695',
                },
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<Close />}
              onClick={handleCancel}
              sx={{ px: 2.5, py: 0.75, fontSize: '0.875rem' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saveLoading}
              sx={{
                px: 2.5,
                py: 0.75,
                fontSize: '0.875rem',
                boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
              }}
            >
              {saveLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="success" onClose={() => setSaveSuccess('')}>
            {saveSuccess}
          </Alert>
        </Box>
      )}
      {saveError && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error" onClose={() => setSaveError('')}>
            {saveError}
          </Alert>
        </Box>
      )}

      {/* Request Name Section - Only show in Accordion View */}
      {viewMode === 'accordion' && (
        <Paper
          sx={{
            p: 3,
            mb: 2.5,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFB 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
              Request Name
            </Typography>
            <Typography
              component="span"
              sx={{
                color: 'error.main',
                fontSize: '1rem',
                fontWeight: 700,
                ml: 0.5,
              }}
            >
              *
            </Typography>
          </Box>
          <TextField
            size="small"
            label="Enter Request Name"
            variant="outlined"
            placeholder="e.g., Sprint Q1 2024"
            value={requestName}
            onChange={(e) => {
              setRequestName(e.target.value);
              if (requestNameError) {
                setRequestNameError(validateRequestName(e.target.value) || '');
              }
            }}
            error={!!requestNameError}
            helperText={requestNameError}
            sx={{
              width: '30%',
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
              },
            }}
          />
        </Paper>
      )}

      {/* Conditional View: Accordion or Stepper */}
      {viewMode === 'accordion' ? (
        /* Accordion View */
        <Box>
          <Typography
            variant="overline"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              display: 'block',
              mb: 2,
            }}
          >
            Configuration Modules
          </Typography>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
              {modules.map((module, index) => {
                // For first module (Input), render with Add button
                if (index === 0) {
                  return (
                    <Accordion
                      key={module.id}
                      expanded={expanded.includes(module.id)}
                      onChange={handleChange(module.id)}
                      sx={{
                        mb: 2,
                        '&:before': {
                          display: 'none',
                        },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          '& .MuiAccordionSummary-content': {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: `${module.color}15`,
                            flexShrink: 0,
                          }}
                        >
                          <module.icon sx={{ fontSize: 16, color: module.color }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, fontSize: '0.95rem' }}>
                            {module.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {module.description}
                          </Typography>
                        </Box>
                        <Box
                          component="span"
                          onClick={handleAddInputSource}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 2,
                            py: 0.5,
                            mr: 1,
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderRadius: 1,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(41, 102, 149, 0.3)',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'primary.dark',
                              boxShadow: '0 4px 12px rgba(41, 102, 149, 0.4)',
                            },
                          }}
                        >
                          <Add fontSize="small" />
                          Add Input Source
                        </Box>
                        <Box
                          component="span"
                          onClick={handleCreateInputVersion}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            mr: 1,
                            backgroundColor: 'transparent',
                            color: '#6366F1',
                            border: '2px solid',
                            borderColor: '#6366F1',
                            borderRadius: 1,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'rgba(99, 102, 241, 0.08)',
                              borderColor: '#4F46E5',
                            },
                          }}
                        >
                          <AccountTree fontSize="small" />
                        </Box>
                        <Chip
                          label={`Step ${index + 1}`}
                          size="small"
                          sx={{
                            backgroundColor: `${module.color}20`,
                            color: module.color,
                            fontWeight: 600,
                            border: 'none',
                          }}
                        />
                      </AccordionSummary>
                      <AccordionDetails>{renderModuleContent(module.id)}</AccordionDetails>
                    </Accordion>
                  );
                }

                // For draggable modules (Append, Suppression, Match)
                if (module.isDraggable) {
                  return (
                    <SortableAccordionItem
                      key={module.id}
                      module={module}
                      index={index}
                      expanded={expanded}
                      onChange={handleChange}
                      renderContent={renderModuleContent}
                      isDraggable={true}
                      onDuplicate={handleDuplicateModule}
                      onDelete={handleDeleteModule}
                    />
                  );
                }

                // For non-draggable modules (Stats, Output, Schedule)
                return (
                  <Accordion
                    key={module.id}
                    expanded={expanded.includes(module.id)}
                    onChange={handleChange(module.id)}
                    sx={{
                      mb: 2,
                      '&:before': {
                        display: 'none',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        '& .MuiAccordionSummary-content': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: `${module.color}15`,
                          flexShrink: 0,
                        }}
                      >
                        <module.icon sx={{ fontSize: 16, color: module.color }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, fontSize: '0.95rem' }}>
                          {module.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {module.description}
                        </Typography>
                      </Box>
                      <Chip
                        label={`Step ${index + 1}`}
                        size="small"
                        sx={{
                          backgroundColor: `${module.color}20`,
                          color: module.color,
                          fontWeight: 600,
                          border: 'none',
                        }}
                      />
                    </AccordionSummary>
                    <AccordionDetails>{renderModuleContent(module.id)}</AccordionDetails>
                  </Accordion>
                );
              })}
            </SortableContext>
          </DndContext>
        </Box>
      ) : (
        /* Step View */
        <Box>
          {/* Horizontal Stepper */}
          <Box sx={{ mb: 3 }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
                <Stepper
                  activeStep={activeStep}
                  sx={{
                    '& .MuiStepConnector-line': {
                      borderColor: 'divider',
                    },
                  }}
                >
                  {modules.map((module, index) => {
                    // For draggable steps (indices 1, 2, 3)
                    if (module.isDraggable) {
                      return (
                        <SortableStep
                          key={module.id}
                          module={module}
                          index={index}
                          activeStep={activeStep}
                          onClick={() => handleStepClick(index)}
                        />
                      );
                    }

                    // For non-draggable steps
                    return (
                      <Step key={module.id} onClick={() => handleStepClick(index)} sx={{ cursor: 'pointer' }}>
                        <StepLabel
                          StepIconProps={{
                            sx: {
                              color: index <= activeStep ? module.color : 'text.disabled',
                              '&.Mui-active': {
                                color: module.color,
                              },
                              '&.Mui-completed': {
                                color: module.color,
                              },
                            },
                          }}
                          sx={{
                            flexDirection: 'column',
                            '& .MuiStepLabel-iconContainer': {
                              paddingRight: 0,
                            },
                            '& .MuiStepLabel-labelContainer': {
                              marginTop: '8px',
                            },
                            '& .MuiStepLabel-label': {
                              fontSize: '0.8rem',
                              fontWeight: index === activeStep ? 600 : 400,
                              color: index === activeStep ? '#2D3748' : 'text.secondary',
                              textAlign: 'center',
                            },
                          }}
                        >
                          {module.title}
                        </StepLabel>
                      </Step>
                    );
                  })}
                </Stepper>
              </SortableContext>
            </DndContext>
          </Box>

          {/* Step Content */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: '#FAFBFC',
              minHeight: 400,
            }}
          >
            {/* Step 1: Request Name First, then Input Module Header and Content */}
            {activeStep === 0 ? (
              <>
                {/* Request Name */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
                      Request Name
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        color: 'error.main',
                        fontSize: '1rem',
                        fontWeight: 700,
                        ml: 0.5,
                      }}
                    >
                      *
                    </Typography>
                  </Box>
                  <TextField
                    size="small"
                    label="Enter Request Name"
                    variant="outlined"
                    placeholder="e.g., Sprint Q1 2024"
                    value={requestName}
                    onChange={(e) => {
                      setRequestName(e.target.value);
                      if (requestNameError) {
                        setRequestNameError(validateRequestName(e.target.value) || '');
                      }
                    }}
                    error={!!requestNameError}
                    helperText={requestNameError}
                    sx={{
                      width: '40%',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                      },
                    }}
                  />
                </Box>

                {/* Input Module Header with Icon */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${modules[activeStep].color}15`,
                      flexShrink: 0,
                    }}
                  >
                    {(() => {
                      const IconComponent = modules[activeStep].icon;
                      return <IconComponent sx={{ fontSize: 24, color: modules[activeStep].color }} />;
                    })()}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D3748', mb: 0.5 }}>
                      {modules[activeStep].title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      {modules[activeStep].description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box
                      component="span"
                      onClick={handleAddInputSource}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 2,
                        py: 0.75,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderRadius: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(41, 102, 149, 0.3)',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                          boxShadow: '0 4px 12px rgba(41, 102, 149, 0.4)',
                        },
                      }}
                    >
                      <Add fontSize="small" />
                      Add Input Source
                    </Box>
                    <Box
                      component="span"
                      onClick={handleCreateInputVersion}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        backgroundColor: 'transparent',
                        color: '#6366F1',
                        border: '2px solid',
                        borderColor: '#6366F1',
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'rgba(99, 102, 241, 0.08)',
                          borderColor: '#4F46E5',
                        },
                      }}
                    >
                      <AccountTree fontSize="small" />
                    </Box>
                  </Box>
                </Box>

                {/* Input Module Content */}
                {renderModuleContent(modules[activeStep].id)}
              </>
            ) : (
              <>
                {/* Step Header with Icon for Other Steps */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${modules[activeStep].color}15`,
                      flexShrink: 0,
                    }}
                  >
                    {(() => {
                      const IconComponent = modules[activeStep].icon;
                      return <IconComponent sx={{ fontSize: 24, color: modules[activeStep].color }} />;
                    })()}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D3748', mb: 0.5 }}>
                      {modules[activeStep].title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      {modules[activeStep].description}
                    </Typography>
                  </Box>
                </Box>

                {/* Other Module Content */}
                {renderModuleContent(modules[activeStep].id)}
              </>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                size="small"
                variant="outlined"
                sx={{ px: 3, py: 0.75 }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                size="small"
                sx={{
                  px: 3,
                  py: 0.75,
                  backgroundColor: modules[activeStep].color,
                  '&:hover': {
                    backgroundColor: modules[activeStep].color,
                    filter: 'brightness(0.9)',
                  },
                  boxShadow: `0 4px 16px ${modules[activeStep].color}40`,
                }}
              >
                {activeStep === modules.length - 1 ? 'Finish' : 'Continue'}
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Bottom Actions */}
      <Box
        sx={{
          mt: 3,
          p: 2.5,
          borderRadius: 4,
          backgroundColor: '#F8FAFB',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
        }}
      >
        <Button variant="outlined" size="small" startIcon={<Close />} onClick={handleCancel} sx={{ px: 3, py: 0.75, fontSize: '0.875rem' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saveLoading}
          sx={{
            px: 3,
            py: 0.75,
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          {saveLoading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </Box>
    </Box>
  );
};

export default RequestCreationPage;
