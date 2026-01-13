import { useState, useCallback, useEffect } from 'react';
import type { StatsConfiguration, CountOnField } from '../types';
import { nanoid } from 'nanoid';

export const useStatsConfiguration = () => {
  const [statsConfigurations, setStatsConfigurations] = useState<StatsConfiguration[]>([]);
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedCountsOn, setSelectedCountsOn] = useState<CountOnField[]>([]);
  const [selectedBreakdownBy, setSelectedBreakdownBy] = useState<string[]>([]);
  const [editingStatsId, setEditingStatsId] = useState<string | null>(null);

  // Clear selected fields when input sources change
  useEffect(() => {
    setSelectedCountsOn([]);
    setSelectedBreakdownBy([]);
  }, [selectedInputSources]);

  const handleAddStatsConfig = useCallback(() => {
    if (selectedInputSources.length === 0 || selectedCountsOn.length === 0) {
      return;
    }

    const newConfig: StatsConfiguration = {
      id: nanoid(),
      inputSources: selectedInputSources,
      countsOn: selectedCountsOn,
      breakdownBy: selectedBreakdownBy,
    };

    if (editingStatsId) {
      setStatsConfigurations(prev =>
        prev.map(config => (config.id === editingStatsId ? newConfig : config))
      );
      setEditingStatsId(null);
    } else {
      setStatsConfigurations(prev => [...prev, newConfig]);
    }

    // Reset form
    setSelectedInputSources([]);
    setSelectedCountsOn([]);
    setSelectedBreakdownBy([]);
  }, [selectedInputSources, selectedCountsOn, selectedBreakdownBy, editingStatsId]);

  const handleEditStatsConfig = useCallback((config: StatsConfiguration) => {
    setEditingStatsId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedCountsOn(config.countsOn);
    setSelectedBreakdownBy(config.breakdownBy);
  }, []);

  const handleDeleteStatsConfig = useCallback((configId: string) => {
    setStatsConfigurations(prev => prev.filter(config => config.id !== configId));
  }, []);

  const resetStatsForm = useCallback(() => {
    setSelectedInputSources([]);
    setSelectedCountsOn([]);
    setSelectedBreakdownBy([]);
    setEditingStatsId(null);
  }, []);

  return {
    // State
    statsConfigurations,
    selectedInputSources,
    selectedCountsOn,
    selectedBreakdownBy,
    editingStatsId,

    // Setters
    setStatsConfigurations,
    setSelectedInputSources,
    setSelectedCountsOn,
    setSelectedBreakdownBy,

    // Handlers
    handleAddStatsConfig,
    handleEditStatsConfig,
    handleDeleteStatsConfig,
    resetStatsForm,
  };
};
