import type { NavigationItem } from '../../@types/navigation';
import {
  People,
  Security,
  Business,
  AccountTree,
  Settings,
  Assessment,
  Storage,
  Dashboard,
  Search,
  Add,
} from '@mui/icons-material';

export const publicNavigation: NavigationItem[] = [
  {
    title: 'Universe Reports',
    path: '/universeReports',
    icon: Assessment,
  },
  {
    title: 'Data Pull Reports',
    path: '/dataPullReports',
    icon: Dashboard,
  },
  {
    title: 'ZIP Radius Search',
    path: '/zipRadiusSearch',
    icon: Search,
  },
  {
    title: 'Data Streams',
    path: '/dataStreams',
    icon: Storage,
  },
  {
    title: 'Create Request',
    path: '/dataPullRequests/new',
    icon: Add,
  },
];

export const adminNavigation: NavigationItem[] = [
  {
    title: 'User Management',
    path: '/userManagement',
    icon: People,
  },
  {
    title: 'Role Management',
    path: '/roles',
    icon: Security,
  },
  {
    title: 'Business Units',
    path: '/businessUnits',
    icon: Business,
  },
  {
    title: 'Divisions',
    path: '/divisions',
    icon: AccountTree,
  },
  {
    title: 'System Settings',
    path: '/systemSettings',
    icon: Settings,
  },
];