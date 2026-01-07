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
 * Get common or all fields based on input source selection
 */
export const getMatchOnFields = (sourceIds: string[], availableInputSources: InputSource[]): string[] => {
  if (sourceIds.length === 0) return [];

  const selectedSources = availableInputSources.filter(src => sourceIds.includes(src.id));
  if (selectedSources.length === 0) return [];

  // If only one source selected, return all its fields
  if (selectedSources.length === 1) {
    const headers = selectedSources[0]?.selectedHeaders ?? selectedSources[0]?.headers ?? [];
    return headers;
  }

  // If multiple sources, return common fields (intersection)
  const firstSourceHeaders = selectedSources[0]?.selectedHeaders ?? selectedSources[0]?.headers ?? [];
  const commonHeaders = firstSourceHeaders.filter(header =>
    selectedSources.every(src => (src?.selectedHeaders ?? src?.headers)?.includes(header))
  );
  return commonHeaders;
};

/**
 * Get union of all fields from selected match sources
 */
export const getAddFieldsFromMatchSources = (
  matchSourceIds: string[],
  customMatchSources: InputSource[],
  availableInputSources: InputSource[]
): string[] => {
  const fieldsSet = new Set<string>();

  matchSourceIds.forEach(id => {
    // Check if it's a custom match source
    const customSource = customMatchSources.find(src => src?.id === id);
    if (customSource?.selectedHeaders ?? customSource?.headers) {
      (customSource?.selectedHeaders ?? customSource?.headers ?? []).forEach(field => fieldsSet.add(field));
    } else {
      // Check if it's a versioned source
      const versionedSource = availableInputSources.find(src => src?.id === id);
      if (versionedSource?.selectedHeaders ?? versionedSource?.headers) {
        (versionedSource?.selectedHeaders ?? versionedSource?.headers ?? []).forEach(field => fieldsSet.add(field));
      } else {
        // For predefined sources, no fields available without API data
      }
    }
  });

  return Array.from(fieldsSet);
};
