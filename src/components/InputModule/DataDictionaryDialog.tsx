import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import { Close, Search, FileDownload, ExpandMore } from '@mui/icons-material';

interface DataDictionaryField {
  fieldName: string;
  description: string;
  availableValues: string;
}

interface TableData {
  name: string;
  description: string;
  fields: DataDictionaryField[];
}

interface DataDictionaryDialogProps {
  open: boolean;
  onClose: () => void;
  tableName: string;
  fields: DataDictionaryField[];
  allTables?: TableData[]; // NEW: For showing all tables when none selected
  showAllTables?: boolean; // NEW: Flag to show all-tables mode
}

const DataDictionaryDialog: React.FC<DataDictionaryDialogProps> = ({
  open,
  onClose,
  tableName,
  fields,
  allTables = [],
  showAllTables = false,
}) => {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [tableSearchQueries, setTableSearchQueries] = useState<Record<string, string>>({});

  // Single table mode: filter fields based on search query
  const filteredFields = fields?.filter((field) =>
    field.fieldName?.toLowerCase().includes(globalSearchQuery?.toLowerCase()) ||
    field.description?.toLowerCase().includes(globalSearchQuery?.toLowerCase()) ||
    field.availableValues?.toLowerCase().includes(globalSearchQuery?.toLowerCase())
  );

  // All tables mode: filter tables and fields based on global search
  const filteredAllTables = showAllTables ? allTables?.map(table => {
    const tableSearch = tableSearchQueries[table.name] || '';
    const searchTerm = tableSearch || globalSearchQuery;

    const filteredTableFields = table.fields?.filter((field) =>
      field.fieldName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      field.description?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      field.availableValues?.toLowerCase().includes(searchTerm?.toLowerCase())
    );

    return {
      ...table,
      fields: filteredTableFields,
      matchesSearch: filteredTableFields?.length > 0 ||
                     table.name?.toLowerCase().includes(globalSearchQuery?.toLowerCase()) ||
                     table.description?.toLowerCase().includes(globalSearchQuery?.toLowerCase())
    };
  }).filter(table => table.matchesSearch) : [];

  // Export data dictionary as CSV
  const handleExport = () => {
    const headers = ['Table Name', 'Field Name', 'Description', 'Available Values'];
    let csvContent = [headers?.join(',')];

    if (showAllTables) {
      allTables?.forEach(table => {
        table.fields?.forEach(field => {
          csvContent?.push([
            `"${table.name}"`,
            `"${field.fieldName}"`,
            `"${field.description}"`,
            `"${field.availableValues}"`,
          ].join(','));
        });
      });
    } else {
      fields?.forEach(field => {
        csvContent?.push([
          `"${tableName}"`,
          `"${field.fieldName}"`,
          `"${field.description}"`,
          `"${field.availableValues}"`,
        ].join(','));
      });
    }

    const blob = new Blob([csvContent?.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${showAllTables ? 'all_tables' : tableName}_data_dictionary.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setGlobalSearchQuery('');
    setTableSearchQueries({});
    onClose();
  };

  const handleTableSearch = (tableName: string, query: string) => {
    setTableSearchQueries(prev => ({
      ...prev,
      [tableName]: query
    }));
  };

  const getTotalFieldCount = () => {
    if (showAllTables) {
      return allTables?.reduce((sum, table) => sum + table.fields?.length, 0);
    }
    return fields?.length;
  };

  const getFilteredFieldCount = () => {
    if (showAllTables) {
      return filteredAllTables?.reduce((sum, table) => sum + table.fields?.length, 0);
    }
    return filteredFields?.length;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
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
          px: 2.5,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#296695' }}>
            Data Dictionary
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {showAllTables ? 'All Available Tables' : tableName}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2, px: 2.5 }}>
        {/* Global Search and Export Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          {/* Global Search Field */}
          <TextField
            size="small"
            placeholder={showAllTables ? "Search across all tables and fields..." : "Search fields, descriptions, or values..."}
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            sx={{
              flex: 1,
              mr: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Export Button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownload />}
            onClick={handleExport}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#296695',
              color: '#296695',
              '&:hover': {
                borderColor: '#1e4d6f',
                backgroundColor: 'rgba(41, 102, 149, 0.04)',
              },
            }}
          >
            Export CSV
          </Button>
        </Box>

        {/* Results Count */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {showAllTables
            ? `Showing ${getFilteredFieldCount()} of ${getTotalFieldCount()} fields across ${filteredAllTables?.length} of ${allTables?.length} tables`
            : `Showing ${filteredFields?.length} of ${fields?.length} fields`
          }
        </Typography>

        {/* Content: Either single table or all tables with accordions */}
        {showAllTables ? (
          // All Tables Mode: Accordion View
          <Box>
            {filteredAllTables?.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  No tables or fields found matching "{globalSearchQuery}"
                </Typography>
              </Paper>
            ) : (
              filteredAllTables?.map((table, index) => (
                <Accordion
                  key={table.name}
                  defaultExpanded={false}
                  sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px !important',
                    '&:before': { display: 'none' },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      backgroundColor: '#F8FAFB',
                      borderRadius: '8px',
                      '&:hover': {
                        backgroundColor: '#F0F4F8',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#296695', fontSize: '0.95rem' }}>
                          {table.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {table.description}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${table.fields?.length} fields`}
                        size="small"
                        sx={{
                          backgroundColor: '#29669520',
                          color: '#296695',
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2, backgroundColor: 'white' }}>
                    {/* Per-Table Search */}
                    <TextField
                      size="small"
                      placeholder={`Search within ${table.name}...`}
                      value={tableSearchQueries[table.name] || ''}
                      onChange={(e) => handleTableSearch(table.name, e.target.value)}
                      sx={{
                        width: '100%',
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#FAFBFC',
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Table Fields */}
                    <TableContainer
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                            <TableCell sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem', width: '25%' }}>
                              Field Name
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem', width: '40%' }}>
                              Description
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1, fontSize: '0.75rem', width: '35%' }}>
                              Available Values
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {table.fields?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                  No fields found
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            table.fields?.map((field, fieldIndex) => (
                              <TableRow key={fieldIndex} hover>
                                <TableCell sx={{ py: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.75rem' }}>
                                    {field.fieldName}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    {field.description}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    {field.availableValues}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        ) : (
          // Single Table Mode: Direct Table View
          <TableContainer
            component={Paper}
            sx={{
              maxHeight: 500,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFB' }}>
                  <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem', width: '25%' }}>
                    Field Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem', width: '40%' }}>
                    Description
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.85rem', width: '35%' }}>
                    Available Values
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFields?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No fields found matching "{globalSearchQuery}"
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFields?.map((field, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                          {field.fieldName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {field.description}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {field.availableValues}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleClose}
          sx={{
            px: 2.5,
            textTransform: 'none',
            color: '#fff',
            backgroundColor: '#296695',
            '&:hover': {
              backgroundColor: '#1e4d6f',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataDictionaryDialog;
