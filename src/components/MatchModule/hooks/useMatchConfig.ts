import { useState, useCallback, useEffect } from 'react';
import type { MatchConfig } from '../types';
import { nanoid } from 'nanoid';

export const useMatchConfig = (initialConfigs?: MatchConfig[]) => {
  const [configs, setConfigs] = useState<MatchConfig[]>(initialConfigs || []);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  // Sync configs when initialConfigs changes (for edit mode data loading)
  useEffect(() => {
    if (initialConfigs && initialConfigs?.length > 0) {
      setConfigs(initialConfigs);
    }
  }, [initialConfigs]);

  // Current working config state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedMatchOnFields, setSelectedMatchOnFields] = useState<string[]>([]);
  const [selectedMatchSources, setSelectedMatchSources] = useState<string[]>([]);
  const [selectedAddFields, setSelectedAddFields] = useState<string[]>([]);

  // Match options state
  const [expand, setExpand] = useState<boolean>(false);
  const [matchType, setMatchType] = useState<'full' | 'any'>('full');

  const handleAddOrUpdateConfig = useCallback((fieldMappings?: any[], availableMatchSources?: any[], apiSources?: any) => {
    if (selectedInputSources?.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedMatchOnFields?.length === 0) {
      alert('Please select at least one Match On field');
      return;
    }
    if (selectedMatchSources?.length === 0) {
      alert('Please select at least one Match Source');
      return;
    }

    // Validation: Check if Add Fields are compatible with Match Keys (Match On Fields)
    // The match sources must have the fields that can be used as match keys
    if (expand && selectedAddFields?.length > 0 && availableMatchSources && selectedMatchSources?.length > 0) {
      const matchSourcesWithoutMatchKeys: string[] = [];

      selectedMatchSources?.forEach(sourceId => {
        // Find the source
        let source = availableMatchSources?.find((s: any) => s.id === sourceId);

        // If not found in available sources, check if it's a preconfigured source from API
        if (!source && apiSources?.dbSource?.preconfiguredTables?.match) {
          const preconfiguredSource = apiSources.dbSource.preconfiguredTables.match?.find(
            (table: any) => `match_${table?.tableId}` === sourceId
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
          const sourceHeaders = (source.selectedHeaders || source.headers || []).map((h: string) => h?.toLowerCase());
          const missingFields = selectedMatchOnFields?.filter(
            field => !sourceHeaders?.includes(field?.toLowerCase())
          );

          if (missingFields?.length > 0) {
            matchSourcesWithoutMatchKeys?.push(
              `${source.sourceName || sourceId} (missing: ${missingFields?.join(', ')})`
            );
          }
        }
      });


    }

    if (editingConfigId) {
      // Update existing config
      setConfigs(configs?.map(config =>
        config.id === editingConfigId
          ? {
              ...config,
              inputSources: selectedInputSources,
              matchOnFields: selectedMatchOnFields,
              matchSources: selectedMatchSources,
              expand: expand,
              matchType: matchType,
              addFields: expand ? selectedAddFields : undefined,
              fieldMappings: fieldMappings && fieldMappings?.length > 0 ? fieldMappings : undefined,
            }
          : config
      ));
      setEditingConfigId(null);
    } else {
      // Add new config
      const newConfig: MatchConfig = {
        id: nanoid(),
        inputSources: selectedInputSources,
        matchOnFields: selectedMatchOnFields,
        matchSources: selectedMatchSources,
        expand: expand,
        matchType: matchType,
        addFields: expand ? selectedAddFields : undefined,
        fieldMappings: fieldMappings && fieldMappings?.length > 0 ? fieldMappings : undefined,
        createdAt: Date.now(), // Add timestamp for creation order
      };
      setConfigs([...configs, newConfig]);
    }

    // Reset form
    setSelectedInputSources([]);
    setSelectedMatchOnFields([]);
    setSelectedMatchSources([]);
    setSelectedAddFields([]);
    setExpand(false);
    setMatchType('full');
  }, [
    selectedInputSources,
    selectedMatchOnFields,
    selectedMatchSources,
    selectedAddFields,
    expand,
    matchType,
    editingConfigId,
    configs
  ]);

  const handleEditConfig = useCallback((config: MatchConfig) => {
    setEditingConfigId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedMatchOnFields(config.matchOnFields);
    setSelectedMatchSources(config.matchSources);
    setSelectedAddFields(config.addFields || []);
    setExpand(config.expand);
    setMatchType(config.matchType);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingConfigId(null);
    setSelectedInputSources([]);
    setSelectedMatchOnFields([]);
    setSelectedMatchSources([]);
    setSelectedAddFields([]);
    setExpand(false);
    setMatchType('full');
  }, []);

  const handleDeleteConfig = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this match configuration?')) {
      setConfigs(configs?.filter(c => c.id !== id));
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
    selectedMatchOnFields,
    selectedMatchSources,
    selectedAddFields,
    expand,
    matchType,

    // Setters
    setConfigs,
    setSelectedInputSources,
    setSelectedMatchOnFields,
    setSelectedMatchSources,
    setSelectedAddFields,
    setExpand,
    setMatchType,

    // Handlers
    handleAddOrUpdateConfig,
    handleEditConfig,
    handleCancelEdit,
    handleDeleteConfig,
  };
};
