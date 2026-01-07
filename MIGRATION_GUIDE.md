# Migration Guide: Refactoring & Cleanup

This guide helps you systematically refactor the codebase with the new improvements.

---

## 🚨 Priority 1: Replace alert() and confirm() Calls

### Files with alert() calls (57 total):
Run this to see all occurrences:
```bash
grep -rn "alert(" src --include="*.tsx" --include="*.ts" | grep -v "showAlert"
```

### Replacement Pattern

#### Before (❌ Old):
```tsx
alert('User created successfully!');
if (confirm('Delete this item?')) {
  handleDelete();
}
```

#### After (✅ New):
```tsx
import { useNotification } from '../contexts/NotificationContext';

function MyComponent() {
  const { showSnackbar, showConfirm } = useNotification();

  // Replace alert()
  showSnackbar('User created successfully!', 'success');

  // Replace confirm()
  const handleDelete = async () => {
    if (await showConfirm('Delete this item?', 'Confirm Deletion')) {
      handleDelete();
    }
  };
}
```

### Quick Replace Script
```bash
# Find all files with alert()
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "alert(" {} \;
```

---

## 🔍 Priority 2: Add SearchableSelect to Dropdowns

### Files to Update

All files using MUI `<Select>` should be updated to use `<SearchableSelect>`.

### Replacement Pattern

#### Before (❌ Old):
```tsx
<FormControl fullWidth>
  <InputLabel>Select Source</InputLabel>
  <Select
    value={selectedSource}
    onChange={(e) => setSelectedSource(e.target.value)}
  >
    {sources.map(source => (
      <MenuItem key={source.id} value={source.id}>
        {source.name}
      </MenuItem>
    ))}
  </Select>
</FormControl>
```

#### After (✅ New):
```tsx
import SearchableSelect from '../shared/SearchableSelect';

<SearchableSelect
  label="Select Source"
  value={selectedSource}
  options={sources.map(s => ({ value: s.id, label: s.name }))}
  onChange={(value) => setSelectedSource(value as string)}
  placeholder="Search sources..."
/>
```

### Find All Select Components
```bash
grep -rn "<Select" src --include="*.tsx" | wc -l
```

---

## 📦 Priority 3: Refactor Large Files (>2000 lines)

### Files Requiring Refactoring

| File | Lines | Priority | Strategy |
|------|-------|----------|----------|
| `universal-pull/create/Index.tsx` | 2984 | **HIGH** | Extract components |
| `MatchModule/MatchModule.tsx` | 1770 | HIGH | Split logic |
| `AppendModule/AppendModule.tsx` | 1734 | HIGH | Split logic |
| `OutputModule/OutputModule.tsx` | 1562 | MEDIUM | Extract dialogs |
| `InputModule/DatabaseSourceConfig.tsx` | 1551 | MEDIUM | Split by sections |
| `SuppressModule/SuppressModule.tsx` | 1440 | MEDIUM | Split logic |

### Refactoring Strategy

#### 1. Extract Components
Break down large components into smaller, focused components:

```
Before:
src/views/universal-pull/create/Index.tsx (2984 lines)

After:
src/views/universal-pull/create/
  ├── Index.tsx (main orchestrator, ~300 lines)
  ├── components/
  │   ├── RequestHeader.tsx
  │   ├── StatsSection.tsx
  │   ├── ModuleAccordion.tsx
  │   └── ModuleStepper.tsx
  ├── hooks/
  │   ├── useRequestForm.ts
  │   ├── useModuleState.ts
  │   └── useVersionedSources.ts
  └── utils/
      ├── transformers.ts
      └── validators.ts
```

#### 2. Extract Custom Hooks
Move state management logic to custom hooks:

```tsx
// Before: All in component (❌)
function MyComponent() {
  const [inputSources, setInputSources] = useState([]);
  const [appendConfigs, setAppendConfigs] = useState([]);
  const [matchConfigs, setMatchConfigs] = useState([]);
  // ... 50 more state variables
}

// After: Extract to custom hook (✅)
function useRequestForm() {
  const [inputSources, setInputSources] = useState([]);
  const [appendConfigs, setAppendConfigs] = useState([]);
  const [matchConfigs, setMatchConfigs] = useState([]);

  return {
    inputSources,
    setInputSources,
    appendConfigs,
    setAppendConfigs,
    matchConfigs,
    setMatchConfigs,
  };
}

function MyComponent() {
  const formState = useRequestForm();
  // Component is now much cleaner!
}
```

#### 3. Extract Business Logic
Move transformation and validation logic to utility files:

```tsx
// Before: Logic in component (❌)
const transformInputSources = () => {
  // 100 lines of transformation logic
};

// After: Extract to utils (✅)
// src/utils/requestTransformers.ts
export const transformInputSources = (sources: InputSource[]) => {
  // 100 lines of transformation logic
};
```

---

## 🎨 Priority 4: Ensure MUI Component Consistency

### Audit Checklist

Run these commands to find non-MUI components:

```bash
# Check for native HTML elements that should be MUI
grep -r "<div" src --include="*.tsx" | wc -l
grep -r "<button" src --include="*.tsx" | wc -l
grep -r "<input" src --include="*.tsx" | wc -l
grep -r "<form" src --include="*.tsx" | wc -l
```

