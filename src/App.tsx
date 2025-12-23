import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import theme from './theme';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import ReportPage from './pages/ReportPage';
import UniversalPullPage from './pages/UniversalPullPage';
import UniversalPullRequestPage from './pages/UniversalPullRequestPage';
import UniversalPullRequestViewPage from './pages/UniversalPullRequestViewPage';
import RequestCreationPage from './pages/RequestCreationPage';
import UserManagementPage from './pages/UserManagementPage';
import UserCreationPage from './pages/UserCreationPage';
import RoleManagementPage from './pages/RoleManagementPage';
import RoleCreationPage from './pages/RoleCreationPage';
import BusinessUnitManagementPage from './pages/BusinessUnitManagementPage';
import BusinessUnitCreationPage from './pages/BusinessUnitCreationPage';
import DivisionManagementPage from './pages/DivisionManagementPage';
import DivisionCreationPage from './pages/DivisionCreationPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ZipRadiusSearchPage from './pages/ZipRadiusSearchPage';
import DataStreamsPage from './pages/DataStreamsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';

function App() {
  const [sidebarOpen] = useState(true);

  return (
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
  );
}

export default App;
