import { useState, useEffect, useMemo } from 'react';
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
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Save,
  Close,
  AccountTree,
  Add,
  Delete,
  Edit,
  ExpandMore,
  ExpandLess,
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
import OutputModule, { type OutputAPIPayload } from '../../../components/OutputModule/OutputModule';
import ScheduleModule from '../../../components/ScheduleModule/ScheduleModule';
import type { InputSource } from '../../../components/InputModule/InputModule';
import type { AppendConfig } from '../../../components/AppendModule/types';
import type { SuppressConfig } from '../../../components/SuppressModule/SuppressModule';
import type { MatchConfig } from '../../../components/MatchModule/types';
import type { OutputConfig } from '../../../components/OutputModule/OutputModule';
import { checkRequestName, submitRequest, getEditRequest, type SubmitRequestPayload, type RequestInputsResponse } from '../../../services/api';

// Extracted modules
import type { StatsConfiguration, VersionedSource, CountOnField } from './types';
import { transformAllStatsToAPI } from './types';
import { createModuleDefinitions } from './utils/moduleDefinitions';
import { validateModuleMove, validateCustomSourceDependencies } from './utils/moduleHelpers';
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
    const [recipientEmailError, setRecipientEmailError] = useState('');
  const [scheduledDateTimeError, setScheduledDateTimeError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [editRequestLoading, setEditRequestLoading] = useState(false);
  const [editRequestError, setEditRequestError] = useState('');

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
  const [selectedCountsOn, setSelectedCountsOn] = useState<CountOnField[]>([]);
  const [selectedBreakdownBy, setSelectedBreakdownBy] = useState<string[]>([]);
  const [statsConfigurations, setStatsConfigurations] = useState<StatsConfiguration[]>([]);
  const [editingStatsId, setEditingStatsId] = useState<string | null>(null);

  // Stats search states
  const [statsInputSourcesSearch, setStatsInputSourcesSearch] = useState('');
  const [statsCountsOnSearch, setStatsCountsOnSearch] = useState('');
  const [statsBreakdownBySearch, setStatsBreakdownBySearch] = useState('');

  // Clear selected fields when input sources change (but not when editing)
  useEffect(() => {
    console.log("req",requestId)
    // Don't clear fields if we're in edit mode
    if (!editingStatsId) {
      setSelectedCountsOn([]);
      setSelectedBreakdownBy([]);
    }
  }, [selectedInputSources, editingStatsId, requestId]);

  // Schedule Component state
  const [scheduleType, setScheduleType] = useState<'adhoc' | 'scheduled_at'>('adhoc');
  const [notificationWhen, setNotificationWhen] = useState('standard');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Versioned Sources State
  const [versionedSources, setVersionedSources] = useState<VersionedSource[]>([]);
  const [versionCounters, setVersionCounters] = useState({
    Input: 0,
    Match: 0,
    Append: 0,
    Suppress: 0
  });

  // Initial configs for modules (for edit mode)
  const [initialAppendConfigs, setInitialAppendConfigs] = useState<AppendConfig[]>([]);
  const [initialSuppressConfigs, setInitialSuppressConfigs] = useState<SuppressConfig[]>([]);
  const [initialMatchConfigs, setInitialMatchConfigs] = useState<MatchConfig[]>([]);
  const [initialOutputConfigs, setInitialOutputConfigs] = useState<OutputConfig[]>([]);

  // Current output configurations
  const [outputConfigurations, setOutputConfigurations] = useState<OutputConfig[]>([]);
  const [transformedOutputData, setTransformedOutputData] = useState<OutputAPIPayload | null>(null);

  // Current module configurations (for dependency tracking)
  const [appendConfigurations, setAppendConfigurations] = useState<AppendConfig[]>([]);
  const [suppressConfigurations, setSuppressConfigurations] = useState<SuppressConfig[]>([]);
  const [matchConfigurations, setMatchConfigurations] = useState<MatchConfig[]>([]);

  // Shared custom sources across all modules (Append, Match, Suppress)
  const [sharedCustomSources, setSharedCustomSources] = useState<InputSource[]>([]);

  // Transform API response to internal format
  const transformApiDataToInternalFormat = (apiData: any, apiSourcesForTransform?: RequestInputsResponse | null) => {
    const transformedData: any = {};

    // Transform request name from requestDetails
    if (apiData?.requestDetails?.requestName) {
      transformedData.requestName = apiData.requestDetails.requestName;
    }

    // Helper function to generate consistent ID from source name
    const generateSourceId = (sourceName: string): string => {
      if (!sourceName) return `input_${Date.now()}`;
      // Create a deterministic ID based on source name
      return `src_${sourceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    };

    // Transform input sources
    if (apiData?.inputSources && Array.isArray(apiData.inputSources)) {
      transformedData.inputSources = apiData.inputSources.map((source: any, index: number) => {
        const selectedColumnsArray = source?.selectedColumns
          ? source.selectedColumns.split(',').map((col: string) => col.trim())
          : source?.columns || [];

        // Use existing ID or generate a consistent one from source name
        const sourceId = source?.id || generateSourceId(source?.sourceName || `input_${index}`);

        console.log('[Transform] Input Source:', {
          sourceName: source?.sourceName,
          generatedId: sourceId,
          originalId: source?.id
        });

        // For database sources, differentiate between:
        // - sourceName: User's custom Table Source Name (display name)
        // - tableName: Actual database table name
        // - sourceOption: Table ID for preconfigured tables
        const actualTableName = source?.tableName || source?.originalTableName || source?.table || '';

        console.log('[Transform] Database fields:', {
          sourceName: source?.sourceName,
          tableName: source?.tableName,
          originalTableName: source?.originalTableName,
          sourceOption: source?.sourceOption,
          tableSourceId: source?.tableSourceId,
          actualTableName
        });

        return {
          id: sourceId,
          sourceName: source?.sourceName || '',  // User's custom Table Source Name
          sourceType: source?.sourceType === 'T' ? 'Database' : source?.sourceType === 'F' ? 'File' : 'Self',
          subSourceType: source?.sourceType === 'T' ?
                         (source?.isCustomTable === 1 ? 'Custom Database' : 'Database') :
                         (source?.sourceType === 'F' && source?.fileSource ? source.fileSource : undefined),
          inputType: source?.inputType || 'I',
          table: actualTableName,  // Actual database table name
          headers: source?.columns || [],
          selectedHeaders: selectedColumnsArray,
          database: source?.database || source?.dbName || '',
          schema: source?.schema || '',
          filterQuery: source?.filters || '',  // Map 'filters' from API to 'filterQuery' in UI
          filterConfig: source?.filterConfig || null,
          isCustomTable: source?.isCustomTable || 0,
          // File source specific fields
          fileSource: source?.fileSource || '',
          fileSourceId: source?.fileSourceId || source?.dataSourceId,
          filePath: source?.filePath || '',
          fileName: source?.fileName || '',
          delimiter: source?.delimiter || ',',
          hasHeader: source?.hasHeader !== undefined ? source.hasHeader : true,
          isHeader: source?.isHeader !== undefined ? source.isHeader : 1,
          customHeaders: source?.customHeaders || '',
          // Preview and data type fields
          previewData: source?.previewData || [],
          dataTypes: source?.dataTypes || {},
          // Store original table name and table ID for restoration
          // originalTableName: The actual database table name (for dropdown)
          // tableSourceId: The table ID (for API calls and precise lookup)
          originalTableName: actualTableName,
          tableSourceId: source?.tableSourceId || source?.sourceOption
        };
      });
    }

    // Helper function to map source name to source ID
    const mapSourceNameToId = (sourceName: string): string => {
      if (!sourceName) return '';

      // Check in transformed input sources first
      if (transformedData?.inputSources && Array.isArray(transformedData.inputSources)) {
        const source = transformedData.inputSources.find((src: any) =>
          src?.sourceName === sourceName ||
          src?.table === sourceName ||
          src?.id === sourceName
        );
        if (source?.id) {
          console.log('[MapSourceId] Found in transformed sources:', { sourceName, mappedId: source.id });
          return source.id;
        }
      }

      // Also check in the original API data input sources
      if (apiData?.inputSources && Array.isArray(apiData.inputSources)) {
        const apiSource = apiData.inputSources.find((src: any) => src?.sourceName === sourceName);
        if (apiSource) {
          // Return existing ID or generate consistent one
          const mappedId = apiSource.id || generateSourceId(sourceName);
          console.log('[MapSourceId] Found in API sources:', { sourceName, mappedId, originalId: apiSource.id });
          return mappedId;
        }
      }

      // If not found in any sources, generate a consistent ID from the source name
      // This ensures consistency even when source isn't found
      const fallbackId = generateSourceId(sourceName);
      console.log('[MapSourceId] Not found, generating fallback:', { sourceName, fallbackId });
      return fallbackId;
    };

    // Helper function to map preconfigured source name to ID
    const mapPreconfiguredSourceNameToId = (sourceName: string, sourceModule: 'append' | 'match' | 'suppress'): string => {
      if (!sourceName) return '';

      // Look up in apiSourcesForTransform (from requestinputs.php API) instead of apiData
      let preconfiguredTables: any[] = [];

      if (sourceModule === 'append' && apiSourcesForTransform?.dbSource?.preconfiguredTables?.append) {
        preconfiguredTables = apiSourcesForTransform.dbSource.preconfiguredTables.append;
      } else if (sourceModule === 'match' && apiSourcesForTransform?.dbSource?.preconfiguredTables?.match) {
        preconfiguredTables = apiSourcesForTransform.dbSource.preconfiguredTables.match;
      } else if (sourceModule === 'suppress' && apiSourcesForTransform?.dbSource?.preconfiguredTables?.suppress) {
        preconfiguredTables = apiSourcesForTransform.dbSource.preconfiguredTables.suppress;
      }

      // Find the table by name and return its ID
      if (preconfiguredTables.length > 0) {
        const table = preconfiguredTables.find((t: any) => t?.tableName === sourceName);
        if (table?.tableId) {
          const id = `${sourceModule}_${table.tableId}`;
          console.log('[MapPreconfiguredSourceId] Found:', { sourceName, sourceModule, id, tableId: table.tableId });
          return id;
        }
      }

      // If not found in preconfigured tables or dbSource not available,
      // generate a fallback ID from the source name
      // This ensures the UI can still display and work with the source
      const fallbackId = `${sourceModule}_${generateSourceId(sourceName)}`;
      console.warn('[MapPreconfiguredSourceId] Not found in API, generating fallback:', {
        sourceName,
        sourceModule,
        fallbackId,
        availableTables: preconfiguredTables.map(t => ({ name: t?.tableName, id: t?.tableId }))
      });
      return fallbackId;
    };

    // Transform workflow (Input Versions, Append, Suppress, Match configurations)
    if (apiData?.workflow && Array.isArray(apiData.workflow)) {
      const inputVersions: any[] = [];
      const appendConfigs: any[] = [];
      const suppressConfigs: any[] = [];
      const matchConfigs: any[] = [];

      apiData.workflow.forEach((workflowItem: any, index: number) => {
        const actionType = workflowItem?.actionType;
        const configJson = workflowItem?.configJson;

        if (actionType === 'P' && configJson) {
          // Input Version (actionType 'P' for Processing/Version)
          const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name || src) || [];
          const versionName = workflowItem?.versionName || `Version_${index}`;

          // Create versioned source from workflow
          const versionedSource: any = {
            id: `versioned_${Date.now()}_${index}`,
            sourceName: versionName,
            sourceType: 'Version',
            subSourceType: 'Versioned',
            isVersioned: true,
            versionNumber: index + 1,
            versionLabel: versionName,
            sourceModule: 'Input',
            headers: configJson?.merge_keys || configJson?.priority_order || [],
            selectedHeaders: configJson?.merge_keys || configJson?.priority_order || [],
            // Store workflow properties for payload reconstruction
            stepOrder: workflowItem?.stepOrder || 1,
            actionType: 'P',
            saveAsVersion: workflowItem?.saveAsVersion || 1,
            versionName: versionName,
            internalStepOrder: workflowItem?.internalStepOrder,
            configJson: configJson
          };

          inputVersions.push(versionedSource);
        } else if (actionType === 'A' && configJson) {
          // Append configuration - map source names to IDs
          const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name) || [];
          const inputSources = inputSourceNames.map((name: string) => mapSourceNameToId(name));

          // For append sources: map to proper IDs (preconfigured or custom)
          const appendSources = configJson?.append_sources?.map((src: any) => {
            const sourceName = src?.source_name;
            const sourceType = src?.source_type;

            // If it's a preconfigured source, look up its ID
            if (sourceType === 'preconfigured') {
              return mapPreconfiguredSourceNameToId(sourceName, 'append');
            }

            // Otherwise map to ID (for custom sources from inputSources)
            return mapSourceNameToId(sourceName);
          }) || [];

          const fieldsToAppend = configJson?.append_sources?.flatMap((src: any) => src?.fields || []) || [];

          console.log('[Transform] Append Config:', {
            inputSourceNames,
            inputSources,
            appendSources
          });

          appendConfigs.push({
            id: `append_${Date.now()}_${index}`,
            inputSources: inputSources, // Array of source IDs
            appendOnFields: configJson?.match_keys || [],
            appendSources: appendSources, // Array of source IDs (preconfigured or custom)
            appendFields: fieldsToAppend,
            fieldMappings: configJson?.field_mappings || []
          });
        } else if (actionType === 'S' && configJson) {
          // Suppress configuration - map source names to IDs
          const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name) || [];
          const inputSources = inputSourceNames.map((name: string) => mapSourceNameToId(name));

          // For suppress sources: map to proper IDs (preconfigured or custom)
          const suppressSources = configJson?.suppress_sources?.map((src: any) => {
            const sourceName = src?.source_name;
            const sourceType = src?.source_type;

            // If it's a preconfigured source, look up its ID
            if (sourceType === 'preconfigured') {
              return mapPreconfiguredSourceNameToId(sourceName, 'suppress');
            }

            // Otherwise map to ID (for custom sources from inputSources)
            return mapSourceNameToId(sourceName);
          }) || [];

          suppressConfigs.push({
            id: `suppress_${Date.now()}_${index}`,
            inputSources: inputSources, // Array of source IDs
            suppressOnFields: configJson?.suppress_on_fields || [],
            suppressSources: suppressSources // Array of source IDs (preconfigured or custom)
          });
        } else if (actionType === 'M' && configJson) {
          // Match configuration - map source names to IDs
          const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name) || [];
          const inputSources = inputSourceNames.map((name: string) => mapSourceNameToId(name));

          // For match sources: map to proper IDs (preconfigured or custom)
          const matchSources = configJson?.match_sources?.map((src: any) => {
            const sourceName = src?.source_name;
            const sourceType = src?.source_type;

            // If it's a preconfigured source, look up its ID
            if (sourceType === 'preconfigured') {
              return mapPreconfiguredSourceNameToId(sourceName, 'match');
            }

            // Otherwise map to ID (for custom sources from inputSources)
            return mapSourceNameToId(sourceName);
          }) || [];

          matchConfigs.push({
            id: `match_${Date.now()}_${index}`,
            inputSources: inputSources, // Array of source IDs
            matchOnFields: configJson?.match_on_fields || [],
            matchSources: matchSources, // Array of source IDs (preconfigured or custom)
            expand: configJson?.expand !== undefined ? configJson.expand : false,
            matchType: configJson?.match_type || 'full'
          });
        }
      });

      if (inputVersions.length > 0) {
        transformedData.inputVersions = inputVersions;
      }
      if (appendConfigs.length > 0) {
        transformedData.appendConfigs = appendConfigs;
      }
      if (suppressConfigs.length > 0) {
        transformedData.suppressConfigs = suppressConfigs;
      }
      if (matchConfigs.length > 0) {
        transformedData.matchConfigs = matchConfigs;
      }
    }

    // Transform stats configurations
    if (apiData?.stats && Array.isArray(apiData.stats)) {
      transformedData.statsConfigs = apiData.stats.map((stat: any, index: number) => {
        // Stats module uses source NAMES directly, not IDs
        const inputSourceNames = stat?.input_sources?.map((src: any) => src?.source_name) || [];

        // Transform generate_counts_config to CountOnField array
        let countsOn: CountOnField[] = [];

        // Try new nested format first: generate_counts_config.counts
        if (stat?.generate_counts_config && stat.generate_counts_config?.counts && Array.isArray(stat.generate_counts_config.counts)) {
          countsOn = stat.generate_counts_config.counts.map((item: any) => ({
            field: item?.field || '',
            isDistinct: item?.is_distinct !== undefined ? item.is_distinct : false
          }));
        }
        // Fallback to old flat format: generate_counts_on
        else if (stat?.generate_counts_on) {
          if (Array.isArray(stat.generate_counts_on)) {
            // Check if it's array of objects or array of strings
            if (stat.generate_counts_on.length > 0 && typeof stat.generate_counts_on[0] === 'object') {
              // Format: array of {field, is_distinct}
              countsOn = stat.generate_counts_on.map((item: any) => ({
                field: item?.field || '',
                isDistinct: item?.is_distinct !== undefined ? item.is_distinct : false
              }));
            } else {
              // Old format: array of strings - convert to new format with default distinct = false
              countsOn = stat.generate_counts_on.map((field: string) => ({
                field: field,
                isDistinct: stat?.is_distinct !== undefined ? stat.is_distinct : false
              }));
            }
          }
        }

        return {
          id: `stats_${Date.now()}_${index}`,
          inputSources: inputSourceNames, // Array of source NAMES (stats uses names, not IDs)
          countsOn: countsOn,
          breakdownBy: stat?.breakdown_by || []
        };
      });
    }

    // Transform output configurations
    if (apiData?.output && Array.isArray(apiData.output)) {
      transformedData.outputConfigs = apiData.output.map((output: any, index: number) => {
        // Handle new format with config wrapper
        const config = output?.config || output; // Fallback to output directly if config doesn't exist

        // Extract source names from input_sources
        let inputSourceNames: string[] = [];
        if (config?.input_sources && Array.isArray(config.input_sources)) {
          // Check if input_sources are objects with source_name or just strings
          inputSourceNames = config.input_sources.map((src: any) => {
            if (typeof src === 'string') return src;
            if (src?.source_name) return src.source_name;
            return '';
          }).filter(Boolean);
        }

        // Map source names to IDs
        const inputSources = inputSourceNames.map((name: string) => mapSourceNameToId(name));

        // Determine destination type and details
        const destinationType = output?.destinationType || 'preconfigured';
        const isCustomDestination = destinationType === 'custom';
        const destinationName = output?.destinationName || null;
        const destinationConfig = output?.destinationConfig || null;

        return {
          id: `output_${Date.now()}_${index}`,
          inputSources: inputSources, // Array of source IDs
          outputFields: config?.output_fields || [],
          combineSources: config?.combine_sources !== undefined ? config.combine_sources : false,
          combineSourcesList: config?.combine_sources ? inputSources : [],
          priorityOrder: inputSources,
          fieldPriority: config?.field_priority || [],
          fieldMappings: config?.field_mappings || [],
          limitation: output?.limitations?.limit_records !== undefined && output?.limitations?.limit_records !== null,
          limitCount: output?.limitations?.limit_records || undefined,
          random: output?.limitations?.shuffle_records !== undefined ? output.limitations.shuffle_records : false,
          // Destination details
          isCustomDestination: isCustomDestination,
          destinationType: destinationType,
          destinationName: destinationName,
          destinationConfig: destinationConfig,
          destinations: [] // Legacy field
        };
      });
    }

    // Transform schedule configuration from requestDetails
    if (apiData?.requestDetails) {
      const schedType = apiData.requestDetails?.requestType === 'A' ? 'adhoc' : 'scheduled_at';
      const notifWhen = apiData.requestDetails?.sendNotificationOn === 'S' ? 'standard' :
                        apiData.requestDetails?.sendNotificationOn === 'E' ? 'error_only' : 'standard';

      transformedData.scheduleConfig = {
        scheduleType: schedType,
        emailNotification: notifWhen,
        notificationEmails: apiData.requestDetails?.recipientEmail
          ? [apiData.requestDetails.recipientEmail]
          : [],
        scheduledDateTime: apiData.requestDetails?.scheduledDateTime || ''
      };
    }

    return transformedData;
  };

  // Load request data when in edit mode
  useEffect(() => {
    const loadEditRequest = async () => {
      if (!requestId) return;

      // Wait for apiSources to load before transforming edit request data
      // This ensures preconfigured table IDs can be properly resolved
      if (sourcesLoading) {
        console.log('[Edit Mode] Waiting for apiSources to load...');
        return;
      }

      // // Demo mode: Load sample data for requestId === '999'
      // if (requestId === '999') {
      //   // Load comprehensive sample data
      //   setRequestName(comprehensiveSampleData?.requestName || '');
      //   setInputSources(comprehensiveSampleData?.inputSources || []);

      //   // Clear validation errors when loading sample data
      //   setRequestNameError('');

      //   // Load append configurations
      //   if (comprehensiveSampleData.appendConfigs?.length > 0) {
      //     setInitialAppendConfigs(comprehensiveSampleData.appendConfigs);
      //   }

      //   // Load suppress configurations
      //   if (comprehensiveSampleData.suppressConfigs?.length > 0) {
      //     setInitialSuppressConfigs(comprehensiveSampleData.suppressConfigs);
      //   }

      //   // Load match configurations
      //   if (comprehensiveSampleData.matchConfigs?.length > 0) {
      //     setInitialMatchConfigs(comprehensiveSampleData.matchConfigs);
      //   }

      //   // Load output configurations
      //   if (comprehensiveSampleData.outputConfigs?.length > 0) {
      //     setInitialOutputConfigs(comprehensiveSampleData.outputConfigs);
      //   }

      //   // Load stats configurations
      //   if (comprehensiveSampleData.statsConfigs?.length > 0) {
      //     setStatsConfigurations(comprehensiveSampleData.statsConfigs as StatsConfiguration[]);
      //   }

      //   // Load schedule configuration
      //   if (comprehensiveSampleData.scheduleConfig) {
      //     const schedConfig = comprehensiveSampleData.scheduleConfig;
      //     setScheduleType(schedConfig.scheduleType || 'adhoc');
      //     setScheduledDateTime(schedConfig.scheduledDateTime || '');
      //     setNotificationWhen(schedConfig.emailNotification || 'standard');
      //     if (schedConfig.notificationEmails?.length > 0) {
      //       setRecipientEmail(schedConfig.notificationEmails?.join(', ') || '');
      //     }
      //   }
      //   return;
      // }

      // Edit mode: Make API call to fetch request data
      try {
        setEditRequestLoading(true);
        setEditRequestError('');

        const response = await getEditRequest(parseInt(requestId, 10));

        let dataToLoad: any = null;

        if (response.success && response.data) {
          // Transform API response to internal format
          dataToLoad = transformApiDataToInternalFormat(response.data, apiSources);
        } else {
          // API failed or returned no data - use mock data
          console.warn('API failed to load request data, using mock data:', response.message);

          // Mock data structure
          const mockData = {
            "requestDetails": {
              "requestName": "final_test",
              "createdBy": "system",
              "updatedBy": "system",
              "requestType": "A",
              "sendNotificationOn": "S",
              "recipientEmail": "test@test"
            },
            "inputSources": [
              {
                "sourceName": "PROFILE",  // User's custom Table Source Name
                "tableName": "PROFILE",  // Actual database table name
                "sourceType": "T",
                "columnSelectionType": "A",
                "columns": [
                  "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                  "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                  "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                ],
                "selectedColumns": "EMAIL_ID,PROFILE_ID,LIST_ID,EMAIL_MD5,MA1566,CREDIT_SCORE,INCOME,AGE,ZIP_CODE,FIRST_NAME,LAST_NAME,PHONE_NUMBER,STATE,CITY,ACCOUNT_STATUS,EMPLOYMENT_STATUS,ACCOUNT_BALANCE",
                "inputType": "I",
                "filters": "",
                "isCustomTable": 0,
                "sourceOption": 1  // Table ID for preconfigured table
              }
            ],
            "workflow": [
              {
                "stepOrder": 1,
                "internalStepOrder": 1,
                "actionType": "I",
                "configJson": {
                  "input_sources": ["PROFILE"]
                }
              },
              {
                "stepOrder": 1,
                "actionType": "P",
                "saveAsVersion": 1,
                "versionName": "PROFILE_version",
                "internalStepOrder": 2,
                "configJson": {
                  "operation": "union",
                  "input_sources": [
                    {
                      "source_name": "PROFILE",
                      "columns": [
                        "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                        "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                        "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                      ]
                    }
                  ],
                  "added_fields": [],
                  "field_mappings": [],
                  "merge_keys": [
                    "ACCOUNT_BALANCE", "ACCOUNT_STATUS", "AGE", "CITY", "CREDIT_SCORE", "EMAIL_ID", "EMAIL_MD5",
                    "EMPLOYMENT_STATUS", "FIRST_NAME", "INCOME", "LAST_NAME", "LIST_ID", "MA1566", "PHONE_NUMBER",
                    "PROFILE_ID", "STATE", "ZIP_CODE"
                  ],
                  "priority_order": [
                    "ACCOUNT_BALANCE", "ACCOUNT_STATUS", "AGE", "CITY", "CREDIT_SCORE", "EMAIL_ID", "EMAIL_MD5",
                    "EMPLOYMENT_STATUS", "FIRST_NAME", "INCOME", "LAST_NAME", "LIST_ID", "MA1566", "PHONE_NUMBER",
                    "PROFILE_ID", "STATE", "ZIP_CODE"
                  ]
                }
              },
              {
                "stepOrder": 2,
                "internalStepOrder": 1,
                "actionType": "A",
                "configJson": {
                  "input_sources": [
                    {
                      "source_name": "PROFILE",
                      "columns": [
                        "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                        "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                        "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                      ]
                    }
                  ],
                  "match_keys": ["EMAIL_ID"],
                  "is_self_append": false,
                  "append_sources": [
                    {
                      "source_type": "preconfigured",
                      "source_name": "ZXDS_ALLCHANNEL_Q1_2026_UNIVERSE_PERMISSIONED_DND",
                      "fields": ["MD5"],
                      "priority": 1
                    }
                  ],
                  "field_mappings": []
                }
              },
              {
                "stepOrder": 3,
                "internalStepOrder": 1,
                "actionType": "S",
                "configJson": {
                  "input_sources": [
                    {
                      "source_name": "PROFILE",
                      "columns": [
                        "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                        "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                        "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                      ]
                    }
                  ],
                  "suppress_on_fields": ["PROFILE_ID"],
                  "suppress_sources": [
                    {
                      "source_type": "preconfigured",
                      "source_name": "ZXDS_Q1_2026_UNIVERSE_NON_PERMISSIONED_DND"
                    }
                  ]
                }
              }
            ],
            "stats": [
              {
                "input_sources": [
                  {
                    "source_name": "PROFILE",
                    "columns": [
                      "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                      "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                      "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                    ]
                  }
                ],
                "generate_counts_config": {
                  "counts": [
                    {
                      "field": "ACCOUNT_STATUS",
                      "is_distinct": true
                    }
                  ]
                },
                "breakdown_by": ["AGE"]
              }
            ],
            "output": [
              {
                "config": {
                  "input_sources": ["PROFILE"],
                  "output_fields": ["LIST_ID"],
                  "field_mappings": [],
                  "combine_sources": false,
                  "field_priority": []
                },
                "destinationType": "preconfigured",
                "destinationName": "ZXDS_NEW_SFTP",
                "limitations": {
                  "limit_records": null,
                  "shuffle_records": false
                }
              }
            ]
          };

          dataToLoad = transformApiDataToInternalFormat(mockData, apiSources);
        }

        // Populate form fields with the transformed data
        if (dataToLoad) {
          // Load request name
          if (dataToLoad?.requestName) {
            setRequestName(dataToLoad.requestName);
          }

          // Load input sources
          if (dataToLoad?.inputSources && Array.isArray(dataToLoad.inputSources)) {
            setInputSources(dataToLoad.inputSources);
          }

          // Load input versions
          if (dataToLoad?.inputVersions && Array.isArray(dataToLoad.inputVersions)) {
            setVersionedSources(dataToLoad.inputVersions);
          }

          // Load append configurations
          if (dataToLoad?.appendConfigs && Array.isArray(dataToLoad.appendConfigs) && dataToLoad.appendConfigs.length > 0) {
            setInitialAppendConfigs(dataToLoad.appendConfigs);
          }

          // Load suppress configurations
          if (dataToLoad?.suppressConfigs && Array.isArray(dataToLoad.suppressConfigs) && dataToLoad.suppressConfigs.length > 0) {
            setInitialSuppressConfigs(dataToLoad.suppressConfigs);
          }

          // Load match configurations
          if (dataToLoad?.matchConfigs && Array.isArray(dataToLoad.matchConfigs) && dataToLoad.matchConfigs.length > 0) {
            setInitialMatchConfigs(dataToLoad.matchConfigs);
          }

          // Load output configurations
          if (dataToLoad?.outputConfigs && Array.isArray(dataToLoad.outputConfigs) && dataToLoad.outputConfigs.length > 0) {
            setInitialOutputConfigs(dataToLoad.outputConfigs);
          }

          // Load stats configurations
          if (dataToLoad?.statsConfigs && Array.isArray(dataToLoad.statsConfigs) && dataToLoad.statsConfigs.length > 0) {
            setStatsConfigurations(dataToLoad.statsConfigs);
          }

          // Load schedule configuration
          if (dataToLoad?.scheduleConfig) {
            const schedConfig = dataToLoad.scheduleConfig;
            setScheduleType(schedConfig?.scheduleType || 'adhoc');
            setScheduledDateTime(schedConfig?.scheduledDateTime || '');
            setNotificationWhen(schedConfig?.emailNotification || 'standard');
            if (schedConfig?.notificationEmails && Array.isArray(schedConfig.notificationEmails) && schedConfig.notificationEmails.length > 0) {
              setRecipientEmail(schedConfig.notificationEmails.join(', ') || '');
            }
          }

          // Clear validation errors
          setRequestNameError('');
          setRecipientEmailError('');
          setScheduledDateTimeError('');
        }

      } catch (error) {
        console.error('Error loading edit request:', error);
        console.warn('Using mock data due to API error');

        

        // Use mock data when API throws an error
        const mockData = {
          "requestDetails": {
            "requestName": "final_test",
            "createdBy": "system",
            "updatedBy": "system",
            "requestType": "A",
            "sendNotificationOn": "S",
            "recipientEmail": "test@test"
          },
          "inputSources": [
            {
              "sourceName": "PROFILE123",  // User's custom Table Source Name
              "tableName": "PROFILE",  // Actual database table name
              "sourceType": "T",
              "columnSelectionType": "A",
              "columns": [
                "EMAIL_ID",  "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
              ],
              "selectedColumns": "EMAIL_ID,PROFILE_ID",
              "inputType": "I",
              "filters": "",
              "isCustomTable": 0,
              "sourceOption": 2  // Table ID for preconfigured table
            } , 

            {
    "sourceName": "MedicomCoreResponders_1223_1231_AfterSupp_zxds_up_new",
    "sourceType": "F",
    "dataSourceId": 8,
    "filePath": "/ftp/Mediacom/Switch_Save/MedicomCoreResponders_1223_1231_AfterSupp_zxds_up_new.csv",
    "delimiter": ",",
    "fileFormat": "CSV",
    "isHeader": 1,
    "columnSelectionType": "A",
    "columns": [
        "email",
        "open_date",
        "click_date",
        "exec_date",
        "touch"
    ],
    "selectedColumns": "email,open_date,click_date,exec_date,touch",
    "inputType": "I",
    "filters": "",
    "customHeaders": "",
    "filterConfig": null,
    "subSourceType": "SFTP"
}
            
          ],
          "workflow": [
            {
              "stepOrder": 1,
              "internalStepOrder": 1,
              "actionType": "I",
              "configJson": {
                "input_sources": ["PROFILE"]
              }
            },
            {
              "stepOrder": 1,
              "actionType": "P",
              "saveAsVersion": 1,
              "versionName": "PROFILE_version",
              "internalStepOrder": 2,
              "configJson": {
                "operation": "union",
                "input_sources": [
                  {
                    "source_name": "PROFILE",
                    "columns": [
                      "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                      "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                      "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                    ]
                  }
                ],
                "added_fields": [],
                "field_mappings": [],
                "merge_keys": [
                  "ACCOUNT_BALANCE", "ACCOUNT_STATUS", "AGE", "CITY", "CREDIT_SCORE", "EMAIL_ID", "EMAIL_MD5",
                  "EMPLOYMENT_STATUS", "FIRST_NAME", "INCOME", "LAST_NAME", "LIST_ID", "MA1566", "PHONE_NUMBER",
                  "PROFILE_ID", "STATE", "ZIP_CODE"
                ],
                "priority_order": [
                  "ACCOUNT_BALANCE", "ACCOUNT_STATUS", "AGE", "CITY", "CREDIT_SCORE", "EMAIL_ID", "EMAIL_MD5",
                  "EMPLOYMENT_STATUS", "FIRST_NAME", "INCOME", "LAST_NAME", "LIST_ID", "MA1566", "PHONE_NUMBER",
                  "PROFILE_ID", "STATE", "ZIP_CODE"
                ]
              }
            },
            {
              "stepOrder": 2,
              "internalStepOrder": 1,
              "actionType": "A",
              "configJson": {
                "input_sources": [
                  {
                    "source_name": "PROFILE",
                    "columns": [
                      "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                      "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                      "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                    ]
                  }
                ],
                "match_keys": ["EMAIL_ID"],
                "is_self_append": false,
                "append_sources": [
                  {
                    "source_type": "preconfigured",
                    "source_name": "PROFILE",
                    "fields": ["PROFILE_ID", "EMAIL_ADDRESS_MD5"],
                    "priority": 1
                  }
                ],
                "field_mappings": []
              }
            },
            {
              "stepOrder": 3,
              "internalStepOrder": 1,
              "actionType": "S",
              "configJson": {
                "input_sources": [
                  {
                    "source_name": "PROFILE",
                    "columns": [
                      "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                      "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                      "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                    ]
                  }
                ],
                "suppress_on_fields": ["EMAIL_MD5"],
                "suppress_sources": [
                  {
                    "source_type": "preconfigured",
                    "source_name": "DNS_SUPPRESSION_LIST"
                  }
                ]
              }
            }
          ],
          "stats": [
            {
              "input_sources": [
                {
                  "source_name": "PROFILE",
                  "columns": [
                    "EMAIL_ID", "PROFILE_ID", "LIST_ID", "EMAIL_MD5", "MA1566", "CREDIT_SCORE", "INCOME", "AGE",
                    "ZIP_CODE", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "STATE", "CITY", "ACCOUNT_STATUS",
                    "EMPLOYMENT_STATUS", "ACCOUNT_BALANCE"
                  ]
                }
              ],
              "generate_counts_config": {
                "counts": [
                  {
                    "field": "ACCOUNT_STATUS",
                    "is_distinct": true
                  }
                ]
              },
              "breakdown_by": ["AGE"]
            }
          ],
          "output": [
            {
              "config": {
                "input_sources": ["PROFILE"],
                "output_fields": ["LIST_ID"],
                "field_mappings": [],
                "combine_sources": false,
                "field_priority": []
              },
              "destinationType": "preconfigured",
              "destinationName": "ZXDS_NEW_SFTP",
              "limitations": {
                "limit_records": null,
                "shuffle_records": false
              }
            }
          ]
        };

        const dataToLoad = transformApiDataToInternalFormat(mockData, apiSources);

        // Load the mock data into form fields
        if (dataToLoad) {
          // Load request name
          if (dataToLoad?.requestName) {
            setRequestName(dataToLoad.requestName);
          }

          // Load input sources
          if (dataToLoad?.inputSources && Array.isArray(dataToLoad.inputSources)) {
            setInputSources(dataToLoad.inputSources);
          }

          // Load input versions
          if (dataToLoad?.inputVersions && Array.isArray(dataToLoad.inputVersions)) {
            setVersionedSources(dataToLoad.inputVersions);
          }

          // Load append configurations
          if (dataToLoad?.appendConfigs && Array.isArray(dataToLoad.appendConfigs) && dataToLoad.appendConfigs.length > 0) {
            setInitialAppendConfigs(dataToLoad.appendConfigs);
          }

          // Load suppress configurations
          if (dataToLoad?.suppressConfigs && Array.isArray(dataToLoad.suppressConfigs) && dataToLoad.suppressConfigs.length > 0) {
            setInitialSuppressConfigs(dataToLoad.suppressConfigs);
          }

          // Load match configurations
          if (dataToLoad?.matchConfigs && Array.isArray(dataToLoad.matchConfigs) && dataToLoad.matchConfigs.length > 0) {
            setInitialMatchConfigs(dataToLoad.matchConfigs);
          }

          // Load output configurations
          if (dataToLoad?.outputConfigs && Array.isArray(dataToLoad.outputConfigs) && dataToLoad.outputConfigs.length > 0) {
            setInitialOutputConfigs(dataToLoad.outputConfigs);
          }

          // Load stats configurations
          if (dataToLoad?.statsConfigs && Array.isArray(dataToLoad.statsConfigs) && dataToLoad.statsConfigs.length > 0) {
            setStatsConfigurations(dataToLoad.statsConfigs);
          }

          // Load schedule configuration
          if (dataToLoad?.scheduleConfig) {
            const schedConfig = dataToLoad.scheduleConfig;
            setScheduleType(schedConfig?.scheduleType || 'adhoc');
            setScheduledDateTime(schedConfig?.scheduledDateTime || '');
            setNotificationWhen(schedConfig?.emailNotification || 'standard');
            if (schedConfig?.notificationEmails && Array.isArray(schedConfig.notificationEmails) && schedConfig.notificationEmails.length > 0) {
              setRecipientEmail(schedConfig.notificationEmails.join(', ') || '');
            }
          }

          // Clear validation errors
          setRequestNameError('');
          setRecipientEmailError('');
          setScheduledDateTimeError('');
        }
      } finally {
        setEditRequestLoading(false);
      }
    };

    loadEditRequest();
  }, [requestId, sourcesLoading, apiSources]);

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

  // Handlers for shared custom sources - with module tracking
  const handleAddSharedCustomSource = (source: InputSource, createdByModuleId: string) => {
    const newSource = {
      ...source,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdByModuleId // Track which module created this source
    };
    setSharedCustomSources(prev => [...prev, newSource]);
  };

  const handleEditSharedCustomSource = (source: InputSource) => {
    setSharedCustomSources(prev =>
      prev.map(s => s.id === source.id ? { ...source, createdByModuleId: s.createdByModuleId } : s)
    );
  };

  const handleDeleteSharedCustomSource = (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom source?')) {
      setSharedCustomSources(prev => prev.filter(s => s.id !== id));
    }
  };

  // Filter custom sources based on module execution order
  const getAvailableCustomSourcesForModule = (currentModuleId: string): InputSource[] => {
    // Get the index of the current module in the modules array
    const currentModuleIndex = modules.findIndex(module => module.id === currentModuleId);

    if (currentModuleIndex === -1) return [];

    // Return only custom sources created in or before this module
    return sharedCustomSources.filter(source => {
      if (!source.createdByModuleId) return true; // Legacy sources without tracking

      const sourceModuleIndex = modules.findIndex(module => module.id === source.createdByModuleId);

      // Source is available if it was created in this module or any previous module
      return sourceModuleIndex !== -1 && sourceModuleIndex <= currentModuleIndex;
    });
  };


  // Helper to get source name by ID
  const getSourceNameById = (sourceId: string): string => {
    // Check in regular input sources
    const inputSource = inputSources.find(s => s?.id === sourceId);
    if (inputSource) return inputSource?.sourceName;

    // Check in versioned sources
    const versionedSource = versionedSources.find(s => s?.id === sourceId);
    if (versionedSource) return versionedSource?.sourceName;

    // Check in preconfigured sources (append, match, suppress)
    // Preconfigured sources have IDs like "append_123", "match_456", "suppress_789"
    if (sourceId.startsWith('append_') || sourceId.startsWith('match_') || sourceId.startsWith('suppress_')) {
      const module = sourceId.split('_')[0] as 'append' | 'match' | 'suppress';
      const tableIdStr = sourceId.substring(module.length + 1);

      // Try to parse as numeric ID first (real API IDs)
      const tableId = parseInt(tableIdStr, 10);
      if (!isNaN(tableId)) {
        // Look up in API sources
        let preconfiguredTables: any[] = [];
        if (module === 'append' && apiSources?.dbSource?.preconfiguredTables?.append) {
          preconfiguredTables = apiSources.dbSource.preconfiguredTables.append;
        } else if (module === 'match' && apiSources?.dbSource?.preconfiguredTables?.match) {
          preconfiguredTables = apiSources.dbSource.preconfiguredTables.match;
        } else if (module === 'suppress' && apiSources?.dbSource?.preconfiguredTables?.suppress) {
          preconfiguredTables = apiSources.dbSource.preconfiguredTables.suppress;
        }

        const table = preconfiguredTables.find((t: any) => t?.tableId === tableId);
        if (table?.tableName) {
          return table.tableName;
        }
      }

      // If not numeric or not found, it might be a fallback ID generated from the source name
      // Return the ID itself which serves as the display name
      return sourceId;
    }

    // Fallback to returning the ID itself
    return sourceId;
  };

  // Handler to create versioned source from Match/Append/Suppress modules
  const handleCreateVersionedSource = (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    moduleId: string,
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[],
    fieldMappings?: any[]
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

    // Helper function to get fields for a specific source from field mappings or operationFields
    const getFieldsForSourceInVersion = (sourceId: string): string[] => {
      const fieldsSet = new Set<string>();

      // First, check field mappings (if using Field Mapping dialog)
      if (fieldMappings && fieldMappings.length > 0) {
        fieldMappings.forEach(mapping => {
          mapping.selectedColumns.forEach((col: string) => {
            const [colSourceId, fieldName] = col.split('::');
            if (colSourceId === sourceId) {
              fieldsSet.add(fieldName);
            }
          });
        });
      }

      // If no field mappings, use operationFields and match against source headers
      if (fieldsSet.size === 0 && operationFields && operationFields.length > 0) {
        // Get the source to check its headers
        const source = allAvailableInputSources.find(s => s.id === sourceId);

        // Check if it's a custom source
        const customSource = sharedCustomSources.find(s => s.id === sourceId);

        // Check if it's a preconfigured source
        let preconfiguredSource = null;
        if (sourceId.startsWith('append_')) {
          preconfiguredSource = apiSources?.dbSource?.preconfiguredTables?.append?.find(
            (table: any) => `append_${table?.tableId}` === sourceId
          );
        } else if (sourceId.startsWith('match_')) {
          preconfiguredSource = apiSources?.dbSource?.preconfiguredTables?.match?.find(
            (table: any) => `match_${table?.tableId}` === sourceId
          );
        } else if (sourceId.startsWith('suppress_')) {
          preconfiguredSource = apiSources?.dbSource?.preconfiguredTables?.suppress?.find(
            (table: any) => `suppress_${table?.tableId}` === sourceId
          );
        }

        // Get headers from the appropriate source
        let rawHeaders = source?.headers || customSource?.headers || preconfiguredSource?.columns || [];

        // Normalize headers to strings (they might be objects with columnName property)
        const sourceHeaders = rawHeaders.map((h: any) => {
          if (typeof h === 'string') return h;
          if (h && typeof h === 'object' && h.columnName) return h.columnName;
          if (h && typeof h === 'object' && h.name) return h.name;
          return String(h);
        }).filter(Boolean);

        console.log(`    🔎 Version field lookup for sourceId: ${sourceId}`);
        console.log(`      - raw headers:`, rawHeaders);
        console.log(`      - normalized sourceHeaders:`, sourceHeaders);
        console.log(`      - operationFields to match:`, operationFields);

        // Add fields from operationFields that exist in this source's headers (case-insensitive)
        operationFields.forEach(field => {
          const fieldLower = field.toLowerCase();
          const matchingHeader = sourceHeaders.find((h: string) => h.toLowerCase() === fieldLower);
          if (matchingHeader) {
            fieldsSet.add(matchingHeader); // Use the original casing from the source
            console.log(`      ✓ Matched field "${field}" to header "${matchingHeader}"`);
          } else {
            console.log(`      ✗ No match for field "${field}" in sourceHeaders`);
          }
        });
      }

      return Array.from(fieldsSet);
    };

    // Generate one version per input source (with all operation sources grouped together)
    const newVersions: VersionedSource[] = [];

    // For each input source, create ONE version with ALL operation sources
    baseInputSources.forEach((inputSourceId, inputIndex) => {
      const inputSource = allAvailableInputSources.find(s => s.id === inputSourceId);
      if (!inputSource) return;

      // Build the list of all operation sources with their details
      const operationSourcesList: Array<{
        source_type: string;
        source_name: string;
        priority: number;
        fields: string[];
      }> = [];

      operationSources.forEach((operationSourceId, opIndex) => {
        const operationSourceName = getSourceNameById(operationSourceId);

        // Get fields specific to this operation source
        const fieldsForThisSource = getFieldsForSourceInVersion(operationSourceId);

        // Determine source_type for the operation source
        let sourceType = 'preconfigured';

        // Check if it's a custom source (Self)
        const customSource = sharedCustomSources.find(s => s.id === operationSourceId);
        if (customSource?.sourceType === 'Self') {
          sourceType = sourceModule === 'Append' ? 'self_append' :
                       sourceModule === 'Match' ? 'self_match' : 'self_suppress';
        }

        operationSourcesList.push({
          source_type: sourceType,
          source_name: operationSourceName,
          priority: opIndex + 1,  // Sequential priority
          fields: fieldsForThisSource
        });
      });

      // Build version name with all operation source names
      const moduleVersionCount = versionCounters[sourceModule] + inputIndex + 1;
      const operationSourceNames = operationSources.map(id => getSourceNameById(id)).join('_');

      let versionName: string;
      if (inputSource.isVersioned) {
        // Input is already versioned, append the operation module
        versionName = `${inputSource.sourceName}_${sourceModule}_v${moduleVersionCount}`;
      } else {
        // Input is a regular source, include operation sources in name
        versionName = `${sourceModule}_${inputSource.sourceName}_${operationSourceNames}_v${moduleVersionCount}`;
      }

      // Get headers from input source
      const combinedHeaders = inputSource.headers || [];

      // Determine stepOrder based on module
      const stepOrder = modules.findIndex(m => m.id === moduleId.split('_')[0]) + 1;

      // Build append_sources/match_sources/suppress_sources based on module
      const operationSourcesKey = sourceModule === 'Append' ? 'append_sources' :
                                   sourceModule === 'Match' ? 'match_sources' : 'suppress_sources';

      // Build configJson for the workflow
      const configJson: any = {
        input_sources: [{
          source_name: inputSource.sourceName,
          columns: combinedHeaders
        }],
        field_mappings: fieldMappings ? fieldMappings.map(mapping => ({
          field_name: mapping.fieldName,
          source_mappings: mapping.selectedColumns.map((col: string) => {
            const [sourceId, fieldName] = col.split('::');
            const source = allAvailableInputSources.find(s => s.id === sourceId);
            const sourceName = source?.sourceName || sourceId;
            return `${sourceName}.${fieldName}`;
          }).join('|')
        })) : []
      };

      // Add ALL operation sources to this version
      configJson[operationSourcesKey] = operationSourcesList;

      // For Append versions, add is_self_append flag (true if ANY operation source is self)
      if (sourceModule === 'Append') {
        const hasSelfAppend = operationSourcesList.some(src => src.source_type === 'self_append');
        configJson.is_self_append = hasSelfAppend;
        configJson.match_keys = operationFields || [];
      }

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
        operationSources: operationSources,  // All operation sources
        operationFields,
        combinedHeaders,
        sourceType: 'Self',
        subSourceType: 'Versioned',
        headers: combinedHeaders,
        fieldMappings: fieldMappings || undefined,
        // Workflow properties for payload
        stepOrder,
        actionType: sourceModule === 'Match' ? 'M' : sourceModule === 'Append' ? 'A' : 'S',
        saveAsVersion: 1,
        versionName,
        internalStepOrder: newVersions.length + 1,
        configJson,
      } as any;

      newVersions.push(versionedSource);
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
  // Memoize to prevent infinite re-renders
  const allAvailableInputSources = useMemo<InputSource[]>(
    () => [...inputSources, ...versionedSources],
    [inputSources, versionedSources]
  );

  // Memoize stats module calculations to prevent infinite loops
  const availableStatsHeaders = useMemo(() => {
    const uniqueHeaders = new Set<string>();

    selectedInputSources.forEach(sourceName => {
      const source = allAvailableInputSources.find(s => s.sourceName === sourceName);
      if (source) {
        const headersToUse = source.selectedHeaders || source.headers || [];
        headersToUse.forEach(header => uniqueHeaders.add(header));
      }
    });

    return Array.from(uniqueHeaders).sort();
  }, [selectedInputSources, allAvailableInputSources]);

  const filteredStatsInputSources = useMemo(() =>
    allAvailableInputSources.filter(source =>
      source?.sourceName?.toLowerCase().includes(statsInputSourcesSearch.toLowerCase())
    ),
    [allAvailableInputSources, statsInputSourcesSearch]
  );

  const filteredStatsCountsOn = useMemo(() =>
    availableStatsHeaders.filter(field =>
      field.toLowerCase().includes(statsCountsOnSearch.toLowerCase())
    ),
    [availableStatsHeaders, statsCountsOnSearch]
  );

  const filteredStatsBreakdownBy = useMemo(() =>
    availableStatsHeaders.filter(field =>
      field.toLowerCase().includes(statsBreakdownBySearch.toLowerCase())
    ),
    [availableStatsHeaders, statsBreakdownBySearch]
  );

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

  // Helper to transform a single File source to API format (same logic as SourceConfigDialog)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformFileSourceToAPI = (source: any) => {
    const headers = source.headers || [];
    const selectedHeaders = source.selectedHeaders || source.headers || [];

    // Determine columnSelectionType: "A" if all headers selected, "S" if subset
    const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

    // Determine inputType: "P" for preconfigured (has fileSourceId), "M" for manual
    const inputType = source.fileSourceId ? 'I' : 'M';

    // Get file format from extension
    const getFileFormat = (fileName: string) => {
      if (!fileName) return 'CSV';
      const extension = fileName.split('.').pop()?.toUpperCase();
      return extension || 'CSV';
    };

    // Extract filters from filterConfig if filterQuery is empty but filterConfig exists
    let filters = source.filterQuery || '';

    if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
      try {
        const filterGroup = source?.filterConfig[0];
        if (filterGroup && filterGroup?.conditions && Array.isArray(filterGroup?.conditions)) {
          const filterParts: string[] = [];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            filters = filterParts.join(` ${logicalOp} `);
            console.log('🔄 Extracted filters from filterConfig for File source:', filters);
          }
        }
      } catch (error) {
        console.error('Error extracting filter from filterConfig for File source:', error);
      }
    }

    return {
      sourceName: source.sourceName,
      sourceType: 'F', // File -> "F"
      dataSourceId: source.fileSourceId || null,
      filePath: source.fileName || source.filePath || '',
      delimiter: source.delimiter || ',',
      fileFormat: getFileFormat(source.fileName),
      isHeader: source.hasHeader ? 1 : 0,
      columnSelectionType: columnSelectionType,
      columns: headers,
      selectedColumns: selectedHeaders.join(','), // Send as-is (custom names if custom headers exist)
      inputType: inputType,
      filters: filters,
      customHeaders: source.customHeaders || '',
      filterConfig: source.filterConfig || null,
      subSourceType: source.subSourceType
    };
  };

  // Transform input sources to the required API format (only File and Database sources)
  const transformInputSourcesToAPIFormat = (sources: InputSource[]) => {
    console.log('🔄 transformInputSourcesToAPIFormat called with:', {
      'total sources': sources.length,
      'source types': sources.map(s => s?.sourceType)
    });

    // Filter to only include File and Database sources
    // Handle both UI format ('File', 'Database') and API format ('F', 'T')
    const fileAndDatabaseSources = sources.filter(source => {
      const sourceType = source?.sourceType as any;
      return sourceType === 'File' || sourceType === 'Database' ||
             sourceType === 'F' || sourceType === 'T';
    });

    console.log('✅ After filtering:', {
      'fileAndDatabaseSources count': fileAndDatabaseSources.length,
      'filtered sources': fileAndDatabaseSources.map(s => ({
        sourceName: s?.sourceName,
        sourceType: s?.sourceType
      }))
    });

    return fileAndDatabaseSources.map((source, index) => {
      // Check if source is already in API format (sourceType is 'F' or 'T' instead of 'File' or 'Database')
      const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

      if (isAlreadyAPIFormat) {
        console.log('✅ Source already in API format:', source?.sourceName);

        // Extract filters from filterConfig if filters is empty but filterConfig exists
        let filters = (source as any)?.filters || '';

        if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
          try {
            const filterGroup = source?.filterConfig[0];
            if (filterGroup && filterGroup?.conditions && Array.isArray(filterGroup?.conditions)) {
              const filterParts: string[] = [];

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                filters = filterParts.join(` ${logicalOp} `);
                console.log('🔄 Extracted filters from filterConfig:', filters);
              }
            }
          } catch (error) {
            console.error('Error extracting filter from filterConfig:', error);
          }
        }

        // Return source with extracted filters
        return {
          ...source,
          filters: filters
        };
      }

      // Handle File sources - transform from UI format to API format
      // Note: Sources are now stored in UI format with headers/selectedHeaders arrays
      // This transformation happens only during submission
      if (source?.sourceType === 'File') {
        console.log('🔄 Transforming File source from UI to API format:', source?.sourceName, {
          hasHeaders: !!source?.headers,
          headersCount: source?.headers?.length || 0,
          hasSelectedHeaders: !!source?.selectedHeaders,
          selectedHeadersCount: source?.selectedHeaders?.length || 0
        });
        return transformFileSourceToAPI(source);
      }

      // Handle Database sources
      if (source?.sourceType === 'Database') {
        console.log('🔄 Transforming Database source:', source?.sourceName);
        const selectedHeaders = source?.selectedHeaders || source?.headers || [];
        const headers = source?.headers || [];
        const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

        // Get filters - check filterQuery and extract from filterConfig if needed
        let filters = source?.filterQuery || '';

        // If filterQuery is empty but filterConfig exists, try to extract filter from config
        if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
          try {
            const filterGroup = source?.filterConfig[0];
            if (filterGroup && filterGroup?.conditions && Array.isArray(filterGroup?.conditions)) {
              const filterParts: string[] = [];

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                filters = filterParts.join(` ${logicalOp} `);
              }
            }
          } catch (error) {
            console.error('Error extracting filter from filterConfig:', error);
          }
        }

        // Try different possible property names for database fields
        const dbName = source?.database || source?.customTableMetadata?.database || '';
        const tableName = source?.table || source?.customTableMetadata?.tableName || '';
        const schema = source?.schema || source?.customTableMetadata?.schema || '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = {
          sourceName: source?.sourceName || 'Unknown Source',
          sourceType: 'T', // Database -> "T"
          columnSelectionType: columnSelectionType,
          columns: headers,
          selectedColumns: selectedHeaders.join(','),
          inputType: 'I', // Primary for database sources
          filters,
          isCustomTable: (!source?.originalTableName || source?.customTableMetadata) ? 1 : 0
        };

        // Only include database fields if they have values
        if (dbName) result.dbName = dbName;
        if (tableName) result.tableName = tableName;
        if (schema) result.schema = schema;

        // Include sourceOption (tableId) for preconfigured tables
        if (source?.tableSourceId) {
          result.sourceOption = source.tableSourceId;
        }

        return result;
      }

      // Fallback (should not reach here due to filter)
      return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  };

  const handleCancel = () => {
    navigate('/dataPullReports');
  };

  // Transform module configurations into workflow array
  const transformToWorkflowArray = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workflowArray: any[] = [];

    // Helper function to get stepOrder based on module position in modules array
    const getStepOrder = (moduleId: string): number => {
      const moduleIndex = modules.findIndex(m => m.id === moduleId);
      return moduleIndex !== -1 ? moduleIndex + 1 : 0; // 1-based index
    };

    // Helper to find source by ID and get its source_name
    const getSourceName = (sourceId: string): string => {
      const source = allAvailableInputSources.find(s => s?.id === sourceId);
      return source?.sourceName || '';
    };

    // Helper to get columns for a source
    const getSourceColumns = (sourceId: string): string[] => {
      const source = allAvailableInputSources.find(s => s?.id === sourceId);
      if (!source) return [];
      // Return selected headers if available, otherwise all headers
      return source?.selectedHeaders || source?.headers || [];
    };

    // Transform Append Configurations
    appendConfigurations.forEach((config, index) => {
      const stepOrder = getStepOrder('panel2') - 1; // Subtract 1 to start from 1

      const configJson = {
        input_sources: (config?.inputSources || []).map((sourceId: string) => ({
          source_id: getSourceName(sourceId),
          columns: getSourceColumns(sourceId)
        })),
        match_keys: config?.appendOnFields || [],
        is_self_append: false,
        append_sources: (config?.appendSources || []).map((sourceId: string, priority: number) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sourceObj: any = {
            source_id: getSourceName(sourceId),
            priority: priority + 1
          };

          // Get fields for this append source
          if (config?.appendFields && config.appendFields.length > 0) {
            sourceObj.fields = config.appendFields;
          }

          return sourceObj;
        })
      };

      workflowArray.push({
        stepOrder,
        internalStepOrder: index + 1,
        actionType: 'A',
        configJson,
        saveAsVersion: 0, // TODO: Add versioning support
        versionName: '' // TODO: Add version name if applicable
      });
    });

    // Transform Match Configurations
    matchConfigurations.forEach((config, index) => {
      const stepOrder = getStepOrder('panel4') - 1; // Subtract 1 to start from 1

      const configJson = {
        input_sources: (config?.inputSources || []).map((sourceId: string) => ({
          source_id: getSourceName(sourceId),
          columns: getSourceColumns(sourceId)
        })),
        match_on_fields: config?.matchOnFields || [],
        match_sources: (config?.matchSources || []).map((sourceId: string) =>
          getSourceName(sourceId)
        ),
        expand: config?.expand || false,
        match_type: config?.matchType || 'full',
        ...(config?.addFields && config.addFields.length > 0 && {
          add_fields: config.addFields
        })
      };

      workflowArray.push({
        stepOrder,
        internalStepOrder: index + 1,
        actionType: 'M',
        configJson,
        saveAsVersion: 0, // TODO: Add versioning support
        versionName: '' // TODO: Add version name if applicable
      });
    });

    // Transform Suppress Configurations
    suppressConfigurations.forEach((config, index) => {
      const stepOrder = getStepOrder('panel3') - 1; // Subtract 1 to start from 1

      const configJson = {
        input_sources: (config?.inputSources || []).map((sourceId: string) => ({
          source_id: getSourceName(sourceId),
          columns: getSourceColumns(sourceId)
        })),
        suppress_on_fields: config?.suppressOnFields || [],
        suppress_sources: (config?.suppressSources || []).map((sourceId: string) =>
          getSourceName(sourceId)
        )
      };

      workflowArray.push({
        stepOrder,
        internalStepOrder: index + 1,
        actionType: 'S',
        configJson,
        saveAsVersion: 0, // TODO: Add versioning support
        versionName: '' // TODO: Add version name if applicable
      });
    });

    // Sort by stepOrder, then by internalStepOrder
    workflowArray.sort((a, b) => {
      if (a.stepOrder !== b.stepOrder) {
        return a.stepOrder - b.stepOrder;
      }
      return a.internalStepOrder - b.internalStepOrder;
    });

    return workflowArray;
  };

  const handleSave = async () => {
    // Clear previous messages
    setSaveSuccess('');
    setSaveError('');
     setRecipientEmailError(''); 
    setScheduledDateTimeError('');

    // Validate all fields before saving
    const nameError = validateRequestName(requestName);

    setRequestNameError(nameError || '');

    if (nameError) {
      return;
    }

      // Validate recipientEmail                                                                              
        if (!recipientEmail || !recipientEmail.trim()) {                                                        
          setRecipientEmailError('Please enter recipient email');                                               
           return;                                                                                               
        } 

    // Validate scheduledDateTime when scheduleType is 'scheduled_at'
    if (scheduleType === 'scheduled_at' && (!scheduledDateTime || !scheduledDateTime.trim())) {
      setScheduledDateTimeError('Please select scheduled date & time');
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // Debug: Check raw input sources before transformation
      console.log('🔍 DEBUG - Raw Input Sources:', {
        'inputSources count': inputSources.length,
        'inputSources': inputSources,
        'inputSources details': inputSources.map(s => ({
          id: s?.id,
          sourceName: s?.sourceName,
          sourceType: s?.sourceType,
          hasHeaders: !!(s?.headers),
          hasSelectedHeaders: !!(s?.selectedHeaders)
        }))
      });

      // Transform input sources to API format (only File and Database sources)
      const transformedInputSources = transformInputSourcesToAPIFormat(inputSources);

      console.log('📦 Transformed Input Sources:', JSON.stringify(transformedInputSources, null, 2));

      // Helper: Get selected fields for an append source from append configurations
      const getSelectedFieldsForAppendSource = (sourceId: string): string[] => {
        const fieldsSet = new Set<string>();

        appendConfigurations.forEach(config => {
          // Check if this configuration uses this append source
          if (config.appendSources && config.appendSources.includes(sourceId)) {
            // Add the selected append fields from this configuration
            if (config.appendFields && config.appendFields.length > 0) {
              config.appendFields.forEach(field => fieldsSet.add(field));
            }
          }
        });

        return Array.from(fieldsSet);
      };

      // Transform append sources to API format with inputType: 'A'
      const transformedAppendSources = sharedCustomSources
        .filter(source => {
          // Filter by source type AND module that created it
          const sourceType = source?.sourceType as any;
          const isFileOrDatabaseOrSelf = sourceType === 'File' || sourceType === 'Database' || sourceType === 'Self' ||
                                    sourceType === 'F' || sourceType === 'T';

          // Check if source was created by Append module (panel2)
          const createdByAppend = source.createdByModuleId &&
                                 (source.createdByModuleId === 'panel2' ||
                                  source.createdByModuleId.startsWith('panel2_'));

          return isFileOrDatabaseOrSelf && createdByAppend;
        })
        .map((source) => {
          console.log('🔍 DEBUG - Append source before transformation:', {
            sourceName: source?.sourceName,
            sourceType: source?.sourceType,
            headers: source?.headers,
            selectedHeaders: source?.selectedHeaders,
            hasSelectedHeaders: !!source?.selectedHeaders
          });

          // Get selected fields from append configurations
          const configSelectedFields = getSelectedFieldsForAppendSource(source.id);

          console.log('📋 Selected fields from append configurations:', {
            sourceName: source?.sourceName,
            sourceId: source.id,
            configSelectedFields
          });

          // Check if source is already in API format
          const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

          if (isAlreadyAPIFormat) {
            // Return source with inputType: 'A'
            return {
              ...source,
              inputType: 'A'
            };
          }

          // Transform File sources
          if (source?.sourceType === 'File') {
            // Get headers
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available, otherwise use source's selectedHeaders or all headers
            let selectedHeaders: string[];
            if (configSelectedFields.length > 0) {
              // Filter to only include fields that exist in headers
              selectedHeaders = configSelectedFields.filter(field => headers.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            console.log('📊 File source transformation:', {
              sourceName: source?.sourceName,
              totalHeaders: headers.length,
              selectedHeadersCount: selectedHeaders.length,
              selectedHeaders,
              willBeAllSelected: selectedHeaders.length === headers.length
            });

            const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return 'CSV';
              const extension = fileName.split('.').pop()?.toUpperCase();
              return extension || 'CSV';
            };

            const inputType = source.fileSourceId ? 'I' : 'M';

            // Extract filters from filterConfig if filterQuery is empty
            let filters = source.filterQuery || '';
            if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
              try {
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
                    filters = filterParts.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                console.error('Error extracting filter from filterConfig for Append File source:', error);
              }
            }

            return {
              sourceName: source.sourceName,
              sourceType: 'F',
              dataSourceId: source.fileSourceId || null,
              filePath: source.fileName || source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || ''),
              isHeader: source.hasHeader ? 1 : 0,
              columnSelectionType: columnSelectionType,
              columns: headers,
              selectedColumns: selectedHeaders.join(','),
              inputType: 'A', // Append sources have inputType: 'A'
              filters: filters,
              customHeaders: source.customHeaders || '',
              filterConfig: source.filterConfig || null,
              subSourceType: source.subSourceType
            };
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available, otherwise use source's selectedHeaders or all headers
            let selectedHeaders: string[];
            if (configSelectedFields.length > 0) {
              // Filter to only include fields that exist in headers
              selectedHeaders = configSelectedFields.filter(field => headers.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            console.log('📊 Database source transformation:', {
              sourceName: source?.sourceName,
              totalHeaders: headers.length,
              selectedHeadersCount: selectedHeaders.length,
              selectedHeaders,
              willBeAllSelected: selectedHeaders.length === headers.length
            });

            const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

            // Get database metadata
            const dbName = source?.customTableMetadata?.database || source?.database || '';
            const tableName = source?.customTableMetadata?.tableName || source?.table || '';
            const schema = source?.customTableMetadata?.schema || source?.schema || '';

            // Get filters
            let filters = source?.filterQuery || '';
            if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
              try {
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
                    filters = filterParts.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                console.error('Error extracting filter from filterConfig:', error);
              }
            }

            const result: any = {
              sourceName: source?.sourceName || 'Unknown Source',
              sourceType: 'T', // Database -> "T"
              columnSelectionType: columnSelectionType,
              columns: headers,
              selectedColumns: selectedHeaders.join(','),
              inputType: 'A', // Append sources have inputType: 'A'
              filters,
              isCustomTable: (!source?.originalTableName || source?.customTableMetadata) ? 1 : 0
            };

            if (dbName) result.dbName = dbName;
            if (tableName) result.tableName = tableName;
            if (schema) result.schema = schema;

            return result;
          }

          // Transform Self sources
          if (source?.sourceType === 'Self') {
            const selfSource = source as any;
            console.log('📊 Self source transformation:', {
              sourceName: selfSource?.sourceName,
              selfConfig: selfSource?.selfConfig,
              input_source_names: selfSource?.selfConfig?.input_source_names
            });

            // Get assignment_sets and tiering_on directly from selfConfig
            const assignmentSets = selfSource?.selfConfig?.assignment_sets || [];
            const tieringOn = selfSource?.selfConfig?.tiering_on || null;

            const result = {
              sourceName: selfSource?.sourceName || 'Self_Source',
              sourceType: 'F',
              dataSourceId: null,
              filePath: null,
              delimiter: null,
              fileFormat: null,
              isHeader: null,
              columnSelectionType: null,
              columns: null,
              selectedColumns: null,
              inputType: 'A',
              filters: null,
              isSelfSource: 1,
              selfConfig: {
                input_source_names: selfSource?.selfConfig?.input_source_names || [],
                generated_column: selfSource?.selfConfig?.generated_column || '',
                generated_datatype: selfSource?.selfConfig?.generated_datatype || 'STRING',
                assignment_sets: assignmentSets,
                tiering_on: tieringOn
              }
            };

            console.log('✅ Transformed Self source:', result);
            return result;
          }

          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      console.log('\n======================');
      console.log('📦 APPEND SOURCES TRANSFORMED');
      console.log('======================');
      console.log('📊 Total Append Sources:', transformedAppendSources.length);
      if (transformedAppendSources.length > 0) {
        transformedAppendSources.forEach((source, index) => {
          console.log(`  ${index + 1}. ${source.sourceName} (Type: ${source.sourceType}, InputType: ${source.inputType})`);
        });
        console.log('🔍 Full Append Sources:', JSON.stringify(transformedAppendSources, null, 2));
      } else {
        console.log('ℹ️ No append sources to include');
      }
      console.log('======================\n');

      // Helper: Get selected fields for a match source from match configurations
      const getSelectedFieldsForMatchSource = (sourceId: string): string[] => {
        const fieldsSet = new Set<string>();

        matchConfigurations.forEach(config => {
          // Check if this configuration uses this match source
          if (config.matchSources && config.matchSources.includes(sourceId)) {
            // Add fields from the match configuration
            if (config.addFields && config.addFields.length > 0) {
              config.addFields.forEach(field => fieldsSet.add(field));
            }
          }
        });

        return Array.from(fieldsSet);
      };

      // Helper: Get selected fields for a suppress source from suppress configurations
      const getSelectedFieldsForSuppressSource = (sourceId: string): string[] => {
        const fieldsSet = new Set<string>();

        suppressConfigurations.forEach(config => {
          // Check if this configuration uses this suppress source
          if (config.suppressSources && config.suppressSources.includes(sourceId)) {
            // Add fields from the suppress configuration
            if (config.suppressOnFields && config.suppressOnFields.length > 0) {
              config.suppressOnFields.forEach(field => fieldsSet.add(field));
            }
          }
        });

        return Array.from(fieldsSet);
      };

      // Transform match sources to API format with inputType: 'M'
      const transformedMatchSources = sharedCustomSources
        .filter(source => {
          // Filter by source type AND module that created it
          const sourceType = source?.sourceType as any;
          const isFileOrDatabase = sourceType === 'File' || sourceType === 'Database' ||
                                    sourceType === 'F' || sourceType === 'T';

          // Check if source was created by Match module (panel4)
          const createdByMatch = source.createdByModuleId &&
                                 (source.createdByModuleId === 'panel4' ||
                                  source.createdByModuleId.startsWith('panel4_'));

          return isFileOrDatabase && createdByMatch;
        })
        .map((source) => {
          console.log('🔍 DEBUG - Match source before transformation:', {
            sourceName: source?.sourceName,
            sourceType: source?.sourceType,
            headers: source?.headers,
            selectedHeaders: source?.selectedHeaders,
            hasSelectedHeaders: !!source?.selectedHeaders
          });

          // Get selected fields from match configurations
          const configSelectedFields = getSelectedFieldsForMatchSource(source.id);

          console.log('📋 Selected fields from match configurations:', {
            sourceName: source?.sourceName,
            sourceId: source.id,
            configSelectedFields
          });

          // Check if source is already in API format
          const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

          if (isAlreadyAPIFormat) {
            // Return source with inputType: 'M'
            return {
              ...source,
              inputType: 'M'
            };
          }

          // Transform File sources
          if (source?.sourceType === 'File') {
            // Get headers
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available
            let selectedHeaders: string[];
            if (configSelectedFields.length > 0) {
              selectedHeaders = configSelectedFields.filter(field => headers.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            console.log('📊 Match File source transformation:', {
              sourceName: source?.sourceName,
              totalHeaders: headers.length,
              selectedHeadersCount: selectedHeaders.length,
              selectedHeaders,
              willBeAllSelected: selectedHeaders.length === headers.length
            });

            const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return 'CSV';
              const extension = fileName.split('.').pop()?.toUpperCase();
              return extension || 'CSV';
            };

            // Extract filters from filterConfig if filterQuery is empty
            let filters = source.filterQuery || '';
            if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
              try {
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
                    filters = filterParts.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                console.error('Error extracting filter from filterConfig for Match File source:', error);
              }
            }

            return {
              sourceName: source.sourceName,
              sourceType: 'F',
              dataSourceId: source.fileSourceId || null,
              filePath: source.fileName || source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || ''),
              isHeader: source.hasHeader ? 1 : 0,
              columnSelectionType: columnSelectionType,
              columns: headers,
              selectedColumns: selectedHeaders.join(','),
              inputType: 'M', // Match sources have inputType: 'M'
              filters: filters,
              customHeaders: source.customHeaders || '',
              filterConfig: source.filterConfig || null,
              subSourceType: source.subSourceType
            };
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available
            let selectedHeaders: string[];
            if (configSelectedFields.length > 0) {
              selectedHeaders = configSelectedFields.filter(field => headers.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            console.log('📊 Match Database source transformation:', {
              sourceName: source?.sourceName,
              totalHeaders: headers.length,
              selectedHeadersCount: selectedHeaders.length,
              selectedHeaders,
              willBeAllSelected: selectedHeaders.length === headers.length
            });

            const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

            // Get database metadata
            const dbName = source?.customTableMetadata?.database || source?.database || '';
            const tableName = source?.customTableMetadata?.tableName || source?.table || '';
            const schema = source?.customTableMetadata?.schema || source?.schema || '';

            // Get filters
            let filters = source?.filterQuery || '';
            if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
              try {
                const filterGroup = source?.filterConfig[0];
                if (filterGroup && filterGroup?.rules) {
                  filters = filterGroup?.rules
                    ?.map((rule: any) => {
                      const field = rule?.field || '';
                      const operator = rule?.operator || '=';
                      const value = rule?.value || '';
                      return `${field} ${operator} ${value}`;
                    })
                    ?.join(' AND ');
                }
              } catch (e) {
                console.warn('Failed to parse filter config:', e);
              }
            }

            return {
              sourceName: source.sourceName,
              sourceType: 'T',
              inputType: 'M', // Match sources have inputType: 'M'
              dbName: dbName,
              schema: schema,
              tableName: tableName,
              columns: headers,
              selectedColumns: selectedHeaders.join(','),
              columnSelectionType: columnSelectionType,
              isCustomTable: 1,
              filters: filters
            };
          }

          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      console.log('\n======================');
      console.log('🎯 MATCH SOURCES TRANSFORMED');
      console.log('======================');
      console.log('📊 Total Match Sources:', transformedMatchSources.length);
      if (transformedMatchSources.length > 0) {
        transformedMatchSources.forEach((source, index) => {
          console.log(`  ${index + 1}. ${source.sourceName} (Type: ${source.sourceType}, InputType: ${source.inputType})`);
        });
        console.log('🔍 Full Match Sources:', JSON.stringify(transformedMatchSources, null, 2));
      } else {
        console.log('ℹ️ No match sources to include');
      }
      console.log('======================\n');

      // Transform suppress sources to API format with inputType: 'S'
      const transformedSuppressSources = sharedCustomSources
        .filter(source => {
          // Filter by source type AND module that created it
          const sourceType = source?.sourceType as any;
          const isFileOrDatabase = sourceType === 'File' || sourceType === 'Database' ||
                                    sourceType === 'F' || sourceType === 'T';

          // Check if source was created by Suppress module (panel3)
          const createdBySuppress = source.createdByModuleId &&
                                    (source.createdByModuleId === 'panel3' ||
                                     source.createdByModuleId.startsWith('panel3_'));

          return isFileOrDatabase && createdBySuppress;
        })
        .map((source) => {
          console.log('🔍 DEBUG - Suppress source before transformation:', {
            sourceName: source?.sourceName,
            sourceType: source?.sourceType,
            headers: source?.headers,
            selectedHeaders: source?.selectedHeaders,
            hasSelectedHeaders: !!source?.selectedHeaders
          });

          // Get selected fields from suppress configurations
          const configSelectedFields = getSelectedFieldsForSuppressSource(source.id);

          console.log('📋 Selected fields from suppress configurations:', {
            sourceName: source?.sourceName,
            sourceId: source.id,
            configSelectedFields
          });

          // Check if source is already in API format
          const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

          if (isAlreadyAPIFormat) {
            // Return source with inputType: 'S'
            return {
              ...source,
              inputType: 'S'
            };
          }

          // Transform File sources
          if (source?.sourceType === 'File') {
            // Get headers
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available
            let selectedHeaders: string[];
            if (configSelectedFields.length > 0) {
              selectedHeaders = configSelectedFields.filter(field => headers.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            console.log('📊 Suppress File source transformation:', {
              sourceName: source?.sourceName,
              totalHeaders: headers.length,
              selectedHeadersCount: selectedHeaders.length,
              selectedHeaders,
              willBeAllSelected: selectedHeaders.length === headers.length
            });

            const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return 'CSV';
              const extension = fileName.split('.').pop()?.toUpperCase();
              return extension || 'CSV';
            };

            // Extract filters from filterConfig if filterQuery is empty
            let filters = source.filterQuery || '';
            if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
              try {
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
                    filters = filterParts.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                console.error('Error extracting filter from filterConfig for Suppress File source:', error);
              }
            }

            return {
              sourceName: source.sourceName,
              sourceType: 'F',
              dataSourceId: source.fileSourceId || null,
              filePath: source.fileName || source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || ''),
              isHeader: source.hasHeader ? 1 : 0,
              columnSelectionType: columnSelectionType,
              columns: headers,
              selectedColumns: selectedHeaders.join(','),
              inputType: 'S', // Suppress sources have inputType: 'S'
              filters: filters,
              customHeaders: source.customHeaders || '',
              filterConfig: source.filterConfig || null,
              subSourceType: source.subSourceType
            };
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available
            let selectedHeaders: string[];
            if (configSelectedFields.length > 0) {
              selectedHeaders = configSelectedFields.filter(field => headers.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            console.log('📊 Suppress Database source transformation:', {
              sourceName: source?.sourceName,
              totalHeaders: headers.length,
              selectedHeadersCount: selectedHeaders.length,
              selectedHeaders,
              willBeAllSelected: selectedHeaders.length === headers.length
            });

            const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

            // Get database metadata
            const dbName = source?.customTableMetadata?.database || source?.database || '';
            const tableName = source?.customTableMetadata?.tableName || source?.table || '';
            const schema = source?.customTableMetadata?.schema || source?.schema || '';

            // Get filters
            let filters = source?.filterQuery || '';
            if (!filters && source?.filterConfig && Array.isArray(source?.filterConfig) && source?.filterConfig?.length > 0) {
              try {
                const filterGroup = source?.filterConfig[0];
                if (filterGroup && filterGroup?.rules) {
                  filters = filterGroup?.rules
                    ?.map((rule: any) => {
                      const field = rule?.field || '';
                      const operator = rule?.operator || '=';
                      const value = rule?.value || '';
                      return `${field} ${operator} ${value}`;
                    })
                    ?.join(' AND ');
                }
              } catch (e) {
                console.warn('Failed to parse filter config:', e);
              }
            }

            return {
              sourceName: source.sourceName,
              sourceType: 'T',
              inputType: 'S', // Suppress sources have inputType: 'S'
              dbName: dbName,
              schema: schema,
              tableName: tableName,
              columns: headers,
              selectedColumns: selectedHeaders.join(','),
              columnSelectionType: columnSelectionType,
              isCustomTable: 1,
              filters: filters
            };
          }

          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      console.log('\n======================');
      console.log('🚫 SUPPRESS SOURCES TRANSFORMED');
      console.log('======================');
      console.log('📊 Total Suppress Sources:', transformedSuppressSources.length);
      if (transformedSuppressSources.length > 0) {
        transformedSuppressSources.forEach((source, index) => {
          console.log(`  ${index + 1}. ${source.sourceName} (Type: ${source.sourceType}, InputType: ${source.inputType})`);
        });
        console.log('🔍 Full Suppress Sources:', JSON.stringify(transformedSuppressSources, null, 2));
      } else {
        console.log('ℹ️ No suppress sources to include');
      }
      console.log('======================\n');

      // Combine all input sources: regular inputs, append sources, match sources, and suppress sources
      const allTransformedInputSources = [
        ...transformedInputSources,
        ...transformedAppendSources,
        ...transformedMatchSources,
        ...transformedSuppressSources
      ];

      console.log('\n======================');
      console.log('📦 COMBINED INPUT SOURCES');
      console.log('======================');
      console.log('📥 Regular Input Sources:', transformedInputSources.length);
      console.log('📦 Append Sources:', transformedAppendSources.length);
      console.log('🎯 Match Sources:', transformedMatchSources.length);
      console.log('🚫 Suppress Sources:', transformedSuppressSources.length);
      console.log('📊 Total Combined:', allTransformedInputSources.length);
      console.log('======================\n');

      // Transform stats data to API format using the Stats module's transformation function
      const transformedStats = transformAllStatsToAPI(statsConfigurations, allAvailableInputSources);

      // Use the transformed output data from the OutputModule
      // The transformation is now handled within the OutputModule itself
      const transformedOutput = transformedOutputData;

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

            // Get the columns for this source
            const columns = source?.selectedHeaders || source?.headers || [];

            return {
              source_id: source.sourceName,
              columns: columns
            };
          }).filter(Boolean), // Remove any null entries
          suppress_on_fields: config?.suppressOnFields || [],
          suppress_sources: (config?.suppressSources || []).map((sourceId: string) => {
            // Find the source and return its name
            const source = allAvailableInputSources.find(s => s?.id === sourceId);
            return source?.sourceName || '';
          }).filter(Boolean) // Remove any empty strings
        }));

        return suppressPayload;
      };

      // Helper function to get stepOrder based on module position in modules array
      const getStepOrder = (moduleId: string): number => {
        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        return moduleIndex !== -1 ? moduleIndex + 1 : 0; // 1-based index
      };

      // Extract regular input sources (non-versioned) for the workflow array
      const extractInputSourcesForWorkflow = () => {
        // Filter only non-versioned input sources
        const regularInputSources = inputSources.filter(source =>
          source.isVersioned !== true
        );

        console.log('🔍 Extracting regular input sources for workflow:');
        console.log('  Total input sources:', inputSources.length);
        console.log('  Regular (non-versioned) input sources:', regularInputSources.length);

        // Map them to the workflow format
        return regularInputSources.map((source, index) => {
          console.log(`  Input Source ${index + 1}:`, {
            sourceName: source.sourceName,
            sourceType: source.sourceType,
            internalStepOrder: index + 1
          });

          return {
            stepOrder: 1,
            internalStepOrder: index + 1,  // Sequential starting from 1
            actionType: 'I',
            configJson: {
              input_sources: [source.sourceName]
            }
          };
        });
      };

      // Extract input versions and format them for the workflow array
      const extractInputVersionsForWorkflow = (inputSourceCount: number) => {
        // Filter only versioned sources from Input module (exclude Append, Match, Suppress versions)
        const versionedSources = inputSources.filter(source =>
          source.isVersioned === true &&
          (!( source as any).sourceModule || (source as any).sourceModule === 'Input')
        );

        console.log('🔍 Extracting input versions for workflow:');
        console.log('  Total input sources:', inputSources.length);
        console.log('  Input module versioned sources:', versionedSources.length);
        console.log('  Input source count for offset:', inputSourceCount);

        // Map them to the workflow format
        return versionedSources.map((source, index) => {
          // Extract the version data that was stored during save
          const { stepOrder, actionType, saveAsVersion, versionName, internalStepOrder, configJson } = source as any;

          // Adjust internalStepOrder to come after all regular input sources
          const adjustedInternalStepOrder = inputSourceCount + index + 1;

          console.log(`  Version ${index + 1}:`, {
            sourceName: source.sourceName,
            versionName: versionName,
            hasConfigJson: !!configJson,
            originalInternalStepOrder: internalStepOrder || 'not set',
            adjustedInternalStepOrder
          });

          return {
            stepOrder: stepOrder || 1,
            actionType: actionType || 'P',
            saveAsVersion: saveAsVersion || 1,
            versionName: versionName || source.sourceName,
            internalStepOrder: adjustedInternalStepOrder,  // Updated to come after input sources
            configJson: configJson || {
              operation: source.versionConfig?.combineAs || 'union',
              input_sources: [],
              added_fields: [],
              field_mappings: [],
              merge_keys: source.headers || [],
              priority_order: source.headers || []
            }
          };
        });
      };

      // Helper function to get fields for a specific source from field mappings or appendFields
      const getFieldsForSource = (sourceId: string, fieldMappings?: any[], appendFields?: string[]): string[] => {
        const fieldsSet = new Set<string>();

        // First, check field mappings (if using Field Mapping dialog)
        if (fieldMappings && fieldMappings.length > 0) {
          fieldMappings.forEach(mapping => {
            // selectedColumns is in format: ["sourceId::fieldName", "sourceId::fieldName"]
            mapping.selectedColumns.forEach((col: string) => {
              const [colSourceId, fieldName] = col.split('::');
              // If this column comes from the specified source, add the field name
              if (colSourceId === sourceId) {
                fieldsSet.add(fieldName);
              }
            });
          });
        }

        // If no field mappings, use appendFields and match against source headers
        if (fieldsSet.size === 0 && appendFields && appendFields.length > 0) {
          // Get the source to check its headers
          const source = allAvailableInputSources.find(s => s.id === sourceId);

          // Check if it's a custom source
          const customSource = sharedCustomSources.find(s => s.id === sourceId);

          // Check if it's a preconfigured source
          let preconfiguredSource = null;
          if (sourceId.startsWith('append_')) {
            preconfiguredSource = apiSources?.dbSource?.preconfiguredTables?.append?.find(
              (table: any) => `append_${table?.tableId}` === sourceId
            );
          }

          // Get headers from the appropriate source
          let rawHeaders = source?.headers || customSource?.headers || preconfiguredSource?.columns || [];

          // Normalize headers to strings (they might be objects with columnName property)
          const sourceHeaders = rawHeaders.map((h: any) => {
            if (typeof h === 'string') return h;
            if (h && typeof h === 'object' && h.columnName) return h.columnName;
            if (h && typeof h === 'object' && h.name) return h.name;
            return String(h);
          }).filter(Boolean);

          console.log(`    🔎 Detailed lookup for sourceId: ${sourceId}`);
          console.log(`      - source found:`, !!source, source?.headers);
          console.log(`      - customSource found:`, !!customSource, customSource?.headers);
          console.log(`      - preconfiguredSource found:`, !!preconfiguredSource, preconfiguredSource?.columns);
          console.log(`      - raw headers:`, rawHeaders);
          console.log(`      - normalized sourceHeaders:`, sourceHeaders);
          console.log(`      - appendFields to match:`, appendFields);

          // Add fields from appendFields that exist in this source's headers (case-insensitive)
          appendFields.forEach(field => {
            const fieldLower = field.toLowerCase();
            const matchingHeader = sourceHeaders.find((h: string) => h.toLowerCase() === fieldLower);
            if (matchingHeader) {
              fieldsSet.add(matchingHeader); // Use the original casing from the source
              console.log(`      ✓ Matched field "${field}" to header "${matchingHeader}"`);
            } else {
              console.log(`      ✗ No match for field "${field}" in sourceHeaders`);
            }
          });
        }

        return Array.from(fieldsSet);
      };

      // Helper function to transform field mappings to workflow format
      const transformFieldMappings = (fieldMappings?: any[]): any[] => {
        if (!fieldMappings || fieldMappings.length === 0) {
          return [];
        }

        return fieldMappings.map(mapping => {
          // selectedColumns is in format: ["sourceId::fieldName", "sourceId::fieldName"]
          // Transform to: "SourceName.fieldName|SourceName2.fieldName2"
          const sourceMappings = mapping.selectedColumns.map((col: string) => {
            const [sourceId, fieldName] = col.split('::');
            // Find the source to get its name
            const source = allAvailableInputSources.find(s => s.id === sourceId);
            const sourceName = source?.sourceName || sourceId;
            return `${sourceName}.${fieldName}`;
          }).join('|');

          return {
            field_name: mapping.fieldName,
            source_mappings: sourceMappings
          };
        });
      };

      // Extract Append configurations and versions for workflow array
      const extractAppendConfigurationsForWorkflow = () => {
        const appendWorkflowItems: any[] = [];
        const stepOrder = getStepOrder('panel2');

        console.log('\n🔍 Extracting Append configurations for workflow:');
        console.log('  Total append configurations:', appendConfigurations.length);

        appendConfigurations.forEach((config, index) => {
          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            const source = inputSources.find(s => s.id === sourceId);
            return {
              source_name: source?.sourceName || sourceId,
              columns: source?.headers || []
            };
          });

          // Transform append sources to the required format
          // Include both input sources and append sources with appropriate source_type
          console.log('  📋 Config field mappings:', config.fieldMappings);
          console.log('  📋 Config append sources:', config.appendSources);

          const appendSourcesForConfig = (config.appendSources || [])
            .map((sourceId) => {
              // Get fields specific to this source from field mappings or appendFields
              const sourceFields = getFieldsForSource(sourceId, config.fieldMappings, config.appendFields);
              console.log(`  🔍 Source ID: ${sourceId}, Fields found:`, sourceFields);

              // First check if it's an input source
              const inputSource = allAvailableInputSources.find(s => s.id === sourceId);
              if (inputSource && !inputSource.isVersioned) {
                // Check if it's from Input module (not from Append/Match/Suppress)
                const createdByModuleId = (inputSource as any).createdByModuleId;
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleId.startsWith('panel1_')) {
                  return {
                    source_type: 'input',
                    source_name: inputSource.sourceName,
                    fields: sourceFields
                  };
                }
              }

              // Check if it's a custom append source
              const customSource = sharedCustomSources.find(s => s.id === sourceId);
              const isCustomAppendSource = customSource &&
                                          customSource.createdByModuleId &&
                                          (customSource.createdByModuleId === 'panel2' ||
                                           customSource.createdByModuleId.startsWith('panel2_'));

              // Check if it's a preconfigured append source (starts with 'append_')
              const isPreconfiguredAppend = sourceId.startsWith('append_');

              // If it's a custom append source
              if (isCustomAppendSource) {
                const isSelfAppend = customSource?.sourceType === 'Self';
                return {
                  source_type: isSelfAppend ? 'self_append' : 'preconfigured',
                  source_name: customSource.sourceName,
                  fields: sourceFields
                };
              }

              // If it's a preconfigured append source
              if (isPreconfiguredAppend) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.append?.find(
                  (table: any) => `append_${table?.tableId}` === sourceId
                );
                const sourceName = predefined ? predefined.tableName : sourceId;
                return {
                  source_type: 'preconfigured',
                  source_name: sourceName,
                  fields: sourceFields
                };
              }

              // Unknown source type
              console.log('⚠️ Unknown source type for sourceId:', sourceId);
              return null;
            })
            .filter(Boolean) // Remove null entries
            .map((source, index) => ({
              ...source,
              priority: index + 1 // Assign priority sequentially
            }));

          // Transform field mappings for this config
          const fieldMappingsForConfig = transformFieldMappings(config.fieldMappings);

          const configJson = {
            input_sources: inputSourcesForConfig,
            match_keys: config.appendOnFields || [],
            is_self_append: appendSourcesForConfig.some((s: any) => s.source_type === 'self_append'),
            append_sources: appendSourcesForConfig,
            field_mappings: fieldMappingsForConfig
          };

          console.log(`  Append Config ${index + 1}:`, {
            id: config.id,
            inputSources: config.inputSources.length,
            appendSources: config.appendSources.length,
            hasSelfAppend: configJson.is_self_append
          });

          appendWorkflowItems.push({
            stepOrder,
            internalStepOrder: index + 1,
            actionType: 'A',
            configJson
          });
        });

        return appendWorkflowItems;
      };

      // Extract Append versions (versioned sources created by Append module)
      const extractAppendVersionsForWorkflow = (configCount: number) => {
        // Filter from versionedSources state, not inputSources
        const appendVersions = versionedSources.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Append'
        );

        console.log('\n🔍 Extracting Append versions for workflow:');
        console.log('  Total versioned sources:', versionedSources.length);
        console.log('  Append versions found:', appendVersions.length);
        console.log('  Config count for offset:', configCount);

        return appendVersions.map((source, index) => {
          const { stepOrder, actionType, saveAsVersion, versionName, configJson } = source as any;

          // Calculate internalStepOrder as offset by the number of configs
          const internalStepOrder = configCount + index + 1;

          console.log(`  Append Version ${index + 1}:`, {
            sourceName: source.sourceName,
            versionName: versionName,
            saveAsVersion: saveAsVersion,
            stepOrder: stepOrder,
            internalStepOrder: internalStepOrder,
            hasFieldMappings: configJson?.field_mappings?.length || 0
          });

          return {
            stepOrder,
            internalStepOrder,
            actionType,
            saveAsVersion,
            versionName,
            configJson
          };
        });
      };

      // Extract Suppress configurations for workflow array
      const extractSuppressConfigurationsForWorkflow = () => {
        const suppressWorkflowItems: any[] = [];
        const stepOrder = getStepOrder('panel3');

        console.log('\n🔍 Extracting Suppress configurations for workflow:');
        console.log('  Total suppress configurations:', suppressConfigurations.length);

        suppressConfigurations.forEach((config, index) => {
          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            const source = inputSources.find(s => s.id === sourceId);
            return {
              source_name: source?.sourceName || sourceId,
              columns: source?.headers || []
            };
          });

          // Transform suppress sources to the required format
          const suppressSourcesForConfig = (config.suppressSources || [])
            .map((sourceId) => {
              // First check if it's an input source
              const inputSource = allAvailableInputSources.find(s => s.id === sourceId);
              if (inputSource && !inputSource.isVersioned) {
                const createdByModuleId = (inputSource as any).createdByModuleId;
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleId.startsWith('panel1_')) {
                  return {
                    source_type: 'input',
                    source_name: inputSource.sourceName
                  };
                }
              }

              // Check if it's a custom suppress source
              const customSource = sharedCustomSources.find(s => s.id === sourceId);
              const isCustomSuppressSource = customSource &&
                                            customSource.createdByModuleId &&
                                            (customSource.createdByModuleId === 'panel3' ||
                                             customSource.createdByModuleId.startsWith('panel3_'));

              if (isCustomSuppressSource) {
                const isSelfSuppress = customSource?.sourceType === 'Self';
                return {
                  source_type: isSelfSuppress ? 'self_suppress' : 'preconfigured',
                  source_name: customSource.sourceName
                };
              }

              // Check if it's a preconfigured suppress source
              if (sourceId.startsWith('suppress_')) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.suppress?.find(
                  (table: any) => `suppress_${table?.tableId}` === sourceId
                );
                const sourceName = predefined ? predefined.tableName : sourceId;
                return {
                  source_type: 'preconfigured',
                  source_name: sourceName
                };
              }

              console.log('⚠️ Unknown suppress source type for sourceId:', sourceId);
              return null;
            })
            .filter(Boolean);

          const configJson = {
            input_sources: inputSourcesForConfig,
            suppress_on_fields: config.suppressOnFields || [],
            suppress_sources: suppressSourcesForConfig
          };

          console.log(`  Suppress Config ${index + 1}:`, {
            id: config.id,
            inputSources: config.inputSources.length,
            suppressSources: config.suppressSources.length
          });

          suppressWorkflowItems.push({
            stepOrder,
            internalStepOrder: index + 1,
            actionType: 'S',
            configJson
          });
        });

        return suppressWorkflowItems;
      };

      // Extract Suppress versions (versioned sources created by Suppress module)
      const extractSuppressVersionsForWorkflow = (configCount: number) => {
        const suppressVersions = versionedSources.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Suppress'
        );

        console.log('\n🔍 Extracting Suppress versions for workflow:');
        console.log('  Suppress versions found:', suppressVersions.length);
        console.log('  Config count for offset:', configCount);

        return suppressVersions.map((source, index) => {
          const { stepOrder, actionType, saveAsVersion, versionName, configJson } = source as any;
          const internalStepOrder = configCount + index + 1;

          console.log(`  Suppress Version ${index + 1}:`, {
            sourceName: source.sourceName,
            versionName: versionName,
            saveAsVersion: saveAsVersion,
            stepOrder: stepOrder,
            internalStepOrder: internalStepOrder
          });

          return {
            stepOrder,
            internalStepOrder,
            actionType,
            saveAsVersion,
            versionName,
            configJson
          };
        });
      };

      // Extract Match configurations for workflow array
      const extractMatchConfigurationsForWorkflow = () => {
        const matchWorkflowItems: any[] = [];
        const stepOrder = getStepOrder('panel4');

        console.log('\n🔍 Extracting Match configurations for workflow:');
        console.log('  Total match configurations:', matchConfigurations.length);

        matchConfigurations.forEach((config, index) => {
          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            const source = inputSources.find(s => s.id === sourceId);
            return {
              source_name: source?.sourceName || sourceId,
              columns: source?.headers || []
            };
          });

          // Transform match sources to the required format with priority
          const matchSourcesForConfig = (config.matchSources || [])
            .map((sourceId, priority) => {
              // First check if it's an input source
              const inputSource = allAvailableInputSources.find(s => s.id === sourceId);
              if (inputSource && !inputSource.isVersioned) {
                const createdByModuleId = (inputSource as any).createdByModuleId;
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleId.startsWith('panel1_')) {
                  return {
                    source_type: 'input',
                    source_name: inputSource.sourceName,
                    priority: priority + 1
                  };
                }
              }

              // Check if it's a custom match source
              const customSource = sharedCustomSources.find(s => s.id === sourceId);
              const isCustomMatchSource = customSource &&
                                         customSource.createdByModuleId &&
                                         (customSource.createdByModuleId === 'panel4' ||
                                          customSource.createdByModuleId.startsWith('panel4_'));

              if (isCustomMatchSource) {
                const isSelfMatch = customSource?.sourceType === 'Self';
                return {
                  source_type: isSelfMatch ? 'self_match' : 'preconfigured',
                  source_name: customSource.sourceName,
                  priority: priority + 1
                };
              }

              // Check if it's a preconfigured match source
              if (sourceId.startsWith('match_')) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.match?.find(
                  (table: any) => `match_${table?.tableId}` === sourceId
                );
                const sourceName = predefined ? predefined.tableName : sourceId;
                return {
                  source_type: 'preconfigured',
                  source_name: sourceName,
                  priority: priority + 1
                };
              }

              console.log('⚠️ Unknown match source type for sourceId:', sourceId);
              return null;
            })
            .filter(Boolean);

          const configJson = {
            input_sources: inputSourcesForConfig,
            match_on_fields: config.matchOnFields || [],
            match_sources: matchSourcesForConfig,
            expand: config.expand || false,
            match_type: config.matchType || 'full'
          };

          console.log(`  Match Config ${index + 1}:`, {
            id: config.id,
            inputSources: config.inputSources.length,
            matchSources: config.matchSources.length,
            expand: config.expand,
            matchType: config.matchType
          });

          matchWorkflowItems.push({
            stepOrder,
            internalStepOrder: index + 1,
            actionType: 'M',
            configJson
          });
        });

        return matchWorkflowItems;
      };

      // Extract Match versions (versioned sources created by Match module)
      const extractMatchVersionsForWorkflow = (configCount: number) => {
        const matchVersions = versionedSources.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Match'
        );

        console.log('\n🔍 Extracting Match versions for workflow:');
        console.log('  Match versions found:', matchVersions.length);
        console.log('  Config count for offset:', configCount);

        return matchVersions.map((source, index) => {
          const { stepOrder, actionType, saveAsVersion, versionName, configJson } = source as any;
          const internalStepOrder = configCount + index + 1;

          console.log(`  Match Version ${index + 1}:`, {
            sourceName: source.sourceName,
            versionName: versionName,
            saveAsVersion: saveAsVersion,
            stepOrder: stepOrder,
            internalStepOrder: internalStepOrder
          });

          return {
            stepOrder,
            internalStepOrder,
            actionType,
            saveAsVersion,
            versionName,
            configJson
          };
        });
      };

      // Build workflow array with all configurations and versions
      // IMPORTANT: All input sources first, then all versions
      const inputSourceWorkflow = extractInputSourcesForWorkflow();
      const inputSourceCount = inputSourceWorkflow.length;

      const inputVersions = extractInputVersionsForWorkflow(inputSourceCount);
      const appendConfigs = extractAppendConfigurationsForWorkflow();
      const appendVersions = extractAppendVersionsForWorkflow(appendConfigs.length);
      const suppressConfigs = extractSuppressConfigurationsForWorkflow();
      const suppressVersions = extractSuppressVersionsForWorkflow(suppressConfigs.length);
      const matchConfigs = extractMatchConfigurationsForWorkflow();
      const matchVersions = extractMatchVersionsForWorkflow(matchConfigs.length);

      const workflowArray = [
        ...inputSourceWorkflow,  // All input sources first
        ...inputVersions,        // All input versions after
        ...appendConfigs,
        ...appendVersions,
        ...suppressConfigs,
        ...suppressVersions,
        ...matchConfigs,
        ...matchVersions
      ];

      // Log workflow array for debugging
      console.log('\n=== WORKFLOW ARRAY ===');
      console.log('Total workflow items:', workflowArray.length);
      console.log('  Input sources:', workflowArray.filter(w => w.actionType === 'I').length);
      console.log('  Input versions:', workflowArray.filter(w => w.actionType === 'P').length);
      console.log('  Append items:', workflowArray.filter(w => w.actionType === 'A').length);
      console.log('  Match items:', workflowArray.filter(w => w.actionType === 'M').length);
      console.log('  Suppress items:', workflowArray.filter(w => w.actionType === 'S').length);

      workflowArray.forEach((item, index) => {
        let itemType = '';
        if (item.actionType === 'I') {
          itemType = 'Input Source';
        } else if (item.saveAsVersion) {
          itemType = `${item.actionType === 'P' ? 'Input' : item.actionType === 'A' ? 'Append' : item.actionType === 'M' ? 'Match' : 'Suppress'} Version`;
        } else {
          itemType = `${item.actionType === 'A' ? 'Append' : item.actionType === 'M' ? 'Match' : 'Suppress'} Config`;
        }

        console.log(`\n  📋 Workflow Item ${index + 1}: ${itemType}`);
        console.log('    stepOrder:', item.stepOrder);
        console.log('    internalStepOrder:', item.internalStepOrder);
        console.log('    actionType:', item.actionType);

        if (item.saveAsVersion) {
          console.log('    saveAsVersion:', item.saveAsVersion);
          console.log('    versionName:', item.versionName);
        }

        if (item.actionType === 'I' && item.configJson) {
          console.log('    input_sources:', item.configJson.input_sources || []);
        } else if (item.actionType === 'A' && item.configJson) {
          console.log('    input_sources:', item.configJson.input_sources?.length || 0);
          console.log('    match_keys:', item.configJson.match_keys?.length || 0);
          console.log('    append_sources:', item.configJson.append_sources?.length || 0);
          console.log('    is_self_append:', item.configJson.is_self_append || false);
          console.log('    field_mappings:', item.configJson.field_mappings?.length || 0);
        }
      });
      console.log('\n=== SUBMIT PAYLOAD ===');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitPayload = {
        requestDetails,
        inputSources: allTransformedInputSources, // Combined input sources and append sources
        workflow: workflowArray.length > 0 ? workflowArray : undefined,
        stats: transformedStats.length > 0 ? transformedStats : undefined,
        output: (transformedOutput && transformedOutput.length > 0) ? transformedOutput : undefined
      } as SubmitRequestPayload;

      if (workflowArray.length > 0) {
        console.log('✅ Workflow array included in payload with', workflowArray.length, 'version(s)');
      } else {
        console.log('ℹ️ No input versions to include in workflow');
      }

      if (transformedStats.length > 0) {
        console.log('✅ Stats configurations included in payload:', transformedStats.length);
      } else {
        console.log('ℹ️ No stats configurations to include');
      }

      if (transformedOutput && transformedOutput.length > 0) {
        console.log('✅ Output configurations included in payload:', transformedOutput.length);
        transformedOutput.forEach((config, index) => {
          console.log(`  📦 Config ${index + 1}:`);
          // Check if destination is preconfigured or custom
          if (config.destinationType === 'preconfigured') {
            console.log(`    - Destination: Preconfigured (${config.destinationName})`);
          } else if (config.destinationType === 'custom' && config.destinationConfig) {
            console.log(`    - Destination: Custom (${config.destinationConfig.type})`);
          }
          console.log(`    - Output Fields: ${config.config.output_fields.length}`);
          console.log(`    - Field Mappings: ${config.config.field_mappings.length}`);
          if (config.config.field_mappings.length > 0) {
            config.config.field_mappings.forEach((mapping) => {
              console.log(`      • ${mapping.field_name} <- ${mapping.source_mappings}`);
            });
          }
        });
        console.log('📦 Full Output payload:', JSON.stringify(transformedOutput, null, 2));
      } else {
        console.log('ℹ️ No output configurations to include');
      }

      console.log('\n📦 Full Submit Payload:', JSON.stringify(submitPayload, null, 2));
      console.log('======================\n');

      const submitResponse = await submitRequest(submitPayload);

      if (submitResponse.success) {
        // Success: Show message and redirect to data pull reports list
        setSaveSuccess(submitResponse.message || 'Request submitted successfully!');

        // Redirect after a short delay to allow user to see the success message
        setTimeout(() => {
          navigate('/dataPullReports');
        }, 1500);
      } else {
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

    // Convert source names to IDs for storage
    const inputSourceIds = selectedInputSources
      .map(sourceName => {
        const source = allAvailableInputSources.find(s => s.sourceName === sourceName);
        return source?.id;
      })
      .filter((id): id is string => !!id);

    if (editingStatsId) {
      // Update existing configuration
      setStatsConfigurations(statsConfigurations.map(config =>
        config.id === editingStatsId
          ? { ...config, inputSources: inputSourceIds, countsOn: selectedCountsOn, breakdownBy: selectedBreakdownBy }
          : config
      ));
      setEditingStatsId(null);
    } else {
      // Add new configuration
      const newConfiguration: StatsConfiguration = {
        id: Date.now().toString(),
        inputSources: inputSourceIds,
        countsOn: selectedCountsOn,
        breakdownBy: selectedBreakdownBy,
      };
      setStatsConfigurations([...statsConfigurations, newConfiguration]);
    }

    // Reset selections
    setSelectedInputSources([]);
    setSelectedCountsOn([]);
    setSelectedBreakdownBy([]);
  };

  const handleEditStatsConfiguration = (config: StatsConfiguration) => {
    setEditingStatsId(config.id);

    // Stats configs store source NAMES (not IDs) after transformation
    // First check if inputSources contains IDs or names by checking if they exist in sources
    const isUsingIds = config.inputSources.some(item =>
      allAvailableInputSources.some(s => s.id === item)
    );

    let sourceNames: string[];
    if (isUsingIds) {
      // Convert input source IDs to source names for the dropdown
      sourceNames = config.inputSources
        .map(sourceId => {
          const source = allAvailableInputSources.find(s => s.id === sourceId);
          return source?.sourceName;
        })
        .filter((name): name is string => !!name);
    } else {
      // Already using names, use them directly
      sourceNames = config.inputSources;
    }

    setSelectedInputSources(sourceNames);
    setSelectedCountsOn(config.countsOn);
    setSelectedBreakdownBy(config.breakdownBy);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteStatsConfiguration = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      setStatsConfigurations(statsConfigurations.filter(c => c.id !== id));
      if (editingStatsId === id) {
        setEditingStatsId(null);
        setSelectedInputSources([]);
        setSelectedCountsOn([]);
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
          // Validate the move before executing - check versioned sources
          const versionValidation = validateModuleMove(oldIndex, newIndex, modules, versionedSources);

          if (!versionValidation.canMove) {
            // Show error message with better formatting
            const errorMessage = `🚫 Module Reordering Not Allowed\n\n${versionValidation.error}\n\n💡 Tip: You can edit or delete the dependent versions first, then reorder the modules.`;
            alert(errorMessage);
            return items; // Return unchanged items
          }

          // Validate the move before executing - check custom source dependencies
          const customSourceValidation = validateCustomSourceDependencies(
            oldIndex,
            newIndex,
            modules,
            sharedCustomSources,
            {
              appendConfigs: appendConfigurations,
              matchConfigs: matchConfigurations,
              suppressConfigs: suppressConfigurations
            }
          );

          if (!customSourceValidation.canMove) {
            // Show error message with better formatting
            const errorMessage = `🚫 Module Reordering Not Allowed\n\n${customSourceValidation.error}\n\n💡 Tip: You can remove the custom source from the dependent module first, then reorder the modules.`;
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
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields, fieldMappings) =>
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields, fieldMappings)
        }
        initialConfigs={initialConfigs}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={versionedSources.filter(v => v.sourceModule === 'Append' && v.createdByModuleId === moduleId)}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
        onConfigurationsChange={setAppendConfigurations}
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
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
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
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
        onConfigurationsChange={setMatchConfigurations}
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
                      // Filter out the special "select-all" value before setting state
                      const filteredValue = value.filter((v: string) => v !== 'select-all');
                      setSelectedInputSources(filteredValue);
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Chip
                  label={'2'}
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
                  Generate Counts On
                </Typography>
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                  *
                </Typography>
              </Box>
              <FormControl size="small" fullWidth>
                <Select
                  multiple
                  value={selectedCountsOn.map(c => c.field)}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    // Check if "select-all" was clicked
                    if (value.includes('select-all-counts')) {
                      // Toggle select all
                      if (selectedCountsOn.length === filteredStatsCountsOn.length) {
                        setSelectedCountsOn([]);
                      } else {
                        setSelectedCountsOn(filteredStatsCountsOn.map(field => ({ field, isDistinct: false })));
                      }
                    } else {
                      // Filter out the special "select-all-counts" value
                      const filteredValue = value.filter((v: string) => v !== 'select-all-counts');
                      // Update selectedCountsOn to match the new selection
                      const updatedCountsOn = filteredValue.map(field => {
                        // Preserve existing isDistinct flag if field was already selected
                        const existing = selectedCountsOn.find(c => c.field === field);
                        return existing || { field, isDistinct: false };
                      });
                      setSelectedCountsOn(updatedCountsOn);
                    }
                  }}
                  onClose={() => setStatsCountsOnSearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const countOn = selectedCountsOn.find(c => c.field === value);
                        return (
                          <Chip
                            key={value}
                            label={`${value}${countOn?.isDistinct ? ' (D)' : ''}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              backgroundColor: '#8B5CF620',
                              color: '#8B5CF6',
                              fontWeight: 600
                            }}
                          />
                        );
                      })}
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
                  {filteredStatsCountsOn.map((field) => {
                    const isSelected = selectedCountsOn.some(c => c.field === field);
                    const countOn = selectedCountsOn.find(c => c.field === field);
                    return (
                      <MenuItem key={field} value={field}>
                        <Checkbox checked={isSelected} size="small" />
                        <ListItemText primary={`${field}${countOn?.isDistinct ? ' (D)' : ''}`} />
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>

            {/* Step 2.5: Distinct Columns (Only shown when Generate Counts On has selections) */}
            {selectedCountsOn.length > 0 && (
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
                    label={'2.5'}
                    size="small"
                    sx={{
                      backgroundColor: '#10B981',
                      color: '#fff',
                      fontWeight: 700,
                      mr: 1,
                      width: 32,
                      height: 24,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                    Distinct Columns
                  </Typography>
                  <Typography component="span" sx={{ color: '#6B7280', ml: 1, fontSize: '0.7rem', fontStyle: 'italic' }}>
                    (Optional - Mark fields as distinct)
                  </Typography>
                </Box>
                <FormControl size="small" fullWidth>
                  <Select
                    multiple
                    value={selectedCountsOn.filter(c => c.isDistinct).map(c => c.field)}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                      // Check if "select-all" was clicked
                      if (value.includes('select-all-distinct')) {
                        // Toggle select all for distinct
                        const allDistinct = selectedCountsOn.every(c => c.isDistinct);
                        const updatedCountsOn = selectedCountsOn.map(countOn => ({
                          ...countOn,
                          isDistinct: !allDistinct
                        }));
                        setSelectedCountsOn(updatedCountsOn);
                      } else {
                        // Filter out the special "select-all-distinct" value
                        const selectedDistinctFields = value.filter((v: string) => v !== 'select-all-distinct');
                        // Update the isDistinct flag for each field in selectedCountsOn
                        const updatedCountsOn = selectedCountsOn.map(countOn => ({
                          ...countOn,
                          isDistinct: selectedDistinctFields.includes(countOn.field)
                        }));
                        setSelectedCountsOn(updatedCountsOn);
                      }
                    }}
                    input={<OutlinedInput />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.length === 0 ? (
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                            No distinct fields selected
                          </Typography>
                        ) : (
                          selected.map((value) => (
                            <Chip
                              key={value}
                              label={value}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: '#10B98120',
                                color: '#10B981',
                                fontWeight: 600
                              }}
                            />
                          ))
                        )}
                      </Box>
                    )}
                    displayEmpty
                    MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                    sx={{ backgroundColor: 'white' }}
                  >
                    <MenuItem disabled value="">
                      <em>Mark fields as distinct...</em>
                    </MenuItem>
                    {/* Select All Option */}
                    <MenuItem value="select-all-distinct" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                      <Checkbox
                        checked={selectedCountsOn.length > 0 && selectedCountsOn.every(c => c.isDistinct)}
                        indeterminate={selectedCountsOn.some(c => c.isDistinct) && !selectedCountsOn.every(c => c.isDistinct)}
                        size="small"
                      />
                      <ListItemText primary="Select All" />
                    </MenuItem>
                    {selectedCountsOn.map((countOn) => (
                      <MenuItem key={countOn.field} value={countOn.field}>
                        <Checkbox checked={countOn.isDistinct} size="small" />
                        <ListItemText primary={countOn.field} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

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
                      // Filter out the special "select-all-breakdown" value before setting state
                      const filteredValue = value.filter((v: string) => v !== 'select-all-breakdown');
                      setSelectedBreakdownBy(filteredValue);
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
                      <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Counts On (with Distinct)</TableCell>
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
                            (() => {
                              // Convert IDs to source names for display
                              const sourceNames = config.inputSources
                                .map(sourceId => {
                                  const source = allAvailableInputSources.find(s => s.id === sourceId);
                                  return source?.sourceName || sourceId;
                                });

                              return (
                                <Tooltip
                                  title={
                                    <Box sx={{ maxWidth: 400 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                        Input Sources ({sourceNames.length}):
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block' }}>
                                        {sourceNames.join(', ')}
                                      </Typography>
                                    </Box>
                                  }
                                  arrow
                                  placement="top"
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip
                                      label={`${sourceNames.length} source${sourceNames.length !== 1 ? 's' : ''}`}
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
                                      {sourceNames.slice(0, 2).join(', ')}
                                      {sourceNames.length > 2 ? '...' : ''}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })()
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              --
                            </Typography>
                          )}
                        </TableCell>

                        {/* Counts On Column with Distinct status */}
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          {config.countsOn.length > 0 ? (
                            <Tooltip
                              title={
                                <Box sx={{ maxWidth: 400 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Counts On ({config.countsOn.length}):
                                  </Typography>
                                  {config.countsOn.map((countOn, idx) => (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                      <Typography variant="caption" sx={{ display: 'inline' }}>
                                        {countOn.field}
                                      </Typography>
                                      {countOn.isDistinct && (
                                        <Chip
                                          label="D"
                                          size="small"
                                          sx={{
                                            height: 14,
                                            fontSize: '0.6rem',
                                            backgroundColor: '#10B98130',
                                            color: '#10B981',
                                            fontWeight: 600,
                                            ml: 0.5
                                          }}
                                        />
                                      )}
                                    </Box>
                                  ))}
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
                                  {config.countsOn.slice(0, 2).map(c => `${c.field}${c.isDistinct ? '(D)' : ''}`).join(', ')}
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
          sourcesLoading={sourcesLoading}
          onConfigurationsChange={setOutputConfigurations}
          onTransformedDataChange={setTransformedOutputData}
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
              {requestId ? 'Edit Request' : 'Create New Request'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {requestId ? 'Update your processing request configuration' : 'Configure all modules for your processing request'}
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
              disabled={saveLoading || editRequestLoading}
              sx={{
                px: 2.5,
                py: 0.75,
                fontSize: '0.875rem',
                boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
              }}
            >
              {saveLoading ? (requestId ? 'Updating...' : 'Submitting...') : (requestId ? 'Update Request' : 'Submit Request')}
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Loading State for Edit Request */}
      {editRequestLoading && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">
            Loading request data...
          </Alert>
        </Box>
      )}

      {/* Error State for Edit Request */}
      {editRequestError && (
        <Box sx={{ mb: 2 }}>
          <Alert
            severity={editRequestError.includes('Using sample data') ? 'warning' : 'error'}
            onClose={() => setEditRequestError('')}
          >
            {editRequestError}
          </Alert>
        </Box>
      )}

      {/* Success/Error Messages */}
      {saveSuccess && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="success" onClose={() => setSaveSuccess('')}>
            {saveSuccess}
          </Alert>
        </Box>
      )}

      {recipientEmailError && (
           <Box sx={{ mb: 2 }}>
                <Alert severity="error" onClose={() => setRecipientEmailError('')}>
               {recipientEmailError}
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
      {scheduledDateTimeError && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error" onClose={() => setScheduledDateTimeError('')}>
            {scheduledDateTimeError}
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
              Request Name1
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
