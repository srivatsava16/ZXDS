import {
  Input as InputIcon,
  AddCircleOutline,
  RemoveCircleOutline,
  List,
  BarChart,
  Output as OutputIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import type { ModuleConfig } from '../types';

/**
 * Define all available modules with their configurations
 */
export const createModuleDefinitions = (): ModuleConfig[] => [
  {
    id: 'panel1',
    title: 'Input Module',
    description: 'Configure your data sources',
    icon: InputIcon,
    color: '#2196F3',
    isDraggable: false,
  },
  {
    id: 'panel2',
    title: 'Append Module',
    description: 'Enrich your data with additional fields',
    icon: AddCircleOutline,
    color: '#4CAF50',
    isDraggable: true,
  },
  {
    id: 'panel3',
    title: 'Suppression Module',
    description: 'Remove unwanted records from your data',
    icon: RemoveCircleOutline,
    color: '#FF9800',
    isDraggable: true,
  },
  {
    id: 'panel4',
    title: 'Match Module',
    description: 'Match your data against reference databases',
    icon: List,
    color: '#9C27B0',
    isDraggable: true,
  },
  {
    id: 'panel5',
    title: 'Stats Module',
    description: 'Generate statistical reports and insights',
    icon: BarChart,
    color: '#00BCD4',
    isDraggable: false,
  },
  {
    id: 'panel6',
    title: 'Output Module',
    description: 'Configure output destinations and formats',
    icon: OutputIcon,
    color: '#673AB7',
    isDraggable: false,
  },
  {
    id: 'panel7',
    title: 'Schedule Module',
    description: 'Set up when to run this request',
    icon: ScheduleIcon,
    color: '#F44336',
    isDraggable: false,
  },
];

/**
 * Constants for stats fields
 */
export const STATS_FIELDS = [
  'DEVICE',
  'QUALITY SCORE',
  'FNAME',
  'LNAME',
  'DOB',
  'STATE',
  'ZIP',
];
