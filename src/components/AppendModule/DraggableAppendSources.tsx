import { useMemo } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, Chip } from '@mui/material';
import { DragIndicator } from '@mui/icons-material';

interface DraggableAppendSourcesProps {
  selectedSources: string[];
  allSources: { id: string; name: string }[];
  onReorder: (newOrder: string[]) => void;
  getSourceName: (id: string) => string;
}

interface SortableItemProps {
  id: string;
  sourceName: string;
  index: number;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, sourceName, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        p: 0.75,
        mb: 0.75,
        backgroundColor: isDragging ? '#F0FDF4' : 'white',
        borderRadius: 1,
        border: '1px solid',
        borderColor: isDragging ? '#10B981' : '#E5E7EB',
        boxShadow: isDragging ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#10B981',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
          backgroundColor: '#F9FAFB',
          '& .drag-handle': {
            color: '#10B981',
          },
        },
      }}
      {...attributes}
      {...listeners}
    >
      <Box
        className="drag-handle"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDragging ? '#10B981' : '#F3F4F6',
          borderRadius: 0.75,
          p: 0.5,
          transition: 'all 0.2s ease',
        }}
      >
        <DragIndicator
          sx={{
            fontSize: 18,
            color: isDragging ? '#fff' : '#6B7280',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        />
      </Box>
      <Chip
        label={index + 1}
        size="small"
        sx={{
          backgroundColor: '#10B981',
          color: '#fff',
          fontWeight: 600,
          minWidth: 22,
          height: 22,
          fontSize: '0.7rem',
          flexShrink: 0,
          '& .MuiChip-label': {
            px: 0.75,
          },
        }}
      />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          fontSize: '0.8rem',
          fontWeight: 500,
          color: isDragging ? '#10B981' : '#2D3748',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 0.2s ease',
        }}
      >
        {sourceName}
      </Typography>
    </Box>
  );
};

const DraggableAppendSources: React.FC<DraggableAppendSourcesProps> = ({
  selectedSources,
  allSources,
  onReorder,
  getSourceName,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const items = useMemo(() => selectedSources, [selectedSources]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  if (selectedSources.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 1,
          px: 1,
          py: 0.75,
          backgroundColor: '#F0FDF4',
          borderRadius: 1,
          border: '1px solid #10B981',
        }}
      >
        <DragIndicator sx={{ fontSize: 16, color: '#10B981' }} />
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#047857' }}>
          Priority Order (drag to reorder)
        </Typography>
      </Box>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((sourceId, index) => (
            <SortableItem
              key={sourceId}
              id={sourceId}
              sourceName={getSourceName(sourceId)}
              index={index}
            />
          ))}
        </SortableContext>
      </DndContext>
    </Box>
  );
};

export default DraggableAppendSources;
