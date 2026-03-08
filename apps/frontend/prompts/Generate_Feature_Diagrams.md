You are a senior software architect.

Your task is to analyze the authentication feature in this codebase and generate architecture diagrams that explain how the system works.

Focus specifically on the Auth flow (login, register, logout, token handling, session validation).

Steps:

1. Analyze the following layers in the Auth feature:
   - UI components
   - Hooks (custom React hooks)
   - Services (API calls / business logic)
   - Models / Types
   - External APIs or backend endpoints

2. Identify the communication flow between them.

3. Generate a SEQUENCE DIAGRAM describing the runtime interaction between:
   - User
   - UI components
   - Hooks
   - Services
   - API/backend

The sequence diagram must clearly show:
- the order of calls
- async API calls
- returned responses
- state updates

4. Then generate an ACTIVITY DIAGRAM summarizing the full authentication process.

The activity diagram should include:
- user actions
- validation
- service calls
- API communication
- success and failure branches
- UI updates

5. Use MERMAID syntax for both diagrams.

6. Output the result as Markdown with two sections:

---

# Auth Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as LoginPage
    participant Hook as Auth Hooks
    participant Store as Zustand Store
    participant API as authApi
    participant Client as Axios Client
    participant BE as NestJS API

    Note over UI,BE: Flow 1 — Session Bootstrap
    Hook->>Client: getRefreshToken()
    alt Token found
        Hook->>BE: POST /auth/refresh
        BE-->>Hook: { token, refreshToken }
        Hook->>Client: setAccessToken()
        Hook->>BE: GET /auth/me
        BE-->>Hook: AuthUser
        Hook->>Store: setUser(user)
    else No token
        Hook->>Store: setLoading(false)
    end

    Note over UI,BE: Flow 2 — Login
    User->>UI: Submit credentials
    UI->>UI: Zod validation
    alt Invalid
        UI-->>User: Show field errors
    else Valid
        UI->>Hook: useLogin.mutate()
        Hook->>BE: POST /auth/login
        alt Wrong credentials
            BE-->>UI: 401 Unauthorized
            UI-->>User: Show error message
        else Correct
            BE-->>Hook: { token, refreshToken, user }
            Hook->>Store: setSession(user, tokens)
            Store-->>UI: router.push(roleRoute)
        end
    end

    Note over UI,BE: Flow 3 — Silent Token Refresh
    Client->>BE: API request (expired token)
    BE-->>Client: 401 Unauthorized
    alt Refresh token exists
        Client->>BE: POST /auth/refresh
        alt Refresh succeeds
            BE-->>Client: New token pair
            Client->>BE: Retry original request
            BE-->>Client: Response data
        else Refresh fails
            Client->>UI: Redirect /login
        end
    else No refresh token
        Client->>UI: Redirect /login
    end

    Note over UI,BE: Flow 4 — Logout
    User->>UI: Click Logout
    UI->>Hook: useLogout.mutate()
    Hook->>BE: POST /auth/logout
    BE-->>Hook: Tokens revoked
    Hook->>Store: clearSession()
    Store->>Client: clearTokens()
    Hook->>UI: router.push(/login)
```

---

# Auth Activity Diagram

## Flow 1 — Session Bootstrap

```mermaid
flowchart TD
    A([App Start]) --> B{Refresh token in storage?}
    B -- No --> C[Show Login Page]
    B -- Yes --> D[POST /auth/refresh]
    D --> E{Success?}
    E -- No --> F[Clear Tokens]
    F --> C
    E -- Yes --> G[GET /auth/me]
    G --> H{User found?}
    H -- No --> F
    H -- Yes --> I[setUser in Store]
    I --> J{Role?}
    J -- ADMIN --> K([Navigate to /admin])
    J -- DISPATCHER --> L([Navigate to /dispatcher])
```

## Flow 2 — Login

```mermaid
flowchart TD
    A([Login Page]) --> B[User enters credentials]
    B --> C{Zod valid?}
    C -- No --> D[Show field errors]
    D --> B
    C -- Yes --> E[POST /auth/login]
    E --> F{Valid credentials?}
    F -- No --> G[Show error message]
    G --> B
    F -- Yes --> H[Issue JWT pair]
    H --> I[Store refresh token in DB]
    I --> J[setSession in Store]
    J --> K([Navigate to Dashboard])
```

## Flow 3 — Silent Token Refresh

```mermaid
flowchart TD
    A([API Request]) --> B[Attach Bearer token]
    B --> C{Response?}
    C -- 2xx --> D([Return data to caller])
    C -- 401 --> E{Already retried?}
    E -- Yes --> F[Clear tokens]
    F --> G([Redirect /login])
    E -- No --> H{Refresh token exists?}
    H -- No --> F
    H -- Yes --> I[POST /auth/refresh]
    I --> J{Success?}
    J -- No --> F
    J -- Yes --> K[Update token pair]
    K --> L[Retry original request]
    L --> D
```

## Flow 4 — Logout

```mermaid
flowchart TD
    A([User Clicks Logout]) --> B[POST /auth/logout]
    B --> C[JwtAuthGuard validates token]
    C --> D[Revoke all refresh tokens in DB]
    D --> E[clearSession in Store]
    E --> F[Clear tokens from memory and storage]
    F --> G([Redirect to /login])
```