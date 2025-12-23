import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  Paper,
  Stack,
  Chip,
  IconButton,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Save,
  Close,
  Input as InputIcon,
  AddCircleOutline,
  RemoveCircleOutline,
  CompareArrows,
  Output as OutputIcon,
  Add,
  Delete,
  Edit,
  BarChart,
  ViewAgenda,
  ViewStream,
  Schedule as ScheduleIcon,
  DragIndicator,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import InputModule from '../components/InputModule/InputModule';
import AppendModule from '../components/AppendModule/AppendModule';
import SuppressModule from '../components/SuppressModule/SuppressModule';
import MatchModule from '../components/MatchModule/MatchModule';
import OutputModule from '../components/OutputModule/OutputModule';
import ScheduleModule from '../components/ScheduleModule/ScheduleModule';
import type { InputSource } from '../components/InputModule/InputModule';
import { comprehensiveSampleData } from '../mockData/sampleRequestData';

const STATS_FIELDS = [
  'DEVICE',
  'QUALITY SCORE',
  'FNAME',
  'LNAME',
  'DOB',
  'STATE',
  'ZIP',
];

interface StatsConfiguration {
  id: string;
  inputSources: string[];
  countsOn: string[];
  isDistinct: boolean;
  breakdownBy: string[];
}

// Versioned Source Interface
export interface VersionedSource extends InputSource {
  isVersioned: true;
  versionNumber: number;
  versionLabel: string; // e.g., "Match_v1", "Append_v1", "Suppress_v1"
  sourceModule: 'Match' | 'Append' | 'Suppress';
  baseInputSources: string[]; // IDs of the input sources used
  operationSources: string[]; // IDs of match/append/suppress sources used
  operationFields?: string[]; // Fields involved in the operation
  combinedHeaders?: string[]; // All headers after the versioning operation
}

// Sortable Accordion Item Component
interface SortableAccordionItemProps {
  module: any;
  index: number;
  expanded: string[];
  onChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  renderContent: (moduleId: string) => React.ReactNode;
  isDraggable: boolean;
}

const SortableAccordionItem: React.FC<SortableAccordionItemProps> = ({
  module,
  index,
  expanded,
  onChange,
  renderContent,
  isDraggable,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Accordion
        expanded={expanded.includes(module.id)}
        onChange={onChange(module.id)}
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
              backgroundColor: `${module.color}15`,
              flexShrink: 0,
            }}
          >
            <module.icon sx={{ fontSize: 16, color: module.color }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, fontSize: '0.95rem' }}>
              {module.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {module.description}
            </Typography>
          </Box>
          <Chip
            label={`Step ${index + 1}`}
            size="small"
            sx={{
              backgroundColor: `${module.color}20`,
              color: module.color,
              fontWeight: 600,
              border: 'none',
            }}
          />
          {isDraggable && (
            <Box
              {...attributes}
              {...listeners}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'grab',
                color: 'text.secondary',
                ml: 1,
                '&:active': {
                  cursor: 'grabbing',
                },
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              <DragIndicator />
            </Box>
          )}
        </AccordionSummary>
        <AccordionDetails>{renderContent(module.id)}</AccordionDetails>
      </Accordion>
    </div>
  );
};

// Sortable Step Component for Stepper
interface SortableStepProps {
  module: any;
  index: number;
  activeStep: number;
  onClick: () => void;
}

