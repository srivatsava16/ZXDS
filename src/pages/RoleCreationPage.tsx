import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Grid,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
} from '@mui/material';
import {
  ArrowBack,
  InfoOutlined,
  LockOutlined,
  BarChartOutlined
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const RoleCreationPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    roleName: '',
    roleDescription: '',
    roleType: '',
    status: 'Active',
    datasetScope: 'all',
  });

  const [permissions, setPermissions] = useState({
    dashboard: { view: false, create: false, edit: false, delete: false, share: false },
    dataQueryBuilder: { view: false, create: false, edit: false, delete: false, execute: false },
    reports: { view: false, create: false, edit: false, delete: false, export: false, schedule: false },
    datasets: { view: false, create: false, edit: false, delete: false, download: false },
    filters: { view: false, create: false, edit: false, delete: false, apply: false },
    userManagement: { view: false, create: false, edit: false, approve: false, deactivate: false },
    auditLogs: { view: false, export: false },
  });

  const roleTypes = ['Admin', 'Standard', 'Read-Only', 'Custom'];

  const handleChange = (field: string) => (event: any) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handlePermissionChange = (module: string, permission: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPermissions({
      ...permissions,
      [module]: {
        ...(permissions as any)[module],
        [permission]: event.target.checked,
      },
    });
  };

  const handleBack = () => {
    navigate('/roles');
  };

  const handleCancel = () => {
    navigate('/roles');
  };

  const handleSave = () => {
    console.log('Save role:', { formData, permissions });
    navigate('/roles');
  };

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Button
          size="small"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{
            mb: 1.5,
            color: 'text.secondary',
            fontSize: '0.875rem',
            '&:hover': {
              backgroundColor: 'rgba(41, 102, 149, 0.08)',
            },
          }}
        >
          Back
        </Button>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#2D3748',
            mb: 0.5,
          }}
        >
          Create New Role
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          Define role permissions and access controls
        </Typography>
      </Box>

      {/* Basic Information Section */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <InfoOutlined
            sx={{
              color: 'primary.main',
              fontSize: '1.25rem',
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: '#2D3748',
              fontSize: '1rem',
            }}
          >
            Basic Information
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Role Name */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Role Name{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              placeholder="e.g., Regional Analyst, Marketing Viewer"
              value={formData.roleName}
              onChange={handleChange('roleName')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Grid>

          {/* Role Type */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12} md={6}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Role Type{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <FormControl fullWidth>
              <Select
                value={formData.roleType}
                onChange={handleChange('roleType')}
                displayEmpty
                sx={{
                  backgroundColor: 'white',
                  '& em': {
                    color: 'rgba(0, 0, 0, 0.38)',
                    fontStyle: 'normal',
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select Role Type</em>
                </MenuItem>
                {roleTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Role Description */}
          {/* @ts-expect-error MUI Grid API compatibility */}
          <Grid item xs={12}>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              Role Description{' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Brief explanation of the role's purpose"
              value={formData.roleDescription}
              onChange={handleChange('roleDescription')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                },
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Module Access Permissions Section */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <LockOutlined
            sx={{
              color: 'primary.main',
              fontSize: '1.25rem',
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: '#2D3748',
              fontSize: '1rem',
            }}
          >
            Module Access Permissions
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', width: '25%' }}>Module</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>View</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Create</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Edit</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Delete</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Special</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Dashboard */}
              <TableRow hover>
                <TableCell sx={{ fontWeight: 600 }}>Dashboard</TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.dashboard.view}
                    onChange={handlePermissionChange('dashboard', 'view')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.dashboard.create}
                    onChange={handlePermissionChange('dashboard', 'create')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.dashboard.edit}
                    onChange={handlePermissionChange('dashboard', 'edit')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.dashboard.delete}
                    onChange={handlePermissionChange('dashboard', 'delete')}
                  />
                </TableCell>
                <TableCell align="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={permissions.dashboard.share}
                        onChange={handlePermissionChange('dashboard', 'share')}
                      />
                    }
                    label="Share"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </TableCell>
              </TableRow>

              {/* Data Query Builder */}
              <TableRow hover>
                <TableCell sx={{ fontWeight: 600 }}>Data Query Builder</TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.dataQueryBuilder.view}
                    onChange={handlePermissionChange('dataQueryBuilder', 'view')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.dataQueryBuilder.create}
                    onChange={handlePermissionChange('dataQueryBuilder', 'create')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.dataQueryBuilder.edit}
                    onChange={handlePermissionChange('dataQueryBuilder', 'edit')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.dataQueryBuilder.delete}
                    onChange={handlePermissionChange('dataQueryBuilder', 'delete')}
                  />
                </TableCell>
                <TableCell align="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={permissions.dataQueryBuilder.execute}
                        onChange={handlePermissionChange('dataQueryBuilder', 'execute')}
                      />
                    }
                    label="Execute"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </TableCell>
              </TableRow>

              {/* Reports */}
              <TableRow hover>
                <TableCell sx={{ fontWeight: 600 }}>Reports</TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.reports.view}
                    onChange={handlePermissionChange('reports', 'view')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.reports.create}
                    onChange={handlePermissionChange('reports', 'create')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.reports.edit}
                    onChange={handlePermissionChange('reports', 'edit')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.reports.delete}
                    onChange={handlePermissionChange('reports', 'delete')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={permissions.reports.export}
                          onChange={handlePermissionChange('reports', 'export')}
                        />
                      }
                      label="Export"
                      sx={{ fontSize: '0.75rem' }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={permissions.reports.schedule}
                          onChange={handlePermissionChange('reports', 'schedule')}
                        />
                      }
                      label="Schedule"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  </Box>
                </TableCell>
              </TableRow>

              {/* Datasets */}
              <TableRow hover>
                <TableCell sx={{ fontWeight: 600 }}>Datasets</TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.datasets.view}
                    onChange={handlePermissionChange('datasets', 'view')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.datasets.create}
                    onChange={handlePermissionChange('datasets', 'create')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.datasets.edit}
                    onChange={handlePermissionChange('datasets', 'edit')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.datasets.delete}
                    onChange={handlePermissionChange('datasets', 'delete')}
                  />
                </TableCell>
                <TableCell align="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={permissions.datasets.download}
                        onChange={handlePermissionChange('datasets', 'download')}
                      />
                    }
                    label="Download"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </TableCell>
              </TableRow>

              {/* User Management */}
              <TableRow hover>
                <TableCell sx={{ fontWeight: 600 }}>User Management</TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.userManagement.view}
                    onChange={handlePermissionChange('userManagement', 'view')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.userManagement.create}
                    onChange={handlePermissionChange('userManagement', 'create')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.userManagement.edit}
                    onChange={handlePermissionChange('userManagement', 'edit')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.userManagement.deactivate}
                    onChange={handlePermissionChange('userManagement', 'deactivate')}
                  />
                </TableCell>
                <TableCell align="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={permissions.userManagement.approve}
                        onChange={handlePermissionChange('userManagement', 'approve')}
                      />
                    }
                    label="Approve"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </TableCell>
              </TableRow>

              {/* Audit Logs */}
              <TableRow hover>
                <TableCell sx={{ fontWeight: 600 }}>Audit Logs</TableCell>
                <TableCell align="center">
                  <Checkbox
                    size="small"
                    checked={permissions.auditLogs.view}
                    onChange={handlePermissionChange('auditLogs', 'view')}
                  />
                </TableCell>
                <TableCell align="center">-</TableCell>
                <TableCell align="center">-</TableCell>
                <TableCell align="center">-</TableCell>
                <TableCell align="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={permissions.auditLogs.export}
                        onChange={handlePermissionChange('auditLogs', 'export')}
                      />
                    }
                    label="Export"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Data Access Controls Section */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <BarChartOutlined
            sx={{
              color: 'primary.main',
              fontSize: '1.25rem',
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: '#2D3748',
              fontSize: '1rem',
            }}
          >
            Data Access Controls
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="body2"
            sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
          >
            Dataset Scope{' '}
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>
          </Typography>
          <RadioGroup
            value={formData.datasetScope}
            onChange={handleChange('datasetScope')}
          >
            <FormControlLabel
              value="all"
              control={<Radio size="small" />}
              label="All datasets in BU/Division scope"
            />
            <FormControlLabel
              value="specific"
              control={<Radio size="small" />}
              label="Select specific datasets (multi-select)"
            />
          </RadioGroup>
        </Box>
      </Paper>

      {/* Bottom Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={handleCancel}
          sx={{ px: 3, py: 0.75, fontSize: '0.875rem' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          sx={{
            px: 3,
            py: 0.75,
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
          }}
        >
          Save Role
        </Button>
      </Box>
    </Box>
  );
};

export default RoleCreationPage;
