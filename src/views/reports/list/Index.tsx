import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Chip,
  Stack,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  TextField,
  Collapse,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Visibility,
  Assessment,
  Description,
  Add,
  TrendingUp,
  Schedule,
  CheckCircle,
  Close,
  Save,
  Edit,
  FileCopy,
  Refresh,
  Delete,
  DragIndicator,
  KeyboardArrowDown,
  KeyboardArrowUp,
  ExpandMore,
  Storage,
  Settings,
  CloudUpload,
  FilterList,
  AccountTree,
  Download,
  FilterAltOff,
  Search,
  CalendarToday,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import StatsConfigDialog from '../../../components/StatsConfigDialog/StatsConfigDialog';
import { getAllReports, reportInserts, getRequestById, type Report as ApiReport, type ReportInsertsRequest } from '../../../services/api';
import ContentLoader from '../../../components/ContentLoader/ContentLoader';

// Field Mapping interface
export interface FieldMapping {
  id: string;
  fieldName: string;
  selectedSources: string[];
  selectedColumns: string[];
}
// OutputDestination interface for custom destinations
export interface OutputDestination {
  id: string;
  name: string;
  type: 'SFTP' | 'S3';
  host?: string;
  port?: string;
  path?: string;
  bucket?: string;
  region?: string;
  username?: string;
  password?: string;
  accessKey?: string;
  secretKey?: string;
}

interface ReportData {
  id: number;
  requestName: string;
  createdDate: string | null;
  processedDate: string | null;
  createdBy: string;
  updatedBy: string;
  updatedDate: string | null;
  status: 'Pending' | 'Inprogress' | 'Completed' | 'Failed' | 'Waiting';
  requestType: 'Adhoc' | 'Scheduled';
  recipientEmail: string;
  scheduleDateTime: string | null;
}

interface ApiResponse {
  success: boolean;
  totalRequests: number;
  data: ReportData[];
  Counts: {
    TodayRequests: number;
    Waiting: number;
    Inprogress: number;
    Completed: number;
  };
}

