# Version Name Fix - Source Name in Payload

## Problem Statement
When a versioned source (e.g., "v1" created in Append module) was used as an input source in other modules (Suppress, Match, or Append), the payload incorrectly sent:

```json
{
  "source_name": "versioned_1769172443631_j5mtkalom"  // ❌ Internal ID
}
```

Instead of:

```json
{
  "source_name": "v1"  // ✅ User-visible version name
}
```

## Root Cause

Versioned sources have multiple name properties:
- **`id`**: Internal unique identifier (e.g., `"versioned_1769172443631_j5mtkalom"`)
- **`sourceName`**: May be set to the internal ID or version name (inconsistent)
- **`versionName`**: The actual user-visible name (e.g., `"v1"`)
- **`versionLabel`**: Alternative property for version name

The workflow extraction code was using `sourceName` instead of checking for `versionName`/`versionLabel` first.

## Solution

Updated all workflow extraction functions to check if a source is versioned and use `versionName`/`versionLabel` instead of `sourceName`.

---

## Changes Made

### 1. Fix Input Sources in Configs (3 locations)

**Locations:** Append, Suppress, and Match extraction functions

**Before:**
```typescript
const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
  const source = inputSources.find(s => s.id === sourceId);
  return {
    source_name: source?.sourceName || sourceId,  // ❌ Wrong for versioned sources
    columns: source?.headers || []
  };
});
```

**After:**
```typescript
const inputSourcesForConfig = (config.inputSources || []).map(sourceId => {
  const source = inputSources.find(s => s.id === sourceId);
  // For versioned sources, use versionName/versionLabel instead of sourceName
  const displayName = source?.isVersioned
    ? ((source as any).versionName || (source as any).versionLabel || source.sourceName)
    : (source?.sourceName || sourceId);
  return {
    source_name: displayName,  // ✅ Correct name
    columns: source?.headers || []
  };
});
```

### 2. Fix Suppress Sources (1 location)

**Location:** Suppress extraction function (line ~3226)

**Before:**
```typescript
const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
if (versionedSource) {
  return {
    source_type: 'input',
    source_name: versionedSource.sourceName  // ❌ Wrong
  };
}
```

**After:**
```typescript
const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
if (versionedSource) {
  // Use versionName/versionLabel for display name, not sourceName (which may be internal ID)
  const displayName = (versionedSource as any).versionName || (versionedSource as any).versionLabel || versionedSource.sourceName;
  return {
    source_type: 'input',
    source_name: displayName  // ✅ Correct
  };
}
```

### 3. Fix Append Sources (1 location)

**Location:** Append extraction function (line ~3059)

**Before:**
```typescript
const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
if (versionedSource) {
  return {
    source_type: 'input',
    source_name: versionedSource.sourceName,  // ❌ Wrong
    fields: sourceFields
  };
}
```

**After:**
```typescript
const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
if (versionedSource) {
  // Use versionName/versionLabel for display name, not sourceName (which may be internal ID)
  const displayName = (versionedSource as any).versionName || (versionedSource as any).versionLabel || versionedSource.sourceName;
  return {
    source_type: 'input',
    source_name: displayName,  // ✅ Correct
    fields: sourceFields
  };
}
```

### 4. Fix Match Sources (1 location)

**Location:** Match extraction function (line ~3396)

**Before:**
```typescript
const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
if (versionedSource) {
  return {
    source_type: 'input',
    source_name: versionedSource.sourceName,  // ❌ Wrong
    priority: priority + 1
  };
}
```

**After:**
```typescript
const versionedSource = allAvailableInputSources.find(s => s.id === sourceId && s.isVersioned);
if (versionedSource) {
  // Use versionName/versionLabel for display name, not sourceName (which may be internal ID)
  const displayName = (versionedSource as any).versionName || (versionedSource as any).versionLabel || versionedSource.sourceName;
  return {
    source_type: 'input',
    source_name: displayName,  // ✅ Correct
    priority: priority + 1
  };
}
```

---

## Impact

