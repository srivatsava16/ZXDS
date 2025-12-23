import { useState } from 'react';
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import OutputModule from '../../components/OutputModule/OutputModule';
import StatsConfigDialog from '../../components/StatsConfigDialog/StatsConfigDialog';

interface ReportData {
  id: number;
  requestName: string;
  filePath: string;
  fileDetails: { fileName: string; count: number }[];
  createdDate: string;
  processedDate: string;
  createdBy: string;
  updatedBy: string;
  updatedDate: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Waiting';
}

// Get today's date for sample data
const today = new Date().toISOString().split('T')[0];

const sampleData: ReportData[] = [
  {
    id: 1,
    requestName: 'Sprint Q1 2024',
    filePath: '/data/sprint/q1_2024',
    fileDetails: [
      { fileName: 'customers.csv', count: 15000 },
      { fileName: 'transactions.csv', count: 45000 },
    ],
    createdDate: today, // Today's request
    processedDate: today,
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: today,
    status: 'Completed',
  },
  {
    id: 2,
    requestName: 'Verizon March',
    filePath: '/data/verizon/march',
    fileDetails: [
      { fileName: 'billing.csv', count: 28000 },
    ],
    createdDate: '2024-03-01',
    processedDate: '2024-03-02',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: '2024-03-02',
    status: 'Completed',
  },
  {
    id: 3,
    requestName: 'Credit One Analysis',
    filePath: '/data/creditone/analysis',
    fileDetails: [
      { fileName: 'accounts.csv', count: 12000 },
      { fileName: 'payments.csv', count: 35000 },
    ],
    createdDate: today, // Today's request
    processedDate: '',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: today,
    status: 'Processing',
  },
  {
    id: 4,
    requestName: 'Dish Network Q4 2023',
    filePath: '/data/dish/q4_2023',
    fileDetails: [
      { fileName: 'subscribers.csv', count: 22000 },
      { fileName: 'packages.csv', count: 18000 },
    ],
    createdDate: '2023-12-10',
    processedDate: '2023-12-11',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: '2023-12-11',
    status: 'Completed',
  },
  {
    id: 5,
    requestName: 'Generic Request Jan 2024',
    filePath: '/data/generic/jan_2024',
    fileDetails: [
      { fileName: 'data_extract.csv', count: 50000 },
    ],
    createdDate: today, // Today's request
    processedDate: '',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: today,
    status: 'Failed',
  },
  {
    id: 6,
    requestName: 'Sprint Q2 2024',
    filePath: '/data/sprint/q2_2024',
    fileDetails: [
      { fileName: 'customers.csv', count: 16500 },
      { fileName: 'transactions.csv', count: 48000 },
      { fileName: 'products.csv', count: 8500 },
    ],
    createdDate: '2024-04-01',
    processedDate: '2024-04-02',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: '2024-04-02',
    status: 'Completed',
  },
  {
    id: 7,
    requestName: 'Verizon April Data',
    filePath: '/data/verizon/april',
    fileDetails: [
      { fileName: 'billing.csv', count: 30000 },
      { fileName: 'services.csv', count: 12000 },
    ],
    createdDate: today, // Today's request
    processedDate: '',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: today,
    status: 'Processing',
  },
  {
    id: 8,
    requestName: 'Credit One Q1 Report',
    filePath: '/data/creditone/q1_report',
    fileDetails: [
      { fileName: 'accounts.csv', count: 14000 },
      { fileName: 'payments.csv', count: 38000 },
      { fileName: 'disputes.csv', count: 2500 },
    ],
    createdDate: '2024-03-15',
    processedDate: '2024-03-16',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: '2024-03-16',
    status: 'Completed',
  },
  {
    id: 9,
    requestName: 'Dish Network Q1 2024',
    filePath: '/data/dish/q1_2024',
    fileDetails: [
      { fileName: 'subscribers.csv', count: 24000 },
    ],
    createdDate: '2024-03-20',
    processedDate: '',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: '2024-03-21',
    status: 'Pending',
  },
  {
    id: 10,
    requestName: 'Generic Request Feb 2024',
    filePath: '/data/generic/feb_2024',
    fileDetails: [
      { fileName: 'data_extract.csv', count: 55000 },
      { fileName: 'supplemental.csv', count: 12000 },
    ],
    createdDate: '2024-02-25',
    processedDate: '2024-02-26',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: '2024-02-26',
    status: 'Completed',
  },
  {
    id: 999,
    requestName: 'Comprehensive Demo Request - Q1 2025',
    filePath: '/demo/comprehensive_q1_2025',
    fileDetails: [
      { fileName: 'customer_master_enriched.csv', count: 50000 },
      { fileName: 'transactions_processed.parquet', count: 100000 },
      { fileName: 'credit_analysis_report.xlsx', count: 25000 },
    ],
    createdDate: today, // Today's request
    processedDate: '',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: today,
    status: 'Waiting',
  },
];

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
    console.log('Saving file generation for request:', selectedRequestId);
    handleCloseFileGeneration();
  };

  const handleOpenStats = (requestId: number) => {
    setStatsRequestId(requestId);
    setStatsDialogOpen(true);
  };

  const handleCloseStats = () => {
    setStatsDialogOpen(false);
    setStatsRequestId(null);
  };

  const getStatusChipStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          backgroundColor: '#10B981', // Light green
          color: '#fff',
        };
      case 'Processing':
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

  // Calculate today's statistics
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    const todayRequests = sampleData.filter(request => request.createdDate === today);

    const total = todayRequests.length;
    const inProgress = todayRequests.filter(r => r.status === 'Processing' || r.status === 'Pending').length;
    const completed = todayRequests.filter(r => r.status === 'Completed').length;
    const failed = todayRequests.filter(r => r.status === 'Failed').length;

    return { total, inProgress, completed, failed };
  };

  const todayStats = getTodayStats();

  const stats = [
    { label: 'Total Requests (Today)', value: todayStats.total.toString(), icon: TrendingUp, color: '#296695' },
    { label: 'In Progress (Today)', value: todayStats.inProgress.toString(), icon: Schedule, color: '#F59E0B' },
    { label: 'Completed (Today)', value: todayStats.completed.toString(), icon: CheckCircle, color: '#10B981' },
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
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
              <TableCell>Request Name</TableCell>
              <TableCell>File Path</TableCell>
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
            {sampleData
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                        {row.filePath}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleFilePathClick(row.fileDetails)}
                        sx={{
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'rgba(41, 102, 149, 0.12)',
                          },
                        }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Box>
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
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {/* Edit Icon - Only enabled when status is Pending or Waiting */}
                      <IconButton
                        size="small"
                        disabled={row.status !== 'Pending' && row.status !== 'Waiting'}
                        onClick={() => navigate(`/dataPullRequests/edit/${row.id}`)}
                        sx={{
                          color: (row.status === 'Pending' || row.status === 'Waiting') ? 'primary.main' : 'text.disabled',
                          '&:hover': {
                            backgroundColor: (row.status === 'Pending' || row.status === 'Waiting') ? 'rgba(41, 102, 149, 0.12)' : 'transparent',
                          },
                          '&.Mui-disabled': {
                            color: 'text.disabled',
                            opacity: 0.3,
                          },
                        }}
                        title="Edit"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      {/* Duplicate Icon - Only enabled when status is Completed */}
                      <IconButton
                        size="small"
                        disabled={row.status !== 'Completed'}
                        onClick={() => console.log('Duplicate request:', row.id)}
                        sx={{
                          color: row.status === 'Completed' ? 'primary.main' : 'text.disabled',
                          '&:hover': {
                            backgroundColor: row.status === 'Completed' ? 'rgba(41, 102, 149, 0.12)' : 'transparent',
                          },
                          '&.Mui-disabled': {
                            color: 'text.disabled',
                            opacity: 0.3,
                          },
                        }}
                        title="Duplicate"
                      >
                        <FileCopy fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenStats(row.id)}
                        sx={{
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'rgba(41, 102, 149, 0.12)',
                          },
                        }}
                        title="Stats"
                      >
                        <Assessment fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenFileGeneration(row.id)}
                        sx={{
                          color: 'info.main',
                          '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          },
                        }}
                        title="File Generation"
                      >
                        <Description fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={sampleData.length}
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
      />
    </Box>
  );
};

export default ReportPage;
