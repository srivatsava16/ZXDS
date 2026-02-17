import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { submitRequest, updateRequest, getEditRequest, type SubmitRequestPayload, type RequestInputsResponse } from '../../../services/api';

// Extracted modules
import type { StatsConfiguration, VersionedSource, CountOnField } from './types';
import { transformAllStatsToAPI } from './types';
import { createModuleDefinitions } from './utils/moduleDefinitions';
import { validateModuleMove, validateCustomSourceDependencies, getModuleType } from './utils/moduleHelpers';
import { validateRequestName } from './utils/requestValidators';
import SortableAccordionItem from './components/SortableAccordionItem';
import SortableStep from './components/SortableStep';

// Custom hooks
import { useDataLoading } from './hooks/useDataLoading';

// Content Loader Component
import ContentLoader from '../../../components/ContentLoader/ContentLoader';

const RequestCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId?: string }>();
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get('duplicate');

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

  // Ref to prevent duplicate API calls for edit request loading
  const loadedRequestIdRef = useRef<string | null>(null);

  // Custom hooks for data loading
  const { apiSources, tableDictionary, sourcesLoading } = useDataLoading();

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

  // Request details ID (for edit mode update payload)
  const [requestDetailsId, setRequestDetailsId] = useState<string | number | null>(null);

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

  // Track if initial configs have been consumed to prevent re-passing them
  const initialConfigsConsumedRef = useRef(false);

  // Current output configurations
  const [outputConfigurations, setOutputConfigurations] = useState<OutputConfig[]>([]);
  const [transformedOutputData, setTransformedOutputData] = useState<OutputAPIPayload | null>(null);

  // Current module configurations (for dependency tracking)
  const [appendConfigurations, setAppendConfigurations] = useState<AppendConfig[]>([]);
  const [suppressConfigurations, setSuppressConfigurations] = useState<SuppressConfig[]>([]);
  const [matchConfigurations, setMatchConfigurations] = useState<MatchConfig[]>([]);

  // Module-level field mappings per module ID (each module instance has its own field mappings)
  const [appendModuleFieldMappings, setAppendModuleFieldMappings] = useState<Record<string, any[]>>({});
  const [matchModuleFieldMappings, setMatchModuleFieldMappings] = useState<Record<string, any[]>>({});
  const [suppressModuleFieldMappings, setSuppressModuleFieldMappings] = useState<Record<string, any[]>>({});

  // Shared custom sources across all modules (Append, Match, Suppress)
  const [sharedCustomSources, setSharedCustomSources] = useState<InputSource[]>([]);

  // Error dialog state for source usage validation
  const [usageErrorDialog, setUsageErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    usedIn: string[];
  }>({
    open: false,
    title: '',
    message: '',
    usedIn: []
  });

  // Transform API response to internal format
  const transformApiDataToInternalFormat = (apiData: any, apiSourcesForTransform?: RequestInputsResponse | null) => {
    const transformedData: any = {};

    // Transform request name from requestDetails
    if (apiData?.requestDetails?.requestName) {
      transformedData.requestName = apiData.requestDetails.requestName;
    }

    // Preserve requestDetails ID for update payload (if exists)
    if (apiData?.requestDetails?.id) {
      transformedData.requestDetailsId = apiData.requestDetails.id;
    }

    // Build a map of source name to ID for consistent lookups
    // This ensures that when configs reference source names, we can find the correct IDs
    const sourceNameToIdMap: Map<string, string> = new Map();

    // Transform input sources - separate by inputType
    if (apiData?.inputSources && Array.isArray(apiData.inputSources)) {
      const inputModuleSources: any[] = [];
      const customSources: any[] = [];

      apiData.inputSources?.forEach((source: any, index: number) => {
        const selectedColumnsArray = source?.selectedColumns
          ? source.selectedColumns?.split(',').map((col: string) => col?.trim())
          : source?.columns || [];

        // Use existing ID from API if available (for edit mode), otherwise generate new one
        // This preserves IDs for update payload while generating IDs for new sources
        const sourceId = source?.id || `input_${Date.now()}_${index}`;
        const hasExistingId = !!source?.id;

        // Store the mapping from source name to ID
        if (source?.sourceName) {
          sourceNameToIdMap.set(source.sourceName, sourceId);
        }

        

        // For database sources, differentiate between:
        // - sourceName: User's custom Table Source Name (display name)
        // - tableName: Actual database table name
        // - sourceOption: Table ID for preconfigured tables
        const actualTableName = source?.tableName || source?.originalTableName || source?.table || '';

        

        // Determine sourceType - check for 'self' (lowercase) as well
        const sourceType = source?.sourceType === 'T' ? 'Database' :
                          source?.sourceType === 'F' ? 'File' :
                          source?.sourceType === 'self' || source?.isSelfSource === 1 ? 'Self' : 'Self';

        // Helper function to derive subSourceType from fileSourceId
        const deriveSubSourceTypeForEditMode = (fileSourceId: number | string | undefined): string => {
          if (!fileSourceId || !apiSources?.fileSource) {
            return 'SFTP';
          }

          const numericId = Number(fileSourceId);

          // Check SFTP sources
          if (apiSources?.fileSource?.sftpSources?.find((s: any) => s?.id === numericId)) {
            return 'SFTP';
          }

          // Check NFS sources
          if (apiSources?.fileSource?.nfsSources?.find((s: any) => s?.id === numericId)) {
            return 'NFS';
          }

          // Check AWS S3 sources
          if (apiSources?.fileSource?.awsSources?.find((s: any) => s?.id === numericId)) {
            return 'S3';
          }

          return 'SFTP';
        };

        // Determine subSourceType based on source type
        let derivedSubSourceType;
        if (source?.sourceType === 'T') {
          // Database sources
          derivedSubSourceType = source?.isCustomTable === 1 ? 'Custom Database' : 'Database';
        } else if (source?.sourceType === 'F') {
          // File sources - derive from fileSourceId
          const fileSourceId = source?.fileSourceId || source?.dataSourceId;
          derivedSubSourceType = deriveSubSourceTypeForEditMode(fileSourceId);
        } else {
          // Other source types
          derivedSubSourceType = undefined;
        }

        const transformedSource: any = {
          id: sourceId,
          sourceName: source?.sourceName || '',  // User's custom Table Source Name
          sourceType: sourceType,
          subSourceType: derivedSubSourceType,
          inputType: source?.inputType || 'I',
          table: actualTableName,  // Actual database table name
          headers: source?.columns || [],
          selectedHeaders: selectedColumnsArray,
          database: source?.database || source?.dbName || '',
          schema: source?.schema || '',
          filterQuery: source?.filters || '',  // Map 'filters' from API to 'filterQuery' in UI
          filterJson: source?.filterJson || null,
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
          tableSourceId: source?.tableSourceId || source?.sourceOption,
          // Flag to indicate if this source has an existing ID from API (for update payload)
          hasExistingId: hasExistingId,
          // Preserve workflowStepId for workflow array construction in edit mode
          workflowStepId: source?.workflowStepId
        };

        // For Self sources, include selfConfig
        if (sourceType === 'Self' && source?.selfConfig) {
          // Transform assignment_sets: API ? UI conversion (filterJson ? filter_config)
          const transformedAssignmentSets = (source.selfConfig.assignment_sets || [])?.map((set: any) => {
            const transformed: any = {
              value_to_assign: set?.value_to_assign || '',
              filter_sql: set?.filter_sql || '',
            };

            // Rename filterJson to filter_config (API ? UI conversion)
            if (set?.filterJson) {
              transformed.filter_config = set.filterJson;
            }

            return transformed;
          });

          transformedSource.selfConfig = {
            input_source_names: source.selfConfig.input_source_names || [],
            generated_column: source.selfConfig.generated_column || '',
            generated_datatype: source.selfConfig.generated_datatype || 'STRING',
            assignment_sets: transformedAssignmentSets,
            tiering_on: source.selfConfig.tiering_on ?? null
          };

        }

        // Separate sources based on inputType
        const inputType = source?.inputType || 'I';

        if (inputType === 'I') {
          // Input module sources
          inputModuleSources?.push(transformedSource);
        } else {
          // Custom sources for Append (A), Match (M), or Suppress (S) modules
          // Add createdByModuleId to identify which module this source belongs to
          let createdByModuleId = '';

          if (inputType === 'A') {
            createdByModuleId = 'panel2'; // Append module (panel2)
          } else if (inputType === 'M') {
            createdByModuleId = 'panel4'; // Match module (panel4)
          } else if (inputType === 'S') {
            createdByModuleId = 'panel3'; // Suppress module (panel3)
          }

          customSources?.push({
            ...transformedSource,
            createdByModuleId: createdByModuleId,
            isCustomSource: true
          });
        }
      });

      transformedData.inputSources = inputModuleSources;
      transformedData.customSources = customSources;
    }

    // Helper function to map source name to source ID
    const mapSourceNameToId = (sourceName: string): string => {
      if (!sourceName) return '';

      // First check the sourceNameToIdMap (built during source transformation)
      if (sourceNameToIdMap.has(sourceName)) {
        const mappedId = sourceNameToIdMap.get(sourceName)!;
        
        return mappedId;
      }

      // Check in transformed input sources
      if (transformedData?.inputSources && Array.isArray(transformedData.inputSources)) {
        const source = transformedData.inputSources?.find((src: any) =>
          src?.sourceName === sourceName ||
          src?.table === sourceName ||
          src?.id === sourceName
        );
        if (source?.id) {
          
          return source.id;
        }
      }

      // Check in transformed custom sources
      if (transformedData?.customSources && Array.isArray(transformedData.customSources)) {
        const source = transformedData.customSources?.find((src: any) =>
          src?.sourceName === sourceName ||
          src?.table === sourceName ||
          src?.id === sourceName
        );
        if (source?.id) {
          
          return source.id;
        }
      }

      // Check in versioned sources that have been created
      if (transformedData?.inputVersions && Array.isArray(transformedData.inputVersions)) {
        const version = transformedData.inputVersions?.find((v: any) =>
          v?.sourceName === sourceName ||
          v?.versionName === sourceName ||
          v?.versionLabel === sourceName
        );
        if (version?.id) {
          
          return version.id;
        }
      }

      // If still not found, warn and return empty
      
      return '';
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
      if (preconfiguredTables?.length > 0) {
        const table = preconfiguredTables?.find((t: any) => t?.tableName === sourceName);
        if (table?.tableId) {
          const id = `${sourceModule}_${table.tableId}`;
          
          return id;
        }
      }

      // If not found, check if it might be a custom source in our sourceNameToIdMap
      if (sourceNameToIdMap.has(sourceName)) {
        const mappedId = sourceNameToIdMap.get(sourceName)!;
        
        return mappedId;
      }

      // If still not found, warn and return empty
      
      return '';
    };

    // Transform workflow (Input Versions, Append, Suppress, Match configurations)
    if (apiData?.workflow && Array.isArray(apiData.workflow)) {
      const inputVersions: any[] = [];
      const appendConfigs: any[] = [];
      const appendVersions: any[] = [];
      const suppressConfigs: any[] = [];
      const suppressVersions: any[] = [];
      const matchConfigs: any[] = [];
      const matchVersions: any[] = [];

      // Module-level field mappings (extracted from the first config or version of each module)
      let appendFieldMappings: any[] = [];
      let matchFieldMappings: any[] = [];
      let suppressFieldMappings: any[] = [];

      apiData.workflow?.forEach((workflowItem: any, index: number) => {
        const actionType = workflowItem?.actionType;
        const configJson = workflowItem?.configJson;
        const saveAsVersion = workflowItem?.saveAsVersion;

        if (actionType === 'I' && configJson && saveAsVersion) {
          // Input Version (actionType 'I' with saveAsVersion flag)
          const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name || src) || [];
          const versionName = workflowItem?.versionName || `Version_${index}`;

          // Use existing workflow item ID if available (for edit mode), otherwise generate new one
          const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
          const versionId = workflowItemId || `versioned_${Date.now()}_${index}`;
          const hasExistingId = !!workflowItemId;

          

          // Create versioned source from workflow
          const versionedSource: any = {
            id: versionId,
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
            actionType: 'I',
            saveAsVersion: saveAsVersion || 1,
            versionName: versionName,
            internalStepOrder: workflowItem?.internalStepOrder,
            configJson: configJson,
            // Flag to indicate if this has an existing ID from API (for update payload)
            hasExistingId: hasExistingId,
            workflowItemId: workflowItemId // Store original workflow item ID if exists
          };

          inputVersions?.push(versionedSource);

          // Add to sourceNameToIdMap so this version can be referenced in later configs
          sourceNameToIdMap.set(versionName, versionId);
        } else if (actionType === 'A' && configJson) {
          // Check if this is an Append version or regular Append config
          if (saveAsVersion) {
            // Append Version
            const versionName = workflowItem?.versionName || `Append_Version_${index}`;

            

            // Extract input sources from configJson
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name || src) || [];
            const baseInputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean);

            // Extract append sources (operation sources) and correct source_type if needed
            const appendSourceNames = configJson?.append_sources?.map((src: any) => src?.source_name) || [];
            const operationSources = appendSourceNames
              .map((name: string) => {
                // Check if it's a preconfigured source
                const src = configJson.append_sources?.find((s: any) => s.source_name === name);
                if (src?.source_type === 'preconfigured') {
                  return mapPreconfiguredSourceNameToId(name, 'append');
                }
                return mapSourceNameToId(name);
              })
              .filter(Boolean);

            // Correct source_type in configJson.append_sources if needed
            // This ensures that input sources are marked as 'input' type even if they were incorrectly saved as 'preconfigured'
            const correctedAppendSources = (configJson?.append_sources || []).map((src: any) => {
              const sourceName = src?.source_name;
              const currentSourceType = src?.source_type;

              // Check if this source is actually an input source by checking if it exists in inputSourceNames
              const isInputSource = inputSourceNames?.includes(sourceName);

              // If it's an input source but marked as preconfigured, correct it
              if (isInputSource && currentSourceType === 'preconfigured') {
                return {
                  ...src,
                  source_type: 'input'
                };
              }

              // Otherwise keep the original source_type
              return src;
            });

            // Extract operation fields (match_keys for Append)
            const operationFields = configJson?.match_keys || [];

            // Extract append fields (fields being added from append sources)
            const appendFields = configJson?.append_sources?.flatMap((src: any) => src?.fields || []) || [];

            // Get combined headers
            const combinedHeaders = configJson?.field_mappings?.map((m: any) => m?.field_name) || [];

            // Use existing workflow item ID if available (for edit mode), otherwise generate new one
            const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
            const versionId = workflowItemId || `append_version_${Date.now()}_${index}`;
            const hasExistingId = !!workflowItemId;

            // Create corrected configJson with fixed source_type values
            const correctedConfigJson = {
              ...configJson,
              append_sources: correctedAppendSources
            };

            const versionedSource: any = {
              id: versionId,
              sourceName: versionName,
              sourceType: 'Version',
              subSourceType: 'Versioned',
              isVersioned: true,
              versionNumber: appendVersions?.length + 1,
              versionLabel: versionName,
              sourceModule: 'Append',
              headers: combinedHeaders,
              selectedHeaders: combinedHeaders,
              // Properties needed for version display and editing
              baseInputSources: baseInputSources,
              operationSources: operationSources,
              operationFields: operationFields,
              appendFields: appendFields,
              combinedHeaders: combinedHeaders,
              fieldMappings: configJson?.field_mappings || undefined,
              // Store workflow properties for payload reconstruction
              stepOrder: workflowItem?.stepOrder || 2,
              actionType: 'A',
              saveAsVersion: saveAsVersion || 1,
              versionName: versionName,
              internalStepOrder: workflowItem?.internalStepOrder,
              configJson: correctedConfigJson, // Use corrected configJson
              createdByModuleId: 'panel2', // Append module ID for filtering
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            };

            

            appendVersions?.push(versionedSource);

            // Add to sourceNameToIdMap so this version can be referenced in later configs
            sourceNameToIdMap.set(versionName, versionId);

            // Extract field mappings if not already extracted (from first version/config)
            if (appendFieldMappings?.length === 0 && configJson?.field_mappings && configJson.field_mappings?.length > 0) {
              appendFieldMappings = configJson.field_mappings;
              
            }
          } else {
            // Append configuration - map source names to IDs
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name) || [];
            const inputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean); // Remove empty IDs

            // For append sources: map to proper IDs (preconfigured or custom)
            const appendSources = (configJson?.append_sources?.map((src: any) => {
              const sourceName = src?.source_name;
              const sourceType = src?.source_type;

              // If it's a preconfigured source, look up its ID
              if (sourceType === 'preconfigured') {
                return mapPreconfiguredSourceNameToId(sourceName, 'append');
              }

              // Otherwise map to ID (for custom sources from inputSources)
              return mapSourceNameToId(sourceName);
            }) || []).filter(Boolean); // Remove empty IDs

            const fieldsToAppend = configJson?.append_sources?.flatMap((src: any) => src?.fields || []) || [];

            // Use existing workflow item ID if available (for edit mode), otherwise generate new one
            const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
            const configId = workflowItemId || `append_${Date.now()}_${index}`;
            const hasExistingId = !!workflowItemId;

            

            appendConfigs?.push({
              id: configId,
              inputSources: inputSources, // Array of source IDs
              appendOnFields: configJson?.match_keys || [],
              appendSources: appendSources, // Array of source IDs (preconfigured or custom)
              appendFields: fieldsToAppend,
              fieldMappings: configJson?.field_mappings || [],
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId, // Store original workflow item ID if exists
              stepOrder: workflowItem?.stepOrder ?? undefined, // Store stepOrder to identify which module this belongs to
              internalStepOrder: workflowItem?.internalStepOrder ?? undefined // Store internalStepOrder for ordering
            });

            // Extract field mappings if not already extracted (from first version/config)
            if (appendFieldMappings?.length === 0 && configJson?.field_mappings && configJson.field_mappings?.length > 0) {
              appendFieldMappings = configJson.field_mappings;
              
            }
          }
        } else if (actionType === 'S' && configJson) {
          // Check if this is a Suppress version or regular Suppress config
          if (saveAsVersion) {
            // Suppress Version
            const versionName = workflowItem?.versionName || `Suppress_Version_${index}`;

            

            // Extract input sources from configJson
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name || src) || [];
            const baseInputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean);

            // Extract suppress sources (operation sources) and correct source_type if needed
            const suppressSourceNames = configJson?.suppress_sources?.map((src: any) => src?.source_name) || [];
            const operationSources = suppressSourceNames
              .map((name: string) => {
                // Check if it's a preconfigured source
                const src = configJson.suppress_sources?.find((s: any) => s.source_name === name);
                if (src?.source_type === 'preconfigured') {
                  return mapPreconfiguredSourceNameToId(name, 'suppress');
                }
                return mapSourceNameToId(name);
              })
              .filter(Boolean);

            // Correct source_type in configJson.suppress_sources if needed
            // This ensures that input sources are marked as 'input' type even if they were incorrectly saved as 'preconfigured'
            const correctedSuppressSources = (configJson?.suppress_sources || []).map((src: any) => {
              const sourceName = src?.source_name;
              const currentSourceType = src?.source_type;

              // Check if this source is actually an input source by checking if it exists in inputSourceNames
              const isInputSource = inputSourceNames?.includes(sourceName);

              // If it's an input source but marked as preconfigured, correct it
              if (isInputSource && currentSourceType === 'preconfigured') {
                return {
                  ...src,
                  source_type: 'input'
                };
              }

              // Otherwise keep the original source_type
              return src;
            });

            // Extract operation fields (suppress_on_fields for Suppress)
            const operationFields = configJson?.suppress_on_fields || [];

            // Use existing workflow item ID if available (for edit mode), otherwise generate new one
            const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
            const versionId = workflowItemId || `suppress_version_${Date.now()}_${index}`;
            const hasExistingId = !!workflowItemId;

            // Create corrected configJson with fixed source_type values
            const correctedConfigJson = {
              ...configJson,
              suppress_sources: correctedSuppressSources
            };

            const versionedSource: any = {
              id: versionId,
              sourceName: versionName,
              sourceType: 'Version',
              subSourceType: 'Versioned',
              isVersioned: true,
              versionNumber: suppressVersions?.length + 1,
              versionLabel: versionName,
              sourceModule: 'Suppress',
              headers: [], // Suppress versions don't add new fields
              selectedHeaders: [],
              // Properties needed for version display and editing
              baseInputSources: baseInputSources,
              operationSources: operationSources,
              operationFields: operationFields,
              combinedHeaders: [],
              fieldMappings: configJson?.field_mappings || undefined,
              // Store workflow properties for payload reconstruction
              stepOrder: workflowItem?.stepOrder || 3,
              actionType: 'S',
              saveAsVersion: saveAsVersion || 1,
              versionName: versionName,
              internalStepOrder: workflowItem?.internalStepOrder,
              configJson: correctedConfigJson, // Use corrected configJson
              createdByModuleId: 'panel3', // Suppress module ID for filtering
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            };

            

            suppressVersions?.push(versionedSource);

            // Add to sourceNameToIdMap so this version can be referenced in later configs
            sourceNameToIdMap.set(versionName, versionId);

            // Extract field mappings if not already extracted (from first version/config)
            if (suppressFieldMappings?.length === 0 && configJson?.field_mappings && configJson.field_mappings?.length > 0) {
              suppressFieldMappings = configJson.field_mappings;
              
            }
          } else {
            // Suppress configuration - map source names to IDs
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name) || [];
            const inputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean); // Remove empty IDs

            // For suppress sources: map to proper IDs (preconfigured or custom)
            const suppressSources = (configJson?.suppress_sources?.map((src: any) => {
              const sourceName = src?.source_name;
              const sourceType = src?.source_type;

              // If it's a preconfigured source, look up its ID
              if (sourceType === 'preconfigured') {
                return mapPreconfiguredSourceNameToId(sourceName, 'suppress');
              }

              // Otherwise map to ID (for custom sources from inputSources)
              return mapSourceNameToId(sourceName);
            }) || []).filter(Boolean); // Remove empty IDs

            // Use existing workflow item ID if available (for edit mode), otherwise generate new one
            const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
            const configId = workflowItemId || `suppress_${Date.now()}_${index}`;
            const hasExistingId = !!workflowItemId;

            

            suppressConfigs?.push({
              id: configId,
              inputSources: inputSources, // Array of source IDs
              suppressOnFields: configJson?.suppress_on_fields || [],
              suppressSources: suppressSources, // Array of source IDs (preconfigured or custom)
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId, // Store original workflow item ID if exists
              stepOrder: workflowItem?.stepOrder ?? undefined, // Store stepOrder to identify which module this belongs to
              internalStepOrder: workflowItem?.internalStepOrder ?? undefined // Store internalStepOrder for ordering
            });

            // Extract field mappings if not already extracted (from first version/config)
            if (suppressFieldMappings?.length === 0 && configJson?.field_mappings && configJson.field_mappings?.length > 0) {
              suppressFieldMappings = configJson.field_mappings;
              
            }
          }
        } else if (actionType === 'M' && configJson) {
          // Check if this is a Match version or regular Match config
          if (saveAsVersion) {
            // Match Version
            const versionName = workflowItem?.versionName || `Match_Version_${index}`;

            

            // Extract input sources from configJson
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name || src) || [];
            const baseInputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean);

            // Extract match sources (operation sources) and correct source_type if needed
            const matchSourceNames = configJson?.match_sources?.map((src: any) => src?.source_name) || [];
            const operationSources = matchSourceNames
              .map((name: string) => {
                // Check if it's a preconfigured source
                const src = configJson.match_sources?.find((s: any) => s.source_name === name);
                if (src?.source_type === 'preconfigured') {
                  return mapPreconfiguredSourceNameToId(name, 'match');
                }
                return mapSourceNameToId(name);
              })
              .filter(Boolean);

            // Correct source_type in configJson.match_sources if needed
            // This ensures that input sources are marked as 'input' type even if they were incorrectly saved as 'preconfigured'
            const correctedMatchSources = (configJson?.match_sources || []).map((src: any) => {
              const sourceName = src?.source_name;
              const currentSourceType = src?.source_type;

              // Check if this source is actually an input source by checking if it exists in inputSourceNames
              const isInputSource = inputSourceNames?.includes(sourceName);

              // If it's an input source but marked as preconfigured, correct it
              if (isInputSource && currentSourceType === 'preconfigured') {
                return {
                  ...src,
                  source_type: 'input'
                };
              }

              // Otherwise keep the original source_type
              return src;
            });

            // Extract operation fields (match_keys for Match)
            const operationFields = configJson?.match_keys || [];

            // Extract add fields (fields being added from match sources)
            // Prefer expand_fields (new name), fallback to add_fields (old name for backward compatibility)
            const addFields = configJson?.expand_fields || configJson?.add_fields ||
                             configJson?.match_sources?.flatMap((src: any) => src?.fields || []) || [];

            // Get combined headers
            const combinedHeaders = addFields;

            // Use existing workflow item ID if available (for edit mode), otherwise generate new one
            const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
            const versionId = workflowItemId || `match_version_${Date.now()}_${index}`;
            const hasExistingId = !!workflowItemId;

            // Create corrected configJson with fixed source_type values
            const correctedConfigJson = {
              ...configJson,
              match_sources: correctedMatchSources
            };

            const versionedSource: any = {
              id: versionId,
              sourceName: versionName,
              sourceType: 'Version',
              subSourceType: 'Versioned',
              isVersioned: true,
              versionNumber: matchVersions?.length + 1,
              versionLabel: versionName,
              sourceModule: 'Match',
              headers: combinedHeaders,
              selectedHeaders: combinedHeaders,
              // Properties needed for version display and editing
              baseInputSources: baseInputSources,
              operationSources: operationSources,
              operationFields: operationFields,
              addFields: addFields,
              combinedHeaders: combinedHeaders,
              fieldMappings: configJson?.field_mappings || undefined,
              // Store workflow properties for payload reconstruction
              stepOrder: workflowItem?.stepOrder || 4,
              actionType: 'M',
              saveAsVersion: saveAsVersion || 1,
              versionName: versionName,
              internalStepOrder: workflowItem?.internalStepOrder,
              configJson: correctedConfigJson, // Use corrected configJson
              createdByModuleId: 'panel4', // Match module ID for filtering
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            };

            

            matchVersions?.push(versionedSource);

            // Add to sourceNameToIdMap so this version can be referenced in later configs
            sourceNameToIdMap.set(versionName, versionId);

            // Extract field mappings if not already extracted (from first version/config)
            if (matchFieldMappings?.length === 0 && configJson?.field_mappings && configJson.field_mappings?.length > 0) {
              matchFieldMappings = configJson.field_mappings;
              
            }
          } else {
            // Match configuration - map source names to IDs
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name) || [];
            const inputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean); // Remove empty IDs

            // For match sources: map to proper IDs (preconfigured or custom)
            const matchSources = (configJson?.match_sources?.map((src: any) => {
              const sourceName = src?.source_name;
              const sourceType = src?.source_type;

              // If it's a preconfigured source, look up its ID
              if (sourceType === 'preconfigured') {
                return mapPreconfiguredSourceNameToId(sourceName, 'match');
              }

              // Otherwise map to ID (for custom sources from inputSources)
              return mapSourceNameToId(sourceName);
            }) || []).filter(Boolean); // Remove empty IDs

            // Use existing workflow item ID if available (for edit mode), otherwise generate new one
            const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
            const configId = workflowItemId || `match_${Date.now()}_${index}`;
            const hasExistingId = !!workflowItemId;

            

            // Extract add fields (fields to add from match sources)
            // Prefer expand_fields (new name), fallback to add_fields (old name for backward compatibility)
            const configAddFields = configJson?.expand_fields || configJson?.add_fields ||
                                   configJson?.match_sources?.flatMap((src: any) => src?.fields || []) || [];

            matchConfigs?.push({
              id: configId,
              inputSources: inputSources, // Array of source IDs
              matchOnFields: configJson?.match_keys || [],
              matchSources: matchSources, // Array of source IDs (preconfigured or custom)
              // Read is_expand (new name), fallback to expand (old name)
              expand: configJson?.is_expand !== undefined ? configJson.is_expand : (configJson?.expand !== undefined ? configJson.expand : false),
              // Convert match_type: 'F' ? 'full', 'A' ? 'any' (for internal state)
              matchType: configJson?.match_type === 'A' ? 'any' : 'full',
              addFields: configAddFields, // Fields to add from match sources
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId, // Store original workflow item ID if exists
              stepOrder: workflowItem?.stepOrder ?? undefined, // Store stepOrder to identify which module this belongs to
              internalStepOrder: workflowItem?.internalStepOrder ?? undefined // Store internalStepOrder for ordering
            });

            // Extract field mappings if not already extracted (from first version/config)
            if (matchFieldMappings?.length === 0 && configJson?.field_mappings && configJson.field_mappings?.length > 0) {
              matchFieldMappings = configJson.field_mappings;
              
            }
          }
        }
      });

      if (inputVersions?.length > 0) {
        transformedData.inputVersions = inputVersions;
      }
      if (appendConfigs?.length > 0) {
        transformedData.appendConfigs = appendConfigs;
      }
      if (appendVersions?.length > 0) {
        transformedData.appendVersions = appendVersions;
      }
      if (suppressConfigs?.length > 0) {
        transformedData.suppressConfigs = suppressConfigs;
      }
      if (suppressVersions?.length > 0) {
        transformedData.suppressVersions = suppressVersions;
      }
      if (matchConfigs?.length > 0) {
        transformedData.matchConfigs = matchConfigs;
      }
      if (matchVersions?.length > 0) {
        transformedData.matchVersions = matchVersions;
      }

      // Transform module-level field mappings from API format to UI format
      const transformFieldMappingsForUI = (apiFieldMappings: any[]): any[] => {
        if (!apiFieldMappings || apiFieldMappings?.length === 0) return [];

        return apiFieldMappings?.map((mapping: any, index: number) => {
          const fieldName = mapping?.field_name || '';
          const sourceMappings = mapping?.source_mappings || '';

          // Parse source_mappings: "Source1.Field1|Source2.Field2|Source3.Field3"
          const mappingParts = sourceMappings?.split('|').filter(Boolean);

          // Extract source names and fields, then map to IDs
          const selectedSources: string[] = [];
          const selectedColumns: string[] = [];

          mappingParts?.forEach((part: string) => {
            // Format: "SourceName.FieldName"
            const [sourceName, fieldName] = part?.split('.');
            if (!sourceName || !fieldName) return;

            // Map source name to ID using sourceNameToIdMap
            const sourceId = sourceNameToIdMap.get(sourceName?.trim()) || mapSourceNameToId(sourceName?.trim());
            if (!sourceId) {
              
              return;
            }

            // Add to selectedSources (avoid duplicates)
            if (!selectedSources?.includes(sourceId)) {
              selectedSources?.push(sourceId);
            }

            // Add to selectedColumns in format "sourceId::fieldName"
            const columnValue = `${sourceId}::${fieldName?.trim()}`;
            if (!selectedColumns?.includes(columnValue)) {
              selectedColumns?.push(columnValue);
            }
          });

          return {
            id: `mapping_${Date.now()}_${index}`,
            fieldName: fieldName,
            selectedSources: selectedSources,
            selectedColumns: selectedColumns
          };
        }).filter(mapping => mapping.selectedSources?.length > 0); // Filter out mappings with no valid sources
      };

      // Store module-level field mappings (transformed to UI format) for the primary panel
      if (appendFieldMappings?.length > 0) {
        transformedData.appendModuleFieldMappings = transformFieldMappingsForUI(appendFieldMappings);

      }
      if (matchFieldMappings?.length > 0) {
        transformedData.matchModuleFieldMappings = transformFieldMappingsForUI(matchFieldMappings);

      }
      if (suppressFieldMappings?.length > 0) {
        transformedData.suppressModuleFieldMappings = transformFieldMappingsForUI(suppressFieldMappings);

      }
    }

    // Transform stats configurations
    if (apiData?.stats && Array.isArray(apiData.stats)) {

      transformedData.statsConfigs = apiData.stats?.map((stat: any, index: number) => {

        // Stats module uses source NAMES directly, not IDs
        const inputSourceNames = stat?.input_sources?.map((src: any) => src?.source_name) || [];


        // Transform generate_counts_config to CountOnField array
        let countsOn: CountOnField[] = [];

        // Try new nested format first: generate_counts_config.counts
        if (stat?.generate_counts_config && stat.generate_counts_config?.counts && Array.isArray(stat.generate_counts_config.counts)) {
          countsOn = stat.generate_counts_config.counts?.map((item: any) => ({
            field: item?.field || '',
            isDistinct: item?.is_distinct !== undefined ? item.is_distinct : false
          }));
        }
        // Fallback to old flat format: generate_counts_on
        else if (stat?.generate_counts_on) {
          if (Array.isArray(stat.generate_counts_on)) {
            // Check if it's array of objects or array of strings
            if (stat.generate_counts_on?.length > 0 && typeof stat.generate_counts_on[0] === 'object') {
              // Format: array of {field, is_distinct}
              countsOn = stat.generate_counts_on?.map((item: any) => ({
                field: item?.field || '',
                isDistinct: item?.is_distinct !== undefined ? item.is_distinct : false
              }));
            } else {
              // Old format: array of strings - convert to new format with default distinct = false
              countsOn = stat.generate_counts_on?.map((field: string) => ({
                field: field,
                isDistinct: stat?.is_distinct !== undefined ? stat.is_distinct : false
              }));
            }
          }
        }

        // Use existing stat ID/IDs if available (for edit mode), otherwise generate new one
        // API can return either `id` (singular) or `ids` (array) - handle both cases
        const existingStatId = stat?.id;
        const existingStatIds = stat?.ids; // Array of IDs from API
        const statId = existingStatId || (existingStatIds && existingStatIds.length > 0 ? existingStatIds[0] : `stats_${Date.now()}_${index}`);
        const hasExistingId = !!(existingStatId || (existingStatIds && existingStatIds.length > 0));



        // Map source names to IDs (same pattern as output configs)
        const inputSources = inputSourceNames?.map((name: string) => mapSourceNameToId(name));


        const statsConfig: any = {
          inputSources: inputSources, // Array of source IDs
          countsOn: countsOn,
          breakdownBy: stat?.breakdown_by || [],
          // Flag to indicate if this has an existing ID from API (for update payload)
          hasExistingId: hasExistingId
        };

        // Preserve the ID format from API - use ids array if available, otherwise single id
        if (existingStatIds && existingStatIds.length > 0) {
          statsConfig.ids = existingStatIds; // Preserve array format
        } else if (existingStatId) {
          statsConfig.id = existingStatId; // Single ID format
        } else {
          statsConfig.id = statId; // Generated ID for new stats
        }
        return statsConfig;
      });
    }

    // Transform output configurations
    if (apiData?.output && Array.isArray(apiData.output)) {
      transformedData.outputConfigs = apiData.output?.map((output: any, index: number) => {
        // Handle new format with config wrapper
        const config = output?.config || output; // Fallback to output directly if config doesn't exist

        // Extract source names from input_sources
        let inputSourceNames: string[] = [];
        if (config?.input_sources && Array.isArray(config.input_sources)) {
          // Check if input_sources are objects with source_name or just strings
          inputSourceNames = config.input_sources?.map((src: any) => {
            if (typeof src === 'string') return src;
            if (src?.source_name) return src.source_name;
            return '';
          }).filter(Boolean);
        }

        // Map source names to IDs
        const inputSources = inputSourceNames?.map((name: string) => mapSourceNameToId(name));

        // Determine destination type and details
        const destinationType = output?.destinationType || 'preconfigured';
        const isCustomDestination = destinationType === 'custom';
        const destinationName = output?.destinationName || null;
        const destinationConfig = output?.destinationConfig || null;

        // Use existing output ID if available (for edit mode), otherwise generate new one
        const existingOutputId = output?.id;
        const outputId = existingOutputId || `output_${Date.now()}_${index}`;
        const hasExistingId = !!existingOutputId;

        return {
          id: outputId,
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
          destinations: [], // Legacy field
          // Flag to indicate if this has an existing ID from API (for update payload)
          hasExistingId: hasExistingId
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

    // Log transformation summary
    
    
    
    if (transformedData.inputSources?.length > 0) {
      transformedData.inputSources?.forEach((src: any, i: number) => {
        
      });
    }
    
    if (transformedData.customSources?.length > 0) {
      const appendCustomSources = transformedData.customSources?.filter((s: any) => s.createdByModuleId === 'panel2');
      const matchCustomSources = transformedData.customSources?.filter((s: any) => s.createdByModuleId === 'panel4');
      const suppressCustomSources = transformedData.customSources?.filter((s: any) => s.createdByModuleId === 'panel3');

      
      appendCustomSources?.forEach((src: any, i: number) => {
        
      });

      
      matchCustomSources?.forEach((src: any, i: number) => {
        
      });

      
      suppressCustomSources?.forEach((src: any, i: number) => {
        
      });
    }
    
    if (transformedData.inputVersions?.length > 0) {
      transformedData.inputVersions?.forEach((v: any, i: number) => {
        
      });
    }
    
    if (transformedData.appendConfigs?.length > 0) {
      transformedData.appendConfigs?.forEach((cfg: any, i: number) => {
        
      });
    }
    
    if (transformedData.appendVersions?.length > 0) {
      transformedData.appendVersions?.forEach((v: any, i: number) => {
        
      });
    }
    
    if (transformedData.suppressConfigs?.length > 0) {
      transformedData.suppressConfigs?.forEach((cfg: any, i: number) => {
        
      });
    }
    
    if (transformedData.suppressVersions?.length > 0) {
      transformedData.suppressVersions?.forEach((v: any, i: number) => {
        
      });
    }
    
    if (transformedData.matchConfigs?.length > 0) {
      transformedData.matchConfigs?.forEach((cfg: any, i: number) => {
        
      });
    }
    
    if (transformedData.matchVersions?.length > 0) {
      transformedData.matchVersions?.forEach((v: any, i: number) => {
        
      });
    }
    
    
    
    
    
    
    

    // Detect how many duplicate modules were created based on stepOrder
    // Group workflow items by actionType and count unique stepOrders
    if (apiData?.workflow && Array.isArray(apiData?.workflow)) {
      const appendStepOrders = new Set<number>();
      const matchStepOrders = new Set<number>();
      const suppressStepOrders = new Set<number>();

      // Track module order from workflow
      // Map of stepOrder -> module info
      const moduleOrderMap = new Map<number, { type: 'A' | 'M' | 'S', moduleId?: string }>();

      apiData.workflow?.forEach((item: any, index: number) => {
        const actionType = item?.actionType;
        const stepOrder = item?.stepOrder;

        if (actionType === 'A' && stepOrder) {
          appendStepOrders.add(stepOrder);
          if (!moduleOrderMap?.has(stepOrder)) {
            moduleOrderMap?.set(stepOrder, { type: 'A' });
          }
        } else if (actionType === 'M' && stepOrder) {
          matchStepOrders.add(stepOrder);
          if (!moduleOrderMap?.has(stepOrder)) {
            moduleOrderMap?.set(stepOrder, { type: 'M' });
          }
        } else if (actionType === 'S' && stepOrder) {
          suppressStepOrders.add(stepOrder);
          if (!moduleOrderMap?.has(stepOrder)) {
            moduleOrderMap?.set(stepOrder, { type: 'S' });
          }
        }
      });

      // Convert map to ordered array of module types (sorted by stepOrder)
      const moduleOrder = Array?.from(moduleOrderMap?.entries())
        ?.sort((a, b) => a[0] - b[0]) // Sort by stepOrder
        ?.map(([stepOrder, info]) => ({ stepOrder, type: info?.type }));

      // CRITICAL: Detect empty modules from stepOrder gaps
      // stepOrder is the ACTUAL step number in the UI
      // Draggable modules always start at stepOrder 2 (after Input at stepOrder 1)
      // If stepOrders are 3, 7, 9, we need to fill positions 2, 4, 5, 6, 8 with empty modules
      const allStepOrders = [...appendStepOrders, ...matchStepOrders, ...suppressStepOrders];
      const minStepOrder = 2; // Draggable modules always start at step 2
      const maxStepOrder = allStepOrders?.length > 0 ? Math.max(...allStepOrders) : 2;

      // Fill in ALL positions from step 2 to maxStepOrder, marking empty ones
      const completeModuleOrder: Array<{ stepOrder: number; type: 'A' | 'M' | 'S'; isEmpty?: boolean }> = [];

      for (let step = minStepOrder; step <= maxStepOrder; step++) {
        if (moduleOrderMap?.has(step)) {
          // Module with data exists at this step
          const moduleInfo = moduleOrderMap?.get(step);
          completeModuleOrder?.push({ stepOrder: step, type: moduleInfo?.type || 'A' });
        } else {
          // Empty module - default to Append type
          completeModuleOrder?.push({ stepOrder: step, type: 'A', isEmpty: true });
        }
      }


      // Count modules by type (including empty ones)
      let totalAppendCount = 0;
      let totalMatchCount = 0;
      let totalSuppressCount = 0;

      completeModuleOrder?.forEach(item => {
        if (item?.type === 'A') totalAppendCount++;
        else if (item?.type === 'M') totalMatchCount++;
        else if (item?.type === 'S') totalSuppressCount++;
      });

      // IMPORTANT: Always ensure at least 1 of each required module (Append, Match, Suppress)
      transformedData.moduleDuplicationInfo = {
        appendModuleCount: Math.max(totalAppendCount, 1),
        matchModuleCount: Math.max(totalMatchCount, 1),
        suppressModuleCount: Math.max(totalSuppressCount, 1)
      };

      // Store COMPLETE module order (including empty slots) for restoration
      transformedData.moduleOrder = completeModuleOrder;

      // Create a mapping from stepOrder to moduleId based on completeModuleOrder
      // This assigns moduleIds in the order they appear, including empty modules
      const stepOrderToModuleId = new Map<number, string>();
      let appendInstanceCounter = 0;
      let matchInstanceCounter = 0;
      let suppressInstanceCounter = 0;

      completeModuleOrder?.forEach((item) => {
        const stepOrder = item?.stepOrder;
        const type = item?.type;
        let moduleId: string;

        if (type === 'A') {
          moduleId = appendInstanceCounter === 0 ? 'panel2' : `panel2_${appendInstanceCounter + 1}`;
          appendInstanceCounter++;
        } else if (type === 'M') {
          moduleId = matchInstanceCounter === 0 ? 'panel4' : `panel4_${matchInstanceCounter + 1}`;
          matchInstanceCounter++;
        } else if (type === 'S') {
          moduleId = suppressInstanceCounter === 0 ? 'panel3' : `panel3_${suppressInstanceCounter + 1}`;
          suppressInstanceCounter++;
        } else {
          moduleId = 'panel2'; // Fallback
        }

        stepOrderToModuleId?.set(stepOrder, moduleId);
      });

      // Now update configs and versions with createdByModuleId
      // Access them from transformedData since they're not in local scope

      transformedData?.appendConfigs?.forEach((cfg: any) => {
        const moduleId = stepOrderToModuleId?.get(cfg?.stepOrder);
        if (moduleId) {
          cfg.createdByModuleId = moduleId;
        }
      });

      transformedData?.appendVersions?.forEach((v: any) => {
        const moduleId = stepOrderToModuleId?.get(v?.stepOrder);
        if (moduleId) {
          v.createdByModuleId = moduleId;
        }
      });

      transformedData?.suppressConfigs?.forEach((cfg: any) => {
        const moduleId = stepOrderToModuleId?.get(cfg?.stepOrder);
        if (moduleId) {
          cfg.createdByModuleId = moduleId;
        }
      });

      transformedData?.suppressVersions?.forEach((v: any) => {
        const moduleId = stepOrderToModuleId?.get(v?.stepOrder);
        if (moduleId) {
          v.createdByModuleId = moduleId;
        }
      });

      transformedData?.matchConfigs?.forEach((cfg: any) => {
        const moduleId = stepOrderToModuleId?.get(cfg?.stepOrder);
        if (moduleId) {
          cfg.createdByModuleId = moduleId;
        }
      });

      transformedData?.matchVersions?.forEach((v: any) => {
        const moduleId = stepOrderToModuleId?.get(v?.stepOrder);
        if (moduleId) {
          v.createdByModuleId = moduleId;
        }
      });

    }

    

    return transformedData;
  };

  // Load request data when in edit mode or duplicate mode
  useEffect(() => {
    const loadEditRequest = async () => {
      const idToLoad = requestId || duplicateId;

      if (!idToLoad) {

        return;
      }

      // Wait for apiSources to load before transforming edit request data
      // This ensures preconfigured table IDs can be properly resolved
      if (sourcesLoading) {
        return;
      }

      // Prevent duplicate API calls (especially in React StrictMode)
      if (loadedRequestIdRef.current === idToLoad) {
        return;
      }

      const isDuplicateMode = !!duplicateId && !requestId;

      
      // Edit/Duplicate mode: Fetch request data from API
      try {
        // Mark this ID as being loaded
        loadedRequestIdRef.current = idToLoad;

        setEditRequestLoading(true);
        setEditRequestError('');

        const response = await getEditRequest(parseInt(idToLoad, 10));

        let dataToLoad: any = null;

        // Check if response has the expected structure (direct data format)
        if (response && (response as any)?.requestDetails && (response as any)?.inputSources) {
          // Response is in direct format - transform it
          dataToLoad = transformApiDataToInternalFormat(response, apiSources);
        } else if (response && (response as any)?.success && (response as any)?.data) {
          // Handle wrapped format if API sometimes returns it
          dataToLoad = transformApiDataToInternalFormat((response as any)?.data, apiSources);
          dataToLoad = transformApiDataToInternalFormat((response as any)?.data, apiSources);
        } else {
          // API failed or returned no data - show error
          const errorMsg = `Failed to load request data: ${(response as any)?.message || 'Unknown error. Please try again.'}`;
          setEditRequestLoading(false);
          setEditRequestError(errorMsg);

          // Redirect after showing error for 3 seconds
          setTimeout(() => {
            navigate('/dataPullReports');
          }, 3000);
          return;
        }

        // Populate form fields with the transformed data
        if (dataToLoad) {

          // Load request name (append _duplicate suffix if in duplicate mode)
          if (dataToLoad?.requestName) {
            const name = isDuplicateMode ? `${dataToLoad.requestName}_duplicate` : dataToLoad.requestName;
            setRequestName(name);
          }

          // Load requestDetails ID (for update payload) - NOT in duplicate mode
          if (!isDuplicateMode && dataToLoad?.requestDetailsId) {
            setRequestDetailsId(dataToLoad.requestDetailsId);
            setRequestDetailsId(dataToLoad.requestDetailsId);
          }

          // Load input sources (combine regular sources and Input module versions)
          // Input versions should be added to inputSources array, not versionedSources
          const allInputSources = [
            ...(dataToLoad?.inputSources || []),
            ...(dataToLoad?.inputVersions || [])
          ];

          if (allInputSources?.length > 0) {
            setInputSources(allInputSources);
          }

          if (dataToLoad?.customSources && Array.isArray(dataToLoad.customSources)) {
            setSharedCustomSources(dataToLoad.customSources);

            // For Self sources, add their generated columns to the input sources
            dataToLoad.customSources?.forEach((customSource: any) => {
              if (customSource?.sourceType === 'Self' && customSource?.selfConfig) {
                const { input_source_names, generated_column } = customSource.selfConfig;

                if (generated_column && input_source_names && input_source_names?.length > 0) {
                  // IMPORTANT: Do NOT modify input source headers
                  // Generated columns from self-append sources do not affect original input sources
 }
              }
            });
          }

          const allVersionedSources = [
            ...(dataToLoad?.appendVersions || []),
            ...(dataToLoad?.matchVersions || []),
            ...(dataToLoad?.suppressVersions || [])
          ];

          if (allVersionedSources?.length > 0) {
            setVersionedSources(allVersionedSources);
          }

          if (dataToLoad?.appendConfigs && Array.isArray(dataToLoad?.appendConfigs) && dataToLoad?.appendConfigs?.length > 0) {
            setInitialAppendConfigs(dataToLoad?.appendConfigs);
          }
           

          if (dataToLoad?.suppressConfigs && Array.isArray(dataToLoad?.suppressConfigs) && dataToLoad?.suppressConfigs?.length > 0) {
            setInitialSuppressConfigs(dataToLoad?.suppressConfigs);
          }

          if (dataToLoad?.matchConfigs && Array.isArray(dataToLoad?.matchConfigs) && dataToLoad?.matchConfigs?.length > 0) {
            setInitialMatchConfigs(dataToLoad?.matchConfigs);

          }

          // Load module-level field mappings (assign to default panel IDs for backward compatibility)


          if (dataToLoad?.appendModuleFieldMappings && Array.isArray(dataToLoad?.appendModuleFieldMappings)) {
            setAppendModuleFieldMappings({ panel2: dataToLoad?.appendModuleFieldMappings });
          }
          if (dataToLoad?.matchModuleFieldMappings && Array.isArray(dataToLoad?.matchModuleFieldMappings)) {
            setMatchModuleFieldMappings({ panel4: dataToLoad?.matchModuleFieldMappings });
          }
          if (dataToLoad?.suppressModuleFieldMappings && Array.isArray(dataToLoad?.suppressModuleFieldMappings)) {
            setSuppressModuleFieldMappings({ panel3: dataToLoad?.suppressModuleFieldMappings });
          }

          // Load output configurations
          if (dataToLoad?.outputConfigs && Array.isArray(dataToLoad.outputConfigs) && dataToLoad.outputConfigs?.length > 0) {
            setInitialOutputConfigs(dataToLoad.outputConfigs);
          }

          // Load stats configurations
          if (dataToLoad?.statsConfigs && Array.isArray(dataToLoad.statsConfigs) && dataToLoad.statsConfigs?.length > 0) {
            setStatsConfigurations(dataToLoad.statsConfigs);
          }



          // Load schedule configuration
          if (dataToLoad?.scheduleConfig) {
            const schedConfig = dataToLoad.scheduleConfig;
            setScheduleType(schedConfig?.scheduleType || 'adhoc');
            setScheduledDateTime(schedConfig?.scheduledDateTime || '');
            setNotificationWhen(schedConfig?.emailNotification || 'standard');
            if (schedConfig?.notificationEmails && Array.isArray(schedConfig.notificationEmails) && schedConfig.notificationEmails?.length > 0) {
              setRecipientEmail(schedConfig.notificationEmails?.join(', ') || '');
            }
          }

          // Restore duplicate modules based on moduleDuplicationInfo

          if (dataToLoad?.moduleDuplicationInfo) {
            const duplicationInfo = dataToLoad?.moduleDuplicationInfo;
            const moduleOrder = dataToLoad?.moduleOrder;

            // Get the base module definitions
            const baseModules = createModuleDefinitions();

            const restoredModules = [...baseModules];

            // Create duplicate Append modules
            if (duplicationInfo?.appendModuleCount > 1) {
              const appendModule = baseModules?.find(m => m?.id === 'panel2');
              if (appendModule) {
                for (let i = 2; i <= duplicationInfo?.appendModuleCount; i++) {
                  const newModule = {
                    id: `panel2_${i}`,
                    title: `Append Module ${i}`,
                    label: `Append Module ${i}`,
                    description: appendModule?.description,
                    icon: appendModule?.icon,
                    color: appendModule?.color,
                    isDraggable: appendModule?.isDraggable,
                  };
                  restoredModules?.splice(restoredModules?.findIndex(m => m?.id === 'panel2') + (i - 1), 0, newModule);
                }
                setModuleCounter(prev => ({ ...prev, Append: duplicationInfo?.appendModuleCount }));
              }
            }

            // Create duplicate Suppress modules
            if (duplicationInfo?.suppressModuleCount > 1) {
              const suppressModule = baseModules?.find(m => m?.id === 'panel3');
              if (suppressModule) {
                for (let i = 2; i <= duplicationInfo?.suppressModuleCount; i++) {
                  const newModule = {
                    id: `panel3_${i}`,
                    title: `Suppression Module ${i}`,
                    label: `Suppression Module ${i}`,
                    description: suppressModule?.description,
                    icon: suppressModule?.icon,
                    color: suppressModule?.color,
                    isDraggable: suppressModule?.isDraggable,
                  };
                  restoredModules?.splice(restoredModules?.findIndex(m => m?.id === 'panel3') + (i - 1), 0, newModule);
                }
                setModuleCounter(prev => ({ ...prev, Suppression: duplicationInfo?.suppressModuleCount }));
              }
            }

            // Create duplicate Match modules
            if (duplicationInfo?.matchModuleCount > 1) {
              const matchModule = baseModules?.find(m => m?.id === 'panel4');
              if (matchModule) {
                for (let i = 2; i <= duplicationInfo?.matchModuleCount; i++) {
                  const newModule = {
                    id: `panel4_${i}`,
                    title: `Match Module ${i}`,
                    label: `Match Module ${i}`,
                    description: matchModule?.description,
                    icon: matchModule?.icon,
                    color: matchModule?.color,
                    isDraggable: matchModule?.isDraggable,
                  };
                  restoredModules?.splice(restoredModules?.findIndex(m => m?.id === 'panel4') + (i - 1), 0, newModule);
                }
                setModuleCounter(prev => ({ ...prev, Match: duplicationInfo?.matchModuleCount }));
              }
            }

            // Now reorder the modules based on moduleOrder
            if (moduleOrder && moduleOrder?.length > 0) {

              // Extract the draggable modules (panel2, panel3, panel4) from restoredModules
              const inputModule = restoredModules?.find(m => m?.id === 'panel1');
              const statsModule = restoredModules?.find(m => m?.id === 'panel5');
              const outputModule = restoredModules?.find(m => m?.id === 'panel6');
              const scheduleModule = restoredModules?.find(m => m?.id === 'panel7');

              const appendModules = restoredModules?.filter(m => m?.id === 'panel2' || m?.id?.startsWith('panel2_'));
              const suppressModules = restoredModules?.filter(m => m?.id === 'panel3' || m?.id?.startsWith('panel3_'));
              const matchModules = restoredModules?.filter(m => m?.id === 'panel4' || m?.id?.startsWith('panel4_'));



              // Build the new order
              const reorderedModules: any[] = [];

              // Add Input module first (always position 0)
              if (inputModule) reorderedModules?.push(inputModule);

              // Add draggable modules in the order specified by moduleOrder
              // moduleOrder now includes ALL modules (with data and empty placeholders)
              let appendIndex = 0;
              let suppressIndex = 0;
              let matchIndex = 0;

              // Simply follow the moduleOrder which already includes empty slots
              moduleOrder?.forEach((orderItem: any, idx: number) => {
                const isEmpty = orderItem?.isEmpty || false;

                if (orderItem?.type === 'A' && appendIndex < appendModules?.length) {
                  const moduleToAdd = appendModules[appendIndex];
                  reorderedModules?.push(moduleToAdd);
                  appendIndex++;
                } else if (orderItem?.type === 'M' && matchIndex < matchModules?.length) {
                  const moduleToAdd = matchModules[matchIndex];
                  reorderedModules?.push(moduleToAdd);
                  matchIndex++;
                } else if (orderItem?.type === 'S' && suppressIndex < suppressModules?.length) {
                  const moduleToAdd = suppressModules[suppressIndex];
                  reorderedModules?.push(moduleToAdd);
                  suppressIndex++;
                }
              });

              // Safety check: Ensure at least one of each required module type exists
              // This handles edge cases where moduleOrder might be malformed
              if (appendIndex === 0 && appendModules?.length > 0) {
                const moduleToAdd = appendModules[0];
                reorderedModules?.push(moduleToAdd);
                appendIndex++;
              }
              if (suppressIndex === 0 && suppressModules?.length > 0) {
                const moduleToAdd = suppressModules[0];
                reorderedModules?.push(moduleToAdd);
                suppressIndex++;
              }
              if (matchIndex === 0 && matchModules?.length > 0) {
                const moduleToAdd = matchModules[0];
                reorderedModules?.push(moduleToAdd);
                matchIndex++;
              }

              // Add fixed modules at the end
              if (statsModule) reorderedModules?.push(statsModule);
              if (outputModule) reorderedModules?.push(outputModule);
              if (scheduleModule) reorderedModules?.push(scheduleModule);

              setModules(reorderedModules);
            } else {
              // Even without moduleOrder, we still need to apply duplicates
              if (restoredModules?.length > baseModules?.length) {
                setModules(restoredModules);
              } else {
                
              }
            }
          }

          // Clear validation errors
          setRequestNameError('');
          setRecipientEmailError('');
          setScheduledDateTimeError('');


        }

      } catch (error: any) {

        

        // Show error message
        let errorMessage = 'Failed to load request data. ';
        if (error?.message) {
          errorMessage += error?.message;
        } else if (error?.response?.data?.message) {
          errorMessage += error?.response?.data?.message;
        } else {
          errorMessage += 'Please try again later.';
        }

        setEditRequestError(errorMessage);

        // Redirect after showing error for 3 seconds
        setTimeout(() => {
          navigate('/dataPullReports');
        }, 3000);
      } finally {
        // Always clear loading state
        setEditRequestLoading(false);
      }
    };

    loadEditRequest();
  }, [requestId, duplicateId, sourcesLoading, apiSources]);

  // Mark initial configs as consumed after they have been loaded
  // This prevents them from being re-passed to child modules on subsequent renders
  useEffect(() => {
    if (initialAppendConfigs?.length > 0 || initialSuppressConfigs?.length > 0 || initialMatchConfigs?.length > 0) {

      initialConfigsConsumedRef.current = true;
    }
  }, [initialAppendConfigs, initialSuppressConfigs, initialMatchConfigs]);

  const handleUpdateVersionCounter = (module: 'Input' | 'Match' | 'Append' | 'Suppress', increment: number) => {
    setVersionCounters(prev => ({
      ...prev,
      [module]: prev[module] + increment
    }));
  };

  const handleUpdateVersionName = (versionId: string, newName: string) => {
    // Update versioned sources - IMPORTANT: Update all three name properties (versionName, versionLabel, sourceName)
    // to ensure the renamed name is used in the payload transformation
    setVersionedSources(prev => prev?.map(version =>
      version?.id === versionId ? {
        ...version,
        versionName: newName,    // Used in payload transformation (checked first)
        versionLabel: newName,   // Display label
        sourceName: newName      // Source name used in various contexts
      } : version
    ));

    // Update input sources if the version exists there
    setInputSources(prev => prev?.map(source =>
      source?.id === versionId ? {
        ...source,
        versionName: newName,  // Also update versionName if it exists
        sourceName: newName
      } : source
    ));
  };

  const handleUpdateVersion = (versionId: string, updatedVersion: any) => {

    // Calculate combinedHeaders outside of state updates so we can reuse it
    let recalculatedCombinedHeaders: string[] = [];

    // Update versioned sources with the new configuration
    setVersionedSources(prev => prev?.map(version => {
      if (version?.id !== versionId) return version;

      // Helper to get source name
      const getSourceName = (sourceId: string): string => {
        const source = allAvailableInputSources?.find(s => s?.id === sourceId);
        if (source) return source.sourceName;

        // Check predefined sources
        if (sourceId?.startsWith('match_')) {
          const tableId = parseInt(sourceId?.replace('match_', ''));
          const matchTable = apiSources?.dbSource?.preconfiguredTables?.match?.find(
            (table: any) => table?.tableId === tableId
          );
          if (matchTable) return matchTable.tableName;
        }

        return sourceId;
      };

      // Helper to determine source type
      const getSourceType = (sourceId: string, moduleType: string): string => {
        // Check if it's a versioned source
        const versionedSource = allAvailableInputSources?.find(s => s?.id === sourceId && s?.isVersioned);
        if (versionedSource) return 'input';

        // Check if it's a non-versioned input source
        const inputSource = allAvailableInputSources?.find(s => s?.id === sourceId);
        if (inputSource && !inputSource?.isVersioned) {
          const createdByModuleId = (inputSource as any)?.createdByModuleId;
          const createdByModuleIdStr = String(createdByModuleId || '');
          if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
            return 'input';
          }
        }

        // Check if it's a custom source (Self)
        const customSource = sharedCustomSources?.find(s => s?.id === sourceId);
        if (customSource?.sourceType === 'Self') {
          return moduleType === 'Match' ? 'self_match' : 'preconfigured';
        }

        return 'preconfigured';
      };

      // Rebuild match_sources if operationSources changed
      let newMatchSources = (version as any).configJson?.match_sources || [];
      const sourceModule = (version as any).sourceModule;

      if (sourceModule === 'Match' && updatedVersion?.operationSources) {
        // Rebuild match_sources array based on new operationSources
        // Note: fields should NOT be included in match_sources items
        // Note: Match module does not use priority
        newMatchSources = updatedVersion?.operationSources?.map((sourceId: string) => ({
          source_type: getSourceType(sourceId, 'Match'),
          source_name: resolveSourceName(sourceId) // FIXED: Use resolveSourceName to handle custom sources
        })) || [];
      }

      // Recalculate combinedHeaders to include:
      // 1. Base input source headers
      // 2. Fields from append/match sources
      // 3. Generated columns from self-sources (custom append sources)
      const recalculateCombinedHeaders = (): string[] => {
        const headersSet = new Set<string>();

        // Add headers from base input sources
        const baseSourceIds = updatedVersion?.baseInputSources || version?.baseInputSources || [];
        baseSourceIds?.forEach((sourceId: string) => {
          const source = allAvailableInputSources?.find(s => s?.id === sourceId);
          if (source) {
            // For versioned sources, use their combinedHeaders
            if (source?.isVersioned && (source as any)?.combinedHeaders) {
              (source as any)?.combinedHeaders?.forEach((h: string) => headersSet.add(h));
            } else {
              // For regular sources, use their headers
              const headers = source?.selectedHeaders || source?.headers || [];
              headers?.forEach((h: string) => headersSet.add(h));
            }
          }
        });

        // Add append fields (fields being appended from operation sources)
        if (sourceModule === 'Append') {
          const appendFields = updatedVersion?.appendFields || version?.appendFields || [];
          appendFields?.forEach((field: string) => headersSet.add(field));
        }

        // Add generated columns from self-sources (custom append sources)
        const operationSourceIds = updatedVersion?.operationSources || version?.operationSources || [];
        operationSourceIds?.forEach((sourceId: string) => {
          const source = allAvailableInputSources?.find(s => s?.id === sourceId);
          if (source && (source as any)?.isSelfSource && (source as any)?.selfConfig?.generated_column) {
            // Self-source: add the generated column
            headersSet.add((source as any).selfConfig.generated_column);
          } else if (source && !source?.isVersioned) {
            // Regular source: headers already included via appendFields
            // Do nothing - fields are selected in appendFields
          } else if (source?.isVersioned && (source as any)?.combinedHeaders) {
            // Versioned source used as operation source: its fields are selected in appendFields
            // Do nothing - fields are selected in appendFields
          }
        });

        // For Match module, add match fields if any
        if (sourceModule === 'Match') {
          const addFields = updatedVersion?.addFields || version?.addFields || [];
          addFields?.forEach((field: string) => headersSet.add(field));
        }

        return Array.from(headersSet);
      };

      const updatedCombinedHeaders = recalculateCombinedHeaders();

      // Store in outer scope for use in inputSources update
      recalculatedCombinedHeaders = updatedCombinedHeaders;

      return {
        ...version,
        ...updatedVersion,
        // Ensure critical properties are preserved
        id: versionId,
        isVersioned: true as const,
        // Update combinedHeaders with recalculated values
        combinedHeaders: updatedCombinedHeaders,
        headers: updatedCombinedHeaders,
        selectedHeaders: updatedCombinedHeaders,
        // Update configJson with the latest values
        configJson: {
          ...(version as any).configJson,
          ...updatedVersion.configJson,
          // Update match_keys at root level (used by both Append and Match modules)
          // For Match module, addFields are the Match Keys selected by user
          // For Append module, operationFields are the append on fields
          match_keys: sourceModule === 'Match'
            ? (updatedVersion.addFields !== undefined
                ? updatedVersion.addFields
                : (updatedVersion.configJson?.match_keys || (version as any).configJson?.match_keys || []))
            : (updatedVersion.operationFields !== undefined
                ? updatedVersion.operationFields
                : (updatedVersion.configJson?.match_keys || (version as any).configJson?.match_keys || [])),
          // Update fields within each append_sources item (for Append module)
          append_sources: (version as any).configJson?.append_sources?.map((appendSource: any) => ({
            ...appendSource,
            // Set fields from the appendFields array (all sources get the same fields)
            fields: updatedVersion.appendFields || updatedVersion.configJson?.append_fields || []
          })) || [],
          // Use rebuilt match_sources (without fields property, NO add_fields for Match)
          match_sources: newMatchSources
        }
      };
    }));

    // Also update input sources if the version exists there
    setInputSources(prev => prev?.map(source => {
      if (source?.id !== versionId) return source;

      return {
        ...source,
        ...updatedVersion,
        id: versionId,
        // Use the recalculated combinedHeaders from the version update above
        combinedHeaders: recalculatedCombinedHeaders,
        headers: recalculatedCombinedHeaders,
        selectedHeaders: recalculatedCombinedHeaders,
      };
    }));

    
  };

  // Check if a source/version is being used in any downstream modules
  const checkIfSourceIsUsed = (sourceId: string): { isUsed: boolean; usedIn: string[] } => {
    const usedIn: string[] = [];

    // Get the source name for the ID being checked (needed because versions store source names, not IDs)
    const sourceBeingChecked = inputSources?.find(s => s.id === sourceId);
    const sourceNameBeingChecked = sourceBeingChecked?.sourceName;

    // Check Input versions (versions created from this source)
    // These are stored in inputSources array with isVersioned flag
    inputSources?.forEach(source => {
      if (source.isVersioned && source.versionConfig?.selectedSources) {
        const selectedSources = Array.isArray(source.versionConfig.selectedSources)
          ? source.versionConfig.selectedSources
          : [];
        // Check by both ID and source name (versions may store either)
        if (selectedSources.includes(sourceId) || (sourceNameBeingChecked && selectedSources.includes(sourceNameBeingChecked))) {
          usedIn.push(`Input version: ${source.sourceName}`);
        }
      }
    });

    // Check versioned sources that might use this source
    // These are stored in versionedSources array
    versionedSources?.forEach(version => {
      if (version.moduleType === 'Input' && version.versionConfig?.selectedSources) {
        const selectedSources = Array.isArray(version.versionConfig.selectedSources)
          ? version.versionConfig.selectedSources
          : [];
        // Check by both ID and source name (versions may store either)
        if (selectedSources.includes(sourceId) || (sourceNameBeingChecked && selectedSources.includes(sourceNameBeingChecked))) {
          usedIn.push(`Input version: ${version.sourceName || version.versionLabel}`);
        }
      }
    });

    // Check Stats configurations
    statsConfigurations?.forEach(config => {
      // Check if source is used in inputSources (check by both ID and name)
      if (config.inputSources?.includes(sourceId)) {
        usedIn.push('Stats configuration');
      }
      // Also check by source name
      else if (sourceNameBeingChecked && config.inputSources?.includes(sourceNameBeingChecked)) {
        usedIn.push('Stats configuration');
      }
    });

    // Check Match configurations
    matchConfigurations?.forEach(config => {
      if (config.inputSources?.includes(sourceId) || config.matchSources?.includes(sourceId)) {
        usedIn.push('Match configuration');
      }
    });

    // Check Match versions
    versionedSources?.forEach(version => {
      if (version.moduleType === 'Match') {
        if (version.baseInputSources?.includes(sourceId) || version.operationSources?.includes(sourceId)) {
          usedIn.push(`Match version: ${version.sourceName || version.versionLabel}`);
        }
      }
    });

    // Check Append configurations
    appendConfigurations?.forEach(config => {
      if (config.inputSources?.includes(sourceId) || config.appendSources?.includes(sourceId)) {
        usedIn.push('Append configuration');
      }
    });

    // Check Append versions
    versionedSources?.forEach(version => {
      if (version.moduleType === 'Append') {
        if (version.baseInputSources?.includes(sourceId) || version.operationSources?.includes(sourceId)) {
          usedIn.push(`Append version: ${version.sourceName || version.versionLabel}`);
        }
      }
    });

    // Check Suppress configurations
    suppressConfigurations?.forEach(config => {
      if (config.inputSources?.includes(sourceId) || config.suppressSources?.includes(sourceId)) {
        usedIn.push('Suppress configuration');
      }
    });

    // Check Suppress versions
    versionedSources?.forEach(version => {
      if (version.moduleType === 'Suppress') {
        if (version.baseInputSources?.includes(sourceId) || version.operationSources?.includes(sourceId)) {
          usedIn.push(`Suppress version: ${version.sourceName || version.versionLabel}`);
        }
      }
    });

    // Check Output configurations
    outputConfigurations?.forEach(config => {
      if (config.inputSources?.includes(sourceId)) {
        usedIn.push('Output configuration');
      }
    });

    return {
      isUsed: usedIn.length > 0,
      usedIn
    };
  };

  const handleDeleteVersion = (versionId: string) => {
    // Check if this version is being used in downstream modules
    const { isUsed, usedIn } = checkIfSourceIsUsed(versionId);

    if (isUsed) {
      setUsageErrorDialog({
        open: true,
        title: 'Cannot Delete Version',
        message: 'This version cannot be deleted because it is currently being used in the workflow:',
        usedIn
      });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this version?')) {
      return;
    }

    // Remove from versioned sources
    setVersionedSources(prev => prev?.filter(version => version?.id !== versionId));

    // Also remove from input sources if it exists there
    setInputSources(prev => prev?.filter(source => source?.id !== versionId));
  };

  // Handlers for shared custom sources - with module tracking
  const handleAddSharedCustomSource = (source: InputSource, createdByModuleId: string) => {
    const newSource = {
      ...source,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdByModuleId // Track which module created this source
    };

    setSharedCustomSources(prev => {
      const updated = [...prev, newSource];
      return updated;
    });

    // If this is a Self source with a generated column, add the generated column to the input sources
    if (source?.sourceType === 'Self' && source?.selfConfig) {
      const { input_source_names, generated_column } = source?.selfConfig;

      if (generated_column && input_source_names && input_source_names?.length > 0) {
        // IMPORTANT: Do NOT modify the original input source headers or versioned source headers
        // The generated column should be available through self-append source only
        // Downstream modules will see it through the self-append custom source
      }
    }
  };

  const handleEditSharedCustomSource = (source: InputSource) => {
    // Find the original source to compare
    const originalSource = sharedCustomSources?.find(s => s.id === source.id);

    // Check if the source name is being changed
    const isNameChanged = originalSource?.sourceName !== source.sourceName;

    // If name is being changed, check if source is being used in downstream modules
    if (isNameChanged) {
      const { isUsed, usedIn } = checkIfSourceIsUsed(source.id);

      if (isUsed) {
        setUsageErrorDialog({
          open: true,
          title: 'Cannot Rename Source',
          message: 'This source cannot be renamed because it is currently being used in the workflow',
          usedIn
        });
        return;
      }
    }

    setSharedCustomSources(prev =>
      prev?.map(s => s.id === source.id ? { ...source, createdByModuleId: s.createdByModuleId } : s)
    );

    // If this is a Self source with a generated column, handle the update
    if (source.sourceType === 'Self' && source.selfConfig) {
      const newGeneratedColumn = source.selfConfig.generated_column;
      const newInputSourceNames = source.selfConfig.input_source_names || [];

      // Get the old configuration
      const oldGeneratedColumn = originalSource?.selfConfig?.generated_column;
      const oldInputSourceNames = originalSource?.selfConfig?.input_source_names || [];

      // IMPORTANT: Do NOT modify input source headers or versioned source headers
      // Generated columns are available through self-append custom source only
    }
  };

  const handleDeleteSharedCustomSource = (id: string) => {
    // Check if this source is being used in downstream modules
    const { isUsed, usedIn } = checkIfSourceIsUsed(id);

    if (isUsed) {
      setUsageErrorDialog({
        open: true,
        title: 'Cannot Delete Source',
        message: 'This source cannot be deleted because it is currently being used in the workflow',
        usedIn
      });
      return;
    }

    if (window.confirm('Are you sure you want to delete this custom source?')) {
      // Find the source to be deleted
      const sourceToDelete = sharedCustomSources?.find(s => s.id === id);

      // Remove from shared custom sources
      setSharedCustomSources(prev => prev?.filter(s => s.id !== id));

      // IMPORTANT: Do NOT modify input source headers
      // Generated columns from self-append sources do not affect original input sources
      if (sourceToDelete?.sourceType === 'Self' && sourceToDelete?.selfConfig) {
        // No special handling needed - generated columns don't modify original sources
      }
    }
  };

  // Module-aware configuration change handlers
  // These handlers ensure configurations from different module instances don't overwrite each other
  // Memoized to prevent infinite re-render loops

  const handleAppendConfigurationsChange = useCallback((moduleId: string, newConfigs: AppendConfig[]) => {
    setAppendConfigurations(prevConfigs => {

      // Ensure all new configs have the correct createdByModuleId
      const configsWithModuleId = newConfigs?.map(config => ({
        ...config,
        createdByModuleId: config?.createdByModuleId || moduleId
      }));

      // Remove configurations from this specific module
      const otherModuleConfigs = prevConfigs?.filter(c => c?.createdByModuleId !== moduleId);

      // Add new configurations from this module
      const mergedConfigs = [...otherModuleConfigs, ...configsWithModuleId];

      // Prevent infinite loops: only update if something actually changed
      const configsFromThisModule = prevConfigs?.filter(c => c?.createdByModuleId === moduleId);
      const hasChanges = configsFromThisModule?.length !== configsWithModuleId?.length ||
        JSON.stringify(configsFromThisModule) !== JSON.stringify(configsWithModuleId);

      if (!hasChanges) {
        return prevConfigs; // No change, return previous state to prevent re-render
      }

      return mergedConfigs;
    });
  }, []);

  const handleSuppressConfigurationsChange = useCallback((moduleId: string, newConfigs: SuppressConfig[]) => {
    setSuppressConfigurations(prevConfigs => {
      // Ensure all new configs have the correct createdByModuleId
      const configsWithModuleId = newConfigs?.map(config => ({
        ...config,
        createdByModuleId: config?.createdByModuleId || moduleId
      }));

      // Remove configurations from this specific module
      const otherModuleConfigs = prevConfigs?.filter(c => c?.createdByModuleId !== moduleId);

      // Add new configurations from this module
      const mergedConfigs = [...otherModuleConfigs, ...configsWithModuleId];

      // Prevent infinite loops: only update if something actually changed
      const configsFromThisModule = prevConfigs?.filter(c => c?.createdByModuleId === moduleId);
      const hasChanges = configsFromThisModule?.length !== configsWithModuleId?.length ||
        JSON.stringify(configsFromThisModule) !== JSON.stringify(configsWithModuleId);

      if (!hasChanges) {
        return prevConfigs; // No change, return previous state to prevent re-render
      }

      return mergedConfigs;
    });
  }, []);

  const handleMatchConfigurationsChange = useCallback((moduleId: string, newConfigs: MatchConfig[]) => {
    setMatchConfigurations(prevConfigs => {
      // Ensure all new configs have the correct createdByModuleId
      const configsWithModuleId = newConfigs?.map(config => ({
        ...config,
        createdByModuleId: config?.createdByModuleId || moduleId
      }));

      // Remove configurations from this specific module
      const otherModuleConfigs = prevConfigs?.filter(c => c?.createdByModuleId !== moduleId);

      // Add new configurations from this module
      const mergedConfigs = [...otherModuleConfigs, ...configsWithModuleId];

      // Prevent infinite loops: only update if something actually changed
      const configsFromThisModule = prevConfigs?.filter(c => c?.createdByModuleId === moduleId);
      const hasChanges = configsFromThisModule?.length !== configsWithModuleId?.length ||
        JSON.stringify(configsFromThisModule) !== JSON.stringify(configsWithModuleId);

      if (!hasChanges) {
        return prevConfigs; // No change, return previous state to prevent re-render
      }

      return mergedConfigs;
    });
  }, []);

  // Create memoized callback factories for each module instance
  // This prevents infinite re-render loops by ensuring stable function references
  const getAppendConfigChangeHandler = useCallback((moduleId: string) => {
    return (configs: AppendConfig[]) => handleAppendConfigurationsChange(moduleId, configs);
  }, [handleAppendConfigurationsChange]);

  const getSuppressConfigChangeHandler = useCallback((moduleId: string) => {
    return (configs: SuppressConfig[]) => handleSuppressConfigurationsChange(moduleId, configs);
  }, [handleSuppressConfigurationsChange]);

  const getMatchConfigChangeHandler = useCallback((moduleId: string) => {
    return (configs: MatchConfig[]) => handleMatchConfigurationsChange(moduleId, configs);
  }, [handleMatchConfigurationsChange]);

  // Cache the handlers per module ID to maintain stable references
  const appendHandlersCache = useMemo(() => new Map<string, (configs: AppendConfig[]) => void>(), []);
  const suppressHandlersCache = useMemo(() => new Map<string, (configs: SuppressConfig[]) => void>(), []);
  const matchHandlersCache = useMemo(() => new Map<string, (configs: MatchConfig[]) => void>(), []);

  // Get or create cached handler for a module
  const getCachedAppendHandler = useCallback((moduleId: string) => {
    if (!appendHandlersCache.has(moduleId)) {
      appendHandlersCache.set(moduleId, getAppendConfigChangeHandler(moduleId));
    }
    return appendHandlersCache.get(moduleId)!;
  }, [appendHandlersCache, getAppendConfigChangeHandler]);

  const getCachedSuppressHandler = useCallback((moduleId: string) => {
    if (!suppressHandlersCache.has(moduleId)) {
      suppressHandlersCache.set(moduleId, getSuppressConfigChangeHandler(moduleId));
    }
    return suppressHandlersCache.get(moduleId)!;
  }, [suppressHandlersCache, getSuppressConfigChangeHandler]);

  const getCachedMatchHandler = useCallback((moduleId: string) => {
    if (!matchHandlersCache.has(moduleId)) {
      matchHandlersCache.set(moduleId, getMatchConfigChangeHandler(moduleId));
    }
    return matchHandlersCache.get(moduleId)!;
  }, [matchHandlersCache, getMatchConfigChangeHandler]);

  // Filter custom sources based on module type AND position (upstream only)
  const getAvailableCustomSourcesForModule = (currentModuleId: string): InputSource[] => {
    // Find the current module's position in the workflow
    const currentModuleIndex = modules?.findIndex(m => m?.id === currentModuleId);

    if (currentModuleIndex === -1) {
      console.warn(`[getAvailableCustomSourcesForModule] Module not found: ${currentModuleId}`);
      return [];
    }

    // Get the type of the current module (Append, Match, Suppress, etc.)
    const currentModuleType = getModuleType(currentModuleId);



    // Return only custom sources created by upstream modules of the same type
    return sharedCustomSources?.filter(source => {
      // Safety check
      if (!source || typeof source !== 'object') {
        return false;
      }

      if (!source?.createdByModuleId) {
        // Legacy sources without tracking - exclude for safety
        console.warn('[getAvailableCustomSourcesForModule] Source missing createdByModuleId:', source?.id, source?.sourceName);
        return false;
      }

      // For Self sources (self-append, self-match, self-suppress), filter by exact moduleId
      // Self sources should only be available to the specific module instance that created them
      // AND the module must be upstream or the same module
      if (source?.sourceType === 'Self') {
        // Self sources are only available to the exact module that created them
        const isSameModule = source?.createdByModuleId === currentModuleId;


        return isSameModule;
      }

      // For non-Self sources (Database, File), filter by module type AND position
      // These can be shared across module instances of the same type
      // BUT only from upstream modules (earlier in workflow)
      const sourceModuleType = getModuleType(source?.createdByModuleId);
      const isSameType = sourceModuleType === currentModuleType;

      if (!isSameType) {
        return false;
      }

      // Find the creator module's position
      const creatorModuleIndex = modules?.findIndex(m => m?.id === source?.createdByModuleId);

      if (creatorModuleIndex === -1) {
        // Creator module not found (might have been deleted)
        console.warn(`[getAvailableCustomSourcesForModule] Creator module not found for source: ${source?.sourceName}, creatorModuleId: ${source?.createdByModuleId}`);
        return false;
      }

      // CRITICAL: Allow sources from upstream modules OR the same module
      // This allows a module to see its own custom sources AND sources from earlier modules of same type
      const isUpstreamOrSame = creatorModuleIndex <= currentModuleIndex;



      return isUpstreamOrSame;
    }) || [];
  };


  // Helper to get source name by ID
  const getSourceNameById = (sourceId: string): string => {
    // Check in regular input sources
    const inputSource = inputSources?.find(s => s?.id === sourceId);
    if (inputSource) return inputSource?.sourceName;

    // Check in versioned sources
    const versionedSource = versionedSources?.find(s => s?.id === sourceId);
    if (versionedSource) return versionedSource?.sourceName;

    // Check in preconfigured sources (append, match, suppress)
    // Preconfigured sources have IDs like "append_123", "match_456", "suppress_789"
    const sourceIdStr = String(sourceId || '');
    if (sourceIdStr?.startsWith('append_') || sourceIdStr?.startsWith('match_') || sourceIdStr?.startsWith('suppress_')) {
      const module = sourceIdStr?.split('_')[0] as 'append' | 'match' | 'suppress';
      const tableIdStr = sourceIdStr?.substring(module?.length + 1);

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

        const table = preconfiguredTables?.find((t: any) => t?.tableId === tableId);
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
    fieldMappings?: any[],
    appendFields?: string[],  // Fields to Append for Append module
    addFields?: string[]      // Add Fields for Match module
  ) => {

    // Log the CURRENT state of each Input source BEFORE creating version
    baseInputSources?.forEach(sourceId => {
      const source = allAvailableInputSources?.find(s => s?.id === sourceId);
      if (source) {
      } else {
      }
    });

    // Validation: Must have at least one input source and one operation source
    if (baseInputSources?.length === 0) {
      alert('Please select at least one Input Source before creating versions.');
      return;
    }
    if (operationSources?.length === 0) {
      alert('Please select at least one Operation Source before creating versions.');
      return;
    }

    // Helper function to get fields for a specific source in version creation
    // IMPORTANT: Always prioritizes operationFields (explicitly selected by user, includes appendFields) over field mappings
    // Field mappings are sent separately in the "field_mappings" array and should NOT affect the "fields" array
    const getFieldsForSourceInVersion = (sourceId: string): string[] => {
      const fieldsSet = new Set<string>();

      // IMPORTANT: Always prioritize operationFields (explicitly selected by user, includes appendFields)
      // Field mappings are sent separately and should NOT interfere with this
      if (operationFields && operationFields?.length > 0) {
        // Get the source to check its headers
        const source = allAvailableInputSources?.find(s => s.id === sourceId);

        // Check if it's a custom source
        const customSource = sharedCustomSources?.find(s => s.id === sourceId);

        // Check if it's a preconfigured source
        let preconfiguredSource = null;
        const sourceIdStr = String(sourceId || '');
        if (sourceIdStr?.startsWith('append_')) {
          preconfiguredSource = apiSources?.dbSource?.preconfiguredTables?.append?.find(
            (table: any) => `append_${table?.tableId}` === sourceIdStr
          );
        } else if (sourceIdStr?.startsWith('match_')) {
          preconfiguredSource = apiSources?.dbSource?.preconfiguredTables?.match?.find(
            (table: any) => `match_${table?.tableId}` === sourceIdStr
          );
        } else if (sourceIdStr?.startsWith('suppress_')) {
          preconfiguredSource = apiSources?.dbSource?.preconfiguredTables?.suppress?.find(
            (table: any) => `suppress_${table?.tableId}` === sourceIdStr
          );
        }

        // Get headers from the appropriate source
        let rawHeaders = source?.headers || customSource?.headers || preconfiguredSource?.columns || [];

        // Normalize headers to strings (they might be objects with columnName property)
        const sourceHeaders = rawHeaders?.map((h: any) => {
          if (typeof h === 'string') return h;
          if (h && typeof h === 'object' && h.columnName) return h.columnName;
          if (h && typeof h === 'object' && h.name) return h.name;
          return String(h);
        }).filter(Boolean);

        
        
        
        

        // Add fields from operationFields that exist in this source's headers (case-insensitive)
        operationFields?.forEach(field => {
          const fieldLower = field?.toLowerCase();
          const matchingHeader = sourceHeaders?.find((h: string) => h?.toLowerCase() === fieldLower);
          if (matchingHeader) {
            fieldsSet.add(matchingHeader); // Use the original casing from the source
            
          } else {
            
          }
        });
      }

      return Array.from(fieldsSet);
    };

    // Generate one version per input source (with all operation sources grouped together)
    const newVersions: VersionedSource[] = [];

    // For each input source, create ONE version with ALL operation sources
    baseInputSources?.forEach((inputSourceId, inputIndex) => {
      const inputSource = allAvailableInputSources?.find(s => s.id === inputSourceId);
      if (!inputSource) return;

      // Build the list of all operation sources with their details
      // Note: Match module does not use priority, Append and Suppress do
      const operationSourcesList: Array<{
        source_type: string;
        source_name: string;
        priority?: number; // Optional - only for Append and Suppress
        fields: string[];
      }> = [];

      operationSources?.forEach((operationSourceId, opIndex) => {
        const operationSourceName = getSourceNameById(operationSourceId);

        // Get fields specific to this operation source
        const fieldsForThisSource = getFieldsForSourceInVersion(operationSourceId);

        // Determine source_type for the operation source
        let sourceType = 'preconfigured';

        // First check if it's a versioned source
        const versionedSource = allAvailableInputSources?.find(s => s?.id === operationSourceId && s?.isVersioned);
        if (versionedSource) {
          // All versioned sources are treated as 'input' type
          sourceType = 'input';
        } else {
          // Check if it's a non-versioned input source from the Input module
          const inputSource = allAvailableInputSources?.find(s => s?.id === operationSourceId);
          if (inputSource && !inputSource?.isVersioned) {
            const createdByModuleId = (inputSource as any)?.createdByModuleId;
            const createdByModuleIdStr = String(createdByModuleId || '');
            if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
              sourceType = 'input';
            }
          }
        }

        // Check if it's a custom source only if not already identified as input
        if (sourceType !== 'input') {
          const customSource = sharedCustomSources?.find(s => s?.id === operationSourceId);
          if (customSource) {
            // Self type custom sources get special type identifiers
            if (customSource?.sourceType === 'Self') {
              sourceType = sourceModule === 'Append' ? 'self_append' :
                           sourceModule === 'Match' ? 'self_match' : 'self_suppress';
            } else {
              // File or Database custom sources created in any module should be 'input' type
              sourceType = 'input';
            }
          }
        }

        // Build operation source object
        // Match module does not use priority
        const operationSource: {
          source_type: string;
          source_name: string;
          priority?: number;
          fields: string[];
        } = {
          source_type: sourceType,
          source_name: operationSourceName,
          fields: fieldsForThisSource
        };

        // Only add priority for Append and Suppress modules
        if (sourceModule === 'Append' || sourceModule === 'Suppress') {
          operationSource.priority = opIndex + 1;
        }

        operationSourcesList?.push(operationSource);
      });

      // Build version name with all operation source names
      const moduleVersionCount = versionCounters[sourceModule] + inputIndex + 1;
      const operationSourceNames = operationSources?.map(id => getSourceNameById(id)).join('_');

      let versionName: string;
      if (inputSource.isVersioned) {
        // Input is already versioned, append the operation module
        versionName = `${inputSource.sourceName}_${sourceModule}_v${moduleVersionCount}`;
      } else {
        // Input is a regular source, include operation sources in name
        versionName = `${sourceModule}_${inputSource.sourceName}_${operationSourceNames}_v${moduleVersionCount}`;
      }

      // CRITICAL: Version should include selected headers from input source + appended/added fields
      let combinedHeaders: string[] = [];


      // Start with selected headers from the input source
      const inputSourceHeaders = inputSource?.selectedHeaders || inputSource?.headers || [];
      combinedHeaders = [...inputSourceHeaders];

      // For Append module: Include input source selected headers + appendFields (fields to append)
      if (sourceModule === 'Append') {
        // Add appended fields (avoiding duplicates)
        if (appendFields && appendFields?.length > 0) {
          appendFields?.forEach(field => {
            if (!combinedHeaders?.includes(field)) {
              combinedHeaders?.push(field);
            }
          });
        }
      }

      // For Match module: Include input source selected headers + addFields (fields to add)
      if (sourceModule === 'Match') {
        // Add add fields (avoiding duplicates)
        if (addFields && addFields?.length > 0) {
          addFields?.forEach(field => {
            if (!combinedHeaders?.includes(field)) {
              combinedHeaders?.push(field);
            }
          });
        }
      }

      // For Suppress module: Include input source selected headers only (no additional fields)
      if (sourceModule === 'Suppress') {
        // Already have input source headers, nothing to add
      }


      // Determine stepOrder based on module - use full moduleId to find exact module instance
      const stepOrder = modules?.findIndex(m => m?.id === moduleId) + 1;
      

      // Build append_sources/match_sources/suppress_sources based on module
      const operationSourcesKey = sourceModule === 'Append' ? 'append_sources' :
                                   sourceModule === 'Match' ? 'match_sources' : 'suppress_sources';

      // Build configJson for the workflow
      const configJson: any = {
        input_sources: [{
          source_name: inputSource.sourceName,
          columns: combinedHeaders
        }],
        field_mappings: fieldMappings ? fieldMappings?.map(mapping => ({
          field_name: mapping.fieldName,
          source_mappings: mapping.selectedColumns?.map((col: string) => {
            const [sourceId, fieldName] = col?.split('::');
            const source = allAvailableInputSources?.find(s => s.id === sourceId);
            const sourceName = source?.sourceName || sourceId;
            return `${sourceName}.${fieldName}`;
          }).join('|')
        })) : []
      };

      // Add ALL operation sources to this version
      configJson[operationSourcesKey] = operationSourcesList;

      // For Append versions, add is_self_append flag (true if ANY operation source is self)
      if (sourceModule === 'Append') {
        const hasSelfAppend = operationSourcesList?.some(src => src.source_type === 'self_append');
        configJson.is_self_append = hasSelfAppend;
        configJson.match_keys = operationFields || [];

        
      }

      // For Match versions, add match_keys (from input source fields)
      if (sourceModule === 'Match') {
        // Match Keys are the fields from INPUT sources to match on (stored in operationFields)
        // operationFields = selectedMatchOnFields = fields from INPUT sources
        configJson.match_keys = operationFields || [];

        // Expand Fields are separate - fields from MATCH sources to add to the output (stored in addFields)
        // Only include expand_fields if there are any selected
        if (addFields && addFields?.length > 0) {
          configJson.expand_fields = addFields;
        }
      }

      // For Suppress versions, add suppress_on_fields
      if (sourceModule === 'Suppress') {
        // Suppress On Fields selected by user
        configJson.suppress_on_fields = operationFields || [];

      }

      // Create the versioned source
      const timestamp = Date.now();
      const versionedSource: VersionedSource = {
        id: `versioned_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        isVersioned: true,
        versionNumber: versionedSources?.length + newVersions?.length + 1,
        versionLabel: versionName,
        sourceName: versionName,
        sourceModule,
        createdByModuleId: moduleId,
        baseInputSources: [inputSourceId],
        operationSources: operationSources,  // All operation sources
        operationFields,
        appendFields,  // Store Fields to Append for Append module
        addFields,     // Store Add Fields for Match module
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
        internalStepOrder: newVersions?.length + 1,
        configJson,
        createdAt: timestamp,  // Add timestamp for creation order
      } as any;

      newVersions?.push(versionedSource);
    });

    // Update version counter for this module
    setVersionCounters(prev => ({
      ...prev,
      [sourceModule]: prev[sourceModule] + newVersions?.length
    }));

    // Add all new versions to the list
    setVersionedSources(prev => [...prev, ...newVersions]);

    // Log the FINAL state of each Input source AFTER creating versions
    baseInputSources?.forEach(sourceId => {
      const source = allAvailableInputSources?.find(s => s?.id === sourceId);
      if (source) {
      }
    });

    // Log the created versions
    newVersions?.forEach(version => {
    });

    // Show success message
    const versionNames = newVersions?.map(v => v.versionLabel).join(', ');
    const summary = `${newVersions?.length} versioned source(s) created:\n\n${versionNames}\n\nThey are now available in all subsequent module dropdowns.`;
    alert(summary);
  };

  // Combine regular input sources with versioned sources for child modules
  // Memoize to prevent infinite re-renders
  const allAvailableInputSources = useMemo<InputSource[]>(() => {

    // Enhance input sources with generated columns from self-append sources for downstream module visibility
    const enhancedInputSources = inputSources?.map(source => {

      // Find all self-append sources that use this source as input
      const generatedColumnsForSource: string[] = [];

      sharedCustomSources?.forEach(customSource => {

        if (customSource?.sourceType === 'Self' && customSource?.selfConfig) {
          const { input_source_names, generated_column } = customSource?.selfConfig;


          // Check if this source is used as input for this self-append source
          if (input_source_names?.includes(source?.sourceName) && generated_column) {
            generatedColumnsForSource?.push(generated_column);
          } else {
          }
        }
      });


      // If there are generated columns, enhance the source with them for UI display
      if (generatedColumnsForSource?.length > 0) {

        // Preserve original headers and selectedHeaders
        const originalHeaders = source?.headers || [];
        const originalSelectedHeaders = source?.selectedHeaders || originalHeaders;

        // Add generated columns to both headers and selectedHeaders
        const enhancedHeaders = [...originalHeaders, ...generatedColumnsForSource];
        const enhancedSelectedHeaders = [...originalSelectedHeaders, ...generatedColumnsForSource];


        const enhancedSource = {
          ...source,
          headers: enhancedHeaders, // Enhanced headers for UI display (includes generated columns)
          selectedHeaders: enhancedSelectedHeaders, // Enhanced selected headers (preserves user selection + adds generated)
          originalHeaders: originalHeaders, // Preserve original headers for payload transformation
          originalSelectedHeaders: originalSelectedHeaders, // Preserve original selected headers for payload
        };

        return enhancedSource;
      }

      return source;
    });


    const result = [...enhancedInputSources, ...versionedSources];

    return result;
  }, [inputSources, versionedSources, sharedCustomSources]);

  // Helper function to get all fields for a source (original + appended fields + self-append generated columns)
  const getSourceFieldsWithAppends = useMemo(() => {
    return (source: InputSource): string[] => {

      // Start with original headers
      const originalHeaders = source?.selectedHeaders || source?.headers || [];
      const allFields = new Set<string>(originalHeaders);

      // Find all append configurations where this source is an input source
      appendConfigurations?.forEach(config => {
        // Check if this source is one of the input sources for this append config
        const isInputSource = config?.inputSources?.some(inputSourceId => {
          const inputSource = allAvailableInputSources?.find(s => s?.id === inputSourceId);
          return inputSource?.sourceName === source?.sourceName || inputSource?.id === source?.id;
        });

        // If this source is used in the append config, add the appended fields
        if (isInputSource && config?.appendFields) {
          config?.appendFields?.forEach(field => allFields?.add(field));
        }
      });

      // IMPORTANT: Also add generated columns from self-append sources that use this source as input
      sharedCustomSources?.forEach(customSource => {
        // Check if this is a self-append source
        if (customSource?.sourceType === 'Self' && customSource?.selfConfig) {
          const { input_source_names, generated_column } = customSource?.selfConfig;


          // Check if this source is one of the input sources for this self-append source
          const isInputSource = input_source_names?.includes(source?.sourceName);


          // If this source is used in the self-append config, add the generated column
          if (isInputSource && generated_column) {
            allFields?.add(generated_column);
          }
        }
      });

      const result = Array.from(allFields);
      return result;
    };
  }, [appendConfigurations, allAvailableInputSources, sharedCustomSources]);

  // Memoize stats module calculations to prevent infinite loops
  const availableStatsHeaders = useMemo(() => {
    if (selectedInputSources?.length === 0) {
      return [];
    }

    // Find the selected source objects from allAvailableInputSources
    const selectedSourceObjects = selectedInputSources
      .map(sourceName => allAvailableInputSources?.find(s => s.sourceName === sourceName))
      .filter(src => src);

    if (selectedSourceObjects?.length === 0) {
      return [];
    }

    if (selectedSourceObjects?.length === 1) {
      // Single source: return all its headers (including appended fields)
      const source = selectedSourceObjects[0];
      if (!source) return [];
      const headersToUse = getSourceFieldsWithAppends(source);
      return headersToUse?.sort();
    }

    // Multiple sources: return only COMMON headers (intersection)
    const allSourceFieldSets: Set<string>[] = [];

    selectedSourceObjects?.forEach(source => {
      if (!source) return;
      const headersToUse = getSourceFieldsWithAppends(source); // Include appended fields
      if (headersToUse?.length > 0) {
        const sourceFields = new Set<string>();
        headersToUse?.forEach((field: string) => {
          sourceFields.add(field?.toLowerCase()); // Case-insensitive comparison
        });
        allSourceFieldSets?.push(sourceFields);
      }
    });

    if (allSourceFieldSets?.length === 0) {
      return [];
    }

    // Find intersection of all field sets
    const intersection = Array.from(allSourceFieldSets[0]).filter(field => {
      return allSourceFieldSets?.every(fieldSet => fieldSet.has(field));
    });

    // Map back to original casing from the first source
    const resultFields: string[] = [];
    const firstSource = selectedSourceObjects[0];
    if (!firstSource) return [];
    const firstSourceHeaders = getSourceFieldsWithAppends(firstSource); // Include appended fields

    firstSourceHeaders?.forEach(field => {
      if (intersection?.includes(field?.toLowerCase())) {
        resultFields?.push(field);
      }
    });

    return resultFields?.sort();
  }, [selectedInputSources, allAvailableInputSources, getSourceFieldsWithAppends]);

  // REMOVED: This was using allAvailableInputSources which bypasses upstream filtering
  // Now calculated per-module inside renderContent for panel5

  const filteredStatsCountsOn = useMemo(() =>
    availableStatsHeaders?.filter(field =>
      field?.toLowerCase().includes(statsCountsOnSearch?.toLowerCase())
    ),
    [availableStatsHeaders, statsCountsOnSearch]
  );

  const filteredStatsBreakdownBy = useMemo(() =>
    availableStatsHeaders?.filter(field =>
      field?.toLowerCase().includes(statsBreakdownBySearch?.toLowerCase())
    ),
    [availableStatsHeaders, statsBreakdownBySearch]
  );

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded((prevExpanded) => {
      if (isExpanded) {
        // Add panel to expanded array if not already present
        return prevExpanded?.includes(panel) ? prevExpanded : [...prevExpanded, panel];
      } else {
        // Remove panel from expanded array
        return prevExpanded?.filter((p) => p !== panel);
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
      
      if (inputSources?.length === 0) {
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
    // CRITICAL: Use originalHeaders if available (excludes self-append generated columns)
    // Otherwise use source headers as-is
    const headers = source?.originalHeaders || source?.headers || [];

    // CRITICAL: Use originalSelectedHeaders if available (excludes generated columns)
    // Otherwise fall back to selectedHeaders or headers
    const selectedHeaders = source?.originalSelectedHeaders || source?.selectedHeaders || headers;


    // Determine columnSelectionType: "A" if all headers selected, "S" if subset
    const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

    // Determine inputType: "P" for preconfigured (has fileSourceId), "I" for manual
    const inputType = 'I';

    // Get file format from extension
    const getFileFormat = (fileName: string) => {
      if (!fileName) return '';

      // Extract the actual filename from path (last part after slash)
      const actualFileName = fileName.split('/').pop()?.split('\\').pop() || '';

      // Check if it has a valid file extension
      const parts = actualFileName.split('.');
      if (parts.length < 2) return ''; // No extension

      const extension = parts.pop()?.toUpperCase() || '';

      // Validate extension (2-5 chars, alphanumeric only)
      if (extension.length >= 2 && extension.length <= 5 && /^[A-Z0-9]+$/.test(extension)) {
        return extension;
      }

      return '';
    };

    // Extract filters from filterJson if filterQuery is empty but filterJson exists
    let filters = source.filterQuery || '';

    if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
      try {
        const filterGroup = source?.filterJson[0];
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
              filterParts?.push(conditionStr);
            }
          });

          if (filterParts?.length > 0) {
            const logicalOp = filterGroup?.logicalOperator || 'AND';
            filters = filterParts?.join(` ${logicalOp} `);
            
          }
        }
      } catch (error) {
        
      }
    }

    console.log('[filename] ========== Building INPUT payload ==========');
    console.log('[filename] source.fileName:', source.fileName);
    console.log('[filename] source.filePath:', source.filePath);
    console.log('[filename] source.fileSource:', source.fileSource);
    console.log('[filename] source.subSourceType:', source.subSourceType);
    console.log('[filename] source object:', source);

    const payload: any = {
      sourceName: source.sourceName,
      sourceType: 'F', // File -> "F"
      dataSourceId: source.fileSourceId || null,
      filePath: source.filePath || '',
      delimiter: source.delimiter || ',',
      fileFormat: getFileFormat(source.fileName || source.filePath),
      isHeader: source.hasHeader ? 1 : 0,
      columnSelectionType: columnSelectionType,
      columns: headers,
      selectedColumns: selectedHeaders?.join(','), // Send as-is (custom names if custom headers exist)
      inputType: inputType,
      filters: filters,
      customHeaders: source.customHeaders || '',
      filterJson: source.filterJson || null,
      subSourceType: source.subSourceType
    };

    // Include fileName ONLY for Desktop sources (from API response or empty string)
    if (source.fileSource === 'Desktop' || source.subSourceType === 'Desktop') {
      payload.fileName = source.fileName || '';
      console.log('[filename] Desktop source detected, including fileName:', payload.fileName);
    } else {
      console.log('[filename] Not a Desktop source (SFTP/AWS/NFS), NOT including fileName field');
    }

    console.log('[filename] Final payload:', payload);

    return payload;
  };

  // Transform input sources to the required API format (only File and Database sources)
  const transformInputSourcesToAPIFormat = (sources: InputSource[]) => {

    // Log each source's headers
    sources?.forEach((source, idx) => {
    });

    // Filter to only include File and Database sources, keeping track of original indices
    // Handle both UI format ('File', 'Database') and API format ('F', 'T')
    const fileAndDatabaseSources = sources
      ?.map((source, originalIndex) => ({ source, originalIndex }))
      ?.filter(({ source }) => {
        const sourceType = source?.sourceType as any;
        return sourceType === 'File' || sourceType === 'Database' ||
               sourceType === 'F' || sourceType === 'T';
      });



    return fileAndDatabaseSources?.map(({ source, originalIndex }) => {
      // Check if source is already in API format (sourceType is 'F' or 'T' instead of 'File' or 'Database')
      const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

      if (isAlreadyAPIFormat) {
        

        // Extract filters from filterJson if filters is empty but filterJson exists
        let filters = (source as any)?.filters || '';

        if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
          try {
            const filterGroup = source?.filterJson[0];
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
                  filterParts?.push(conditionStr);
                }
              });

              if (filterParts?.length > 0) {
                const logicalOp = filterGroup?.logicalOperator || 'AND';
                filters = filterParts?.join(` ${logicalOp} `);
                
              }
            }
          } catch (error) {
            
          }
        }

        // Return source with extracted filters, stepOrder, and internalStepOrder
        const result: any = {
          ...source,
          filters: filters,
          stepOrder: 1, // Input module sources have stepOrder = 1
          internalStepOrder: originalIndex + 1 // 1-based index from original position
        };

        // CRITICAL: Use originalHeaders for columns if available (excludes self-append generated columns)
        if ((source as any)?.originalHeaders) {
          result.columns = (source as any)?.originalHeaders;
        }

        // CRITICAL: Use originalSelectedHeaders for selectedColumns if available
        if ((source as any)?.originalSelectedHeaders) {
          result.selectedColumns = (source as any)?.originalSelectedHeaders?.join(',');
        } else if ((source as any)?.originalHeaders && result?.selectedColumns) {
          // If we have originalHeaders but not originalSelectedHeaders, filter selectedColumns
          const originalHeadersSet = new Set((source as any)?.originalHeaders);
          const selectedColsArray = result?.selectedColumns?.split(',') || [];
          const filteredSelectedCols = selectedColsArray?.filter((col: string) => originalHeadersSet?.has(col));
          result.selectedColumns = filteredSelectedCols?.join(',');
        }

        // Include ID if this is an existing source (for update payload)
        // Only include if hasExistingId is true (source.id is the internal ID, not API ID)
        if ((source as any)?.hasExistingId && source?.id) {
          result.id = source?.id;
        }

        return result;
      }

      // Handle File sources - transform from UI format to API format
      // Note: Sources are now stored in UI format with headers/selectedHeaders arrays
      // This transformation happens only during submission
      if (source?.sourceType === 'File') {

        const result: any = {
          ...transformFileSourceToAPI(source),
          stepOrder: 1, // Input module sources have stepOrder = 1
          internalStepOrder: originalIndex + 1 // 1-based index from original position
        };

        // Include ID if this is an existing source (for update payload)
        if ((source as any)?.hasExistingId && source?.id) {
          result.id = source?.id;
        }

        return result;
      }

      // Handle Database sources
      if (source?.sourceType === 'Database') {

        // CRITICAL: Use originalHeaders if available (excludes self-append generated columns)
        const headers = (source as any)?.originalHeaders || source?.headers || [];

        // CRITICAL: Use originalSelectedHeaders if available (excludes generated columns)
        const selectedHeaders = (source as any)?.originalSelectedHeaders || source?.selectedHeaders || headers;

        const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';


        // Get filters - check filterQuery and extract from filterJson if needed
        let filters = source?.filterQuery || '';

        // If filterQuery is empty but filterJson exists, try to extract filter from config
        if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
          try {
            const filterGroup = source?.filterJson[0];
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
                  filterParts?.push(conditionStr);
                }
              });

              if (filterParts?.length > 0) {
                const logicalOp = filterGroup?.logicalOperator || 'AND';
                filters = filterParts?.join(` ${logicalOp} `);
              }
            }
          } catch (error) {
            
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
          selectedColumns: selectedHeaders?.join(','),
          inputType: 'I', // Primary for database sources
          filters,
          filterJson: source?.filterJson || null, // Include filterJson for database sources
          isCustomTable: (!source?.originalTableName || source?.customTableMetadata) ? 1 : 0,
          stepOrder: 1, // Input module sources have stepOrder = 1
          internalStepOrder: originalIndex + 1 // 1-based index from original position
        };

        // Only include database fields if they have values
        if (dbName) result.dbName = dbName;
        if (tableName) result.tableName = tableName;
        if (schema) result.schema = schema;

        // Include sourceOption (tableId) for preconfigured tables
        

        if (source?.tableSourceId) {
          result.sourceOption = source.tableSourceId;
          
        } else {
          
        }

        // Include ID if this is an existing source (for update payload)
        if ((source as any).hasExistingId && source.id) {
          result.id = source.id;
          
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

  // Helper function to transform version configJson source names
  // Resolves all source_name fields in input_sources, append_sources, suppress_sources, match_sources
  const transformVersionConfigJson = (configJson: any): any => {
    console.log(`[BUGNAME] [transformVersionConfigJson] Transforming version configJson...`);

    const transformed = { ...configJson };

    // Transform input_sources
    if (transformed.input_sources && Array.isArray(transformed.input_sources)) {
      transformed.input_sources = transformed.input_sources.map((src: any, idx: number) => {
        if (typeof src === 'object' && src.source_name) {
          const originalName = src.source_name;
          const resolvedName = resolveSourceName(originalName);
          console.log(`[BUGNAME] [transformVersionConfigJson] input_sources[${idx}]: "${originalName}" → "${resolvedName}"`);
          return { ...src, source_name: resolvedName };
        }
        return src;
      });
    }

    // Transform append_sources
    if (transformed.append_sources && Array.isArray(transformed.append_sources)) {
      transformed.append_sources = transformed.append_sources.map((src: any, idx: number) => {
        if (typeof src === 'object' && src.source_name) {
          const originalName = src.source_name;
          const resolvedName = resolveSourceName(originalName);
          console.log(`[BUGNAME] [transformVersionConfigJson] append_sources[${idx}]: "${originalName}" → "${resolvedName}"`);
          return { ...src, source_name: resolvedName };
        }
        return src;
      });
    }

    // Transform suppress_sources
    if (transformed.suppress_sources && Array.isArray(transformed.suppress_sources)) {
      transformed.suppress_sources = transformed.suppress_sources.map((src: any, idx: number) => {
        if (typeof src === 'object' && src.source_name) {
          const originalName = src.source_name;
          const resolvedName = resolveSourceName(originalName);
          console.log(`[BUGNAME] [transformVersionConfigJson] suppress_sources[${idx}]: "${originalName}" → "${resolvedName}"`);
          return { ...src, source_name: resolvedName };
        } else if (typeof src === 'string') {
          // Some suppress_sources might be strings instead of objects
          const resolvedName = resolveSourceName(src);
          console.log(`[BUGNAME] [transformVersionConfigJson] suppress_sources[${idx}]: "${src}" → "${resolvedName}"`);
          return resolvedName;
        }
        return src;
      });
    }

    // Transform match_sources
    if (transformed.match_sources && Array.isArray(transformed.match_sources)) {
      transformed.match_sources = transformed.match_sources.map((src: any, idx: number) => {
        if (typeof src === 'object' && src.source_name) {
          const originalName = src.source_name;
          const resolvedName = resolveSourceName(originalName);
          console.log(`[BUGNAME] [transformVersionConfigJson] match_sources[${idx}]: "${originalName}" → "${resolvedName}"`);
          return { ...src, source_name: resolvedName };
        }
        return src;
      });
    }

    console.log(`[BUGNAME] [transformVersionConfigJson] ✅ Transformation complete`);
    return transformed;
  };

  // Helper function to resolve source name (handles custom sources)
  // If it's a custom source (Self source), resolves to the base input source name
  // Otherwise, returns the sourceName directly
  // IMPORTANT: This must be defined at component level to be accessible by all transformation functions
  const resolveSourceName = (sourceId: string): string => {
    console.log(`[BUGNAME] [resolveSourceName] ========== START RESOLVING ==========`);
    console.log(`[BUGNAME] [resolveSourceName] Input sourceId: "${sourceId}"`);

    // First, try to find the source in allAvailableInputSources (includes inputSources and versionedSources)
    let sourceById = allAvailableInputSources?.find(s => s.id === sourceId);

    if (sourceById) {
      console.log(`[BUGNAME] [resolveSourceName] ✅ Found in allAvailableInputSources:`);
      console.log(`[BUGNAME] [resolveSourceName]   - id: "${sourceById.id}"`);
      console.log(`[BUGNAME] [resolveSourceName]   - sourceName: "${sourceById.sourceName}"`);
      console.log(`[BUGNAME] [resolveSourceName]   - isVersioned: ${sourceById.isVersioned}`);
      console.log(`[BUGNAME] [resolveSourceName]   - sourceType: "${sourceById.sourceType}"`);
    } else {
      console.log(`[BUGNAME] [resolveSourceName] ❌ NOT found in allAvailableInputSources`);
    }

    // If not found, search in sharedCustomSources (custom sources from Append/Match/Suppress modules)
    if (!sourceById) {
      sourceById = sharedCustomSources?.find(s => s.id === sourceId);
      if (sourceById) {
        console.log(`[BUGNAME] [resolveSourceName] ✅ Found in sharedCustomSources:`);
        console.log(`[BUGNAME] [resolveSourceName]   - id: "${sourceById.id}"`);
        console.log(`[BUGNAME] [resolveSourceName]   - sourceName: "${sourceById.sourceName}"`);
        console.log(`[BUGNAME] [resolveSourceName]   - sourceType: "${sourceById.sourceType}"`);
      } else {
        console.log(`[BUGNAME] [resolveSourceName] ❌ NOT found in sharedCustomSources`);
      }
    }

    if (sourceById) {
      // If it's a Self source (custom source), resolve to the base input source
      if (sourceById.sourceType === 'Self' && sourceById.selfConfig) {
        console.log(`[BUGNAME] [resolveSourceName] 🔍 Detected Self-type source`);
        // Get the first input source name from the self config
        const baseInputSourceName = sourceById.selfConfig.input_source_names?.[0];

        if (baseInputSourceName) {
          console.log(`[BUGNAME] [resolveSourceName] 🔍 selfConfig.input_source_names[0]: "${baseInputSourceName}"`);

          // Find the actual input source by name (search in allAvailableInputSources first)
          let baseInputSource = allAvailableInputSources?.find(
            s => s.sourceName === baseInputSourceName
          );

          // If not found in allAvailableInputSources, search in inputSources directly
          if (!baseInputSource) {
            baseInputSource = inputSources?.find(s => s.sourceName === baseInputSourceName);
          }

          if (baseInputSource) {
            console.log(`[BUGNAME] [resolveSourceName] ✅ RESOLVED Self source to base: "${baseInputSource.sourceName}"`);
            console.log(`[BUGNAME] [resolveSourceName] ========== END RESOLVING ==========\n`);
            return baseInputSource.sourceName;
          } else {
            console.warn(`[BUGNAME] [resolveSourceName] ⚠️ Could not find base input source: "${baseInputSourceName}"`);
          }
        } else {
          console.warn(`[BUGNAME] [resolveSourceName] ⚠️ Self source has no input_source_names in selfConfig`);
        }
      }

      // For versioned sources, resolve to the base input source(s)
      if (sourceById.isVersioned) {
        console.log(`[BUGNAME] [resolveSourceName] 🔍 Detected VERSIONED source`);
        const versionedSource = sourceById as any;
        const baseInputSources = versionedSource.baseInputSources;

        console.log(`[BUGNAME] [resolveSourceName] 🔍 versionName: "${versionedSource.versionName}"`);
        console.log(`[BUGNAME] [resolveSourceName] 🔍 versionLabel: "${versionedSource.versionLabel}"`);
        console.log(`[BUGNAME] [resolveSourceName] 🔍 baseInputSources:`, baseInputSources);

        // If this version has base input sources, resolve to the first one
        if (baseInputSources && Array.isArray(baseInputSources) && baseInputSources.length > 0) {
          const firstBaseSourceName = baseInputSources[0];
          console.log(`[BUGNAME] [resolveSourceName] ✅ RESOLVED versioned source to base: "${firstBaseSourceName}"`);
          console.log(`[BUGNAME] [resolveSourceName] ========== END RESOLVING ==========\n`);
          return firstBaseSourceName;
        }

        // Fallback: use versionName/versionLabel if no base input sources
        const versionName = versionedSource.versionName || versionedSource.versionLabel || sourceById.sourceName;
        console.log(`[BUGNAME] [resolveSourceName] ⚠️ No baseInputSources, using version name: "${versionName}"`);
        console.log(`[BUGNAME] [resolveSourceName] ========== END RESOLVING ==========\n`);
        return versionName;
      }

      console.log(`[BUGNAME] [resolveSourceName] ✅ RETURNING regular source name: "${sourceById.sourceName}"`);
      console.log(`[BUGNAME] [resolveSourceName] ========== END RESOLVING ==========\n`);
      return sourceById.sourceName;
    }

    // If not found by ID, try to find by sourceName (already a name)
    const sourceByName = allAvailableInputSources?.find(s => s.sourceName === sourceId);
    if (sourceByName) {
      console.log(`[BUGNAME] [resolveSourceName] ✅ Found by sourceName: "${sourceByName.sourceName}"`);
      console.log(`[BUGNAME] [resolveSourceName] ========== END RESOLVING ==========\n`);
      return sourceByName.sourceName;
    }

    // Fallback: return the sourceId as-is (shouldn't happen in normal flow)
    console.warn(`[BUGNAME] [resolveSourceName] ⚠️ Could not resolve source, returning as-is: "${sourceId}"`);
    console.log(`[BUGNAME] [resolveSourceName] ========== END RESOLVING ==========\n`);
    return sourceId;
  };

  // Transform module configurations into workflow array
  const transformToWorkflowArray = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workflowArray: any[] = [];

    // Helper function to get stepOrder based on module position in modules array
    const getStepOrder = (moduleId: string): number => {
      const moduleIndex = modules?.findIndex(m => m.id === moduleId);
      return moduleIndex !== -1 ? moduleIndex + 1 : 0; // 1-based index
    };

    // Helper to find source by ID and get its source_name
    const getSourceName = (sourceId: string): string => {
      const source = allAvailableInputSources?.find(s => s?.id === sourceId);
      return source?.sourceName || '';
    };

    // Helper to get columns for a source
    const getSourceColumns = (sourceId: string): string[] => {
      const source = allAvailableInputSources?.find(s => s?.id === sourceId);
      if (!source) {
        return [];
      }

      // CRITICAL: For payload, use originalSelectedHeaders if available (excludes self-append generated columns)
      if ((source as any)?.originalSelectedHeaders || (source as any)?.originalHeaders) {
        const columns = (source as any)?.originalSelectedHeaders || (source as any)?.originalHeaders || [];
        return columns;
      }

      // Return selected headers if available, otherwise all headers
      const columns = source?.selectedHeaders || source?.headers || [];
      return columns;
    };

    // Note: resolveSourceName is defined at component level above (before transformToWorkflowArray)

    // Helper function to get fields/columns for a match source (for match_keys)
    const getMatchSourceFields = (sourceId: string): string[] => {
      // Check if it's a predefined match source (from API)
      if (sourceId?.startsWith('match_')) {
        const tableId = parseInt(sourceId?.replace('match_', ''));
        const matchTable = apiSources?.dbSource?.preconfiguredTables?.match?.find(
          (table: any) => table?.tableId === tableId
        );
        if (matchTable?.columns) {
          return matchTable?.columns?.map((col: any) => col?.name || col) || [];
        }
      } else {
        // Check if it's a custom match source or input source
        const source = allAvailableInputSources?.find(s => s?.id === sourceId);
        if (source) {
          return source?.selectedHeaders || source?.headers || [];
        }
      }
      return [];
    };

    // Helper function to transform field mappings to workflow format
    const transformFieldMappingsInline = (fieldMappings?: any[]): any[] => {
      if (!fieldMappings || fieldMappings?.length === 0) {
        return [];
      }

      return fieldMappings?.map(mapping => {
        const sourceMappings = mapping.selectedColumns?.map((col: string) => {
          const [sourceId, fieldName] = col?.split('::');
          // FIXED: Use resolveSourceName to handle custom sources
          const sourceName = resolveSourceName(sourceId);
          return `${sourceName}.${fieldName}`;
        }).join('|');

        return {
          field_name: mapping.fieldName,
          source_mappings: sourceMappings
        };
      });
    };

    // Transform Append Configurations
    appendConfigurations?.forEach((config, index) => {
      const stepOrder = getStepOrder('panel2') - 1; // Subtract 1 to start from 1

      // Use module-level field mappings (not config-level) - use panel2 for backward compatibility
      const fieldMappingsForConfig = transformFieldMappingsInline(appendModuleFieldMappings?.['panel2'] || []);

      const configJson = {
        input_sources: (config?.inputSources || []).map((sourceId: string) => ({
          source_id: resolveSourceName(sourceId), // FIXED: Use resolveSourceName to handle custom sources
          columns: getSourceColumns(sourceId)
        })),
        match_keys: config?.appendOnFields || [],
        is_self_append: false,
        append_sources: (config?.appendSources || []).map((sourceId: string, priority: number) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sourceObj: any = {
            source_id: resolveSourceName(sourceId), // FIXED: Use resolveSourceName to handle custom sources
            priority: priority + 1
          };

          // Get fields for this append source
          if (config?.appendFields && config.appendFields?.length > 0) {
            sourceObj.fields = config.appendFields;
          }

          return sourceObj;
        }),
        field_mappings: fieldMappingsForConfig
      };

      workflowArray?.push({
        stepOrder,
        internalStepOrder: index + 1,
        actionType: 'A',
        configJson,
        saveAsVersion: 0, // TODO: Add versioning support
        versionName: '' // TODO: Add version name if applicable
      });
    });

    // Transform Match Configurations
    matchConfigurations?.forEach((config, index) => {
      const stepOrder = getStepOrder('panel4') - 1; // Subtract 1 to start from 1

      // Use module-level field mappings (not config-level) - use panel4 for backward compatibility
      const fieldMappingsForConfig = transformFieldMappingsInline(matchModuleFieldMappings?.['panel4'] || []);

      const configJson = {
        input_sources: (config?.inputSources || []).map((sourceId: string) => ({
          source_id: resolveSourceName(sourceId), // FIXED: Use resolveSourceName to handle custom sources
          columns: getSourceColumns(sourceId)
        })),
        // Match Keys go to match_keys only (addFields are the Match Keys selected by user)
        match_keys: config?.addFields || config?.matchOnFields || [],
        match_sources: (config?.matchSources || []).map((sourceId: string) => {
          // FIXED: Use resolveSourceName to handle custom sources
          const matchSourceName = resolveSourceName(sourceId);

          // Determine source_type
          let sourceType = 'preconfigured';

          // Check if it's a versioned source
          const versionedSource = allAvailableInputSources?.find(s => s?.id === sourceId && s?.isVersioned);
          if (versionedSource) {
            sourceType = 'input';
          } else {
            // Check if it's a non-versioned input source
            const inputSource = allAvailableInputSources?.find(s => s?.id === sourceId);
            if (inputSource && !inputSource?.isVersioned) {
              const createdByModuleId = (inputSource as any)?.createdByModuleId;
              const createdByModuleIdStr = String(createdByModuleId || '');
              if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
                sourceType = 'input';
              }
            }
          }

          // Check if it's a custom source
          if (sourceType !== 'input') {
            const customSource = sharedCustomSources?.find(s => s?.id === sourceId);
            if (customSource) {
              if (customSource?.sourceType === 'Self') {
                sourceType = 'self_match';
              } else {
                sourceType = 'input';
              }
            }
          }

          return {
            source_type: sourceType,
            source_name: matchSourceName
          };
        }),
        is_expand: config?.expand || false,
        // Convert match type: 'full' ? 'F', 'any' ? 'A'
        match_type: config?.matchType === 'any' ? 'A' : 'F',
        field_mappings: fieldMappingsForConfig
      };

      workflowArray?.push({
        stepOrder,
        internalStepOrder: index + 1,
        actionType: 'M',
        configJson,
        saveAsVersion: 0, // TODO: Add versioning support
        versionName: '' // TODO: Add version name if applicable
      });
    });

    // Transform Suppress Configurations
    suppressConfigurations?.forEach((config, index) => {
      const stepOrder = getStepOrder('panel3') - 1; // Subtract 1 to start from 1

      // Use module-level field mappings (not config-level) - use panel3 for backward compatibility
      const fieldMappingsForConfig = transformFieldMappingsInline(suppressModuleFieldMappings?.['panel3'] || []);

      const configJson = {
        input_sources: (config?.inputSources || []).map((sourceId: string) => ({
          source_id: resolveSourceName(sourceId), // FIXED: Use resolveSourceName to handle custom sources
          columns: getSourceColumns(sourceId)
        })),
        suppress_on_fields: config?.suppressOnFields || [],
        suppress_sources: (config?.suppressSources || []).map((sourceId: string) =>
          resolveSourceName(sourceId) // FIXED: Use resolveSourceName to handle custom sources
        ),
        field_mappings: fieldMappingsForConfig
      };

      workflowArray?.push({
        stepOrder,
        internalStepOrder: index + 1,
        actionType: 'S',
        configJson,
        saveAsVersion: 0, // TODO: Add versioning support
        versionName: '' // TODO: Add version name if applicable
      });
    });

    // Sort by stepOrder, then by internalStepOrder
    workflowArray?.sort((a, b) => {
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
        if (!recipientEmail || !recipientEmail?.trim()) {                                                        
          setRecipientEmailError('Please enter recipient email');                                               
           return;                                                                                               
        } 

    // Validate scheduledDateTime when scheduleType is 'scheduled_at'
    if (scheduleType === 'scheduled_at' && (!scheduledDateTime || !scheduledDateTime?.trim())) {
      setScheduledDateTimeError('Please select scheduled date & time');
      return;
    }
    
    // if (inputSources.length === 0) {
    //   setSaveError('Please add at least one input source before saving.');
    //   return;
    // }
    
    try {
      setSaveLoading(true);

      // Prepare the payload for submitRequest1.php
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestDetails: any = {
        requestName: requestName,
        createdBy: 'system',  // TODO: Integrate with actual authentication
        updatedBy: 'system',  // TODO: Integrate with actual authentication
        requestType: scheduleType === 'adhoc' ? 'A' : 'S', // A � Adhoc, S � Schedule Later
        sendNotificationOn: notificationWhen === 'standard' ? 'S' : 'E', // S � Standard, E � Error Only
        recipientEmail: recipientEmail || ''
      };

      // Include ID if this is an existing request (for update payload)
      if (requestDetailsId) {
        requestDetails.id = requestDetailsId;
        
      }

      // Include scheduledDateTime when requestType is 'S' (Schedule Later)
      if (scheduleType === 'scheduled_at' && scheduledDateTime) {
        requestDetails.scheduledDateTime = scheduledDateTime;
      }

      // Debug: Check raw input sources before transformation
      

      // Debug: Specifically log Database sources with tableSourceId info
      const databaseSources = inputSources?.filter(s => s?.sourceType === 'Database');
      if (databaseSources?.length > 0) {
        
      }

      // Helper function to get stepOrder based on module position in modules array
      const getStepOrder = (moduleId: string): number => {
        const moduleIndex = modules?.findIndex(m => m.id === moduleId);
        return moduleIndex !== -1 ? moduleIndex + 1 : 0; // 1-based index
      };

      // Transform input sources to API format (only File and Database sources)
      const transformedInputSources = transformInputSourcesToAPIFormat(inputSources);

      

      // Helper: Get selected fields for an append source from append configurations
      const getSelectedFieldsForAppendSource = (sourceId: string): string[] => {
        const fieldsSet = new Set<string>();

        appendConfigurations?.forEach(config => {
          // Check if this configuration uses this append source
          if (config.appendSources && config.appendSources?.includes(sourceId)) {
            // Add the selected append fields from this configuration
            if (config.appendFields && config.appendFields?.length > 0) {
              config.appendFields?.forEach(field => fieldsSet.add(field));
            }
          }
        });

        return Array.from(fieldsSet);
      };

      // Transform append sources to API format with inputType: 'A'
      const appendStepOrder = getStepOrder('panel2'); // Get Append module's step order
      const transformedAppendSources = sharedCustomSources
        .filter(source => {
          // Filter by source type AND module that created it
          const sourceType = source?.sourceType as any;
          const isFileOrDatabaseOrSelf = sourceType === 'File' || sourceType === 'Database' || sourceType === 'Self' ||
                                    sourceType === 'F' || sourceType === 'T';

          // Check if source was created by Append module (panel2)
          const createdByModuleIdStr = String(source?.createdByModuleId || '');
          const createdByAppend = source.createdByModuleId &&
                                 (source.createdByModuleId === 'panel2' ||
                                  createdByModuleIdStr?.startsWith('panel2_'));

          return isFileOrDatabaseOrSelf && createdByAppend;
        })
        .map((source, appendIndex) => {
          

          // Get selected fields from append configurations
          const configSelectedFields = getSelectedFieldsForAppendSource(source.id);

          

          // Check if source is already in API format
          const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

          if (isAlreadyAPIFormat) {
            // Return source with inputType: 'A', stepOrder, and internalStepOrder
            const result: any = {
              ...source,
              inputType: 'A',
              stepOrder: appendStepOrder,
              internalStepOrder: appendIndex + 1 // 1-based index within append sources
            };

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              
            }

            return result;
          }

          // Transform File sources
          if (source?.sourceType === 'File') {
            // Get headers
            const headers = source?.headers || [];

            // IMPORTANT: Always use ALL headers defined in the custom source
            // The custom source definition should contain all columns, regardless of which fields are selected in "Fields to Append"
            // The "Fields to Append" selection is for the append configuration, not for filtering the custom source definition
            const selectedHeaders = source?.selectedHeaders && source?.selectedHeaders?.length > 0
              ? source.selectedHeaders
              : headers;

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return '';

              // Extract the actual filename from path (last part after slash)
              const actualFileName = fileName.split('/').pop()?.split('\\').pop() || '';

              // Check if it has a valid file extension
              const parts = actualFileName.split('.');
              if (parts.length < 2) return ''; // No extension

              const extension = parts.pop()?.toUpperCase() || '';

              // Validate extension (2-5 chars, alphanumeric only)
              if (extension.length >= 2 && extension.length <= 5 && /^[A-Z0-9]+$/.test(extension)) {
                return extension;
              }

              return '';
            };

            const inputType = source.fileSourceId ? 'I' : 'M';

            // Extract filters from filterJson if filterQuery is empty
            let filters = source.filterQuery || '';
            if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
              try {
                const filterGroup = source?.filterJson[0];
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
                      filterParts?.push(conditionStr);
                    }
                  });
                  if (filterParts?.length > 0) {
                    const logicalOp = filterGroup?.logicalOperator || 'AND';
                    filters = filterParts?.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                
              }
            }

            console.log('[filename] ========== Building APPEND payload ==========');
            console.log('[filename] source.fileName:', source.fileName);
            console.log('[filename] source.filePath:', source.filePath);
            console.log('[filename] source.fileSource:', source.fileSource);
            console.log('[filename] source.subSourceType:', source.subSourceType);
            console.log('[filename] source object:', source);

            const result: any = {
              sourceName: source.sourceName,
              sourceType: 'F',
              dataSourceId: source.fileSourceId || null,
              filePath: source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || source.filePath),
              isHeader: source.hasHeader ? 1 : 0,
              columnSelectionType: columnSelectionType,
              columns: headers,
              selectedColumns: selectedHeaders?.join(','),
              inputType: 'A', // Append sources have inputType: 'A'
              filters: filters,
              customHeaders: source.customHeaders || '',
              filterJson: source.filterJson || null,
              subSourceType: source.subSourceType,
              stepOrder: appendStepOrder,
              internalStepOrder: appendIndex + 1 // 1-based index within append sources
            };

            // Include fileName ONLY for Desktop sources (from API response or empty string)
            if (source.fileSource === 'Desktop' || source.subSourceType === 'Desktop') {
              result.fileName = source.fileName || '';
              console.log('[filename] Desktop source detected, including fileName:', result.fileName);
            } else {
              console.log('[filename] Not a Desktop source (SFTP/AWS/NFS), NOT including fileName field');
            }

            console.log('[filename] Final result:', result);

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;

            }

            return result;
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // IMPORTANT: Always use ALL headers defined in the custom source
            // The custom source definition should contain all columns, regardless of which fields are selected in "Fields to Append"
            // The "Fields to Append" selection is for the append configuration, not for filtering the custom source definition
            const selectedHeaders = source?.selectedHeaders && source?.selectedHeaders?.length > 0
              ? source.selectedHeaders
              : headers;

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get database metadata
            const dbName = source?.customTableMetadata?.database || source?.database || '';
            const tableName = source?.customTableMetadata?.tableName || source?.table || '';
            const schema = source?.customTableMetadata?.schema || source?.schema || '';

            // Get filters
            let filters = source?.filterQuery || '';
            if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
              try {
                const filterGroup = source?.filterJson[0];
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
                      filterParts?.push(conditionStr);
                    }
                  });
                  if (filterParts?.length > 0) {
                    const logicalOp = filterGroup?.logicalOperator || 'AND';
                    filters = filterParts?.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                
              }
            }

            const result: any = {
              sourceName: source?.sourceName || 'Unknown Source',
              sourceType: 'T', // Database -> "T"
              columnSelectionType: columnSelectionType,
              columns: headers,
              selectedColumns: selectedHeaders?.join(','),
              inputType: 'A', // Append sources have inputType: 'A'
              filters,
              filterJson: source?.filterJson || null, // Include filterJson for database sources
              isCustomTable: (!source?.originalTableName || source?.customTableMetadata) ? 1 : 0,
              stepOrder: appendStepOrder,
              internalStepOrder: appendIndex + 1 // 1-based index within append sources
            };

            if (dbName) result.dbName = dbName;
            if (tableName) result.tableName = tableName;
            if (schema) result.schema = schema;

            // Include sourceOption (tableId) for preconfigured tables
            if (source?.tableSourceId) {
              result.sourceOption = source.tableSourceId;
            }

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              
            }

            return result;
          }

          // Transform Self sources
          if (source?.sourceType === 'Self') {
            const selfSource = source as any;
            

            // Helper function to generate SQL from filterJson
            const generateSQLFromFilterJson = (filterJson: any[]): string => {
              if (!filterJson || filterJson.length === 0) return '';

              const groupQueries = filterJson.map((group: any) => {
                const conditionQueries = group.conditions
                  ?.filter((cond: any) => cond?.field && cond?.operator)
                  ?.map((cond: any) => {
                    let sqlFragment = '';
                    if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') {
                      sqlFragment = `(${cond.field} ${cond.operator})`;
                    } else if (cond.operator === 'BETWEEN') {
                      sqlFragment = `(${cond.field} BETWEEN '${cond.value}' AND '${cond.value2 || ''}')`;
                    } else if (cond.operator === 'LIKE' || cond.operator === 'NOT LIKE') {
                      sqlFragment = `(${cond.field} ${cond.operator} '%${cond.value}%')`;
                    } else if (cond.operator === 'IN' || cond.operator === 'NOT IN') {
                      const values = cond.value
                        .split(',')
                        .map((v: string) => v.trim())
                        .filter((v: string) => v.length > 0)
                        .map((v: string) => `'${v}'`)
                        .join(',');
                      sqlFragment = `(${cond.field} ${cond.operator} (${values}))`;
                    } else {
                      sqlFragment = `(${cond.field} ${cond.operator} '${cond.value}')`;
                    }
                    return sqlFragment;
                  });

                if (!conditionQueries || conditionQueries.length === 0) {
                  return { query: '', operator: group.groupOperator || 'OR' };
                }

                const query = conditionQueries.length === 1
                  ? conditionQueries[0]
                  : `(${conditionQueries.join(` ${group.logicalOperator} `)})`;

                return { query, operator: group.groupOperator || 'OR' };
              });

              const validQueries = groupQueries.filter((q: any) => q?.query !== '');

              if (validQueries.length === 0) return '';
              if (validQueries.length === 1) return validQueries[0]?.query;

              let result = validQueries[0]?.query;
              for (let i = 1; i < validQueries.length; i++) {
                const currentOperator = validQueries[i - 1]?.operator;
                result = `(${result} ${currentOperator} ${validQueries[i]?.query})`;
              }

              return result;
            };

            // Get assignment_sets and tiering_on directly from selfConfig
            const assignmentSets = selfSource?.selfConfig?.assignment_sets || [];
            const tieringOn = selfSource?.selfConfig?.tiering_on ?? null;

            // Transform assignment_sets: regenerate filter_sql from filterJson
            const transformedAssignmentSets = assignmentSets?.map((set: any) => {
              const transformed: any = {
                value_to_assign: set?.value_to_assign || '',
                filter_sql: '', // Will be regenerated
              };

              // Rename filter_config to filterJson if it exists, and regenerate filter_sql
              if (set?.filter_config) {
                transformed.filterJson = set.filter_config;
                // Regenerate filter_sql from filterJson
                transformed.filter_sql = generateSQLFromFilterJson(set.filter_config);
              } else if (set?.filterJson) {
                transformed.filterJson = set.filterJson;
                // Regenerate filter_sql from filterJson
                transformed.filter_sql = generateSQLFromFilterJson(set.filterJson);
              } else {
                // Fallback to existing filter_sql if no filterJson
                transformed.filter_sql = set?.filter_sql || '';
              }

              return transformed;
            });

            const result: any = {
              sourceName: selfSource?.sourceName || 'Self_Source',
              sourceType: 'self',
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
                assignment_sets: transformedAssignmentSets,
                tiering_on: tieringOn
              },
              stepOrder: appendStepOrder,
              internalStepOrder: appendIndex + 1 // 1-based index within append sources
            };

            // Include ID if this is an existing source (for update payload)
            if ((selfSource as any)?.hasExistingId && selfSource?.id) {
              result.id = selfSource.id;
              
            }

            
            return result;
          }

          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      
      
      
      
      if (transformedAppendSources?.length > 0) {
        transformedAppendSources?.forEach((source, index) => {
          
        });
        
      } else {
        
      }
      

      // Helper: Get selected fields for a match source from match configurations
      const getSelectedFieldsForMatchSource = (sourceId: string): string[] => {
        const fieldsSet = new Set<string>();

        matchConfigurations?.forEach(config => {
          // Check if this configuration uses this match source
          if (config.matchSources && config.matchSources?.includes(sourceId)) {
            // Add fields from the match configuration
            if (config.addFields && config.addFields?.length > 0) {
              config.addFields?.forEach(field => fieldsSet.add(field));
            }
          }
        });

        return Array.from(fieldsSet);
      };

      // Helper: Get selected fields for a suppress source from suppress configurations
      const getSelectedFieldsForSuppressSource = (sourceId: string): string[] => {
        const fieldsSet = new Set<string>();

        suppressConfigurations?.forEach(config => {
          // Check if this configuration uses this suppress source
          if (config.suppressSources && config.suppressSources?.includes(sourceId)) {
            // Add fields from the suppress configuration
            if (config.suppressOnFields && config.suppressOnFields?.length > 0) {
              config.suppressOnFields?.forEach(field => fieldsSet.add(field));
            }
          }
        });

        return Array.from(fieldsSet);
      };

      // Transform match sources to API format with inputType: 'M'
      const matchStepOrder = getStepOrder('panel4'); // Get Match module's step order
      const transformedMatchSources = sharedCustomSources
        .filter(source => {
          // Filter by source type AND module that created it
          const sourceType = source?.sourceType as any;
          const isFileOrDatabase = sourceType === 'File' || sourceType === 'Database' ||
                                    sourceType === 'F' || sourceType === 'T';

          // Check if source was created by Match module (panel4)
          const createdByModuleIdStr = String(source?.createdByModuleId || '');
          const createdByMatch = source.createdByModuleId &&
                                 (source.createdByModuleId === 'panel4' ||
                                  createdByModuleIdStr?.startsWith('panel4_'));

          return isFileOrDatabase && createdByMatch;
        })
        .map((source, matchIndex) => {
          

          // Get selected fields from match configurations
          const configSelectedFields = getSelectedFieldsForMatchSource(source.id);



          // Check if source is already in API format
          const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

          if (isAlreadyAPIFormat) {
            // Return source with inputType: 'M'
            const result: any = {
              ...source,
              inputType: 'M'
            };

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;

            }

            return result;
          }

          // Transform File sources
          if (source?.sourceType === 'File') {
            // Get headers
            const headers = source?.headers || [];

            // IMPORTANT: Always use ALL headers defined in the custom source
            // The custom source definition should contain all columns, regardless of which fields are selected in match configuration
            const selectedHeaders = source?.selectedHeaders && source?.selectedHeaders?.length > 0
              ? source.selectedHeaders
              : headers;

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return '';

              // Extract the actual filename from path (last part after slash)
              const actualFileName = fileName.split('/').pop()?.split('\\').pop() || '';

              // Check if it has a valid file extension
              const parts = actualFileName.split('.');
              if (parts.length < 2) return ''; // No extension

              const extension = parts.pop()?.toUpperCase() || '';

              // Validate extension (2-5 chars, alphanumeric only)
              if (extension.length >= 2 && extension.length <= 5 && /^[A-Z0-9]+$/.test(extension)) {
                return extension;
              }

              return '';
            };

            // Extract filters from filterJson if filterQuery is empty
            let filters = source.filterQuery || '';
            if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
              try {
                const filterGroup = source?.filterJson[0];
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
                      filterParts?.push(conditionStr);
                    }
                  });
                  if (filterParts?.length > 0) {
                    const logicalOp = filterGroup?.logicalOperator || 'AND';
                    filters = filterParts?.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                
              }
            }

            const result: any = {
              sourceName: source.sourceName,
              sourceType: 'F',
              dataSourceId: source.fileSourceId || null,
              filePath: source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || source.filePath),
              isHeader: source.hasHeader ? 1 : 0,
              columnSelectionType: columnSelectionType,
              columns: headers,
              selectedColumns: selectedHeaders?.join(','),
              inputType: 'M', // Match sources have inputType: 'M'
              filters: filters,
              customHeaders: source.customHeaders || '',
              filterJson: source.filterJson || null,
              subSourceType: source.subSourceType,
              stepOrder: matchStepOrder,
              internalStepOrder: matchIndex + 1 // 1-based index within match sources
            };

            // Include fileName ONLY for Desktop sources (from API response or empty string)
            if (source.fileSource === 'Desktop' || source.subSourceType === 'Desktop') {
              result.fileName = source.fileName || '';
            }

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;

            }

            return result;
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // IMPORTANT: Always use ALL headers defined in the custom source
            // The custom source definition should contain all columns, regardless of which fields are selected in configuration
            const selectedHeaders = source?.selectedHeaders && source?.selectedHeaders?.length > 0
              ? source.selectedHeaders
              : headers;

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get database metadata
            const dbName = source?.customTableMetadata?.database || source?.database || '';
            const tableName = source?.customTableMetadata?.tableName || source?.table || '';
            const schema = source?.customTableMetadata?.schema || source?.schema || '';

            // Get filters
            let filters = source?.filterQuery || '';
            if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
              try {
                const filterGroup = source?.filterJson[0];
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
                
              }
            }

            const result: any = {
              sourceName: source.sourceName,
              sourceType: 'T',
              inputType: 'M', // Match sources have inputType: 'M'
              dbName: dbName,
              schema: schema,
              tableName: tableName,
              columns: headers,
              selectedColumns: selectedHeaders?.join(','),
              columnSelectionType: columnSelectionType,
              isCustomTable: 1,
              filters: filters,
              filterJson: source?.filterJson || null, // Include filterJson for database sources
              stepOrder: matchStepOrder,
              internalStepOrder: matchIndex + 1 // 1-based index within match sources
            };

            // Include sourceOption (tableId) for preconfigured tables
            if (source?.tableSourceId) {
              result.sourceOption = source.tableSourceId;
            }

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              
            }

            return result;
          }

          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      
      
      
      
      if (transformedMatchSources?.length > 0) {
        transformedMatchSources?.forEach((source, index) => {
          
        });
        
      } else {
        
      }
      

      // Transform suppress sources to API format with inputType: 'S'
      const suppressStepOrder = getStepOrder('panel3'); // Get Suppress module's step order
      const transformedSuppressSources = sharedCustomSources
        .filter(source => {
          // Filter by source type AND module that created it
          const sourceType = source?.sourceType as any;
          const isFileOrDatabase = sourceType === 'File' || sourceType === 'Database' ||
                                    sourceType === 'F' || sourceType === 'T';

          // Check if source was created by Suppress module (panel3)
          const createdByModuleIdStr = String(source?.createdByModuleId || '');
          const createdBySuppress = source.createdByModuleId &&
                                    (source.createdByModuleId === 'panel3' ||
                                     createdByModuleIdStr?.startsWith('panel3_'));

          return isFileOrDatabase && createdBySuppress;
        })
        .map((source, suppressIndex) => {
          

          // Get selected fields from suppress configurations
          const configSelectedFields = getSelectedFieldsForSuppressSource(source.id);



          // Check if source is already in API format
          const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

          if (isAlreadyAPIFormat) {
            // Return source with inputType: 'S'
            const result: any = {
              ...source,
              inputType: 'S'
            };

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;

            }

            return result;
          }

          // Transform File sources
          if (source?.sourceType === 'File') {
            // Get headers
            const headers = source?.headers || [];

            // IMPORTANT: Always use ALL headers defined in the custom source
            // The custom source definition should contain all columns, regardless of which fields are selected in suppress configuration
            const selectedHeaders = source?.selectedHeaders && source?.selectedHeaders?.length > 0
              ? source.selectedHeaders
              : headers;

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return '';

              // Extract the actual filename from path (last part after slash)
              const actualFileName = fileName.split('/').pop()?.split('\\').pop() || '';

              // Check if it has a valid file extension
              const parts = actualFileName.split('.');
              if (parts.length < 2) return ''; // No extension

              const extension = parts.pop()?.toUpperCase() || '';

              // Validate extension (2-5 chars, alphanumeric only)
              if (extension.length >= 2 && extension.length <= 5 && /^[A-Z0-9]+$/.test(extension)) {
                return extension;
              }

              return '';
            };

            // Extract filters from filterJson if filterQuery is empty
            let filters = source.filterQuery || '';
            if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
              try {
                const filterGroup = source?.filterJson[0];
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
                      filterParts?.push(conditionStr);
                    }
                  });
                  if (filterParts?.length > 0) {
                    const logicalOp = filterGroup?.logicalOperator || 'AND';
                    filters = filterParts?.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                
              }
            }

            const result: any = {
              sourceName: source.sourceName,
              sourceType: 'F',
              dataSourceId: source.fileSourceId || null,
              filePath: source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || source.filePath),
              isHeader: source.hasHeader ? 1 : 0,
              columnSelectionType: columnSelectionType,
              columns: headers,
              selectedColumns: selectedHeaders?.join(','),
              inputType: 'S', // Suppress sources have inputType: 'S'
              filters: filters,
              customHeaders: source.customHeaders || '',
              filterJson: source.filterJson || null,
              subSourceType: source.subSourceType,
              stepOrder: suppressStepOrder,
              internalStepOrder: suppressIndex + 1 // 1-based index within suppress sources
            };

            // Include fileName ONLY for Desktop sources (from API response or empty string)
            if (source.fileSource === 'Desktop' || source.subSourceType === 'Desktop') {
              result.fileName = source.fileName || '';
            }

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;

            }

            return result;
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // IMPORTANT: Always use ALL headers defined in the custom source
            // The custom source definition should contain all columns, regardless of which fields are selected in configuration
            const selectedHeaders = source?.selectedHeaders && source?.selectedHeaders?.length > 0
              ? source.selectedHeaders
              : headers;

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get database metadata
            const dbName = source?.customTableMetadata?.database || source?.database || '';
            const tableName = source?.customTableMetadata?.tableName || source?.table || '';
            const schema = source?.customTableMetadata?.schema || source?.schema || '';

            // Get filters
            let filters = source?.filterQuery || '';
            if (!filters && source?.filterJson && Array.isArray(source?.filterJson) && source?.filterJson?.length > 0) {
              try {
                const filterGroup = source?.filterJson[0];
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
                
              }
            }

            const result: any = {
              sourceName: source.sourceName,
              sourceType: 'T',
              inputType: 'S', // Suppress sources have inputType: 'S'
              dbName: dbName,
              schema: schema,
              tableName: tableName,
              columns: headers,
              selectedColumns: selectedHeaders?.join(','),
              columnSelectionType: columnSelectionType,
              isCustomTable: 1,
              filters: filters,
              filterJson: source?.filterJson || null, // Include filterJson for database sources
              stepOrder: suppressStepOrder,
              internalStepOrder: suppressIndex + 1 // 1-based index within suppress sources
            };

            // Include sourceOption (tableId) for preconfigured tables
            if (source?.tableSourceId) {
              result.sourceOption = source.tableSourceId;
            }

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              
            }

            return result;
          }

          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      
      
      
      
      if (transformedSuppressSources?.length > 0) {
        transformedSuppressSources?.forEach((source, index) => {
          
        });
        
      } else {
        
      }
      

      // Combine all input sources: regular inputs, append sources, match sources, and suppress sources
      const allTransformedInputSources = [
        ...transformedInputSources,
        ...transformedAppendSources,
        ...transformedMatchSources,
        ...transformedSuppressSources
      ];

      
      
      
      
      
      
      
      
      

      // Transform stats data to API format using the Stats module's transformation function
      const transformedStats = transformAllStatsToAPI(statsConfigurations, allAvailableInputSources);

      // Use the transformed output data from the OutputModule
      // The transformation is now handled within the OutputModule itself
      const transformedOutput = transformedOutputData;

      // Transform suppress configurations to API format
      const transformSuppressToAPIFormat = () => {
        if (!suppressConfigurations?.length) {
          return null;
        }

        const suppressPayload = suppressConfigurations?.map(config => ({
          input_sources: config?.inputSources?.map((sourceId: string) => {
            const source = allAvailableInputSources?.find(s => s?.id === sourceId);

            if (!source) {
              
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
            const source = allAvailableInputSources?.find(s => s?.id === sourceId);
            return source?.sourceName || '';
          }).filter(Boolean) // Remove any empty strings
        }));

        return suppressPayload;
      };

      // Extract ALL input sources and versions in creation order for the workflow array
      const extractInputSourcesAndVersionsForWorkflow = () => {

        // Process all input sources in the order they were created
        // This maintains the correct sequence: source, version, source, version, etc.
        const workflowItems = inputSources?.map((source, index) => {
          const isVersioned = source.isVersioned === true;

          if (isVersioned) {
            // This is a versioned source
            const { stepOrder, actionType, saveAsVersion, versionName, configJson } = source as any;

            

            const workflowItem: any = {
              stepOrder: stepOrder || 1,
              actionType: actionType || 'I',
              saveAsVersion: saveAsVersion || 1,
              versionName: versionName || source.sourceName,
              internalStepOrder: index + 1,  // Sequential based on creation order
              configJson: configJson || {
                operation: source.versionConfig?.combineAs || 'union',
                input_sources: [],
                added_fields: [],
                field_mappings: [],
                merge_keys: source.headers || [],
                priority_order: source.headers || []
              }
            };

            // Include ID if this is an existing version (for update payload)
            if ((source as any).hasExistingId && (source as any).workflowItemId) {
              workflowItem.id = (source as any).workflowItemId;
            }

            return workflowItem;
          } else {
            // This is a regular input source

            const workflowItem: any = {
              stepOrder: 1,
              internalStepOrder: index + 1,  // Sequential based on creation order
              actionType: 'I',
              configJson: {
                input_sources: [source.sourceName]
              }
            };

            // Include ID if this is an existing input source (for update payload)
            // Use workflowStepId (NOT source.id) - workflowStepId is the workflow item ID from the API
            if ((source as any).hasExistingId && (source as any).workflowStepId) {
              workflowItem.id = (source as any).workflowStepId;
            } else {
            }

            return workflowItem;
          }
        });

        return workflowItems;
      };

      // Helper function to get fields for a specific source
      // IMPORTANT: Always prioritizes appendFields (explicitly selected by user) over field mappings
      // Field mappings are sent separately in the "field_mappings" array and should NOT affect the "fields" array
      const getFieldsForSource = (sourceId: string, fieldMappings?: any[], appendFields?: string[]): string[] => {
        const fieldsSet = new Set<string>();

        // IMPORTANT: Always prioritize appendFields (explicitly selected by user in "Fields to Append")
        // Field mappings are sent separately and should NOT interfere with this
        // This applies to ALL sources including custom sources
        if (appendFields && appendFields?.length > 0) {
          // Get the source to check its headers
          const source = allAvailableInputSources?.find(s => s.id === sourceId);

          // Check if it's a custom source
          const customSource = sharedCustomSources?.find(s => s.id === sourceId);
          // Check if it's a preconfigured source
          let preconfiguredSource = null;
          const sourceIdStr = String(sourceId || '');
          if (sourceIdStr?.startsWith('append_')) {
            preconfiguredSource = apiSources?.dbSource?.preconfiguredTables?.append?.find(
              (table: any) => `append_${table?.tableId}` === sourceIdStr
            );
          }

          // Get headers from the appropriate source (includes custom sources)
          let rawHeaders = source?.headers || customSource?.headers || preconfiguredSource?.columns || [];

          // Normalize headers to strings (they might be objects with columnName property)
          const sourceHeaders = rawHeaders?.map((h: any) => {
            if (typeof h === 'string') return h;
            if (h && typeof h === 'object' && h.columnName) return h.columnName;
            if (h && typeof h === 'object' && h.name) return h.name;
            return String(h);
          }).filter(Boolean);

          
          
          
          
          
          
          

          // Add fields from appendFields that exist in this source's headers (case-insensitive)
          appendFields?.forEach(field => {
            const fieldLower = field?.toLowerCase();
            const matchingHeader = sourceHeaders?.find((h: string) => h?.toLowerCase() === fieldLower);
            if (matchingHeader) {
              fieldsSet.add(matchingHeader); // Use the original casing from the source
              
            } else {
              
            }
          });
        }

        return Array.from(fieldsSet);
      };

      // Helper function to transform field mappings to workflow format
      const transformFieldMappings = (fieldMappings?: any[]): any[] => {
        if (!fieldMappings || fieldMappings?.length === 0) {
          return [];
        }

        return fieldMappings?.map(mapping => {
          // selectedColumns is in format: ["sourceId::fieldName", "sourceId::fieldName"]
          // Transform to: "SourceName.fieldName|SourceName2.fieldName2"
          const sourceMappings = mapping.selectedColumns?.map((col: string) => {
            const [sourceId, fieldName] = col?.split('::');
            // FIXED: Use resolveSourceName to handle custom sources
            const sourceName = resolveSourceName(sourceId);
            return `${sourceName}.${fieldName}`;
          }).join('|');

          return {
            field_name: mapping.fieldName,
            source_mappings: sourceMappings
          };
        });
      };

      // Extract Append configurations and versions combined, sorted by creation order
      const extractAppendItemsForWorkflow = () => {
        const appendItems: any[] = [];

        
        

        // Log configurations grouped by module
        const configsByModule = new Map<string, number>();
        appendConfigurations?.forEach(config => {
          const moduleId = config.createdByModuleId || 'unknown';
          configsByModule.set(moduleId, (configsByModule.get(moduleId) || 0) + 1);
        });
        
        configsByModule?.forEach((count, moduleId) => {
          
        });

        // Add append configurations with their createdAt timestamps
        appendConfigurations?.forEach((config, configIndex) => {
          
          
          
          

          // Warn if configuration is missing critical properties
          if (!config.createdByModuleId) {
            
          }
          if (!config.createdAt) {
            
          }
          
          

          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map((sourceId, idx) => {
            console.log(`[BUGNAME] [inputSources] === Processing input source ${idx + 1}/${config.inputSources?.length} ===`);
            console.log(`[BUGNAME] [inputSources] Original sourceId: "${sourceId}"`);

            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            let source = allAvailableInputSources?.find(s => s.id === sourceId);

            if (source) {
              console.log(`[BUGNAME] [inputSources] Found in allAvailableInputSources: "${source.sourceName}"`);
            }

            // If not found, search in sharedCustomSources (custom sources from Append/Match/Suppress modules)
            if (!source) {
              source = sharedCustomSources?.find(s => s.id === sourceId);
              if (source) {
                console.log(`[BUGNAME] [inputSources] Found in sharedCustomSources: "${source.sourceName}"`);
              } else {
                console.log(`[BUGNAME] [inputSources] ❌ Source NOT FOUND in any array`);
              }
            }

            // FIXED: Use resolveSourceName to handle custom sources properly
            const resolvedSourceName = resolveSourceName(sourceId);

            const result = {
              source_name: resolvedSourceName,
              columns: source?.headers || []
            };

            console.log(`[BUGNAME] [inputSources] ✅ Final result:`, JSON.stringify(result, null, 2));
            return result;
          });

          // Transform append sources to the required format
          const configModuleId = config?.createdByModuleId || 'panel2';
          const appendSourcesForConfig = (config?.appendSources || [])
            .map((sourceId, idx) => {
              console.log(`[BUGNAME] [appendSources] === Processing append source ${idx + 1}/${config.appendSources?.length} ===`);
              console.log(`[BUGNAME] [appendSources] Original sourceId: "${sourceId}"`);

              // Get fields specific to this source from module-level field mappings or appendFields
              const sourceFields = getFieldsForSource(sourceId, appendModuleFieldMappings?.[configModuleId] || [], config?.appendFields);

              // FIXED: Use resolveSourceName to handle all source types consistently
              const resolvedSourceName = resolveSourceName(sourceId);

              // First check if it's a versioned source (from Input, Append, Match, or Suppress modules)
              const versionedSource = allAvailableInputSources?.find(s => s.id === sourceId && s.isVersioned);
              if (versionedSource) {
                console.log(`[BUGNAME] [appendSources] Detected VERSIONED source`);
                const result = {
                  source_type: 'input',
                  source_name: resolvedSourceName, // Use resolved name
                  fields: sourceFields
                };
                console.log(`[BUGNAME] [appendSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              // Check if it's a non-versioned input source
              const inputSource = allAvailableInputSources?.find(s => s.id === sourceId);
              if (inputSource && !inputSource.isVersioned) {
                const createdByModuleId = (inputSource as any).createdByModuleId;
                const createdByModuleIdStr = String(createdByModuleId || '');
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
                  console.log(`[BUGNAME] [appendSources] Detected non-versioned INPUT source`);
                  const result = {
                    source_type: 'input',
                    source_name: resolvedSourceName, // Use resolved name
                    fields: sourceFields
                  };
                  console.log(`[BUGNAME] [appendSources] ✅ Result:`, JSON.stringify(result, null, 2));
                  return result;
                }
              }

              // Check if it's a custom append source
              const customSource = sharedCustomSources?.find(s => s.id === sourceId);
              const customCreatedByModuleIdStr = String(customSource?.createdByModuleId || '');
              const isCustomAppendSource = customSource &&
                                          customSource.createdByModuleId &&
                                          (customSource.createdByModuleId === 'panel2' ||
                                           customCreatedByModuleIdStr?.startsWith('panel2_'));

              if (isCustomAppendSource) {
                const isSelfAppend = customSource?.sourceType === 'Self';
                console.log(`[BUGNAME] [appendSources] Detected CUSTOM append source, isSelf: ${isSelfAppend}`);
                const result = {
                  source_type: isSelfAppend ? 'self_append' : 'input',
                  source_name: resolvedSourceName, // Use resolved name
                  fields: sourceFields
                };
                console.log(`[BUGNAME] [appendSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              // Check if it's a preconfigured append source
              const sourceIdStr = String(sourceId || '');
              if (sourceIdStr?.startsWith('append_')) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.append?.find(
                  (table: any) => `append_${table?.tableId}` === sourceIdStr
                );
                const sourceName = predefined ? predefined.tableName : sourceIdStr;
                console.log(`[BUGNAME] [appendSources] Detected PRECONFIGURED source`);
                const result = {
                  source_type: 'preconfigured',
                  source_name: sourceName,
                  fields: sourceFields
                };
                console.log(`[BUGNAME] [appendSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              console.log(`[BUGNAME] [appendSources] ⚠️ No matching case, returning null`);
              return null;
            })
            .filter(Boolean)
            .map((source, index) => ({
              ...source,
              priority: index + 1
            }));

          // Use module-level field mappings (not config-level) specific to this module
          const moduleId = config?.createdByModuleId || 'panel2';
          const fieldMappingsForConfig = transformFieldMappings(appendModuleFieldMappings?.[moduleId] || []);

          
          
          

          const configJson = {
            input_sources: inputSourcesForConfig,
            match_keys: config.appendOnFields || [],
            is_self_append: appendSourcesForConfig?.some((s: any) => s.source_type === 'self_append'),
            append_sources: appendSourcesForConfig,
            field_mappings: fieldMappingsForConfig
          };

          

          // Calculate stepOrder based on the config's createdByModuleId
          const configStepOrder = config.createdByModuleId ? getStepOrder(config.createdByModuleId) : getStepOrder('panel2');
          

          // Ensure configuration has a createdAt timestamp for proper sorting
          // If missing, use current time plus index to ensure unique ordering
          const createdAtTimestamp = config.createdAt || (Date.now() + configIndex);

          appendItems?.push({
            stepOrder: configStepOrder,
            actionType: 'A',
            configJson,
            createdAt: createdAtTimestamp,
            itemType: 'config',
            moduleId: config.createdByModuleId || 'panel2', // Store moduleId for tracking
            // Include ID if this is an existing config (for update payload)
            ...(config.hasExistingId && config.workflowItemId && { id: config.workflowItemId })
          });
        });

        // Add append versions with their createdAt timestamps
        const appendVersions = versionedSources?.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Append'
        );

        

        appendVersions?.forEach((source, versionIndex) => {
          const { actionType, saveAsVersion, versionName, configJson, createdByModuleId } = source as any;

          

          // IMPORTANT: Recalculate stepOrder based on current module position
          // Don't use stored stepOrder as it may be outdated if modules were reordered/duplicated
          const versionStepOrder = createdByModuleId ? getStepOrder(createdByModuleId) : getStepOrder('panel2');

          

          // Inject module-level field mappings into the version (override any stored field mappings)
          const versionModuleId = createdByModuleId || 'panel2';
          const fieldMappingsForVersion = transformFieldMappings(appendModuleFieldMappings?.[versionModuleId] || []);

          // FIXED: Transform version configJson to resolve source names
          console.log(`[BUGNAME] [appendVersion] Transforming version "${versionName}"`);
          const transformedConfigJson = transformVersionConfigJson(configJson);

          const updatedConfigJson = {
            ...transformedConfigJson,  // Use transformed config
            field_mappings: fieldMappingsForVersion
          };

          appendItems?.push({
            stepOrder: versionStepOrder, // Use recalculated stepOrder
            actionType,
            saveAsVersion,
            versionName,
            configJson: updatedConfigJson,
            createdAt: (source as any).createdAt || 0,
            itemType: 'version',
            moduleId: createdByModuleId || 'panel2', // Store moduleId for tracking
            // Include ID if this is an existing version (for update payload)
            ...((source as any).hasExistingId && (source as any).workflowItemId && { id: (source as any).workflowItemId })
          });
        });

        // Group items by stepOrder and assign internalStepOrder per module
        const itemsByStepOrder = new Map<number, any[]>();
        appendItems?.forEach(item => {
          const stepOrder = item.stepOrder;
          if (!itemsByStepOrder.has(stepOrder)) {
            itemsByStepOrder.set(stepOrder, []);
          }
          itemsByStepOrder.get(stepOrder)!.push(item);
        });

        // Sort each group by createdAt and assign internalStepOrder starting from 1
        const workflowItems: any[] = [];
        itemsByStepOrder?.forEach((items, stepOrder) => {
          // Sort by creation time within this module
          items?.sort((a, b) => a.createdAt - b.createdAt);

          // Assign internalStepOrder starting from 1 for this module
          items?.forEach((item, indexInModule) => {
            const workflowItem: any = {
              stepOrder: item.stepOrder,
              internalStepOrder: indexInModule + 1, // Reset to 1 for each module
              actionType: item.actionType,
              configJson: item.configJson
            };

            if (item.itemType === 'version') {
              workflowItem.saveAsVersion = item.saveAsVersion;
              workflowItem.versionName = item.versionName;
            }

            // Include ID if this is an existing workflow item (for update payload)
            if (item.id) {
              workflowItem.id = item.id;
            }

            

            workflowItems?.push(workflowItem);
          });
        });

        // Log summary grouped by stepOrder
        
        
        const itemCountsByStepOrder = new Map<number, number>();
        workflowItems?.forEach(item => {
          const stepOrder = item.stepOrder;
          itemCountsByStepOrder.set(stepOrder, (itemCountsByStepOrder.get(stepOrder) || 0) + 1);
        });
        
        itemCountsByStepOrder?.forEach((count, stepOrder) => {
          const moduleIndex = stepOrder - 1;
          const module = modules[moduleIndex];
          
        });

        return workflowItems;
      };

      // Extract Suppress configurations and versions combined, sorted by creation order
      const extractSuppressItemsForWorkflow = () => {
        const suppressItems: any[] = [];

        
        

        // Log configurations grouped by module
        const configsByModule = new Map<string, number>();
        suppressConfigurations?.forEach(config => {
          const moduleId = config.createdByModuleId || 'unknown';
          configsByModule.set(moduleId, (configsByModule.get(moduleId) || 0) + 1);
        });
        
        configsByModule?.forEach((count, moduleId) => {
          
        });

        // Add suppress configurations with their createdAt timestamps
        suppressConfigurations?.forEach((config, index) => {
          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map((sourceId, idx) => {
            console.log(`[BUGNAME] [inputSources] === Processing input source ${idx + 1}/${config.inputSources?.length} ===`);
            console.log(`[BUGNAME] [inputSources] Original sourceId: "${sourceId}"`);

            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            let source = allAvailableInputSources?.find(s => s.id === sourceId);

            if (source) {
              console.log(`[BUGNAME] [inputSources] Found in allAvailableInputSources: "${source.sourceName}"`);
            }

            // If not found, search in sharedCustomSources (custom sources from Append/Match/Suppress modules)
            if (!source) {
              source = sharedCustomSources?.find(s => s.id === sourceId);
              if (source) {
                console.log(`[BUGNAME] [inputSources] Found in sharedCustomSources: "${source.sourceName}"`);
              } else {
                console.log(`[BUGNAME] [inputSources] ❌ Source NOT FOUND in any array`);
              }
            }

            // FIXED: Use resolveSourceName to handle custom sources properly
            const resolvedSourceName = resolveSourceName(sourceId);

            const result = {
              source_name: resolvedSourceName,
              columns: source?.headers || []
            };

            console.log(`[BUGNAME] [inputSources] ✅ Final result:`, JSON.stringify(result, null, 2));
            return result;
          });

          // Transform suppress sources to the required format
          const suppressSourcesForConfig = (config.suppressSources || [])
            .map((sourceId, idx) => {
              console.log(`[BUGNAME] [suppressSources] === Processing suppress source ${idx + 1}/${config.suppressSources?.length} ===`);
              console.log(`[BUGNAME] [suppressSources] Original sourceId: "${sourceId}"`);

              // FIXED: Use resolveSourceName to handle all source types consistently
              const resolvedSourceName = resolveSourceName(sourceId);

              // First check if it's a versioned source (from Input, Append, Match, or Suppress modules)
              const versionedSource = allAvailableInputSources?.find(s => s.id === sourceId && s.isVersioned);
              if (versionedSource) {
                console.log(`[BUGNAME] [suppressSources] Detected VERSIONED source`);
                const result = {
                  source_type: 'input',
                  source_name: resolvedSourceName // Use resolved name
                };
                console.log(`[BUGNAME] [suppressSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              // Check if it's a non-versioned input source
              const inputSource = allAvailableInputSources?.find(s => s.id === sourceId);
              if (inputSource && !inputSource.isVersioned) {
                const createdByModuleId = (inputSource as any).createdByModuleId;
                const createdByModuleIdStr = String(createdByModuleId || '');
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
                  console.log(`[BUGNAME] [suppressSources] Detected non-versioned INPUT source`);
                  const result = {
                    source_type: 'input',
                    source_name: resolvedSourceName // Use resolved name
                  };
                  console.log(`[BUGNAME] [suppressSources] ✅ Result:`, JSON.stringify(result, null, 2));
                  return result;
                }
              }

              const customSource = sharedCustomSources?.find(s => s.id === sourceId);
              const customCreatedByModuleIdStr = String(customSource?.createdByModuleId || '');
              const isCustomSuppressSource = customSource &&
                                            customSource.createdByModuleId &&
                                            (customSource.createdByModuleId === 'panel3' ||
                                             customCreatedByModuleIdStr?.startsWith('panel3_'));

              if (isCustomSuppressSource) {
                const isSelfSuppress = customSource?.sourceType === 'Self';
                console.log(`[BUGNAME] [suppressSources] Detected CUSTOM suppress source, isSelf: ${isSelfSuppress}`);
                const result = {
                  source_type: isSelfSuppress ? 'self_suppress' : 'input',
                  source_name: resolvedSourceName // Use resolved name
                };
                console.log(`[BUGNAME] [suppressSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              const sourceIdStr = String(sourceId || '');
              if (sourceIdStr?.startsWith('suppress_')) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.suppress?.find(
                  (table: any) => `suppress_${table?.tableId}` === sourceIdStr
                );
                const sourceName = predefined ? predefined.tableName : sourceIdStr;
                console.log(`[BUGNAME] [suppressSources] Detected PRECONFIGURED source`);
                const result = {
                  source_type: 'preconfigured',
                  source_name: sourceName
                };
                console.log(`[BUGNAME] [suppressSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              console.log(`[BUGNAME] [suppressSources] ⚠️ No matching case, returning null`);
              return null;
            })
            .filter(Boolean);

          // Use module-level field mappings (not config-level) specific to this module
          const moduleId = config?.createdByModuleId || 'panel3';
          const fieldMappingsForConfig = transformFieldMappings(suppressModuleFieldMappings?.[moduleId] || []);

          const configJson = {
            input_sources: inputSourcesForConfig,
            suppress_on_fields: config?.suppressOnFields || [],
            suppress_sources: suppressSourcesForConfig,
            field_mappings: fieldMappingsForConfig
          };

          // Calculate stepOrder based on the config's createdByModuleId
          const configStepOrder = config.createdByModuleId ? getStepOrder(config.createdByModuleId) : getStepOrder('panel3');
          

          // Ensure configuration has a createdAt timestamp for proper sorting
          const createdAtTimestamp = config.createdAt || (Date.now() + index);

          suppressItems?.push({
            stepOrder: configStepOrder,
            actionType: 'S',
            configJson,
            createdAt: createdAtTimestamp,
            itemType: 'config',
            moduleId: config.createdByModuleId || 'panel3', // Store moduleId for tracking
            // Include ID if this is an existing config (for update payload)
            ...(config.hasExistingId && config.workflowItemId && { id: config.workflowItemId })
          });
        });

        // Add suppress versions with their createdAt timestamps
        const suppressVersions = versionedSources?.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Suppress'
        );

        

        suppressVersions?.forEach((source, versionIndex) => {
          const { actionType, saveAsVersion, versionName, configJson, createdByModuleId } = source as any;

          

          // IMPORTANT: Recalculate stepOrder based on current module position
          // Don't use stored stepOrder as it may be outdated if modules were reordered/duplicated
          const versionStepOrder = createdByModuleId ? getStepOrder(createdByModuleId) : getStepOrder('panel3');

          

          // Inject module-level field mappings into the version (override any stored field mappings)
          const versionModuleId = createdByModuleId || 'panel3';
          const fieldMappingsForVersion = transformFieldMappings(suppressModuleFieldMappings?.[versionModuleId] || []);

          // FIXED: Transform version configJson to resolve source names
          console.log(`[BUGNAME] [suppressVersion] Transforming version "${versionName}"`);
          const transformedConfigJson = transformVersionConfigJson(configJson);

          const updatedConfigJson = {
            ...transformedConfigJson,  // Use transformed config
            field_mappings: fieldMappingsForVersion,
            // Ensure suppress_on_fields is included from version's operationFields or existing configJson
            suppress_on_fields: transformedConfigJson?.suppress_on_fields || (source as any)?.operationFields || []
          };

          suppressItems?.push({
            stepOrder: versionStepOrder, // Use recalculated stepOrder
            actionType,
            saveAsVersion,
            versionName,
            configJson: updatedConfigJson,
            createdAt: (source as any).createdAt || 0,
            itemType: 'version',
            moduleId: createdByModuleId || 'panel3', // Store moduleId for tracking
            // Include ID if this is an existing version (for update payload)
            ...((source as any).hasExistingId && (source as any).workflowItemId && { id: (source as any).workflowItemId })
          });
        });

        // Group items by stepOrder and assign internalStepOrder per module
        const itemsByStepOrder = new Map<number, any[]>();
        suppressItems?.forEach(item => {
          const stepOrder = item.stepOrder;
          if (!itemsByStepOrder.has(stepOrder)) {
            itemsByStepOrder.set(stepOrder, []);
          }
          itemsByStepOrder.get(stepOrder)!.push(item);
        });

        // Sort each group by createdAt and assign internalStepOrder starting from 1
        const workflowItems: any[] = [];
        itemsByStepOrder?.forEach((items, stepOrder) => {
          // Sort by creation time within this module
          items?.sort((a, b) => a.createdAt - b.createdAt);

          // Assign internalStepOrder starting from 1 for this module
          items?.forEach((item, indexInModule) => {
            const workflowItem: any = {
              stepOrder: item.stepOrder,
              internalStepOrder: indexInModule + 1, // Reset to 1 for each module
              actionType: item.actionType,
              configJson: item.configJson
            };

            if (item.itemType === 'version') {
              workflowItem.saveAsVersion = item.saveAsVersion;
              workflowItem.versionName = item.versionName;
            }

            // Include ID if this is an existing workflow item (for update payload)
            if (item.id) {
              workflowItem.id = item.id;
            }

            

            workflowItems?.push(workflowItem);
          });
        });

        return workflowItems;
      };

      // Extract Match configurations and versions combined, sorted by creation order
      const extractMatchItemsForWorkflow = () => {
        const matchItems: any[] = [];

        
        

        // Log configurations grouped by module
        const configsByModule = new Map<string, number>();
        matchConfigurations?.forEach(config => {
          const moduleId = config.createdByModuleId || 'unknown';
          configsByModule.set(moduleId, (configsByModule.get(moduleId) || 0) + 1);
        });
        
        configsByModule?.forEach((count, moduleId) => {
          
        });

        // Add match configurations with their createdAt timestamps
        matchConfigurations?.forEach((config, index) => {
          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map((sourceId, idx) => {
            console.log(`[BUGNAME] [inputSources] === Processing input source ${idx + 1}/${config.inputSources?.length} ===`);
            console.log(`[BUGNAME] [inputSources] Original sourceId: "${sourceId}"`);

            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            let source = allAvailableInputSources?.find(s => s.id === sourceId);

            if (source) {
              console.log(`[BUGNAME] [inputSources] Found in allAvailableInputSources: "${source.sourceName}"`);
            }

            // If not found, search in sharedCustomSources (custom sources from Append/Match/Suppress modules)
            if (!source) {
              source = sharedCustomSources?.find(s => s.id === sourceId);
              if (source) {
                console.log(`[BUGNAME] [inputSources] Found in sharedCustomSources: "${source.sourceName}"`);
              } else {
                console.log(`[BUGNAME] [inputSources] ❌ Source NOT FOUND in any array`);
              }
            }

            // FIXED: Use resolveSourceName to handle custom sources properly
            const resolvedSourceName = resolveSourceName(sourceId);

            const result = {
              source_name: resolvedSourceName,
              columns: source?.headers || []
            };

            console.log(`[BUGNAME] [inputSources] ✅ Final result:`, JSON.stringify(result, null, 2));
            return result;
          });

          // Transform match sources to the required format (no priority for Match module)
          const matchSourcesForConfig = (config?.matchSources || [])
            .map((sourceId, idx) => {
              console.log(`[BUGNAME] [matchSources] === Processing match source ${idx + 1}/${config.matchSources?.length} ===`);
              console.log(`[BUGNAME] [matchSources] Original sourceId: "${sourceId}"`);

              // FIXED: Use resolveSourceName to handle all source types consistently
              const resolvedSourceName = resolveSourceName(sourceId);

              // First check if it's a versioned source (from Input, Append, Match, or Suppress modules)
              const versionedSource = allAvailableInputSources?.find(s => s?.id === sourceId && s?.isVersioned);
              if (versionedSource) {
                console.log(`[BUGNAME] [matchSources] Detected VERSIONED source`);
                const result = {
                  source_type: 'input',
                  source_name: resolvedSourceName // Use resolved name
                };
                console.log(`[BUGNAME] [matchSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              // Check if it's a non-versioned input source
              const inputSource = allAvailableInputSources?.find(s => s?.id === sourceId);
              if (inputSource && !inputSource?.isVersioned) {
                const createdByModuleId = (inputSource as any)?.createdByModuleId;
                const createdByModuleIdStr = String(createdByModuleId || '');
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
                  console.log(`[BUGNAME] [matchSources] Detected non-versioned INPUT source`);
                  const result = {
                    source_type: 'input',
                    source_name: resolvedSourceName // Use resolved name
                  };
                  console.log(`[BUGNAME] [matchSources] ✅ Result:`, JSON.stringify(result, null, 2));
                  return result;
                }
              }

              const customSource = sharedCustomSources?.find(s => s?.id === sourceId);
              const customCreatedByModuleIdStr = String(customSource?.createdByModuleId || '');
              const isCustomMatchSource = customSource &&
                                         customSource?.createdByModuleId &&
                                         (customSource?.createdByModuleId === 'panel4' ||
                                          customCreatedByModuleIdStr?.startsWith('panel4_'));

              if (isCustomMatchSource) {
                const isSelfMatch = customSource?.sourceType === 'Self';
                console.log(`[BUGNAME] [matchSources] Detected CUSTOM match source, isSelf: ${isSelfMatch}`);
                const result = {
                  source_type: isSelfMatch ? 'self_match' : 'input',
                  source_name: resolvedSourceName // Use resolved name
                };
                console.log(`[BUGNAME] [matchSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              const sourceIdStr = String(sourceId || '');
              if (sourceIdStr?.startsWith('match_')) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.match?.find(
                  (table: any) => `match_${table?.tableId}` === sourceIdStr
                );
                const sourceName = predefined ? predefined?.tableName : sourceIdStr;
                console.log(`[BUGNAME] [matchSources] Detected PRECONFIGURED source`);
                const result = {
                  source_type: 'preconfigured',
                  source_name: sourceName
                };
                console.log(`[BUGNAME] [matchSources] ✅ Result:`, JSON.stringify(result, null, 2));
                return result;
              }

              console.log(`[BUGNAME] [matchSources] ⚠️ No matching case, returning null`);
              return null;
            })
            .filter(Boolean);

          // Use module-level field mappings (not config-level) specific to this module
          const moduleId = config?.createdByModuleId || 'panel4';
          const fieldMappingsForConfig = transformFieldMappings(matchModuleFieldMappings?.[moduleId] || []);

          const configJson: any = {
            input_sources: inputSourcesForConfig,
            // Match Keys are fields from INPUT sources to match on
            match_keys: config?.matchOnFields || [],
            match_sources: matchSourcesForConfig,
            is_expand: config?.expand || false,
            // Convert match type: 'full' ? 'F', 'any' ? 'A'
            match_type: config?.matchType === 'any' ? 'A' : 'F',
            field_mappings: fieldMappingsForConfig
          };

          // Expand Fields are separate - fields from MATCH sources to add to output
          // Only include if addFields is defined and has items
          if (config?.addFields && config?.addFields?.length > 0) {
            configJson.expand_fields = config?.addFields;
          }

          // Calculate stepOrder based on the config's createdByModuleId
          const configStepOrder = config.createdByModuleId ? getStepOrder(config.createdByModuleId) : getStepOrder('panel4');
          

          // Ensure configuration has a createdAt timestamp for proper sorting
          const createdAtTimestamp = config.createdAt || (Date.now() + index);

          matchItems?.push({
            stepOrder: configStepOrder,
            actionType: 'M',
            configJson,
            createdAt: createdAtTimestamp,
            itemType: 'config',
            moduleId: config.createdByModuleId || 'panel4', // Store moduleId for tracking
            // Include ID if this is an existing config (for update payload)
            ...(config.hasExistingId && config.workflowItemId && { id: config.workflowItemId })
          });
        });

        // Add match versions with their createdAt timestamps
        const matchVersions = versionedSources?.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Match'
        );

        

        matchVersions?.forEach((source, versionIndex) => {
          const { actionType, saveAsVersion, versionName, configJson, createdByModuleId } = source as any;

          

          // IMPORTANT: Recalculate stepOrder based on current module position
          // Don't use stored stepOrder as it may be outdated if modules were reordered/duplicated
          const versionStepOrder = createdByModuleId ? getStepOrder(createdByModuleId) : getStepOrder('panel4');

          

          // Inject module-level field mappings into the version (override any stored field mappings)
          const versionModuleId = createdByModuleId || 'panel4';
          const fieldMappingsForVersion = transformFieldMappings(matchModuleFieldMappings?.[versionModuleId] || []);

          // FIXED: Transform version configJson to resolve source names
          console.log(`[BUGNAME] [matchVersion] Transforming version "${versionName}"`);
          const transformedConfigJson = transformVersionConfigJson(configJson);

          const updatedConfigJson: any = {
            ...transformedConfigJson,  // Use transformed config
            field_mappings: fieldMappingsForVersion,
            // Ensure match_keys is present (fields from INPUT sources to match on)
            match_keys: transformedConfigJson?.match_keys || (source as any)?.operationFields || []
          };

          // Include expand_fields if present (fields from MATCH sources to add to output)
          if ((source as any)?.addFields && (source as any)?.addFields?.length > 0) {
            updatedConfigJson.expand_fields = (source as any)?.addFields;
          } else if (transformedConfigJson?.expand_fields && transformedConfigJson?.expand_fields?.length > 0) {
            updatedConfigJson.expand_fields = transformedConfigJson?.expand_fields;
          } else if (transformedConfigJson?.add_fields && transformedConfigJson?.add_fields?.length > 0) {
            // Backward compatibility: if old field name exists, use it
            updatedConfigJson.expand_fields = transformedConfigJson?.add_fields;
          }

          matchItems?.push({
            stepOrder: versionStepOrder, // Use recalculated stepOrder
            actionType,
            saveAsVersion,
            versionName,
            configJson: updatedConfigJson,
            createdAt: (source as any).createdAt || 0,
            itemType: 'version',
            moduleId: createdByModuleId || 'panel4', // Store moduleId for tracking
            // Include ID if this is an existing version (for update payload)
            ...((source as any).hasExistingId && (source as any).workflowItemId && { id: (source as any).workflowItemId })
          });
        });

        // Group items by stepOrder and assign internalStepOrder per module
        const itemsByStepOrder = new Map<number, any[]>();
        matchItems?.forEach(item => {
          const stepOrder = item.stepOrder;
          if (!itemsByStepOrder.has(stepOrder)) {
            itemsByStepOrder.set(stepOrder, []);
          }
          itemsByStepOrder.get(stepOrder)!.push(item);
        });

        // Sort each group by createdAt and assign internalStepOrder starting from 1
        const workflowItems: any[] = [];
        itemsByStepOrder?.forEach((items, stepOrder) => {
          // Sort by creation time within this module
          items?.sort((a, b) => a.createdAt - b.createdAt);

          // Assign internalStepOrder starting from 1 for this module
          items?.forEach((item, indexInModule) => {
            const workflowItem: any = {
              stepOrder: item.stepOrder,
              internalStepOrder: indexInModule + 1, // Reset to 1 for each module
              actionType: item.actionType,
              configJson: item.configJson
            };

            if (item.itemType === 'version') {
              workflowItem.saveAsVersion = item.saveAsVersion;
              workflowItem.versionName = item.versionName;
            }

            // Include ID if this is an existing workflow item (for update payload)
            if (item.id) {
              workflowItem.id = item.id;
            }

            

            workflowItems?.push(workflowItem);
          });
        });

        return workflowItems;
      };

      // Extract self-append sources for workflow
      const extractSelfAppendSourcesForWorkflow = () => {
        const selfAppendItems: any[] = [];

        // Filter self-append sources created in Append modules
        const selfAppendSources = sharedCustomSources?.filter(source => {
          const sourceType = source?.sourceType;
          const isSelfSource = sourceType === 'Self';

          // Check if source was created by Append module (panel2 or duplicates)
          const createdByModuleIdStr = String(source?.createdByModuleId || '');
          const createdByAppend = source?.createdByModuleId &&
                                 (source?.createdByModuleId === 'panel2' ||
                                  createdByModuleIdStr?.startsWith('panel2_'));

          return isSelfSource && createdByAppend;
        }) || [];



        // Create workflow items for each self-append source
        selfAppendSources?.forEach((source, index) => {
          const selfSource = source as any;


          // Helper function to generate SQL from filterJson (same as above)
          const generateSQLFromFilterJson = (filterJson: any[]): string => {
            if (!filterJson || filterJson.length === 0) return '';

            const groupQueries = filterJson.map((group: any) => {
              const conditionQueries = group.conditions
                ?.filter((cond: any) => cond?.field && cond?.operator)
                ?.map((cond: any) => {
                  let sqlFragment = '';
                  if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') {
                    sqlFragment = `(${cond.field} ${cond.operator})`;
                  } else if (cond.operator === 'BETWEEN') {
                    sqlFragment = `(${cond.field} BETWEEN '${cond.value}' AND '${cond.value2 || ''}')`;
                  } else if (cond.operator === 'LIKE' || cond.operator === 'NOT LIKE') {
                    sqlFragment = `(${cond.field} ${cond.operator} '%${cond.value}%')`;
                  } else if (cond.operator === 'IN' || cond.operator === 'NOT IN') {
                    const values = cond.value
                      .split(',')
                      .map((v: string) => v.trim())
                      .filter((v: string) => v.length > 0)
                      .map((v: string) => `'${v}'`)
                      .join(',');
                    sqlFragment = `(${cond.field} ${cond.operator} (${values}))`;
                  } else {
                    sqlFragment = `(${cond.field} ${cond.operator} '${cond.value}')`;
                  }
                  return sqlFragment;
                });

              if (!conditionQueries || conditionQueries.length === 0) {
                return { query: '', operator: group.groupOperator || 'OR' };
              }

              const query = conditionQueries.length === 1
                ? conditionQueries[0]
                : `(${conditionQueries.join(` ${group.logicalOperator} `)})`;

              return { query, operator: group.groupOperator || 'OR' };
            });

            const validQueries = groupQueries.filter((q: any) => q?.query !== '');

            if (validQueries.length === 0) return '';
            if (validQueries.length === 1) return validQueries[0]?.query;

            let result = validQueries[0]?.query;
            for (let i = 1; i < validQueries.length; i++) {
              const currentOperator = validQueries[i - 1]?.operator;
              result = `(${result} ${currentOperator} ${validQueries[i]?.query})`;
            }

            return result;
          };

          // Get assignment_sets and tiering_on directly from selfConfig
          const assignmentSets = selfSource?.selfConfig?.assignment_sets || [];
          const tieringOn = selfSource?.selfConfig?.tiering_on ?? null;

          // Transform assignment_sets: regenerate filter_sql from filterJson
          const transformedAssignmentSets = assignmentSets?.map((set: any) => {
            const transformed: any = {
              value_to_assign: set?.value_to_assign || '',
              filter_sql: '', // Will be regenerated
            };

            // Rename filter_config to filterJson if it exists, and regenerate filter_sql
            if (set?.filter_config) {
              transformed.filterJson = set.filter_config;
              // Regenerate filter_sql from filterJson
              transformed.filter_sql = generateSQLFromFilterJson(set.filter_config);
            } else if (set?.filterJson) {
              transformed.filterJson = set.filterJson;
              // Regenerate filter_sql from filterJson
              transformed.filter_sql = generateSQLFromFilterJson(set.filterJson);
            } else {
              // Fallback to existing filter_sql if no filterJson
              transformed.filter_sql = set?.filter_sql || '';
            }

            return transformed;
          });

          // Build configJson in append configuration format
          // Transform input_source_names to input_sources format
          const inputSourceNames = selfSource?.selfConfig?.input_source_names || [];

          const configJson = {
            input_sources: inputSourceNames,
            append_sources: [
              {
                source_type: 'self_append',
                source_name: selfSource?.sourceName || 'Self_Append_Source',
                priority: 1
              }
            ]
          };

          // Calculate stepOrder based on the source's createdByModuleId
          const sourceStepOrder = selfSource?.createdByModuleId ? getStepOrder(selfSource?.createdByModuleId) : getStepOrder('panel2');



          selfAppendItems?.push({
            stepOrder: sourceStepOrder,
            actionType: 'A',
            configJson: configJson,
            createdAt: (selfSource as any)?.createdAt || Date?.now(),
            itemType: 'self_append_config',
            moduleId: selfSource?.createdByModuleId || 'panel2',
            // Include ID if this is an existing source (for update payload)
            ...((selfSource as any)?.hasExistingId && selfSource?.id && { id: selfSource?.id })
          });
        });

        // Group items by stepOrder and assign internalStepOrder per module
        const itemsByStepOrder = new Map<number, any[]>();
        selfAppendItems?.forEach(item => {
          const stepOrder = item?.stepOrder;
          if (!itemsByStepOrder?.has(stepOrder)) {
            itemsByStepOrder?.set(stepOrder, []);
          }
          itemsByStepOrder?.get(stepOrder)?.push(item);
        });

        // Sort each group by createdAt and assign internalStepOrder starting from 1
        const workflowItems: any[] = [];
        itemsByStepOrder?.forEach((items, stepOrder) => {
          // Sort by creation time within this module
          items?.sort((a, b) => (a?.createdAt || 0) - (b?.createdAt || 0));

          // Assign internalStepOrder starting from 1 for this module
          items?.forEach((item, indexInModule) => {
            const workflowItem: any = {
              stepOrder: item?.stepOrder,
              internalStepOrder: indexInModule + 1, // Reset to 1 for each module
              actionType: item?.actionType,
              configJson: item?.configJson
            };

            // Include ID if this is an existing workflow item (for update payload)
            if (item?.id) {
              workflowItem.id = item?.id;
            }



            workflowItems?.push(workflowItem);
          });
        });

        return workflowItems;
      };

      // Build workflow array with all configurations and versions
      // IMPORTANT: Maintain creation order - sources and versions are interleaved as they were created
      const inputSourcesAndVersions = extractInputSourcesAndVersionsForWorkflow();
      const appendItems = extractAppendItemsForWorkflow();
      const suppressItems = extractSuppressItemsForWorkflow();
      const matchItems = extractMatchItemsForWorkflow();
      const selfAppendSources = extractSelfAppendSourcesForWorkflow(); // NEW: Self-append sources

      let workflowArray = [
        ...inputSourcesAndVersions,  // All input sources and versions in creation order
        ...appendItems,              // Append configs and versions sorted by creation order
        ...selfAppendSources,        // Self-append sources (NEW)
        ...suppressItems,            // Suppress configs and versions sorted by creation order
        ...matchItems                // Match configs and versions sorted by creation order
      ];

      // ============================================================================
      // RENUMBER STEPORDER TO REMOVE GAPS (Make stepOrder continuous)
      // ============================================================================
      // If a module has no configurations/versions/sources, its stepOrder is skipped.
      // We need to renumber the workflow items so stepOrder is continuous (1, 2, 3, 4...)
      // without gaps.
      if (workflowArray?.length > 0) {
        // Step 1: Find all unique stepOrder values that actually have items
        const uniqueStepOrders = Array.from(
          new Set(workflowArray?.map(item => item?.stepOrder).filter(step => typeof step === 'number'))
        ).sort((a, b) => a - b);

        // Step 2: Create mapping from old stepOrder ? new continuous stepOrder
        const stepOrderMapping = new Map<number, number>();
        uniqueStepOrders?.forEach((oldStepOrder, index) => {
          stepOrderMapping.set(oldStepOrder, index + 1); // 1-based indexing
        });

        // Step 3: Apply the mapping to renumber all workflow items
        workflowArray = workflowArray?.map(item => ({
          ...item,
          stepOrder: stepOrderMapping.get(item?.stepOrder) ?? item?.stepOrder
        }));

      }
      // ============================================================================

      // Log workflow array for debugging
      
      
      
      
      
      
      
      
      
      
      

      // Show Append items grouped by stepOrder
      const appendWorkflowItems = workflowArray?.filter(w => w?.actionType === 'A');
      if (appendWorkflowItems?.length > 0) {

        const appendByStep = new Map<number, any[]>();
        appendWorkflowItems?.forEach(item => {
          if (!appendByStep?.has(item?.stepOrder)) {
            appendByStep?.set(item?.stepOrder, []);
          }
          appendByStep?.get(item?.stepOrder)?.push(item);
        });
        appendByStep?.forEach((items, stepOrder) => {
          const moduleIndex = stepOrder - 1;
          const module = modules?.[moduleIndex];

        });
      }

      // Show Self-Append items grouped by stepOrder
      const selfAppendWorkflowItems = workflowArray?.filter(w =>
        w?.actionType === 'A' &&
        w?.configJson?.append_sources?.some((src: any) => src?.source_type === 'self_append')
      );
      if (selfAppendWorkflowItems?.length > 0) {

        const selfAppendByStep = new Map<number, any[]>();
        selfAppendWorkflowItems?.forEach(item => {
          if (!selfAppendByStep?.has(item?.stepOrder)) {
            selfAppendByStep?.set(item?.stepOrder, []);
          }
          selfAppendByStep?.get(item?.stepOrder)?.push(item);
        });
        selfAppendByStep?.forEach((items, stepOrder) => {
          const moduleIndex = stepOrder - 1;
          const module = modules?.[moduleIndex];

        });
      }

      workflowArray?.forEach((item, index) => {
        let itemType = '';
        if (item?.actionType === 'I') {
          itemType = 'Input Source';
        } else if (item?.actionType === 'A' && item?.configJson?.append_sources?.some((src: any) => src?.source_type === 'self_append')) {
          itemType = 'Self-Append Config';
        } else if (item?.saveAsVersion) {
          itemType = `${item?.actionType === 'I' ? 'Input' : item?.actionType === 'A' ? 'Append' : item?.actionType === 'M' ? 'Match' : 'Suppress'} Version`;
        } else {
          itemType = `${item?.actionType === 'A' ? 'Append' : item?.actionType === 'M' ? 'Match' : 'Suppress'} Config`;
        }

        
        
        
        

        if (item.saveAsVersion) {
          
          
        }

        if (item.actionType === 'I' && item.configJson) {
          
        } else if (item.actionType === 'A' && item.configJson) {
          
          
          
          
          
        }
      });
      

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitPayload = {
        requestDetails,
        inputSources: allTransformedInputSources, // Combined input sources and append sources
        workflow: workflowArray?.length > 0 ? workflowArray : undefined,
        stats: transformedStats?.length > 0 ? transformedStats : undefined,
        output: (transformedOutput && transformedOutput?.length > 0) ? transformedOutput : undefined
      } as SubmitRequestPayload;

      console.log(`[BUGNAME] ========================================`);
      console.log(`[BUGNAME] FINAL PAYLOAD BEFORE API CALL`);
      console.log(`[BUGNAME] ========================================`);
      console.log(`[BUGNAME] Full payload:`, JSON.stringify(submitPayload, null, 2));

      if (workflowArray?.length > 0) {
        console.log(`[BUGNAME] ======== WORKFLOW ARRAY (${workflowArray.length} items) ========`);
        workflowArray.forEach((item, idx) => {
          console.log(`[BUGNAME] Workflow Item ${idx + 1}:`);
          console.log(`[BUGNAME]   - stepOrder: ${item.stepOrder}`);
          console.log(`[BUGNAME]   - actionType: ${item.actionType}`);
          console.log(`[BUGNAME]   - versionName: ${item.versionName || 'N/A'}`);
          if (item.configJson?.input_sources) {
            console.log(`[BUGNAME]   - input_sources:`, item.configJson.input_sources);
          }
          if (item.configJson?.append_sources) {
            console.log(`[BUGNAME]   - append_sources:`, item.configJson.append_sources);
          }
          if (item.configJson?.suppress_sources) {
            console.log(`[BUGNAME]   - suppress_sources:`, item.configJson.suppress_sources);
          }
          if (item.configJson?.match_sources) {
            console.log(`[BUGNAME]   - match_sources:`, item.configJson.match_sources);
          }
        });
      } else {
        console.log(`[BUGNAME] No workflow items`);
      }

      if (transformedStats?.length > 0) {
        console.log(`[BUGNAME] ======== STATS (${transformedStats.length} items) ========`);
      } else {
        console.log(`[BUGNAME] No stats`);
      }

      if (transformedOutput && transformedOutput?.length > 0) {
        console.log(`[BUGNAME] ======== OUTPUT (${transformedOutput.length} items) ========`);
        transformedOutput?.forEach((config, index) => {

          // Check if destination is preconfigured or custom
          if (config.destinationType === 'preconfigured') {

          } else if (config.destinationType === 'custom' && config.destinationConfig) {

          }


          if (config.config.field_mappings?.length > 0) {
            config.config.field_mappings?.forEach((mapping) => {

            });
          }
        });

      } else {
        console.log(`[BUGNAME] No output`);
      }

      console.log(`[BUGNAME] ========================================`);
      console.log(`[BUGNAME] CALLING API...`);
      console.log(`[BUGNAME] ========================================`);

      // Call appropriate API based on mode
      let submitResponse: any;
      if (requestId) {
        // Edit mode: Call updateRequest
        console.log(`[BUGNAME] Mode: UPDATE (requestId: ${requestId})`);
        submitResponse = await updateRequest(submitPayload);
      } else {
        // Create mode: Call submitRequest
        console.log(`[BUGNAME] Mode: CREATE`);
        submitResponse = await submitRequest(submitPayload);
      }

      if (submitResponse.success) {
        // Success: Show message and redirect to data pull reports list
        const successMessage = requestId
          ? (submitResponse.message || 'Request updated successfully!')
          : (submitResponse.message || 'Request submitted successfully!');
        setSaveSuccess(successMessage);

        // Redirect after a short delay to allow user to see the success message
        setTimeout(() => {
          navigate('/dataPullReports');
        }, 1500);
      } else {
        const errorMessage = requestId
          ? (submitResponse.message || 'Failed to update request. Please try again.')
          : (submitResponse.message || 'Failed to submit request. Please try again.');
        setSaveError(errorMessage);
      }

    } catch (error) {
      const errorMessage = requestId
        ? 'An error occurred while updating the request. Please try again.'
        : 'An error occurred while submitting the request. Please try again.';
      setSaveError(errorMessage);
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
    if (selectedInputSources?.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedCountsOn?.length === 0) {
      alert('Please select at least one field for Generate Counts On');
      return;
    }
    if (selectedBreakdownBy?.length === 0) {
      alert('Please select at least one field for Breakdown By');
      return;
    }

    // Convert source names to IDs for storage
    const inputSourceIds = selectedInputSources
      .map(sourceName => {
        const source = allAvailableInputSources?.find(s => s.sourceName === sourceName);
        return source?.id;
      })
      .filter((id): id is string => !!id);

    if (editingStatsId) {
      // Update existing configuration
      setStatsConfigurations(statsConfigurations?.map(config =>
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
    const isUsingIds = config.inputSources?.some(item =>
      allAvailableInputSources?.some(s => s.id === item)
    );

    let sourceNames: string[];
    if (isUsingIds) {
      // Convert input source IDs to source names for the dropdown
      sourceNames = config.inputSources
        .map(sourceId => {
          const source = allAvailableInputSources?.find(s => s.id === sourceId);
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
      setStatsConfigurations(statsConfigurations?.filter(c => c.id !== id));
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

  // Helper function to filter available sources based on module position in workflow
  // Ensures versions are available to the module that created them AND all downstream modules
  // This allows modules to see their own versions even after reordering (data flows top to bottom)
  const getAvailableSourcesForModule = useCallback((currentModuleId: string): InputSource[] => {

    // Find the current module's position
    const currentModuleIndex = modules?.findIndex(m => m?.id === currentModuleId);

    // Helper function to enrich a source with appended fields from UPSTREAM modules only
    const enrichSourceWithAppendedFields = (source: InputSource): InputSource => {
      console.log(`[upstream-filter] Enriching source: ${source?.sourceName} for module ID: ${currentModuleId} (index: ${currentModuleIndex})`);

      // Only include append configurations from UPSTREAM modules (modules before the current one)
      const upstreamAppendConfigs = appendConfigurations?.filter(config => {
        const configModuleId = config?.createdByModuleId;
        const configModuleIndex = modules?.findIndex(m => m?.id === configModuleId);
        // Include only if the config's module appears BEFORE the current module
        const isUpstream = configModuleIndex !== -1 && configModuleIndex < currentModuleIndex;
        console.log(`[upstream-filter] Append config from module ${configModuleId} (index: ${configModuleIndex}), is upstream: ${isUpstream}`);
        return isUpstream;
      });

      console.log(`[upstream-filter] Total append configs: ${appendConfigurations?.length}, Upstream configs: ${upstreamAppendConfigs?.length}`);

      // Only include custom sources from UPSTREAM modules
      const upstreamCustomSources = sharedCustomSources?.filter(customSource => {
        const sourceModuleId = (customSource as any)?.createdByModuleId;
        const sourceModuleIndex = modules?.findIndex(m => m?.id === sourceModuleId);
        // Include only if the custom source's module appears BEFORE the current module
        const isUpstream = sourceModuleIndex !== -1 && sourceModuleIndex < currentModuleIndex;
        console.log(`[upstream-filter] Custom source from module ${sourceModuleId} (index: ${sourceModuleIndex}), is upstream: ${isUpstream}`);
        return isUpstream;
      });

      console.log(`[upstream-filter] Total custom sources: ${sharedCustomSources?.length}, Upstream custom sources: ${upstreamCustomSources?.length}`);

      // Compute enriched headers using only upstream configurations
      const allFields = new Set<string>();

      // Start with original headers
      const originalHeaders = source?.selectedHeaders || source?.headers || [];
      originalHeaders?.forEach((header: string) => {
        if (header && typeof header === 'string') {
          allFields.add(header);
        }
      });

      // Add fields from UPSTREAM append configurations
      upstreamAppendConfigs?.forEach(config => {
        const isInputSource = config?.inputSources?.some(inputSourceId => {
          const inputSource = allAvailableInputSources?.find(s => s?.id === inputSourceId);
          return inputSource?.sourceName === source?.sourceName || inputSource?.id === source?.id;
        });

        if (isInputSource && config?.appendFields) {
          config.appendFields?.forEach(field => {
            if (field && typeof field === 'string') {
              allFields.add(field);
            }
          });
        }
      });

      // Add generated columns from UPSTREAM self-sources
      upstreamCustomSources?.forEach(customSource => {
        if (customSource?.sourceType === 'Self' && (customSource as any)?.selfConfig) {
          const { input_source_names, generated_column } = (customSource as any).selfConfig;
          const isInputSource = input_source_names?.includes(source?.sourceName);

          if (isInputSource && generated_column) {
            allFields.add(generated_column);
          }
        }
      });

      const enrichedHeaders = Array.from(allFields);

      console.log(`[upstream-filter] Original headers for ${source?.sourceName}:`, originalHeaders);
      console.log(`[upstream-filter] Enriched headers for ${source?.sourceName}:`, enrichedHeaders);

      // Return a new source object with updated headers
      return {
        ...source,
        headers: enrichedHeaders,
        selectedHeaders: enrichedHeaders,
      };
    };

    // CRITICAL: Separate Input module sources/versions from other sources
    // Input module versions should be available to ALL downstream modules
    // Other module versions should be available to the module that created them AND modules that come after them

    const inputModuleSources: InputSource[] = [];
    const otherModuleVersions: InputSource[] = [];

    allAvailableInputSources?.forEach(source => {
      const createdByModuleId = (source as any)?.createdByModuleId;
      const createdByModuleIdStr = String(createdByModuleId || '');



      // Check if this is from Input module (panel1)
      const isFromInputModule = !createdByModuleId ||
                                createdByModuleId === 'panel1' ||
                                createdByModuleIdStr?.startsWith('panel1');

      if (isFromInputModule) {
        // Include ALL Input module sources and versions (no filtering)
        // Enrich with appended fields before adding
        inputModuleSources?.push(enrichSourceWithAppendedFields(source));
      } else if (source?.isVersioned) {
        // This is a version from another module (Append/Match/Suppress)
        // Will apply upstream filtering logic below
        // Enrich with appended fields before adding
        otherModuleVersions?.push(enrichSourceWithAppendedFields(source));
      } else {
      }
    });


    // Always include ALL input module sources and versions
    const availableSources: InputSource[] = [...inputModuleSources];

    // Check if module was found (currentModuleIndex was already calculated above)
    if (currentModuleIndex === -1) {
      // Module not found, return input sources only
      console.warn(`[INPUT-VERSION] Module not found: ${currentModuleId}`);
      return availableSources;
    }

    // Filter other module versions to include those from upstream modules AND the current module itself
    // CRITICAL: A version is available if it was created by a module that appears AT OR BEFORE the current module
    // This allows modules to see their own versions even after reordering
    const upstreamVersions = otherModuleVersions?.filter((version: any) => {
      // Safety check: ensure version has required properties
      if (!version || typeof version !== 'object') {
        return false;
      }

      // Find the module that created this version
      const creatorModuleId = version?.createdByModuleId;

      if (!creatorModuleId) {
        // Already filtered out in the loop above, but double-check
        console.warn('[INPUT-VERSION] Version missing createdByModuleId:', version?.id, version?.versionName);
        return false;
      }

      // Find the creator module's current position in the workflow
      const creatorModuleIndex = modules?.findIndex(m => m?.id === creatorModuleId);

      if (creatorModuleIndex === -1) {
        // Creator module not found (might have been deleted)
        console.warn(`[INPUT-VERSION] Creator module not found for version: ${version?.versionName}, creatorModuleId: ${creatorModuleId}`);
        return false;
      }

      // CRITICAL FILTERING LOGIC:
      // Include version if creator module appears at OR BEFORE current module
      // This allows modules to see their own versions AND versions from upstream modules
      const isUpstreamOrSame = creatorModuleIndex <= currentModuleIndex;



      if (isUpstreamOrSame) {
        if (creatorModuleIndex === currentModuleIndex) {
        } else {
        }
      } else {
      }

      return isUpstreamOrSame;
    }) || [];

    // Return combined sources: ALL input module sources/versions + filtered upstream versions from other modules
    const result = [...availableSources, ...upstreamVersions];

    result?.forEach(s => {
    });

    return result;
  }, [allAvailableInputSources, versionedSources, modules]);

  // Memoize available sources for each module to prevent infinite re-render loops
  // This ensures stable array references across renders when contents haven't changed
  // CRITICAL: This recalculates whenever modules, inputSources, or versionedSources change
  const memoizedModuleAvailableSources = useMemo(() => {

    versionedSources?.forEach(v => {
    });

    const sourcesMap: Record<string, InputSource[]> = {};

    modules?.forEach((module, index) => {
      if (module?.id) {
        const availableSources = getAvailableSourcesForModule(module?.id);
        sourcesMap[module?.id] = availableSources;

        availableSources?.forEach(s => {
        });
      }
    });

    return sourcesMap;
  }, [modules, getAvailableSourcesForModule]);

  // Handle duplication of modules (panels 2, 3, 4)
  const handleDuplicateModule = (moduleId: string) => {
    const moduleIndex = modules?.findIndex(m => m.id === moduleId);
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

    // Create duplicated module with only structural properties (no data/config)
    const duplicatedModule: any = {
      id: newId,
      title: newTitle,
      description: originalModule?.description,
      icon: originalModule?.icon,
      color: originalModule?.color,
      isDraggable: originalModule?.isDraggable,
    };

    // Insert the duplicated module right after the original
    const newModules = [...modules];
    newModules.splice(moduleIndex + 1, 0, duplicatedModule);
    setModules(newModules);

    // Automatically expand the new module
    setExpanded(prev => [...prev, newId]);
  };

  const handleDeleteModule = (moduleId: string) => {
    const moduleIdStr = String(moduleId || '');

    // Determine the module type (base ID without instance number)
    let moduleType = '';
    if (moduleIdStr === 'panel2' || moduleIdStr?.startsWith('panel2_')) {
      moduleType = 'panel2'; // Append
    } else if (moduleIdStr === 'panel3' || moduleIdStr?.startsWith('panel3_')) {
      moduleType = 'panel3'; // Suppress
    } else if (moduleIdStr === 'panel4' || moduleIdStr?.startsWith('panel4_')) {
      moduleType = 'panel4'; // Match
    } else {
      // Not a deletable module type
      return;
    }

    // Count how many modules of this type exist
    const modulesOfSameType = modules?.filter(m => {
      const mIdStr = String(m?.id || '');
      return mIdStr === moduleType || mIdStr?.startsWith(`${moduleType}_`);
    });

    // Only allow deletion if there's more than one module of this type
    if (modulesOfSameType?.length <= 1) {
      return;
    }

    // Remove the module from the modules array
    const newModules = modules?.filter(module => module?.id !== moduleId);
    setModules(newModules);

    // Remove from expanded state if it was expanded
    setExpanded(prev => prev?.filter(id => id !== moduleId));

    // Clean up configurations associated with this module
    if (moduleType === 'panel2') {
      // Remove append configurations created by this module
      setAppendConfigurations(prev => prev?.filter(config => config?.createdByModuleId !== moduleId));

      // Clean up field mappings
      setAppendModuleFieldMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings?.[moduleId];
        return newMappings;
      });
    } else if (moduleType === 'panel3') {
      // Remove suppress configurations created by this module
      setSuppressConfigurations(prev => prev?.filter(config => config?.createdByModuleId !== moduleId));

      // Clean up field mappings
      setSuppressModuleFieldMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings?.[moduleId];
        return newMappings;
      });
    } else if (moduleType === 'panel4') {
      // Remove match configurations created by this module
      setMatchConfigurations(prev => prev?.filter(config => config?.createdByModuleId !== moduleId));

      // Clean up field mappings
      setMatchModuleFieldMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings?.[moduleId];
        return newMappings;
      });
    }

    // Remove custom sources created by this module
    setSharedCustomSources(prev => prev?.filter(source => source?.createdByModuleId !== moduleId));

    // Remove versioned sources created by this module
    setVersionedSources(prev => prev?.filter(source => (source as any)?.createdByModuleId !== moduleId));
  };

  // Handle drag end for draggable modules (panels 2, 3, 4)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;


    if (over && active?.id !== over?.id) {
      setModules((items) => {
        const oldIndex = items?.findIndex((item) => item?.id === active?.id);
        const newIndex = items?.findIndex((item) => item?.id === over?.id);


        // Only allow dragging within the draggable modules
        const isDraggableModule = (moduleId: string) => {
          const moduleIdStr = String(moduleId || '');
          return moduleIdStr?.startsWith('panel2') || moduleIdStr?.startsWith('panel3') || moduleIdStr?.startsWith('panel4');
        };

        if (isDraggableModule(active?.id as string) && isDraggableModule(over?.id as string)) {

          // Log all versioned sources BEFORE the move
          versionedSources?.forEach(v => {
          });

          // Validate the move before executing - check versioned sources
          const versionValidation = validateModuleMove(oldIndex, newIndex, modules, versionedSources);

          if (!versionValidation?.canMove) {
            // Show error message with better formatting
            const errorMessage = `?? Module Reordering Not Allowed\n\n${versionValidation?.error}\n\n?? Tip: You can edit or delete the dependent versions first, then reorder the modules.`;
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

          if (!customSourceValidation?.canMove) {
            // Show error message with better formatting
            const errorMessage = `?? Module Reordering Not Allowed\n\n${customSourceValidation?.error}\n\n?? Tip: You can remove the custom source from the dependent module first, then reorder the modules.`;
            alert(errorMessage);
            return items; // Return unchanged items
          }

          const newItems = arrayMove(items, oldIndex, newIndex);
          return newItems;
        }
        return items;
      });
    } else {
    }
  };

  // Get draggable module IDs (Append, Suppression, Match modules including duplicates)
  const draggableIds = modules?.filter(m => {
    const mId = String(m?.id || '');
    return mId?.startsWith('panel2') || mId?.startsWith('panel3') || mId?.startsWith('panel4');
  }).map(m => m.id);

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
          tableDictionary={tableDictionary}
          onCheckIfSourceIsUsed={checkIfSourceIsUsed}
          onShowUsageError={(title, message, usedIn) =>
            setUsageErrorDialog({ open: true, title, message, usedIn })
          }
        />
      );
    } else if (moduleId === 'panel2' || String(moduleId || '').startsWith('panel2_')) {
      // IMPORTANT: Filter configs by createdByModuleId, NOT by stepOrder
      // stepOrder changes after module reordering, but createdByModuleId is permanent
      const moduleInitialConfigs = initialAppendConfigs?.filter(c => c?.createdByModuleId === moduleId);
      const configsToPass = initialConfigsConsumedRef.current ? undefined : moduleInitialConfigs;


      // Filter available sources to only include upstream sources (versions from earlier modules)
      const moduleAvailableSources = memoizedModuleAvailableSources[moduleId] || [];


      // CRITICAL: Filter versions by createdByModuleId, NOT by stepOrder
      // stepOrder is stale after reordering - use createdByModuleId to match this module instance
      const filteredAppendVersions = versionedSources?.filter(v => {
        const match = v?.sourceModule === 'Append' && (v as any)?.createdByModuleId === moduleId;
        return match;
      });

      filteredAppendVersions?.forEach(v => {
      });

      return <AppendModule
        moduleId={moduleId}
        availableInputSources={moduleAvailableSources}
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields, fieldMappings, appendFields) =>
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields, fieldMappings, appendFields)
        }
        initialConfigs={configsToPass}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={filteredAppendVersions}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
        onUpdateVersion={handleUpdateVersion}
        onDeleteVersion={handleDeleteVersion}
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
        onConfigurationsChange={getCachedAppendHandler(moduleId)}
        moduleFieldMappings={appendModuleFieldMappings?.[moduleId] || []}
        onModuleFieldMappingsChange={(mappings: any[]) => {
          setAppendModuleFieldMappings(prev => ({ ...prev, [moduleId]: mappings }));
        }}
        tableDictionary={tableDictionary}
      />;
    } else if (moduleId === 'panel3' || String(moduleId || '').startsWith('panel3_')) {
      // IMPORTANT: Filter configs by createdByModuleId, NOT by stepOrder
      // stepOrder changes after module reordering, but createdByModuleId is permanent
      const moduleInitialConfigs = initialSuppressConfigs?.filter(c => c?.createdByModuleId === moduleId);

      // Filter available sources to only include upstream sources (versions from earlier modules)
      const moduleAvailableSources = memoizedModuleAvailableSources[moduleId] || [];


      // CRITICAL: Filter versions by createdByModuleId, NOT by stepOrder
      // stepOrder is stale after reordering - use createdByModuleId to match this module instance
      const filteredSuppressVersions = versionedSources?.filter(v => {
        const match = v?.sourceModule === 'Suppress' && (v as any)?.createdByModuleId === moduleId;
        return match;
      });

      filteredSuppressVersions?.forEach(v => {
      });

      return <SuppressModule
        moduleId={moduleId}
        availableInputSources={moduleAvailableSources}
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields) =>
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields)
        }
        initialConfigs={initialConfigsConsumedRef.current ? undefined : moduleInitialConfigs}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={filteredSuppressVersions}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
        onUpdateVersion={handleUpdateVersion}
        onDeleteVersion={handleDeleteVersion}
        appendConfigurations={appendConfigurations}
        modules={modules}
        onConfigurationsChange={getCachedSuppressHandler(moduleId)}
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
        moduleFieldMappings={suppressModuleFieldMappings?.[moduleId] || []}
        onModuleFieldMappingsChange={(mappings: any[]) => {
          setSuppressModuleFieldMappings(prev => ({ ...prev, [moduleId]: mappings }));
        }}
        tableDictionary={tableDictionary}
      />;
    } else if (moduleId === 'panel4' || String(moduleId || '').startsWith('panel4_')) {
      // IMPORTANT: Filter configs by createdByModuleId, NOT by stepOrder
      // stepOrder changes after module reordering, but createdByModuleId is permanent
      const moduleInitialConfigs = initialMatchConfigs?.filter(c => c?.createdByModuleId === moduleId);

      // Filter available sources to only include upstream sources (versions from earlier modules)
      const moduleAvailableSources = memoizedModuleAvailableSources[moduleId] || [];


      // CRITICAL: Filter versions by createdByModuleId, NOT by stepOrder
      // stepOrder is stale after reordering - use createdByModuleId to match this module instance
      const filteredMatchVersions = versionedSources?.filter(v => {
        const match = v?.sourceModule === 'Match' && (v as any)?.createdByModuleId === moduleId;
        return match;
      });

      filteredMatchVersions?.forEach(v => {
      });

      return <MatchModule
        moduleId={moduleId}
        availableInputSources={moduleAvailableSources}
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields, addFields) =>
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields, undefined, undefined, addFields)
        }
        initialConfigs={initialConfigsConsumedRef.current ? undefined : moduleInitialConfigs}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={filteredMatchVersions}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
        onDeleteVersion={handleDeleteVersion}
        appendConfigurations={appendConfigurations}
        modules={modules}
        onUpdateVersion={handleUpdateVersion}
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
        onConfigurationsChange={getCachedMatchHandler(moduleId)}
        moduleFieldMappings={matchModuleFieldMappings?.[moduleId] || []}
        onModuleFieldMappingsChange={(mappings: any[]) => {
          setMatchModuleFieldMappings(prev => ({ ...prev, [moduleId]: mappings }));
        }}
        tableDictionary={tableDictionary}
      />;
    } else if (moduleId === 'panel5') {
      // Stats Module Content - Redesigned to match other modules

      // CRITICAL: Filter available sources to only include upstream sources (versions from earlier modules)
      // This ensures versions from downstream modules (Step 6, 7, etc.) don't appear in Stats (Step 5)
      const moduleAvailableSources = memoizedModuleAvailableSources?.[moduleId] || [];

      // Filter sources based on search text
      // IMPORTANT: Use moduleAvailableSources (filtered upstream only), NOT allAvailableInputSources
      const filteredStatsInputSources = moduleAvailableSources?.filter(source =>
        source?.sourceName?.toLowerCase()?.includes(statsInputSourcesSearch?.toLowerCase())
      ) || [];

      // Check if input sources are available
      if (moduleAvailableSources?.length === 0) {
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
                    const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;

                    console.log('[issuee] STATS MODULE (Create) - Input sources changed:', value);

                    // Check if "select-all" was clicked
                    if (value?.includes('select-all')) {
                      // Toggle select all
                      if (selectedInputSources?.length === filteredStatsInputSources?.length) {
                        console.log('[issuee] STATS MODULE (Create) - Deselecting all sources');
                        setSelectedInputSources([]);
                      } else {
                        const allSourceNames = filteredStatsInputSources?.map(s => s.sourceName);
                        console.log('[issuee] STATS MODULE (Create) - Selecting all sources:', allSourceNames);
                        setSelectedInputSources(allSourceNames);
                      }
                    } else {
                      // Filter out the special "select-all" value before setting state
                      const filteredValue = value?.filter((v: string) => v !== 'select-all');
                      console.log('[issuee] STATS MODULE (Create) - Setting input sources:', filteredValue);

                      // Log details for each selected source
                      filteredValue?.forEach((sourceName: string) => {
                        const source = filteredStatsInputSources?.find(s => s?.sourceName === sourceName);
                        console.log('[issuee] STATS MODULE (Create) - Source details for:', sourceName);
                        console.log('[issuee] STATS MODULE (Create) - Source object:', source);
                        console.log('[issuee] STATS MODULE (Create) - Source ID:', source?.id);
                        console.log('[issuee] STATS MODULE (Create) - Is versioned:', (source as any)?.isVersioned);
                        console.log('[issuee] STATS MODULE (Create) - combinedHeaders:', (source as any)?.combinedHeaders);
                        console.log('[issuee] STATS MODULE (Create) - headers:', source?.headers);
                        console.log('[issuee] STATS MODULE (Create) - selectedHeaders:', source?.selectedHeaders);
                      });

                      setSelectedInputSources(filteredValue);
                    }
                  }}
                  onClose={() => setStatsInputSourcesSearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected?.map((value) => (
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
                      checked={filteredStatsInputSources?.length > 0 && selectedInputSources?.length === filteredStatsInputSources?.length}
                      indeterminate={selectedInputSources?.length > 0 && selectedInputSources?.length < filteredStatsInputSources?.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsInputSources?.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsInputSources?.map((source) => (
                    <MenuItem key={source.id} value={source.sourceName}>
                      <Checkbox checked={selectedInputSources?.indexOf(source.sourceName) > -1} size="small" />
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
                  value={selectedCountsOn?.map(c => c.field)}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                    console.log('[issuee] STATS MODULE (Create) - Counts On changed:', value);

                    // Check if "select-all" was clicked
                    if (value?.includes('select-all-counts')) {
                      // Toggle select all
                      if (selectedCountsOn?.length === filteredStatsCountsOn?.length) {
                        setSelectedCountsOn([]);
                      } else {
                        setSelectedCountsOn(filteredStatsCountsOn?.map(field => ({ field, isDistinct: false })));
                      }
                    } else {
                      // Filter out the special "select-all-counts" value
                      const filteredValue = value?.filter((v: string) => v !== 'select-all-counts');
                      // Update selectedCountsOn to match the new selection
                      const updatedCountsOn = filteredValue?.map(field => {
                        // Preserve existing isDistinct flag if field was already selected
                        const existing = selectedCountsOn?.find(c => c.field === field);
                        return existing || { field, isDistinct: false };
                      });
                      setSelectedCountsOn(updatedCountsOn);
                    }
                  }}
                  onOpen={() => {
                    console.log('[issuee] STATS MODULE (Create) - Generate Counts On dropdown opened');
                    console.log('[issuee] STATS MODULE (Create) - filteredStatsCountsOn:', filteredStatsCountsOn);
                    console.log('[issuee] STATS MODULE (Create) - Number of fields available:', filteredStatsCountsOn?.length);
                    console.log('[issuee] STATS MODULE (Create) - selectedInputSources:', selectedInputSources);
                  }}
                  onClose={() => setStatsCountsOnSearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected?.map((value) => {
                        const countOn = selectedCountsOn?.find(c => c.field === value);
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
                      checked={filteredStatsCountsOn?.length > 0 && selectedCountsOn?.length === filteredStatsCountsOn?.length}
                      indeterminate={selectedCountsOn?.length > 0 && selectedCountsOn?.length < filteredStatsCountsOn?.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsCountsOn?.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsCountsOn?.map((field) => {
                    const isSelected = selectedCountsOn?.some(c => c.field === field);
                    const countOn = selectedCountsOn?.find(c => c.field === field);
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
            {selectedCountsOn?.length > 0 && (
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
                    value={selectedCountsOn?.filter(c => c.isDistinct).map(c => c.field)}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                      // Check if "select-all" was clicked
                      if (value?.includes('select-all-distinct')) {
                        // Toggle select all for distinct
                        const allDistinct = selectedCountsOn?.every(c => c.isDistinct);
                        const updatedCountsOn = selectedCountsOn?.map(countOn => ({
                          ...countOn,
                          isDistinct: !allDistinct
                        }));
                        setSelectedCountsOn(updatedCountsOn);
                      } else {
                        // Filter out the special "select-all-distinct" value
                        const selectedDistinctFields = value?.filter((v: string) => v !== 'select-all-distinct');
                        // Update the isDistinct flag for each field in selectedCountsOn
                        const updatedCountsOn = selectedCountsOn?.map(countOn => ({
                          ...countOn,
                          isDistinct: selectedDistinctFields?.includes(countOn.field)
                        }));
                        setSelectedCountsOn(updatedCountsOn);
                      }
                    }}
                    input={<OutlinedInput />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected?.length === 0 ? (
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                            No distinct fields selected
                          </Typography>
                        ) : (
                          selected?.map((value) => (
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
                        checked={selectedCountsOn?.length > 0 && selectedCountsOn?.every(c => c.isDistinct)}
                        indeterminate={selectedCountsOn?.some(c => c.isDistinct) && !selectedCountsOn?.every(c => c.isDistinct)}
                        size="small"
                      />
                      <ListItemText primary="Select All" />
                    </MenuItem>
                    {selectedCountsOn?.map((countOn) => (
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
                    const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                    // Check if "select-all" was clicked
                    if (value?.includes('select-all-breakdown')) {
                      // Toggle select all
                      if (selectedBreakdownBy?.length === filteredStatsBreakdownBy?.length) {
                        setSelectedBreakdownBy([]);
                      } else {
                        setSelectedBreakdownBy(filteredStatsBreakdownBy);
                      }
                    } else {
                      // Filter out the special "select-all-breakdown" value before setting state
                      const filteredValue = value?.filter((v: string) => v !== 'select-all-breakdown');
                      setSelectedBreakdownBy(filteredValue);
                    }
                  }}
                  onClose={() => setStatsBreakdownBySearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected?.map((value) => (
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
                      checked={filteredStatsBreakdownBy?.length > 0 && selectedBreakdownBy?.length === filteredStatsBreakdownBy?.length}
                      indeterminate={selectedBreakdownBy?.length > 0 && selectedBreakdownBy?.length < filteredStatsBreakdownBy?.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsBreakdownBy?.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsBreakdownBy?.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={selectedBreakdownBy?.indexOf(field) > -1} size="small" />
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
          {statsConfigurations?.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                  Stats Configurations
                </Typography>
                <Chip
                  label={`${statsConfigurations?.length} configuration${statsConfigurations?.length !== 1 ? 's' : ''}`}
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
                    {statsConfigurations?.map((config) => (
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
                          {config.inputSources?.length > 0 ? (
                            (() => {
                              // Convert IDs to source names for display
                              const sourceNames = config.inputSources
                                .map(sourceId => {
                                  const source = allAvailableInputSources?.find(s => s.id === sourceId);
                                  return source?.sourceName || sourceId;
                                });

                              return (
                                <Tooltip
                                  title={
                                    <Box sx={{ maxWidth: 400 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                        Input Sources ({sourceNames?.length}):
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block' }}>
                                        {sourceNames?.join(', ')}
                                      </Typography>
                                    </Box>
                                  }
                                  arrow
                                  placement="top"
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip
                                      label={`${sourceNames?.length} source${sourceNames?.length !== 1 ? 's' : ''}`}
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
                                      {sourceNames?.slice(0, 2).join(', ')}
                                      {sourceNames?.length > 2 ? '...' : ''}
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
                          {config.countsOn?.length > 0 ? (
                            <Tooltip
                              title={
                                <Box sx={{ maxWidth: 400 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Counts On ({config.countsOn?.length}):
                                  </Typography>
                                  {config.countsOn?.map((countOn, idx) => (
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
                                  label={`${config.countsOn?.length} field${config.countsOn?.length !== 1 ? 's' : ''}`}
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
                                  {config.countsOn?.slice(0, 2).map(c => `${c.field}${c.isDistinct ? '(D)' : ''}`).join(', ')}
                                  {config.countsOn?.length > 2 ? '...' : ''}
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
                          {config.breakdownBy?.length > 0 ? (
                            <Tooltip
                              title={
                                <Box sx={{ maxWidth: 400 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Breakdown By ({config.breakdownBy?.length}):
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {config.breakdownBy?.join(', ')}
                                  </Typography>
                                </Box>
                              }
                              arrow
                              placement="top"
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={`${config.breakdownBy?.length} field${config.breakdownBy?.length !== 1 ? 's' : ''}`}
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
                                  {config.breakdownBy?.slice(0, 2).join(', ')}
                                  {config.breakdownBy?.length > 2 ? '...' : ''}
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
      // Filter available sources to only include upstream sources (versions from earlier modules)
      const moduleAvailableSources = memoizedModuleAvailableSources[moduleId] || [];

      return (
        <OutputModule
          availableInputSources={moduleAvailableSources}
          initialConfigs={initialOutputConfigs}
          apiSources={apiSources}
          sourcesLoading={sourcesLoading}
          onConfigurationsChange={setOutputConfigurations}
          onTransformedDataChange={setTransformedOutputData}
          appendConfigurations={appendConfigurations}
          sharedCustomSources={sharedCustomSources}
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

  // Determine if we're in initial loading state
  const isInitialLoading = sourcesLoading || editRequestLoading;
  const loadingMessage = editRequestLoading
    ? 'Loading request data...'
    : 'Loading available data sources...';

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
              {requestId ? 'Edit Request' : duplicateId ? 'Duplicate Request' : 'Create New Request'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {requestId ? 'Update your processing request configuration' : duplicateId ? 'Create a duplicate of the selected request' : 'Configure all modules for your processing request'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* View Mode Toggle - Simplified */}
            {/* <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
              Step View
            </Typography>
            <Switch
              checked={viewMode === 'stepper'}
              onChange={(e) => setViewMode(e.target.checked ? 'stepper' : 'accordion')}
              size="small"
              disabled={isInitialLoading}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#296695',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#296695',
                },
              }}
            /> */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<Close />}
              onClick={handleCancel}
              disabled={isInitialLoading}
              sx={{ px: 2.5, py: 0.75, fontSize: '0.875rem' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saveLoading || editRequestLoading || isInitialLoading}
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

      {/* Error State for Edit Request */}
      {editRequestError && (
        <Box sx={{ mb: 2 }}>
          <Alert
            severity="error"
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

      {/* Show loader while loading initial data */}
      {isInitialLoading ? (
        <Paper
          sx={{
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <ContentLoader message={loadingMessage} minHeight="600px" />
        </Paper>
      ) : (
        <>
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
            disabled={!!requestId}
            error={!!requestNameError}
            helperText={requestId ? 'Request name cannot be changed in edit mode' : requestNameError}
            sx={{
              width: '30%',
              '& .MuiOutlinedInput-root': {
                backgroundColor: requestId ? '#f5f5f5' : 'white',
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
              {modules?.map((module, index) => {
                // For first module (Input), render with Add button
                if (index === 0) {
                  return (
                    <Accordion
                      key={module.id}
                      expanded={expanded?.includes(module.id)}
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
                    expanded={expanded?.includes(module.id)}
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
                  {modules?.map((module, index) => {
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
                    disabled={!!requestId}
                    error={!!requestNameError}
                    helperText={requestId ? 'Request name cannot be changed in edit mode' : requestNameError}
                    sx={{
                      width: '40%',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: requestId ? '#f5f5f5' : 'white',
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
              //  
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
                {activeStep === modules?.length - 1 ? 'Finish' : 'Continue'}
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

      {/* Usage Error Dialog */}
      <Dialog
        open={usageErrorDialog.open}
        onClose={() => setUsageErrorDialog({ ...usageErrorDialog, open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            position: 'fixed',
            top: 50,
            m: 0,
          },
        }}
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
          },
        }}
      >
        <DialogTitle sx={{ pb: 2, fontWeight: 700, color: '#D32F2F' }}>
          {usageErrorDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {usageErrorDialog.message}
          </Typography>
       
          
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setUsageErrorDialog({ ...usageErrorDialog, open: false })}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

        </>
      )}
    </Box>
  );
};

export default RequestCreationPage;
