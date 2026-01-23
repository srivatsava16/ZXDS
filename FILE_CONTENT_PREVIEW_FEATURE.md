# File Content Preview Feature

## Overview
Added a preview icon inside the Add Input Source modal (FileSourceConfig) that displays raw delimited file content on hover after "Get Top 10 Records" is clicked. The icon appears next to the "Top 10 Records Preview" title.

## Feature Description

When a user configures a File source and clicks "Get Top 10 Records", the API response includes:
- `separator`: The delimiter used (e.g., `|`, `,`, `\t`)
- `data`: Array of parsed record objects
- `content`: Raw delimited text string with headers and data

This feature captures the `content` field and displays it on hover via a preview icon in the Input Module table.

## Implementation Details

### 1. Data Flow

```
User opens Add Input Source modal
    ↓
User configures File source
    ↓
User clicks "Get Top 10 Records"
    ↓
FileSourceConfig calls API (/requesttop10records.php)
    ↓
API returns { separator, data, content }
    ↓
FileSourceConfig extracts content field
    ↓
Stores in local state (contentPreview) and parent data (source.contentPreview)
    ↓
Preview icon appears next to "Top 10 Records Preview" title
    ↓
User hovers over icon → Popover shows raw content
```

### 2. Files Modified

#### A. InputModule.tsx
**Location**: `/src/components/InputModule/InputModule.tsx`

**Changes**:
1. **Interface Update** (Line ~44):
   - Added `contentPreview?: string` field to `InputSource` interface
   - Purpose: Store raw delimited content from API response for passing to parent

#### B. FileSourceConfig.tsx
**Location**: `/src/components/InputModule/FileSourceConfig.tsx`

**Changes**:
1. **Imports** (Lines 1-29):
   - Added `Popover` and `Tooltip` from '@mui/material'
   - Added `Visibility` icon from '@mui/icons-material'

2. **State Management** (Lines ~89-92):
   ```typescript
   const [contentPreview, setContentPreview] = useState<string>(data.contentPreview || '');
   const [previewAnchorEl, setPreviewAnchorEl] = useState<HTMLElement | null>(null);
   ```

3. **Response Processing** (Lines ~324-352):
   - Added `responseContent` variable to capture content field
   - Extracts content from API response: `response.content`
   - Comments updated to reflect new format with content field

4. **Update Object** (Lines ~454-457):
   - Added content to parent update object and local state:
   ```typescript
   if (responseContent !== undefined) {
     updateObj.contentPreview = responseContent;
     setContentPreview(responseContent); // Set in local state for immediate access
   }
   ```

