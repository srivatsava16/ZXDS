import { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { store } from './store';
import theme from './theme';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './contexts/NotificationContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout';

// Lazy load route components for code splitting
const ReportPage = lazy(() => import('./views/reports/list/Index'));
const UniversalPullPage = lazy(() => import('./views/universal-pull/Index'));
const UniversalPullRequestPage = lazy(() => import('./views/universal-pull/list/Index'));
const UniversalPullRequestViewPage = lazy(() => import('./views/universal-pull/view/Index'));
const RequestCreationPage = lazy(() => import('./views/universal-pull/create/Index'));
const LoginPage = lazy(() => import('./views/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./views/auth/ForgotPasswordPage'));
const ZipRadiusSearchPage = lazy(() => import('./views/zip-radius/Index'));
const DataStreamsPage = lazy(() => import('./views/data-streams/Index'));

// Admin Views - Lazy loaded
const UserManagementPage = lazy(() => import('./views/admin/user/list/Index'));
const UserCreationPage = lazy(() => import('./views/admin/user/form/Index'));
const RoleManagementPage = lazy(() => import('./views/admin/role/list/Index'));
const RoleCreationPage = lazy(() => import('./views/admin/role/form/Index'));
const BusinessUnitManagementPage = lazy(() => import('./views/admin/business-unit/list/Index'));
const BusinessUnitCreationPage = lazy(() => import('./views/admin/business-unit/form/Index'));
const DivisionManagementPage = lazy(() => import('./views/admin/division/list/Index'));
const DivisionCreationPage = lazy(() => import('./views/admin/division/form/Index'));
const SystemSettingsPage = lazy(() => import('./views/admin/system-settings/Index'));

// Loading fallback component
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <CircularProgress size={60} thickness={4} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Loading...</Box>
  </Box>
);

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <NotificationProvider>
            <Router basename="/zxPlatformDevEnvironment">
              <Suspense fallback={<LoadingFallback />}>
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
                            <Suspense fallback={<LoadingFallback />}>
                              <Routes>
                                <Route path="/" element={<Navigate to="/reports" replace />} />
                                <Route path="/universal-pull" element={<UniversalPullPage />} />
                                <Route path="/universal-pull/list" element={<UniversalPullRequestPage />} />
                                <Route path="/universal-pull/view/:requestId" element={<UniversalPullRequestViewPage />} />
                                <Route path="/reports" element={<ReportPage />} />
                                <Route path="/data-pull-requests/create" element={<RequestCreationPage />} />
                                <Route path="/data-pull-requests/edit/:requestId" element={<RequestCreationPage />} />
                                <Route path="/zip-radius" element={<ZipRadiusSearchPage />} />
                                <Route path="/userManagement" element={<UserManagementPage />} />
                                <Route path="/createUser/new" element={<UserCreationPage />} />
                                <Route path="/roles" element={<RoleManagementPage />} />
                                <Route path="/roles/new" element={<RoleCreationPage />} />
                                <Route path="/businessUnits" element={<BusinessUnitManagementPage />} />
                                <Route path="/businessUnits/new" element={<BusinessUnitCreationPage />} />
                                <Route path="/divisions" element={<DivisionManagementPage />} />
                                <Route path="/divisions/new" element={<DivisionCreationPage />} />
                                <Route path="/data-streams" element={<DataStreamsPage />} />
                                <Route path="/systemSettings" element={<SystemSettingsPage />} />
                                <Route path="*" element={<Navigate to="/reports" replace />} />
                              </Routes>
                            </Suspense>
                          </Box>
                        </Box>
                      </Box>
                    }
                  />
                </Routes>
              </Suspense>
            </Router>
          </NotificationProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
