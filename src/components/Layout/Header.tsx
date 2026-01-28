import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Refresh,
  Notifications,
  Person,
  Logout,
  Settings,
} from '@mui/icons-material';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event?.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLogout = () => {
  };

  const handleChangePassword = () => {
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, py: 1.5 }}>
        {/* Left Section - Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src="https://ss.postserveraccess.com/zetaLogosApp/zeta_logoPrimary.svg"
            alt="Zeta Logo"
            sx={{
              height: 40,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>

        {/* Left Section - Title */}
        <Box
          sx={{
            position: 'absolute',
            left: 280,
            ml: 3,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #296695 0%, #5B9BD5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '2.25rem',
              letterSpacing: '0.5px',
            }}
          >
            ZX Platform
          </Typography>
        </Box>

        {/* Right Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Notifications */}
          <Tooltip title="Notifications" arrow>
            <IconButton
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                },
              }}
            >
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Settings - Change Password */}
          <Tooltip title="Change Password" arrow>
            <IconButton
              onClick={handleChangePassword}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                },
              }}
            >
              <Settings />
            </IconButton>
          </Tooltip>

          {/* Reload */}
          <Tooltip title="Reload" arrow>
            <IconButton
              onClick={handleRefresh}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(41, 102, 149, 0.08)',
                },
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>

          {/* Logout */}
          <Tooltip title="Logout" arrow>
            <IconButton
              onClick={handleLogout}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'error.main',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                },
              }}
            >
              <Logout />
            </IconButton>
          </Tooltip>

          {/* User Profile */}
          <Box
            onClick={handleProfileMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 3,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(41, 102, 149, 0.08)',
              },
              ml: 1,
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: 'text.primary',
                }}
              >
                Ranjith Kumar
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                  color: 'text.secondary',
                }}
              >
                Tech Admin
              </Typography>
            </Box>

            <Avatar
              sx={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #296695 0%, #5B9BD5 100%)',
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: '0 4px 12px rgba(41, 102, 149, 0.3)',
              }}
            >
              RK
            </Avatar>
          </Box>
        </Box>
      </Toolbar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1.5,
            borderRadius: 3,
            minWidth: 200,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <MenuItem
          onClick={handleMenuClose}
          sx={{
            py: 1.5,
            '&:hover': { backgroundColor: 'rgba(41, 102, 149, 0.08)' },
          }}
        >
          <Person sx={{ mr: 1.5, color: 'text.secondary' }} />
          Profile
        </MenuItem>
        <MenuItem
          onClick={handleLogout}
          sx={{
            py: 1.5,
            color: 'error.main',
            '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
          }}
        >
          <Logout sx={{ mr: 1.5 }} />
          Logout
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;