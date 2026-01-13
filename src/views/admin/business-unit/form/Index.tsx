import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const BusinessUnitCreationPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    buName: '',
    description: '',
    buCode: '',
  });

  const handleChange = (field: string) => (event: any) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleBack = () => {
    navigate('/businessUnits');
  };

  const handleCancel = () => {
    navigate('/businessUnits');
  };

  const handleSave = () => {
    navigate('/businessUnits');
  };

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Button
          size="small"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{
            mb: 1.5,
            color: 'text.secondary',
            fontSize: '0.875rem',
            '&:hover': {
              backgroundColor: 'rgba(41, 102, 149, 0.08)',
            },
          }}
        >
          Back
        </Button>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#2D3748',
            mb: 0.5,
          }}
        >
          Create New Business Unit
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          Add a new business unit to the organization
        </Typography>
      </Box>

      {/* Business Unit Details Section */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: '#2D3748',
            mb: 2.5,
            fontSize: '1rem',
          }}
        >
          Business Unit Details
        </Typography>

        <Grid container spacing={3}>
          {/* Business Unit Name */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Business Unit Name{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              placeholder="e.g., ZxDev, CPM, DataTeam"
              value={formData.buName}
              onChange={handleChange('buName')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Grid>

          {/* Business Unit Code */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Business Unit Code{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              placeholder="e.g., ZXDEV, CPM, DT"
              value={formData.buCode}
              onChange={handleChange('buCode')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#E8F4F8',
                },
              }}
            />
          </Grid>

          {/* Description */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Description{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Brief description of the business unit"
              value={formData.description}
              onChange={handleChange('description')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Bottom Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={handleCancel}
          sx={{ px: 3, py: 0.75, fontSize: '0.875rem' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          sx={{
            px: 3,
            py: 0.75,
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Save Business Unit
        </Button>
      </Box>
    </Box>
  );
};

export default BusinessUnitCreationPage;
