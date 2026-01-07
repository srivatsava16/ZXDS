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

interface Division {
  id: string;
  divisionName: string;
  businessUnit: string;
  description: string;
  adminCount: number;
  userCount: number;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdDate: string;
}

const DivisionManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  // Mock data - Predefined Divisions
  const [divisions] = useState<Division[]>([
    {
      id: '1',
      divisionName: 'Master',
      businessUnit: 'ZxDev',
      description: 'Master division for all business units',
      adminCount: 2,
      userCount: 15,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '2',
      divisionName: 'Master',
      businessUnit: 'ZxDs',
      description: 'Master division for Data Science',
      adminCount: 1,
      userCount: 10,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '3',
      divisionName: 'Master',
      businessUnit: 'ZxOps',
      description: 'Master division for Operations',
      adminCount: 2,
      userCount: 20,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '4',
      divisionName: 'Master',
      businessUnit: 'CPM',
      description: 'Master division for Campaign Performance',
      adminCount: 1,
      userCount: 12,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '5',
      divisionName: 'Master',
      businessUnit: 'CPA',
      description: 'Master division for Analytics',
      adminCount: 2,
      userCount: 18,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '6',
      divisionName: 'Master',
      businessUnit: 'DataTeam',
      description: 'Master division for Data Management',
      adminCount: 3,
      userCount: 25,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '7',
      divisionName: 'Master',
      businessUnit: 'Attribution',
      description: 'Master division for Attribution',
      adminCount: 1,
      userCount: 8,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
  ]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, divisionId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedDivision(divisionId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDivision(null);
  };

  const handleEdit = () => {
    handleMenuClose();
  };

  const handleDelete = () => {
    handleMenuClose();
  };

  const handleCreateDivision = () => {
    navigate('/divisions/new');
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

  const getBUStyle = (bu: string) => {
    const colors: Record<string, any> = {
      ZxDev: { backgroundColor: '#3B82F6', color: '#fff' },
      ZxDs: { backgroundColor: '#8B5CF6', color: '#fff' },
      ZxOps: { backgroundColor: '#10B981', color: '#fff' },
      CPM: { backgroundColor: '#F59E0B', color: '#fff' },
      CPA: { backgroundColor: '#EF4444', color: '#fff' },
      DataTeam: { backgroundColor: '#6366F1', color: '#fff' },
      Attribution: { backgroundColor: '#EC4899', color: '#fff' },
    };
    return colors[bu] || { backgroundColor: '#E5E7EB', color: '#6B7280' };
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
            Division Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            Manage divisions within business units
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={handleCreateDivision}
          sx={{
            px: 3,
            py: 0.75,
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Create New Division
        </Button>
      </Box>

      {/* Divisions Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Division Name</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Business Unit</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Admins</TableCell>
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
            {divisions.map((division) => (
              <TableRow
                key={division.id}
                hover
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(41, 102, 149, 0.04)',
                  },
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {division.divisionName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={division.businessUnit}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      ...getBUStyle(division.businessUnit),
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {division.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={division.adminCount}
                    size="small"
                    sx={{
                      backgroundColor: '#F87171',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={division.userCount}
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
                    label={division.status}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      ...getStatusStyle(division.status)
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {division.createdBy}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {division.createdDate}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, division.id)}
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

export default DivisionManagementPage;
