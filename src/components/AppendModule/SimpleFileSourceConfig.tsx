import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Select,
  MenuItem,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { InputSource } from '../InputModule/InputModule';

interface SimpleFileSourceConfigProps {
  data: Partial<InputSource>;
  onChange: (data: Partial<InputSource>) => void;
}

// Preconfigured sources
// File sources will be fetched from API
const SFTP_SOURCES = ['SFTP_SOURCE_1', 'SFTP_SOURCE_2', 'SFTP_SOURCE_3'];
const AWS_SOURCES = ['AWS_S3_BUCKET_1', 'AWS_S3_BUCKET_2', 'AWS_S3_BUCKET_3'];

const DELIMITERS = [
  { label: 'Comma (,)', value: ',' },
  { label: 'Pipe (|)', value: '|' },
  { label: 'Tab', value: '\t' },
  { label: 'Semicolon (;)', value: ';' },
  { label: 'Custom', value: 'custom' },
];

const SimpleFileSourceConfig: React.FC<SimpleFileSourceConfigProps> = ({ data, onChange }) => {
  const [fileSource, setFileSource] = useState<string>(data.subSourceType || 'SFTP');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [filePath, setFilePath] = useState<string>(data.filePath || '');
  const [fileName, setFileName] = useState<string>(data.fileName || '');
  const [delimiter, setDelimiter] = useState<string>(data.delimiter || ',');
  const [hasHeader, setHasHeader] = useState<boolean>(data.hasHeader ?? true);
  const [previewData, setPreviewData] = useState<any[]>(data.previewData || []);
  const [headers, setHeaders] = useState<string[]>(data.headers || []);
  const [headerDialogOpen, setHeaderDialogOpen] = useState(false);
  const [customHeader, setCustomHeader] = useState<string>('');
  const [customDelimiter, setCustomDelimiter] = useState<string>('');

  // Initialize state from data prop when editing
  useEffect(() => {
    if (data.subSourceType) {
      setFileSource(data.subSourceType);
    }
    if (data.fileSource) {
      setSelectedSource(data.fileSource);
    }
    if (data.filePath) {
      setFilePath(data.filePath);
    }
    if (data.fileName) {
      setFileName(data.fileName);
    }
    if (data.delimiter) {
      setDelimiter(data.delimiter);
    }
    if (data.hasHeader !== undefined) {
      setHasHeader(data.hasHeader);
    }
    if (data.previewData) {
      setPreviewData(data.previewData);
    }
    if (data.headers) {
      setHeaders(data.headers);
    }
  }, [data]);

  const handleFileSourceChange = (value: string) => {
    setFileSource(value);
    setSelectedSource('');
    updateParentData({ subSourceType: value, fileSource: '' });
  };

  const handleGetTop10Records = () => {
    // Simulate fetching top 10 records with EMAIL_MD5 values
    const mockData = [
      { EMAIL_ID: 'john@example.com', PROFILE_ID: '12345', LIST_ID: 'L001', EMAIL_MD5: '5c5e3e9f8f9c2d6b8e3a1f7c9d4e2b1a' },
      { EMAIL_ID: 'jane@example.com', PROFILE_ID: '12346', LIST_ID: 'L002', EMAIL_MD5: '8f7d6e5c4b3a2e1f9d8c7b6a5e4d3c2b' },
      { EMAIL_ID: 'bob@example.com', PROFILE_ID: '12347', LIST_ID: 'L003', EMAIL_MD5: '3a2b1c9d8e7f6a5b4c3d2e1f9a8b7c6d' },
      { EMAIL_ID: 'alice@example.com', PROFILE_ID: '12348', LIST_ID: 'L004', EMAIL_MD5: '7c6d5e4f3a2b1c9d8e7f6a5b4c3d2e1f' },
      { EMAIL_ID: 'charlie@example.com', PROFILE_ID: '12349', LIST_ID: 'L005', EMAIL_MD5: '2e1f9a8b7c6d5e4f3a2b1c9d8e7f6a5b' },
      { EMAIL_ID: 'david@example.com', PROFILE_ID: '12350', LIST_ID: 'L006', EMAIL_MD5: '6a5b4c3d2e1f9a8b7c6d5e4f3a2b1c9d' },
      { EMAIL_ID: 'emma@example.com', PROFILE_ID: '12351', LIST_ID: 'L007', EMAIL_MD5: '1c9d8e7f6a5b4c3d2e1f9a8b7c6d5e4f' },
      { EMAIL_ID: 'frank@example.com', PROFILE_ID: '12352', LIST_ID: 'L008', EMAIL_MD5: '9a8b7c6d5e4f3a2b1c9d8e7f6a5b4c3d' },
      { EMAIL_ID: 'grace@example.com', PROFILE_ID: '12353', LIST_ID: 'L009', EMAIL_MD5: '4c3d2e1f9a8b7c6d5e4f3a2b1c9d8e7f' },
      { EMAIL_ID: 'henry@example.com', PROFILE_ID: '12354', LIST_ID: 'L010', EMAIL_MD5: '8e7f6a5b4c3d2e1f9a8b7c6d5e4f3a2b' },
    ];

    const detectedHeaders = Object.keys(mockData[0]);

    setPreviewData(mockData);
    setHeaders(detectedHeaders);

    // Auto-populate source name from filename (without extension)
    const autoSourceName = fileName.split('/').pop()?.split('\\').pop()?.replace(/\.[^/.]+$/, '') || '';

    updateParentData({
      previewData: mockData,
      headers: detectedHeaders,
      sourceName: autoSourceName,
    });
  };

  const handleHeaderChange = (value: boolean) => {
    setHasHeader(value);
    if (!value) {
      setHeaderDialogOpen(true);
    }
    updateParentData({ hasHeader: value });
  };

  const handleSaveCustomHeader = () => {
    const newHeaders = customHeader.split(delimiter).map(h => h.trim());

    const newHeadersOnly = [...newHeaders];

    setHeaders(newHeadersOnly);
    setHeaderDialogOpen(false);
    updateParentData({ headers: newHeadersOnly });
  };

  const updateParentData = (updates: Partial<InputSource>) => {
    onChange({
      ...data,
      ...updates,
      subSourceType: updates.subSourceType !== undefined ? updates.subSourceType : fileSource,
      fileSource: updates.fileSource !== undefined ? updates.fileSource : data.fileSource,
      filePath: updates.filePath !== undefined ? updates.filePath : filePath,
      fileName: updates.fileName !== undefined ? updates.fileName : fileName,
      delimiter: updates.delimiter !== undefined ? updates.delimiter : delimiter,
      hasHeader: updates.hasHeader !== undefined ? updates.hasHeader : hasHeader,
      headers: updates.headers !== undefined ? updates.headers : headers,
      previewData: updates.previewData !== undefined ? updates.previewData : previewData,
    });
  };

  return (
    <Box>
      {/* File Source Selection */}
      <Box sx={{ mb: 2 }}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel sx={{ fontWeight: 600, color: 'text.primary', mb: 1, fontSize: '0.9rem' }}>
            File Source <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
          </FormLabel>
          <RadioGroup
            row
            value={fileSource}
            onChange={(e) => handleFileSourceChange(e.target.value)}
          >
            <FormControlLabel value="SFTP" control={<Radio size="small" />} label="SFTP" sx={{ mr: 2 }} />
            <FormControlLabel value="NFS" control={<Radio size="small" />} label="NFS" sx={{ mr: 2 }} />
            <FormControlLabel value="AWS S3" control={<Radio size="small" />} label="AWS S3" sx={{ mr: 2 }} />
            <FormControlLabel value="Desktop" control={<Radio size="small" />} label="Desktop" />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Preconfigured Source Dropdown for SFTP and AWS */}
      {(fileSource === 'SFTP' || fileSource === 'AWS S3') && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
            Select Preconfigured SourceS
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              updateParentData({ fileSource: e.target.value });
            }}
            displayEmpty
          >
            <MenuItem value="">
              <em>Select {fileSource} Source</em>
            </MenuItem>
            {(fileSource === 'SFTP' ? SFTP_SOURCES : AWS_SOURCES).map((source: string) => (
              <MenuItem key={source} value={source}>
                {source}
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}

      {/* Input FilePath/Name and Get Top 10 Records */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
          {fileSource === 'Desktop' ? 'Upload File' : 'Input FilePath/Name'} <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {fileSource === 'Desktop' ? (
            <>
              <Button
                variant="outlined"
                component="label"
                size="small"
                sx={{
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  flex: '0 0 75%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {fileName || 'Choose File...'}
                <input
                  type="file"
                  hidden
                  accept=".csv,.txt,.tsv,.dat"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFileName(file.name);
                      setFilePath(file.name);
                      updateParentData({ fileName: file.name, filePath: file.name });
                    }
                  }}
                />
              </Button>
            </>
          ) : (
            <TextField
              size="small"
              placeholder="/data/input/data.csv or C:\Data\Input\data.csv"
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value);
                updateParentData({ fileName: e.target.value });
              }}
              sx={{ flex: '0 0 75%' }}
            />
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={handleGetTop10Records}
            disabled={!fileName}
            sx={{
              textTransform: 'none',
              flex: '1',
              whiteSpace: 'nowrap'
            }}
          >
            Get Top 10 Records
          </Button>
        </Box>
      </Box>

      {/* Preview Data Table */}
      {previewData.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Top 10 Records Preview
          </Typography>
          <TableContainer
            component={Paper}
            sx={{
              maxHeight: 350,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableCell key={header} sx={{ backgroundColor: '#F8FAFB', fontWeight: 600, py: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {header}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.map((row, idx) => (
                  <TableRow key={idx} hover>
                    {headers.map((header) => (
                      <TableCell key={header} sx={{ py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {row[header]}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Delimiter Selection */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
          Delimiter (Auto-detected, can be changed)
        </Typography>
        <RadioGroup
          row
          value={delimiter}
          onChange={(e) => {
            const newValue = e.target.value;
            setDelimiter(newValue);
            if (newValue !== 'custom') {
              setCustomDelimiter('');
              updateParentData({ delimiter: newValue });
            }
          }}
        >
          {DELIMITERS.map((d) => (
            <FormControlLabel
              key={d.value}
              value={d.value}
              control={<Radio size="small" />}
              label={d.label}
              sx={{ mr: 2 }}
            />
          ))}
        </RadioGroup>

        {/* Custom Delimiter Input */}
        {delimiter === 'custom' && (
          <Box sx={{ mt: 1.5 }}>
            <TextField
              size="small"
              placeholder="Enter custom delimiter (e.g., ~, ^, etc.)"
              value={customDelimiter}
              onChange={(e) => {
                const value = e.target.value;
                setCustomDelimiter(value);
                updateParentData({ delimiter: value });
              }}
              sx={{
                width: '300px',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
              helperText="Enter any single or multi-character delimiter"
            />
          </Box>
        )}
      </Box>

      {/* Header Yes/No */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
          Header
        </Typography>
        <RadioGroup
          row
          value={hasHeader ? 'yes' : 'no'}
          onChange={(e) => handleHeaderChange(e.target.value === 'yes')}
        >
          <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" sx={{ mr: 2 }} />
          <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
        </RadioGroup>
      </Box>

      {/* Source Name */}
      {headers.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
            Source Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter a name for this source"
            value={data.sourceName || ''}
            onChange={(e) => {
              updateParentData({ sourceName: e.target.value });
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
              },
            }}
          />
        </Box>
      )}

      {/* Custom Header Dialog */}
      <Dialog open={headerDialogOpen} onClose={() => setHeaderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Update Header
            </Typography>
            <IconButton onClick={() => setHeaderDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Typography variant="body2" sx={{ mb: 1.5, fontSize: '0.9rem' }}>
            Enter custom header line (use delimiter: {delimiter})
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder="EMAIL_ID,PROFILE_ID,LIST_ID"
            value={customHeader}
            onChange={(e) => setCustomHeader(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button size="small" onClick={() => setHeaderDialogOpen(false)}>Cancel</Button>
          <Button size="small" variant="contained" onClick={handleSaveCustomHeader}>
            Save Header
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimpleFileSourceConfig;