5. **Preview Icon UI** (Lines ~1025-1043):
   - Added preview icon next to "Top 10 Records Preview" title
   - Only shows when `contentPreview` has data
   - Hover triggers popover display
   - Purple theme color (#8B5CF6)
   - Tooltip: "Preview raw content"

   ```typescript
   {contentPreview && (
     <Tooltip title="Preview raw content" arrow>
       <IconButton
         size="small"
         onMouseEnter={(e) => setPreviewAnchorEl(e.currentTarget)}
         onMouseLeave={() => setPreviewAnchorEl(null)}
         // ... styling
       >
         <Visibility sx={{ fontSize: 18 }} />
       </IconButton>
     </Tooltip>
   )}
   ```

6. **Popover Component** (Lines ~1240-1290):
   - Displays on hover over preview icon
   - Shows "Raw Content Preview" title
   - Content displayed in monospace font with preserved line breaks
   - Styled with paper background, scrollable content area
   - Max width: 800px, Max height: 400px
   - Auto-closes when mouse leaves icon

#### C. RequestInputsService.ts
**Location**: `/src/services/api/RequestInputsService.ts`

**Changes**:
1. **Interface Update** (Line ~118):
   ```typescript
   export interface Top10RecordsResponse {
     columns?: string[];
     data: Record<string, any>[];
     separator?: string;
     content?: string; // Raw delimited text content for preview
   }
   ```

### 3. UI/UX Features

#### Location
- **Where**: Inside the Add Input Source modal
- **When**: After clicking "Get Top 10 Records" button
- **Position**: Next to the "Top 10 Records Preview" title, after the expand/collapse icon

#### Preview Icon
- **Visibility**: Only shown when `contentPreview` data exists (after successful Get Top 10 Records)
- **Icon**: Eye icon (Visibility) in purple (#8B5CF6)
- **Interaction**: Hover to display popover, automatically hides when mouse leaves
- **Tooltip**: "Preview raw content"
- **Size**: Small icon button (18px icon size)

#### Popover Display
- **Trigger**: Mouse enter on preview icon
- **Position**: Below the icon, centered
- **Styling**:
  - Light background (#F8FAFB)
  - White content area with border
  - Monospace font for raw content
  - Preserved line breaks and spacing
  - Scrollable if content exceeds max height

- **Content Format**:
  ```
  Raw Content Preview
  ┌─────────────────────────────────┐
  │ email|open_date|click_date|...  │
  │ user1@email.com|2025-12-18|...  │
  │ user2@email.com|2025-12-17|...  │
  │ ...                             │
  └─────────────────────────────────┘
  ```

### 4. Example API Response

```json
{
  "separator": "|",
  "data": [
    {
      "email": "vikki.j.stevenson@gmail.com",
      "open_date": "2025-12-18",
      "click_date": "2025-12-18",
      "exec_date": "2026-01-08",
      "touch": "1"
    },
    // ... more records
  ],
  "content": "email|open_date|click_date|exec_date|touch\nvikki.j.stevenson@gmail.com|2025-12-18|2025-12-18|2026-01-08|1\njmspittler@hotmail.com|2025-12-18|2025-12-23|2026-01-08|1\n..."
}
```

### 5. Modal Layout

Inside the Add Input Source modal (FileSourceConfig):

```
┌─ Add Input Source ────────────────────────────┐
│                                                │
│  [File source configuration fields...]         │
│                                                │
│  ┌─ Top 10 Records Preview  ▼  👁️ ────────┐  │
│  │                                          │  │
│  │  [Preview Data Table]                    │  │
│  │  email        | open_date  | click_date │  │
│  │  user@e.com  | 2025-12-18 | 2025-12-18 │  │
│  │  ...                                     │  │
│  └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

The 👁️ icon appears after "Get Top 10 Records" is clicked successfully.

### 6. Visual States

#### Before Get Top 10 Records
- No preview icon visible
- Only the title "Top 10 Records Preview" with expand/collapse icon shows

#### After Get Top 10 Records (Success)
- Purple eye icon (👁️) appears next to expand/collapse icon
- Hover: Popover appears with raw content
- Mouse leave: Popover disappears

#### After Get Top 10 Records (No Content)
- If API doesn't return `content` field, icon won't appear
- Table preview still shows normally
- Backward compatible with old API responses

### 7. Benefits

1. **Quick Verification**: Users can verify the actual file format and content without downloading
2. **Delimiter Confirmation**: See exactly how the data is delimited
3. **Data Quality Check**: Spot issues like extra delimiters, special characters, etc.
4. **No Additional API Call**: Content is already retrieved with Get Top 10 Records
5. **Non-Intrusive**: Hover-based interaction doesn't clutter the UI
6. **Formatted Display**: Monospace font preserves alignment for easy reading

### 8. Technical Considerations

#### Performance
- Content is stored in component state (not persisted)
- Popover only renders when hover occurs
- Limited to top 10 records, so content size is manageable

#### Styling
- Uses application theme colors (purple #8B5CF6)
- Consistent with existing MUI components
- Responsive max-width and max-height with scrolling

#### Error Handling
- Gracefully handles missing content field (shows "--")
- Works with all response formats (new, legacy, plain array)
- Backward compatible with existing file sources

### 9. Future Enhancements

Possible improvements:
1. **Copy to Clipboard**: Add button to copy raw content
2. **Download Option**: Allow downloading the preview content as a file
3. **Syntax Highlighting**: Color-code delimiters for better visibility
4. **Line Numbers**: Show line numbers in preview
5. **Search in Preview**: Add search box to find specific text
6. **Expandable View**: Full-screen modal option for larger previews

## Testing Scenarios

1. **File Source - Success Case**:
   - Open Add Input Source modal
   - Select File source type (SFTP/AWS S3/NFS)
   - Configure file path/name
   - Click "Get Top 10 Records"
   - API returns with content field
   - Preview icon (👁️) appears next to "Top 10 Records Preview" title
   - Hover over icon → Content displays in popover
   - Move mouse away → Popover disappears

2. **File Source - No Content Field**:
   - Open Add Input Source modal
   - Configure file source
   - Click "Get Top 10 Records"
   - API returns without content field (old format)
   - No preview icon appears
   - Table preview still works normally

3. **File Source - Before Get Top 10 Records**:
   - Open Add Input Source modal
   - Configure file source
   - Don't click "Get Top 10 Records" yet
   - No preview icon visible
   - Preview section not shown yet

4. **Edit Existing File Source**:
   - Edit an existing file source that has contentPreview data
   - Preview icon should appear immediately if data exists
   - Hover works as expected

5. **Multiple File Sources**:
   - Create first file source with preview
   - Save and create second file source
   - Each source gets its own content preview
   - Preview is independent per source

6. **Large Content**:
   - File with many columns or long values
   - Click "Get Top 10 Records"
   - Hover over preview icon
   - Popover scrolls correctly (max 300px height for content)
   - Content remains readable in monospace font
   - Line breaks preserved

7. **Special Characters in Content**:
   - File with special delimiters, quotes, newlines
   - Preview displays exactly as received
   - No HTML escaping issues
   - Formatting preserved

## Build Status
✅ Build successful with no TypeScript errors
✅ All components compile correctly
✅ Feature ready for testing
