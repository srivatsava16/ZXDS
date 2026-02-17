import type { InputSource } from '../../InputModule/InputModule';
import type { RequestInputsResponse } from '../../../services/api';
import type { PredefinedSource } from '../types';

interface AppendConfig {
  id: string;
  inputSources: string[];
  appendFields?: string[];
}

/**
 * Helper to get all fields for a source (original + appended fields from UPSTREAM modules only)
 */
const getSourceFieldsWithAppends = (
  source: InputSource,
  appendConfigurations: AppendConfig[],
  availableInputSources: InputSource[],
  modules?: Array<{ id: string; type: string }>,
  currentModuleId?: string
): string[] => {
  // Start with original headers
  const originalHeaders = source.selectedHeaders || source.headers || [];
  const allFields = new Set<string>(originalHeaders);

  // Find current module index for filtering
  const currentModuleIndex = modules?.findIndex(m => m?.id === currentModuleId) ?? -1;

  console.log(`[match-filter] MatchModule ${currentModuleId} (index: ${currentModuleIndex}) - Computing fields for source: ${source?.sourceName}`);

  // Filter to only UPSTREAM append configurations
  const upstreamAppendConfigs = appendConfigurations?.filter(config => {
    const configModuleId = (config as any)?.createdByModuleId;
    const configModuleIndex = modules?.findIndex(m => m?.id === configModuleId) ?? -1;
    // Include only if the config's module appears BEFORE the current module
    const isUpstream = configModuleIndex !== -1 && configModuleIndex < currentModuleIndex;
    console.log(`[match-filter] Append config from module ${configModuleId} (index: ${configModuleIndex}), is upstream: ${isUpstream}`);
    return isUpstream;
  });

  console.log(`[match-filter] Total append configs: ${appendConfigurations?.length}, Upstream configs: ${upstreamAppendConfigs?.length}`);

  // Find all append configurations where this source is an input source
  upstreamAppendConfigs?.forEach(config => {
    // Check if this source is one of the input sources for this append config
    const isInputSource = config?.inputSources?.some(inputSourceId => {
      const inputSource = availableInputSources?.find(s => s?.id === inputSourceId);
      return inputSource?.sourceName === source?.sourceName || inputSource?.id === source?.id;
    });

    // If this source is used in the append config, add the appended fields
    if (isInputSource && config?.appendFields) {
      config?.appendFields?.forEach(field => allFields.add(field));
    }
  });

  return Array.from(allFields);
};

/**
 * Get predefined match sources from API or fallback to default
 */
export const getPredefinedSources = (apiSources?: RequestInputsResponse | null): PredefinedSource[] => {
  const matchSources = apiSources?.dbSource?.preconfiguredTables?.match ?? [];
  return matchSources
    ?.filter(table => table && typeof table === 'object' && table?.tableName) // Ensure it's a valid table object
    ?.map((table) => ({
      id: `match_${table?.tableId}`,
      name: table?.tableName,
      description: table?.description,
      fields: table?.columns?.map((col: any) => col?.name || col) || []
    }));
};

/**
 * Get common or all fields based on input source selection, with field mappings applied
 */
