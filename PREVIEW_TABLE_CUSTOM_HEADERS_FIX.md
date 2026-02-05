# Preview Table with Custom Headers Fix

## Overview
Fixed the issue where the Top 10 Records preview table disappears when Custom Headers are configured in Input Source creation.

---

## Problem Statement

### Reported Issue
When creating an Input Source (File):
1. User uploads a file and clicks "Get Sample Records"
2. Preview table appears correctly
3. User enters Custom Headers
4. **Preview table disappears** ❌
5. Preview data is not being populated or aligned with the latest table data configuration

---

## Root Cause Analysis

### The Problem Flow

```
1. User uploads file and gets preview data
   ↓
   previewData state = [records...]  ✓ Working
   ↓
2. Preview table renders
   ↓
   {previewData?.length > 0 && <PreviewTable />}  ✓ Showing
   ↓
3. User enters custom headers
   ↓
   handleCustomHeadersChange() called
   ↓
   Transforms previewData with custom headers
   ↓
   setPreviewData(transformedData)  ✓ Updated locally
   ↓
   updateParentData({ previewData: transformedData, ... })  ✓ Sent to parent
   ↓
4. Parent data updates, triggers useEffect
   ↓
   useEffect(() => { ... }, [data])  ← RUNS AGAIN
   ↓
   setPreviewData(data.previewData || [])  ❌ RESETS TO EMPTY []
   ↓
5. Preview table disappears
   ↓
   previewData?.length === 0  ❌ No longer showing
```

### Code Location
**File:** `/src/components/InputModule/FileSourceConfig.tsx`
**Lines:** 214-289

### Problematic Code (Before Fix)

```typescript
useEffect(() => {
  if (data && Object.keys(data).length > 0) {
    // ... other state updates ...

    setFilePath(filePathValue);
    setFileName(fileNameValue);
    setDelimiter(data.delimiter || ',');
    setHasHeader(data.hasHeader ?? true);
    setPreviewData(data.previewData || []);  // ❌ ALWAYS RESETS previewData

    // Guard for headers only - NOT for previewData
    if (!isUpdatingCustomHeaders.current) {
      const headersFromData = data.headers || [];
      setHeaders(headersFromData);
      setAllAvailableHeaders(headersFromData);
      setSelectedHeaders(data.selectedHeaders || headersFromData);
    }
    // ...
  }
}, [data]);
```

**Issue:**
- `setPreviewData(data.previewData || [])` runs **every time** `data` changes
- When custom headers are applied, it updates parent data, which triggers this useEffect
- The guard `!isUpdatingCustomHeaders.current` protects headers but **NOT** previewData
- Result: previewData gets reset to empty array `[]` before the parent data can be updated

---

## Solution

### Fix 1: Move previewData Update Inside the Guard

```typescript
useEffect(() => {
  if (data && Object.keys(data).length > 0) {
    // ... other state updates ...

    setFilePath(filePathValue);
    setFileName(fileNameValue);
    setDelimiter(data.delimiter || ',');
    setHasHeader(data.hasHeader ?? true);

    // ✅ MOVED INSIDE GUARD - Only update when NOT updating custom headers
    if (!isUpdatingCustomHeaders.current) {
      setPreviewData(data.previewData || []);  // ✅ NOW PROTECTED
      const headersFromData = data.headers || [];
      setHeaders(headersFromData);
      setAllAvailableHeaders(headersFromData);
      setSelectedHeaders(data.selectedHeaders || headersFromData);
    }
    // ...
  }
}, [data]);
```

**Fix:**
- Moved `setPreviewData(data.previewData || [])` inside the guard
- Now when custom headers are being updated (`isUpdatingCustomHeaders.current = true`), the previewData is **NOT** reset
- The transformed preview data remains intact and the table continues to show

---

### Fix 2: Update selectedPreviewColumns with Custom Headers

**Problem:**
Even after Fix 1, the preview table still showed original column names with empty data because `selectedPreviewColumns` (which controls table column display) was not being updated when custom headers were applied.

**Code Location:** Lines 667-669 and 716-718

**Fix When Custom Headers Are Applied:**

```typescript
// Update allAvailableHeaders and selectedHeaders with custom headers
setAllAvailableHeaders(customHeadersList);
setSelectedHeaders(customHeadersList);
setSelectedPreviewColumns(customHeadersList);  // ✅ ADDED - Update preview columns
```

**Fix When Custom Headers Are Cleared:**

