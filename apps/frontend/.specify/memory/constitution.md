# TMS Frontend Constitution

**Version**: 1.0.0  
**Ratified**: 2026-03-05  
**Last Amended**: 2026-03-05

---

## Project Context

The TMS (Transport Management System) is a dispatch and route planning system for transport operations, supporting three primary user roles: Admin, Dispatcher, and Driver. The system enables task scheduling, route visualization, manual optimization editing, audit logging, and comprehensive fleet management.

---

## Core Principles

### I. TypeScript-First Development (NON-NEGOTIABLE)

All code MUST be TypeScript with strict mode enabled.

**Rules:**
- TypeScript strict mode is enforced (`strict: true` in tsconfig.json)
- No `any` types without explicit justification and documentation
- All components, hooks, and utilities must be fully typed
- Props interfaces must be exported for reusability
- Type inference preferred over explicit typing when clear

**Rationale:** Type safety prevents runtime errors and improves developer experience with better IDE support.

---

### II. Next.js App Router Architecture

Follow Next.js 16+ best practices with App Router.

**Rules:**
- Use Server Components by default
- Client Components (`'use client'`) only when necessary:
  - User interactions (onClick, onChange, etc.)
  - Browser APIs (localStorage, window, etc.)
  - React hooks (useState, useEffect, etc.)
  - Third-party libraries requiring client-side rendering
- Colocate route-specific components in app directory
- Use layout.tsx for shared UI across route segments
- Leverage Next.js automatic code splitting

**Rationale:** Server Components improve performance, reduce bundle size, and enable better SEO.

---

### III. Component-Based Architecture

Follow modular, feature-based architecture with clear separation of concerns.

**Structure:**
```
src/
  app/              → Next.js routing & pages (App Router)
  components/       → Shared UI components
    ui/             → Primitive shadcn/ui components
    widgets/        → Complex reusable widgets
    layout/         → Layout components (DashboardLayout, etc.)
  features/         → Domain-specific feature modules
  hooks/            → Custom React hooks
  services/         → API communication layer
  stores/           → Global state stores (prepared for Zustand)
  schemas/          → Validation schemas (prepared for Zod)
  types/            → TypeScript interfaces & types
  lib/              → Utilities and helpers
  utils/            → General helper functions
  styles/           → Global styling & design tokens
```

**Rationale:** Clear structure improves maintainability and developer onboarding.

---

### IV. Shadcn UI Component System

All UI components MUST use shadcn/ui primitives built on Radix UI.

**Implemented Components:**
- Badge, Button, Card, Dialog
- Dropdown Menu, Input, Label
- Progress, Select, Separator
- Sidebar, Switch, Table
- Tabs, Textarea, Toast, Toaster, Tooltip

**Rules:**
- Use existing shadcn/ui components from `src/components/ui/`
- Follow Radix UI accessibility patterns
- Extend components through composition, not modification
- New primitive components must be added via shadcn CLI
- Custom styling through Tailwind CSS classes

**Rationale:** Consistent, accessible UI components with minimal bundle impact.

---

### V. Tailwind CSS for Styling

All styling MUST use Tailwind CSS utility classes.

**Design System Organization:**
```
src/styles/
  animations.css    → Animation utilities
  colors.css        → Color palette
  effects.css       → Shadows, gradients, filters
  responsive.css    → Responsive breakpoints
  shadcn-compat.css → Shadcn UI compatibility
  spacing.css       → Spacing scale
  typography.css    → Font styles
  tokens/           → Design tokens
```

**Rules:**
- Use Tailwind utility classes, not inline styles
- Custom CSS only in styles/ directory
- Follow mobile-first responsive design
- Use design tokens for consistency
- Leverage Tailwind v4 features

**Rationale:** Utility-first CSS reduces bundle size and maintains design consistency.

---

### VI. Feature-Based Domain Modules

Business logic organized by domain feature modules.

**Implemented Features:**

1. **Admin** (`features/admin/`)
   - User management
   - Fleet management
   - Driver management
   - System configuration
   - Audit logs
   - Health monitoring

2. **Dispatcher** (`features/dispatcher/`)
   - Task management
   - Driver availability
   - Route planning
   - Real-time monitoring
   - Report generation

3. **Driver** (`features/driver/`)
   - Driver dashboard
   - Task assignment view

4. **Auth** (`features/auth/`)
   - Authentication flows
   - Login components

5. **Shared** (`features/shared/`)
   - Cross-feature utilities
   - Common components

**Feature Module Structure:**
```
features/<domain>/
  components/       → Domain-specific React components
  hooks/            → Domain-specific custom hooks (optional)
  api/              → API calls for this domain (optional)
  schema/           → Domain validation schemas (optional)
  store/            → Domain state management (optional)
  index.ts          → Public exports
```

**Rules:**
- Each feature must export through index.ts
- Components should be domain-specific
- Shared logic moves to `features/shared/`
- Features should be loosely coupled

**Rationale:** Domain-driven design improves code organization and team collaboration.

