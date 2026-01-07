import { Box, Typography, Accordion, AccordionSummary, Chip, IconButton, Tooltip } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragIndicator, ContentCopy, Delete } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SortableAccordionItemProps } from '../types';

const SortableAccordionItem: React.FC<SortableAccordionItemProps> = ({
  module,
  index,
  expanded,
  onChange,
  renderContent,
  isDraggable,
  onDuplicate,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Accordion
        expanded={expanded.includes(module.id)}
        onChange={onChange(module.id)}
        sx={{
          mb: 2,
          '&:before': {
            display: 'none',
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            '& .MuiAccordionSummary-content': {
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${module.color}15`,
              flexShrink: 0,
            }}
          >
            <module.icon sx={{ fontSize: 16, color: module.color }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, fontSize: '0.95rem' }}>
              {module.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {module.description}
            </Typography>
          </Box>
          <Chip
            label={`Step ${index + 1}`}
            size="small"
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
          {isDraggable && (
            <Box {...attributes} {...listeners} sx={{ display: 'flex', cursor: 'grab', ml: 1 }}>
              <Tooltip title="Drag to reorder">
                <IconButton size="small" sx={{ '&:active': { cursor: 'grabbing' } }}>
                  <DragIndicator fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          {onDuplicate && (
            <Tooltip title="Duplicate module">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(module.id);
                }}
                sx={{ ml: 0.5 }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete module">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(module.id);
                }}
                sx={{ ml: 0.5 }}
                color="error"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </AccordionSummary>
        <Box sx={{ p: 3 }}>{renderContent(module.id)}</Box>
      </Accordion>
    </div>
  );
};

export default SortableAccordionItem;
