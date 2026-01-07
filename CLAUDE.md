# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ZX Platform** - A React-based enterprise data processing and user management system for managing record-level data processing requests with a modern, clean UI. The platform provides a comprehensive 7-module ETL pipeline (Input → Append → Suppress → Match → Stats → Output → Schedule) along with role-based access control, organizational hierarchy management, and audit capabilities.

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI Framework**: Material-UI (MUI) v7
- **Routing**: React Router DOM v7
- **State Management**: React Context API and useState hooks
- **Drag & Drop**: @dnd-kit libraries
- **Build Tool**: Vite 7
- **Package Manager**: npm

## Development Commands

### Essential Commands

```bash
# Install dependencies
npm install

# Start development server (default port: 5174)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Common Development Workflow

1. Make code changes in `src/` directory
2. Test changes in dev server (`npm run dev`)
3. Run linter before committing (`npm run lint`)
4. Build for production (`npm run build`)

## Project Structure and Architecture

### High-Level Architecture

The application follows a modular component-based architecture with three main layers:

1. **Layout Layer** (`src/components/Layout/`): Header, Sidebar, Footer
2. **Page Layer** (`src/pages/`): Route-level components
3. **Module Layer** (`src/components/`): Reusable feature modules

### Key Directories

```
src/
├── components/
│   ├── Layout/              # Header, Sidebar, Footer components
│   ├── InputModule/         # Data input configuration (File, Database, Self)
│   ├── AppendModule/        # Data enrichment/lookup configuration
│   ├── SuppressModule/      # Record suppression/filtering
│   ├── MatchModule/         # Record matching against reference data
│   ├── OutputModule/        # Output destination configuration
│   ├── ScheduleModule/      # Job scheduling (ad-hoc vs recurrence)
│   ├── StatsConfigDialog/   # Statistical analysis configuration
│   ├── DataStreams/         # Data stream management
│   └── SystemSettings/      # Activity logs and system settings
├── pages/
│   ├── LoginPage.tsx
│   ├── ReportPage.tsx              # Dashboard with stats and data pull reports
│   ├── RequestCreationPage.tsx     # Main data pull request creation (7 modules)
│   ├── UniversalPullPage.tsx       # Universal pull reports listing
│   ├── UniversalPullRequestPage.tsx    # Universe data pull creation
│   ├── UniversalPullRequestViewPage.tsx
│   ├── UserManagementPage.tsx
│   ├── RoleManagementPage.tsx
│   ├── BusinessUnitManagementPage.tsx
│   ├── DivisionManagementPage.tsx
│   ├── ZipRadiusSearchPage.tsx
│   ├── DataStreamsPage.tsx
│   └── SystemSettingsPage.tsx
├── mockData/
│   └── sampleRequestData.ts    # Comprehensive sample data for demo/testing
├── App.tsx        # Main app with routing configuration
├── theme.ts       # MUI theme customization (colors, typography, components)
└── main.tsx       # Entry point
```

### Application Routes

The app uses React Router with a base path `/zxPlatformDevEnvironment`:

**Authentication Routes** (no layout):
- `/login` - Login page
- `/forgot-password` - Password recovery

**Main App Routes** (with Header + Sidebar layout):
- `/dataPullReports` - Default landing page, dashboard with reports
- `/dataPullRequests/new` - Create new data pull request (7-module workflow)
- `/universeReports` - Universal pull reports listing
- `/universeRequests/new` - Create universal pull request
- `/universeRequests/view/:requestId` - View universal pull request details
- `/zipRadiusSearch` - ZIP radius search utility
- `/userManagement` - User CRUD operations
- `/createUser/new` - Create new user
- `/roles` - Role management
- `/businessUnits` - Business unit management
- `/divisions` - Division management
- `/dataStreams` - Data stream configuration
- `/systemSettings` - System settings and activity logs

### Data Processing Pipeline (7 Modules)

The core data processing workflow in `RequestCreationPage.tsx` consists of:

1. **Input Module** - Configure data sources (File/Database/Self)
   - Multiple source types: File (SFTP, S3, NFS), Database (SQL), Self (manual)
   - File parsing with delimiter/header detection
   - Database query configuration
   - Data preview and validation

2. **Append Module** - Enrich data with additional fields
   - Drag-and-drop source ordering
   - Field mapping between sources
   - VLOOKUP-style data enrichment
   - Supports multiple append operations

3. **Suppression Module** - Remove unwanted records
   - Multiple suppression lists
   - Match-based filtering
   - Email/phone/address suppression

4. **Match Module** - Match against reference databases
   - Configurable matching rules
   - Multiple match sources
   - Match quality scoring

5. **Stats Module** - Generate statistical analysis
   - Count by dimensions
   - Distinct vs. total counts
   - Multi-level breakdowns
   - Multiple stat configurations

6. **Output Module** - Configure output destinations
   - Multiple output formats (CSV, Excel, JSON, Parquet)
   - SFTP, S3, NFS delivery
   - Field selection and ordering
   - Drag-and-drop field management

7. **Schedule Module** - Automate execution
   - Ad-hoc (one-time) execution
   - Recurrence patterns (hourly, daily, weekly, monthly)
   - Email notifications
   - Dependency management

### State Management Pattern

The application uses local component state with useState hooks. Complex forms (like `RequestCreationPage`) manage state at the page level and pass down props to child modules.

**Example Pattern**:
```typescript
// Page-level state
const [inputSources, setInputSources] = useState<InputSource[]>([]);
const [statsConfigs, setStatsConfigs] = useState<StatsConfiguration[]>([]);

