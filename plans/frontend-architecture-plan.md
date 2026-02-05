# Frontend Component Architecture Plan

## Project Overview

**Tax Distribution / Allocation Boards** - A hierarchical allocation visualization application built with React + TypeScript + Convex. Users can create/join boards for collaborative resource allocation across unlimited-depth category trees.

**Current Tech Stack:**
- React 19.2.0 + TypeScript 5.9.3
- Vite 6.3.5 (build tool)
- Convex 1.31.6 (serverless backend)
- Vitest 4.0.18 (testing)

---

## Current Architecture Issues

### 1. **App.tsx is Too Large (1,010 lines)**
Currently handles:
- Authentication (login/register forms, validation)
- Board management (list, create, select, delete)
- Board settings (unit/symbol configuration, category filtering)
- Invitation system (send, accept, decline, revoke)
- Allocation state management
- Category tree navigation

### 2. **No Feature-Based Organization**
- All components mixed in `src/components/`
- No separation of concerns by domain
- Logic scattered across unrelated components

### 3. **No Custom Hooks**
- All state logic embedded in components
- Duplicated patterns (debouncing, localStorage)
- Difficult to test business logic in isolation

### 4. **No UI Primitive Layer**
- Styles duplicated across components
- Inconsistent button/input patterns
- No design system foundation

### 5. **Tight Coupling**
- App.tsx manages 15+ different state pieces
- Props drilling through multiple levels
- Components know too much about each other

---

## Proposed Directory Structure

```
src/
├── components/
│   ├── ui/                          # Primitive UI components (presentational)
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.css
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Toggle/
│   │   ├── ProgressBar/
│   │   └── index.ts                 # Barrel export
│   │
│   └── shared/                      # Shared domain components
│       ├── AllocationSlider/
│       ├── CategoryCombobox/
│       └── Breadcrumb/
│
├── features/                        # Feature-based modules (vertical slicing)
│   ├── auth/
│   │   ├── components/
│   │   │   ├── AuthContainer/
│   │   │   ├── LoginForm/
│   │   │   └── RegisterForm/
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── utils/
│   │   │   └── validation.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── boards/
│   │   ├── components/
│   │   │   ├── BoardList/
│   │   │   ├── BoardCard/
│   │   │   ├── BoardCreateForm/
│   │   │   ├── BoardSettings/
│   │   │   └── CategoryFilter/
│   │   ├── hooks/
│   │   │   └── useBoards.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── allocations/
│   │   ├── components/
│   │   │   ├── AllocationWorkspace/     # Renamed from Body.tsx
│   │   │   ├── AllocationSummary/
│   │   │   ├── AllocationList/
│   │   │   └── CategoryNavigator/
│   │   ├── hooks/
│   │   │   ├── useAllocations.ts
│   │   │   └── useAllocationPersistence.ts
│   │   ├── utils/
│   │   │   └── calculations.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── categories/
│   │   ├── components/
│   │   │   └── CategoryTree/
│   │   ├── hooks/
│   │   │   └── useCategories.ts
│   │   ├── utils/
│   │   │   └── treeUtils.ts
│   │   └── index.ts
│   │
│   └── invites/
│       ├── components/
│       │   ├── InvitesPanel/
│       │   ├── InviteCard/
│       │   ├── InviteForm/
│       │   └── BoardInvites/
│       ├── hooks/
│       │   └── useInvites.ts
│       ├── types.ts
│       └── index.ts
│
├── hooks/                           # Global shared hooks
│   ├── useLocalStorage.ts
│   ├── useDebounce.ts
│   └── index.ts
│
├── utils/                           # Global utilities
│   ├── session.ts
│   ├── validation.ts
│   └── index.ts
│
├── types/                           # Global shared types
│   └── index.ts
│
├── App.tsx                          # Thin orchestrator (~150 lines)
├── App.css
└── main.tsx
```

---

## Component Hierarchy

