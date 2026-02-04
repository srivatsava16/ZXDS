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
          hasExistingId: hasExistingId
        };

        // For Self sources, include selfConfig
        if (sourceType === 'Self' && source?.selfConfig) {
          // Transform assignment_sets: API → UI conversion (filterJson → filter_config)
          const transformedAssignmentSets = (source.selfConfig.assignment_sets || [])?.map((set: any) => {
            const transformed: any = {
              value_to_assign: set?.value_to_assign || '',
              filter_sql: set?.filter_sql || '',
            };

            // Rename filterJson to filter_config (API → UI conversion)
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
            // Prefer add_fields at config level, otherwise extract from match_sources[].fields
            const addFields = configJson?.add_fields ||
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
            // Prefer add_fields at config level, otherwise extract from match_sources[].fields
            const configAddFields = configJson?.add_fields ||
                                   configJson?.match_sources?.flatMap((src: any) => src?.fields || []) || [];

            matchConfigs?.push({
              id: configId,
              inputSources: inputSources, // Array of source IDs
              matchOnFields: configJson?.match_keys || [],
              matchSources: matchSources, // Array of source IDs (preconfigured or custom)
              expand: configJson?.expand !== undefined ? configJson.expand : false,
              matchType: configJson?.match_type || 'full',
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

        // Use existing stat ID if available (for edit mode), otherwise generate new one
        const existingStatId = stat?.id;
        const statId = existingStatId || `stats_${Date.now()}_${index}`;
        const hasExistingId = !!existingStatId;

        return {
          id: statId,
          inputSources: inputSourceNames, // Array of source NAMES (stats uses names, not IDs)
          countsOn: countsOn,
          breakdownBy: stat?.breakdown_by || [],
          // Flag to indicate if this has an existing ID from API (for update payload)
          hasExistingId: hasExistingId
        };
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
        console.log('[BACK] No ID to load, returning');
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
            console.log('[BACK] setInitialMatchConfigs called');
          }

          // Load module-level field mappings (assign to default panel IDs for backward compatibility)
          console.log('[EDIT] Append field mappings:', dataToLoad?.appendModuleFieldMappings);
          console.log('[EDIT] Match field mappings:', dataToLoad?.matchModuleFieldMappings);
          console.log('[EDIT] Suppress field mappings:', dataToLoad?.suppressModuleFieldMappings);

          if (dataToLoad?.appendModuleFieldMappings && Array.isArray(dataToLoad?.appendModuleFieldMappings)) {
            console.log('[EDIT] Setting append field mappings for panel2');
            setAppendModuleFieldMappings({ panel2: dataToLoad?.appendModuleFieldMappings });
          }
          if (dataToLoad?.matchModuleFieldMappings && Array.isArray(dataToLoad?.matchModuleFieldMappings)) {
            console.log('[EDIT] Setting match field mappings for panel4');
            setMatchModuleFieldMappings({ panel4: dataToLoad?.matchModuleFieldMappings });
          }
          if (dataToLoad?.suppressModuleFieldMappings && Array.isArray(dataToLoad?.suppressModuleFieldMappings)) {
            console.log('[EDIT] Setting suppress field mappings for panel3');
            setSuppressModuleFieldMappings({ panel3: dataToLoad?.suppressModuleFieldMappings });
          }

          // Load output configurations
          console.log('[EDIT] Output configs count:', dataToLoad?.outputConfigs?.length || 0);
          console.log('[EDIT] Output configs:', dataToLoad?.outputConfigs);
          if (dataToLoad?.outputConfigs && Array.isArray(dataToLoad.outputConfigs) && dataToLoad.outputConfigs?.length > 0) {
            setInitialOutputConfigs(dataToLoad.outputConfigs);
          }

          // Load stats configurations
          console.log('[EDIT] Stats configs count:', dataToLoad?.statsConfigs?.length || 0);
          console.log('[EDIT] Stats configs:', dataToLoad?.statsConfigs);
          if (dataToLoad?.statsConfigs && Array.isArray(dataToLoad.statsConfigs) && dataToLoad.statsConfigs?.length > 0) {
            setStatsConfigurations(dataToLoad.statsConfigs);
          }

          console.log('[EDIT] ========== DATA LOADING COMPLETE ==========');

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
          console.log('[BACK] === RESTORING MODULE ORDER ===');
          console.log('[BACK] moduleDuplicationInfo:', dataToLoad?.moduleDuplicationInfo);
          console.log('[BACK] moduleOrder:', dataToLoad?.moduleOrder);

          if (dataToLoad?.moduleDuplicationInfo) {
            const duplicationInfo = dataToLoad?.moduleDuplicationInfo;
            const moduleOrder = dataToLoad?.moduleOrder;

            console.log('[BACK] Starting module restoration...');
            console.log('[BACK] Append count:', duplicationInfo?.appendModuleCount);
            console.log('[BACK] Match count:', duplicationInfo?.matchModuleCount);
            console.log('[BACK] Suppress count:', duplicationInfo?.suppressModuleCount);
            console.log('[BACK] Module order:', moduleOrder);

            // Get the base module definitions
            const baseModules = createModuleDefinitions();
            console.log('[BACK] Base modules:', baseModules?.map(m => `${m?.id} (${m?.title})`));

            const restoredModules = [...baseModules];
            console.log('[BACK] Initial restored modules (before modification):', restoredModules?.map(m => `${m?.id} (${m?.title})`));

            // Create duplicate Append modules
            console.log('[BACK] Creating Append modules...');
            if (duplicationInfo?.appendModuleCount > 1) {
              const appendModule = baseModules?.find(m => m?.id === 'panel2');
              if (appendModule) {
                console.log('[BACK] Adding', duplicationInfo?.appendModuleCount - 1, 'additional Append modules');
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
                  console.log(`[BACK] Created Append module: ${newModule?.id}`);
                }
                setModuleCounter(prev => ({ ...prev, Append: duplicationInfo?.appendModuleCount }));
              }
            }
            console.log('[BACK] Modules after Append duplication:', restoredModules?.map(m => `${m?.id} (${m?.title})`));

            // Create duplicate Suppress modules
            console.log('[BACK] Creating Suppress modules...');
            if (duplicationInfo?.suppressModuleCount > 1) {
              const suppressModule = baseModules?.find(m => m?.id === 'panel3');
              if (suppressModule) {
                console.log('[BACK] Adding', duplicationInfo?.suppressModuleCount - 1, 'additional Suppress modules');
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
                  console.log(`[BACK] Created Suppress module: ${newModule?.id}`);
                }
                setModuleCounter(prev => ({ ...prev, Suppression: duplicationInfo?.suppressModuleCount }));
              }
            }
            console.log('[BACK] Modules after Suppress duplication:', restoredModules?.map(m => `${m?.id} (${m?.title})`));

            // Create duplicate Match modules
            console.log('[BACK] Creating Match modules...');
            if (duplicationInfo?.matchModuleCount > 1) {
              const matchModule = baseModules?.find(m => m?.id === 'panel4');
              if (matchModule) {
                console.log('[BACK] Adding', duplicationInfo?.matchModuleCount - 1, 'additional Match modules');
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
                  console.log(`[BACK] Created Match module: ${newModule?.id}`);
                }
                setModuleCounter(prev => ({ ...prev, Match: duplicationInfo?.matchModuleCount }));
              }
            }
            console.log('[BACK] Modules after Match duplication:', restoredModules?.map(m => `${m?.id} (${m?.title})`));

            // Now reorder the modules based on moduleOrder
            console.log('[BACK] === APPLYING MODULE ORDER ===');
            if (moduleOrder && moduleOrder?.length > 0) {
              console.log('[BACK] Module order to apply:', moduleOrder);

              // Extract the draggable modules (panel2, panel3, panel4) from restoredModules
              const inputModule = restoredModules?.find(m => m?.id === 'panel1');
              const statsModule = restoredModules?.find(m => m?.id === 'panel5');
              const outputModule = restoredModules?.find(m => m?.id === 'panel6');
              const scheduleModule = restoredModules?.find(m => m?.id === 'panel7');

              const appendModules = restoredModules?.filter(m => m?.id === 'panel2' || m?.id?.startsWith('panel2_'));
              const suppressModules = restoredModules?.filter(m => m?.id === 'panel3' || m?.id?.startsWith('panel3_'));
              const matchModules = restoredModules?.filter(m => m?.id === 'panel4' || m?.id?.startsWith('panel4_'));

              console.log('[BACK] Draggable modules found:');
              console.log('[BACK]   Append:', appendModules?.map(m => m?.id));
              console.log('[BACK]   Suppress:', suppressModules?.map(m => m?.id));
              console.log('[BACK]   Match:', matchModules?.map(m => m?.id));

              // Build the new order
              const reorderedModules: any[] = [];

              // Add Input module first (always position 0)
              if (inputModule) reorderedModules?.push(inputModule);

              // Add draggable modules in the order specified by moduleOrder
              // moduleOrder now includes ALL modules (with data and empty placeholders)
              let appendIndex = 0;
              let suppressIndex = 0;
              let matchIndex = 0;

              console.log('[BACK] Processing complete module order (including empty modules)...');

              // Simply follow the moduleOrder which already includes empty slots
              moduleOrder?.forEach((orderItem: any, idx: number) => {
                const isEmpty = orderItem?.isEmpty || false;
                console.log(`[BACK] Item ${idx}: stepOrder ${orderItem?.stepOrder}, type ${orderItem?.type}, isEmpty: ${isEmpty}`);

                if (orderItem?.type === 'A' && appendIndex < appendModules?.length) {
                  const moduleToAdd = appendModules[appendIndex];
                  reorderedModules?.push(moduleToAdd);
                  console.log(`[BACK]   Added Append module: ${moduleToAdd?.id} ${isEmpty ? '(EMPTY)' : '(HAS DATA)'}`);
                  appendIndex++;
                } else if (orderItem?.type === 'M' && matchIndex < matchModules?.length) {
                  const moduleToAdd = matchModules[matchIndex];
                  reorderedModules?.push(moduleToAdd);
                  console.log(`[BACK]   Added Match module: ${moduleToAdd?.id} ${isEmpty ? '(EMPTY)' : '(HAS DATA)'}`);
                  matchIndex++;
                } else if (orderItem?.type === 'S' && suppressIndex < suppressModules?.length) {
                  const moduleToAdd = suppressModules[suppressIndex];
                  reorderedModules?.push(moduleToAdd);
                  console.log(`[BACK]   Added Suppress module: ${moduleToAdd?.id} ${isEmpty ? '(EMPTY)' : '(HAS DATA)'}`);
                  suppressIndex++;
                }
              });

              // Safety check: Ensure at least one of each required module type exists
              // This handles edge cases where moduleOrder might be malformed
              if (appendIndex === 0 && appendModules?.length > 0) {
                const moduleToAdd = appendModules[0];
                reorderedModules?.push(moduleToAdd);
                console.log('[BACK] ⚠️ Safety: Added required Append module (was missing from order):', moduleToAdd?.id);
                appendIndex++;
              }
              if (suppressIndex === 0 && suppressModules?.length > 0) {
                const moduleToAdd = suppressModules[0];
                reorderedModules?.push(moduleToAdd);
                console.log('[BACK] ⚠️ Safety: Added required Suppress module (was missing from order):', moduleToAdd?.id);
                suppressIndex++;
              }
              if (matchIndex === 0 && matchModules?.length > 0) {
                const moduleToAdd = matchModules[0];
                reorderedModules?.push(moduleToAdd);
                console.log('[BACK] ⚠️ Safety: Added required Match module (was missing from order):', moduleToAdd?.id);
                matchIndex++;
              }

              // Add fixed modules at the end
              if (statsModule) reorderedModules?.push(statsModule);
              if (outputModule) reorderedModules?.push(outputModule);
              if (scheduleModule) reorderedModules?.push(scheduleModule);

              console.log('[BACK] ✅ MODULE ORDER APPLIED!');
              console.log('[BACK] New module order:', reorderedModules?.map((m, idx) => `${idx}: ${m?.id} (${m?.label || m?.title})`));

              setModules(reorderedModules);
            } else {
              console.log('[BACK] No moduleOrder found, using default order');

              // Even without moduleOrder, we still need to apply duplicates
              if (restoredModules?.length > baseModules?.length) {
                console.log('[BACK] Setting restored modules with duplicates (', restoredModules?.length, 'modules)');
                setModules(restoredModules);
              } else {
                console.log('[BACK] No changes needed, keeping default modules');
              }
            }
          }

          // Clear validation errors
          setRequestNameError('');
          setRecipientEmailError('');
          setScheduledDateTimeError('');

          console.log('[BACK] ========== EDIT MODE LOADING COMPLETE ==========');
          console.log('[BACK] Final state:');
          console.log('[BACK]   - Input sources loaded:', allInputSources?.length);
          console.log('[BACK]   - Versioned sources loaded:', allVersionedSources?.length);
          console.log('[BACK]   - Custom sources loaded:', dataToLoad?.customSources?.length || 0);
          console.log('[BACK]   - Append configs loaded:', dataToLoad?.appendConfigs?.length || 0);
          console.log('[BACK]   - Match configs loaded:', dataToLoad?.matchConfigs?.length || 0);
          console.log('[BACK]   - Suppress configs loaded:', dataToLoad?.suppressConfigs?.length || 0);
          console.log('[BACK]   - Module order extracted:', dataToLoad?.moduleOrder?.length > 0 ? 'YES' : 'NO');
          console.log('[BACK]   - Module order applied:', dataToLoad?.moduleOrder?.length > 0 ? 'YES ✅' : 'NO (using default order)');
        }

      } catch (error: any) {
        console.log('[BACK] ========== ERROR DURING LOADING ==========');
        console.log('[BACK] Error:', error);
        

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
      console.log('[DELETE] Marking initial configs as consumed after load');
      console.log('[DELETE] initialAppendConfigs count:', initialAppendConfigs?.length);
      console.log('[DELETE] initialSuppressConfigs count:', initialSuppressConfigs?.length);
      console.log('[DELETE] initialMatchConfigs count:', initialMatchConfigs?.length);
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
          source_name: getSourceName(sourceId)
        })) || [];
      }

      return {
        ...version,
        ...updatedVersion,
        // Ensure critical properties are preserved
        id: versionId,
        isVersioned: true as const,
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
    setInputSources(prev => prev?.map(source =>
      source?.id === versionId ? {
        ...source,
        ...updatedVersion,
        id: versionId
      } : source
    ));

    
  };

  const handleDeleteVersion = (versionId: string) => {
    

    // Remove from versioned sources
    setVersionedSources(prev => prev?.filter(version => version?.id !== versionId));

    // Also remove from input sources if it exists there
    setInputSources(prev => prev?.filter(source => source?.id !== versionId));

    
  };

  // Handlers for shared custom sources - with module tracking
  const handleAddSharedCustomSource = (source: InputSource, createdByModuleId: string) => {
    console.log('[SELF] ========== handleAddSharedCustomSource START ==========');
    console.log('[SELF] Received source:', source);
    console.log('[SELF] source.sourceType:', source?.sourceType);
    console.log('[SELF] source.sourceName:', source?.sourceName);
    console.log('[SELF] source.selfConfig:', source?.selfConfig);
    console.log('[SELF] createdByModuleId:', createdByModuleId);

    const newSource = {
      ...source,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdByModuleId // Track which module created this source
    };

    console.log('[SELF] newSource with ID:', newSource?.id);

    setSharedCustomSources(prev => {
      const updated = [...prev, newSource];
      console.log('[SELF] sharedCustomSources updated. New count:', updated?.length);
      console.log('[SELF] All sharedCustomSources:', updated);
      return updated;
    });

    // If this is a Self source with a generated column, add the generated column to the input sources
    if (source?.sourceType === 'Self' && source?.selfConfig) {
      console.log('[SELF] This IS a Self-append source!');
      const { input_source_names, generated_column } = source?.selfConfig;

      console.log('[SELF] generated_column:', generated_column);
      console.log('[SELF] input_source_names:', input_source_names);

      if (generated_column && input_source_names && input_source_names?.length > 0) {
        console.log('[SELF] Self-append source WITH generated column:', generated_column);
        console.log('[SELF] Input source names that should get this column:', input_source_names);

        // IMPORTANT: Do NOT modify the original input source headers or versioned source headers
        // The generated column should be available through self-append source only
        // Downstream modules will see it through the self-append custom source
        console.log('[SELF] Input sources will be enhanced in allAvailableInputSources memo');
      }
    } else {
      console.log('[SELF] This is NOT a Self-append source');
    }
    console.log('[SELF] ========== handleAddSharedCustomSource END ==========');
  };

  const handleEditSharedCustomSource = (source: InputSource) => {
    // Find the original source to compare
    const originalSource = sharedCustomSources?.find(s => s.id === source.id);

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
      console.log('[handleEditSharedCustomSource] Old generated column:', oldGeneratedColumn, '-> New:', newGeneratedColumn);
      console.log('[handleEditSharedCustomSource] New input source names:', newInputSourceNames);
    }
  };

  const handleDeleteSharedCustomSource = (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom source?')) {
      // Find the source to be deleted
      const sourceToDelete = sharedCustomSources?.find(s => s.id === id);

      // Remove from shared custom sources
      setSharedCustomSources(prev => prev?.filter(s => s.id !== id));

      // IMPORTANT: Do NOT modify input source headers
      // Generated columns from self-append sources do not affect original input sources
      if (sourceToDelete?.sourceType === 'Self' && sourceToDelete?.selfConfig) {
        console.log('[handleDeleteSharedCustomSource] Deleted self-append source:', sourceToDelete?.sourceName);
        console.log('[handleDeleteSharedCustomSource] Generated column:', sourceToDelete?.selfConfig?.generated_column);
      }
    }
  };

  // Module-aware configuration change handlers
  // These handlers ensure configurations from different module instances don't overwrite each other
  // Memoized to prevent infinite re-render loops

  const handleAppendConfigurationsChange = useCallback((moduleId: string, newConfigs: AppendConfig[]) => {
    console.log('[DELETE] Index.tsx - handleAppendConfigurationsChange called');
    console.log('[DELETE] Index.tsx - moduleId:', moduleId);
    console.log('[DELETE] Index.tsx - newConfigs count:', newConfigs?.length);
    console.log('[DELETE] Index.tsx - newConfigs:', newConfigs);

    setAppendConfigurations(prevConfigs => {
      console.log('[DELETE] Index.tsx - prevConfigs count:', prevConfigs?.length);
      console.log('[DELETE] Index.tsx - prevConfigs:', prevConfigs);

      // Ensure all new configs have the correct createdByModuleId
      const configsWithModuleId = newConfigs?.map(config => ({
        ...config,
        createdByModuleId: config?.createdByModuleId || moduleId
      }));

      // Remove configurations from this specific module
      const otherModuleConfigs = prevConfigs?.filter(c => c?.createdByModuleId !== moduleId);
      console.log('[DELETE] Index.tsx - otherModuleConfigs count:', otherModuleConfigs?.length);

      // Add new configurations from this module
      const mergedConfigs = [...otherModuleConfigs, ...configsWithModuleId];
      console.log('[DELETE] Index.tsx - mergedConfigs count:', mergedConfigs?.length);

      // Prevent infinite loops: only update if something actually changed
      const configsFromThisModule = prevConfigs?.filter(c => c?.createdByModuleId === moduleId);
      const hasChanges = configsFromThisModule?.length !== configsWithModuleId?.length ||
        JSON.stringify(configsFromThisModule) !== JSON.stringify(configsWithModuleId);

      if (!hasChanges) {
        console.log('[DELETE] Index.tsx - No changes detected, returning prevConfigs');
        return prevConfigs; // No change, return previous state to prevent re-render
      }

      console.log('[DELETE] Index.tsx - Changes detected, returning mergedConfigs');
      return mergedConfigs;
    });
  }, []);

  const handleSuppressConfigurationsChange = useCallback((moduleId: string, newConfigs: SuppressConfig[]) => {
    console.log('[DELETE] Index.tsx - handleSuppressConfigurationsChange called');
    console.log('[DELETE] Index.tsx - moduleId:', moduleId);
    console.log('[DELETE] Index.tsx - newConfigs count:', newConfigs?.length);
    console.log('[DELETE] Index.tsx - newConfigs:', newConfigs);

    setSuppressConfigurations(prevConfigs => {
      console.log('[DELETE] Index.tsx - prevConfigs count:', prevConfigs?.length);
      console.log('[DELETE] Index.tsx - prevConfigs:', prevConfigs);

      // Ensure all new configs have the correct createdByModuleId
      const configsWithModuleId = newConfigs?.map(config => ({
        ...config,
        createdByModuleId: config?.createdByModuleId || moduleId
      }));

      // Remove configurations from this specific module
      const otherModuleConfigs = prevConfigs?.filter(c => c?.createdByModuleId !== moduleId);
      console.log('[DELETE] Index.tsx - otherModuleConfigs count:', otherModuleConfigs?.length);

      // Add new configurations from this module
      const mergedConfigs = [...otherModuleConfigs, ...configsWithModuleId];
      console.log('[DELETE] Index.tsx - mergedConfigs count:', mergedConfigs?.length);

      // Prevent infinite loops: only update if something actually changed
      const configsFromThisModule = prevConfigs?.filter(c => c?.createdByModuleId === moduleId);
      const hasChanges = configsFromThisModule?.length !== configsWithModuleId?.length ||
        JSON.stringify(configsFromThisModule) !== JSON.stringify(configsWithModuleId);

      if (!hasChanges) {
        console.log('[DELETE] Index.tsx - No changes detected, returning prevConfigs');
        return prevConfigs; // No change, return previous state to prevent re-render
      }

      console.log('[DELETE] Index.tsx - Changes detected, returning mergedConfigs');
      return mergedConfigs;
    });
  }, []);

  const handleMatchConfigurationsChange = useCallback((moduleId: string, newConfigs: MatchConfig[]) => {
    console.log('[DELETE] Index.tsx - handleMatchConfigurationsChange called');
    console.log('[DELETE] Index.tsx - moduleId:', moduleId);
    console.log('[DELETE] Index.tsx - newConfigs count:', newConfigs?.length);
    console.log('[DELETE] Index.tsx - newConfigs:', newConfigs);

    setMatchConfigurations(prevConfigs => {
      console.log('[DELETE] Index.tsx - prevConfigs count:', prevConfigs?.length);
      console.log('[DELETE] Index.tsx - prevConfigs:', prevConfigs);

      // Ensure all new configs have the correct createdByModuleId
      const configsWithModuleId = newConfigs?.map(config => ({
        ...config,
        createdByModuleId: config?.createdByModuleId || moduleId
      }));

      // Remove configurations from this specific module
      const otherModuleConfigs = prevConfigs?.filter(c => c?.createdByModuleId !== moduleId);
      console.log('[DELETE] Index.tsx - otherModuleConfigs count:', otherModuleConfigs?.length);

      // Add new configurations from this module
      const mergedConfigs = [...otherModuleConfigs, ...configsWithModuleId];
      console.log('[DELETE] Index.tsx - mergedConfigs count:', mergedConfigs?.length);

      // Prevent infinite loops: only update if something actually changed
      const configsFromThisModule = prevConfigs?.filter(c => c?.createdByModuleId === moduleId);
      const hasChanges = configsFromThisModule?.length !== configsWithModuleId?.length ||
        JSON.stringify(configsFromThisModule) !== JSON.stringify(configsWithModuleId);

      if (!hasChanges) {
        console.log('[DELETE] Index.tsx - No changes detected, returning prevConfigs');
        return prevConfigs; // No change, return previous state to prevent re-render
      }

      console.log('[DELETE] Index.tsx - Changes detected, returning mergedConfigs');
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
    console.log('[HEADERS-TRACE] ==================== CREATE VERSION START ====================');
    console.log('[HEADERS-TRACE] Module:', sourceModule, '| Module ID:', moduleId);
    console.log('[HEADERS-TRACE] Base Input Sources:', baseInputSources);
    console.log('[HEADERS-TRACE] Operation Sources:', operationSources);
    console.log('[HEADERS-TRACE] Operation Fields:', operationFields);
    console.log('[HEADERS-TRACE] Append Fields:', appendFields);
    console.log('[HEADERS-TRACE] Add Fields:', addFields);

    // Log the CURRENT state of each Input source BEFORE creating version
    console.log('[HEADERS-TRACE] === BEFORE VERSION CREATION - Input Source Headers ===');
    baseInputSources?.forEach(sourceId => {
      const source = allAvailableInputSources?.find(s => s?.id === sourceId);
      if (source) {
        console.log(`[HEADERS-TRACE] Input Source: ${source?.sourceName} (ID: ${sourceId})`);
        console.log(`[HEADERS-TRACE]   - headers:`, source?.headers);
        console.log(`[HEADERS-TRACE]   - selectedHeaders:`, source?.selectedHeaders);
        console.log(`[HEADERS-TRACE]   - headers length:`, source?.headers?.length);
        console.log(`[HEADERS-TRACE]   - selectedHeaders length:`, source?.selectedHeaders?.length);
      } else {
        console.log(`[HEADERS-TRACE] Input Source NOT FOUND: ${sourceId}`);
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

      console.log(`[handleCreateVersionedSource] Input source ${inputSource?.sourceName}`);
      console.log(`[handleCreateVersionedSource] Input source selectedHeaders:`, inputSource?.selectedHeaders);
      console.log(`[handleCreateVersionedSource] operationFields (match/suppress keys):`, operationFields);
      console.log(`[handleCreateVersionedSource] appendFields:`, appendFields);
      console.log(`[handleCreateVersionedSource] addFields:`, addFields);

      // Start with selected headers from the input source
      const inputSourceHeaders = inputSource?.selectedHeaders || inputSource?.headers || [];
      combinedHeaders = [...inputSourceHeaders];
      console.log(`[handleCreateVersionedSource] Starting with input source selected headers:`, combinedHeaders);

      // For Append module: Include input source selected headers + appendFields (fields to append)
      if (sourceModule === 'Append') {
        // Add appended fields (avoiding duplicates)
        if (appendFields && appendFields?.length > 0) {
          appendFields?.forEach(field => {
            if (!combinedHeaders?.includes(field)) {
              combinedHeaders?.push(field);
            }
          });
          console.log(`[handleCreateVersionedSource] Append module - added appendFields:`, appendFields);
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
          console.log(`[handleCreateVersionedSource] Match module - added addFields:`, addFields);
        }
      }

      // For Suppress module: Include input source selected headers only (no additional fields)
      if (sourceModule === 'Suppress') {
        // Already have input source headers, nothing to add
        console.log(`[handleCreateVersionedSource] Suppress module - using input source selected headers only`);
      }

      console.log(`[handleCreateVersionedSource] Final combinedHeaders for versioned source:`, combinedHeaders);

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

        // Add Fields are separate - fields from MATCH sources to add to the output (stored in addFields)
        // Only include add_fields if there are any selected
        if (addFields && addFields?.length > 0) {
          configJson.add_fields = addFields;
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
    console.log('[HEADERS-TRACE] === AFTER VERSION CREATION - Input Source Headers ===');
    baseInputSources?.forEach(sourceId => {
      const source = allAvailableInputSources?.find(s => s?.id === sourceId);
      if (source) {
        console.log(`[HEADERS-TRACE] Input Source: ${source?.sourceName} (ID: ${sourceId})`);
        console.log(`[HEADERS-TRACE]   - headers:`, source?.headers);
        console.log(`[HEADERS-TRACE]   - selectedHeaders:`, source?.selectedHeaders);
        console.log(`[HEADERS-TRACE]   - headers length:`, source?.headers?.length);
        console.log(`[HEADERS-TRACE]   - selectedHeaders length:`, source?.selectedHeaders?.length);
      }
    });

    // Log the created versions
    console.log('[HEADERS-TRACE] === CREATED VERSIONS ===');
    newVersions?.forEach(version => {
      console.log(`[HEADERS-TRACE] Version: ${version?.versionLabel}`);
      console.log(`[HEADERS-TRACE]   - headers:`, version?.headers);
      console.log(`[HEADERS-TRACE]   - selectedHeaders:`, version?.selectedHeaders);
      console.log(`[HEADERS-TRACE]   - headers length:`, version?.headers?.length);
    });
    console.log('[HEADERS-TRACE] ==================== CREATE VERSION END ====================');

    // Show success message
    const versionNames = newVersions?.map(v => v.versionLabel).join(', ');
    const summary = `${newVersions?.length} versioned source(s) created:\n\n${versionNames}\n\nThey are now available in all subsequent module dropdowns.`;
    alert(summary);
  };

  // Combine regular input sources with versioned sources for child modules
  // Memoize to prevent infinite re-renders
  const allAvailableInputSources = useMemo<InputSource[]>(() => {
    console.log('[SELF] ========== allAvailableInputSources RECALCULATING ==========');
    console.log('[SELF] inputSources count:', inputSources?.length);
    console.log('[SELF] inputSources:', inputSources);
    console.log('[SELF] sharedCustomSources count:', sharedCustomSources?.length);
    console.log('[SELF] sharedCustomSources:', sharedCustomSources);

    // Enhance input sources with generated columns from self-append sources for downstream module visibility
    const enhancedInputSources = inputSources?.map(source => {
      console.log('[SELF] --- Processing source:', source?.sourceName);
      console.log('[SELF] Source ID:', source?.id);
      console.log('[SELF] Source headers:', source?.headers);

      // Find all self-append sources that use this source as input
      const generatedColumnsForSource: string[] = [];

      sharedCustomSources?.forEach(customSource => {
        console.log('[SELF] Checking customSource:', customSource?.sourceName, 'Type:', customSource?.sourceType);

        if (customSource?.sourceType === 'Self' && customSource?.selfConfig) {
          console.log('[SELF] Found Self source!');
          const { input_source_names, generated_column } = customSource?.selfConfig;

          console.log('[SELF] input_source_names:', input_source_names);
          console.log('[SELF] generated_column:', generated_column);
          console.log('[SELF] Current source name:', source?.sourceName);

          // Check if this source is used as input for this self-append source
          if (input_source_names?.includes(source?.sourceName) && generated_column) {
            console.log('[SELF] MATCH! Adding generated column:', generated_column, 'to source:', source?.sourceName);
            generatedColumnsForSource?.push(generated_column);
          } else {
            console.log('[SELF] No match. Source not in input_source_names or no generated_column');
          }
        }
      });

      console.log('[SELF] Total generated columns for', source?.sourceName, ':', generatedColumnsForSource);

      // If there are generated columns, enhance the source with them for UI display
      if (generatedColumnsForSource?.length > 0) {
        console.log(`[SELF] *** ENHANCING source "${source?.sourceName}" ***`);
        console.log(`[SELF] Generated columns to add:`, generatedColumnsForSource);
        console.log(`[SELF] Original headers:`, source?.headers);
        console.log(`[SELF] Original selectedHeaders:`, source?.selectedHeaders);
        console.log(`[HEADERS-TRACE] ⚠️ ENHANCEMENT DETECTED - Source: ${source?.sourceName}`);
        console.log(`[HEADERS-TRACE]   - Original headers (${source?.headers?.length}):`, source?.headers);
        console.log(`[HEADERS-TRACE]   - Generated columns to add (${generatedColumnsForSource?.length}):`, generatedColumnsForSource);

        // Preserve original headers and selectedHeaders
        const originalHeaders = source?.headers || [];
        const originalSelectedHeaders = source?.selectedHeaders || originalHeaders;

        // Add generated columns to both headers and selectedHeaders
        const enhancedHeaders = [...originalHeaders, ...generatedColumnsForSource];
        const enhancedSelectedHeaders = [...originalSelectedHeaders, ...generatedColumnsForSource];

        console.log(`[SELF] Enhanced headers:`, enhancedHeaders);
        console.log(`[SELF] Enhanced selectedHeaders:`, enhancedSelectedHeaders);
        console.log(`[HEADERS-TRACE]   - Enhanced headers (${enhancedHeaders?.length}):`, enhancedHeaders);
        console.log(`[HEADERS-TRACE]   - This enhanced source will be visible to ALL modules (not order-aware)`);

        const enhancedSource = {
          ...source,
          headers: enhancedHeaders, // Enhanced headers for UI display (includes generated columns)
          selectedHeaders: enhancedSelectedHeaders, // Enhanced selected headers (preserves user selection + adds generated)
          originalHeaders: originalHeaders, // Preserve original headers for payload transformation
          originalSelectedHeaders: originalSelectedHeaders, // Preserve original selected headers for payload
        };

        console.log(`[SELF] Returning enhanced source:`, enhancedSource);
        return enhancedSource;
      }

      console.log(`[SELF] No generated columns for "${source?.sourceName}", returning original`);
      return source;
    });

    console.log('[SELF] Enhanced input sources:', enhancedInputSources);

    const result = [...enhancedInputSources, ...versionedSources];
    console.log('[SELF] Final allAvailableInputSources count:', result?.length);
    console.log('[SELF] Final allAvailableInputSources:', result);
    console.log('[SELF] ========== allAvailableInputSources DONE ==========');

    return result;
  }, [inputSources, versionedSources, sharedCustomSources]);

  // Helper function to get all fields for a source (original + appended fields + self-append generated columns)
  const getSourceFieldsWithAppends = useMemo(() => {
    return (source: InputSource): string[] => {
      console.log('[SELF] getSourceFieldsWithAppends called for source:', source?.sourceName);

      // Start with original headers
      const originalHeaders = source?.selectedHeaders || source?.headers || [];
      console.log('[SELF] Starting headers:', originalHeaders);
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
          console.log('[SELF] Adding appended fields:', config?.appendFields);
          config?.appendFields?.forEach(field => allFields?.add(field));
        }
      });

      // IMPORTANT: Also add generated columns from self-append sources that use this source as input
      console.log('[SELF] Checking self-append sources for generated columns...');
      sharedCustomSources?.forEach(customSource => {
        console.log('[SELF] Checking customSource:', customSource?.sourceName);
        // Check if this is a self-append source
        if (customSource?.sourceType === 'Self' && customSource?.selfConfig) {
          console.log('[SELF] Found Self source with config');
          const { input_source_names, generated_column } = customSource?.selfConfig;

          console.log('[SELF] input_source_names:', input_source_names);
          console.log('[SELF] generated_column:', generated_column);
          console.log('[SELF] Looking for source:', source?.sourceName);

          // Check if this source is one of the input sources for this self-append source
          const isInputSource = input_source_names?.includes(source?.sourceName);

          console.log('[SELF] Is input source?', isInputSource);

          // If this source is used in the self-append config, add the generated column
          if (isInputSource && generated_column) {
            console.log(`[SELF] *** Adding generated column "${generated_column}" to source "${source?.sourceName}" ***`);
            allFields?.add(generated_column);
          }
        }
      });

      const result = Array.from(allFields);
      console.log('[SELF] getSourceFieldsWithAppends result for', source?.sourceName, ':', result);
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

    console.log(`[transformFileSourceToAPI] Source ${source?.sourceName}`);
    console.log(`[transformFileSourceToAPI] originalHeaders:`, source?.originalHeaders);
    console.log(`[transformFileSourceToAPI] originalSelectedHeaders:`, source?.originalSelectedHeaders);
    console.log(`[transformFileSourceToAPI] Using headers:`, headers, `(count: ${headers?.length})`);
    console.log(`[transformFileSourceToAPI] Using selectedHeaders:`, selectedHeaders, `(count: ${selectedHeaders?.length})`);

    // Determine columnSelectionType: "A" if all headers selected, "S" if subset
    const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

    // Determine inputType: "P" for preconfigured (has fileSourceId), "M" for manual
    const inputType = source.fileSourceId ? 'I' : 'M';

    // Get file format from extension
    const getFileFormat = (fileName: string) => {
      if (!fileName) return 'CSV';
      const extension = fileName?.split('.').pop()?.toUpperCase();
      return extension || 'CSV';
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
      selectedColumns: selectedHeaders?.join(','), // Send as-is (custom names if custom headers exist)
      inputType: inputType,
      filters: filters,
      customHeaders: source.customHeaders || '',
      filterJson: source.filterJson || null,
      subSourceType: source.subSourceType
    };
  };

  // Transform input sources to the required API format (only File and Database sources)
  const transformInputSourcesToAPIFormat = (sources: InputSource[]) => {
    console.log('[transformInputSourcesToAPIFormat] Starting transformation with sources:', sources);
    console.log('[transformInputSourcesToAPIFormat] Total sources count:', sources?.length);

    // Log each source's headers
    sources?.forEach((source, idx) => {
      console.log(`[transformInputSourcesToAPIFormat] Source ${idx}: ${source?.sourceName}, headers:`, source?.headers, 'selectedHeaders:', source?.selectedHeaders);
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

    console.log('[transformInputSourcesToAPIFormat] Filtered file/database sources count:', fileAndDatabaseSources?.length);


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
          console.log(`[transformInputSourcesToAPIFormat] Using originalHeaders for columns: ${result?.columns?.length} columns`);
        }

        // CRITICAL: Use originalSelectedHeaders for selectedColumns if available
        if ((source as any)?.originalSelectedHeaders) {
          result.selectedColumns = (source as any)?.originalSelectedHeaders?.join(',');
          console.log(`[transformInputSourcesToAPIFormat] Using originalSelectedHeaders for selectedColumns`);
        } else if ((source as any)?.originalHeaders && result?.selectedColumns) {
          // If we have originalHeaders but not originalSelectedHeaders, filter selectedColumns
          const originalHeadersSet = new Set((source as any)?.originalHeaders);
          const selectedColsArray = result?.selectedColumns?.split(',') || [];
          const filteredSelectedCols = selectedColsArray?.filter((col: string) => originalHeadersSet?.has(col));
          result.selectedColumns = filteredSelectedCols?.join(',');
          console.log(`[transformInputSourcesToAPIFormat] Filtered selectedColumns to exclude generated columns`);
        }

        // Include ID if this is an existing source (for update payload)
        // Only include if hasExistingId is true (source.id is the internal ID, not API ID)
        if ((source as any)?.hasExistingId && source?.id) {
          result.id = source?.id;
          console.log(`[transformInputSourcesToAPIFormat] Including existing ID: ${source?.id}`);
        }

        console.log(`[transformInputSourcesToAPIFormat] API-format source columns:`, result?.columns, `(count: ${result?.columns?.length})`);
        console.log(`[transformInputSourcesToAPIFormat] API-format source selectedColumns:`, result?.selectedColumns);
        return result;
      }

      // Handle File sources - transform from UI format to API format
      // Note: Sources are now stored in UI format with headers/selectedHeaders arrays
      // This transformation happens only during submission
      if (source?.sourceType === 'File') {
        console.log(`[transformInputSourcesToAPIFormat] Transforming File source: ${source?.sourceName}`);
        console.log(`[transformInputSourcesToAPIFormat] originalHeaders:`, (source as any)?.originalHeaders, 'headers:', source?.headers);

        const result: any = {
          ...transformFileSourceToAPI(source),
          stepOrder: 1, // Input module sources have stepOrder = 1
          internalStepOrder: originalIndex + 1 // 1-based index from original position
        };

        // Include ID if this is an existing source (for update payload)
        if ((source as any)?.hasExistingId && source?.id) {
          result.id = source?.id;
          console.log(`[transformInputSourcesToAPIFormat] Including existing ID: ${source?.id}`);
        }

        console.log(`[transformInputSourcesToAPIFormat] File source result columns:`, result?.columns);
        return result;
      }

      // Handle Database sources
      if (source?.sourceType === 'Database') {
        console.log(`[transformInputSourcesToAPIFormat] Transforming Database source: ${source?.sourceName}`);

        // CRITICAL: Use originalHeaders if available (excludes self-append generated columns)
        const headers = (source as any)?.originalHeaders || source?.headers || [];

        // CRITICAL: Use originalSelectedHeaders if available (excludes generated columns)
        const selectedHeaders = (source as any)?.originalSelectedHeaders || source?.selectedHeaders || headers;

        const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

        console.log(`[transformInputSourcesToAPIFormat] originalHeaders:`, (source as any)?.originalHeaders);
        console.log(`[transformInputSourcesToAPIFormat] originalSelectedHeaders:`, (source as any)?.originalSelectedHeaders);
        console.log(`[transformInputSourcesToAPIFormat] Using headers:`, headers, `(count: ${headers?.length})`);
        console.log(`[transformInputSourcesToAPIFormat] Using selectedHeaders:`, selectedHeaders, `(count: ${selectedHeaders?.length})`);

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
      console.log(`[getSourceColumns] Looking for sourceId: ${sourceId}`);
      const source = allAvailableInputSources?.find(s => s?.id === sourceId);
      if (!source) {
        console.log(`[getSourceColumns] Source not found for ID: ${sourceId}`);
        return [];
      }
      console.log(`[getSourceColumns] Found source: ${source?.sourceName}, isVersioned: ${source?.isVersioned}`);
      console.log(`[getSourceColumns] Source headers:`, source?.headers);
      console.log(`[getSourceColumns] Source selectedHeaders:`, source?.selectedHeaders);
      console.log(`[getSourceColumns] Source originalHeaders:`, (source as any)?.originalHeaders);
      console.log(`[getSourceColumns] Source originalSelectedHeaders:`, (source as any)?.originalSelectedHeaders);

      // CRITICAL: For payload, use originalSelectedHeaders if available (excludes self-append generated columns)
      if ((source as any)?.originalSelectedHeaders || (source as any)?.originalHeaders) {
        const columns = (source as any)?.originalSelectedHeaders || (source as any)?.originalHeaders || [];
        console.log(`[getSourceColumns] Using original columns (excludes generated):`, columns, `(count: ${columns?.length})`);
        return columns;
      }

      // Return selected headers if available, otherwise all headers
      const columns = source?.selectedHeaders || source?.headers || [];
      console.log(`[getSourceColumns] Returning columns:`, columns, `(count: ${columns?.length})`);
      return columns;
    };

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
          const source = allAvailableInputSources?.find(s => s.id === sourceId);
          const sourceName = source?.sourceName || sourceId;
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
          source_id: getSourceName(sourceId),
          columns: getSourceColumns(sourceId)
        })),
        // Match Keys go to match_keys only (addFields are the Match Keys selected by user)
        match_keys: config?.addFields || config?.matchOnFields || [],
        match_sources: (config?.matchSources || []).map((sourceId: string) => {
          const matchSourceName = getSourceName(sourceId);

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
        expand: config?.expand || false,
        match_type: config?.matchType || 'full',
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
          source_id: getSourceName(sourceId),
          columns: getSourceColumns(sourceId)
        })),
        suppress_on_fields: config?.suppressOnFields || [],
        suppress_sources: (config?.suppressSources || []).map((sourceId: string) =>
          getSourceName(sourceId)
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
        requestType: scheduleType === 'adhoc' ? 'A' : 'S', // A – Adhoc, S – Schedule Later
        sendNotificationOn: notificationWhen === 'standard' ? 'S' : 'E', // S – Standard, E – Error Only
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

            // Determine selected headers: use config selected fields if available, otherwise use source's selectedHeaders or all headers
            let selectedHeaders: string[];
            if (configSelectedFields?.length > 0) {
              // Filter to only include fields that exist in headers
              selectedHeaders = configSelectedFields?.filter(field => headers?.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return 'CSV';
              const extension = fileName?.split('.').pop()?.toUpperCase();
              return extension || 'CSV';
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

            const result: any = {
              sourceName: source.sourceName,
              sourceType: 'F',
              dataSourceId: source.fileSourceId || null,
              filePath: source.fileName || source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || ''),
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

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              
            }

            return result;
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available, otherwise use source's selectedHeaders or all headers
            let selectedHeaders: string[];
            if (configSelectedFields?.length > 0) {
              // Filter to only include fields that exist in headers
              selectedHeaders = configSelectedFields?.filter(field => headers?.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            

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
            

            // Get assignment_sets and tiering_on directly from selfConfig
            const assignmentSets = selfSource?.selfConfig?.assignment_sets || [];
            const tieringOn = selfSource?.selfConfig?.tiering_on ?? null;

            // Transform assignment_sets: rename filter_config to filterJson
            const transformedAssignmentSets = assignmentSets?.map((set: any) => {
              const transformed: any = {
                value_to_assign: set?.value_to_assign || '',
                filter_sql: set?.filter_sql || '',
              };

              // Rename filter_config to filterJson if it exists
              if (set?.filter_config) {
                transformed.filterJson = set.filter_config;
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

            // Determine selected headers: use config selected fields if available
            let selectedHeaders: string[];
            if (configSelectedFields?.length > 0) {
              selectedHeaders = configSelectedFields?.filter(field => headers?.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return 'CSV';
              const extension = fileName?.split('.').pop()?.toUpperCase();
              return extension || 'CSV';
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
              filePath: source.fileName || source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || ''),
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

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              
            }

            return result;
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available
            let selectedHeaders: string[];
            if (configSelectedFields?.length > 0) {
              selectedHeaders = configSelectedFields?.filter(field => headers?.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            

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

            // Determine selected headers: use config selected fields if available
            let selectedHeaders: string[];
            if (configSelectedFields?.length > 0) {
              selectedHeaders = configSelectedFields?.filter(field => headers?.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            

            const columnSelectionType = selectedHeaders?.length === headers?.length ? 'A' : 'S';

            // Get file format from extension
            const getFileFormat = (fileName: string) => {
              if (!fileName) return 'CSV';
              const extension = fileName?.split('.').pop()?.toUpperCase();
              return extension || 'CSV';
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
              filePath: source.fileName || source.filePath || '',
              delimiter: source.delimiter || ',',
              fileFormat: getFileFormat(source.fileName || ''),
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

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              
            }

            return result;
          }

          // Transform Database sources
          if (source?.sourceType === 'Database') {
            const headers = source?.headers || [];

            // Determine selected headers: use config selected fields if available
            let selectedHeaders: string[];
            if (configSelectedFields?.length > 0) {
              selectedHeaders = configSelectedFields?.filter(field => headers?.includes(field));
            } else if (source?.selectedHeaders && source?.selectedHeaders?.length > 0) {
              selectedHeaders = source.selectedHeaders;
            } else {
              selectedHeaders = headers;
            }

            

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
        return inputSources?.map((source, index) => {
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
            if ((source as any).hasExistingId && source.id) {
              workflowItem.id = source.id;
            }

            return workflowItem;
          }
        });
      };

      // Helper function to get fields for a specific source
      // IMPORTANT: Always prioritizes appendFields (explicitly selected by user) over field mappings
      // Field mappings are sent separately in the "field_mappings" array and should NOT affect the "fields" array
      const getFieldsForSource = (sourceId: string, fieldMappings?: any[], appendFields?: string[]): string[] => {
        const fieldsSet = new Set<string>();

        // IMPORTANT: Always prioritize appendFields (explicitly selected by user)
        // Field mappings are sent separately and should NOT interfere with this
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

          // Get headers from the appropriate source
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
            // Find the source to get its name
            const source = allAvailableInputSources?.find(s => s.id === sourceId);
            const sourceName = source?.sourceName || sourceId;
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
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            const source = allAvailableInputSources?.find(s => s.id === sourceId);
            // For versioned sources, use versionName/versionLabel instead of sourceName
            const displayName = source?.isVersioned
              ? ((source as any).versionName || (source as any).versionLabel || source.sourceName)
              : (source?.sourceName || sourceId);
            return {
              source_name: displayName,
              columns: source?.headers || []
            };
          });

          // Transform append sources to the required format
          const configModuleId = config?.createdByModuleId || 'panel2';
          const appendSourcesForConfig = (config?.appendSources || [])
            .map((sourceId) => {
              // Get fields specific to this source from module-level field mappings or appendFields
              const sourceFields = getFieldsForSource(sourceId, appendModuleFieldMappings?.[configModuleId] || [], config?.appendFields);

              // First check if it's a versioned source (from Input, Append, Match, or Suppress modules)
              const versionedSource = allAvailableInputSources?.find(s => s.id === sourceId && s.isVersioned);
              if (versionedSource) {
                // All versioned sources are treated as 'input' type
                // Use versionName/versionLabel for display name, not sourceName (which may be internal ID)
                const displayName = (versionedSource as any).versionName || (versionedSource as any).versionLabel || versionedSource.sourceName;
                return {
                  source_type: 'input',
                  source_name: displayName,
                  fields: sourceFields
                };
              }

              // Check if it's a non-versioned input source
              const inputSource = allAvailableInputSources?.find(s => s.id === sourceId);
              if (inputSource && !inputSource.isVersioned) {
                const createdByModuleId = (inputSource as any).createdByModuleId;
                const createdByModuleIdStr = String(createdByModuleId || '');
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
                  return {
                    source_type: 'input',
                    source_name: inputSource.sourceName,
                    fields: sourceFields
                  };
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
                return {
                  source_type: isSelfAppend ? 'self_append' : 'input',
                  source_name: customSource?.sourceName,
                  fields: sourceFields
                };
              }

              // Check if it's a preconfigured append source
              const sourceIdStr = String(sourceId || '');
              if (sourceIdStr?.startsWith('append_')) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.append?.find(
                  (table: any) => `append_${table?.tableId}` === sourceIdStr
                );
                const sourceName = predefined ? predefined.tableName : sourceIdStr;
                return {
                  source_type: 'preconfigured',
                  source_name: sourceName,
                  fields: sourceFields
                };
              }

              
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
          const updatedConfigJson = {
            ...configJson,
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
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            const source = allAvailableInputSources?.find(s => s.id === sourceId);
            // For versioned sources, use versionName/versionLabel instead of sourceName
            const displayName = source?.isVersioned
              ? ((source as any).versionName || (source as any).versionLabel || source.sourceName)
              : (source?.sourceName || sourceId);
            return {
              source_name: displayName,
              columns: source?.headers || []
            };
          });

          // Transform suppress sources to the required format
          const suppressSourcesForConfig = (config.suppressSources || [])
            .map((sourceId) => {
              // First check if it's a versioned source (from Input, Append, Match, or Suppress modules)
              const versionedSource = allAvailableInputSources?.find(s => s.id === sourceId && s.isVersioned);
              if (versionedSource) {
                // All versioned sources are treated as 'input' type
                // Use versionName/versionLabel for display name, not sourceName (which may be internal ID)
                const displayName = (versionedSource as any).versionName || (versionedSource as any).versionLabel || versionedSource.sourceName;
                return {
                  source_type: 'input',
                  source_name: displayName
                };
              }

              // Check if it's a non-versioned input source
              const inputSource = allAvailableInputSources?.find(s => s.id === sourceId);
              if (inputSource && !inputSource.isVersioned) {
                const createdByModuleId = (inputSource as any).createdByModuleId;
                const createdByModuleIdStr = String(createdByModuleId || '');
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
                  return {
                    source_type: 'input',
                    source_name: inputSource.sourceName
                  };
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
                return {
                  source_type: isSelfSuppress ? 'self_suppress' : 'input',
                  source_name: customSource?.sourceName
                };
              }

              const sourceIdStr = String(sourceId || '');
              if (sourceIdStr?.startsWith('suppress_')) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.suppress?.find(
                  (table: any) => `suppress_${table?.tableId}` === sourceIdStr
                );
                const sourceName = predefined ? predefined.tableName : sourceIdStr;
                return {
                  source_type: 'preconfigured',
                  source_name: sourceName
                };
              }

              
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
          const updatedConfigJson = {
            ...configJson,
            field_mappings: fieldMappingsForVersion,
            // Ensure suppress_on_fields is included from version's operationFields or existing configJson
            suppress_on_fields: configJson?.suppress_on_fields || (source as any)?.operationFields || []
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
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            const source = allAvailableInputSources?.find(s => s.id === sourceId);
            // For versioned sources, use versionName/versionLabel instead of sourceName
            const displayName = source?.isVersioned
              ? ((source as any).versionName || (source as any).versionLabel || source.sourceName)
              : (source?.sourceName || sourceId);
            return {
              source_name: displayName,
              columns: source?.headers || []
            };
          });

          // Transform match sources to the required format (no priority for Match module)
          const matchSourcesForConfig = (config?.matchSources || [])
            .map((sourceId) => {
              // First check if it's a versioned source (from Input, Append, Match, or Suppress modules)
              const versionedSource = allAvailableInputSources?.find(s => s?.id === sourceId && s?.isVersioned);
              if (versionedSource) {
                // All versioned sources are treated as 'input' type
                // Use versionName/versionLabel for display name, not sourceName (which may be internal ID)
                const displayName = (versionedSource as any)?.versionName || (versionedSource as any)?.versionLabel || versionedSource?.sourceName;
                return {
                  source_type: 'input',
                  source_name: displayName
                };
              }

              // Check if it's a non-versioned input source
              const inputSource = allAvailableInputSources?.find(s => s?.id === sourceId);
              if (inputSource && !inputSource?.isVersioned) {
                const createdByModuleId = (inputSource as any)?.createdByModuleId;
                const createdByModuleIdStr = String(createdByModuleId || '');
                if (!createdByModuleId || createdByModuleId === 'panel1' || createdByModuleIdStr?.startsWith('panel1_')) {
                  return {
                    source_type: 'input',
                    source_name: inputSource?.sourceName
                  };
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
                return {
                  source_type: isSelfMatch ? 'self_match' : 'input',
                  source_name: customSource?.sourceName
                };
              }

              const sourceIdStr = String(sourceId || '');
              if (sourceIdStr?.startsWith('match_')) {
                const predefined = apiSources?.dbSource?.preconfiguredTables?.match?.find(
                  (table: any) => `match_${table?.tableId}` === sourceIdStr
                );
                const sourceName = predefined ? predefined?.tableName : sourceIdStr;
                return {
                  source_type: 'preconfigured',
                  source_name: sourceName
                };
              }


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
            expand: config?.expand || false,
            match_type: config?.matchType || 'full',
            field_mappings: fieldMappingsForConfig
          };

          // Add Fields are separate - fields from MATCH sources to add to output
          // Only include if addFields is defined and has items
          if (config?.addFields && config?.addFields?.length > 0) {
            configJson.add_fields = config?.addFields;
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
          const updatedConfigJson: any = {
            ...configJson,
            field_mappings: fieldMappingsForVersion,
            // Ensure match_keys is present (fields from INPUT sources to match on)
            match_keys: configJson?.match_keys || (source as any)?.operationFields || []
          };

          // Include add_fields if present (fields from MATCH sources to add to output)
          if ((source as any)?.addFields && (source as any)?.addFields?.length > 0) {
            updatedConfigJson.add_fields = (source as any)?.addFields;
          } else if (configJson?.add_fields && configJson?.add_fields?.length > 0) {
            updatedConfigJson.add_fields = configJson?.add_fields;
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


          // Get assignment_sets and tiering_on directly from selfConfig
          const assignmentSets = selfSource?.selfConfig?.assignment_sets || [];
          const tieringOn = selfSource?.selfConfig?.tiering_on ?? null;

          // Transform assignment_sets: rename filter_config to filterJson
          const transformedAssignmentSets = assignmentSets?.map((set: any) => {
            const transformed: any = {
              value_to_assign: set?.value_to_assign || '',
              filter_sql: set?.filter_sql || ''
            };

            // Rename filter_config to filterJson if it exists
            if (set?.filter_config) {
              transformed.filterJson = set?.filter_config;
            }

            return transformed;
          });

          // Build configJson for self-append source
          const configJson = {
            input_source_names: selfSource?.selfConfig?.input_source_names || [],
            generated_column: selfSource?.selfConfig?.generated_column || '',
            generated_datatype: selfSource?.selfConfig?.generated_datatype || 'STRING',
            assignment_sets: transformedAssignmentSets,
            tiering_on: tieringOn
          };

          // Calculate stepOrder based on the source's createdByModuleId
          const sourceStepOrder = selfSource?.createdByModuleId ? getStepOrder(selfSource?.createdByModuleId) : getStepOrder('panel2');



          selfAppendItems?.push({
            stepOrder: sourceStepOrder,
            actionType: 'A', // SA = Self-Append,
            sourceType: 'Self',
            source_type: 'self', // Explicitly send source_type for backend
            sourceName: selfSource?.sourceName || 'Self_Append_Source',
            configJson: configJson,
            createdAt: (selfSource as any)?.createdAt || Date?.now(),
            itemType: 'self_append_source',
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
              sourceName: item?.sourceName,
              source_type: 'self', // Explicitly include source_type for backend
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

      const workflowArray = [
        ...inputSourcesAndVersions,  // All input sources and versions in creation order
        ...appendItems,              // Append configs and versions sorted by creation order
        ...selfAppendSources,        // Self-append sources (NEW)
        ...suppressItems,            // Suppress configs and versions sorted by creation order
        ...matchItems                // Match configs and versions sorted by creation order
      ];

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
      const selfAppendWorkflowItems = workflowArray?.filter(w => w?.actionType === 'A' && w.sourceType === 'Self');
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
        } else if (item?.actionType === 'A' && item?.sourceType === 'Self') {
          itemType = 'Self-Append Source';
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

      if (workflowArray?.length > 0) {
        
      } else {
        
      }

      if (transformedStats?.length > 0) {
        
      } else {
        
      }

      if (transformedOutput && transformedOutput?.length > 0) {
        
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
        
      }

      // Console log the complete payload before API call
      console.log('=== Request Payload ===');
      console.log('Mode:', requestId ? 'UPDATE (Edit Mode)' : 'CREATE (New Request)');
      console.log('Request ID:', requestId || 'N/A');
      console.log('Payload:', JSON.stringify(submitPayload, null, 2));
      console.log('=======================');

      // Call appropriate API based on mode
      let submitResponse: any;
      if (requestId) {
        // Edit mode: Call updateRequest
        submitResponse = await updateRequest(submitPayload);
      } else {
        // Create mode: Call submitRequest
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
    console.log('[INPUT-VERSION] getAvailableSourcesForModule called for module:', currentModuleId);
    console.log('[ORDER] ========== GET AVAILABLE SOURCES FOR MODULE ==========');
    console.log('[ORDER] Current Module ID:', currentModuleId);
    console.log('[ORDER] All modules:', modules?.map((m, idx) => `${idx}: ${m?.id} (${m?.label})`));

    // CRITICAL: Separate Input module sources/versions from other sources
    // Input module versions should be available to ALL downstream modules
    // Other module versions should be available to the module that created them AND modules that come after them

    const inputModuleSources: InputSource[] = [];
    const otherModuleVersions: InputSource[] = [];

    allAvailableInputSources?.forEach(source => {
      const createdByModuleId = (source as any)?.createdByModuleId;
      const createdByModuleIdStr = String(createdByModuleId || '');

      console.log('[ORDER] Processing source:', source?.sourceName);
      console.log('[ORDER]   - isVersioned:', source?.isVersioned);
      console.log('[ORDER]   - createdByModuleId:', createdByModuleId);
      console.log('[ORDER]   - headers:', source?.headers);
      console.log('[ORDER]   - selectedHeaders:', source?.selectedHeaders);
      console.log('[ORDER]   - Number of headers:', source?.headers?.length);
      console.log('[ORDER]   - Number of selectedHeaders:', source?.selectedHeaders?.length);

      console.log('[DRAG] Processing source:', source?.sourceName);
      console.log('[DRAG]   - isVersioned:', source?.isVersioned);
      console.log('[DRAG]   - sourceModule:', (source as any)?.sourceModule);
      console.log('[DRAG]   - createdByModuleId:', createdByModuleId);

      // Check if this is from Input module (panel1)
      const isFromInputModule = !createdByModuleId ||
                                createdByModuleId === 'panel1' ||
                                createdByModuleIdStr?.startsWith('panel1');

      if (isFromInputModule) {
        // Include ALL Input module sources and versions (no filtering)
        console.log('[INPUT-VERSION] Including Input module source/version:', source?.sourceName, 'isVersioned:', source?.isVersioned);
        console.log('[ORDER]   ✓ INCLUDED - Input module source/version (always available)');
        console.log('[DRAG]   ✓ INCLUDED - Input module source/version');
        inputModuleSources?.push(source);
      } else if (source?.isVersioned) {
        // This is a version from another module (Append/Match/Suppress)
        // Will apply upstream filtering logic below
        console.log('[INPUT-VERSION] Found other module version:', source?.sourceName, 'createdBy:', createdByModuleId);
        console.log('[ORDER]   → Will check if upstream (deferred)');
        console.log('[DRAG]   → Will check if upstream or same module');
        otherModuleVersions?.push(source);
      } else {
        console.log('[ORDER]   ✗ SKIPPED - Not from Input module and not a version');
        console.log('[DRAG]   ✗ SKIPPED - Not from Input module and not a version');
      }
    });

    console.log('[INPUT-VERSION] Input module sources (including versions):', inputModuleSources?.length);
    console.log('[INPUT-VERSION] Other module versions:', otherModuleVersions?.length);

    // Always include ALL input module sources and versions
    const availableSources: InputSource[] = [...inputModuleSources];

    // Find the current module's position in the workflow
    const currentModuleIndex = modules?.findIndex(m => m?.id === currentModuleId);

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

      console.log('[INPUT-VERSION] Version:', version?.versionName, 'creatorIndex:', creatorModuleIndex, 'currentIndex:', currentModuleIndex, 'isUpstreamOrSame:', isUpstreamOrSame);
      console.log('[ORDER] Checking version:', version?.versionName);
      console.log('[ORDER]   - Creator module:', creatorModuleId, 'at index:', creatorModuleIndex);
      console.log('[ORDER]   - Current module:', currentModuleId, 'at index:', currentModuleIndex);
      console.log('[ORDER]   - Is upstream or same?', creatorModuleIndex, '<=', currentModuleIndex, '=', isUpstreamOrSame);

      console.log('[DRAG] === VERSION FILTER CHECK ===');
      console.log('[DRAG] Version:', version?.versionName);
      console.log('[DRAG] Version ID:', version?.id);
      console.log('[DRAG] Creator module:', creatorModuleId, '| Creator index:', creatorModuleIndex);
      console.log('[DRAG] Current module:', currentModuleId, '| Current index:', currentModuleIndex);
      console.log('[DRAG] Comparison:', creatorModuleIndex, '<=', currentModuleIndex, '=', isUpstreamOrSame);

      if (isUpstreamOrSame) {
        if (creatorModuleIndex === currentModuleIndex) {
          console.log('[ORDER]   ✓ INCLUDED - Version from same module (own version)');
          console.log('[DRAG]   ✓✓✓ INCLUDED - Own version (same module)');
        } else {
          console.log('[ORDER]   ✓ INCLUDED - Version from upstream module');
          console.log('[DRAG]   ✓ INCLUDED - Upstream version');
        }
      } else {
        console.log('[ORDER]   ✗ EXCLUDED - Version from downstream module');
        console.log('[DRAG]   ✗✗✗ EXCLUDED - Downstream version');
      }

      return isUpstreamOrSame;
    }) || [];

    // Return combined sources: ALL input module sources/versions + filtered upstream versions from other modules
    const result = [...availableSources, ...upstreamVersions];

    console.log('[INPUT-VERSION] getAvailableSourcesForModule result for', currentModuleId, ':', result?.length, 'sources');
    console.log('[ORDER] ========== FINAL RESULT ==========');
    console.log('[ORDER] Available sources for module', currentModuleId, '(', result?.length, 'total):');
    result?.forEach(s => {
      console.log('[INPUT-VERSION] - Source:', s?.sourceName, 'isVersioned:', s?.isVersioned, 'Headers:', s?.headers?.length);
      console.log('[ORDER]   -', s?.sourceName, '| isVersioned:', s?.isVersioned, '| createdBy:', (s as any)?.createdByModuleId, '| headers:', s?.headers);
    });

    return result;
  }, [allAvailableInputSources, versionedSources, modules]);

  // Memoize available sources for each module to prevent infinite re-render loops
  // This ensures stable array references across renders when contents haven't changed
  // CRITICAL: This recalculates whenever modules, inputSources, or versionedSources change
  const memoizedModuleAvailableSources = useMemo(() => {
    console.log('[SELF] === memoizedModuleAvailableSources RECALCULATING ===');
    console.log('[SELF] Total modules:', modules?.length);
    console.log('[SELF] Total inputSources:', inputSources?.length);
    console.log('[SELF] Total versionedSources:', versionedSources?.length);

    console.log('[DRAG] ========== RECALCULATING AVAILABLE SOURCES ==========');
    console.log('[DRAG] Current module order:', modules?.map((m, idx) => `${idx}: ${m?.id} (${m?.label})`));
    console.log('[DRAG] Total versioned sources:', versionedSources?.length);
    versionedSources?.forEach(v => {
      console.log(`[DRAG]   Version: ${v?.sourceName}`);
      console.log(`[DRAG]     - ID: ${v?.id}`);
      console.log(`[DRAG]     - createdByModuleId: ${(v as any)?.createdByModuleId}`);
      console.log(`[DRAG]     - sourceModule: ${(v as any)?.sourceModule}`);
      console.log(`[DRAG]     - isVersioned: ${v?.isVersioned}`);
    });

    const sourcesMap: Record<string, InputSource[]> = {};

    modules?.forEach((module, index) => {
      if (module?.id) {
        console.log(`[DRAG] --- Processing module: ${module?.id} (${module?.label}) at index ${index} ---`);
        const availableSources = getAvailableSourcesForModule(module?.id);
        sourcesMap[module?.id] = availableSources;

        console.log(`[SELF] Module ${module?.id} (index ${index}): ${availableSources?.length} available sources`);
        console.log(`[DRAG] Module ${module?.id} has ${availableSources?.length} available sources`);
        availableSources?.forEach(s => {
          console.log(`[SELF]   - ${s?.sourceName}: ${s?.headers?.length} headers`, s?.headers);
          console.log(`[DRAG]     - ${s?.sourceName} | isVersioned: ${s?.isVersioned} | createdBy: ${(s as any)?.createdByModuleId}`);
        });
      }
    });

    console.log('[SELF] === memoizedModuleAvailableSources DONE ===');
    console.log('[DRAG] ========== RECALCULATION COMPLETE ==========');
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
    // Only allow deleting duplicated modules (those with underscore in ID)
    if (!moduleId?.includes('_')) {
      return;
    }

    // Remove the module from the modules array
    const newModules = modules?.filter(module => module?.id !== moduleId);
    setModules(newModules);

    // Remove from expanded state if it was expanded
    setExpanded(prev => prev?.filter(id => id !== moduleId));

    // Clean up module-specific field mappings to avoid memory leaks
    const moduleIdStr = String(moduleId || '');
    if (moduleIdStr?.startsWith('panel2_')) {
      setAppendModuleFieldMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings?.[moduleId];
        return newMappings;
      });
    } else if (moduleIdStr?.startsWith('panel3_')) {
      setSuppressModuleFieldMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings?.[moduleId];
        return newMappings;
      });
    } else if (moduleIdStr?.startsWith('panel4_')) {
      setMatchModuleFieldMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings?.[moduleId];
        return newMappings;
      });
    }
  };

  // Handle drag end for draggable modules (panels 2, 3, 4)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[DRAG] ========== DRAG OPERATION START ==========');
    console.log('[DRAG] Active module:', active?.id);
    console.log('[DRAG] Over module:', over?.id);

    if (over && active?.id !== over?.id) {
      setModules((items) => {
        const oldIndex = items?.findIndex((item) => item?.id === active?.id);
        const newIndex = items?.findIndex((item) => item?.id === over?.id);

        console.log('[DRAG] Old index:', oldIndex, '| Module:', items?.[oldIndex]?.label);
        console.log('[DRAG] New index:', newIndex, '| Module:', items?.[newIndex]?.label);
        console.log('[DRAG] Current module order:', items?.map((m, idx) => `${idx}: ${m?.id} (${m?.label})`));

        // Only allow dragging within the draggable modules
        const isDraggableModule = (moduleId: string) => {
          const moduleIdStr = String(moduleId || '');
          return moduleIdStr?.startsWith('panel2') || moduleIdStr?.startsWith('panel3') || moduleIdStr?.startsWith('panel4');
        };

        if (isDraggableModule(active?.id as string) && isDraggableModule(over?.id as string)) {
          console.log('[DRAG] Both modules are draggable - proceeding with validations');

          // Log all versioned sources BEFORE the move
          console.log('[DRAG] === VERSIONED SOURCES BEFORE MOVE ===');
          versionedSources?.forEach(v => {
            console.log(`[DRAG]   - ${v?.sourceName} | createdBy: ${(v as any)?.createdByModuleId} | sourceModule: ${(v as any)?.sourceModule}`);
          });

          // Validate the move before executing - check versioned sources
          const versionValidation = validateModuleMove(oldIndex, newIndex, modules, versionedSources);

          if (!versionValidation?.canMove) {
            console.log('[DRAG] ❌ VALIDATION FAILED - Version dependencies:', versionValidation?.error);
            // Show error message with better formatting
            const errorMessage = `🚫 Module Reordering Not Allowed\n\n${versionValidation?.error}\n\n💡 Tip: You can edit or delete the dependent versions first, then reorder the modules.`;
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
            console.log('[DRAG] ❌ VALIDATION FAILED - Custom source dependencies:', customSourceValidation?.error);
            // Show error message with better formatting
            const errorMessage = `🚫 Module Reordering Not Allowed\n\n${customSourceValidation?.error}\n\n💡 Tip: You can remove the custom source from the dependent module first, then reorder the modules.`;
            alert(errorMessage);
            return items; // Return unchanged items
          }

          console.log('[DRAG] ✓ All validations passed - executing reorder');
          const newItems = arrayMove(items, oldIndex, newIndex);
          console.log('[DRAG] NEW module order:', newItems?.map((m, idx) => `${idx}: ${m?.id} (${m?.label})`));
          console.log('[DRAG] ========== DRAG OPERATION COMPLETE ==========');
          return newItems;
        }
        console.log('[DRAG] Not draggable modules - no change');
        return items;
      });
    } else {
      console.log('[DRAG] No drag operation (same position or no target)');
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
        />
      );
    } else if (moduleId === 'panel2' || String(moduleId || '').startsWith('panel2_')) {
      // IMPORTANT: Filter configs by createdByModuleId, NOT by stepOrder
      // stepOrder changes after module reordering, but createdByModuleId is permanent
      const moduleInitialConfigs = initialAppendConfigs?.filter(c => c?.createdByModuleId === moduleId);
      const configsToPass = initialConfigsConsumedRef.current ? undefined : moduleInitialConfigs;

      console.log('[DELETE] Rendering AppendModule for', moduleId);
      console.log('[BACK] Filtering Append configs for module:', moduleId, '| Found:', moduleInitialConfigs?.length, 'configs');
      console.log('[DELETE] initialConfigsConsumedRef.current:', initialConfigsConsumedRef.current);
      console.log('[DELETE] moduleInitialConfigs count:', moduleInitialConfigs?.length);
      console.log('[DELETE] configsToPass:', configsToPass);

      // Filter available sources to only include upstream sources (versions from earlier modules)
      const moduleAvailableSources = memoizedModuleAvailableSources[moduleId] || [];

      console.log('[DRAG] === APPEND MODULE RENDERING ===');
      console.log('[DRAG] Module ID:', moduleId);
      console.log('[DRAG] All versioned sources:', versionedSources?.length);
      console.log('[DRAG] Append versions before filter:', versionedSources?.filter(v => v?.sourceModule === 'Append')?.length);

      // CRITICAL: Filter versions by createdByModuleId, NOT by stepOrder
      // stepOrder is stale after reordering - use createdByModuleId to match this module instance
      const filteredAppendVersions = versionedSources?.filter(v => {
        const match = v?.sourceModule === 'Append' && (v as any)?.createdByModuleId === moduleId;
        console.log(`[DRAG]   Version: ${v?.sourceName} | sourceModule: ${v?.sourceModule} | createdByModuleId: ${(v as any)?.createdByModuleId} | moduleId: ${moduleId} | match: ${match}`);
        return match;
      });

      console.log('[DRAG] Filtered Append versions for', moduleId, ':', filteredAppendVersions?.length);
      filteredAppendVersions?.forEach(v => {
        console.log(`[DRAG]   - ${v?.sourceName} | stepOrder: ${(v as any)?.stepOrder} | createdByModuleId: ${(v as any)?.createdByModuleId}`);
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

      console.log('[DRAG] === SUPPRESS MODULE RENDERING ===');
      console.log('[DRAG] Module ID:', moduleId);
      console.log('[BACK] Filtering Suppress configs for module:', moduleId, '| Found:', moduleInitialConfigs?.length, 'configs');
      console.log('[DRAG] All versioned sources:', versionedSources?.length);
      console.log('[DRAG] Suppress versions before filter:', versionedSources?.filter(v => v?.sourceModule === 'Suppress')?.length);

      // CRITICAL: Filter versions by createdByModuleId, NOT by stepOrder
      // stepOrder is stale after reordering - use createdByModuleId to match this module instance
      const filteredSuppressVersions = versionedSources?.filter(v => {
        const match = v?.sourceModule === 'Suppress' && (v as any)?.createdByModuleId === moduleId;
        console.log(`[DRAG]   Version: ${v?.sourceName} | sourceModule: ${v?.sourceModule} | createdByModuleId: ${(v as any)?.createdByModuleId} | moduleId: ${moduleId} | match: ${match}`);
        return match;
      });

      console.log('[DRAG] Filtered Suppress versions for', moduleId, ':', filteredSuppressVersions?.length);
      filteredSuppressVersions?.forEach(v => {
        console.log(`[DRAG]   - ${v?.sourceName} | stepOrder: ${(v as any)?.stepOrder} | createdByModuleId: ${(v as any)?.createdByModuleId}`);
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

      console.log('[DRAG] === MATCH MODULE RENDERING ===');
      console.log('[DRAG] Module ID:', moduleId);
      console.log('[BACK] Filtering Match configs for module:', moduleId, '| Found:', moduleInitialConfigs?.length, 'configs');
      console.log('[DRAG] All versioned sources:', versionedSources?.length);
      console.log('[DRAG] Match versions before filter:', versionedSources?.filter(v => v?.sourceModule === 'Match')?.length);

      // CRITICAL: Filter versions by createdByModuleId, NOT by stepOrder
      // stepOrder is stale after reordering - use createdByModuleId to match this module instance
      const filteredMatchVersions = versionedSources?.filter(v => {
        const match = v?.sourceModule === 'Match' && (v as any)?.createdByModuleId === moduleId;
        console.log(`[DRAG]   Version: ${v?.sourceName} | sourceModule: ${v?.sourceModule} | createdByModuleId: ${(v as any)?.createdByModuleId} | moduleId: ${moduleId} | match: ${match}`);
        return match;
      });

      console.log('[DRAG] Filtered Match versions for', moduleId, ':', filteredMatchVersions?.length);
      filteredMatchVersions?.forEach(v => {
        console.log(`[DRAG]   - ${v?.sourceName} | stepOrder: ${(v as any)?.stepOrder} | createdByModuleId: ${(v as any)?.createdByModuleId}`);
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
                    // Check if "select-all" was clicked
                    if (value?.includes('select-all')) {
                      // Toggle select all
                      if (selectedInputSources?.length === filteredStatsInputSources?.length) {
                        setSelectedInputSources([]);
                      } else {
                        setSelectedInputSources(filteredStatsInputSources?.map(s => s.sourceName));
                      }
                    } else {
                      // Filter out the special "select-all" value before setting state
                      const filteredValue = value?.filter((v: string) => v !== 'select-all');
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
        </>
      )}
    </Box>
  );
};

export default RequestCreationPage;
