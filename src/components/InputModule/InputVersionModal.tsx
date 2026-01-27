import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Chip,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Paper,
  IconButton,
  Divider,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Close,
  Save,
  DragIndicator,
  AccountTree,
  Add,
  Edit,
  Delete,
  ExpandMore,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { validateMappingFieldName, validateUniqueSourceName, getReservedNamesFromAPI } from '../../utils/sourceValidation';
import type { RequestInputsResponse } from '../../services/api';

interface FieldMapping {
  id: string;
  fieldName: string;
  alias?: string;
  type?: 'text' | 'number' | 'date' | 'boolean';
  required?: boolean;
  selectedSources: string[];
  selectedColumns: string[];
}

interface NestedField {
  id: string;
  sourceId: string;
  fieldName: string;
  dataType: 'string' | 'int' | 'date' | 'boolean' | 'datetime';
  defaultValue: string;
}

interface InputSource {
  id: string;
  sourceName: string;
  sourceType: string;
  headers?: string[];
  fileName?: string;
  database?: string;
  schema?: string;
  table?: string;
  isVersioned?: boolean;
  versionConfig?: {
    selectedSources: string[];
    combineAs: 'merge' | 'union' | 'intersect';
    fieldMappings: FieldMapping[];
  };
}

interface InputVersionModalProps {
  open: boolean;
  onClose: () => void;
  availableSources: InputSource[];
  editingVersion?: InputSource | null;
  currentVersionCount?: number;
  apiSources?: RequestInputsResponse | null;
  onSave: (versionData: {
    stepOrder: number;
    actionType: string;
    saveAsVersion: number;
    versionName: string;
    internalStepOrder: number;
    configJson: {
      operation: string;
      input_sources: Array<{
        source_name: string;
        columns: string[];
      }>;
      added_fields: Array<{
        source_name: string;
        fields: Array<{
          field_name: string;
          data_type: string;
          default_value: string | number;
        }>;
      }>;
      field_mappings: Array<{
        field_name: string;
        source_mappings: string;
      }>;
      merge_keys: string[];
      priority_order: string[];
    };
  }) => void;
}

interface SortableHeaderItemProps {
  id: string;
  header: string;
}

const SortableHeaderItem: React.FC<SortableHeaderItemProps> = ({ id, header }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        },
        backgroundColor: 'white',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <DragIndicator sx={{ color: 'text.secondary', fontSize: '1rem' }} />
      <Typography variant="body2">{header}</Typography>
    </Paper>
  );
};

