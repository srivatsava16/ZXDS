import { useState, useCallback, useEffect } from 'react';
import type { AppendConfig } from '../types';
import { nanoid } from 'nanoid';

export const useAppendConfig = (initialConfigs?: AppendConfig[]) => {
  const [configs, setConfigs] = useState<AppendConfig[]>(initialConfigs || []);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  // Sync configs when initialConfigs changes (for edit mode data loading)
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Current working config state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedAppendOnFields, setSelectedAppendOnFields] = useState<string[]>([]);
  const [selectedAppendSources, setSelectedAppendSources] = useState<string[]>([]);
  const [selectedAppendFields, setSelectedAppendFields] = useState<string[]>([]);

  const handleAddOrUpdateConfig = useCallback((fieldMappings?: any[], availableAppendSources?: any[], apiSources?: any) => {
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedAppendOnFields.length === 0) {
      alert('Please select at least one Append On field');
      return;
    }
    if (selectedAppendSources.length === 0) {
      alert('Please select at least one Append Source');
      return;
    }
    if (selectedAppendFields.length === 0) {
      alert('Please select at least one Append Field');
      return;
    }

    // Validation: Check if Fields to Append are compatible with Match Keys (Append On Fields)
    // The append sources must have the fields that can be used as match keys
    if (availableAppendSources && selectedAppendSources.length > 0) {
      const appendSourcesWithoutMatchKeys: string[] = [];

      selectedAppendSources.forEach(sourceId => {
        // Find the source
        let source = availableAppendSources.find((s: any) => s.id === sourceId);

        // If not found in available sources, check if it's a preconfigured source from API
        if (!source && apiSources?.dbSource?.preconfiguredTables?.append) {
          const preconfiguredSource = apiSources.dbSource.preconfiguredTables.append.find(
            (table: any) => `append_${table?.tableId}` === sourceId
          );
          if (preconfiguredSource) {
            source = {
              id: sourceId,
              sourceName: preconfiguredSource.tableName,
              headers: preconfiguredSource.columns || []
            };
          }
        }

        if (source) {
          const sourceHeaders = (source.selectedHeaders || source.headers || []).map((h: string) => h.toLowerCase());
          const missingFields = selectedAppendOnFields.filter(
            field => !sourceHeaders.includes(field.toLowerCase())
          );

          if (missingFields.length > 0) {
            appendSourcesWithoutMatchKeys.push(
              `${source.sourceName || sourceId} (missing: ${missingFields.join(', ')})`
            );
          }
        }
      });

      if (appendSourcesWithoutMatchKeys.length > 0) {
        alert(
          `Validation Error: The following append sources do not have all the required match key fields:\n\n${appendSourcesWithoutMatchKeys.join('\n')}\n\nThe Fields to Append must be compatible with the selected Match Keys (Append On Fields).`
        );
        return;
      }
    }

    if (editingConfigId) {
      // Update existing config
      const updatedConfig = {
        id: editingConfigId,
        inputSources: selectedInputSources,
        appendOnFields: selectedAppendOnFields,
        appendSources: selectedAppendSources,
        appendFields: selectedAppendFields,
        fieldMappings: fieldMappings || undefined,
      };

      setConfigs(configs.map(config =>
        config.id === editingConfigId ? updatedConfig : config
      ));

      setEditingConfigId(null);
    } else {
      // Add new config
      const newConfig: AppendConfig = {
        id: nanoid(),
        inputSources: selectedInputSources,
        appendOnFields: selectedAppendOnFields,
        appendSources: selectedAppendSources,
        appendFields: selectedAppendFields,
        fieldMappings: fieldMappings || undefined,
        createdAt: Date.now(), // Add timestamp for creation order
      };

      setConfigs([...configs, newConfig]);
    }

    // Reset form
    setSelectedInputSources([]);
    setSelectedAppendOnFields([]);
    setSelectedAppendSources([]);
    setSelectedAppendFields([]);
  }, [
    selectedInputSources,
    selectedAppendOnFields,
    selectedAppendSources,
    selectedAppendFields,
    editingConfigId,
    configs
  ]);

  const handleEditConfig = useCallback((config: AppendConfig) => {
    setEditingConfigId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedAppendOnFields(config.appendOnFields);
    setSelectedAppendSources(config.appendSources);
    setSelectedAppendFields(config.appendFields);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingConfigId(null);
    setSelectedInputSources([]);
    setSelectedAppendOnFields([]);
    setSelectedAppendSources([]);
    setSelectedAppendFields([]);
  }, []);

  const handleDeleteConfig = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this append configuration?')) {
      setConfigs(configs.filter(c => c.id !== id));
      if (editingConfigId === id) {
        handleCancelEdit();
      }
    }
  }, [configs, editingConfigId, handleCancelEdit]);

  return {
    // State
    configs,
    editingConfigId,
    selectedInputSources,
    selectedAppendOnFields,
    selectedAppendSources,
    selectedAppendFields,

    // Setters
    setConfigs,
    setSelectedInputSources,
    setSelectedAppendOnFields,
    setSelectedAppendSources,
    setSelectedAppendFields,

    // Handlers
    handleAddOrUpdateConfig,
    handleEditConfig,
    handleCancelEdit,
    handleDeleteConfig,
  };
};
