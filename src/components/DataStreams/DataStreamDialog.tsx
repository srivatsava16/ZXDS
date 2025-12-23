import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from '@mui/material';
import { Close, Visibility, VisibilityOff } from '@mui/icons-material';

interface DataStream {
  id: string;
  name: string;
  sourceType: 'AWS S3' | 'SFTP';
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  defaultPath?: string;
  accessKey?: string;
  secretKey?: string;
  defaultBucket?: string;
  createdBy?: string;
  createdDate?: string;
  processStatus?: string;
  processedFullTime?: string;
}

interface DataStreamDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (stream: DataStream) => void;
  editingStream: DataStream | null;
}

const DataStreamDialog: React.FC<DataStreamDialogProps> = ({
  open,
  onClose,
  onSave,
  editingStream,
}) => {
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<'AWS S3' | 'SFTP'>('AWS S3');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [defaultPath, setDefaultPath] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [defaultBucket, setDefaultBucket] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  useEffect(() => {
    if (editingStream) {
      setName(editingStream.name);
      setSourceType(editingStream.sourceType);
      setHost(editingStream.host || '');
      setPort(editingStream.port || '22');
      setUsername(editingStream.username || '');
      setPassword(editingStream.password || '');
      setDefaultPath(editingStream.defaultPath || '');
      setAccessKey(editingStream.accessKey || '');
      setSecretKey(editingStream.secretKey || '');
      setDefaultBucket(editingStream.defaultBucket || '');
    } else {
      // Reset form
      setName('');
      setSourceType('AWS S3');
      setHost('');
      setPort('22');
      setUsername('');
      setPassword('');
      setDefaultPath('');
      setAccessKey('');
      setSecretKey('');
      setDefaultBucket('');
    }
  }, [editingStream, open]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a stream name');
      return;
    }

    if (sourceType === 'SFTP') {
      if (!host.trim() || !username.trim() || !password.trim()) {
        alert('Please complete all SFTP fields');
        return;
      }
    } else {
      if (!accessKey.trim() || !secretKey.trim() || !defaultBucket.trim()) {
        alert('Please complete all AWS S3 fields');
        return;
      }
    }

    const stream: DataStream = {
      id: editingStream?.id || Date.now().toString(),
      name,
      sourceType,
      ...(sourceType === 'SFTP'
        ? { host, port, username, password, defaultPath }
        : { accessKey, secretKey, defaultBucket, defaultPath }),
      createdBy: editingStream?.createdBy || 'Current User',
      createdDate: editingStream?.createdDate || new Date().toISOString(),
      processStatus: editingStream?.processStatus || 'Active',
      processedFullTime: editingStream?.processedFullTime || '-',
    };

    onSave(stream);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setSourceType('AWS S3');
    setHost('');
    setPort('22');
    setUsername('');
    setPassword('');
    setDefaultPath('');
    setAccessKey('');
    setSecretKey('');
    setDefaultBucket('');
    setShowPassword(false);
    setShowSecretKey(false);
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
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D3748' }}>
          {editingStream ? 'Edit Data Stream' : 'Add New Data Stream'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 3, px: 3 }}>
        {/* Name Field */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
            Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter stream name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Box>

        {/* Source Type Selection */}
        <Box sx={{ mb: 2.5 }}>
          <FormControl component="fieldset">
            <FormLabel
              component="legend"
              sx={{ fontWeight: 600, color: 'text.primary', mb: 1, fontSize: '0.9rem' }}
            >
              Source Type <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </FormLabel>
            <RadioGroup
              row
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as 'AWS S3' | 'SFTP')}
            >
              <FormControlLabel
                value="AWS S3"
                control={<Radio size="small" />}
                label="AWS S3"
                sx={{ mr: 3 }}
              />
              <FormControlLabel
                value="SFTP"
                control={<Radio size="small" />}
                label="SFTP"
              />
            </RadioGroup>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Conditional Fields based on Source Type */}
        {sourceType === 'SFTP' ? (
          <>
            {/* SFTP Fields */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                Host <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="sftp.example.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                Port
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={port}
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    backgroundColor: '#F8FAFB',
                  },
                }}
              />
            </Box>

            {/* Username and Password in one row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                  Username <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                  Password <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                />
              </Box>
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                Default Path
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="/path/to/directory"
                value={defaultPath}
                onChange={(e) => setDefaultPath(e.target.value)}
              />
            </Box>
          </>
        ) : (
          <>
            {/* AWS S3 Fields */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                Access Key <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="AKIA..."
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                Secret Key <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                fullWidth
                size="small"
                type={showSecretKey ? 'text' : 'password'}
                placeholder="Enter secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        edge="end"
                        size="small"
                      >
                        {showSecretKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                Default Bucket <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="my-bucket-name"
                value={defaultBucket}
                onChange={(e) => setDefaultBucket(e.target.value)}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                Default Path
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="/path/to/directory"
                value={defaultPath}
                onChange={(e) => setDefaultPath(e.target.value)}
              />
            </Box>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{
            px: 3,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            px: 3,
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: '#296695',
            '&:hover': {
              backgroundColor: '#1e4d6f',
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataStreamDialog;
