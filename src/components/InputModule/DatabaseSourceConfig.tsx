import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  TextField,
  IconButton,
  Tooltip,
  Button,
  InputAdornment,
} from '@mui/material';
import { MenuBook, Search } from '@mui/icons-material';
import type { InputSource } from './InputModule';
import FilterBuilder from './FilterBuilder';
import DataDictionaryDialog from './DataDictionaryDialog';

interface DatabaseSourceConfigProps {
  data: Partial<InputSource>;
  onChange: (data: Partial<InputSource>) => void;
}

// Preconfigured database tables
const DATABASE_TABLES = [
  { name: 'Permission', description: 'Permission based customer data' },
  { name: 'Non_Permission', description: 'Non-permission based customer data' },
  { name: 'Transunion', description: 'Transunion credit bureau data' },
  { name: 'Axiom', description: 'Axiom credit bureau data' },
  { name: 'Experian', description: 'Experian credit bureau data' },
  { name: 'Green_Profile', description: 'Green profile data' },
  { name: 'Orange_Profile', description: 'Orange profile data' },
  { name: 'Arcamax_Profile', description: 'Arcamax profile data' },
  { name: 'Publisher_Data', description: 'Publisher data' },
  { name: 'Green_Publisher_Data', description: 'Green publisher data' },
  { name: 'Orange_Publisher_Data', description: 'Orange publisher data' },
  { name: 'Arcamax_Publisher_Data', description: 'Arcamax publisher data' },
  { name: 'Best_Postal', description: 'Best postal data' },
  { name: 'All_Postal', description: 'All postal data' },
  { name: 'Phone_Numbers_Data', description: 'Phone numbers data' },
  { name: 'Zips_Radius_Data', description: 'ZIP radius data' },
  { name: 'Shahash_Data', description: 'Shahash data' },
  { name: 'Liveintent_Data', description: 'Liveintent data' },
  { name: 'DNS_Suppression_Data', description: 'DNS suppression data' },
  { name: 'Bacon_SBI_Policies_Data', description: 'Bacon SBI policies data' },
];

// Field descriptions mapping
const FIELD_DESCRIPTIONS: Record<string, string> = {
  MA1566: 'Cibil score greater than 700',
  EMAIL_ID: 'Customer email address',
  PROFILE_ID: 'Unique customer profile identifier',
  LIST_ID: 'Marketing list identifier',
  CREDIT_SCORE: 'Customer credit score',
  INCOME: 'Annual income',
  AGE: 'Customer age',
  ZIP_CODE: 'Zip code',
};

