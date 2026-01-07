import { Box, TextField, Typography, Button, Switch, FormControlLabel } from '@mui/material';
import { Save, Close, ViewAgenda, ViewStream } from '@mui/icons-material';

interface RequestHeaderProps {
  requestName: string;
  onRequestNameChange: (name: string) => void;
  requestNameError: string;
  isStepperView: boolean;
  onViewModeToggle: () => void;
  onSave: () => void;
  onCancel: () => void;
  saveLoading: boolean;
  saveError: string;
}

const RequestHeader: React.FC<RequestHeaderProps> = ({
  requestName,
  onRequestNameChange,
  requestNameError,
  isStepperView,
  onViewModeToggle,
  onSave,
  onCancel,
  saveLoading,
  saveError,
}) => {
  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 64,
        zIndex: 100,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ flex: 1, mr: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Create New Data Pull Request
          </Typography>
          <TextField
            fullWidth
            label="Request Name"
            value={requestName}
            onChange={(e) => onRequestNameChange(e.target.value)}
            error={!!requestNameError}
            helperText={requestNameError || 'Enter a unique name for this request'}
            required
            size="small"
            sx={{ maxWidth: 500 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={isStepperView}
                onChange={onViewModeToggle}
                icon={<ViewAgenda />}
                checkedIcon={<ViewStream />}
              />
            }
            label={isStepperView ? 'Stepper View' : 'Accordion View'}
          />

          <Button
            variant="outlined"
            startIcon={<Close />}
            onClick={onCancel}
            sx={{ minWidth: 120 }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={onSave}
            disabled={saveLoading || !requestName.trim()}
            sx={{ minWidth: 120 }}
          >
            {saveLoading ? 'Saving...' : 'Save & Submit'}
          </Button>
        </Box>
      </Box>

      {saveError && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {saveError}
        </Typography>
      )}
    </Box>
  );
};

export default RequestHeader;
