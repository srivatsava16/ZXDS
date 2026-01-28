import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  FormControl,
  FormControlLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputLabel,
  RadioGroup,
  Radio,
  Tabs,
  Tab,
  TextField,
  Tooltip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
} from '@mui/material';
import {
  Close,
  Add,
  Visibility,
  Delete,
  GetApp,
  TableChart,
  ShowChart,
  BarChart as BarChartIcon,
  PieChart,
  Map as MapIcon,
  Timeline,
  CheckCircle,
  Edit,
  Assessment,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { getRequestById, getRequestStats, reportInserts, type ReportData, type StatsConfiguration as ApiStatsConfiguration, type RequestStatsResponse, type DynamicStatsInputSource } from '../../services/api';

interface GenerateCountConfig {
  id: string;
  fields: string[];
  distinctFields: string[];
}

interface BreakdownConfig {
  id: string;
  fields: string[];
}

interface SavedConfig {
  id: string;
  filename: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  generateCounts: GenerateCountConfig[];
  breakdowns: BreakdownConfig[];
  countDetails?: { field: string; count: number }[];
}

interface StatsConfiguration {
  id: string;
  inputSources: string[];
  countsOn: string[];
  isDistinct: boolean;
  breakdownBy: string[];
}

interface InputSource {
  id: string;
  sourceName: string;
  headers?: string[];
  [key: string]: any;
}

interface StatsConfigDialogProps {
  open: boolean;
  onClose: () => void;
  requestId: number | null;
  availableInputSources?: InputSource[];
  initialReportData?: ReportData | null;
}

// Remove DATA_COMBINATIONS - will use real data from API

// Removed mock visualization data - using real API data instead

const StatsConfigDialog: React.FC<StatsConfigDialogProps> = ({
  open,
  onClose,
  requestId,
  availableInputSources = [],
  initialReportData = null
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // API data state
  const [requestData, setRequestData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preconfigured Stats View state
  const [selectedSourceTable, setSelectedSourceTable] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [statsResults, setStatsResults] = useState<any[] | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Dynamic Stats View state - REVAMPED
  const [selectedDynamicInputSource, setSelectedDynamicInputSource] = useState<string>('');
  const [selectedDynamicCountsOn, setSelectedDynamicCountsOn] = useState<string[]>([]);
  const [selectedDynamicBreakdownBy, setSelectedDynamicBreakdownBy] = useState<string[]>([]);
  const [selectedDynamicDistinctFields, setSelectedDynamicDistinctFields] = useState<string[]>([]);
  const [generatedDynamicStats, setGeneratedDynamicStats] = useState<Array<{
    id: string;
    inputSource: string;
    countsOn: string[];
    breakdownBy: string[];
    distinctFields: string[];
    data: any[];
    expanded: boolean;
    status: 'processing' | 'completed' | 'failed';
    configId?: number;        // For preconfigured stats
    isPreConfigured?: boolean; // To distinguish preconfigured from user-generated
    loadingData?: boolean;     // Loading state for fetching completed data
  }>>([]);
  const [loadingDynamicStats, setLoadingDynamicStats] = useState(false);

  // Suppression Breakdown View state
  const [selectedSuppressionSource, setSelectedSuppressionSource] = useState<string>('');

  // Search states
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [countsOnSearch, setCountsOnSearch] = useState('');
  const [breakdownBySearch, setBreakdownBySearch] = useState('');

  // Snackbar notification state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Fetch request data when dialog opens or use initialReportData if provided
  useEffect(() => {
    const fetchRequestData = async () => {
      if (!open || !requestId) {
        return;
      }

      // If we have initialReportData, use it directly without fetching
      if (initialReportData && initialReportData?.id === requestId) {
        console.log('[StatsConfigDialog] Using provided initialReportData:', initialReportData);
        console.log('[StatsConfigDialog] statsConfigurations:', initialReportData?.statsConfigurations);
        setRequestData(initialReportData);
        setLoading(false);
        return;
      }

      // Otherwise, fetch from API
      try {
        setLoading(true);
        setError(null);
        console.log('[StatsConfigDialog] Fetching request data for requestId:', requestId);
        const data = await getRequestById(requestId);
        console.log('[StatsConfigDialog] Received request data:', data);
        console.log('[StatsConfigDialog] statsConfigurations:', data?.statsConfigurations);
        setRequestData(data);
      } catch (err) {
        console.error('Error fetching request data:', err);
        setError('Failed to load request data');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
  }, [open, requestId, initialReportData]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedSourceTable('');
      setSelectedConfigId(null);
      setStatsResults(null);
      setError(null);
    }
  }, [open]);

  // Load preconfigured dynamic stats from requestData
  useEffect(() => {
    if (!requestData?.dynamicStats?.preconfiguredDynamicStats) {
      setGeneratedDynamicStats([]);
      return;
    }

    const preconfiguredStats = requestData.dynamicStats.preconfiguredDynamicStats;

    // Ensure preconfiguredStats is an array
    if (!Array.isArray(preconfiguredStats)) {
      console.warn('[StatsConfigDialog] preconfiguredDynamicStats is not an array:', preconfiguredStats);
      setGeneratedDynamicStats([]);
      return;
    }

    // Transform preconfigured stats to match our internal format
    const transformedStats: Array<{
      id: string;
      inputSource: string;
      countsOn: string[];
      breakdownBy: string[];
      distinctFields: string[];
      data: any[];
      expanded: boolean;
      status: 'processing' | 'completed' | 'failed';
      configId?: number;
      isPreConfigured?: boolean;
      loadingData?: boolean;
    }> = [];

    preconfiguredStats?.forEach((sourceConfig: any) => {
      // Safety check: ensure configs array exists
      if (!sourceConfig?.configs || !Array.isArray(sourceConfig.configs)) {
        console.warn('[StatsConfigDialog] sourceConfig.configs is missing or not an array:', sourceConfig);
        return;
      }

      sourceConfig.configs?.forEach((config: any) => {
        // Map status: W/R/'' -> processing, C -> completed, E -> failed
        let status: 'processing' | 'completed' | 'failed' = 'processing';
        if (config?.status === 'C') {
          status = 'completed';
        } else if (config?.status === 'E') {
          status = 'failed';
        }
        // W, R, or empty string default to processing

        // Parse fields and breakdown_by (comma-separated strings)
        const countsOn = config?.fields ? config.fields?.split(',').map((f: string) => f?.trim()) : [];
        const breakdownBy = config?.breakdown_by ? config.breakdown_by?.split(',').map((f: string) => f?.trim()) : [];

        transformedStats?.push({
          id: `preconfigured_${config?.configId}`,
          inputSource: sourceConfig?.source_tables,
          countsOn,
          breakdownBy,
          distinctFields: [], // Not available in preconfigured data
          data: [],
          expanded: false,
          status,
          configId: config?.configId,
          isPreConfigured: true,
          loadingData: false,
        });
      });
    });

    console.log('[StatsConfigDialog] Loaded preconfigured dynamic stats:', transformedStats);
    setGeneratedDynamicStats(transformedStats);
  }, [requestData]);

  // Helper function to show snackbar notifications
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Handler to close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Get available input sources from dynamicStats.data
  const availableDynamicInputSources = useMemo(() => {
    if (requestData?.dynamicStats?.data && requestData?.dynamicStats?.data?.length > 0) {
      return requestData?.dynamicStats?.data;
    }
    // Fallback to empty array if no data
    return [];
  }, [requestData]);

  // Get available fields for selected dynamic input source
  const availableDynamicFields = useMemo(() => {
    if (!selectedDynamicInputSource) return [];

    const source = availableDynamicInputSources?.find(s => s?.inputSource === selectedDynamicInputSource);
    return source?.headers || [];
  }, [selectedDynamicInputSource, availableDynamicInputSources]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // New handlers for Dynamic Stats View
  const handleGenerateDynamicStats = async () => {
    if (!requestId) {
      showSnackbar('Request ID not found', 'error');
      return;
    }

    if (!selectedDynamicInputSource || selectedDynamicCountsOn?.length === 0) {
      showSnackbar('Please select Input Source and at least one Counts On field', 'warning');
      return;
    }

    try {
      setLoadingDynamicStats(true);
      setError(null);

      // Find the selected input source details
      const selectedSource = availableDynamicInputSources?.find(s => s?.inputSource === selectedDynamicInputSource);
      if (!selectedSource) {
        showSnackbar('Selected input source not found', 'error');
        setLoadingDynamicStats(false);
        return;
      }

      // Build the payload according to the new structure
      const payload = {
        requestId,
        stats: [
          {
            input_sources: [
              {
                source_name: selectedSource?.inputSource,
                columns: selectedSource?.headers
              }
            ],
            generate_counts_config: {
              counts: selectedDynamicCountsOn?.map(field => ({
                field,
                is_distinct: selectedDynamicDistinctFields?.includes(field)
              }))
            },
            breakdown_by: selectedDynamicBreakdownBy
          }
        ]
      };

      // Call reportInserts.php API
      const response = await reportInserts(payload);

      if (!response?.success) {
        // API failed - keep form values and don't add to list
        setError(response?.message || 'Failed to generate dynamic stats');
        showSnackbar(response?.message || 'Failed to generate dynamic stats', 'error');
        return;
      }

      const statsData = response?.data || [];

      // API succeeded - add to list with processing status (report queued, takes 1-2 hours)
      const newStat = {
        id: Date.now().toString(),
        inputSource: selectedDynamicInputSource,
        countsOn: selectedDynamicCountsOn,
        breakdownBy: selectedDynamicBreakdownBy,
        distinctFields: selectedDynamicDistinctFields,
        data: statsData,
        expanded: false,
        status: 'processing' as const,
        isPreConfigured: false,  // User-generated stat
        loadingData: false,
      };

      setGeneratedDynamicStats(prev => [...prev, newStat]);

      // Reset form only after successful generation
      setSelectedDynamicInputSource('');
      setSelectedDynamicCountsOn([]);
      setSelectedDynamicBreakdownBy([]);
      setSelectedDynamicDistinctFields([]);

      // No snackbar on success - the "Waiting" status in the list indicates the report is queued
    } catch (err) {
      console.error('Error generating dynamic stats:', err);
      const errorMessage = err instanceof Error ? err?.message : 'Failed to generate dynamic stats';

      // Exception occurred - keep form values and don't add to list
      setError(errorMessage);
      showSnackbar(`Failed to generate dynamic stats: ${errorMessage}`, 'error');
    } finally {
      setLoadingDynamicStats(false);
    }
  };

  const handleToggleExpandDynamicStat = async (id: string) => {
    const stat = generatedDynamicStats?.find(s => s?.id === id);

    if (!stat) return;

    // If already expanded, just collapse
    if (stat?.expanded) {
      setGeneratedDynamicStats(prev =>
        prev?.map(s =>
          s?.id === id ? { ...s, expanded: false } : s
        )
      );
      return;
    }

    // If expanding a completed preconfigured stat without data, fetch it
    if (stat?.isPreConfigured && stat?.status === 'completed' && stat?.data?.length === 0 && stat?.configId && requestId) {
      // Set loading state
      setGeneratedDynamicStats(prev =>
        prev?.map(s =>
          s?.id === id ? { ...s, expanded: true, loadingData: true } : s
        )
      );

      try {
        console.log('[handleToggleExpandDynamicStat] Fetching data for configId:', stat?.configId);
        const response = await getRequestStats(requestId, stat?.configId);

        if (response?.success && response?.stats) {
          // Update with fetched data
          setGeneratedDynamicStats(prev =>
            prev?.map(s =>
              s?.id === id ? { ...s, data: response?.stats, loadingData: false } : s
            )
          );
        } else {
          // Failed to fetch data
          setGeneratedDynamicStats(prev =>
            prev?.map(s =>
              s?.id === id ? { ...s, loadingData: false } : s
            )
          );
          showSnackbar('Failed to load stats data', 'error');
        }
      } catch (error) {
        console.error('[handleToggleExpandDynamicStat] Error fetching stats:', error);
        setGeneratedDynamicStats(prev =>
          prev?.map(s =>
            s?.id === id ? { ...s, loadingData: false } : s
          )
        );
        showSnackbar('Error loading stats data', 'error');
      }
    } else {
      // Just expand without fetching
      setGeneratedDynamicStats(prev =>
        prev?.map(s =>
          s?.id === id ? { ...s, expanded: true } : s
        )
      );
    }
  };

  const handleDeleteDynamicStat = (id: string) => {
    const stat = generatedDynamicStats?.find(s => s?.id === id);

    // Don't allow deletion of preconfigured stats
    if (stat?.isPreConfigured) {
      showSnackbar('Cannot delete preconfigured stats', 'warning');
      return;
    }

    if (window.confirm('Are you sure you want to delete this dynamic stat configuration?')) {
      setGeneratedDynamicStats(prev => prev?.filter(stat => stat?.id !== id));
    }
  };

  const handleCancel = () => {
    // Reset all state
    setActiveTab(0);
    setSelectedSourceTable('');
    setSelectedConfigId(null);
    setSelectedDynamicInputSource('');
    setSelectedDynamicCountsOn([]);
    setSelectedDynamicBreakdownBy([]);
    setSelectedDynamicDistinctFields([]);
    setGeneratedDynamicStats([]);
    setStatsResults(null);
    setSelectedSuppressionSource('');
    onClose();
  };

  // Handler for source table selection
  const handleSourceTableChange = (sourceTable: string) => {
    setSelectedSourceTable(sourceTable);
    setSelectedConfigId(null); // Reset config when source table changes
    setStatsResults(null); // Clear previous results
  };

  // Handler for stats combination selection
  const handleStatsConfigChange = (configId: string) => {
    setSelectedConfigId(Number(configId));
    setStatsResults(null); // Clear previous results when changing config
  };

  // Format stats combination display text
  const formatStatsConfig = (config: any) => {
    const fields = config?.fields || '';
    const breakdownBy = config?.breakdown_by || '';
    return `${fields} – BREAKDOWN_BY ${breakdownBy}`;
  };

  // Handler for Generate button
  const handleGenerateStats = async () => {
    if (!requestId || !selectedConfigId) {
      return;
    }

    try {
      setLoadingStats(true);
      setError(null);
      const response = await getRequestStats(requestId, selectedConfigId);

      if (response?.success) {
        // Use response.stats instead of response.data
        setStatsResults(response?.stats || []);
      } else {
        setError(response?.message || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to generate stats');
    } finally {
      setLoadingStats(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!statsResults || statsResults?.length === 0) return;

    // Get headers from first row
    const headers = Object.keys(statsResults?.[0] || {});

    // Create CSV content
    let csvContent = headers?.join(',') + '\n';

    statsResults?.forEach((row: any) => {
      const values = headers?.map(header => {
        const value = row[header];
        // Escape values that contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue?.includes(',') || stringValue?.includes('"') || stringValue?.includes('\n')) {
          return `"${stringValue?.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvContent += values?.join(',') + '\n';
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stats_request_${requestId}_config_${selectedConfigId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel (using HTML table method for simplicity)
  const handleExportExcel = () => {
    if (!statsResults || statsResults?.length === 0) return;

    // Get headers from first row
    const headers = Object.keys(statsResults?.[0] || {});

    // Create HTML table
    let tableHTML = '<table><thead><tr>';
    headers?.forEach(header => {
      tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    statsResults?.forEach((row: any) => {
      tableHTML += '<tr>';
      headers?.forEach(header => {
        const value = row[header];
        tableHTML += `<td>${value !== null && value !== undefined ? value : ''}</td>`;
      });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';

    // Create and trigger download
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stats_request_${requestId}_config_${selectedConfigId}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get available stats configurations for selected source table
  const getAvailableConfigs = () => {
    if (!selectedSourceTable || !requestData?.statsConfigurations) {
      return [];
    }

    const sourceTableConfig = requestData?.statsConfigurations?.find(
      (sc: ApiStatsConfiguration) => sc?.source_tables === selectedSourceTable
    );

    return sourceTableConfig?.configs || [];
  };

  // Removed filteredInputSources - no longer needed as we use availableDynamicInputSources directly

  // Removed renderVisualizationContent function - using real data table instead

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxHeight: '90vh',
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
            Stats Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mt: 0.5 }}>
            Generate stats for Request #{requestId}
          </Typography>
        </Box>
        <IconButton onClick={handleCancel} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Preconfigured Stats View" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' }} />
          <Tab label="Dynamic Stats View" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' }} />
          <Tab label="Suppression Breakdown" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ py: 3, px: 3, minHeight: 400 }}>
        {/* Tab 1: Preconfigured Stats View */}
        {activeTab === 0 && (
          <Box>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {!loading && !error && (
              <>
                {/* Debug Info - Remove after testing */}
                {/* {requestData && (
                  <Box sx={{ mb: 2, p: 1, backgroundColor: '#f0f0f0', fontSize: '0.75rem', borderRadius: 1 }}>
                    <div>Debug: requestData exists: {requestData ? 'Yes' : 'No'}</div>
                    <div>statsConfigurations: {requestData.statsConfigurations ? 'Exists' : 'Null/Undefined'}</div>
                    <div>statsConfigurations length: {requestData.statsConfigurations?.length || 0}</div>
                    {requestData.statsConfigurations && requestData.statsConfigurations?.length > 0 && (
                      <div>First source_table: {requestData.statsConfigurations[0]?.source_tables}</div>
                    )}
                  </Box>
                )} */}

                {/* Source Table Selection */}
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
                    Select Source Table
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="source-table-label">Select Source Table</InputLabel>
                    <Select
                      labelId="source-table-label"
                      value={selectedSourceTable}
                      onChange={(e) => {
                        console.log('[Dropdown] Source table selected:', e.target.value);
                        handleSourceTableChange(e.target.value);
                      }}
                      label="Select Source Table"
                      sx={{ backgroundColor: 'white' }}
                      disabled={!requestData?.statsConfigurations || requestData?.statsConfigurations?.length === 0}
                    >
                      <MenuItem value="">
                        <em>Select Source Table</em>
                      </MenuItem>
                      {(() => {
                        console.log('[Dropdown Render] requestData:', requestData);
                        console.log('[Dropdown Render] statsConfigurations:', requestData?.statsConfigurations);
                        return requestData?.statsConfigurations?.map((sc: ApiStatsConfiguration, index: number) => {
                          console.log(`[Dropdown Render] Rendering item ${index}:`, sc);
                          return (
                            <MenuItem key={sc.source_tables} value={sc.source_tables}>
                              <ListItemText primary={sc.source_tables} />
                            </MenuItem>
                          );
                        });
                      })()}
                    </Select>
                  </FormControl>
                  {requestData && (!requestData?.statsConfigurations || requestData?.statsConfigurations?.length === 0) && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      No stats configurations available for this request
                    </Typography>
                  )}
                </Box>

                {/* Stats Combination Selection */}
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
                    Select Stats Combination
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="combination-label">Select Combination</InputLabel>
                    <Select
                      labelId="combination-label"
                      value={selectedConfigId?.toString() || ''}
                      onChange={(e) => handleStatsConfigChange(e.target.value)}
                      label="Select Combination"
                      sx={{ backgroundColor: 'white' }}
                      disabled={!selectedSourceTable}
                    >
                      <MenuItem value="">
                        <em>Select Stats Combination</em>
                      </MenuItem>
                      {getAvailableConfigs()?.map((config: any) => (
                        <MenuItem key={config?.configId} value={config?.configId?.toString()}>
                          <ListItemText primary={formatStatsConfig(config)} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedSourceTable && getAvailableConfigs()?.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      No stats combinations available for this source table
                    </Typography>
                  )}
                </Box>

                {/* Stats Results Section */}
                {selectedConfigId && !loadingStats && statsResults !== null && (
                  <Box sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
                        Results
                      </Typography>
                      {statsResults && statsResults?.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<GetApp />}
                            onClick={handleExportCSV}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              py: 0.5,
                              px: 1.5,
                              borderColor: '#296695',
                              color: '#296695',
                              '&:hover': {
                                borderColor: '#1e4d6f',
                                backgroundColor: 'rgba(41, 102, 149, 0.04)',
                              },
                            }}
                          >
                            Export CSV
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<GetApp />}
                            onClick={handleExportExcel}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              py: 0.5,
                              px: 1.5,
                              borderColor: '#296695',
                              color: '#296695',
                              '&:hover': {
                                borderColor: '#1e4d6f',
                                backgroundColor: 'rgba(41, 102, 149, 0.04)',
                              },
                            }}
                          >
                            Export Excel
                          </Button>
                        </Box>
                      )}
                    </Box>

                    {!statsResults || statsResults?.length === 0 ? (
                      <Alert severity="info" sx={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}>
                        No data available for the selected combination. The stats generation was successful but returned no records.
                      </Alert>
                    ) : (
                      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                              {Object.keys(statsResults?.[0] || {}).map((key) => (
                                <TableCell key={key} sx={{ fontWeight: 600 }}>
                                  {key}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {statsResults?.map((row: any, index: number) => (
                              <TableRow key={index} hover>
                                {Object.values(row).map((value: any, colIndex: number) => (
                                  <TableCell key={colIndex}>
                                    {value !== null && value !== undefined ? String(value) : '-'}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* Tab 2: Dynamic Stats View - REVAMPED */}
        {activeTab === 1 && (
          <Box>
            {/* Configuration Section */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: '#F8FAFB', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2.5, color: '#2D3748', fontSize: '1rem' }}>
                Configure Dynamic Stats
              </Typography>

              {/* Input Source Selection */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
                  Input Source
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel id="dynamic-input-source-label">Select Input Source</InputLabel>
                  <Select
                    labelId="dynamic-input-source-label"
                    value={selectedDynamicInputSource}
                    onChange={(e) => {
                      setSelectedDynamicInputSource(e.target.value);
                      // Reset counts on and breakdown by when source changes
                      setSelectedDynamicCountsOn([]);
                      setSelectedDynamicBreakdownBy([]);
                      setSelectedDynamicDistinctFields([]);
                    }}
                    label="Select Input Source"
                    sx={{ backgroundColor: 'white' }}
                    disabled={availableDynamicInputSources?.length === 0}
                  >
                    <MenuItem value="">
                      <em>Select Input Source</em>
                    </MenuItem>
                    {availableDynamicInputSources?.map((source) => (
                      <MenuItem key={source?.id} value={source?.inputSource}>
                        {source?.inputSource}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {availableDynamicInputSources?.length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    No input sources available for dynamic stats. Please ensure the request has dynamicStats data.
                  </Typography>
                )}
              </Box>

              {/* Counts On and Breakdown By in horizontal layout */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                {/* Generate Counts On - Multi-select */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.9rem', color: '#2D3748' }}>
                    Generate Counts On
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dynamic-counts-on-label">Select Fields</InputLabel>
                    <Select
                      labelId="dynamic-counts-on-label"
                      multiple
                      value={selectedDynamicCountsOn}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                        setSelectedDynamicCountsOn(value);
                        // Remove distinct fields that are no longer in counts on
                        setSelectedDynamicDistinctFields(prev => prev?.filter(f => value?.includes(f)));
                      }}
                      label="Select Fields"
                      sx={{ backgroundColor: 'white' }}
                      disabled={!selectedDynamicInputSource}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected?.map((value) => (
                            <Chip
                              key={value}
                              label={value}
                              size="small"
                              sx={{
                                height: '24px',
                                fontSize: '0.75rem',
                                backgroundColor: '#296695',
                                color: '#FFFFFF',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="" disabled>
                        <em>Select Fields</em>
                      </MenuItem>
                      {availableDynamicFields?.map((field: string) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={selectedDynamicCountsOn?.indexOf(field) > -1} size="small" />
                          <ListItemText primary={field} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Breakdown By - Multi-select */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.9rem', color: '#2D3748' }}>
                    Breakdown By
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dynamic-breakdown-label">Select Fields</InputLabel>
                    <Select
                      labelId="dynamic-breakdown-label"
                      multiple
                      value={selectedDynamicBreakdownBy}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                        setSelectedDynamicBreakdownBy(value);
                      }}
                      label="Select Fields"
                      sx={{ backgroundColor: 'white' }}
                      disabled={!selectedDynamicInputSource}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected?.map((value) => (
                            <Chip
                              key={value}
                              label={value}
                              size="small"
                              sx={{
                                height: '24px',
                                fontSize: '0.75rem',
                                backgroundColor: '#296695',
                                color: '#FFFFFF',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="" disabled>
                        <em>Select Fields</em>
                      </MenuItem>
                      {availableDynamicFields?.map((field: string) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={selectedDynamicBreakdownBy?.indexOf(field) > -1} size="small" />
                          <ListItemText primary={field} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Distinct Fields - Multi-select showing Generate Counts On fields */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.9rem', color: '#2D3748' }}>
                  Distinct Fields
                  <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 1 }}>
                    (Select which fields should have distinct counts)
                  </Typography>
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel id="dynamic-distinct-label">Select Distinct Fields</InputLabel>
                  <Select
                    labelId="dynamic-distinct-label"
                    multiple
                    value={selectedDynamicDistinctFields}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                      setSelectedDynamicDistinctFields(value);
                    }}
                    label="Select Distinct Fields"
                    sx={{ backgroundColor: 'white' }}
                    disabled={selectedDynamicCountsOn?.length === 0}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected?.map((value) => (
                          <Chip
                            key={value}
                            label={value}
                            size="small"
                            sx={{
                              height: '24px',
                              fontSize: '0.75rem',
                              backgroundColor: '#8B5CF620',
                              color: '#8B5CF6',
                              fontWeight: 600,
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="" disabled>
                      <em>{selectedDynamicCountsOn?.length === 0 ? 'Please select Generate Counts On fields first' : 'Select fields'}</em>
                    </MenuItem>
                    {selectedDynamicCountsOn?.map((field) => (
                      <MenuItem key={field} value={field}>
                        <Checkbox checked={selectedDynamicDistinctFields?.indexOf(field) > -1} size="small" />
                        <ListItemText primary={field} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Generate Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleGenerateDynamicStats}
                  disabled={!selectedDynamicInputSource || selectedDynamicCountsOn?.length === 0 || loadingDynamicStats}
                  startIcon={loadingDynamicStats ? <CircularProgress size={16} /> : <Assessment />}
                  sx={{
                    px: 4,
                    py: 1,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: '#296695',
                    '&:hover': { backgroundColor: '#1e4d6f' },
                    boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
                  }}
                >
                  {loadingDynamicStats ? 'Generating Report...' : 'Generate Report'}
                </Button>
              </Box>
            </Paper>

            {/* Generated Dynamic Stats List */}
            {generatedDynamicStats?.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '1rem', color: '#2D3748' }}>
                    Dynamic Stats
                  </Typography>
                  <Chip
                    label={`${generatedDynamicStats?.length} report${generatedDynamicStats?.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ fontWeight: 600, backgroundColor: '#296695', color: '#FFFFFF' }}
                  />
                </Box>

                {generatedDynamicStats?.map((stat) => (
                  <Accordion
                    key={stat?.id}
                    expanded={stat?.expanded}
                    onChange={() => handleToggleExpandDynamicStat(stat?.id)}
                    sx={{
                      mb: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '8px !important',
                      '&:before': { display: 'none' },
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        backgroundColor: '#F8FAFB',
                        borderRadius: '8px',
                        '&.Mui-expanded': {
                          borderBottomLeftRadius: 0,
                          borderBottomRightRadius: 0,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, pr: 2 }}>
                        <TableChart sx={{ color: '#296695', fontSize: 28 }} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D3748' }}>
                              {stat?.inputSource}
                            </Typography>
                            {stat?.status === 'completed' && stat?.data && stat?.data?.length > 0 && (
                              <Chip
                                label={`${stat?.data?.length} row${stat?.data?.length !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                  height: '18px',
                                  fontSize: '0.65rem',
                                  backgroundColor: '#E8F5E9',
                                  color: '#2E7D32',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                            {stat?.status === 'completed' && stat?.isPreConfigured && (!stat?.data || stat?.data?.length === 0) && (
                              <Chip
                                label="Completed"
                                size="small"
                                sx={{
                                  height: '18px',
                                  fontSize: '0.65rem',
                                  backgroundColor: '#E8F5E9',
                                  color: '#2E7D32',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                            {stat?.status === 'failed' && (
                              <Chip
                                label="Failed"
                                size="small"
                                sx={{
                                  height: '18px',
                                  fontSize: '0.65rem',
                                  backgroundColor: '#FFEBEE',
                                  color: '#C62828',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            <strong>Counts On:</strong> {stat?.countsOn?.join(', ')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            <strong>Breakdown By:</strong> {stat?.breakdownBy?.join(', ')}
                            {stat?.distinctFields?.length > 0 && ` | Distinct: ${stat?.distinctFields?.join(', ')}`}
                          </Typography>
                        </Box>
                        {stat?.status === 'processing' ? (
                          <Chip
                            label="Waiting"
                            size="small"
                            sx={{
                              height: '24px',
                              fontSize: '0.7rem',
                              backgroundColor: '#FFF3E0',
                              color: '#E65100',
                              fontWeight: 600,
                              cursor: 'default',
                            }}
                          />
                        ) : stat?.isPreConfigured ? (
                          // Preconfigured stats - no delete button
                          <Box sx={{ width: 40 }} />
                        ) : (
                          // User-generated stats - show delete button
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDynamicStat(stat?.id);
                            }}
                            sx={{ color: 'error.main' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 3 }}>
                      {stat?.loadingData ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <CircularProgress size={40} sx={{ mb: 2 }} />
                          <Typography variant="body2" color="text.secondary">
                            Loading stats data...
                          </Typography>
                        </Box>
                      ) : stat?.status === 'processing' ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Report generation in progress
                          </Typography>
                        </Box>
                      ) : stat?.data && stat?.data?.length > 0 ? (
                        <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                                {Object.keys(stat?.data?.[0] || {}).map((key) => (
                                  <TableCell key={key} sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                    {key}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {stat?.data?.map((row, index) => (
                                <TableRow key={index} hover>
                                  {Object.values(row).map((value, colIndex) => (
                                    <TableCell key={colIndex}>
                                      {value !== null && value !== undefined ? String(value) : '-'}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : stat?.status === 'completed' ? (
                        <Alert severity="info" sx={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}>
                          No data available for this configuration. The stats generation was successful but returned no records.
                        </Alert>
                      ) : stat?.status === 'failed' ? (
                        <Alert severity="error">
                          Stats generation failed. Please check the configuration and try again.
                        </Alert>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No data available
                          </Typography>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {generatedDynamicStats?.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No dynamic stats reports generated yet. Use the form above to generate your first report.
              </Alert>
            )}
          </Box>
        )}

        {/* Tab 3: Suppression Breakdown */}
        {activeTab === 2 && (
          <Box>
            {requestData?.suppressionBreakdown && requestData?.suppressionBreakdown?.length > 0 ? (
              <>
                {/* Input Source Selection */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
                    Select Input Source
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="suppression-source-label">Select Input Source</InputLabel>
                    <Select
                      labelId="suppression-source-label"
                      value={selectedSuppressionSource}
                      onChange={(e) => setSelectedSuppressionSource(e.target.value)}
                      label="Select Input Source"
                      sx={{ backgroundColor: 'white' }}
                    >
                      <MenuItem value="">
                        <em>Select Input Source</em>
                      </MenuItem>
                      {requestData?.suppressionBreakdown?.map((item, index) => (
                        <MenuItem key={index} value={item?.inputSource}>
                          {item?.inputSource}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Data Flow Table */}
                {selectedSuppressionSource && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#2D3748', fontSize: '0.9rem' }}>
                      Data Flow for {selectedSuppressionSource}
                    </Typography>

                    {(() => {
                      // Find the data flow for the selected source
                      const selectedData = requestData?.suppressionBreakdown?.find(item => item?.inputSource === selectedSuppressionSource);

                      if (!selectedData || !selectedData?.dataFlow || selectedData?.dataFlow?.length === 0) {
                        return (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            No data flow information available for this input source.
                          </Alert>
                        );
                      }

                      return (
                        <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                                <TableCell sx={{ py: 1, px: 2, fontWeight: 600, fontSize: '0.875rem' }}>
                                  Operation Name
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1, px: 2, fontWeight: 600, fontSize: '0.875rem' }}>
                                  Input Count
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1, px: 2, fontWeight: 600, fontSize: '0.875rem' }}>
                                  Output Count
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedData?.dataFlow?.map((flow, index) => (
                                <TableRow
                                  key={index}
                                  hover
                                  sx={{
                                    '&:last-child td, &:last-child th': { border: 0 },
                                    backgroundColor: index % 2 === 0 ? 'white' : 'rgba(0, 0, 0, 0.02)'
                                  }}
                                >
                                  <TableCell sx={{ py: 1.5, px: 2 }}>
                                    {flow?.operationName}
                                  </TableCell>
                                  <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                                    {flow?.inputCount?.toLocaleString()}
                                  </TableCell>
                                  <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                                    {flow?.outputCount?.toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      );
                    })()}
                  </Box>
                )}

                {!selectedSuppressionSource && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Please select an input source to view its suppression breakdown data flow.
                  </Alert>
                )}
              </>
            ) : (
              <Alert severity="info">
                No suppression breakdown data available for this request.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleCancel}
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
        {/* Only show Generate button for Preconfigured Stats View (tab 0) */}
        {activeTab === 0 && (
          <Button
            variant="contained"
            onClick={handleGenerateStats}
            disabled={!selectedConfigId || loadingStats}
            startIcon={loadingStats ? <CircularProgress size={16} /> : <BarChartIcon />}
            sx={{
              px: 3,
              py: 0.75,
              textTransform: 'none',
              fontSize: '0.875rem',
              boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
              backgroundColor: '#296695',
              '&:hover': {
                backgroundColor: '#1e4d6f',
              },
            }}
          >
            {loadingStats ? 'Generating...' : 'Generate'}
          </Button>
        )}
      </DialogActions>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default StatsConfigDialog;
