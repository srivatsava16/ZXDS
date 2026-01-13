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

  const handleAddOrUpdateConfig = useCallback((fieldMappings?: any[]) => {
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
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
