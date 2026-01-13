import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
} from '@mui/material';
import type { RequestInputsResponse } from '../../services/api';

export interface DestinationConfig {
  destinationType: 'SFTP' | 'NFS' | 'AWS S3';
  destinationId?: number;
  destinationName: string;
  path?: string;
  filename?: string;
  format?: string;
  compression?: string;
}

interface DestinationSelectorProps {
  value: DestinationConfig | null;
  onChange: (config: DestinationConfig) => void;
  apiSources?: RequestInputsResponse | null;
  sourcesLoading?: boolean;
}

// Default fallback destinations if API fails
const DEFAULT_DESTINATIONS = {
  sftpDestinations: [
    { id: 1, name: 'DC SFTP', path: '/exports/dc' },
    { id: 2, name: 'ZXDS SFTP', path: '/exports/zxds' },
    { id: 3, name: 'BO3 SFTP', path: '/exports/bo3' }
  ],
  nfsDestinations: [
    { id: 4, name: 'NFS Server 1', path: '/mnt/exports/nfs1' },
    { id: 5, name: 'NFS Server 2', path: '/mnt/exports/nfs2' }
  ],
  awsDestinations: [
    { id: 6, name: 'ZXDS S3', bucket: 'zxds-exports' },
    { id: 7, name: 'AWS S3 Primary', bucket: 'aws-primary-exports' },
    { id: 8, name: 'AWS S3 Secondary', bucket: 'aws-secondary-exports' }
  ]
};

const OUTPUT_FORMATS = [
  { label: 'CSV', value: 'CSV' },
  { label: 'Excel', value: 'Excel' },
  { label: 'JSON', value: 'JSON' },
  { label: 'Parquet', value: 'Parquet' },
];

const COMPRESSION_OPTIONS = [
  { label: 'None', value: 'None' },
  { label: 'GZIP', value: 'GZIP' },
  { label: 'ZIP', value: 'ZIP' },
];

