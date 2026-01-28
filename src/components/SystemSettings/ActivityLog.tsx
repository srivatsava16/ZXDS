import { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  TablePagination,
  Chip,
} from '@mui/material';
import { Search, History } from '@mui/icons-material';

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  description: string;
  status: 'Success' | 'Failed' | 'Warning';
}

const ActivityLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Mock data - Replace with actual API call
  const [logs] = useState<ActivityLogEntry[]>([
    {
      id: '1',
      timestamp: '2025-01-19T10:30:00',
      user: 'John Doe',
      action: 'Created',
      module: 'Data Pull Request',
      description: 'Created new data pull request "Q1_Customer_Data"',
      status: 'Success',
    },
    {
      id: '2',
      timestamp: '2025-01-19T10:15:00',
      user: 'Jane Smith',
      action: 'Updated',
      module: 'User Management',
      description: 'Updated user role for "mike.wilson@example.com"',
      status: 'Success',
    },
    {
      id: '3',
      timestamp: '2025-01-19T09:45:00',
      user: 'Admin User',
      action: 'Deleted',
      module: 'Data Stream',
      description: 'Deleted data stream "Old_SFTP_Connection"',
      status: 'Success',
    },
    {
      id: '4',
      timestamp: '2025-01-19T09:30:00',
      user: 'John Doe',
      action: 'Executed',
      module: 'Universe Request',
      description: 'Executed universe request "Healthcare_Universe_2024"',
      status: 'Failed',
    },
    {
      id: '5',
      timestamp: '2025-01-19T09:00:00',
      user: 'Jane Smith',
      action: 'Created',
      module: 'Business Unit',
      description: 'Created new business unit "Marketing Department"',
      status: 'Success',
    },
    {
      id: '6',
      timestamp: '2025-01-19T08:45:00',
      user: 'Admin User',
      action: 'Updated',
      module: 'System Settings',
      description: 'Updated system configuration parameters',
      status: 'Warning',
    },
    {
      id: '7',
      timestamp: '2025-01-18T17:30:00',
      user: 'John Doe',
      action: 'Exported',
      module: 'Data Pull Request',
      description: 'Exported data pull results to CSV',
      status: 'Success',
    },
    {
      id: '8',
      timestamp: '2025-01-18T16:15:00',
      user: 'Jane Smith',
      action: 'Configured',
      module: 'Data Stream',
      description: 'Configured new AWS S3 data stream',
      status: 'Success',
    },
  ]);

  const filteredLogs = logs?.filter(
    (log) =>
      log?.user?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      log?.action?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      log?.module?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      log?.description?.toLowerCase()?.includes(searchQuery?.toLowerCase())
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success':
        return { bg: '#10B98120', color: '#10B981' };
      case 'Failed':
        return { bg: '#EF444420', color: '#EF4444' };
      case 'Warning':
        return { bg: '#F59E0B20', color: '#F59E0B' };
      default:
        return { bg: '#6B728020', color: '#6B7280' };
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <History sx={{ fontSize: 28, color: '#296695' }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D3748' }}>
            Activity Log
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Report Change Log - Track all user actions and system changes
          </Typography>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by user, action, module, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 20, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
        />
      </Box>

      {/* Activity Log Table */}
      <TableContainer
        component={Paper}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          mb: 2,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Timestamp
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                User
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Action
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Module
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Description
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No activity logs found matching "{searchQuery}"
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs
                ?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                ?.map((log) => (
                  <TableRow key={log?.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {new Date(log?.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        {log?.user}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {log?.action}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log?.module}
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
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        {log?.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log?.status}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(log?.status)?.bg,
                          color: getStatusColor(log?.status)?.color,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredLogs?.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: 'white',
        }}
      />
    </Box>
  );
};

export default ActivityLog;