```typescript
// Reset to original headers if custom headers are cleared
if (!trimmedValue && headers?.length > 0) {
  setAllAvailableHeaders(headers);
  setSelectedHeaders(headers);
  setSelectedPreviewColumns(headers);  // ✅ ADDED - Reset preview columns
```

**Fix:**
- Added `setSelectedPreviewColumns(customHeadersList)` when custom headers are applied (line 669)
- Added `setSelectedPreviewColumns(headers)` when custom headers are cleared (line 718)
- Now the preview table displays the correct column headers that match the transformed preview data keys
- Data is no longer empty because column names match the data object properties

---

## How the Guard Works

### isUpdatingCustomHeaders Flag

```typescript
const isUpdatingCustomHeaders = useRef(false);  // Ref to track custom header updates
```

### Flow with Guard Protection

```
1. User enters custom headers
   ↓
2. handleCustomHeadersChange() called
   ↓
   isUpdatingCustomHeaders.current = true  ✓ SET FLAG
   ↓
   Transform preview data
   ↓
   setPreviewData(transformedData)  ✓ Local state updated
   ↓
   updateParentData({ previewData: transformedData, ... })
   ↓
3. Parent data updates, triggers useEffect
   ↓
   useEffect(() => { ... }, [data])  ✓ RUNS
   ↓
   if (!isUpdatingCustomHeaders.current) {  ✓ FALSE - SKIP
     setPreviewData(data.previewData || [])  ← NOT EXECUTED
   }
   ↓
4. Preview data remains intact
   ↓
   isUpdatingCustomHeaders.current = false  ✓ RESET FLAG
   ↓
5. Preview table continues to show  ✓ FIXED
```

---

## Files Modified

**File:** `/src/components/InputModule/FileSourceConfig.tsx`

### Change 1: useEffect Guard (Lines 256-269)

#### Before
```typescript
setFilePath(filePathValue);
setFileName(fileNameValue);
setDelimiter(data.delimiter || ',');
setHasHeader(data.hasHeader ?? true);
setPreviewData(data.previewData || []);  // ❌ Outside guard

// IMPORTANT: data.headers should contain custom headers if they were applied
// Always use data.headers as the source of truth
// But don't override if we're currently updating custom headers
if (!isUpdatingCustomHeaders.current) {
  const headersFromData = data.headers || [];
  setHeaders(headersFromData);
  setAllAvailableHeaders(headersFromData);
  setSelectedHeaders(data.selectedHeaders || headersFromData);
}
```

#### After
```typescript
setFilePath(filePathValue);
setFileName(fileNameValue);
setDelimiter(data.delimiter || ',');
setHasHeader(data.hasHeader ?? true);

// IMPORTANT: data.headers should contain custom headers if they were applied
// Always use data.headers as the source of truth
// But don't override if we're currently updating custom headers
if (!isUpdatingCustomHeaders.current) {
  setPreviewData(data.previewData || []);  // ✅ Inside guard
  const headersFromData = data.headers || [];
  setHeaders(headersFromData);
  setAllAvailableHeaders(headersFromData);
  setSelectedHeaders(data.selectedHeaders || headersFromData);
}
```

### Change 2: Update selectedPreviewColumns (Lines 667-669, 716-718)

#### Before (Custom Headers Applied)
```typescript
// Update allAvailableHeaders and selectedHeaders with custom headers
setAllAvailableHeaders(customHeadersList);
setSelectedHeaders(customHeadersList);
// ❌ selectedPreviewColumns NOT updated - table shows original columns with empty data
```

#### After (Custom Headers Applied)
```typescript
// Update allAvailableHeaders and selectedHeaders with custom headers
setAllAvailableHeaders(customHeadersList);
setSelectedHeaders(customHeadersList);
setSelectedPreviewColumns(customHeadersList);  // ✅ NOW UPDATED
```

#### Before (Custom Headers Cleared)
```typescript
// Reset to original headers if custom headers are cleared
if (!trimmedValue && headers?.length > 0) {
  setAllAvailableHeaders(headers);
  setSelectedHeaders(headers);
  // ❌ selectedPreviewColumns NOT reset - table shows custom columns with empty data
```

#### After (Custom Headers Cleared)
```typescript
// Reset to original headers if custom headers are cleared
if (!trimmedValue && headers?.length > 0) {
  setAllAvailableHeaders(headers);
  setSelectedHeaders(headers);
  setSelectedPreviewColumns(headers);  // ✅ NOW RESET
```

---

## Testing Steps

