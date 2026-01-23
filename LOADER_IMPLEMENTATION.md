# Loader Implementation Summary

## Overview
Added full-page loaders to both the Data Requests List page and Data Request Creation page. The loaders remain visible until all related API calls have completed.

## Changes Made

### 1. Created Reusable PageLoader Component
**File:** `/src/components/PageLoader/PageLoader.tsx`

A new reusable component that displays a full-page overlay with:
- Large circular progress spinner (60px)
- Customizable loading message
- Semi-transparent white background overlay
- High z-index (9999) to appear above all content
- Brand color (#296695) for the spinner

**Features:**
- Centered layout
- Professional design matching the application theme
- Takes up the entire viewport with fixed positioning
- Props:
  - `message?: string` - Custom loading message (default: "Loading...")

---

### 2. Updated Data Requests List Page
**File:** `/src/views/reports/list/Index.tsx`

**Changes:**
1. **Added Import:**
   ```typescript
   import PageLoader from '../../../components/PageLoader/PageLoader';
   ```

2. **Added Loader Logic:**
   - Shows `<PageLoader message="Loading data pull reports..." />` when `loading` state is true
   - Placed before the main return statement, so entire page content is replaced by loader
   - Returns early when loading, preventing any content flash

3. **Removed Old Spinner:**
   - Removed the small inline CircularProgress from the header
   - Previously showed: `Data Pull Reports [spinner]`
   - Now shows clean title without inline spinner

**API Calls Covered:**
- `getAllReports({ offset, limit })` - Fetches report list with pagination and statistics

**Behavior:**
- Loader shows immediately when page loads or pagination changes
- Loader remains visible until API response is received and processed
- Once data is loaded, the full page content (header, stats cards, table) appears

---

### 3. Updated Data Request Creation Page
**File:** `/src/views/universal-pull/create/Index.tsx`

**Changes:**
1. **Added Import:**
   ```typescript
   import PageLoader from '../../../components/PageLoader/PageLoader';
   ```

2. **Added Combined Loading Logic:**
   ```typescript
   const isInitialLoading = sourcesLoading || editRequestLoading;

   if (isInitialLoading) {
     const loadingMessage = editRequestLoading
       ? 'Loading request data...'
       : 'Loading available data sources...';
     return <PageLoader message={loadingMessage} />;
   }
   ```

3. **Removed Old Loading Alert:**
   - Removed the inline Alert component that showed "Loading request data..."
   - Replaced with full-page loader for better UX

**API Calls Covered:**
1. **`getRequestInputs()`** (via `useDataLoading` hook)
   - Loads available file sources (SFTP, NFS, AWS)
   - Loads database sources and preconfigured tables
   - Loads data dictionary
   - State: `sourcesLoading`

2. **`getEditRequest(requestId)`** (when in edit/duplicate mode)
   - Loads complete request configuration
   - Transforms and populates all module data
   - State: `editRequestLoading`

**Behavior:**
- **New Request Mode:** Shows loader while `sourcesLoading` is true (loading available sources)
- **Edit/Duplicate Mode:** Shows loader while both `sourcesLoading` AND `editRequestLoading` are true
- The loader waits for ALL API calls to complete before showing the form
- Dynamic loading message based on which API is being called
- Once all data is loaded, the full form with all 7 modules becomes available

---

## User Experience Improvements

### Before:
1. **Reports List:** Small spinner in header, table visible but empty/stale
2. **Request Creation:** Small alert box, form partially visible during loading

### After:
1. **Reports List:** Clean full-page loader with clear message, no content flash
2. **Request Creation:** Professional full-page loader that waits for all APIs, no form flicker

### Benefits:
- **No Content Flash:** Users don't see empty tables or partially loaded forms
- **Clear Feedback:** Users know exactly what's loading
- **Professional Appearance:** Consistent loading experience across pages
- **Better Performance Perception:** Full-page loader sets expectation for wait time
- **Prevents User Interaction:** Can't interact with incomplete data during load

---

## Technical Details

### Loading States Tracked

#### Reports List Page:
- `loading` - Set to true during `getAllReports()` API call
- Triggered on: Initial page load, pagination change, manual refresh

#### Request Creation Page:
- `sourcesLoading` - From `useDataLoading()` hook, tracks `getRequestInputs()` API
- `editRequestLoading` - Tracks `getEditRequest()` API (only in edit/duplicate mode)
- Combined using: `isInitialLoading = sourcesLoading || editRequestLoading`

### API Call Flow

#### Reports List:
```
User visits page
  → setLoading(true)
  → getAllReports({ offset, limit })
  → Response received
  → setReports(data)
  → setLoading(false)
  → PageLoader hidden, content shown
```

#### Request Creation (New):
```
User visits /dataPullRequests/new
  → sourcesLoading = true
  → getRequestInputs()
  → Response received
  → sourcesLoading = false
  → PageLoader hidden, form shown
```

#### Request Creation (Edit):
```
User visits /dataPullRequests/edit/:id
  → sourcesLoading = true
  → editRequestLoading = true
  → getRequestInputs() + getEditRequest(id)
  → Both responses received
  → sourcesLoading = false
  → editRequestLoading = false
  → PageLoader hidden, pre-filled form shown
```

---

## Testing Recommendations

1. **Reports List Page:**
   - Visit `/dataPullReports`
   - Verify loader shows immediately
   - Verify loader disappears when data loads
   - Change pagination and verify loader shows again
   - Click refresh button and verify loader behavior

2. **Request Creation Page - New:**
   - Visit `/dataPullRequests/new`
   - Verify "Loading available data sources..." message
   - Verify form appears only after loader disappears
   - Verify all dropdowns are populated

3. **Request Creation Page - Edit:**
   - Visit `/dataPullRequests/edit/[valid-id]`
   - Verify "Loading request data..." message
   - Verify form appears with pre-filled data
   - Verify all modules are properly populated

4. **Request Creation Page - Duplicate:**
   - Visit `/dataPullRequests/new?duplicate=[valid-id]`
   - Verify loading behavior same as edit mode
   - Verify form is pre-filled with duplicated data

5. **Network Simulation:**
   - Use browser dev tools to throttle network (Slow 3G)
   - Verify loaders remain visible during slow API calls
   - Verify no content flashes or partially loaded states

---

## File Structure

```
src/
├── components/
│   └── PageLoader/
│       └── PageLoader.tsx          [NEW] - Reusable loader component
├── views/
│   ├── reports/
│   │   └── list/
│   │       └── Index.tsx           [MODIFIED] - Added PageLoader
│   └── universal-pull/
│       └── create/
│           └── Index.tsx           [MODIFIED] - Added PageLoader
```

---

## Notes

- The PageLoader component is fully reusable and can be added to other pages if needed
- Loading states are properly managed and prevent race conditions
- The implementation follows existing patterns in the codebase
- No breaking changes to existing functionality
- TypeScript compilation passes without errors
