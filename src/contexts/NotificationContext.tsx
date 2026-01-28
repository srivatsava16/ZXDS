import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Warning, Info } from '@mui/icons-material';

interface NotificationContextType {
  showAlert: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showSnackbar: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface DialogState {
  open: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  severity: 'success' | 'error' | 'warning' | 'info';
  resolve?: (value: boolean) => void;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    title: '',
    message: '',
    type: 'alert',
    severity: 'info',
  });

  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setDialogState({
      open: true,
      title: severity?.charAt(0)?.toUpperCase() + severity?.slice(1),
      message,
      type: 'alert',
      severity,
    });
  }, []);

  const showConfirm = useCallback((message: string, title: string = 'Confirm'): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title,
        message,
        type: 'confirm',
        severity: 'warning',
        resolve,
      });
    });
  }, []);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbarState({
      open: true,
      message,
      severity,
    });
  }, []);

  const handleDialogClose = (confirmed: boolean = false) => {
    if (dialogState?.resolve) {
      dialogState?.resolve?.(confirmed);
    }
    setDialogState((prev) => ({ ...prev, open: false }));
  };

  const handleSnackbarClose = () => {
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  const getIcon = () => {
    switch (dialogState?.severity) {
      case 'success':
        return <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 48, color: 'warning.main' }} />;
      default:
        return <Info sx={{ fontSize: 48, color: 'info.main' }} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showAlert, showConfirm, showSnackbar }}>
      {children}

      {/* Alert/Confirm Dialog */}
      <Dialog
        open={dialogState?.open}
        onClose={() => dialogState?.type === 'alert' && handleDialogClose(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
          {getIcon()}
          {dialogState?.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', fontSize: '1rem' }}>
            {dialogState?.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {dialogState?.type === 'confirm' ? (
            <>
              <Button onClick={() => handleDialogClose(false)} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={() => handleDialogClose(true)}
                variant="contained"
                color={dialogState?.severity === 'error' ? 'error' : 'primary'}
                autoFocus
              >
                Confirm
              </Button>
            </>
          ) : (
            <Button onClick={() => handleDialogClose(false)} variant="contained" autoFocus>
              OK
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for quick notifications */}
      <Snackbar
        open={snackbarState?.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarState?.severity} sx={{ width: '100%' }}>
          {snackbarState?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