### Test Case 1: Custom Headers with Preview Table

1. Go to **Input Module**
2. Click **"Add Source"**
3. Select **File** source type
4. Upload a CSV file with data
5. Click **"Get Sample Records"**
6. **Verify:** Preview table appears with original headers ✓
7. Enter custom headers (e.g., `id,name,email,age`)
8. **Verify:** Preview table **still shows** with custom headers ✓
9. **Verify:** Data is correctly mapped to custom headers ✓

---

### Test Case 2: Clear Custom Headers

1. Follow steps 1-8 from Test Case 1
2. Clear the custom headers field
3. **Verify:** Preview table **still shows** with original headers ✓
4. **Verify:** Data reverts to original headers ✓

---

### Test Case 3: Edit Mode with Custom Headers

1. Create an input source with custom headers
2. Save the source
3. Go to edit mode
4. **Verify:** Preview table shows with custom headers ✓
5. Modify custom headers
6. **Verify:** Preview table updates and remains visible ✓

---

### Test Case 4: Invalid Custom Headers

1. Upload file with 5 columns
2. Enter custom headers with 3 names (incorrect count)
3. **Verify:** Validation error appears ✓
4. **Verify:** Preview table shows with **original** headers ✓
5. Correct the custom headers (5 names)
6. **Verify:** Preview table updates with custom headers ✓

---

## Related Code Sections

### Custom Headers Transformation (Line 670-703)

```typescript
const handleCustomHeadersChange = (value: string) => {
  setCustomHeadersInput(value);

  // ... validation ...

  if (validation.isValid) {
    const customHeadersList = trimmedValue.split(',').map(h => h.trim());

    // Set flag to prevent useEffect from overriding our changes
    isUpdatingCustomHeaders.current = true;  // ← SET FLAG

    // Transform preview data to use custom headers
    transformedData = originalPreviewData?.map(row => {
      const newRow: Record<string, any> = {};
      headers?.forEach((originalHeader, index) => {
        if (index < customHeadersList?.length) {
          newRow[customHeadersList[index]] = row[originalHeader];
        }
      });
      return newRow;
    });

    setPreviewData(transformedData);  // ← UPDATE LOCAL STATE

    // Update parent data with transformed headers and data
    updateParentData({
      customHeaders: trimmedValue,
      headers: customHeadersList,
      selectedHeaders: customHeadersList,
      previewData: transformedData,  // ← SEND TO PARENT
      // ...
    });
  }
}
```

### Preview Table Rendering (Line 996)

```typescript
{previewData?.length > 0 && (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2">Sample Records</Typography>
    <Table>
      <TableHead>
        <TableRow>
          {selectedPreviewColumns.map((header) => (
            <TableCell key={header}>{header}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {previewData.map((row, index) => (
          <TableRow key={index}>
            {selectedPreviewColumns.map((header) => (
              <TableCell key={header}>{row[header]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
)}
```

---

## Impact

### ✅ Fixed Issues
1. ✅ Preview table now remains visible when custom headers are configured
2. ✅ Preview data correctly transforms to use custom headers
3. ✅ Data mapping aligns with custom header names
4. ✅ Preview table shows custom header column names (not original headers)
5. ✅ Preview table displays correct data under custom header columns (not empty)
6. ✅ Preview table updates dynamically as custom headers change
7. ✅ Edit mode works correctly with custom headers

### ✅ No Breaking Changes
- ✅ Normal flow (without custom headers) unchanged
- ✅ Edit mode behavior unchanged
- ✅ Data validation still works correctly
- ✅ All other state updates protected by same guard

---

## Summary

### Problems
1. **Preview table disappeared** when custom headers were configured due to `useEffect` resetting `previewData` state
2. **Preview table showed original column names with empty data** because `selectedPreviewColumns` was not updated with custom headers

### Solutions
1. Moved `setPreviewData()` inside the `isUpdatingCustomHeaders` guard to prevent reset during custom header updates
2. Added `setSelectedPreviewColumns(customHeadersList)` when custom headers are applied
3. Added `setSelectedPreviewColumns(headers)` when custom headers are cleared

### Result
Preview table now remains visible and correctly displays custom header column names with properly mapped data.

### Status
✅ **FIXED** - Preview table now works correctly with custom headers

---

## Related Documentation
- **Filters Guide:** `/FILTERS_COMPLETE_GUIDE.md`
- **FileSourceConfig Component:** `/src/components/InputModule/FileSourceConfig.tsx`
