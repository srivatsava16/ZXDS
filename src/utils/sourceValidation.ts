/**
 * Centralized source validation utilities
 * Ensures unique source names across all modules (Input, Append, Match, Suppress)
 */

import type { InputSource } from '../components/InputModule/InputModule';
import type { RequestInputsResponse } from '../services/api';

export interface SourceNameValidationOptions {
  /** The name to validate */
  sourceName: string;
  /** All existing sources from all modules */
  allExistingSources: InputSource[];
  /** ID of the source being edited (to exclude from duplicate check) */
  editingSourceId?: string;
  /** Module name for error message context */
  moduleName?: string;
  /** API response data to check against file sources and table names */
  apiSources?: RequestInputsResponse | null;
}

/**
 * Extracts all reserved names from API response (file sources and table names)
 * @param apiSources API response data
 * @returns Array of reserved names in lowercase
 */
export const getReservedNamesFromAPI = (apiSources: RequestInputsResponse | null | undefined): string[] => {
  if (!apiSources) return [];

  const reservedNames: string[] = [];

  // Extract file source names
  if (apiSources?.fileSource) {
    // SFTP sources
    if (apiSources?.fileSource?.sftpSources) {
      apiSources?.fileSource?.sftpSources?.forEach(source => {
        if (source?.name) {
          reservedNames?.push(source?.name?.trim()?.toLowerCase());
        }
      });
    }

    // AWS sources
    if (apiSources?.fileSource?.awsSources) {
      apiSources?.fileSource?.awsSources?.forEach(source => {
        if (source?.name) {
          reservedNames?.push(source?.name?.trim()?.toLowerCase());
        }
      });
    }

    // NFS sources
    if (apiSources?.fileSource?.nfsSources) {
      apiSources?.fileSource?.nfsSources?.forEach(source => {
        if (source?.name) {
          reservedNames?.push(source?.name?.trim()?.toLowerCase());
        }
      });
    }
  }

  // Extract table names from preconfigured tables
  if (apiSources?.dbSource?.preconfiguredTables) {
    const tables = apiSources?.dbSource?.preconfiguredTables;

    // Input tables
    if (tables?.input) {
      tables?.input?.forEach(table => {
        if (table?.tableName) {
          reservedNames?.push(table?.tableName?.trim()?.toLowerCase());
        }
      });
    }

    // Append tables
    if (tables?.append) {
      tables?.append?.forEach(table => {
        if (table?.tableName) {
          reservedNames?.push(table?.tableName?.trim()?.toLowerCase());
        }
      });
    }

    // Match tables
    if (tables?.match) {
      tables?.match?.forEach(table => {
        if (table?.tableName) {
          reservedNames?.push(table?.tableName?.trim()?.toLowerCase());
        }
      });
    }

    // Suppress tables
    if (tables?.suppress) {
      tables?.suppress?.forEach(table => {
        if (table?.tableName) {
          reservedNames?.push(table?.tableName?.trim()?.toLowerCase());
        }
      });
    }
  }

  // Remove duplicates
  return [...new Set(reservedNames)];
};

/**
 * Validates that a source name is unique across all modules
 * @param options Validation options
 * @returns Error message if validation fails, empty string if valid
 */
export const validateUniqueSourceName = (options: SourceNameValidationOptions): string => {
  const { sourceName, allExistingSources, editingSourceId, moduleName = 'Source', apiSources } = options;

  // Check if name is empty
  if (!sourceName || !sourceName?.trim()) {
    return 'Source Name is required';
  }

  const trimmedName = sourceName?.trim()?.toLowerCase();

  // Check against API reserved names (file sources and table names)
  const reservedNames = getReservedNamesFromAPI(apiSources);
  if (reservedNames?.includes(trimmedName)) {
    return `Source name "${sourceName}" conflicts with an existing file source or database table name. Please choose a different name.`;
  }

  // Check for duplicates across all sources (case-insensitive)
  const duplicateSource = allExistingSources?.find(source => {
    // Skip the source being edited
    if (editingSourceId && source?.id === editingSourceId) {
      return false;
    }

    // Check if names match (case-insensitive)
    return source?.sourceName?.trim()?.toLowerCase() === trimmedName;
  });

  if (duplicateSource) {
    // Determine which module the duplicate is from
    let sourceModule = 'another module';

    // Check if it has createdByModuleId to determine the module
    const moduleId = (duplicateSource as any)?.createdByModuleId;
    if (moduleId) {
      sourceModule = `${moduleId} module`;
    } else if (duplicateSource?.sourceType === 'Version') {
      sourceModule = 'Input module (as a version)';
    } else if (duplicateSource?.sourceType === 'File' || duplicateSource?.sourceType === 'Database' || duplicateSource?.sourceType === 'Self') {
      sourceModule = 'Input module';
    }

    return `Source name "${sourceName}" already exists in ${sourceModule}. Please choose a unique name.`;
  }

  return '';
};

