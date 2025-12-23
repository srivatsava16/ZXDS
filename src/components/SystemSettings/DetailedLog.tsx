import { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  TablePagination,
  Chip,
  Paper,
} from '@mui/material';
import { Search, ExpandMore, Code, CheckCircle, Error, Warning } from '@mui/icons-material';

interface DetailedLogEntry {
  id: string;
  requestName: string;
  requestType: 'Data Pull' | 'Universe';
  timestamp: string;
  status: 'Success' | 'Failed' | 'Running' | 'Warning';
  user: string;
  logs: string[];
}

const DetailedLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Mock data - Replace with actual API call
  const [detailedLogs] = useState<DetailedLogEntry[]>([
    {
      id: '1',
      requestName: 'Q1_Customer_Data_Pull',
      requestType: 'Data Pull',
      timestamp: '2025-01-19T10:30:15',
      status: 'Success',
      user: 'John Doe',
      logs: [
        '[2025-01-19 10:30:15] INFO: Starting data pull request execution',
        '[2025-01-19 10:30:16] INFO: Connecting to input source: AWS_S3_Customer_Bucket',
        '[2025-01-19 10:30:17] DEBUG: Established connection with credentials',
        '[2025-01-19 10:30:18] INFO: Reading input file: customers_q1_2024.csv',
        '[2025-01-19 10:30:20] INFO: Total records read: 150,000',
        '[2025-01-19 10:30:21] INFO: Applying filters: age > 18 AND state = "CA"',
        '[2025-01-19 10:30:25] DEBUG: Filter result: 45,000 records matched',
        '[2025-01-19 10:30:26] INFO: Executing append operations',
        '[2025-01-19 10:30:30] DEBUG: Appending postal data from Postal_Table',
        '[2025-01-19 10:30:35] INFO: Append complete: 45,000 records enriched',
        '[2025-01-19 10:30:36] INFO: Writing output to destination: SFTP_Output_Server',
        '[2025-01-19 10:30:40] INFO: Output file created: Q1_Customer_Data_Pull_20250119.csv',
        '[2025-01-19 10:30:41] INFO: Data pull request completed successfully',
        '[2025-01-19 10:30:41] INFO: Total execution time: 26 seconds',
      ],
    },
    {
      id: '2',
      requestName: 'Healthcare_Universe_2024',
      requestType: 'Universe',
      timestamp: '2025-01-19T09:30:00',
      status: 'Failed',
      user: 'Jane Smith',
      logs: [
        '[2025-01-19 09:30:00] INFO: Starting universe request execution',
        '[2025-01-19 09:30:01] INFO: Loading universe configuration',
        '[2025-01-19 09:30:02] INFO: Connecting to database: Oracle_Healthcare_DB',
        '[2025-01-19 09:30:05] DEBUG: Connection parameters validated',
        '[2025-01-19 09:30:06] INFO: Executing query: SELECT * FROM healthcare_providers WHERE...',
        '[2025-01-19 09:30:10] ERROR: Database connection timeout',
        '[2025-01-19 09:30:10] ERROR: ORA-12170: TNS:Connect timeout occurred',
        '[2025-01-19 09:30:11] INFO: Retrying connection (attempt 1 of 3)',
        '[2025-01-19 09:30:15] ERROR: Connection retry failed',
        '[2025-01-19 09:30:16] INFO: Retrying connection (attempt 2 of 3)',
        '[2025-01-19 09:30:20] ERROR: Connection retry failed',
        '[2025-01-19 09:30:21] INFO: Retrying connection (attempt 3 of 3)',
        '[2025-01-19 09:30:25] ERROR: All connection attempts failed',
        '[2025-01-19 09:30:25] ERROR: Universe request execution failed',
        '[2025-01-19 09:30:25] INFO: Total execution time: 25 seconds',
      ],
    },
    {
      id: '3',
      requestName: 'Financial_Data_Append',
      requestType: 'Data Pull',
      timestamp: '2025-01-19T08:15:30',
      status: 'Warning',
      user: 'Admin User',
      logs: [
        '[2025-01-19 08:15:30] INFO: Starting data pull request execution',
        '[2025-01-19 08:15:31] INFO: Reading input source: Local_File_Upload',
        '[2025-01-19 08:15:32] INFO: File path: /uploads/financial_data.csv',
        '[2025-01-19 08:15:35] INFO: Total records read: 100,000',
        '[2025-01-19 08:15:36] WARN: Detected 150 duplicate records',
        '[2025-01-19 08:15:37] INFO: Removing duplicates based on primary key: account_id',
        '[2025-01-19 08:15:40] INFO: Duplicate removal complete: 99,850 unique records',
        '[2025-01-19 08:15:41] INFO: Applying suppressions',
        '[2025-01-19 08:15:45] WARN: 25 records suppressed due to invalid data format',
        '[2025-01-19 08:15:46] INFO: Final record count: 99,825',
        '[2025-01-19 08:15:47] INFO: Appending financial indicators',
        '[2025-01-19 08:15:50] INFO: Writing output to AWS S3',
        '[2025-01-19 08:15:55] INFO: Output uploaded successfully',
        '[2025-01-19 08:15:55] WARN: Completed with warnings - review logs for details',
        '[2025-01-19 08:15:55] INFO: Total execution time: 25 seconds',
      ],
    },
    {
      id: '4',
      requestName: 'Monthly_Customer_Extract',
      requestType: 'Data Pull',
      timestamp: '2025-01-18T16:45:00',
      status: 'Success',
      user: 'John Doe',
      logs: [
        '[2025-01-18 16:45:00] INFO: Starting scheduled data pull execution',
        '[2025-01-18 16:45:01] INFO: Schedule trigger: Monthly_Extract_Job',
        '[2025-01-18 16:45:02] INFO: Connecting to database source',
        '[2025-01-18 16:45:05] INFO: Executing extraction query',
        '[2025-01-18 16:45:15] INFO: Query execution complete: 250,000 records',
        '[2025-01-18 16:45:16] INFO: Applying data transformations',
        '[2025-01-18 16:45:20] DEBUG: Transformation pipeline: Normalize -> Validate -> Enrich',
        '[2025-01-18 16:45:30] INFO: Transformations complete',
        '[2025-01-18 16:45:31] INFO: Exporting to multiple destinations',
        '[2025-01-18 16:45:35] INFO: Export 1/3: AWS S3 - Complete',
        '[2025-01-18 16:45:40] INFO: Export 2/3: SFTP Server - Complete',
        '[2025-01-18 16:45:45] INFO: Export 3/3: Local Archive - Complete',
        '[2025-01-18 16:45:46] INFO: All exports completed successfully',
        '[2025-01-18 16:45:46] INFO: Total execution time: 46 seconds',
      ],
    },
    {
      id: '5',
      requestName: 'Real_Estate_Universe',
      requestType: 'Universe',
      timestamp: '2025-01-18T14:30:00',
      status: 'Success',
      user: 'Jane Smith',
      logs: [
        '[2025-01-18 14:30:00] INFO: Starting universe request execution',
        '[2025-01-18 14:30:01] INFO: Universe type: Property_Listings_National',
        '[2025-01-18 14:30:02] INFO: Connecting to data warehouse',
        '[2025-01-18 14:30:05] INFO: Connection established',
        '[2025-01-18 14:30:06] INFO: Executing complex join query across 5 tables',
        '[2025-01-18 14:30:25] INFO: Query execution complete: 1,250,000 records',
        '[2025-01-18 14:30:26] INFO: Applying geographic filters',
        '[2025-01-18 14:30:30] DEBUG: Filter: property_type IN ("Commercial", "Residential")',
        '[2025-01-18 14:30:35] INFO: Post-filter count: 875,000 records',
        '[2025-01-18 14:30:36] INFO: Building universe output file',
        '[2025-01-18 14:30:45] INFO: Generating statistics and metadata',
        '[2025-01-18 14:30:50] INFO: Universe file created successfully',
        '[2025-01-18 14:30:51] INFO: File size: 125 MB',
        '[2025-01-18 14:30:51] INFO: Universe request completed',
        '[2025-01-18 14:30:51] INFO: Total execution time: 51 seconds',
      ],
    },
  ]);

  const filteredLogs = detailedLogs.filter((log) =>
    log.requestName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle sx={{ fontSize: 20, color: '#10B981' }} />;
      case 'Failed':
        return <Error sx={{ fontSize: 20, color: '#EF4444' }} />;
      case 'Warning':
        return <Warning sx={{ fontSize: 20, color: '#F59E0B' }} />;
      default:
        return <Code sx={{ fontSize: 20, color: '#6B7280' }} />;
    }
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
        <Code sx={{ fontSize: 28, color: '#296695' }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D3748' }}>
            Detailed Log
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Technical Query Details - Inspect backend processing logs for each request
          </Typography>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by request name..."
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

      {/* Results Count */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Showing {filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length} of{' '}
        {filteredLogs.length} requests
      </Typography>

      {/* Accordion List */}
      <Box sx={{ mb: 2 }}>
        {filteredLogs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              No requests found matching "{searchQuery}"
            </Typography>
          </Paper>
        ) : (
          filteredLogs
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((log) => (
              <Accordion
                key={log.id}
                sx={{
                  mb: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px !important',
                  '&:before': { display: 'none' },
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    backgroundColor: '#F8FAFB',
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: '#F0F4F8',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                    {getStatusIcon(log.status)}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#296695' }}>
                          {log.requestName}
                        </Typography>
                        <Chip
                          label={log.requestType}
                          size="small"
                          sx={{
                            backgroundColor: '#29669520',
                            color: '#296695',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 20,
                          }}
                        />
                        <Chip
                          label={log.status}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(log.status).bg,
                            color: getStatusColor(log.status).color,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 20,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>User:</strong> {log.user}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Time:</strong>{' '}
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Log Entries:</strong> {log.logs.length}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    p: 2,
                    backgroundColor: '#FAFBFC',
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: '#1E1E1E',
                      borderRadius: 2,
                      maxHeight: 400,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                    }}
                  >
                    {log.logs.map((logLine, index) => {
                      const isError = logLine.includes('ERROR');
                      const isWarning = logLine.includes('WARN');
                      const isDebug = logLine.includes('DEBUG');

                      return (
                        <Typography
                          key={index}
                          variant="body2"
                          sx={{
                            fontSize: '0.75rem',
                            color: isError
                              ? '#FF6B6B'
                              : isWarning
                              ? '#FFD93D'
                              : isDebug
                              ? '#A8DADC'
                              : '#E0E0E0',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            mb: 0.5,
                          }}
                        >
                          {logLine}
                        </Typography>
                      );
                    })}
                  </Paper>
                </AccordionDetails>
              </Accordion>
            ))
        )}
      </Box>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredLogs.length}
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

export default DetailedLog;
