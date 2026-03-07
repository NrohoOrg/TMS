# SPEC-KIT Complete Guide & Workflow Simulation

**Created**: March 5, 2026  
**Project**: TMS (Transport Management System)  
**Purpose**: Understand how SPEC-KIT orchestrates AI-driven development

---

## Table of Contents

1. [Overview](#overview)
2. [File Types: One-Time vs Per-Feature](#file-types-one-time-vs-per-feature)
3. [Complete Workflow Simulation](#complete-workflow-simulation)
4. [File Connection Diagram](#file-connection-diagram)
5. [Detailed File Explanations](#detailed-file-explanations)
6. [Practical Examples](#practical-examples)

---

## Overview

SPEC-KIT is an AI-driven development framework that helps you:
- **Specify** features in plain language
- **Plan** technical implementation
- **Generate** actionable tasks
- **Implement** with AI assistance
- **Validate** quality with checklists

Think of it as a structured conversation system between you and AI, where each step builds on the previous one.

---

## File Types: One-Time vs Per-Feature

### 📦 ONE-TIME SETUP FILES (Created Once, Reused Forever)

These files live in `.specify/` and `.github/` and define HOW your project works:

```
apps/frontend/.specify/
├── memory/
│   └── constitution.md          ✏️ FILL ONCE - Your project's rules & principles
├── scripts/bash/
│   ├── common.sh                ✅ PROVIDED - Utility functions
│   ├── create-new-feature.sh    ✅ PROVIDED - Creates feature branches
│   ├── setup-plan.sh            ✅ PROVIDED - Initializes planning docs
│   ├── check-prerequisites.sh   ✅ PROVIDED - Validates prerequisites
│   └── update-agent-context.sh  ✅ PROVIDED - Updates AI context
└── templates/
    ├── spec-template.md         ✅ PROVIDED - Feature spec structure
    ├── plan-template.md         ✅ PROVIDED - Implementation plan structure
    ├── tasks-template.md        ✅ PROVIDED - Task breakdown structure
    ├── checklist-template.md    ✅ PROVIDED - Quality checklist structure
    └── constitution-template.md ✅ PROVIDED - Constitution structure

apps/frontend/.github/
├── agents/
│   ├── speckit.specify.agent.md    ✅ PROVIDED - AI agent for specs
│   ├── speckit.clarify.agent.md    ✅ PROVIDED - AI agent for clarifications
│   ├── speckit.plan.agent.md       ✅ PROVIDED - AI agent for planning
│   ├── speckit.tasks.agent.md      ✅ PROVIDED - AI agent for tasks
│   ├── speckit.implement.agent.md  ✅ PROVIDED - AI agent for implementation
│   ├── speckit.analyze.agent.md    ✅ PROVIDED - AI agent for analysis
│   └── speckit.checklist.agent.md  ✅ PROVIDED - AI agent for checklists
└── prompts/
    └── [corresponding .prompt.md files] ✅ PROVIDED - AI prompts
```

**Legend:**
- ✅ **PROVIDED** - Already exists, don't modify
- ✏️ **FILL ONCE** - You customize once for your project

---

### 🔄 PER-FEATURE FILES (Created Every New Feature)

These files live in `specs/###-feature-name/` and are created fresh for each feature:

```
specs/
└── 001-user-authentication/         🆕 CREATED - Feature folder
    ├── spec.md                      🆕 CREATED - What to build (user perspective)
    ├── plan.md                      🆕 CREATED - How to build (tech perspective)
    ├── tasks.md                     🆕 CREATED - Step-by-step implementation
    ├── research.md                  🆕 CREATED - Technical research & decisions
    ├── data-model.md                🆕 CREATED - Database/entity design
    ├── quickstart.md                🆕 CREATED - How to test/run the feature
    ├── contracts/                   🆕 CREATED - API/interface definitions
    │   ├── api-endpoints.yaml
    │   └── request-response.json
    └── checklists/                  🆕 CREATED - Quality validation
        ├── requirements.md
        ├── security.md
        └── testing.md
```

**Each feature gets its own numbered folder (001-, 002-, 003-, etc.)**

---

## Complete Workflow Simulation

Let's simulate building a real feature: **"Add user authentication system"**

### 🎬 Step 0: One-Time Project Setup (Do This Once)

Before starting ANY features, customize your constitution:

```bash
# 1. Open and fill the constitution with your project rules
code apps/frontend/.specify/memory/constitution.md
```

**Example Constitution Content:**
```markdown
# TMS Frontend Constitution

## Core Principles

### I. TypeScript-First Development
- All code must be TypeScript with strict mode enabled
- No `any` types without explicit justification
- Interfaces over types for public APIs

### II. Component Architecture
- React functional components only
- Custom hooks for shared logic
- Shadcn UI for all UI components

### III. Test-First (NON-NEGOTIABLE)
- Write integration tests before implementation
- Minimum 80% code coverage
- E2E tests for critical user flows

### IV. API Integration
- All backend calls through centralized services
- Error handling with toast notifications
- Loading states for all async operations

## Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Shadcn UI + Tailwind CSS
- **State**: React Context + Custom Hooks
- **Testing**: Vitest + React Testing Library
- **API**: REST with typed interfaces

## Governance
- All features must pass constitution check
- Code reviews required for all PRs
- Breaking changes require team approval

**Version**: 1.0.0 | **Ratified**: 2026-03-05
```

✅ **You're now ready to create features!**

---

### 🎬 Step 1: Create Feature Specification

**User Action:** Describe what you want in plain language

```bash
# In GitHub Copilot Chat or your AI assistant:
/speckit.specify I want to add user authentication with email/password login, 
forgot password recovery, and remember me functionality
```

**What Happens Behind the Scenes:**

1. **AI analyzes your description** and extracts:
   - User scenarios (login, password recovery, remember me)
   - Key requirements (authentication, email validation, session management)
   - Success criteria (user can login successfully, password reset works)

2. **Script runs:** `.specify/scripts/bash/create-new-feature.sh`
   ```bash
   # AI executes this automatically:
   .specify/scripts/bash/create-new-feature.sh --json \
     --short-name "user-auth" \
     "Add user authentication with email/password login"
   ```

3. **Git branch created:** `001-user-auth`
   ```bash
   git checkout -b 001-user-auth
   ```

4. **Feature folder created:**
   ```
   specs/001-user-auth/
   └── spec.md  (copied from template, ready to fill)
   ```

5. **AI fills spec.md** using the template:

   ```markdown
   # Feature Specification: User Authentication
   
   **Feature Branch**: `001-user-auth`
   **Created**: 2026-03-05
   **Status**: Draft
   
   ## User Scenarios & Testing
   
   ### User Story 1 - Login with Email/Password (Priority: P1)
   
   As a registered user, I want to login with my email and password 
   so that I can access my personalized dashboard.
   
   **Why this priority**: Core functionality - system unusable without it
   
   **Independent Test**: Can fully test by creating account, logging out, 
   and logging back in successfully
   
   **Acceptance Scenarios**:
   1. **Given** I have a valid account, **When** I enter correct credentials, 
      **Then** I'm redirected to my dashboard
   2. **Given** I enter wrong password, **When** I click login, 
      **Then** I see "Invalid credentials" error
   3. **Given** I enter unregistered email, **When** I click login, 
      **Then** I see "Account not found" error
   
   ### User Story 2 - Forgot Password Recovery (Priority: P2)
   
   As a user who forgot their password, I want to reset it via email 
   so that I can regain access to my account.
   
   **Acceptance Scenarios**:
   1. **Given** I click "Forgot Password", **When** I enter my email, 
      **Then** I receive a password reset link
   2. **Given** I click the reset link, **When** I enter a new password, 
      **Then** my password is updated successfully
   
   ### User Story 3 - Remember Me (Priority: P3)
   
   As a user, I want to stay logged in across browser sessions 
   so that I don't have to login every time.
   
   **Acceptance Scenarios**:
   1. **Given** I check "Remember me", **When** I login and close browser, 
      **Then** I'm still logged in when I return
   
   ## Requirements
   
   ### Functional Requirements
   - **FR-001**: System MUST validate email format before submission
   - **FR-002**: System MUST hash passwords before storage
   - **FR-003**: Users MUST receive confirmation email after signup
   - **FR-004**: System MUST enforce password strength (8+ chars, 1 number, 1 special)
   - **FR-005**: Password reset links MUST expire after 1 hour
   
   ### Key Entities
   - **User**: email, hashedPassword, createdAt, lastLogin
   - **Session**: userId, token, expiresAt, rememberMe
   - **PasswordReset**: userId, token, expiresAt, used
   
   ## Success Criteria
   - **SC-001**: Users can complete login in under 10 seconds
   - **SC-002**: Password reset emails arrive within 2 minutes
   - **SC-003**: 95% of users successfully login on first attempt
   - **SC-004**: Zero plaintext passwords stored in database
   ```

6. **AI validates the spec** with a checklist:
   ```
   ✓ No implementation details (React, Next.js, etc.)
   ✓ Focused on user value
   ✓ All acceptance scenarios defined
   ✓ Success criteria measurable
   ✓ Requirements testable
   ```

**Files Created:**
```
specs/001-user-auth/
└── spec.md  ✅ COMPLETE
```

**Output to You:**
```
✅ Feature specification created!
📁 Branch: 001-user-auth
📄 Spec: /specs/001-user-auth/spec.md
🎯 Next steps:
   - Review the spec
   - Run /speckit.clarify (if needed)
   - Run /speckit.plan to create implementation plan
```

---

### 🎬 Step 2: Clarify Ambiguities (Optional)

**User Action:** Ask AI to identify unclear areas

```bash
/speckit.clarify
```

**What Happens:**

1. **AI scans spec.md** for ambiguities across categories:
   - Functional scope (clear)
   - Data model (missing: session storage mechanism)
   - Security (missing: password hashing algorithm)
   - UX flow (missing: redirect behavior after login)

2. **AI asks targeted questions** (max 5, one at a time):

   ```
   Question 1 of 3: Session Storage Mechanism
   
   **Recommended:** Option B - JWT tokens with HTTP-only cookies
   Because it provides good security (XSS protection) and works well 
   with Next.js middleware for authentication checks.
   
   | Option | Description |
   |--------|-------------|
   | A | Server-side sessions in database (more secure, slower) |
   | B | JWT tokens in HTTP-only cookies (fast, stateless) |
   | C | LocalStorage tokens (simple but vulnerable to XSS) |
   
   You can reply with the option letter (e.g., "A"), accept the 
   recommendation by saying "yes", or provide your own answer.
   ```

3. **You respond:** "yes" (accepting recommendation)

4. **AI updates spec.md immediately:**
   ```markdown
   ## Clarifications
   
   ### Session 2026-03-05
   - Q: What session storage mechanism? → A: JWT tokens with HTTP-only cookies
   
   ## Requirements (UPDATED)
   - **FR-006**: System MUST use JWT tokens stored in HTTP-only cookies
   - **FR-007**: Tokens MUST expire after 24 hours (or 30 days if "remember me")
   ```

5. **Next questions appear** (2 and 3), same process

**Files Modified:**
```
specs/001-user-auth/
└── spec.md  ✅ UPDATED with clarifications
```

---

### 🎬 Step 3: Create Implementation Plan

**User Action:** Tell AI your tech stack and generate plan

```bash
/speckit.plan I'm building with Next.js 14, TypeScript, Shadcn UI, and PostgreSQL
```

**What Happens:**

1. **Script runs:** `.specify/scripts/bash/setup-plan.sh`
   ```bash
   # Creates plan.md from template
   ```

2. **AI loads context:**
   - Reads `spec.md` (user requirements)
   - Reads `constitution.md` (project rules)
   - Reads your tech stack from the command

3. **AI executes Phase 0: Research**

   Creates `research.md`:
   ```markdown
   # Technical Research: User Authentication
   
   ## Authentication Strategy
   
   **Decision**: NextAuth.js v5 (Auth.js)
   
   **Rationale**:
   - Native Next.js 14 App Router support
   - Built-in JWT handling with HTTP-only cookies
   - Email provider with password credentials
   - Session management included
   
   **Alternatives Considered**:
   - Custom JWT implementation (too much work, security risk)
   - Clerk (paid service, overkill for MVP)
   - Supabase Auth (vendor lock-in)
   
   ## Password Hashing
   
   **Decision**: bcrypt with 10 salt rounds
   
   **Rationale**:
   - Industry standard
   - Proven security track record
   - Good performance balance
   
   ## Database Schema
   
   **Decision**: PostgreSQL with Prisma ORM
   
   **Rationale**:
   - Type-safe queries
   - Easy migrations
   - Works well with TypeScript
   ```

4. **AI executes Phase 1: Design**

   Creates `data-model.md`:
   ```markdown
   # Data Model: User Authentication
   
   ## Entities
   
   ### User
   ```prisma
   model User {
     id            String    @id @default(cuid())
     email         String    @unique
     hashedPassword String
     name          String?
     createdAt     DateTime  @default(now())
     updatedAt     DateTime  @updatedAt
     sessions      Session[]
     passwordResets PasswordReset[]
   }
   ```
   
   ### Session (managed by NextAuth)
   
   ### PasswordReset
   ```prisma
   model PasswordReset {
     id        String   @id @default(cuid())
     userId    String
     user      User     @relation(fields: [userId], references: [id])
     token     String   @unique
     expiresAt DateTime
     used      Boolean  @default(false)
     createdAt DateTime @default(now())
   }
   ```
   
   ## Relationships
   - User → Sessions (1:many)
   - User → PasswordResets (1:many)
   
   ## Validations
   - Email: Must be valid format (Zod schema)
   - Password: Min 8 chars, 1 uppercase, 1 number, 1 special
   - Reset token: UUID v4, expire in 1 hour
   ```

   Creates `contracts/` folder:
   ```
   contracts/
   ├── auth-api.md
   └── schemas.ts
   ```

   **contracts/auth-api.md:**
   ```markdown
   # Authentication API Contracts
   
   ## POST /api/auth/signup
   
   **Request:**
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePass123!",
     "name": "John Doe"
   }
   ```
   
   **Response (Success):**
   ```json
   {
     "success": true,
     "userId": "clxxx123"
   }
   ```
   
   **Response (Error):**
   ```json
   {
     "error": "Email already exists"
   }
   ```
   
   ## POST /api/auth/signin
   (NextAuth handles this)
   
   ## POST /api/auth/forgot-password
   
   **Request:**
   ```json
   {
     "email": "user@example.com"
   }
   ```
   
   **Response:**
   ```json
   {
     "success": true,
     "message": "Password reset email sent"
   }
   ```
   ```

   Creates `quickstart.md`:
   ```markdown
   # Quickstart: User Authentication
   
   ## Setup
   
   ```bash
   # Install dependencies
   npm install next-auth@beta bcrypt @prisma/client zod
   npm install -D @types/bcrypt prisma
   
   # Setup database
   npx prisma init
   npx prisma migrate dev --name init
   
   # Configure environment
   cp .env.example .env.local
   # Add: NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL
   ```
   
   ## Test Scenarios
   
   ### Scenario 1: User Signup
   1. Navigate to `/signup`
   2. Enter email, password, name
   3. Submit form
   4. Verify user created in database
   5. Verify redirect to `/login`
   
   ### Scenario 2: User Login
   1. Navigate to `/login`
   2. Enter valid credentials
   3. Submit form
   4. Verify session created
   5. Verify redirect to `/dashboard`
   
   ### Scenario 3: Forgot Password
   1. Navigate to `/forgot-password`
   2. Enter email
   3. Check email for reset link
   4. Click link, enter new password
   5. Verify password updated
   6. Login with new password
   ```

5. **AI fills plan.md:**
   ```markdown
   # Implementation Plan: User Authentication
   
   ## Summary
   Build email/password authentication using NextAuth.js v5 with JWT tokens,
   PostgreSQL storage, and password reset functionality.
   
   ## Technical Context
   - **Language/Version**: TypeScript 5.x, Node.js 20+
   - **Primary Dependencies**: Next.js 14, NextAuth v5, Prisma, bcrypt
   - **Storage**: PostgreSQL with Prisma ORM
   - **Testing**: Vitest + React Testing Library
   - **Target Platform**: Web (Next.js App Router)
   
   ## Constitution Check
   ✅ TypeScript-First: All code will be TypeScript
   ✅ Component Architecture: React functional components
   ✅ Test-First: Integration tests before implementation
   ✅ API Integration: Centralized auth service
   
   ## Project Structure
   
   ```
   apps/frontend/
   ├── src/
   │   ├── app/
   │   │   ├── api/auth/[...nextauth]/route.ts
   │   │   ├── login/page.tsx
   │   │   ├── signup/page.tsx
   │   │   └── forgot-password/page.tsx
   │   ├── components/
   │   │   └── auth/
   │   │       ├── LoginForm.tsx
   │   │       ├── SignupForm.tsx
   │   │       └── ForgotPasswordForm.tsx
   │   ├── lib/
   │   │   ├── auth.ts (NextAuth config)
   │   │   └── password.ts (hashing utils)
   │   ├── schemas/
   │   │   └── auth.ts (Zod validation)
   │   └── services/
   │       └── auth-service.ts
   ├── prisma/
   │   └── schema.prisma
   └── tests/
       └── integration/
           └── auth.test.ts
   ```
   ```

**Files Created:**
```
specs/001-user-auth/
├── spec.md         (existing)
├── plan.md         ✅ CREATED
├── research.md     ✅ CREATED
├── data-model.md   ✅ CREATED
├── quickstart.md   ✅ CREATED
└── contracts/      ✅ CREATED
    ├── auth-api.md
    └── schemas.ts
```

---

### 🎬 Step 4: Generate Tasks

**User Action:** Break the plan into actionable tasks

```bash
/speckit.tasks
```

**What Happens:**

1. **AI loads all context:**
   - `spec.md` → User stories with priorities
   - `plan.md` → Tech stack and structure
   - `data-model.md` → Entities to implement
   - `contracts/` → APIs to build

2. **AI generates tasks.md** organized by user story:

   ```markdown
   # Tasks: User Authentication
   
   ## Phase 1: Setup (Shared Infrastructure)
   
   - [ ] T001 Initialize Prisma with PostgreSQL connection
   - [ ] T002 [P] Install NextAuth.js and bcrypt dependencies
   - [ ] T003 [P] Create environment variables template (.env.example)
   - [ ] T004 Create Prisma schema with User and PasswordReset models
   - [ ] T005 Run initial database migration
   
   ## Phase 2: Foundational (Blocking Prerequisites)
   
   - [ ] T006 Configure NextAuth in src/lib/auth.ts
   - [ ] T007 Create NextAuth API route in src/app/api/auth/[...nextauth]/route.ts
   - [ ] T008 [P] Create password hashing utilities in src/lib/password.ts
   - [ ] T009 [P] Create Zod validation schemas in src/schemas/auth.ts
   - [ ] T010 Create auth service in src/services/auth-service.ts
   
   **Checkpoint**: Foundation ready - user story implementation can begin
   
   ## Phase 3: User Story 1 - Login with Email/Password (P1) 🎯 MVP
   
   **Goal**: Users can login with email and password
   **Independent Test**: Create account, logout, login successfully
   
   ### Tests for User Story 1
   - [ ] T011 [P] [US1] Integration test for successful login in tests/integration/auth.test.ts
   - [ ] T012 [P] [US1] Integration test for invalid credentials
   - [ ] T013 [P] [US1] Integration test for non-existent user
   
   ### Implementation for User Story 1
   - [ ] T014 [P] [US1] Create LoginForm component in src/components/auth/LoginForm.tsx
   - [ ] T015 [P] [US1] Create SignupForm component in src/components/auth/SignupForm.tsx
   - [ ] T016 [US1] Create login page in src/app/login/page.tsx
   - [ ] T017 [US1] Create signup page in src/app/signup/page.tsx
   - [ ] T018 [US1] Implement signup API endpoint in src/app/api/auth/signup/route.ts
   - [ ] T019 [US1] Add session validation middleware
   - [ ] T020 [US1] Add redirect logic after successful login
   
   **Checkpoint**: User Story 1 complete and testable independently
   
   ## Phase 4: User Story 2 - Forgot Password Recovery (P2)
   
   **Goal**: Users can reset forgotten passwords via email
   **Independent Test**: Request reset, receive email, update password
   
   ### Tests for User Story 2
   - [ ] T021 [P] [US2] Integration test for password reset request
   - [ ] T022 [P] [US2] Integration test for reset token validation
   - [ ] T023 [P] [US2] Integration test for password update
   
   ### Implementation for User Story 2
   - [ ] T024 [P] [US2] Create ForgotPasswordForm in src/components/auth/ForgotPasswordForm.tsx
   - [ ] T025 [P] [US2] Create ResetPasswordForm in src/components/auth/ResetPasswordForm.tsx
   - [ ] T026 [US2] Create forgot-password page in src/app/forgot-password/page.tsx
   - [ ] T027 [US2] Create reset-password page in src/app/reset-password/page.tsx
   - [ ] T028 [US2] Implement forgot-password API in src/app/api/auth/forgot-password/route.ts
   - [ ] T029 [US2] Implement reset-password API in src/app/api/auth/reset-password/route.ts
   - [ ] T030 [US2] Add email sending service integration
   - [ ] T031 [US2] Add reset token expiry validation
   
   **Checkpoint**: User Stories 1 AND 2 both work independently
   
   ## Phase 5: User Story 3 - Remember Me (P3)
   
   **Goal**: Users stay logged in across browser sessions
   **Independent Test**: Login with "remember me", close browser, still logged in
   
   ### Implementation for User Story 3
   - [ ] T032 [US3] Add "remember me" checkbox to LoginForm
   - [ ] T033 [US3] Update NextAuth session configuration for extended expiry
   - [ ] T034 [US3] Add session duration logic in src/lib/auth.ts
   
   **Checkpoint**: All user stories independently functional
   
   ## Phase 6: Polish & Cross-Cutting Concerns
   
   - [ ] T035 [P] Add loading states to all forms
   - [ ] T036 [P] Add toast notifications for errors
   - [ ] T037 [P] Add form validation error messages
   - [ ] T038 Update documentation in README.md
   - [ ] T039 Run quickstart.md validation
   - [ ] T040 Security audit (check for XSS, SQL injection protection)
   
   ## Dependencies & Execution Order
   
   ### Phase Dependencies
   - Setup (Phase 1): No dependencies
   - Foundational (Phase 2): Depends on Setup - BLOCKS all user stories
   - User Stories (Phase 3-5): All depend on Foundational
   - Polish (Phase 6): Depends on desired user stories
   
   ### Parallel Opportunities
   - Phase 1: T002 and T003 can run in parallel
   - Phase 2: T008 and T009 can run in parallel
   - User Story 1 tests: T011, T012, T013 can run in parallel
   - User Story 1 components: T014 and T015 can run in parallel
   
   ## Implementation Strategy
   
   ### MVP First (User Story 1 Only)
   1. Complete Phase 1: Setup
   2. Complete Phase 2: Foundational
   3. Complete Phase 3: User Story 1
   4. STOP and VALIDATE: Test login/signup independently
   5. Deploy/demo if ready
   
   ### Incremental Delivery
   1. Setup + Foundational → Foundation ready
   2. Add User Story 1 → Test independently → Deploy (MVP!)
   3. Add User Story 2 → Test independently → Deploy
   4. Add User Story 3 → Test independently → Deploy
   ```

**Files Created:**
```
specs/001-user-auth/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md        ✅ CREATED (40 tasks organized by user story)
```

---

### 🎬 Step 5: Implement the Feature

**User Action:** Start implementation with AI assistance

```bash
/speckit.implement
```

**What Happens:**

1. **AI checks for quality checklists**
   ```
   Scanning checklists in specs/001-user-auth/checklists/...
   No checklists found - proceeding with implementation
   ```

2. **AI loads all context:**
   - `tasks.md` → What to build
   - `plan.md` → How to build
   - `data-model.md` → Data structures
   - `contracts/` → API specifications

3. **AI starts Phase 1: Setup**

   ```bash
   ✓ T001: Initialize Prisma with PostgreSQL
   Creating: prisma/schema.prisma
   
   ✓ T002: Install dependencies
   Running: npm install next-auth@beta bcrypt @prisma/client
   
   ✓ T003: Create .env.example
   Creating: .env.example
   
   ✓ T004: Create Prisma schema
   Updating: prisma/schema.prisma with User and PasswordReset models
   
   ✓ T005: Run migration
   Running: npx prisma migrate dev --name init
   
   Phase 1 Complete ✅
   ```

4. **AI starts Phase 2: Foundational**

   ```bash
   ✓ T006: Configure NextAuth
   Creating: src/lib/auth.ts
   
   ✓ T007: Create NextAuth API route
   Creating: src/app/api/auth/[...nextauth]/route.ts
   
   ✓ T008: Create password utilities (parallel)
   Creating: src/lib/password.ts
   
   ✓ T009: Create Zod schemas (parallel)
   Creating: src/schemas/auth.ts
   
   ✓ T010: Create auth service
   Creating: src/services/auth-service.ts
   
   Phase 2 Complete ✅
   Foundation ready - user stories can begin
   ```

5. **AI starts Phase 3: User Story 1 (MVP)**

   First, tests:
   ```bash
   ✓ T011: Integration test - successful login (parallel)
   Creating: tests/integration/auth.test.ts (test case 1)
   
   ✓ T012: Integration test - invalid credentials (parallel)
   Updating: tests/integration/auth.test.ts (test case 2)
   
   ✓ T013: Integration test - non-existent user (parallel)
   Updating: tests/integration/auth.test.ts (test case 3)
   
   Running tests... ❌ All tests fail (expected - TDD)
   ```

   Then, implementation:
   ```bash
   ✓ T014: Create LoginForm component (parallel)
   Creating: src/components/auth/LoginForm.tsx
   
   ✓ T015: Create SignupForm component (parallel)
   Creating: src/components/auth/SignupForm.tsx
   
   ✓ T016: Create login page
   Creating: src/app/login/page.tsx
   
   ✓ T017: Create signup page
   Creating: src/app/signup/page.tsx
   
   ✓ T018: Implement signup API
   Creating: src/app/api/auth/signup/route.ts
   
   ✓ T019: Add session validation middleware
   Creating: src/middleware.ts
   
   ✓ T020: Add redirect logic
   Updating: src/lib/auth.ts
   
   Phase 3 Complete ✅
   Running tests... ✅ All User Story 1 tests pass!
   
   🎯 MVP READY: You can now test login/signup independently
   ```

6. **AI continues with remaining user stories** (if you want them)

7. **Final output:**
   ```
   ✅ Implementation Complete!
   
   Summary:
   - Total tasks: 40
   - Completed: 40
   - Failed: 0
   - Tests passing: 13/13
   
   User Stories Delivered:
   ✅ US1: Login with Email/Password (P1) - MVP
   ✅ US2: Forgot Password Recovery (P2)
   ✅ US3: Remember Me (P3)
   
   Next Steps:
   1. Test the feature using quickstart.md
   2. Run: npm run dev
   3. Navigate to: http://localhost:3000/login
   4. Create an account and test all flows
   5. Review generated code
   6. Commit changes: git commit -m "feat: user authentication"
   7. Open PR for code review
   ```

**Files Created in Your Codebase:**
```
apps/frontend/
├── prisma/
│   └── schema.prisma              ✅ Database schema
├── src/
│   ├── app/
│   │   ├── api/auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   ├── signup/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   └── reset-password/route.ts
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── components/auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   └── ResetPasswordForm.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   └── password.ts
│   ├── schemas/
│   │   └── auth.ts
│   ├── services/
│   │   └── auth-service.ts
│   └── middleware.ts
└── tests/integration/
    └── auth.test.ts
```

**Updated in specs/:**
```
specs/001-user-auth/
└── tasks.md  ✅ All checkboxes marked [X]
```

---

## File Connection Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ONE-TIME SETUP                            │
│  (You configure once, AI uses forever)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────────┐
        │   .specify/memory/constitution.md    │
        │   (Your project rules & principles)  │
        └──────────────────────────────────────┘
                            │
                            │ Referenced by all agents
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                                                               │
│  ┌─────────────────────┐         ┌──────────────────────┐  │
│  │ .specify/templates/ │         │ .github/agents/      │  │
│  │ - spec-template     │         │ - specify agent      │  │
│  │ - plan-template     │◄────────┤ - clarify agent      │  │
│  │ - tasks-template    │         │ - plan agent         │  │
│  │ - checklist-template│         │ - tasks agent        │  │
│  └─────────────────────┘         │ - implement agent    │  │
│                                   └──────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ Used to create
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   PER-FEATURE WORKFLOW                        │
│  (Created fresh for each feature - 001, 002, 003...)         │
└─────────────────────────────────────────────────────────────┘

   Step 1: /speckit.specify "Add user authentication"
        │
        ▼
   ┌──────────────────────────────────┐
   │  specs/001-user-auth/            │
   │    └── spec.md                   │  ◄── From template
   │        (WHAT to build)           │      Filled by AI
   └──────────────────────────────────┘
        │
        │ Optional
        ▼
   Step 2: /speckit.clarify
        │
        ▼
   ┌──────────────────────────────────┐
   │  spec.md                         │
   │    └── (Updated with answers)    │  ◄── AI asks questions
   └──────────────────────────────────┘      You answer
        │                                     AI updates spec
        │
        ▼
   Step 3: /speckit.plan "I'm building with Next.js..."
        │
        ├──► Phase 0: Research
        │    ┌────────────────────────┐
        │    │ research.md            │  ◄── Technical decisions
        │    │ (WHY these choices)    │
        │    └────────────────────────┘
        │
        └──► Phase 1: Design
             ┌────────────────────────┐
             │ plan.md                │  ◄── HOW to build
             │ (Technical approach)   │
             ├────────────────────────┤
             │ data-model.md          │  ◄── Database schema
             │ (Entity definitions)   │
             ├────────────────────────┤
             │ contracts/             │  ◄── API specifications
             │   └── auth-api.md      │
             ├────────────────────────┤
             │ quickstart.md          │  ◄── How to test/run
             │ (Test scenarios)       │
             └────────────────────────┘
                     │
                     ▼
   Step 4: /speckit.tasks
        │
        ▼
   ┌──────────────────────────────────┐
   │  tasks.md                        │  ◄── From tasks-template
   │  - Setup (5 tasks)               │      Organized by
   │  - Foundational (5 tasks)        │      user story
   │  - User Story 1 (10 tasks)       │
   │  - User Story 2 (11 tasks)       │      Each task has:
   │  - User Story 3 (3 tasks)        │      - ID (T001, T002...)
   │  - Polish (6 tasks)              │      - File path
   │                                  │      - [P] if parallel
   │  Total: 40 tasks                 │      - [US#] story label
   └──────────────────────────────────┘
        │
        │ Reads
        ▼
   Step 5: /speckit.implement
        │
        ├──► Creates actual code files
        │    ┌────────────────────────────────┐
        │    │ src/                           │
        │    │   ├── app/login/page.tsx       │
        │    │   ├── components/LoginForm.tsx │
        │    │   ├── lib/auth.ts              │
        │    │   └── services/auth-service.ts │
        │    ├── prisma/schema.prisma         │
        │    └── tests/integration/auth.test.ts
        │    └────────────────────────────────┘
        │
        └──► Updates task checkboxes
             ┌────────────────────────┐
             │ tasks.md               │
             │ - [X] T001 ...         │  ◄── Marks complete
             │ - [X] T002 ...         │
             │ - [X] T003 ...         │
             └────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              FINAL STATE AFTER FEATURE                        │
└─────────────────────────────────────────────────────────────┘

specs/001-user-auth/          Your Codebase:
├── spec.md                   src/app/login/page.tsx
├── plan.md                   src/components/auth/LoginForm.tsx
├── tasks.md (all ✓)          src/lib/auth.ts
├── research.md               src/services/auth-service.ts
├── data-model.md             prisma/schema.prisma
├── quickstart.md             tests/integration/auth.test.ts
├── contracts/                (40+ new files created)
│   └── auth-api.md
└── checklists/
    └── requirements.md

Git: Branch 001-user-auth
Status: Ready for PR and code review
```

---

## Detailed File Explanations

### 📋 Constitution (`constitution.md`)

**Created:** Once, at project start  
**Modified:** Rarely (when changing project principles)  
**Purpose:** Define project-wide rules that AI must follow

**What it contains:**
- Core development principles (e.g., "TypeScript-first", "Test-first")
- Technology stack constraints
- Code quality standards
- Governance rules

**Example:**
```markdown
### I. TypeScript-First Development
All code must be TypeScript with strict mode enabled

### II. Test-First (NON-NEGOTIABLE)
Write tests before implementation
Red-Green-Refactor cycle strictly enforced
```

**How AI uses it:**
- Validates every plan against constitution
- Rejects violations unless justified
- Ensures consistency across all features

---

### 📄 Spec Template (`spec-template.md`)

**Created:** Provided by SPEC-KIT  
**Modified:** Never (it's a template)  
**Purpose:** Structure for feature specifications

**What it contains:**
- User Scenarios & Testing section
- Requirements section
- Success Criteria section
- Key Entities section

**How AI uses it:**
- Copies to `specs/###-feature/spec.md`
- Fills in based on your feature description
- Ensures consistent spec format

---

### 📄 Feature Spec (`specs/###-feature/spec.md`)

**Created:** Every new feature  
**Modified:** During `/speckit.specify` and `/speckit.clarify`  
**Purpose:** WHAT to build (user perspective)

**What it contains:**
- User stories with acceptance criteria
- Functional requirements
- Success criteria (measurable)
- NO implementation details

**Example:**
```markdown
### User Story 1 - Login (Priority: P1)
As a user, I want to login so that I can access my dashboard.

**Acceptance Scenarios:**
1. Given valid credentials, When I submit, Then I'm logged in
2. Given wrong password, When I submit, Then I see error
```

**How AI uses it:**
- Source of truth for WHAT to build
- Drives task generation (one phase per user story)
- Validates implementation matches requirements

---

### 📄 Plan Template (`plan-template.md`)

**Created:** Provided by SPEC-KIT  
**Modified:** Never  
**Purpose:** Structure for implementation plans

**What it contains:**
- Technical Context section
- Constitution Check section
- Project Structure section
- Complexity Tracking section

---

### 📄 Implementation Plan (`specs/###-feature/plan.md`)

**Created:** Every new feature  
**Modified:** During `/speckit.plan`  
**Purpose:** HOW to build (tech perspective)

**What it contains:**
- Technology choices (Next.js, PostgreSQL, etc.)
- File structure
- Dependencies
- Architecture decisions

**Example:**
```markdown
## Technical Context
- Language: TypeScript 5.x
- Framework: Next.js 14
- Database: PostgreSQL with Prisma
- Auth: NextAuth.js v5

## Project Structure
src/
├── app/login/page.tsx
├── components/auth/LoginForm.tsx
└── lib/auth.ts
```

**How AI uses it:**
- Determines which files to create
- Selects appropriate libraries
- Generates tasks with correct paths

---

### 📄 Research Document (`specs/###-feature/research.md`)

**Created:** Every new feature (during `/speckit.plan`)  
**Modified:** Once, during planning  
**Purpose:** Document technical decisions

**What it contains:**
- Decision: What was chosen
- Rationale: Why it was chosen
- Alternatives: What else was considered

**Example:**
```markdown
## Authentication Strategy
**Decision:** NextAuth.js v5
**Rationale:** Native Next.js support, built-in JWT handling
**Alternatives:** Custom JWT (too complex), Clerk (paid)
```

**How AI uses it:**
- Resolve "NEEDS CLARIFICATION" from planning
- Document why specific libraries chosen
- Reference for future features

---

### 📄 Data Model (`specs/###-feature/data-model.md`)

**Created:** Every new feature (during `/speckit.plan`)  
**Modified:** Once, during planning  
**Purpose:** Define database schema and entities

**What it contains:**
- Entity definitions with fields
- Relationships between entities
- Validation rules

**Example:**
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  hashedPassword String
  sessions      Session[]
}
```

**How AI uses it:**
- Generate database migrations
- Create model files
- Validate data structures in code

---

### 📁 Contracts (`specs/###-feature/contracts/`)

**Created:** Every new feature (during `/speckit.plan`)  
**Modified:** Once, during planning  
**Purpose:** Define API specifications

**What it contains:**
- API endpoints with request/response
- Interface definitions
- Data formats (JSON schemas)

**Example:**
```markdown
## POST /api/auth/login
Request: { "email": "...", "password": "..." }
Response: { "success": true, "userId": "..." }
```

**How AI uses it:**
- Generate API route handlers
- Create TypeScript interfaces
- Write integration tests

---

### 📄 Quickstart (`specs/###-feature/quickstart.md`)

**Created:** Every new feature (during `/speckit.plan`)  
**Modified:** Once, during planning  
**Purpose:** How to test/run the feature

**What it contains:**
- Setup instructions
- Test scenarios
- Manual testing steps

**Example:**
```markdown
## Test Scenario 1: Login
1. Navigate to /login
2. Enter: email@test.com / password123
3. Verify: Redirected to /dashboard
4. Verify: Session cookie exists
```

**How AI uses it:**
- Validation after implementation
- Manual QA guide
- Onboarding for new developers

---

### 📄 Tasks (`specs/###-feature/tasks.md`)

**Created:** Every new feature (during `/speckit.tasks`)  
**Modified:** During `/speckit.implement` (checking off completed tasks)  
**Purpose:** Step-by-step implementation guide

**What it contains:**
- Numbered tasks (T001, T002, ...)
- File paths for each task
- Parallel markers [P]
- User story labels [US1], [US2]
- Dependency information

**Example:**
```markdown
## Phase 1: Setup
- [ ] T001 Initialize Prisma with PostgreSQL
- [ ] T002 [P] Install NextAuth dependencies

## Phase 3: User Story 1 (P1)
- [ ] T011 [P] [US1] Create LoginForm in src/components/auth/LoginForm.tsx
- [ ] T012 [US1] Create login page in src/app/login/page.tsx
```

**How AI uses it:**
- Execute tasks in order
- Know which tasks can run in parallel
- Track implementation progress
- Mark tasks complete [X]

---

### 📁 Checklists (`specs/###-feature/checklists/`)

**Created:** Optional, during various stages  
**Modified:** As quality gates are checked  
**Purpose:** Quality validation before implementation

**What it contains:**
- Requirements checklist
- Security checklist
- Testing checklist
- UX checklist

**Example:**
```markdown
# Security Checklist
- [ ] Passwords hashed before storage
- [ ] SQL injection protection enabled
- [ ] XSS protection in forms
- [ ] CSRF tokens implemented
```

**How AI uses it:**
- Verify spec completeness before planning
- Check quality before implementation
- Validate security/performance requirements

---

## Practical Examples

### Example 1: Building "Add Payment Integration"

**Step 1:** Specify
```bash
/speckit.specify I want to add Stripe payment integration for 
subscription billing with monthly and annual plans
```

**Created:**
```
specs/002-payment-integration/
└── spec.md
```

**Contains:**
- User Story 1: Choose subscription plan (P1)
- User Story 2: Enter payment details (P1)
- User Story 3: Manage subscription (P2)
- Requirements: PCI compliance, webhook handling
- Success Criteria: 99% payment success rate

---

**Step 2:** Plan
```bash
/speckit.plan I'm using Next.js 14, TypeScript, Stripe SDK, PostgreSQL
```

**Created:**
```
specs/002-payment-integration/
├── spec.md (existing)
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── stripe-webhooks.md
```

**research.md** contains:
- Decision: Stripe Checkout vs Payment Elements
- Rationale: Checkout for simplicity, PCI compliance
- Webhook security: Signature verification required

**data-model.md** contains:
```prisma
model Subscription {
  id              String   @id
  userId          String
  stripeCustomerId String  @unique
  status          String
  planType        String   // 'monthly' | 'annual'
  currentPeriodEnd DateTime
}
```

---

**Step 3:** Generate Tasks
```bash
/speckit.tasks
```

**Created:**
```
specs/002-payment-integration/
└── tasks.md (35 tasks)
```

**Tasks include:**
- Phase 1: Setup Stripe SDK, environment variables
- Phase 2: Create subscription models, webhook handler
- Phase 3 (US1): Pricing page, plan selection UI
- Phase 4 (US1): Checkout integration
- Phase 5 (US2): Subscription management dashboard

---

**Step 4:** Implement
```bash
/speckit.implement
```

**Creates in your codebase:**
```
src/
├── app/
│   ├── pricing/page.tsx
│   ├── checkout/page.tsx
│   ├── api/stripe/
│   │   ├── create-checkout/route.ts
│   │   └── webhooks/route.ts
│   └── dashboard/subscription/page.tsx
├── components/pricing/
│   └── PricingCards.tsx
├── lib/stripe.ts
└── services/subscription-service.ts

prisma/
└── migrations/
    └── add_subscription_model/
```

---

### Example 2: Building "Add Export to PDF"

**Step 1:** Specify
```bash
/speckit.specify Users should be able to export their reports as PDF files
```

**Created:**
```
specs/003-pdf-export/
└── spec.md
```

---

**Step 2:** Clarify (AI asks questions)
```
Question 1: PDF Generation Approach

**Recommended:** Option B - Server-side generation with Puppeteer
Because it provides consistent rendering and works with complex layouts.

| Option | Description |
|--------|-------------|
| A | Client-side with jsPDF (simple but limited styling) |
| B | Server-side with Puppeteer (full CSS support) |
| C | External service like PDFMonkey (paid, vendor lock-in) |

Your choice: yes  ← You accept recommendation
```

**AI updates spec.md:**
```markdown
## Clarifications
### Session 2026-03-05
- Q: PDF generation approach? → A: Server-side with Puppeteer
```

---

**Step 3:** Plan
```bash
/speckit.plan
```

**AI creates plan with Puppeteer integration:**
```markdown
## Technical Context
- PDF Library: Puppeteer
- Template Engine: React components rendered to HTML
- Storage: Temporary files, then streamed to user
```

---

## Summary: File Lifecycle

| File | Created When | Modified When | Deleted When |
|------|-------------|---------------|--------------|
| `constitution.md` | Project start | Rarely (rule changes) | Never |
| Templates (`.specify/templates/`) | SPEC-KIT install | Never | Never |
| Agents (`.github/agents/`) | SPEC-KIT install | Never | Never |
| Scripts (`.specify/scripts/`) | SPEC-KIT install | Never | Never |
| `spec.md` | `/speckit.specify` | `/speckit.clarify` | Feature complete |
| `plan.md` | `/speckit.plan` | Once (during planning) | Feature complete |
| `research.md` | `/speckit.plan` | Once (during planning) | Feature complete |
| `data-model.md` | `/speckit.plan` | Once (during planning) | Feature complete |
| `contracts/` | `/speckit.plan` | Once (during planning) | Feature complete |
| `quickstart.md` | `/speckit.plan` | Once (during planning) | Feature complete |
| `tasks.md` | `/speckit.tasks` | `/speckit.implement` (checks off) | Feature complete |
| `checklists/` | Various commands | As quality gates checked | Feature complete |

---

## Key Takeaways

### ✅ One-Time Setup (Do Once)
1. Fill `constitution.md` with your project rules
2. All templates and agents are already provided

### 🔄 Per Feature (Do Every Time)
1. `/speckit.specify` - Describe what you want (creates `spec.md`)
2. `/speckit.clarify` - Answer AI questions (optional, updates `spec.md`)
3. `/speckit.plan` - Tell AI your tech stack (creates 5+ design docs)
4. `/speckit.tasks` - Generate actionable tasks (creates `tasks.md`)
5. `/speckit.implement` - AI builds it (creates actual code)

### 🎯 The Big Picture
- **Templates** → Structure (how docs should look)
- **Agents** → Intelligence (what AI does)
- **Scripts** → Automation (creates folders, runs commands)
- **Constitution** → Rules (what AI must follow)
- **Specs folder** → Features (001-, 002-, 003-...)
- **Your codebase** → Implementation (actual working code)

Each feature is self-contained in its own `specs/###-feature/` folder with complete documentation. When the feature is done and merged, you can archive the specs folder or keep it as historical documentation.

---

## Next Steps

1. **Fill your constitution:** Edit `.specify/memory/constitution.md`
2. **Try a simple feature:** `/speckit.specify Add a hello world page`
3. **Review generated files:** Check `specs/001-hello-world/`
4. **Run the workflow:** Go through all 5 commands
5. **Build something real:** Use it for your next feature!

---

**Questions or Issues?**
- Check the agent files in `.github/agents/` for detailed command documentation
- Each agent file has complete instructions for that command
- Templates in `.specify/templates/` show expected output format

Happy building! 🚀
