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
  InputAdornment,
  IconButton,
  Grid,
} from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const UserCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    businessUnit: '',
    division: '',
    role: '',
    password: '',
    confirmPassword: '',
  });

  const businessUnits = ['ZxDev', 'ZxDs', 'ZxOps', 'CPM', 'CPA', 'DataTeam', 'Attribution'];
  const divisions = ['Master']; // Can be filtered based on selected BU
  const roles = ['Super Admin', 'Business Unit Admin', 'Division Admin', 'Data Query Creator', 'Report Viewer', 'Analytics User', 'Read Only'];

  const handleChange = (field: string) => (event: any) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleBack = () => {
    navigate('/userManagement');
  };

  const handleCancel = () => {
    navigate('/userManagement');
  };

  const handleSave = () => {
    // Here you would typically make an API call to create the user
    navigate('/userManagement');
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
          Create New User
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          Create a new user using the form below.
        </Typography>
      </Box>

      {/* General User Details Section */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
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
          General User Details
        </Typography>

        <Grid container spacing={3}>
          {/* Full Name */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Full Name{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange('fullName')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Grid>

          {/* Email */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Email{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Grid>

          {/* Username */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Username{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              placeholder="Username"
              value={formData.username}
              onChange={handleChange('username')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#E8F4F8',
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
                fullWidth
                sx={{
                  backgroundColor: 'white',
                  width: '100%',
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

          {/* Division */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Division{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <FormControl fullWidth>
              <Select
                value={formData.division}
                onChange={handleChange('division')}
                displayEmpty
                fullWidth
                sx={{
                  backgroundColor: 'white',
                  width: '100%',
                  '& em': {
                    color: 'rgba(0, 0, 0, 0.38)',
                    fontStyle: 'normal',
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select Division</em>
                </MenuItem>
                {divisions.map((division) => (
                  <MenuItem key={division} value={division}>
                    {division}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Roles */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Role{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <FormControl fullWidth>
              <Select
                value={formData.role}
                onChange={handleChange('role')}
                displayEmpty
                fullWidth
                sx={{
                  backgroundColor: 'white',
                  width: '100%',
                  '& em': {
                    color: 'rgba(0, 0, 0, 0.38)',
                    fontStyle: 'normal',
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select Role</em>
                </MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Set User Password Section */}
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
          Set User Password
        </Typography>

        <Grid container spacing={3}>
          {/* Password */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Password
            </Typography>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange('password')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#E8F4F8',
                },
              }}
            />
          </Grid>

          {/* Confirm Password */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Confirm Password
            </Typography>
            <TextField
              fullWidth
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
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
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default UserCreationPage;
