import { Box, Typography, Switch } from '@mui/material';
import { ViewAgenda, ViewStream } from '@mui/icons-material';

interface ViewModeToggleProps {
  viewMode: 'accordion' | 'stepper';
  onViewModeChange: (mode: 'accordion' | 'stepper') => void;
}

/**
 * Component for toggling between accordion and stepper view modes
 */
const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ViewAgenda sx={{ fontSize: 20, color: viewMode === 'accordion' ? 'primary.main' : 'text.disabled' }} />
      <Typography
        variant="body2"
        sx={{
          color: viewMode === 'accordion' ? 'primary.main' : 'text.disabled',
          fontSize: '0.75rem',
          fontWeight: viewMode === 'accordion' ? 600 : 400,
        }}
      >
        Accordion
      </Typography>
      <Switch
        checked={viewMode === 'stepper'}
        onChange={(e) => onViewModeChange(e.target.checked ? 'stepper' : 'accordion')}
        size="small"
        sx={{
          '& .MuiSwitch-switchBase': {
            '&.Mui-checked': {
              color: 'primary.main',
              '& + .MuiSwitch-track': {
                backgroundColor: 'primary.main',
                opacity: 0.5,
              },
            },
          },
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: viewMode === 'stepper' ? 'primary.main' : 'text.disabled',
          fontSize: '0.75rem',
          fontWeight: viewMode === 'stepper' ? 600 : 400,
        }}
      >
        Stepper
      </Typography>
      <ViewStream sx={{ fontSize: 20, color: viewMode === 'stepper' ? 'primary.main' : 'text.disabled' }} />
    </Box>
  );
};

export default ViewModeToggle;
