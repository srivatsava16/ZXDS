import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

interface Module {
  id: string;
  isDraggable?: boolean;
  [key: string]: any;
}

/**
 * Custom hook for handling drag-and-drop reordering of modules
 * Configures sensors and provides drag end handler
 */
export const useModuleReordering = (
  modules: Module[],
  setModules: (modules: Module[]) => void
) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = modules.findIndex((m) => m?.id === active.id);
    const newIndex = modules.findIndex((m) => m?.id === over.id);

    // Only allow dragging of modules marked as draggable
    if (
      oldIndex !== -1 &&
      newIndex !== -1 &&
      modules[oldIndex]?.isDraggable &&
      modules[newIndex]?.isDraggable
    ) {
      const reorderedModules = arrayMove(modules, oldIndex, newIndex);
      setModules(reorderedModules);
    }
  };

  return {
    sensors,
    handleDragEnd,
    closestCenter,
  };
};
