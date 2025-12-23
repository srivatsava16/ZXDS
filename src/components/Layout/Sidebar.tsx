import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Collapse,
} from '@mui/material';
import {
  Dashboard,
  Assessment,
  Business,
  People,
  Settings,
  Storage,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminNavigation, publicNavigation } from '../../configs/navigation.config/simple';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavigationItem {
  title: string;
  path?: string;
  icon: React.ComponentType;
  children?: NavigationItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const handleItemClick = (path?: string, title?: string) => {
    if (path) {
      navigate(path);
    } else if (title) {
      // Toggle expansion for items with children
      setExpandedItems(prev => 
        prev.includes(title) 
          ? prev.filter(item => item !== title)
          : [...prev, title]
      );
    }
  };

  const isItemExpanded = (title: string) => expandedItems.includes(title);
  const isItemActive = (path?: string) => path ? location.pathname === path : false;

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const IconComponent = item.icon;
    const hasChildren = (item.children?.length ?? 0) > 0;
    const isExpanded = isItemExpanded(item.title);
    const isActive = isItemActive(item.path);

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding sx={{ pl: level * 2 }}>
          <ListItemButton
            onClick={() => handleItemClick(item.path, hasChildren ? item.title : undefined)}
            sx={{
              backgroundColor: isActive ? 'action.selected' : 'transparent',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon>
              <IconComponent />
            </ListItemIcon>
            <ListItemText primary={item.title} />
            {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        {/* Public Navigation */}
        <Box sx={{ p: 2 }}>
          <Typography variant="overline" color="textSecondary" sx={{ fontWeight: 600 }}>
            Data Operations
          </Typography>
        </Box>
        <List>
          {publicNavigation.map(item => renderNavigationItem(item))}
        </List>

        <Divider />

        {/* Admin Navigation */}
        <Box sx={{ p: 2 }}>
          <Typography variant="overline" color="textSecondary" sx={{ fontWeight: 600 }}>
            Administration
          </Typography>
        </Box>
        <List>
          {adminNavigation.map(item => renderNavigationItem(item))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;