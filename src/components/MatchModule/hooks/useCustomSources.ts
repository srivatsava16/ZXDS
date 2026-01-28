import { useState, useCallback } from 'react';
import type { InputSource } from '../../InputModule/InputModule';
import { nanoid } from 'nanoid';

export const useCustomSources = () => {
  const [customMatchSources, setCustomMatchSources] = useState<InputSource[]>([]);
  const [editingSource, setEditingSource] = useState<InputSource | null>(null);
  const [viewingSource, setViewingSource] = useState<InputSource | null>(null);

  const handleAddCustomSource = useCallback((source: InputSource) => {
    setCustomMatchSources(prev => [...prev, { ...source, id: nanoid() }]);
  }, []);

  const handleEditCustomSource = useCallback((source: InputSource) => {
    if (editingSource) {
      setCustomMatchSources(prev =>
        prev?.map(s => s.id === editingSource.id ? { ...source, id: editingSource.id } : s)
      );
    }
  }, [editingSource]);

  const handleDeleteCustomSource = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this custom match source?')) {
      setCustomMatchSources(prev => prev?.filter(s => s.id !== id));
    }
  }, []);

  return {
    customMatchSources,
    editingSource,
    viewingSource,
    setEditingSource,
    setViewingSource,
    handleAddCustomSource,
    handleEditCustomSource,
    handleDeleteCustomSource,
  };
};
