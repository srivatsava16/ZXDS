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
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Visibility,
  Add,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAllReports } from '../../../services/api/ReportsService';

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

const UniversalPullPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // API state
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch reports from API
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getAllReports();

        if (response.success && response.data) {
          setReports(response.data);
        } else {
          setError('Failed to load reports. Please try again.');
        }
      } catch (err: any) {
        console.error('Error fetching reports:', err);
        setError(err?.message || 'Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleNewRequest = () => {
    navigate('/universeRequests/new');
  };

  const getStatusChipStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          backgroundColor: '#10B981', // Green
          color: '#fff',
        };
      case 'Inprogress':
        return {
          backgroundColor: '#FBBF24', // Yellow
          color: '#fff',
        };
      case 'Failed':
        return {
          backgroundColor: '#F87171', // Red
          color: '#fff',
        };
      case 'Waiting':
        return {
          backgroundColor: '#3B82F6', // Blue
          color: '#fff',
        };
      case 'Pending':
        return {
          backgroundColor: '#E5E7EB', // Gray
          color: '#6B7280',
        };
      default:
        return {
          backgroundColor: '#E5E7EB',
          color: '#6B7280',
        };
    }
  };

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#2D3748',
                mb: 0.5,
              }}
            >
              Universal File Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Manage and monitor all processing requests
            </Typography>
          </Box>
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
        </Box>
      </Box>

      {/* Error State */}
      {error && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        /* Table Section */
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                <TableCell>Request Name</TableCell>
                <TableCell>Request Type</TableCell>
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
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No reports found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                reports
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
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
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {row.requestName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.requestType}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 600,
                        borderColor: row.requestType === 'Adhoc' ? '#3B82F6' : '#10B981',
                        color: row.requestType === 'Adhoc' ? '#3B82F6' : '#10B981',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        ...getStatusChipStyle(row.status),
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.createdDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.processedDate || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.createdBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.updatedBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.updatedDate}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/universeRequests/view/${row.id}`)}
                      sx={{
                        color: 'primary.main',
                        padding: '3px',
                        '&:hover': {
                          backgroundColor: 'rgba(41, 102, 149, 0.12)',
                        },
                      }}
                      title="View"
                    >
                      <Visibility sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={reports.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          />
        </TableContainer>
      )}
    </Box>
  );
};

export default UniversalPullPage;
