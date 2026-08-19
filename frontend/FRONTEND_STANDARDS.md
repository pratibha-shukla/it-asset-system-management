# Frontend Architecture & Standards

IT Asset Management System — React Frontend

---

## Folder Structure

```
src/
├── api/                  API layer — one file per domain
│   ├── adminApi.js       Admin endpoints
│   ├── assetApi.js       Asset CRUD + assign/unassign
│   ├── authApi.js        Login, register, logout
│   ├── axiosInstance.js  Base axios config (baseURL, credentials, interceptors)
│   ├── chatbotApi.js     AI chatbot endpoint
│   ├── queryKeys.js      Centralised React Query key factory
│   └── requestApi.js     Asset request lifecycle
│
├── components/           Reusable, generic UI components
│   ├── AssetCard.jsx/.css       Single asset display card
│   ├── AssetField.jsx           Col-wrapped form field (for asset grid forms)
│   ├── ChatWidget.jsx/.css      Floating AI assistant
│   ├── FormField.jsx            Form.Group-wrapped field (for modal forms)
│   ├── LoadingSkeleton.jsx/.css Skeleton placeholder
│   ├── Navbar.jsx               App navigation bar
│   ├── NotificationBanner.jsx/.css SSE notification strip
│   └── StatCard.jsx/.css        Dashboard statistics tile
│
├── features/             Feature-scoped components — not reused globally
│   ├── admin/
│   │   ├── RequestDetailModal.jsx  View request + approve/reject
│   │   └── FulfillModal.jsx        Assign an available asset to fulfill a request
│   ├── assets/
│   │   ├── AssetModal.jsx          Add / edit an asset
│   │   ├── AssignModal.jsx         Assign an asset to a user
│   │   └── assetValidation.js      Asset form validation rules + EMPTY_ASSET_FORM
│   └── users/
│       ├── AddUserModal.jsx        Create a new user
│       ├── EditUserModal.jsx       Edit profile, role, branch, reset password
│       └── userValidation.js       User form validation rules
│
├── hooks/                Custom React hooks
│   ├── useAuth.js        Current user + role helpers
│   ├── useAuthBootstrap.js  Restore session on app load
│   ├── useDebounce.js    Debounce a value (used for search inputs)
│   ├── usePageTitle.js   Set browser tab title per page
│   ├── useServerEvents.js SSE subscription for live notifications
│   └── useThrottle.js    Throttle a value (used to limit network calls)
│
├── pages/                Page-level components — thin orchestrators only
│   ├── AdminDashboard.jsx/.css
│   ├── AssetLifecycle.jsx/.css
│   ├── AssetList.jsx/.css
│   ├── AuditLogs.jsx/.css
│   ├── BranchManagement.jsx/.css
│   ├── Dashboard.jsx/.css
│   ├── LandingPage.jsx/.css
│   ├── Login.jsx/.css
│   ├── ManagerRequests.jsx/.css
│   ├── ManagerTeamAssets.jsx
│   ├── MyRequests.jsx/.css
│   ├── RequestForm.jsx/.css
│   └── UserManagement.jsx/.css
│
├── store/                Redux Toolkit slices
│   ├── authSlice.js      Authenticated user state
│   ├── index.js          Store configuration
│   ├── notificationSlice.js  In-app notifications
│   └── uiSlice.js        Asset filter state (persisted across navigations)
│
└── utils/                Pure utility functions — no React, no side effects
    ├── mask.js           Phone number masking
    └── validators.js     Regex validators + error messages
```

---

## Rules — One Rule Per Section

### 1. One Component Per File
Every component, modal, and helper gets its own `.jsx` file.
Never define a component inside another component or inside a page file.

```jsx
// WRONG — StatCard defined inside AdminDashboard.jsx
export default function AdminDashboard() {
  function StatCard({ ... }) { ... }   // ← React creates a new type every render
}

// CORRECT — StatCard in its own file, imported
import StatCard from '../components/StatCard';
```

### 2. CSS in a Separate File
Every component or page that needs custom styles gets a `.css` file with the same name.
Never use inline `style={{}}` except for dynamic values (e.g. virtualized list row positions).

```
components/StatCard.jsx   ← component
components/StatCard.css   ← styles for that component only
```

### 3. Separation of Concerns

