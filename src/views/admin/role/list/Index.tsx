import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { Add, MoreVert, Edit, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Role {
  id: string;
  roleName: string;
  description: string;
  roleType: string;
  usersCount: number;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdDate: string;
}

const RoleManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Mock data
  const [roles] = useState<Role[]>([
    {
      id: '1',
      roleName: 'Super Admin',
      description: 'Full system access with all privileges',
      roleType: 'Admin',
      usersCount: 3,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '2',
      roleName: 'Business Unit Admin',
      description: 'Can manage users within their Business Unit',
      roleType: 'Admin',
      usersCount: 8,
      status: 'Active',
      createdBy: 'Admin',
      createdDate: '2024-01-15',
    },
    {
      id: '3',
      roleName: 'Division Admin',
      description: 'Can manage users within their Division',
      roleType: 'Admin',
      usersCount: 12,
      status: 'Active',
      createdBy: 'Admin',
      createdDate: '2024-02-01',
    },
    {
      id: '4',
      roleName: 'Data Query Creator',
      description: 'Can create and execute data queries',
      roleType: 'Standard',
      usersCount: 45,
      status: 'Active',
      createdBy: 'Super Admin',
      createdDate: '2024-02-10',
    },
    {
      id: '5',
      roleName: 'Report Viewer',
      description: 'Can view and export reports',
      roleType: 'Standard',
      usersCount: 67,
      status: 'Active',
      createdBy: 'Super Admin',
      createdDate: '2024-02-15',
    },
    {
      id: '6',
      roleName: 'Analytics User',
      description: 'Can access analytics dashboards',
      roleType: 'Standard',
      usersCount: 34,
      status: 'Active',
      createdBy: 'Admin',
      createdDate: '2024-03-01',
    },
    {
      id: '7',
      roleName: 'Read Only',
      description: 'View-only access to datasets',
      roleType: 'Read-Only',
      usersCount: 89,
      status: 'Inactive',
      createdBy: 'Admin',
      createdDate: '2024-03-10',
    },
  ]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, roleId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRole(roleId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRole(null);
  };

  const handleEdit = () => {
    console.log('Edit role:', selectedRole);
    handleMenuClose();
  };

  const handleDelete = () => {
    console.log('Delete role:', selectedRole);
    handleMenuClose();
  };

  const handleCreateRole = () => {
    navigate('/roles/new');
  };

  const getStatusStyle = (status: string) => {
    if (status === 'Active') {
      return {
        backgroundColor: '#10B981',
        color: '#fff',
      };
    } else {
      return {
        backgroundColor: '#F87171',
        color: '#fff',
      };
    }
  };

  const getRoleTypeStyle = (roleType: string) => {
    switch (roleType) {
      case 'Admin':
        return {
          backgroundColor: '#F87171',
          color: '#fff',
        };
      case 'Standard':
        return {
          backgroundColor: '#296695',
          color: '#fff',
        };
      case 'Read-Only':
        return {
          backgroundColor: '#FBBF24',
          color: '#fff',
        };
      default:
        return {
          backgroundColor: '#E5E7EB',
          color: '#6B7280',
        };
    }
  };

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#2D3748',
              mb: 0.5,
            }}
          >
            Role Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            Manage roles and permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={handleCreateRole}
          sx={{
            px: 3,
            py: 0.75,
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Create New Role
        </Button>
      </Box>

      {/* Roles Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Role Name</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Role Type</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Users</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Created By</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Created Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow
                key={role.id}
                hover
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(41, 102, 149, 0.04)',
                  },
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {role.roleName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {role.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={role.roleType}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      ...getRoleTypeStyle(role.roleType),
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={role.usersCount}
                    size="small"
                    sx={{
                      backgroundColor: '#E8F4F8',
                      color: '#296695',
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={role.status}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      ...getStatusStyle(role.status)
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {role.createdBy}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {role.createdDate}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, role.id)}
                    sx={{
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.12)',
                      },
                    }}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
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
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default RoleManagementPage;