const InputVersionModal: React.FC<InputVersionModalProps> = ({
  open,
  onClose,
  availableSources,
  editingVersion,
  currentVersionCount = 0,
  apiSources = null,
  onSave,
}) => {
  const [versionName, setVersionName] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [orderedHeaders, setOrderedHeaders] = useState<string[]>([]);
  const [combineAs, setCombineAs] = useState<'merge' | 'union' | 'intersect'>('merge');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [error, setError] = useState('');

  // Filter out the currently editing version from available sources
  const filteredAvailableSources = availableSources.filter(source => {
    // If we're editing a version, exclude it from the dropdown
    if (editingVersion && editingVersion.id) {
      return source.id !== editingVersion.id;
    }
    return true;
  });

  // Helper function to get headers from source (handles both UI and API format)
  const getSourceHeaders = (source: any): string[] => {
    // UI format: headers (array) or selectedHeaders (array)
    if (source?.selectedHeaders && Array.isArray(source?.selectedHeaders)) {
      return source.selectedHeaders;
    }
    if (source?.headers && Array.isArray(source?.headers)) {
      return source.headers;
    }

    // API format: selectedColumns (comma-separated string) or columns (array)
    if (source?.selectedColumns && typeof source?.selectedColumns === 'string') {
      return source.selectedColumns.split(',').map((h: string) => h.trim()).filter((h: string) => h.length > 0);
    }
    if (source?.columns && Array.isArray(source?.columns)) {
      return source.columns;
    }

    return [];
  };

  // Nested fields state
  const [nestedFields, setNestedFields] = useState<NestedField[]>([]);
  const [editingNestedFieldId, setEditingNestedFieldId] = useState<string | null>(null);
  const [nestedFieldSourceId, setNestedFieldSourceId] = useState('');
  const [nestedFieldName, setNestedFieldName] = useState('');
  const [nestedFieldDataType, setNestedFieldDataType] = useState<'string' | 'int' | 'date' | 'boolean' | 'datetime'>('string');
  const [nestedFieldDefaultValue, setNestedFieldDefaultValue] = useState('');

  // Field mapping form state
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [mappingFieldName, setMappingFieldName] = useState('');
  const [mappingSelectedSources, setMappingSelectedSources] = useState<string[]>([]);
  const [mappingSelectedColumns, setMappingSelectedColumns] = useState<string[]>([]);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Prefill form when editing existing version
  useEffect(() => {
    if (open && editingVersion) {
      setVersionName(editingVersion.sourceName);

      // Handle versionConfig if it exists
      if (editingVersion.versionConfig) {
        const config = editingVersion.versionConfig;
        setSelectedSources(config.selectedSources || []);
        setCombineAs(config.combineAs || 'merge');
        setFieldMappings(config.fieldMappings || []);
      }

      // Handle configJson from API format
      if ((editingVersion as any).configJson) {
        const configJson = (editingVersion as any).configJson;
        const inputSources = configJson.input_sources || [];

        // Map input sources to IDs
        const sourceIds = inputSources.map((src: any) => {
          const found = availableSources.find(s => s.sourceName === src.source_name);
          return found?.id || src.source_name;
        });
        setSelectedSources(sourceIds);

        // Set operation/combineAs
        // IMPORTANT: Use combine_as if available (preserves exact UI state), otherwise infer from operation
        const operation = configJson.operation;
        const storedCombineAs = configJson.combine_as;

        if (storedCombineAs) {
          // Use the stored UI value directly (most accurate)
          setCombineAs(storedCombineAs);
          console.log('[InputVersionModal] Using stored combine_as value:', storedCombineAs);
        } else {
          // Fallback: Infer from operation (backward compatibility)
          // Map API operations to UI values:
          // 'union_all' → 'merge' (Union All)
          // 'union' → 'union' (Union)
          // 'intersect' → 'intersect' (Intersect)
          if (operation === 'union_all') {
            setCombineAs('merge');
          } else if (operation === 'union') {
            // For backward compatibility with old data, default to 'union' (not 'merge')
            // This fixes the issue where it always defaulted to Union All
            setCombineAs('union');
          } else if (operation === 'intersect') {
            setCombineAs('intersect');
          } else {
            // Direct mapping for any other value (like 'merge')
            setCombineAs(operation);
          }
          console.log('[InputVersionModal] Inferred combine_as from operation:', operation, '→', combineAs);
        }

        // Set merge_keys as selected and ordered headers
        const mergeKeys = configJson.merge_keys || [];
        setSelectedHeaders(mergeKeys);
        setOrderedHeaders(mergeKeys);

        // Transform field_mappings back to UI format if they exist
        const fieldMappings = configJson.field_mappings || [];
        const transformedMappings = fieldMappings.map((fm: any, idx: number) => {
          const sourceMappings = fm.source_mappings.split('|');
          const selectedColumns = sourceMappings.map((mapping: string) => {
            const [sourceName, columnName] = mapping.split('.');
            const source = availableSources.find(s => s.sourceName === sourceName);
            return `${source?.id || sourceName}::${columnName}`;
          });

          return {
            id: `mapping_${idx}`,
            fieldName: fm.field_name,
            selectedSources: [...new Set(sourceMappings.map((mapping: string) => {
              const sourceName = mapping.split('.')[0];
              const source = availableSources.find(s => s.sourceName === sourceName);
              return source?.id || sourceName;
            }))],
            selectedColumns
          };
        });
        setFieldMappings(transformedMappings);

        // Transform added_fields back to nested fields
        const addedFields = configJson.added_fields || [];
        const transformedNestedFields: NestedField[] = [];
        addedFields.forEach((af: any, sourceIdx: number) => {
          const source = availableSources.find(s => s.sourceName === af.source_name);
          af.fields.forEach((field: any, fieldIdx: number) => {
            transformedNestedFields.push({
              id: `nested_${sourceIdx}_${fieldIdx}`,
              sourceId: source?.id || af.source_name,
              fieldName: field.field_name,
              dataType: field.data_type.toLowerCase() === 'integer' ? 'int' : field.data_type.toLowerCase(),
              defaultValue: String(field.default_value)
            });
          });
        });
        setNestedFields(transformedNestedFields);
      } else {
        // Fallback to headers if configJson doesn't exist
        const headers = editingVersion.headers || [];
        setSelectedHeaders(headers);
        setOrderedHeaders(headers);
      }
    }
  }, [open, editingVersion, availableSources]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (!editingVersion) {
        // Only reset if not editing
        setVersionName('');
        setSelectedSources([]);
        setAvailableHeaders([]);
        setSelectedHeaders([]);
        setOrderedHeaders([]);
        setCombineAs('merge');
        setFieldMappings([]);
        setError('');
        // Reset nested fields
        setNestedFields([]);
        setEditingNestedFieldId(null);
        setNestedFieldSourceId('');
        setNestedFieldName('');
        setNestedFieldDataType('string');
        setNestedFieldDefaultValue('');
        // Reset field mapping form
        setEditingMappingId(null);
        setMappingFieldName('');
        setMappingSelectedSources([]);
        setMappingSelectedColumns([]);
        setColumnSearchQuery('');
      }
    }
  }, [open, editingVersion]);

  // Auto-generate version name when sources are selected (only for new versions, not editing)
  useEffect(() => {
    if (!editingVersion && selectedSources.length > 0) {
      const sources = availableSources.filter(s => selectedSources.includes(s.id));
      const sourceNames = sources.map(source => source.sourceName);

      // Generate version name: Source1_Source2_version
      const generatedName = sourceNames.length > 0
        ? `${sourceNames.join('_')}_version`
        : '';

      setVersionName(generatedName);
    }
  }, [selectedSources, availableSources, editingVersion]);

  // Update available headers when sources change or nested fields are added
  useEffect(() => {
    if (selectedSources.length > 0) {
      const sources = availableSources.filter(s => selectedSources.includes(s.id));
      const headersSet = new Set<string>();

      if (sources.length === 1) {
        // If only one source is selected, show all headers from that source
        const singleSource = sources[0];
        const sourceHeaders = getSourceHeaders(singleSource);

        sourceHeaders.forEach(header => {
          // Check if this header is part of a field mapping
          const mapping = fieldMappings.find(m =>
            m.selectedColumns.some(col => {
              const [mappedSourceId, mappedColumn] = col.split('::');
              return mappedSourceId === singleSource.id && mappedColumn === header;
            })
          );

          // If mapped, add the mapped field name; otherwise add the original header
          if (mapping) {
            headersSet.add(mapping.fieldName);
          } else {
            headersSet.add(header);
          }
        });

        // Add nested fields for this source
        nestedFields
          .filter(nf => nf.sourceId === singleSource.id)
          .forEach(nf => headersSet.add(nf.fieldName));
      } else if (sources.length > 1) {
        // If multiple sources are selected, show only common headers (intersection)
        // IMPORTANT: Apply field mappings FIRST, then check for common headers

        // Step 1: Build effective header maps for each source (after applying field mappings)
        const allSourceHeaderMaps = sources.map(source => {
          const sourceHeaders = getSourceHeaders(source);
          const headerMap = new Map<string, string>(); // lowercase -> effective name

          // Add actual headers to the map
          sourceHeaders.forEach(header => {
            headerMap.set(header.toLowerCase(), header);
          });

          // Add nested fields for this source
          nestedFields
            .filter(nf => nf.sourceId === source.id)
            .forEach(nf => {
              headerMap.set(nf.fieldName.toLowerCase(), nf.fieldName);
            });

          // Step 2: Apply field mappings to transform header names for this source
          // For each mapping, check if this source has the mapped column
          fieldMappings.forEach(mapping => {
            mapping.selectedColumns.forEach(col => {
              const [sourceId, columnName] = col.split('::');
              // If this mapping targets this source
              if (sourceId === source.id && columnName) {
                // Replace the original column name with the mapped field name
                const columnLower = columnName.toLowerCase();
                if (headerMap.has(columnLower)) {
                  // Remove the original column name
                  headerMap.delete(columnLower);
                  // Add the mapped field name instead
                  headerMap.set(mapping.fieldName.toLowerCase(), mapping.fieldName);
                  console.log(`[InputVersionModal] Applied mapping for source "${source.sourceName}": "${columnName}" → "${mapping.fieldName}"`);
                }
              }
            });
          });

          return headerMap;
        });

        // Step 3: Find headers that exist in ALL sources (after field mappings applied)
        // Start with headers from the first source
        const firstSourceHeaders: string[] = Array.from(allSourceHeaderMaps[0].values());

        // Only include headers that exist in ALL sources (case-insensitive comparison)
        firstSourceHeaders.forEach((header: string) => {
          const headerLower = header.toLowerCase();
          const existsInAllSources = allSourceHeaderMaps.every(headerMap =>
            headerMap.has(headerLower)
          );

          if (existsInAllSources) {
            headersSet.add(header);
            console.log(`[InputVersionModal] Common header found: "${header}"`);
          }
        });
      }

      const headers = Array.from(headersSet).sort();

      // Log for debugging
      console.log('Version Modal - Selected Sources:', selectedSources.length);
      console.log('Version Modal - Field Mappings:', fieldMappings);
      console.log('Version Modal - Common Headers (including nested and mappings):', headers);

      setAvailableHeaders(headers);

      // IMPORTANT FIX: Only auto-select all headers if NOT in edit mode
      // In edit mode, preserve the previously selected headers
      if (!editingVersion) {
        // Create mode: Auto-select all available headers
        setSelectedHeaders(headers);
        setOrderedHeaders(headers);
      } else {
        // Edit mode: Only update if current selection is invalid
        // Keep headers that are still available, remove headers that are no longer available
        const validSelectedHeaders = selectedHeaders.filter(h => headers.includes(h));
        if (validSelectedHeaders.length !== selectedHeaders.length) {
          setSelectedHeaders(validSelectedHeaders);
          setOrderedHeaders(orderedHeaders.filter(h => validSelectedHeaders.includes(h)));
        }
      }
    } else {
      setAvailableHeaders([]);
      setSelectedHeaders([]);
      setOrderedHeaders([]);
    }
  }, [selectedSources, availableSources, nestedFields, fieldMappings, editingVersion]);

  const handleSourcesChange = (event: any) => {
    const value = typeof event.target.value === 'string' 
      ? [event.target.value] 
      : event.target.value;
    setSelectedSources(value as string[]);
    setError('');
  };

  const handleHeadersChange = (event: any) => {
    const value = typeof event.target.value === 'string' 
      ? [event.target.value] 
      : event.target.value;
    setSelectedHeaders(value as string[]);
    
    // Update ordered headers to only include selected ones
    const newOrderedHeaders = orderedHeaders.filter((h: string) => (value as string[]).includes(h));
    const newHeaders = (value as string[]).filter((h: string) => !newOrderedHeaders.includes(h));
    setOrderedHeaders([...newOrderedHeaders, ...newHeaders]);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setOrderedHeaders((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getAvailableColumns = () => {
    const columns: Array<{ value: string; label: string }> = [];

    if (mappingSelectedSources.length === 0) {
      return columns;
    }

    // Debug logging
    console.log('🔍 Field Mapping - getAvailableColumns Debug:');
    console.log('  mappingSelectedSources:', mappingSelectedSources);
    console.log('  nestedFields:', nestedFields);
    console.log('  nestedFields filtered by sourceId:', mappingSelectedSources.map(sid => ({
      sourceId: sid,
      matchingNestedFields: nestedFields.filter(nf => nf.sourceId === sid)
    })));

    if (mappingSelectedSources.length === 1) {
      // If only one source selected, show all columns from that source (including nested fields)
      const sourceId = mappingSelectedSources[0];
      const source = availableSources.find(s => s.id === sourceId);
      if (source) {
        const sourceHeaders = getSourceHeaders(source);
        // Add regular headers
        sourceHeaders.forEach(header => {
          columns.push({
            value: `${sourceId}::${header}`,
            label: `${source.sourceName} → ${header}`
          });
        });
        // Add nested fields for this source
        const matchingNestedFields = nestedFields.filter(nf => nf.sourceId === sourceId);
        console.log('  Source:', source.sourceName, '(ID:', sourceId, ')');
        console.log('  Regular headers count:', sourceHeaders.length);
        console.log('  Matching nested fields:', matchingNestedFields);

        matchingNestedFields.forEach(nf => {
          columns.push({
            value: `${sourceId}::${nf.fieldName}`,
            label: `${source.sourceName} → ${nf.fieldName} (nested)`
          });
        });

        console.log('  Total columns (after nested):', columns.length);
      }
    } else {
      // If multiple sources selected, show ALL columns from ALL sources (union - including nested fields)
      const sourcesData = mappingSelectedSources.map(sourceId => {
        const source = availableSources.find(s => s.id === sourceId);
        const regularHeaders = source ? getSourceHeaders(source) : [];
        // Include nested fields for this source
        const nestedFieldNames = nestedFields
          .filter(nf => nf.sourceId === sourceId)
          .map(nf => nf.fieldName);
        return {
          id: sourceId,
          name: source?.sourceName || sourceId,
          headers: [...regularHeaders, ...nestedFieldNames]
        };
      });

      // Add ALL columns from ALL sources
      sourcesData.forEach(src => {
        src.headers.forEach(header => {
          columns.push({
            value: `${src.id}::${header}`,
            label: `${src.name} → ${header}`
          });
        });
      });
    }

    return columns.filter(col =>
      col.label.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
      col.value.toLowerCase().includes(columnSearchQuery.toLowerCase())
    );
  };

  const getSourceName = (sourceId: string): string => {
    const source = availableSources.find(s => s.id === sourceId);
    return source?.sourceName || sourceId;
  };

  const handleAddMapping = () => {
    if (!mappingFieldName.trim()) {
      alert('Please enter a field name');
      return;
    }
    if (mappingSelectedSources.length === 0) {
      alert('Please select at least one source');
      return;
    }
    if (mappingSelectedColumns.length === 0) {
      alert('Please select at least one column');
      return;
    }

    // Validate for duplicate field mapping names (case-insensitive)
    const validationError = validateMappingFieldName(
      mappingFieldName,
      fieldMappings,
      editingMappingId,
      'Field mapping'
    );

    if (validationError) {
      alert(validationError);
      return;
    }

    if (editingMappingId) {
      // Update existing mapping
      setFieldMappings(fieldMappings.map(m =>
        m.id === editingMappingId
          ? { ...m, fieldName: mappingFieldName, selectedSources: mappingSelectedSources, selectedColumns: mappingSelectedColumns }
          : m
      ));
      setEditingMappingId(null);
    } else {
      // Add new mapping
      const newMapping: FieldMapping = {
        id: Date.now().toString(),
        fieldName: mappingFieldName,
        selectedSources: mappingSelectedSources,
        selectedColumns: mappingSelectedColumns,
      };
      setFieldMappings([...fieldMappings, newMapping]);
    }

    // Reset form
    setMappingFieldName('');
    setMappingSelectedSources([]);
    setMappingSelectedColumns([]);
    setColumnSearchQuery('');
  };

  const handleEditMapping = (mapping: FieldMapping) => {
    setEditingMappingId(mapping.id);
    setMappingFieldName(mapping.fieldName);
    setMappingSelectedSources(mapping.selectedSources);
    setMappingSelectedColumns(mapping.selectedColumns);
  };

  const handleDeleteMapping = (id: string) => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      setFieldMappings(fieldMappings.filter(m => m.id !== id));
    }
  };

  // Nested field handlers
  const handleAddNestedField = () => {
    if (!nestedFieldSourceId) {
      alert('Please select an input source');
      return;
    }
    if (!nestedFieldName.trim()) {
      alert('Please enter a field name');
      return;
    }
    if (!nestedFieldDefaultValue.trim()) {
      alert('Please enter a default value');
      return;
    }

    // Validate for duplicate nested field names (case-insensitive) within the same source
    const nestedFieldsForSource = nestedFields.filter(nf => nf.sourceId === nestedFieldSourceId);
    const validationError = validateMappingFieldName(
      nestedFieldName,
      nestedFieldsForSource,
      editingNestedFieldId,
      'Nested field'
    );

    if (validationError) {
      alert(validationError);
      return;
    }

    if (editingNestedFieldId) {
      // Update existing nested field
      setNestedFields(nestedFields.map(nf =>
        nf.id === editingNestedFieldId
          ? { ...nf, sourceId: nestedFieldSourceId, fieldName: nestedFieldName, dataType: nestedFieldDataType, defaultValue: nestedFieldDefaultValue }
          : nf
      ));
      setEditingNestedFieldId(null);
    } else {
      // Add new nested field
      const newNestedField: NestedField = {
        id: Date.now().toString(),
        sourceId: nestedFieldSourceId,
        fieldName: nestedFieldName,
        dataType: nestedFieldDataType,
        defaultValue: nestedFieldDefaultValue,
      };
      setNestedFields([...nestedFields, newNestedField]);
    }

    // Reset form
    setNestedFieldSourceId('');
    setNestedFieldName('');
    setNestedFieldDataType('string');
    setNestedFieldDefaultValue('');
  };

  const handleEditNestedField = (field: NestedField) => {
    setEditingNestedFieldId(field.id);
    setNestedFieldSourceId(field.sourceId);
    setNestedFieldName(field.fieldName);
    setNestedFieldDataType(field.dataType);
    setNestedFieldDefaultValue(field.defaultValue);
  };

  const handleDeleteNestedField = (id: string) => {
    if (window.confirm('Are you sure you want to delete this nested field?')) {
      setNestedFields(nestedFields.filter(nf => nf.id !== id));
    }
  };

  const handleSave = () => {
    if (!versionName.trim()) {
      setError('Please enter a version name');
      return;
    }

    // Use centralized validation to check against API reserved names and existing sources
    const validationError = validateUniqueSourceName({
      sourceName: versionName.trim(),
      allExistingSources: availableSources as any,
      editingSourceId: editingVersion?.id,
      moduleName: 'Input Version',
      apiSources: apiSources
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    console.log('✅ Version name is unique:', versionName.trim());

    if (selectedSources.length < 1) {
      setError('Please select at least 1 input source');
      return;
    }

    // Allow saving with no headers if field mappings are defined
    if (selectedHeaders.length === 0 && fieldMappings.length === 0) {
      setError('Please select at least one header or define field mappings');
      return;
    }

    // Prepare the ordered selected headers (needed for input_sources, merge keys, and priority order)
    const orderedSelectedHeaders = orderedHeaders.filter(h => selectedHeaders.includes(h));

    // Transform selected sources into input_sources format
    // IMPORTANT: We need to send ONLY the user's selected headers, not all available headers
    const input_sources = selectedSources.map(srcId => {
      const src = availableSources.find(s => s.id === srcId);

      return {
        source_name: src?.sourceName || srcId,
        columns: orderedSelectedHeaders // Only the headers user selected and ordered
      };
    });

    // Transform nested fields into added_fields format (grouped by source)
    const added_fields = nestedFields.length > 0
      ? selectedSources.map(srcId => {
          const src = availableSources.find(s => s.id === srcId);
          const fieldsForSource = nestedFields.filter(nf => nf.sourceId === srcId);

          if (fieldsForSource.length === 0) {
            return null;
          }

          // Map data types to proper format
          const dataTypeMap: Record<string, string> = {
            'string': 'STRING',
            'int': 'INTEGER',
            'date': 'DATE',
            'datetime': 'DATETIME',
            'boolean': 'BOOLEAN'
          };

          return {
            source_name: src?.sourceName || srcId,
            fields: fieldsForSource.map(field => ({
              field_name: field.fieldName,
              data_type: dataTypeMap[field.dataType] || field.dataType.toUpperCase(),
              default_value: field.dataType === 'int' ? parseInt(field.defaultValue, 10) : field.defaultValue
            }))
          };
        }).filter((item): item is { source_name: string; fields: Array<{ field_name: string; data_type: string; default_value: string | number; }>; } => item !== null) // Remove null entries with type guard
      : [];

    // Map combineAs to operation
    // IMPORTANT: Distinguish between Union All (merge) and Union (union)
    const operationMap: Record<string, string> = {
      'merge': 'union_all',  // Union All (includes duplicates)
      'union': 'union',       // Union (removes duplicates)
      'intersect': 'intersect'
    };

    // Transform field mappings to the new format with pipe-separated source mappings
    const field_mappings = fieldMappings.map(mapping => {
      // Convert selectedColumns format from "sourceId::columnName" to "SourceName.columnName"
      const sourceMappings = mapping.selectedColumns.map(colValue => {
        const [sourceId, columnName] = colValue.split('::');
        const source = availableSources.find(s => s.id === sourceId);
        const sourceName = source?.sourceName || sourceId;
        return `${sourceName}.${columnName}`;
      });

      return {
        field_name: mapping.fieldName,
        source_mappings: sourceMappings.join('|')
      };
    });

    // Calculate internalStepOrder: for new versions, it's currentVersionCount + 1
    // For editing, preserve the existing internalStepOrder
    const internalStepOrder = editingVersion
      ? ((editingVersion as any).internalStepOrder || currentVersionCount + 1)
      : currentVersionCount + 1;

    // Prepare version data in the required format
    const versionData = {
      stepOrder: 1,
      actionType: 'I',
      saveAsVersion: 1,
      versionName: versionName,
      internalStepOrder: internalStepOrder,
      configJson: {
        operation: operationMap[combineAs] || combineAs,
        combine_as: combineAs, // Store UI value to preserve exact state for edit mode
        input_sources,
        added_fields,
        field_mappings,
        merge_keys: orderedSelectedHeaders,
        priority_order: orderedSelectedHeaders
      }
    };

    console.log('');
    console.log('===============================================');
    console.log('📤 SAVING INPUT VERSION');
    console.log('===============================================');
    console.log('Version Name:', versionName);
    console.log('Selected Sources:', selectedSources);
    console.log('Selected Sources Details:', selectedSources.map(srcId => {
      const src = availableSources.find(s => s.id === srcId);
      return {
        id: srcId,
        name: src?.sourceName,
        type: src?.sourceType,
        headers: getSourceHeaders(src as any)
      };
    }));
    console.log('');
    console.log('Available Headers (before mapping):', availableHeaders);
    console.log('Selected Headers:', selectedHeaders);
    console.log('Ordered Headers:', orderedHeaders.filter(h => selectedHeaders.includes(h)));
    console.log('');
    console.log('Field Mappings (UI format):', fieldMappings.length > 0 ? fieldMappings : 'None');
    if (fieldMappings.length > 0) {
      fieldMappings.forEach((mapping, idx) => {
        console.log(`  Mapping ${idx + 1}:`, {
          fieldName: mapping.fieldName,
          selectedSources: mapping.selectedSources,
          selectedColumns: mapping.selectedColumns
        });
      });
    }
    console.log('');
    console.log('Field Mappings (API format):', field_mappings.length > 0 ? field_mappings : 'None');
    if (field_mappings.length > 0) {
      field_mappings.forEach((mapping, idx) => {
        console.log(`  Mapping ${idx + 1}:`, mapping);
      });
    }
    console.log('');
    console.log('Nested Fields:', nestedFields.length > 0 ? nestedFields : 'None');
    if (nestedFields.length > 0) {
      nestedFields.forEach((field, idx) => {
        console.log(`  Nested Field ${idx + 1}:`, {
          sourceId: field.sourceId,
          fieldName: field.fieldName,
          dataType: field.dataType,
          defaultValue: field.defaultValue
        });
      });
    }
    console.log('');
    console.log('Combine As:', combineAs);
    console.log('');
    console.log('Merge Keys:', orderedSelectedHeaders);
    console.log('Priority Order:', orderedSelectedHeaders);
    console.log('');
    console.log('Version Count:', currentVersionCount);
    console.log('Internal Step Order:', internalStepOrder);
    console.log('');
    console.log('📦 TRANSFORMED VERSION DATA:');
    console.log(JSON.stringify(versionData, null, 2));
    console.log('===============================================');
    console.log('');

    onSave(versionData);

    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const availableColumns = getAvailableColumns();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, minHeight: '60vh' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2.5,
          backgroundColor: '#F8FAFB',
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#2D3748' }}>
            {editingVersion ? 'Edit Input Version' : 'Create Input Version'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {editingVersion ? 'Modify the configuration of this input version' : 'Configure and combine input sources into a new version'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3, px: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Row 1: Input Sources */}
          <Box>
            {/* Input Sources Selection */}
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                Select Input Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  value={selectedSources}
                  onChange={handleSourcesChange}
                  input={<OutlinedInput />}
                  displayEmpty
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const source = filteredAvailableSources.find(s => s.id === value);
                        return (
                          <Chip
                            key={value}
                            label={source?.sourceName || value}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        );
                      })}
                    </Box>
                  )}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.15)',
                    },
                  }}
                >
                  {filteredAvailableSources.map((source) => {
                    const headers = getSourceHeaders(source);
                    return (
                      <MenuItem key={source.id} value={source.id}>
                        <Checkbox checked={selectedSources.indexOf(source.id) > -1} />
                        <ListItemText
                          primary={source.sourceName}
                          secondary={`${source.sourceType} - ${headers.length} columns`}
                        />
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Nested Fields Configuration Accordion */}
          <Accordion disabled={selectedSources.length === 0}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="nested-fields-content"
              id="nested-fields-header"
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                New Fields Configuration
                {nestedFields.length > 0 && (
                  <Chip
                    label={nestedFields.length}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 18,
                      fontSize: '0.65rem',
                      backgroundColor: '#10B981',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  />
                )}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Nested Field Form */}
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: '#FAFBFC',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#2D3748' }}>
                    {editingNestedFieldId ? 'Edit New Field' : 'Add New Field'}
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                    {/* Input Source Selection */}
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Input Source <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          value={nestedFieldSourceId}
                          onChange={(e) => setNestedFieldSourceId(e.target.value)}
                          displayEmpty
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(0, 0, 0, 0.15)',
                            },
                          }}
                        >
                          <MenuItem value="" disabled>
                            <em>Select input source...</em>
                          </MenuItem>
                          {availableSources.filter(s => selectedSources.includes(s.id)).map((source) => (
                            <MenuItem key={source.id} value={source.id}>
                              {source.sourceName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Field Name Input */}
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Field Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Enter field name..."
                        value={nestedFieldName}
                        onChange={(e) => setNestedFieldName(e.target.value)}
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                          },
                        }}
                      />
                    </Box>

                    {/* Data Type Selection */}
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Datatype <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          value={nestedFieldDataType}
                          onChange={(e) => setNestedFieldDataType(e.target.value as any)}
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(0, 0, 0, 0.15)',
                            },
                          }}
                        >
                          <MenuItem value="string">String</MenuItem>
                          <MenuItem value="int">Int</MenuItem>
                          <MenuItem value="date">Date</MenuItem>
                          <MenuItem value="datetime">DateTime</MenuItem>
                          <MenuItem value="boolean">Boolean</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Default Value Input */}
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Default Value <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Enter default value..."
                        value={nestedFieldDefaultValue}
                        onChange={(e) => setNestedFieldDefaultValue(e.target.value)}
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                          },
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Add/Save Nested Field Button */}
                  <Button
                    variant="contained"
                    onClick={handleAddNestedField}
                    disabled={!nestedFieldSourceId || !nestedFieldName.trim() || !nestedFieldDefaultValue.trim()}
                    startIcon={editingNestedFieldId ? <Save /> : <Add />}
                    size="small"
                    sx={{
                      textTransform: 'none',
                      backgroundColor: editingNestedFieldId ? '#F59E0B' : '#10B981',
                      '&:hover': {
                        backgroundColor: editingNestedFieldId ? '#D97706' : '#059669',
                      },
                    }}
                  >
                    {editingNestedFieldId ? 'Update New Field' : 'Add New Field'}
                  </Button>
                </Paper>

                {/* Current Nested Fields */}
                {nestedFields.length > 0 && (
                  <Paper sx={{ p: 2, backgroundColor: '#F9FAFB', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#2D3748' }}>
                      Current New Fields ({nestedFields.length})
                    </Typography>

                    <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead sx={{ backgroundColor: '#F8FAFB' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Input Source</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Field Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Datatype</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Default Value</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5, width: 100 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {nestedFields.map((field) => (
                            <TableRow key={field.id} sx={{ '&:hover': { backgroundColor: '#F8FAFB' } }}>
                              <TableCell sx={{ py: 1 }}>
                                <Chip
                                  label={getSourceName(field.sourceId)}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    backgroundColor: '#29669520',
                                    color: '#296695',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {field.fieldName}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Chip
                                  label={field.dataType}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    backgroundColor: '#6366F120',
                                    color: '#6366F1',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {field.defaultValue || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditNestedField(field)}
                                    sx={{ color: '#6366F1' }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteNestedField(field.id)}
                                    sx={{ color: '#EF4444' }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Paper>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Field Mapping Accordion */}
          <Accordion disabled={selectedSources.length === 0}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="field-mapping-content"
              id="field-mapping-header"
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Field Mapping Configuration
                {fieldMappings.length > 0 && (
                  <Chip
                    label={fieldMappings.length}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 18,
                      fontSize: '0.65rem',
                      backgroundColor: '#FCD34D',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  />
                )}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Mapping Form */}
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: '#FAFBFC',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#2D3748' }}>
                    {editingMappingId ? 'Edit Mapping' : 'Add New Mapping'}
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                    {/* Field Name Input */}
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Field Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Enter target field name..."
                        value={mappingFieldName}
                        onChange={(e) => setMappingFieldName(e.target.value)}
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                          },
                        }}
                      />
                    </Box>

                    {/* Sources Selection */}
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Select Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          multiple
                          value={mappingSelectedSources}
                          onChange={(e) => {
                            const value = typeof e.target.value === 'string' ? [e.target.value] : e.target.value;
                            setMappingSelectedSources(value);
                            setMappingSelectedColumns([]); // Reset columns when sources change
                          }}
                          input={<OutlinedInput />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip
                                  key={value}
                                  label={getSourceName(value)}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          )}
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(0, 0, 0, 0.15)',
                            },
                          }}
                        >
                          {availableSources.filter(s => selectedSources.includes(s.id)).map((source) => {
                            const headers = getSourceHeaders(source);
                            return (
                              <MenuItem key={source.id} value={source.id}>
                                <Checkbox checked={mappingSelectedSources.indexOf(source.id) > -1} />
                                <ListItemText
                                  primary={source.sourceName}
                                  secondary={`${source.sourceType} - ${headers.length} columns`}
                                />
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>

                  {/* Columns Selection */}
                  {mappingSelectedSources.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                        Select Columns <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          multiple
                          value={mappingSelectedColumns}
                          onChange={(e) => {
                            const value = typeof e.target.value === 'string' ? [e.target.value] : e.target.value;
                            setMappingSelectedColumns(value);
                          }}
                          input={<OutlinedInput />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.slice(0, 3).map((value) => {
                                const fieldName = value.includes('::') ? value.split('::')[1] : value;
                                const column = availableColumns.find(col => col.value === value);
                                return (
                                  <Chip
                                    key={value}
                                    label={column?.label || fieldName}
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                );
                              })}
                              {selected.length > 3 && (
                                <Chip
                                  label={`+${selected.length - 3}`}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    backgroundColor: '#F59E0B20',
                                    color: '#F59E0B',
                                  }}
                                />
                              )}
                            </Box>
                          )}
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(0, 0, 0, 0.15)',
                            },
                          }}
                        >
                          {availableColumns.map((column) => (
                            <MenuItem key={column.value} value={column.value}>
                              <Checkbox checked={mappingSelectedColumns.indexOf(column.value) > -1} />
                              <ListItemText primary={column.label} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* Add/Save Mapping Button */}
                  <Button
                    variant="contained"
                    onClick={handleAddMapping}
                    disabled={!mappingFieldName.trim() || mappingSelectedSources.length === 0 || mappingSelectedColumns.length === 0}
                    startIcon={editingMappingId ? <Save /> : <Add />}
                    size="small"
                    sx={{
                      textTransform: 'none',
                      backgroundColor: editingMappingId ? '#F59E0B' : '#10B981',
                      '&:hover': {
                        backgroundColor: editingMappingId ? '#D97706' : '#059669',
                      },
                    }}
                  >
                    {editingMappingId ? 'Update Mapping' : 'Add Mapping'}
                  </Button>
                </Paper>

                {/* Current Mappings */}
                {fieldMappings.length > 0 && (
                  <Paper sx={{ p: 2, backgroundColor: '#F9FAFB', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#2D3748' }}>
                      Current Mappings ({fieldMappings.length})
                    </Typography>
                    
                    <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead sx={{ backgroundColor: '#F8FAFB' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Field Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Sources</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Columns</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.5, width: 100 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fieldMappings.map((mapping) => (
                            <TableRow key={mapping.id} sx={{ '&:hover': { backgroundColor: '#F8FAFB' } }}>
                              <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {mapping.fieldName}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {mapping.selectedSources.map(sourceId => (
                                    <Chip
                                      key={sourceId}
                                      label={getSourceName(sourceId)}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: '#29669520',
                                        color: '#296695',
                                      }}
                                    />
                                  ))}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {mapping.selectedColumns.slice(0, 3).map(columnValue => {
                                    const fieldName = columnValue.includes('::') ? columnValue.split('::')[1] : columnValue;
                                    const column = availableColumns.find(col => col.value === columnValue);
                                    return (
                                      <Chip
                                        key={columnValue}
                                        label={column?.label || fieldName}
                                        size="small"
                                        sx={{
                                          height: 18,
                                          fontSize: '0.65rem',
                                          backgroundColor: '#10B98120',
                                          color: '#10B981',
                                        }}
                                      />
                                    );
                                  })}
                                  {mapping.selectedColumns.length > 3 && (
                                    <Chip
                                      label={`+${mapping.selectedColumns.length - 3}`}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        backgroundColor: '#F59E0B20',
                                        color: '#F59E0B',
                                      }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditMapping(mapping)}
                                    sx={{ color: '#6366F1' }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteMapping(mapping.id)}
                                    sx={{ color: '#EF4444' }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Paper>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Headers Selection */}
          {availableHeaders.length > 0 && (
            <Box key={`headers-box-${selectedSources.join('-')}-${availableHeaders.length}`}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
                Select Headers
              </Typography>
              {selectedSources.length > 1 && (
                <Alert
                  key={`alert-${selectedSources.length}-${availableHeaders.length}`}
                  severity="info"
                  sx={{ mb: 1, py: 0, fontSize: '0.75rem' }}
                >
                  Showing {availableHeaders.length} common field{availableHeaders.length !== 1 ? 's' : ''} found across all {selectedSources.length} selected sources
                </Alert>
              )}
              <FormControl fullWidth size="small">
                <Select
                  key={`select-headers-${selectedSources.join('-')}-${availableHeaders.length}`}
                  multiple
                  value={selectedHeaders}
                  onChange={handleHeadersChange}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  )}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.15)',
                    },
                  }}
                >
                  {availableHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      <Checkbox checked={selectedHeaders.indexOf(header) > -1} />
                      <ListItemText primary={header} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Fields Reordering */}
          {orderedHeaders.filter(h => selectedHeaders.includes(h)).length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Field Order (Drag to reorder)
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: '#F8FAFB', maxHeight: 200, overflowY: 'auto' }}>
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={orderedHeaders.filter(h => selectedHeaders.includes(h))}
                    strategy={verticalListSortingStrategy}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {orderedHeaders
                        .filter(h => selectedHeaders.includes(h))
                        .map((header) => (
                          <SortableHeaderItem
                            key={header}
                            id={header}
                            header={header}
                          />
                        ))}
                    </Box>
                  </SortableContext>
                </DndContext>
              </Paper>
            </Box>
          )}

          {/* Combine As Radio Buttons - Moved to the end */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.85rem' }}>
              Combine As <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <RadioGroup
              row
              value={combineAs}
              onChange={(e) => setCombineAs(e.target.value as any)}
              sx={{ gap: 2 }}
            >
              <FormControlLabel
                value="merge"
                control={<Radio size="small" />}
                label={<Typography variant="body2">Union All</Typography>}
              />
              <FormControlLabel
                value="union"
                control={<Radio size="small" />}
                label={<Typography variant="body2">Union</Typography>}
              />
              <FormControlLabel
                value="intersect"
                control={<Radio size="small" />}
                label={<Typography variant="body2">Intersect</Typography>}
              />
            </RadioGroup>
          </Box>

          {/* Version Name - Moved to the end */}
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.85rem' }}>
              Version Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <TextField
              label=""
              value={versionName}
              onChange={(e) => {
                setVersionName(e.target.value);
                setError(''); // Clear error when user types
              }}
              fullWidth
              size="small"
              placeholder="Enter name for this version"
              error={!!error && error.includes('already exists')}
              helperText={error && error.includes('already exists') ? error : ''}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          startIcon={<Close />}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<Save />}
          disabled={
            !versionName.trim() ||
            selectedSources.length < 1 ||
            (selectedHeaders.length === 0 && fieldMappings.length === 0)
          }
          sx={{ textTransform: 'none', boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)' }}
        >
          {editingVersion ? 'Save Changes' : 'Create Version'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InputVersionModal;