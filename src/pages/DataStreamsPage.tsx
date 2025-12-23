import { useState } from 'react';
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
} from '@mui/material';
import { Add, Edit, Delete, Storage } from '@mui/icons-material';
import DataStreamDialog from '../components/DataStreams/DataStreamDialog';

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

const DataStreamsPage = () => {
  const [dataStreams, setDataStreams] = useState<DataStream[]>([
    {
      id: '1',
      name: 'Production S3 Stream',
      sourceType: 'AWS S3',
      accessKey: 'AKIA***********',
      defaultBucket: 'prod-data-bucket',
      defaultPath: '/data/streams/',
      createdBy: 'John Doe',
      createdDate: '2025-01-15T10:30:00',
      processStatus: 'Active',
      processedFullTime: '2025-01-15T10:35:22',
    },
    {
      id: '2',
      name: 'Development SFTP Stream',
      sourceType: 'SFTP',
      host: 'sftp.dev.example.com',
      username: 'dev_user',
      defaultPath: '/uploads/dev/',
      createdBy: 'Jane Smith',
      createdDate: '2025-01-10T14:20:00',
      processStatus: 'Active',
      processedFullTime: '2025-01-10T14:25:18',
    },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<DataStream | null>(null);

  const handleAddNew = () => {
    setEditingStream(null);
    setDialogOpen(true);
  };

  const handleEdit = (stream: DataStream) => {
    setEditingStream(stream);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this data stream?')) {
      setDataStreams(dataStreams.filter(stream => stream.id !== id));
    }
  };

  const handleSave = (stream: DataStream) => {
    if (editingStream) {
      // Update existing
      setDataStreams(dataStreams.map(s => s.id === stream.id ? stream : s));
    } else {
      // Add new
      setDataStreams([...dataStreams, { ...stream, id: Date.now().toString() }]);
    }
    setDialogOpen(false);
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
            {dataStreams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No data streams configured yet. Click "Add New Data Stream" to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              dataStreams.map((stream) => (
                <TableRow key={stream.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                      {stream.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={stream.sourceType}
                      size="small"
                      sx={{
                        backgroundColor: stream.sourceType === 'AWS S3' ? '#10B98120' : '#29669520',
                        color: stream.sourceType === 'AWS S3' ? '#10B981' : '#296695',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {stream.createdBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {stream.createdDate ? new Date(stream.createdDate).toLocaleString('en-US', {
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
                      label={stream.processStatus}
                      size="small"
                      sx={{
                        backgroundColor: stream.processStatus === 'Active' ? '#10B98120' : '#EF444420',
                        color: stream.processStatus === 'Active' ? '#10B981' : '#EF4444',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {stream.processedFullTime ? new Date(stream.processedFullTime).toLocaleString('en-US', {
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
                        onClick={() => handleDelete(stream.id)}
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
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        editingStream={editingStream}
      />
    </Box>
  );
};

export default DataStreamsPage;
