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

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdDate: string;
}

const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Mock data
  const [users] = useState<User[]>([
    {
      id: '1',
      username: 'rranga@zetaglobal.com',
      email: 'rranga@zetaglobal.com',
      role: 'Admin',
      status: 'Active',
      createdBy: 'Ranjith Ranga',
      createdDate: '2024-01-15',
    },
    {
      id: '2',
      username: 'rrang1@zetaglobal.com',
      email: 'rrang1@zetaglobal.com',
      role: 'Report Viewer',
      status: 'Active',
      createdBy: 'Ranjith Ranga',
      createdDate: '2024-02-20',
    },
    {
      id: '3',
      username: 'rrang2@zetaglobal.com',
      email: 'rrang2@zetaglobal.com',
      role: 'Read Only',
      status: 'Inactive',
      createdBy: 'Ranjith Ranga',
      createdDate: '2024-03-10',
    },
  ]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, userId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleEdit = () => {
    handleMenuClose();
  };

  const handleDelete = () => {
    handleMenuClose();
  };

  const handleCreateUser = () => {
    navigate('/createUser/new');
  };

  const getStatusStyle = (status: string) => {
    if (status === 'Active') {
      return {
        backgroundColor: '#10B981', // Light green
        color: '#fff',
      };
    } else {
      return {
        backgroundColor: '#F87171', // Light red
        color: '#fff',
      };
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'Admin':
      case 'Super Admin':
        return {
          backgroundColor: '#F87171', // Light red
          color: '#fff',
        };
      case 'Report Viewer':
        return {
          backgroundColor: '#296695', // Primary blue
          color: '#fff',
        };
      case 'Read Only':
        return {
          backgroundColor: '#FBBF24', // Light yellow
          color: '#fff',
        };
      default:
        return {
          backgroundColor: '#E5E7EB', // Gray
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
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            Manage user accounts and permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={handleCreateUser}
          sx={{
            px: 3,
            py: 0.75,
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Create New User
        </Button>
      </Box>

      {/* Users Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Username</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Created By</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Created Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                hover
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(41, 102, 149, 0.04)',
                  },
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user.username}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      ...getRoleStyle(user.role),
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      ...getStatusStyle(user.status)
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.createdBy}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.createdDate}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, user.id)}
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

export default UserManagementPage;
