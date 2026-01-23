# Table Dictionary Feature

## Overview
Added a data dictionary dialog that displays ALL field metadata (table name, field name, description, sample values, data type) from all tables when users click the dictionary icon beside the "Get Top 10 Records" button in DatabaseSourceConfig.

## Feature Description

When a user is configuring a preconfigured database table, they can click the dictionary icon (MenuBook) beside the "Get Top 10 Records" button to view detailed metadata about ALL tables and fields. The dictionary data is fetched from the requestinputs.php API and displayed in a modal dialog showing data from all available tables.

## Implementation Details

### 1. Data Flow

```
User opens Add Input Source modal
    ↓
User selects Database source type
    ↓
User selects Preconfigured Table option
    ↓
Dictionary button becomes enabled (if API returned dictionary data)
    ↓
User clicks dictionary icon (MenuBook) beside "Get Top 10 Records" button
    ↓
Dialog opens showing ALL field metadata from ALL tables in API
    ↓
Displays: Table Name, Field Name, Description, Sample Values, Data Type
```

### 2. Files Modified

#### DatabaseSourceConfig.tsx
**Location**: `/src/components/InputModule/DatabaseSourceConfig.tsx`

**Changes**:

1. **Imports** (Lines 1-30):
   - Added `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions` from '@mui/material'
   - Added `Close` icon from '@mui/icons-material'

2. **State Management** (Line ~169):
   ```typescript
   const [dictionaryDialogOpen, setDictionaryDialogOpen] = useState<boolean>(false);
   ```

3. **Helper Functions** (Lines ~1027-1056):
   ```typescript
   // Get all dictionary data from API (not filtered by table)
   const getAllDictionaryData = () => {
     if (!apiSources?.dbSource?.dataDictionary) {
       return [];
     }

     const dictionaryData = apiSources.dbSource.dataDictionary;

     // Flatten all dictionary entries from all tables into a single array
     const allEntries: Array<{ tableName: string; field: any }> = [];

     Object.keys(dictionaryData).forEach((tableName) => {
       const tableFields = dictionaryData[tableName];
       if (Array.isArray(tableFields)) {
         tableFields.forEach((field) => {
           allEntries.push({
             tableName,
             field,
           });
         });
       }
     });

     return allEntries;
   };

   const handleOpenDictionary = () => {
     setDictionaryDialogOpen(true);
   };

   const handleCloseDictionary = () => {
     setDictionaryDialogOpen(false);
   };
   ```

4. **Button Relocation and Update**:
   - Moved dictionary button from beside table dropdown to beside "Get Top 10 Records" button
   - Created new row with both buttons: "Get Top 10 Records" and dictionary icon
   - Added `onClick={handleOpenDictionary}` to the MenuBook IconButton
   - Button is enabled when API returns dictionary data (not dependent on table selection)
   - Wrapped IconButton in `<span>` to prevent disabled tooltip issues

5. **Dialog Component** (Lines ~1913-2081):
   - Full-featured dialog with title "Data Dictionary" (not "Table Dictionary")
   - Subtitle: "All available table fields and metadata"
   - Added **Table Name** column as first column
   - Shows data from ALL tables, not just selected table
   - Responsive table layout with sticky header
   - Max height: 600px with scrolling for large datasets
   - Handles both snake_case (field_name) and camelCase (fieldName) for backward compatibility
   - Sample values: Shows first 3 unique values from field_values array
   - Data type displayed as a colored chip
   - Empty state when no dictionary data is available

### 3. Dictionary Data Structure

The dictionary data comes from the API response (`requestinputs.php`) in this format:

```json
{
  "TABLE_NAME": [
    {
      "field_name": "COUNTRY",
      "description": "ISO country code of the profile",
      "field_values": ["US", "US", "US", "CA", "UK", ...],
      "data_type": "STRING"
    },
    {
      "field_name": "PROFILE_ID",
      "description": "Unique customer profile identifier",
      "field_values": ["123", "456", "789", ...],
      "data_type": "INTEGER"
    }
  ]
}
```