```
App (orchestration layer - thin)
├── ErrorBoundary
├── AuthProvider (gate)
│   ├── AuthContainer
│   │   ├── LoginForm
│   │   └── RegisterForm
│
└── (when authenticated)
    ├── AppLayout
    │   ├── Header
    │   │   ├── Logo
    │   │   ├── UserMenu
    │   │   └── InvitesButton
    │   │
    │   └── MainContent
    │       ├── BoardProvider
    │       │   ├── BoardSelector
    │       │   │   ├── BoardList
    │       │   │   │   └── BoardCard[]
    │       │   │   └── BoardCreateForm
    │       │   │
    │       │   └── (when board selected)
    │       │       ├── BoardSettingsPanel
    │       │       │   ├── CategoryFilter
    │       │       │   ├── UnitSettings
    │       │       │   └── BoardPermissions
    │       │       │
    │       │       ├── BoardInvites
    │       │       │   ├── InviteForm
    │       │       │   └── InviteList
    │       │       │       └── InviteCard[]
    │       │       │
    │       │       └── DangerZone (delete board)
    │       │
    │       └── AllocationProvider
    │           └── AllocationWorkspace
    │               ├── Breadcrumb
    │               ├── AllocationSummary
    │               │   └── ProgressBar
    │               ├── AllocationList
    │               │   └── AllocationSlider[]
    │               └── CategoryNavigator
    │                   └── CategoryCombobox
    │
    └── InvitesPanel (modal/overlay)
        └── InviteCard[]
```

---

## Custom Hooks Specification

### 1. `useAuth()` - Authentication Management

**Location:** `features/auth/hooks/useAuth.ts`

**Responsibilities:**
- Manage user session (localStorage integration)
- Handle login/register mutations
- Provide authentication state
- Handle logout cleanup

**Interface:**
```typescript
interface UseAuthReturn {
  user: User | null | undefined;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, secret: string) => Promise<void>;
  register: (name: string, email: string, secret: string) => Promise<void>;
  logout: () => void;
}
```

**State:**
- `userId` (persisted to localStorage)
- `user` (from Convex query)
- `error` (current auth error)

---

### 2. `useBoards(userId)` - Board Management

**Location:** `features/boards/hooks/useBoards.ts`

**Responsibilities:**
- Fetch user's boards
- Manage selected board (localStorage)
- Handle board CRUD operations
- Provide board role information

**Interface:**
```typescript
interface UseBoardsReturn {
  boards: BoardWithRole[] | undefined;
  selectedBoard: BoardWithRole | null;
  selectedBoardId: string | null;
  setSelectedBoard: (boardId: string | null) => void;
  createBoard: (name: string, description: string) => Promise<string>;
  deleteBoard: (boardId: string) => Promise<void>;
  isLoading: boolean;
}
```

---

### 3. `useBoardSettings(boardId, userId)` - Board Configuration

**Location:** `features/boards/hooks/useBoardSettings.ts`

**Responsibilities:**
- Manage board settings state
- Handle debounced saves to server
- Track unsaved changes
- Validate settings

**Interface:**
```typescript
interface UseBoardSettingsReturn {
  settings: BoardSettings;
  pendingChanges: Partial<BoardSettings>;
  updateSetting: <K extends keyof BoardSettings>(
    key: K, 
    value: BoardSettings[K]
  ) => void;
  saveSettings: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}
```

---

### 4. `useAllocations(boardId, userId)` - Allocation State

**Location:** `features/allocations/hooks/useAllocations.ts`

**Responsibilities:**
- Manage allocations Map state
- Handle initialization from server
- Debounce saves to server
- Calculate totals and validation

**Interface:**
```typescript
interface UseAllocationsReturn {
  allocations: Map<string, number>;
  setAllocation: (categoryId: string, value: number) => void;
  getAllocation: (categoryId: string) => number;
  totalAllocated: number;
  isComplete: boolean;
  isOverAllocated: boolean;
  saveAllocations: (parentId: string | null) => Promise<void>;
  isSaving: boolean;
}
```

---

### 5. `useCategoryTree(categories)` - Tree Navigation

**Location:** `features/categories/hooks/useCategoryTree.ts`

**Responsibilities:**
- Build parent-child relationships
- Navigate tree (drill down, breadcrumb)
- Filter visible categories
- Calculate root mappings

**Interface:**
```typescript
interface UseCategoryTreeReturn {
  rootCategories: Category[];
  getChildren: (parentId: string | null) => Category[];
  getPath: (categoryId: string) => Category[];
  getRootId: (categoryId: string) => string;
  visibleCategories: Category[];
}
```

---

### 6. `useInvites(userId)` - Invitation Management

**Location:** `features/invites/hooks/useInvites.ts`