// Sortable Item Component for Priority Order
interface SortableItemProps {
  id: string;
  sourceName: string;
  index: number;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, sourceName, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        p: 0.75,
        mb: 0.75,
        backgroundColor: isDragging ? '#F0FDF4' : 'white',
        borderRadius: 1,
        border: '1px solid',
        borderColor: isDragging ? '#10B981' : '#E5E7EB',
        boxShadow: isDragging ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#10B981',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
          backgroundColor: '#F9FAFB',
          '& .drag-handle': {
            color: '#10B981',
          },
        },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        className="drag-handle"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDragging ? '#10B981' : '#F3F4F6',
          borderRadius: 0.75,
          p: 0.5,
          transition: 'all 0.2s ease',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <DragIndicator
          sx={{
            fontSize: 18,
            color: isDragging ? '#fff' : '#6B7280',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        />
      </Box>
      <Chip
        label={index + 1}
        size="small"
        sx={{
          backgroundColor: '#10B981',
          color: '#fff',
          fontWeight: 600,
          minWidth: 22,
          height: 22,
          fontSize: '0.7rem',
          flexShrink: 0,
          '& .MuiChip-label': {
            px: 0.75,
          },
        }}
      />
      <Tooltip title={sourceName} arrow placement="top">
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontSize: '0.8rem',
            fontWeight: 500,
            color: isDragging ? '#10B981' : '#2D3748',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s ease',
          }}
        >
          {sourceName}
        </Typography>
      </Tooltip>
    </Box>
  );
};

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFileDetails, setSelectedFileDetails] = useState<{ fileName: string; count: number }[]>([]);
  const [fileGenerationDialogOpen, setFileGenerationDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsRequestId, setStatsRequestId] = useState<number | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<ReportData | null>(null);

  // API-related state - Initialize with empty data
  const [reports, setReports] = useState<ReportData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [apiCounts, setApiCounts] = useState<{
    TodayRequests: number;
    Waiting: number;
    Inprogress: number;
    Completed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePickers, setShowCustomDatePickers] = useState(false);

  // Ref for debounce timer
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // File Generation Dialog state
  const [fileGenLoading, setFileGenLoading] = useState(false);
  const [availableInputSources, setAvailableInputSources] = useState<Array<{ id: number; inputSource: string; headers: string[] }>>([]);
  const [selectedInputSources, setSelectedInputSources] = useState<string[]>([]);
  const [combineSources, setCombineSources] = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [fieldPriorityOrder, setFieldPriorityOrder] = useState<string[]>([]);
  const [selectedOutputFields, setSelectedOutputFields] = useState<string[]>([]);
  const [limitRecords, setLimitRecords] = useState(false);
  const [recordCount, setRecordCount] = useState('');
  const [shuffleRecords, setShuffleRecords] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('');
  const [availableDestinations, setAvailableDestinations] = useState<Array<{ id: number; name: string; type: string }>>([]);
  const [expandedConfigIds, setExpandedConfigIds] = useState<Set<string>>(new Set());
  const [addDestinationExpanded, setAddDestinationExpanded] = useState(false);
  const [customDestinations, setCustomDestinations] = useState<OutputDestination[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [fieldMappingExpanded, setFieldMappingExpanded] = useState(false);

  // Field Mapping form state
  const [mappingFieldName, setMappingFieldName] = useState('');
  const [mappingSelectedSources, setMappingSelectedSources] = useState<string[]>([]);
  const [mappingSelectedColumns, setMappingSelectedColumns] = useState<string[]>([]);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);

  // Inline destination form state
  const [editingDestinationId, setEditingDestinationId] = useState<string | null>(null);
  const [destinationType, setDestinationType] = useState<'SFTP' | 'S3' | 'NFS'>('SFTP');
  const [destinationName, setDestinationName] = useState('');
  const [destHost, setDestHost] = useState('');
  const [destPort, setDestPort] = useState('');
  const [destPath, setDestPath] = useState('');
  const [destBucket, setDestBucket] = useState('');
  const [destRegion, setDestRegion] = useState('');
  const [destUsername, setDestUsername] = useState('');
  const [destPassword, setDestPassword] = useState('');
  const [destAccessKey, setDestAccessKey] = useState('');
  const [destSecretKey, setDestSecretKey] = useState('');
  const [savedConfigurations, setSavedConfigurations] = useState<Array<{
    id: string;
    inputSources: string[];
    outputFields: string[];
    combineSources: boolean;
    priorityOrder?: string[];
    fieldPriorityOrder?: string[];
    limitations?: {
      limitRecords: boolean;
      recordCount?: number;
      shuffleRecords: boolean;
    };
    destination?: string;
    status?: string;
    outputDetails?: Array<{
      filename: string;
      outputFullPath: string;
      recordsCount: number;
    }>;
  }>>([]);

  // Helper function to calculate date ranges
  const getDateRange = (filterType: string) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    try {
      switch (filterType) {
        case 'Today':
          startDate = `${now?.toISOString()?.split('T')?.[0] || ''} 00:00:00`;
          endDate = `${now?.toISOString()?.split('T')?.[0] || ''} 23:59:59`;
          break;
        case 'Yesterday':
          const yesterday = new Date(now);
          yesterday?.setDate(yesterday?.getDate() - 1);
          startDate = `${yesterday?.toISOString()?.split('T')?.[0] || ''} 00:00:00`;
          endDate = `${yesterday?.toISOString()?.split('T')?.[0] || ''} 23:59:59`;
          break;
        case 'Last 7 Days':
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo?.setDate(sevenDaysAgo?.getDate() - 7);
          startDate = `${sevenDaysAgo?.toISOString()?.split('T')?.[0] || ''} 00:00:00`;
          endDate = `${now?.toISOString()?.split('T')?.[0] || ''} 23:59:59`;
          break;
        case 'Current Month':
          startDate = `${now?.getFullYear() || ''}-${String(now?.getMonth() + 1)?.padStart(2, '0')}-01 00:00:00`;
          endDate = `${now?.toISOString()?.split('T')?.[0] || ''} 23:59:59`;
          break;
        case 'Last Month':
          const lastMonth = new Date(now?.getFullYear(), now?.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now?.getFullYear(), now?.getMonth(), 0);
          startDate = `${lastMonth?.toISOString()?.split('T')?.[0] || ''} 00:00:00`;
          endDate = `${lastMonthEnd?.toISOString()?.split('T')?.[0] || ''} 23:59:59`;
          break;
        case 'Last 30 Days':
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo?.setDate(thirtyDaysAgo?.getDate() - 30);
          startDate = `${thirtyDaysAgo?.toISOString()?.split('T')?.[0] || ''} 00:00:00`;
          endDate = `${now?.toISOString()?.split('T')?.[0] || ''} 23:59:59`;
          break;
        case 'Custom Range':
          if (customStartDate && customEndDate) {
            startDate = `${customStartDate} 00:00:00`;
            endDate = `${customEndDate} 23:59:59`;
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Error calculating date range:', err);
    }

    return { startDate, endDate };
  };

  // Load reports from API with pagination and filters
  const loadReports = async (offset: number = 0, limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);

      // Build filters object
      const filters: any = {};

      // Add search filter
      if (searchText?.trim()) {
        filters.search = searchText?.trim();
      }

      // Add status filter (convert to lowercase as per API requirements)
      if (selectedStatuses?.length > 0) {
        filters.status = selectedStatuses?.map((s) => s?.toLowerCase()) || [];
      }

      // Add date range filter
      if (dateFilter && dateFilter !== 'Custom Range') {
        const { startDate, endDate } = getDateRange(dateFilter);
        if (startDate && endDate) {
          filters.dateRange = [{ start_date: startDate, end_date: endDate }];
        }
      } else if (dateFilter === 'Custom Range' && customStartDate && customEndDate) {
        const { startDate, endDate } = getDateRange('Custom Range');
        if (startDate && endDate) {
          filters.dateRange = [{ start_date: startDate, end_date: endDate }];
        }
      }

      // Build request payload
      const payload: any = { offset, limit };

      // Only add filters if at least one filter is set
      if (Object.keys(filters)?.length > 0) {
        payload.filters = filters;
      }

      const response: any = await getAllReports(payload);

      // Handle API response format
      if (response && response.success) {
        // Set reports and total count from API
        setReports(response.data || []);
        setTotalCount(parseInt(response.totalRequests) || 0);
        setApiCounts(response.Counts || null);

        // Extract and combine destination sources from API response
        const destinations: Array<{ id: number; name: string; type: string }> = [];

        if (response.nfsSources && Array.isArray(response.nfsSources)) {
          response.nfsSources?.forEach((source: any) => {
            destinations?.push({ id: source.id, name: source.name, type: 'NFS' });
          });
        }

        if (response.sftpSources && Array.isArray(response.sftpSources)) {
          response.sftpSources?.forEach((source: any) => {
            destinations?.push({ id: source.id, name: source.name, type: 'SFTP' });
          });
        }

        if (response.awsSources && Array.isArray(response.awsSources)) {
          response.awsSources?.forEach((source: any) => {
            destinations?.push({ id: source.id, name: source.name, type: 'AWS' });
          });
        }

        setAvailableDestinations(destinations);
      } else {
        // If API returns unsuccessful response, show error
        setError('Failed to load reports. Please try again.');
        setReports([]);
        setTotalCount(0);
        setApiCounts(null);
        setAvailableDestinations([]);
      }
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err?.message || 'Failed to load reports. Please try again.');
      setReports([]);
      setTotalCount(0);
      setApiCounts(null);
      setAvailableDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  // Load reports when component mounts or pagination changes
  useEffect(() => {
    const offset = page * rowsPerPage;
    loadReports(offset, rowsPerPage);
  }, [page, rowsPerPage]);

  // Debounced search text - triggers API call after 500ms of no typing
  useEffect(() => {
    // Clear any existing debounce timer
    if (searchDebounceRef?.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Set up debounce timer for search text (500ms delay)
    searchDebounceRef.current = setTimeout(() => {
      // Reset to first page and reload when search text changes
      if (page !== 0) {
        setPage(0);
      } else {
        // Trigger reload for any active filters
        const hasActiveFilters = searchText || selectedStatuses?.length > 0 || dateFilter;
        if (hasActiveFilters) {
          loadReports(0, rowsPerPage);
        }
      }
    }, 500);

    // Cleanup function to clear timeout when component unmounts or searchText changes
    return () => {
      if (searchDebounceRef?.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Reload reports immediately when status or date filters change
  useEffect(() => {
    // Reset to first page and reload when filters change
    if (page !== 0) {
      setPage(0);
    } else {
      // Trigger reload for any active filters
      const hasActiveFilters = searchText || selectedStatuses?.length > 0 || dateFilter;
      if (hasActiveFilters) {
        loadReports(0, rowsPerPage);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatuses?.length, dateFilter]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilePathClick = (fileDetails: { fileName: string; count: number }[]) => {
    setSelectedFileDetails(fileDetails);
    setFileDialogOpen(true);
  };

  const handleCloseFileDialog = () => {
    setFileDialogOpen(false);
  };

  const handleNewRequest = () => {
    navigate('/dataPullRequests/new');
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedStatuses([]);
    setDateFilter('');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomDatePickers(false);
  };

  const handleDuplicate = (requestId: number) => {
    // Navigate to creation page with duplicate parameter
    navigate(`/dataPullRequests/new?duplicate=${requestId}`);
  };

  const handleOpenFileGeneration = (requestId: number) => {
    // Clear previous state first
    setAvailableInputSources([]);
    setSelectedInputSources([]);
    setCombineSources(false);
    setSelectedOutputFields([]);
    setSavedConfigurations([]);

    setSelectedRequestId(requestId);
    setFileGenerationDialogOpen(true);

    try {
      setFileGenLoading(true);

      // Find the report data from the already-loaded reports list
      const reportData = reports?.find((report) => report.id === requestId);

      if (!reportData) {
        console.warn('[handleOpenFileGeneration] Report not found in loaded data for ID:', requestId);
        setAvailableInputSources([]);
        setFileGenLoading(false);
        return;
      }

      let transformedSources: Array<{ id: number; inputSource: string; headers: string[] }> = [];

      // Check for dynamicStats.data in the report
      if ((reportData as any)?.dynamicStats?.data && Array.isArray((reportData as any).dynamicStats.data)) {

        transformedSources = (reportData as any).dynamicStats.data?.map((source: any) => ({
          id: source.id,
          inputSource: source.inputSource,
          headers: source.headers || []
        }));
      } else {
        console.warn('[handleOpenFileGeneration] No dynamicStats.data found for request', requestId);
      }

      setAvailableInputSources(transformedSources);

      // Extract and transform output configurations from API response
      if ((reportData as any)?.output && Array.isArray((reportData as any)?.output)) {

        const outputConfigs = (reportData as any).output?.map((output: any, index: number) => {
          // Extract output details if status is Completed
          let outputDetails: Array<{ filename: string; outputFullPath: string; recordsCount: number }> | undefined;

          if (output?.status === 'Completed') {
            outputDetails = [{
              filename: output?.filename || '',
              outputFullPath: output?.outputfullpath || '',
              recordsCount: output?.recordsCount || 0,
            }];
          }

          return {
            id: output?.id?.toString() || `output-${index}`,
            inputSources: output?.config?.input_sources || [],
            outputFields: output?.config?.output_fields || [],
            combineSources: output?.config?.combine_sources || false,
            priorityOrder: output?.config?.field_priority || undefined,
            fieldPriorityOrder: output?.config?.field_priority || undefined,
            limitations: {
              limitRecords: output?.limitations?.limit_records !== null,
              recordCount: output?.limitations?.limit_records || undefined,
              shuffleRecords: output?.limitations?.shuffle_records || false,
            },
            destination: output?.destinationName || (output?.destinationConfig ? `${output?.destinationConfig?.type} Custom` : undefined),
            status: output?.status || 'Unknown',
            outputDetails,
          };
        }) || [];

        setSavedConfigurations(outputConfigs);
      }
    } catch (err) {
      console.error('[handleOpenFileGeneration] Error loading request data:', err);
      setAvailableInputSources([]);
    } finally {
      setFileGenLoading(false);
    }
  };

  const handleCloseFileGeneration = () => {
    setFileGenerationDialogOpen(false);
    setSelectedRequestId(null);
    setAvailableInputSources([]);
    setSelectedInputSources([]);
    setCombineSources(false);
    setPriorityOrder([]);
    setFieldPriorityOrder([]);
    setSelectedOutputFields([]);
    setLimitRecords(false);
    setRecordCount('');
    setShuffleRecords(false);
    setSelectedDestination('');
    setSavedConfigurations([]);
    setExpandedConfigIds(new Set());
    setAddDestinationExpanded(false);
    setCustomDestinations([]);
    setFieldMappings([]);
    setFieldMappingExpanded(false);
    setMappingFieldName('');
    setMappingSelectedSources([]);
    setMappingSelectedColumns([]);
    setEditingMappingId(null);
    resetDestinationForm();
  };

  const handleSaveConfiguration = async () => {
    if (selectedInputSources?.length === 0 || selectedOutputFields?.length === 0) {
      alert('Please select at least one input source and at least one output field');
      return;
    }

    // Validate priority order and field priority order when combine sources is checked
    if (combineSources && selectedInputSources?.length > 1) {
      if (priorityOrder?.length === 0) {
        alert('Please set the priority order for input sources');
        return;
      }
      if (fieldPriorityOrder?.length === 0) {
        alert('Please set the field priority order');
        return;
      }
    }

    // Validate limitations
    if (limitRecords && !recordCount) {
      alert('Please enter a record count');
      return;
    }

    // Validate destination
    if (!selectedDestination) {
      alert('Please select an output destination');
      return;
    }

    // Check if the selected destination is custom or preconfigured
    const customDestination = customDestinations?.find(dest => dest.name === selectedDestination);
    const isCustomDestination = !!customDestination;

    // Build the API payload
    const outputConfig: any = {
      config: {
        input_sources: selectedInputSources,
        output_fields: selectedOutputFields,
        field_mappings: fieldMappings?.flatMap(mapping =>
          mapping.selectedColumns?.map(column => {
            // Extract sourceId and field name from column value (format: sourceId::fieldName)
            const [sourceId, fieldName] = column?.includes('::') ? column?.split('::') : ['', column];
            return {
              sourceField: fieldName,
              targetField: mapping.fieldName,
              sourceId: sourceId
            };
          })
        ),
        combine_sources: combineSources,
        field_priority: combineSources && selectedInputSources?.length > 1 ? fieldPriorityOrder : [],
      },
      destinationType: isCustomDestination ? 'custom' : 'preconfigured',
      limitations: {
        limit_records: limitRecords ? parseInt(recordCount) : null,
        shuffle_records: shuffleRecords,
      },
    };

    if (isCustomDestination && customDestination) {
      // Custom destination - add destinationConfig based on type
      if (customDestination.type === 'SFTP') {
        outputConfig.destinationConfig = {
          type: 'SFTP',
          hostname: customDestination.host,
          port: customDestination.port ? parseInt(customDestination.port) : undefined,
          path: customDestination.path,
          username: customDestination.username,
          password: customDestination.password,
        };
      } else if (customDestination.type === 'S3') {
        outputConfig.destinationConfig = {
          type: 'S3',
          bucketname: customDestination.bucket,
          region: customDestination.region,
          path: customDestination.path,
          accesskey: customDestination.accessKey,
          secretkey: customDestination?.secretKey,
        };
      } else if (customDestination.type === 'NFS') {
        outputConfig.destinationConfig = {
          type: 'NFS',
          hostserver: customDestination.host,
          mountpath: customDestination.path,
        };
      }
    } else {
      // Preconfigured destination - add destinationName
      outputConfig.destinationName = selectedDestination;
    }

    const payload: ReportInsertsRequest = {
      requestId: selectedRequestId!,
      output: [outputConfig],
    };

    try {
      setFileGenLoading(true);

      const response = await reportInserts(payload);

      if (response.success) {
        // Save to local state for display
        const newConfig = {
          id: Date.now().toString(),
          inputSources: selectedInputSources,
          outputFields: selectedOutputFields,
          combineSources: combineSources,
          priorityOrder: combineSources && selectedInputSources?.length > 1 ? priorityOrder : undefined,
          fieldPriorityOrder: combineSources && selectedInputSources?.length > 1 ? fieldPriorityOrder : undefined,
          limitations: {
            limitRecords: limitRecords,
            recordCount: limitRecords ? parseInt(recordCount) : undefined,
            shuffleRecords: shuffleRecords,
          },
          destination: selectedDestination,
          status: 'Waiting', // Set status as Waiting after saving
        };

        setSavedConfigurations([...savedConfigurations, newConfig]);

        // Reset form
        setSelectedInputSources([]);
        setCombineSources(false);
        setPriorityOrder([]);
        setFieldPriorityOrder([]);
        setSelectedOutputFields([]);
        setLimitRecords(false);
        setRecordCount('');
        setShuffleRecords(false);
        setSelectedDestination('');

        alert('Configuration saved successfully');
      } else {
        alert(response.message || 'Failed to save configuration');
      }
    } catch (err: any) {
      console.error('[handleSaveConfiguration] Error:', err);
      alert(err?.message || 'Failed to save configuration. Please try again.');
    } finally {
      setFileGenLoading(false);
    }
  };

  const handleOpenStats = (requestId: number) => {
    // Find the report data from the current reports list
    const reportData = reports?.find(r => r.id === requestId);
    setStatsRequestId(requestId);
    setSelectedReportData(reportData || null);
    setStatsDialogOpen(true);
  };

  const handleCloseStats = () => {
    setStatsDialogOpen(false);
    setStatsRequestId(null);
    setSelectedReportData(null);
  };

  // Drag and drop sensors for priority order
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePriorityOrderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = priorityOrder?.indexOf(active.id as string);
      const newIndex = priorityOrder?.indexOf(over.id as string);
      const newOrder = arrayMove(priorityOrder, oldIndex, newIndex);
      setPriorityOrder(newOrder);
    }
  };

  const handleToggleConfigExpand = (configId: string) => {
    // Find the config to check its status
    const config = savedConfigurations?.find(c => c.id === configId);

    // Don't expand if status is Waiting
    if (config?.status === 'Waiting') {
      return;
    }

    setExpandedConfigIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(configId)) {
        newSet.delete(configId);
      } else {
        newSet.add(configId);
      }
      return newSet;
    });
  };

  const handleStopRequest = async (requestId: number) => {
    // Confirm before stopping
    const confirmed = window.confirm('Are you sure you want to stop this request?');
    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);

      // Call reportInserts.php with STOP status
      const response = await reportInserts({
        requestId,
        status: 'STOP',
      });

      if (response.success) {
        // Refresh the data with current pagination settings
        await loadReports(page * rowsPerPage, rowsPerPage);
        alert('Request stopped successfully');
      } else {
        setError(response.message || 'Failed to stop request');
        alert(response.message || 'Failed to stop request');
      }
    } catch (err: any) {
      console.error('Error stopping request:', err);
      const errorMessage = err?.message || 'Failed to stop request. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Inline destination form handlers
  const resetDestinationForm = () => {
    setEditingDestinationId(null);
    setDestinationName('');
    setDestHost('');
    setDestPort('');
    setDestPath('');
    setDestBucket('');
    setDestRegion('');
    setDestUsername('');
    setDestPassword('');
    setDestAccessKey('');
    setDestSecretKey('');
    setDestinationType('SFTP');
  };

  const handleEditDestination = (destination: OutputDestination) => {
    setEditingDestinationId(destination.id);
    setDestinationName(destination.name);
    setDestinationType(destination.type);
    setDestHost(destination.host || '');
    setDestPort(destination.port || '');
    setDestPath(destination.path || '');
    setDestBucket(destination.bucket || '');
    setDestRegion(destination.region || '');
    setDestUsername(destination.username || '');
    setDestPassword(destination.password || '');
    setDestAccessKey(destination.accessKey || '');
    setDestSecretKey(destination?.secretKey || '');

    // Scroll to the form
    const formElement = document.getElementById('destination-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleSaveDestination = () => {
    // Validation
    if (!destinationName?.trim()) {
      alert('Please enter a destination name');
      return;
    }

    if (destinationType === 'SFTP' && (!destHost || !destPort)) {
      alert('Please enter host and port for SFTP destination');
      return;
    }
    if (destinationType === 'S3' && (!destBucket || !destRegion)) {
      alert('Please enter bucket and region for S3 destination');
      return;
    }
    if (destinationType === 'S3' && !destSecretKey?.trim()) {
      alert('Please enter secret key for S3 destination');
      return;
    }

    const destinationData: OutputDestination = {
      id: editingDestinationId || Date.now().toString(),
      name: destinationName,
      type: destinationType,
      host: destHost || undefined,
      port: destPort || undefined,
      path: destPath || undefined,
      bucket: destBucket || undefined,
      region: destRegion || undefined,
      username: destUsername || undefined,
      password: destPassword || undefined,
      accessKey: destAccessKey || undefined,
      secretKey: destSecretKey || undefined,
    };

    if (editingDestinationId) {
      // Update existing destination
      setCustomDestinations(customDestinations?.map(d =>
        d.id === editingDestinationId ? destinationData : d
      ));
      alert('Destination updated successfully');
    } else {
      // Add new destination
      setCustomDestinations([...customDestinations, destinationData]);
      alert('Destination added successfully');
    }

    resetDestinationForm();
  };

  const handleCancelEdit = () => {
    resetDestinationForm();
  };

  const handleDeleteDestination = (destinationId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this destination?');
    if (confirmed) {
      setCustomDestinations(customDestinations?.filter(d => d.id !== destinationId));
      // If we're editing this destination, reset the form
      if (editingDestinationId === destinationId) {
        resetDestinationForm();
      }
    }
  };

  const getStatusChipStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          backgroundColor: '#10B981', // Light green
          color: '#fff',
        };
      case 'Inprogress':
        return {
          backgroundColor: '#FBBF24', // Light yellow
          color: '#fff',
        };
      case 'Failed':
        return {
          backgroundColor: '#F87171', // Light red
          color: '#fff',
        };
      case 'Pending':
        return {
          backgroundColor: '#3B82F6', // Blue
          color: '#fff',
        };
      case 'Waiting':
        return {
          backgroundColor: '#8B5CF6', // Purple
          color: '#fff',
        };
      default:
        return {
          backgroundColor: '#E5E7EB',
          color: '#6B7280',
        };
    }
  };

  // Use API counts if available, otherwise fallback to calculated stats
  const getDisplayStats = () => {
    if (apiCounts) {
      return {
        total: apiCounts.TodayRequests,
        inProgress: apiCounts.Inprogress,
        completed: apiCounts.Completed
      };
    }
    
    // Fallback calculation for when API is not available
    const today = new Date().toISOString().split('T')[0];
    const todayRequests = reports?.filter(request => 
      request.createdDate && request.createdDate?.split(' ')[0] === today
    );
    
    return {
      total: todayRequests?.length,
      inProgress: todayRequests?.filter(r => r.status === 'Inprogress' || r.status === 'Pending').length,
      completed: todayRequests?.filter(r => r.status === 'Completed').length
    };
  };

  const displayStats = getDisplayStats();

  const stats = [
    { label: 'Total Requests (Today)', value: displayStats.total.toString(), icon: TrendingUp, color: '#296695' },
    { label: 'In Progress (Today)', value: displayStats.inProgress.toString(), icon: Schedule, color: '#F59E0B' },
    { label: 'Completed (Today)', value: displayStats.completed.toString(), icon: CheckCircle, color: '#10B981' },
  ];

  return (
    <Box sx={{ p: 4, pt: 6 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#2D3748',
                mb: 0.5,
              }}
            >
              Data Pull Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Manage and monitor all data pull requests
            </Typography>
            {error && (
              <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => loadReports(page * rowsPerPage, rowsPerPage)}
              disabled={loading}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                '&:hover': { backgroundColor: 'grey.50' },
              }}
            >
              <Refresh />
            </IconButton>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={handleNewRequest}
              sx={{
                px: 3,
                py: 0.75,
                fontSize: '0.875rem',
                boxShadow: '0 4px 16px rgba(41, 102, 149, 0.3)',
              }}
            >
              New Request
            </Button>
          </Stack>
        </Box>

        {/* Stats Cards - COMMENTED OUT
        <Stack direction="row" spacing={3}>
          {stats?.map((stat, index) => (
            <Card
              key={index}
              sx={{
                flex: 1,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFB 100%)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${stat.color}15`,
                    }}
                  >
                    <stat.icon sx={{ fontSize: 28, color: stat.color }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
        */}

        {/* Filter Section */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFB 100%)',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            p: 3,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Filter Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1.5 }}>
            <FilterList sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: '#2D3748',
                fontSize: '0.9rem',
              }}
            >
              Filters
            </Typography>
            {(searchText || selectedStatuses?.length > 0 || dateFilter) && (
              <Chip
                label={`${(searchText ? 1 : 0) + (selectedStatuses?.length > 0 ? 1 : 0) + (dateFilter ? 1 : 0)} Active`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: 'primary.main',
                  color: 'white',
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            {/* Left side - Filter inputs */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap', flex: 1 }}>
              {/* Search Text Box */}
              <TextField
                size="small"
                placeholder="Search by ID or Request Name"
                value={searchText}
                onChange={(e) => setSearchText(e?.target?.value)}
                InputProps={{
                  startAdornment: (
                    <Search sx={{ color: 'text.secondary', fontSize: 18, mr: 0.5 }} />
                  ),
                }}
                
                sx={{
                  flex: '0 1 220px',
                  minWidth: 350,
                  maxWidth: 700,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: '#FAFBFC',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                      boxShadow: '0 0 0 2px rgba(41, 102, 149, 0.1)',
                    },
                  },
                }}
              />

              {/* Status Dropdown */}
              <FormControl size="small" sx={{ flex: '0 1 170px', minWidth: 160 }}>
                <Select
                  multiple
                  value={selectedStatuses}
                  onChange={(e) => setSelectedStatuses(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  displayEmpty
                  renderValue={(selected) => {
                    if (selected?.length === 0) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Schedule sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>Status</Typography>
                        </Box>
                      );
                    }
                    if (selected?.length === 1) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Schedule sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Typography sx={{ fontSize: '0.875rem' }}>{selected[0]}</Typography>
                        </Box>
                      );
                    }
                    // Multiple selections: show first + count
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Schedule sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {selected[0]} +{selected?.length - 1} more
                        </Typography>
                      </Box>
                    );
                  }}
                  sx={{
                    backgroundColor: 'white',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: '#FAFBFC',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                      boxShadow: '0 0 0 2px rgba(41, 102, 149, 0.1)',
                    },
                  }}
                >
                  <MenuItem value="Waiting">
                    <Checkbox checked={selectedStatuses?.indexOf('Waiting') > -1} />
                    <ListItemText primary="Waiting" />
                  </MenuItem>
                  <MenuItem value="Stopped">
                    <Checkbox checked={selectedStatuses?.indexOf('Stopped') > -1} />
                    <ListItemText primary="Stopped" />
                  </MenuItem>
                  <MenuItem value="Inprogress">
                    <Checkbox checked={selectedStatuses?.indexOf('Inprogress') > -1} />
                    <ListItemText primary="In Progress" />
                  </MenuItem>
                  <MenuItem value="Failed">
                    <Checkbox checked={selectedStatuses?.indexOf('Failed') > -1} />
                    <ListItemText primary="Error" />
                  </MenuItem>
                  <MenuItem value="Completed">
                    <Checkbox checked={selectedStatuses?.indexOf('Completed') > -1} />
                    <ListItemText primary="Completed" />
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Date Filter Dropdown */}
              <FormControl size="small" sx={{ flex: '0 1 170px', minWidth: 160 }}>
                <Select
                  value={dateFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDateFilter(value);
                    setShowCustomDatePickers(value === 'Custom Range');
                  }}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>Date Range</Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography sx={{ fontSize: '0.875rem' }}>{selected}</Typography>
                      </Box>
                    );
                  }}
                  sx={{
                    backgroundColor: 'white',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: '#FAFBFC',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                      boxShadow: '0 0 0 2px rgba(41, 102, 149, 0.1)',
                    },
                  }}
                >
                  <MenuItem value="">
                    <Typography sx={{ color: 'text.secondary' }}>None</Typography>
                  </MenuItem>
                  <MenuItem value="Today">Today</MenuItem>
                  <MenuItem value="Yesterday">Yesterday</MenuItem>
                  <MenuItem value="Last 7 Days">Last 7 Days</MenuItem>
                  <MenuItem value="Current Month">Current Month</MenuItem>
                  <MenuItem value="Last Month">Last Month</MenuItem>
                  <MenuItem value="Last 30 Days">Last 30 Days</MenuItem>
                  <Divider />
                  <MenuItem value="Custom Range">Custom Range</MenuItem>
                </Select>
              </FormControl>

              {/* Custom Date Range Pickers */}
              {showCustomDatePickers && (
                <>
                  <TextField
                    type="date"
                    size="small"
                    label="Start Date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      flex: '0 1 150px',
                      minWidth: 145,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: '#FAFBFC',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'white',
                          boxShadow: '0 0 0 2px rgba(41, 102, 149, 0.1)',
                        },
                      },
                    }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    label="End Date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      flex: '0 1 150px',
                      minWidth: 145,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: '#FAFBFC',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'white',
                          boxShadow: '0 0 0 2px rgba(41, 102, 149, 0.1)',
                        },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => loadReports(0, rowsPerPage)}
                    disabled={!customStartDate || !customEndDate}
                    sx={{
                      alignSelf: 'center',
                      px: 2.5,
                      boxShadow: '0 2px 8px rgba(41, 102, 149, 0.25)',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(41, 102, 149, 0.35)',
                      },
                    }}
                  >
                    Apply
                  </Button>
                </>
              )}

              {/* Clear Filters Button - Show when any filter is active */}
              {(searchText || selectedStatuses?.length > 0 || dateFilter) && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FilterAltOff sx={{ fontSize: 18 }} />}
                  onClick={handleClearFilters}
                  sx={{
                    alignSelf: 'center',
                    px: 2,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'error.main',
                      backgroundColor: 'rgba(211, 47, 47, 0.04)',
                      color: 'error.main',
                    },
                  }}
                >
                  Clear All
                </Button>
              )}
            </Box>

            {/* Right side - Action buttons */}
            {/* <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
              <Tooltip title="Refresh Results" arrow>
                <IconButton
                  onClick={() => loadReports(page * rowsPerPage, rowsPerPage)}
                  disabled={loading}
                  size="small"
                  sx={{
                    width: 36,
                    height: 36,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'white',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      borderColor: 'primary.main',
                      color: 'white',
                      transform: 'rotate(180deg)',
                    },
                    '&:disabled': {
                      backgroundColor: '#FAFBFC',
                    },
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download Reports" arrow>
                <IconButton
                  onClick={() => {
                    // TODO: Implement download functionality
                    console.log('Download reports');
                  }}
                  size="small"
                  sx={{
                    width: 36,
                    height: 36,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'white',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      borderColor: 'primary.main',
                      color: 'white',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Download fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box> */}
          </Box>
        </Box>
      </Box>

      {/* Table Section */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <ContentLoader message="Loading data pull reports..." minHeight="500px" />
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                <TableCell sx={{ width: '80px' }} align="center">ID</TableCell>
                <TableCell>Request Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Processed Date</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Updated By</TableCell>
                <TableCell>Updated Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports && reports?.length > 0 ? (
              reports?.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.04)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                  <TableCell align="center">
                    <Chip
                      label={row.id}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(41, 102, 149, 0.08)',
                        color: '#296695',
                        border: '1px solid rgba(41, 102, 149, 0.2)',
                        minWidth: '50px',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {row.requestName || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status || 'Unknown'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        ...getStatusChipStyle(row.status),
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.createdDate ? row.createdDate?.split(' ')[0] : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.processedDate ? row.processedDate?.split(' ')[0] : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.createdBy || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.updatedBy || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.updatedDate ? row.updatedDate?.split(' ')[0] : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                       {/* Edit Icon - Enabled for Waiting, Failed, Pending */}
                      <Tooltip 
                        title={['Waiting', 'Failed', 'Pending'].includes(row.status) 
                          ? "Edit request" 
                          : "Edit not available for this status"
                        }
                        arrow
                      >
                         <span>
                          <IconButton
                            size="small"
                            disabled={!['Waiting', 'Failed', 'Pending'].includes(row.status)}
                            onClick={() => navigate(`/dataPullRequests/edit/${row.id}`)}
                            sx={{
                              color: ['Waiting', 'Failed', 'Pending'].includes(row.status) ? 'primary.main' : 'text.disabled',
                              '&:hover': {
                                backgroundColor: ['Waiting', 'Failed', 'Pending'].includes(row.status) ? 'rgba(41, 102, 149, 0.12)' : 'transparent',
                              },
                              '&.Mui-disabled': {
                                color: 'text.disabled',
                                opacity: 0.3,
                              },
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* Duplicate Icon - Enabled for all statuses */}
                      <Tooltip title="Duplicate request" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleDuplicate(row.id)}
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'rgba(41, 102, 149, 0.12)',
                            },
                          }}
                        >
                          <FileCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Stats Icon - Enabled for all statuses */}
                       <Tooltip
                        title={row.status === 'Completed'
                          ? "View stats"
                          : "Stats available only for completed requests"
                        }
                        arrow
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={row.status !== 'Completed'}
                            onClick={() => handleOpenStats(row.id)}
                            sx={{
                              color: row.status === 'Completed' ? 'success.main' : 'text.disabled',
                              '&:hover': {
                                backgroundColor: row.status === 'Completed' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                              },
                              '&.Mui-disabled': {
                                color: 'text.disabled',
                                opacity: 0.3,
                              },
                            }}
                          >
                            <Assessment fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* File Generation Icon - Enabled for all statuses */}
                     <Tooltip
                        title={row.status === 'Completed'
                          ? "Generate files"
                          : "File generation available only for completed requests"
                        }
                        arrow
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={row.status !== 'Completed'}
                            onClick={() => handleOpenFileGeneration(row.id)}
                            sx={{
                              color: row.status === 'Completed' ? 'info.main' : 'text.disabled',
                              '&:hover': {
                                backgroundColor: row.status === 'Completed' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                              },
                              '&.Mui-disabled': {
                                color: 'text.disabled',
                                opacity: 0.3,
                              },
                            }}
                          >
                            <Description fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* Stop Icon - Enabled for Waiting and Pending */}
                      <Tooltip
                        title={['Waiting', 'Pending'].includes(row.status)
                          ? "Stop request"
                          : "Stop not available for this status"
                        }
                        arrow
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={!['Waiting', 'Pending'].includes(row.status)}
                            onClick={() => handleStopRequest(row.id)}
                            sx={{
                              color: ['Waiting', 'Pending'].includes(row.status) ? 'error.main' : 'text.disabled',
                              '&:hover': {
                                backgroundColor: ['Waiting', 'Pending'].includes(row.status) ? 'rgba(244, 67, 54, 0.12)' : 'transparent',
                              },
                              '&.Mui-disabled': {
                                color: 'text.disabled',
                                opacity: 0.3,
                              },
                            }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No reports available
                  </Typography>
                </TableCell>
              </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {!loading && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          />
        )}
      </TableContainer>

      {/* File Details Dialog */}
      <Dialog
        open={fileDialogOpen}
        onClose={handleCloseFileDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
          },
        }}
      >
        <DialogTitle sx={{ pb: 2, fontWeight: 700 }}>File Details</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                  <TableCell>File Name</TableCell>
                  <TableCell align="right">Record Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedFileDetails?.map((file, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {file.fileName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={file.count.toLocaleString()}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* File Generation Dialog */}
      <Dialog
        open={fileGenerationDialogOpen}
        onClose={handleCloseFileGeneration}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '85vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.5,
            px: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D3748', fontSize: '1.1rem' }}>
              Generate Files
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mt: 0.25 }}>
              Configure output settings for Request #{selectedRequestId}
            </Typography>
          </Box>
          <IconButton onClick={handleCloseFileGeneration} size="small" sx={{ p: 0.5 }}>
            <Close sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ py: 2, px: 2, backgroundColor: '#FAFBFC' }}>
          {fileGenLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={40} />
            </Box>
          ) : (
            <>
              {/* Manage Custom Output Destinations Section */}
              <Paper
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  onClick={() => setAddDestinationExpanded(!addDestinationExpanded)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    borderBottom: addDestinationExpanded ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&:hover': { backgroundColor: '#F8FAFB' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <CloudUpload sx={{ color: '#296695', fontSize: 18 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem' }}>
                        Manage Custom Output Destinations
                      </Typography>
                    
                    </Box>
                    {customDestinations?.length > 0 && (
                      <Chip
                        label={`${customDestinations?.length} created`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          backgroundColor: '#E0F2FE',
                          color: '#0369A1',
                        }}
                      />
                    )}
                  </Box>
                  <ExpandMore
                    sx={{
                      transform: addDestinationExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                      color: '#6B7280',
                    }}
                  />
                </Box>

                <Collapse in={addDestinationExpanded}>
                  <Box sx={{ p: 2.5, backgroundColor: '#F9FAFB' }}>
                    {/* Destination Creation Form */}
                    <Paper
                      id="destination-form"
                      elevation={0}
                      sx={{
                        mb: customDestinations?.length > 0 ? 3 : 0,
                        p: 2.5,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: editingDestinationId ? '#F59E0B' : '#E5E7EB',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Settings sx={{ fontSize: 18, color: '#296695' }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.875rem' }}>
                            {editingDestinationId ? 'Edit Output Destination' : 'Add Output Destination'}
                          </Typography>
                        </Box>
                        {editingDestinationId && (
                          <Chip
                            label="Editing Mode"
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                            }}
                          />
                        )}
                      </Box>

                      {/* Destination Name */}
                      <Box sx={{ mb: 2.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.8rem', color: '#374151' }}>
                          Destination Name
                          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                        </Typography>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="e.g., Production SFTP Server"
                          value={destinationName}
                          onChange={(e) => setDestinationName(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#FAFBFC',
                            }
                          }}
                        />
                      </Box>

                      {/* Destination Type */}
                      <Box sx={{ mb: 2.5 }}>
                        <FormControl component="fieldset" fullWidth>
                          <FormLabel component="legend" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1, color: '#374151' }}>
                            Destination Type
                          </FormLabel>
                          <RadioGroup
                            row
                            value={destinationType}
                            onChange={(e) => {
                              setDestinationType(e.target.value as 'SFTP' | 'S3' | 'NFS');
                              // Reset type-specific fields
                              setDestHost('');
                              setDestPort('');
                              setDestPath('');
                              setDestBucket('');
                              setDestRegion('');
                              setDestUsername('');
                              setDestPassword('');
                              setDestAccessKey('');
                              setDestSecretKey('');
                            }}
                            sx={{
                              gap: 1,
                              '& .MuiFormControlLabel-root': {
                                border: '1px solid #E5E7EB',
                                borderRadius: 1,
                                px: 1.5,
                                py: 0.5,
                                m: 0,
                                '&:has(.Mui-checked)': {
                                  borderColor: '#296695',
                                  backgroundColor: '#F0F9FF',
                                }
                              }
                            }}
                          >
                            <FormControlLabel
                              value="SFTP"
                              control={<Radio size="small" />}
                              label={<Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>SFTP</Typography>}
                            />
                            <FormControlLabel
                              value="S3"
                              control={<Radio size="small" />}
                              label={<Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>AWS S3</Typography>}
                            />
                          </RadioGroup>
                        </FormControl>
                      </Box>

                      <Divider sx={{ my: 2.5 }} />

                      {/* SFTP Configuration */}
                      {destinationType === 'SFTP' && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', display: 'block', mb: 2, fontSize: '0.85rem' }}>
                            SFTP Configuration
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                                Host<Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                              </Typography>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="sftp.example.com"
                                value={destHost}
                                onChange={(e) => setDestHost(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                              />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                                Port<Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                              </Typography>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="22"
                                value={destPort}
                                onChange={(e) => setDestPort(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                              Path
                            </Typography>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="/output/data"
                              value={destPath}
                              onChange={(e) => setDestPath(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                                Username
                              </Typography>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="sftp_user"
                                value={destUsername}
                                onChange={(e) => setDestUsername(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                              />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                                Password
                              </Typography>
                              <TextField
                                size="small"
                                fullWidth
                                type="password"
                                placeholder="••••••••"
                                value={destPassword}
                                onChange={(e) => setDestPassword(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {/* S3 Configuration */}
                      {destinationType === 'S3' && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', display: 'block', mb: 2, fontSize: '0.85rem' }}>
                            AWS S3 Configuration
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                                Bucket Name<Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                              </Typography>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="my-output-bucket"
                                value={destBucket}
                                onChange={(e) => setDestBucket(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                              />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                                Region<Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                              </Typography>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="us-east-1"
                                value={destRegion}
                                onChange={(e) => setDestRegion(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                              Path/Prefix
                            </Typography>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="output/data/"
                              value={destPath}
                              onChange={(e) => setDestPath(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                            />
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                              Access Key
                            </Typography>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="AKIA..."
                              value={destAccessKey}
                              onChange={(e) => setDestAccessKey(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                            />
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 1, color: '#374151' }}>
                              Secret Key<Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                            </Typography>
                            <TextField
                              size="small"
                              fullWidth
                              type="password"
                              placeholder="Enter secret key"
                              value={destSecretKey}
                              onChange={(e) => setDestSecretKey(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#FAFBFC' } }}
                            />
                          </Box>
                        </Box>
                      )}

                      {/* Action Buttons */}
                      <Divider sx={{ my: 2.5 }} />
                      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                        {editingDestinationId ? (
                          <>
                            <Button
                              variant="outlined"
                              size="medium"
                              onClick={handleCancelEdit}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.8rem',
                                px: 2.5,
                                borderColor: '#D1D5DB',
                                color: '#6B7280',
                                '&:hover': {
                                  borderColor: '#9CA3AF',
                                  backgroundColor: '#F9FAFB',
                                }
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="contained"
                              size="medium"
                              onClick={handleSaveDestination}
                              startIcon={<Save />}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.8rem',
                                px: 2.5,
                                boxShadow: '0 2px 8px rgba(41, 102, 149, 0.25)',
                              }}
                            >
                              Update Destination
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outlined"
                              size="medium"
                              onClick={resetDestinationForm}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.8rem',
                                px: 2.5,
                                borderColor: '#D1D5DB',
                                color: '#6B7280',
                                '&:hover': {
                                  borderColor: '#9CA3AF',
                                  backgroundColor: '#F9FAFB',
                                }
                              }}
                            >
                              Reset Form
                            </Button>
                            <Button
                              variant="contained"
                              size="medium"
                              onClick={handleSaveDestination}
                              startIcon={<Add />}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.8rem',
                                px: 2.5,
                                boxShadow: '0 2px 8px rgba(41, 102, 149, 0.25)',
                              }}
                            >
                              Add Destination
                            </Button>
                          </>
                        )}
                      </Box>
                    </Paper>

                    {/* List of Created Destinations */}
                    {customDestinations?.length > 0 && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Storage sx={{ fontSize: 18, color: '#296695' }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.875rem' }}>
                            Created Destinations
                          </Typography>
                          <Chip
                            label={customDestinations?.length}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#E0F2FE',
                              color: '#0369A1',
                            }}
                          />
                        </Box>
                        <Stack spacing={1.5}>
                          {customDestinations?.map((dest) => {
                            const isEditing = editingDestinationId === dest.id;
                            return (
                              <Paper
                                key={dest.id}
                                elevation={0}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  p: 2,
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: 1.5,
                                  border: '2px solid',
                                  borderColor: isEditing ? '#F59E0B' : '#E5E7EB',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    borderColor: isEditing ? '#F59E0B' : '#D1D5DB',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                  }
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      px: 1,
                                      py: 0.5,
                                      borderRadius: 1,
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      backgroundColor: dest.type === 'SFTP' ? '#DCFCE7' : dest.type === 'S3' ? '#FEF3C7' : '#DBEAFE',
                                      color: dest.type === 'SFTP' ? '#047857' : dest.type === 'S3' ? '#92400E' : '#1E40AF',
                                    }}
                                  >
                                    {dest.type}
                                  </Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#1F2937' }}>
                                      {dest.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                                      {dest.type === 'SFTP' && dest.host && `${dest.host}:${dest.port}`}
                                      {dest.type === 'S3' && dest.bucket && `Bucket: ${dest.bucket}`}
                                    </Typography>
                                  </Box>
                                  {isEditing && (
                                    <Chip
                                      label="Editing"
                                      size="small"
                                      sx={{
                                        height: 22,
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        backgroundColor: '#FEF3C7',
                                        color: '#92400E',
                                      }}
                                    />
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Tooltip title="Edit destination" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditDestination(dest)}
                                      sx={{
                                        color: '#296695',
                                        '&:hover': { backgroundColor: 'rgba(41, 102, 149, 0.08)' }
                                      }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete destination" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteDestination(dest.id)}
                                      sx={{
                                        color: '#DC2626',
                                        '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.08)' }
                                      }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Paper>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Paper>

              {/* Field Mapping Section */}
              <Paper
                elevation={0}
                sx={{
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  onClick={() => setFieldMappingExpanded(!fieldMappingExpanded)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    borderBottom: fieldMappingExpanded ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&:hover': { backgroundColor: '#F8FAFB' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <AccountTree sx={{ color: '#296695', fontSize: 18 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2D3748', fontSize: '0.85rem' }}>
                        Field Mapping
                      </Typography>
                    </Box>
                    {fieldMappings?.length > 0 && (
                      <Chip
                        label={`${fieldMappings?.length} mapping${fieldMappings?.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          backgroundColor: '#E0F2FE',
                          color: '#0369A1',
                        }}
                      />
                    )}
                  </Box>
                  <ExpandMore
                    sx={{
                      transform: fieldMappingExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                      color: '#6B7280',
                    }}
                  />
                </Box>

                <Collapse in={fieldMappingExpanded}>
                  <Box sx={{ p: 2.5, backgroundColor: '#F9FAFB' }}>
                    {/* Field Mapping Creation Form */}
                    <Paper
                      elevation={0}
                      sx={{
                        mb: fieldMappings?.length > 0 ? 3 : 0,
                        p: 2.5,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: editingMappingId ? '#F59E0B' : '#E5E7EB',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Settings sx={{ fontSize: 18, color: '#296695' }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#1F2937' }}>
                            {editingMappingId ? 'Edit Field Mapping' : 'Create Field Mapping'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Target Field Name */}
                      <Box sx={{ mb: 2.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', fontSize: '0.875rem' }}>
                          Target Field Name
                          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          value={mappingFieldName}
                          onChange={(e) => setMappingFieldName(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#FAFBFC',
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                          The unified field name that will appear in the output
                        </Typography>
                      </Box>

                      {/* Select Sources */}
                      <Box sx={{ mb: 2.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', fontSize: '0.875rem' }}>
                          Select Sources
                          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                        </Typography>
                        <Select
                          fullWidth
                          multiple
                          size="small"
                          value={mappingSelectedSources}
                          onChange={(e) => {
                            const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                            setMappingSelectedSources(value);
                            setMappingSelectedColumns([]);
                          }}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected?.map((value) => (
                                <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                              ))}
                            </Box>
                          )}
                          displayEmpty
                        >
                          <MenuItem disabled value="">
                            <em>Select sources...</em>
                          </MenuItem>
                          {availableInputSources?.map((source) => (
                            <MenuItem key={source.id} value={source.inputSource}>
                              <Checkbox checked={mappingSelectedSources?.indexOf(source.inputSource) > -1} size="small" />
                              <ListItemText primary={source.inputSource} />
                            </MenuItem>
                          ))}
                        </Select>
                      </Box>

                      {/* Select Columns */}
                      <Box sx={{ mb: 2.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', fontSize: '0.875rem' }}>
                          Select Columns
                          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                        </Typography>
                        <Select
                          fullWidth
                          multiple
                          size="small"
                          value={mappingSelectedColumns}
                          onChange={(e) => {
                            const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                            setMappingSelectedColumns(value);
                          }}
                          disabled={mappingSelectedSources?.length === 0}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected?.map((value) => {
                                const [, fieldName] = value?.split('::');
                                return <Chip key={value} label={fieldName} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />;
                              })}
                            </Box>
                          )}
                          displayEmpty
                        >
                          <MenuItem disabled value="">
                            <em>{mappingSelectedSources?.length === 0 ? 'Select sources first' : 'Select columns...'}</em>
                          </MenuItem>
                          {mappingSelectedSources?.length > 0 &&
                            (() => {
                              const columnsWithSources: Array<{ value: string; label: string; sourceName: string }> = [];
                              mappingSelectedSources?.forEach((sourceName) => {
                                const source = availableInputSources?.find((s) => s.inputSource === sourceName);
                                if (source) {
                                  source.headers?.forEach((header) => {
                                    columnsWithSources?.push({
                                      value: `${source.id}::${header}`,
                                      label: `${header} → ${sourceName}`,
                                      sourceName,
                                    });
                                  });
                                }
                              });
                              return columnsWithSources?.map((col) => (
                                <MenuItem key={col.value} value={col.value}>
                                  <Checkbox checked={mappingSelectedColumns?.indexOf(col.value) > -1} size="small" />
                                  <ListItemText primary={col.label} />
                                </MenuItem>
                              ));
                            })()}
                        </Select>
                        <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                          Select fields from different sources that should map to the target field name
                        </Typography>
                      </Box>

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                        {editingMappingId && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setEditingMappingId(null);
                              setMappingFieldName('');
                              setMappingSelectedSources([]);
                              setMappingSelectedColumns([]);
                            }}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.8rem',
                              px: 2,
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={editingMappingId ? <Edit /> : <Add />}
                          onClick={() => {
                            if (!mappingFieldName?.trim()) {
                              alert('Please enter a target field name');
                              return;
                            }
                            if (mappingSelectedSources?.length === 0) {
                              alert('Please select at least one source');
                              return;
                            }
                            if (mappingSelectedColumns?.length === 0) {
                              alert('Please select at least one column');
                              return;
                            }

                            if (editingMappingId) {
                              // Update existing mapping
                              setFieldMappings(
                                fieldMappings?.map((m) =>
                                  m.id === editingMappingId
                                    ? { ...m, fieldName: mappingFieldName, selectedSources: mappingSelectedSources, selectedColumns: mappingSelectedColumns }
                                    : m
                                )
                              );
                              setEditingMappingId(null);
                            } else {
                              // Add new mapping
                              setFieldMappings([
                                ...fieldMappings,
                                {
                                  id: Date.now().toString(),
                                  fieldName: mappingFieldName,
                                  selectedSources: mappingSelectedSources,
                                  selectedColumns: mappingSelectedColumns,
                                },
                              ]);
                            }

                            // Reset form
                            setMappingFieldName('');
                            setMappingSelectedSources([]);
                            setMappingSelectedColumns([]);
                          }}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            px: 2.5,
                            backgroundColor: '#10B981',
                            '&:hover': {
                              backgroundColor: '#059669',
                            },
                          }}
                        >
                          {editingMappingId ? 'Update Mapping' : 'Add Mapping'}
                        </Button>
                      </Box>
                    </Paper>

                    {/* Field Mappings List */}
                    {fieldMappings?.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#2D3748', fontSize: '0.875rem' }}>
                          Configured Mappings ({fieldMappings?.length})
                        </Typography>
                        <TableContainer
                          component={Paper}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            maxHeight: 300,
                          }}
                        >
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                                <TableCell sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem' }}>Target Field</TableCell>
                                <TableCell sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem' }}>Mapped Columns</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem', width: 100 }}>
                                  Actions
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {fieldMappings?.map((mapping) => (
                                <TableRow
                                  key={mapping.id}
                                  hover
                                  sx={{
                                    backgroundColor: editingMappingId === mapping.id ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                                  }}
                                >
                                  <TableCell sx={{ py: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'primary.main' }}>
                                      {mapping.fieldName}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ py: 1 }}>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {mapping.selectedColumns?.slice(0, 3).map((columnValue) => {
                                        const [, fieldName] = columnValue?.split('::');
                                        return (
                                          <Chip
                                            key={columnValue}
                                            label={fieldName}
                                            size="small"
                                            sx={{
                                              height: 18,
                                              fontSize: '0.65rem',
                                              backgroundColor: '#10B98120',
                                              color: '#10B981',
                                            }}
                                          />
                                        );
                                      })}
                                      {mapping.selectedColumns?.length > 3 && (
                                        <Chip
                                          label={`+${mapping.selectedColumns?.length - 3}`}
                                          size="small"
                                          sx={{
                                            height: 18,
                                            fontSize: '0.65rem',
                                            backgroundColor: '#F59E0B20',
                                            color: '#F59E0B',
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center" sx={{ py: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setEditingMappingId(mapping.id);
                                          setMappingFieldName(mapping.fieldName);
                                          setMappingSelectedSources(mapping.selectedSources);
                                          setMappingSelectedColumns(mapping.selectedColumns);
                                        }}
                                        sx={{
                                          color: 'info.main',
                                          padding: '2px',
                                          '&:hover': {
                                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                          },
                                        }}
                                      >
                                        <Edit sx={{ fontSize: 16 }} />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          if (window.confirm('Are you sure you want to delete this mapping?')) {
                                            setFieldMappings(fieldMappings?.filter((m) => m.id !== mapping.id));
                                            if (editingMappingId === mapping.id) {
                                              setEditingMappingId(null);
                                              setMappingFieldName('');
                                              setMappingSelectedSources([]);
                                              setMappingSelectedColumns([]);
                                            }
                                          }
                                        }}
                                        sx={{
                                          color: 'error.main',
                                          padding: '2px',
                                          '&:hover': {
                                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                          },
                                        }}
                                      >
                                        <Delete sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Paper>

              {/* Main Configuration Section */}
              <Paper
                elevation={0}
                sx={{
                  mb: 2,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  backgroundColor: '#FFFFFF',
                }}
              >
                {/* Section Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                  <Settings sx={{ color: '#296695', fontSize: 20 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1F2937', fontSize: '0.95rem' }}>
                      File Generation Configuration
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.7rem' }}>
                      Configure input sources, output fields, and processing options
                    </Typography>
                  </Box>
                </Box>

                {/* Input Sources Dropdown (Multi-select) */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', fontSize: '0.825rem' }}>
                    Input Sources
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                  </Typography>
                <Select
                  fullWidth
                  multiple
                  value={selectedInputSources}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                    setSelectedInputSources(value);
                    setSelectedOutputFields([]);
                    // Initialize priority order with selected sources order
                    setPriorityOrder(value);
                    setFieldPriorityOrder([]);
                    // Reset combine sources if only one source is selected
                    if (value?.length <= 1) {
                      setCombineSources(false);
                    }
                  }}
                  displayEmpty
                  size="small"
                  renderValue={(selected) => {
                    if (selected?.length === 0) {
                      return <em>Select Input Sources</em>;
                    }
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected?.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    );
                  }}
                >
                  <MenuItem disabled value="">
                    <em>Select Input Sources</em>
                  </MenuItem>
                  {availableInputSources?.map((source) => (
                    <MenuItem key={source.id} value={source.inputSource}>
                      <Checkbox checked={selectedInputSources?.indexOf(source.inputSource) > -1} size="small" />
                      <ListItemText primary={source.inputSource} />
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* Combine Sources Checkbox (shown when multiple sources selected) */}
              {selectedInputSources?.length > 1 && (
                <Box sx={{ mb: 2, ml: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={combineSources}
                      onChange={(e) => setCombineSources(e.target.checked)}
                      size="small"
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>
                      Combine Sources
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
                    Merge all selected sources into a single output
                  </Typography>
                </Box>
              )}

                {/* Output Fields Dropdown */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', fontSize: '0.875rem' }}>
                    Output Fields
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                  </Typography>
                <Select
                  fullWidth
                  multiple
                  value={selectedOutputFields}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                    setSelectedOutputFields(value);
                  }}
                  disabled={selectedInputSources?.length === 0}
                  displayEmpty
                  size="small"
                  renderValue={(selected) => {
                    if (selected?.length === 0) {
                      return <em>{selectedInputSources?.length > 0 ? 'Select Output Fields' : 'Select input sources first'}</em>;
                    }
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected?.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    );
                  }}
                >
                  <MenuItem disabled value="">
                    <em>{selectedInputSources?.length > 0 ? 'Select Output Fields' : 'Select input sources first'}</em>
                  </MenuItem>
                  {selectedInputSources?.length > 0 &&
                    (() => {
                      let availableHeaders: string[] = [];

                      if (selectedInputSources?.length === 1) {
                        // Single source: show all headers from that source (with mappings applied)
                        const source = availableInputSources?.find((s) => s.inputSource === selectedInputSources[0]);
                        const sourceId = source?.id.toString() || '';
                        const originalHeaders = source?.headers || [];

                        // Apply field mappings
                        const fieldsMap = new Map<string, string>();
                        originalHeaders?.forEach((field) => {
                          const mapping = fieldMappings?.find((m) =>
                            m.selectedColumns?.some((col) => {
                              const [colSourceId, colFieldName] = col?.split('::');
                              return colSourceId === sourceId && colFieldName === field;
                            })
                          );

                          if (mapping) {
                            fieldsMap.set(field, mapping.fieldName);
                          } else {
                            fieldsMap.set(field, field);
                          }
                        });

                        availableHeaders = Array.from(new Set(fieldsMap.values()));
                      } else {
                        // Multiple sources: show only common headers (intersection, with mappings applied)
                        const allSourceFieldSets: Set<string>[] = [];

                        selectedInputSources?.forEach((sourceName) => {
                          const source = availableInputSources?.find((s) => s.inputSource === sourceName);
                          if (source) {
                            const sourceId = source.id.toString();
                            const sourceFields = new Set<string>();
                            const originalHeaders = source.headers || [];

                            originalHeaders?.forEach((field) => {
                              const mapping = fieldMappings?.find((m) =>
                                m.selectedColumns?.some((col) => {
                                  const [colSourceId, colFieldName] = col?.split('::');
                                  return colSourceId === sourceId && colFieldName === field;
                                })
                              );

                              // Use mapped field name if exists, otherwise use original
                              const displayFieldName = mapping ? mapping.fieldName : field;
                              sourceFields.add(displayFieldName?.toLowerCase()); // Case-insensitive comparison
                            });

                            allSourceFieldSets?.push(sourceFields);
                          }
                        });

                        if (allSourceFieldSets?.length > 0) {
                          // Find intersection of all field sets (fields common to ALL selected sources)
                          const intersection = Array.from(allSourceFieldSets[0]).filter((field) =>
                            allSourceFieldSets?.every((fieldSet) => fieldSet.has(field))
                          );

                          // Get the original casing from the first source
                          const firstSource = availableInputSources?.find((s) => s.inputSource === selectedInputSources[0]);
                          if (firstSource) {
                            const firstSourceId = firstSource.id.toString();
                            availableHeaders = intersection?.map((fieldLower) => {
                              const originalField = firstSource.headers?.find((h) => h?.toLowerCase() === fieldLower);
                              if (originalField) {
                                // Check if there's a mapping for this field
                                const mapping = fieldMappings?.find((m) =>
                                  m.selectedColumns?.some((col) => {
                                    const [, colFieldName] = col?.split('::');
                                    return colFieldName?.toLowerCase() === fieldLower;
                                  })
                                );
                                return mapping ? mapping.fieldName : originalField;
                              }
                              return fieldLower;
                            });
                          }
                        }
                      }

                      return availableHeaders?.map((field) => (
                        <MenuItem key={field} value={field}>
                          <Checkbox checked={selectedOutputFields?.indexOf(field) > -1} size="small" />
                          <ListItemText primary={field} />
                        </MenuItem>
                      ));
                    })()}
                </Select>
              </Box>

                {/* Priority Order (shown when combine sources is checked) */}
                {combineSources && selectedInputSources?.length > 1 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', fontSize: '0.875rem' }}>
                      Priority Order
                      <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                    </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      mb: 1,
                      px: 1,
                      py: 0.75,
                      backgroundColor: '#F0FDF4',
                      borderRadius: 1,
                      border: '1px solid #10B981',
                    }}
                  >
                    <DragIndicator sx={{ fontSize: 16, color: '#10B981' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#047857' }}>
                      Drag to reorder input sources
                    </Typography>
                  </Box>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePriorityOrderDragEnd}>
                    <SortableContext items={priorityOrder} strategy={verticalListSortingStrategy}>
                      {priorityOrder?.map((sourceId, index) => (
                        <SortableItem
                          key={sourceId}
                          id={sourceId}
                          sourceName={sourceId}
                          index={index}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </Box>
              )}

                {/* Field Priority Order (shown when combine sources is checked) */}
                {combineSources && selectedInputSources?.length > 1 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', fontSize: '0.875rem' }}>
                      Field Priority Order
                      <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                    </Typography>
                  <Select
                    fullWidth
                    multiple
                    value={fieldPriorityOrder}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value?.split(',') : e.target.value;
                      setFieldPriorityOrder(value);
                    }}
                    displayEmpty
                    size="small"
                    renderValue={(selected) => {
                      if (selected?.length === 0) {
                        return <em>Select fields for priority order</em>;
                      }
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected?.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      );
                    }}
                  >
                    <MenuItem disabled value="">
                      <em>Select fields for priority order</em>
                    </MenuItem>
                    {selectedOutputFields?.map((field) => (
                      <MenuItem key={field} value={field}>
                        <Checkbox checked={fieldPriorityOrder?.indexOf(field) > -1} size="small" />
                        <ListItemText primary={field} />
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Select which fields should have priority when combining sources
                  </Typography>
                </Box>
              )}

                {/* Limitation Section (shown when at least one source is selected) */}
                {selectedInputSources?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <FilterList sx={{ fontSize: 18, color: '#296695' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                        Limitations
                      </Typography>
                    </Box>
                  <Box sx={{ pl: 2 }}>
                    {/* Limit Records To Checkbox */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                          checked={limitRecords}
                          onChange={(e) => {
                            setLimitRecords(e.target.checked);
                            if (!e.target.checked) {
                              setRecordCount('');
                              setShuffleRecords(false);
                            }
                          }}
                          size="small"
                        />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>
                          Limit Records To
                        </Typography>
                      </Box>
                    </Box>

                    {/* Count Input and Shuffle Records (shown when Limit Records is checked) */}
                    {limitRecords && (
                      <Box sx={{ pl: 4, mb: 2 }}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: '#2D3748' }}>
                            Count
                            <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                          </Typography>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            placeholder="Enter record count"
                            value={recordCount}
                            onChange={(e) => setRecordCount(e.target.value)}
                            inputProps={{ min: 1 }}
                            sx={{ maxWidth: 300 }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Checkbox
                            checked={shuffleRecords}
                            onChange={(e) => setShuffleRecords(e.target.checked)}
                            size="small"
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#2D3748' }}>
                            Shuffle Records
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

                {/* Output Destination Section (shown when at least one source is selected) */}
                {selectedInputSources?.length > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <CloudUpload sx={{ fontSize: 18, color: '#296695' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                        Output Destination
                        <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                      </Typography>
                    </Box>
                  <Select
                    fullWidth
                    value={selectedDestination}
                    onChange={(e) => setSelectedDestination(e.target.value)}
                    displayEmpty
                    size="small"
                    onOpen={() => {}}
                  >
                    <MenuItem value="">
                      <em>Select Output Destination</em>
                    </MenuItem>

                    {/* Custom Destinations Section */}
                    {customDestinations?.length > 0 && [
                      <MenuItem key="custom-header" disabled>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280' }}>
                          Custom Destinations
                        </Typography>
                      </MenuItem>,
                      ...customDestinations?.map((dest) => (
                        <MenuItem key={`custom-${dest.id}`} value={dest.name}>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              px: 0.75,
                              py: 0.25,
                              mr: 1,
                              borderRadius: 0.5,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              backgroundColor: dest.type === 'SFTP' ? '#10B981' : dest.type === 'S3' ? '#F59E0B' : '#3B82F6',
                              color: '#fff',
                            }}
                          >
                            {dest.type}
                          </Box>
                          {dest.name}
                        </MenuItem>
                      ))
                    ]}

                    {/* Preconfigured Destinations Section */}
                    {availableDestinations?.length > 0 && [
                      customDestinations?.length > 0 && <Divider key="divider" sx={{ my: 0.5 }} />,
                      <MenuItem key="preconfigured-header" disabled>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280' }}>
                          Preconfigured Destinations
                        </Typography>
                      </MenuItem>,
                      ...availableDestinations?.map((dest) => (
                        <MenuItem key={`preconfigured-${dest.type}-${dest.id}`} value={dest.name}>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              px: 0.75,
                              py: 0.25,
                              mr: 1,
                              borderRadius: 0.5,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              backgroundColor: dest.type === 'NFS' ? '#3B82F6' : dest.type === 'SFTP' ? '#10B981' : '#F59E0B',
                              color: '#fff',
                            }}
                          >
                            {dest.type}
                          </Box>
                          {dest.name}
                        </MenuItem>
                      ))
                    ]}

                    {/* No destinations available */}
                    {availableDestinations?.length === 0 && customDestinations?.length === 0 && (
                      <MenuItem disabled>
                        <em>No destinations available</em>
                      </MenuItem>
                    )}
                  </Select>
                  {availableDestinations?.length === 0 && customDestinations?.length === 0 && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      No destinations available. Please refresh the page or create a custom destination above.
                    </Alert>
                  )}
                  </Box>
                )}
              </Paper>

              {/* Save Configuration Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSaveConfiguration}
                  disabled={
                    fileGenLoading ||
                    selectedInputSources?.length === 0 ||
                    selectedOutputFields?.length === 0 ||
                    (combineSources && selectedInputSources?.length > 1 && (priorityOrder?.length === 0 || fieldPriorityOrder?.length === 0)) ||
                    (limitRecords && !recordCount) ||
                    !selectedDestination
                  }
                  startIcon={<Save />}
                  sx={{
                    textTransform: 'none',
                    px: 4,
                    py: 1.25,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: '#296695',
                    boxShadow: '0 4px 12px rgba(41, 102, 149, 0.3)',
                    '&:hover': {
                      backgroundColor: '#1e4d6f',
                      boxShadow: '0 6px 16px rgba(41, 102, 149, 0.4)',
                    },
                    '&:disabled': {
                      backgroundColor: '#9CA3AF',
                      boxShadow: 'none',
                    }
                  }}
                >
                  {fileGenLoading ? 'Saving Configuration...' : 'Save Configuration'}
                </Button>
              </Box>

              {/* Output Configurations List */}
              {savedConfigurations?.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ p: 2.5, backgroundColor: '#F8FAFB', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Description sx={{ color: '#296695', fontSize: 22 }} />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1F2937', fontSize: '1rem' }}>
                          Saved Configurations
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>
                          {savedConfigurations?.length} configuration{savedConfigurations?.length !== 1 ? 's' : ''} ready for processing
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <TableContainer sx={{ backgroundColor: '#FFFFFF' }}>
                    <Table size="medium">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                          <TableCell sx={{ fontWeight: 600, width: 50, color: '#374151', fontSize: '0.8rem' }} />
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>Input Sources</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>Output Fields</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>Destination</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {savedConfigurations?.map((config) => {
                          const isExpanded = expandedConfigIds.has(config?.id || '');
                          const isCompleted = config?.status === 'Completed';
                          const canExpand = isCompleted;
                          return (
                            <>
                              <TableRow key={config?.id} hover>
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleToggleConfigExpand(config?.id || '')}
                                    disabled={!canExpand}
                                    sx={{
                                      color: !canExpand ? '#9CA3AF' : '#296695',
                                      cursor: !canExpand ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                  </IconButton>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {config?.inputSources?.slice(0, 2)?.map((source) => (
                                      <Chip
                                        key={source}
                                        label={source}
                                        size="small"
                                        sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                                      />
                                    ))}
                                    {config?.inputSources && config?.inputSources?.length > 2 && (
                                      <Chip
                                        label={`+${config?.inputSources?.length - 2} more`}
                                        size="small"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {config?.outputFields?.slice(0, 3)?.map((field) => (
                                      <Chip key={field} label={field} size="small" sx={{ fontSize: '0.7rem' }} />
                                    ))}
                                    {config?.outputFields && config?.outputFields?.length > 3 && (
                                      <Chip
                                        label={`+${config?.outputFields?.length - 3} more`}
                                        size="small"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {config?.destination && (
                                    <Chip
                                      label={config?.destination}
                                      size="small"
                                      sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        backgroundColor: '#E0F2FE',
                                        color: '#0369A1',
                                      }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {config?.status && (
                                    <Chip
                                      label={config?.status}
                                      size="small"
                                      sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        backgroundColor: '#8B5CF6',
                                        color: '#fff',
                                      }}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <Box sx={{ p: 3, backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                                      {/* Show Output Details Table for Completed status */}
                                      {isCompleted && config?.outputDetails && config?.outputDetails?.length > 0 ? (
                                        <>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                            <Description sx={{ fontSize: 18, color: '#296695' }} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                                              Output Files
                                            </Typography>
                                          </Box>
                                          <TableContainer
                                            component={Paper}
                                            sx={{
                                              border: '1px solid',
                                              borderColor: 'divider',
                                              borderRadius: 1,
                                            }}
                                          >
                                            <Table size="small">
                                              <TableHead>
                                                <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                                                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#374151' }}>
                                                    Filename
                                                  </TableCell>
                                                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#374151' }}>
                                                    Output Full Path
                                                  </TableCell>
                                                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#374151' }}>
                                                    Records Count
                                                  </TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {config?.outputDetails?.map((output, idx) => (
                                                  <TableRow key={idx} hover>
                                                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                      {output?.filename || '-'}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#6B7280' }}>
                                                      {output?.outputFullPath || '-'}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      <Chip
                                                        label={output?.recordsCount?.toLocaleString() || '0'}
                                                        size="small"
                                                        sx={{
                                                          fontSize: '0.7rem',
                                                          fontWeight: 600,
                                                          backgroundColor: '#10B98120',
                                                          color: '#10B981',
                                                        }}
                                                      />
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </TableContainer>
                                        </>
                                      ) : (
                                        <>
                                          {/* Show Configuration Details for non-Completed status */}
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                            <Settings sx={{ fontSize: 18, color: '#296695' }} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
                                              Configuration Details
                                            </Typography>
                                          </Box>

                                          {/* All Input Sources */}
                                          <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280', display: 'block', mb: 0.5 }}>
                                              All Input Sources
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                              {config?.inputSources?.map((source) => (
                                                <Chip key={source} label={source} size="small" sx={{ fontSize: '0.7rem' }} />
                                              ))}
                                            </Box>
                                          </Box>

                                          {/* All Output Fields */}
                                          <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280', display: 'block', mb: 0.5 }}>
                                              All Output Fields
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                              {config?.outputFields?.map((field) => (
                                                <Chip key={field} label={field} size="small" sx={{ fontSize: '0.7rem' }} />
                                              ))}
                                            </Box>
                                          </Box>

                                          {/* Combine Sources */}
                                          {config?.inputSources && config?.inputSources?.length > 1 && (
                                            <Box sx={{ mb: 2 }}>
                                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280', display: 'block', mb: 0.5 }}>
                                                Combine Sources
                                              </Typography>
                                              <Chip
                                                label={config?.combineSources ? 'Yes' : 'No'}
                                                size="small"
                                                color={config?.combineSources ? 'success' : 'default'}
                                                sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                                              />
                                            </Box>
                                          )}

                                          {/* Priority Order */}
                                          {config?.priorityOrder && config?.priorityOrder?.length > 0 && (
                                            <Box sx={{ mb: 2 }}>
                                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280', display: 'block', mb: 0.5 }}>
                                                Priority Order
                                              </Typography>
                                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {config?.priorityOrder?.map((source, idx) => (
                                                  <Box key={source} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Chip
                                                      label={idx + 1}
                                                      size="small"
                                                      sx={{
                                                        backgroundColor: '#10B981',
                                                        color: '#fff',
                                                        minWidth: 20,
                                                        height: 20,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                      }}
                                                    />
                                                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                      {source}
                                                    </Typography>
                                                  </Box>
                                                ))}
                                              </Box>
                                            </Box>
                                          )}

                                          {/* Field Priority Order */}
                                          {config?.fieldPriorityOrder && config?.fieldPriorityOrder?.length > 0 && (
                                            <Box sx={{ mb: 2 }}>
                                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280', display: 'block', mb: 0.5 }}>
                                                Field Priority Order
                                              </Typography>
                                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {config?.fieldPriorityOrder?.map((field) => (
                                                  <Chip key={field} label={field} size="small" sx={{ fontSize: '0.7rem' }} />
                                                ))}
                                              </Box>
                                            </Box>
                                          )}

                                          {/* Limitations */}
                                          {config?.limitations && (
                                            <Box sx={{ mb: 2 }}>
                                              <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280', display: 'block', mb: 0.5 }}>
                                                Limitations
                                              </Typography>
                                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {config?.limitations?.limitRecords ? (
                                                  <>
                                                    <Chip
                                                      label={`Limit: ${config?.limitations?.recordCount || 0} records`}
                                                      size="small"
                                                      sx={{ fontSize: '0.7rem', backgroundColor: '#FEF3C7', color: '#92400E' }}
                                                    />
                                                    {config?.limitations?.shuffleRecords && (
                                                      <Chip
                                                        label="Shuffle Records"
                                                        size="small"
                                                        sx={{ fontSize: '0.7rem', backgroundColor: '#DBEAFE', color: '#1E40AF' }}
                                                      />
                                                    )}
                                                  </>
                                                ) : (
                                                  <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                                    No limitations
                                                  </Typography>
                                                )}
                                              </Box>
                                            </Box>
                                          )}
                                        </>
                                      )}
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCloseFileGeneration}
            startIcon={<Close sx={{ fontSize: '1rem' }} />}
            sx={{
              px: 2.5,
              py: 0.625,
              textTransform: 'none',
              fontSize: '0.8rem',
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Configuration Dialog */}
      <StatsConfigDialog
        open={statsDialogOpen}
        onClose={handleCloseStats}
        requestId={statsRequestId}
        initialReportData={selectedReportData}
      />
    </Box>
  );
};

export default ReportPage;
