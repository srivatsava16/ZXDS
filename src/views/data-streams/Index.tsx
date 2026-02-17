import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete, Storage, Refresh } from '@mui/icons-material';
import DataStreamDialog from '../../components/DataStreams/DataStreamDialog';
import {
  getAllDataStreams,
  createDataStream,
  updateDataStream,
  type DataStream as ApiDataStream,
  type CreateDataStreamPayload,
  type UpdateDataStreamPayload
} from '../../services/api';

// Local interface for dialog compatibility
interface DialogDataStream {
  id: string;
  name: string;
  sourceType: 'AWS S3' | 'SFTP' | 'NFS';
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  defaultPath?: string;
  accessKey?: string;
  secretKey?: string;
  defaultBucket?: string;
  region?: string;
  createdBy?: string;
  createdDate?: string;
  processStatus?: string;
  processedFullTime?: string;
}

const DataStreamsPage = () => {
  // API-related state - Initialize with empty data
  const [dataStreams, setDataStreams] = useState<ApiDataStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<DialogDataStream | null>(null);

  // Load data streams from API
  const loadDataStreams = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAllDataStreams();

      if (response?.success) {
        setDataStreams(response?.data || []);
      } else {
        setError('Failed to load data streams. Please try again.');
        setDataStreams([]);
      }
    } catch (err: any) {
      console.error('Error loading data streams:', err);
      setError(err?.message || 'Failed to load data streams. Please try again.');
      setDataStreams([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data streams when component mounts
  useEffect(() => {
    loadDataStreams();
  }, []);

  const handleAddNew = () => {
    setEditingStream(null);
    setDialogOpen(true);
  };

  const handleEdit = (stream: ApiDataStream) => {
    // Convert API data stream to dialog format
    // Map sourceTypeCode to sourceType: S -> SFTP, A -> AWS S3, N -> NFS
    let mappedSourceType: 'AWS S3' | 'SFTP' | 'NFS' = 'AWS S3';
    if (stream?.sourceTypeCode === 'S') {
      mappedSourceType = 'SFTP';
    } else if (stream?.sourceTypeCode === 'A') {
      mappedSourceType = 'AWS S3';
    } else if (stream?.sourceTypeCode === 'N') {
      mappedSourceType = 'NFS';
    }

    const dialogStream: DialogDataStream = {
      id: stream?.id?.toString() || '',
      name: stream?.name || '',
      sourceType: mappedSourceType,
      host: stream?.hostname || undefined,
      port: stream?.port?.toString() || undefined,
      username: stream?.fileUsername || undefined,
      password: stream?.filePassword || undefined,
      defaultPath: stream?.defaultPath || undefined,
      accessKey: stream?.accessKey || undefined,
      secretKey: stream?.secretKey || undefined,
      defaultBucket: stream?.bucketName || undefined,
      region: stream?.region || undefined,
      createdBy: stream?.createdBy,
      createdDate: stream?.createdDate,
      processStatus: stream?.processStatus,
      processedFullTime: stream?.updatedDate,
    };
    setEditingStream(dialogStream);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window?.confirm('Are you sure you want to delete this data stream?')) {
      setDataStreams(dataStreams?.filter(stream => stream?.id !== id));
      // TODO: Call API to delete the stream
    }
  };

  const handleSave = async (stream: DialogDataStream) => {
    try {
      setError(null);

      const isUpdate = editingStream !== null;
      let response;

      if (isUpdate) {
        // Update existing data stream
        const updatePayload: UpdateDataStreamPayload = {
          operation: 'Update',
          dataSourceId: parseInt(stream?.id || '0'),
          sourceType: stream?.sourceType === 'SFTP' ? 'S' : 'A',
          updatedBy: 'admin', // TODO: Get from user context
        };

        // Add source-specific fields
        if (stream?.sourceType === 'SFTP') {
          console.log('[DataStreams UPDATE] stream.defaultPath:', stream?.defaultPath);
          updatePayload.hostName = stream?.host || '';
          updatePayload.port = parseInt(stream?.port || '22');
          updatePayload.userName = stream?.username || '';
          // Only include password if it was provided (not undefined)
          if (stream?.password !== undefined) {
            updatePayload.password = stream?.password;
          }
          updatePayload.defaultDirectory = stream?.defaultPath || '';
          console.log('[DataStreams UPDATE] updatePayload.defaultDirectory:', updatePayload.defaultDirectory);
          console.log('[DataStreams UPDATE] Full payload:', updatePayload);
        } else if (stream?.sourceType === 'AWS S3') {
          console.log('[DataStreams UPDATE AWS] stream.defaultPath:', stream?.defaultPath);
          updatePayload.bucketName = stream?.defaultBucket || '';
          updatePayload.accessKey = stream?.accessKey || '';
          // Only include secret key if it was provided (not undefined)
          if (stream?.secretKey !== undefined) {
            updatePayload.secretKey = stream?.secretKey;
          }
          updatePayload.region = stream?.region || 'us-east-1';
          updatePayload.defaultDirectory = stream?.defaultPath || '';
          console.log('[DataStreams UPDATE AWS] updatePayload.defaultDirectory:', updatePayload.defaultDirectory);
          console.log('[DataStreams UPDATE AWS] Full payload:', updatePayload);
        }

        response = await updateDataStream(updatePayload);
      } else {
        // Create new data stream
        const createPayload: CreateDataStreamPayload = {
          operation: 'Add',
          dataStreamName: stream?.name || '',
          sourceCategory: 'F',
          sourceType: stream?.sourceType === 'SFTP' ? 'S' : 'A',
          createdBy: 'admin', // TODO: Get from user context
        };

        // Add source-specific fields
        if (stream?.sourceType === 'SFTP') {
          console.log('[DataStreams CREATE] stream.defaultPath:', stream?.defaultPath);
          createPayload.hostName = stream?.host || '';
          createPayload.port = parseInt(stream?.port || '22');
          createPayload.userName = stream?.username || '';
          createPayload.password = stream?.password || '';
          createPayload.defaultDirectory = stream?.defaultPath || '';
          console.log('[DataStreams CREATE] createPayload.defaultDirectory:', createPayload.defaultDirectory);
          console.log('[DataStreams CREATE] Full payload:', createPayload);
        } else if (stream?.sourceType === 'AWS S3') {
          console.log('[DataStreams CREATE AWS] stream.defaultPath:', stream?.defaultPath);
          createPayload.bucketName = stream?.defaultBucket || '';
          createPayload.accessKey = stream?.accessKey || '';
          createPayload.secretKey = stream?.secretKey || '';
          createPayload.region = stream?.region || 'us-east-1';
          createPayload.defaultDirectory = stream?.defaultPath || '';
          console.log('[DataStreams CREATE AWS] createPayload.defaultDirectory:', createPayload.defaultDirectory);
          console.log('[DataStreams CREATE AWS] Full payload:', createPayload);
        }

        response = await createDataStream(createPayload);
      }

      if (response?.success) {
        setDialogOpen(false);
        setEditingStream(null);
        // Reload data streams to show the changes
        await loadDataStreams();
      } else {
        setError(response?.message || `Failed to ${isUpdate ? 'update' : 'create'} data stream. Please try again.`);
      }
    } catch (err: any) {
      console.error(`Error ${editingStream ? 'updating' : 'creating'} data stream:`, err);
      setError(err?.message || `Failed to ${editingStream ? 'update' : 'create'} data stream. Please try again.`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Storage sx={{ fontSize: 32, color: '#296695' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2D3748' }}>
              Data Streams
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage AWS S3 and SFTP data stream connections
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <IconButton
            onClick={() => loadDataStreams()}
            disabled={loading}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              '&:hover': { backgroundColor: 'grey.50' },
            }}
          >
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNew}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              backgroundColor: '#296695',
              '&:hover': {
                backgroundColor: '#1e4d6f',
              },
            }}
          >
            Add New Data Stream
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Data Streams Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Name
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Source Type
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Created By
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Created Date
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Process Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Completed Date
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading data streams...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : dataStreams?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No data streams configured yet. Click "Add New Data Stream" to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              dataStreams?.map((stream) => (
                <TableRow key={stream?.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                      {stream?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={stream?.sourceType}
                      size="small"
                      sx={{
                        backgroundColor: '#29669520',
                        color: '#296695',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {stream?.createdBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {stream?.createdDate ? new Date(stream?.createdDate).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={stream?.processStatus}
                      size="small"
                      sx={{
                        backgroundColor: stream?.processStatus === 'Active' ? '#10B98120' : '#EF444420',
                        color: stream?.processStatus === 'Active' ? '#10B981' : '#EF4444',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {stream?.updatedDate ? new Date(stream?.updatedDate).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(stream)}
                        sx={{
                          color: 'info.main',
                          '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          },
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(stream?.id)}
                        sx={{
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Data Stream Dialog */}
      <DataStreamDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingStream(null);
        }}
        onSave={handleSave}
        editingStream={editingStream}
      />
    </Box>
  );
};

export default DataStreamsPage;
