# Dynamic Stats View - Features Summary

## Overview
The Dynamic Stats View in the Stats Configuration Dialog now supports per-field distinct counts and provides mock data fallback when API calls fail.

## Key Features

### 1. Per-Field Distinct Counts
Each dynamic stats configuration can specify which fields should have distinct counts:
- **Generate Counts On**: Single field selector for which field to count
- **Distinct Fields**: Multi-select dropdown showing the selected "Generate Counts On" field
- Users can mark the field as distinct by selecting it in the "Distinct Fields" dropdown
- Each stat in the configured list stores its own `distinctFields` array
- The distinct setting is displayed in the accordion summary: "Counts: EMAIL | Breakdown: STATE | Distinct: EMAIL"
- Loaded stats from `requestData.dynamicStats` preserve their distinct field settings
- Backward compatibility: Old stats with `isDistinct: true` are converted to `distinctFields: [countsOn]`

### 2. Mock Data Fallback
Automatic fallback to mock data when API calls fail or return no data:

#### When Mock Data is Used:
- API call fails (network error, timeout, etc.)
- API returns `success: false`
- API returns `success: true` but with empty data array
- API returns null/undefined data

#### Mock Data Generation:
```javascript
generateMockDynamicStatsData(countsOn, breakdownBy, distinctFields)
```
- Generates 5 sample rows with breakdown values: CA, NY, TX, FL, IL
- Column naming reflects distinct setting per field:
  - If field is in `distinctFields` array: `Distinct_Count_EMAIL`
  - If field is not in `distinctFields` array: `Count_EMAIL`
- Random count values between 1,000 and 11,000
- Example: If `countsOn = "EMAIL"` and `distinctFields = ["EMAIL"]`, column name will be `Distinct_Count_EMAIL`

#### User Feedback:
- Alert message: "API call failed or returned no data. Displaying mock data for demonstration purposes."
- Visual indicators in the UI (see below)

### 3. Visual Indicators for Mock Data

#### Accordion Summary Badge:
- Yellow "Mock Data" badge appears next to input source name
- Style:
  - Background: `#FFF3CD`
  - Text: `#856404`
  - Border: `#FFE69C`
  - Font size: `0.65rem`

#### Table Warning Banner:
- Warning alert displayed above the data table
- Message: "This is mock data displayed for demonstration purposes. The API call failed or returned no data."
- Styled consistently with the badge (yellow warning colors)

### 4. Data Structure

Each generated dynamic stat includes:
```typescript
{
  id: string;                    // Unique identifier
  inputSource: string;           // Selected input source name
  countsOn: string;              // Field to count
  breakdownBy: string;           // Field to breakdown by
  distinctFields: string[];      // Array of fields marked as distinct
  data: any[];                   // Stats results (real or mock)
  expanded: boolean;             // Accordion expansion state
  isMockData?: boolean;          // Flag indicating mock data
}
```

### 5. User Interface

#### Form Layout:
1. **Input Source** (Dropdown)
   - Single select dropdown
   - Required field
   - Resets "Generate Counts On" and "Breakdown By" when changed

2. **Generate Counts On** (Dropdown - Single Select)
   - Single field selector
   - Required field
   - Disabled until Input Source is selected
   - Clears "Distinct Fields" when changed

3. **Breakdown By** (Dropdown - Single Select)
   - Single field selector
   - Required field
   - Disabled until Input Source is selected

4. **Distinct Fields** (Multi-Select Dropdown)
   - Shows only the field selected in "Generate Counts On"
   - Optional field
   - Disabled until "Generate Counts On" is selected
   - Displays selected fields as chips with purple theme
   - Helper text: "(Select which fields should have distinct counts)"

5. **Generate Button**
   - Disabled until Input Source, Counts On, and Breakdown By are all selected
   - Shows loading spinner during API call
   - Success: Adds stat to configured list and resets form
   - Failure: Adds stat with mock data and shows warning

### 6. Loading Saved Dynamic Stats

When viewing an existing request with saved dynamic stats:
- `requestData.dynamicStats` is loaded via useEffect
- Each stat is mapped to the internal structure
- `isMockData` is set to `false` for all loaded stats
- Stats are immediately available in the configured list

## Implementation Details