const SortableStep: React.FC<SortableStepProps> = ({ module, index, activeStep, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  return (
    <Step ref={setNodeRef} style={style} sx={{ cursor: 'pointer' }}>
      <StepLabel
        onClick={onClick}
        StepIconProps={{
          sx: {
            color: index <= activeStep ? module.color : 'text.disabled',
            '&.Mui-active': {
              color: module.color,
            },
            '&.Mui-completed': {
              color: module.color,
            },
          },
        }}
        sx={{
          flexDirection: 'column',
          position: 'relative',
          '& .MuiStepLabel-iconContainer': {
            paddingRight: 0,
          },
          '& .MuiStepLabel-labelContainer': {
            marginTop: '8px',
          },
          '& .MuiStepLabel-label': {
            fontSize: '0.8rem',
            fontWeight: index === activeStep ? 600 : 400,
            color: index === activeStep ? '#2D3748' : 'text.secondary',
            textAlign: 'center',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {module.title}
          {/* Drag indicator - positioned to the right of the step label */}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              color: 'text.secondary',
              backgroundColor: 'white',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              px: 0.5,
              py: 0.25,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              '&:active': {
                cursor: 'grabbing',
              },
              '&:hover': {
                color: module.color,
                borderColor: module.color,
                boxShadow: `0 2px 8px ${module.color}40`,
              },
            }}
          >
            <DragIndicator sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      </StepLabel>
    </Step>
  );
};

const RequestCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId?: string }>();
  const [viewMode, setViewMode] = useState<'accordion' | 'stepper'>('accordion');
  const [activeStep, setActiveStep] = useState(0);
  const [expanded, setExpanded] = useState<string[]>(['panel1']); // Array to support multiple open accordions
  const inputModuleRef = useRef<{ handleAddSource: () => void }>(null);
  const [inputSources, setInputSources] = useState<InputSource[]>([]);
  const [requestName, setRequestName] = useState('');

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Stats Component state
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [selectedCountsOn, setSelectedCountsOn] = useState<string[]>([]);
  const [isDistinct, setIsDistinct] = useState(false);
  const [selectedBreakdownBy, setSelectedBreakdownBy] = useState<string[]>([]);
  const [statsConfigurations, setStatsConfigurations] = useState<StatsConfiguration[]>([]);
  const [editingStatsId, setEditingStatsId] = useState<string | null>(null);

  // Stats search states
  const [statsInputSourcesSearch, setStatsInputSourcesSearch] = useState('');
  const [statsCountsOnSearch, setStatsCountsOnSearch] = useState('');
  const [statsBreakdownBySearch, setStatsBreakdownBySearch] = useState('');

  // Schedule Component state
  const [scheduleType, setScheduleType] = useState<'adhoc' | 'recurrence'>('adhoc');
  const [notificationWhen, setNotificationWhen] = useState('standard');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Versioned Sources State
  const [versionedSources, setVersionedSources] = useState<VersionedSource[]>([]);
  const [versionCounter, setVersionCounter] = useState<Record<string, number>>({
    Match: 0,
    Append: 0,
    Suppress: 0,
  });

  // Initial configs for modules (for edit mode)
  const [initialAppendConfigs, setInitialAppendConfigs] = useState<any[]>([]);
  const [initialSuppressConfigs, setInitialSuppressConfigs] = useState<any[]>([]);
  const [initialMatchConfigs, setInitialMatchConfigs] = useState<any[]>([]);
  const [initialOutputConfigs, setInitialOutputConfigs] = useState<any[]>([]);

  // Load sample data when in edit mode for demo request (ID 999)
  useEffect(() => {
    if (requestId === '999') {
      // Load comprehensive sample data
      setRequestName(comprehensiveSampleData.requestName);
      setInputSources(comprehensiveSampleData.inputSources);

      // Load append configurations
      if (comprehensiveSampleData.appendConfigs && comprehensiveSampleData.appendConfigs.length > 0) {
        setInitialAppendConfigs(comprehensiveSampleData.appendConfigs);
      }

      // Load suppress configurations
      if (comprehensiveSampleData.suppressConfigs && comprehensiveSampleData.suppressConfigs.length > 0) {
        setInitialSuppressConfigs(comprehensiveSampleData.suppressConfigs);
      }

      // Load match configurations
      if (comprehensiveSampleData.matchConfigs && comprehensiveSampleData.matchConfigs.length > 0) {
        setInitialMatchConfigs(comprehensiveSampleData.matchConfigs);
      }

      // Load output configurations
      if (comprehensiveSampleData.outputConfigs && comprehensiveSampleData.outputConfigs.length > 0) {
        setInitialOutputConfigs(comprehensiveSampleData.outputConfigs);
      }

      // Load stats configurations
      if (comprehensiveSampleData.statsConfigs && comprehensiveSampleData.statsConfigs.length > 0) {
        setStatsConfigurations(comprehensiveSampleData.statsConfigs as StatsConfiguration[]);
      }

      // Load schedule configuration
      if (comprehensiveSampleData.scheduleConfig) {
        const schedConfig = comprehensiveSampleData.scheduleConfig;
        setScheduleType(schedConfig.scheduleType || 'adhoc');
        setRecurrence(schedConfig.recurrencePattern || '');
        setNotificationWhen(schedConfig.emailNotification || 'standard');
        setStartDate(schedConfig.startDate || '');
        setEndDate(schedConfig.endDate || '');
        if (schedConfig.notificationEmails && schedConfig.notificationEmails.length > 0) {
          setRecipientEmail(schedConfig.notificationEmails.join(', '));
        }
      }
    }
  }, [requestId]);

  // Helper to get source name by ID
  const getSourceNameById = (sourceId: string): string => {
    // Check in regular input sources
    const inputSource = inputSources.find(s => s.id === sourceId);
    if (inputSource) return inputSource.sourceName;

    // Check in versioned sources
    const versionedSource = versionedSources.find(s => s.id === sourceId);
    if (versionedSource) return versionedSource.sourceName;

    return sourceId; // fallback
  };

  // Handler to create versioned source from Match/Append/Suppress modules
  const handleCreateVersionedSource = (
    sourceModule: 'Match' | 'Append' | 'Suppress',
    baseInputSources: string[],
    operationSources: string[],
    operationFields?: string[]
  ) => {
    // Validation: Must have at least one input source and one operation source
    if (baseInputSources.length === 0) {
      alert('Please select at least one Input Source before creating versions.');
      return;
    }
    if (operationSources.length === 0) {
      alert('Please select at least one Operation Source before creating versions.');
      return;
    }

    // Generate n × m combinations
    const newVersions: VersionedSource[] = [];

    // For each input source
    baseInputSources.forEach(inputSourceId => {
      const inputSource = allAvailableInputSources.find(s => s.id === inputSourceId);
      if (!inputSource) return;

      // For each operation source
      operationSources.forEach(operationSourceId => {
        const operationSourceName = getSourceNameById(operationSourceId);

        // Build cumulative version name
        // If the input source is already versioned, append to its name
        // Otherwise, start fresh
        let versionName: string;
        if (inputSource.isVersioned) {
          // Input is already versioned, append the operation source name
          versionName = `${inputSource.sourceName}_${operationSourceName}`;
        } else {
          // Input is a regular source
          versionName = `${inputSource.sourceName}_${operationSourceName}`;
        }

        // Get headers from input source
        const combinedHeaders = inputSource.headers || [];

        // Create the versioned source
        const versionedSource: VersionedSource = {
          id: `versioned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isVersioned: true,
          versionNumber: versionedSources.length + newVersions.length + 1,
          versionLabel: versionName,
          sourceName: versionName,
          sourceModule,
          baseInputSources: [inputSourceId],
          operationSources: [operationSourceId],
          operationFields,
          combinedHeaders,
          sourceType: 'Self',
          subSourceType: 'Versioned',
          headers: combinedHeaders,
        };

        newVersions.push(versionedSource);
      });
    });

    // Add all new versions to the list
    setVersionedSources(prev => [...prev, ...newVersions]);

    // Show success message
    const versionNames = newVersions.map(v => v.versionLabel).join(', ');
    const summary = `${newVersions.length} versioned source(s) created:\n\n${versionNames}\n\nThey are now available in all subsequent module dropdowns.`;
    alert(summary);
  };

  // Combine regular input sources with versioned sources for child modules
  const allAvailableInputSources: InputSource[] = [...inputSources, ...versionedSources];

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded((prevExpanded) => {
      if (isExpanded) {
        // Add panel to expanded array if not already present
        return prevExpanded.includes(panel) ? prevExpanded : [...prevExpanded, panel];
      } else {
        // Remove panel from expanded array
        return prevExpanded.filter((p) => p !== panel);
      }
    });
  };

  const handleNext = () => {
    // Validation for Step 1 (Input Module)
    if (activeStep === 0) {
      if (!requestName.trim()) {
        alert('Please enter a Request Name before continuing');
        return;
      }
      if (inputSources.length === 0) {
        alert('Please add at least one Input Source before continuing');
        return;
      }
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepClick = (step: number) => {
    setActiveStep(step);
  };

  const handleCancel = () => {
    navigate('/report');
  };

  const handleSave = () => {
    console.log('Save request');
  };

  const handleAddInputSource = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    // Trigger the add source dialog from InputModule
    const addButton = document.querySelector('[data-add-input-source]') as HTMLButtonElement;
    if (addButton) {
      addButton.click();
    }
  };

  // Add Stats Configuration handler
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
    setSelectedInputSources([]);
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
        setSelectedInputSources([]);
        setSelectedCountsOn([]);
        setIsDistinct(false);
        setSelectedBreakdownBy([]);
      }
    }
  };

  // Define modules in initial order
  const initialModules = [
    {
      id: 'panel1',
      title: 'Input Module',
      icon: InputIcon,
      color: '#296695',
      description: 'Configure source file and data import settings',
      isDraggable: false,
    },
    {
      id: 'panel2',
      title: 'Append Module',
      icon: AddCircleOutline,
      color: '#10B981',
      description: 'Set up data append rules and additional sources',
      isDraggable: true,
    },
    {
      id: 'panel3',
      title: 'Suppression Module',
      icon: RemoveCircleOutline,
      color: '#F87171',
      description: 'Define suppression lists and exclusion rules',
      isDraggable: true,
    },
    {
      id: 'panel4',
      title: 'Match Module',
      icon: CompareArrows,
      color: '#F59E0B',
      description: 'Configure matching algorithms and criteria',
      isDraggable: true,
    },
    {
      id: 'panel5',
      title: 'Stats Module',
      icon: BarChart,
      color: '#8B5CF6',
      description: 'Statistics and metrics configuration',
      isDraggable: false,
    },
    {
      id: 'panel6',
      title: 'Output Module',
      icon: OutputIcon,
      color: '#3B82F6',
      description: 'Specify output format and destination settings',
      isDraggable: false,
    },
    {
      id: 'panel7',
      title: 'Schedule Module',
      icon: ScheduleIcon,
      color: '#06B6D4',
      description: 'Configure scheduling and notification settings',
      isDraggable: false,
    },
  ];

  const [modules, setModules] = useState(initialModules);

  // Handle drag end for draggable modules (panels 2, 3, 4)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setModules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Only allow dragging within the draggable range (indices 1, 2, 3)
        if (oldIndex >= 1 && oldIndex <= 3 && newIndex >= 1 && newIndex <= 3) {
          return arrayMove(items, oldIndex, newIndex);
        }
        return items;
      });
    }
  };

  // Get draggable module IDs (only Append, Suppression, Match)
  const draggableIds = modules.slice(1, 4).map((m) => m.id);

  // Render module content based on module ID (not index)
  const renderModuleContent = (moduleId: string) => {
    if (moduleId === 'panel1') {
      return <InputModule hideButton={true} onSourcesChange={setInputSources} initialSources={inputSources} />;
    } else if (moduleId === 'panel2') {
      return <AppendModule availableInputSources={allAvailableInputSources} onCreateVersionedSource={handleCreateVersionedSource} initialConfigs={initialAppendConfigs} />;
    } else if (moduleId === 'panel3') {
      return <SuppressModule availableInputSources={allAvailableInputSources} onCreateVersionedSource={handleCreateVersionedSource} initialConfigs={initialSuppressConfigs} />;
    } else if (moduleId === 'panel4') {
      return <MatchModule availableInputSources={allAvailableInputSources} onCreateVersionedSource={handleCreateVersionedSource} initialConfigs={initialMatchConfigs} />;
    } else if (moduleId === 'panel5') {
      // Stats Module Content - Redesigned to match other modules

      // Check if input sources are available
      if (allAvailableInputSources.length === 0) {
        return (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: '#F8FAFB',
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Stats Module is not available yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please configure at least one Input Source first in the Input Module
            </Typography>
          </Box>
        );
      }

      // Filtered lists for Stats Module
      const filteredStatsInputSources = allAvailableInputSources.filter(source =>
        source.sourceName.toLowerCase().includes(statsInputSourcesSearch.toLowerCase())
      );

      const filteredStatsCountsOn = STATS_FIELDS.filter(field =>
        field.toLowerCase().includes(statsCountsOnSearch.toLowerCase())
      );

      const filteredStatsBreakdownBy = STATS_FIELDS.filter(field =>
        field.toLowerCase().includes(statsBreakdownBySearch.toLowerCase())
      );

      return (
        <Box>
          {/* Header Section */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                {editingStatsId ? 'Edit Stats Configuration' : 'Create Stats Configuration'}
              </Typography>
              {editingStatsId && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Editing existing configuration - make changes and click Update
                </Typography>
              )}
            </Box>
          </Box>

          {/* Configuration Form - Horizontal Layout */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'stretch',
              mb: 2.5,
            }}
          >
            {/* Step 1: Input Sources */}
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
                  Input Sources
                </Typography>
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5, fontSize: '0.9rem' }}>
                  *
                </Typography>
              </Box>
              <FormControl size="small" fullWidth>
                <Select
                  multiple
                  value={selectedInputSources}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    // Check if "select-all" was clicked
                    if (value.includes('select-all')) {
                      // Toggle select all
                      if (selectedInputSources.length === filteredStatsInputSources.length) {
                        setSelectedInputSources([]);
                      } else {
                        setSelectedInputSources(filteredStatsInputSources.map(s => s.sourceName));
                      }
                    } else {
                      setSelectedInputSources(value);
                    }
                  }}
                  onClose={() => setStatsInputSourcesSearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                      ))}
                    </Box>
                  )}
                  displayEmpty
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem disabled value="">
                    <em>Select sources...</em>
                  </MenuItem>
                  {/* Search TextField */}
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
                      value={statsInputSourcesSearch}
                      onChange={(e) => setStatsInputSourcesSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    />
                  </MenuItem>
                  {/* Select All Option */}
                  <MenuItem value="select-all" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                    <Checkbox
                      checked={filteredStatsInputSources.length > 0 && selectedInputSources.length === filteredStatsInputSources.length}
                      indeterminate={selectedInputSources.length > 0 && selectedInputSources.length < filteredStatsInputSources.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsInputSources.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsInputSources.map((source) => (
                    <MenuItem key={source.id} value={source.sourceName}>
                      <Checkbox checked={selectedInputSources.indexOf(source.sourceName) > -1} size="small" />
                      <ListItemText primary={source.sourceName} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Step 2: Generate Counts On */}
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={'2'}
                  size="small"
                  sx={{
                    backgroundColor: '#8B5CF6',
                    color: '#fff',
                    fontWeight: 700,
                    width: 24,
                    height: 24,
                  }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#2D3748' }}>
                  Generate Counts On
                </Typography>
                <Typography component="span" sx={{ color: 'error.main', fontSize: '0.9rem' }}>
                  *
                </Typography>

                {/* Separator */}
                <Box sx={{ width: '1px', height: '20px', backgroundColor: 'divider', mx: 0.5 }} />

                {/* Distinct Checkbox inline with label */}
                <FormControlLabel
                  control={<Checkbox checked={isDistinct} onChange={(e) => setIsDistinct(e.target.checked)} size="small" sx={{ padding: '2px', '& .MuiSvgIcon-root': { fontSize: 18 } }} />}
                  label={<Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#2D3748' }}>Distinct</Typography>}
                  sx={{ m: 0, whiteSpace: 'nowrap' }}
                />
              </Box>
              <FormControl size="small" fullWidth>
                <Select
                  multiple
                  value={selectedCountsOn}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    // Check if "select-all" was clicked
                    if (value.includes('select-all-counts')) {
                      // Toggle select all
                      if (selectedCountsOn.length === filteredStatsCountsOn.length) {
                        setSelectedCountsOn([]);
                      } else {
                        setSelectedCountsOn(filteredStatsCountsOn);
                      }
                    } else {
                      setSelectedCountsOn(value);
                    }
                  }}
                  onClose={() => setStatsCountsOnSearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                      ))}
                    </Box>
                  )}
                  displayEmpty
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem disabled value="">
                    <em>Select fields...</em>
                  </MenuItem>
                  {/* Search TextField */}
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
                      value={statsCountsOnSearch}
                      onChange={(e) => setStatsCountsOnSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    />
                  </MenuItem>
                  {/* Select All Option */}
                  <MenuItem value="select-all-counts" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                    <Checkbox
                      checked={filteredStatsCountsOn.length > 0 && selectedCountsOn.length === filteredStatsCountsOn.length}
                      indeterminate={selectedCountsOn.length > 0 && selectedCountsOn.length < filteredStatsCountsOn.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsCountsOn.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsCountsOn.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={selectedCountsOn.indexOf(field) > -1} size="small" />
                      <ListItemText primary={field} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Step 3: Breakdown By */}
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
                  label={'3'}
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
                  value={selectedBreakdownBy}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    // Check if "select-all" was clicked
                    if (value.includes('select-all-breakdown')) {
                      // Toggle select all
                      if (selectedBreakdownBy.length === filteredStatsBreakdownBy.length) {
                        setSelectedBreakdownBy([]);
                      } else {
                        setSelectedBreakdownBy(filteredStatsBreakdownBy);
                      }
                    } else {
                      setSelectedBreakdownBy(value);
                    }
                  }}
                  onClose={() => setStatsBreakdownBySearch('')}
                  input={<OutlinedInput />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem', backgroundColor: '#8B5CF620', color: '#8B5CF6', fontWeight: 600 }} />
                      ))}
                    </Box>
                  )}
                  displayEmpty
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
                  sx={{ backgroundColor: 'white' }}
                >
                  <MenuItem disabled value="">
                    <em>Select fields...</em>
                  </MenuItem>
                  {/* Search TextField */}
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
                      value={statsBreakdownBySearch}
                      onChange={(e) => setStatsBreakdownBySearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f5f5f5',
                        },
                      }}
                    />
                  </MenuItem>
                  {/* Select All Option */}
                  <MenuItem value="select-all-breakdown" sx={{ backgroundColor: '#f0f0f0', fontWeight: 600, borderBottom: '1px solid #ddd' }}>
                    <Checkbox
                      checked={filteredStatsBreakdownBy.length > 0 && selectedBreakdownBy.length === filteredStatsBreakdownBy.length}
                      indeterminate={selectedBreakdownBy.length > 0 && selectedBreakdownBy.length < filteredStatsBreakdownBy.length}
                      size="small"
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  {filteredStatsBreakdownBy.length === 0 && (
                    <MenuItem disabled>
                      <em>No items match your search</em>
                    </MenuItem>
                  )}
                  {filteredStatsBreakdownBy.map((field) => (
                    <MenuItem key={field} value={field}>
                      <Checkbox checked={selectedBreakdownBy.indexOf(field) > -1} size="small" />
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
                onClick={handleAddStatsConfiguration}
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

          {/* Cancel Edit Button (shown when editing) */}
          {editingStatsId && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setEditingStatsId(null);
                  setSelectedInputSources([]);
                  setSelectedCountsOn([]);
                  setIsDistinct(false);
                  setSelectedBreakdownBy([]);
                }}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  px: 2.5,
                  py: 0.75,
                }}
              >
                Cancel Edit
              </Button>
            </Box>
          )}

          {/* Configurations Table */}
          {statsConfigurations.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748' }}>
                  Stats Configurations
                </Typography>
                <Chip
                  label={`${statsConfigurations.length} configuration${statsConfigurations.length !== 1 ? 's' : ''}`}
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
                          '&:hover': {
                            backgroundColor: editingStatsId === config.id ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)',
                          },
                        }}
                      >
                        {/* Input Sources Column */}
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          {config.inputSources.length > 0 ? (
                            <Tooltip
                              title={
                                <Box sx={{ maxWidth: 400 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Input Sources ({config.inputSources.length}):
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {config.inputSources.join(', ')}
                                  </Typography>
                                </Box>
                              }
                              arrow
                              placement="top"
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={`${config.inputSources.length} source${config.inputSources.length !== 1 ? 's' : ''}`}
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
                                  {config.inputSources.slice(0, 2).join(', ')}
                                  {config.inputSources.length > 2 ? '...' : ''}
                                </Typography>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              --
                            </Typography>
                          )}
                        </TableCell>

                        {/* Counts On Column */}
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          {config.countsOn.length > 0 ? (
                            <Tooltip
                              title={
                                <Box sx={{ maxWidth: 400 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Counts On ({config.countsOn.length}):
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {config.countsOn.join(', ')}
                                  </Typography>
                                </Box>
                              }
                              arrow
                              placement="top"
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={`${config.countsOn.length} field${config.countsOn.length !== 1 ? 's' : ''}`}
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
                                  {config.countsOn.slice(0, 2).join(', ')}
                                  {config.countsOn.length > 2 ? '...' : ''}
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
                            label={config.isDistinct ? 'Yes' : 'No'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              backgroundColor: config.isDistinct ? '#10B98120' : '#6B728020',
                              color: config.isDistinct ? '#10B981' : '#6B7280',
                              border: config.isDistinct ? '1px solid #10B98140' : '1px solid #6B728040',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>

                        {/* Breakdown By Column */}
                        <TableCell sx={{ py: 0.75, px: 1.5 }}>
                          {config.breakdownBy.length > 0 ? (
                            <Tooltip
                              title={
                                <Box sx={{ maxWidth: 400 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                    Breakdown By ({config.breakdownBy.length}):
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {config.breakdownBy.join(', ')}
                                  </Typography>
                                </Box>
                              }
                              arrow
                              placement="top"
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={`${config.breakdownBy.length} field${config.breakdownBy.length !== 1 ? 's' : ''}`}
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
                                  {config.breakdownBy.slice(0, 2).join(', ')}
                                  {config.breakdownBy.length > 2 ? '...' : ''}
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
                              onClick={() => handleEditStatsConfiguration(config)}
                              sx={{
                                color: 'info.main',
                                '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
                              }}
                              title="Edit"
                            >
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteStatsConfiguration(config.id)}
                              sx={{
                                color: 'error.main',
                                '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
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
      );
    } else if (moduleId === 'panel6') {
      return (
        <OutputModule
          availableInputSources={allAvailableInputSources}
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
          initialConfigs={initialOutputConfigs}
        />
      );
    } else if (moduleId === 'panel7') {
      return (
        <ScheduleModule
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
      );
    }
    return null;
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
              Create New Request
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Configure all modules for your processing request
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* View Mode Toggle - Simplified */}
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
            placeholder="e.g., Sprint Q1 2024"
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

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
              {modules.map((module, index) => {
                // For first module (Input), render with Add button
                if (index === 0) {
                  return (
                    <Accordion
                      key={module.id}
                      expanded={expanded.includes(module.id)}
                      onChange={handleChange(module.id)}
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
                            backgroundColor: `${module.color}15`,
                            flexShrink: 0,
                          }}
                        >
                          <module.icon sx={{ fontSize: 16, color: module.color }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, fontSize: '0.95rem' }}>
                            {module.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {module.description}
                          </Typography>
                        </Box>
                        <Box
                          component="span"
                          onClick={handleAddInputSource}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 2,
                            py: 0.5,
                            mr: 1,
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderRadius: 1,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(41, 102, 149, 0.3)',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'primary.dark',
                              boxShadow: '0 4px 12px rgba(41, 102, 149, 0.4)',
                            },
                          }}
                        >
                          <Add fontSize="small" />
                          Add Input Source
                        </Box>
                        <Chip
                          label={`Step ${index + 1}`}
                          size="small"
                          sx={{
                            backgroundColor: `${module.color}20`,
                            color: module.color,
                            fontWeight: 600,
                            border: 'none',
                          }}
                        />
                      </AccordionSummary>
                      <AccordionDetails>{renderModuleContent(module.id)}</AccordionDetails>
                    </Accordion>
                  );
                }

                // For draggable modules (Append, Suppression, Match)
                if (module.isDraggable) {
                  return (
                    <SortableAccordionItem
                      key={module.id}
                      module={module}
                      index={index}
                      expanded={expanded}
                      onChange={handleChange}
                      renderContent={renderModuleContent}
                      isDraggable={true}
                    />
                  );
                }

                // For non-draggable modules (Stats, Output, Schedule)
                return (
                  <Accordion
                    key={module.id}
                    expanded={expanded.includes(module.id)}
                    onChange={handleChange(module.id)}
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
                          backgroundColor: `${module.color}15`,
                          flexShrink: 0,
                        }}
                      >
                        <module.icon sx={{ fontSize: 16, color: module.color }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, fontSize: '0.95rem' }}>
                          {module.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {module.description}
                        </Typography>
                      </Box>
                      <Chip
                        label={`Step ${index + 1}`}
                        size="small"
                        sx={{
                          backgroundColor: `${module.color}20`,
                          color: module.color,
                          fontWeight: 600,
                          border: 'none',
                        }}
                      />
                    </AccordionSummary>
                    <AccordionDetails>{renderModuleContent(module.id)}</AccordionDetails>
                  </Accordion>
                );
              })}
            </SortableContext>
          </DndContext>
        </Box>
      ) : (
        /* Step View */
        <Box>
          {/* Horizontal Stepper */}
          <Box sx={{ mb: 3 }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
                <Stepper
                  activeStep={activeStep}
                  sx={{
                    '& .MuiStepConnector-line': {
                      borderColor: 'divider',
                    },
                  }}
                >
                  {modules.map((module, index) => {
                    // For draggable steps (indices 1, 2, 3)
                    if (module.isDraggable) {
                      return (
                        <SortableStep
                          key={module.id}
                          module={module}
                          index={index}
                          activeStep={activeStep}
                          onClick={() => handleStepClick(index)}
                        />
                      );
                    }

                    // For non-draggable steps
                    return (
                      <Step key={module.id} onClick={() => handleStepClick(index)} sx={{ cursor: 'pointer' }}>
                        <StepLabel
                          StepIconProps={{
                            sx: {
                              color: index <= activeStep ? module.color : 'text.disabled',
                              '&.Mui-active': {
                                color: module.color,
                              },
                              '&.Mui-completed': {
                                color: module.color,
                              },
                            },
                          }}
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
                              fontWeight: index === activeStep ? 600 : 400,
                              color: index === activeStep ? '#2D3748' : 'text.secondary',
                              textAlign: 'center',
                            },
                          }}
                        >
                          {module.title}
                        </StepLabel>
                      </Step>
                    );
                  })}
                </Stepper>
              </SortableContext>
            </DndContext>
          </Box>

          {/* Step Content */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: '#FAFBFC',
              minHeight: 400,
            }}
          >
            {/* Step 1: Request Name First, then Input Module Header and Content */}
            {activeStep === 0 ? (
              <>
                {/* Request Name */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.9rem' }}>
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
                    placeholder="e.g., Sprint Q1 2024"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                    sx={{
                      width: '40%',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                      },
                    }}
                  />
                </Box>

                {/* Input Module Header with Icon */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${modules[activeStep].color}15`,
                      flexShrink: 0,
                    }}
                  >
                    {(() => {
                      const IconComponent = modules[activeStep].icon;
                      return <IconComponent sx={{ fontSize: 24, color: modules[activeStep].color }} />;
                    })()}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D3748', mb: 0.5 }}>
                      {modules[activeStep].title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      {modules[activeStep].description}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    onClick={handleAddInputSource}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 2,
                      py: 0.75,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      borderRadius: 1.5,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(41, 102, 149, 0.3)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                        boxShadow: '0 4px 12px rgba(41, 102, 149, 0.4)',
                      },
                    }}
                  >
                    <Add fontSize="small" />
                    Add Input Source
                  </Box>
                </Box>

                {/* Input Module Content */}
                {renderModuleContent(modules[activeStep].id)}
              </>
            ) : (
              <>
                {/* Step Header with Icon for Other Steps */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${modules[activeStep].color}15`,
                      flexShrink: 0,
                    }}
                  >
                    {(() => {
                      const IconComponent = modules[activeStep].icon;
                      return <IconComponent sx={{ fontSize: 24, color: modules[activeStep].color }} />;
                    })()}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D3748', mb: 0.5 }}>
                      {modules[activeStep].title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      {modules[activeStep].description}
                    </Typography>
                  </Box>
                </Box>

                {/* Other Module Content */}
                {renderModuleContent(modules[activeStep].id)}
              </>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                size="small"
                variant="outlined"
                sx={{ px: 3, py: 0.75 }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                size="small"
                sx={{
                  px: 3,
                  py: 0.75,
                  backgroundColor: modules[activeStep].color,
                  '&:hover': {
                    backgroundColor: modules[activeStep].color,
                    filter: 'brightness(0.9)',
                  },
                  boxShadow: `0 4px 16px ${modules[activeStep].color}40`,
                }}
              >
                {activeStep === modules.length - 1 ? 'Finish' : 'Continue'}
              </Button>
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

export default RequestCreationPage;