This fix affects **all modules** that use versioned sources:
- ✅ **Append Module**: When using versioned sources as input or append sources
- ✅ **Suppress Module**: When using versioned sources as input or suppress sources
- ✅ **Match Module**: When using versioned sources as input or match sources
- ✅ **Stats Module**: When selecting versioned sources as input (implicitly fixed via inputSources transform)
- ✅ **Output Module**: When selecting versioned sources as input (implicitly fixed via inputSources transform)

---

## Testing Instructions

### Test Scenario:
1. Create an input source in Step 1
2. Create a version "v1" in Step 2 (Append module)
3. Use "v1" as input in Step 3 (Suppress module)
4. Create a config in Suppress module
5. Submit the request

### Expected Payload:

**Before (Broken):**
```json
{
  "stepOrder": 3,
  "actionType": "S",
  "configJson": {
    "input_sources": [
      {
        "source_name": "versioned_1769172443631_j5mtkalom",  // ❌ Wrong
        "columns": []
      }
    ],
    "suppress_sources": [
      {
        "source_type": "input",
        "source_name": "v1"
      }
    ]
  }
}
```

**After (Fixed):**
```json
{
  "stepOrder": 3,
  "actionType": "S",
  "configJson": {
    "input_sources": [
      {
        "source_name": "v1",  // ✅ Correct!
        "columns": []
      }
    ],
    "suppress_sources": [
      {
        "source_type": "input",
        "source_name": "ALL_PROFILE_TABLE_1"
      }
    ]
  }
}
```

---

## Property Priority

The fix uses this priority order when determining the source name:

1. **`versionName`** - Primary property for version names
2. **`versionLabel`** - Fallback property for version names
3. **`sourceName`** - Last resort (for non-versioned sources or legacy data)

This ensures:
- ✅ New versioned sources use proper display names
- ✅ Old data without version names still works
- ✅ Non-versioned sources continue using `sourceName`

---

## Code Pattern Used

The fix follows a consistent pattern across all extraction functions:

```typescript
// Check if source is versioned
const displayName = source?.isVersioned
  ? ((source as any).versionName || (source as any).versionLabel || source.sourceName)
  : (source?.sourceName || sourceId);

// Use displayName in payload
source_name: displayName
```

This pattern:
- Checks if the source is versioned (`source?.isVersioned`)
- Uses `versionName` or `versionLabel` for versioned sources
- Falls back to `sourceName` for non-versioned sources
- Uses `sourceId` as last resort if no name exists

---

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `/src/views/universal-pull/create/Index.tsx` | ~6 blocks | Fixed source name extraction in all workflow transformation functions |

**Total:** 1 file modified, 6 code blocks updated

---

## Locations Fixed

| Module | Function | Line ~ | What was fixed |
|--------|----------|--------|----------------|
| Append | `extractAppendItemsForWorkflow` | 3042 | Input sources for configs |
| Append | `extractAppendItemsForWorkflow` | 3059 | Append sources (versioned) |
| Suppress | `extractSuppressItemsForWorkflow` | 3213 | Input sources for configs |
| Suppress | `extractSuppressItemsForWorkflow` | 3226 | Suppress sources (versioned) |
| Match | `extractMatchItemsForWorkflow` | 3370 | Input sources for configs |
| Match | `extractMatchItemsForWorkflow` | 3396 | Match sources (versioned) |

---

## Backward Compatibility

The fix maintains backward compatibility:

✅ **Old data without `versionName`/`versionLabel`:**
- Falls back to `sourceName`
- Still works correctly

✅ **Non-versioned sources:**
- Continue using `sourceName` as before
- No changes to behavior

✅ **New versioned sources:**
- Use proper `versionName`/`versionLabel`
- Display correctly in payload

---

## TypeScript Compilation

✅ **All changes compile successfully** - verified with `npx tsc --noEmit --skipLibCheck`

No type errors introduced by these changes.

---

## Summary

This fix ensures that versioned sources (created via "Create Version" in any module) are properly identified by their user-visible names (`v1`, `v2`, etc.) rather than their internal IDs (`versioned_1769172443631_j5mtkalom`) in the API payload.

**Key improvements:**
- ✅ Versioned sources show correct names in payload
- ✅ Backend receives proper version references
- ✅ Data lineage tracking works correctly
- ✅ All modules (Append, Suppress, Match, Stats, Output) affected
- ✅ Backward compatible with old data
