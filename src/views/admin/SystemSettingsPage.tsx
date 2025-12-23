import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { Settings } from '@mui/icons-material';
import ActivityLog from '../../components/SystemSettings/ActivityLog';
import DetailedLog from '../../components/SystemSettings/DetailedLog';

const SystemSettingsPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Settings sx={{ fontSize: 32, color: '#296695' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2D3748' }}>
            System Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage system logs and audit trails
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper
        sx={{
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              py: 2,
            },
          }}
        >
          <Tab label="Activity Log" />
          <Tab label="Detailed Log" />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <ActivityLog />}
          {activeTab === 1 && <DetailedLog />}
        </Box>
      </Paper>
    </Box>
  );
};

export default SystemSettingsPage;
