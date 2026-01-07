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
} from '@mui/icons-material';

export const publicNavigation: NavigationItem[] = [
  {
    title: 'Universe Reports',
    path: '/universal-pull',
    icon: Assessment,
  },
  {
    title: 'Data Pull Reports',
    path: '/reports',
    icon: Dashboard,
  },
  {
    title: 'ZIP Radius Search',
    path: '/zip-radius',
    icon: Search,
  },
  {
    title: 'Data Streams',
    path: '/data-streams',
    icon: Storage,
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