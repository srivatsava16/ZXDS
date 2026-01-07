import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });

  const handleChange = (field: string) => (event: any) => {
    const value = field === 'rememberMe' ? event?.target?.checked : event?.target?.value;
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSignIn = () => {
    // Demo: Navigate to main app
    navigate?.('/report');
  };

  const handleForgotPassword = () => {
    navigate?.('/forgot-password');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F7FA',
        backgroundImage: 'linear-gradient(135deg, #F5F7FA 0%, #E8EDF2 100%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 450,
          p: 5,
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Zeta Logo */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Box
            component="img"
            src="https://ss.postserveraccess.com/zetaLogosApp/zeta_logoPrimary.svg"
            alt="Zeta Logo"
            sx={{ height: 50, width: 'auto', objectFit: 'contain' }}
          />
        </Box>

        {/* Username Field */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="body2"
            sx={{ mb: 1, fontWeight: 600, color: '#2D3748', fontSize: '0.875rem' }}
          >
            User Name
          </Typography>
          <TextField
            fullWidth
            placeholder="rranga@zetaglobal.com"
            value={formData.username}
            onChange={handleChange('username')}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#F8FAFB',
              },
            }}
          />
        </Box>

        {/* Password Field */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            sx={{ mb: 1, fontWeight: 600, color: '#2D3748', fontSize: '0.875rem' }}
          >
            Password
          </Typography>
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange('password')}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#F8FAFB',
              },
            }}
          />
        </Box>

        {/* Remember Me & Forgot Password */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.rememberMe}
                onChange={handleChange('rememberMe')}
                size="small"
                sx={{
                  color: '#296695',
                  '&.Mui-checked': {
                    color: '#296695',
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#2D3748' }}>
                Remember Me
              </Typography>
            }
          />
          <Link
            component="button"
            variant="body2"
            onClick={handleForgotPassword}
            sx={{
              fontSize: '0.875rem',
              color: '#296695',
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Forgot Password?
          </Link>
        </Box>

        {/* Sign In Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleSignIn}
          sx={{
            py: 1.25,
            fontSize: '0.95rem',
            fontWeight: 600,
            textTransform: 'none',
            backgroundColor: '#296695',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
            '&:hover': {
              backgroundColor: '#1A4A6B',
              boxShadow: '0 6px 20px rgba(41, 102, 149, 0.4)',
            },
          }}
        >
          Sign In
        </Button>
      </Paper>
    </Box>
  );
};

export default LoginPage;
