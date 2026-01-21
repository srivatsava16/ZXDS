import { useState, useMemo } from 'react';
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
} from '@mui/icons-material';

// Sample fields - in real app, these would come from input sources
const SAMPLE_FIELDS = ['DEVICE', 'QUALITY SCORE', 'FNAME', 'LNAME', 'DOB', 'STATE', 'ZIP', 'CITY', 'PHONE'];

// Sample Input Sources - would come from backend
const SAMPLE_INPUT_SOURCES = [
  { id: '1', sourceName: 'File Source 1' },
  { id: '2', sourceName: 'Database Source 1' },
  { id: '3', sourceName: 'Self Source 1' },
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
}

// Data combination options
const DATA_COMBINATIONS = [
  { value: 'decile', label: 'Decile' },
  { value: 'state_decile', label: 'State, Decile' },
  { value: 'state', label: 'State' },
];

// Visualization types
type VisualizationType = 'tabular' | 'graph' | 'bar' | 'pie' | 'heatmap' | 'line';

const VISUALIZATION_OPTIONS = [
  { value: 'tabular', label: 'Tabular Flow', icon: TableChart, description: 'Display data in table format' },
  { value: 'graph', label: 'Graph View', icon: ShowChart, description: 'Display as line graph' },
  { value: 'bar', label: 'Bar Diagram', icon: BarChartIcon, description: 'Display as bar chart' },
  { value: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Display percentage distribution' },
];

// Sample data for US states - Compact version for popup
const US_STATES_SAMPLE = [
  { state: 'California', count: 15420, decile: 10 },
  { state: 'Texas', count: 12850, decile: 9 },
  { state: 'Florida', count: 10320, decile: 8 },
  { state: 'New York', count: 9870, decile: 8 },
  { state: 'Pennsylvania', count: 7650, decile: 7 },
];

const StatsConfigDialog: React.FC<StatsConfigDialogProps> = ({
  open,
  onClose,
  requestId,
  availableInputSources = []
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Preconfigured Stats View state
  const [selectedCombination, setSelectedCombination] = useState<string>('');
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('tabular');

  // Dynamic Stats View state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [dataFlowRows, setDataFlowRows] = useState<DataFlowRow[]>(SAMPLE_DATA_FLOW);

  // Stats configuration state
  const [selectedCountsOn, setSelectedCountsOn] = useState<string[]>([]);
  const [isDistinct, setIsDistinct] = useState(false);
  const [selectedBreakdownBy, setSelectedBreakdownBy] = useState<string[]>([]);
  const [statsConfigurations, setStatsConfigurations] = useState<StatsConfiguration[]>([]);
  const [editingStatsId, setEditingStatsId] = useState<string | null>(null);

  // Search states
  const [inputSourcesSearch, setInputSourcesSearch] = useState('');
  const [countsOnSearch, setCountsOnSearch] = useState('');
  const [breakdownBySearch, setBreakdownBySearch] = useState('');

  // Calculate available fields based on selected input sources
  const availableFields = useMemo(() => {
    if (selectedInputSources.length === 0) {
      return [];
    }

    // Find the selected source objects from availableInputSources
    const selectedSourceObjects = selectedInputSources
      .map(sourceName => availableInputSources.find(src => src.sourceName === sourceName))
      .filter(src => src && src.headers);

    if (selectedSourceObjects.length === 0) {
      return [];
    }

    if (selectedSourceObjects.length === 1) {
      // Single source: return all its headers
      return selectedSourceObjects[0]?.headers || [];
    }

    // Multiple sources: return only COMMON headers (intersection)
    const allSourceFieldSets: Set<string>[] = [];

    selectedSourceObjects.forEach(source => {
      if (source?.headers) {
        const sourceFields = new Set<string>();
        source.headers.forEach(field => {
          sourceFields.add(field.toLowerCase()); // Case-insensitive comparison
        });
        allSourceFieldSets.push(sourceFields);
      }
    });

    if (allSourceFieldSets.length === 0) {
      return [];
    }

    // Find intersection of all field sets
    const intersection = Array.from(allSourceFieldSets[0]).filter(field => {
      return allSourceFieldSets.every(fieldSet => fieldSet.has(field));
    });

    // Map back to original casing from the first source
    const resultFields: string[] = [];
    const firstSource = selectedSourceObjects[0];

    if (firstSource?.headers) {
      firstSource.headers.forEach(field => {
        if (intersection.includes(field.toLowerCase())) {
          resultFields.push(field);
        }
      });
    }

    return resultFields;
  }, [selectedInputSources, availableInputSources]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleToggleDataFlow = (id: string) => {
    setDataFlowRows(dataFlowRows.map(row =>
      row.id === id ? { ...row, accepted: !row.accepted } : row
    ));
  };

  const handleRemoveDataFlow = (id: string) => {
    if (window.confirm('Are you sure you want to remove this data flow?')) {
      setDataFlowRows(dataFlowRows.filter(row => row.id !== id));
    }
  };

  const handleAddStatsConfiguration = () => {
    if (selectedInputSources.length === 0) {
      alert('Please select at least one Input Source');
      return;
    }
    if (selectedCountsOn.length === 0) {
      alert('Please select at least one field for Generate Counts On');
      return;
    }
    if (selectedBreakdownBy.length === 0) {
      alert('Please select at least one field for Breakdown By');
      return;
    }

    if (editingStatsId) {
      // Update existing configuration
      setStatsConfigurations(statsConfigurations.map(config =>
        config.id === editingStatsId
          ? { ...config, inputSources: selectedInputSources, countsOn: selectedCountsOn, isDistinct, breakdownBy: selectedBreakdownBy }
          : config
      ));
      setEditingStatsId(null);
    } else {
      // Add new configuration
      const newConfiguration: StatsConfiguration = {
        id: Date.now().toString(),
        inputSources: selectedInputSources,
        countsOn: selectedCountsOn,
        isDistinct,
        breakdownBy: selectedBreakdownBy,
      };
      setStatsConfigurations([...statsConfigurations, newConfiguration]);
    }

    // Reset selections
    setSelectedCountsOn([]);
    setIsDistinct(false);
    setSelectedBreakdownBy([]);
  };

  const handleEditStatsConfiguration = (config: StatsConfiguration) => {
    setEditingStatsId(config.id);
    setSelectedInputSources(config.inputSources);
    setSelectedCountsOn(config.countsOn);
    setIsDistinct(config.isDistinct);
    setSelectedBreakdownBy(config.breakdownBy);
  };

  const handleDeleteStatsConfiguration = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      setStatsConfigurations(statsConfigurations.filter(c => c.id !== id));
      if (editingStatsId === id) {
        setEditingStatsId(null);
        setSelectedCountsOn([]);
        setIsDistinct(false);
        setSelectedBreakdownBy([]);
      }
    }
  };

  const handleGenerate = () => {
    if (activeTab === 1) {
      // Dynamic view - validate stats configurations
      if (statsConfigurations.length === 0) {
        alert('Please add at least one stats configuration before generating');
        return;
      }
    } else {
      // Preconfigured view - validate selection
      if (!selectedCombination) {
        alert('Please select a data combination before generating');
        return;
      }
    }
    alert('Generating stats...');
    // Add actual generation logic here
  };

  const handleCancel = () => {
    // Reset all state
    setActiveTab(0);
    setSelectedCombination('');
    setVisualizationType('tabular');
    setSelectedInputSources([]);
    setDataFlowRows(SAMPLE_DATA_FLOW);
    setSelectedCountsOn([]);
    setIsDistinct(false);
    setSelectedBreakdownBy([]);
    setStatsConfigurations([]);
    setEditingStatsId(null);
    onClose();
  };

  // Filtered lists
  const filteredInputSources = (availableInputSources.length > 0 ? availableInputSources : SAMPLE_INPUT_SOURCES).filter(source =>
    source.sourceName.toLowerCase().includes(inputSourcesSearch.toLowerCase())
  );

  const filteredCountsOn = availableFields.filter(field =>
    field.toLowerCase().includes(countsOnSearch.toLowerCase())
  );

  const filteredBreakdownBy = availableFields.filter(field =>
    field.toLowerCase().includes(breakdownBySearch.toLowerCase())
  );

  // Render visualization content based on selected type
  const renderVisualizationContent = () => {
    if (!selectedCombination) return null;

    switch (visualizationType) {
      case 'tabular':
        return (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                  {selectedCombination === 'state' || selectedCombination === 'state_decile' ? (
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.75, px: 1.5 }}>State</TableCell>
                  ) : null}
                  {selectedCombination === 'decile' || selectedCombination === 'state_decile' ? (
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.75, px: 1.5 }}>Decile</TableCell>
                  ) : null}
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.75, px: 1.5 }}>
                    Count
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {US_STATES_SAMPLE.map((row, index) => (
                  <TableRow
                    key={index}
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.04)',
                      },
                    }}
                  >
                    {selectedCombination === 'state' || selectedCombination === 'state_decile' ? (
                      <TableCell sx={{ py: 0.5, px: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {row.state}
                        </Typography>
                      </TableCell>
                    ) : null}
                    {selectedCombination === 'decile' || selectedCombination === 'state_decile' ? (
                      <TableCell sx={{ py: 0.5, px: 1.5 }}>
                        <Chip
                          label={row.decile}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 600, fontSize: '0.75rem', height: 20 }}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell align="right" sx={{ py: 0.5, px: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.8rem' }}>
                        {row.count.toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'bar':
        const maxCount = Math.max(...US_STATES_SAMPLE.map(s => s.count));
        return (
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, backgroundColor: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: '200px !important', pb: 1 }}>
              {US_STATES_SAMPLE.map((state, index) => {
                const barHeight = (state.count / maxCount) * 160;
                return (
                  <Box
                    key={index}
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" sx={{ mb: 0.25, fontWeight: 600, color: '#2D3748', fontSize: '0.7rem' }}>
                      {state.count.toLocaleString()}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        height: `${barHeight}px`,
                        backgroundColor: '#296695',
                        borderRadius: '3px 3px 0 0',
                        transition: 'all 0.3s ease',
                        minHeight: '8px',
                        '&:hover': {
                          backgroundColor: '#1A4A6B',
                          transform: 'scaleY(1.02)',
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.25,
                        fontSize: '0.65rem',
                        color: 'text.secondary',
                      }}
                    >
                      {state.state.substring(0, 4)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );

      case 'graph':
        const maxCountGraph = Math.max(...US_STATES_SAMPLE.map(s => s.count));
        const svgWidth = 550;
        const svgHeight = 180;
        const padding = 15;
        const chartWidth = svgWidth - padding * 2;
        const chartHeight = svgHeight - padding * 2;

        return (
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, backgroundColor: 'white' }}>
            <svg width={svgWidth} height={svgHeight} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={i}
                  x1={padding}
                  y1={padding + (i * chartHeight) / 4}
                  x2={svgWidth - padding}
                  y2={padding + (i * chartHeight) / 4}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />
              ))}
              <polyline
                points={US_STATES_SAMPLE.map((state, i) => {
                  const x = padding + (i / (US_STATES_SAMPLE.length - 1)) * chartWidth;
                  const y = padding + chartHeight - ((state.count / maxCountGraph) * chartHeight);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#296695"
                strokeWidth="2.5"
              />
              {US_STATES_SAMPLE.map((state, i) => {
                const x = padding + (i / (US_STATES_SAMPLE.length - 1)) * chartWidth;
                const y = padding + chartHeight - ((state.count / maxCountGraph) * chartHeight);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#296695"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 2 }}>
              {US_STATES_SAMPLE.map((state, i) => (
                <Typography key={i} variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                  {state.state.substring(0, 4)}
                </Typography>
              ))}
            </Box>
          </Box>
        );

      case 'pie':
        const total = US_STATES_SAMPLE.reduce((sum, s) => sum + s.count, 0);
        let currentAngle = 0;
        const colors = ['#296695', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

        return (
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, backgroundColor: 'white' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <svg width="160" height="160" viewBox="0 0 200 200">
                {US_STATES_SAMPLE.map((state, index) => {
                  const percentage = (state.count / total) * 100;
                  const angle = (percentage / 100) * 360;
                  const startAngle = currentAngle;
                  currentAngle += angle;

                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (currentAngle - 90) * (Math.PI / 180);

                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);

                  const largeArc = angle > 180 ? 1 : 0;

                  return (
                    <path
                      key={index}
                      d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={colors[index % colors.length]}
                      stroke="white"
                      strokeWidth="2"
                    />
                  );
                })}
                <circle cx="100" cy="100" r="35" fill="white" />
              </svg>
              <Box sx={{ flex: 1 }}>
                <Grid container spacing={0.75}>
                  {US_STATES_SAMPLE.map((state, index) => {
                    const percentage = ((state.count / total) * 100).toFixed(1);
                    return (
                      // @ts-expect-error MUI Grid API compatibility
                      <Grid item xs={6} key={index}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: '10px !important',
                              backgroundColor: colors[index % colors.length],
                              borderRadius: 0.5,
                            }}
                          />
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {state.state.substring(0, 4)} ({percentage}%)
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

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
        </Tabs>
      </Box>

      <DialogContent sx={{ py: 3, px: 3, minHeight: 400 }}>
        {/* Tab 1: Preconfigured Stats View */}
        {activeTab === 0 && (
          <Box>
            {/* Data Combination Selection */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
                Select Data Combination
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="combination-label">Select Combination</InputLabel>
                <Select
                  labelId="combination-label"
                  value={selectedCombination}
                  onChange={(e) => setSelectedCombination(e.target.value)}
                  label="Select Combination"
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem value="">
                    <em>Select a data combination</em>
                  </MenuItem>
                  {DATA_COMBINATIONS.map((combination) => (
                    <MenuItem key={combination.value} value={combination.value}>
                      <ListItemText primary={combination.label} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Visualization Display */}
            {selectedCombination && (
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
                    Preview
                  </Typography>
                  <Chip
                    label={DATA_COMBINATIONS.find((c) => c.value === selectedCombination)?.label}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }}
                  />
                </Box>
                {renderVisualizationContent()}
              </Box>
            )}

            {/* Visualization Options */}
            {selectedCombination && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem', mb: 1 }}>
                  Select Visualization Type
                </Typography>
                <RadioGroup
                  row
                  value={visualizationType}
                  onChange={(e) => setVisualizationType(e.target.value as VisualizationType)}
                >
                  {VISUALIZATION_OPTIONS.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio size="small" />}
                      label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{option.label}</Typography>}
                      sx={{ mr: 2.5 }}
                    />
                  ))}
                </RadioGroup>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Dynamic Stats View */}
        {activeTab === 1 && (
          <Box>
            {/* A. Input Sources Multi-Select */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
                Input Sources
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  value={selectedInputSources}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    if (value.includes('select-all')) {
                      if (selectedInputSources.length === filteredInputSources.length) {
                        setSelectedInputSources([]);
                      } else {
                        setSelectedInputSources(filteredInputSources.map(s => s.sourceName));
                      }
                    } else {
                      setSelectedInputSources(value);
                    }
                  }}
                  onClose={() => setInputSourcesSearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Tooltip key={value} title={value} arrow>
                          <Chip
                            label={value}
                            size="small"
                            sx={{
                              maxWidth: '150px !important',
                              minWidth: '50px',
                              height: '20px !important',
                              fontSize: '0.7rem',
                              overflow: 'hidden !important',
                              flexShrink: '0 !important',
                              '& .MuiChip-label': {
                                display: 'block !important',
                                overflow: 'hidden !important',
                                textOverflow: 'ellipsis !important',
                                whiteSpace: 'nowrap !important',
                                paddingLeft: '8px !important',
                                paddingRight: '8px !important',
                                textAlign: 'left !important',
                                direction: 'ltr !important',
                              }
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  )}
                  displayEmpty
                  MenuProps={{ PaperProps: { sx: { maxHeight: 300 } }, autoFocus: false }}
                >
                  <MenuItem disabled value="">
                    <em>Select input sources...</em>
                  </MenuItem>
                  <MenuItem
                    disableRipple
                    disableTouchRipple
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'white',
                      zIndex: 1,
                      borderBottom: '1px solid #ddd',
                      '&:hover': { backgroundColor: 'white' },
                      cursor: 'default',
                    }}
                  >
                    <TextField
                      size="small"
                      placeholder="Search..."
                      fullWidth
                      value={inputSourcesSearch}
                      onChange={(e) => setInputSourcesSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </MenuItem>
                  <MenuItem value="select-all" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                    <Checkbox
                      checked={filteredInputSources.length > 0 && selectedInputSources.length === filteredInputSources.length}
                      indeterminate={selectedInputSources.length > 0 && selectedInputSources.length < filteredInputSources.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredInputSources.map((source) => (
                    <MenuItem key={source.id} value={source.sourceName}>
                      <Checkbox checked={selectedInputSources.indexOf(source.sourceName) > -1} size="small" />
                      <ListItemText primary={source.sourceName} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* B. Data Flow Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.9rem' }}>
                Data Flow
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {dataFlowRows.map((row) => (
                  <Box
                    key={row.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      backgroundColor: row.accepted ? '#F0FDF4' : '#FEF2F2',
                      border: '1px solid',
                      borderColor: row.accepted ? '#10B981' : '#EF4444',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>
                      {row.text}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleDataFlow(row.id)}
                        sx={{
                          color: row.accepted ? '#10B981' : '#6B7280',
                          '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                        }}
                        title="Accept"
                      >
                        <CheckCircle fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveDataFlow(row.id)}
                        sx={{
                          color: '#EF4444',
                          '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                        }}
                        title="Remove"
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* C. Stats Configuration - Dynamic (Replicating Step 5 from Request Creation) */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
                  {editingStatsId ? 'Edit Stats Configuration' : 'Create Stats Configuration'}
                </Typography>
                {editingStatsId && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setEditingStatsId(null);
                      setSelectedCountsOn([]);
                      setIsDistinct(false);
                      setSelectedBreakdownBy([]);
                    }}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </Box>

              {/* Configuration Form - Horizontal Layout */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', mb: 2.5 }}>
                {/* Generate Counts On */}
                <Box sx={{ flex: 1, p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5, flexWrap: 'wrap' }}>
                    <Chip label="1" size="small" sx={{ backgroundColor: '#8B5CF6', color: '#fff', fontWeight: 700, width: 24, height: 24 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                      Generate Counts On
                    </Typography>
                    <Typography component="span" sx={{ color: 'error.main', fontSize: '0.9rem' }}>*</Typography>
                    <Box sx={{ width: '1px', height: '20px', backgroundColor: 'divider', mx: 0.5 }} />
                    <FormControlLabel
                      control={<Checkbox checked={isDistinct} onChange={(e) => setIsDistinct(e.target.checked)} size="small" sx={{ padding: '2px' }} />}
                      label={<Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>Distinct</Typography>}
                      sx={{ m: 0, whiteSpace: 'nowrap' }}
                    />
                  </Box>
                  <FormControl size="small" fullWidth>
                    <Select
                      multiple
                      value={selectedCountsOn}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                        if (value.includes('select-all-counts')) {
                          if (selectedCountsOn.length === filteredCountsOn.length) {
                            setSelectedCountsOn([]);
                          } else {
                            setSelectedCountsOn(filteredCountsOn);
                          }
                        } else {
                          setSelectedCountsOn(value);
                        }
                      }}
                      onClose={() => setCountsOnSearch('')}
                      input={<OutlinedInput />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Tooltip key={value} title={value} arrow>
                              <Chip
                                label={value}
                                size="small"
                                sx={{
                                  maxWidth: '150px !important',
                              minWidth: '50px',
                                  height: '20px !important',
                                  fontSize: '0.7rem',
                                  overflow: 'hidden !important',
                                  flexShrink: '0 !important',
                                  backgroundColor: '#8B5CF620',
                                  color: '#8B5CF6',
                                  fontWeight: 600,
                                  '& .MuiChip-label': {
                                    display: 'block !important',
                                    overflow: 'hidden !important',
                                    textOverflow: 'ellipsis !important',
                                    whiteSpace: 'nowrap !important',
                                paddingLeft: '8px !important',
                                paddingRight: '8px !important',
                                textAlign: 'left !important',
                                direction: 'ltr !important',
                                  }
                                }}
                              />
                            </Tooltip>
                          ))}
                        </Box>
                      )}
                      displayEmpty
                      MenuProps={{ PaperProps: { sx: { maxHeight: 300 } }, autoFocus: false }}
                    >
                      <MenuItem disabled value="">
                        <em>Select fields...</em>
                      </MenuItem>
                      <MenuItem
                        disableRipple
                        disableTouchRipple
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, borderBottom: '1px solid #ddd', '&:hover': { backgroundColor: 'white' }, cursor: 'default' }}
                      >
                        <TextField
                          size="small"
                          placeholder="Search..."
                          fullWidth
                          value={countsOnSearch}
                          onChange={(e) => setCountsOnSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </MenuItem>
                      <MenuItem value="select-all-counts" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                        <Checkbox
                          checked={filteredCountsOn.length > 0 && selectedCountsOn.length === filteredCountsOn.length}
                          indeterminate={selectedCountsOn.length > 0 && selectedCountsOn.length < filteredCountsOn.length}
                          size="small"
                        />
                        <ListItemText primary="Select All" />
                      </MenuItem>
                      {filteredCountsOn.map((field) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={selectedCountsOn.indexOf(field) > -1} size="small" />
                          <ListItemText primary={field} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Breakdown By */}
                <Box sx={{ flex: 1, p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Chip label="2" size="small" sx={{ backgroundColor: '#8B5CF6', color: '#fff', fontWeight: 700, mr: 1, width: 24, height: 24 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                      Breakdown By
                    </Typography>
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>*</Typography>
                  </Box>
                  <FormControl size="small" fullWidth>
                    <Select
                      multiple
                      value={selectedBreakdownBy}
                      onChange={(e) => {
                        const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                        if (value.includes('select-all-breakdown')) {
                          if (selectedBreakdownBy.length === filteredBreakdownBy.length) {
                            setSelectedBreakdownBy([]);
                          } else {
                            setSelectedBreakdownBy(filteredBreakdownBy);
                          }
                        } else {
                          setSelectedBreakdownBy(value);
                        }
                      }}
                      onClose={() => setBreakdownBySearch('')}
                      input={<OutlinedInput />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Tooltip key={value} title={value} arrow>
                              <Chip
                                label={value}
                                size="small"
                                sx={{
                                  maxWidth: '150px !important',
                              minWidth: '50px',
                                  height: '20px !important',
                                  fontSize: '0.7rem',
                                  overflow: 'hidden !important',
                                  flexShrink: '0 !important',
                                  backgroundColor: '#8B5CF620',
                                  color: '#8B5CF6',
                                  fontWeight: 600,
                                  '& .MuiChip-label': {
                                    display: 'block !important',
                                    overflow: 'hidden !important',
                                    textOverflow: 'ellipsis !important',
                                    whiteSpace: 'nowrap !important',
                                paddingLeft: '8px !important',
                                paddingRight: '8px !important',
                                textAlign: 'left !important',
                                direction: 'ltr !important',
                                  }
                                }}
                              />
                            </Tooltip>
                          ))}
                        </Box>
                      )}
                      displayEmpty
                      MenuProps={{ PaperProps: { sx: { maxHeight: 300 } }, autoFocus: false }}
                    >
                      <MenuItem disabled value="">
                        <em>Select fields...</em>
                      </MenuItem>
                      <MenuItem
                        disableRipple
                        disableTouchRipple
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, borderBottom: '1px solid #ddd', '&:hover': { backgroundColor: 'white' }, cursor: 'default' }}
                      >
                        <TextField
                          size="small"
                          placeholder="Search..."
                          fullWidth
                          value={breakdownBySearch}
                          onChange={(e) => setBreakdownBySearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </MenuItem>
                      <MenuItem value="select-all-breakdown" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                        <Checkbox
                          checked={filteredBreakdownBy.length > 0 && selectedBreakdownBy.length === filteredBreakdownBy.length}
                          indeterminate={selectedBreakdownBy.length > 0 && selectedBreakdownBy.length < filteredBreakdownBy.length}
                          size="small"
                        />
                        <ListItemText primary="Select All" />
                      </MenuItem>
                      {filteredBreakdownBy.map((field) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={selectedBreakdownBy.indexOf(field) > -1} size="small" />
                          <ListItemText primary={field} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Add Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconButton
                    onClick={handleAddStatsConfiguration}
                    sx={{
                      width: 48,
                      height: '48px !important',
                      backgroundColor: '#8B5CF6',
                      color: 'white',
                      boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                      '&:hover': {
                        backgroundColor: '#7C3AED',
                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                      },
                    }}
                  >
                    <Add sx={{ fontSize: 28 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Configurations Table */}
              {statsConfigurations.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#2D3748' }}>
                      Stats Configurations
                    </Typography>
                    <Chip
                      label={`${statsConfigurations.length} configuration${statsConfigurations.length !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{ fontWeight: 600, backgroundColor: '#8B5CF6', color: '#FFFFFF' }}
                    />
                  </Box>
                  <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                          <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Input Sources</TableCell>
                          <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Counts On</TableCell>
                          <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Is Distinct</TableCell>
                          <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Breakdown By</TableCell>
                          <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statsConfigurations.map((config) => (
                          <TableRow
                            key={config.id}
                            hover
                            sx={{
                              backgroundColor: editingStatsId === config.id ? 'rgba(139, 92, 246, 0.04)' : 'transparent',
                              '&:hover': { backgroundColor: editingStatsId === config.id ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)' },
                            }}
                          >
                            <TableCell sx={{ py: 0.75, px: 1.5 }}>
                              {config.inputSources.length > 0 ? (
                                <Tooltip title={config.inputSources.join(', ')} arrow>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip
                                      label={`${config.inputSources.length} source${config.inputSources.length !== 1 ? 's' : ''}`}
                                      size="small"
                                      sx={{ backgroundColor: '#8B5CF620', color: '#8B5CF6', border: '1px solid #8B5CF640', fontWeight: 600, height: '20px !important', fontSize: '0.65rem' }}
                                    />
                                  </Box>
                                </Tooltip>
                              ) : '--'}
                            </TableCell>
                            <TableCell sx={{ py: 0.75, px: 1.5 }}>
                              {config.countsOn.length > 0 ? (
                                <Tooltip title={config.countsOn.join(', ')} arrow>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip
                                      label={`${config.countsOn.length} field${config.countsOn.length !== 1 ? 's' : ''}`}
                                      size="small"
                                      sx={{ backgroundColor: '#10B98120', color: '#10B981', border: '1px solid #10B98140', fontWeight: 600, height: '20px !important', fontSize: '0.65rem' }}
                                    />
                                  </Box>
                                </Tooltip>
                              ) : '--'}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                              <Chip
                                label={config.isDistinct ? 'Yes' : 'No'}
                                size="small"
                                sx={{
                                  height: '20px !important',
                                  fontSize: '0.65rem',
                                  backgroundColor: config.isDistinct ? '#10B98120' : '#6B728020',
                                  color: config.isDistinct ? '#10B981' : '#6B7280',
                                  border: config.isDistinct ? '1px solid #10B98140' : '1px solid #6B728040',
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.75, px: 1.5 }}>
                              {config.breakdownBy.length > 0 ? (
                                <Tooltip title={config.breakdownBy.join(', ')} arrow>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip
                                      label={`${config.breakdownBy.length} field${config.breakdownBy.length !== 1 ? 's' : ''}`}
                                      size="small"
                                      sx={{ backgroundColor: '#F59E0B20', color: '#F59E0B', border: '1px solid #F59E0B40', fontWeight: 600, height: '20px !important', fontSize: '0.65rem' }}
                                    />
                                  </Box>
                                </Tooltip>
                              ) : '--'}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditStatsConfiguration(config)}
                                  sx={{ color: 'info.main', '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.12)' } }}
                                  title="Edit"
                                >
                                  <Edit sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteStatsConfiguration(config.id)}
                                  sx={{ color: 'error.main', '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)' } }}
                                  title="Delete"
                                >
                                  <Delete sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
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
        <Button
          variant="contained"
          onClick={handleGenerate}
          startIcon={<BarChartIcon />}
          sx={{
            px: 3,
            py: 0.75,
            textTransform: 'none',
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatsConfigDialog;