### Files Modified:
1. **StatsConfigDialog.tsx**
   - Replaced `isDynamicDistinct` (boolean) state with `selectedDynamicDistinctFields` (string[])
   - Updated `generatedDynamicStats` state type:
     - Changed `isDistinct: boolean` to `distinctFields: string[]`
     - Added `isMockData?: boolean` flag
   - Updated `generateMockDynamicStatsData()` function to accept `distinctFields` array parameter
   - Enhanced `handleGenerateDynamicStats()` with fallback logic for failed API calls
   - Added useEffect to load existing dynamic stats from requestData with backward compatibility
   - Added new "Distinct Fields" multi-select dropdown in the UI
   - Removed global Distinct checkbox from "Generate Counts On" section
   - Updated accordion summary to display distinct fields list
   - Updated UI to display mock data indicators (badge + warning banner)

2. **ReportsService.ts**
   - Updated `DynamicStatsData` interface:
     - Made `isDistinct` optional (deprecated, for backward compatibility)
     - Added `distinctFields?: string[]` (new field)
   - Updated `GenerateDynamicStatsRequest` interface:
     - Replaced `isDistinct: boolean` with `distinctFields: string[]`
     - Kept index signature for extensibility

### Error Handling Flow:
```
1. API Call
   ↓
2. Check response.success && data exists
   ↓ (if false)
3. Generate mock data
   ↓
4. Set isMockData flag = true
   ↓
5. Display stats with visual indicators
   ↓
6. Show user alert about mock data
```

### Catch Block Flow:
```
1. API throws error
   ↓
2. Log error to console
   ↓
3. Generate mock data
   ↓
4. Create stat with isMockData = true
   ↓
5. Add to list and reset form
   ↓
6. Show user alert about fallback
```

## User Experience

### Success Case (Real Data):
1. User fills out form
2. Clicks "Generate"
3. Loading spinner appears
4. API returns data
5. New stat added to list
6. Alert: "Dynamic stats generated successfully!"
7. Form resets for next entry

### Failure Case (Mock Data):
1. User fills out form
2. Clicks "Generate"
3. Loading spinner appears
4. API fails or returns no data
5. Mock data is generated automatically
6. New stat added with "Mock Data" badge
7. Alert: "API call failed... Displaying mock data..."
8. Form resets for next entry
9. When expanded, warning banner shows in table

### Visual Differences:
- **Real Data**: Clean accordion summary, no badges
- **Mock Data**: Yellow "Mock Data" badge + warning banner in expanded view

## How Per-Field Distinct Works

### Scenario 1: Field Marked as Distinct
- Generate Counts On: `EMAIL`
- Distinct Fields: `[EMAIL]` (selected)
- Result Column Name: `Distinct_Count_EMAIL`
- Behavior: Counts unique email addresses only

### Scenario 2: Field NOT Marked as Distinct
- Generate Counts On: `EMAIL`
- Distinct Fields: `[]` (not selected)
- Result Column Name: `Count_EMAIL`
- Behavior: Counts all email occurrences including duplicates

### Future Extensibility
The current implementation uses a single field in "Generate Counts On", but the data structure (`distinctFields: string[]`) is designed to support multiple count fields in the future. When that feature is added:
- Generate Counts On could become multi-select: `[EMAIL, PHONE]`
- Distinct Fields could allow: `[EMAIL]` (only EMAIL is distinct)
- Result columns: `Distinct_Count_EMAIL`, `Count_PHONE`

## Testing Scenarios

1. **Normal Flow**: API returns data successfully
2. **Empty Response**: API returns success but empty array
3. **Failed Response**: API returns success: false
4. **Network Error**: API call throws exception
5. **Load Existing**: View request with saved dynamicStats
6. **Multiple Stats**: Generate mix of real and mock data
7. **Distinct Variations**:
   - Generate with field marked as distinct
   - Generate with field not marked as distinct
   - Verify column naming in results
8. **Backward Compatibility**: Load old stats with `isDistinct: true`

## Benefits

1. **Resilience**: Application continues working even when API fails
2. **User Awareness**: Clear visual indicators when viewing mock data
3. **Development**: Easier UI testing without backend dependency
4. **Data Integrity**: Each stat preserves its distinct setting
5. **Debugging**: Console logs show when fallback is triggered
