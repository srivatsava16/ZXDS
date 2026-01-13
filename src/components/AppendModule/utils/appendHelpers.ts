import type { InputSource } from '../../InputModule/InputModule';
import type { RequestInputsResponse } from '../../../services/api';
import type { PredefinedSource } from '../types';

/**
 * Get predefined append sources from API or fallback to default
 */
export const getPredefinedSources = (apiSources?: RequestInputsResponse | null): PredefinedSource[] => {
  const appendSources = apiSources?.dbSource?.preconfiguredTables?.append || [];
  return appendSources
    .filter(table => table && typeof table === 'object' && table.tableName) // Ensure it's a valid table object
    .map((table) => ({
      id: `append_${table.tableId}`,
      name: table.tableName,
      description: table.description,
      fields: table.columns?.map(col => col.name) || []
    }));
};

/**
 * Get common or all fields based on input source selection
 */
export const getAppendOnFields = (sourceIds: string[], availableInputSources: InputSource[]): string[] => {
  if (sourceIds.length === 0) return [];

  const selectedSources = availableInputSources.filter(src => sourceIds.includes(src.id));

  if (selectedSources.length === 0) return [];

  // If only one source selected, return all its fields
  if (selectedSources.length === 1) {
    const headers = selectedSources[0]?.selectedHeaders || selectedSources[0]?.headers || [];
    return headers;
  }

  // If multiple sources, return common fields (intersection - case-insensitive)
  const firstSourceHeaders = selectedSources[0]?.selectedHeaders || selectedSources[0]?.headers || [];

  // Create case-insensitive maps for each source (lowercase -> original casing)
  const sourceHeaderMaps = selectedSources.map(src => {
    const headers = src?.selectedHeaders || src?.headers || [];
    const headerMap = new Map<string, string>();
    headers.forEach(header => {
      headerMap.set(header.toLowerCase(), header);
    });
    return headerMap;
  });

  // Filter headers that exist in all sources (case-insensitive), preserving first source's casing
  const commonHeaders = firstSourceHeaders.filter(header => {
    const headerLower = header.toLowerCase();
    return sourceHeaderMaps.every(map => map.has(headerLower));
  });

  return commonHeaders;
};

/**
 * Get union of all append fields
 */
export const getAppendFields = (
  appendSourceIds: string[],
  predefinedSources: PredefinedSource[],
  customAppendSources: InputSource[],
  availableInputSources: InputSource[]
): string[] => {
  const fieldsSet = new Set<string>();

  appendSourceIds.forEach(id => {
    const predefined = predefinedSources.find(src => src.id === id);
    if (predefined) {
      predefined.fields.forEach(field => fieldsSet.add(field));
    } else {
      // Check custom sources
      const customSource = customAppendSources.find(src => src.id === id);
      if (customSource?.selectedHeaders || customSource?.headers) {
        (customSource.selectedHeaders || customSource.headers || []).forEach(field => fieldsSet.add(field));
      } else {
        // Check versioned sources
        const versionedSource = availableInputSources.find(src => src.id === id);
        if (versionedSource?.selectedHeaders || versionedSource?.headers) {
          (versionedSource.selectedHeaders || versionedSource.headers || []).forEach(field => fieldsSet.add(field));
        }
      }
    }
  });

  return Array.from(fieldsSet);
};
