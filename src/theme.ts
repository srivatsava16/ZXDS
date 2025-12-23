import { createTheme } from '@mui/material/styles';

// Modern color palette inspired by contemporary UI trends
const theme = createTheme({
  palette: {
    primary: {
      main: '#296695',
      light: '#5B9BD5',
      dark: '#1A4A6B',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A202C',
      secondary: '#718096',
    },
    divider: 'rgba(0, 0, 0, 0.06)',
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '1.5rem',
      letterSpacing: '-0.02em',
      color: '#2D3748',
    },
    h5: {
      fontWeight: 700,
      fontSize: '1.25rem',
      letterSpacing: '-0.01em',
      color: '#2D3748',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      letterSpacing: '-0.01em',
      color: '#2D3748',
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: '0.95rem',
      color: '#2D3748',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 4px 8px rgba(0, 0, 0, 0.06)',
    '0px 8px 16px rgba(0, 0, 0, 0.08)',
    '0px 12px 24px rgba(0, 0, 0, 0.1)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 20px 40px rgba(0, 0, 0, 0.14)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.95rem',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(41, 102, 149, 0.25)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 6px 20px rgba(41, 102, 149, 0.3)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '16px !important',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          '&:before': {
            display: 'none',
          },
          marginBottom: '16px',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          },
          '&.Mui-expanded': {
            margin: '0 0 16px 0',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: '8px 20px',
          minHeight: 45,
          backgroundColor: 'transparent',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(41, 102, 149, 0.04)',
          },
          '&.Mui-expanded': {
            minHeight: 45,
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          },
        },
        content: {
          margin: '4px 0',
          '&.Mui-expanded': {
            margin: '4px 0',
          },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
          padding: '16px',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#718096',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.8rem',
          height: 28,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.3s ease',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#296695',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
              },
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          borderRight: 'none',
          boxShadow: '4px 0 12px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.813rem',
          paddingTop: '6px',
          paddingBottom: '6px',
          minHeight: 'auto',
          '&.MuiMenuItem-dense': {
            paddingTop: '4px',
            paddingBottom: '4px',
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.813rem',
        },
        secondary: {
          fontSize: '0.75rem',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          fontSize: '0.813rem',
          paddingTop: '8px',
          paddingBottom: '8px',
        },
      },
    },
  },
});

export default theme;