| Layer        | Responsibility                                    | What it must NOT do              |
|--------------|---------------------------------------------------|----------------------------------|
| `api/`       | HTTP calls, response unwrapping                   | Render UI, hold state            |
| `utils/`     | Pure functions — validation, formatting, masking  | Import React, call hooks         |
| `features/`  | Feature-specific UI (modals, sub-forms)           | Fetch data directly (use props)  |
| `components/`| Generic, reusable UI                              | Know about specific features     |
| `hooks/`     | Stateful logic reused across components           | Return JSX                       |
| `pages/`     | Compose features + data fetching + routing state  | Contain inline component definitions |
| `store/`     | Global app state (auth, UI prefs)                 | Contain business logic           |

### 4. Pages Are Thin Orchestrators
A page file's job is to:
- Fetch data with `useQuery`
- Run mutations with `useMutation`
- Manage modal open/close state
- Compose imported components

If a page file exceeds ~150 lines, the embedded UI should be extracted to `features/`.

### 5. Reusable vs Feature-Scoped

Put a component in `components/` when it is used in more than one unrelated place.
Put it in `features/<domain>/` when it belongs to a specific feature and would not make sense elsewhere.

```
components/StatCard.jsx     → used on Admin dashboard AND could be used on Manager dashboard
features/admin/FulfillModal → only used in the admin fulfillment workflow
```

### 6. Validation Lives in `features/<domain>/` or `utils/`
Validation functions are plain JS, not React. Keep them out of component files.

```
features/assets/assetValidation.js   — validateAsset(), EMPTY_ASSET_FORM
features/users/userValidation.js     — validateNewUser(), validateEditUser()
utils/validators.js                  — shared regex helpers + VALIDATION_MESSAGES
```

### 7. Never Define a Component Inside a Component
React treats every function that returns JSX as a component type. If it is defined
inside another function, React sees a **new type** on every render and unmounts +
remounts all children — destroying focus, resetting local state, and causing flickers.

```jsx
// WRONG
function AssetModal() {
  const F = ({ field }) => <div>...</div>;   // new type on every render!
  return <form><F field="name" /></form>;
}

// CORRECT
function AssetField({ field }) { ... }       // defined at module level
function AssetModal() {
  return <form><AssetField field="name" /></form>;
}
```

### 8. JSDoc on Every Exported Component
Every exported component gets a JSDoc block describing its purpose and props.

```jsx
/**
 * StatCard — displays a single metric on the dashboard.
 *
 * Props:
 *   label   - metric label shown above the value
 *   value   - numeric value; shows "—" while loading
 *   icon    - decorative emoji (aria-hidden)
 *   variant - Bootstrap color variant (default: 'primary')
 */
function StatCard({ label, value, icon, variant = 'primary' }) { ... }
```

---

## Naming Conventions

| Thing              | Convention         | Example                    |
|--------------------|--------------------|----------------------------|
| Component file     | PascalCase         | `AddUserModal.jsx`         |
| CSS file           | Same as component  | `AddUserModal.css`         |
| Hook file          | camelCase          | `useDebounce.js`           |
| Utility file       | camelCase          | `validators.js`            |
| API file           | camelCase + Api    | `adminApi.js`              |
| Redux slice        | camelCase + Slice  | `authSlice.js`             |
| Validation file    | camelCase + Validation | `assetValidation.js`   |
| CSS class names    | kebab-case         | `.stat-card__icon`         |

---

## Form Field Components

Two purpose-built field wrappers exist — choose the right one:

### `AssetField` (`components/AssetField.jsx`)
Wraps `Col` from react-bootstrap. Use inside a `<Row className="g-3">` grid layout.

```jsx
<Row className="g-3">
  <AssetField field="name" label="Asset Name" required errs={errs} md={6}>
    <Form.Control value={form.name} onChange={...} />
  </AssetField>
</Row>
```

### `FormField` (`components/FormField.jsx`)
Wraps `Form.Group`. Use inside modals or stacked form layouts without a Col grid.

```jsx
<FormField k="email" label="Email" required errs={errs}>
  <Form.Control type="email" value={form.email} onChange={...} />
</FormField>
```

---

## Data Flow

```
API layer  →  React Query (useQuery / useMutation)  →  Page
                                                         ├── passes data as props  →  Feature components
                                                         ├── passes callbacks      →  Feature components
                                                         └── reads/writes          →  Redux store (ui prefs)
```

Pages own all data fetching and mutation calls.
Feature components receive data and callbacks via props — they do not fetch independently.

---

## Adding a New Feature

1. Create `src/features/<domain>/YourModal.jsx` for the UI
2. Create `src/features/<domain>/yourValidation.js` if it has a form
3. Create `src/features/<domain>/YourModal.css` if it needs custom styles
4. Add the API call to `src/api/<domain>Api.js`
5. Import and compose in the relevant `src/pages/` file
6. Add JSDoc to every exported function

---

*Last updated: 2026-08-07*