**Responsibilities:**
- Fetch pending invites for user
- Handle invite actions (accept/decline)
- Manage board invites (for owners)
- Send new invitations

**Interface:**
```typescript
interface UseInvitesReturn {
  pendingInvites: Invite[] | undefined;
  boardInvites: BoardInvite[] | undefined;
  inviteCount: number;
  acceptInvite: (inviteId: string, boardId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  sendInvite: (email: string, role: Role) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
}
```

---

### 7. `useDebounce(value, delay)` - Debouncing

**Location:** `hooks/useDebounce.ts`

**Interface:**
```typescript
function useDebounce<T>(value: T, delay: number): T;
```

---

### 8. `useLocalStorage(key, initialValue)` - Persistence

**Location:** `hooks/useLocalStorage.ts`

**Interface:**
```typescript
function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void];
```

---

## UI Primitive Components

### 1. `Button` - Primary Action Component

**Variants:** `primary` | `secondary` | `danger` | `ghost`
**Sizes:** `sm` | `md` | `lg`

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

---

### 2. `Input` - Form Input Component

```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}
```

---

### 3. `Card` - Container Component

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}
```

---

### 4. `Modal` - Overlay Component

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

---

### 5. `Toggle` - Checkbox Alternative

```typescript
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}
```

---

### 6. `ProgressBar` - Visual Progress

```typescript
interface ProgressBarProps {
  value: number;        // 0-100
  max?: number;
  status?: 'normal' | 'warning' | 'complete' | 'error';
  showLabel?: boolean;
}
```

---

## Component Migration Mapping

| Current Location | New Location | Notes |
|-----------------|--------------|-------|
| `App.tsx` (auth forms) | `features/auth/components/LoginForm.tsx` | Extract form UI |
| `App.tsx` (auth forms) | `features/auth/components/RegisterForm.tsx` | Extract form UI |
| `App.tsx` (auth logic) | `features/auth/hooks/useAuth.ts` | Extract to hook |
| `App.tsx` (board list) | `features/boards/components/BoardList.tsx` | New component |
| `App.tsx` (board card) | `features/boards/components/BoardCard.tsx` | New component |
| `App.tsx` (board create) | `features/boards/components/BoardCreateForm.tsx` | Extract form |
| `App.tsx` (board settings) | `features/boards/components/BoardSettings.tsx` | Extract panel |
| `App.tsx` (category filter) | `features/boards/components/CategoryFilter.tsx` | Extract grid |
| `App.tsx` (invites panel) | `features/invites/components/InvitesPanel.tsx` | Extract panel |
| `App.tsx` (invite card) | `features/invites/components/InviteCard.tsx` | New component |
| `App.tsx` (invite form) | `features/invites/components/InviteForm.tsx` | Extract form |
| `App.tsx` (board invites) | `features/invites/components/BoardInvites.tsx` | Extract list |
| `Body.tsx` | `features/allocations/components/AllocationWorkspace.tsx` | Rename + refactor |
| `Body.tsx` (summary) | `features/allocations/components/AllocationSummary.tsx` | Extract component |
| `Slider.tsx` | `components/shared/AllocationSlider/` | Move to shared |
| `Breadcrumb.tsx` | `components/shared/Breadcrumb/` | Keep as shared |
| `CategoryCombobox.tsx` | `components/shared/CategoryCombobox/` | Keep as shared |

---

## New Component Specifications

### `AllocationWorkspace` (replaces Body.tsx)

**Responsibilities:**
- Display breadcrumb navigation
- Show allocation summary/progress
- Render list of allocation sliders
- Handle category creation UI

**Props:**
```typescript
interface AllocationWorkspaceProps {
  categories: Category[];
  allocations: Map<string, number>;
  currentParentId: string | null;
  breadcrumbPath: BreadcrumbItem[];
  onAllocationChange: (categoryId: string, value: number) => void;
  onNavigate: (categoryId: string | null) => void;
  onCreateCategory: (name: string, parentId: string | null) => void;
  canCreateCategories: boolean;
  unit: string;
  symbol: string;
}
```

---

### `AllocationSummary` (new)

**Responsibilities:**
- Display progress bar
- Show percentage text
- Indicate validation state
- Display unit/symbol

**Props:**
```typescript
interface AllocationSummaryProps {
  totalAllocated: number;
  unit: string;
  symbol: string;
}
```

---

### `BoardCard` (new)

**Responsibilities:**
- Display board info (name, description)
- Show user role
- Handle selection state

**Props:**
```typescript
interface BoardCardProps {
  board: Board;
  role: Role;
  isSelected: boolean;
  onClick: () => void;
}
```

---

### `InvitesPanel` (new)

**Responsibilities:**
- Modal/overlay container
- List pending invites
- Handle accept/decline actions

**Props:**
```typescript
interface InvitesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invites: Invite[];
  onAccept: (inviteId: string, boardId: string) => void;
  onDecline: (inviteId: string) => void;
}
```

---

## State Management Strategy

### Local State (useState)
- Form input values
- UI toggles (expanded sliders, modal open state)
- Drag/interaction state

### URL/LocalStorage State
- `userId` - Current user session
- `boardId` - Selected board

### Server State (Convex)
- User data
- Boards list
- Categories
- Allocations
- Invites

### Derived State (useMemo)
- Current level categories
- Total allocated percentage
- Visible categories based on filter
- Breadcrumb path

---

## Testing Strategy

### Unit Tests
- **Hooks**: Test `useAuth`, `useBoards`, `useAllocations` with mock Convex
- **Utilities**: Test calculations, validation, tree operations
- **UI Primitives**: Test Button, Input, Card rendering and interactions

### Component Tests
- **Feature Components**: Test user interactions, prop handling
- **Shared Components**: Test Slider, Breadcrumb, Combobox with user events

### Integration Tests
- **Auth Flow**: Login → Dashboard → Logout
- **Board Flow**: Create board → Select → Configure → Delete
- **Allocation Flow**: Navigate → Allocate → Save → Navigate back

### Test File Structure
```
ComponentName/
├── ComponentName.tsx
├── ComponentName.css
└── ComponentName.test.tsx      # Co-located tests

