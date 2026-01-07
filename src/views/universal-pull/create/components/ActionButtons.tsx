import { Box, Button } from '@mui/material';
import { Save, Close } from '@mui/icons-material';

interface ActionButtonsProps {
  onSave: () => void;
  onCancel: () => void;
  saveLoading?: boolean;
  saveButtonText?: string;
  loadingText?: string;
}

/**
 * Component for rendering action buttons (Save/Submit and Cancel)
 */
const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSave,
  onCancel,
  saveLoading = false,
  saveButtonText = 'Submit Request',
  loadingText = 'Submitting...',
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<Close />}
        onClick={onCancel}
        sx={{ px: 3, py: 0.75, fontSize: '0.875rem' }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        size="small"
        startIcon={<Save />}
        onClick={onSave}
        disabled={saveLoading}
        sx={{
          px: 3,
          py: 0.75,
          fontSize: '0.875rem',
          boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
        }}
      >
        {saveLoading ? loadingText : saveButtonText}
      </Button>
    </Box>
  );
};

export default ActionButtons;