// Mock Data Dictionary with 100+ fields
const generateDataDictionary = (tableName: string) => {
  const baseFields = [
    { fieldName: 'PROFILE_ID', description: 'Unique customer profile identifier', availableValues: 'Alphanumeric, 10-15 characters' },
    { fieldName: 'EMAIL_ID', description: 'Customer email address', availableValues: 'Valid email format' },
    { fieldName: 'FIRST_NAME', description: 'Customer first name', availableValues: 'Text, 1-50 characters' },
    { fieldName: 'LAST_NAME', description: 'Customer last name', availableValues: 'Text, 1-50 characters' },
    { fieldName: 'PHONE_NUMBER', description: 'Customer contact number', availableValues: '10 digit phone number' },
    { fieldName: 'DATE_OF_BIRTH', description: 'Customer date of birth', availableValues: 'Date format: YYYY-MM-DD' },
    { fieldName: 'AGE', description: 'Customer age in years', availableValues: '18-100' },
    { fieldName: 'GENDER', description: 'Customer gender', availableValues: 'M, F, O' },
    { fieldName: 'MARITAL_STATUS', description: 'Customer marital status', availableValues: 'Single, Married, Divorced, Widowed' },
    { fieldName: 'ADDRESS_LINE1', description: 'Primary address line', availableValues: 'Text, 1-100 characters' },
    { fieldName: 'ADDRESS_LINE2', description: 'Secondary address line', availableValues: 'Text, 0-100 characters' },
    { fieldName: 'CITY', description: 'City of residence', availableValues: 'Text, 1-50 characters' },
    { fieldName: 'STATE', description: 'State of residence', availableValues: '2-letter state code' },
    { fieldName: 'ZIP_CODE', description: 'Postal zip code', availableValues: '5 or 9 digit zip code' },
    { fieldName: 'COUNTRY', description: 'Country of residence', availableValues: 'US, CA, UK, etc.' },
    { fieldName: 'CREDIT_SCORE', description: 'Customer credit score', availableValues: '300-850' },
    { fieldName: 'INCOME', description: 'Annual income in USD', availableValues: '0-999999999' },
    { fieldName: 'EMPLOYMENT_STATUS', description: 'Current employment status', availableValues: 'Employed, Unemployed, Self-Employed, Retired' },
    { fieldName: 'EMPLOYER_NAME', description: 'Current employer name', availableValues: 'Text, 0-100 characters' },
    { fieldName: 'JOB_TITLE', description: 'Current job title', availableValues: 'Text, 0-100 characters' },
    { fieldName: 'EDUCATION_LEVEL', description: 'Highest education level', availableValues: 'High School, Bachelor, Master, PhD, Other' },
    { fieldName: 'ACCOUNT_NUMBER', description: 'Customer account number', availableValues: 'Numeric, 10-16 digits' },
    { fieldName: 'ACCOUNT_TYPE', description: 'Type of customer account', availableValues: 'Checking, Savings, Credit, Loan' },
    { fieldName: 'ACCOUNT_STATUS', description: 'Current account status', availableValues: 'Active, Inactive, Closed, Suspended' },
    { fieldName: 'ACCOUNT_BALANCE', description: 'Current account balance', availableValues: '-999999999 to 999999999' },
    { fieldName: 'CREDIT_LIMIT', description: 'Credit limit for account', availableValues: '0-999999' },
    { fieldName: 'AVAILABLE_CREDIT', description: 'Available credit amount', availableValues: '0-999999' },
    { fieldName: 'LAST_PAYMENT_DATE', description: 'Date of last payment', availableValues: 'Date format: YYYY-MM-DD' },
    { fieldName: 'LAST_PAYMENT_AMOUNT', description: 'Amount of last payment', availableValues: '0-999999' },
    { fieldName: 'NEXT_PAYMENT_DUE', description: 'Next payment due date', availableValues: 'Date format: YYYY-MM-DD' },
    { fieldName: 'MINIMUM_PAYMENT', description: 'Minimum payment amount', availableValues: '0-99999' },
    { fieldName: 'INTEREST_RATE', description: 'Account interest rate', availableValues: '0-100 (percentage)' },
    { fieldName: 'APR', description: 'Annual percentage rate', availableValues: '0-100 (percentage)' },
    { fieldName: 'LATE_FEE', description: 'Late payment fee amount', availableValues: '0-999' },
    { fieldName: 'OVERDRAFT_FEE', description: 'Overdraft fee amount', availableValues: '0-99' },
    { fieldName: 'ACCOUNT_OPEN_DATE', description: 'Date account was opened', availableValues: 'Date format: YYYY-MM-DD' },
    { fieldName: 'ACCOUNT_CLOSE_DATE', description: 'Date account was closed', availableValues: 'Date format: YYYY-MM-DD or NULL' },
    { fieldName: 'LIST_ID', description: 'Marketing list identifier', availableValues: 'Alphanumeric, 5-20 characters' },
    { fieldName: 'CAMPAIGN_ID', description: 'Marketing campaign identifier', availableValues: 'Alphanumeric, 5-20 characters' },
    { fieldName: 'SEGMENT_ID', description: 'Customer segment identifier', availableValues: 'Numeric, 1-999' },
    { fieldName: 'RISK_SCORE', description: 'Customer risk assessment score', availableValues: '0-100' },
    { fieldName: 'CHURN_PROBABILITY', description: 'Probability of customer churn', availableValues: '0-1 (decimal)' },
    { fieldName: 'LIFETIME_VALUE', description: 'Customer lifetime value', availableValues: '0-9999999' },
    { fieldName: 'TOTAL_PURCHASES', description: 'Total number of purchases', availableValues: '0-99999' },
    { fieldName: 'TOTAL_SPENT', description: 'Total amount spent', availableValues: '0-9999999' },
    { fieldName: 'AVERAGE_TRANSACTION', description: 'Average transaction amount', availableValues: '0-99999' },
    { fieldName: 'FIRST_PURCHASE_DATE', description: 'Date of first purchase', availableValues: 'Date format: YYYY-MM-DD' },
    { fieldName: 'LAST_PURCHASE_DATE', description: 'Date of last purchase', availableValues: 'Date format: YYYY-MM-DD' },
    { fieldName: 'DAYS_SINCE_LAST_PURCHASE', description: 'Days since last purchase', availableValues: '0-9999' },
    { fieldName: 'PREFERRED_CHANNEL', description: 'Preferred communication channel', availableValues: 'Email, Phone, SMS, Mail, App' },
    { fieldName: 'OPT_IN_EMAIL', description: 'Email opt-in status', availableValues: 'Y, N' },
    { fieldName: 'OPT_IN_SMS', description: 'SMS opt-in status', availableValues: 'Y, N' },
    { fieldName: 'OPT_IN_PHONE', description: 'Phone opt-in status', availableValues: 'Y, N' },
    { fieldName: 'OPT_IN_MAIL', description: 'Mail opt-in status', availableValues: 'Y, N' },
    { fieldName: 'PERMISSION_DATE', description: 'Date permissions were granted', availableValues: 'Date format: YYYY-MM-DD' },
    { fieldName: 'CONSENT_VERSION', description: 'Version of consent agreement', availableValues: 'Numeric, 1-99' },
    { fieldName: 'DATA_SOURCE', description: 'Source of customer data', availableValues: 'Web, Mobile, Store, Partner, Other' },
    { fieldName: 'CREATED_DATE', description: 'Date record was created', availableValues: 'Datetime format: YYYY-MM-DD HH:MM:SS' },
    { fieldName: 'UPDATED_DATE', description: 'Date record was last updated', availableValues: 'Datetime format: YYYY-MM-DD HH:MM:SS' },
    { fieldName: 'CREATED_BY', description: 'User who created the record', availableValues: 'Username or User ID' },
    { fieldName: 'UPDATED_BY', description: 'User who last updated record', availableValues: 'Username or User ID' },
    { fieldName: 'IS_DELETED', description: 'Soft delete flag', availableValues: 'Y, N' },
    { fieldName: 'DELETED_DATE', description: 'Date record was deleted', availableValues: 'Datetime format or NULL' },
    { fieldName: 'VERSION', description: 'Record version number', availableValues: 'Numeric, 1-9999' },
    { fieldName: 'MA1566', description: 'Cibil score greater than 700', availableValues: 'Y, N' },
    { fieldName: 'MA1567', description: 'Has active credit card', availableValues: 'Y, N' },
    { fieldName: 'MA1568', description: 'Has mortgage loan', availableValues: 'Y, N' },
    { fieldName: 'MA1569', description: 'Has auto loan', availableValues: 'Y, N' },
    { fieldName: 'MA1570', description: 'Has student loan', availableValues: 'Y, N' },
    { fieldName: 'MA1571', description: 'Has personal loan', availableValues: 'Y, N' },
    { fieldName: 'MA1572', description: 'Number of credit inquiries', availableValues: '0-99' },
    { fieldName: 'MA1573', description: 'Number of open accounts', availableValues: '0-99' },
    { fieldName: 'MA1574', description: 'Number of closed accounts', availableValues: '0-999' },
    { fieldName: 'MA1575', description: 'Total credit limit across accounts', availableValues: '0-9999999' },
    { fieldName: 'MA1576', description: 'Total outstanding balance', availableValues: '0-9999999' },
    { fieldName: 'MA1577', description: 'Credit utilization ratio', availableValues: '0-100 (percentage)' },
    { fieldName: 'MA1578', description: 'Months since oldest account', availableValues: '0-999' },
    { fieldName: 'MA1579', description: 'Number of delinquencies', availableValues: '0-99' },
    { fieldName: 'MA1580', description: 'Number of bankruptcies', availableValues: '0-9' },
    { fieldName: 'MA1581', description: 'Has foreclosure history', availableValues: 'Y, N' },
    { fieldName: 'MA1582', description: 'Has repossession history', availableValues: 'Y, N' },
    { fieldName: 'MA1583', description: 'Has collection accounts', availableValues: 'Y, N' },
    { fieldName: 'MA1584', description: 'Total collection amount', availableValues: '0-999999' },
    { fieldName: 'MA1585', description: 'Number of public records', availableValues: '0-99' },
    { fieldName: 'MA1586', description: 'Has tax lien', availableValues: 'Y, N' },
    { fieldName: 'MA1587', description: 'Has judgment', availableValues: 'Y, N' },
    { fieldName: 'MA1588', description: 'Debt-to-income ratio', availableValues: '0-100 (percentage)' },
    { fieldName: 'MA1589', description: 'Monthly debt payment', availableValues: '0-99999' },
    { fieldName: 'MA1590', description: 'Monthly income', availableValues: '0-999999' },
    { fieldName: 'MA1591', description: 'Housing payment amount', availableValues: '0-99999' },
    { fieldName: 'MA1592', description: 'Housing type', availableValues: 'Own, Rent, Other' },
    { fieldName: 'MA1593', description: 'Years at current residence', availableValues: '0-99' },
    { fieldName: 'MA1594', description: 'Years at current employer', availableValues: '0-99' },
    { fieldName: 'MA1595', description: 'Industry code', availableValues: 'NAICS code' },
    { fieldName: 'MA1596', description: 'Occupation code', availableValues: 'SOC code' },
    { fieldName: 'MA1597', description: 'Is high net worth', availableValues: 'Y, N' },
    { fieldName: 'MA1598', description: 'Investment portfolio value', availableValues: '0-99999999' },
    { fieldName: 'MA1599', description: 'Liquid assets value', availableValues: '0-9999999' },
    { fieldName: 'MA1600', description: 'Real estate value', availableValues: '0-99999999' },
    { fieldName: 'HOUSEHOLD_SIZE', description: 'Number of people in household', availableValues: '1-20' },
    { fieldName: 'NUMBER_OF_CHILDREN', description: 'Number of children', availableValues: '0-20' },
    { fieldName: 'HAS_PETS', description: 'Has pets in household', availableValues: 'Y, N' },
    { fieldName: 'VEHICLE_MAKE', description: 'Primary vehicle make', availableValues: 'Text, 0-50 characters' },
    { fieldName: 'VEHICLE_MODEL', description: 'Primary vehicle model', availableValues: 'Text, 0-50 characters' },
    { fieldName: 'VEHICLE_YEAR', description: 'Primary vehicle year', availableValues: '1900-2099' },
  ];

  return baseFields;
};

