import { Box, Button } from '@mui/material';

interface NavigationButtonsProps {
  activeStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  currentStepColor: string;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  activeStep,
  totalSteps,
  onBack,
  onNext,
  currentStepColor,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1,
        mt: 4,
        pt: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Button
        disabled={activeStep === 0}
        onClick={onBack}
        size="small"
        variant="outlined"
        sx={{ px: 3, py: 0.75 }}
      >
        Back
      </Button>
      <Button
        variant="contained"
        onClick={onNext}
        size="small"
        sx={{
          px: 3,
          py: 0.75,
          backgroundColor: currentStepColor,
          '&:hover': {
            backgroundColor: currentStepColor,
            filter: 'brightness(0.9)',
          },
          boxShadow: `0 4px 16px ${currentStepColor}40`,
        }}
      >
        {activeStep === totalSteps - 1 ? 'Finish' : 'Continue'}
      </Button>
    </Box>
  );
};

export default NavigationButtons;
