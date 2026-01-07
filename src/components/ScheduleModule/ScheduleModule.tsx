import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
} from '@mui/material';

interface ScheduleModuleProps {
  scheduleType?: 'adhoc' | 'scheduled_at';
  onScheduleTypeChange?: (type: 'adhoc' | 'scheduled_at') => void;
  notificationWhen?: string;
  onNotificationWhenChange?: (value: string) => void;
  recipientEmail?: string;
  onRecipientEmailChange?: (value: string) => void;
  scheduledDateTime?: string;
  onScheduledDateTimeChange?: (value: string) => void;
}

const ScheduleModule: React.FC<ScheduleModuleProps> = ({
  scheduleType = 'adhoc',
  onScheduleTypeChange,
  notificationWhen = 'standard',
  onNotificationWhenChange,
  recipientEmail = '',
  onRecipientEmailChange,
  scheduledDateTime = '',
  onScheduledDateTimeChange,
}) => {
  return (
    <Box
      sx={{
        backgroundColor: '#F8FAFB',
        borderRadius: 3,
        p: 3,
      }}
    >
      {/* Schedule Configuration Section */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.95rem', mb: 2 }}>
          Schedule Configuration
        </Typography>

        {/* Adhoc / Recurrence Selection */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 1.5 }}>
            Schedule Type
          </Typography>
          <RadioGroup
            row
            value={scheduleType}
            onChange={(e) => onScheduleTypeChange && onScheduleTypeChange(e.target.value as 'adhoc' | 'scheduled_at')}
          >
            <FormControlLabel
              value="adhoc"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Adhoc</Typography>}
              sx={{ mr: 4 }}
            />
            <FormControlLabel
              value="scheduled_at"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Scheduled At</Typography>}
            />
          </RadioGroup>
        </Box>

        {/* Adhoc Options */}
        {scheduleType === 'adhoc' && (
          <Box>
            {/* Send Notifications When */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 1.5 }}>
                Send Notifications When
              </Typography>
              <RadioGroup
                row
                value={notificationWhen}
                onChange={(e) => onNotificationWhenChange && onNotificationWhenChange(e.target.value)}
              >
                <FormControlLabel
                  value="standard"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Standard</Typography>}
                  sx={{ mr: 4 }}
                />
                <FormControlLabel
                  value="error_only"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Error Only</Typography>}
                />
              </RadioGroup>
            </Box>

            {/* Recipient Email */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 1.5 }}>
                Recipient Email <span style={{ color: '#EF4444' }}>*</span>
              </Typography>
              <TextField
                size="small"
                placeholder="Enter recipient email address"
                value={recipientEmail}
                onChange={(e) => onRecipientEmailChange && onRecipientEmailChange(e.target.value)}
                required
                sx={{
                  width: '50%',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
            </Box>
          </Box>
        )}

        {/* Scheduled At Options */}
        {scheduleType === 'scheduled_at' && (
          <Box>
            {/* Date-Time Picker */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 1.5 }}>
                Scheduled Date & Time <span style={{ color: '#EF4444' }}>*</span>
              </Typography>
              <TextField
                label="Basic date time picker"
                type="datetime-local"
                size="small"
                value={scheduledDateTime}
                onChange={(e) => onScheduledDateTimeChange && onScheduledDateTimeChange(e.target.value)}
                required
                sx={{
                  width: '50%',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>

            {/* Send Notifications When - Standard and Error Only options */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 1.5 }}>
                Send Notifications When
              </Typography>
              <RadioGroup
                row
                value={notificationWhen}
                onChange={(e) => onNotificationWhenChange && onNotificationWhenChange(e.target.value)}
              >
                <FormControlLabel
                  value="standard"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Standard</Typography>}
                  sx={{ mr: 4 }}
                />
                <FormControlLabel
                  value="error_only"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Error Only</Typography>}
                />
              </RadioGroup>
            </Box>

            {/* Recipient Email */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 1.5 }}>
                Recipient Email <span style={{ color: '#EF4444' }}>*</span>
              </Typography>
              <TextField
                size="small"
                placeholder="Enter recipient email address"
                value={recipientEmail}
                onChange={(e) => onRecipientEmailChange && onRecipientEmailChange(e.target.value)}
                required
                sx={{
                  width: '50%',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ScheduleModule;
