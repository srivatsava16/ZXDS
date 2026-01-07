import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Link,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useNotification();
  const [email, setEmail] = useState('');

  const handleSendEmail = () => {
    // Demo: Show success message or navigate
    showSnackbar('Verification code sent to your email!', 'success');
  };

  const handleBackToSignIn = () => {
    navigate('/login');
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

        {/* Page Title */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#2D3748',
            mb: 1,
            textAlign: 'center',
          }}
        >
          Forgot Password?
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            mb: 3,
            textAlign: 'center',
            color: 'text.secondary',
            fontSize: '0.875rem',
          }}
        >
          Please enter your email address to receive a verification code.
        </Typography>

        {/* Email Field */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body2"
            sx={{ mb: 1, fontWeight: 600, color: '#2D3748', fontSize: '0.875rem' }}
          >
            Email Address
          </Typography>
          <TextField
            fullWidth
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#F8FAFB',
              },
            }}
          />
        </Box>

        {/* Send Email Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleSendEmail}
          disabled={!email}
          sx={{
            py: 1.25,
            mb: 3,
            fontSize: '0.95rem',
            fontWeight: 600,
            textTransform: 'none',
            backgroundColor: '#296695',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
            '&:hover': {
              backgroundColor: '#1A4A6B',
              boxShadow: '0 6px 20px rgba(41, 102, 149, 0.4)',
            },
            '&:disabled': {
              backgroundColor: '#E0E0E0',
              color: '#9E9E9E',
            },
          }}
        >
          Send Email
        </Button>

        {/* Back to Sign In Link */}
        <Box sx={{ textAlign: 'center' }}>
          <Link
            component="button"
            variant="body2"
            onClick={handleBackToSignIn}
            sx={{
              fontSize: '0.875rem',
              color: '#296695',
              textDecoration: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            <ArrowBack sx={{ fontSize: 16 }} />
            Back to Sign In
          </Link>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForgotPasswordPage;
