# API Pattern Guide

## Architecture Overview

```
Component/Page → fetchFromAPI → API Route → Actions → RPC Function → Database
```

## Pattern Flow

### 1. **Component/Page Layer**

Use `fetchFromAPI` with endpoints from `API_ENDPOINTS`:

```typescript
import { fetchFromAPI } from "@/utils/fetcher";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

// In your page/component
const response = await fetchFromAPI<ResponseType>(
  API_ENDPOINTS.mailroom.registrations,
);
```

### 2. **Endpoints Constants** (`utils/constants/endpoints.ts`)

Centralized endpoint definitions:

```typescript
export const API_ENDPOINTS = {
  mailroom: {
    registrations: "/api/mailroom/registrations",
    locations: "/api/mailroom/locations",
    // ...
  },
} as const;
```

### 3. **API Route Layer** (`app/api/**/route.ts`)

API routes are thin wrappers that handle HTTP concerns and delegate to actions:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserMailroomRegistrations } from "@/app/actions/get";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getUserMailroomRegistrations(user.id);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**API Route Responsibilities:**

- Handle HTTP request/response (parse query params, body, headers)
- Authentication/authorization checks
- Call actions and format JSON responses
- Handle errors and return appropriate status codes

### 4. **Actions Layer** (`app/actions/get.ts`, `post.ts`, `update.ts`)

Server actions contain business logic and call RPC functions:

```typescript
// app/actions/get.ts
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function getUserMailroomRegistrations(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabaseAdmin.rpc(
    "get_user_mailroom_registrations",
    { input_user_id: userId },
  );

  if (error) {
    throw error;
  }

  // Transform/normalize data if needed
  return data;
}
```

```typescript
// app/actions/post.ts
"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabase = createSupabaseServiceClient();

export async function createUserAddress(args: {
  user_id: string;
  label?: string;
  line1: string;
  // ...
}) {
  const { data, error } = await supabase.rpc("create_user_address", {
    input_user_id: args.user_id,
    input_label: args.label,
    // ...
  });

  if (error) throw error;
  return data;
}
```

**Actions Responsibilities:**

- Business logic and data validation
- Call RPC functions or direct database queries
- Data transformation/normalization
- Reusable across API routes and server components
- Marked with `"use server"` for POST/UPDATE actions

### 5. **RPC Functions** (`supabase/migrations/*.sql`)

Database functions that return JSON:

```sql
CREATE OR REPLACE FUNCTION get_user_mailroom_registrations(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Complex query logic here
  RETURN JSON_AGG(...);
END;
$$;
```

## Example: Complete Flow

### Step 1: Create RPC Function

```sql
-- supabase/migrations/xxx_add_rpc.sql
CREATE OR REPLACE FUNCTION get_user_data(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Your query logic
  RETURN JSON_BUILD_OBJECT(...);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_data(UUID) TO authenticated;
```

### Step 2: Create Action

```typescript
// app/actions/get.ts
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const supabaseAdmin = createSupabaseServiceClient();

export async function getUserData(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabaseAdmin.rpc("get_user_data", {
    input_user_id: userId,
  });

  if (error) {
    throw error;
  }

  // Transform data if needed
  return data;
}
```

### Step 3: Create API Route

```typescript
// app/api/user/data/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserData } from "@/app/actions/get";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getUserData(user.id);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

### Step 4: Add to Endpoints

```typescript
// utils/constants/endpoints.ts
export const API_ENDPOINTS = {
  user: {
    data: "/api/user/data",
  },
} as const;
```

### Step 5: Use in Component

```typescript
// app/(private)/dashboard/page.tsx
import { fetchFromAPI } from "@/utils/fetcher";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

const response = await fetchFromAPI<{ data: UserData }>(
  API_ENDPOINTS.user.data,
);
```

## Action File Organization

Actions are organized by HTTP method:

- **`app/actions/get.ts`** - Read operations (GET requests)
- **`app/actions/post.ts`** - Create operations (POST requests)
- **`app/actions/update.ts`** - Update operations (PUT/PATCH requests)

Actions can also be called directly from Server Components:

```typescript
// app/(private)/dashboard/page.tsx (Server Component)
import { getUserMailroomRegistrations } from "@/app/actions/get";

export default async function DashboardPage() {
  const registrations = await getUserMailroomRegistrations(userId);
  // ...
}
```
