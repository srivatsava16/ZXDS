import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Refresh,
  Download,
} from '@mui/icons-material';
import { getEditRequest } from '../../../services/api/RequestInputsService';

interface RequestDetails {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

const UniversalPullRequestViewPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);

  // Fetch request details on component mount
  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!requestId) {
        setError('Request ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await getEditRequest(Number(requestId));

        if (response.success && response.data) {
          // Map API response to RequestDetails interface
          setRequestDetails({
            id: requestId,
            name: response.data.name || response.data.requestName || `Request #${requestId}`,
            status: response.data.status || 'pending',
            createdAt: response.data.createdAt || response.data.created_at || new Date().toISOString(),
            updatedAt: response.data.updatedAt || response.data.updated_at || new Date().toISOString(),
            description: response.data.description || 'No description available',
          });
        } else {
          setError(response.message || 'Failed to fetch request details');
        }
      } catch (err) {
        setError('Unable to load request details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [requestId]);

  const handleBack = () => {
    navigate('/dataPullReports');
  };

  const handleEdit = () => {
    navigate(`/universeRequests/edit/${requestId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Request Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage universal pull request
          </Typography>
        </Box>
        {!loading && !error && requestDetails && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
              size="small"
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              size="small"
            >
              Download
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Request Details Card */}
      {!loading && !error && requestDetails && (
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Request Information
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Request Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {requestDetails.name}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={requestDetails.status.toUpperCase()}
                      color={getStatusColor(requestDetails.status) as any}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {requestDetails.description || 'No description provided.'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Created At
                      </Typography>
                      <Typography variant="body1">
                        {new Date(requestDetails.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body1">
                        {new Date(requestDetails.updatedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Processing Details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Additional processing information and logs would appear here.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default UniversalPullRequestViewPage;