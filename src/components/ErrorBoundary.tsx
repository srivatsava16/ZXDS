import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { Error as ErrorIcon, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
              background: 'linear-gradient(135deg, #fff 0%, #f5f5f5 100%)',
            }}
          >
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
              Oops! Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We're sorry for the inconvenience. An unexpected error occurred while processing your request.
            </Typography>

            {import.meta.env.DEV && this.state.error && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: '#fff3e0',
                  borderRadius: 1,
                  textAlign: 'left',
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'error.main' }}>
                  Error Details (Development Mode):
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                  {this.state.error.toString()}
                </Typography>
                {this.state.errorInfo && (
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.75rem', mt: 1 }}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Box>
            )}

            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" startIcon={<Refresh />} onClick={this.handleReset} size="large">
                Reload Page
              </Button>
              <Button variant="outlined" onClick={() => (window.location.href = '/')} size="large">
                Go to Home
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
