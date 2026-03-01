# TMS Frontend — Project Stack & Architecture

> **Last updated:** March 1, 2026

---

## 1. Tech Stack

| Category           | Technology                     | Version | Purpose                                  |
| ------------------ | ------------------------------ | ------- | ---------------------------------------- |
| **Framework**      | Next.js (App Router)           | 16.1.6  | Server/client rendering, file-based routing |
| **Language**       | TypeScript (strict mode)       | 5.x     | Type safety across the codebase          |
| **Runtime**        | React                          | 19.x    | UI rendering                             |
| **Styling**        | Tailwind CSS                   | 4.x     | Utility-first CSS framework              |
| **UI Components**  | shadcn/ui                      | —       | Accessible, composable primitives        |
| **State Mgmt**     | Zustand                        | —       | Lightweight global state stores          |
| **Server State**   | TanStack Query                 | —       | Async data fetching, caching, sync       |
| **Validation**     | Zod                            | —       | Runtime schema validation                |
| **Animation**      | Framer Motion                  | —       | Declarative animations (as needed)       |
| **Icons**          | Lucide React                   | —       | Consistent icon set                      |
| **Linting**        | ESLint + next/core-web-vitals  | 9.x     | Code quality & Next.js best practices    |
| **Build Tool**     | Turbopack (via Next.js)        | —       | Fast dev builds                          |
| **Monorepo**       | Nx                             | —       | Workspace orchestration                  |

---

## 2. Folder Structure

```
apps/frontend/
├── Documentation/          → Project documentation
├── public/                 → Static assets (SVGs, images)
├── src/
│   ├── app/                → Next.js App Router (routing layer)
│   │   ├── globals.css     → Global CSS with Tailwind imports
│   │   ├── layout.tsx      → Root layout (fonts, metadata)
│   │   ├── page.tsx        → Home page
│   │   └── favicon.ico
│   │
│   ├── components/         → Shared UI components
│   │   ├── ui/             → Primitive UI elements (Button, Input, Modal, etc.)
│   │   ├── widgets/        → Complex reusable widgets (DataTable, StatCard, etc.)
│   │   ├── layout/         → Layout components (Sidebar, Header, Footer, etc.)
│   │   └── index.ts        → Barrel export
│   │
│   ├── features/           → Domain-specific feature modules
│   │   └── index.ts        → Barrel export
│   │
│   ├── hooks/              → Custom React hooks (shared across features)
│   │   └── index.ts        → Barrel export
│   │
│   ├── services/           → API communication layer (HTTP client, interceptors)
│   │   └── index.ts        → Barrel export
│   │
│   ├── stores/             → Zustand global state stores
│   │   └── index.ts        → Barrel export
│   │
│   ├── schemas/            → Zod validation schemas (shared)
│   │   └── index.ts        → Barrel export
│   │
│   ├── types/              → TypeScript interfaces & type definitions
│   │   └── index.ts        → Barrel export
│   │
│   ├── lib/                → Core utilities & helpers (cn(), constants)
│   │   └── index.ts        → Barrel export
│   │
│   ├── utils/              → General pure helper functions
│   │   └── index.ts        → Barrel export
│   │
│   └── styles/             → Additional global styling
│
├── eslint.config.mjs       → ESLint configuration
├── next.config.ts          → Next.js configuration
├── postcss.config.mjs      → PostCSS / Tailwind CSS config
├── tsconfig.json           → TypeScript configuration (strict mode)
└── package.json            → Dependencies & scripts
```

---

## 3. Path Aliases

Configured in `tsconfig.json`:

| Alias  | Resolves To |
| ------ | ----------- |
| `@/*`  | `./src/*`   |

**Usage:**

```tsx
import { Button } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks";
import { cn } from "@/lib";
```

---

## 4. Feature Module Convention

Each domain module under `src/features/<module>/` follows this internal structure:

```
features/<module>/
├── components/     → Feature-specific UI components
├── hooks/          → Feature-specific React hooks
├── api/            → Feature-specific API calls
├── schema/         → Feature-specific Zod schemas
├── store/          → Feature-specific Zustand stores
└── index.ts        → Public API barrel export
```

**Planned domain modules:**

| Module            | Description                              |
| ----------------- | ---------------------------------------- |
| `auth`            | Authentication & authorization           |
| `planner`         | Dispatch route planning interface        |
| `tasks`           | Task management & assignment             |
| `drivers`         | Driver profiles & availability           |
| `routes`          | Route definitions & optimization         |
| `audit-log`       | Activity logging & change history        |
| `export-system`   | Data export (PDF, CSV, reports)          |

---

## 5. Scripts

| Command         | Description                      |
| --------------- | -------------------------------- |
| `npm run dev`   | Start dev server (Turbopack)     |
| `npm run build` | Production build                 |
| `npm run start` | Serve production build           |
| `npm run lint`  | Run ESLint                       |

---

## 6. Key Configuration

### TypeScript (`tsconfig.json`)

- `strict: true` — Full strict mode enabled
- `moduleResolution: "bundler"` — Modern resolution for Next.js
- `jsx: "react-jsx"` — React 19 JSX transform
- `paths: { "@/*": ["./src/*"] }` — Path aliases

### Tailwind CSS (`postcss.config.mjs`)

- Tailwind v4 via `@tailwindcss/postcss` plugin
- Theme tokens defined in `globals.css` using `@theme inline`

### Next.js (`next.config.ts`)

- React Compiler enabled (`reactCompiler: true`)
- App Router (default in Next.js 16)
