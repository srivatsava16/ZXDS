import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Chip,
  Stack,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  Assessment,
  Description,
  Add,
  TrendingUp,
  Schedule,
  CheckCircle,
  Close,
  Save,
  Edit,
  FileCopy,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import OutputModule from '../../../components/OutputModule/OutputModule';
import StatsConfigDialog from '../../../components/StatsConfigDialog/StatsConfigDialog';
import { getAllReports, reportInserts, type Report as ApiReport } from '../../../services/api';
import ContentLoader from '../../../components/ContentLoader/ContentLoader';

interface ReportData {
  id: number;
  requestName: string;
  createdDate: string | null;
  processedDate: string | null;
  createdBy: string;
  updatedBy: string;
  updatedDate: string | null;
  status: 'Pending' | 'Inprogress' | 'Completed' | 'Failed' | 'Waiting';
  requestType: 'Adhoc' | 'Scheduled';
  recipientEmail: string;
  scheduleDateTime: string | null;
}

interface ApiResponse {
  success: boolean;
  totalRequests: number;
  data: ReportData[];
  Counts: {
    TodayRequests: number;
    Waiting: number;
    Inprogress: number;
    Completed: number;
  };
}

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFileDetails, setSelectedFileDetails] = useState<{ fileName: string; count: number }[]>([]);
  const [fileGenerationDialogOpen, setFileGenerationDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsRequestId, setStatsRequestId] = useState<number | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<ReportData | null>(null);

  // API-related state - Initialize with empty data
  const [reports, setReports] = useState<ReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [apiCounts, setApiCounts] = useState<{
    TodayRequests: number;
    Waiting: number;
    Inprogress: number;
    Completed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load reports from API with pagination
  const loadReports = async (offset: number = 0, limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);

      const response: any = await getAllReports({ offset, limit });

      // Handle API response format
      if (response && response.success) {
        // Set reports and total count from API
        setReports(response.data || []);
        setTotalCount(parseInt(response.totalRequests) || 0);
        setApiCounts(response.Counts || null);
      } else {
        // If API returns unsuccessful response, show error
        setError('Failed to load reports. Please try again.');
        setReports([]);
        setTotalCount(0);
        setApiCounts(null);
      }
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err?.message || 'Failed to load reports. Please try again.');
      setReports([]);
      setTotalCount(0);
      setApiCounts(null);
    } finally {
      setLoading(false);
    }
  };

  // Load reports when component mounts or pagination changes
  useEffect(() => {
    const offset = page * rowsPerPage;
    loadReports(offset, rowsPerPage);
  }, [page, rowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilePathClick = (fileDetails: { fileName: string; count: number }[]) => {
    setSelectedFileDetails(fileDetails);
    setFileDialogOpen(true);
  };

  const handleCloseFileDialog = () => {
    setFileDialogOpen(false);
  };

  const handleNewRequest = () => {
    navigate('/dataPullRequests/new');
  };

  const handleDuplicate = (requestId: number) => {
    // Navigate to creation page with duplicate parameter
    navigate(`/dataPullRequests/new?duplicate=${requestId}`);
  };

  const handleOpenFileGeneration = (requestId: number) => {
    setSelectedRequestId(requestId);
    setFileGenerationDialogOpen(true);
  };

  const handleCloseFileGeneration = () => {
    setFileGenerationDialogOpen(false);
    setSelectedRequestId(null);
  };

  const handleSaveFileGeneration = () => {
    // Handle save logic here

    handleCloseFileGeneration();
  };

  const handleOpenStats = (requestId: number) => {
    // Find the report data from the current reports list
    const reportData = reports.find(r => r.id === requestId);
    setStatsRequestId(requestId);
    setSelectedReportData(reportData || null);
    setStatsDialogOpen(true);
  };

  const handleCloseStats = () => {
    setStatsDialogOpen(false);
    setStatsRequestId(null);
    setSelectedReportData(null);
  };

  const handleStopRequest = async (requestId: number) => {
    // Confirm before stopping
    const confirmed = window.confirm('Are you sure you want to stop this request?');
    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);

      // Call reportInserts.php with STOP status
      const response = await reportInserts({
        requestId,
        status: 'STOP',
      });

      if (response.success) {
        // Refresh the data with current pagination settings
        await loadReports(page * rowsPerPage, rowsPerPage);
        alert('Request stopped successfully');
      } else {
        setError(response.message || 'Failed to stop request');
        alert(response.message || 'Failed to stop request');
      }
    } catch (err: any) {
      console.error('Error stopping request:', err);
      const errorMessage = err?.message || 'Failed to stop request. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChipStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          backgroundColor: '#10B981', // Light green
          color: '#fff',
        };
      case 'Inprogress':
        return {
          backgroundColor: '#FBBF24', // Light yellow
          color: '#fff',
        };
      case 'Failed':
        return {
          backgroundColor: '#F87171', // Light red
          color: '#fff',
        };
      case 'Pending':
        return {
          backgroundColor: '#3B82F6', // Blue
          color: '#fff',
        };
      case 'Waiting':
        return {
          backgroundColor: '#8B5CF6', // Purple
          color: '#fff',
        };
      default:
        return {
          backgroundColor: '#E5E7EB',
          color: '#6B7280',
        };
    }
  };

  // Use API counts if available, otherwise fallback to calculated stats
  const getDisplayStats = () => {
    if (apiCounts) {
      return {
        total: apiCounts.TodayRequests,
        inProgress: apiCounts.Inprogress,
        completed: apiCounts.Completed
      };
    }
    
    // Fallback calculation for when API is not available
    const today = new Date().toISOString().split('T')[0];
    const todayRequests = reports.filter(request => 
      request.createdDate && request.createdDate.split(' ')[0] === today
    );
    
    return {
      total: todayRequests.length,
      inProgress: todayRequests.filter(r => r.status === 'Inprogress' || r.status === 'Pending').length,
      completed: todayRequests.filter(r => r.status === 'Completed').length
    };
  };

  const displayStats = getDisplayStats();

  const stats = [
    { label: 'Total Requests (Today)', value: displayStats.total.toString(), icon: TrendingUp, color: '#296695' },
    { label: 'In Progress (Today)', value: displayStats.inProgress.toString(), icon: Schedule, color: '#F59E0B' },
    { label: 'Completed (Today)', value: displayStats.completed.toString(), icon: CheckCircle, color: '#10B981' },
  ];

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#2D3748',
                mb: 0.5,
              }}
            >
              Data Pull Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Manage and monitor all data pull requests
            </Typography>
            {error && (
              <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => loadReports(page * rowsPerPage, rowsPerPage)}
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
              size="small"
              startIcon={<Add />}
              onClick={handleNewRequest}
              sx={{
                px: 3,
                py: 0.75,
                fontSize: '0.875rem',
                boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
              }}
            >
              New Request
            </Button>
          </Stack>
        </Box>

        {/* Stats Cards */}
        <Stack direction="row" spacing={3}>
          {stats.map((stat, index) => (
            <Card
              key={index}
              sx={{
                flex: 1,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFB 100%)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${stat.color}15`,
                    }}
                  >
                    <stat.icon sx={{ fontSize: 28, color: stat.color }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      {/* Table Section */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <ContentLoader message="Loading data pull reports..." minHeight="500px" />
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                <TableCell sx={{ width: '80px' }} align="center">ID</TableCell>
                <TableCell>Request Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Processed Date</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Updated By</TableCell>
                <TableCell>Updated Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports && reports.length > 0 ? (
              reports.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.04)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                  <TableCell align="center">
                    <Chip
                      label={row.id}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(41, 102, 149, 0.08)',
                        color: '#296695',
                        border: '1px solid rgba(41, 102, 149, 0.2)',
                        minWidth: '50px',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {row.requestName || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status || 'Unknown'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        ...getStatusChipStyle(row.status),
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.createdDate ? row.createdDate.split(' ')[0] : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.processedDate ? row.processedDate.split(' ')[0] : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.createdBy || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.updatedBy || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.updatedDate ? row.updatedDate.split(' ')[0] : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {/* Edit Icon - Enabled for all statuses */}
                      <Tooltip title="Edit request" arrow>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/dataPullRequests/edit/${row.id}`)}
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'rgba(41, 102, 149, 0.12)',
                            },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Duplicate Icon - Enabled for all statuses */}
                      <Tooltip title="Duplicate request" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleDuplicate(row.id)}
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'rgba(41, 102, 149, 0.12)',
                            },
                          }}
                        >
                          <FileCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Stats Icon - Enabled for all statuses */}
                      <Tooltip title="View stats" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenStats(row.id)}
                          sx={{
                            color: 'success.main',
                            '&:hover': {
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            },
                          }}
                        >
                          <Assessment fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* File Generation Icon - Enabled for all statuses */}
                      <Tooltip title="Generate files" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenFileGeneration(row.id)}
                          sx={{
                            color: 'info.main',
                            '&:hover': {
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            },
                          }}
                        >
                          <Description fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Stop Icon - Enabled for all statuses */}
                      <Tooltip title="Stop request" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleStopRequest(row.id)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'rgba(244, 67, 54, 0.12)',
                            },
                          }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No reports available
                  </Typography>
                </TableCell>
              </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {!loading && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          />
        )}
      </TableContainer>

      {/* File Details Dialog */}
      <Dialog
        open={fileDialogOpen}
        onClose={handleCloseFileDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
          },
        }}
      >
        <DialogTitle sx={{ pb: 2, fontWeight: 700 }}>File Details</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                  <TableCell>File Name</TableCell>
                  <TableCell align="right">Record Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedFileDetails.map((file, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {file.fileName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={file.count.toLocaleString()}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* File Generation Dialog */}
      <Dialog
        open={fileGenerationDialogOpen}
        onClose={handleCloseFileGeneration}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxHeight: '85vh',
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
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D3748' }}>
              File Generation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mt: 0.5 }}>
              Configure output settings for file generation
            </Typography>
          </Box>
          <IconButton onClick={handleCloseFileGeneration} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ py: 3, px: 3 }}>
          <OutputModule />
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCloseFileGeneration}
            startIcon={<Close />}
            sx={{
              px: 3,
              py: 0.75,
              textTransform: 'none',
              fontSize: '0.875rem',
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveFileGeneration}
            startIcon={<Save />}
            sx={{
              px: 3,
              py: 0.75,
              textTransform: 'none',
              fontSize: '0.875rem',
              boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Configuration Dialog */}
      <StatsConfigDialog
        open={statsDialogOpen}
        onClose={handleCloseStats}
        requestId={statsRequestId}
        initialReportData={selectedReportData}
      />
    </Box>
  );
};

export default ReportPage;