### Replacement Guide

| Native HTML | MUI Component |
|-------------|---------------|
| `<div>` | `<Box>` |
| `<button>` | `<Button>` |
| `<input type="text">` | `<TextField>` |
| `<input type="checkbox">` | `<Checkbox>` |
| `<input type="radio">` | `<Radio>` |
| `<select>` | `<Select>` or `<SearchableSelect>` |
| `<form>` | `<Box component="form">` |
| `<h1>`, `<h2>`, etc. | `<Typography variant="h1">` |
| `<p>` | `<Typography variant="body1">` |
| `<span>` | `<Typography component="span">` |

---

## 📋 Step-by-Step Migration Process

### Week 1: Notifications & Dropdowns
- [ ] Day 1-2: Replace all `alert()` calls (57 files)
- [ ] Day 3-4: Replace all `confirm()` calls (12 files)
- [ ] Day 5: Add SearchableSelect to all dropdowns

### Week 2: File Refactoring
- [ ] Day 1-2: Refactor `universal-pull/create/Index.tsx`
- [ ] Day 3: Refactor `MatchModule.tsx`
- [ ] Day 4: Refactor `AppendModule.tsx`
- [ ] Day 5: Refactor `OutputModule.tsx`

### Week 3: Cleanup & Testing
- [ ] Day 1-2: Refactor remaining large files
- [ ] Day 3-4: Audit for MUI consistency
- [ ] Day 5: Comprehensive testing

---

## 🛠️ Refactoring Example: MatchModule.tsx

### Before (1770 lines ❌):
```tsx
function MatchModule() {
  // 50 state variables
  // 30 helper functions
  // 1600 lines of JSX
  return <div>... massive component ...</div>;
}
```

### After (Refactored ✅):

**1. Main Component (300 lines):**
```tsx
// MatchModule.tsx
import { useMatchForm } from './hooks/useMatchForm';
import MatchConfigList from './components/MatchConfigList';
import MatchSourceDialog from './MatchSourceDialog';

function MatchModule(props) {
  const matchState = useMatchForm(props.initialConfigs);

  return (
    <Box>
      <MatchConfigList
        configs={matchState.configs}
        onEdit={matchState.handleEdit}
        onDelete={matchState.handleDelete}
      />
      <MatchSourceDialog
        open={matchState.dialogOpen}
        onClose={matchState.closeDialog}
        onSave={matchState.saveConfig}
      />
    </Box>
  );
}
```

**2. Custom Hook (200 lines):**
```tsx
// hooks/useMatchForm.ts
export function useMatchForm(initialConfigs) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEdit = (config) => {
    // Edit logic
  };

  const handleDelete = (id) => {
    // Delete logic
  };

  return {
    configs,
    dialogOpen,
    handleEdit,
    handleDelete,
    closeDialog: () => setDialogOpen(false),
    saveConfig: (config) => {
      // Save logic
    },
  };
}
```

**3. Sub-components (100-200 lines each):**
```tsx
// components/MatchConfigList.tsx
function MatchConfigList({ configs, onEdit, onDelete }) {
  return (
    <Table>
      {configs.map(config => (
        <MatchConfigRow
          key={config.id}
          config={config}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </Table>
  );
}
```

---

## 🧪 Testing Checklist

After each refactoring:

- [ ] Component renders without errors
- [ ] All functionality works as before
- [ ] No console errors or warnings
- [ ] Build succeeds (`npm run build`)
- [ ] TypeScript errors resolved
- [ ] Props are properly typed
- [ ] No unused imports
- [ ] Code follows consistent patterns

---

## 📊 Progress Tracking

Use this table to track your progress:

| Task | Files | Status | Notes |
|------|-------|--------|-------|
| Replace alert() | 57 | ⏳ Pending | Start with most-used files |
| Replace confirm() | 12 | ⏳ Pending | Many in delete handlers |
| Add SearchableSelect | ~30 | ⏳ Pending | Find all <Select> usage |
| Refactor create/Index.tsx | 1 | ⏳ Pending | Highest priority |
| Refactor MatchModule | 1 | ⏳ Pending | Second priority |
| Refactor AppendModule | 1 | ⏳ Pending | Third priority |
| Refactor OutputModule | 1 | ⏳ Pending | Fourth priority |
| MUI consistency audit | All | ⏳ Pending | Final cleanup |

---

## 🚀 Quick Wins

Start with these for immediate impact:

1. **Replace all `alert()` in user-facing components** (1-2 hours)
2. **Add SearchableSelect to top 10 most-used dropdowns** (2-3 hours)
3. **Extract RequestHeader component** (30 minutes) ✅ Already done!
4. **Create custom hooks for largest components** (1-2 hours each)

---

## 💡 Tips

1. **Start Small**: Refactor one component at a time
2. **Test Frequently**: After each extraction, test thoroughly
3. **Keep Git History**: Commit after each successful refactor
4. **Use TypeScript**: Leverage types to catch errors early
5. **Pair Program**: Complex refactoring benefits from collaboration

---

## 📞 Need Help?

- Review `NEW_FEATURES_GUIDE.md` for API usage
- Check `REFACTORING_SUMMARY.md` for what's already done
- Look at `RequestHeader.tsx` as an extraction example

---

**Happy Refactoring!** 🎉
