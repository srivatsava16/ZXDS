import { useState } from 'react';
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
  Tooltip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Save,
  Close,
  Add,
  Delete,
  Edit,
  BarChart,
  Output as OutputIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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


interface GenerateCountsConfig {
  id: string;
  fields: string[];
  isDistinct: boolean;
}

interface BreakdownConfig {
  id: string;
  fields: string[];
}

interface StatsCombination {
  id: string;
  generateCountsOn: string[];
  isDistinct: boolean;
  breakdownBy: string[];
}

const UniversalPullRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'accordion' | 'stepper'>('accordion');
  const [activeStep, setActiveStep] = useState(0);
  const [requestName, setRequestName] = useState('');
  const [expanded, setExpanded] = useState<string | false>('panel1');

  // Generate Counts On state
  const [generateCountsOn, setGenerateCountsOn] = useState<string[]>([]);
  const [isDistinct, setIsDistinct] = useState(false);
  const [countsSearchQuery, setCountsSearchQuery] = useState('');

  // Breakdown By state
  const [breakdownBy, setBreakdownBy] = useState<string[]>([]);
  const [breakdownSearchQuery, setBreakdownSearchQuery] = useState('');

  // Stats Combinations
  const [statsCombinations, setStatsCombinations] = useState<StatsCombination[]>([]);

  // Schedule Component state
  const [scheduleType, setScheduleType] = useState<'adhoc' | 'scheduled_at'>('adhoc');
  const [notificationWhen, setNotificationWhen] = useState('standard');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleCancel = () => {
    navigate('/dataPullReports');
  };

  const handleSave = () => {
  };

  // Filter fields based on search query
  const filteredCountsFields = STATS_FIELDS.filter((field) =>
    field.toLowerCase().includes(countsSearchQuery.toLowerCase())
  );

  const filteredBreakdownFields = STATS_FIELDS.filter((field) =>
    field.toLowerCase().includes(breakdownSearchQuery.toLowerCase())
  );

  // Add Combination handler
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

    // Reset selections
    setGenerateCountsOn([]);
    setIsDistinct(false);
    setBreakdownBy([]);
  };

  const handleDeleteCombination = (id: string) => {
    if (window.confirm('Are you sure you want to delete this combination?')) {
      setStatsCombinations(statsCombinations.filter(c => c.id !== id));
    }
  };

  // Generate readable combination text
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

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#2D3748',
                mb: 0.5,
              }}
            >
              Create New Universal Pull Request
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Configure your universal pull request settings
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* View Mode Toggle */}
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
              Step View
            </Typography>
            <Switch
              checked={viewMode === 'stepper'}
              onChange={(e) => setViewMode(e.target.checked ? 'stepper' : 'accordion')}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#296695',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#296695',
                },
              }}
            />
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
              Save Request
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Request Name Section - Only show in Accordion View */}
      {viewMode === 'accordion' && (
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
      )}

      {/* Conditional View: Accordion or Stepper */}
      {viewMode === 'accordion' ? (
        /* Accordion View */
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
            {/* Configuration Form - Horizontal Layout */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'stretch',
                mb: 2.5,
              }}
            >
              {/* Step 1: Generate Counts On */}
              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Chip
                    label={'1'}
                    size="small"
                    sx={{
                      backgroundColor: '#8B5CF6',
                      color: '#fff',
                      fontWeight: 700,
                      mr: 1,
                      width: 24,
                      height: 24,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                    Generate Counts On
                  </Typography>
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                    *
                  </Typography>
                </Box>
                <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                  <Select
                    multiple
                    value={generateCountsOn}
                    onChange={(e) => setGenerateCountsOn(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                        ))}
                      </Box>
                    )}
                    displayEmpty
                    sx={{ backgroundColor: 'white' }}
                  >
                    <MenuItem disabled value="">
                      <em>Select fields...</em>
                    </MenuItem>
                    {STATS_FIELDS.map((field) => (
                      <MenuItem key={field} value={field}>
                        <Checkbox checked={generateCountsOn.indexOf(field) > -1} size="small" />
                        <ListItemText primary={field} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Checkbox checked={isDistinct} onChange={(e) => setIsDistinct(e.target.checked)} size="small" sx={{ py: 0 }} />}
                  label={<Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Distinct</Typography>}
                  sx={{ m: 0, whiteSpace: 'nowrap' }}
                />
              </Box>

              {/* Step 2: Breakdown By */}
              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Chip
                    label={'2'}
                    size="small"
                    sx={{
                      backgroundColor: '#8B5CF6',
                      color: '#fff',
                      fontWeight: 700,
                      mr: 1,
                      width: 24,
                      height: 24,
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                    Breakdown By
                  </Typography>
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                    *
                  </Typography>
                </Box>
                <FormControl size="small" fullWidth>
                  <Select
                    multiple
                    value={breakdownBy}
                    onChange={(e) => setBreakdownBy(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                        ))}
                      </Box>
                    )}
                    displayEmpty
                    sx={{ backgroundColor: 'white' }}
                  >
                    <MenuItem disabled value="">
                      <em>Select fields...</em>
                    </MenuItem>
                    {STATS_FIELDS.map((field) => (
                      <MenuItem key={field} value={field}>
                        <Checkbox checked={breakdownBy.indexOf(field) > -1} size="small" />
                        <ListItemText primary={field} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Add Button */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconButton
                  onClick={handleAddCombination}
                  sx={{
                    width: 48,
                    height: 48,
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

              {/* Stats Configurations Table */}
              {statsCombinations.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                      Stats Configurations
                    </Typography>
                    <Chip
                      label={`${statsCombinations.length} configuration${statsCombinations.length !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        backgroundColor: '#8B5CF6',
                        color: '#FFFFFF',
                        '&:hover': {
                          backgroundColor: '#7C3AED',
                        }
                      }}
                    />
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
                          <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Counts On</TableCell>
                          <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Is Distinct</TableCell>
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
                                backgroundColor: 'rgba(139, 92, 246, 0.04)',
                              },
                            }}
                          >
                            {/* Generate Counts On Column */}
                            <TableCell sx={{ py: 0.75, px: 1.5 }}>
                              {combination.generateCountsOn.length > 0 ? (
                                <Tooltip
                                  title={
                                    <Box sx={{ maxWidth: 400 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                        Counts On ({combination.generateCountsOn.length}):
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block' }}>
                                        {combination.generateCountsOn.join(', ')}
                                      </Typography>
                                    </Box>
                                  }
                                  arrow
                                  placement="top"
                                >
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
                                </Tooltip>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                  --
                                </Typography>
                              )}
                            </TableCell>

                            {/* Is Distinct Column */}
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

                            {/* Breakdown By Column */}
                            <TableCell sx={{ py: 0.75, px: 1.5 }}>
                              {combination.breakdownBy.length > 0 ? (
                                <Tooltip
                                  title={
                                    <Box sx={{ maxWidth: 400 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                        Breakdown By ({combination.breakdownBy.length} fields):
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block' }}>
                                        {combination.breakdownBy.join(', ')}
                                      </Typography>
                                    </Box>
                                  }
                                  arrow
                                  placement="top"
                                >
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
                                </Tooltip>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                  --
                                </Typography>
                              )}
                            </TableCell>

                            {/* Actions Column */}
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
            <OutputModule />
          </AccordionDetails>
        </Accordion>
        </Box>
      ) : (
        /* Stepper View */
        <Box>
          {/* Horizontal Stepper */}
          <Box sx={{ mb: 3 }}>
            <Stepper
              activeStep={activeStep}
              sx={{
                '& .MuiStepConnector-line': {
                  borderColor: 'divider',
                },
              }}
            >
              <Step key="step1">
                <StepLabel
                  sx={{
                    flexDirection: 'column',
                    '& .MuiStepLabel-iconContainer': {
                      paddingRight: 0,
                    },
                    '& .MuiStepLabel-labelContainer': {
                      marginTop: '8px',
                    },
                    '& .MuiStepLabel-label': {
                      fontSize: '0.8rem',
                      fontWeight: activeStep === 0 ? 600 : 400,
                      color: activeStep === 0 ? '#2D3748' : 'text.secondary',
                      textAlign: 'center',
                    },
                  }}
                >
                  Request Name & Stats
                </StepLabel>
              </Step>
              <Step key="step2">
                <StepLabel
                  sx={{
                    flexDirection: 'column',
                    '& .MuiStepLabel-iconContainer': {
                      paddingRight: 0,
                    },
                    '& .MuiStepLabel-labelContainer': {
                      marginTop: '8px',
                    },
                    '& .MuiStepLabel-label': {
                      fontSize: '0.8rem',
                      fontWeight: activeStep === 1 ? 600 : 400,
                      color: activeStep === 1 ? '#2D3748' : 'text.secondary',
                      textAlign: 'center',
                    },
                  }}
                >
                  Output
                </StepLabel>
              </Step>
            </Stepper>
          </Box>

          {/* Step Content */}
          <Paper sx={{ p: 3, borderRadius: 4 }}>
            {activeStep === 0 && (
              <Box>
                {/* Request Name Section */}
                <Box sx={{ mb: 4 }}>
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
                      width: '50%',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                      },
                    }}
                  />
                </Box>

                {/* Stats Module Content - Horizontal Layout */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'stretch',
                    mb: 2.5,
                  }}
                >
                  {/* Step 1: Generate Counts On */}
                  <Box
                    sx={{
                      flex: 1,
                      p: 2,
                      backgroundColor: 'white',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Chip
                        label={'1'}
                        size="small"
                        sx={{
                          backgroundColor: '#8B5CF6',
                          color: '#fff',
                          fontWeight: 700,
                          mr: 1,
                          width: 24,
                          height: 24,
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                        Generate Counts On
                      </Typography>
                      <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                        *
                      </Typography>
                    </Box>
                    <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                      <Select
                        multiple
                        value={generateCountsOn}
                        onChange={(e) => setGenerateCountsOn(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        input={<OutlinedInput />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                            ))}
                          </Box>
                        )}
                        displayEmpty
                        sx={{ backgroundColor: 'white' }}
                      >
                        <MenuItem disabled value="">
                          <em>Select fields...</em>
                        </MenuItem>
                        {STATS_FIELDS.map((field) => (
                          <MenuItem key={field} value={field}>
                            <Checkbox checked={generateCountsOn.indexOf(field) > -1} size="small" />
                            <ListItemText primary={field} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControlLabel
                      control={<Checkbox checked={isDistinct} onChange={(e) => setIsDistinct(e.target.checked)} size="small" sx={{ py: 0 }} />}
                      label={<Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Distinct</Typography>}
                      sx={{ m: 0, whiteSpace: 'nowrap' }}
                    />
                  </Box>

                  {/* Step 2: Breakdown By */}
                  <Box
                    sx={{
                      flex: 1,
                      p: 2,
                      backgroundColor: 'white',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Chip
                        label={'2'}
                        size="small"
                        sx={{
                          backgroundColor: '#8B5CF6',
                          color: '#fff',
                          fontWeight: 700,
                          mr: 1,
                          width: 24,
                          height: 24,
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                        Breakdown By
                      </Typography>
                      <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                        *
                      </Typography>
                    </Box>
                    <FormControl size="small" fullWidth>
                      <Select
                        multiple
                        value={breakdownBy}
                        onChange={(e) => setBreakdownBy(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        input={<OutlinedInput />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                            ))}
                          </Box>
                        )}
                        displayEmpty
                        sx={{ backgroundColor: 'white' }}
                      >
                        <MenuItem disabled value="">
                          <em>Select fields...</em>
                        </MenuItem>
                        {STATS_FIELDS.map((field) => (
                          <MenuItem key={field} value={field}>
                            <Checkbox checked={breakdownBy.indexOf(field) > -1} size="small" />
                            <ListItemText primary={field} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Add Button */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconButton
                      onClick={handleAddCombination}
                      sx={{
                        width: 48,
                        height: 48,
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

                  {/* Stats Configurations Table */}
                  {statsCombinations.length > 0 && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                          Stats Configurations
                        </Typography>
                        <Chip
                          label={`${statsCombinations.length} configuration${statsCombinations.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            backgroundColor: '#8B5CF6',
                            color: '#FFFFFF',
                            '&:hover': {
                              backgroundColor: '#7C3AED',
                            }
                          }}
                        />
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
                              <TableCell sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Counts On</TableCell>
                              <TableCell align="center" sx={{ py: 0.75, px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>Is Distinct</TableCell>
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
                                    backgroundColor: 'rgba(139, 92, 246, 0.04)',
                                  },
                                }}
                              >
                                {/* Generate Counts On Column */}
                                <TableCell sx={{ py: 0.75, px: 1.5 }}>
                                  {combination.generateCountsOn.length > 0 ? (
                                    <Tooltip
                                      title={
                                        <Box sx={{ maxWidth: 400 }}>
                                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                            Counts On ({combination.generateCountsOn.length}):
                                          </Typography>
                                          <Typography variant="caption" sx={{ display: 'block' }}>
                                            {combination.generateCountsOn.join(', ')}
                                          </Typography>
                                        </Box>
                                      }
                                      arrow
                                      placement="top"
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Chip
                                          label={`${combination.generateCountsOn.length} field${combination.generateCountsOn.length !== 1 ? 's' : ''}`}
                                          size="small"
                                          sx={{
                                            backgroundColor: '#8B5CF620',
                                            color: '#8B5CF6',
                                            border: '1px solid #8B5CF640',
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
                                    </Tooltip>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                      --
                                    </Typography>
                                  )}
                                </TableCell>

                                {/* Is Distinct Column */}
                                <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
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

                                {/* Breakdown By Column */}
                                <TableCell sx={{ py: 0.75, px: 1.5 }}>
                                  {combination.breakdownBy.length > 0 ? (
                                    <Tooltip
                                      title={
                                        <Box sx={{ maxWidth: 400 }}>
                                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                            Breakdown By ({combination.breakdownBy.length}):
                                          </Typography>
                                          <Typography variant="caption" sx={{ display: 'block' }}>
                                            {combination.breakdownBy.join(', ')}
                                          </Typography>
                                        </Box>
                                      }
                                      arrow
                                      placement="top"
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Chip
                                          label={`${combination.breakdownBy.length} field${combination.breakdownBy.length !== 1 ? 's' : ''}`}
                                          size="small"
                                          sx={{
                                            backgroundColor: '#8B5CF620',
                                            color: '#8B5CF6',
                                            border: '1px solid #8B5CF640',
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
                                    </Tooltip>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                      --
                                    </Typography>
                                  )}
                                </TableCell>

                                {/* Actions Column */}
                                <TableCell align="center" sx={{ py: 0.75, px: 1.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteCombination(combination.id)}
                                    sx={{ color: 'error.main' }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
            )}

            {activeStep === 1 && (
              <Box>
                <OutputModule />
              </Box>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={activeStep === 0}
                sx={{ px: 3 }}
              >
                Back
              </Button>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {activeStep < 1 && (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{
                      px: 3,
                      backgroundColor: '#296695',
                      '&:hover': {
                        backgroundColor: '#1A4A6B',
                      },
                    }}
                  >
                    Next
                  </Button>
                )}
                {activeStep === 1 && (
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    sx={{
                      px: 3,
                      boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
                    }}
                  >
                    Save Request
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

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
          Save Request
        </Button>
      </Box>
    </Box>
  );
};

export default UniversalPullRequestPage;
