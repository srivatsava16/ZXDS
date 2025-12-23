import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { store } from './store';
import theme from './theme';
import Header from './components/layout/Header';
import Sidebar from './components/layout';
import ReportPage from './views/public/ReportPage';
import UniversalPullPage from './views/public/UniversalPullPage';
import UniversalPullRequestPage from './views/public/UniversalPullRequestPage';
import UniversalPullRequestViewPage from './views/public/UniversalPullRequestViewPage';
import RequestCreationPage from './views/public/RequestCreationPage';
import UserManagementPage from './views/admin/UserManagementPage';
import UserCreationPage from './views/admin/UserCreationPage';
import RoleManagementPage from './views/admin/RoleManagementPage';
import RoleCreationPage from './views/admin/RoleCreationPage';
import BusinessUnitManagementPage from './views/admin/BusinessUnitManagementPage';
import BusinessUnitCreationPage from './views/admin/BusinessUnitCreationPage';
import DivisionManagementPage from './views/admin/DivisionManagementPage';
import DivisionCreationPage from './views/admin/DivisionCreationPage';
import LoginPage from './views/auth/LoginPage';
import ForgotPasswordPage from './views/auth/ForgotPasswordPage';
import ZipRadiusSearchPage from './views/public/ZipRadiusSearchPage';
import DataStreamsPage from './views/public/DataStreamsPage';
import SystemSettingsPage from './views/admin/SystemSettingsPage';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
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
                <Header onMenuClick={handleMenuClick} />
                <Box sx={{ display: 'flex', flex: 1, pt: 8 }}>
                  <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
                        <Route path="/universeReports" element={<UniversalPullPage />} />
                        <Route path="/universeRequests/new" element={<UniversalPullRequestPage />} />
                        <Route path="/universeRequests/view/:requestId" element={<UniversalPullRequestViewPage />} />
                        <Route path="/dataPullReports" element={<ReportPage />} />
                        <Route path="/zipRadiusSearch" element={<ZipRadiusSearchPage />} />
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
      </ThemeProvider>
    </Provider>
  );
}

export default App;