// Snowflake accounts (sources)
const SNOWFLAKE_SOURCES = [
  { id: 'zetaglobal', name: 'ZetaGlobal' },
  { id: 'hubreader', name: 'Hub Reader' },
];

// Mock databases for each source
const DATABASES_BY_SOURCE: Record<string, string[]> = {
  zetaglobal: ['ZETA_PROD_DB', 'ZETA_DEV_DB', 'ZETA_ANALYTICS_DB'],
  hubreader: ['HUB_MAIN_DB', 'HUB_REPORTING_DB', 'HUB_ARCHIVE_DB'],
};

// Mock schemas for each database
const SCHEMAS_BY_DATABASE: Record<string, string[]> = {
  ZETA_PROD_DB: ['PUBLIC', 'CUSTOMER', 'SALES', 'MARKETING'],
  ZETA_DEV_DB: ['PUBLIC', 'TESTING', 'STAGING'],
  ZETA_ANALYTICS_DB: ['PUBLIC', 'ANALYTICS', 'REPORTS'],
  HUB_MAIN_DB: ['PUBLIC', 'CORE', 'TRANSACTIONS'],
  HUB_REPORTING_DB: ['PUBLIC', 'REPORTS', 'DASHBOARDS'],
  HUB_ARCHIVE_DB: ['PUBLIC', 'HISTORICAL', 'ARCHIVE'],
};

