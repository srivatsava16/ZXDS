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

interface BusinessUnit {
  id: string;
  buName: string;
  description: string;
  adminCount: number;
  userCount: number;
  divisionCount: number;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdDate: string;
}

const BusinessUnitManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBU, setSelectedBU] = useState<string | null>(null);

  // Mock data - Predefined Business Units
  const [businessUnits] = useState<BusinessUnit[]>([
    {
      id: '1',
      buName: 'ZxDev',
      description: 'Development and Engineering Team',
      adminCount: 3,
      userCount: 45,
      divisionCount: 5,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '2',
      buName: 'ZxDs',
      description: 'Data Science and Analytics',
      adminCount: 2,
      userCount: 28,
      divisionCount: 3,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '3',
      buName: 'ZxOps',
      description: 'Operations and Support',
      adminCount: 4,
      userCount: 67,
      divisionCount: 8,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '4',
      buName: 'CPM',
      description: 'Campaign Performance Management',
      adminCount: 2,
      userCount: 34,
      divisionCount: 4,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '5',
      buName: 'CPA',
      description: 'Campaign Performance Analytics',
      adminCount: 3,
      userCount: 41,
      divisionCount: 6,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '6',
      buName: 'DataTeam',
      description: 'Data Management and Governance',
      adminCount: 5,
      userCount: 52,
      divisionCount: 7,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
    {
      id: '7',
      buName: 'Attribution',
      description: 'Attribution Modeling and Analysis',
      adminCount: 2,
      userCount: 19,
      divisionCount: 3,
      status: 'Active',
      createdBy: 'System',
      createdDate: '2024-01-01',
    },
  ]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, buId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedBU(buId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBU(null);
  };

  const handleEdit = () => {
    console.log('Edit Business Unit:', selectedBU);
    handleMenuClose();
  };

  const handleDelete = () => {
    console.log('Delete Business Unit:', selectedBU);
    handleMenuClose();
  };

  const handleCreateBU = () => {
    navigate('/businessUnits/new');
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
            Business Unit Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            Manage business units and organizational structure
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={handleCreateBU}
          sx={{
            px: 3,
            py: 0.75,
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Create New Business Unit
        </Button>
      </Box>

      {/* Business Units Table */}
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
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Business Unit</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Admins</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Users</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Divisions</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Created By</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Created Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {businessUnits.map((bu) => (
              <TableRow
                key={bu.id}
                hover
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(41, 102, 149, 0.04)',
                  },
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#296695' }}>
                    {bu.buName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {bu.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={bu.adminCount}
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
                    label={bu.userCount}
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
                    label={bu.divisionCount}
                    size="small"
                    sx={{
                      backgroundColor: '#FBBF24',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={bu.status}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      ...getStatusStyle(bu.status)
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {bu.createdBy}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {bu.createdDate}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, bu.id)}
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

export default BusinessUnitManagementPage;