const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  value,
  onChange,
  apiSources = null,
  sourcesLoading = false
}) => {
  const [destinationType, setDestinationType] = useState<'SFTP' | 'NFS' | 'AWS S3'>(
    value?.destinationType || 'SFTP'
  );
  const [selectedDestination, setSelectedDestination] = useState<string>(value?.destinationName || '');
  const [path, setPath] = useState<string>(value?.path || '');
  const [filename, setFilename] = useState<string>(value?.filename || 'output_{date}');
  const [format, setFormat] = useState<string>(value?.format || 'CSV');
  const [compression, setCompression] = useState<string>(value?.compression || 'GZIP');

  // Get safe destinations with fallback
  const getSafeDestinations = () => {
    if (!apiSources?.outputDestination) {
      return DEFAULT_DESTINATIONS;
    }
    return {
      sftpDestinations: apiSources.outputDestination.sftpDestinations || DEFAULT_DESTINATIONS.sftpDestinations,
      nfsDestinations: apiSources.outputDestination.nfsDestinations || DEFAULT_DESTINATIONS.nfsDestinations,
      awsDestinations: apiSources.outputDestination.awsDestinations || DEFAULT_DESTINATIONS.awsDestinations,
    };
  };

  const safeDestinations = getSafeDestinations();

  // Get current destinations based on type
  const getCurrentDestinations = () => {
    switch (destinationType) {
      case 'SFTP':
        return safeDestinations.sftpDestinations;
      case 'NFS':
        return safeDestinations.nfsDestinations;
      case 'AWS S3':
        return safeDestinations.awsDestinations;
      default:
        return [];
    }
  };

  const currentDestinations = getCurrentDestinations();

  // Get destination ID from name
  const getDestinationId = (name: string): number | undefined => {
    const destination = currentDestinations.find((d: any) => d.name === name);
    return destination?.id;
  };

  // Handle destination type change
  const handleDestinationTypeChange = (newType: 'SFTP' | 'NFS' | 'AWS S3') => {
    setDestinationType(newType);
    setSelectedDestination('');
    setPath('');

    // Update parent
    onChange({
      destinationType: newType,
      destinationName: '',
      path: '',
      filename,
      format,
      compression,
    });
  };

  // Handle destination selection
  const handleDestinationSelect = (destName: string) => {
    setSelectedDestination(destName);

    // Find the destination to get its default path
    const destination = currentDestinations.find(d => d.name === destName);
    let defaultPath = '';

    if (destination) {
      if ('path' in destination && destination.path) {
        defaultPath = destination.path;
      } else if ('bucket' in destination && destination.bucket) {
        defaultPath = destination.bucket;
      }
    }

    setPath(defaultPath);

    // Update parent
    onChange({
      destinationType,
      destinationId: getDestinationId(destName),
      destinationName: destName,
      path: defaultPath,
      filename,
      format,
      compression,
    });
  };

  // Update parent when path, filename, format, or compression changes
  useEffect(() => {
    if (selectedDestination) {
      onChange({
        destinationType,
        destinationId: getDestinationId(selectedDestination),
        destinationName: selectedDestination,
        path,
        filename,
        format,
        compression,
      });
    }
  }, [path, filename, format, compression]);

  return (
    <Box>
      {/* Destination Type Selection */}
      <Box sx={{ mb: 2 }}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel sx={{ fontWeight: 600, color: 'text.primary', mb: 1, fontSize: '0.9rem' }}>
            Destination Type <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
          </FormLabel>
          <RadioGroup
            row
            value={destinationType}
            onChange={(e) => handleDestinationTypeChange(e.target.value as 'SFTP' | 'NFS' | 'AWS S3')}
          >
            <FormControlLabel value="SFTP" control={<Radio size="small" />} label="SFTP" sx={{ mr: 2 }} />
            <FormControlLabel value="NFS" control={<Radio size="small" />} label="NFS" sx={{ mr: 2 }} />
            <FormControlLabel value="AWS S3" control={<Radio size="small" />} label="AWS S3" />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Preconfigured Destination Dropdown */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
          Select Destination
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
        </Typography>
        <Select
          fullWidth
          size="small"
          value={selectedDestination}
          onChange={(e) => handleDestinationSelect(e.target.value)}
          displayEmpty
          disabled={sourcesLoading}
          sx={{
            backgroundColor: 'white',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.15)',
            },
          }}
        >
          <MenuItem value="" disabled>
            <em>Select a destination...</em>
          </MenuItem>
          {currentDestinations.map((dest) => (
            <MenuItem key={dest.id} value={dest.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography>{dest.name}</Typography>
                {'path' in dest && dest.path && (
                  <Chip
                    label={dest.path}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 20,
                      fontSize: '0.65rem',
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                    }}
                  />
                )}
                {'bucket' in dest && dest.bucket && (
                  <Chip
                    label={dest.bucket}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 20,
                      fontSize: '0.65rem',
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                    }}
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Path/Bucket Configuration */}
      {selectedDestination && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
              {destinationType === 'AWS S3' ? 'Bucket/Path' : 'Path'}
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={destinationType === 'AWS S3' ? 'bucket-name/folder' : '/exports/folder'}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
              Filename Pattern
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="output_{date}.csv"
              helperText="Use {date}, {time}, {timestamp} as placeholders"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Format
              </Typography>
              <Select
                fullWidth
                size="small"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                sx={{
                  backgroundColor: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                {OUTPUT_FORMATS.map((fmt) => (
                  <MenuItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Compression
              </Typography>
              <Select
                fullWidth
                size="small"
                value={compression}
                onChange={(e) => setCompression(e.target.value)}
                sx={{
                  backgroundColor: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                {COMPRESSION_OPTIONS.map((comp) => (
                  <MenuItem key={comp.value} value={comp.value}>
                    {comp.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default DestinationSelector;
