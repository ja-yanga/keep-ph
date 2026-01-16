# Redux Toolkit Guide

## Overview

This project uses **Redux Toolkit (RTK)** for state management, following modern best practices and patterns. Redux Toolkit is the official, opinionated, batteries-included toolset for efficient Redux development.

## Architecture Overview

```
Component → useAppDispatch/useAppSelector → Redux Store → Slices (Reducers)
```

## Project Structure

```
store/
  ├── index.ts                 # Store configuration and typed hooks
  ├── StoreProvider.tsx        # Redux Provider component for Next.js
  └── slices/
      ├── uiSlice.ts          # UI state (sidebar, theme, notifications)
      ├── authSlice.ts        # Authentication state (user, auth status)
      └── userSlice.ts        # User profile data (KYC, addresses)
```

## Getting Started

### 1. Using Redux in Components

#### Accessing State with `useAppSelector`

```typescript
"use client";

import { useAppSelector } from "@/store";

export default function MyComponent() {
  const user = useAppSelector((state) => state.auth.user);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const theme = useAppSelector((state) => state.ui.theme);

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <p>Sidebar: {sidebarOpen ? "Open" : "Closed"}</p>
    </div>
  );
}
```

#### Dispatching Actions with `useAppDispatch`

```typescript
"use client";

import { useAppDispatch, useAppSelector } from "@/store";
import { toggleSidebar, setTheme } from "@/store/slices/uiSlice";
import { logout } from "@/store/slices/authSlice";

export default function NavigationBar() {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  const handleThemeChange = (theme: "light" | "dark" | "auto") => {
    dispatch(setTheme(theme));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <nav>
      <button onClick={handleToggleSidebar}>Toggle Sidebar</button>
      <button onClick={() => handleThemeChange("dark")}>Dark Mode</button>
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
}
```

## Creating New Slices

### Slice Structure

A slice typically follows this pattern. Here's a real-world example based on `userSlice.ts`:

```typescript
// store/slices/userSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { T_TransformedKycDetails } from "@/utils/transform/kyc-details";
import { T_TransformedAddress } from "@/utils/transform/address";

type T_User = {
  kycDetails: {
    kyc: T_TransformedKycDetails | null;
    error: string | null;
    success: string | null;
    loading: boolean;
  };
  addressDetails: {
    addresses: T_TransformedAddress[];
    error: string | null;
    success: string | null;
    loading: boolean;
  };
};

const initialState: T_User = {
  kycDetails: {
    kyc: null,
    error: null,
    success: null,
    loading: false,
  },
  addressDetails: {
    addresses: [],
    error: null,
    success: null,
    loading: false,
  },
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Update nested state - can return new object or mutate directly
    setKycDetails: (state, action) => {
      return {
        ...state,
        kycDetails: {
          ...state.kycDetails,
          kyc: {
            ...state.kycDetails.kyc,
            ...action.payload,
          },
        },
      };
    },
    setAddressDetails: (state, action: PayloadAction<T_TransformedAddress[]>) => {
      return {
        ...state,
        addressDetails: {
          ...state.addressDetails,
          addresses: action.payload,
        },
      };
    },
    // Direct state mutation (Redux Toolkit uses Immer, so this is safe)
    setKycDetailsError: (
      state,
      action: PayloadAction<T_User["kycDetails"]["error"]>,
    ) => {
      state.kycDetails.error = action.payload;
    },
    setKycDetailsSuccess: (
      state,
      action: PayloadAction<T_User["kycDetails"]["success"]>,
    ) => {
      state.kycDetails.success = action.payload;
    },
    setKycDetailsLoading: (
      state,
      action: PayloadAction<T_User["kycDetails"]["loading"]>,
    ) => {
      state.kycDetails.loading = action.payload;
    },
    setAddressDetailsError: (
      state,
      action: PayloadAction<T_User["addressDetails"]["error"]>,
    ) => {
      state.addressDetails.error = action.payload;
    },
    setAddressDetailsSuccess: (
      state,
      action: PayloadAction<T_User["addressDetails"]["success"]>,
    ) => {
      state.addressDetails.success = action.payload;
    },
    setAddressDetailsLoading: (
      state,
      action: PayloadAction<T_User["addressDetails"]["loading"]>,
    ) => {
      state.addressDetails.loading = action.payload;
    },
  },
});

export const {
  setKycDetails,
  setKycDetailsError,
  setKycDetailsSuccess,
  setKycDetailsLoading,
  setAddressDetails,
  setAddressDetailsError,
  setAddressDetailsSuccess,
  setAddressDetailsLoading,
} = userSlice.actions;

export default userSlice.reducer;
```

**Key Patterns in This Example:**

1. **Nested State Structure**: Organizes related data (KYC details, address details) with their own loading/error/success states
2. **TypeScript Types**: Uses imported types and type references (`T_User["kycDetails"]["error"]`) for type safety
3. **Mixed Mutation Patterns**: Shows both direct mutation (safe with Immer) and returning new objects
4. **Separate Loading/Error/Success States**: Each feature has its own async state management
5. **PayloadAction Typing**: Uses `PayloadAction<T>` for type-safe action payloads

