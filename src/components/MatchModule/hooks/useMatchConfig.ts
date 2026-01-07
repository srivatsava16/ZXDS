import { useState, useCallback } from 'react';
import type { MatchConfig } from '../types';
import { nanoid } from 'nanoid';

export const useMatchConfig = (initialConfigs?: MatchConfig[]) => {
  const [configs, setConfigs] = useState<MatchConfig[]>(initialConfigs || []);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  // Current working config state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedMatchOnFields, setSelectedMatchOnFields] = useState<string[]>([]);
  const [selectedMatchSources, setSelectedMatchSources] = useState<string[]>([]);
  const [selectedAddFields, setSelectedAddFields] = useState<string[]>([]);

  // Match options state
  const [expand, setExpand] = useState<boolean>(false);
  const [matchType, setMatchType] = useState<'full' | 'any'>('full');

  const handleAddOrUpdateConfig = useCallback(() => {
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedMatchOnFields.length === 0) {
      alert('Please select at least one Match On field');
      return;
    }
    if (selectedMatchSources.length === 0) {
      alert('Please select at least one Match Source');
      return;
    }

    if (editingConfigId) {
      // Update existing config
      setConfigs(configs.map(config =>
        config.id === editingConfigId
          ? {
              ...config,
              inputSources: selectedInputSources,
              matchOnFields: selectedMatchOnFields,
              matchSources: selectedMatchSources,
              expand: expand,
              matchType: matchType,
              addFields: expand ? selectedAddFields : undefined,
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
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
