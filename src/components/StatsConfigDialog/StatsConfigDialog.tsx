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
import { getRequestById, getRequestStats, generateDynamicStats, type ReportData, type StatsConfiguration as ApiStatsConfiguration, type RequestStatsResponse } from '../../services/api';

// Sample Input Sources - fallback for dynamic stats view
const SAMPLE_INPUT_SOURCES = [
  { id: '1', sourceName: 'File Source 1', headers: ['EMAIL', 'POSTAL_STATE', 'POSTAL_ZIP', 'CHANNEL'] },
  { id: '2', sourceName: 'Database Source 1', headers: ['EMAIL', 'FIRST_NAME', 'LAST_NAME', 'PHONE'] },
  { id: '3', sourceName: 'Self Source 1', headers: ['EMAIL', 'ADDRESS', 'CITY', 'STATE'] },
];

// Sample Data Flow - would come from backend
interface DataFlowRow {
  id: string;
  text: string;
  accepted: boolean;
}

const SAMPLE_DATA_FLOW: DataFlowRow[] = [
  { id: '1', text: 'Suppression by Unsubs on EmailId', accepted: true },
  { id: '2', text: 'Match by BestPostal on EmailId', accepted: true },
  { id: '3', text: 'Match by BestPostal on EmailId,Zip', accepted: true },
  { id: '4', text: 'Suppression by DNE on EmailId,State', accepted: true },
];

// Sample Suppression Breakdown - mock data
const SAMPLE_SUPPRESSION_BREAKDOWN = [
  {
    inputSource: 'PERMISSIONED_DATA_1',
    dataFlow: [
      { operationName: 'Initial Load', inputCount: 100000, outputCount: 100000 },
      { operationName: 'Suppression by DNC List', inputCount: 100000, outputCount: 95000 },
      { operationName: 'Suppression by Unsubscribes', inputCount: 95000, outputCount: 92000 },
      { operationName: 'Dedupe by Email', inputCount: 92000, outputCount: 89500 },
    ]
  },
  {
    inputSource: 'DATABASE_SOURCE_1',
    dataFlow: [
      { operationName: 'Initial Load', inputCount: 50000, outputCount: 50000 },
      { operationName: 'Suppression by Opt-Outs', inputCount: 50000, outputCount: 48500 },
      { operationName: 'Quality Filter', inputCount: 48500, outputCount: 46000 },
    ]
  }
];

