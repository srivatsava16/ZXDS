import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Button,
  Stack,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  FormControl,
  InputLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Radio,
  RadioGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Save,
  Close,
  Add,
  Delete,
  BarChart,
  Output as OutputIcon,
  ArrowBack,
} from '@mui/icons-material';
import OutputModule from '../../components/OutputModule/OutputModule';

const STATS_FIELDS = [
  'DEVICE',
  'QUALITY SCORE',
  'FNAME',
  'LNAME',
  'DOB',
  'STATE',
  'ZIP',
];

interface StatsCombination {
  id: string;
  generateCountsOn: string[];
  isDistinct: boolean;
  breakdownBy: string[];
}

interface RequestData {
  id: string;
  requestName: string;
  statsCombinations: StatsCombination[];
  scheduleType: 'adhoc' | 'recurrence';
  notificationWhen: string;
  recipientEmail: string;
  recurrence: string;
  startDate: string;
  endDate: string;
}

const UniversalPullRequestViewPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | false>('panel1');

  // Form state
  const [requestName, setRequestName] = useState('');
  const [generateCountsOn, setGenerateCountsOn] = useState<string[]>([]);
  const [isDistinct, setIsDistinct] = useState(false);
  const [countsSearchQuery, setCountsSearchQuery] = useState('');
  const [breakdownBy, setBreakdownBy] = useState<string[]>([]);
  const [breakdownSearchQuery, setBreakdownSearchQuery] = useState('');
  const [statsCombinations, setStatsCombinations] = useState<StatsCombination[]>([]);
  const [scheduleType, setScheduleType] = useState<'adhoc' | 'recurrence'>('adhoc');
  const [notificationWhen, setNotificationWhen] = useState('standard');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load request data on mount
  useEffect(() => {
    const loadRequestData = () => {
      // Simulate API call to fetch request data
      // In real implementation, replace with actual API call
      setTimeout(() => {
        // Sample preloaded data based on requestId
        const sampleData: RequestData = {
          id: requestId || '1',
          requestName: `Universal Pull Request #${requestId}`,
          statsCombinations: [
            {
              id: '1',
              generateCountsOn: ['DEVICE', 'QUALITY SCORE'],
              isDistinct: true,
              breakdownBy: ['STATE', 'ZIP'],
            },
            {
              id: '2',
              generateCountsOn: ['FNAME', 'LNAME'],
              isDistinct: false,
              breakdownBy: ['DOB'],
            },
          ],
          scheduleType: 'adhoc',
          notificationWhen: 'standard',
          recipientEmail: 'user@example.com',
          recurrence: '',
          startDate: '',
          endDate: '',
        };

        // Populate form with loaded data
        setRequestName(sampleData.requestName);
        setStatsCombinations(sampleData.statsCombinations);
        setScheduleType(sampleData.scheduleType);
        setNotificationWhen(sampleData.notificationWhen);
        setRecipientEmail(sampleData.recipientEmail);
        setRecurrence(sampleData.recurrence);
        setStartDate(sampleData.startDate);
        setEndDate(sampleData.endDate);

        setLoading(false);
      }, 500);
    };

    loadRequestData();
  }, [requestId]);

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleCancel = () => {
    navigate('/universeReports');
  };

  const handleSave = () => {
    console.log('Saving request:', requestId);
    // Add save logic here
    navigate('/universeReports');
  };

  const filteredCountsFields = STATS_FIELDS.filter((field) =>
    field.toLowerCase().includes(countsSearchQuery.toLowerCase())
  );

  const filteredBreakdownFields = STATS_FIELDS.filter((field) =>
    field.toLowerCase().includes(breakdownSearchQuery.toLowerCase())
  );

  const handleAddCombination = () => {
    if (generateCountsOn.length === 0 && breakdownBy.length === 0) {
      alert('Please select at least one field for Generate Counts On or Breakdown By');
      return;
    }

    const newCombination: StatsCombination = {
      id: Date.now().toString(),
      generateCountsOn,
      isDistinct,
      breakdownBy,
    };

    setStatsCombinations([...statsCombinations, newCombination]);
    setGenerateCountsOn([]);
    setIsDistinct(false);
    setBreakdownBy([]);
  };

  const handleDeleteCombination = (id: string) => {
    if (window.confirm('Are you sure you want to delete this combination?')) {
      setStatsCombinations(statsCombinations.filter(c => c.id !== id));
    }
  };

  const getCombinationText = (combination: StatsCombination): string => {
    let text = '';
    if (combination.generateCountsOn.length > 0) {
      text += `Counts on ${combination.generateCountsOn.join(', ')}`;
      if (combination.isDistinct) {
        text += ' (Distinct)';
      }
    }
    if (combination.breakdownBy.length > 0) {
      if (text) text += ' and ';
      text += `breakdown by ${combination.breakdownBy.join(', ')}`;
    }
    return text || 'No fields selected';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={handleCancel}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: '#2D3748',
                  mb: 0.5,
                }}
              >
                View/Edit Universal Pull Request #{requestId}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                Review and modify your universal pull request settings
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Close />}
              onClick={handleCancel}
              sx={{ px: 2.5, py: 0.75, fontSize: '0.875rem' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Save />}
              onClick={handleSave}
              sx={{
                px: 2.5,
                py: 0.75,
                fontSize: '0.875rem',
                boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
              }}
            >
              Save Changes
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Request Name Section */}
      <Paper
        sx={{
          p: 3,
          mb: 2.5,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFB 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
            Request Name
          </Typography>
          <Typography
            component="span"
            sx={{
              color: 'error.main',
              fontSize: '1rem',
              fontWeight: 700,
              ml: 0.5,
            }}
          >
            *
          </Typography>
        </Box>
        <TextField
          size="small"
          label="Enter Request Name"
          variant="outlined"
          placeholder="e.g., Universal Pull Q1 2024"
          value={requestName}
          onChange={(e) => setRequestName(e.target.value)}
          sx={{
            width: '30%',
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
        />
      </Paper>

      {/* Accordion Modules */}
      <Box>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            display: 'block',
            mb: 2,
          }}
        >
          Configuration Modules
        </Typography>

        {/* Stats Module Accordion */}
        <Accordion
          expanded={expanded === 'panel1'}
          onChange={handleChange('panel1')}
          sx={{
            mb: 2,
            '&:before': {
              display: 'none',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '& .MuiAccordionSummary-content': {
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#8B5CF615',
                flexShrink: 0,
              }}
            >
              <BarChart sx={{ fontSize: 16, color: '#8B5CF6' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, fontSize: '0.95rem' }}>
                Stats Module
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Statistics and metrics configuration
              </Typography>
            </Box>
            <Chip
              label="Step 1"
              size="small"
              sx={{
                backgroundColor: '#8B5CF620',
                color: '#8B5CF6',
                fontWeight: 600,
                border: 'none',
              }}
            />
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                backgroundColor: '#F8FAFB',
                borderRadius: 3,
                p: 3,
              }}
            >
              {/* Generate Counts On */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem' }}>
                    #1 Generate Counts On
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box sx={{ width: '40%' }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="counts-label">Select Fields</InputLabel>
                      <Select
                        labelId="counts-label"
                        multiple
                        value={generateCountsOn}
                        onChange={(e) => setGenerateCountsOn(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        onClose={() => setCountsSearchQuery('')}
                        input={<OutlinedInput label="Select Fields" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" color="success" sx={{ height: 22, fontSize: '0.75rem', color: '#fff' }} />
                            ))}
                          </Box>
                        )}
                        sx={{ backgroundColor: 'white' }}
                        MenuProps={{ PaperProps: { style: { maxHeight: 300 } }, autoFocus: false }}
                      >
                        <Box sx={{ px: 2, py: 1, position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, borderBottom: '1px solid', borderColor: 'divider' }} onKeyDown={(e) => e.stopPropagation()}>
                          <TextField size="small" placeholder="Search fields..." fullWidth value={countsSearchQuery} onChange={(e) => setCountsSearchQuery(e.target.value)} autoFocus sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#F8FAFB' } }} />
                        </Box>
                        {filteredCountsFields.length > 0 ? filteredCountsFields.map((field) => (
                          <MenuItem key={field} value={field}>
                            <Checkbox checked={generateCountsOn.indexOf(field) > -1} size="small" />
                            <ListItemText primary={field} />
                          </MenuItem>
                        )) : (
                          <MenuItem disabled><Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No fields found</Typography></MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Is Distinct Checkbox */}
                  <Box>
                    <FormControlLabel
                      control={<Checkbox checked={isDistinct} onChange={(e) => setIsDistinct(e.target.checked)} size="small" />}
                      label={<Typography variant="body2" sx={{ fontSize: '0.85rem' }}>Is Distinct</Typography>}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Breakdown By */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem' }}>
                    #2 Breakdown By
                  </Typography>
                </Box>
                <Box sx={{ width: '40%' }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="breakdown-label">Select Fields</InputLabel>
                    <Select
                      labelId="breakdown-label"
                      multiple
                      value={breakdownBy}
                      onChange={(e) => setBreakdownBy(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                      onClose={() => setBreakdownSearchQuery('')}
                      input={<OutlinedInput label="Select Fields" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" color="warning" sx={{ height: 22, fontSize: '0.75rem', color: '#fff' }} />
                          ))}
                        </Box>
                      )}
                      sx={{ backgroundColor: 'white' }}
                      MenuProps={{ PaperProps: { style: { maxHeight: 300 } }, autoFocus: false }}
                    >
                      <Box sx={{ px: 2, py: 1, position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, borderBottom: '1px solid', borderColor: 'divider' }} onKeyDown={(e) => e.stopPropagation()}>
                        <TextField size="small" placeholder="Search fields..." fullWidth value={breakdownSearchQuery} onChange={(e) => setBreakdownSearchQuery(e.target.value)} autoFocus sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#F8FAFB' } }} />
                      </Box>
                      {filteredBreakdownFields.length > 0 ? filteredBreakdownFields.map((field) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={breakdownBy.indexOf(field) > -1} size="small" />
                          <ListItemText primary={field} />
                        </MenuItem>
                      )) : (
                        <MenuItem disabled><Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No fields found</Typography></MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* +1 Select Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddCombination}
                  sx={{
                    px: 2.5,
                    py: 0.75,
                    fontSize: '0.875rem',
                    backgroundColor: '#296695',
                    '&:hover': { backgroundColor: '#1A4A6B' },
                    boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
                  }}
                >
                  +1 Select
                </Button>
              </Box>

              {/* Combinations Table */}
              {statsCombinations.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                      Stat Combinations
                    </Typography>
                    <Chip label={`${statsCombinations.length} combination${statsCombinations.length !== 1 ? 's' : ''}`} size="small" color="primary" sx={{ fontWeight: 600 }} />
                  </Box>
                  <TableContainer
                    component={Paper}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                          <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Generate Counts On</TableCell>
                          <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Is Distinct</TableCell>
                          <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Breakdown By</TableCell>
                          <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statsCombinations.map((combination) => (
                          <TableRow
                            key={combination.id}
                            hover
                            sx={{
                              '&:hover': {
                                backgroundColor: 'rgba(41, 102, 149, 0.04)',
                              },
                            }}
                          >
                            <TableCell sx={{ py: 0.75, px: 1.5 }}>
                              {combination.generateCountsOn.length > 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip
                                    label={`${combination.generateCountsOn.length} field${combination.generateCountsOn.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#10B98120',
                                      color: '#10B981',
                                      border: '1px solid #10B98140',
                                      fontWeight: 600,
                                      height: 20,
                                      fontSize: '0.65rem',
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: '0.7rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {combination.generateCountsOn.slice(0, 2).join(', ')}
                                    {combination.generateCountsOn.length > 2 ? '...' : ''}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                  --
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ py: 0.75, px: 1.5 }}>
                              <Chip
                                label={combination.isDistinct ? 'Yes' : 'No'}
                                size="small"
                                sx={{
                                  backgroundColor: combination.isDistinct ? '#8B5CF620' : '#64748B20',
                                  color: combination.isDistinct ? '#8B5CF6' : '#64748B',
                                  border: combination.isDistinct ? '1px solid #8B5CF640' : '1px solid #64748B40',
                                  fontWeight: 600,
                                  height: 20,
                                  fontSize: '0.65rem',
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.75, px: 1.5 }}>
                              {combination.breakdownBy.length > 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip
                                    label={`${combination.breakdownBy.length} field${combination.breakdownBy.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#F59E0B20',
                                      color: '#F59E0B',
                                      border: '1px solid #F59E0B40',
                                      fontWeight: 600,
                                      height: 20,
                                      fontSize: '0.65rem',
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: '0.7rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {combination.breakdownBy.slice(0, 2).join(', ')}
                                    {combination.breakdownBy.length > 2 ? '...' : ''}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                  --
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteCombination(combination.id)}
                                  sx={{
                                    color: 'error.main',
                                    padding: '3px',
                                    '&:hover': {
                                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                    },
                                  }}
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
          </AccordionDetails>
        </Accordion>

        {/* Output Module Accordion */}
        <Accordion
          expanded={expanded === 'panel2'}
          onChange={handleChange('panel2')}
          sx={{
            mb: 2,
            '&:before': {
              display: 'none',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '& .MuiAccordionSummary-content': {
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#3B82F615',
                flexShrink: 0,
              }}
            >
              <OutputIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, fontSize: '0.95rem' }}>
                Output Module
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Specify output format and destination settings
              </Typography>
            </Box>
            <Chip
              label="Step 2"
              size="small"
              sx={{
                backgroundColor: '#3B82F620',
                color: '#3B82F6',
                fontWeight: 600,
                border: 'none',
              }}
            />
          </AccordionSummary>
          <AccordionDetails>
            <OutputModule
              scheduleType={scheduleType}
              onScheduleTypeChange={setScheduleType}
              notificationWhen={notificationWhen}
              onNotificationWhenChange={setNotificationWhen}
              recipientEmail={recipientEmail}
              onRecipientEmailChange={setRecipientEmail}
              recurrence={recurrence}
              onRecurrenceChange={setRecurrence}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
            />
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Bottom Actions */}
      <Box
        sx={{
          mt: 3,
          p: 2.5,
          borderRadius: 4,
          backgroundColor: '#F8FAFB',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
        }}
      >
        <Button variant="outlined" size="small" startIcon={<Close />} onClick={handleCancel} sx={{ px: 3, py: 0.75, fontSize: '0.875rem' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<Save />}
          onClick={handleSave}
          sx={{
            px: 3,
            py: 0.75,
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Save Changes
        </Button>
      </Box>
    </Box>
  );
};

export default UniversalPullRequestViewPage;