/**
 * Collects all sources from input sources and shared custom sources
 * @param inputSources Sources from the Input module
 * @param sharedCustomSources Shared custom sources across Append/Match/Suppress
 * @returns Combined array of all sources
 */
export const collectAllSources = (
  inputSources: InputSource[],
  sharedCustomSources: InputSource[]
): InputSource[] => {
  const allSources: InputSource[] = [];
  const seenIds = new Set<string>();

  // Add all input sources
  inputSources?.forEach(source => {
    if (!seenIds?.has(source?.id)) {
      allSources?.push(source);
      seenIds?.add(source?.id);
    }
  });

  // Add all shared custom sources
  sharedCustomSources?.forEach(source => {
    if (!seenIds?.has(source?.id)) {
      allSources?.push(source);
      seenIds?.add(source?.id);
    }
  });

  return allSources;
};

/**
 * Interface for field name validation options
 */
export interface FieldNameValidationOptions {
  /** The field name to validate */
  fieldName: string;
  /** All existing field names to check against */
  existingFieldNames: string[];
  /** ID of the field being edited (to exclude from duplicate check) */
  editingFieldId?: string;
  /** Context for error message (e.g., "nested field", "field mapping") */
  fieldContext?: string;
}

/**
 * Validates that a field name is unique (case-insensitive)
 * @param options Validation options
 * @returns Error message if validation fails, empty string if valid
 */
export const validateUniqueFieldName = (options: FieldNameValidationOptions): string => {
  const { fieldName, existingFieldNames, editingFieldId, fieldContext = 'Field' } = options;

  // Check if name is empty
  if (!fieldName || !fieldName?.trim()) {
    return `${fieldContext} name is required`;
  }

  const trimmedName = fieldName?.trim()?.toLowerCase();

  // Check for duplicates (case-insensitive)
  const hasDuplicate = existingFieldNames?.some(existingName =>
    existingName?.trim()?.toLowerCase() === trimmedName
  );

  if (hasDuplicate) {
    return `${fieldContext} name "${fieldName}" already exists. Please choose a unique name.`;
  }

  return '';
};

/**
 * Interface for mapping field items (used in various modules)
 */
export interface MappingFieldItem {
  id: string;
  fieldName: string;
  [key: string]: any;
}

/**
 * Validates field mappings for case-insensitive duplicate field names
 * @param fieldName The new field name to validate
 * @param existingMappings Existing mapping items
 * @param editingId Optional ID of the mapping being edited
 * @param context Context for error message (e.g., "field mapping", "nested field")
 * @returns Error message if validation fails, empty string if valid
 */
export const validateMappingFieldName = (
  fieldName: string,
  existingMappings: MappingFieldItem[],
  editingId?: string | null,
  context: string = 'Field'
): string => {
  if (!fieldName || !fieldName?.trim()) {
    return `${context} name is required`;
  }

  const trimmedName = fieldName?.trim()?.toLowerCase();

  // Check for duplicates, excluding the field being edited
  const duplicate = existingMappings?.find(
    mapping =>
      mapping?.fieldName?.trim()?.toLowerCase() === trimmedName &&
      (!editingId || mapping?.id !== editingId)
  );

  if (duplicate) {
    return `${context} name "${fieldName}" already exists. Please choose a unique name.`;
  }

  return '';
};