// Pass to child modules
<InputModule onSourcesChange={setInputSources} />
<StatsConfigDialog configs={statsConfigs} onChange={setStatsConfigs} />
```

### Versioned Sources Pattern

A critical architectural pattern for data lineage tracking. When Match, Append, or Suppress operations are performed, they create "versioned sources" that combine the n × m combinations of input sources and operation sources.

**How it works**:
- User selects input sources (e.g., File1, File2) and operation sources (e.g., MatchDB1, MatchDB2)
- System generates 4 versioned sources: File1_MatchDB1, File1_MatchDB2, File2_MatchDB1, File2_MatchDB2
- Versioned sources become available as inputs to all downstream modules
- This allows tracking data lineage through the entire pipeline

**Implementation** (`RequestCreationPage.tsx:434-506`):
```typescript
const handleCreateVersionedSource = (
  sourceModule: 'Match' | 'Append' | 'Suppress',
  baseInputSources: string[],
  operationSources: string[]
) => {
  // Creates n × m combinations
  // Each combination is a VersionedSource with cumulative naming
}
```

**Key interfaces**:
```typescript
interface VersionedSource extends InputSource {
  isVersioned: true;
  versionNumber: number;
  versionLabel: string; // e.g., "File1_MatchDB1_AppendDB1"
  sourceModule: 'Match' | 'Append' | 'Suppress';
  baseInputSources: string[];
  operationSources: string[];
}
```

### Module Reordering

The core processing modules (Append, Suppress, Match) can be reordered via drag-and-drop to change the execution sequence. This affects how data flows through the pipeline.

**Implementation details**:
- Uses @dnd-kit for drag-and-drop functionality
- Only modules with `isDraggable: true` can be reordered (indices 1-3)
- Input, Stats, Output, and Schedule modules remain fixed in position
- Works in both accordion and stepper view modes
- See `RequestCreationPage.tsx:689-705` for drag handler

### View Modes

The Request Creation page supports two view modes:

1. **Accordion View** (default): All modules visible simultaneously, expandable sections
2. **Stepper View**: Linear step-by-step flow with navigation buttons

Users can toggle between modes using the switch in the header. Both modes support module reordering for Append/Suppress/Match modules.

### Edit Mode and Sample Data

The application supports loading existing requests for editing. When a `requestId` is provided in the URL:
- Route: `/dataPullRequests/edit/:requestId`
- For demo purposes, request ID `999` loads comprehensive sample data from `src/mockData/sampleRequestData.ts`
- Sample data includes pre-configured input sources, append/suppress/match/output/stats/schedule configurations
- See `RequestCreationPage.tsx:374-419` for the data loading logic

### Theme Customization

The MUI theme is defined in `src/theme.ts` with custom:
- **Primary brand color**: #296695 (Blue)
- **Typography**: Inter and Roboto font families
- **Spacing**: 4px grid system
- **Border radius**: 12-16px (modern rounded corners)
- **Shadows**: Soft, layered elevation
- **Components**: Customized Button, Paper, Card, Accordion, TextField, Table styles

Design principles: Clean, minimal, glassmorphism effects, gradient accents, smooth animations.

## Deployment Configuration

### Base Path Configuration

The application is configured to be deployed at `/zxPlatformDevEnvironment/`:

- **Vite config** (`vite.config.ts`): `base: '/zxPlatformDevEnvironment/'`
- **React Router** (`App.tsx`): `<Router basename="/zxPlatformDevEnvironment">`

### Production Deployment Context

The app is deployed to `http://zds-cust-api-01.bo3.e-dialog.com/zxPlatformDevEnvironment/`. When building for production, Vite generates assets that reference this base path.

**Important**: The build process generates:
- `index.html` - Entry point
- `assets/` folder - Bundled JS/CSS files
- All asset references are relative to the base path

If deploying to a server (like Apache), ensure:
1. The base path in vite.config.ts matches the deployment path
2. Server is configured to serve the SPA correctly (handle client-side routing)
3. Asset paths in the built files resolve correctly

### Apache Deployment (.htaccess)

For Apache deployments, create a `.htaccess` file in the deployment directory with:

```apache
# Enable rewrite engine
RewriteEngine On

# Set base directory
RewriteBase /zxPlatformDevEnvironment/

# Don't rewrite files or directories that exist
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Rewrite everything else to index.html for client-side routing
RewriteRule . /zxPlatformDevEnvironment/index.html [L]
```

