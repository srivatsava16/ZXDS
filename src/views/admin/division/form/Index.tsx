import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Grid,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const DivisionCreationPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    divisionName: '',
    businessUnit: '',
    description: '',
  });

  const businessUnits = ['ZxDev', 'ZxDs', 'ZxOps', 'CPM', 'CPA', 'DataTeam', 'Attribution'];

  const handleChange = (field: string) => (event: any) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleBack = () => {
    navigate('/divisions');
  };

  const handleCancel = () => {
    navigate('/divisions');
  };

  const handleSave = () => {
    console.log('Save Division:', formData);
    navigate('/divisions');
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
          Create New Division
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          Add a new division to a business unit
        </Typography>
      </Box>

      {/* Division Details Section */}
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
          Division Details
        </Typography>

        <Grid container spacing={3}>
          {/* Division Name */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Division Name{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              placeholder="e.g., Master, Regional, Corporate"
              value={formData.divisionName}
              onChange={handleChange('divisionName')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Grid>

          {/* Business Unit */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Business Unit{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <FormControl fullWidth>
              <Select
                value={formData.businessUnit}
                onChange={handleChange('businessUnit')}
                displayEmpty
                sx={{
                  backgroundColor: 'white',
                  '& em': {
                    color: 'rgba(0, 0, 0, 0.38)',
                    fontStyle: 'normal',
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select Business Unit</em>
                </MenuItem>
                {businessUnits.map((bu) => (
                  <MenuItem key={bu} value={bu}>
                    {bu}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
              placeholder="Brief description of the division"
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
          Save Division
        </Button>
      </Box>
    </Box>
  );
};

export default DivisionCreationPage;
