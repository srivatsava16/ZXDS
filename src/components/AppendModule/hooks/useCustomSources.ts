import { useState, useCallback } from 'react';
import type { InputSource } from '../../InputModule/InputModule';
import { nanoid } from 'nanoid';

export const useCustomSources = () => {
  const [customAppendSources, setCustomAppendSources] = useState<InputSource[]>([]);
  const [editingSource, setEditingSource] = useState<InputSource | null>(null);
  const [viewingSource, setViewingSource] = useState<InputSource | null>(null);

  const handleAddCustomSource = useCallback((source: InputSource) => {
    setCustomAppendSources(prev => [...prev, { ...source, id: nanoid() }]);
  }, []);

  const handleEditCustomSource = useCallback((source: InputSource) => {
    if (editingSource) {
      setCustomAppendSources(prev =>
        prev.map(s => s.id === editingSource.id ? { ...source, id: editingSource.id } : s)
      );
    }
  }, [editingSource]);

  const handleDeleteCustomSource = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this custom append source?')) {
      setCustomAppendSources(prev => prev.filter(s => s.id !== id));
    }
  }, []);

  return {
    customAppendSources,
    editingSource,
    viewingSource,
    setEditingSource,
    setViewingSource,
    handleAddCustomSource,
    handleEditCustomSource,
    handleDeleteCustomSource,
  };
};