### Adding a New Slice to the Store

1. Create the slice file in `store/slices/`
2. Import and add it to the store:

```typescript
// store/index.ts
import userReducer from "./slices/userSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    user: userReducer, // Add your new slice
  },
  // ... rest of configuration
});
```

## Available Slices

### UI Slice (`store/slices/uiSlice.ts`)

Manages UI-related state:

**State:**
- `sidebarOpen: boolean` - Sidebar visibility state
- `theme: "light" | "dark" | "auto"` - Theme preference
- `loading: boolean` - Global loading state
- `notifications: Array<Notification>` - In-app notifications

**Actions:**
- `toggleSidebar()` - Toggle sidebar open/closed
- `setSidebarOpen(boolean)` - Set sidebar state
- `setTheme("light" | "dark" | "auto")` - Set theme
- `setLoading(boolean)` - Set loading state
- `addNotification({ message, type })` - Add notification
- `removeNotification(id)` - Remove notification by ID
- `clearNotifications()` - Clear all notifications

**Example:**
```typescript
import { useAppDispatch } from "@/store";
import { addNotification, setTheme } from "@/store/slices/uiSlice";

const dispatch = useAppDispatch();
dispatch(addNotification({ message: "Success!", type: "success" }));
dispatch(setTheme("dark"));
```

### Auth Slice (`store/slices/authSlice.ts`)

Manages authentication state:

**State:**
- `user: User | null` - Current user object
- `isAuthenticated: boolean` - Authentication status
- `isLoading: boolean` - Loading state for auth operations
- `error: string | null` - Error message

**Actions:**
- `setUser(user | null)` - Set current user
- `setLoading(boolean)` - Set loading state
- `setError(string | null)` - Set error message
- `updateUser(partialUser)` - Update user properties
- `logout()` - Clear user and reset auth state

**Example:**
```typescript
import { useAppDispatch } from "@/store";
import { setUser, logout } from "@/store/slices/authSlice";

const dispatch = useAppDispatch();
dispatch(setUser({ id: "123", email: "user@example.com", name: "John" }));
dispatch(logout());
```

### User Slice (`store/slices/userSlice.ts`)

Manages user profile data including KYC details and addresses:

**State:**
- `kycDetails.kyc: T_TransformedKycDetails | null` - User KYC information
- `kycDetails.error: string | null` - KYC error message
- `kycDetails.success: string | null` - KYC success message
- `kycDetails.loading: boolean` - KYC loading state
- `addressDetails.addresses: T_TransformedAddress[]` - User addresses array
- `addressDetails.error: string | null` - Address error message
- `addressDetails.success: string | null` - Address success message
- `addressDetails.loading: boolean` - Address loading state

**Actions:**
- `setKycDetails(partialKyc)` - Update KYC details (merges with existing)
- `setKycDetailsError(string | null)` - Set KYC error message
- `setKycDetailsSuccess(string | null)` - Set KYC success message
- `setKycDetailsLoading(boolean)` - Set KYC loading state
- `setAddressDetails(addresses[])` - Set user addresses array
- `setAddressDetailsError(string | null)` - Set address error message
- `setAddressDetailsSuccess(string | null)` - Set address success message
- `setAddressDetailsLoading(boolean)` - Set address loading state

**Example:**
```typescript
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setKycDetails,
  setKycDetailsLoading,
  setKycDetailsError,
  setAddressDetails,
  setAddressDetailsLoading,
} from "@/store/slices/userSlice";

function UserProfileComponent() {
  const dispatch = useAppDispatch();
  const kycDetails = useAppSelector((state) => state.user.kycDetails);
  const addressDetails = useAppSelector((state) => state.user.addressDetails);

  const handleLoadKyc = async () => {
    dispatch(setKycDetailsLoading(true));
    try {
      const kyc = await fetchKycData();
      dispatch(setKycDetails(kyc));
      dispatch(setKycDetailsLoading(false));
    } catch (error) {
      dispatch(setKycDetailsError(error.message));
      dispatch(setKycDetailsLoading(false));
    }
  };

  const handleLoadAddresses = async () => {
    dispatch(setAddressDetailsLoading(true));
    try {
      const addresses = await fetchAddresses();
      dispatch(setAddressDetails(addresses));
      dispatch(setAddressDetailsLoading(false));
    } catch (error) {
      dispatch(setAddressDetailsError(error.message));
      dispatch(setAddressDetailsLoading(false));
    }
  };

  return (
    <div>
      {kycDetails.loading && <p>Loading KYC...</p>}
      {kycDetails.error && <p>Error: {kycDetails.error}</p>}
      {addressDetails.loading && <p>Loading addresses...</p>}
      {addressDetails.error && <p>Error: {addressDetails.error}</p>}
    </div>
  );
}
```

## Best Practices

### 1. **Use Typed Hooks**

Always use `useAppDispatch` and `useAppSelector` instead of the plain Redux hooks:

