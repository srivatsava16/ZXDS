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
}

interface OutputDestinationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (destination: OutputDestination) => void;
}

const OutputDestinationDialog: React.FC<OutputDestinationDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [destinationType, setDestinationType] = useState<'SFTP' | 'S3' | 'NFS' | 'Other'>('SFTP');
  const [destinationName, setDestinationName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [path, setPath] = useState('');
  const [bucket, setBucket] = useState('');
  const [region, setRegion] = useState('');
  const [credentials, setCredentials] = useState('');

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setDestinationType('SFTP');
      setDestinationName('');
      setHost('');
      setPort('');
      setPath('');
      setBucket('');
      setRegion('');
      setCredentials('');
    }
  }, [open]);

  const handleSave = () => {
    if (!destinationName.trim()) {
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
    if (destinationType === 'NFS' && (!host || !path)) {
      alert('Please enter host and path for NFS destination');
      return;
    }

    const destination: OutputDestination = {
      id: Date.now().toString(),
      name: destinationName,
      type: destinationType,
      host: host || undefined,
      port: port || undefined,
      path: path || undefined,
      bucket: bucket || undefined,
      region: region || undefined,
      credentials: credentials || undefined,
    };

    onSave(destination);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

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
          Add Output Destination
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
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
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
              />
              <FormControlLabel
                value="S3"
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>S3</Typography>}
                sx={{ mr: 3 }}
              />
              <FormControlLabel
                value="NFS"
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>NFS</Typography>}
                sx={{ mr: 3 }}
              />
              <FormControlLabel
                value="Other"
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Other</Typography>}
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
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
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
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
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
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Credentials
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Username or credential reference"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
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
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
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
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
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
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Credentials
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="AWS access key or IAM role"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
            </Box>
          </Box>
        )}

        {/* NFS Configuration */}
        {destinationType === 'NFS' && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 2 }}>
              NFS Configuration
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  Host/Server
                </Typography>
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.8rem' }}>
                  *
                </Typography>
              </Box>
              <TextField
                size="small"
                fullWidth
                placeholder="nfs.example.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  Mount Path
                </Typography>
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.8rem' }}>
                  *
                </Typography>
              </Box>
              <TextField
                size="small"
                fullWidth
                placeholder="/mnt/output"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
            </Box>
          </Box>
        )}

        {/* Other Configuration */}
        {destinationType === 'Other' && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 2 }}>
              Custom Configuration
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Host/Endpoint
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="custom.endpoint.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Path/Location
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="/path/to/output"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Configuration Details
              </Typography>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={3}
                placeholder="Additional configuration details..."
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
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
          Add Destination
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OutputDestinationDialog;
