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
  TablePagination,
  Chip,
} from '@mui/material';
import {
  Visibility,
  Add,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
}

const sampleData: ReportData[] = [
  {
    id: 1,
    requestName: 'Sprint Q1 2024',
    filePath: '/data/sprint/q1_2024',
    fileDetails: [
      { fileName: 'customers.csv', count: 15000 },
      { fileName: 'transactions.csv', count: 45000 },
    ],
    createdDate: '2024-01-15',
    processedDate: '2024-01-16',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: '2024-01-16',
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
    createdDate: '2024-02-20',
    processedDate: '',
    createdBy: 'Ranjith Ranga',
    updatedBy: 'Ranjith Ranga',
    updatedDate: '2024-02-21',
    status: 'Processing',
  },
];

const UniversalPullPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFileDetails, setSelectedFileDetails] = useState<{ fileName: string; count: number }[]>([]);

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
    navigate('/universeRequests/new');
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
    </Box>
  );
};

export default UniversalPullPage;
