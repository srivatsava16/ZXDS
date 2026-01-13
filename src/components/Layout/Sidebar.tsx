
import { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
  Typography,
  Collapse,
} from '@mui/material';
import {
  Language,
  Assessment,
  ManageAccounts,
  MyLocation,
  ExpandLess,
  ExpandMore,
  Group,
  Badge,
  Business,
  Category,
  Storage,
  Settings,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 280;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleUserMgmtToggle = () => {
    setUserMgmtOpen(!userMgmtOpen);
  };

  const isActive = (path: string) => {
    // Exact match
    if (location.pathname === path) return true;

    // Data Requests: highlight for /dataPullRequests/new and /request/:clientType
    if (path === '/dataPullReports') {
      return location.pathname === '/dataPullRequests/new' ||
             location.pathname.startsWith('/request/');
    }

    // Universe Reports: highlight for /universeRequests/new and /universeRequests/view/:id
    if (path === '/universeReports') {
      return location.pathname === '/universeRequests/new' ||
             location.pathname.startsWith('/universeRequests/view/');
    }

    // User Management: highlight for all user management routes
    if (path === '/userManagement') {
      return location.pathname === '/createUser/new' ||
             location.pathname === '/userManagement' ||
             location.pathname === '/roles' ||
             location.pathname.startsWith('/roles/') ||
             location.pathname === '/businessUnits' ||
             location.pathname.startsWith('/businessUnits/') ||
             location.pathname === '/divisions' ||
             location.pathname.startsWith('/divisions/');
    }

    return false;
  };

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid',
          borderColor: 'divider',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.03)',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', py: 2 }}>
        {/* Navigation Section */}
        <Typography
          variant="overline"
          sx={{
            px: 3,
            py: 1,
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
          }}
        >
          Navigation
        </Typography>

        <List sx={{ px: 2 }}>
          {/* Universe Reports */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive('/universeReports')}
              onClick={() => handleNavigation('/universeReports')}
              sx={{
                borderRadius: 3,
                py: 1.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #296695 0%, #5B9BD5 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(41, 102, 149, 0.3)',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1A4A6B 0%, #296695 100%)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Language color={isActive('/universeReports') ? 'inherit' : 'primary'} />
              </ListItemIcon>
              <ListItemText
                primary="Universe Reports"
                primaryTypographyProps={{
                  fontWeight: isActive('/universeReports') ? 600 : 500,
                  fontSize: '0.95rem',
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* DATA PULL */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive('/dataPullReports')}
              onClick={() => handleNavigation('/dataPullReports')}
              sx={{
                borderRadius: 3,
                py: 1.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #296695 0%, #5B9BD5 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(41, 102, 149, 0.3)',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1A4A6B 0%, #296695 100%)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Assessment color={isActive('/dataPullReports') ? 'inherit' : 'primary'} />
              </ListItemIcon>
              <ListItemText
                primary="Data Requests"
                primaryTypographyProps={{
                  fontWeight: isActive('/dataPullReports') ? 600 : 500,
                  fontSize: '0.95rem',
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* Zip Radius Search */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive('/zipRadiusSearch')}
              onClick={() => handleNavigation('/zipRadiusSearch')}
              sx={{
                borderRadius: 3,
                py: 1.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #296695 0%, #5B9BD5 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(41, 102, 149, 0.3)',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1A4A6B 0%, #296695 100%)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <MyLocation color={isActive('/zipRadiusSearch') ? 'inherit' : 'primary'} />
              </ListItemIcon>
              <ListItemText
                primary="Zip Radius Search"
                primaryTypographyProps={{
                  fontWeight: isActive('/zipRadiusSearch') ? 600 : 500,
                  fontSize: '0.95rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Divider sx={{ my: 2, mx: 2 }} />

        {/* Administration Section */}
        <Typography
          variant="overline"
          sx={{
            px: 3,
            py: 1,
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
          }}
        >
          Administration
        </Typography>

        <List sx={{ px: 2 }}>
          {/* Data Streams */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive('/dataStreams')}
              onClick={() => handleNavigation('/dataStreams')}
              sx={{
                borderRadius: 3,
                py: 1.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #296695 0%, #5B9BD5 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(41, 102, 149, 0.3)',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1A4A6B 0%, #296695 100%)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Storage color={isActive('/dataStreams') ? 'inherit' : 'primary'} />
              </ListItemIcon>
              <ListItemText
                primary="Data Streams"
                primaryTypographyProps={{
                  fontWeight: isActive('/dataStreams') ? 600 : 500,
                  fontSize: '0.95rem',
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* System Settings */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive('/systemSettings')}
              onClick={() => handleNavigation('/systemSettings')}
              sx={{
                borderRadius: 3,
                py: 1.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #296695 0%, #5B9BD5 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(41, 102, 149, 0.3)',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1A4A6B 0%, #296695 100%)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Settings color={isActive('/systemSettings') ? 'inherit' : 'primary'} />
              </ListItemIcon>
              <ListItemText
                primary="System Settings"
                primaryTypographyProps={{
                  fontWeight: isActive('/systemSettings') ? 600 : 500,
                  fontSize: '0.95rem',
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* User Management - Parent */}
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isActive('/userManagement')}
              onClick={handleUserMgmtToggle}
              sx={{
                borderRadius: 3,
                py: 1.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #296695 0%, #5B9BD5 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(41, 102, 149, 0.3)',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1A4A6B 0%, #296695 100%)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <ManageAccounts color={isActive('/userManagement') ? 'inherit' : 'primary'} />
              </ListItemIcon>
              <ListItemText
                primary="User Management"
                primaryTypographyProps={{
                  fontWeight: isActive('/userManagement') ? 600 : 500,
                  fontSize: '0.95rem',
                }}
              />
              {userMgmtOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          {/* User Management - Submenu */}
          <Collapse in={userMgmtOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2 }}>
              {/* Users */}
              <ListItem disablePadding sx={{ mb: 0.3 }}>
                <ListItemButton
                  selected={location.pathname === '/userManagement'}
                  onClick={() => handleNavigation('/userManagement')}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(41, 102, 149, 0.12)',
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.16)',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(41, 102, 149, 0.08)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Group fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Users"
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: location.pathname === '/userManagement' ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>

              {/* Roles */}
              <ListItem disablePadding sx={{ mb: 0.3 }}>
                <ListItemButton
                  selected={location.pathname === '/roles' || location.pathname.startsWith('/roles/')}
                  onClick={() => handleNavigation('/roles')}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(41, 102, 149, 0.12)',
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.16)',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(41, 102, 149, 0.08)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Badge fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Roles"
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: location.pathname === '/roles' || location.pathname.startsWith('/roles/') ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>

              {/* Business Units */}
              <ListItem disablePadding sx={{ mb: 0.3 }}>
                <ListItemButton
                  selected={location.pathname === '/businessUnits' || location.pathname.startsWith('/businessUnits/')}
                  onClick={() => handleNavigation('/businessUnits')}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(41, 102, 149, 0.12)',
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.16)',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(41, 102, 149, 0.08)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Business fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Business Units"
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: location.pathname === '/businessUnits' || location.pathname.startsWith('/businessUnits/') ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>

              {/* Divisions */}
              <ListItem disablePadding sx={{ mb: 0.3 }}>
                <ListItemButton
                  selected={location.pathname === '/divisions' || location.pathname.startsWith('/divisions/')}
                  onClick={() => handleNavigation('/divisions')}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(41, 102, 149, 0.12)',
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.16)',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(41, 102, 149, 0.08)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Category fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Divisions"
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: location.pathname === '/divisions' || location.pathname.startsWith('/divisions/') ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
