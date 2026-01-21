import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from './store';
import theme from './theme';
import { NotificationProvider } from './contexts/NotificationContext';

// Layout Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

// Auth Pages
import LoginPage from './views/auth/LoginPage';
import ForgotPasswordPage from './views/auth/ForgotPasswordPage';

// Main Pages
import UniversalPullPage from './views/universal-pull/Index';
import UniversalPullRequestPage from './views/universal-pull/list/Index';
import UniversalPullRequestViewPage from './views/universal-pull/view/Index';
import ReportPage from './views/reports/list/Index';
import ZipRadiusSearchPage from './views/zip-radius/Index';
import RequestCreationPage from './views/universal-pull/create/Index';
import DataStreamsPage from './views/data-streams/Index';
import SystemSettingsPage from './views/admin/system-settings/Index';

// Admin Pages
import UserManagementPage from './views/admin/user/list/Index';
import UserCreationPage from './views/admin/user/form/Index';
import RoleManagementPage from './views/admin/role/list/Index';
import RoleCreationPage from './views/admin/role/form/Index';
import BusinessUnitManagementPage from './views/admin/business-unit/list/Index';
import BusinessUnitCreationPage from './views/admin/business-unit/form/Index';
import DivisionManagementPage from './views/admin/division/list/Index';
import DivisionCreationPage from './views/admin/division/form/Index';

function App() {
  const [sidebarOpen] = useState(true);

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <CssBaseline />
          <Router basename="/zxPlatformDevEnvironment">
        <Routes>
          {/* Auth Routes (No Layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Main App Routes (With Layout) */}
          <Route
            path="/*"
            element={
              <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
                <Header onMenuClick={() => {}} />
                <Box sx={{ display: 'flex', flex: 1, pt: 8 }}>
                  <Sidebar open={sidebarOpen} onClose={() => {}} />
                  <Box
                    component="main"
                    sx={{
                      flexGrow: 1,
                      backgroundColor: 'background.default',
                      minHeight: 'calc(100vh - 64px)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Routes>
                      <Route path="/" element={<Navigate to="/dataPullReports" replace />} />
                      <Route path="/universeReports" element={<Navigate to="/dataPullReports" replace />} />
                      <Route path="/universeRequests/new" element={<UniversalPullPage />} />
                      <Route path="/universeRequests/edit/:requestId" element={<UniversalPullPage />} />
                      <Route path="/universeRequests/view/:requestId" element={<UniversalPullRequestViewPage />} />
                      <Route path="/dataPullReports" element={<ReportPage />} />
                      <Route path="/zipRadiusSearch" element={<Navigate to="/dataPullReports" replace />} />
                      <Route path="/dataPullRequests/new" element={<RequestCreationPage />} />
                      <Route path="/dataPullRequests/edit/:requestId" element={<RequestCreationPage />} />
                      <Route path="/request/:clientType" element={<RequestCreationPage />} />
                      <Route path="/userManagement" element={<UserManagementPage />} />
                      <Route path="/createUser/new" element={<UserCreationPage />} />
                      <Route path="/roles" element={<RoleManagementPage />} />
                      <Route path="/roles/new" element={<RoleCreationPage />} />
                      <Route path="/businessUnits" element={<BusinessUnitManagementPage />} />
                      <Route path="/businessUnits/new" element={<BusinessUnitCreationPage />} />
                      <Route path="/divisions" element={<DivisionManagementPage />} />
                      <Route path="/divisions/new" element={<DivisionCreationPage />} />
                      <Route path="/dataStreams" element={<DataStreamsPage />} />
                      <Route path="/systemSettings" element={<SystemSettingsPage />} />
                      <Route path="*" element={<Navigate to="/dataPullReports" replace />} />
                    </Routes>
                  </Box>
                </Box>
              </Box>
            }
          />
        </Routes>
        </Router>
        </NotificationProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
