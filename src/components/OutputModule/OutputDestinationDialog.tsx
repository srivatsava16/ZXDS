import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import { Close } from '@mui/icons-material';

export interface OutputDestination {
  id: string;
  name: string;
  type: 'SFTP' | 'S3' | 'NFS' | 'Other';
  host?: string;
  port?: string;
  path?: string;
  bucket?: string;
  region?: string;
  credentials?: string;
  // SFTP specific fields
  username?: string;
  password?: string;
  // AWS specific fields
  accessKey?: string;
  secretKey?: string;
}

interface OutputDestinationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (destination: OutputDestination) => void;
  onUpdate?: (destination: OutputDestination) => void;
  mode?: 'add' | 'edit' | 'view';
  editingDestination?: OutputDestination | null;
}

const OutputDestinationDialog: React.FC<OutputDestinationDialogProps> = ({
  open,
  onClose,
  onSave,
  onUpdate,
  mode = 'add',
  editingDestination = null,
}) => {
  const [destinationType, setDestinationType] = useState<'SFTP' | 'S3' | 'NFS' | 'Other'>('SFTP');
  const [destinationName, setDestinationName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [path, setPath] = useState('');
  const [bucket, setBucket] = useState('');
  const [region, setRegion] = useState('');
  const [credentials, setCredentials] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');

  useEffect(() => {
    if (open && (mode === 'edit' || mode === 'view') && editingDestination) {
      // Load editing destination data
      setDestinationType(editingDestination.type);
      setDestinationName(editingDestination.name);
      setHost(editingDestination.host || '');
      setPort(editingDestination.port || '');
      setPath(editingDestination.path || '');
      setBucket(editingDestination.bucket || '');
      setRegion(editingDestination.region || '');
      setCredentials(editingDestination.credentials || '');
      setUsername(editingDestination.username || '');
      setPassword(editingDestination.password || '');
      setAccessKey(editingDestination.accessKey || '');
      setSecretKey(editingDestination?.secretKey || '');
    } else if (!open) {
      // Reset form when dialog closes
      setDestinationType('SFTP');
      setDestinationName('');
      setHost('');
      setPort('');
      setPath('');
      setBucket('');
      setRegion('');
      setCredentials('');
      setUsername('');
      setPassword('');
      setAccessKey('');
      setSecretKey('');
    }
  }, [open, mode, editingDestination]);

  const handleSave = () => {
    if (!destinationName?.trim()) {
      alert('Please enter a destination name');
      return;
    }

    // Validate based on type
    if (destinationType === 'SFTP' && (!host || !port)) {
      alert('Please enter host and port for SFTP destination');
      return;
    }
    if (destinationType === 'S3' && (!bucket || !region)) {
      alert('Please enter bucket and region for S3 destination');
      return;
    }
    if (destinationType === 'S3' && !secretKey?.trim()) {
      alert('Please enter secret key for S3 destination');
      return;
    }
    if (destinationType === 'NFS' && (!host || !path)) {
      alert('Please enter host and path for NFS destination');
      return;
    }

    const destination: OutputDestination = {
      id: mode === 'edit' && editingDestination ? editingDestination.id : Date.now().toString(),
      name: destinationName,
      type: destinationType,
      host: host || undefined,
      port: port || undefined,
      path: path || undefined,
      bucket: bucket || undefined,
      region: region || undefined,
      credentials: credentials || undefined,
      username: username || undefined,
      password: password || undefined,
      accessKey: accessKey || undefined,
      secretKey: secretKey || undefined,
    };

    if (mode === 'edit' && onUpdate) {
      onUpdate(destination);
    } else {
      onSave(destination);
    }
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2.5,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#3B82F6' }}>
          {mode === 'view' ? 'View Output Destination' : mode === 'edit' ? 'Edit Output Destination' : 'Add Output Destination'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2, px: 2.5 }}>
        {/* Destination Name */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem' }}>
              Destination Name
            </Typography>
            <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
              *
            </Typography>
          </Box>
          <TextField
            size="small"
            fullWidth
            placeholder="e.g., Production SFTP Server"
            value={destinationName}
            onChange={(e) => setDestinationName(e.target.value)}
            disabled={isReadOnly}
            InputProps={{
              readOnly: isReadOnly,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: isReadOnly ? '#F9FAFB' : 'white',
              },
            }}
          />
        </Box>

        {/* Destination Type */}
        <Box sx={{ mb: 2.5 }}>
          <FormControl component="fieldset">
            <FormLabel
              component="legend"
              sx={{ fontWeight: 600, color: 'text.primary', mb: 1, fontSize: '0.85rem' }}
            >
              Destination Type
            </FormLabel>
            <RadioGroup
              row
              value={destinationType}
              onChange={(e) => setDestinationType(e.target.value as 'SFTP' | 'S3' | 'NFS' | 'Other')}
            >
              <FormControlLabel
                value="SFTP"
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>SFTP</Typography>}
                sx={{ mr: 3 }}
                disabled={isReadOnly}
              />
              <FormControlLabel
                value="S3"
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>S3</Typography>}
                sx={{ mr: 3 }}
                disabled={isReadOnly}
              />
            </RadioGroup>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* SFTP Configuration */}
        {destinationType === 'SFTP' && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 2 }}>
              SFTP Configuration
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    Host
                  </Typography>
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.8rem' }}>
                    *
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="sftp.example.com"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    Port
                  </Typography>
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.8rem' }}>
                    *
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="22"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
                />
              </Box>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Path
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="/output/data"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                  Username
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="sftp_user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                  Password
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* S3 Configuration */}
        {destinationType === 'S3' && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 2 }}>
              S3 Configuration
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    Bucket Name
                  </Typography>
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.8rem' }}>
                    *
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="my-output-bucket"
                  value={bucket}
                  onChange={(e) => setBucket(e.target.value)}
                  disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    Region
                  </Typography>
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.8rem' }}>
                    *
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="us-east-1"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
                />
              </Box>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Path/Prefix
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="output/data/"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Access Key
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="AKIA..."
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  Secret Key
                </Typography>
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.8rem' }}>
                  *
                </Typography>
              </Box>
              <TextField
                size="small"
                fullWidth
                type="password"
                placeholder="Enter secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                disabled={isReadOnly}
                InputProps={{ readOnly: isReadOnly }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: isReadOnly ? '#F9FAFB' : 'white' } }}
              />
            </Box>
          </Box>
        )}

      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {mode === 'view' ? (
          <Button
            variant="contained"
            size="small"
            onClick={handleClose}
            sx={{
              px: 2,
              textTransform: 'none',
              color: '#fff',
              backgroundColor: '#3B82F6',
              '&:hover': {
                backgroundColor: '#2563EB',
              }
            }}
          >
            Close
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClose}
              sx={{ px: 2, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              sx={{
                px: 2,
                textTransform: 'none',
                color: '#fff',
                backgroundColor: '#3B82F6',
                '&:hover': {
                  backgroundColor: '#2563EB',
                }
              }}
            >
              {mode === 'edit' ? 'Update Destination' : 'Add Destination'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OutputDestinationDialog;