**API Response Mapping**:
- Accessed via: `apiSources.dbSource.dataDictionary`
- Key: Table name (e.g., "PROFILE", "ZXDS_ALLCHANNEL_Q1_2026_UNIVERSE_PERMISSIONED_DND")
- Value: Array of field metadata objects

### 4. UI/UX Features

#### Dictionary Button Location
- **Where**: Beside "Get Top 10 Records" button (right side)
- **Icon**: MenuBook (book icon)
- **State**:
  - Disabled when API doesn't return dictionary data
  - Enabled with blue color when dictionary data is available
  - Not dependent on table selection
  - Hover effect: Light blue background

#### Dialog Layout
```
┌─ Data Dictionary ─────────────────────────────┐
│  All available table fields and metadata      │
│  ┌────────────────────────────────────────┐   │
│  │ Table │ Field │ Descr │ Sample │ Type │   │
│  ├────────────────────────────────────────┤   │
│  │ PROFIL│COUNTRY│ ISO c │ US, CA │STRING│   │
│  │ PROFIL│PROF_ID│ Uniq  │ 123,45 │INT   │   │
│  │ ZXDS..│ MD5   │ MD5 h │ abc... │STRING│   │
│  └────────────────────────────────────────┘   │
│                                    [Close]     │
└────────────────────────────────────────────────┘
```

#### Table Columns
1. **Table Name**: Regular text, shows which table the field belongs to
2. **Field Name**: Bold text, dark color
3. **Description**: Regular text, secondary color
4. **Sample Values**: Monospace font, truncated with ellipsis if too long, hover to see full text
5. **Data Type**: Chip with blue background (e.g., STRING, INTEGER, BOOLEAN)

#### Sample Values Display
- Shows first 3 unique values from the field_values array
- Format: `value1, value2, value3, ...`
- If more than 3 values exist, appends ", ..." to indicate more data
- Truncates long text with ellipsis, shows full text on hover

#### Empty State
- Displayed when no dictionary data is available for the selected table
- Shows message: "No dictionary data available for this table."
- Styled with dashed border and light background

### 5. Backward Compatibility

The implementation supports both data formats:

**New Format** (from requestinputs.php):
```json
{
  "field_name": "COUNTRY",
  "description": "...",
  "field_values": ["US", "CA", "UK"],
  "data_type": "STRING"
}
```

**Legacy Format** (if API returns camelCase):
```json
{
  "fieldName": "COUNTRY",
  "description": "...",
  "availableValues": "US, CA, UK",
  "dataType": "STRING"
}
```

The code checks for both formats and uses whichever is available.

### 6. Visual Design

#### Dialog Styling
- **Border Radius**: 8px (rounded corners)
- **Shadow**: Soft elevation shadow
- **Max Width**: Medium (md) - ~900px
- **Full Width**: Yes (responsive)