export const getMatchOnFields = (
  sourceIds: string[],
  availableInputSources: InputSource[],
  fieldMappings?: Array<{ id: string; fieldName: string; selectedSources: string[]; selectedColumns: string[] }>,
  appendConfigurations: AppendConfig[] = [],
  modules?: Array<{ id: string; type: string }>,
  currentModuleId?: string
): string[] => {
  if (sourceIds?.length === 0) return [];

  const selectedSources = availableInputSources?.filter(src => sourceIds?.includes(src?.id));
  if (selectedSources?.length === 0) return [];

  // Build a map of original field -> mapped field name (or original if no mapping)
  const fieldsMap = new Map<string, string>();

  selectedSources?.forEach(source => {
    const headers = getSourceFieldsWithAppends(source, appendConfigurations, availableInputSources, modules, currentModuleId); // Include appended fields from UPSTREAM modules only

    headers?.forEach(field => {
      const sourceFieldKey = `${source?.id}::${field}`;

      // Check if this field has a mapping
      const mapping = fieldMappings?.find(m => {
        return m?.selectedColumns?.some(col => {
          const [colSourceId, colFieldName] = col?.split('::');
          return colSourceId === source?.id && colFieldName === field;
        });
      });

      if (mapping) {
        // Use the mapped field name
        fieldsMap.set(sourceFieldKey, mapping?.fieldName);
      } else {
        // Use the original field name
        fieldsMap.set(sourceFieldKey, field);
      }
    });
  });

  // If only one source selected, return all its fields (mapped or original)
  if (selectedSources?.length === 1) {
    return Array.from(fieldsMap?.values());
  }

  // If multiple sources, return common fields (intersection) - considering mapped names (case-insensitive)
  // Group fields by their display name (mapped or original), using lowercase for comparison
  const fieldNameOccurrences = new Map<string, number>();
  const fieldNameCasing = new Map<string, string>(); // Track original casing

  fieldsMap?.forEach((displayName) => {
    const displayNameLower = displayName?.toLowerCase();
    fieldNameOccurrences.set(displayNameLower, (fieldNameOccurrences?.get(displayNameLower) || 0) + 1);

    // Preserve the casing from the first occurrence
    if (!fieldNameCasing?.has(displayNameLower)) {
      fieldNameCasing.set(displayNameLower, displayName);
    }
  });

  // Return fields that appear in all sources (case-insensitive), preserving original casing
  const commonFields: string[] = [];
  fieldNameOccurrences?.forEach((count, fieldNameLower) => {
    if (count === selectedSources?.length) {
      commonFields?.push(fieldNameCasing?.get(fieldNameLower) || fieldNameLower);
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
  // If no match sources selected, return empty array
  if (!matchSourceIds || matchSourceIds?.length === 0) return [];

  // Helper function to get fields from a single match source
  const getFieldsFromSource = (id: string): string[] => {
    const idStr = String(id || '');

    // Check if it's a predefined match source (from API)
    if (idStr?.startsWith('match_')) {
      const tableId = parseInt(idStr?.replace('match_', ''));
      const matchTable = apiSources?.dbSource?.preconfiguredTables?.match?.find(
        table => table?.tableId === tableId
      );
      return matchTable?.columns?.map(col => col?.name) || [];
    } else {
      // Check if it's a custom match source
      const customSource = customMatchSources?.find(src => src?.id === id);
      if (customSource) {
        return customSource?.selectedHeaders ?? customSource?.headers ?? [];
      } else {
        // Check if it's a versioned source
        const versionedSource = availableInputSources?.find(src => src?.id === id);
        return versionedSource?.selectedHeaders ?? versionedSource?.headers ?? [];
      }
    }
  };

  // Get fields from all match sources
  const allSourceFields: string[][] = matchSourceIds?.map(id => getFieldsFromSource(id));

  // Filter out empty arrays
  const validSourceFields = allSourceFields?.filter(fields => fields && fields?.length > 0);

  // If no valid sources, return empty
  if (validSourceFields?.length === 0) return [];

  // If only one source, return all its fields
  if (validSourceFields?.length === 1) {
    return validSourceFields[0];
  }

  // If multiple sources, return common fields (intersection) - case-insensitive
  const fieldNameOccurrences = new Map<string, number>();
  const fieldNameCasing = new Map<string, string>(); // Track original casing

  validSourceFields?.forEach(fields => {
    const uniqueFieldsInSource = new Set<string>();

    fields?.forEach(field => {
      const fieldLower = field?.toLowerCase();
      uniqueFieldsInSource?.add(fieldLower);

      // Preserve the casing from the first occurrence
      if (!fieldNameCasing?.has(fieldLower)) {
        fieldNameCasing?.set(fieldLower, field);
      }
    });

    // Increment count for each unique field in this source
    uniqueFieldsInSource?.forEach(fieldLower => {
      fieldNameOccurrences?.set(fieldLower, (fieldNameOccurrences?.get(fieldLower) || 0) + 1);
    });
  });

  // Return fields that appear in ALL sources (case-insensitive), preserving original casing
  const commonFields: string[] = [];
  fieldNameOccurrences?.forEach((count, fieldLower) => {
    if (count === validSourceFields?.length) {
      commonFields?.push(fieldNameCasing?.get(fieldLower) || fieldLower);
    }
  });

  return commonFields;
};
