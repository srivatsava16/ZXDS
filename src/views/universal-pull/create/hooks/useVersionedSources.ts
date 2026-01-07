import { useState, useCallback } from 'react';
import type { InputSource } from '../../../../components/InputModule/InputModule';
import type { VersionedSource } from '../types';

export const useVersionedSources = () => {
  const [versionedSources, setVersionedSources] = useState<VersionedSource[]>([]);
  const [versionCounters, setVersionCounters] = useState({
    Input: 0,
    Match: 0,
    Append: 0,
    Suppress: 0,
  });

  const getSourceNameById = useCallback((sourceId: string, inputSources: InputSource[]): string => {
    // Check in regular input sources
    const inputSource = inputSources.find(s => s?.id === sourceId);
    if (inputSource) return inputSource?.sourceName;

    // Check in versioned sources
    const versionedSource = versionedSources.find(s => s?.id === sourceId);
    if (versionedSource) return versionedSource?.sourceName;

    return sourceId; // fallback
  }, [versionedSources]);

  const handleCreateVersionedSource = useCallback((
    sourceModule: 'Match' | 'Append' | 'Suppress',
    moduleId: string,
    baseInputSources: string[],
    operationSources: string[],
    operationFields: string[] | undefined,
    allAvailableInputSources: InputSource[],
    onSuccess?: (newVersions: VersionedSource[]) => void,
    onError?: (message: string) => void
  ) => {
    // Validation: Must have at least one input source and one operation source
    if (baseInputSources.length === 0) {
      onError?.('Please select at least one Input Source before creating versions.');
      return;
    }
    if (operationSources.length === 0) {
      onError?.('Please select at least one Operation Source before creating versions.');
      return;
    }

    // Generate n × m combinations
    const newVersions: VersionedSource[] = [];

    // For each input source
    baseInputSources.forEach(inputSourceId => {
      const inputSource = allAvailableInputSources.find(s => s.id === inputSourceId);
      if (!inputSource) return;

      // For each operation source
      operationSources.forEach(operationSourceId => {
        const operationSourceName = getSourceNameById(operationSourceId, allAvailableInputSources);

        // Build distinct version name with module prefix
        const moduleVersionCount = versionCounters[sourceModule] + 1;
        let versionName: string;
        if (inputSource.isVersioned) {
          // Input is already versioned, append the operation module
          versionName = `${inputSource.sourceName}_${sourceModule}_v${moduleVersionCount}`;
        } else {
          // Input is a regular source
          versionName = `${sourceModule}_${inputSource.sourceName}_${operationSourceName}_v${moduleVersionCount}`;
        }

        // Get headers from input source
        const combinedHeaders = inputSource.headers || [];

        // Create the versioned source
        const versionedSource: VersionedSource = {
          id: `versioned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isVersioned: true,
          versionNumber: versionedSources.length + newVersions.length + 1,
          versionLabel: versionName,
          sourceName: versionName,
          sourceModule,
          createdByModuleId: moduleId,
          baseInputSources: [inputSourceId],
          operationSources: [operationSourceId],
          operationFields,
          combinedHeaders,
          sourceType: 'Self',
          subSourceType: 'Versioned',
          headers: combinedHeaders,
        };

        newVersions.push(versionedSource);
      });
    });

    // Update version counter for this module
    setVersionCounters(prev => ({
      ...prev,
      [sourceModule]: prev[sourceModule] + newVersions.length
    }));

    // Add all new versions to the list
    setVersionedSources(prev => [...prev, ...newVersions]);

    // Call success callback with new versions
    onSuccess?.(newVersions);
  }, [versionedSources, versionCounters, getSourceNameById]);

  const updateVersionName = useCallback((versionId: string, newName: string) => {
    setVersionedSources(prev => prev.map(source =>
      source?.id === versionId ? { ...source, sourceName: newName } : source
    ));
  }, []);

  return {
    versionedSources,
    setVersionedSources,
    handleCreateVersionedSource,
    updateVersionName,
    getSourceNameById,
  };
};