#### Table Styling
- **Header Background**: Light gray (#F8FAFB)
- **Header Font**: Bold, 0.8rem
- **Row Hover**: Light background on hover
- **Border**: 1px solid divider color
- **Cell Padding**: Compact (py: 1)

#### Data Type Chip Styling
- **Background**: Light blue (#E6F2FF)
- **Text Color**: Dark blue (#0066CC)
- **Border**: 1px solid light blue (#B3D9FF)
- **Size**: Small (height: 22px)
- **Font Size**: 0.7rem

### 7. Example API Response

From `requestinputs.php`:

```json
{
  "dbSource": {
    "dataDictionary": {
      "PROFILE": [
        {
          "field_name": "PROFILE_ID",
          "description": "Unique customer profile identifier",
          "field_values": ["123", "456", "789", "101", "202"],
          "data_type": "INTEGER"
        },
        {
          "field_name": "EMAIL_ADDRESS_MD5",
          "description": "MD5 hash of customer email address",
          "field_values": ["5c5e3e9f...", "8f7d6e5c...", "3a2b1c9d..."],
          "data_type": "STRING"
        },
        {
          "field_name": "COUNTRY",
          "description": "ISO country code of the profile",
          "field_values": ["US", "US", "CA", "US", "UK", "US", "US"],
          "data_type": "STRING"
        }
      ],
      "ZXDS_ALLCHANNEL_Q1_2026_UNIVERSE_PERMISSIONED_DND": [
        {
          "field_name": "MD5",
          "description": "MD5 hash of email or identifier",
          "field_values": ["abc123...", "def456...", "ghi789..."],
          "data_type": "STRING"
        },
        {
          "field_name": "EMAIL",
          "description": "Customer email address",
          "field_values": ["user1@example.com", "user2@example.com", "user3@example.com"],
          "data_type": "STRING"
        },
        {
          "field_name": "CHANNEL",
          "description": "Marketing channel identifier",
          "field_values": ["EMAIL", "SMS", "PUSH", "EMAIL", "SMS"],
          "data_type": "STRING"
        }
      ]
    }
  }
}
```

### 8. User Experience Flow

#### Success Case (Dictionary Available):
1. User selects "Database" as source type
2. User selects "Preconfigured Table" option
3. Dictionary icon is enabled (blue) if API returned dictionary data
4. User clicks dictionary icon (beside "Get Top 10 Records" button)
5. Dialog opens showing "Data Dictionary" title
6. User views ALL field metadata from ALL tables
7. User can scroll to see all entries (sticky header)
8. User sees which table each field belongs to
9. User closes dialog

#### Empty Case (No Dictionary):
1. User selects "Database" as source type
2. User selects "Preconfigured Table" option
3. API doesn't return dictionary data
4. Dictionary button is disabled (grayed out)
5. User cannot click the button

### 9. Benefits

1. **Field Discovery**: Users can understand what each field contains before selecting headers
2. **Data Quality**: Sample values help users verify data format and content
3. **Type Awareness**: Data type information helps users understand field constraints
4. **No External Documentation**: All metadata is inline, no need to consult external docs
5. **Non-Intrusive**: Modal dialog doesn't clutter the main UI
6. **Searchable**: Users can Ctrl+F to search for specific fields in the dialog

### 10. Technical Considerations

#### Performance
- Dialog only renders when opened (not pre-rendered)
- Dictionary data is already loaded from requestinputs.php API call
- No additional API call needed
- Table renders only the fields for the selected table

#### Data Handling
- Handles missing field_values gracefully (shows "--")
- Handles missing dictionary for a table (shows empty state)
- Handles both array and string formats for sample values
- Limits sample values to first 3 unique values to keep display clean

#### Styling
- Consistent with existing DatabaseSourceConfig styling
- Uses application theme colors
- Responsive table layout with max-width on sample values column
- Truncates long text with ellipsis and shows full text on hover

### 11. Future Enhancements

Possible improvements:
1. **Search in Dialog**: Add search box to filter by table name, field name, or description
2. **Copy Field Name**: Add copy-to-clipboard button for field names
3. **Sort Options**: Allow sorting by table name, field name, data type, or description
4. **Filter by Table**: Add dropdown to filter and show only specific table's fields
5. **Field Statistics**: Show min/max/avg for numeric fields
6. **Related Tables**: Show relationships to other tables if available
7. **Download Dictionary**: Export dictionary as CSV or JSON
8. **Grouping**: Group fields by table name with collapsible sections

## Testing Scenarios

1. **Normal Flow**:
   - Select Database source type
   - Select Preconfigured Table option
   - Click dictionary button (beside "Get Top 10 Records")
   - Verify dialog opens with title "Data Dictionary"
   - Verify ALL tables and fields are displayed
   - Verify table names are shown in first column
   - Verify sample values show correctly
   - Close dialog

2. **No Dictionary Data**:
   - When API doesn't return dictionary data
   - Verify dictionary button is disabled
   - Cannot click to open dialog

3. **Multiple Tables in View**:
   - Open dictionary dialog
   - Scroll through table
   - Verify fields from different tables are shown
   - Verify table name changes between entries
   - Verify sticky header remains visible while scrolling

4. **Long Sample Values**:
   - Select table with long field values
   - View dictionary
   - Verify text is truncated with ellipsis
   - Hover over truncated text
   - Verify full text is shown in tooltip

5. **Different Data Types**:
   - View dictionary with mixed data types (STRING, INTEGER, BOOLEAN, etc.)
   - Verify each type is displayed with correct chip color

## Build Status
✅ Build successful with no TypeScript errors
✅ All components compile correctly
✅ Feature ready for testing