```typescript
// ✅ Good
import { useAppDispatch, useAppSelector } from "@/store";

// ❌ Avoid
import { useDispatch, useSelector } from "react-redux";
```

### 2. **Selector Functions**

Extract complex selectors to reusable functions:

```typescript
// store/selectors/uiSelectors.ts
import { RootState } from "@/store";

export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectNotifications = (state: RootState) => state.ui.notifications;

// In component
const sidebarOpen = useAppSelector(selectSidebarOpen);
```

### 3. **Memoized Selectors with `createSelector`**

For derived state or expensive computations, use `createSelector`:

```typescript
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/store";

const selectNotifications = (state: RootState) => state.ui.notifications;

export const selectUnreadNotifications = createSelector(
  [selectNotifications],
  (notifications) => notifications.filter((n) => !n.read),
);
```

### 4. **Async Logic with Thunks**

For async operations, use `createAsyncThunk`:

```typescript
// store/slices/userSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchUserProfile } from "@/app/actions/get";

export const fetchUser = createAsyncThunk(
  "user/fetchUser",
  async (userId: string) => {
    const user = await fetchUserProfile(userId);
    return user;
  },
);

const userSlice = createSlice({
  name: "user",
  initialState: { user: null, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch user";
      });
  },
});
```

### 5. **Component Organization**

Keep Redux logic separate from presentation:

```typescript
// ✅ Good - Separate concerns
function UserProfileDisplay({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

function UserProfileContainer() {
  const user = useAppSelector((state) => state.auth.user);
  return <UserProfileDisplay user={user} />;
}
```

### 6. **State Shape**

Keep state normalized and flat:

```typescript
// ✅ Good - Normalized
interface State {
  users: Record<string, User>;
  posts: Record<string, Post>;
}

// ❌ Avoid - Nested structures
interface State {
  users: Array<{
    posts: Array<Post>;
  }>;
}
```

## TypeScript Integration

Redux Toolkit has excellent TypeScript support. The store exports types:

```typescript
import { RootState, AppDispatch } from "@/store";

// Use in selectors
const selectUser = (state: RootState) => state.auth.user;

// Use in thunks or middleware
const myThunk = (dispatch: AppDispatch, getState: () => RootState) => {
  const user = getState().auth.user;
  // ...
};
```

## Redux DevTools

Redux DevTools are automatically enabled in development. To use:

1. Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools-extension) for your browser
2. Open your app in development mode
3. Open DevTools → Redux tab
4. Inspect actions, state changes, and time-travel debugging

## Migration from Local State

When migrating from `useState` to Redux:

1. **Identify shared state** - Move state that's needed by multiple components
2. **Create a slice** - Define state shape and actions
3. **Replace useState** - Use `useAppSelector` and `useAppDispatch`
4. **Test thoroughly** - Ensure state updates work correctly

```typescript
// Before (local state)
const [sidebarOpen, setSidebarOpen] = useState(false);

// After (Redux)
const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
const dispatch = useAppDispatch();
dispatch(setSidebarOpen(true));
```

## Next.js App Router Considerations

### Client Components Only

Redux hooks (`useAppDispatch`, `useAppSelector`) can only be used in Client Components:

```typescript
// ✅ Good
"use client";
import { useAppSelector } from "@/store";

// ❌ Won't work in Server Components
import { useAppSelector } from "@/store";
```

### Server-Side Data

For server-side data, use Server Components and pass data as props. Use Redux for:
- Client-side interactive state
- Shared state across components
- UI state (modals, sidebars, etc.)

## Testing

### Testing Redux Slices

```typescript
import reducer, { toggleSidebar, setTheme } from "@/store/slices/uiSlice";

describe("uiSlice", () => {
  it("should toggle sidebar", () => {
    const initialState = { sidebarOpen: false, theme: "light", loading: false, notifications: [] };
    const newState = reducer(initialState, toggleSidebar());
    expect(newState.sidebarOpen).toBe(true);
  });
});
```

### Testing Components with Redux

Use `@testing-library/react` with a test store:

```typescript
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import MyComponent from "./MyComponent";
import uiReducer from "@/store/slices/uiSlice";

const createTestStore = () => {
  return configureStore({
    reducer: {
      ui: uiReducer,
    },
  });
};

test("renders component", () => {
  const store = createTestStore();
  render(
    <Provider store={store}>
      <MyComponent />
    </Provider>,
  );
  // ... assertions
});
```

## Resources

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Redux Toolkit TypeScript Guide](https://redux-toolkit.js.org/usage/usage-with-typescript)
- [Redux Style Guide](https://redux.js.org/style-guide/)
- [React-Redux Hooks](https://react-redux.js.org/api/hooks)

## Examples in This Codebase

- **UI State**: See `store/slices/uiSlice.ts` for sidebar, theme, and notifications
- **Auth State**: See `store/slices/authSlice.ts` for user authentication
- **User State**: See `store/slices/userSlice.ts` for KYC details and addresses (real-world example with nested state)
- **Store Setup**: See `store/index.ts` for store configuration
- **Provider**: See `store/StoreProvider.tsx` for Next.js integration