// Mock data generator for dynamic stats fallback
const generateMockDynamicStatsData = (countsOn: string, breakdownBy: string, distinctFields: string[]) => {
  const breakdownValues = ['CA', 'NY', 'TX', 'FL', 'IL'];

  return breakdownValues.map(value => {
    const row: Record<string, any> = {
      [breakdownBy]: value,
    };

    // Add count column with appropriate naming based on whether it's distinct
    const isDistinct = distinctFields.includes(countsOn);
    row[`${isDistinct ? 'Distinct_' : ''}Count_${countsOn}`] = Math.floor(Math.random() * 10000) + 1000;

    return row;
  });
};

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
  const [selectedDynamicCountsOn, setSelectedDynamicCountsOn] = useState<string>('');
  const [selectedDynamicBreakdownBy, setSelectedDynamicBreakdownBy] = useState<string>('');
  const [selectedDynamicDistinctFields, setSelectedDynamicDistinctFields] = useState<string[]>([]);
  const [generatedDynamicStats, setGeneratedDynamicStats] = useState<Array<{
    id: string;
    inputSource: string;
    countsOn: string;
    breakdownBy: string;
    distinctFields: string[];
    data: any[];
    expanded: boolean;
    isMockData?: boolean;
  }>>([]);
  const [loadingDynamicStats, setLoadingDynamicStats] = useState(false);

  // Suppression Breakdown View state
  const [selectedSuppressionSource, setSelectedSuppressionSource] = useState<string>('');

  // Search states
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [countsOnSearch, setCountsOnSearch] = useState('');
  const [breakdownBySearch, setBreakdownBySearch] = useState('');

  // Fetch request data when dialog opens or use initialReportData if provided
  useEffect(() => {
    const fetchRequestData = async () => {
      if (!open || !requestId) {
        return;
      }

      // If we have initialReportData, use it directly without fetching
      if (initialReportData && initialReportData.id === requestId) {
        console.log('[StatsConfigDialog] Using provided initialReportData:', initialReportData);
        console.log('[StatsConfigDialog] statsConfigurations:', initialReportData.statsConfigurations);
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

  // Load dynamic stats from requestData when available
  useEffect(() => {
    if (requestData?.dynamicStats && requestData.dynamicStats.length > 0) {
      const loadedStats = requestData.dynamicStats.map((stat, index) => ({
        id: `loaded_${index}`,
        inputSource: stat.inputSource,
        countsOn: stat.countsOn,
        breakdownBy: stat.breakdownBy,
        distinctFields: stat.distinctFields || (stat.isDistinct ? [stat.countsOn] : []), // Backward compatibility
        data: stat.data || [],
        expanded: false,
        isMockData: false, // Loaded from API, not mock data
      }));
      setGeneratedDynamicStats(loadedStats);
    }
  }, [requestData]);

  // Calculate available fields based on selected input sources
  // Get available fields for selected dynamic input source
  const availableDynamicFields = useMemo(() => {
    if (!selectedDynamicInputSource) return [];

    const source = (availableInputSources.length > 0 ? availableInputSources : SAMPLE_INPUT_SOURCES)
      .find(s => s.sourceName === selectedDynamicInputSource);

    return source?.headers || ['EMAIL', 'POSTAL_STATE', 'POSTAL_ZIP', 'CHANNEL']; // Fallback
  }, [selectedDynamicInputSource, availableInputSources]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // New handlers for Dynamic Stats View
  const handleGenerateDynamicStats = async () => {
    if (!requestId) {
      alert('Request ID not found');
      return;
    }

    if (!selectedDynamicInputSource || !selectedDynamicCountsOn || !selectedDynamicBreakdownBy) {
      alert('Please select Input Source, Counts On, and Breakdown By fields');
      return;
    }

    try {
      setLoadingDynamicStats(true);
      const response = await generateDynamicStats({
        requestId,
        inputSource: selectedDynamicInputSource,
        countsOn: selectedDynamicCountsOn,
        breakdownBy: selectedDynamicBreakdownBy,
        distinctFields: selectedDynamicDistinctFields,
      });

      let statsData = response.data || [];
      let usedMockData = false;

      if (!response.success || !statsData || statsData.length === 0) {
        console.warn('API returned no data or failed, using mock data as fallback');
        statsData = generateMockDynamicStatsData(selectedDynamicCountsOn, selectedDynamicBreakdownBy, selectedDynamicDistinctFields);
        usedMockData = true;
      }

      // Add to configured stats list
      const newStat = {
        id: Date.now().toString(),
        inputSource: selectedDynamicInputSource,
        countsOn: selectedDynamicCountsOn,
        breakdownBy: selectedDynamicBreakdownBy,
        distinctFields: selectedDynamicDistinctFields,
        data: statsData,
        expanded: false,
        isMockData: usedMockData,
      };

      setGeneratedDynamicStats(prev => [...prev, newStat]);

      // Reset form
      setSelectedDynamicInputSource('');
      setSelectedDynamicCountsOn('');
      setSelectedDynamicBreakdownBy('');
      setSelectedDynamicDistinctFields([]);

      if (usedMockData) {
        alert('API call failed or returned no data. Displaying mock data for demonstration purposes.');
      } else {
        alert('Dynamic stats generated successfully!');
      }
    } catch (err) {
      console.error('Error generating dynamic stats:', err);

      // Use mock data as fallback on error
      const mockData = generateMockDynamicStatsData(selectedDynamicCountsOn, selectedDynamicBreakdownBy, selectedDynamicDistinctFields);
      const newStat = {
        id: Date.now().toString(),
        inputSource: selectedDynamicInputSource,
        countsOn: selectedDynamicCountsOn,
        breakdownBy: selectedDynamicBreakdownBy,
        distinctFields: selectedDynamicDistinctFields,
        data: mockData,
        expanded: false,
        isMockData: true,
      };

      setGeneratedDynamicStats(prev => [...prev, newStat]);

      // Reset form
      setSelectedDynamicInputSource('');
      setSelectedDynamicCountsOn('');
      setSelectedDynamicBreakdownBy('');
      setSelectedDynamicDistinctFields([]);

      alert('Failed to generate dynamic stats from API. Displaying mock data for demonstration purposes.');
    } finally {
      setLoadingDynamicStats(false);
    }
  };

  const handleToggleExpandDynamicStat = (id: string) => {
    setGeneratedDynamicStats(prev =>
      prev.map(stat =>
        stat.id === id ? { ...stat, expanded: !stat.expanded } : stat
      )
    );
  };

  const handleDeleteDynamicStat = (id: string) => {
    if (window.confirm('Are you sure you want to delete this dynamic stat configuration?')) {
      setGeneratedDynamicStats(prev => prev.filter(stat => stat.id !== id));
    }
  };

  const handleGenerate = () => {
    if (activeTab === 1) {
      // Dynamic view - generate dynamic stats
      handleGenerateDynamicStats();
    } else {
      // Preconfigured view
      handleGenerateStats();
    }
  };

  const handleCancel = () => {
    // Reset all state
    setActiveTab(0);
    setSelectedSourceTable('');
    setSelectedConfigId(null);
    setSelectedDynamicInputSource('');
    setSelectedDynamicCountsOn('');
    setSelectedDynamicBreakdownBy('');
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
    const fields = config.fields || '';
    const breakdownBy = config.breakdown_by || '';
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

      if (response.success) {
        // Use response.stats instead of response.data
        setStatsResults(response.stats || []);
      } else {
        setError(response.message || 'Failed to fetch stats');
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
    if (!statsResults || statsResults.length === 0) return;

    // Get headers from first row
    const headers = Object.keys(statsResults[0]);

    // Create CSV content
    let csvContent = headers.join(',') + '\n';

    statsResults.forEach((row: any) => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape values that contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvContent += values.join(',') + '\n';
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
    if (!statsResults || statsResults.length === 0) return;

    // Get headers from first row
    const headers = Object.keys(statsResults[0]);

    // Create HTML table
    let tableHTML = '<table><thead><tr>';
    headers.forEach(header => {
      tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    statsResults.forEach((row: any) => {
      tableHTML += '<tr>';
      headers.forEach(header => {
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

    const sourceTableConfig = requestData.statsConfigurations.find(
      (sc: ApiStatsConfiguration) => sc.source_tables === selectedSourceTable
    );

    return sourceTableConfig?.configs || [];
  };

  // Filtered lists
  const filteredInputSources = (availableInputSources.length > 0 ? availableInputSources : SAMPLE_INPUT_SOURCES).filter(source =>
    source.sourceName.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

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
                    {requestData.statsConfigurations && requestData.statsConfigurations.length > 0 && (
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
                      disabled={!requestData?.statsConfigurations || requestData.statsConfigurations.length === 0}
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
                  {requestData && (!requestData.statsConfigurations || requestData.statsConfigurations.length === 0) && (
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
                      {getAvailableConfigs().map((config: any) => (
                        <MenuItem key={config.configId} value={config.configId.toString()}>
                          <ListItemText primary={formatStatsConfig(config)} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedSourceTable && getAvailableConfigs().length === 0 && (
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
                      {statsResults && statsResults.length > 0 && (
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

                    {!statsResults || statsResults.length === 0 ? (
                      <Alert severity="info" sx={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}>
                        No data available for the selected combination. The stats generation was successful but returned no records.
                      </Alert>
                    ) : (
                      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                              {Object.keys(statsResults[0]).map((key) => (
                                <TableCell key={key} sx={{ fontWeight: 600 }}>
                                  {key}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {statsResults.map((row: any, index: number) => (
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
                      setSelectedDynamicCountsOn('');
                      setSelectedDynamicBreakdownBy('');
                    }}
                    label="Select Input Source"
                    sx={{ backgroundColor: 'white' }}
                  >
                    <MenuItem value="">
                      <em>Select Input Source</em>
                    </MenuItem>
                    {(availableInputSources.length > 0 ? availableInputSources : SAMPLE_INPUT_SOURCES).map((source) => (
                      <MenuItem key={source.id} value={source.sourceName}>
                        {source.sourceName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Counts On and Breakdown By in horizontal layout */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                {/* Generate Counts On */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.9rem', color: '#2D3748' }}>
                    Generate Counts On
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dynamic-counts-on-label">Select Field</InputLabel>
                    <Select
                      labelId="dynamic-counts-on-label"
                      value={selectedDynamicCountsOn}
                      onChange={(e) => {
                        setSelectedDynamicCountsOn(e.target.value);
                        // Clear distinct fields when counts on changes
                        setSelectedDynamicDistinctFields([]);
                      }}
                      label="Select Field"
                      sx={{ backgroundColor: 'white' }}
                      disabled={!selectedDynamicInputSource}
                    >
                      <MenuItem value="">
                        <em>Select Field</em>
                      </MenuItem>
                      {availableDynamicFields.map((field: string) => (
                        <MenuItem key={field} value={field}>
                          {field}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Breakdown By */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.9rem', color: '#2D3748' }}>
                    Breakdown By
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dynamic-breakdown-label">Select Field</InputLabel>
                    <Select
                      labelId="dynamic-breakdown-label"
                      value={selectedDynamicBreakdownBy}
                      onChange={(e) => setSelectedDynamicBreakdownBy(e.target.value)}
                      label="Select Field"
                      sx={{ backgroundColor: 'white' }}
                      disabled={!selectedDynamicInputSource}
                    >
                      <MenuItem value="">
                        <em>Select Field</em>
                      </MenuItem>
                      {availableDynamicFields.map((field: string) => (
                        <MenuItem key={field} value={field}>
                          {field}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Distinct Fields - Multi-select showing Generate Counts On field */}
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
                      const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                      setSelectedDynamicDistinctFields(value);
                    }}
                    label="Select Distinct Fields"
                    sx={{ backgroundColor: 'white' }}
                    disabled={!selectedDynamicCountsOn}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
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
                      <em>{!selectedDynamicCountsOn ? 'Please select Generate Counts On first' : 'Select fields'}</em>
                    </MenuItem>
                    {selectedDynamicCountsOn && (
                      <MenuItem value={selectedDynamicCountsOn}>
                        <Checkbox checked={selectedDynamicDistinctFields.indexOf(selectedDynamicCountsOn) > -1} size="small" />
                        <ListItemText primary={selectedDynamicCountsOn} />
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Box>

              {/* Generate Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleGenerateDynamicStats}
                  disabled={!selectedDynamicInputSource || !selectedDynamicCountsOn || !selectedDynamicBreakdownBy || loadingDynamicStats}
                  startIcon={loadingDynamicStats ? <CircularProgress size={16} /> : <BarChartIcon />}
                  sx={{
                    px: 4,
                    py: 1,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    backgroundColor: '#8B5CF6',
                    '&:hover': { backgroundColor: '#7C3AED' },
                  }}
                >
                  {loadingDynamicStats ? 'Generating...' : 'Generate'}
                </Button>
              </Box>
            </Paper>

            {/* Configured Stats List */}
            {generatedDynamicStats.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '1rem', color: '#2D3748' }}>
                    Configured Dynamic Stats
                  </Typography>
                  <Chip
                    label={`${generatedDynamicStats.length} configuration${generatedDynamicStats.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ fontWeight: 600, backgroundColor: '#8B5CF6', color: '#FFFFFF' }}
                  />
                </Box>

                {generatedDynamicStats.map((stat) => (
                  <Accordion
                    key={stat.id}
                    expanded={stat.expanded}
                    onChange={() => handleToggleExpandDynamicStat(stat.id)}
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
                        <Visibility sx={{ color: '#8B5CF6' }} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D3748' }}>
                              {stat.inputSource}
                            </Typography>
                            {stat.isMockData && (
                              <Chip
                                label="Mock Data"
                                size="small"
                                sx={{
                                  height: '18px',
                                  fontSize: '0.65rem',
                                  backgroundColor: '#FFF3CD',
                                  color: '#856404',
                                  border: '1px solid #FFE69C',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Counts: {stat.countsOn} | Breakdown: {stat.breakdownBy}
                            {stat.distinctFields.length > 0 && ` | Distinct: ${stat.distinctFields.join(', ')}`}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDynamicStat(stat.id);
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 3 }}>
                      {stat.data.length === 0 ? (
                        <Alert severity="info">
                          No data available for this configuration
                        </Alert>
                      ) : (
                        <Box>
                          {stat.isMockData && (
                            <Alert severity="warning" sx={{ mb: 2, backgroundColor: '#FFF3CD', color: '#856404', border: '1px solid #FFE69C' }}>
                              This is mock data displayed for demonstration purposes. The API call failed or returned no data.
                            </Alert>
                          )}
                          <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                                  {Object.keys(stat.data[0]).map((key) => (
                                    <TableCell key={key} sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                      {key}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {stat.data.map((row, index) => (
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
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {generatedDynamicStats.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No dynamic stats configured yet. Use the form above to generate your first dynamic stat.
              </Alert>
            )}
          </Box>
        )}

        {/* Tab 3: Suppression Breakdown */}
        {activeTab === 2 && (
          <Box>
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
                  {(() => {
                    // Use real data if available, otherwise use mock data
                    const suppressionData = requestData?.suppressionBreakdown || SAMPLE_SUPPRESSION_BREAKDOWN;
                    return suppressionData.map((item, index) => (
                      <MenuItem key={index} value={item.inputSource}>
                        {item.inputSource}
                      </MenuItem>
                    ));
                  })()}
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
                  const suppressionData = requestData?.suppressionBreakdown || SAMPLE_SUPPRESSION_BREAKDOWN;
                  const selectedData = suppressionData.find(item => item.inputSource === selectedSuppressionSource);

                  if (!selectedData || selectedData.dataFlow.length === 0) {
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
                          {selectedData.dataFlow.map((flow, index) => (
                            <TableRow
                              key={index}
                              hover
                              sx={{
                                '&:last-child td, &:last-child th': { border: 0 },
                                backgroundColor: index % 2 === 0 ? 'white' : 'rgba(0, 0, 0, 0.02)'
                              }}
                            >
                              <TableCell sx={{ py: 1.5, px: 2 }}>
                                {flow.operationName}
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                                {flow.inputCount.toLocaleString()}
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                                {flow.outputCount.toLocaleString()}
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
        {/* Only show Generate button for Preconfigured and Dynamic Stats tabs, not for Suppression Breakdown */}
        {activeTab !== 2 && (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={
              activeTab === 0
                ? (!selectedConfigId || loadingStats)
                : (!selectedDynamicInputSource || !selectedDynamicCountsOn || !selectedDynamicBreakdownBy || loadingDynamicStats)
            }
            startIcon={
              activeTab === 0 && loadingStats
                ? <CircularProgress size={16} />
                : <BarChartIcon />
            }
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
            {activeTab === 0 && loadingStats ? 'Generating...' : 'Generate'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default StatsConfigDialog;
