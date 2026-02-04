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
import { getTop10Records, type Top10RecordsRequest, type Top10RecordsResponse } from '../../services/api';

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

  // Store the actual uploaded file for Desktop source
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);

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

  const handleGetTop10Records = async () => {
    if (!fileName || (fileSource !== 'Desktop' && !selectedSource)) {
      alert('Please select a file source and enter a file name.');
      return;
    }

    // For Desktop source, validate that a file is uploaded
    if (fileSource === 'Desktop' && !uploadedFile) {
      alert('Please select a file to upload.');
      return;
    }

    setIsLoadingRecords(true);

    try {
      let response: Top10RecordsResponse | any[];

      // For Desktop source, send file using multipart/form-data
      if (fileSource === 'Desktop' && uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('fileSource', fileSource);
        formData.append('sourceOption', '1'); // Default source option for Desktop
        formData.append('sourceType', 'file');

        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`  ${key}:`, value.name, `(${value.size} bytes)`);
          } else {
            console.log(`  ${key}:`, value);
          }
        }

        // Make the API call with FormData
        response = await getTop10Records(formData as any);
      } else {
        // Construct the regular JSON payload for other sources
        const payload: Top10RecordsRequest = {
          fileSource: fileSource,
          inputFilePath: fileName,
          sourceOption: 1, // Default for custom sources
          sourceType: 'file'
        };
        // Make the API call
        response = await getTop10Records(payload);
      }

      // Handle response data
      let responseData: Record<string, any>[];

      if (response && typeof response === 'object' && !Array.isArray(response) && 'data' in response && Array.isArray(response.data)) {
        responseData = response.data;
      } else if (Array.isArray(response)) {
        responseData = response;
      } else {
        alert('Invalid response format from API.');
        setIsLoadingRecords(false);
        return;
      }

      if (responseData?.length === 0) {
        alert('No data found in the file. Please check the file format.');
        setIsLoadingRecords(false);
        return;
      }

      const detectedHeaders = Object.keys(responseData[0]);

      setPreviewData(responseData);
      setHeaders(detectedHeaders);

      // Auto-populate source name from filename (without extension)
      const autoSourceName = fileName.split('/').pop()?.split('\\').pop()?.replace(/\.[^/.]+$/, '') || '';

      updateParentData({
        previewData: responseData,
        headers: detectedHeaders,
        sourceName: autoSourceName,
      });

      setIsLoadingRecords(false);
    } catch (error: any) {
      console.error('Error fetching top 10 records:', error);
      alert(error?.message || 'Failed to fetch data from the file. Please try again.');
      setIsLoadingRecords(false);
    }
  };

  const handleHeaderChange = (value: boolean) => {
    setHasHeader(value);
    if (!value) {
      setHeaderDialogOpen(true);
    }
    updateParentData({ hasHeader: value });
  };

  const handleSaveCustomHeader = () => {
    const newHeaders = customHeader?.split(delimiter).map(h => h?.trim());

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

      {/* Input FilePath/Name and Get Sample Recods */}
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
                  accept=".csv,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Store the actual file object for upload
                      setUploadedFile(file);
                      setFileName(file.name);
                      setFilePath(file.name);

                      // Reset preview when file changes
                      setPreviewData([]);
                      setHeaders([]);

                      updateParentData({ fileName: file.name, filePath: file.name, headers: [], previewData: [] });
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
            disabled={!fileName || isLoadingRecords}
            sx={{
              textTransform: 'none',
              flex: '1',
              whiteSpace: 'nowrap'
            }}
          >
            {isLoadingRecords ? 'Loading...' : 'Get Sample Recods'}
          </Button>
        </Box>
      </Box>

      {/* Preview Data Table */}
      {previewData?.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            SampleRecords
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
                  {headers?.map((header) => (
                    <TableCell key={header} sx={{ backgroundColor: '#F8FAFB', fontWeight: 600, py: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {header}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData?.map((row, idx) => (
                  <TableRow key={idx} hover>
                    {headers?.map((header) => (
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
          Delimiter
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
          {DELIMITERS?.map((d) => (
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
      {headers?.length > 0 && (
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
