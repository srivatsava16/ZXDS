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
import { checkRequestName, submitRequest, getEditRequest, type SubmitRequestPayload, type RequestInputsResponse } from '../../../services/api';

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

  // Current output configurations
  const [outputConfigurations, setOutputConfigurations] = useState<OutputConfig[]>([]);
  const [transformedOutputData, setTransformedOutputData] = useState<OutputAPIPayload | null>(null);

  // Current module configurations (for dependency tracking)
  const [appendConfigurations, setAppendConfigurations] = useState<AppendConfig[]>([]);
  const [suppressConfigurations, setSuppressConfigurations] = useState<SuppressConfig[]>([]);
  const [matchConfigurations, setMatchConfigurations] = useState<MatchConfig[]>([]);

  // Module-level field mappings for Append, Match and Suppress (shared across all configs/versions in that module)
  const [appendModuleFieldMappings, setAppendModuleFieldMappings] = useState<any[]>([]);
  const [matchModuleFieldMappings, setMatchModuleFieldMappings] = useState<any[]>([]);
  const [suppressModuleFieldMappings, setSuppressModuleFieldMappings] = useState<any[]>([]);

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
      console.log('[Transform] Preserved requestDetails ID:', apiData.requestDetails.id);
    }

    // Build a map of source name to ID for consistent lookups
    // This ensures that when configs reference source names, we can find the correct IDs
    const sourceNameToIdMap: Map<string, string> = new Map();

    // Transform input sources - separate by inputType
    if (apiData?.inputSources && Array.isArray(apiData.inputSources)) {
      const inputModuleSources: any[] = [];
      const customSources: any[] = [];

      apiData.inputSources.forEach((source: any, index: number) => {
        const selectedColumnsArray = source?.selectedColumns
          ? source.selectedColumns.split(',').map((col: string) => col.trim())
          : source?.columns || [];

        // Use existing ID from API if available (for edit mode), otherwise generate new one
        // This preserves IDs for update payload while generating IDs for new sources
        const sourceId = source?.id || `input_${Date.now()}_${index}`;
        const hasExistingId = !!source?.id;

        // Store the mapping from source name to ID
        if (source?.sourceName) {
          sourceNameToIdMap.set(source.sourceName, sourceId);
        }

        console.log('[Transform] Input Source:', {
          sourceName: source?.sourceName,
          assignedId: sourceId,
          hadExistingId: hasExistingId,
          inputType: source?.inputType
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

        const transformedSource = {
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

        // Separate sources based on inputType
        const inputType = source?.inputType || 'I';

        if (inputType === 'I') {
          // Input module sources
          inputModuleSources.push(transformedSource);
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

          customSources.push({
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
        console.log('[MapSourceId] Found in map:', { sourceName, mappedId });
        return mappedId;
      }

      // Check in transformed input sources
      if (transformedData?.inputSources && Array.isArray(transformedData.inputSources)) {
        const source = transformedData.inputSources.find((src: any) =>
          src?.sourceName === sourceName ||
          src?.table === sourceName ||
          src?.id === sourceName
        );
        if (source?.id) {
          console.log('[MapSourceId] Found in transformed input sources:', { sourceName, mappedId: source.id });
          return source.id;
        }
      }

      // Check in transformed custom sources
      if (transformedData?.customSources && Array.isArray(transformedData.customSources)) {
        const source = transformedData.customSources.find((src: any) =>
          src?.sourceName === sourceName ||
          src?.table === sourceName ||
          src?.id === sourceName
        );
        if (source?.id) {
          console.log('[MapSourceId] Found in transformed custom sources:', { sourceName, mappedId: source.id });
          return source.id;
        }
      }

      // Check in versioned sources that have been created
      if (transformedData?.inputVersions && Array.isArray(transformedData.inputVersions)) {
        const version = transformedData.inputVersions.find((v: any) =>
          v?.sourceName === sourceName ||
          v?.versionName === sourceName ||
          v?.versionLabel === sourceName
        );
        if (version?.id) {
          console.log('[MapSourceId] Found in input versions:', { sourceName, mappedId: version.id });
          return version.id;
        }
      }

      // If still not found, warn and return empty
      console.warn('[MapSourceId] Source not found:', sourceName);
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
      if (preconfiguredTables.length > 0) {
        const table = preconfiguredTables.find((t: any) => t?.tableName === sourceName);
        if (table?.tableId) {
          const id = `${sourceModule}_${table.tableId}`;
          console.log('[MapPreconfiguredSourceId] Found:', { sourceName, sourceModule, id, tableId: table.tableId });
          return id;
        }
      }

      // If not found, check if it might be a custom source in our sourceNameToIdMap
      if (sourceNameToIdMap.has(sourceName)) {
        const mappedId = sourceNameToIdMap.get(sourceName)!;
        console.log('[MapPreconfiguredSourceId] Found in sourceNameToIdMap:', { sourceName, sourceModule, mappedId });
        return mappedId;
      }

      // If still not found, warn and return empty
      console.warn('[MapPreconfiguredSourceId] Source not found:', {
        sourceName,
        sourceModule,
        availableTables: preconfiguredTables.map(t => ({ name: t?.tableName, id: t?.tableId }))
      });
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

      apiData.workflow.forEach((workflowItem: any, index: number) => {
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

          console.log('[Transform] Input Version:', {
            versionName,
            saveAsVersion,
            inputSourceNames,
            hasConfigJson: !!configJson,
            workflowItemId: workflowItemId,
            hasExistingId: hasExistingId
          });

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

          inputVersions.push(versionedSource);

          // Add to sourceNameToIdMap so this version can be referenced in later configs
          sourceNameToIdMap.set(versionName, versionId);
        } else if (actionType === 'A' && configJson) {
          // Check if this is an Append version or regular Append config
          if (saveAsVersion) {
            // Append Version
            const versionName = workflowItem?.versionName || `Append_Version_${index}`;

            console.log('[Transform] Append Version:', {
              versionName,
              saveAsVersion,
              hasConfigJson: !!configJson
            });

            // Extract input sources from configJson
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name || src) || [];
            const baseInputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean);

            // Extract append sources (operation sources)
            const appendSourceNames = configJson?.append_sources?.map((src: any) => src?.source_name) || [];
            const operationSources = appendSourceNames
              .map((name: string) => {
                // Check if it's a preconfigured source
                const src = configJson.append_sources.find((s: any) => s.source_name === name);
                if (src?.source_type === 'preconfigured') {
                  return mapPreconfiguredSourceNameToId(name, 'append');
                }
                return mapSourceNameToId(name);
              })
              .filter(Boolean);

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

            const versionedSource: any = {
              id: versionId,
              sourceName: versionName,
              sourceType: 'Version',
              subSourceType: 'Versioned',
              isVersioned: true,
              versionNumber: appendVersions.length + 1,
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
              configJson: configJson,
              createdByModuleId: 'panel2', // Append module ID for filtering
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            };

            console.log('[Transform] Append Version extracted data:', {
              versionName,
              baseInputSources,
              operationSources,
              operationFields,
              appendFields,
              hasExistingId: hasExistingId
            });

            appendVersions.push(versionedSource);

            // Add to sourceNameToIdMap so this version can be referenced in later configs
            sourceNameToIdMap.set(versionName, versionId);

            // Extract field mappings if not already extracted (from first version/config)
            if (appendFieldMappings.length === 0 && configJson?.field_mappings && configJson.field_mappings.length > 0) {
              appendFieldMappings = configJson.field_mappings;
              console.log('[Transform] Extracted Append module field mappings:', appendFieldMappings.length);
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

            console.log('[Transform] Append Config:', {
              inputSourceNames,
              inputSources,
              appendSources,
              fieldMappingsCount: configJson?.field_mappings?.length || 0,
              hasExistingId: hasExistingId
            });

            appendConfigs.push({
              id: configId,
              inputSources: inputSources, // Array of source IDs
              appendOnFields: configJson?.match_keys || [],
              appendSources: appendSources, // Array of source IDs (preconfigured or custom)
              appendFields: fieldsToAppend,
              fieldMappings: configJson?.field_mappings || [],
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            });

            // Extract field mappings if not already extracted (from first version/config)
            if (appendFieldMappings.length === 0 && configJson?.field_mappings && configJson.field_mappings.length > 0) {
              appendFieldMappings = configJson.field_mappings;
              console.log('[Transform] Extracted Append module field mappings from config:', appendFieldMappings.length);
            }
          }
        } else if (actionType === 'S' && configJson) {
          // Check if this is a Suppress version or regular Suppress config
          if (saveAsVersion) {
            // Suppress Version
            const versionName = workflowItem?.versionName || `Suppress_Version_${index}`;

            console.log('[Transform] Suppress Version:', {
              versionName,
              saveAsVersion,
              hasConfigJson: !!configJson
            });

            // Extract input sources from configJson
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name || src) || [];
            const baseInputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean);

            // Extract suppress sources (operation sources)
            const suppressSourceNames = configJson?.suppress_sources?.map((src: any) => src?.source_name) || [];
            const operationSources = suppressSourceNames
              .map((name: string) => {
                // Check if it's a preconfigured source
                const src = configJson.suppress_sources.find((s: any) => s.source_name === name);
                if (src?.source_type === 'preconfigured') {
                  return mapPreconfiguredSourceNameToId(name, 'suppress');
                }
                return mapSourceNameToId(name);
              })
              .filter(Boolean);

            // Extract operation fields (suppress_on_fields for Suppress)
            const operationFields = configJson?.suppress_on_fields || [];

            // Use existing workflow item ID if available (for edit mode), otherwise generate new one
            const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
            const versionId = workflowItemId || `suppress_version_${Date.now()}_${index}`;
            const hasExistingId = !!workflowItemId;

            const versionedSource: any = {
              id: versionId,
              sourceName: versionName,
              sourceType: 'Version',
              subSourceType: 'Versioned',
              isVersioned: true,
              versionNumber: suppressVersions.length + 1,
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
              configJson: configJson,
              createdByModuleId: 'panel3', // Suppress module ID for filtering
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            };

            console.log('[Transform] Suppress Version extracted data:', {
              versionName,
              baseInputSources,
              operationSources,
              operationFields,
              hasExistingId: hasExistingId
            });

            suppressVersions.push(versionedSource);

            // Add to sourceNameToIdMap so this version can be referenced in later configs
            sourceNameToIdMap.set(versionName, versionId);

            // Extract field mappings if not already extracted (from first version/config)
            if (suppressFieldMappings.length === 0 && configJson?.field_mappings && configJson.field_mappings.length > 0) {
              suppressFieldMappings = configJson.field_mappings;
              console.log('[Transform] Extracted Suppress module field mappings:', suppressFieldMappings.length);
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

            console.log('[Transform] Suppress Config:', {
              inputSourceNames,
              inputSources,
              suppressSources,
              suppressOnFields: configJson?.suppress_on_fields || [],
              hasExistingId: hasExistingId
            });

            suppressConfigs.push({
              id: configId,
              inputSources: inputSources, // Array of source IDs
              suppressOnFields: configJson?.suppress_on_fields || [],
              suppressSources: suppressSources, // Array of source IDs (preconfigured or custom)
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            });

            // Extract field mappings if not already extracted (from first version/config)
            if (suppressFieldMappings.length === 0 && configJson?.field_mappings && configJson.field_mappings.length > 0) {
              suppressFieldMappings = configJson.field_mappings;
              console.log('[Transform] Extracted Suppress module field mappings from config:', suppressFieldMappings.length);
            }
          }
        } else if (actionType === 'M' && configJson) {
          // Check if this is a Match version or regular Match config
          if (saveAsVersion) {
            // Match Version
            const versionName = workflowItem?.versionName || `Match_Version_${index}`;

            console.log('[Transform] Match Version:', {
              versionName,
              saveAsVersion,
              hasConfigJson: !!configJson
            });

            // Extract input sources from configJson
            const inputSourceNames = configJson?.input_sources?.map((src: any) => src?.source_name || src) || [];
            const baseInputSources = inputSourceNames
              .map((name: string) => mapSourceNameToId(name))
              .filter(Boolean);

            // Extract match sources (operation sources)
            const matchSourceNames = configJson?.match_sources?.map((src: any) => src?.source_name) || [];
            const operationSources = matchSourceNames
              .map((name: string) => {
                // Check if it's a preconfigured source
                const src = configJson.match_sources.find((s: any) => s.source_name === name);
                if (src?.source_type === 'preconfigured') {
                  return mapPreconfiguredSourceNameToId(name, 'match');
                }
                return mapSourceNameToId(name);
              })
              .filter(Boolean);

            // Extract operation fields (match_on_fields for Match)
            const operationFields = configJson?.match_on_fields || [];

            // Extract add fields (fields being added from match sources)
            const addFields = configJson?.match_sources?.flatMap((src: any) => src?.fields || []) || [];

            // Get combined headers
            const combinedHeaders = addFields;

            // Use existing workflow item ID if available (for edit mode), otherwise generate new one
            const workflowItemId = workflowItem?.id || workflowItem?.workflowId;
            const versionId = workflowItemId || `match_version_${Date.now()}_${index}`;
            const hasExistingId = !!workflowItemId;

            const versionedSource: any = {
              id: versionId,
              sourceName: versionName,
              sourceType: 'Version',
              subSourceType: 'Versioned',
              isVersioned: true,
              versionNumber: matchVersions.length + 1,
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
              configJson: configJson,
              createdByModuleId: 'panel4', // Match module ID for filtering
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            };

            console.log('[Transform] Match Version extracted data:', {
              versionName,
              baseInputSources,
              operationSources,
              operationFields,
              addFields,
              hasExistingId: hasExistingId
            });

            matchVersions.push(versionedSource);

            // Add to sourceNameToIdMap so this version can be referenced in later configs
            sourceNameToIdMap.set(versionName, versionId);

            // Extract field mappings if not already extracted (from first version/config)
            if (matchFieldMappings.length === 0 && configJson?.field_mappings && configJson.field_mappings.length > 0) {
              matchFieldMappings = configJson.field_mappings;
              console.log('[Transform] Extracted Match module field mappings:', matchFieldMappings.length);
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

            console.log('[Transform] Match Config:', {
              inputSourceNames,
              inputSources,
              matchSources,
              matchOnFields: configJson?.match_on_fields || [],
              expand: configJson?.expand,
              matchType: configJson?.match_type,
              hasExistingId: hasExistingId
            });

            matchConfigs.push({
              id: configId,
              inputSources: inputSources, // Array of source IDs
              matchOnFields: configJson?.match_on_fields || [],
              matchSources: matchSources, // Array of source IDs (preconfigured or custom)
              expand: configJson?.expand !== undefined ? configJson.expand : false,
              matchType: configJson?.match_type || 'full',
              // Flag to indicate if this has an existing ID from API (for update payload)
              hasExistingId: hasExistingId,
              workflowItemId: workflowItemId // Store original workflow item ID if exists
            });

            // Extract field mappings if not already extracted (from first version/config)
            if (matchFieldMappings.length === 0 && configJson?.field_mappings && configJson.field_mappings.length > 0) {
              matchFieldMappings = configJson.field_mappings;
              console.log('[Transform] Extracted Match module field mappings from config:', matchFieldMappings.length);
            }
          }
        }
      });

      if (inputVersions.length > 0) {
        transformedData.inputVersions = inputVersions;
      }
      if (appendConfigs.length > 0) {
        transformedData.appendConfigs = appendConfigs;
      }
      if (appendVersions.length > 0) {
        transformedData.appendVersions = appendVersions;
      }
      if (suppressConfigs.length > 0) {
        transformedData.suppressConfigs = suppressConfigs;
      }
      if (suppressVersions.length > 0) {
        transformedData.suppressVersions = suppressVersions;
      }
      if (matchConfigs.length > 0) {
        transformedData.matchConfigs = matchConfigs;
      }
      if (matchVersions.length > 0) {
        transformedData.matchVersions = matchVersions;
      }

      // Transform module-level field mappings from API format to UI format
      const transformFieldMappingsForUI = (apiFieldMappings: any[]): any[] => {
        if (!apiFieldMappings || apiFieldMappings.length === 0) return [];

        return apiFieldMappings.map((mapping: any, index: number) => {
          const fieldName = mapping?.field_name || '';
          const sourceMappings = mapping?.source_mappings || '';

          // Parse source_mappings: "Source1.Field1|Source2.Field2|Source3.Field3"
          const mappingParts = sourceMappings.split('|').filter(Boolean);

          // Extract source names and fields, then map to IDs
          const selectedSources: string[] = [];
          const selectedColumns: string[] = [];

          mappingParts.forEach((part: string) => {
            // Format: "SourceName.FieldName"
            const [sourceName, fieldName] = part.split('.');
            if (!sourceName || !fieldName) return;

            // Map source name to ID using sourceNameToIdMap
            const sourceId = sourceNameToIdMap.get(sourceName.trim()) || mapSourceNameToId(sourceName.trim());
            if (!sourceId) {
              console.warn('[TransformFieldMappings] Could not find source ID for:', sourceName);
              return;
            }

            // Add to selectedSources (avoid duplicates)
            if (!selectedSources.includes(sourceId)) {
              selectedSources.push(sourceId);
            }

            // Add to selectedColumns in format "sourceId::fieldName"
            const columnValue = `${sourceId}::${fieldName.trim()}`;
            if (!selectedColumns.includes(columnValue)) {
              selectedColumns.push(columnValue);
            }
          });

          return {
            id: `mapping_${Date.now()}_${index}`,
            fieldName: fieldName,
            selectedSources: selectedSources,
            selectedColumns: selectedColumns
          };
        }).filter(mapping => mapping.selectedSources.length > 0); // Filter out mappings with no valid sources
      };

      // Store module-level field mappings (transformed to UI format)
      if (appendFieldMappings.length > 0) {
        transformedData.appendModuleFieldMappings = transformFieldMappingsForUI(appendFieldMappings);
        console.log('[Transform] Transformed Append field mappings:', transformedData.appendModuleFieldMappings.length);
      }
      if (matchFieldMappings.length > 0) {
        transformedData.matchModuleFieldMappings = transformFieldMappingsForUI(matchFieldMappings);
        console.log('[Transform] Transformed Match field mappings:', transformedData.matchModuleFieldMappings.length);
      }
      if (suppressFieldMappings.length > 0) {
        transformedData.suppressModuleFieldMappings = transformFieldMappingsForUI(suppressFieldMappings);
        console.log('[Transform] Transformed Suppress field mappings:', transformedData.suppressModuleFieldMappings.length);
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
    console.log('\n=== TRANSFORMATION SUMMARY ===');
    console.log('Request Name:', transformedData.requestName || 'N/A');
    console.log('\nInput Sources:', transformedData.inputSources?.length || 0);
    if (transformedData.inputSources?.length > 0) {
      transformedData.inputSources.forEach((src: any, i: number) => {
        console.log(`  ${i + 1}. ${src.sourceName} (ID: ${src.id})`);
      });
    }
    console.log('\nCustom Sources:', transformedData.customSources?.length || 0);
    if (transformedData.customSources?.length > 0) {
      const appendCustomSources = transformedData.customSources.filter((s: any) => s.createdByModuleId === 'panel2');
      const matchCustomSources = transformedData.customSources.filter((s: any) => s.createdByModuleId === 'panel4');
      const suppressCustomSources = transformedData.customSources.filter((s: any) => s.createdByModuleId === 'panel3');

      console.log(`  Append Custom Sources (panel2): ${appendCustomSources.length}`);
      appendCustomSources.forEach((src: any, i: number) => {
        console.log(`    ${i + 1}. ${src.sourceName} (ID: ${src.id}, Type: ${src.sourceType})`);
      });

      console.log(`  Match Custom Sources (panel4): ${matchCustomSources.length}`);
      matchCustomSources.forEach((src: any, i: number) => {
        console.log(`    ${i + 1}. ${src.sourceName} (ID: ${src.id}, Type: ${src.sourceType})`);
      });

      console.log(`  Suppress Custom Sources (panel3): ${suppressCustomSources.length}`);
      suppressCustomSources.forEach((src: any, i: number) => {
        console.log(`    ${i + 1}. ${src.sourceName} (ID: ${src.id}, Type: ${src.sourceType})`);
      });
    }
    console.log('\nInput Versions:', transformedData.inputVersions?.length || 0);
    if (transformedData.inputVersions?.length > 0) {
      transformedData.inputVersions.forEach((v: any, i: number) => {
        console.log(`  ${i + 1}. ${v.versionLabel} (ID: ${v.id})`);
      });
    }
    console.log('\nAppend Configs:', transformedData.appendConfigs?.length || 0);
    if (transformedData.appendConfigs?.length > 0) {
      transformedData.appendConfigs.forEach((cfg: any, i: number) => {
        console.log(`  ${i + 1}. Input Sources: ${cfg.inputSources?.length || 0}, Append Sources: ${cfg.appendSources?.length || 0}, Match Keys: ${cfg.appendOnFields?.length || 0}, Field Mappings: ${cfg.fieldMappings?.length || 0}`);
      });
    }
    console.log('\nAppend Versions:', transformedData.appendVersions?.length || 0);
    if (transformedData.appendVersions?.length > 0) {
      transformedData.appendVersions.forEach((v: any, i: number) => {
        console.log(`  ${i + 1}. ${v.versionLabel} (ID: ${v.id})`);
      });
    }
    console.log('\nSuppress Configs:', transformedData.suppressConfigs?.length || 0);
    if (transformedData.suppressConfigs?.length > 0) {
      transformedData.suppressConfigs.forEach((cfg: any, i: number) => {
        console.log(`  ${i + 1}. Input Sources: ${cfg.inputSources?.length || 0}, Suppress Sources: ${cfg.suppressSources?.length || 0}, Suppress On Fields: ${cfg.suppressOnFields?.length || 0}`);
      });
    }
    console.log('\nSuppress Versions:', transformedData.suppressVersions?.length || 0);
    if (transformedData.suppressVersions?.length > 0) {
      transformedData.suppressVersions.forEach((v: any, i: number) => {
        console.log(`  ${i + 1}. ${v.versionLabel} (ID: ${v.id})`);
      });
    }
    console.log('\nMatch Configs:', transformedData.matchConfigs?.length || 0);
    if (transformedData.matchConfigs?.length > 0) {
      transformedData.matchConfigs.forEach((cfg: any, i: number) => {
        console.log(`  ${i + 1}. Input Sources: ${cfg.inputSources?.length || 0}, Match Sources: ${cfg.matchSources?.length || 0}, Match On Fields: ${cfg.matchOnFields?.length || 0}`);
      });
    }
    console.log('\nMatch Versions:', transformedData.matchVersions?.length || 0);
    if (transformedData.matchVersions?.length > 0) {
      transformedData.matchVersions.forEach((v: any, i: number) => {
        console.log(`  ${i + 1}. ${v.versionLabel} (ID: ${v.id})`);
      });
    }
    console.log('\nStats Configs:', transformedData.statsConfigs?.length || 0);
    console.log('Output Configs:', transformedData.outputConfigs?.length || 0);
    console.log('Schedule Config:', transformedData.scheduleConfig ? 'Yes' : 'No');
    console.log('\nModule-Level Field Mappings:');
    console.log('  Append:', transformedData.appendModuleFieldMappings?.length || 0);
    console.log('  Match:', transformedData.matchModuleFieldMappings?.length || 0);
    console.log('  Suppress:', transformedData.suppressModuleFieldMappings?.length || 0);

    // Detect how many duplicate modules were created based on stepOrder
    // Group workflow items by actionType and count unique stepOrders
    if (apiData?.workflow && Array.isArray(apiData.workflow)) {
      const appendStepOrders = new Set<number>();
      const matchStepOrders = new Set<number>();
      const suppressStepOrders = new Set<number>();

      apiData.workflow.forEach((item: any) => {
        const actionType = item?.actionType;
        const stepOrder = item?.stepOrder;

        if (actionType === 'A' && stepOrder) {
          appendStepOrders.add(stepOrder);
        } else if (actionType === 'M' && stepOrder) {
          matchStepOrders.add(stepOrder);
        } else if (actionType === 'S' && stepOrder) {
          suppressStepOrders.add(stepOrder);
        }
      });

      transformedData.moduleDuplicationInfo = {
        appendModuleCount: appendStepOrders.size || 0,
        matchModuleCount: matchStepOrders.size || 0,
        suppressModuleCount: suppressStepOrders.size || 0
      };

      console.log('\nModule Duplication Info:');
      console.log('  Append Modules:', appendStepOrders.size);
      console.log('  Match Modules:', matchStepOrders.size);
      console.log('  Suppress Modules:', suppressStepOrders.size);
    }

    console.log('================================\n');

    return transformedData;
  };

  // Load request data when in edit mode or duplicate mode
  useEffect(() => {
    const loadEditRequest = async () => {
      const idToLoad = requestId || duplicateId;
      if (!idToLoad) return;

      // Wait for apiSources to load before transforming edit request data
      // This ensures preconfigured table IDs can be properly resolved
      if (sourcesLoading) {
        console.log('[Edit/Duplicate Mode] Waiting for apiSources to load...');
        return;
      }

      const isDuplicateMode = !!duplicateId && !requestId;

      // Edit/Duplicate mode: Fetch request data from API
      try {
        setEditRequestLoading(true);
        setEditRequestError('');

        console.log(`[Edit/Duplicate Mode] Fetching request data from API for ID: ${idToLoad}`);
        const response = await getEditRequest(parseInt(idToLoad, 10));
        console.log('[Edit/Duplicate Mode] API Response received:', response);

        let dataToLoad: any = null;

        // Check if response has the expected structure (direct data format)
        if (response && (response as any).requestDetails && (response as any).inputSources) {
          // Response is in direct format - transform it
          console.log('[Edit/Duplicate Mode] Transforming API response (direct format)');
          dataToLoad = transformApiDataToInternalFormat(response, apiSources);
          console.log('[Edit/Duplicate Mode] Transformed data:', dataToLoad);
        } else if (response && (response as any).success && (response as any).data) {
          // Handle wrapped format if API sometimes returns it
          console.log('[Edit/Duplicate Mode] Transforming API response (wrapped format)');
          dataToLoad = transformApiDataToInternalFormat((response as any).data, apiSources);
          console.log('[Edit/Duplicate Mode] Transformed data:', dataToLoad);
        } else {
          // API failed or returned no data - show error
          console.error('API failed to load request data:', (response as any)?.message || response);
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
            console.log('[Edit Mode] Loaded requestDetailsId:', dataToLoad.requestDetailsId);
          }

          // Load input sources (combine regular sources and Input module versions)
          // Input versions should be added to inputSources array, not versionedSources
          const allInputSources = [
            ...(dataToLoad?.inputSources || []),
            ...(dataToLoad?.inputVersions || [])
          ];
          if (allInputSources.length > 0) {
            console.log('[Edit Mode] Loading input sources:', {
              regularSources: dataToLoad?.inputSources?.length || 0,
              inputVersions: dataToLoad?.inputVersions?.length || 0,
              total: allInputSources.length
            });
            setInputSources(allInputSources);
          }

          // Load custom sources (from Append, Match, Suppress modules)
          if (dataToLoad?.customSources && Array.isArray(dataToLoad.customSources)) {
            setSharedCustomSources(dataToLoad.customSources);
          }

          // Load versioned sources (versions from Append, Match, Suppress modules)
          // These are separate from Input module versions
          const allVersionedSources = [
            ...(dataToLoad?.appendVersions || []),
            ...(dataToLoad?.matchVersions || []),
            ...(dataToLoad?.suppressVersions || [])
          ];
          if (allVersionedSources.length > 0) {
            console.log('[Edit Mode] Loading versioned sources:', {
              appendVersions: dataToLoad?.appendVersions?.length || 0,
              matchVersions: dataToLoad?.matchVersions?.length || 0,
              suppressVersions: dataToLoad?.suppressVersions?.length || 0,
              total: allVersionedSources.length
            });
            setVersionedSources(allVersionedSources);
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

          // Load module-level field mappings
          if (dataToLoad?.appendModuleFieldMappings && Array.isArray(dataToLoad.appendModuleFieldMappings)) {
            console.log('[Edit Mode] Loading Append module field mappings:', dataToLoad.appendModuleFieldMappings.length);
            setAppendModuleFieldMappings(dataToLoad.appendModuleFieldMappings);
          }
          if (dataToLoad?.matchModuleFieldMappings && Array.isArray(dataToLoad.matchModuleFieldMappings)) {
            console.log('[Edit Mode] Loading Match module field mappings:', dataToLoad.matchModuleFieldMappings.length);
            setMatchModuleFieldMappings(dataToLoad.matchModuleFieldMappings);
          }
          if (dataToLoad?.suppressModuleFieldMappings && Array.isArray(dataToLoad.suppressModuleFieldMappings)) {
            console.log('[Edit Mode] Loading Suppress module field mappings:', dataToLoad.suppressModuleFieldMappings.length);
            setSuppressModuleFieldMappings(dataToLoad.suppressModuleFieldMappings);
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

          // Restore duplicate modules based on moduleDuplicationInfo
          if (dataToLoad?.moduleDuplicationInfo) {
            const duplicationInfo = dataToLoad.moduleDuplicationInfo;
            console.log('[Edit Mode] Restoring duplicate modules:', duplicationInfo);

            // Get the base module definitions
            const baseModules = createModuleDefinitions();
            const restoredModules = [...baseModules];

            // Create duplicate Append modules
            if (duplicationInfo.appendModuleCount > 1) {
              const appendModule = baseModules.find(m => m.id === 'panel2');
              if (appendModule) {
                for (let i = 2; i <= duplicationInfo.appendModuleCount; i++) {
                  restoredModules.splice(restoredModules.findIndex(m => m.id === 'panel2') + (i - 1), 0, {
                    ...appendModule,
                    id: `panel2_${i}`,
                    title: `Append Module ${i}`,
                  });
                }
                setModuleCounter(prev => ({ ...prev, Append: duplicationInfo.appendModuleCount }));
              }
            }

            // Create duplicate Suppress modules
            if (duplicationInfo.suppressModuleCount > 1) {
              const suppressModule = baseModules.find(m => m.id === 'panel3');
              if (suppressModule) {
                for (let i = 2; i <= duplicationInfo.suppressModuleCount; i++) {
                  restoredModules.splice(restoredModules.findIndex(m => m.id === 'panel3') + (i - 1), 0, {
                    ...suppressModule,
                    id: `panel3_${i}`,
                    title: `Suppression Module ${i}`,
                  });
                }
                setModuleCounter(prev => ({ ...prev, Suppression: duplicationInfo.suppressModuleCount }));
              }
            }

            // Create duplicate Match modules
            if (duplicationInfo.matchModuleCount > 1) {
              const matchModule = baseModules.find(m => m.id === 'panel4');
              if (matchModule) {
                for (let i = 2; i <= duplicationInfo.matchModuleCount; i++) {
                  restoredModules.splice(restoredModules.findIndex(m => m.id === 'panel4') + (i - 1), 0, {
                    ...matchModule,
                    id: `panel4_${i}`,
                    title: `Match Module ${i}`,
                  });
                }
                setModuleCounter(prev => ({ ...prev, Match: duplicationInfo.matchModuleCount }));
              }
            }

            if (restoredModules.length > baseModules.length) {
              console.log('[Edit Mode] Restored modules:', restoredModules.length, 'total');
              setModules(restoredModules);
            }
          }

          // Clear validation errors
          setRequestNameError('');
          setRecipientEmailError('');
          setScheduledDateTimeError('');
        }

      } catch (error: any) {
        console.error('Error loading edit request:', error);

        // Show error message
        let errorMessage = 'Failed to load request data. ';
        if (error?.message) {
          errorMessage += error.message;
        } else if (error?.response?.data?.message) {
          errorMessage += error.response.data.message;
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

  const handleUpdateVersion = (versionId: string, updatedVersion: any) => {
    console.log('[handleUpdateVersion] Updating version:', { versionId, updatedVersion });

    // Update versioned sources with the new configuration
    setVersionedSources(prev => prev.map(version =>
      version?.id === versionId ? {
        ...version,
        ...updatedVersion,
        // Ensure critical properties are preserved
        id: versionId,
        isVersioned: true as const,
        // Update configJson with the latest values
        configJson: {
          ...(version as any).configJson,
          ...updatedVersion.configJson,
          // For Append module - only update match_keys at root level
          match_keys: updatedVersion.operationFields || updatedVersion.configJson?.match_keys || [],
          // Update fields within each append_sources item (for Append module)
          append_sources: (version as any).configJson?.append_sources?.map((appendSource: any) => ({
            ...appendSource,
            // Set fields from the appendFields array (all sources get the same fields)
            fields: updatedVersion.appendFields || updatedVersion.configJson?.append_fields || []
          })) || [],
          // Update fields within each match_sources item (for Match module)
          match_sources: (version as any).configJson?.match_sources?.map((matchSource: any) => ({
            ...matchSource,
            // Set fields from the addFields array (all sources get the same fields)
            fields: updatedVersion.addFields || updatedVersion.configJson?.add_fields || []
          })) || []
        }
      } : version
    ));

    // Also update input sources if the version exists there
    setInputSources(prev => prev.map(source =>
      source?.id === versionId ? {
        ...source,
        ...updatedVersion,
        id: versionId
      } : source
    ));

    console.log('[handleUpdateVersion] Version updated successfully');
  };

  const handleDeleteVersion = (versionId: string) => {
    console.log('[handleDeleteVersion] Deleting version:', versionId);

    // Remove from versioned sources
    setVersionedSources(prev => prev.filter(version => version?.id !== versionId));

    // Also remove from input sources if it exists there
    setInputSources(prev => prev.filter(source => source?.id !== versionId));

    console.log('[handleDeleteVersion] Version deleted successfully');
  };

  // Handlers for shared custom sources - with module tracking
  const handleAddSharedCustomSource = (source: InputSource, createdByModuleId: string) => {
    const newSource = {
      ...source,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdByModuleId // Track which module created this source
    };
    setSharedCustomSources(prev => [...prev, newSource]);

    // If this is a Self source with a generated column, add the generated column to the input sources
    if (source.sourceType === 'Self' && source.selfConfig) {
      const { input_source_names, generated_column } = source.selfConfig;

      if (generated_column && input_source_names && input_source_names.length > 0) {
        // Update input sources to add the generated column to their headers
        setInputSources(prev => prev.map(inputSource => {
          // Check if this input source is one of the sources used in the Self source
          if (input_source_names.includes(inputSource.sourceName)) {
            // Add the generated column to headers if not already present
            const currentHeaders = inputSource.headers || [];
            if (!currentHeaders.includes(generated_column)) {
              const updatedHeaders = [...currentHeaders, generated_column];

              // Also update selectedHeaders if it exists
              const currentSelectedHeaders = inputSource.selectedHeaders || currentHeaders;
              const updatedSelectedHeaders = currentSelectedHeaders.includes(generated_column)
                ? currentSelectedHeaders
                : [...currentSelectedHeaders, generated_column];

              return {
                ...inputSource,
                headers: updatedHeaders,
                selectedHeaders: updatedSelectedHeaders,
              };
            }
          }
          return inputSource;
        }));

        // Also update versioned sources if any of them match the input source names
        setVersionedSources(prev => prev.map(versionedSource => {
          if (input_source_names.includes(versionedSource.sourceName)) {
            const currentHeaders = versionedSource.headers || [];
            if (!currentHeaders.includes(generated_column)) {
              const updatedHeaders = [...currentHeaders, generated_column];

              return {
                ...versionedSource,
                headers: updatedHeaders,
                combinedHeaders: updatedHeaders, // Also update combinedHeaders if present
              };
            }
          }
          return versionedSource;
        }));
      }
    }
  };

  const handleEditSharedCustomSource = (source: InputSource) => {
    // Find the original source to compare
    const originalSource = sharedCustomSources.find(s => s.id === source.id);

    setSharedCustomSources(prev =>
      prev.map(s => s.id === source.id ? { ...source, createdByModuleId: s.createdByModuleId } : s)
    );

    // If this is a Self source with a generated column, handle the update
    if (source.sourceType === 'Self' && source.selfConfig) {
      const newGeneratedColumn = source.selfConfig.generated_column;
      const newInputSourceNames = source.selfConfig.input_source_names || [];

      // Get the old configuration
      const oldGeneratedColumn = originalSource?.selfConfig?.generated_column;
      const oldInputSourceNames = originalSource?.selfConfig?.input_source_names || [];

      // Remove old generated column from old input sources (if changed)
      if (oldGeneratedColumn && oldGeneratedColumn !== newGeneratedColumn) {
        setInputSources(prev => prev.map(inputSource => {
          if (oldInputSourceNames.includes(inputSource.sourceName)) {
            const updatedHeaders = (inputSource.headers || []).filter(h => h !== oldGeneratedColumn);
            const updatedSelectedHeaders = (inputSource.selectedHeaders || inputSource.headers || []).filter(h => h !== oldGeneratedColumn);

            return {
              ...inputSource,
              headers: updatedHeaders,
              selectedHeaders: updatedSelectedHeaders,
            };
          }
          return inputSource;
        }));

        setVersionedSources(prev => prev.map(versionedSource => {
          if (oldInputSourceNames.includes(versionedSource.sourceName)) {
            const updatedHeaders = (versionedSource.headers || []).filter(h => h !== oldGeneratedColumn);

            return {
              ...versionedSource,
              headers: updatedHeaders,
              combinedHeaders: updatedHeaders,
            };
          }
          return versionedSource;
        }));
      }

      // Add new generated column to new input sources
      if (newGeneratedColumn && newInputSourceNames.length > 0) {
        setInputSources(prev => prev.map(inputSource => {
          if (newInputSourceNames.includes(inputSource.sourceName)) {
            const currentHeaders = inputSource.headers || [];
            if (!currentHeaders.includes(newGeneratedColumn)) {
              const updatedHeaders = [...currentHeaders, newGeneratedColumn];
              const currentSelectedHeaders = inputSource.selectedHeaders || currentHeaders;
              const updatedSelectedHeaders = currentSelectedHeaders.includes(newGeneratedColumn)
                ? currentSelectedHeaders
                : [...currentSelectedHeaders, newGeneratedColumn];

              return {
                ...inputSource,
                headers: updatedHeaders,
                selectedHeaders: updatedSelectedHeaders,
              };
            }
          }
          return inputSource;
        }));

        setVersionedSources(prev => prev.map(versionedSource => {
          if (newInputSourceNames.includes(versionedSource.sourceName)) {
            const currentHeaders = versionedSource.headers || [];
            if (!currentHeaders.includes(newGeneratedColumn)) {
              const updatedHeaders = [...currentHeaders, newGeneratedColumn];

              return {
                ...versionedSource,
                headers: updatedHeaders,
                combinedHeaders: updatedHeaders,
              };
            }
          }
          return versionedSource;
        }));
      }
    }
  };

  const handleDeleteSharedCustomSource = (id: string) => {
    if (window.confirm('Are you sure you want to delete this custom source?')) {
      // Find the source to be deleted
      const sourceToDelete = sharedCustomSources.find(s => s.id === id);

      // Remove from shared custom sources
      setSharedCustomSources(prev => prev.filter(s => s.id !== id));

      // If it's a Self source with a generated column, remove the generated column from input sources
      if (sourceToDelete?.sourceType === 'Self' && sourceToDelete.selfConfig) {
        const { generated_column, input_source_names } = sourceToDelete.selfConfig;

        if (generated_column && input_source_names && input_source_names.length > 0) {
          // Remove the generated column from input sources
          setInputSources(prev => prev.map(inputSource => {
            if (input_source_names.includes(inputSource.sourceName)) {
              const updatedHeaders = (inputSource.headers || []).filter(h => h !== generated_column);
              const updatedSelectedHeaders = (inputSource.selectedHeaders || inputSource.headers || []).filter(h => h !== generated_column);

              return {
                ...inputSource,
                headers: updatedHeaders,
                selectedHeaders: updatedSelectedHeaders,
              };
            }
            return inputSource;
          }));

          // Also remove from versioned sources
          setVersionedSources(prev => prev.map(versionedSource => {
            if (input_source_names.includes(versionedSource.sourceName)) {
              const updatedHeaders = (versionedSource.headers || []).filter(h => h !== generated_column);

              return {
                ...versionedSource,
                headers: updatedHeaders,
                combinedHeaders: updatedHeaders,
              };
            }
            return versionedSource;
          }));
        }
      }
    }
  };

  // Wrapper for setSuppressConfigurations
  const handleSuppressConfigurationsChange = (configs: SuppressConfig[]) => {
    setSuppressConfigurations(configs);
  };

  // Filter custom sources based on module type
  const getAvailableCustomSourcesForModule = (currentModuleId: string): InputSource[] => {
    // Get the type of the current module (Append, Match, Suppress, etc.)
    const currentModuleType = getModuleType(currentModuleId);

    // Return only custom sources created by modules of the same type
    return sharedCustomSources.filter(source => {
      if (!source.createdByModuleId) return true; // Legacy sources without tracking

      // For Self sources (self-append, self-match, self-suppress), filter by exact moduleId
      // Self sources should only be available to the specific module instance that created them
      if (source.sourceType === 'Self') {
        return source.createdByModuleId === currentModuleId;
      }

      // For non-Self sources (Database, File), filter by module type
      // These can be shared across module instances of the same type
      const sourceModuleType = getModuleType(source.createdByModuleId);
      return sourceModuleType === currentModuleType;
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
    fieldMappings?: any[],
    appendFields?: string[],  // Fields to Append for Append module
    addFields?: string[]      // Add Fields for Match module
  ) => {
    console.log(`[handleCreateVersionedSource] Called with:`, {
      sourceModule,
      moduleId,
      baseInputSources,
      operationSources,
      operationFields,
      appendFields,
      hasFieldMappings: !!fieldMappings
    });

    // Validation: Must have at least one input source and one operation source
    if (baseInputSources.length === 0) {
      alert('Please select at least one Input Source before creating versions.');
      return;
    }
    if (operationSources.length === 0) {
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
      if (operationFields && operationFields.length > 0) {
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
      let combinedHeaders = [...(inputSource.headers || [])];

      // For Append module: Add appendFields to the headers (these are the new fields being appended)
      if (sourceModule === 'Append' && appendFields && appendFields.length > 0) {
        console.log(`[handleCreateVersionedSource] Adding appendFields to headers:`, appendFields);
        combinedHeaders = [...combinedHeaders, ...appendFields];
      }

      // For Match module: Add addFields to the headers (these are the new fields being added from match)
      if (sourceModule === 'Match' && addFields && addFields.length > 0) {
        console.log(`[handleCreateVersionedSource] Adding addFields to headers:`, addFields);
        combinedHeaders = [...combinedHeaders, ...addFields];
      }

      console.log(`[handleCreateVersionedSource] Final combinedHeaders for version:`, combinedHeaders);

      // Determine stepOrder based on module - use full moduleId to find exact module instance
      const stepOrder = modules.findIndex(m => m.id === moduleId) + 1;
      console.log(`[handleCreateVersionedSource] Determined stepOrder for moduleId ${moduleId}: ${stepOrder}`);

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

        console.log(`[handleCreateVersionedSource] Append version configJson:`, {
          match_keys: configJson.match_keys,
          append_sources_with_fields: configJson.append_sources,
          is_self_append: configJson.is_self_append
        });
      }

      // For Match versions, log the structure
      if (sourceModule === 'Match') {
        console.log(`[handleCreateVersionedSource] Match version configJson:`, {
          match_sources_with_fields: configJson.match_sources
        });
      }

      // Create the versioned source
      const timestamp = Date.now();
      const versionedSource: VersionedSource = {
        id: `versioned_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        isVersioned: true,
        versionNumber: versionedSources.length + newVersions.length + 1,
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
        internalStepOrder: newVersions.length + 1,
        configJson,
        createdAt: timestamp,  // Add timestamp for creation order
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

  // Helper function to get all fields for a source (original + appended fields)
  const getSourceFieldsWithAppends = useMemo(() => {
    return (source: InputSource): string[] => {
      // Start with original headers
      const originalHeaders = source.selectedHeaders || source.headers || [];
      const allFields = new Set<string>(originalHeaders);

      // Find all append configurations where this source is an input source
      appendConfigurations.forEach(config => {
        // Check if this source is one of the input sources for this append config
        const isInputSource = config.inputSources.some(inputSourceId => {
          const inputSource = allAvailableInputSources.find(s => s.id === inputSourceId);
          return inputSource?.sourceName === source.sourceName || inputSource?.id === source.id;
        });

        // If this source is used in the append config, add the appended fields
        if (isInputSource && config.appendFields) {
          config.appendFields.forEach(field => allFields.add(field));
        }
      });

      return Array.from(allFields);
    };
  }, [appendConfigurations, allAvailableInputSources]);

  // Memoize stats module calculations to prevent infinite loops
  const availableStatsHeaders = useMemo(() => {
    if (selectedInputSources.length === 0) {
      return [];
    }

    // Find the selected source objects from allAvailableInputSources
    const selectedSourceObjects = selectedInputSources
      .map(sourceName => allAvailableInputSources.find(s => s.sourceName === sourceName))
      .filter(src => src);

    if (selectedSourceObjects.length === 0) {
      return [];
    }

    if (selectedSourceObjects.length === 1) {
      // Single source: return all its headers (including appended fields)
      const source = selectedSourceObjects[0];
      if (!source) return [];
      const headersToUse = getSourceFieldsWithAppends(source);
      return headersToUse.sort();
    }

    // Multiple sources: return only COMMON headers (intersection)
    const allSourceFieldSets: Set<string>[] = [];

    selectedSourceObjects.forEach(source => {
      if (!source) return;
      const headersToUse = getSourceFieldsWithAppends(source); // Include appended fields
      if (headersToUse.length > 0) {
        const sourceFields = new Set<string>();
        headersToUse.forEach((field: string) => {
          sourceFields.add(field.toLowerCase()); // Case-insensitive comparison
        });
        allSourceFieldSets.push(sourceFields);
      }
    });

    if (allSourceFieldSets.length === 0) {
      return [];
    }

    // Find intersection of all field sets
    const intersection = Array.from(allSourceFieldSets[0]).filter(field => {
      return allSourceFieldSets.every(fieldSet => fieldSet.has(field));
    });

    // Map back to original casing from the first source
    const resultFields: string[] = [];
    const firstSource = selectedSourceObjects[0];
    if (!firstSource) return [];
    const firstSourceHeaders = getSourceFieldsWithAppends(firstSource); // Include appended fields

    firstSourceHeaders.forEach(field => {
      if (intersection.includes(field.toLowerCase())) {
        resultFields.push(field);
      }
    });

    return resultFields.sort();
  }, [selectedInputSources, allAvailableInputSources, getSourceFieldsWithAppends]);

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
              filterParts.push(conditionStr);
            }
          });

          if (filterParts.length > 0) {
            const logicalOp = filterGroup?.logicalOperator || 'AND';
            filters = filterParts.join(` ${logicalOp} `);
            console.log('🔄 Extracted filters from filterJson for File source:', filters);
          }
        }
      } catch (error) {
        console.error('Error extracting filter from filterJson for File source:', error);
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
      filterJson: source.filterJson || null,
      subSourceType: source.subSourceType
    };
  };

  // Transform input sources to the required API format (only File and Database sources)
  const transformInputSourcesToAPIFormat = (sources: InputSource[]) => {
    console.log('🔄 transformInputSourcesToAPIFormat called with:', {
      'total sources': sources.length,
      'source types': sources.map(s => s?.sourceType)
    });

    // Filter to only include File and Database sources, keeping track of original indices
    // Handle both UI format ('File', 'Database') and API format ('F', 'T')
    const fileAndDatabaseSources = sources
      .map((source, originalIndex) => ({ source, originalIndex }))
      .filter(({ source }) => {
        const sourceType = source?.sourceType as any;
        return sourceType === 'File' || sourceType === 'Database' ||
               sourceType === 'F' || sourceType === 'T';
      });

    console.log('✅ After filtering:', {
      'fileAndDatabaseSources count': fileAndDatabaseSources.length,
      'filtered sources': fileAndDatabaseSources.map(({ source }) => ({
        sourceName: source?.sourceName,
        sourceType: source?.sourceType
      }))
    });

    return fileAndDatabaseSources.map(({ source, originalIndex }) => {
      // Check if source is already in API format (sourceType is 'F' or 'T' instead of 'File' or 'Database')
      const isAlreadyAPIFormat = (source?.sourceType as any) === 'F' || (source?.sourceType as any) === 'T';

      if (isAlreadyAPIFormat) {
        console.log('✅ Source already in API format:', source?.sourceName);

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
                  filterParts.push(conditionStr);
                }
              });

              if (filterParts.length > 0) {
                const logicalOp = filterGroup?.logicalOperator || 'AND';
                filters = filterParts.join(` ${logicalOp} `);
                console.log('🔄 Extracted filters from filterJson:', filters);
              }
            }
          } catch (error) {
            console.error('Error extracting filter from filterJson:', error);
          }
        }

        // Return source with extracted filters, stepOrder, and internalStepOrder
        const result: any = {
          ...source,
          filters: filters,
          stepOrder: 1, // Input module sources have stepOrder = 1
          internalStepOrder: originalIndex + 1 // 1-based index from original position
        };

        // Include ID if this is an existing source (for update payload)
        // Only include if hasExistingId is true (source.id is the internal ID, not API ID)
        if ((source as any).hasExistingId && source.id) {
          result.id = source.id;
          console.log('[Update Mode] Including input source ID:', source.id, 'for source:', source.sourceName);
        }

        return result;
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
        const result: any = {
          ...transformFileSourceToAPI(source),
          stepOrder: 1, // Input module sources have stepOrder = 1
          internalStepOrder: originalIndex + 1 // 1-based index from original position
        };

        // Include ID if this is an existing source (for update payload)
        if ((source as any).hasExistingId && source.id) {
          result.id = source.id;
          console.log('[Update Mode] Including input source ID:', source.id, 'for source:', source.sourceName);
        }

        return result;
      }

      // Handle Database sources
      if (source?.sourceType === 'Database') {
        console.log('🔄 Transforming Database source:', source?.sourceName, {
          hasTableSourceId: !!source?.tableSourceId,
          tableSourceId: source?.tableSourceId,
          sourceOption: source?.sourceOption,
          originalTableName: source?.originalTableName,
          fullSource: source
        });
        const selectedHeaders = source?.selectedHeaders || source?.headers || [];
        const headers = source?.headers || [];
        const columnSelectionType = selectedHeaders.length === headers.length ? 'A' : 'S';

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
                  filterParts.push(conditionStr);
                }
              });

              if (filterParts.length > 0) {
                const logicalOp = filterGroup?.logicalOperator || 'AND';
                filters = filterParts.join(` ${logicalOp} `);
              }
            }
          } catch (error) {
            console.error('Error extracting filter from filterJson:', error);
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
        console.log('🔍 Checking for tableSourceId:', {
          hasTableSourceId: !!source?.tableSourceId,
          tableSourceIdValue: source?.tableSourceId,
          willAddSourceOption: !!source?.tableSourceId
        });

        if (source?.tableSourceId) {
          result.sourceOption = source.tableSourceId;
          console.log('✅ Added sourceOption to result:', result.sourceOption);
        } else {
          console.warn('⚠️ No tableSourceId found for database source:', source?.sourceName);
        }

        // Include ID if this is an existing source (for update payload)
        if ((source as any).hasExistingId && source.id) {
          result.id = source.id;
          console.log('[Update Mode] Including input source ID:', source.id, 'for source:', source.sourceName);
        }

        console.log('📦 Final Database source result:', result);
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

    // Helper function to transform field mappings to workflow format
    const transformFieldMappingsInline = (fieldMappings?: any[]): any[] => {
      if (!fieldMappings || fieldMappings.length === 0) {
        return [];
      }

      return fieldMappings.map(mapping => {
        const sourceMappings = mapping.selectedColumns.map((col: string) => {
          const [sourceId, fieldName] = col.split('::');
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

    // Transform Append Configurations
    appendConfigurations.forEach((config, index) => {
      const stepOrder = getStepOrder('panel2') - 1; // Subtract 1 to start from 1

      // Use module-level field mappings (not config-level)
      const fieldMappingsForConfig = transformFieldMappingsInline(appendModuleFieldMappings);

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
        }),
        field_mappings: fieldMappingsForConfig
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

      // Use module-level field mappings (not config-level)
      const fieldMappingsForConfig = transformFieldMappingsInline(matchModuleFieldMappings);

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
        }),
        field_mappings: fieldMappingsForConfig
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

      // Use module-level field mappings (not config-level)
      const fieldMappingsForConfig = transformFieldMappingsInline(suppressModuleFieldMappings);

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

      // Include ID if this is an existing request (for update payload)
      if (requestDetailsId) {
        requestDetails.id = requestDetailsId;
        console.log('[Update Mode] Including requestDetails ID in payload:', requestDetailsId);
      }

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
          subSourceType: s?.subSourceType,
          hasHeaders: !!(s?.headers),
          hasSelectedHeaders: !!(s?.selectedHeaders),
          hasTableSourceId: 'tableSourceId' in (s || {}),
          tableSourceId: s?.tableSourceId,
          originalTableName: s?.originalTableName
        }))
      });

      // Debug: Specifically log Database sources with tableSourceId info
      const databaseSources = inputSources.filter(s => s?.sourceType === 'Database');
      if (databaseSources.length > 0) {
        console.log('🗄️ DEBUG - Database Sources Details:', databaseSources.map(s => ({
          sourceName: s?.sourceName,
          subSourceType: s?.subSourceType,
          originalTableName: s?.originalTableName,
          hasTableSourceId: !!s?.tableSourceId,
          tableSourceId: s?.tableSourceId,
          fullSource: s
        })));
      }

      // Helper function to get stepOrder based on module position in modules array
      const getStepOrder = (moduleId: string): number => {
        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        return moduleIndex !== -1 ? moduleIndex + 1 : 0; // 1-based index
      };

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
      const appendStepOrder = getStepOrder('panel2'); // Get Append module's step order
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
        .map((source, appendIndex) => {
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
              console.log('[Update Mode] Including append source ID:', source.id, 'for source:', source.sourceName);
            }

            return result;
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
                      filterParts.push(conditionStr);
                    }
                  });
                  if (filterParts.length > 0) {
                    const logicalOp = filterGroup?.logicalOperator || 'AND';
                    filters = filterParts.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                console.error('Error extracting filter from filterJson for Append File source:', error);
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
              selectedColumns: selectedHeaders.join(','),
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
              console.log('[Update Mode] Including append source ID:', source.id, 'for source:', source.sourceName);
            }

            return result;
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
                      filterParts.push(conditionStr);
                    }
                  });
                  if (filterParts.length > 0) {
                    const logicalOp = filterGroup?.logicalOperator || 'AND';
                    filters = filterParts.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                console.error('Error extracting filter from filterJson:', error);
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
              console.log('[Update Mode] Including append source ID:', source.id, 'for source:', source.sourceName);
            }

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

            const result: any = {
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
              },
              stepOrder: appendStepOrder,
              internalStepOrder: appendIndex + 1 // 1-based index within append sources
            };

            // Include ID if this is an existing source (for update payload)
            if ((selfSource as any).hasExistingId && selfSource.id) {
              result.id = selfSource.id;
              console.log('[Update Mode] Including append source ID:', selfSource.id, 'for source:', selfSource.sourceName);
            }

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
      const matchStepOrder = getStepOrder('panel4'); // Get Match module's step order
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
        .map((source, matchIndex) => {
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
            const result: any = {
              ...source,
              inputType: 'M'
            };

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              console.log('[Update Mode] Including match source ID:', source.id, 'for source:', source.sourceName);
            }

            return result;
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
                      filterParts.push(conditionStr);
                    }
                  });
                  if (filterParts.length > 0) {
                    const logicalOp = filterGroup?.logicalOperator || 'AND';
                    filters = filterParts.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                console.error('Error extracting filter from filterJson for Match File source:', error);
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
              selectedColumns: selectedHeaders.join(','),
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
              console.log('[Update Mode] Including match source ID:', source.id, 'for source:', source.sourceName);
            }

            return result;
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
                console.warn('Failed to parse filter config:', e);
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
              selectedColumns: selectedHeaders.join(','),
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
              console.log('[Update Mode] Including match source ID:', source.id, 'for source:', source.sourceName);
            }

            return result;
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
      const suppressStepOrder = getStepOrder('panel3'); // Get Suppress module's step order
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
        .map((source, suppressIndex) => {
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
            const result: any = {
              ...source,
              inputType: 'S'
            };

            // Include ID if this is an existing source (for update payload)
            if ((source as any).hasExistingId && source.id) {
              result.id = source.id;
              console.log('[Update Mode] Including suppress source ID:', source.id, 'for source:', source.sourceName);
            }

            return result;
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
                      filterParts.push(conditionStr);
                    }
                  });
                  if (filterParts.length > 0) {
                    const logicalOp = filterGroup?.logicalOperator || 'AND';
                    filters = filterParts.join(` ${logicalOp} `);
                  }
                }
              } catch (error) {
                console.error('Error extracting filter from filterJson for Suppress File source:', error);
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
              selectedColumns: selectedHeaders.join(','),
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
              console.log('[Update Mode] Including suppress source ID:', source.id, 'for source:', source.sourceName);
            }

            return result;
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
                console.warn('Failed to parse filter config:', e);
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
              selectedColumns: selectedHeaders.join(','),
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
              console.log('[Update Mode] Including suppress source ID:', source.id, 'for source:', source.sourceName);
            }

            return result;
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

      // Extract ALL input sources and versions in creation order for the workflow array
      const extractInputSourcesAndVersionsForWorkflow = () => {
        console.log('🔍 Extracting input sources and versions in creation order:');
        console.log('  Total input sources:', inputSources.length);

        // Process all input sources in the order they were created
        // This maintains the correct sequence: source, version, source, version, etc.
        return inputSources.map((source, index) => {
          const isVersioned = source.isVersioned === true;

          if (isVersioned) {
            // This is a versioned source
            const { stepOrder, actionType, saveAsVersion, versionName, configJson } = source as any;

            console.log(`  ${index + 1}. Version:`, {
              sourceName: source.sourceName,
              versionName: versionName,
              hasConfigJson: !!configJson,
              internalStepOrder: index + 1,
              hasExistingId: !!(source as any).hasExistingId
            });

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
            console.log(`  ${index + 1}. Input Source:`, {
              sourceName: source.sourceName,
              sourceType: source.sourceType,
              internalStepOrder: index + 1,
              hasExistingId: !!(source as any).hasExistingId
            });

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
        if (appendFields && appendFields.length > 0) {
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

      // Extract Append configurations and versions combined, sorted by creation order
      const extractAppendItemsForWorkflow = () => {
        const appendItems: any[] = [];

        console.log('\n🔍 Extracting Append items (configs + versions) for workflow:');
        console.log('  Total append configurations:', appendConfigurations.length);

        // Add append configurations with their createdAt timestamps
        appendConfigurations.forEach((config, configIndex) => {
          console.log(`🔍 [DEBUG - Index.tsx] Step 9: Processing Append config ${configIndex + 1}`);
          console.log('  config object =', config);
          console.log('  appendModuleFieldMappings =', appendModuleFieldMappings);
          console.log('  appendModuleFieldMappings?.length =', appendModuleFieldMappings?.length);

          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            const source = allAvailableInputSources.find(s => s.id === sourceId);
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
          const appendSourcesForConfig = (config.appendSources || [])
            .map((sourceId) => {
              // Get fields specific to this source from module-level field mappings or appendFields
              const sourceFields = getFieldsForSource(sourceId, appendModuleFieldMappings, config.appendFields);

              // First check if it's a versioned source (from Input, Append, Match, or Suppress modules)
              const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
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
              const inputSource = allAvailableInputSources.find(s => s.id === sourceId);
              if (inputSource && !inputSource.isVersioned) {
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

              if (isCustomAppendSource) {
                const isSelfAppend = customSource?.sourceType === 'Self';
                return {
                  source_type: isSelfAppend ? 'self_append' : 'preconfigured',
                  source_name: customSource.sourceName,
                  fields: sourceFields
                };
              }

              // Check if it's a preconfigured append source
              if (sourceId.startsWith('append_')) {
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

              console.log('⚠️ Unknown source type for sourceId:', sourceId);
              return null;
            })
            .filter(Boolean)
            .map((source, index) => ({
              ...source,
              priority: index + 1
            }));

          // Use module-level field mappings (not config-level)
          const fieldMappingsForConfig = transformFieldMappings(appendModuleFieldMappings);

          console.log('🔍 [DEBUG - Index.tsx] Step 10: After transformFieldMappings');
          console.log('  fieldMappingsForConfig =', fieldMappingsForConfig);
          console.log('  fieldMappingsForConfig?.length =', fieldMappingsForConfig?.length);

          const configJson = {
            input_sources: inputSourcesForConfig,
            match_keys: config.appendOnFields || [],
            is_self_append: appendSourcesForConfig.some((s: any) => s.source_type === 'self_append'),
            append_sources: appendSourcesForConfig,
            field_mappings: fieldMappingsForConfig
          };

          console.log('🔍 [DEBUG - Index.tsx] Step 11: Final configJson.field_mappings =', configJson.field_mappings);

          // Calculate stepOrder based on the config's createdByModuleId
          const configStepOrder = config.createdByModuleId ? getStepOrder(config.createdByModuleId) : getStepOrder('panel2');
          console.log(`🔍 [DEBUG - Index.tsx] Config created by module: ${config.createdByModuleId}, calculated stepOrder: ${configStepOrder}`);

          appendItems.push({
            stepOrder: configStepOrder,
            actionType: 'A',
            configJson,
            createdAt: config.createdAt || 0,
            itemType: 'config',
            // Include ID if this is an existing config (for update payload)
            ...(config.hasExistingId && config.workflowItemId && { id: config.workflowItemId })
          });
        });

        // Add append versions with their createdAt timestamps
        const appendVersions = versionedSources.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Append'
        );

        console.log('  Append versions found:', appendVersions.length);

        appendVersions.forEach((source) => {
          const { stepOrder, actionType, saveAsVersion, versionName, configJson } = source as any;

          // Inject module-level field mappings into the version (override any stored field mappings)
          const fieldMappingsForVersion = transformFieldMappings(appendModuleFieldMappings);
          const updatedConfigJson = {
            ...configJson,
            field_mappings: fieldMappingsForVersion
          };

          appendItems.push({
            stepOrder,
            actionType,
            saveAsVersion,
            versionName,
            configJson: updatedConfigJson,
            createdAt: (source as any).createdAt || 0,
            itemType: 'version',
            // Include ID if this is an existing version (for update payload)
            ...((source as any).hasExistingId && (source as any).workflowItemId && { id: (source as any).workflowItemId })
          });
        });

        // Sort by createdAt timestamp (creation order)
        appendItems.sort((a, b) => a.createdAt - b.createdAt);

        // Assign sequential internalStepOrder based on sorted order
        const workflowItems = appendItems.map((item, index) => {
          const workflowItem: any = {
            stepOrder: item.stepOrder,
            internalStepOrder: index + 1,
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

          console.log(`  Append ${item.itemType === 'config' ? 'Config' : 'Version'} ${index + 1}:`, {
            internalStepOrder: index + 1,
            createdAt: item.createdAt,
            hasExistingId: !!item.id,
            ...(item.itemType === 'version' && { versionName: item.versionName })
          });

          return workflowItem;
        });

        return workflowItems;
      };

      // Extract Suppress configurations and versions combined, sorted by creation order
      const extractSuppressItemsForWorkflow = () => {
        const suppressItems: any[] = [];

        console.log('\n🔍 Extracting Suppress items (configs + versions) for workflow:');
        console.log('  Total suppress configurations:', suppressConfigurations.length);

        // Add suppress configurations with their createdAt timestamps
        suppressConfigurations.forEach((config, index) => {
          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            const source = allAvailableInputSources.find(s => s.id === sourceId);
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
              const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
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

          // Use module-level field mappings (not config-level)
          const fieldMappingsForConfig = transformFieldMappings(suppressModuleFieldMappings);

          const configJson = {
            input_sources: inputSourcesForConfig,
            suppress_on_fields: config.suppressOnFields || [],
            suppress_sources: suppressSourcesForConfig,
            field_mappings: fieldMappingsForConfig
          };

          // Calculate stepOrder based on the config's createdByModuleId
          const configStepOrder = config.createdByModuleId ? getStepOrder(config.createdByModuleId) : getStepOrder('panel3');
          console.log(`🔍 [DEBUG - Index.tsx] Suppress config created by module: ${config.createdByModuleId}, calculated stepOrder: ${configStepOrder}`);

          suppressItems.push({
            stepOrder: configStepOrder,
            actionType: 'S',
            configJson,
            createdAt: config.createdAt || 0,
            itemType: 'config',
            // Include ID if this is an existing config (for update payload)
            ...(config.hasExistingId && config.workflowItemId && { id: config.workflowItemId })
          });
        });

        // Add suppress versions with their createdAt timestamps
        const suppressVersions = versionedSources.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Suppress'
        );

        console.log('  Suppress versions found:', suppressVersions.length);

        suppressVersions.forEach((source) => {
          const { stepOrder, actionType, saveAsVersion, versionName, configJson } = source as any;

          // Inject module-level field mappings into the version (override any stored field mappings)
          const fieldMappingsForVersion = transformFieldMappings(suppressModuleFieldMappings);
          const updatedConfigJson = {
            ...configJson,
            field_mappings: fieldMappingsForVersion
          };

          suppressItems.push({
            stepOrder,
            actionType,
            saveAsVersion,
            versionName,
            configJson: updatedConfigJson,
            createdAt: (source as any).createdAt || 0,
            itemType: 'version',
            // Include ID if this is an existing version (for update payload)
            ...((source as any).hasExistingId && (source as any).workflowItemId && { id: (source as any).workflowItemId })
          });
        });

        // Sort by createdAt timestamp (creation order)
        suppressItems.sort((a, b) => a.createdAt - b.createdAt);

        // Assign sequential internalStepOrder based on sorted order
        const workflowItems = suppressItems.map((item, index) => {
          const workflowItem: any = {
            stepOrder: item.stepOrder,
            internalStepOrder: index + 1,
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

          console.log(`  Suppress ${item.itemType === 'config' ? 'Config' : 'Version'} ${index + 1}:`, {
            internalStepOrder: index + 1,
            createdAt: item.createdAt,
            hasExistingId: !!item.id,
            ...(item.itemType === 'version' && { versionName: item.versionName })
          });

          return workflowItem;
        });

        return workflowItems;
      };

      // Extract Match configurations and versions combined, sorted by creation order
      const extractMatchItemsForWorkflow = () => {
        const matchItems: any[] = [];

        console.log('\n🔍 Extracting Match items (configs + versions) for workflow:');
        console.log('  Total match configurations:', matchConfigurations.length);

        // Add match configurations with their createdAt timestamps
        matchConfigurations.forEach((config) => {
          // Transform input sources to the required format
          const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
            // Search in allAvailableInputSources (includes both inputSources and versionedSources)
            const source = allAvailableInputSources.find(s => s.id === sourceId);
            // For versioned sources, use versionName/versionLabel instead of sourceName
            const displayName = source?.isVersioned
              ? ((source as any).versionName || (source as any).versionLabel || source.sourceName)
              : (source?.sourceName || sourceId);
            return {
              source_name: displayName,
              columns: source?.headers || []
            };
          });

          // Transform match sources to the required format with priority
          const matchSourcesForConfig = (config.matchSources || [])
            .map((sourceId, priority) => {
              // First check if it's a versioned source (from Input, Append, Match, or Suppress modules)
              const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
              if (versionedSource) {
                // All versioned sources are treated as 'input' type
                // Use versionName/versionLabel for display name, not sourceName (which may be internal ID)
                const displayName = (versionedSource as any).versionName || (versionedSource as any).versionLabel || versionedSource.sourceName;
                return {
                  source_type: 'input',
                  source_name: displayName,
                  priority: priority + 1
                };
              }

              // Check if it's a non-versioned input source
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

          // Use module-level field mappings (not config-level)
          const fieldMappingsForConfig = transformFieldMappings(matchModuleFieldMappings);

          const configJson = {
            input_sources: inputSourcesForConfig,
            match_sources: matchSourcesForConfig,
            expand: config.expand || false,
            match_type: config.matchType || 'full',
            ...(config.addFields && config.addFields.length > 0 && {
              add_fields: config.addFields
            }),
            field_mappings: fieldMappingsForConfig
          };

          // Calculate stepOrder based on the config's createdByModuleId
          const configStepOrder = config.createdByModuleId ? getStepOrder(config.createdByModuleId) : getStepOrder('panel4');
          console.log(`🔍 [DEBUG - Index.tsx] Match config created by module: ${config.createdByModuleId}, calculated stepOrder: ${configStepOrder}`);

          matchItems.push({
            stepOrder: configStepOrder,
            actionType: 'M',
            configJson,
            createdAt: config.createdAt || 0,
            itemType: 'config',
            // Include ID if this is an existing config (for update payload)
            ...(config.hasExistingId && config.workflowItemId && { id: config.workflowItemId })
          });
        });

        // Add match versions with their createdAt timestamps
        const matchVersions = versionedSources.filter(source =>
          source.isVersioned === true &&
          (source as any).sourceModule === 'Match'
        );

        console.log('  Match versions found:', matchVersions.length);

        matchVersions.forEach((source) => {
          const { stepOrder, actionType, saveAsVersion, versionName, configJson } = source as any;

          // Inject module-level field mappings into the version (override any stored field mappings)
          const fieldMappingsForVersion = transformFieldMappings(matchModuleFieldMappings);
          const updatedConfigJson = {
            ...configJson,
            field_mappings: fieldMappingsForVersion
          };

          matchItems.push({
            stepOrder,
            actionType,
            saveAsVersion,
            versionName,
            configJson: updatedConfigJson,
            createdAt: (source as any).createdAt || 0,
            itemType: 'version',
            // Include ID if this is an existing version (for update payload)
            ...((source as any).hasExistingId && (source as any).workflowItemId && { id: (source as any).workflowItemId })
          });
        });

        // Sort by createdAt timestamp (creation order)
        matchItems.sort((a, b) => a.createdAt - b.createdAt);

        // Assign sequential internalStepOrder based on sorted order
        const workflowItems = matchItems.map((item, index) => {
          const workflowItem: any = {
            stepOrder: item.stepOrder,
            internalStepOrder: index + 1,
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

          console.log(`  Match ${item.itemType === 'config' ? 'Config' : 'Version'} ${index + 1}:`, {
            internalStepOrder: index + 1,
            createdAt: item.createdAt,
            hasExistingId: !!item.id,
            ...(item.itemType === 'version' && { versionName: item.versionName })
          });

          return workflowItem;
        });

        return workflowItems;
      };

      // Build workflow array with all configurations and versions
      // IMPORTANT: Maintain creation order - sources and versions are interleaved as they were created
      const inputSourcesAndVersions = extractInputSourcesAndVersionsForWorkflow();
      const appendItems = extractAppendItemsForWorkflow();
      const suppressItems = extractSuppressItemsForWorkflow();
      const matchItems = extractMatchItemsForWorkflow();

      const workflowArray = [
        ...inputSourcesAndVersions,  // All input sources and versions in creation order
        ...appendItems,              // Append configs and versions sorted by creation order
        ...suppressItems,            // Suppress configs and versions sorted by creation order
        ...matchItems                // Match configs and versions sorted by creation order
      ];

      // Log workflow array for debugging
      console.log('\n=== WORKFLOW ARRAY ===');
      console.log('Total workflow items:', workflowArray.length);
      console.log('  Input sources:', workflowArray.filter(w => w.actionType === 'I').length);
      console.log('  Input versions:', workflowArray.filter(w => w.actionType === 'I').length);
      console.log('  Append items:', workflowArray.filter(w => w.actionType === 'A').length);
      console.log('  Match items:', workflowArray.filter(w => w.actionType === 'M').length);
      console.log('  Suppress items:', workflowArray.filter(w => w.actionType === 'S').length);

      workflowArray.forEach((item, index) => {
        let itemType = '';
        if (item.actionType === 'I') {
          itemType = 'Input Source';
        } else if (item.saveAsVersion) {
          itemType = `${item.actionType === 'I' ? 'Input' : item.actionType === 'A' ? 'Append' : item.actionType === 'M' ? 'Match' : 'Suppress'} Version`;
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
      console.log('[Index.tsx] Rendering AppendModule, allAvailableInputSources:', {
        count: allAvailableInputSources.length,
        sources: allAvailableInputSources.map(src => ({
          id: src.id,
          sourceName: src.sourceName,
          isVersioned: src.isVersioned,
          headersCount: src.headers?.length || 0,
        })),
        versionedSourcesCount: versionedSources.length,
        versionedSources: versionedSources.map(v => ({
          id: v.id,
          sourceName: v.sourceName,
          isVersioned: v.isVersioned,
          sourceModule: v.sourceModule,
          headersCount: v.headers?.length || 0
        }))
      });
      return <AppendModule
        moduleId={moduleId}
        availableInputSources={allAvailableInputSources}
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields, fieldMappings, appendFields) =>
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields, fieldMappings, appendFields)
        }
        initialConfigs={initialConfigs}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={versionedSources.filter(v => v.sourceModule === 'Append' && v.createdByModuleId === moduleId)}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
        onUpdateVersion={handleUpdateVersion}
        onDeleteVersion={handleDeleteVersion}
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
        onConfigurationsChange={setAppendConfigurations}
        moduleFieldMappings={appendModuleFieldMappings}
        onModuleFieldMappingsChange={setAppendModuleFieldMappings}
      />;
    } else if (moduleId === 'panel3' || moduleId.startsWith('panel3_')) {
      // For duplicated Suppression modules, only pass initial configs to the original module
      const initialConfigs = moduleId === 'panel3' ? initialSuppressConfigs : [];
      return <SuppressModule
        moduleId={moduleId}
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
        onUpdateVersion={handleUpdateVersion}
        onDeleteVersion={handleDeleteVersion}
        appendConfigurations={appendConfigurations}
        onConfigurationsChange={handleSuppressConfigurationsChange}
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
        moduleFieldMappings={suppressModuleFieldMappings}
        onModuleFieldMappingsChange={setSuppressModuleFieldMappings}
      />;
    } else if (moduleId === 'panel4' || moduleId.startsWith('panel4_')) {
      // For duplicated Match modules, only pass initial configs to the original module
      const initialConfigs = moduleId === 'panel4' ? initialMatchConfigs : [];
      return <MatchModule
        moduleId={moduleId}
        availableInputSources={allAvailableInputSources}
        onCreateVersionedSource={(sourceModule, baseInputSources, operationSources, operationFields, addFields) =>
          handleCreateVersionedSource(sourceModule, moduleId, baseInputSources, operationSources, operationFields, undefined, undefined, addFields)
        }
        initialConfigs={initialConfigs}
        apiSources={apiSources}
        sourcesLoading={sourcesLoading}
        versionedSources={versionedSources.filter(v => v.sourceModule === 'Match' && v.createdByModuleId === moduleId)}
        getSourceNameById={getSourceNameById}
        onUpdateVersionName={handleUpdateVersionName}
        onDeleteVersion={handleDeleteVersion}
        appendConfigurations={appendConfigurations}
        onUpdateVersion={handleUpdateVersion}
        sharedCustomSources={getAvailableCustomSourcesForModule(moduleId)}
        onAddSharedCustomSource={(source) => handleAddSharedCustomSource(source, moduleId)}
        onEditSharedCustomSource={handleEditSharedCustomSource}
        onDeleteSharedCustomSource={handleDeleteSharedCustomSource}
        onConfigurationsChange={setMatchConfigurations}
        moduleFieldMappings={matchModuleFieldMappings}
        onModuleFieldMappingsChange={setMatchModuleFieldMappings}
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
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
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
            />
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
        </>
      )}
    </Box>
  );
};

export default RequestCreationPage;