hooks/
├── useAuth.ts
├── useAuth.test.ts             # Hook tests alongside implementation
```

---

## Benefits of New Architecture

### 1. **Single Responsibility**
Each component, hook, and utility has one clear purpose

### 2. **Feature Cohesion**
Related code (components, hooks, utils, types) lives together in feature folders

### 3. **Testability**
- Small, focused units are easier to test in isolation
- Custom hooks can be tested independently of UI
- UI primitives have predictable interfaces

### 4. **Reusability**
- UI primitives can be used across all features
- Shared domain components (Slider, Breadcrumb) are decoupled
- Hooks can be composed for different use cases

### 5. **Maintainability**
- Changes are localized to specific feature folders
- Clear naming conventions make code discoverable
- Barrel exports simplify imports

### 6. **Scalability**
- Easy to add new features following established patterns
- Features can be lazy-loaded for code splitting
- Clear boundaries prevent circular dependencies

### 7. **Developer Experience**
- Intuitive file organization
- Consistent patterns across features
- Better IDE support with explicit exports

---

## Migration Plan

### Phase 1: Foundation (Week 1)
1. ✅ Create new directory structure
2. ✅ Set up UI primitive components (Button, Input, Card)
3. ✅ Create global hooks (useLocalStorage, useDebounce)
4. ✅ Move shared utilities

### Phase 2: Feature Extraction (Week 2)
1. Extract `useAuth` hook and auth components
2. Extract `useBoards` hook and board components
3. Extract `useInvites` hook and invite components
4. Update App.tsx to use new hooks

### Phase 3: Allocation Refactoring (Week 3)
1. Create `AllocationWorkspace` (replace Body.tsx)
2. Extract `AllocationSummary` component
3. Create `useAllocations` hook
4. Create `useCategoryTree` hook
5. Update shared components (move to new location)

### Phase 4: Testing & Polish (Week 4)
1. Add tests for all new hooks
2. Add tests for feature components
3. Add tests for UI primitives
4. Update integration tests
5. Remove old component files
6. Verify all functionality works

---

## Naming Conventions

### Files
- Components: `PascalCase.tsx` (e.g., `AllocationSlider.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAllocations.ts`)
- Utils: `camelCase.ts` (e.g., `validation.ts`)
- Types: `types.ts` or `PascalCase.types.ts`
- Tests: `*.test.ts(x)` alongside source files
- Styles: `PascalCase.css` alongside components
- Barrel exports: `index.ts`

### Components
- React components: `PascalCase` (e.g., `AllocationSlider`)
- Props interfaces: `PascalCaseProps` (e.g., `AllocationSliderProps`)
- Type exports: Named exports (e.g., `export type { AllocationSliderProps }`)

### Hooks
- Always start with `use` (e.g., `useAuth`, `useDebounce`)
- Return objects with descriptive keys
- Document dependencies clearly

### CSS Classes
- Use BEM-like naming within component scope
- Prefix with component name: `.allocation-slider__handle`
- Use CSS custom properties from design system

---

## Performance Considerations

### Memoization
- Use `useMemo` for expensive calculations (tree building, filtering)
- Use `useCallback` for stable function references passed to children
- Use `React.memo` for pure components that receive stable props

### Debouncing
- Debounce allocation saves (300ms)
- Debounce board settings updates (300ms)
- Use `useDebounce` hook consistently

### Lazy Loading
- Consider lazy loading feature modules:
  ```typescript
  const AllocationWorkspace = lazy(() => 
    import('./features/allocations/components/AllocationWorkspace')
  );
  ```

### List Optimization
- Use `key` prop correctly with stable IDs
- Consider virtualization for very long category lists
- Avoid inline object/array creation in render

---

## Accessibility Requirements

### All Components Must Support:
- Keyboard navigation
- ARIA labels and roles
- Focus management
- Screen reader compatibility
- High contrast mode support

### Specific Requirements:
- **Slider**: Full keyboard control (arrows, Home, End), ARIA slider role
- **Combobox**: ARIA combobox pattern, keyboard navigation, focus trap
- **Modal**: Focus trap, escape key to close, ARIA dialog role
- **Forms**: Label associations, error announcements, required indicators

---

## File Size Targets

| File Type | Target Size | Maximum |
|-----------|-------------|---------|
| Component | < 200 lines | 300 lines |
| Hook | < 150 lines | 250 lines |
| Utility | < 100 lines | 200 lines |
| App.tsx | < 150 lines | 200 lines |
| Test file | < 300 lines | 500 lines |

---

## Implementation Checklist

### Pre-Migration
- [ ] Review all existing tests
- [ ] Ensure good test coverage before refactoring
- [ ] Backup current working state

### Migration Tasks
- [ ] Create directory structure
- [ ] Implement UI primitives
- [ ] Extract custom hooks (one at a time)
- [ ] Migrate components (feature by feature)
- [ ] Add/update tests for each migrated piece
- [ ] Update imports in App.tsx

### Post-Migration
- [ ] Run full test suite
- [ ] Manual QA of all user flows
- [ ] Remove old/deprecated files
- [ ] Update documentation
- [ ] Performance audit

---

## Questions & Decisions

### Q: Should we use a state management library?
**A:** Not initially. React Context + Convex should be sufficient. If prop drilling becomes an issue, consider Zustand or Redux Toolkit.

### Q: How to handle CSS?
**A:** Continue with CSS files co-located with components. Consider CSS Modules if scoping issues arise.

### Q: Storybook for UI primitives?
**A:** Recommended but not required for Phase 1. Can be added later for design system documentation.

### Q: Code splitting strategy?
**A:** Start with route-based splitting (if routing added later). Feature-based splitting can be added as optimization.

### Q: Error boundaries?
**A:** Add ErrorBoundary at App level and feature level to isolate failures.

---

## Success Criteria

The refactoring is successful when:

1. ✅ All components are < 300 lines
2. ✅ All hooks are < 250 lines  
3. ✅ App.tsx is < 200 lines
4. ✅ 100% of hooks have unit tests
5. ✅ All user flows work identically (or better)
6. ✅ No prop drilling > 2 levels deep
7. ✅ Feature folders contain all related code
8. ✅ UI primitives are used consistently
9. ✅ Build size is reduced or maintained
10. ✅ Performance is maintained or improved

---

## Appendix: Current vs Proposed Line Counts

| Component | Current Lines | Proposed Lines | Reduction |
|-----------|---------------|----------------|-----------|
| App.tsx | 1,010 | ~150 | 85% |
| Body.tsx | 227 | ~80 (AllocationWorkspace) | 65% |
| Slider.tsx | 268 | ~200 (no change) | 0% |
| **Total** | **~1,505** | **~430** | **71%** |

*Note: New components and hooks add lines but improve maintainability through separation of concerns.*
