# Content Loader Implementation - Updated

## Overview
Implemented localized loading indicators for the Data Requests List page and Data Request Creation page. The loaders are shown only over the specific content areas (table and form) rather than blocking the entire window, allowing users to see the page structure and headers while data loads.

---

## Changes Made

### 1. Created Reusable ContentLoader Component
**File:** `/src/components/ContentLoader/ContentLoader.tsx`

A new inline content loader component that displays:
- Medium-sized circular progress spinner (50px)
- Customizable loading message
- Configurable minimum height
- Centered layout within its container
- Brand color (#296695) for the spinner

**Props:**
- `message?: string` - Custom loading message (default: "Loading...")
- `minHeight?: string | number` - Minimum height for the loader container (default: "400px")

**Features:**
- Integrates seamlessly into existing layouts
- No viewport blocking - only covers the specific content area
- Maintains page structure visibility during loading

---

### 2. Updated Data Requests List Page
**File:** `/src/views/reports/list/Index.tsx`

#### Changes:
1. **Replaced Import:**
   ```typescript
   import ContentLoader from '../../../components/ContentLoader/ContentLoader';
   ```

2. **Table Loading State:**
   - Shows `ContentLoader` inside the `TableContainer` when loading
   - Table header, pagination, and all page elements remain hidden during load
   - Only the table container shows the loader

3. **Implementation:**
   ```typescript
   <TableContainer component={Paper}>
     {loading ? (
       <ContentLoader message="Loading data pull reports..." minHeight="500px" />
     ) : (
       <Table>
         {/* Table content */}
       </Table>
     )}
     {!loading && (
       <TablePagination {...paginationProps} />
     )}
   </TableContainer>
   ```

#### What Remains Visible While Loading:
- ✅ Page header ("Data Pull Reports")
- ✅ Page description
- ✅ "New Request" button
- ✅ Refresh button
- ✅ Stats cards (Today's Requests, In Progress, Completed)

#### What Shows Loader:
- 🔄 Table content area
- 🔄 Pagination (hidden during load)

**API Calls Covered:**
- `getAllReports({ offset, limit })` - Fetches report list with pagination and statistics

---

### 3. Updated Data Request Creation Page
**File:** `/src/views/universal-pull/create/Index.tsx`

#### Changes:
1. **Replaced Import:**
   ```typescript
   import ContentLoader from '../../../components/ContentLoader/ContentLoader';
   ```

2. **Combined Loading Logic:**
   ```typescript
   const isInitialLoading = sourcesLoading || editRequestLoading;
   const loadingMessage = editRequestLoading
     ? 'Loading request data...'
     : 'Loading available data sources...';
   ```

3. **Form Loading State:**
   - Shows `ContentLoader` in place of the entire form when loading
   - Header and action buttons remain visible but disabled
   - Dynamic loading message based on which API is loading

4. **Implementation:**
   ```typescript
   {isInitialLoading ? (
     <Paper sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
       <ContentLoader message={loadingMessage} minHeight="600px" />
     </Paper>
   ) : (
     <>
       {/* Request Name Section */}
       {/* Accordion/Stepper Content */}
       {/* All Form Modules */}
     </>
   )}
   ```

#### What Remains Visible While Loading:
- ✅ Page header ("Create New Request" / "Edit Request" / "Duplicate Request")
- ✅ Page description
- ✅ View mode toggle (disabled during load)
- ✅ Cancel button (disabled during load)
- ✅ Submit/Update button (disabled during load)

#### What Shows Loader:
- 🔄 Request name field
- 🔄 All 7 module accordions/stepper steps
- 🔄 Bottom action buttons

#### Disabled During Load:
- 🚫 View mode toggle switch
- 🚫 Cancel button
- 🚫 Submit/Update Request button

**API Calls Covered:**
1. `getRequestInputs()` - Loads available sources (via `useDataLoading` hook)
   - File sources (SFTP, NFS, AWS)
   - Database sources and preconfigured tables
   - Data dictionary

2. `getEditRequest(requestId)` - Loads request data (in edit/duplicate mode)
   - Complete request configuration
   - All module configurations

---

## User Experience Improvements

### Before (Full-Page Loader):
- ❌ Entire window blocked
- ❌ No page structure visible
- ❌ No context about where you are
- ❌ Feels like app is frozen

### After (Content Loader):
- ✅ Page header and navigation visible
- ✅ Action buttons visible (disabled)
- ✅ Clear context about the page
- ✅ Only content area shows loading
- ✅ Feels responsive and informative

### Benefits:
1. **Better Context** - Users know which page they're on
2. **Visual Hierarchy** - Clear distinction between UI and loading content
3. **Feels Faster** - Partial page visibility makes wait feel shorter
4. **Professional UX** - Industry-standard loading pattern
5. **Better Accessibility** - Screen readers can announce page context
6. **Prevents Accidental Actions** - Buttons disabled during load

---

## Loading States Tracked

### Reports List Page:
- **State Variable:** `loading`
- **Triggered By:**
  - Initial page load
  - Pagination change (page or rows per page)
  - Manual refresh button click
- **API Call:** `getAllReports({ offset, limit })`
- **Duration:** From API call start to response processing completion

### Request Creation Page:
- **State Variables:**
  - `sourcesLoading` - From `useDataLoading()` hook
  - `editRequestLoading` - Direct state in component
- **Combined:** `isInitialLoading = sourcesLoading || editRequestLoading`
- **Triggered By:**
  - Initial page load (new request)
  - Loading request for edit mode
  - Loading request for duplicate mode
- **API Calls:**
  - `getRequestInputs()` - Always loads first
  - `getEditRequest(id)` - Only in edit/duplicate mode
- **Duration:** Until BOTH APIs complete (if applicable)

---

## API Call Flow

### Reports List:
```
User action (visit page / change pagination / click refresh)
  ↓
setLoading(true)
  ↓
getAllReports({ offset, limit })
  ↓
Response received
  ↓
setReports(data) + setTotalCount() + setApiCounts()
  ↓
setLoading(false)
  ↓
ContentLoader hidden → Table + Pagination shown
```

### Request Creation (New):
```
User visits /dataPullRequests/new
  ↓
sourcesLoading = true
  ↓
getRequestInputs() via useDataLoading hook
  ↓
Response received
  ↓
sourcesLoading = false
  ↓
ContentLoader hidden → Empty form shown
```

### Request Creation (Edit/Duplicate):
```
User visits /dataPullRequests/edit/:id or /new?duplicate=:id
  ↓
sourcesLoading = true
editRequestLoading = true
isInitialLoading = true
  ↓
getRequestInputs() + getEditRequest(id) in parallel
  ↓
Both responses received
  ↓
sourcesLoading = false
editRequestLoading = false
isInitialLoading = false
  ↓
ContentLoader hidden → Pre-filled form shown
```

---

## Component Hierarchy

### Reports List Page:
```
<Box> (page container)
  └─ <Box> (header section) ✅ VISIBLE
      ├─ Typography (title + description) ✅ VISIBLE
      ├─ Buttons (Refresh, New Request) ✅ VISIBLE
      └─ Stats Cards (3x) ✅ VISIBLE
  └─ <TableContainer> (table wrapper)
      ├─ {loading ? ContentLoader : Table} 🔄 LOADING AREA
      └─ {!loading && TablePagination} 🔄 LOADING AREA
```

### Request Creation Page:
```
<Box> (page container)
  └─ <Box> (header section) ✅ VISIBLE
      ├─ Typography (title + description) ✅ VISIBLE
      └─ Buttons (Toggle, Cancel, Submit) ✅ VISIBLE (disabled)
  └─ Error/Success Alerts ✅ VISIBLE
  └─ {isInitialLoading ? ContentLoader : FormContent} 🔄 LOADING AREA
      ├─ Request Name Field
      ├─ Module Accordions/Stepper
      └─ All Form Inputs
```

---

## Technical Details

### ContentLoader Styling:
- **Position:** `relative` (flows with layout)
- **Display:** `flex` column
- **Alignment:** Center both axes
- **Min Height:** Configurable (500px for table, 600px for form)
- **Padding:** Vertical padding of 8 theme units (64px)
- **Gap:** 2 theme units between spinner and text

### Responsive Behavior:
- Adapts to container width
- Minimum height ensures sufficient visual presence
- Works with Paper/TableContainer boundaries

### Loading State Dependencies:
- Reports List: Single `loading` state
- Request Creation: Combined `isInitialLoading` from two sources
- No race conditions - both APIs must complete

---

## Testing Checklist

### Reports List Page:
- [ ] Visit `/dataPullReports` - verify header and stats visible, table shows loader
- [ ] Wait for data load - verify loader disappears, table appears with data
- [ ] Change pagination - verify loader shows in table area only
- [ ] Click refresh button - verify loader behavior
- [ ] Check stats cards remain visible during load
- [ ] Verify "New Request" button always clickable

### Request Creation Page (New):
- [ ] Visit `/dataPullRequests/new`
- [ ] Verify header and buttons visible (disabled)
- [ ] Verify "Loading available data sources..." message
- [ ] Verify form appears after loader disappears
- [ ] Verify all dropdowns populated correctly

### Request Creation Page (Edit):
- [ ] Visit `/dataPullRequests/edit/[valid-id]`
- [ ] Verify header shows "Edit Request" (visible)
- [ ] Verify "Loading request data..." message
- [ ] Verify form pre-filled with correct data
- [ ] Verify all modules populated

### Request Creation Page (Duplicate):
- [ ] Visit `/dataPullRequests/new?duplicate=[valid-id]`
- [ ] Verify header shows "Duplicate Request" (visible)
- [ ] Verify loading behavior same as edit
- [ ] Verify form pre-filled with duplicated data

### Network Simulation:
- [ ] Throttle to Slow 3G in browser dev tools
- [ ] Verify loaders remain visible during slow API calls
- [ ] Verify page structure always visible
- [ ] Verify buttons properly disabled during load
- [ ] Verify no flickering or layout shifts

### Edge Cases:
- [ ] API failure - error alerts should appear, loader should disappear
- [ ] Empty data - "No reports available" message for list page
- [ ] Multiple rapid pagination clicks - verify loader behavior
- [ ] Browser back/forward - verify correct loading states

---

## File Structure

```
src/
├── components/
│   └── ContentLoader/
│       └── ContentLoader.tsx          [NEW] - Reusable inline loader
├── views/
│   ├── reports/
│   │   └── list/
│   │       └── Index.tsx              [MODIFIED] - Table loader
│   └── universal-pull/
│       └── create/
│           └── Index.tsx              [MODIFIED] - Form loader
```

---

## Removed Files

- ❌ `/src/components/PageLoader/PageLoader.tsx` - No longer needed (full-page loader)

---

## Migration Notes

### From Full-Page to Content Loader:
1. Changed from blocking entire viewport to inline content area
2. Maintained all loading state logic
3. Improved UX by keeping page structure visible
4. Added button disabling during load for creation page
5. No breaking changes to API calls or state management

### Performance:
- No performance impact
- Slightly better perceived performance due to visible page structure
- Same number of API calls
- Same loading duration

---

## Best Practices Applied

1. ✅ **Progressive Disclosure** - Show what's ready, load what's not
2. ✅ **Visual Feedback** - Clear spinner and descriptive messages
3. ✅ **Context Preservation** - Users always know where they are
4. ✅ **State Management** - Proper loading state tracking
5. ✅ **Accessibility** - Screen readers can announce page context
6. ✅ **Error Handling** - Errors shown via Alert components
7. ✅ **Consistent Patterns** - Same loader component used across pages
8. ✅ **Responsive Design** - Loader adapts to container

---

## Notes

- TypeScript compilation passes without errors ✅
- All existing functionality preserved ✅
- No breaking changes ✅
- Follows existing code patterns in the project ✅
- ContentLoader component is reusable for future pages ✅
