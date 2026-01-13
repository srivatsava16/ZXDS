/**
 * Centralized source validation utilities
 * Ensures unique source names across all modules (Input, Append, Match, Suppress)
 */

import type { InputSource } from '../components/InputModule/InputModule';

export interface SourceNameValidationOptions {
  /** The name to validate */
  sourceName: string;
  /** All existing sources from all modules */
  allExistingSources: InputSource[];
  /** ID of the source being edited (to exclude from duplicate check) */
  editingSourceId?: string;
  /** Module name for error message context */
  moduleName?: string;
}

/**
 * Validates that a source name is unique across all modules
 * @param options Validation options
 * @returns Error message if validation fails, empty string if valid
 */
export const validateUniqueSourceName = (options: SourceNameValidationOptions): string => {
  const { sourceName, allExistingSources, editingSourceId, moduleName = 'Source' } = options;

  // Check if name is empty
  if (!sourceName || !sourceName.trim()) {
    return 'Source Name is required';
  }

  const trimmedName = sourceName.trim().toLowerCase();

  // Check for duplicates across all sources (case-insensitive)
  const duplicateSource = allExistingSources.find(source => {
    // Skip the source being edited
    if (editingSourceId && source.id === editingSourceId) {
      return false;
    }

    // Check if names match (case-insensitive)
    return source.sourceName.trim().toLowerCase() === trimmedName;
  });

  if (duplicateSource) {
    // Determine which module the duplicate is from
    let sourceModule = 'another module';

    // Check if it has createdByModuleId to determine the module
    const moduleId = (duplicateSource as any).createdByModuleId;
    if (moduleId) {
      sourceModule = `${moduleId} module`;
    } else if (duplicateSource.sourceType === 'Version') {
      sourceModule = 'Input module (as a version)';
    } else if (duplicateSource.sourceType === 'File' || duplicateSource.sourceType === 'Database' || duplicateSource.sourceType === 'Self') {
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
  inputSources.forEach(source => {
    if (!seenIds.has(source.id)) {
      allSources.push(source);
      seenIds.add(source.id);
    }
  });

  // Add all shared custom sources
  sharedCustomSources.forEach(source => {
    if (!seenIds.has(source.id)) {
      allSources.push(source);
      seenIds.add(source.id);
    }
  });

  return allSources;
};
