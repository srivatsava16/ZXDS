import type { InputSource } from '../../InputModule/InputModule';
import type { RequestInputsResponse } from '../../../services/api';
import type { PredefinedSource } from '../types';

/**
 * Get predefined match sources from API or fallback to default
 */
export const getPredefinedSources = (apiSources?: RequestInputsResponse | null): PredefinedSource[] => {
  const matchSources = apiSources?.dbSource?.preconfiguredTables?.match ?? [];
  return matchSources
    .filter(table => table && typeof table === 'object' && table?.tableName) // Ensure it's a valid table object
    .map((table) => ({
      id: `match_${table?.tableId}`,
      name: table?.tableName,
      description: table?.description
    }));
};

/**
 * Get common or all fields based on input source selection, with field mappings applied
 */
export const getMatchOnFields = (
  sourceIds: string[],
  availableInputSources: InputSource[],
  fieldMappings?: Array<{ id: string; fieldName: string; selectedSources: string[]; selectedColumns: string[] }>
): string[] => {
  if (sourceIds.length === 0) return [];

  const selectedSources = availableInputSources.filter(src => sourceIds.includes(src.id));
  if (selectedSources.length === 0) return [];

  // Build a map of original field -> mapped field name (or original if no mapping)
  const fieldsMap = new Map<string, string>();

  selectedSources.forEach(source => {
    const headers = source?.selectedHeaders ?? source?.headers ?? [];

    headers.forEach(field => {
      const sourceFieldKey = `${source.id}::${field}`;

      // Check if this field has a mapping
      const mapping = fieldMappings?.find(m => {
        return m.selectedColumns.some(col => {
          const [colSourceId, colFieldName] = col.split('::');
          return colSourceId === source.id && colFieldName === field;
        });
      });

      if (mapping) {
        // Use the mapped field name
        fieldsMap.set(sourceFieldKey, mapping.fieldName);
      } else {
        // Use the original field name
        fieldsMap.set(sourceFieldKey, field);
      }
    });
  });

  // If only one source selected, return all its fields (mapped or original)
  if (selectedSources.length === 1) {
    return Array.from(fieldsMap.values());
  }

  // If multiple sources, return common fields (intersection) - considering mapped names (case-insensitive)
  // Group fields by their display name (mapped or original), using lowercase for comparison
  const fieldNameOccurrences = new Map<string, number>();
  const fieldNameCasing = new Map<string, string>(); // Track original casing

  fieldsMap.forEach((displayName) => {
    const displayNameLower = displayName.toLowerCase();
    fieldNameOccurrences.set(displayNameLower, (fieldNameOccurrences.get(displayNameLower) || 0) + 1);

    // Preserve the casing from the first occurrence
    if (!fieldNameCasing.has(displayNameLower)) {
      fieldNameCasing.set(displayNameLower, displayName);
    }
  });

  // Return fields that appear in all sources (case-insensitive), preserving original casing
  const commonFields: string[] = [];
  fieldNameOccurrences.forEach((count, fieldNameLower) => {
    if (count === selectedSources.length) {
      commonFields.push(fieldNameCasing.get(fieldNameLower) || fieldNameLower);
    }
  });

  return commonFields;
};

/**
 * Get union of all fields from selected match sources
 */
export const getAddFieldsFromMatchSources = (
  matchSourceIds: string[],
  customMatchSources: InputSource[],
  availableInputSources: InputSource[],
  apiSources?: RequestInputsResponse | null
): string[] => {
  const fieldsSet = new Set<string>();

  matchSourceIds.forEach(id => {
    // Check if it's a predefined match source (from API)
    if (id.startsWith('match_')) {
      const tableId = parseInt(id.replace('match_', ''));
      const matchTable = apiSources?.dbSource?.preconfiguredTables?.match?.find(
        table => table.tableId === tableId
      );
      if (matchTable?.columns) {
        matchTable.columns.forEach(col => fieldsSet.add(col.name));
      }
    } else {
      // Check if it's a custom match source
      const customSource = customMatchSources.find(src => src?.id === id);
      if (customSource?.selectedHeaders ?? customSource?.headers) {
        (customSource?.selectedHeaders ?? customSource?.headers ?? []).forEach(field => fieldsSet.add(field));
      } else {
        // Check if it's a versioned source
        const versionedSource = availableInputSources.find(src => src?.id === id);
        if (versionedSource?.selectedHeaders ?? versionedSource?.headers) {
          (versionedSource?.selectedHeaders ?? versionedSource?.headers ?? []).forEach(field => fieldsSet.add(field));
        }
      }
    }
  });

  return Array.from(fieldsSet);
};