**Common Issues**:
- **404 errors on assets**: Verify the `base` path in `vite.config.ts` matches the actual deployment path
- **Blank page after deployment**: Check browser console for asset loading errors (ERR_ABORTED 404)
- **Client-side routing not working**: Ensure `.htaccess` rewrite rules are active and mod_rewrite is enabled

## TypeScript Configuration

- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx (React 17+ transform)
- **Strict mode**: Enabled
- **Unused vars/params**: Disabled (noUnusedLocals/Parameters: false)

## ESLint Configuration

The project uses ESLint v9+ with the modern flat config format (`eslint.config.js`):
- **Format**: Flat config (not legacy .eslintrc)
- **Plugins**: TypeScript ESLint, React Hooks, React Refresh
- **Config extends**: JS recommended, TypeScript recommended, React Hooks recommended
- **Global ignores**: `dist/` directory

## Code Patterns and Conventions

### Component Structure

Components follow a consistent pattern:

```typescript
// 1. Imports (React, MUI, icons, local components)
import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';

// 2. Type definitions
interface ComponentProps {
  onSave?: () => void;
}

// 3. Component definition
const MyComponent: React.FC<ComponentProps> = ({ onSave }) => {
  // 4. State hooks
  const [value, setValue] = useState('');

  // 5. Event handlers
  const handleSave = () => {
    // logic
    onSave?.();
  };

  // 6. Render
  return (
    <Box>
      {/* JSX */}
    </Box>
  );
};

// 7. Export
export default MyComponent;
```

### Dialog Pattern

Dialogs are implemented as controlled components:

```typescript
interface DialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: T) => void;
  editingItem?: T | null;
}
```

### Table Pattern

Tables use MUI Table components with actions column:

```typescript
<TableContainer component={Paper}>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Column Name</TableCell>
        <TableCell align="right">Actions</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {items.map(item => (
        <TableRow key={item.id}>
          <TableCell>{item.name}</TableCell>
          <TableCell align="right">
            <IconButton onClick={() => handleEdit(item)}>
              <Edit />
            </IconButton>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

### Drag-and-Drop Pattern

Uses @dnd-kit for reorderable lists:

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';

// Wrap items in DndContext and SortableContext
// Individual items use useSortable hook
```

## Module-Specific Notes

### Input Module
- Supports 3 source types: File, Database, Self
- File sources: Pre-configured SFTP/S3/NFS locations
- Database sources: SQL query builder with connection config
- Data preview with pagination
- Header detection and field mapping
- Data type inference

### Append Module
- Drag-and-drop source ordering affects join sequence
- Field mapping dialog for complex joins
- Supports multiple append operations
- Key field matching (like VLOOKUP)

### Stats Module
- Multiple independent stat configurations
- Each config has: input sources, count fields, breakdown fields
- Distinct vs. total count toggle
- Results in separate output files or sheets

### Schedule Module
- Two modes: ad-hoc (run once) vs. recurrence
- Recurrence patterns: hourly, daily, weekly, monthly
- Email notification options: none, on completion, on failure, always
- Cron-style scheduling (internal representation)

## Common Tasks

### Adding a New Page

1. Create page component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`:
   ```typescript
   <Route path="/newPage" element={<NewPage />} />
   ```
3. Add navigation item in `src/components/Layout/Sidebar.tsx`

### Adding a New Module/Dialog

1. Create component in appropriate `src/components/` subdirectory
2. Define TypeScript interfaces for props and data structures
3. Implement dialog open/close state in parent component
4. Pass data via props, handle updates via callback props

### Modifying the Theme

Edit `src/theme.ts`:
- Colors: `palette` object
- Typography: `typography` object
- Component overrides: `components` object

### Testing a Production Build Locally

```bash
npm run build
npm run preview
# Opens local preview server to test production build
```

## Important Notes

1. **Do not remove the base path** from vite.config.ts and App.tsx - it's required for deployment
2. **Navigation**: Always use `react-router-dom` `<Link>` or `navigate()` - never `<a>` tags for internal routes
3. **Icons**: Import from `@mui/icons-material`, not other icon libraries
4. **State management**: Keep state as local as possible, lift up only when necessary
5. **File organization**: Group related components in subdirectories, avoid flat structure
6. **TypeScript**: Always define interfaces for component props and complex data structures
7. **MUI components**: Use MUI components for consistency - avoid custom HTML elements
8. **Responsive design**: App is designed for desktop/tablet, not mobile-first

## Known Configuration

- **Development server port**: Usually 5174 (Vite default for React)
- **Base URL**: `/zxPlatformDevEnvironment/`
- **Production URL**: http://zds-cust-api-01.bo3.e-dialog.com/zxPlatformDevEnvironment/
- **Font families**: Inter (primary), Roboto (fallback)
- **Primary brand color**: #296695

## Organizational Context

The platform supports a hierarchical organization structure:
```
Organization
  └─ Business Units (BU)
      └─ Divisions
          └─ Users (with Roles)
```

Key Business Units: ZxDev, ZxDs, ZxOps, CPM, CPA, DataTeam, Attribution

Roles include: Super Admin, Business Unit Admin, Division Admin, Data Query Creator, Report Viewer, Analytics User, Read Only.
