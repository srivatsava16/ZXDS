import { Step, StepLabel } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableStepProps {
  module: {
    id: string;
    title: string;
    color: string;
    isDraggable: boolean;
  };
  index: number;
  activeStep: number;
  onClick: () => void;
}

const SortableStep: React.FC<SortableStepProps> = ({ module, index, activeStep, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: !module.isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Step onClick={onClick} sx={{ cursor: 'pointer' }}>
        <StepLabel
          StepIconProps={{
            sx: {
              color: index <= activeStep ? module.color : 'text.disabled',
              '&.Mui-active': {
                color: module.color,
              },
              '&.Mui-completed': {
                color: module.color,
              },
            },
          }}
          sx={{
            flexDirection: 'column',
            '& .MuiStepLabel-iconContainer': {
              paddingRight: 0,
            },
            '& .MuiStepLabel-labelContainer': {
              marginTop: '8px',
            },
            '& .MuiStepLabel-label': {
              fontSize: '0.8rem',
              fontWeight: index === activeStep ? 600 : 400,
              color: index === activeStep ? '#2D3748' : 'text.secondary',
              textAlign: 'center',
            },
          }}
        >
          {module.title}
        </StepLabel>
      </Step>
    </div>
  );
};

export default SortableStep;