const DatabaseSourceConfig: React.FC<DatabaseSourceConfigProps> = ({ data, onChange }) => {
  const [tableSelectionType, setTableSelectionType] = useState<'preconfigured' | 'custom'>('preconfigured');
  const [selectedTable, setSelectedTable] = useState<string>(data.sourceName || '');
  const [fields, setFields] = useState<any[]>([]);
  const prevDataLengthRef = useRef(Object.keys(data).length);
  const [dataDictionaryOpen, setDataDictionaryOpen] = useState(false);
  const [top10Records, setTop10Records] = useState<any[]>([]);
  const [showTop10, setShowTop10] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableSearch, setTableSearch] = useState<string>('');

  // Custom Table state
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [customTableName, setCustomTableName] = useState<string>('');
  const [tableSourceName, setTableSourceName] = useState<string>('');
  const [databaseSearch, setDatabaseSearch] = useState<string>('');


  // Reset form when data prop is cleared (for Add & Continue functionality)
  // Only reset when data transitions from non-empty to empty
  useEffect(() => {
    const currentDataLength = Object.keys(data).length;
    const wasNonEmpty = prevDataLengthRef.current > 0;
    const isNowEmpty = currentDataLength === 0;

    // Only reset when transitioning from non-empty to empty (Add & Continue scenario)
    if (wasNonEmpty && isNowEmpty) {
      setTableSelectionType('preconfigured');
      setSelectedTable('');
      setTableSearch('');
      setFields([]);
      setSelectedSource('');
      setSelectedDatabase('');
      setSelectedSchema('');
      setCustomTableName('');
      setTableSourceName('');
      setDatabaseSearch('');
      setTop10Records([]);
      setShowTop10(false);
    }

    prevDataLengthRef.current = currentDataLength;
  }, [data]);

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);

    // Mock fields for the selected table
    const mockFields = [
      { name: 'EMAIL_ID', type: 'String', description: FIELD_DESCRIPTIONS.EMAIL_ID || 'Email ID' },
      { name: 'PROFILE_ID', type: 'String', description: FIELD_DESCRIPTIONS.PROFILE_ID || 'Profile ID' },
      { name: 'EMAIL_MD5', type: 'String', description: 'MD5 hash of email' },
      { name: 'AGE', type: 'Integer', description: FIELD_DESCRIPTIONS.AGE || 'Age' },
      { name: 'DECILE', type: 'Integer', description: 'Decile value' },
      { name: 'Decile1', type: 'Integer', description: 'Decile1 value' },
      { name: 'Decile2', type: 'Integer', description: 'Decile2 value' },
      { name: 'FNAME', type: 'String', description: 'First name' },
      { name: 'LNAME', type: 'String', description: 'Last name' },
      { name: 'STATE', type: 'String', description: 'State' },
      { name: 'ZIP', type: 'String', description: 'ZIP code' },
      { name: 'NAME', type: 'String', description: 'Full name' },
      { name: 'SHAHASH', type: 'String', description: 'SHA hash' },
      { name: 'CassAddressPlusSuite', type: 'String', description: 'CASS address with suite' },
      { name: 'CassZIP', type: 'String', description: 'CASS ZIP code' },
      { name: 'PHONE_NUMBER', type: 'String', description: 'Phone number' },
      { name: 'MA3784', type: 'String', description: 'MA3784 field' },
      { name: 'MA1696', type: 'String', description: 'MA1696 field' },
      { name: 'MA3786', type: 'String', description: 'MA3786 field' },
      { name: 'MA2800', type: 'String', description: 'MA2800 field' },
      { name: 'MA3791', type: 'String', description: 'MA3791 field' },
      { name: 'MA2806', type: 'String', description: 'MA2806 field' },
      { name: 'MA3781', type: 'String', description: 'MA3781 field' },
      { name: 'MA3799', type: 'String', description: 'MA3799 field' },
      { name: 'MA2642', type: 'String', description: 'MA2642 field' },
      { name: 'MA2795', type: 'String', description: 'MA2795 field' },
      { name: 'MA2796', type: 'String', description: 'MA2796 field' },
      { name: 'MA2797', type: 'String', description: 'MA2797 field' },
      { name: 'MA2798', type: 'String', description: 'MA2798 field' },
      { name: 'MA2799', type: 'String', description: 'MA2799 field' },
      { name: 'MA2929', type: 'String', description: 'MA2929 field' },
      { name: 'z202', type: 'String', description: 'z202 field' },
      { name: 'MA1628', type: 'String', description: 'MA1628 field' },
      { name: 'z594', type: 'String', description: 'z594 field' },
      { name: 'z83', type: 'String', description: 'z83 field' },
      { name: 'z84', type: 'String', description: 'z84 field' },
      { name: 'z85', type: 'String', description: 'z85 field' },
      { name: 'z653', type: 'String', description: 'z653 field' },
      { name: 'z86', type: 'String', description: 'z86 field' },
      { name: 'z87', type: 'String', description: 'z87 field' },
      { name: 'z241', type: 'String', description: 'z241 field' },
      { name: 'z61', type: 'String', description: 'z61 field' },
      { name: 'PARTNER_SOUCRE', type: 'String', description: 'Partner source' },
      { name: 'SOURCE_ZIP', type: 'String', description: 'Source ZIP code' },
      { name: 'TARGET_ZIP', type: 'String', description: 'Target ZIP code' },
      { name: 'DISTANCE', type: 'Float', description: 'Distance' },
      { name: 'DISTANCE_IN_MILES', type: 'Float', description: 'Distance in miles' },
      { name: 'LIST_ID', type: 'String', description: FIELD_DESCRIPTIONS.LIST_ID || 'List ID' },
      { name: 'MA1566', type: 'Integer', description: FIELD_DESCRIPTIONS.MA1566 || 'MA1566' },
      { name: 'CREDIT_SCORE', type: 'Integer', description: FIELD_DESCRIPTIONS.CREDIT_SCORE || 'Credit score' },
      { name: 'INCOME', type: 'Float', description: FIELD_DESCRIPTIONS.INCOME || 'Income' },
      { name: 'ZIP_CODE', type: 'String', description: FIELD_DESCRIPTIONS.ZIP_CODE || 'ZIP code' },
    ];

    setFields(mockFields);

    onChange({
      ...data,
      sourceName: tableSourceName || tableName, // Use tableSourceName if provided, fallback to tableName
      subSourceType: 'Database',
      headers: mockFields.map(f => f.name),
      dataTypes: mockFields.reduce((acc, f) => ({ ...acc, [f.name]: f.type }), {}),
    });
  };

  const handleTableSourceNameChange = (name: string) => {
    setTableSourceName(name);
    if (selectedTable) {
      onChange({
        ...data,
        sourceName: name,
      });
    }
  };

  const handleGetTop10Records = () => {
    // Mock data for top 10 records from the selected table with more columns
    const mockTop10 = [
      { EMAIL_ID: 'john.doe@example.com', PROFILE_ID: 'P12345', LIST_ID: 'L001', MA1566: 1, CREDIT_SCORE: 750, INCOME: 85000, AGE: 32, ZIP_CODE: '10001', FIRST_NAME: 'John', LAST_NAME: 'Doe', PHONE_NUMBER: '5551234567', STATE: 'NY', CITY: 'New York', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 15000 },
      { EMAIL_ID: 'jane.smith@example.com', PROFILE_ID: 'P12346', LIST_ID: 'L002', MA1566: 1, CREDIT_SCORE: 720, INCOME: 72000, AGE: 28, ZIP_CODE: '10002', FIRST_NAME: 'Jane', LAST_NAME: 'Smith', PHONE_NUMBER: '5551234568', STATE: 'CA', CITY: 'Los Angeles', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 12500 },
      { EMAIL_ID: 'bob.johnson@example.com', PROFILE_ID: 'P12347', LIST_ID: 'L003', MA1566: 0, CREDIT_SCORE: 680, INCOME: 65000, AGE: 45, ZIP_CODE: '10003', FIRST_NAME: 'Bob', LAST_NAME: 'Johnson', PHONE_NUMBER: '5551234569', STATE: 'TX', CITY: 'Houston', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Self-Employed', ACCOUNT_BALANCE: 8900 },
      { EMAIL_ID: 'alice.williams@example.com', PROFILE_ID: 'P12348', LIST_ID: 'L004', MA1566: 1, CREDIT_SCORE: 785, INCOME: 95000, AGE: 38, ZIP_CODE: '10004', FIRST_NAME: 'Alice', LAST_NAME: 'Williams', PHONE_NUMBER: '5551234570', STATE: 'FL', CITY: 'Miami', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 22000 },
      { EMAIL_ID: 'charlie.brown@example.com', PROFILE_ID: 'P12349', LIST_ID: 'L005', MA1566: 1, CREDIT_SCORE: 710, INCOME: 78000, AGE: 41, ZIP_CODE: '10005', FIRST_NAME: 'Charlie', LAST_NAME: 'Brown', PHONE_NUMBER: '5551234571', STATE: 'IL', CITY: 'Chicago', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 16500 },
      { EMAIL_ID: 'david.miller@example.com', PROFILE_ID: 'P12350', LIST_ID: 'L006', MA1566: 0, CREDIT_SCORE: 665, INCOME: 58000, AGE: 29, ZIP_CODE: '10006', FIRST_NAME: 'David', LAST_NAME: 'Miller', PHONE_NUMBER: '5551234572', STATE: 'WA', CITY: 'Seattle', ACCOUNT_STATUS: 'Inactive', EMPLOYMENT_STATUS: 'Unemployed', ACCOUNT_BALANCE: 3200 },
      { EMAIL_ID: 'emma.davis@example.com', PROFILE_ID: 'P12351', LIST_ID: 'L007', MA1566: 1, CREDIT_SCORE: 740, INCOME: 88000, AGE: 35, ZIP_CODE: '10007', FIRST_NAME: 'Emma', LAST_NAME: 'Davis', PHONE_NUMBER: '5551234573', STATE: 'MA', CITY: 'Boston', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 19000 },
      { EMAIL_ID: 'frank.garcia@example.com', PROFILE_ID: 'P12352', LIST_ID: 'L008', MA1566: 1, CREDIT_SCORE: 795, INCOME: 105000, AGE: 42, ZIP_CODE: '10008', FIRST_NAME: 'Frank', LAST_NAME: 'Garcia', PHONE_NUMBER: '5551234574', STATE: 'CO', CITY: 'Denver', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 28000 },
      { EMAIL_ID: 'grace.martinez@example.com', PROFILE_ID: 'P12353', LIST_ID: 'L009', MA1566: 0, CREDIT_SCORE: 690, INCOME: 62000, AGE: 31, ZIP_CODE: '10009', FIRST_NAME: 'Grace', LAST_NAME: 'Martinez', PHONE_NUMBER: '5551234575', STATE: 'AZ', CITY: 'Phoenix', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Employed', ACCOUNT_BALANCE: 9500 },
      { EMAIL_ID: 'henry.rodriguez@example.com', PROFILE_ID: 'P12354', LIST_ID: 'L010', MA1566: 1, CREDIT_SCORE: 730, INCOME: 82000, AGE: 39, ZIP_CODE: '10010', FIRST_NAME: 'Henry', LAST_NAME: 'Rodriguez', PHONE_NUMBER: '5551234576', STATE: 'NV', CITY: 'Las Vegas', ACCOUNT_STATUS: 'Active', EMPLOYMENT_STATUS: 'Self-Employed', ACCOUNT_BALANCE: 17500 },
    ];

    setTop10Records(mockTop10);
    setShowTop10(true);
    setSearchTerm(''); // Reset search when loading new data
  };

  const handleSourceChange = (sourceId: string) => {
    setSelectedSource(sourceId);
    setSelectedDatabase('');
    setSelectedSchema('');
    setCustomTableName('');
    setDatabaseSearch('');
    setFields([]);
    setTop10Records([]);
    setShowTop10(false);
  };

  const handleDatabaseChange = (database: string) => {
    setSelectedDatabase(database);
    setSelectedSchema('');
    setCustomTableName('');
    setFields([]);
    setTop10Records([]);
    setShowTop10(false);
  };

  const handleSchemaChange = (schema: string) => {
    setSelectedSchema(schema);
    setCustomTableName('');
    setFields([]);
    setTop10Records([]);
    setShowTop10(false);
  };

  const handleCustomTableNameChange = (tableName: string) => {
    setCustomTableName(tableName);
    setTop10Records([]);
    setShowTop10(false);

    if (tableName.trim() && selectedSource && selectedDatabase && selectedSchema) {
      // Mock fields for custom table
      const mockFields = [
        { name: 'EMAIL_ID', type: 'String', description: FIELD_DESCRIPTIONS.EMAIL_ID || 'Email ID' },
        { name: 'PROFILE_ID', type: 'String', description: FIELD_DESCRIPTIONS.PROFILE_ID || 'Profile ID' },
        { name: 'EMAIL_MD5', type: 'String', description: 'MD5 hash of email' },
        { name: 'AGE', type: 'Integer', description: FIELD_DESCRIPTIONS.AGE || 'Age' },
        { name: 'DECILE', type: 'Integer', description: 'Decile value' },
        { name: 'Decile1', type: 'Integer', description: 'Decile1 value' },
        { name: 'Decile2', type: 'Integer', description: 'Decile2 value' },
        { name: 'FNAME', type: 'String', description: 'First name' },
        { name: 'LNAME', type: 'String', description: 'Last name' },
        { name: 'STATE', type: 'String', description: 'State' },
        { name: 'ZIP', type: 'String', description: 'ZIP code' },
        { name: 'NAME', type: 'String', description: 'Full name' },
        { name: 'SHAHASH', type: 'String', description: 'SHA hash' },
        { name: 'CassAddressPlusSuite', type: 'String', description: 'CASS address with suite' },
        { name: 'CassZIP', type: 'String', description: 'CASS ZIP code' },
        { name: 'PHONE_NUMBER', type: 'String', description: 'Phone number' },
        { name: 'MA3784', type: 'String', description: 'MA3784 field' },
        { name: 'MA1696', type: 'String', description: 'MA1696 field' },
        { name: 'MA3786', type: 'String', description: 'MA3786 field' },
        { name: 'MA2800', type: 'String', description: 'MA2800 field' },
        { name: 'MA3791', type: 'String', description: 'MA3791 field' },
        { name: 'MA2806', type: 'String', description: 'MA2806 field' },
        { name: 'MA3781', type: 'String', description: 'MA3781 field' },
        { name: 'MA3799', type: 'String', description: 'MA3799 field' },
        { name: 'MA2642', type: 'String', description: 'MA2642 field' },
        { name: 'MA2795', type: 'String', description: 'MA2795 field' },
        { name: 'MA2796', type: 'String', description: 'MA2796 field' },
        { name: 'MA2797', type: 'String', description: 'MA2797 field' },
        { name: 'MA2798', type: 'String', description: 'MA2798 field' },
        { name: 'MA2799', type: 'String', description: 'MA2799 field' },
        { name: 'MA2929', type: 'String', description: 'MA2929 field' },
        { name: 'z202', type: 'String', description: 'z202 field' },
        { name: 'MA1628', type: 'String', description: 'MA1628 field' },
        { name: 'z594', type: 'String', description: 'z594 field' },
        { name: 'z83', type: 'String', description: 'z83 field' },
        { name: 'z84', type: 'String', description: 'z84 field' },
        { name: 'z85', type: 'String', description: 'z85 field' },
        { name: 'z653', type: 'String', description: 'z653 field' },
        { name: 'z86', type: 'String', description: 'z86 field' },
        { name: 'z87', type: 'String', description: 'z87 field' },
        { name: 'z241', type: 'String', description: 'z241 field' },
        { name: 'z61', type: 'String', description: 'z61 field' },
        { name: 'PARTNER_SOUCRE', type: 'String', description: 'Partner source' },
        { name: 'SOURCE_ZIP', type: 'String', description: 'Source ZIP code' },
        { name: 'TARGET_ZIP', type: 'String', description: 'Target ZIP code' },
        { name: 'DISTANCE', type: 'Float', description: 'Distance' },
        { name: 'DISTANCE_IN_MILES', type: 'Float', description: 'Distance in miles' },
        { name: 'LIST_ID', type: 'String', description: FIELD_DESCRIPTIONS.LIST_ID || 'List ID' },
        { name: 'MA1566', type: 'Integer', description: FIELD_DESCRIPTIONS.MA1566 || 'MA1566' },
        { name: 'CREDIT_SCORE', type: 'Integer', description: FIELD_DESCRIPTIONS.CREDIT_SCORE || 'Credit score' },
        { name: 'INCOME', type: 'Float', description: FIELD_DESCRIPTIONS.INCOME || 'Income' },
        { name: 'ZIP_CODE', type: 'String', description: FIELD_DESCRIPTIONS.ZIP_CODE || 'ZIP code' },
      ];

      setFields(mockFields);

      onChange({
        ...data,
        sourceName: tableSourceName || `${selectedSource}.${selectedDatabase}.${selectedSchema}.${tableName}`,
        subSourceType: 'Custom Database',
        headers: mockFields.map(f => f.name),
        dataTypes: mockFields.reduce((acc, f) => ({ ...acc, [f.name]: f.type }), {}),
      });
    } else {
      setFields([]);
      onChange({
        ...data,
        sourceName: '',
        subSourceType: 'Custom Database',
        headers: [],
        dataTypes: {},
      });
    }
  };

  const handleTableSelectionTypeChange = (type: 'preconfigured' | 'custom') => {
    setTableSelectionType(type);

    // Reset both preconfigured and custom states
    setSelectedTable('');
    setTableSearch('');
    setSelectedSource('');
    setSelectedDatabase('');
    setSelectedSchema('');
    setCustomTableName('');
    setTableSourceName('');
    setDatabaseSearch('');
    setFields([]);
    setTop10Records([]);
    setShowTop10(false);

    // Clear data
    onChange({
      ...data,
      sourceName: '',
      subSourceType: type === 'preconfigured' ? 'Database' : 'Custom Database',
      headers: [],
      dataTypes: {},
    });
  };

  return (
    <Box>
      {/* Table Selection Type */}
      <Box sx={{ mb: 2.5 }}>
        <FormControl component="fieldset">
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', mb: 1.5, color: '#2D3748' }}>
            Table Selection
          </Typography>
          <RadioGroup
            row
            value={tableSelectionType}
            onChange={(e) => handleTableSelectionTypeChange(e.target.value as 'preconfigured' | 'custom')}
          >
            <FormControlLabel
              value="preconfigured"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Preconfigured Table</Typography>}
              sx={{ mr: 3 }}
            />
            <FormControlLabel
              value="custom"
              control={<Radio size="small" />}
              label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Custom Table</Typography>}
            />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Preconfigured Table Selection */}
      {tableSelectionType === 'preconfigured' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
              Select Preconfigured Table <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Select
                size="small"
                value={selectedTable}
                onChange={(e) => handleTableChange(e.target.value)}
                onClose={() => setTableSearch('')}
                displayEmpty
                sx={{ flex: 1 }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 400 } }, autoFocus: false }}
              >
                <MenuItem value="">
                  <em>Select Database Table</em>
                </MenuItem>
                <MenuItem
                  disableRipple
                  disableTouchRipple
                  onKeyDown={(e) => e.stopPropagation()}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'white',
                    zIndex: 1,
                    borderBottom: '1px solid #ddd',
                    '&:hover': { backgroundColor: 'white' },
                    cursor: 'default',
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Search database tables..."
                    fullWidth
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </MenuItem>
                {DATABASE_TABLES
                  .filter((table) =>
                    table.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
                    table.description.toLowerCase().includes(tableSearch.toLowerCase())
                  )
                  .map((table) => (
                    <MenuItem key={table.name} value={table.name}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {table.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {table.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
              <Button
                variant="outlined"
                size="small"
                onClick={handleGetTop10Records}
                disabled={!selectedTable}
                sx={{
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  minWidth: '160px',
                }}
              >
                Get Top 10 Records
              </Button>
              <Tooltip title="Data Dictionary" placement="top">
                <IconButton
                  size="medium"
                  onClick={() => setDataDictionaryOpen(true)}
                  sx={{
                    color: '#296695',
                    backgroundColor: 'rgba(41, 102, 149, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(41, 102, 149, 0.2)',
                      transform: 'scale(1.05)',
                    },
                    padding: '10px',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: '0 2px 4px rgba(41, 102, 149, 0.15)',
                  }}
                >
                  <MenuBook sx={{ fontSize: 26 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Top 10 Records Preview - Inline */}
          {showTop10 && top10Records.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Top 10 Records Preview
                </Typography>
                <TextField
                  size="small"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: '300px',
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                    },
                  }}
                />
              </Box>
              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: 350,
                  overflowX: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Table stickyHeader size="small" sx={{ minWidth: Object.keys(top10Records[0] || {}).length * 120 }}>
                  <TableHead>
                    <TableRow>
                      {Object.keys(top10Records[0] || {}).map((header) => (
                        <TableCell key={header} sx={{ backgroundColor: '#F8FAFB', fontWeight: 600, py: 1, whiteSpace: 'nowrap' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {header}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {top10Records
                      .filter((row) => {
                        if (!searchTerm.trim()) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return Object.values(row).some((value) =>
                          String(value || '').toLowerCase().includes(searchLower)
                        );
                      })
                      .map((row, idx) => (
                        <TableRow key={idx} hover>
                          {Object.keys(row).map((key) => (
                            <TableCell key={key} sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {row[key]}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Filters Module for Preconfigured Table */}
          {fields.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <FilterBuilder headers={fields.map(f => f.name)} onFilterChange={(query) => console.log('Filter Query:', query)} showDataType={false} />
            </Box>
          )}

          {/* Table Source Name - Only shown when a table is selected, appears after Filters */}
          {selectedTable && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Table Source Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Enter unique source name for this table"
                value={tableSourceName}
                onChange={(e) => handleTableSourceNameChange(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
                Provide a unique name to identify this source within the request
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Custom Table Selection */}
      {tableSelectionType === 'custom' && (
        <Box>
          {/* Sources Dropdown */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
              Sources <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
            </Typography>
            <Select
              fullWidth
              size="small"
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select Snowflake Account</em>
              </MenuItem>
              {SNOWFLAKE_SOURCES.map((source) => (
                <MenuItem key={source.id} value={source.id}>
                  <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                    {source.name}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Database Dropdown */}
          {selectedSource && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Database <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <Select
                fullWidth
                size="small"
                value={selectedDatabase}
                onChange={(e) => handleDatabaseChange(e.target.value)}
                onClose={() => setDatabaseSearch('')}
                displayEmpty
                MenuProps={{ PaperProps: { sx: { maxHeight: 300 } }, autoFocus: false }}
              >
                <MenuItem value="">
                  <em>Select Database</em>
                </MenuItem>
                <MenuItem
                  disableRipple
                  disableTouchRipple
                  onKeyDown={(e) => e.stopPropagation()}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'white',
                    zIndex: 1,
                    borderBottom: '1px solid #ddd',
                    '&:hover': { backgroundColor: 'white' },
                    cursor: 'default',
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Search databases..."
                    fullWidth
                    value={databaseSearch}
                    onChange={(e) => setDatabaseSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </MenuItem>
                {DATABASES_BY_SOURCE[selectedSource]
                  ?.filter((db) => db.toLowerCase().includes(databaseSearch.toLowerCase()))
                  .map((db) => (
                    <MenuItem key={db} value={db}>
                      <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                        {db}
                      </Typography>
                    </MenuItem>
                  ))}
              </Select>
            </Box>
          )}

          {/* Schema Dropdown */}
          {selectedDatabase && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Schema <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <Select
                fullWidth
                size="small"
                value={selectedSchema}
                onChange={(e) => handleSchemaChange(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select Schema</em>
                </MenuItem>
                {SCHEMAS_BY_DATABASE[selectedDatabase]?.map((schema) => (
                  <MenuItem key={schema} value={schema}>
                    <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                      {schema}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          {/* Table Name TextField */}
          {selectedSchema && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Table Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Enter table name"
                  value={customTableName}
                  onChange={(e) => handleCustomTableNameChange(e.target.value)}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGetTop10Records}
                  disabled={!customTableName || !fields.length}
                  sx={{
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    minWidth: '160px',
                  }}
                >
                  Get Top 10 Records
                </Button>
                <Tooltip title="Data Dictionary" placement="top">
                  <IconButton
                    size="medium"
                    onClick={() => setDataDictionaryOpen(true)}
                    disabled={!customTableName || !fields.length}
                    sx={{
                      color: '#296695',
                      backgroundColor: 'rgba(41, 102, 149, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(41, 102, 149, 0.2)',
                        transform: 'scale(1.05)',
                      },
                      '&:disabled': {
                        backgroundColor: 'rgba(0, 0, 0, 0.12)',
                        color: 'rgba(0, 0, 0, 0.26)',
                      },
                      padding: '10px',
                      transition: 'all 0.2s ease-in-out',
                      boxShadow: '0 2px 4px rgba(41, 102, 149, 0.15)',
                    }}
                  >
                    <MenuBook sx={{ fontSize: 26 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}

          {/* Top 10 Records Preview - Inline for Custom Table */}
          {showTop10 && top10Records.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Top 10 Records Preview
                </Typography>
                <TextField
                  size="small"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: '300px',
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                    },
                  }}
                />
              </Box>
              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: 350,
                  overflowX: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Table stickyHeader size="small" sx={{ minWidth: Object.keys(top10Records[0] || {}).length * 120 }}>
                  <TableHead>
                    <TableRow>
                      {Object.keys(top10Records[0] || {}).map((header) => (
                        <TableCell key={header} sx={{ backgroundColor: '#F8FAFB', fontWeight: 600, py: 1, whiteSpace: 'nowrap' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {header}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {top10Records
                      .filter((row) => {
                        if (!searchTerm.trim()) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return Object.values(row).some((value) =>
                          String(value || '').toLowerCase().includes(searchLower)
                        );
                      })
                      .map((row, idx) => (
                        <TableRow key={idx} hover>
                          {Object.keys(row).map((key) => (
                            <TableCell key={key} sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {row[key]}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Filters Module for Custom Table */}
          {fields.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <FilterBuilder headers={fields.map(f => f.name)} onFilterChange={(query) => console.log('Filter Query:', query)} showDataType={false} />
            </Box>
          )}

          {/* Source Name for Custom Table */}
          {customTableName && fields.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                Source Name <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Enter unique source name for this table"
                value={tableSourceName}
                onChange={(e) => handleTableSourceNameChange(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.5, display: 'block' }}>
                Provide a unique name to identify this source within the request (Auto-generated: {selectedSource}.{selectedDatabase}.{selectedSchema}.{customTableName})
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Data Dictionary Dialog */}
      <DataDictionaryDialog
        open={dataDictionaryOpen}
        onClose={() => setDataDictionaryOpen(false)}
        tableName={selectedTable || customTableName || 'All Database Tables'}
        fields={(selectedTable || customTableName) ? generateDataDictionary(selectedTable || customTableName) : []}
        showAllTables={!selectedTable && !customTableName}
        allTables={!selectedTable && !customTableName ? DATABASE_TABLES.map(table => ({
          name: table.name,
          description: table.description,
          fields: generateDataDictionary(table.name)
        })) : []}
      />
    </Box>
  );
};

export default DatabaseSourceConfig;