---

## Tech Stack (Current Implementation)

### Core Framework
- **Next.js**: 16.1.6 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5.x (strict mode)

### UI & Styling
- **Tailwind CSS**: v4
- **Shadcn UI**: Radix UI primitives
- **Lucide React**: Icon library (0.576.0)
- **Framer Motion**: 12.34.4 (animation library)

### Utilities
- **class-variance-authority**: Component variants (0.7.1)
- **clsx**: Conditional classNames (2.1.1)
- **tailwind-merge**: Merge Tailwind classes (3.5.0)

### Development
- **ESLint**: v9 with Next.js config
- **Babel React Compiler**: 1.0.0 (optimization)

### State Management (Prepared)
- **Stores**: Infrastructure ready (not yet implemented)
- **Schemas**: Infrastructure ready for Zod validation

### API Layer (Prepared)
- **Services**: Infrastructure ready for API calls

---

## Routing Structure (Current Implementation)

### Root Routes
- `/` - Landing page
- `/login` - Authentication

### Admin Routes (`/admin/*`)
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/fleet` - Fleet management
- `/admin/drivers` - Driver management
- `/admin/config` - System configuration
- `/admin/audit` - Audit logs
- `/admin/health` - Health monitoring

### Dispatcher Routes (`/dispatcher/*`)
- `/dispatcher` - Dispatcher dashboard
- `/dispatcher/tasks` - Task management
- `/dispatcher/availability` - Driver availability
- `/dispatcher/planning` - Route planning
- `/dispatcher/monitor` - Real-time monitoring
- `/dispatcher/reports` - Report generation

### Driver Routes (`/driver/*`)
- `/driver` - Driver dashboard

**Route Organization:**
- Each role has dedicated layout.tsx
- Role-based access control implemented at layout level
- Shared components in `components/layout/`

---

## Performance Requirements

### Server-First Approach
- **Default**: Server Components for all pages
- **Client Components**: Only for interactivity
- **Data Fetching**: Prefer server-side data fetching
- **Streaming**: Use Suspense boundaries for progressive loading

### Bundle Optimization
- Leverage Next.js automatic code splitting
- Use dynamic imports for heavy components
- Minimize client-side JavaScript
- Tree-shake unused code

### State Management Strategy
- **Server State**: Fetch on server when possible
- **Client State**: Use React hooks (useState, useReducer)
- **Global State**: Zustand (only when truly global)
- **Form State**: Uncontrolled components with refs

---

## Code Quality Standards

### ESLint Configuration
- Next.js core-web-vitals rules
- TypeScript-specific rules
- Ignored paths: `.next/`, `out/`, `build/`, `next-env.d.ts`

### File Naming Conventions
- **Components**: PascalCase (`AdminDashboard.tsx`)
- **Utilities**: kebab-case (`use-mobile.tsx`)
- **Types**: PascalCase (`types/User.ts`)
- **Styles**: kebab-case (`animations.css`)

### Import Organization
- External dependencies first
- Internal absolute imports (`@/*`)
- Relative imports last
- Group by type (components, hooks, utils)

---

## Development Workflow

### Project Setup
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
```

### Adding New Features
1. Create feature module in `src/features/<domain>/`
2. Add components in `features/<domain>/components/`
3. Export through `features/<domain>/index.ts`
4. Create routes in `src/app/<role>/<feature>/`
5. Update layouts if needed

### Adding UI Components
```bash
# Use shadcn CLI to add new primitives
npx shadcn@latest add <component-name>
```

---

## Constraints & Domain Awareness

This is a **Transport Management System** with specific domain requirements:

### Task Scheduling
- Tasks assigned to drivers
- Time windows and constraints
- Priority levels

### Route Planning
- Route optimization algorithms
- Manual route editing by dispatchers
- Geographic visualization

### Fleet Management
- Vehicle tracking
- Maintenance schedules
- Capacity management

### Audit & Compliance
- Complete audit trail
- User action logging
- System health monitoring

### Real-Time Operations
- Live driver status updates
- Task status tracking
- Dispatcher monitoring dashboard

---

## Quality Gates

### Before Committing
- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no errors
- [ ] All components are properly typed
- [ ] Imports are organized
- [ ] No console logs in production code

### Before Feature PR
- [ ] Feature module follows structure conventions
- [ ] Components exported through index.ts
- [ ] Routes added to appropriate role section
- [ ] Layouts updated if needed
- [ ] No breaking changes to shared components

---

## Governance

### Constitution Authority
- This constitution supersedes ad-hoc decisions
- All features must comply with stated principles
- Deviations require explicit justification and documentation

### Amendment Process
- Amendments require team review
- Version number must be incremented
- Last Amended date must be updated
- Migration plan required for breaking changes

### Enforcement
- All PRs must pass constitution compliance check
- Code reviews verify adherence to principles
- Complexity increases must be justified

---

**Questions about this constitution?**  
Refer to specific sections above or propose amendments through the team review process.